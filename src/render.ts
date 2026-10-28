// Rendering core: one Chromium (detected Edge/Chrome) shared by pooled pages.
// Engine bundles are injected lazily, so a Pele batch never parses Mermaid and
// a Mermaid fallback never parses Pele.

import fs from 'node:fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { screenshotGate } from './capture.ts';
import type { Assets } from './embed.ts';
import { mermaidEngine } from './engine/mermaid.ts';
import { peleEngine } from './engine/pele.ts';
import type { EngineId, EngineRenderOptions, MarkFn } from './engine/types.ts';
import { auditContrast, auditLayout, auditSvgText, type LayoutIssue } from './lint.ts';

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

  /** Inject the engine bundle (and font) after a page reset, once per document. */
  private async ensureEngine(page: Page, engine: EngineId): Promise<void> {
    const state = await page.evaluate((e) => ({
      ready: e === 'pele'
        ? typeof (window as unknown as { pele?: { render?: unknown } }).pele?.render === 'function'
        : typeof (window as unknown as { mermaid?: { render?: unknown } }).mermaid?.render === 'function',
      font: !!document.querySelector('style[data-mmdx-font]'),
    }), engine);

    if (this.assets.fontB64 && !state.font) await this.injectFont(page);
    if (state.ready) return;

    if (engine === 'pele') {
      if (!this.assets.peleJs) throw new Error('pele asset missing — run the build or vendor/pele.global.js');
      await this.mark('init-pele', () => page.addScriptTag({ content: this.assets.peleJs }));
      return;
    }

    if (!this.assets.mermaidJs) throw new Error('mermaid asset missing — run the build');
    await this.mark('init-mermaid', () => page.addScriptTag({ content: this.assets.mermaidJs }));
    if (this.opts.layout === 'elk' && this.assets.elkJs) {
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

  /** Render one diagram through the selected engine. */
  async render(opts: EngineRenderOptions): Promise<{ svg: string; png?: Buffer }> {
    return this.run(async (page) => {
      await this.resetBody(page);
      await this.ensureEngine(page, opts.engine);
      const engine = opts.engine === 'pele' ? peleEngine : mermaidEngine;
      return engine.render(page, { ...opts, roughJs: this.assets.roughJs }, this.mark.bind(this) as MarkFn);
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
