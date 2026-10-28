// Layout and pixel checks used by the visual lint. These complement the
// whole-image margin analysis: the DOM audit sees clipped text and elements
// that paint outside the page, and diffPng makes render determinism explicit.

import type { Page } from 'puppeteer-core';
import { PNG } from 'pngjs';

export type LayoutIssueKind =
  | 'missing-root'
  | 'root-overflow'
  | 'text-overflow'
  | 'element-outside'
  | 'caption-overlap'
  | 'low-contrast';

export interface LayoutIssue {
  kind: LayoutIssueKind;
  selector: string;
  detail: string;
}

/** Inspect the rendered block page before screenshotting it. */
export async function auditLayout(page: Page, rootSelector = '.wrap'): Promise<LayoutIssue[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector) as HTMLElement | null;
    if (!root) {
      return [{ kind: 'missing-root', selector, detail: `no element matches ${selector}` }];
    }

    const issues: LayoutIssue[] = [];
    const describe = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      return cls ? `${tag}.${cls}` : tag;
    };

    const rootBox = root.getBoundingClientRect();
    if (root.scrollWidth > root.clientWidth + 1) {
      issues.push({
        kind: 'root-overflow',
        selector: describe(root),
        detail: `scrollWidth ${root.scrollWidth} > clientWidth ${root.clientWidth}`,
      });
    }

    for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      if (el.closest('svg')) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      if (
        box.left < rootBox.left - 1 || box.right > rootBox.right + 1 ||
        box.top < rootBox.top - 1 || box.bottom > rootBox.bottom + 1
      ) {
        issues.push({
          kind: 'element-outside',
          selector: describe(el),
          detail: `box ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)} outside ${Math.round(rootBox.width)}x${Math.round(rootBox.height)}`,
        });
      }

      const clips = style.overflowX === 'hidden' || style.overflowX === 'clip';
      if (clips && el.scrollWidth > el.clientWidth + 1) {
        issues.push({
          kind: 'text-overflow',
          selector: describe(el),
          detail: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
        });
      }
    }

    const head = root.querySelector('.caption-head');
    const content = Array.from(root.children).find(
      (el) => !el.classList.contains('caption-head') && !el.classList.contains('caption-foot'),
    );
    if (head && content) {
      const a = head.getBoundingClientRect();
      const b = content.getBoundingClientRect();
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlap > 1) {
        issues.push({
          kind: 'caption-overlap',
          selector: `${describe(head)} / ${describe(content)}`,
          detail: `vertical overlap ${Math.round(overlap)}px`,
        });
      }
    }

    return issues.slice(0, 30);
  }, rootSelector) as Promise<LayoutIssue[]>;
}

/**
 * SVG labels must fit their node. Checks screen rectangles rather than SVG
 * text metrics because Pele writes each line as its own <text> and applies the
 * node transform on the group.
 */
export async function auditSvgText(page: Page, rootSelector = '.wrap'): Promise<LayoutIssue[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return [];
    const svg = root.querySelector('svg');
    if (!svg) return [];
    const issues: LayoutIssue[] = [];
    const describe = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      return cls ? `${tag}.${cls}` : tag;
    };
    for (const node of Array.from(svg.querySelectorAll('.pele-node'))) {
      const shape = node.querySelector(':scope > rect, :scope > polygon, :scope > circle, :scope > ellipse, :scope > path');
      if (!shape) continue;
      const sb = shape.getBoundingClientRect();
      if (sb.width < 2 || sb.height < 2) continue;
      for (const text of Array.from(node.querySelectorAll('text'))) {
        if (!text.textContent?.trim()) continue;
        const tb = text.getBoundingClientRect();
        if (tb.width === 0 || tb.height === 0) continue;
        const overX = Math.max(sb.left - tb.left, tb.right - sb.right);
        const overY = Math.max(sb.top - tb.top, tb.bottom - sb.bottom);
        if (overX > 2 || overY > 4) {
          issues.push({
            kind: 'text-overflow',
            selector: `${describe(node)} text`,
            detail: `label "${text.textContent.trim().slice(0, 24)}" overflows shape by ` +
              `${Math.round(Math.max(overX, 0))}x${Math.round(Math.max(overY, 0))}px ` +
              `(node ${Math.round(sb.width)}x${Math.round(sb.height)})`,
          });
        }
      }
    }
    return issues.slice(0, 30);
  }, rootSelector) as Promise<LayoutIssue[]>;
}

/** Rendered-text contrast for SVG labels, not just theme tokens. */
export async function auditContrast(page: Page, rootSelector = '.wrap'): Promise<LayoutIssue[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return [];
    const svg = root.querySelector('svg');
    if (!svg) return [];
    const issues: LayoutIssue[] = [];

    const parse = (value: string): [number, number, number, number] | null => {
      const v = value.trim().toLowerCase();
      if (v === 'transparent') return [0, 0, 0, 0];
      const m = /^rgba?\(([^)]+)\)$/.exec(v);
      if (m) {
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (p.length >= 3) return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
      }
      const h = /^#([0-9a-f]{3,8})$/.exec(v);
      if (h) {
        let s = h[1];
        if (s.length === 3) s = s.split('').map((c) => c + c).join('');
        if (s.length === 6 || s.length === 8) {
          return [
            parseInt(s.slice(0, 2), 16),
            parseInt(s.slice(2, 4), 16),
            parseInt(s.slice(4, 6), 16),
            s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1,
          ];
        }
      }
      return null;
    };
    const hex = (c: [number, number, number]): string =>
      '#' + c.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
    const lum = (c: [number, number, number]): number => {
      const f = (n: number) => {
        const s = n / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const ratio = (a: [number, number, number], b: [number, number, number]): number => {
      const l1 = lum(a);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const background = (el: Element): [number, number, number] => {
      let n: Element | null = el;
      while (n) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c[3] > 0.01) return [c[0], c[1], c[2]];
        n = n.parentElement;
      }
      const body = parse(getComputedStyle(document.body).backgroundColor);
      return body ? [body[0], body[1], body[2]] : [255, 255, 255];
    };

    for (const text of Array.from(svg.querySelectorAll('text'))) {
      if (!text.textContent?.trim()) continue;
      if (text.querySelector('tspan')) continue;
      const style = getComputedStyle(text);
      if (style.visibility === 'hidden' || style.opacity === '0') continue;
      const fill = parse(style.fill);
      if (!fill || fill[3] === 0) continue;
      const bg = background(text);
      const r = ratio([fill[0], fill[1], fill[2]], bg);
      if (r < 3.0) {
        const cls = (text.getAttribute('class') ?? 'text').trim();
        issues.push({
          kind: 'low-contrast',
          selector: `text.${cls.split(/\s+/)[0]}`,
          detail: `"${text.textContent.trim().slice(0, 20)}" ${hex([fill[0], fill[1], fill[2]])} on ${hex(bg)} = ${r.toFixed(2)}:1`,
        });
      }
    }
    return issues.slice(0, 30);
  }, rootSelector) as Promise<LayoutIssue[]>;
}

/** Fixed 2x padding or 5% of a tall page, whichever is larger. */
export function bottomBlankLimit(height: number): number {
  return Math.max(90, Math.round(height * 0.05));
}

export interface PixelDiff {
  width: number;
  height: number;
  diffPixels: number;
  ratio: number;
  sizeMismatch: boolean;
}

/** Per-pixel diff with a channel tolerance; enough to catch nondeterminism. */
export function diffPng(a: Buffer, b: Buffer, channelTolerance = 2): PixelDiff {
  const ia = PNG.sync.read(Buffer.from(a));
  const ib = PNG.sync.read(Buffer.from(b));
  if (ia.width !== ib.width || ia.height !== ib.height) {
    return {
      width: ia.width,
      height: ia.height,
      diffPixels: Math.max(ia.width * ia.height, ib.width * ib.height),
      ratio: 1,
      sizeMismatch: true,
    };
  }
  let diffPixels = 0;
  for (let i = 0; i < ia.data.length; i += 4) {
    const d = Math.max(
      Math.abs(ia.data[i] - ib.data[i]),
      Math.abs(ia.data[i + 1] - ib.data[i + 1]),
      Math.abs(ia.data[i + 2] - ib.data[i + 2]),
      Math.abs(ia.data[i + 3] - ib.data[i + 3]),
    );
    if (d > channelTolerance) diffPixels++;
  }
  return {
    width: ia.width,
    height: ia.height,
    diffPixels,
    ratio: diffPixels / (ia.width * ia.height),
    sizeMismatch: false,
  };
}
