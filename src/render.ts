// Rendering core: one Chromium (detected Edge/Chrome) shared by pooled pages.
// Engine bundles are injected lazily, so a Pele batch never parses Mermaid and
// a Mermaid fallback never parses Pele.

import fs from 'node:fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { screenshotGate } from './capture.ts';
import type { Assets } from './embed.ts';
import { peleEngine } from './engine/pele.ts';
import type { EngineRenderOptions, MarkFn } from './engine/types.ts';
import { auditContrast, auditLayout, auditSvgText, type LayoutIssue } from './lint.ts';

export interface RendererOptions {
  browserPath?: string;
  scale: number;
  width: number;
  /** iconify packs preloaded for `@{icon: pack:icon}` node syntax */
  iconPacks?: Array<{ name: string; json: string }>;
  /** record per-stage timings into renderer.profile */
  profile?: boolean;
}

export interface ProfileEntry {
  stage: string;
  ms: number;
  label?: string;
}

const PAGE_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><style>' +
  'body{margin:0;padding:0;overflow:hidden;}' +
  'svg{display:block;}' +
  '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' +
  '</style></head><body></body></html>';

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
    if (!this.assets.fontB64) return;
    await this.mark('init-font', () => this.injectFont(page));
  }

  private async injectFont(page: Page): Promise<void> {
    if (!this.assets.fontB64) return;
    await page.evaluate((css) => {
      if (document.querySelector('style[data-mmdx-font]')) return;
      const s = document.createElement('style');
      s.setAttribute('data-mmdx-font', '1');
      s.textContent = css;
      document.head.appendChild(s);
    }, this.fontCss());
    // Mermaid and Pele both measure labels before drawing; a web font that
    // is not loaded yet yields fallback metrics and clipped labels.
    await page.evaluate(async () => {
      try {
        await document.fonts.load('500 15px "Noto Sans SC"', '中文English');
        await document.fonts.ready;
      } catch { /* built-in measurer */ }
    });
  }

  private fontCss(): string {
    return (
      `@font-face{font-family:'Noto Sans SC';` +
      `src:url(data:font/woff2;base64,${this.assets.fontB64}) format('woff2');` +
      `font-weight:100 900;font-style:normal;font-display:block;}`
    );
  }

  private async resetBody(page: Page): Promise<void> {
    const dirty = await page.evaluate(() => document.body.childElementCount > 0);
    if (!dirty) return;
    await this.mark('page-reset', () => page.evaluate(() => {
      document.body.replaceChildren();
      document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:transparent';
    }));
  }

  /** Inject the Pele bundle (and font) after a page reset, once per document. */
  private async ensurePele(page: Page): Promise<void> {
    const state = await page.evaluate(() => ({
      ready: typeof (window as unknown as { pele?: { render?: unknown } }).pele?.render === 'function',
      font: !!document.querySelector('style[data-mmdx-font]'),
    }));

    if (this.assets.fontB64 && !state.font) await this.injectFont(page);
    if (state.ready) return;

    if (!this.assets.peleJs) throw new Error('pele asset missing — run the build or vendor/pele.global.js');
    await this.mark('init-pele', () => page.addScriptTag({ content: this.assets.peleJs }));
  }

  private async renderHtmlPage(
    page: Page,
    html: string,
    background: string,
    label: string,
    audit: boolean,
  ): Promise<{ png: Buffer; issues: LayoutIssue[] }> {
    return this.mark('block-render', () => screenshotGate(async () => {
      await page.setContent(html);
      await this.injectFont(page);
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
      const issues = audit
        ? [
            ...(await auditLayout(page)),
            ...(await auditSvgText(page)),
            ...(await auditContrast(page)),
          ]
        : [];
      const png = (await page.screenshot({
        clip: { x: 0, y: 0, width: box.width, height: box.height },
        omitBackground: transparent,
      })) as Buffer;
      return { png, issues };
    }), label);
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
    })));
  }

  /**
   * Render a standalone HTML fragment (tables, lists) to PNG. setContent
   * replaces the document, so the bundled font is re-injected per call and
   * engine globals are lazily restored by the next `render()`.
   */
  async renderHtml(html: string, background: string, label = ''): Promise<Buffer> {
    return this.run(async (page) => (await this.renderHtmlPage(page, html, background, label, false)).png);
  }

  /** Same as renderHtml, plus DOM-level overflow/collision findings. */
  async renderHtmlAudit(
    html: string,
    background: string,
    label = '',
  ): Promise<{ png: Buffer; issues: LayoutIssue[] }> {
    return this.run((page) => this.renderHtmlPage(page, html, background, label, true));
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

  /** Render one diagram through Pele. */
  async render(opts: EngineRenderOptions): Promise<{ svg: string; png?: Buffer }> {
    return this.run(async (page) => {
      await this.resetBody(page);
      await this.ensurePele(page);
      return peleEngine.render(page, { ...opts, roughJs: this.assets.roughJs }, this.mark.bind(this) as MarkFn);
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
