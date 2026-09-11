// Rendering core: one Chromium (detected Edge/Chrome) shared by pooled pages.
// Each page loads Mermaid (UMD), optionally the ELK layout engine, and the
// bundled CJK font once, then renders many diagrams.

import fs from 'node:fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { PNG } from 'pngjs';
import type { Assets } from './embed.ts';

export type Layout = 'elk' | 'dagre';

export interface RendererOptions {
  browserPath?: string;
  layout: Layout;
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
      const res = (await this.mark('mermaid-render', () => page.evaluate(
        async ([code, config, background, titlePos, titleText, remap]) => {
          const wm = window as unknown as {
            mermaid: {
              initialize: (c: Record<string, unknown>) => void;
              render: (id: string, code: string) => Promise<{ svg: string }>;
              registerLayoutLoaders: (l: unknown) => void;
            };
            __elkB64?: string;
            __elkReady?: boolean;
          };
          const mermaid = wm.mermaid;
          const isFlowchart = /^\s*(flowchart|graph)/m.test(code);
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
          const id = 'mmdx-' + Math.random().toString(36).slice(2);
          let el: SVGSVGElement;
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
        [code, config, background, titlePos, titleText, remap ?? null] as [string, Record<string, unknown>, string, 'top' | 'bottom', string, Record<string, string> | null],
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
