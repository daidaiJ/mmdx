// ```chart fence: type + tabular data → mermaid pie / xychart-beta.
// Over-limit fails loud (no historical mermaid baggage). Caption keys are
// returned for P0-3 chrome; mermaid title is not written into the source.

import { LIMITS } from './limits.ts';

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartSpec {
  type: ChartType;
  title?: string;
  unit?: string;
  source?: string;
  categories: string[];
  series: Array<{ name: string; values: number[] }>;
}

const HEAD_KEYS = new Set(['type', 'title', 'unit', 'source']);

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseNumber(s: string, ctx: string): number {
  const n = Number(s.replace(/,/g, '').replace(/%$/, ''));
  if (!Number.isFinite(n)) throw new Error(`chart block: cannot parse number "${s}" (${ctx})`);
  return n;
}

function parseTableOrCsv(lines: string[]): string[][] {
  const gfm = lines.filter((l) => l.includes('|'));
  if (gfm.length >= 1 && gfm.length >= lines.filter((l) => l.trim()).length / 2) {
    const rows: string[][] = [];
    for (const line of gfm) {
      if (/^[\s|:-]+$/.test(line) && line.includes('-')) continue;
      let l = line.trim();
      if (l.startsWith('|')) l = l.slice(1);
      if (l.endsWith('|')) l = l.slice(0, -1);
      rows.push(l.split('|').map((c) => c.trim()));
    }
    return rows;
  }
  return lines.map(splitCsv).filter((r) => r.some((c) => c.length > 0));
}

function antvHint(): string {
  return 'split the chart or use AntV mcp-server-chart';
}

export function parseChart(src: string): ChartSpec {
  const raw = src.replace(/\r\n/g, '\n').split('\n');
  const meta: Record<string, string> = {};
  let i = 0;
  for (; i < raw.length; i++) {
    const t = raw[i].trim();
    if (!t) continue;
    const m = /^([A-Za-z]+)\s*:\s*(.*)$/.exec(t);
    if (!m || !HEAD_KEYS.has(m[1].toLowerCase())) break;
    meta[m[1].toLowerCase()] = m[2].trim();
  }
  const type = (meta.type || '').toLowerCase() as ChartType;
  if (type !== 'bar' && type !== 'line' && type !== 'pie') {
    throw new Error('chart block: type must be bar | line | pie');
  }
  const dataLines = raw.slice(i).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const rows = parseTableOrCsv(dataLines);
  if (!rows.length) throw new Error('chart block: no data rows');

  const looksHeader = rows[0].slice(1).every((c) => c !== '' && Number.isNaN(Number(c.replace(/,/g, ''))));
  let header: string[] | null = null;
  let body = rows;
  if (looksHeader && rows.length > 1) {
    header = rows[0];
    body = rows.slice(1);
  }

  if (type === 'pie') {
    const categories: string[] = [];
    const values: number[] = [];
    for (const r of body) {
      if (r.length < 2) throw new Error('chart pie row must be "label, value"');
      categories.push(r[0]);
      values.push(parseNumber(r[1], r[0]));
    }
    if (categories.length < LIMITS.pieMin || categories.length > LIMITS.pieMax) {
      throw new Error(
        `chart pie has ${categories.length} slices (office range ${LIMITS.pieMin}–${LIMITS.pieMax}); ${antvHint()}`,
      );
    }
    return {
      type, title: meta.title, unit: meta.unit, source: meta.source,
      categories, series: [{ name: header?.[1] || 'value', values }],
    };
  }

  const categories = body.map((r) => r[0]);
  const colCount = Math.max(...body.map((r) => r.length)) - 1;
  if (colCount < 1) throw new Error('chart bar/line needs a value column');
  if (categories.length > LIMITS.xyCat) {
    throw new Error(`chart has ${categories.length} categories (max ${LIMITS.xyCat}); ${antvHint()}`);
  }
  if (colCount > LIMITS.xySeries) {
    throw new Error(`chart has ${colCount} series (max ${LIMITS.xySeries}); grouped/dual-axis → AntV mcp-server-chart`);
  }
  const series: ChartSpec['series'] = [];
  for (let c = 0; c < colCount; c++) {
    const name = header?.[c + 1] || (colCount === 1 ? 'value' : `series ${c + 1}`);
    const values = body.map((r) => parseNumber(r[c + 1] ?? '0', `${r[0]} / ${name}`));
    series.push({ name, values });
  }
  return { type, title: meta.title, unit: meta.unit, source: meta.source, categories, series };
}

function q(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

export function chartToMermaid(spec: ChartSpec): string {
  if (spec.type === 'pie') {
    const rows = spec.categories.map((c, i) => `    ${q(c)} : ${spec.series[0].values[i]}`);
    return `pie showData\n${rows.join('\n')}`;
  }
  const cats = spec.categories.map(q).join(', ');
  const ymax = Math.max(1, Math.ceil(Math.max(...spec.series.flatMap((s) => s.values), 0)));
  const lines = [`xychart-beta`, `    x-axis [${cats}]`, `    y-axis 0 --> ${ymax}`];
  for (const s of spec.series) {
    lines.push(`    ${spec.type} [${s.values.join(', ')}]`);
  }
  return lines.join('\n');
}
