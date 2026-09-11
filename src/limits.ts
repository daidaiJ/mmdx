// Soft budget gate for mermaid sources. Regex-only — not a parser.
// Over-limit hits become --json warnings; --strict-chart promotes them to errors.

export const LIMITS = {
  pieMin: 3,
  pieMax: 6,
  xyCat: 6,
  xySeries: 2,
  radarDim: 8,
  radarSeries: 3,
  flowNodes: 9,
  flowEdges: 12,
  seqActors: 5,
} as const;

export interface LimitHit {
  code: string;
  message: string;
}

const ANTV = 'split the chart or use AntV mcp-server-chart';

function stripFrontmatter(code: string): string {
  return code.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

function kind(code: string): string {
  const body = stripFrontmatter(code).trim();
  const line = body.split('\n').find((l) => l.trim() && !l.trim().startsWith('%%')) ?? '';
  const t = line.trim();
  if (/^(flowchart|graph)\b/i.test(t)) return 'flowchart';
  if (/^sequenceDiagram\b/i.test(t)) return 'sequence';
  if (/^pie\b/i.test(t)) return 'pie';
  if (/^xychart(?:-beta)?\b/i.test(t)) return 'xychart';
  if (/^radar(?:-beta)?\b/i.test(t)) return 'radar';
  return '';
}

function csvItems(inner: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of inner) {
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { const s = cur.trim(); if (s) out.push(s); cur = ''; continue; }
    cur += ch;
  }
  const s = cur.trim();
  if (s) out.push(s);
  return out;
}

function pieHits(code: string): LimitHit[] {
  const body = stripFrontmatter(code);
  const rows = body.split('\n').filter((l) => {
    const t = l.trim();
    if (!t || t.startsWith('%%') || t.startsWith('pie') || /^title\b/i.test(t) || /^showData\b/i.test(t)) return false;
    return /:\s*-?[\d.]+/.test(t);
  });
  const n = rows.length;
  if (n === 0) return [];
  if (n < LIMITS.pieMin || n > LIMITS.pieMax) {
    return [{
      code: 'pie-sectors',
      message: `pie has ${n} slices (office range ${LIMITS.pieMin}–${LIMITS.pieMax}); use bar or ${ANTV}`,
    }];
  }
  return [];
}

function xychartHits(code: string): LimitHit[] {
  const body = stripFrontmatter(code);
  const xm = /x-axis[^\n]*\[([^\]]+)\]/i.exec(body);
  const cats = xm ? csvItems(xm[1]).length : 0;
  const series = [...body.matchAll(/^\s*(bar|line)\s*\[/gim)].length;
  const hits: LimitHit[] = [];
  if (cats > LIMITS.xyCat) {
    hits.push({
      code: 'xychart-categories',
      message: `xychart has ${cats} categories (max ${LIMITS.xyCat}); ${ANTV}`,
    });
  }
  if (series > LIMITS.xySeries) {
    hits.push({
      code: 'xychart-series',
      message: `xychart has ${series} series (max ${LIMITS.xySeries}); grouped/dual-axis → AntV mcp-server-chart`,
    });
  }
  return hits;
}

function radarHits(code: string): LimitHit[] {
  const body = stripFrontmatter(code);
  let dims = 0;
  for (const m of body.matchAll(/^\s*axis\s+(.+)$/gim)) {
    dims += csvItems(m[1]).length;
  }
  const series = [...body.matchAll(/^\s*curve\s+/gim)].length;
  const hits: LimitHit[] = [];
  if (dims > LIMITS.radarDim) {
    hits.push({
      code: 'radar-axes',
      message: `radar has ${dims} axes (max ${LIMITS.radarDim}); split or ${ANTV}`,
    });
  }
  if (series > LIMITS.radarSeries) {
    hits.push({
      code: 'radar-series',
      message: `radar has ${series} series (max ${LIMITS.radarSeries}); split or ${ANTV}`,
    });
  }
  return hits;
}

const FLOW_SKIP = new Set([
  'subgraph', 'end', 'style', 'classDef', 'class', 'click', 'direction',
  'flowchart', 'graph', 'LR', 'RL', 'TD', 'TB', 'BT', 'and', 'or',
  'linkStyle', 'classDef',
]);

function flowchartHits(code: string): LimitHit[] {
  const body = stripFrontmatter(code);
  const ids = new Set<string>();
  const consider = (id: string): void => {
    if (!id || FLOW_SKIP.has(id)) return;
    ids.add(id);
  };
  for (const m of body.matchAll(/\b([A-Za-z][\w.-]*)\s*(?:\[|\(\(|\(|\{|>)/g)) consider(m[1]);
  for (const m of body.matchAll(/\b([A-Za-z][\w.-]*)\s*(?:-->|---|-\.-|==>)/g)) consider(m[1]);
  for (const m of body.matchAll(/(?:-->|---|-\.-|==>)\s*(?:\|[^|]*\|\s*)?([A-Za-z][\w.-]*)/g)) consider(m[1]);
  const edges = [...body.matchAll(/-->|---|-\.-|==>/g)].length;
  const hits: LimitHit[] = [];
  if (ids.size > LIMITS.flowNodes) {
    hits.push({
      code: 'flowchart-nodes',
      message: `flowchart has ${ids.size} nodes (overview max ${LIMITS.flowNodes}); split into overview + detail`,
    });
  }
  if (edges > LIMITS.flowEdges) {
    hits.push({
      code: 'flowchart-edges',
      message: `flowchart has ${edges} edges (overview max ${LIMITS.flowEdges}); split into overview + detail`,
    });
  }
  return hits;
}

function sequenceHits(code: string): LimitHit[] {
  const body = stripFrontmatter(code);
  const parts = new Set<string>();
  for (const m of body.matchAll(/^\s*(?:participant|actor)\s+(\S+)/gim)) {
    const id = m[1].replace(/:$/, '');
    if (id.toLowerCase() !== 'as') parts.add(id);
  }
  // `actor u as 用户` — first token is the id
  for (const m of body.matchAll(/([A-Za-z][\w.-]*)\s*(?:-{1,2}>{1,2}|-{1,2}\)|\-{1,2}x)/g)) {
    parts.add(m[1]);
  }
  const n = parts.size;
  if (n > LIMITS.seqActors) {
    return [{
      code: 'sequence-actors',
      message: `sequence has ${n} lifelines (max ${LIMITS.seqActors}); split the interaction`,
    }];
  }
  return [];
}

export function scanLimits(code: string): LimitHit[] {
  const k = kind(code);
  if (k === 'pie') return pieHits(code);
  if (k === 'xychart') return xychartHits(code);
  if (k === 'radar') return radarHits(code);
  if (k === 'flowchart') return flowchartHits(code);
  if (k === 'sequence') return sequenceHits(code);
  return [];
}
