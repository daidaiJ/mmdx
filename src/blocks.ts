// Non-mermaid fenced blocks rendered as styled images through the same
// Chromium pipeline. PNG only — HTML layout has no portable standalone SVG.

import { DEFAULT_TOKENS, tokenCss, type Tokens } from './tokens.ts';

export type BlockKind =
  | 'mermaid' | 'table' | 'list' | 'card'
  | 'chart' | 'kpi' | 'compare' | 'funnel'
  | 'task' | 'progress' | 'swimlane'
  | 'gauge' | 'vs' | 'heatmap'
  | 'unknown';

export const HTML_KINDS: ReadonlySet<BlockKind> = new Set([
  'table', 'list', 'card', 'kpi', 'compare', 'funnel', 'task', 'progress', 'swimlane',
  'gauge', 'vs', 'heatmap',
]);

export function fenceKind(lang: string): BlockKind {
  const l = lang.trim().toLowerCase();
  if (l === 'mermaid') return 'mermaid';
  if (l === 'table') return 'table';
  if (l === 'list') return 'list';
  if (l === 'card') return 'card';
  if (l === 'chart') return 'chart';
  if (l === 'kpi') return 'kpi';
  if (l === 'compare') return 'compare';
  if (l === 'funnel') return 'funnel';
  if (l === 'task') return 'task';
  if (l === 'progress') return 'progress';
  if (l === 'swimlane') return 'swimlane';
  if (l === 'gauge') return 'gauge';
  if (l === 'vs') return 'vs';
  if (l === 'heatmap') return 'heatmap';
  return 'unknown';
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inlineMd(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function pipeCells(line: string): string[] {
  return line.split('|').map((p) => p.trim());
}

function nonemptyLines(src: string): string[] {
  return src.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}

// ---------------------------------------------------------------------------
// caption chrome (shared by mermaid wrap + HTML blocks)
// ---------------------------------------------------------------------------

export interface Caption {
  title?: string | null;
  subtitle?: string | null;
  source?: string | null;
  unit?: string | null;
  titlePos?: 'top' | 'bottom';
}

export function captionPresent(c?: Caption | null): boolean {
  if (!c) return false;
  return !!(c.title || c.subtitle || c.source || c.unit);
}

export function mergeCaption(cli: Caption, local?: Caption | null): Caption {
  return {
    title: local?.title || cli.title,
    subtitle: local?.subtitle || cli.subtitle,
    source: local?.source || cli.source,
    unit: local?.unit || cli.unit,
    titlePos: cli.titlePos || 'top',
  };
}

function captionHtml(c: Caption): { head: string; foot: string } {
  const title = c.title ? `<div class="caption-title">${esc(c.title)}</div>` : '';
  const sub = c.subtitle ? `<div class="caption-sub">${esc(c.subtitle)}</div>` : '';
  const head = (title || sub) ? `<header class="caption-head">${title}${sub}</header>` : '';
  const bits: string[] = [];
  if (c.unit) bits.push(`<span>单位：${esc(c.unit)}</span>`);
  if (c.source) bits.push(`<span>来源：${esc(c.source)}</span>`);
  const foot = bits.length ? `<footer class="caption-foot">${bits.join('')}</footer>` : '';
  return { head, foot };
}

// ---------------------------------------------------------------------------
// markdown table → styled <table>
// ---------------------------------------------------------------------------

export function tableToHtml(src: string): string {
  const rows = src
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|'));
  if (rows.length === 0) throw new Error('table block has no rows');

  const cells = (line: string): string[] => {
    let l = line.trim();
    if (l.startsWith('|')) l = l.slice(1);
    if (l.endsWith('|')) l = l.slice(0, -1);
    return l.split('|').map((c) => c.trim());
  };

  let aligns: string[] = [];
  let body = rows;
  if (rows.length >= 2 && /^[\s|:-]+$/.test(rows[1]) && rows[1].includes('-')) {
    aligns = cells(rows[1]).map((c) => {
      const left = c.startsWith(':');
      const right = c.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      return 'left';
    });
    body = [rows[0], ...rows.slice(2)];
  }

  const bodyRows = body.map(cells);
  const colCount = Math.max(...bodyRows.map((r) => r.length));
  const [head, ...rest] = [bodyRows[0], ...bodyRows.slice(1)];
  const alignOf = (i: number): string => aligns[i] || 'left';

  const html = (row: string[], tag: 'th' | 'td'): string =>
    Array.from({ length: colCount }, (_, i) => {
      const v = row[i] ?? '';
      return `<${tag} style="text-align:${alignOf(i)}">${inlineMd(v)}</${tag}>`;
    }).join('');

  const thead = head ? `<thead><tr>${html(head, 'th')}</tr></thead>` : '';
  const tbody = `<tbody>${rest
    .map((r) => `<tr>${html(r, 'td')}</tr>`)
    .join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

// ---------------------------------------------------------------------------
// markdown list → nested <ul>/<ol>
// ---------------------------------------------------------------------------

interface ListItem {
  depth: number;
  ordered: boolean;
  text: string;
}

export function listToHtml(src: string): string {
  const items: ListItem[] = [];
  for (const raw of src.split('\n')) {
    const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    if (!m) continue;
    items.push({
      depth: Math.floor(m[1].replace(/\t/g, '  ').length / 2),
      ordered: /\d/.test(m[2]),
      text: m[3],
    });
  }
  if (!items.length) throw new Error('list block has no items');

  const build = (start: number, depth: number, ordered: boolean): { html: string; next: number } => {
    let out = ordered ? '<ol>' : '<ul>';
    let i = start;
    while (i < items.length && items[i].depth >= depth) {
      if (items[i].depth > depth) {
        const sub = build(i, items[i].depth, items[i].ordered);
        out = out.replace(/<\/li>$/, `${sub.html}</li>`);
        i = sub.next;
        continue;
      }
      out += `<li>${inlineMd(items[i].text)}</li>`;
      i++;
    }
    return { html: out + (ordered ? '</ol>' : '</ul>'), next: i };
  };

  const { html } = build(0, items[0].depth, items[0].ordered);
  return html;
}

// ---------------------------------------------------------------------------
// card wall
// ---------------------------------------------------------------------------

export function cardToHtml(src: string): string {
  const cards: string[] = [];
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const parts = pipeCells(line);
    if (parts.length < 2) throw new Error('card line must be "icon? | title | description?"');
    let icon = '', title = '', desc = '';
    if (parts.length >= 3) { icon = parts[0]; title = parts[1]; desc = parts.slice(2).join(' | '); }
    else { title = parts[0]; desc = parts[1]; }
    cards.push(
      '<div class="card">' +
      (icon ? `<div class="card-icon">${esc(icon)}</div>` : '') +
      `<div class="card-title">${inlineMd(title)}</div>` +
      (desc ? `<div class="card-desc">${inlineMd(desc)}</div>` : '') +
      '</div>',
    );
  }
  if (!cards.length) throw new Error('card block has no cards');
  return `<div class="cards">${cards.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// kpi
// ---------------------------------------------------------------------------

function kpiDeltaClass(s: string): string {
  const t = s.trim();
  if (/^[+＋↑]/.test(t) || /涨|升/.test(t)) return 'kpi-up';
  if (/^[-−–↓]/.test(t) || /跌|降/.test(t)) return 'kpi-down';
  return '';
}

export function kpiToHtml(src: string): string {
  const rows = nonemptyLines(src);
  if (rows.length > 4) throw new Error('kpi block allows at most 4 rows; split or drop metrics');
  const items: string[] = [];
  let i = 0;
  for (const line of rows) {
    const p = pipeCells(line);
    if (p.length < 2) throw new Error('kpi line must be "name | value | change?"');
    const [name, value, change] = p;
    const dc = change ? kpiDeltaClass(change) : '';
    const focus = i === 0 ? ' is-focus' : '';
    i++;
    items.push(
      '<div class="kpi-row">' +
      `<div class="kpi-name">${inlineMd(name)}</div>` +
      `<div class="kpi-value${focus}">${inlineMd(value)}</div>` +
      (change ? `<div class="kpi-delta ${dc}">${esc(change)}</div>` : '<div class="kpi-delta"></div>') +
      '</div>',
    );
  }
  if (!items.length) throw new Error('kpi block has no rows');
  return `<div class="kpi">${items.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// compare — exactly 2 columns
// ---------------------------------------------------------------------------

export function compareToHtml(src: string): string {
  const rows = nonemptyLines(src);
  if (rows.length !== 2) throw new Error('compare block must have exactly 2 columns (one line each)');
  const col = (line: string): string => {
    const p = pipeCells(line);
    if (p.length < 1) throw new Error('compare line must be "name | subtitle | points"');
    const name = p[0], sub = p[1] || '', points = p.slice(2).join(' | ');
    return (
      '<div class="cmp-col">' +
      `<div class="cmp-name">${inlineMd(name)}</div>` +
      (sub ? `<div class="cmp-sub">${inlineMd(sub)}</div>` : '') +
      (points ? `<div class="cmp-pts">${inlineMd(points)}</div>` : '') +
      '</div>'
    );
  };
  return `<div class="cmp">${col(rows[0])}<div class="cmp-rule"></div>${col(rows[1])}</div>`;
}

// ---------------------------------------------------------------------------
// funnel
// ---------------------------------------------------------------------------

function splitCsvish(line: string): string[] {
  if (line.includes('|')) return pipeCells(line);
  return line.split(',').map((s) => s.trim());
}

export function funnelToHtml(src: string): string {
  const rows = nonemptyLines(src).map((l) => {
    const p = splitCsvish(l);
    if (p.length < 2) throw new Error('funnel line must be "stage, value"');
    const n = Number(p[1].replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) throw new Error(`funnel value is not a number: "${p[1]}"`);
    return { name: p[0], value: n };
  });
  if (!rows.length) throw new Error('funnel block has no rows');
  if (rows.length > 6) throw new Error('funnel block allows at most 6 layers; split the funnel');
  const max = Math.max(...rows.map((r) => r.value), 1);
  const bars = rows.map((r) => {
    const pct = Math.max(4, Math.round((r.value / max) * 100));
    return (
      `<div class="fn-row">` +
      `<div class="fn-name">${esc(r.name)}</div>` +
      `<div class="fn-track"><div class="fn-bar" style="width:${pct}%"></div></div>` +
      `<div class="fn-val">${esc(String(r.value))}</div>` +
      `</div>`
    );
  });
  return `<div class="fn">${bars.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// task status snapshot
// ---------------------------------------------------------------------------

const TASK_STATUSES = ['未开始', '设计', '开发', '测试', '已上线', '已取消'] as const;
type TaskStatus = typeof TASK_STATUSES[number];
const TASK_FILL: Record<TaskStatus, number> = {
  '未开始': 0, '设计': 1, '开发': 2, '测试': 3, '已上线': 4, '已取消': 0,
};
const TASK_CLASS: Record<TaskStatus, string> = {
  '未开始': 'st-idle', '设计': 'st-design', '开发': 'st-dev',
  '测试': 'st-test', '已上线': 'st-done', '已取消': 'st-cancel',
};

export function taskToHtml(src: string): string {
  const lines = nonemptyLines(src);
  if (lines.length > 10) {
    throw new Error('task block allows at most 10 rows; use mermaid kanban for a larger pool');
  }
  const items: string[] = [];
  for (const line of lines) {
    let p = pipeCells(line);
    if (p.length < 2) throw new Error('task line must be "name | status | start? | effort? | 卡点?"');
    let blocked = false;
    if (p[p.length - 1] === '卡点') {
      blocked = true;
      p = p.slice(0, -1);
    }
    const [name, statusRaw, start, effort] = p;
    const status = statusRaw as TaskStatus;
    if (!TASK_STATUSES.includes(status)) {
      throw new Error(`task status "${statusRaw}" is not valid; use ${TASK_STATUSES.join(' / ')}`);
    }
    const fill = TASK_FILL[status];
    const segs = [0, 1, 2, 3].map((i) =>
      `<span class="task-seg${i < fill ? ' on' : ''}"></span>`,
    ).join('');
    const chips: string[] = [];
    if (start) chips.push(`<span class="task-chip">计划 ${esc(start)}</span>`);
    if (effort) chips.push(`<span class="task-chip">${esc(effort.includes('人天') ? effort : `${effort}`)}</span>`);
    const rowMod = `${status === '已取消' ? ' is-cancel' : ''}${blocked ? ' is-blocked' : ''}`;
    items.push(
      `<div class="task-row${rowMod}">` +
      `<div class="task-name">${inlineMd(name)}</div>` +
      `<div class="task-step" aria-hidden="true">${segs}</div>` +
      `<div class="task-meta">${chips.join('')}</div>` +
      `<div class="task-badges">` +
      `<span class="task-badge ${TASK_CLASS[status]}">${esc(status)}</span>` +
      (blocked ? '<span class="task-badge st-block">卡点</span>' : '') +
      `</div></div>`,
    );
  }
  if (!items.length) throw new Error('task block has no rows');
  return `<div class="task">${items.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// progress rings (watch-style)
// ---------------------------------------------------------------------------

const RING_COLORS = ['#5C8EC4', '#6BAF8E', '#6D7686', '#C9A84C'];

interface Ring {
  name: string;
  pct: number;
  label: string;
}

function parseProgress(src: string, kind = 'progress'): Ring[] {
  const rings: Ring[] = [];
  for (const line of nonemptyLines(src)) {
    const p = splitCsvish(line);
    if (p.length < 2) throw new Error(`${kind} line must be "name, percent" or "name, value, target"`);
    const name = p[0];
    if (p.length >= 3) {
      const value = Number(p[1].replace(/,/g, ''));
      const target = Number(p[2].replace(/,/g, ''));
      if (!Number.isFinite(value) || !Number.isFinite(target)) {
        throw new Error(`${kind} numbers unreadable: "${line}"`);
      }
      if (value < 0 || target <= 0 || value > target) {
        throw new Error(`${kind} value/target out of range (0 ≤ value ≤ target): "${line}"`);
      }
      const pct = (value / target) * 100;
      rings.push({ name, pct, label: `${p[1]} / ${p[2]}` });
    } else {
      const pct = Number(p[1].replace(/%$/, '').replace(/,/g, ''));
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error(`${kind} percent must be 0–100: "${p[1]}"`);
      }
      rings.push({ name, pct, label: `${Math.round(pct)}%` });
    }
  }
  if (!rings.length) throw new Error(`${kind} block has no rows`);
  if (rings.length > 4) throw new Error(`${kind} block allows at most 4 rings`);
  return rings;
}

export function progressToHtml(src: string): string {
  const rings = parseProgress(src);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 14;
  const gap = 8;
  const outer = 96;
  const arcs = rings.map((r, i) => {
    const rad = outer - i * (stroke + gap);
    const c = 2 * Math.PI * rad;
    const pct = Math.min(100, Math.max(0, r.pct));
    const dash = pct <= 0 ? 0 : pct >= 100 ? c * 0.999 : (pct / 100) * c;
    const color = RING_COLORS[i % RING_COLORS.length];
    return (
      `<circle class="pr-track" cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke-width="${stroke}"/>` +
      (dash > 0
        ? `<circle class="pr-arc" cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${color}" ` +
          `stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${c.toFixed(2)}" ` +
          `transform="rotate(-90 ${cx} ${cy})"/>`
        : '')
    );
  }).join('');
  const center = rings.length === 1
    ? `<text class="pr-center" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central">${Math.round(rings[0].pct)}%</text>`
    : '';
  const legend = rings.map((r, i) =>
    `<div class="pr-leg"><span class="pr-dot" style="background:${RING_COLORS[i]}"></span>` +
    `<span class="pr-leg-name">${esc(r.name)}</span>` +
    `<span class="pr-leg-val">${esc(r.label)}</span></div>`,
  ).join('');
  return (
    `<div class="pr">` +
    `<svg class="pr-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${arcs}${center}</svg>` +
    `<div class="pr-legend">${legend}</div>` +
    `</div>`
  );
}

// ---------------------------------------------------------------------------
// gauge — side-by-side semicircle dials (watch-style)
// ---------------------------------------------------------------------------

export function gaugeToHtml(src: string): string {
  const rings = parseProgress(src, 'gauge');
  const items = rings.map((r, i) => {
    const pct = Math.min(100, Math.max(0, r.pct));
    const color = i === 0 ? 'var(--accent)' : RING_COLORS[i % RING_COLORS.length];
    const w = 132;
    const h = 100;
    const cx = 66;
    const cy = 74;
    const rad = 50;
    const d = `M ${cx - rad} ${cy} A ${rad} ${rad} 0 0 1 ${cx + rad} ${cy}`;
    return (
      `<div class="gg-item">` +
      `<svg class="gg-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<path class="gg-track" d="${d}" pathLength="100" fill="none"/>` +
      (pct > 0
        ? `<path class="gg-arc" d="${d}" pathLength="100" fill="none" stroke="${color}" ` +
          `stroke-dasharray="${pct} 100"/>`
        : '') +
      `<text class="gg-num" x="${cx}" y="${cy - 14}" text-anchor="middle">${Math.round(pct)}</text>` +
      `</svg>` +
      `<div class="gg-name">${esc(r.name)}</div>` +
      `<div class="gg-sub">${esc(r.label)}</div>` +
      `</div>`
    );
  });
  return `<div class="gg">${items.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// vs — two-column numeric before/after
// ---------------------------------------------------------------------------

function parsePlainNumber(s: string, ctx: string): number {
  const n = Number(s.replace(/,/g, '').replace(/%$/, ''));
  if (!Number.isFinite(n) || n < 0) throw new Error(`${ctx}: "${s}" is not a non-negative number`);
  return n;
}

function looksPlainNumber(s: string): boolean {
  return Number.isFinite(Number(s.replace(/,/g, '').replace(/%$/, '')));
}

export function vsToHtml(src: string): string {
  const lines = nonemptyLines(src);
  if (!lines.length) throw new Error('vs block has no rows');
  let leftName = 'A';
  let rightName = 'B';
  let body = lines;
  const first = splitCsvish(lines[0]);
  if (first.length >= 3 && (!first[0] || (!looksPlainNumber(first[1]) && !looksPlainNumber(first[2])))) {
    leftName = first[1] || leftName;
    rightName = first[2] || rightName;
    body = lines.slice(1);
  }
  const rows = body.map((line) => {
    const p = splitCsvish(line);
    if (p.length !== 3) throw new Error('vs line must be "name, left, right" (optional header ", left, right")');
    return { name: p[0], left: parsePlainNumber(p[1], p[0]), right: parsePlainNumber(p[2], p[0]), lRaw: p[1], rRaw: p[2] };
  });
  if (!rows.length) throw new Error('vs block has no data rows');
  if (rows.length > 6) throw new Error('vs block allows at most 6 rows; split the comparison');
  const head =
    `<div class="vs-row vs-head"><div></div>` +
    `<div class="vs-lab">${esc(leftName)}</div>` +
    `<div class="vs-lab">${esc(rightName)}</div></div>`;
  const items = rows.map((r) => {
    const max = Math.max(r.left, r.right, 0.0001);
    const lw = Math.max(4, Math.round((r.left / max) * 100));
    const rw = Math.max(4, Math.round((r.right / max) * 100));
    return (
      `<div class="vs-row">` +
      `<div class="vs-name">${esc(r.name)}</div>` +
      `<div class="vs-cell"><div class="vs-track"><div class="vs-bar vs-a" style="width:${lw}%"></div></div><span class="vs-val">${esc(r.lRaw)}</span></div>` +
      `<div class="vs-cell"><div class="vs-track"><div class="vs-bar vs-b" style="width:${rw}%"></div></div><span class="vs-val">${esc(r.rRaw)}</span></div>` +
      `</div>`
    );
  });
  return `<div class="vs">${head}${items.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// heatmap — week-column calendar (office card, not a GitHub widget)
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const HEATMAP_WEEKS = 12;
const WDAY = ['一', '二', '三', '四', '五', '六', '日'];

function parseIsoDay(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) throw new Error(`heatmap date must be YYYY-MM-DD, got "${s}"`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new Error(`heatmap invalid date "${s}"`);
  }
  return t;
}

function mondayOf(t: number): number {
  const wd = (new Date(t).getUTCDay() + 6) % 7; // Mon=0
  return t - wd * DAY_MS;
}

function utcParts(t: number): { y: number; m: number; d: number } {
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function zhDateRange(a: number, b: number): string {
  const A = utcParts(a);
  const B = utcParts(b);
  if (A.y === B.y && A.m === B.m && A.d === B.d) return `${A.y}年${A.m}月${A.d}日`;
  if (A.y === B.y && A.m === B.m) return `${A.y}年${A.m}月${A.d}日 – ${B.d}日`;
  if (A.y === B.y) return `${A.y}年${A.m}月${A.d}日 – ${B.m}月${B.d}日`;
  return `${A.y}年${A.m}月${A.d}日 – ${B.y}年${B.m}月${B.d}日`;
}

export function heatmapToHtml(src: string): string {
  const map = new Map<number, number>();
  for (const line of nonemptyLines(src)) {
    const p = splitCsvish(line);
    if (p.length < 2) throw new Error('heatmap line must be "YYYY-MM-DD, value"');
    const t = parseIsoDay(p[0]);
    const v = parsePlainNumber(p[1], p[0]);
    map.set(t, v);
  }
  if (!map.size) throw new Error('heatmap block has no rows');
  const times = [...map.keys()].sort((a, b) => a - b);
  const t0 = mondayOf(times[0]);
  let t1 = times[times.length - 1];
  const sun = (new Date(t1).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  t1 += (6 - sun) * DAY_MS;
  const weeks = Math.floor((t1 - t0) / (7 * DAY_MS)) + 1;
  if (weeks > HEATMAP_WEEKS) {
    throw new Error(
      `heatmap spans ${weeks} weeks (max ${HEATMAP_WEEKS}); split by month or use AntV mcp-server-chart`,
    );
  }
  let max = 0;
  for (const v of map.values()) if (v > max) max = v;
  const level = (v: number): number => {
    if (v <= 0 || max <= 0) return 0;
    const t = v / max;
    return t <= 0.25 ? 1 : t <= 0.5 ? 2 : t <= 0.75 ? 3 : 4;
  };
  const months: string[] = [];
  let prevM = -1;
  for (let w = 0; w < weeks; w++) {
    const colStart = t0 + w * 7 * DAY_MS;
    let m = 0;
    for (let d = 0; d < 7; d++) {
      const t = colStart + d * DAY_MS;
      if (t >= times[0] && t <= times[times.length - 1]) {
        m = utcParts(t).m;
        break;
      }
    }
    months.push(m && m !== prevM ? `<div class="hm-ml">${m}月</div>` : `<div class="hm-ml"></div>`);
    if (m) prevM = m;
  }
  const cols: string[] = [];
  for (let w = 0; w < weeks; w++) {
    const cells: string[] = [];
    const colStart = t0 + w * 7 * DAY_MS;
    for (let d = 0; d < 7; d++) {
      const t = colStart + d * DAY_MS;
      const v = map.get(t) ?? 0;
      const lv = level(v);
      const iso = new Date(t).toISOString().slice(0, 10);
      const label = v > 0 ? `<span>${v > 99 ? '99+' : String(Math.round(v))}</span>` : '';
      cells.push(`<div class="hm-cell lv${lv}" title="${iso}: ${v}">${label}</div>`);
    }
    cols.push(`<div class="hm-col">${cells.join('')}</div>`);
  }
  const wdays = WDAY.map((n) => `<div class="hm-wday">${n}</div>`).join('');
  const legend = [0, 1, 2, 3, 4].map((i) => `<div class="hm-cell lv${i}"></div>`).join('');
  return (
    `<div class="hm hm-n${weeks}">` +
    `<div class="hm-range">${esc(zhDateRange(times[0], times[times.length - 1]))}</div>` +
    `<div class="hm-body">` +
    `<div class="hm-side"><div class="hm-ml"></div><div class="hm-wdays">${wdays}</div></div>` +
    `<div class="hm-main"><div class="hm-months">${months.join('')}</div><div class="hm-cols">${cols.join('')}</div></div>` +
    `</div>` +
    `<div class="hm-legend"><span>少</span>${legend}<span>多</span></div>` +
    `</div>`
  );
}

// ---------------------------------------------------------------------------
// swimlane
// ---------------------------------------------------------------------------

interface SwimStep {
  name: string;
  lane: string;
  next?: string;
}

export function swimlaneToHtml(src: string): string {
  const steps: SwimStep[] = [];
  const lanes: string[] = [];
  for (const line of nonemptyLines(src)) {
    const p = pipeCells(line);
    if (p.length < 2) throw new Error('swimlane line must be "step | lane | next?"');
    const name = p[0], lane = p[1], next = p[2] || undefined;
    if (!lanes.includes(lane)) lanes.push(lane);
    steps.push({ name, lane, next });
  }
  if (!steps.length) throw new Error('swimlane block has no rows');
  if (lanes.length > 5) throw new Error('swimlane allows at most 5 lanes; split into overview + detail');
  if (steps.length > 8) throw new Error('swimlane allows at most 8 steps; split into overview + detail');
  const names = steps.map((s) => s.name);
  const idx = new Map(names.map((n, i) => [n, i]));
  const dups = names.filter((n, i) => names.indexOf(n) !== i);
  if (dups.length) throw new Error(`swimlane step names must be unique, duplicated: ${[...new Set(dups)].join(', ')}`);
  for (const s of steps) {
    if (!s.next) continue;
    if (s.next === s.name) throw new Error('swimlane block does not support loops; use a mermaid flowchart');
    if (!idx.has(s.next)) {
      throw new Error(`swimlane unknown next step "${s.next}"; valid: ${names.join(', ')}`);
    }
  }
  const graph = new Map(steps.map((s) => [s.name, s.next]));
  const seen = new Set<string>();
  const stack = new Set<string>();
  const visit = (n: string): void => {
    if (stack.has(n)) throw new Error('swimlane block does not support loops; use a mermaid flowchart');
    if (seen.has(n)) return;
    stack.add(n);
    const nx = graph.get(n);
    if (nx) visit(nx);
    stack.delete(n);
    seen.add(n);
  };
  for (const s of steps) visit(s.name);

  const nL = lanes.length;
  const nS = steps.length;
  const labelW = 56;
  const cellW = 140;
  const cellH = 64;
  const boxH = 48;
  const gapX = 28;
  const gapY = 16;
  const pad = 12;
  const gridW = labelW + gapX + nS * (cellW + gapX) + pad;
  const gridH = nL * (cellH + gapY) + pad;

  const boxLeft = (col: number): number => labelW + gapX + col * (cellW + gapX);
  const boxTop = (row: number): number => pad / 2 + row * (cellH + gapY) + (cellH - boxH) / 2;
  const edge = (col: number, row: number, toCol: number, toRow: number): { x: number; y: number } => {
    const x = boxLeft(col), y = boxTop(row);
    const cx = x + cellW / 2, cy = y + boxH / 2;
    if (toRow === row) return { x: toCol > col ? x + cellW : x, y: cy };
    if (toCol === col) return { x: cx, y: toRow > row ? y + boxH : y };
    // diagonal: leave from the right (or left) and enter the opposite side
    return { x: toCol > col ? x + cellW : x, y: cy };
  };
  const enter = (col: number, row: number, fromCol: number, fromRow: number): { x: number; y: number } => {
    const x = boxLeft(col), y = boxTop(row);
    const cx = x + cellW / 2, cy = y + boxH / 2;
    if (fromRow === row) return { x: fromCol < col ? x : x + cellW, y: cy };
    if (fromCol === col) return { x: cx, y: fromRow < row ? y : y + boxH };
    return { x: fromCol < col ? x : x + cellW, y: cy };
  };

  let firstCross = true;
  const arrows: string[] = [];
  for (const s of steps) {
    if (!s.next) continue;
    const a = idx.get(s.name)!;
    const b = idx.get(s.next)!;
    const ra = lanes.indexOf(s.lane);
    const rb = lanes.indexOf(steps[b].lane);
    const p1 = edge(a, ra, b, rb);
    const p2 = enter(b, rb, a, ra);
    const cross = ra !== rb;
    const accent = cross && firstCross;
    if (cross && firstCross) firstCross = false;
    const cls = accent ? 'sw-edge accent' : 'sw-edge';
    let d: string;
    if (ra === rb) {
      d = `M ${p1.x} ${p1.y} H ${p2.x}`;
    } else {
      const mx = (p1.x + p2.x) / 2;
      d = `M ${p1.x} ${p1.y} H ${mx} V ${p2.y} H ${p2.x}`;
    }
    arrows.push(`<path class="${cls}" d="${d}" marker-end="url(#sw-arr${accent ? '-a' : ''})"/>`);
  }

  const bands: string[] = [];
  for (let r = 0; r < nL; r++) {
    const y = pad / 2 + r * (cellH + gapY);
    bands.push(`<rect class="sw-band ${r % 2 ? 'alt' : ''}" x="0" y="${y}" width="${gridW}" height="${cellH}"/>`);
    bands.push(
      `<text class="sw-lane" x="8" y="${y + cellH / 2}" dominant-baseline="central">${esc(lanes[r])}</text>`,
    );
  }
  const boxes: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const r = lanes.indexOf(s.lane);
    const x = boxLeft(i);
    const y = boxTop(r);
    boxes.push(
      `<g class="sw-step">` +
      `<rect x="${x}" y="${y}" width="${cellW}" height="${boxH}" rx="6"/>` +
      `<text x="${x + cellW / 2}" y="${y + boxH / 2}" text-anchor="middle" dominant-baseline="central">${esc(s.name)}</text>` +
      `</g>`,
    );
  }

  return (
    `<div class="sw">` +
    `<svg width="${gridW}" height="${gridH}" viewBox="0 0 ${gridW} ${gridH}">` +
    `<defs>` +
    `<marker id="sw-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">` +
    `<path class="sw-arr" d="M0,0 L8,4 L0,8 Z"/>` +
    `</marker>` +
    `<marker id="sw-arr-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">` +
    `<path class="sw-arr-a" d="M0,0 L8,4 L0,8 Z"/>` +
    `</marker>` +
    `</defs>` +
    `${bands.join('')}${arrows.join('')}${boxes.join('')}` +
    `</svg></div>`
  );
}

export function htmlKindToInner(kind: BlockKind, code: string): string {
  switch (kind) {
    case 'table': return tableToHtml(code);
    case 'list': return listToHtml(code);
    case 'card': return cardToHtml(code);
    case 'kpi': return kpiToHtml(code);
    case 'compare': return compareToHtml(code);
    case 'funnel': return funnelToHtml(code);
    case 'task': return taskToHtml(code);
    case 'progress': return progressToHtml(code);
    case 'swimlane': return swimlaneToHtml(code);
    case 'gauge': return gaugeToHtml(code);
    case 'vs': return vsToHtml(code);
    case 'heatmap': return heatmapToHtml(code);
    default: throw new Error(`not an HTML block: ${kind}`);
  }
}

// ---------------------------------------------------------------------------
// page shell
// ---------------------------------------------------------------------------

export interface PageOpts {
  wrapWidth?: number;
  density?: 'standard' | 'slide';
  caption?: Caption;
  tokens?: Tokens;
}

const PAGE_CSS = `
:root { color-scheme: light; }
body { margin: 0; background: var(--paper, #ffffff); }
.wrap {
  display: inline-block; box-sizing: border-box;
  padding: 16px 20px;
  font-family: "Noto Sans SC", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px; line-height: 1.6; font-weight: 400;
  color: var(--ink, #1B1F26);
  background: var(--paper, #ffffff);
  -webkit-font-smoothing: antialiased;
}
.wrap.fixed { display: block; }
.wrap.slide { padding: 20px 24px 80px; font-size: 16px; }
.fig { display: flex; justify-content: center; }
.fig svg { display: block; max-width: 100%; height: auto; }
.caption-head { margin: 0 0 12px; }
.caption-title { font-size: 16px; font-weight: 600; line-height: 1.4; color: var(--ink); }
.caption-sub { font-size: 13px; color: var(--muted); margin-top: 4px; line-height: 1.5; }
.caption-foot { margin: 12px 0 0; display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--muted); }
.wrap.slide .caption-title { font-size: 20px; }
.wrap.slide .caption-sub { font-size: 14px; }
.wrap.slide .caption-foot { font-size: 13px; }

table { border-collapse: separate; border-spacing: 0; width: max-content; font-size: 14px; line-height: 1.55; background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; }
thead th { white-space: nowrap; background: var(--paper-2); font-weight: 600; font-size: 13px; color: var(--muted); }
th, td { padding: 10px 16px; border-bottom: 1px solid var(--rule); }
tbody tr:last-child td { border-bottom: none; }
th + th, td + td { border-left: 1px solid var(--rule); }
tbody tr:nth-child(even) td { background: var(--paper-2); }
code { font-family: "Cascadia Code", Consolas, monospace; font-size: 12.5px; background: var(--paper-2); border-radius: 4px; padding: 1px 5px; }

.cards { display: grid; grid-template-columns: repeat(2, 268px); gap: 12px; }
.card { box-sizing: border-box; background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; padding: 16px 16px 16px 20px; position: relative; }
.card::before { content: ""; position: absolute; left: 0; top: 16px; bottom: 16px; width: 3px; border-radius: 1px; background: var(--accent); }
.card-icon { font-size: 18px; line-height: 1.2; margin-bottom: 8px; }
.card-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.card-desc { font-size: 13px; color: var(--muted); line-height: 1.6; }
.cards code { font-size: 12px; }
.wrap.slide .cards { grid-template-columns: repeat(2, 300px); gap: 16px; }
.wrap.slide .card-title { font-size: 16px; }
.wrap.slide .card-desc { font-size: 14px; color: var(--ink); }

ul, ol { margin: 0; padding-left: 22px; font-size: 14px; line-height: 1.7; }
ul { list-style: none; padding-left: 4px; }
li { margin: 4px 0; }
li::before { content: "•"; color: var(--accent); font-weight: 700; display: inline-block; width: 16px; }
li ul { padding-left: 20px; }
li ol { padding-left: 20px; }
ol > li::before { content: ""; width: 0; }
strong { font-weight: 600; }

.kpi { display: flex; flex-direction: column; min-width: 400px; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; background: var(--paper); }
.kpi-row { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; align-items: baseline; padding: 12px 16px; border-bottom: 1px solid var(--rule); }
.kpi-row:last-child { border-bottom: none; }
.kpi-name { font-size: 13px; color: var(--muted); }
.kpi-value { font-size: 24px; font-weight: 600; color: var(--ink); line-height: 1.15; font-variant-numeric: tabular-nums; }
.kpi-value.is-focus { color: var(--accent); }
.kpi-delta { font-size: 13px; font-weight: 600; min-width: 56px; text-align: right; }
.kpi-up { color: #C45C5C; }
.kpi-down { color: #3D9A64; }

.cmp { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0; min-width: 480px; align-items: stretch; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; background: var(--paper); }
.cmp-col { padding: 16px 20px; }
.cmp-rule { width: 1px; background: var(--rule); }
.cmp-name { font-size: 15px; font-weight: 600; }
.cmp-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }
.cmp-pts { font-size: 13px; line-height: 1.65; margin-top: 12px; color: var(--ink); }

.fn { display: flex; flex-direction: column; gap: 8px; min-width: 420px; }
.fn-row { display: grid; grid-template-columns: 64px 1fr 64px; gap: 12px; align-items: center; }
.fn-track { height: 20px; background: var(--paper-2); border-radius: 4px; overflow: hidden; }
.fn-bar { height: 100%; border-radius: 4px; background: color-mix(in srgb, var(--accent) 68%, white); }
.fn-name, .fn-val { font-size: 13px; color: var(--ink); }
.fn-val { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); }

.task { display: flex; flex-direction: column; min-width: 560px; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; background: var(--paper); }
.task-row { display: grid; grid-template-columns: minmax(120px,1.2fr) 88px minmax(80px,1fr) auto; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--rule); }
.task-row:last-child { border-bottom: none; }
.task-name { font-size: 14px; font-weight: 600; }
.task-step { display: flex; gap: 4px; }
.task-seg { width: 16px; height: 6px; border-radius: 3px; background: var(--rule); }
.task-seg.on { background: var(--accent); }
.task-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.task-chip { font-size: 12px; color: var(--muted); background: var(--paper-2); border-radius: 4px; padding: 2px 8px; }
.task-badges { display: flex; gap: 6px; justify-content: flex-end; }
.task-badge { font-size: 12px; font-weight: 600; border-radius: 4px; padding: 2px 8px; }
.st-idle { color: var(--muted); background: var(--paper-2); }
.st-design { color: #3D6DB5; background: #EEF3F8; }
.st-dev { color: #A56B2A; background: #F7F2EA; }
.st-test { color: #6B5B8C; background: #F3F1F6; }
.st-done { color: #3D9A64; background: #EEF6F1; }
.st-cancel { color: var(--muted); background: var(--paper-2); }
.task-row.is-cancel { background: var(--paper-2); }
.task-row.is-cancel .task-name { text-decoration: line-through; color: var(--muted); font-weight: 400; }
.task-row.is-cancel .task-seg.on { background: #C5C8D0; }
.st-block { color: #C45C5C; background: #F7EEEE; }

.pr { display: flex; align-items: center; gap: 24px; }
.pr-svg { display: block; }
.pr-track { stroke: var(--rule); }
.pr-center { font-size: 26px; font-weight: 600; fill: var(--ink); font-family: "Noto Sans SC", sans-serif; }
.pr-legend { display: flex; flex-direction: column; gap: 10px; min-width: 160px; }
.pr-leg { display: grid; grid-template-columns: 8px 1fr auto; gap: 8px; align-items: center; font-size: 13px; }
.pr-dot { width: 8px; height: 8px; border-radius: 50%; }
.pr-leg-name { color: var(--ink); }
.pr-leg-val { color: var(--muted); font-weight: 600; font-variant-numeric: tabular-nums; }

.sw { display: inline-block; }
.sw-band { fill: var(--paper); stroke: var(--rule); stroke-width: 1; }
.sw-band.alt { fill: var(--paper-2); }
.sw-arr { fill: var(--muted); }
.sw-arr-a { fill: var(--accent); }
.sw-lane { font-size: 12px; fill: var(--muted); font-family: "Noto Sans SC", sans-serif; }
.sw-step rect { fill: var(--paper); stroke: var(--rule); stroke-width: 1; }
.sw-step text { font-size: 13px; fill: var(--ink); font-family: "Noto Sans SC", sans-serif; }
.sw-edge { fill: none; stroke: #5B6570; stroke-width: 1.5; }
.sw-edge.accent { stroke: var(--accent); stroke-width: 2; }

.gg { display: flex; gap: 16px; align-items: flex-end; }
.gg-item { width: 132px; text-align: center; }
.gg-svg { display: block; }
.gg-track { stroke: var(--rule); stroke-width: 10; stroke-linecap: round; }
.gg-arc { stroke-width: 10; stroke-linecap: round; }
.gg-num { font-size: 22px; font-weight: 600; fill: var(--ink); font-family: "Noto Sans SC", sans-serif; font-variant-numeric: tabular-nums; }
.gg-name { font-size: 13px; font-weight: 600; margin-top: 2px; }
.gg-sub { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }

.vs { display: flex; flex-direction: column; gap: 10px; min-width: 520px; border: 1px solid var(--rule); border-radius: 8px; padding: 16px 20px; background: var(--paper); }
.vs-row { display: grid; grid-template-columns: 88px 1fr 1fr; gap: 16px; align-items: center; }
.vs-head { margin-bottom: 2px; }
.vs-lab, .vs-name { font-size: 13px; }
.vs-lab { color: var(--muted); }
.vs-name { font-weight: 600; }
.vs-cell { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; min-width: 0; }
.vs-track { height: 12px; min-width: 0; }
.vs-bar { height: 12px; border-radius: 4px; }
.vs-a { background: color-mix(in srgb, var(--ink) 22%, white); }
.vs-b { background: color-mix(in srgb, var(--accent) 72%, white); }
.vs-val { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; min-width: 2.4em; }

.hm { --hm: 28px; --hm-gap: 5px; display: flex; flex-direction: column; gap: 10px; width: max-content; border: 1px solid var(--rule); border-radius: 8px; padding: 14px 16px 12px; background: var(--paper); }
.hm-n1, .hm-n2, .hm-n3, .hm-n4 { --hm: 32px; }
.hm-n5, .hm-n6 { --hm: 28px; }
.hm-n7, .hm-n8 { --hm: 24px; }
.hm-n9, .hm-n10, .hm-n11, .hm-n12 { --hm: 20px; }
.hm-range { font-size: 13px; font-weight: 600; color: var(--ink); }
.hm-body { display: flex; gap: 8px; align-items: flex-start; }
.hm-side { display: flex; flex-direction: column; }
.hm-wdays { display: flex; flex-direction: column; gap: var(--hm-gap); }
.hm-wday { width: 18px; height: var(--hm); font-size: 12px; line-height: var(--hm); color: var(--muted); text-align: right; }
.hm-main { display: flex; flex-direction: column; }
.hm-months, .hm-cols, .hm-legend { display: flex; gap: var(--hm-gap); }
.hm-ml { width: var(--hm); height: 16px; font-size: 11px; line-height: 16px; color: var(--muted); white-space: nowrap; overflow: visible; }
.hm-col { display: flex; flex-direction: column; gap: var(--hm-gap); }
.hm-cell { box-sizing: border-box; width: var(--hm); height: var(--hm); border-radius: 4px; background: #E2E6EC; display: flex; align-items: center; justify-content: center; font-size: clamp(9px, calc(var(--hm) * 0.36), 13px); font-weight: 600; font-variant-numeric: tabular-nums; color: var(--ink); line-height: 1; }
.hm-cell.lv1 { background: color-mix(in srgb, var(--accent) 42%, white); }
.hm-cell.lv2 { background: color-mix(in srgb, var(--accent) 62%, white); }
.hm-cell.lv3 { background: color-mix(in srgb, var(--accent) 82%, white); }
.hm-cell.lv4 { background: color-mix(in srgb, var(--accent) 72%, #123A6B); color: #fff; }
.hm-legend { align-items: center; justify-content: flex-end; gap: 4px; margin-top: 2px; font-size: 12px; color: var(--muted); }
.hm-legend .hm-cell { width: 12px; height: 12px; border-radius: 2px; font-size: 0; }
.wrap.slide .hm { --hm: 32px; padding: 18px 20px 16px; }
.wrap.slide .hm-range { font-size: 16px; }
.wrap.slide table { font-size: 16px; }
.wrap.slide th, .wrap.slide td { padding: 12px 18px; }
.wrap.slide .kpi-value { font-size: 28px; }
.wrap.slide .kpi-name { font-size: 14px; }
.wrap.slide .cmp-name { font-size: 17px; }
.wrap.slide .cmp-pts { font-size: 14px; }
.wrap.slide .vs-bar, .wrap.slide .vs-track { height: 16px; }
.wrap.slide .fn-track { height: 24px; }
.wrap.slide .sw-step text { font-size: 15px; }
.wrap.slide .sw-step rect { stroke-width: 1.5; }
.wrap.slide .gg-num { font-size: 26px; }
`;

export function blockPage(inner: string, opts: PageOpts = {}): string {
  const tokens = opts.tokens ?? DEFAULT_TOKENS;
  const density = opts.density ?? 'standard';
  const width = opts.wrapWidth;
  const cap = captionPresent(opts.caption) ? captionHtml(opts.caption as Caption) : { head: '', foot: '' };
  const pos = opts.caption?.titlePos === 'bottom' ? 'bottom' : 'top';
  const body = pos === 'bottom'
    ? `${inner}${cap.head}${cap.foot}`
    : `${cap.head}${inner}${cap.foot}`;
  const cls = ['wrap', density === 'slide' ? 'slide' : '', width ? 'fixed' : ''].filter(Boolean).join(' ');
  const widthCss = width ? `.wrap.fixed{width:${width}px;}` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${tokenCss(tokens)}${PAGE_CSS}${widthCss}</style></head>` +
    `<body><div class="${cls}">${body}</div></body></html>`;
}
