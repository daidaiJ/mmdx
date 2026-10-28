// Pele engine: Mermaid syntax -> SVG in the page, then the shared PNG capture.
// Pele is synchronous and paints through CSS variables, so the theme is a
// <style> block inside the SVG rather than a Mermaid config object.

import type { Page } from 'puppeteer-core';
import { captureElement } from '../capture.ts';
import { peleCss } from '../themes.ts';
import type { Engine, EngineRenderOptions, EngineResult, MarkFn } from './types.ts';

export const peleEngine: Engine = {
  id: 'pele',
  async render(page: Page, opts: EngineRenderOptions, mark: MarkFn): Promise<EngineResult> {
    const css = peleCss(opts.theme, {
      strokeWidth: opts.theme.style?.strokeWidth ?? (opts.fontSize >= 18 ? 2 : 1.5),
      labelWeight: opts.fontSize >= 18 ? 600 : undefined,
    });
    const id = 'mmdx-pele-' + Math.random().toString(36).slice(2);

    if (opts.theme.style?.rough) {
      if (!opts.roughJs) throw new Error('rough.js asset missing — run the build or vendor/rough.js');
      const ready = await page.evaluate(() =>
        typeof (window as unknown as { rough?: { svg?: unknown } }).rough?.svg === 'function');
      if (!ready) await page.addScriptTag({ content: opts.roughJs });
    }

    const res = (await mark('pele-render', () => page.evaluate(
      async ([code, themeCss, elId, fontSize, fontFamily, maxWidth, flowchart, iconPacksJson, flatten, background, rough, roughStyle]) => {
        const w = window as unknown as {
          pele?: { render: (s: string, o: Record<string, unknown>) => { svg: string; width: number; height: number } };
        };
        if (!w.pele) throw new Error('pele bundle not loaded');
        const packs = JSON.parse(iconPacksJson as string) as Array<{ name: string; json: string }>;
        const icons: Record<string, string> = {};
        for (const p of packs) {
          const data = JSON.parse(p.json) as {
            width?: number; height?: number;
            icons?: Record<string, { body: string; width?: number; height?: number }>;
          };
          const baseW = data.width ?? 24;
          const baseH = data.height ?? 24;
          for (const [name, icon] of Object.entries(data.icons ?? {})) {
            const iw = icon.width ?? baseW;
            const ih = icon.height ?? baseH;
            const inner = iw === 24 && ih === 24
              ? icon.body
              : `<g transform="scale(${24 / iw} ${24 / ih})">${icon.body}</g>`;
            icons[`${p.name}:${name}`] = inner;
          }
        }

        if (document.fonts?.load) {
          try {
            await document.fonts.load(`500 ${fontSize}px "Noto Sans SC"`, '中文English');
            await document.fonts.ready;
          } catch { /* fall back to the built-in measurer */ }
        }

        let out: { svg: string; width: number; height: number };
        try {
          out = w.pele.render(code as string, {
            idPrefix: elId,
            fontFamily,
            fontSize,
            padding: 0,
            responsive: false,
            autoDirection: false,
            maxWidth,
            config: flowchart && Object.keys(flowchart as object).length
              ? { flowchart }
              : undefined,
            icons: (name: string) => icons[name] ?? null,
          });
        } catch (e) {
          throw new Error('pele: ' + (e instanceof Error ? e.message : String(e)));
        }

        const holder = document.createElement('div');
        holder.innerHTML = out.svg;
        const el = holder.querySelector('svg') as SVGSVGElement | null;
        if (!el) throw new Error('pele produced no <svg>');
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.id = elId + '-theme';
        style.textContent = themeCss as string;
        el.insertBefore(style, el.firstChild);

        const vb = (el.getAttribute('viewBox') || `0 0 ${out.width} ${out.height}`).split(/\s+/).map(Number);
        const x0 = Number.isFinite(vb[0]) ? vb[0] : 0;
        const y0 = Number.isFinite(vb[1]) ? vb[1] : 0;
        const bw = Number.isFinite(vb[2]) ? vb[2] : out.width;
        const bh = Number.isFinite(vb[3]) ? vb[3] : out.height;
        el.setAttribute('viewBox', `${x0 - 20} ${y0 - 12} ${bw + 40} ${bh + 24}`);
        el.setAttribute('width', String(bw + 40));
        el.setAttribute('height', String(bh + 24));
        el.id = elId as string;
        el.style.maxWidth = 'none';
        el.style.overflow = 'hidden';
        el.style.backgroundColor = background === 'transparent' ? 'transparent' : background;
        document.body.appendChild(el);

        if (rough) {
          const r = (window as unknown as {
            rough?: {
              svg: (el: SVGElement) => {
                path: (d: string, o: unknown) => Element;
                rectangle: (x: number, y: number, w: number, h: number, o: unknown) => Element;
                polygon: (p: Array<[number, number]>, o: unknown) => Element;
                circle: (x: number, y: number, d: number, o: unknown) => Element;
                ellipse: (x: number, y: number, w: number, h: number, o: unknown) => Element;
              };
            };
          }).rough;
          if (r) {
            const rc = r.svg(el);
            const css = (n: Element) => getComputedStyle(n);
            const dash = (n: Element) => {
              const d = css(n).strokeDasharray;
              return d && d !== 'none'
                ? d.split(/[ ,]+/).map(parseFloat).filter((x) => !Number.isNaN(x))
                : undefined;
            };
            const rs = roughStyle as Record<string, unknown>;
            const optsFor = (n: Element, extra: Record<string, unknown> = {}) => {
              const s = css(n);
              const fill = s.fill && s.fill !== 'none' && s.fill !== 'rgba(0, 0, 0, 0)'
                ? s.fill
                : undefined;
              return {
                stroke: s.stroke === 'none' ? undefined : s.stroke,
                strokeWidth: parseFloat(s.strokeWidth) || (rs.strokeWidth as number) || 1.5,
                fill,
                fillStyle: (rs.fillStyle as string) ?? 'solid',
                hachureAngle: (rs.hachureAngle as number) ?? -41,
                hachureGap: (rs.hachureGap as number) ?? 7,
                fillWeight: (rs.fillWeight as number) ?? 1.1,
                roughness: (rs.roughness as number) ?? 1,
                bowing: (rs.bowing as number) ?? 1.2,
                seed: (rs.seed as number) ?? 41,
                preserveVertices: true,
                strokeLineDash: dash(n),
                ...extra,
              };
            };
            const roundedPath = (x: number, y: number, w: number, h: number, radius: number) => {
              const r0 = Math.max(0, Math.min(radius, w / 2, h / 2));
              if (!r0) return null;
              return `M${x + r0},${y} h${w - 2 * r0} a${r0},${r0} 0 0 1 ${r0},${r0} v${h - 2 * r0} a${r0},${r0} 0 0 1 ${-r0},${r0} h${-(w - 2 * r0)} a${r0},${r0} 0 0 1 ${-r0},${-r0} v${-(h - 2 * r0)} a${r0},${r0} 0 0 1 ${r0},${-r0} z`;
            };
            const replace = (n: Element, o: Record<string, unknown>): boolean => {
              const tag = n.tagName.toLowerCase();
              let node: Element | null = null;
              if (tag === 'rect') {
                const x = +(n.getAttribute('x') || 0);
                const y = +(n.getAttribute('y') || 0);
                const w = +(n.getAttribute('width') || 0);
                const h = +(n.getAttribute('height') || 0);
                const rx = Math.max(
                  parseFloat(n.getAttribute('rx') || '0') || 0,
                  parseFloat(css(n).getPropertyValue('rx') || '0') || 0,
                );
                const d = roundedPath(x, y, w, h, rx);
                node = d ? rc.path(d, o) : rc.rectangle(x, y, w, h, o);
              } else if (tag === 'polygon') {
                const pts = (n.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
                const points: Array<[number, number]> = [];
                for (let i = 0; i < pts.length; i += 2) points.push([pts[i], pts[i + 1]]);
                node = rc.polygon(points, o);
              } else if (tag === 'circle') {
                node = rc.circle(
                  +(n.getAttribute('cx') || 0), +(n.getAttribute('cy') || 0),
                  2 * +(n.getAttribute('r') || 0), o,
                );
              } else if (tag === 'ellipse') {
                node = rc.ellipse(
                  +(n.getAttribute('cx') || 0), +(n.getAttribute('cy') || 0),
                  2 * +(n.getAttribute('rx') || 0), 2 * +(n.getAttribute('ry') || 0), o,
                );
              } else if (tag === 'path') {
                const d = n.getAttribute('d');
                node = d ? rc.path(d, o) : null;
              }
              if (!node) return false;
              const tf = n.getAttribute('transform');
              if (tf) node.setAttribute('transform', tf);
              n.parentNode?.insertBefore(node, n);
              n.remove();
              return true;
            };
            for (const g of Array.from(el.querySelectorAll('.pele-node'))) {
              for (const child of Array.from(g.children)) {
                if (!['rect', 'polygon', 'circle', 'ellipse', 'path'].includes(child.tagName.toLowerCase())) continue;
                if (child.classList.contains('pele-divider') || child.classList.contains('pele-er-divider')) continue;
                if (child.closest('.pele-icon')) continue;
                replace(child, optsFor(child));
              }
            }
            for (const g of Array.from(el.querySelectorAll('.pele-cluster'))) {
              for (const child of Array.from(g.children)) {
                if (child.tagName.toLowerCase() !== 'rect') continue;
                replace(child, optsFor(child, { fill: undefined, fillStyle: 'solid', roughness: 0.8 }));
              }
            }
            for (const p of Array.from(el.querySelectorAll('.pele-edge > path:not(.pele-marker)'))) {
              replace(p, optsFor(p, { fill: undefined, fillStyle: 'solid', roughness: 0.9 }));
            }
          }
        }

        if (flatten) {
          const nodes: Element[] = [el, ...Array.from(el.querySelectorAll('*'))];
          for (const node of nodes) {
            if (node.tagName === 'style') continue;
            // Icon bodies carry their own fills; baking the wrapper's
            // fill:none would erase icons that rely on inherited paint.
            if ((node as Element).closest?.('.pele-icon')) continue;
            const cs = getComputedStyle(node as Element);
            for (const prop of [
              'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
              'stroke-linejoin', 'fill-opacity', 'stroke-opacity', 'opacity', 'color',
              'font-family', 'font-size', 'font-weight', 'letter-spacing',
              'text-anchor', 'dominant-baseline', 'stop-color', 'stop-opacity', 'rx', 'ry',
            ]) {
              const value = cs.getPropertyValue(prop);
              if (value) (node as SVGElement).style.setProperty(prop, value);
            }
            for (const prop of ['fill', 'stroke', 'color']) {
              const attr = node.getAttribute(prop);
              if (attr && attr.includes('var(')) {
                const value = cs.getPropertyValue(prop);
                if (value) node.setAttribute(prop, value);
              }
            }
          }
          el.querySelector('#' + elId + '-theme')?.remove();
        }

        return { svg: el.outerHTML, width: bw + 40, height: bh + 24 };
      },
      [
        opts.code, css, id, opts.fontSize,
        opts.theme.fontFamily ?? 'sans-serif',
        opts.width,
        opts.flowchart ?? null,
        JSON.stringify(opts.iconPacks ?? []),
        !opts.svgThemeable,
        opts.background,
        !!opts.theme.style?.rough,
        opts.theme.style ?? {},
      ] as [
        string, string, string, number, string, number,
        Record<string, number> | null, string, boolean, string,
        boolean, Record<string, unknown>,
      ],
    ))) as { svg: string; width: number; height: number };

    const png = opts.needPng
      ? await mark('screenshot', () => captureElement(page, id, opts.background, opts.scale))
      : undefined;

    await page.evaluate((elId) => document.getElementById(elId)?.remove(), id);
    return { svg: res.svg, png };
  },
};
