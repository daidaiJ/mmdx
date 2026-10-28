// Legacy Mermaid engine. Kept as the compatibility fallback: ELK layout,
// Mermaid-only config keys, and diagrams Pele cannot parse.

import type { Page } from 'puppeteer-core';
import { captureElement } from '../capture.ts';
import type { Engine, EngineRenderOptions, EngineResult, MarkFn } from './types.ts';

interface RawResult {
  error?: string;
  svg?: string;
  box?: { x: number; y: number; width: number; height: number };
  id?: string;
}

export const mermaidEngine: Engine = {
  id: 'mermaid',
  async render(page: Page, opts: EngineRenderOptions, mark: MarkFn): Promise<EngineResult> {
    const config = opts.mermaidConfig;

    const res = (await mark('mermaid-render', () => page.evaluate(
      async ([code, config, background, titlePos, titleText, remap, layout]) => {
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
        const isFlowchart = /^\s*(flowchart|graph)\b/m.test(code);
        const wantElk = isFlowchart && layout === 'elk';
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
          el.id = id;
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
      [opts.code, config, opts.background, opts.titlePos, opts.titleText, opts.remap ?? null, opts.layout] as [
        string, Record<string, unknown>, string, 'top' | 'bottom', string, Record<string, string> | null, 'elk' | 'dagre',
      ],
    ))) as RawResult;

    if (res.error || !res.svg || !res.id) {
      throw new Error(res.error || 'mermaid.render produced no output');
    }
    const resId: string = res.id;

    const png = opts.needPng
      ? await mark('screenshot', () => captureElement(page, resId, opts.background, opts.scale))
      : undefined;

    await page.evaluate((id) => {
      document.getElementById(id)?.remove();
      document.body.style.background = 'transparent';
    }, resId);

    return { svg: res.svg, png };
  },
};
