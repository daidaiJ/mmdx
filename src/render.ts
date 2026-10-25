// Rendering core: one Chromium (detected Edge/Chrome) shared by pooled pages.
// Each page loads Mermaid (UMD), optionally the ELK layout engine, and the
// bundled CJK font once, then renders many diagrams.

import fs from 'node:fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { PNG } from 'pngjs';
import type { Assets } from './embed.ts';
import { peleCss } from './themes.ts';

export type Layout = 'elk' | 'dagre';
export type Engine = 'pele' | 'mermaid';

export interface RendererOptions {
  browserPath?: string;
  layout: Layout;
  /** diagram renderer; `pele` falls back to mermaid for unsupported types */
  engine: Engine;
  scale: number;
  width: number;
  /** iconify packs preloaded for `@{icon: pack:icon}` node syntax */
  iconPacks?: Array<{ name: string; json: string }>;
  /** extra CSS appended to the pele `<style>` (`--css`); mermaid uses themeCSS */
  extraCss?: string;
  /** record per-stage timings into renderer.profile */
  profile?: boolean;
}

export interface ProfileEntry {
  stage: string;
  ms: number;
  label?: string;
}

interface RawResult {
  error?: string;
  svg?: string;
  box?: { x: number; y: number; width: number; height: number };
  id?: string;
}

export function detectBrowser(): string | null {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
        ]
      : [
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/google-chrome',
          '/snap/bin/chromium',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ];
  for (const p of candidates) {
    if (!p) continue;
    try {
      fs.accessSync(p);
      return p;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

const PAGE_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><style>' +
  'body{margin:0;padding:0;overflow:hidden;}' +
  'svg{display:block;}' +
  '</style></head><body></body></html>';

/** Bounding box of pixels that differ from the corner pixel (the page bg). */
function inkBBox(png: Buffer): { x0: number; y0: number; x1: number; y1: number } | null {
  // puppeteer's buffer may be a bare Uint8Array under bun; pngjs needs Buffer
  const img = PNG.sync.read(Buffer.from(png));
  const { width, height, data } = img;
  const bg = [data[0], data[1], data[2], data[3]];
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) +
        Math.abs(data[i + 2] - bg[2]) + Math.abs(data[i + 3] - bg[3]) > 40
      ) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Serialize screenshot rasterization across all pooled pages. */
let gate: Promise<unknown> = Promise.resolve();
function screenshotGate<T>(fn: () => Promise<T>): Promise<T> {
  const run = gate.then(fn, fn);
  gate = run.catch(() => { /* keep the chain alive */ });
  return run;
}

export class Renderer {
  private browser!: Browser;
  private pages: Page[] = [];
  private free: Page[] = [];
  /** per-stage timings, populated when opts.profile is set */
  readonly profile: ProfileEntry[] = [];
  /** figure-lint findings from the last renderDocument call, 'code: message' */
  docLintWarnings: string[] = [];

  private constructor(
    private assets: Assets,
    private opts: RendererOptions,
  ) {}

  private static readonly PAD_X = 20;
  private static readonly PAD_Y = 12;

  private async mark<T>(stage: string, fn: () => Promise<T>, label?: string): Promise<T> {
    if (!this.opts.profile) return fn();
    const t0 = performance.now();
    const out = await fn();
    this.profile.push({ stage, ms: Math.round(performance.now() - t0), label });
    return out;
  }

  static async create(assets: Assets, opts: RendererOptions): Promise<Renderer> {
    const r = new Renderer(assets, opts);
    const exe = opts.browserPath || detectBrowser();
    if (!exe) {
      throw new Error(
        'no Chrome/Edge found — install Microsoft Edge or Chrome, or pass --browser <path>',
      );
    }
    await r.mark('browser-launch', async () => {
      r.browser = await puppeteer.launch({
        executablePath: exe,
        headless: true,
        protocolTimeout: 300_000,
        args: ['--disable-gpu', '--disable-dev-shm-usage', '--font-render-hinting=none'],
      });
    });
    return r;
  }

  private async initPage(page: Page): Promise<void> {
    await page.setViewport({
      width: this.opts.width,
      height: Math.max(800, Math.round(this.opts.width * 0.75)),
      deviceScaleFactor: this.opts.scale,
    });
    await page.setContent(PAGE_HTML);
    await this.mark('init-mermaid', () => page.addScriptTag({ content: this.assets.mermaidJs }));
    if (this.assets.peleJs) {
      await this.mark('init-pele', () => page.addScriptTag({ content: this.assets.peleJs! }));
    }

    if (this.opts.layout === 'elk' && this.assets.elkJs) {
      // stash the payload; ELK is parsed lazily on the first flowchart render
      // (its 7MB bundle costs ~0.8s of parse per page and only flowchart/
      // graph diagrams ever use it)
      const b64 = Buffer.from(this.assets.elkJs, 'utf8').toString('base64');
      await page.evaluate((b) => {
        (window as unknown as Record<string, unknown>).__elkB64 = b;
      }, b64);
    }

    if (this.opts.iconPacks?.length) {
      await page.evaluate((packs) => {
        const mermaid = (
          window as unknown as {
            mermaid: { registerIconPacks: (p: unknown) => void };
          }
        ).mermaid;
        mermaid.registerIconPacks(
          packs.map((p) => ({ name: p.name, loader: () => JSON.parse(p.json) })),
        );
      }, this.opts.iconPacks);
    }

    if (this.assets.fontB64) {
      await this.mark('init-font', async () => {
        await page.addStyleTag({ content: this.fontCss() });
        // Mermaid measures label widths synchronously; if the web font isn't
        // loaded yet it measures fallback metrics and every label ends up
        // clipped once the real font renders. Force-load before first render.
        await page.evaluate(async () => {
          await document.fonts.load('500 15px "Noto Sans SC"', '中文English');
          await document.fonts.ready;
        });
      });
    }
  }

  private fontCss(): string {
    return (
      `@font-face{font-family:'Noto Sans SC';` +
      `src:url(data:font/woff2;base64,${this.assets.fontB64}) format('woff2');` +
      `font-weight:100 900;font-style:normal;font-display:block;}`
    );
  }

  /**
   * Authored-HTML scope (renderDocument): the block font plus the serif and
   * kai families, so pages can say `font-family:'Noto Serif SC'` (serif
   * registers, editorial covers) or `'LXGW WenKai'` (hand-drawn figure
   * labels) and get offline-identical Chinese. Blocks and the mermaid shell
   * stay on fontCss() alone — injecting 4+ MB of unused faces per table
   * would tax batch renders for nothing.
   */
  private docFontCss(): string {
    let css = this.fontCss();
    if (this.assets.fontSerifB64) {
      css +=
        `@font-face{font-family:'Noto Serif SC';` +
        `src:url(data:font/woff2;base64,${this.assets.fontSerifB64}) format('woff2');` +
        `font-weight:200 900;font-style:normal;font-display:block;}`;
    }
    if (this.assets.fontKaiB64) {
      css +=
        `@font-face{font-family:'LXGW WenKai';` +
        `src:url(data:font/woff2;base64,${this.assets.fontKaiB64}) format('woff2');` +
        `font-weight:400;font-style:normal;font-display:block;}`;
    }
    return css;
  }

  /**
   * CJK-range aliases over the generic font families, for authored HTML
   * documents. Authored families keep every glyph they have; the bundled
   * Noto subsets only fill CJK holes in the fallback, so Chinese renders
   * offline-identical without touching the page's Latin type. The serif
   * alias carries real serif glyphs when bundled, so serif-register pages
   * keep their editorial character in Chinese; explicitly declared CJK
   * webfonts still win (their glyphs exist).
   */
  private cjkFallbackCss(): string {
    if (!this.assets.fontB64) return '';
    const range = 'unicode-range:U+3000-303F,U+3400-4DBF,U+4E00-9FFF,U+F900-FAFF,U+FF00-FFEF;';
    const face = (family: string, b64: string): string =>
      `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:100 900;font-style:normal;font-display:block;${range}}`;
    return (
      face('sans-serif', this.assets.fontB64) +
      face('serif', this.assets.fontSerifB64 ?? this.assets.fontB64)
    );
  }

  /**
   * Figure lint for authored HTML pages — LSP-style diagnostics: every warning
   * names the figure, the text, viewBox-space coordinates and the shape it
   * collided with, so an agent can jump straight to the source. The
   * caption/aria/label-floor checks absorb visual-explainer's render gate;
   * the geometry checks (overflow, text-on-shape, text-on-text, adhesion)
   * cover what upstream avoids by generating layout deterministically.
   * Precision strategies against false positives: a text's own group is its
   * label home (node labels, label chips); texts centered well inside a much
   * larger box are in-box labels; edge labels and chips may ride path/line
   * shapes by design — but never box shapes; hidden texts and sliver
   * intersections (<24px², ≤2px) are ignored. Adhesion flags gaps tighter
   * than max(4px, 35% of the text's font size) to a foreign box shape.
   * Findings surface through --json warnings.
   */
  private figureLint(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const warns: string[] = [];
      const op = (el: Element): number => {
        let o = 1;
        let e: Element | null = el;
        while (e) {
          const s = getComputedStyle(e);
          o *= s.opacity === '' ? 1 : parseFloat(s.opacity);
          if (s.display === 'none' || s.visibility === 'hidden') return 0;
          e = e.parentElement;
        }
        return o;
      };
      const figs = Array.from(document.querySelectorAll('figure'));
      const figId = (svg: Element): string => {
        const f = svg.closest('figure');
        const n = figs.indexOf(f as HTMLElement) + 1;
        const cap = (f?.querySelector('figcaption')?.textContent || svg.getAttribute('aria-label') || '')
          .trim().replace(/\s+/g, ' ').slice(0, 10);
        return `图${n}${cap ? `「${cap}」` : ''}`;
      };
      const nameOf = (shape: Element): string => {
        const g = shape.closest('g');
        const sr = (shape as SVGElement).getBoundingClientRect();
        // prefer a text that sits on/in this shape (band layouts share one
        // wrapper g, where "first text" would misname every later band)
        const onShape = g
          ? Array.from(g.querySelectorAll('text')).find((tx) => {
              const tr = (tx as SVGElement).getBoundingClientRect();
              return (
                tr.left < sr.right && tr.right > sr.left && tr.top < sr.bottom + 4 && tr.bottom > sr.top - 4
              );
            })
          : null;
        const s = (onShape?.textContent || g?.querySelector('text')?.textContent || '')
          .trim().split(/\s+/)[0]?.slice(0, 6);
        return s || shape.getAttribute('class') || g?.getAttribute('class') || shape.tagName.toLowerCase();
      };
      figs.forEach((fig, fi) => {
        if (!fig.querySelector('figcaption'))
          warns.push(`figure-uncaptioned: 图${fi + 1} 缺 figcaption——caption 写这张图的主张`);
      });
      document.querySelectorAll('figure svg').forEach((node) => {
        const svg = node as SVGSVGElement;
        if (svg.getAttribute('aria-hidden') === 'true') return;
        const id = figId(svg);
        const label = svg.getAttribute('aria-label') || svg.getAttribute('aria-labelledby') || svg.querySelector('title');
        if (!label && !svg.closest('figure')?.querySelector('figcaption'))
          warns.push(`svg-aria-label: ${id} svg 缺 aria-label——用一句话说明画了什么`);
        const vr = svg.getBoundingClientRect();
        const vb = svg.viewBox?.baseVal;
        const scale = vb && vb.width ? vr.width / vb.width : 1;
        const vRect = (r: DOMRect) => ({
          x: Math.round((r.left - vr.left) / scale),
          y: Math.round((r.top - vr.top) / scale),
          r: Math.round((r.right - vr.left) / scale),
          b: Math.round((r.bottom - vr.top) / scale),
        });
        // pass 1: overflow / small text / collect shapes
        const offenders: string[] = [];
        let small = 0;
        const shapes: { el: Element; r: DOMRect; box: boolean; big: boolean }[] = [];
        svg.querySelectorAll<SVGElement>('rect, path, ellipse, circle, polyline, line, text').forEach((el) => {
          if (op(el) < 0.1) return;
          const r = el.getBoundingClientRect();
          if (r.width < 1 && r.height < 1) return;
          if (r.left < vr.left - 1 || r.right > vr.right + 1 || r.top < vr.top - 1 || r.bottom > vr.bottom + 1) {
            const v = vRect(r);
            const dir = r.right > vr.right + 1 ? '右' : r.left < vr.left - 1 ? '左' : r.bottom > vr.bottom + 1 ? '下' : '上';
            const by = Math.max(
              Math.round(r.right - vr.right), Math.round(vr.left - r.left),
              Math.round(r.bottom - vr.bottom), Math.round(vr.top - r.top), 1) / scale;
            const what = el.tagName.toLowerCase() === 'text'
              ? `文字「${(el.textContent || '').trim().slice(0, 10)}」(x${v.x},y${v.y})`
              : `<${el.tagName.toLowerCase()}>(${el.getAttribute('class') || nameOf(el)})`;
            offenders.push(`${what} 越出${dir}缘约 ${Math.round(by)}px`);
          }
          if (el.tagName.toLowerCase() === 'text') {
            const fs = parseFloat(getComputedStyle(el).fontSize) * scale;
            if (fs && fs < 11) small++;
            return;
          }
          if (r.width > 8 && r.height > 8)
            shapes.push({ el, r, box: el.tagName.toLowerCase() === 'rect' || el.tagName.toLowerCase() === 'ellipse', big: r.width * r.height > 4000 });
        });
        if (offenders.length)
          warns.push(`figure-overflow: ${id} ${offenders.slice(0, 3).join('；')}${offenders.length > 3 ? `（等 ${offenders.length} 处）` : ''}——加宽 viewBox 或收进元素`);
        if (small)
          warns.push(`figure-small-text: ${id} 有 ${small} 处文字有效字号 <11px（画布被整体缩小），放大画布或加大字号`);
        // pass 2: text × shape (overlap + adhesion), text × text
        const texts = Array.from(svg.querySelectorAll('text')).filter((t) => op(t) >= 0.1);
        const trOf = (t: Element) => (t as SVGElement).getBoundingClientRect();
        const chipOf = (t: Element, tr: DOMRect, g1: Element | null): boolean =>
          !!g1 && Array.from(g1.querySelectorAll('rect')).some((rc) => {
            const rr = rc.getBoundingClientRect();
            return rr.left <= tr.left + 1 && rr.right >= tr.right - 1 && rr.top <= tr.top + 1 && rr.bottom >= tr.bottom - 1;
          });
        for (const t of texts) {
          const tr = trOf(t);
          if (!tr.width || !tr.height) continue;
          const g1 = t.closest('g');
          const fs = parseFloat(getComputedStyle(t).fontSize);
          const rides = (t.getAttribute('class') || '').includes('ve-el');
          let overlapped = false;
          let adhered = false;
          for (const s of shapes) {
            const g2 = s.el.closest('g');
            if (g1 && g1 === g2) continue; // own group = its label home
            const tag = s.el.tagName.toLowerCase();
            const chip = chipOf(t, tr, g1);
            if ((rides || chip) && (tag === 'path' || tag === 'polyline' || tag === 'line')) continue; // riding lines is by design
            const sr = s.r;
            const ix = Math.min(tr.right, sr.right) - Math.max(tr.left, sr.left);
            const iy = Math.min(tr.bottom, sr.bottom) - Math.max(tr.top, sr.top);
            const cx = (tr.left + tr.right) / 2;
            const cy = (tr.top + tr.bottom) / 2;
            const insideBigBox =
              s.big && cx > sr.left && cx < sr.right && cy > sr.top && cy < sr.bottom &&
              sr.width * sr.height > 4 * tr.width * tr.height;
            if (ix > 2 && iy > 2 && ix * iy >= 24 && !insideBigBox) {
              const v = vRect(tr);
              warns.push(`figure-text-overlap: ${id} 文字「${(t.textContent || '').trim().slice(0, 12)}」(x${v.x},y${v.y}) 压在「${nameOf(s.el)}」上——挪开，或与该节点收进同一分组`);
              overlapped = true;
              break;
            }
            // adhesion: not overlapping a box-like shape, just glued to it
            if (!overlapped && !adhered && s.box && s.r.width > 20 && s.r.height > 12 && !insideBigBox &&
              !(tr.left >= sr.left - 1 && tr.right <= sr.right + 1 && tr.top >= sr.top - 1 && tr.bottom <= sr.bottom + 1)) {
              const gaps = [
                [tr.left - sr.right, '左'], [sr.left - tr.right, '右'],
                [tr.top - sr.bottom, '上'], [sr.top - tr.bottom, '下'],
              ] as [number, string][];
              for (const [gap, side] of gaps) {
                const g = gap / scale;
                if (g >= 0 && g < Math.max(4, fs * 0.35)) {
                  const v = vRect(tr);
                  warns.push(`figure-text-adhesion: ${id} 文字「${(t.textContent || '').trim().slice(0, 12)}」(x${v.x},y${v.y}) ${side}侧贴着「${nameOf(s.el)}」(间距 ${g.toFixed(0)}px)——缩短标签、拉开间距或抬高`);
                  adhered = true;
                  break;
                }
              }
            }
          }
        }
        for (let i = 0; i < texts.length; i++) {
          const a = texts[i];
          const ar = trOf(a);
          if (!ar.width) continue;
          const chipA = chipOf(a, ar, a.closest('g'));
          for (let j = i + 1; j < texts.length; j++) {
            const b = texts[j];
            if (a.closest('g') && a.closest('g') === b.closest('g')) continue; // stacked states in one node
            const br = trOf(b);
            if (!br.width) continue;
            const ix = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
            const iy = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
            if (ix > 2 && iy > 2 && ix * iy >= 24 && !(chipA && chipOf(b, br, b.closest('g'))))
              warns.push(`figure-text-overlap: ${id} 文字「${(a.textContent || '').trim().slice(0, 10)}」与「${(b.textContent || '').trim().slice(0, 10)}」叠在一起`);
          }
        }
      });
      return warns;
    });
  }

  /**
   * Render a standalone HTML fragment (tables, lists) to PNG. setContent
   * replaces the document, so the bundled font is re-injected per call.
   * The mermaid shell is NOT restored here — re-injecting the bundle on every
   * table/kpi would dominate mixed batches. `render()` lazily calls
   * `ensureMermaid` before the next diagram.
   */
  async renderHtml(html: string, background: string, label = ''): Promise<Buffer> {
    return this.run((page) => this.mark('block-render', () => screenshotGate(async () => {
      await page.setContent(html);
      if (this.assets.fontB64) await page.addStyleTag({ content: this.fontCss() });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const transparent = background === 'transparent';
      await page.evaluate((bg) => {
        document.body.style.background = bg;
      }, transparent ? 'transparent' : background);
      const box = (await page.evaluate(() => {
        const r = document.querySelector('.wrap')!.getBoundingClientRect();
        return { x: r.x, y: r.y, width: Math.ceil(r.width), height: Math.ceil(r.height) };
      })) as { x: number; y: number; width: number; height: number };
      await page.setViewport({ width: box.width, height: box.height, deviceScaleFactor: this.opts.scale });
      await page.bringToFront();
      return (await page.screenshot({
        clip: { x: 0, y: 0, width: box.width, height: box.height },
        omitBackground: transparent,
      })) as Buffer;
    }), label));
  }

  /**
   * Screenshot a full authored HTML document (`.html` input) as PNG. Unlike
   * extension blocks (renderHtml, measured on `.wrap`), the document keeps
   * its own background, styles and scripts; `--width` is the layout
   * viewport and the capture is fullPage. A `background` override is only
   * applied when the user passed --background explicitly.
   */
  async renderDocument(html: string, background: string | null, label = ''): Promise<Buffer> {
    return this.run((page) => this.mark('doc-render', () => screenshotGate(async () => {
      await page.setViewport({
        width: this.opts.width,
        height: Math.max(800, Math.round(this.opts.width * 0.75)),
        deviceScaleFactor: this.opts.scale,
      });
      await page.setContent(html);
      if (this.assets.fontB64) {
        await page.addStyleTag({ content: this.docFontCss() + this.cjkFallbackCss() });
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        // half-loaded remote images would screenshot as blank boxes
        await Promise.all(
          Array.from(document.images)
            .filter((i) => !i.complete)
            .map((i) => new Promise<void>((r) => { i.onload = () => r(); i.onerror = () => r(); })),
        );
      });
      // after fonts settle: fallback-font metrics would fake overflow/adhesion
      this.docLintWarnings = await this.figureLint(page);
      const transparent = background === 'transparent';
      if (background) {
        await page.evaluate((bg) => {
          document.body.style.background = bg;
        }, background);
      }
      // Shrink-to-fit. Width: an explicit body width narrower than --width
      // wins (fixed-canvas pages), then the true scroll extent at that
      // width. Height: body metrics only — documentElement.scrollHeight is
      // floored at the viewport height and would pad short pages to 800px.
      // The resize→re-measure pass absorbs reflow from the width change.
      const bw = (await page.evaluate(() =>
        Math.ceil(document.body.getBoundingClientRect().width))) as number;
      const w0 = bw > 0 && bw < this.opts.width ? bw : this.opts.width;
      await page.setViewport({
        width: w0,
        height: Math.max(800, Math.round(w0 * 0.75)),
        deviceScaleFactor: this.opts.scale,
      });
      const extent = (floor: number): Promise<{ w: number; h: number }> =>
        page.evaluate((f) => {
          const b = document.body;
          return {
            w: Math.ceil(Math.max(f, b.scrollWidth, b.getBoundingClientRect().width)),
            h: Math.ceil(Math.max(b.scrollHeight, b.getBoundingClientRect().height)),
          };
        }, floor) as Promise<{ w: number; h: number }>;
      let size = await extent(w0);
      size = { w: Math.max(w0, size.w), h: Math.max(1, size.h) };
      await page.setViewport({
        width: size.w,
        height: size.h,
        deviceScaleFactor: this.opts.scale,
      });
      const re = await extent(size.w);
      if (re.w > size.w || re.h > size.h) {
        size = { w: re.w, h: re.h };
        await page.setViewport({
          width: size.w,
          height: size.h,
          deviceScaleFactor: this.opts.scale,
        });
      }
      await page.bringToFront();
      return (await page.screenshot({
        clip: { x: 0, y: 0, width: size.w, height: size.h },
        omitBackground: transparent,
      })) as Buffer;
    }), label));
  }

  /** Drop leftover HTML-block DOM; re-inject mermaid only if the global is gone. */
  private async ensureMermaid(page: Page): Promise<void> {
    const state = await page.evaluate(() => {
      const m = (window as unknown as { mermaid?: { render?: unknown } }).mermaid;
      return {
        mermaid: typeof m?.render === 'function',
        dirty: document.body.childElementCount > 0,
      };
    });
    if (state.dirty) {
      await this.mark('page-reset', () => page.evaluate(() => {
        document.body.replaceChildren();
        document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:transparent';
      }));
    }
    if (state.mermaid) return;
    await this.mark('page-restore', () => this.initPage(page));
  }

  private async acquire(): Promise<Page> {
    const p = this.free.pop();
    if (p) return p;
    return this.mark('page-init', async () => {
      const page = await this.browser.newPage();
      await this.initPage(page);
      this.pages.push(page);
      return page;
    }, `page#${this.pages.length + 1}`);
  }

  /**
   * Render one diagram. Returns the standalone SVG string and, when needPng,
   * a hi-dpi PNG buffer taken from the same in-page layout. Throws on syntax
   * errors (suppressErrorRendering forces mermaid to throw instead of
   * returning an "error bomb" SVG).
   */
  async render(
    code: string,
    config: Record<string, unknown>,
    background: string,
    needPng: boolean,
    titlePos: 'top' | 'bottom' = 'top',
    titleText = '',
    // post-render hex→hex recolour for palettes mermaid hardcodes (journey);
    // applied to the svg string BEFORE it enters the DOM, so the PNG
    // screenshot and the returned SVG carry the same colours
    remap?: Record<string, string>,
  ): Promise<{ svg: string; png?: Buffer }> {
    return this.run(async (page) => {
      const label = code.split('\n').find((l) => l.trim())?.trim().slice(0, 30) ?? '';
      const padX = Renderer.PAD_X;
      const padY = Renderer.PAD_Y;
      await this.ensureMermaid(page);
      const engine = this.opts.engine;
      const stage = engine === 'pele' ? 'pele-render' : 'mermaid-render';
      const fc = (config.flowchart ?? {}) as Record<string, unknown>;
      const peleOpts = {
        fontFamily: typeof config.fontFamily === 'string' ? config.fontFamily : undefined,
        fontSize: typeof config.fontSize === 'number' ? config.fontSize : undefined,
        maxWidth: this.opts.width,
        autoDirection: true,
        padding: typeof fc.padding === 'number' ? fc.padding : undefined,
        config,
      };
      const peleStyle = engine === 'pele'
        ? peleCss(config, background) + (this.opts.extraCss ? `\n${this.opts.extraCss}` : '')
        : '';
      const res = (await this.mark(stage, () => page.evaluate(
        async ([code, config, background, titlePos, titleText, remap, engine, peleOpts, peleStyle]) => {
          const wm = window as unknown as {
            mermaid: {
              initialize: (c: Record<string, unknown>) => void;
              render: (id: string, code: string) => Promise<{ svg: string }>;
              registerLayoutLoaders: (l: unknown) => void;
            };
            pele?: { render: (source: string, options: Record<string, unknown>) => { svg: string } };
            __elkB64?: string;
            __elkReady?: boolean;
          };
          const mermaid = wm.mermaid;
          const id = 'mmdx-' + Math.random().toString(36).slice(2);
          let el: SVGSVGElement | null = null;

          // Pele first when selected: it lays out and routes on its own (wide
          // S-turn edges by default). Only an unsupported diagram type falls
          // through to mermaid — syntax/semantic errors fail loud like mermaid.
          if (engine === 'pele' && wm.pele) {
            try {
              let out = wm.pele.render(code, peleOpts).svg;
              if (peleStyle) out = out.replace(/(<svg\b[^>]*>)/, `$1<style>${peleStyle}</style>`);
              if (remap) {
                for (const [from, to] of Object.entries(remap)) {
                  out = out.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), to);
                }
              }
              const holder = document.createElement('div');
              holder.innerHTML = out;
              el = holder.querySelector('svg') as SVGSVGElement;
              if (!el) throw new Error('pele output contains no <svg>');
              document.body.appendChild(el);
            } catch (e) {
              if ((e as { code?: string }).code !== 'unsupported-diagram') {
                return { error: e instanceof Error ? e.message : String(e) } satisfies RawResult;
              }
              el = null;
            }
          }

          if (!el) {
            const isFlowchart = /^\s*(flowchart|graph)\b/m.test(code);
            const wantElk = isFlowchart && config.layoutAlgorithm === 'elk';
            const elkB64 = wm.__elkB64;
            if (wantElk && !wm.__elkReady && elkB64) {
              const bin = atob(elkB64 as string);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              const mod = (await import(URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' })))) as { default?: unknown };
              wm.mermaid.registerLayoutLoaders(mod.default ?? mod);
              wm.__elkReady = true;
            }
            mermaid.initialize({
              ...config,
              layoutAlgorithm: wantElk ? 'elk' : 'dagre',
              startOnLoad: false,
              suppressErrorRendering: true,
            });
            try {
              const { svg } = await mermaid.render(id, code);
              // mermaid v11 removes its temp nodes after render; re-attach the
              // svg ourselves so we can measure and screenshot it.
              let out = svg;
              if (remap) {
                for (const [from, to] of Object.entries(remap)) {
                  out = out.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), to);
                }
              }
              const holder = document.createElement('div');
              holder.innerHTML = out;
              el = holder.querySelector('svg') as SVGSVGElement;
              if (!el) throw new Error('render output contains no <svg>');
              document.body.appendChild(el);
            } catch (e) {
              document.getElementById(id)?.remove();
              return { error: e instanceof Error ? e.message : String(e) } satisfies RawResult;
            }
          }
          if (!el) return { error: 'render produced no output' } satisfies RawResult;
          el.id = id;

          // decorative elements that extend beyond logical content
          const isDecor = (n: Element): boolean =>
            n.tagName === 'defs' || /^(style|title|desc)$/.test(n.tagName) ||
            /lifeline|actor-line/i.test(n.getAttribute('class') || '');
          const CONTAINER = new Set(['g', 'svg', 'a', 'switch']);
          // measure leaf graphics only: a container's getBBox would include
          // skipped decorative children, defeating the exclusion
          const GRAPHIC = new Set([
            'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
            'path', 'text', 'image', 'foreignObject',
          ]);
          interface Rect { x0: number; y0: number; x1: number; y1: number }
          // A leaf's getBBox() is in its own local coordinate system; different
          // leaves live under different ancestor transforms. Map every bbox
          // through getCTM() into the root svg's coordinate space before
          // unioning, or the combined bounds are garbage.
          const toRootRect = (c: Element): Rect | null => {
            try {
              const g = c as SVGGraphicsElement;
              const b = g.getBBox();
              // getCTM maps into VIEWPORT space, which includes the (stale)
              // root viewBox scale; divide it out so all leaves land in the
              // root's own user space, the space the viewBox is written in.
              const root = el.getCTM();
              const mRaw = g.getCTM();
              if (!mRaw || !root) return null;
              const m = root.inverse().multiply(mRaw);
              if (!m || !Number.isFinite(b.width) || !Number.isFinite(b.height)) return null;
              const px = (x: number, y: number): [number, number] => [
                x * m.a + y * m.c + m.e,
                x * m.b + y * m.d + m.f,
              ];
              const [ax, ay] = px(b.x, b.y);
              const [bx, by] = px(b.x + b.width, b.y + b.height);
              return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) };
            } catch {
              return null;
            }
          };
          const contentBounds = (skip: Element | null): Rect | null => {
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            const walk = (node: Element): void => {
              for (const c of node.children) {
                if (c === skip || isDecor(c)) continue;
                if (CONTAINER.has(c.tagName)) { walk(c); continue; }
                if (GRAPHIC.has(c.tagName)) {
                  const r = toRootRect(c);
                  if (r) {
                    x0 = Math.min(x0, r.x0); y0 = Math.min(y0, r.y0);
                    x1 = Math.max(x1, r.x1); y1 = Math.max(y1, r.y1);
                  }
                }
              }
            };
            walk(el);
            return x1 > -Infinity ? { x0, y0, x1, y1 } : null;
          };

          // move an embedded title below the diagram when asked. Mermaid gives
          // the title different (often no) class names per diagram type, so
          // locate it by its text content. All math happens in root space;
          // the delta is converted back into the title's local space.
          let titleRect: Rect | null = null;
          if (titlePos === 'bottom') {
            const wanted = (titleText || '').trim();
            const t = [...el.querySelectorAll('text')].find((n) => {
              const s = (n.textContent || '').trim();
              return wanted ? s === wanted : /itle/.test(n.getAttribute?.('class') || '');
            });
            if (t) {
              const c = contentBounds(t);
              const rT = toRootRect(t);
              if (c && rT) {
                const gap = 20;
                // delta wanted in root space
                const dr = {
                  x: (c.x0 + c.x1) / 2 - (rT.x0 + rT.x1) / 2,
                  y: c.y1 + gap - rT.y0,
                };
                // translate the element by dr, expressed in its local space
                const m = t.getCTM()!;
                const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
                const prev = t.getAttribute('transform');
                const local = `translate(${dr.x / s} ${dr.y / s})`;
                t.setAttribute('transform', prev ? `${prev} ${local}` : local);
                titleRect = {
                  x0: rT.x0 + dr.x, y0: rT.y0 + dr.y,
                  x1: rT.x1 + dr.x, y1: rT.y1 + dr.y,
                };
              }
            }
          }

          // re-derive the viewBox from actual content — mermaid's own
          // viewBox/height under-measures wrapped CJK labels and includes
          // decorative overflow.
          const padX = 20;
          const padY = 12;
          const bb = contentBounds(null);
          const x0 = Math.min(bb ? bb.x0 : Infinity, titleRect ? titleRect.x0 : Infinity) - padX;
          const y0 = Math.min(bb ? bb.y0 : Infinity, titleRect ? titleRect.y0 : Infinity) - padY;
          const x1 = Math.max(bb ? bb.x1 : -Infinity, titleRect ? titleRect.x1 : -Infinity) + padX;
          const y1 = Math.max(bb ? bb.y1 : -Infinity, titleRect ? titleRect.y1 : -Infinity) + padY;
          const w = x1 - x0;
          const h = y1 - y0;
          if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
            el.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`);
            el.setAttribute('width', String(w));
            el.setAttribute('height', String(h));
          }
          el.style.maxWidth = 'none';
          el.style.overflow = 'hidden';
          el.style.backgroundColor = background;
          const rect = el.getBoundingClientRect();
          return {
            id,
            svg: el.outerHTML,
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          } satisfies RawResult;
        },
        [code, config, background, titlePos, titleText, remap ?? null, engine, peleOpts, peleStyle] as [
          string, Record<string, unknown>, string, 'top' | 'bottom', string,
          Record<string, string> | null, Engine, Record<string, unknown>, string,
        ],
      ))) as RawResult;

      if (res.error || !res.svg || !res.id) {
        throw new Error(res.error || 'mermaid.render produced no output');
      }
      const resId: string = res.id;

      let png: Buffer | undefined;
      if (needPng) {
        const transparent = background === 'transparent';
        // Parallel large screenshots make the software rasterizer stall
        // (Page.captureScreenshot timing out for minutes). Sizing the
        // viewport to the diagram keeps captures on the fast path, a
        // global mutex serializes the raster work across pooled pages, and
        // bringToFront makes the tab eligible for capture at all.
        png = await screenshotGate(() => this.mark('screenshot', async () => {
          await page.evaluate(
            ([id, bg]) => {
              const el = document.getElementById(id)!;
              document.body.style.background = bg;
            },
            [resId, transparent ? 'transparent' : background] as [string, string],
          );
          const size = await page.evaluate((id) => {
            const el = document.getElementById(id)!;
            const r = el.getBoundingClientRect();
            return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
          }, resId);
          const cur = page.viewport();
          const vw = Math.min(16_000, Math.max(320, size.w));
          const vh = Math.min(16_000, Math.max(320, size.h));
          if (cur && (cur.width !== vw || cur.height !== vh)) {
            await page.setViewport({ width: vw, height: vh, deviceScaleFactor: this.opts.scale });
          }
          await page.bringToFront();
          const first = (await page.screenshot({
            clip: { x: 0, y: 0, width: size.w, height: size.h },
            omitBackground: transparent,
          })) as Buffer;
          // geometric bounds miss marker arrowheads and glyph overshoot; a
          // second capture clipped to the actual ink gives pixel-exact,
          // symmetric file margins
          const ink = inkBBox(first);
          if (!ink) return first;
          const sc = this.opts.scale;
          const mx = Math.max(1, padX * sc - 2);
          const my = Math.max(1, padY * sc - 2);
          const clip = {
            x: Math.max(0, (ink.x0 - mx) / sc),
            y: Math.max(0, (ink.y0 - my) / sc),
            width: (ink.x1 - ink.x0 + 1 + 2 * mx) / sc,
            height: (ink.y1 - ink.y0 + 1 + 2 * my) / sc,
          };
          return (await page.screenshot({
            clip,
            omitBackground: transparent,
          })) as Buffer;
        }, label));
      }

      await page.evaluate((id) => {
        document.getElementById(id)?.remove();
        document.body.style.background = 'transparent';
      }, resId);

      return { svg: res.svg, png };
    });
  }

  private async run<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const page = await this.acquire();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // a wedged renderer (bad diagram, crashed tab) must fail loud, never hang
      return await Promise.race([
        fn(page),
        new Promise<never>((_, rej) => {
          timer = setTimeout(() => rej(new Error('render timed out after 60s')), 60_000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
      this.free.push(page);
    }
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}
