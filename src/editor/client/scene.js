// Scene extraction and geometry for the editor. The SVG remains the source of
// truth: nodes keep their Pele shape/theme markup, edges keep their paths and
// markers. This module only adds a shape wrapper for resizing and routing.

const NS = 'http://www.w3.org/2000/svg';
let measureCanvas = null;

function ceilBox(b) {
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

function boxFromPoints(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(0.01, Math.max(...xs) - x), h: Math.max(0.01, Math.max(...ys) - y) };
}

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function matrixOf(el) {
  const m = el.getCTM?.();
  return m ? { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } : IDENTITY;
}

function invert(m) {
  const det = m.a * m.d - m.b * m.c;
  if (!det) return IDENTITY;
  return {
    a: m.d / det, b: -m.b / det,
    c: -m.c / det, d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

function multiply(m1, m2) {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function applyMatrix(m, p) {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

function transformBox(matrix, box) {
  const pts = [
    applyMatrix(matrix, { x: box.x, y: box.y }),
    applyMatrix(matrix, { x: box.x + box.w, y: box.y }),
    applyMatrix(matrix, { x: box.x + box.w, y: box.y + box.h }),
    applyMatrix(matrix, { x: box.x, y: box.y + box.h }),
  ];
  return boxFromPoints(pts);
}

function relativeMatrix(root, el) {
  return multiply(invert(matrixOf(root)), matrixOf(el));
}

function tagName(el) {
  return el.tagName.toLowerCase();
}

function ensureShapeGroup(node) {
  let group = Array.from(node.children).find((el) => el.classList?.contains('mmdx-shape'));
  if (group) return group;
  group = document.createElementNS(NS, 'g');
  group.setAttribute('class', 'mmdx-shape');
  for (const child of Array.from(node.children)) {
    if (tagName(child) === 'text') continue;
    group.appendChild(child);
  }
  node.insertBefore(group, node.firstChild);
  return group;
}

function wrapperScale(group) {
  const m = group?.transform?.baseVal?.consolidate()?.matrix;
  return {
    x: m && Number.isFinite(m.a) ? (m.a || 1) : 1,
    y: m && Number.isFinite(m.d) ? (m.d || 1) : 1,
  };
}

function setWrapperScale(group, sx, sy) {
  if (Math.abs(sx - 1) < 1e-5 && Math.abs(sy - 1) < 1e-5) group.removeAttribute('transform');
  else group.setAttribute('transform', `scale(${sx} ${sy})`);
}

function nodeGeometry(root, node) {
  const local = node.shapeGroup.getBBox();
  const scale = wrapperScale(node.shapeGroup);
  const matrix = multiply(
    relativeMatrix(root, node.el),
    { a: Math.abs(scale.x), b: 0, c: 0, d: Math.abs(scale.y), e: 0, f: 0 },
  );
  const bbox = transformBox(matrix, ceilBox(local));
  const center = applyMatrix(relativeMatrix(root, node.el), { x: 0, y: 0 });
  const shapeW = Math.max(1, local.width * Math.abs(scale.x));
  const shapeH = Math.max(1, local.height * Math.abs(scale.y));
  return {
    bbox,
    center: { x: center.x, y: center.y },
    shapeW,
    shapeH,
    baseW: Math.max(0.01, local.width),
    baseH: Math.max(0.01, local.height),
    scaleX: scale.x,
    scaleY: scale.y,
  };
}

function nodeByIdMap(nodes) {
  return new Map(nodes.map((n) => [n.id, n]));
}

function distToBox(point, box) {
  const dx = point.x < box.x ? box.x - point.x : point.x > box.x + box.w ? point.x - (box.x + box.w) : 0;
  const dy = point.y < box.y ? box.y - point.y : point.y > box.y + box.h ? point.y - (box.y + box.h) : 0;
  return Math.hypot(dx, dy);
}

function nearestNode(point, nodes, max) {
  let best = null;
  let bestD = max;
  for (const node of nodes) {
    const d = distToBox(point, node.bbox);
    if (d < bestD) { bestD = d; best = node; }
  }
  return best;
}

function pathPoint(root, path, at) {
  const len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
  if (!len) return null;
  const p = path.getPointAtLength(Math.max(0, Math.min(len, at)));
  return applyMatrix(relativeMatrix(root, path), { x: p.x, y: p.y });
}

function findLabel(root, id) {
  return Array.from(root.querySelectorAll('.pele-edge-label')).find((g) => g.dataset.id === id) ?? null;
}

function samplePath(root, path) {
  const len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
  if (!len) return [];
  const matrix = relativeMatrix(root, path);
  const count = Math.min(160, Math.max(2, Math.ceil(len / 18)));
  const points = [];
  for (let i = 0; i <= count; i++) {
    points.push(applyMatrix(matrix, path.getPointAtLength((len * i) / count)));
  }
  return points;
}

function parseLabelGroup(group) {
  if (!group) return null;
  let base;
  try { base = ceilBox(group.getBBox()); } catch { return null; }
  const m = group.transform?.baseVal?.consolidate()?.matrix;
  return {
    el: group,
    baseBox: base,
    w: base.w,
    h: base.h,
    baseCenter: { x: base.x + base.w / 2, y: base.y + base.h / 2 },
    offset: { x: m?.e ?? 0, y: m?.f ?? 0 },
  };
}

export function parseAnchor(value) {
  const match = /^(left|right|top|bottom):(-?[0-9.]+)$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const t = Number(match[2]);
  if (!Number.isFinite(t)) return null;
  return { side: match[1], t: clamp(t, 0, 1) };
}

export function formatAnchor(anchor) {
  return `${anchor.side}:${clamp(anchor.t, 0, 1).toFixed(4)}`;
}

export function anchorPoint(node, anchor) {
  const b = node.bbox;
  const t = clamp(anchor.t, 0, 1);
  if (anchor.side === 'left') {
    return { x: b.x, y: b.y + b.h * t, nx: -1, ny: 0, side: 'left' };
  }
  if (anchor.side === 'right') {
    return { x: b.x + b.w, y: b.y + b.h * t, nx: 1, ny: 0, side: 'right' };
  }
  if (anchor.side === 'top') {
    return { x: b.x + b.w * t, y: b.y, nx: 0, ny: -1, side: 'top' };
  }
  return { x: b.x + b.w * t, y: b.y + b.h, nx: 0, ny: 1, side: 'bottom' };
}

/** Pick the side and normalized offset nearest to a world-space point. */
export function anchorForPoint(node, point) {
  const b = node.bbox;
  const x = clamp(point.x, b.x, b.x + b.w);
  const y = clamp(point.y, b.y, b.y + b.h);
  const d = {
    left: Math.abs(x - b.x),
    right: Math.abs(b.x + b.w - x),
    top: Math.abs(y - b.y),
    bottom: Math.abs(b.y + b.h - y),
  };
  let side = 'left';
  let best = Infinity;
  for (const key of ['left', 'right', 'top', 'bottom']) {
    if (d[key] < best) { best = d[key]; side = key; }
  }
  const t = side === 'left' || side === 'right'
    ? (b.h ? (y - b.y) / b.h : 0.5)
    : (b.w ? (x - b.x) / b.w : 0.5);
  return { side, t: clamp(t, 0, 1) };
}

function bindEdges(root, edgeEls, nodes, bindings) {
  const nodeMap = nodeByIdMap(nodes);
  const byId = new Map((bindings ?? []).map((b) => [b.id, b]));
  const edges = [];
  for (const el of edgeEls) {
    const id = el.dataset.id ?? '';
    const pathEl = Array.from(el.children).find((c) => tagName(c) === 'path' && !c.classList.contains('pele-marker'));
    if (!pathEl) continue;
    const markerEl = el.querySelector('.pele-marker');
    let from = el.getAttribute('data-mmdx-from') || byId.get(id)?.from || null;
    let to = el.getAttribute('data-mmdx-to') || byId.get(id)?.to || null;
    if ((!from || !to) && typeof pathEl.getTotalLength === 'function') {
      const start = pathPoint(root, pathEl, 0);
      const end = pathPoint(root, pathEl, pathEl.getTotalLength());
      if (start) from = from ?? nearestNode(start, nodes, 36)?.id ?? null;
      if (end) to = to ?? nearestNode(end, nodes, 36)?.id ?? null;
    }
    const labelEl = findLabel(root, id);
    const samples = samplePath(root, pathEl);
    const style = readEdgeStyle(el);
    const edge = {
      id,
      el,
      pathEl,
      markerEl,
      from,
      to,
      fromNode: from ? nodeMap.get(from) ?? null : null,
      toNode: to ? nodeMap.get(to) ?? null : null,
      fromAnchor: parseAnchor(el.getAttribute('data-mmdx-from-anchor')),
      toAnchor: parseAnchor(el.getAttribute('data-mmdx-to-anchor')),
      label: parseLabelGroup(labelEl),
      samples,
      bbox: samples.length ? boxFromPoints(samples) : null,
      route: null,
      style,
    };
    edges.push(edge);
    if (hasEdgeStyle(style)) applyEdgeStyle(edge, style);
  }
  return edges;
}

function clusterRect(cluster) {
  const r = cluster.el.querySelector('rect');
  if (!r) return null;
  const x = Number(r.getAttribute('x') ?? 0);
  const y = Number(r.getAttribute('y') ?? 0);
  const w = Number(r.getAttribute('width') ?? 0);
  const h = Number(r.getAttribute('height') ?? 0);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { x, y, w, h };
}

function updateClusterGeometry(cluster, nodes) {
  if (!cluster?.rectEl) return;
  const children = cluster.childIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean);
  if (!children.length) return;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of children) {
    minX = Math.min(minX, node.bbox.x);
    minY = Math.min(minY, node.bbox.y);
    maxX = Math.max(maxX, node.bbox.x + node.bbox.w);
    maxY = Math.max(maxY, node.bbox.y + node.bbox.h);
  }
  const x = minX - 18;
  const y = minY - 30;
  const w = Math.max(44, maxX - minX + 36);
  const h = Math.max(50, maxY - minY + 48);
  cluster.rectEl.setAttribute('x', String(x));
  cluster.rectEl.setAttribute('y', String(y));
  cluster.rectEl.setAttribute('width', String(w));
  cluster.rectEl.setAttribute('height', String(h));
  if (cluster.titleEl) {
    cluster.titleEl.setAttribute('x', String(x + w / 2));
    cluster.titleEl.setAttribute('y', String(y + 24));
  }
  cluster.bbox = { x, y, w, h };
}

export function extractScene(root, bindings, subgraphs) {
  const nodes = [];
  const nodeEls = Array.from(root.querySelectorAll('.pele-node'));
  for (const el of nodeEls) {
    const id = el.dataset.id;
    if (!id) continue;
    const shapeGroup = ensureShapeGroup(el);
    const labelEl = el.querySelector('text.pele-label') ?? el.querySelector('text');
    const node = {
      id,
      el,
      shapeGroup,
      labelEl,
      shapeClass: Array.from(el.classList).find((c) => c.startsWith('pele-shape-')) ?? '',
      label: labelEl ? labelEl.textContent.trim() : id,
      parentId: null,
      colors: readNodeColors(el),
    };
    Object.assign(node, nodeGeometry(root, node));
    if (node.colors.fill || node.colors.stroke || node.colors.text) {
      applyNodeColors(node, node.colors);
    }
    nodes.push(node);
  }

  // Model subgraphs give exact membership; the SVG container's rect is an
  // absolute frame, not an ancestor, so DOM nesting cannot supply this.
  const subInfo = new Map((subgraphs ?? []).map((s) => [String(s.id), s]));
  const clusters = [];
  for (const el of Array.from(root.querySelectorAll('.pele-cluster'))) {
    const id = el.dataset.id;
    if (!id) continue;
    const rectEl = el.querySelector('rect');
    const titleEl = el.querySelector('.pele-cluster-label') ?? el.querySelector('text');
    const info = subInfo.get(id);
    let childIds = info?.nodes ? [...info.nodes] : [];
    if (!childIds.length) {
      const rb = clusterRect({ el });
      if (rb) {
        childIds = nodes.filter((n) => {
          const cx = n.bbox.x + n.bbox.w / 2;
          const cy = n.bbox.y + n.bbox.h / 2;
          return cx >= rb.x && cx <= rb.x + rb.w && cy >= rb.y && cy <= rb.y + rb.h;
        }).map((n) => n.id);
      }
    }
    const cluster = {
      id,
      el,
      rectEl,
      titleEl,
      childIds,
      title: info?.title ?? titleEl?.textContent?.trim() ?? id,
      bbox: clusterRect({ el }) ?? { x: 0, y: 0, w: 0, h: 0 },
    };
    for (const child of childIds) {
      const n = nodes.find((x) => x.id === child);
      if (n) n.parentId = id;
    }
    clusters.push(cluster);
  }

  const edges = bindEdges(root, Array.from(root.querySelectorAll('.pele-edge')), nodes, bindings);
  return { nodes, edges, clusters };
}

/* ------------------------------------------------------------------ text -- */

function canvasCtx() {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCanvas.width = 8;
    measureCanvas.height = 8;
  }
  return measureCanvas.getContext('2d');
}

function fontOf(el) {
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize) || 15;
  const weight = cs.fontWeight || '400';
  const style = cs.fontStyle || 'normal';
  return {
    size,
    family: cs.fontFamily || 'sans-serif',
    weight,
    style,
    css: `${style} ${weight} ${size}px ${cs.fontFamily || 'sans-serif'}`,
    lineHeight: size * 1.28,
  };
}

const CJK = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;

function tokenize(paragraph) {
  const out = [];
  let buf = '';
  for (const ch of paragraph) {
    if (/\s/.test(ch)) {
      if (buf) { out.push(buf); buf = ''; }
      out.push(' ');
    } else if (CJK.test(ch)) {
      if (buf) { out.push(buf); buf = ''; }
      out.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function wrapText(text, maxWidth, font) {
  const ctx = canvasCtx();
  ctx.font = font.css;
  const measure = (s) => ctx.measureText(s).width;
  const out = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    if (!paragraph.trim()) { out.push(''); continue; }
    let line = '';
    for (const token of tokenize(paragraph)) {
      if (token === ' ' && !line) continue;
      const candidate = line + token;
      if (line && measure(candidate.trimEnd()) > maxWidth) {
        out.push(line.trimEnd());
        line = token === ' ' ? '' : token;
        continue;
      }
      if (token.length > 1 && measure(token) > maxWidth) {
        // a single long Latin run: fall back to character wrapping
        let chunk = '';
        for (const ch of token) {
          if (chunk && measure(chunk + ch) > maxWidth) {
            if (line) { out.push(line.trimEnd()); line = ''; }
            out.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line += chunk;
        continue;
      }
      line = candidate;
    }
    out.push(line.trimEnd());
  }
  return out.length ? out : [''];
}

export function nodeLabelText(node) {
  if (!node.labelEl) return '';
  const spans = Array.from(node.labelEl.querySelectorAll('tspan'));
  if (spans.length) return spans.map((t) => t.textContent).join('\n').trim();
  return node.labelEl.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Rewrite a node label as centered <tspan> lines. The shape wrapper grows when
 * the new text needs more room; the label itself is never scaled.
 */
export function setNodeLabel(root, node, text) {
  if (!node.labelEl) return false;
  const font = fontOf(node.labelEl);
  const shapeW = node.shapeW;
  const maxWidth = Math.max(64, shapeW - 26);
  const lines = wrapText(text, maxWidth, font);
  const el = node.labelEl;
  el.textContent = '';
  el.setAttribute('text-anchor', 'middle');
  el.setAttribute('y', '0');
  const first = -((lines.length - 1) * font.lineHeight) / 2 + font.size * 0.35;
  let widest = 0;
  const ctx = canvasCtx();
  ctx.font = font.css;
  for (let i = 0; i < lines.length; i++) {
    widest = Math.max(widest, ctx.measureText(lines[i]).width);
    const tspan = document.createElementNS(NS, 'tspan');
    tspan.setAttribute('x', '0');
    tspan.setAttribute('y', String(first + i * font.lineHeight));
    tspan.textContent = lines[i];
    el.appendChild(tspan);
  }
  node.label = lines.join('\n');

  const neededW = Math.min(560, widest + 28);
  const neededH = lines.length * font.lineHeight + 22;
  let changed = false;
  if (neededW > shapeW + 0.5) {
    node.scaleX = neededW / node.baseW;
    changed = true;
  }
  if (neededH > node.shapeH + 0.5) {
    node.scaleY = neededH / node.baseH;
    changed = true;
  }
  if (changed) {
    setWrapperScale(node.shapeGroup, node.scaleX, node.scaleY);
  }
  Object.assign(node, nodeGeometry(root, node));
  return true;
}

/* ---------------------------------------------------------------- colors -- */

const SHAPE_PARTS = 'rect, path, polygon, circle, ellipse';

function shapeParts(node) {
  return Array.from(node.shapeGroup.querySelectorAll(SHAPE_PARTS));
}

function effectivePaint(el, prop) {
  if (!el) return null;
  const value = getComputedStyle(el)[prop];
  return value && value !== 'none' && value !== 'rgba(0, 0, 0, 0)' ? value : null;
}

function captureBaseColors(node) {
  const el = node.el;
  if (el.getAttribute('data-mmdx-base-fill') && el.getAttribute('data-mmdx-base-stroke') &&
    el.getAttribute('data-mmdx-base-text')) return;
  const parts = shapeParts(node);
  let fill = null;
  let stroke = null;
  for (const part of parts) {
    fill = fill ?? effectivePaint(part, 'fill');
    stroke = stroke ?? effectivePaint(part, 'stroke');
  }
  fill = fill ?? effectivePaint(node.labelEl, 'fill');
  if (fill && !el.getAttribute('data-mmdx-base-fill')) el.setAttribute('data-mmdx-base-fill', fill);
  if (stroke && !el.getAttribute('data-mmdx-base-stroke')) el.setAttribute('data-mmdx-base-stroke', stroke);
  const text = effectivePaint(node.labelEl, 'fill');
  if (text && !el.getAttribute('data-mmdx-base-text')) el.setAttribute('data-mmdx-base-text', text);
}

export function readNodeColors(el) {
  return {
    fill: el.getAttribute('data-mmdx-fill') || null,
    stroke: el.getAttribute('data-mmdx-stroke') || null,
    text: el.getAttribute('data-mmdx-text') || null,
  };
}

function markPaintable(node, prop, attr) {
  for (const part of shapeParts(node)) {
    if (part.hasAttribute(attr)) continue;
    if (effectivePaint(part, prop)) part.setAttribute(attr, '1');
  }
}

export function applyNodeColors(node, colors) {
  captureBaseColors(node);
  const next = {
    fill: colors.fill || null,
    stroke: colors.stroke || null,
    text: colors.text || null,
  };
  const el = node.el;
  if (next.fill) {
    markPaintable(node, 'fill', 'data-mmdx-fillable');
    for (const part of shapeParts(node)) {
      if (part.getAttribute('data-mmdx-fillable') === '1') part.style.fill = next.fill;
    }
    el.setAttribute('data-mmdx-fill', next.fill);
  }
  if (next.stroke) {
    markPaintable(node, 'stroke', 'data-mmdx-strokable');
    for (const part of shapeParts(node)) {
      if (part.getAttribute('data-mmdx-strokable') === '1') part.style.stroke = next.stroke;
    }
    el.setAttribute('data-mmdx-stroke', next.stroke);
  }
  if (next.text && node.labelEl) {
    node.labelEl.style.fill = next.text;
    node.labelEl.style.color = next.text;
    el.setAttribute('data-mmdx-text', next.text);
  }
  node.colors = next;
}

export function setNodeColor(node, key, value) {
  if (key !== 'fill' && key !== 'stroke' && key !== 'text') return false;
  applyNodeColors(node, { ...(node.colors ?? {}), [key]: value });
  return true;
}

export function resetNodeColors(node) {
  const el = node.el;
  const baseFill = el.getAttribute('data-mmdx-base-fill');
  const baseStroke = el.getAttribute('data-mmdx-base-stroke');
  const baseText = el.getAttribute('data-mmdx-base-text');
  for (const part of shapeParts(node)) {
    if (part.getAttribute('data-mmdx-fillable') === '1') {
      if (baseFill) part.style.fill = baseFill;
      else part.style.removeProperty('fill');
    }
    if (part.getAttribute('data-mmdx-strokable') === '1') {
      if (baseStroke) part.style.stroke = baseStroke;
      else part.style.removeProperty('stroke');
    }
  }
  if (node.labelEl) {
    if (baseText) node.labelEl.style.fill = baseText;
    else node.labelEl.style.removeProperty('fill');
    node.labelEl.style.removeProperty('color');
  }
  for (const key of ['fill', 'stroke', 'text']) el.removeAttribute(`data-mmdx-${key}`);
  node.colors = { fill: null, stroke: null, text: null };
}

export function nodeColors(node) {
  const parts = shapeParts(node);
  let fill = node.colors?.fill;
  let stroke = node.colors?.stroke;
  let text = node.colors?.text;
  if (!fill) {
    for (const part of parts) {
      fill = effectivePaint(part, 'fill');
      if (fill) break;
    }
  }
  if (!stroke) {
    for (const part of parts) {
      stroke = effectivePaint(part, 'stroke');
      if (stroke) break;
    }
  }
  if (!text) text = effectivePaint(node.labelEl, 'fill');
  return {
    fill: fill ?? '#FFFFFF',
    stroke: stroke ?? '#000000',
    text: text ?? '#000000',
    custom: {
      fill: !!node.colors?.fill,
      stroke: !!node.colors?.stroke,
      text: !!node.colors?.text,
    },
  };
}

/* ----------------------------------------------------------- edge styles -- */

const EDGE_STYLE_ATTRS = {
  route: 'data-mmdx-edge-route',
  stroke: 'data-mmdx-edge-stroke',
  width: 'data-mmdx-edge-width',
  dash: 'data-mmdx-edge-dash',
  arrow: 'data-mmdx-edge-arrow',
};
const EDGE_BASE_ATTRS = {
  stroke: 'data-mmdx-base-edge-stroke',
  width: 'data-mmdx-base-edge-width',
  dash: 'data-mmdx-base-edge-dash',
  linecap: 'data-mmdx-base-edge-linecap',
  arrowFill: 'data-mmdx-base-arrow-fill',
  arrowStroke: 'data-mmdx-base-arrow-stroke',
  arrowWidth: 'data-mmdx-base-arrow-width',
  arrowDisplay: 'data-mmdx-base-arrow-display',
  routePath: 'data-mmdx-base-edge-path',
  routeMarker: 'data-mmdx-base-edge-marker',
  routeLabel: 'data-mmdx-base-edge-label-transform',
  routeLabelOffset: 'data-mmdx-base-edge-label-offset',
};
const EDGE_DASHES = new Set(['solid', 'dashed', 'dotted']);
const EDGE_ARROWS = new Set(['filled', 'open', 'none']);
const EDGE_ROUTES = new Set(['auto', 'orthogonal', 'straight', 'curved']);

export function readEdgeStyle(el) {
  const width = Number.parseFloat(el.getAttribute(EDGE_STYLE_ATTRS.width) ?? '');
  const dash = el.getAttribute(EDGE_STYLE_ATTRS.dash);
  const arrow = el.getAttribute(EDGE_STYLE_ATTRS.arrow);
  const route = el.getAttribute(EDGE_STYLE_ATTRS.route);
  return {
    route: EDGE_ROUTES.has(route) && route !== 'auto' ? route : null,
    stroke: el.getAttribute(EDGE_STYLE_ATTRS.stroke) || null,
    width: Number.isFinite(width) ? width : null,
    dash: EDGE_DASHES.has(dash) ? dash : null,
    arrow: EDGE_ARROWS.has(arrow) ? arrow : null,
  };
}

function hasEdgeStyle(style) {
  return !!style && (!!style.route || !!style.stroke || style.width != null || !!style.dash || !!style.arrow);
}

function paintIsNone(value) {
  return !value || value === 'none' || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
}

function dashKind(value) {
  return !value || value === 'none' || value === '0px' || value === '0' ? 'solid' : 'dashed';
}

function arrowKind(marker) {
  if (!marker) return 'none';
  if (getComputedStyle(marker).display === 'none') return 'none';
  return paintIsNone(effectivePaint(marker, 'fill')) ? 'open' : 'filled';
}

function captureEdgeBase(edge) {
  const el = edge.el;
  const path = edge.pathEl;
  if (!el.hasAttribute(EDGE_BASE_ATTRS.stroke)) {
    const stroke = effectivePaint(path, 'stroke');
    if (stroke) el.setAttribute(EDGE_BASE_ATTRS.stroke, stroke);
  }
  if (!el.hasAttribute(EDGE_BASE_ATTRS.width)) {
    const width = getComputedStyle(path).strokeWidth;
    if (width) el.setAttribute(EDGE_BASE_ATTRS.width, width);
  }
  if (!el.hasAttribute(EDGE_BASE_ATTRS.dash)) {
    const dash = getComputedStyle(path).strokeDasharray;
    if (dash) el.setAttribute(EDGE_BASE_ATTRS.dash, dash);
  }
  if (!el.hasAttribute(EDGE_BASE_ATTRS.linecap)) {
    const linecap = getComputedStyle(path).strokeLinecap;
    if (linecap) el.setAttribute(EDGE_BASE_ATTRS.linecap, linecap);
  }
  const marker = edge.markerEl;
  if (!marker) {
    if (!el.hasAttribute(EDGE_BASE_ATTRS.arrowDisplay)) el.setAttribute(EDGE_BASE_ATTRS.arrowDisplay, 'none');
    return;
  }
  if (!el.hasAttribute(EDGE_BASE_ATTRS.arrowDisplay)) {
    el.setAttribute(EDGE_BASE_ATTRS.arrowDisplay, getComputedStyle(marker).display);
  }
  if (!el.hasAttribute(EDGE_BASE_ATTRS.arrowFill)) {
    el.setAttribute(EDGE_BASE_ATTRS.arrowFill, effectivePaint(marker, 'fill') ?? 'none');
  }
  if (!el.hasAttribute(EDGE_BASE_ATTRS.arrowStroke)) {
    el.setAttribute(EDGE_BASE_ATTRS.arrowStroke, effectivePaint(marker, 'stroke') ?? 'none');
  }
  if (!el.hasAttribute(EDGE_BASE_ATTRS.arrowWidth)) {
    el.setAttribute(EDGE_BASE_ATTRS.arrowWidth, getComputedStyle(marker).strokeWidth || '1.5px');
  }
}

function edgeBase(edge) {
  captureEdgeBase(edge);
  const el = edge.el;
  const arrowFill = el.getAttribute(EDGE_BASE_ATTRS.arrowFill) ?? 'none';
  const arrowDisplay = el.getAttribute(EDGE_BASE_ATTRS.arrowDisplay) ?? 'none';
  return {
    stroke: el.getAttribute(EDGE_BASE_ATTRS.stroke) ?? '#8E8EA0',
    width: Number.parseFloat(el.getAttribute(EDGE_BASE_ATTRS.width) ?? '') || 1.5,
    dash: el.getAttribute(EDGE_BASE_ATTRS.dash) ?? 'none',
    linecap: el.getAttribute(EDGE_BASE_ATTRS.linecap) ?? 'round',
    arrowFill,
    arrowStroke: el.getAttribute(EDGE_BASE_ATTRS.arrowStroke) ?? 'none',
    arrowWidth: el.getAttribute(EDGE_BASE_ATTRS.arrowWidth) ?? '1.5px',
    arrowDisplay,
    arrow: arrowDisplay === 'none' ? 'none' : paintIsNone(arrowFill) ? 'open' : 'filled',
  };
}

function captureEdgeRouteBase(edge) {
  const el = edge.el;
  if (el.hasAttribute(EDGE_BASE_ATTRS.routePath)) return;
  el.setAttribute(EDGE_BASE_ATTRS.routePath, edge.pathEl.getAttribute('d') ?? '');
  if (edge.markerEl) {
    el.setAttribute(EDGE_BASE_ATTRS.routeMarker, edge.markerEl.getAttribute('d') ?? '');
  }
  if (edge.label) {
    el.setAttribute(EDGE_BASE_ATTRS.routeLabel, edge.label.el.getAttribute('transform') ?? '');
    el.setAttribute(EDGE_BASE_ATTRS.routeLabelOffset,
      `${edge.label.offset.x.toFixed(2)} ${edge.label.offset.y.toFixed(2)}`);
  }
}

function dropEdgeRouteBase(edge) {
  for (const attr of [
    EDGE_BASE_ATTRS.routePath,
    EDGE_BASE_ATTRS.routeMarker,
    EDGE_BASE_ATTRS.routeLabel,
    EDGE_BASE_ATTRS.routeLabelOffset,
  ]) edge.el.removeAttribute(attr);
}

function restoreEdgeRouteBase(edge) {
  const el = edge.el;
  const d = el.getAttribute(EDGE_BASE_ATTRS.routePath);
  if (d === null) return false;
  edge.pathEl.setAttribute('d', d);
  const markerD = el.getAttribute(EDGE_BASE_ATTRS.routeMarker);
  if (edge.markerEl && markerD !== null) edge.markerEl.setAttribute('d', markerD);
  if (edge.label) {
    const transform = el.getAttribute(EDGE_BASE_ATTRS.routeLabel) ?? '';
    if (transform) edge.label.el.setAttribute('transform', transform);
    else edge.label.el.removeAttribute('transform');
    const offset = (el.getAttribute(EDGE_BASE_ATTRS.routeLabelOffset) ?? '').split(/\s+/).map(Number);
    edge.label.offset = Number.isFinite(offset[0]) && Number.isFinite(offset[1])
      ? { x: offset[0], y: offset[1] }
      : { x: 0, y: 0 };
  }
  const root = edge.el.ownerSVGElement;
  edge.samples = root ? samplePath(root, edge.pathEl) : [];
  edge.bbox = edge.samples.length ? boxFromPoints(edge.samples) : null;
  edge.route = null;
  return true;
}

function edgeDashArray(kind, width) {
  if (kind === 'dashed') return `${Math.max(5, width * 4)} ${Math.max(3, width * 2.5)}`;
  if (kind === 'dotted') return `${Math.max(1, width * 0.9)} ${Math.max(3, width * 2.5)}`;
  return 'none';
}

export function applyEdgeStyle(edge, style = {}) {
  captureEdgeBase(edge);
  const base = edgeBase(edge);
  const previousRoute = edge.style?.route ?? null;
  const next = {
    route: EDGE_ROUTES.has(style.route) && style.route !== 'auto' ? style.route : null,
    stroke: style.stroke || null,
    width: Number.isFinite(style.width) ? style.width : null,
    dash: EDGE_DASHES.has(style.dash) ? style.dash : null,
    arrow: EDGE_ARROWS.has(style.arrow) ? style.arrow : null,
  };
  edge.style = next;

  const stroke = next.stroke ?? base.stroke;
  const width = Math.max(0.5, Math.min(12, next.width ?? base.width));
  const path = edge.pathEl;
  path.style.stroke = stroke;
  path.style.strokeWidth = `${width}px`;
  path.style.strokeDasharray = next.dash ? edgeDashArray(next.dash, width) : base.dash;
  path.style.strokeLinecap = next.dash === 'dotted' ? 'round' : base.linecap;

  const marker = edge.markerEl;
  if (marker) {
    const arrow = next.arrow ?? base.arrow;
    if (arrow === 'none') {
      marker.style.display = 'none';
    } else {
      marker.style.display = base.arrowDisplay === 'none' ? '' : base.arrowDisplay;
      if (arrow === 'open') {
        marker.style.fill = 'none';
        marker.style.stroke = stroke;
        marker.style.strokeWidth = `${Math.max(1, width * 0.75)}px`;
        marker.style.strokeLinejoin = 'miter';
      } else {
        marker.style.fill = next.stroke ?? (paintIsNone(base.arrowFill) ? stroke : base.arrowFill);
        marker.style.stroke = base.arrowStroke;
        marker.style.strokeWidth = base.arrowWidth;
      }
    }
  }

  if (next.route && next.route !== previousRoute) captureEdgeRouteBase(edge);
  if (next.route) {
    if (next.route !== previousRoute) rerouteEdge(edge);
  } else if (previousRoute) {
    restoreEdgeRouteBase(edge);
    dropEdgeRouteBase(edge);
  }

  for (const key of Object.keys(EDGE_STYLE_ATTRS)) {
    if (next[key] === null) edge.el.removeAttribute(EDGE_STYLE_ATTRS[key]);
    else edge.el.setAttribute(EDGE_STYLE_ATTRS[key], String(next[key]));
  }
  return edgeStyle(edge);
}

export function edgeStyle(edge) {
  const base = edgeBase(edge);
  const path = edge.pathEl;
  const overrides = readEdgeStyle(edge.el);
  const measuredWidth = Number.parseFloat(getComputedStyle(path).strokeWidth);
  const measuredDash = getComputedStyle(path).strokeDasharray;
  return {
    route: overrides.route ?? 'auto',
    stroke: overrides.stroke ?? effectivePaint(path, 'stroke') ?? base.stroke,
    width: overrides.width ?? (Number.isFinite(measuredWidth) ? measuredWidth : base.width),
    dash: overrides.dash ?? dashKind(measuredDash),
    arrow: overrides.arrow ?? arrowKind(edge.markerEl),
    custom: {
      route: !!overrides.route,
      stroke: !!overrides.stroke,
      width: overrides.width != null,
      dash: !!overrides.dash,
      arrow: !!overrides.arrow,
    },
  };
}

export function setEdgeStyleValue(edge, key, value) {
  if (!(key in EDGE_STYLE_ATTRS)) return false;
  applyEdgeStyle(edge, { ...(edge.style ?? {}), [key]: value });
  return true;
}

export function resetEdgeStyle(edge) {
  for (const attr of Object.values(EDGE_STYLE_ATTRS)) edge.el.removeAttribute(attr);
  applyEdgeStyle(edge, {});
  dropEdgeRouteBase(edge);
  return edgeStyle(edge);
}

/* --------------------------------------------------------------- routing -- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function defaultAnchor(node, other) {
  const c = node.center;
  const dx = other.x - c.x;
  const dy = other.y - c.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const side = dx >= 0 ? 'right' : 'left';
    const t = node.bbox.h ? (other.y - node.bbox.y) / node.bbox.h : 0.5;
    return { side, t: clamp(t, 0.06, 0.94) };
  }
  const side = dy >= 0 ? 'bottom' : 'top';
  const t = node.bbox.w ? (other.x - node.bbox.x) / node.bbox.w : 0.5;
  return { side, t: clamp(t, 0.06, 0.94) };
}

function resolveAnchor(node, anchor, other) {
  return anchorPoint(node, anchor ?? defaultAnchor(node, other));
}

/** Current endpoint positions, including explicit anchors where present. */
export function edgeEndpoints(edge) {
  if (!edge.fromNode || !edge.toNode) return null;
  return {
    from: resolveAnchor(edge.fromNode, edge.fromAnchor, edge.toNode.center),
    to: resolveAnchor(edge.toNode, edge.toAnchor, edge.fromNode.center),
  };
}

function dedupe(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) out.push(p);
  }
  return out;
}

const ROUTE_STUB = 18;

function stubPoint(point) {
  return {
    x: point.x + point.nx * ROUTE_STUB,
    y: point.y + point.ny * ROUTE_STUB,
  };
}

function segmentCrossesBox(p, q, box) {
  const pad = 1.5;
  if (Math.abs(p.y - q.y) < 0.01) {
    if (p.y <= box.y + pad || p.y >= box.y + box.h - pad) return false;
    return Math.max(p.x, q.x) > box.x + pad && Math.min(p.x, q.x) < box.x + box.w - pad;
  }
  if (Math.abs(p.x - q.x) < 0.01) {
    if (p.x <= box.x + pad || p.x >= box.x + box.w - pad) return false;
    return Math.max(p.y, q.y) > box.y + pad && Math.min(p.y, q.y) < box.y + box.h - pad;
  }
  return false;
}

function routeScore(connector, boxes) {
  let length = 0;
  let crossings = 0;
  for (let i = 1; i < connector.length; i++) {
    const p = connector[i - 1];
    const q = connector[i];
    length += Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
    for (const box of boxes) if (segmentCrossesBox(p, q, box)) crossings++;
  }
  return length + crossings * 600 + Math.max(0, connector.length - 2) * 4;
}

const ALIGN_DISTANCE = 14;

function outsideOnSide(point, box) {
  return point.y >= box.y && point.y <= box.y + box.h &&
    point.x >= box.x && point.x <= box.x + box.w;
}

/**
 * Two endpoints on parallel sides often differ by a pixel or two after layout.
 * Pulling them onto the shared coordinate removes the tiny Z-shaped jog; the
 * move stays inside both node sides and the direct segment must clear both
 * boxes so we never cut through a shape.
 */
function alignRouteEnds(a, b, fromNode, toNode) {
  const horizontal = (a.side === 'left' || a.side === 'right') &&
    (b.side === 'left' || b.side === 'right');
  if (horizontal && Math.abs(a.y - b.y) > 0.01 && Math.abs(a.y - b.y) <= ALIGN_DISTANCE) {
    const y = (a.y + b.y) / 2;
    if (outsideOnSide({ x: a.x, y }, fromNode.bbox) && outsideOnSide({ x: b.x, y }, toNode.bbox)) {
      const p = { ...a, y };
      const q = { ...b, y };
      if (!segmentCrossesBox({ x: a.x, y }, { x: b.x, y }, fromNode.bbox) &&
        !segmentCrossesBox({ x: a.x, y }, { x: b.x, y }, toNode.bbox)) {
        return [p, q];
      }
    }
  }
  const vertical = (a.side === 'top' || a.side === 'bottom') &&
    (b.side === 'top' || b.side === 'bottom');
  if (vertical && Math.abs(a.x - b.x) > 0.01 && Math.abs(a.x - b.x) <= ALIGN_DISTANCE) {
    const x = (a.x + b.x) / 2;
    if (outsideOnSide({ x, y: a.y }, fromNode.bbox) && outsideOnSide({ x, y: b.y }, toNode.bbox)) {
      const p = { ...a, x };
      const q = { ...b, x };
      if (!segmentCrossesBox({ x, y: a.y }, { x, y: b.y }, fromNode.bbox) &&
        !segmentCrossesBox({ x, y: a.y }, { x, y: b.y }, toNode.bbox)) {
        return [p, q];
      }
    }
  }
  return [a, b];
}

function routePoints(a, b, fromNode, toNode) {
  if (fromNode === toNode) {
    const right = fromNode.bbox.x + fromNode.bbox.w;
    const x = Math.max(right, a.x, b.x) + 34;
    return dedupe([
      { x: a.x, y: a.y },
      { x: right + ROUTE_STUB, y: a.y },
      { x, y: a.y },
      { x, y: b.y },
      { x: right + ROUTE_STUB, y: b.y },
      { x: b.x, y: b.y },
    ]);
  }
  const [start, end] = alignRouteEnds(a, b, fromNode, toNode);
  const A = stubPoint(start);
  const B = stubPoint(end);
  const boxes = [fromNode.bbox, toNode.bbox];
  const candidates = [];
  const add = (middle) => {
    const connector = dedupe([A, ...middle, B]);
    if (connector.length < 2) return;
    candidates.push({ connector, score: routeScore(connector, boxes) });
  };

  if (Math.abs(A.x - B.x) < 0.5 || Math.abs(A.y - B.y) < 0.5) {
    add([]);
  }
  if (Math.abs(A.x - B.x) >= 0.5 && Math.abs(A.y - B.y) >= 0.5) {
    add([{ x: B.x, y: A.y }]);
    add([{ x: A.x, y: B.y }]);
  }
  if ((a.side === 'left' || a.side === 'right') && (b.side === 'left' || b.side === 'right')) {
    const midX = (A.x + B.x) / 2;
    add([{ x: midX, y: A.y }, { x: midX, y: B.y }]);
  }
  if ((a.side === 'top' || a.side === 'bottom') && (b.side === 'top' || b.side === 'bottom')) {
    const midY = (A.y + B.y) / 2;
    add([{ x: A.x, y: midY }, { x: B.x, y: midY }]);
  }
  if (!candidates.length) add([{ x: B.x, y: A.y }]);

  candidates.sort((left, right) => left.score - right.score);
  return dedupe([start, ...candidates[0].connector, end]);
}

function pathData(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('');
}

function markerData(tip, prev) {
  let dx = tip.x - prev.x;
  let dy = tip.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const back = 7.5;
  const half = 3.4;
  const bx = tip.x - dx * back;
  const by = tip.y - dy * back;
  const px = -dy * half;
  const py = dx * half;
  return `M${tip.x.toFixed(2)},${tip.y.toFixed(2)}L${(bx + px).toFixed(2)},${(by + py).toFixed(2)}L${(bx - px).toFixed(2)},${(by - py).toFixed(2)}Z`;
}

function midpoint(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  if (!total) return points[0];
  let target = total / 2;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const l = Math.hypot(dx, dy);
    if (target <= l) {
      const t = l ? target / l : 0;
      return { x: points[i - 1].x + dx * t, y: points[i - 1].y + dy * t };
    }
    target -= l;
  }
  return points[points.length - 1];
}

function cubicPoint(a, c1, c2, b, t) {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: uu * u * a.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + tt * t * b.x,
    y: uu * u * a.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + tt * t * b.y,
  };
}

function sampleCubic(a, c1, c2, b, steps) {
  const points = [];
  for (let i = 0; i <= steps; i++) points.push(cubicPoint(a, c1, c2, b, i / steps));
  return points;
}

function moveLabel(label, point) {
  if (!label) return;
  const tx = point.x - label.baseCenter.x;
  const ty = point.y - label.baseCenter.y;
  label.offset = { x: tx, y: ty };
  if (Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01) label.el.removeAttribute('transform');
  else label.el.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`);
}

/** Replace one edge with the route selected by its style (orthogonal by default). */
export function rerouteEdge(edge) {
  if (!edge.fromNode || !edge.toNode) return false;
  const a = resolveAnchor(edge.fromNode, edge.fromAnchor, edge.toNode.center);
  const b = resolveAnchor(edge.toNode, edge.toAnchor, edge.fromNode.center);
  if (edge.fromNode === edge.toNode) {
    const points = routePoints(a, b, edge.fromNode, edge.toNode);
    if (points.length < 2) return false;
    edge.pathEl.setAttribute('d', pathData(points));
    if (edge.markerEl) {
      edge.markerEl.setAttribute('d', markerData(points[points.length - 1], points[points.length - 2]));
    }
    if (edge.label) moveLabel(edge.label, midpoint(points));
    edge.route = points;
    edge.samples = points.map((p) => ({ x: p.x, y: p.y }));
    edge.bbox = boxFromPoints(points);
    return true;
  }

  const mode = edge.style?.route ?? 'orthogonal';
  if (mode === 'straight') {
    edge.pathEl.setAttribute('d', pathData([a, b]));
    if (edge.markerEl) edge.markerEl.setAttribute('d', markerData(b, a));
    if (edge.label) moveLabel(edge.label, midpoint([a, b]));
    edge.route = null;
    edge.samples = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    edge.bbox = boxFromPoints(edge.samples);
    return true;
  }
  if (mode === 'curved') {
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    const reach = Math.max(20, Math.min(120, span * 0.45));
    const c1 = { x: a.x + a.nx * reach, y: a.y + a.ny * reach };
    const c2 = { x: b.x + b.nx * reach, y: b.y + b.ny * reach };
    edge.pathEl.setAttribute('d',
      `M${a.x.toFixed(2)},${a.y.toFixed(2)}C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ` +
      `${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`);
    if (edge.markerEl) {
      edge.markerEl.setAttribute('d', markerData(b, Math.hypot(c2.x - b.x, c2.y - b.y) > 0.01 ? c2 : a));
    }
    if (edge.label) moveLabel(edge.label, cubicPoint(a, c1, c2, b, 0.5));
    edge.route = null;
    edge.samples = sampleCubic(a, c1, c2, b, 24);
    edge.bbox = boxFromPoints(edge.samples);
    return true;
  }

  const points = routePoints(a, b, edge.fromNode, edge.toNode);
  if (points.length < 2) return false;
  edge.pathEl.setAttribute('d', pathData(points));
  if (edge.markerEl) {
    edge.markerEl.setAttribute('d', markerData(points[points.length - 1], points[points.length - 2]));
  }
  if (edge.label) moveLabel(edge.label, midpoint(points));
  edge.route = points;
  edge.samples = points.map((p) => ({ x: p.x, y: p.y }));
  edge.bbox = boxFromPoints(points);
  return true;
}

export function rerouteEdgesFor(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (ids.has(edge.from) || ids.has(edge.to)) rerouteEdge(edge);
  }
}

export function edgePathEnds(root, edge) {
  if (edge.samples?.length) {
    return {
      from: { ...edge.samples[0] },
      to: { ...edge.samples[edge.samples.length - 1] },
    };
  }
  const path = edge.pathEl;
  const len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
  if (!len) return null;
  return {
    from: pathPoint(root, path, 0),
    to: pathPoint(root, path, len),
  };
}

function pointSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Distance from a world point to an edge's cached world-space polyline. */
export function edgeHitDistance(edge, point) {
  const samples = edge.samples;
  if (!samples?.length) return Infinity;
  let best = Math.hypot(point.x - samples[0].x, point.y - samples[0].y);
  for (let i = 1; i < samples.length; i++) {
    best = Math.min(best, pointSegmentDistance(point, samples[i - 1], samples[i]));
  }
  return best;
}

export function edgeLabelHit(edge, point, pad = 4) {
  const label = edge.label;
  if (!label) return false;
  const x = label.baseBox.x + label.offset.x - pad;
  const y = label.baseBox.y + label.offset.y - pad;
  return point.x >= x && point.x <= x + label.w + pad * 2 &&
    point.y >= y && point.y <= y + label.h + pad * 2;
}

export function refreshClusters(scene) {
  for (const cluster of scene.clusters) updateClusterGeometry(cluster, scene.nodes);
}

/* --------------------------------------------------------------- geometry */

export function sceneBounds(scene) {
  const boxes = [];
  for (const n of scene.nodes) if (n.bbox.w) boxes.push(n.bbox);
  for (const c of scene.clusters) if (c.bbox.w) boxes.push(c.bbox);
  for (const e of scene.edges) {
    try {
      const b = e.pathEl.getBBox();
      if (b.width) boxes.push(ceilBox(b));
    } catch { /* detached */ }
    if (e.label) {
      const b = e.label.el.getBBox();
      if (b.width) boxes.push({
        x: b.x + e.label.offset.x,
        y: b.y + e.label.offset.y,
        w: b.width,
        h: b.height,
      });
    }
  }
  if (!boxes.length) return null;
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

export function sceneSummary(scene, canvas) {
  return {
    canvas,
    nodes: scene.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      x: Number(n.center.x.toFixed(2)),
      y: Number(n.center.y.toFixed(2)),
      w: Number(n.shapeW.toFixed(2)),
      h: Number(n.shapeH.toFixed(2)),
      scaleX: Number(n.scaleX.toFixed(4)),
      scaleY: Number(n.scaleY.toFixed(4)),
      shape: n.shapeClass,
      colors: n.colors ?? {},
    })),
    edges: scene.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      fromAnchor: e.fromAnchor,
      toAnchor: e.toAnchor,
      d: e.pathEl.getAttribute('d') ?? '',
      style: e.style ?? {},
    })),
    clusters: scene.clusters.map((c) => ({
      id: c.id,
      title: c.title,
      x: Number(c.bbox.x.toFixed(2)),
      y: Number(c.bbox.y.toFixed(2)),
      w: Number(c.bbox.w.toFixed(2)),
      h: Number(c.bbox.h.toFixed(2)),
      children: c.childIds,
    })),
  };
}

export function scaleNode(node, sx, sy) {
  node.scaleX = sx;
  node.scaleY = sy;
  setWrapperScale(node.shapeGroup, sx, sy);
}

export function recomputeNode(root, node) {
  Object.assign(node, nodeGeometry(root, node));
}

export function nodeShapeSize(node) {
  return { w: node.shapeW, h: node.shapeH };
}
