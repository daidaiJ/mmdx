import {
  anchorForPoint,
  applyEdgeStyle,
  applyNodeColors,
  edgeEndpoints,
  edgeHitDistance,
  edgeLabelHit,
  edgePathEnds,
  edgeStyle,
  extractScene,
  formatAnchor,
  nodeColors,
  nodeLabelText,
  recomputeNode,
  refreshClusters,
  resetEdgeStyle as resetEdgeStyleScene,
  resetNodeColors,
  rerouteEdge,
  rerouteEdgesFor,
  scaleNode,
  sceneBounds,
  sceneSummary,
  setEdgeStyleValue,
  setNodeColor,
  setNodeLabel,
} from './scene.js';

const THEME_LABELS = {
  tech: '科技 · Tech',
  openai: 'OpenAI',
  excalidraw: '手绘 · Excalidraw',
  ios: 'iOS',
  acnh: '动物森友会',
  epaper: '电子纸 · E-paper',
  zed: 'Zed 暗色',
  'zed-light': 'Zed 亮色',
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const NS = 'http://www.w3.org/2000/svg';
const HANDLE_CURSOR = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
};
const HANDLE_POINTS = [
  ['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0], ['e', 1, 0.5],
  ['se', 1, 1], ['s', 0.5, 1], ['sw', 0, 1], ['w', 0, 0.5],
];

const els = {
  stage: $('#stage'),
  diagram: $('#diagram'),
  overlay: $('#overlay'),
  grid: $('#grid'),
  bg: $('#canvas-bg'),
  textLayer: $('#text-layer'),
  status: $('#save-status'),
  toast: $('#toast'),
  error: $('#error-card'),
  zoom: $('#zoom-label'),
  docName: $('#doc-name'),
  docSub: $('#doc-sub'),
  undo: $('#undo'),
  redo: $('#redo'),
  restore: $('#restore'),
  exportSvg: $('#export-svg'),
  exportPng: $('#export-png'),
  pngQuality: $('#png-quality'),
  fit: $('#fit'),
  zoomIn: $('#zoom-in'),
  zoomOut: $('#zoom-out'),
  deleteSelection: $('#delete-selection'),
  clearSelection: $('#clear-selection'),
  selectionInfo: $('#selection-info'),
  factSource: $('#fact-source'),
  factTheme: $('#fact-theme'),
  factSize: $('#fact-size'),
  factSaved: $('#fact-saved'),
  saveNow: $('#save-now'),
  themeSelect: $('#theme-select'),
  themeNote: $('#theme-note'),
  themeSwatches: $('#theme-swatches'),
  fonts: $('#theme-fonts'),
  bgColor: $('#bg-color'),
  bgTransparent: $('#bg-transparent'),
  gridMode: $('#grid-mode'),
  snapGrid: $('#snap-grid'),
  themeBackdrop: $('#theme-backdrop'),
  backdropNote: $('#backdrop-note'),
  panelToggle: $('#panel-toggle'),
  inspector: $('#inspector'),
};

const state = {
  boot: null,
  root: null,
  scene: null,
  camera: { cx: 0, cy: 0, zoom: 1 },
  frameBox: null,
  selection: new Set(),
  edgeSelection: new Set(),
  drag: null,
  space: false,
  history: { undo: [], redo: [], limit: 80 },
  tx: null,
  canvas: null,
  ready: false,
  dirty: false,
  saving: false,
  saveTimer: null,
  lastSaved: null,
  editing: null,
  backdropEls: [],
  toastTimer: null,
  viewport: { w: 1, h: 1 },
  lastClick: null,
  stats: { sceneMs: 0, overlayMs: 0 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clone = (v) => JSON.parse(JSON.stringify(v));

function setStatus(text, kind = '') {
  els.status.textContent = text;
  els.status.dataset.state = kind;
}

function toast(text, ms = 2400) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { els.toast.hidden = true; }, ms);
}

function showError(text) {
  els.error.hidden = false;
  els.error.textContent = text;
}

function cssColorToHex(color) {
  if (!color || color === 'transparent') return '#ffffff';
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return '#' + color.slice(1).split('').map((c) => c + c).join('');
  }
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = color;
    const resolved = ctx.fillStyle;
    if (/^#[0-9a-f]{6}$/i.test(resolved)) return resolved;
    if (/^rgba?\(/i.test(resolved)) {
      const nums = resolved.match(/[\d.]+/g).map(Number);
      if (nums.length >= 3) {
        return '#' + nums.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
      }
    }
  } catch { /* keep default */ }
  return '#ffffff';
}

function populateThemes(themes) {
  if (!els.themeSelect || !themes?.length) return;
  els.themeSelect.replaceChildren(...themes.map((theme) => {
    const option = document.createElement('option');
    option.value = theme.preset;
    option.textContent = THEME_LABELS[theme.preset] ?? theme.preset;
    return option;
  }));
}

async function loadThemeFonts(name, families) {
  const link = els.fonts;
  if (!link) {
    await waitForFonts(families);
    return;
  }
  const href = `/fonts.css?theme=${encodeURIComponent(name)}&v=${Date.now()}`;
  await new Promise((resolve, reject) => {
    const done = () => { link.removeEventListener('load', done); link.removeEventListener('error', fail); resolve(); };
    const fail = () => { link.removeEventListener('load', done); link.removeEventListener('error', fail); reject(new Error('主题字体加载失败')); };
    link.addEventListener('load', done);
    link.addEventListener('error', fail);
    link.href = href;
  });
  await waitForFonts(families);
}

async function waitForFonts(families) {
  const load = (document.fonts?.load ? Promise.all(
    (families ?? []).map((family) => document.fonts.load(`500 15px "${family}"`, '中文English 0123').catch(() => {})),
  ) : Promise.resolve());
  await Promise.race([load, new Promise((r) => setTimeout(r, 2500))]);
  await Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
}

function readViewBox(root) {
  const raw = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (raw.length === 4 && raw.every(Number.isFinite) && raw[2] > 0 && raw[3] > 0) {
    return { x: raw[0], y: raw[1], w: raw[2], h: raw[3] };
  }
  const w = Number(root.getAttribute('width')) || 1000;
  const h = Number(root.getAttribute('height')) || 700;
  return { x: 0, y: 0, w, h };
}

function applyTheme(theme) {
  document.documentElement.dataset.dark = String(!!theme.dark);
  const style = document.documentElement.style;
  const v = theme.vars ?? {};
  if (v.accent) style.setProperty('--chrome-accent', v.accent);
  if (v.bg) style.setProperty('--chrome-bg', v.bg);
  if (v.fg) style.setProperty('--chrome-fg', v.fg);
  if (v.muted) style.setProperty('--chrome-muted', v.muted);
  if (v.border) style.setProperty('--chrome-line', v.border);
  if (v.surface) style.setProperty('--chrome-panel', v.surface);
  if (v.fg) style.setProperty('--select', theme.dark ? '#4aa3ff' : '#0a84ff');
  const preset = theme.preset ?? theme.name;
  if (els.themeSelect && els.themeSelect.value !== preset) els.themeSelect.value = preset;
  if (els.themeNote) {
    const families = theme.fonts?.length ? theme.fonts.join(' / ') : 'Noto Sans SC';
    els.themeNote.textContent = `字体 ${families}；图形主体配色随模板切换。`;
  }
  if (els.themeSwatches) {
    const series = (theme.vars?.series ?? []).slice(0, 8);
    els.themeSwatches.replaceChildren(...series.map((color) => {
      const swatch = document.createElement('i');
      swatch.style.background = color;
      swatch.title = color;
      return swatch;
    }));
  }
  els.factTheme.textContent = `${theme.name}${state.boot?.render?.tone ? ` · ${state.boot.render.tone}` : ''}`;
}

function prepareRoot(root) {
  root.setAttribute('id', 'diagram');
  root.setAttribute('width', '100%');
  root.setAttribute('height', '100%');
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  root.style.pointerEvents = 'none';
  root.style.backgroundColor = 'transparent';
  root.style.maxWidth = 'none';
  root.style.overflow = 'hidden';
}

async function setDiagram(svg, opts = {}) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('无法解析工作区 SVG');
  const imported = document.importNode(doc.documentElement, true);
  prepareRoot(imported);
  const current = $('#diagram');
  current.replaceWith(imported);
  els.diagram = imported;
  state.root = imported;
  state.frameBox = readViewBox(imported);
  state.selection.clear();
  state.edgeSelection.clear();
  state.backdropEls = [];
  reloadScene();
  if (opts.fit) fitAll(false);
  else applyCamera();
  applyCanvas();
}

function markBackdrop() {
  state.backdropEls = [];
  const root = state.root;
  if (!root) return;
  const group = root.querySelector('.mmdx-backdrop');
  if (!group) return;
  let base = group.previousElementSibling;
  while (base && base.tagName.toLowerCase() !== 'rect') base = base.previousElementSibling;
  if (base) state.backdropEls.push(base);
  state.backdropEls.push(group);
}

function reloadScene() {
  const t0 = performance.now();
  state.scene = extractScene(state.root, state.boot?.edges ?? [], state.boot?.subgraphs ?? []);
  state.stats.sceneMs = +(performance.now() - t0).toFixed(2);
  markBackdrop();
  const ids = new Set(state.scene.nodes.map((n) => n.id));
  for (const id of Array.from(state.selection)) if (!ids.has(id)) state.selection.delete(id);
  const edgeIds = new Set(state.scene.edges.map((e) => e.id));
  for (const id of Array.from(state.edgeSelection)) if (!edgeIds.has(id)) state.edgeSelection.delete(id);
}

function stageSize() {
  return {
    w: Math.max(1, els.stage.clientWidth),
    h: Math.max(1, els.stage.clientHeight),
  };
}

function cameraBox() {
  const { w, h } = stageSize();
  const z = state.camera.zoom;
  return {
    x: state.camera.cx - w / (2 * z),
    y: state.camera.cy - h / (2 * z),
    w: w / z,
    h: h / z,
  };
}

function applyCamera() {
  if (!state.ready && !state.root) return;
  const box = cameraBox();
  const vb = `${box.x} ${box.y} ${box.w} ${box.h}`;
  state.viewport = { w: stageSize().w, h: stageSize().h };
  for (const el of [state.root, els.overlay, els.grid]) {
    if (el) el.setAttribute('viewBox', vb);
  }
  els.zoom.textContent = `${Math.round(state.camera.zoom * 100)}%`;
  renderOverlay();
}

function fitAll(show = true) {
  if (!state.scene) return;
  const bounds = sceneBounds(state.scene) ?? state.frameBox;
  if (!bounds) return;
  const { w, h } = stageSize();
  const zoom = clamp(Math.min((w - 96) / bounds.w, (h - 96) / bounds.h), 0.02, 6);
  state.camera = {
    cx: bounds.x + bounds.w / 2,
    cy: bounds.y + bounds.h / 2,
    zoom,
  };
  applyCamera();
  if (show) toast('已适应画布');
}

function screenToWorld(clientX, clientY) {
  const rect = els.stage.getBoundingClientRect();
  const box = cameraBox();
  return {
    x: box.x + (clientX - rect.left) / state.camera.zoom,
    y: box.y + (clientY - rect.top) / state.camera.zoom,
  };
}

function worldToScreen(x, y) {
  const rect = els.stage.getBoundingClientRect();
  const box = cameraBox();
  return {
    x: rect.left + (x - box.x) * state.camera.zoom,
    y: rect.top + (y - box.y) * state.camera.zoom,
    localX: (x - box.x) * state.camera.zoom,
    localY: (y - box.y) * state.camera.zoom,
  };
}

function screenRect(box) {
  const p = worldToScreen(box.x, box.y);
  return {
    x: p.localX,
    y: p.localY,
    w: box.w * state.camera.zoom,
    h: box.h * state.camera.zoom,
  };
}

function zoomAt(clientX, clientY, factor) {
  const before = screenToWorld(clientX, clientY);
  const zoom = clamp(state.camera.zoom * factor, 0.02, 10);
  if (Math.abs(zoom - state.camera.zoom) < 1e-6) return;
  const rect = els.stage.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const { w, h } = stageSize();
  state.camera.zoom = zoom;
  state.camera.cx = before.x + (w / 2 - px) / zoom;
  state.camera.cy = before.y + (h / 2 - py) / zoom;
  applyCamera();
}

function panBy(dxScreen, dyScreen) {
  state.camera.cx -= dxScreen / state.camera.zoom;
  state.camera.cy -= dyScreen / state.camera.zoom;
  applyCamera();
}

/* ------------------------------------------------------------- selection -- */

function selectedNodes() {
  return state.scene?.nodes.filter((n) => state.selection.has(n.id)) ?? [];
}

function selectedEdges() {
  return state.scene?.edges.filter((e) => state.edgeSelection.has(e.id)) ?? [];
}

function hitNode(point) {
  if (!state.scene) return null;
  for (let i = state.scene.nodes.length - 1; i >= 0; i--) {
    const n = state.scene.nodes[i];
    const b = n.bbox;
    if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) return n;
  }
  return null;
}

function hitEdge(point) {
  if (!state.scene) return null;
  const tolerance = Math.max(4, 8 / state.camera.zoom);
  let best = null;
  let bestDistance = tolerance;
  for (const edge of state.scene.edges) {
    if (edgeLabelHit(edge, point, 3)) return edge;
    const b = edge.bbox;
    if (b && (point.x < b.x - tolerance || point.x > b.x + b.w + tolerance ||
      point.y < b.y - tolerance || point.y > b.y + b.h + tolerance)) continue;
    const d = edgeHitDistance(edge, point);
    if (d < bestDistance) {
      bestDistance = d;
      best = edge;
    }
  }
  return best;
}

function edgeEndpointPositions(edge) {
  const ends = edgePathEnds(state.root, edge);
  if (ends) return ends;
  return edgeEndpoints(edge);
}

function nodeLabel(id) {
  return state.scene?.nodes.find((n) => n.id === id)?.label || id || '—';
}

function groupBox(nodes) {
  if (!nodes.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const n of nodes) {
    x0 = Math.min(x0, n.bbox.x);
    y0 = Math.min(y0, n.bbox.y);
    x1 = Math.max(x1, n.bbox.x + n.bbox.w);
    y1 = Math.max(y1, n.bbox.y + n.bbox.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function renderOverlay() {
  const t0 = performance.now();
  const overlay = els.overlay;
  if (!overlay) return;
  overlay.replaceChildren();
  if (!state.scene) return;
  const z = state.camera.zoom;
  const nodes = selectedNodes();
  if (nodes.length) {
    for (const n of nodes) {
      overlay.appendChild(svgEl('rect', {
        x: n.bbox.x, y: n.bbox.y, width: n.bbox.w, height: n.bbox.h,
        rx: 2 / z, class: 'sel-outline',
      }));
    }
    const box = groupBox(nodes);
    if (nodes.length > 1) {
      overlay.appendChild(svgEl('rect', {
        x: box.x, y: box.y, width: box.w, height: box.h,
        rx: 2 / z, class: 'sel-group',
      }));
    }
    if (nodes.length === 1) {
      const size = 8 / z;
      for (const [name, fx, fy] of HANDLE_POINTS) {
        const cx = box.x + box.w * fx;
        const cy = box.y + box.h * fy;
        overlay.appendChild(svgEl('rect', {
          x: cx - size / 2, y: cy - size / 2, width: size, height: size,
          rx: 1.5 / z, class: 'sel-handle', 'data-handle': name,
          style: `cursor:${HANDLE_CURSOR[name]}`,
        }));
      }
      const label = svgEl('text', {
        x: box.x + box.w / 2,
        y: box.y - 8 / z,
        class: 'size-label',
        'font-size': 11 / z,
      });
      label.textContent = `${Math.round(box.w)} × ${Math.round(box.h)}`;
      overlay.appendChild(label);
    }
  }
  const edges = selectedEdges();
  for (const edge of edges) {
    overlay.appendChild(svgEl('path', {
      d: edge.pathEl.getAttribute('d') ?? '',
      class: 'edge-outline',
    }));
    const ends = edgeEndpointPositions(edge);
    if (!ends) continue;
    const radius = 5.5 / z;
    for (const [end, point] of [['from', ends.from], ['to', ends.to]]) {
      if (!point) continue;
      overlay.appendChild(svgEl('circle', {
        cx: point.x, cy: point.y, r: radius,
        class: `edge-endpoint ${end}`,
        'data-edge-end': end,
        'data-edge-id': edge.id,
      }));
      overlay.appendChild(svgEl('circle', {
        cx: point.x, cy: point.y, r: Math.max(9 / z, radius + 4 / z),
        class: 'edge-endpoint-hit',
        'data-edge-end': end,
        'data-edge-id': edge.id,
      }));
    }
  }
  if (state.drag?.kind === 'anchor' && state.drag.candidate) {
    const b = state.drag.candidate.bbox;
    overlay.appendChild(svgEl('rect', {
      x: b.x - 3 / z, y: b.y - 3 / z,
      width: b.w + 6 / z, height: b.h + 6 / z,
      rx: 3 / z, class: 'anchor-target',
    }));
  }
  if (state.drag?.kind === 'marquee' && state.drag.current) {
    const s = state.drag.startWorld;
    const e = state.drag.current;
    overlay.appendChild(svgEl('rect', {
      x: Math.min(s.x, e.x), y: Math.min(s.y, e.y),
      width: Math.abs(e.x - s.x), height: Math.abs(e.y - s.y),
      class: 'marquee',
    }));
  }
  state.stats.overlayMs = +(performance.now() - t0).toFixed(2);
}

function setSelection(ids, render = true) {
  state.selection = new Set(ids);
  state.edgeSelection.clear();
  if (render) {
    renderOverlay();
    updateControls();
  }
}

function setEdgeSelection(ids, render = true) {
  state.edgeSelection = new Set(ids);
  state.selection.clear();
  if (render) {
    renderOverlay();
    updateControls();
  }
}

function colorRow(node, key, label, value, custom) {
  const row = document.createElement('label');
  row.className = 'row color-row';
  const name = document.createElement('span');
  name.textContent = label;
  const input = document.createElement('input');
  input.type = 'color';
  input.value = cssColorToHex(value);
  input.title = custom ? '已覆盖主题配色' : '跟随主题';
  let editing = false;
  input.addEventListener('input', () => {
    if (!editing) {
      beginTx();
      editing = true;
    }
    setNodeColor(node, key, input.value);
    markDirty();
  });
  input.addEventListener('change', () => {
    if (state.tx?.dirty) {
      commitTx();
      updateFacts();
      scheduleSave();
    }
    editing = false;
    updateSelectionPanel();
  });
  row.append(name, input);
  return row;
}

function colorControls(node) {
  const colors = nodeColors(node);
  const wrap = document.createElement('div');
  wrap.className = 'color-controls';
  wrap.append(
    colorRow(node, 'fill', '填充', colors.fill, colors.custom.fill),
    colorRow(node, 'stroke', '描边', colors.stroke, colors.custom.stroke),
    colorRow(node, 'text', '文字', colors.text, colors.custom.text),
  );
  const actions = document.createElement('div');
  actions.className = 'color-actions';
  const reset = document.createElement('button');
  reset.className = 'btn small';
  reset.textContent = '跟随主题';
  reset.disabled = !(colors.custom.fill || colors.custom.stroke || colors.custom.text);
  reset.addEventListener('click', () => {
    beginTx();
    resetNodeColors(node);
    markDirty();
    commitTx();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
    toast('已恢复主题配色');
  });
  actions.appendChild(reset);
  wrap.appendChild(actions);
  return wrap;
}

function edgeColorRow(edges, value) {
  const row = document.createElement('label');
  row.className = 'row color-row';
  const name = document.createElement('span');
  name.textContent = '颜色';
  const input = document.createElement('input');
  input.type = 'color';
  input.value = cssColorToHex(value);
  const custom = edges.some((edge) => edgeStyle(edge).custom.stroke);
  input.title = custom ? '已覆盖主题连线色' : '跟随主题';
  let editing = false;
  input.addEventListener('input', () => {
    if (!editing) { beginTx(); editing = true; }
    for (const edge of edges) setEdgeStyleValue(edge, 'stroke', input.value);
    markDirty();
  });
  input.addEventListener('change', () => {
    if (state.tx?.dirty) { commitTx(); updateFacts(); scheduleSave(); }
    editing = false;
    updateSelectionPanel();
  });
  row.append(name, input);
  return row;
}

function edgeSelectRow(label, value, options, apply) {
  const row = document.createElement('label');
  row.className = 'row style-row';
  const name = document.createElement('span');
  name.textContent = label;
  const select = document.createElement('select');
  for (const [optionValue, text] of options) {
    const option = document.createElement('option');
    option.value = String(optionValue);
    option.textContent = text;
    select.appendChild(option);
  }
  if (!options.some(([optionValue]) => String(optionValue) === String(value))) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(value);
    select.appendChild(option);
  }
  select.value = String(value);
  select.addEventListener('change', () => {
    beginTx();
    apply(select.value);
    markDirty();
    commitTx();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
  });
  row.append(name, select);
  return row;
}

function edgeStyleControls(edges) {
  const first = edgeStyle(edges[0]);
  const wrap = document.createElement('div');
  wrap.className = 'edge-style-controls';
  const title = document.createElement('div');
  title.className = 'style-title';
  title.textContent = edges.length > 1 ? `连线样式（${edges.length} 条）` : '连线样式';
  wrap.appendChild(title);
  wrap.appendChild(edgeSelectRow(
    '走线',
    first.route,
    [['auto', '自动'], ['orthogonal', '折线'], ['straight', '直线'], ['curved', '曲线']],
    (value) => { for (const edge of edges) setEdgeStyleValue(edge, 'route', value); },
  ));
  wrap.appendChild(edgeColorRow(edges, first.stroke));

  const widths = [...new Set([1, 1.5, 2, 3, 4, first.width])]
    .filter((width) => Number.isFinite(width))
    .sort((a, b) => a - b);
  wrap.appendChild(edgeSelectRow(
    '粗细',
    first.width,
    widths.map((width) => [width, `${width} px`]),
    (value) => { for (const edge of edges) setEdgeStyleValue(edge, 'width', Number(value)); },
  ));
  wrap.appendChild(edgeSelectRow(
    '线型',
    first.dash,
    [['solid', '实线'], ['dashed', '虚线'], ['dotted', '点线']],
    (value) => { for (const edge of edges) setEdgeStyleValue(edge, 'dash', value); },
  ));
  wrap.appendChild(edgeSelectRow(
    '箭头',
    first.arrow,
    [['filled', '实心箭头'], ['open', '空心箭头'], ['none', '无箭头']],
    (value) => { for (const edge of edges) setEdgeStyleValue(edge, 'arrow', value); },
  ));

  const custom = edges.some((edge) => {
    const style = edgeStyle(edge);
    return style.custom.route || style.custom.stroke || style.custom.width ||
      style.custom.dash || style.custom.arrow;
  });
  const actions = document.createElement('div');
  actions.className = 'color-actions';
  const reset = document.createElement('button');
  reset.className = 'btn small';
  reset.textContent = '跟随主题';
  reset.disabled = !custom;
  reset.addEventListener('click', () => {
    beginTx();
    for (const edge of edges) resetEdgeStyleScene(edge);
    markDirty();
    commitTx();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
    toast('已恢复主题连线样式');
  });
  actions.appendChild(reset);
  wrap.appendChild(actions);
  return wrap;
}

function updateSelectionPanel() {
  const nodes = selectedNodes();
  const edges = selectedEdges();
  const card = els.selectionInfo;
  card.replaceChildren();
  if (edges.length && !nodes.length) {
    if (edges.length === 1) {
      const edge = edges[0];
      const strong = document.createElement('strong');
      strong.textContent = edge.label?.el.textContent.trim() || '连线';
      const code = document.createElement('code');
      code.textContent = edge.id;
      const route = document.createElement('div');
      route.className = 'muted';
      route.textContent = `${nodeLabel(edge.from)} → ${nodeLabel(edge.to)}`;
      const hint = document.createElement('div');
      hint.className = 'muted';
      hint.textContent = '拖动两端圆点改锚点或重连节点';
      card.append(strong, code, route, hint, edgeStyleControls(edges));
    } else {
      const strong = document.createElement('strong');
      strong.textContent = `已选 ${edges.length} 条连线`;
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = 'Delete 删除；点选单条可拖锚点';
      card.append(strong, span, edgeStyleControls(edges));
    }
    return;
  }
  if (!nodes.length) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = '未选择对象';
    card.appendChild(span);
  } else if (nodes.length === 1) {
    const n = nodes[0];
    const strong = document.createElement('strong');
    strong.textContent = n.label || n.id;
    const code = document.createElement('code');
    code.textContent = n.id;
    const dims = document.createElement('div');
    dims.className = 'muted';
    dims.textContent = `${Math.round(n.shapeW)} × ${Math.round(n.shapeH)} px`;
    card.append(strong, code, dims, colorControls(n));
  } else {
    const strong = document.createElement('strong');
    strong.textContent = `已选 ${nodes.length} 个节点`;
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = '拖拽移动；Delete 删除';
    card.append(strong, span);
  }
}

function updateControls() {
  const selected = state.selection.size + state.edgeSelection.size;
  els.undo.disabled = !state.history.undo.length;
  els.redo.disabled = !state.history.redo.length;
  els.deleteSelection.disabled = !selected;
  els.clearSelection.disabled = !selected;
  updateSelectionPanel();
}

function updateFacts() {
  if (!state.boot) return;
  els.factSource.textContent = `${state.boot.project.source}#${state.boot.project.index}`;
  const bounds = state.scene ? sceneBounds(state.scene) : null;
  els.factSize.textContent = bounds ? `${Math.round(bounds.w)} × ${Math.round(bounds.h)}` : '—';
  els.factSaved.textContent = state.lastSaved
    ? state.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
}

/* --------------------------------------------------------------- history -- */

function snapshotState() {
  return {
    svg: state.root.innerHTML,
    canvas: clone(state.canvas),
    frameBox: { ...state.frameBox },
  };
}

function beginTx() {
  if (!state.tx) state.tx = { state: snapshotState(), dirty: false };
}

function markDirty() {
  if (state.tx) state.tx.dirty = true;
}

function commitTx() {
  const tx = state.tx;
  state.tx = null;
  if (!tx?.dirty) {
    updateControls();
    return;
  }
  state.history.undo.push(tx.state);
  if (state.history.undo.length > state.history.limit) state.history.undo.shift();
  state.history.redo.length = 0;
  updateControls();
  updateFacts();
  scheduleSave();
}

function applySnapshot(snap) {
  state.canvas = clone(snap.canvas);
  state.frameBox = { ...snap.frameBox };
  state.root.innerHTML = snap.svg;
  reloadScene();
  applyCanvas();
  renderOverlay();
  updateControls();
  updateFacts();
}

function undo() {
  if (!state.history.undo.length) return;
  const current = snapshotState();
  const snap = state.history.undo.pop();
  state.history.redo.push(current);
  applySnapshot(snap);
  scheduleSave();
  toast('已撤销');
}

function redo() {
  if (!state.history.redo.length) return;
  const current = snapshotState();
  const snap = state.history.redo.pop();
  state.history.undo.push(current);
  applySnapshot(snap);
  scheduleSave();
  toast('已重做');
}

/* ------------------------------------------------------------------ canvas */

function hasBackdrop() {
  return !!state.boot?.theme?.hasBackdrop && state.backdropEls.length > 0;
}

function applyCanvas() {
  if (!state.canvas) return;
  const bg = state.canvas.background;
  const transparent = bg === 'transparent';
  document.documentElement.dataset.transparent = String(transparent);
  document.documentElement.style.setProperty('--canvas-bg', transparent ? 'transparent' : bg);
  els.bg.style.background = transparent ? 'transparent' : bg;

  if (transparent) {
    if (state.canvas.backdrop) state.canvas.backdrop = false;
  }
  els.bgTransparent.checked = transparent;
  els.bgColor.value = cssColorToHex(transparent ? (state.boot?.theme?.background ?? '#ffffff') : bg);
  els.bgColor.disabled = transparent;
  els.gridMode.value = state.canvas.grid;
  els.snapGrid.checked = state.canvas.snap;
  els.themeBackdrop.checked = !!state.canvas.backdrop;
  const canBackdrop = hasBackdrop() && !transparent;
  els.themeBackdrop.disabled = !canBackdrop;
  els.backdropNote.textContent = !hasBackdrop()
    ? '当前主题没有主题底纹；背景色直接显示。'
    : transparent
      ? '透明背景会关闭主题底纹，导出才会保留 alpha。'
      : '主题底纹是 SVG 内的纸张/点阵/雾层，关闭后使用背景色。';
  for (const el of state.backdropEls) {
    el.style.display = state.canvas.backdrop ? '' : 'none';
  }
  applyGrid();
  updateFacts();
}

function gridColor() {
  return state.boot?.theme?.dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,24,32,0.075)';
}

function applyGrid() {
  const mode = state.canvas?.grid ?? 'none';
  els.grid.style.display = mode === 'none' ? 'none' : '';
  if (mode === 'none') {
    els.grid.replaceChildren();
    return;
  }
  const gap = 24;
  const defs = svgEl('defs');
  const pattern = svgEl('pattern', {
    id: 'mmdx-grid-pattern',
    patternUnits: 'userSpaceOnUse',
    width: gap,
    height: gap,
  });
  if (mode === 'lines') {
    pattern.appendChild(svgEl('path', {
      d: `M0 0H${gap}M0 0V${gap}`,
      fill: 'none',
      stroke: gridColor(),
      'stroke-width': 1,
    }));
  } else {
    pattern.appendChild(svgEl('circle', {
      cx: gap / 2, cy: gap / 2, r: 1.15, fill: gridColor(),
    }));
  }
  defs.appendChild(pattern);
  const rect = svgEl('rect', {
    x: -200000, y: -200000, width: 400000, height: 400000,
    fill: 'url(#mmdx-grid-pattern)',
  });
  els.grid.replaceChildren(defs, rect);
  const box = cameraBox();
  els.grid.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
}

/* ------------------------------------------------------------------- save -- */

function ensureFrame(bounds) {
  if (!bounds) return state.frameBox;
  if (!state.frameBox) return { ...bounds };
  const pad = 20;
  const f = state.frameBox;
  let x0 = f.x;
  let y0 = f.y;
  let x1 = f.x + f.w;
  let y1 = f.y + f.h;
  let changed = false;
  if (bounds.x < x0) { x0 = bounds.x - pad; changed = true; }
  if (bounds.y < y0) { y0 = bounds.y - pad; changed = true; }
  if (bounds.x + bounds.w > x1) { x1 = bounds.x + bounds.w + pad; changed = true; }
  if (bounds.y + bounds.h > y1) { y1 = bounds.y + bounds.h + pad; changed = true; }
  if (changed) state.frameBox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  return state.frameBox;
}

function exportBox() {
  const content = sceneBounds(state.scene);
  const withBackdrop = state.canvas?.backdrop && hasBackdrop();
  if (withBackdrop) return ensureFrame(content);
  if (!content) return state.frameBox;
  const pad = 24;
  return {
    x: content.x - pad, y: content.y - pad,
    w: content.w + pad * 2, h: content.h + pad * 2,
  };
}

function cleanClone(box, transparent, includeBackground, includeGrid, hideBackdrop = false) {
  const cloneRoot = state.root.cloneNode(true);
  cloneRoot.setAttribute('xmlns', NS);
  cloneRoot.setAttribute('width', String(Math.ceil(box.w)));
  cloneRoot.setAttribute('height', String(Math.ceil(box.h)));
  cloneRoot.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
  cloneRoot.style.pointerEvents = '';
  cloneRoot.style.maxWidth = 'none';
  cloneRoot.style.overflow = 'hidden';
  cloneRoot.style.backgroundColor = 'transparent';

  // theme backdrop visibility
  const group = cloneRoot.querySelector('.mmdx-backdrop');
  if (group && (!state.canvas?.backdrop || hideBackdrop)) {
    let base = group.previousElementSibling;
    while (base && base.tagName.toLowerCase() !== 'rect') base = base.previousElementSibling;
    if (base) base.style.display = 'none';
    group.style.display = 'none';
  }

  if (includeBackground && !transparent) {
    const rect = svgEl('rect', {
      x: box.x, y: box.y, width: box.w, height: box.h,
      fill: state.canvas.background,
      'data-mmdx-export-bg': '1',
    });
    cloneRoot.insertBefore(rect, cloneRoot.firstChild);
  }
  if (includeGrid && state.canvas.grid !== 'none') {
    const gap = 24;
    let defsEl = cloneRoot.querySelector('defs');
    if (!defsEl) {
      defsEl = svgEl('defs');
      cloneRoot.insertBefore(defsEl, cloneRoot.firstChild);
    }
    const pattern = svgEl('pattern', {
      id: 'mmdx-export-grid', patternUnits: 'userSpaceOnUse', width: gap, height: gap,
    });
    if (state.canvas.grid === 'lines') {
      pattern.appendChild(svgEl('path', {
        d: `M0 0H${gap}M0 0V${gap}`, fill: 'none',
        stroke: gridColor(), 'stroke-width': 1,
      }));
    } else {
      pattern.appendChild(svgEl('circle', {
        cx: gap / 2, cy: gap / 2, r: 1.15, fill: gridColor(),
      }));
    }
    defsEl.appendChild(pattern);
    const gridRect = svgEl('rect', {
      x: box.x, y: box.y, width: box.w, height: box.h,
      fill: 'url(#mmdx-export-grid)', 'data-mmdx-export-grid': '1',
    });
    const content = cloneRoot.querySelector('.pele-clusters, .pele-edges, .pele-edge-labels, .pele-nodes');
    if (content) cloneRoot.insertBefore(gridRect, content);
    else cloneRoot.appendChild(gridRect);
  }
  return cloneRoot;
}

function serializeRoot(root) {
  return new XMLSerializer().serializeToString(root);
}

function workingSvg() {
  const bounds = sceneBounds(state.scene);
  ensureFrame(bounds);
  const box = state.frameBox;
  const root = cleanClone(box, true, false, false, false);
  return serializeRoot(root);
}

function exportSvgString(transparent = false) {
  const box = exportBox();
  const root = cleanClone(box, transparent, true, true, transparent);
  return serializeRoot(root);
}

function scheduleSave() {
  state.dirty = true;
  setStatus('未保存', 'dirty');
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => { void saveNow(); }, 650);
}

async function saveNow(showToast = false) {
  if (!state.ready && !state.boot) return;
  if (state.saving) {
    state.saveQueued = state.saveQueued === true || showToast;
    return;
  }
  clearTimeout(state.saveTimer);
  state.saving = true;
  setStatus('保存中…', 'saving');
  try {
    const payload = {
      svg: workingSvg(),
      scene: sceneSummary(state.scene, state.canvas),
      canvas: state.canvas,
    };
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    state.dirty = false;
    state.lastSaved = new Date();
    setStatus('已保存', '');
    els.factSaved.textContent = state.lastSaved.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    if (showToast) toast('已保存到工程目录');
  } catch (e) {
    setStatus('保存失败', 'error');
    if (showToast) toast(`保存失败：${e.message}`, 4200);
    console.error(e);
  } finally {
    state.saving = false;
    const queued = state.saveQueued ?? null;
    state.saveQueued = null;
    if (queued !== null) void saveNow(queued === true);
  }
}

async function postDraftScene() {
  try {
    await fetch('/api/draft-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene: sceneSummary(state.scene, state.canvas), canvas: state.canvas }),
    });
  } catch { /* best effort */ }
}

/* --------------------------------------------------------------- template -- */

function captureScenePatch() {
  return {
    nodeIds: state.scene.nodes.map((n) => n.id),
    edgeIds: state.scene.edges.map((e) => e.id),
    nodes: state.scene.nodes.map((n) => ({
      id: n.id,
      label: nodeLabelText(n),
      center: { ...n.center },
      scaleX: n.scaleX,
      scaleY: n.scaleY,
      colors: { ...(n.colors ?? {}) },
    })),
    edges: state.scene.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      fromAnchor: e.fromAnchor,
      toAnchor: e.toAnchor,
      attrs: {
        from: e.el.getAttribute('data-mmdx-from'),
        to: e.el.getAttribute('data-mmdx-to'),
        fromAnchor: e.el.getAttribute('data-mmdx-from-anchor'),
        toAnchor: e.el.getAttribute('data-mmdx-to-anchor'),
      },
      style: { ...(e.style ?? {}) },
    })),
  };
}

function applyScenePatch(patch) {
  const keepNodes = new Set(patch.nodeIds);
  const keepEdges = new Set(patch.edgeIds);
  for (const node of state.scene.nodes) {
    if (!keepNodes.has(node.id)) node.el.remove();
  }
  for (const edge of state.scene.edges) {
    // Cluster / composite-state transitions can bind to an id that is not a
    // .pele-node, so endpoint presence is not a delete signal. The old edge-id
    // set already reflects every edge the human removed.
    if (!keepEdges.has(edge.id)) {
      edge.el.remove();
      edge.label?.el.remove();
    }
  }
  reloadScene();

  const before = new Map(state.scene.nodes.map((n) => [n.id, {
    center: { ...n.center },
    scaleX: n.scaleX,
    scaleY: n.scaleY,
  }]));
  const moved = new Set();
  for (const saved of patch.nodes) {
    const node = state.scene.nodes.find((n) => n.id === saved.id);
    if (!node) continue;
    node.el.setAttribute('transform', `translate(${saved.center.x.toFixed(2)} ${saved.center.y.toFixed(2)})`);
    scaleNode(node, saved.scaleX, saved.scaleY);
    recomputeNode(state.root, node);
    if (saved.label && nodeLabelText(node) !== saved.label) {
      setNodeLabel(state.root, node, saved.label);
    }
    if (saved.colors?.fill || saved.colors?.stroke || saved.colors?.text) {
      applyNodeColors(node, saved.colors);
    }
    recomputeNode(state.root, node);
    const initial = before.get(node.id);
    if (initial && (Math.abs(initial.center.x - node.center.x) > 0.01 ||
      Math.abs(initial.center.y - node.center.y) > 0.01 ||
      Math.abs(initial.scaleX - node.scaleX) > 1e-4 ||
      Math.abs(initial.scaleY - node.scaleY) > 1e-4)) {
      moved.add(node.id);
    }
  }

  const nodeMap = new Map(state.scene.nodes.map((n) => [n.id, n]));
  for (const saved of patch.edges) {
    const edge = state.scene.edges.find((e) => e.id === saved.id);
    if (!edge) continue;
    let changed = false;
    if (saved.attrs.from && saved.attrs.from !== edge.from) {
      edge.el.setAttribute('data-mmdx-from', saved.attrs.from);
      edge.from = saved.attrs.from;
      edge.fromNode = nodeMap.get(saved.from) ?? null;
      changed = true;
    }
    if (saved.attrs.to && saved.attrs.to !== edge.to) {
      edge.el.setAttribute('data-mmdx-to', saved.attrs.to);
      edge.to = saved.attrs.to;
      edge.toNode = nodeMap.get(saved.to) ?? null;
      changed = true;
    }
    if (saved.attrs.fromAnchor) {
      edge.el.setAttribute('data-mmdx-from-anchor', saved.attrs.fromAnchor);
      edge.fromAnchor = saved.fromAnchor;
      changed = true;
    }
    if (saved.attrs.toAnchor) {
      edge.el.setAttribute('data-mmdx-to-anchor', saved.attrs.toAnchor);
      edge.toAnchor = saved.toAnchor;
      changed = true;
    }
    if (changed || edge.fromAnchor || edge.toAnchor) rerouteEdge(edge);
    if (saved.style && (saved.style.route || saved.style.stroke || saved.style.width != null ||
      saved.style.dash || saved.style.arrow)) {
      applyEdgeStyle(edge, saved.style);
    }
  }
  rerouteEdgesFor([...moved].map((id) => nodeMap.get(id)).filter(Boolean), state.scene.edges);
  state.selection.clear();
  state.edgeSelection.clear();
  refreshClusters(state.scene);
}

async function switchTheme(name) {
  if (!state.boot || !name || name === (state.boot.theme.preset ?? state.boot.theme.name)) return;
  const select = els.themeSelect;
  if (select.disabled) return;
  if (state.editing) finishTextEdit();
  clearTimeout(state.saveTimer);
  select.disabled = true;
  const saveWait = Date.now();
  while (state.saving && Date.now() - saveWait < 3000) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const oldTheme = state.boot.theme;
  const oldCanvas = { ...state.canvas };
  const oldRender = { ...state.boot.render };
  const oldFonts = state.boot.fonts;
  const oldResumed = state.boot.resumed;
  const oldDirty = state.dirty;
  const oldSvg = workingSvg();
  const patch = captureScenePatch();
  setStatus('切换模板…', 'saving');
  try {
    const res = await fetch('/api/theme/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: name }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    const data = await res.json();
    await loadThemeFonts(name, data.fonts);

    const nextCanvas = { ...oldCanvas };
    if (nextCanvas.background.toLowerCase() === String(oldTheme.background).toLowerCase()) {
      nextCanvas.background = data.theme.background;
    }
    if (nextCanvas.backdrop === !!oldTheme.hasBackdrop) {
      nextCanvas.backdrop = !!data.theme.hasBackdrop;
    }
    if (nextCanvas.background === 'transparent') nextCanvas.backdrop = false;

    state.canvas = nextCanvas;
    state.boot.theme = data.theme;
    state.boot.fonts = data.fonts;
    state.boot.render = { ...state.boot.render, theme: name };
    state.boot.resumed = true;
    applyTheme(data.theme);
    docMeta();
    await setDiagram(data.svg, { fit: false });
    applyScenePatch(patch);
    ensureFrame(sceneBounds(state.scene));
    applyCamera();
    applyCanvas();
    updateControls();
    updateFacts();
    renderOverlay();

    const commit = await fetch('/api/theme/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: name,
        svg: workingSvg(),
        scene: sceneSummary(state.scene, state.canvas),
        canvas: state.canvas,
      }),
    });
    if (!commit.ok) throw new Error((await commit.json().catch(() => ({}))).error ?? `HTTP ${commit.status}`);
    clearTimeout(state.saveTimer);
    state.history.undo.length = 0;
    state.history.redo.length = 0;
    state.dirty = false;
    state.lastSaved = new Date();
    setStatus('已保存');
    updateControls();
    updateFacts();
    toast(`已切换模板：${THEME_LABELS[name] ?? name}`);
  } catch (e) {
    state.boot.theme = oldTheme;
    state.boot.render = oldRender;
    state.boot.fonts = oldFonts;
    state.boot.resumed = oldResumed;
    state.canvas = oldCanvas;
    try {
      await loadThemeFonts(oldTheme.preset ?? oldTheme.name, oldFonts);
      applyTheme(oldTheme);
      docMeta();
      await setDiagram(oldSvg, { fit: false });
      applyCanvas();
      updateControls();
      updateFacts();
    } catch { /* keep the preview if the old root cannot be restored */ }
    state.dirty = oldDirty;
    select.value = oldTheme.preset ?? oldTheme.name;
    setStatus(oldDirty ? '未保存' : '切换失败', oldDirty ? 'dirty' : 'error');
    toast(`模板切换失败：${e.message}`, 4800);
  } finally {
    select.disabled = false;
  }
}

/* -------------------------------------------------------------- transform -- */

function transactionMove(nodes, dx, dy) {
  for (const d of nodes) {
    const n = d.node;
    n.center = { x: d.center.x + dx, y: d.center.y + dy };
    n.bbox = { ...d.bbox, x: d.bbox.x + dx, y: d.bbox.y + dy };
    n.el.setAttribute('transform', `translate(${n.center.x.toFixed(2)} ${n.center.y.toFixed(2)})`);
  }
}

function resizeDrag(drag, world, event) {
  const box = { ...drag.initialBox };
  const dx = world.x - drag.start.x;
  const dy = world.y - drag.start.y;
  const h = drag.handle;
  if (h.includes('w')) box.x += dx;
  if (h.includes('e')) box.w += dx;
  if (h.includes('n')) box.y += dy;
  if (h.includes('s')) box.h += dy;
  if (state.canvas.snap) {
    if (h.includes('w')) { const right = box.x + box.w; box.x = Math.round(box.x / 8) * 8; box.w = right - box.x; }
    if (h.includes('e')) box.w = Math.round(box.w / 8) * 8;
    if (h.includes('n')) { const bottom = box.y + box.h; box.y = Math.round(box.y / 8) * 8; box.h = bottom - box.y; }
    if (h.includes('s')) box.h = Math.round(box.h / 8) * 8;
  }
  box.w = Math.max(20, box.w);
  box.h = Math.max(16, box.h);
  if (event.shiftKey && h.length === 2) {
    const ratio = drag.initialBox.w / drag.initialBox.h;
    if (box.w / box.h > ratio) {
      const nh = box.w / ratio;
      if (h.includes('n')) box.y += box.h - nh;
      box.h = nh;
    } else {
      const nw = box.h * ratio;
      if (h.includes('w')) box.x += box.w - nw;
      box.w = nw;
    }
  }
  const n = drag.node;
  const sx = box.w / n.baseW;
  const sy = box.h / n.baseH;
  n.scaleX = sx;
  n.scaleY = sy;
  n.shapeGroup.setAttribute('transform', `scale(${sx.toFixed(4)} ${sy.toFixed(4)})`);
  n.el.setAttribute('transform', `translate(${(box.x + box.w / 2).toFixed(2)} ${(box.y + box.h / 2).toFixed(2)})`);
  recomputeNode(state.root, n);
  refreshClusters(state.scene);
  rerouteEdgesFor([n], state.scene.edges);
  renderOverlay();
  updateSelectionPanel();
  markDirty();
}

/* ------------------------------------------------------------- edge anchors */

function sameAnchor(a, b) {
  if (!a && !b) return true;
  return !!a && !!b && a.side === b.side && Math.abs(a.t - b.t) < 1e-4;
}

function snapAnchor(anchor) {
  if (!state.canvas?.snap) return anchor;
  let t = anchor.t;
  for (const candidate of [0.5, 0.25, 0.75, 0, 1]) {
    if (Math.abs(t - candidate) < 0.035) { t = candidate; break; }
  }
  return { ...anchor, t };
}

function distanceToBox(point, box) {
  const dx = point.x < box.x ? box.x - point.x : point.x > box.x + box.w ? point.x - (box.x + box.w) : 0;
  const dy = point.y < box.y ? box.y - point.y : point.y > box.y + box.h ? point.y - (box.y + box.h) : 0;
  return Math.hypot(dx, dy);
}

function nearestAnchorNode(point) {
  const maxDistance = Math.max(12, 30 / state.camera.zoom);
  let best = null;
  let bestDistance = maxDistance;
  for (const node of state.scene.nodes) {
    const d = distanceToBox(point, node.bbox);
    if (d < bestDistance) {
      bestDistance = d;
      best = node;
    }
  }
  return best;
}

function captureEdgeBinding(edge) {
  const attrs = {};
  for (const key of ['data-mmdx-from', 'data-mmdx-to', 'data-mmdx-from-anchor', 'data-mmdx-to-anchor']) {
    attrs[key] = edge.el.getAttribute(key);
  }
  return {
    from: edge.from,
    to: edge.to,
    fromNode: edge.fromNode,
    toNode: edge.toNode,
    fromAnchor: edge.fromAnchor,
    toAnchor: edge.toAnchor,
    attrs,
    pathD: edge.pathEl.getAttribute('d'),
    markerD: edge.markerEl?.getAttribute('d') ?? null,
    labelTransform: edge.label?.el.getAttribute('transform') ?? null,
    labelOffset: edge.label ? { ...edge.label.offset } : null,
    route: edge.route ? edge.route.map((p) => ({ ...p })) : null,
    samples: edge.samples ? edge.samples.map((p) => ({ ...p })) : null,
    bbox: edge.bbox ? { ...edge.bbox } : null,
  };
}

function restoreEdgeBinding(edge, snapshot) {
  edge.from = snapshot.from;
  edge.to = snapshot.to;
  edge.fromNode = snapshot.fromNode;
  edge.toNode = snapshot.toNode;
  edge.fromAnchor = snapshot.fromAnchor;
  edge.toAnchor = snapshot.toAnchor;
  for (const [key, value] of Object.entries(snapshot.attrs)) {
    if (value === null) edge.el.removeAttribute(key);
    else edge.el.setAttribute(key, value);
  }
  if (snapshot.pathD === null) edge.pathEl.removeAttribute('d');
  else edge.pathEl.setAttribute('d', snapshot.pathD);
  if (edge.markerEl) {
    if (snapshot.markerD === null) edge.markerEl.removeAttribute('d');
    else edge.markerEl.setAttribute('d', snapshot.markerD);
  }
  if (edge.label) {
    if (snapshot.labelTransform === null) edge.label.el.removeAttribute('transform');
    else edge.label.el.setAttribute('transform', snapshot.labelTransform);
    if (snapshot.labelOffset) edge.label.offset = { ...snapshot.labelOffset };
  }
  edge.route = snapshot.route;
  edge.samples = snapshot.samples;
  edge.bbox = snapshot.bbox;
}

function bindingIsOriginal(edge, snapshot) {
  return edge.from === snapshot.from && edge.to === snapshot.to &&
    sameAnchor(edge.fromAnchor, snapshot.fromAnchor) &&
    sameAnchor(edge.toAnchor, snapshot.toAnchor);
}

function setEdgeEndpoint(edge, end, node, anchor) {
  edge[end] = node.id;
  edge[`${end}Node`] = node;
  edge[`${end}Anchor`] = anchor;
  edge.el.setAttribute(`data-mmdx-${end}`, node.id);
  edge.el.setAttribute(`data-mmdx-${end}-anchor`, formatAnchor(anchor));
}

function startAnchorDrag(e, edge, end) {
  beginTx();
  state.drag = {
    kind: 'anchor',
    edge,
    end,
    pointer: { x: e.clientX, y: e.clientY },
    startWorld: screenToWorld(e.clientX, e.clientY),
    original: captureEdgeBinding(edge),
    candidate: null,
    changed: false,
    moved: false,
  };
  els.stage.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function updateAnchorDrag(drag, world) {
  const dx = (world.x - drag.startWorld.x) * state.camera.zoom;
  const dy = (world.y - drag.startWorld.y) * state.camera.zoom;
  if (!drag.moved && Math.hypot(dx, dy) < 2) return;
  drag.moved = true;
  const node = nearestAnchorNode(world);
  if (!node) {
    drag.candidate = null;
    renderOverlay();
    return;
  }
  const anchor = snapAnchor(anchorForPoint(node, world));
  drag.candidate = node;
  if (node.id === drag.edge[drag.end] && sameAnchor(anchor, drag.edge[`${drag.end}Anchor`])) {
    renderOverlay();
    return;
  }
  setEdgeEndpoint(drag.edge, drag.end, node, anchor);
  rerouteEdge(drag.edge);
  drag.changed = true;
  markDirty();
  renderOverlay();
  updateSelectionPanel();
}

function finishAnchorDrag(event) {
  const drag = state.drag;
  if (!drag || drag.kind !== 'anchor') return;
  state.drag = null;
  if (event.type === 'pointercancel' || !drag.moved || !drag.candidate) {
    restoreEdgeBinding(drag.edge, drag.original);
    state.tx = null;
    renderOverlay();
  } else if (bindingIsOriginal(drag.edge, drag.original)) {
    state.tx = null;
    renderOverlay();
  } else {
    commitTx();
    updateFacts();
    scheduleSave();
    toast(drag.end === 'from' ? '起点锚点已更新' : '终点锚点已更新');
  }
  els.stage.classList.remove('panning');
  if (els.stage.hasPointerCapture?.(event.pointerId)) els.stage.releasePointerCapture(event.pointerId);
  updateSelectionPanel();
}

/* ------------------------------------------------------------------ events */

function onPointerDown(e) {
  if (!state.ready || e.button === 2) return;
  if (state.editing) return;
  if (e.button === 1 || (e.button === 0 && state.space)) {
    e.preventDefault();
    state.drag = { kind: 'pan', lastX: e.clientX, lastY: e.clientY };
    els.stage.setPointerCapture(e.pointerId);
    els.stage.classList.add('panning');
    return;
  }
  if (e.button !== 0) return;
  const world = screenToWorld(e.clientX, e.clientY);
  const edgeEndEl = e.target.closest?.('[data-edge-end]');
  if (edgeEndEl) {
    const edge = state.scene?.edges.find((x) => x.id === edgeEndEl.getAttribute('data-edge-id'));
    if (edge) {
      startAnchorDrag(e, edge, edgeEndEl.getAttribute('data-edge-end'));
      return;
    }
  }
  const handleEl = e.target.closest?.('[data-handle]');
  if (handleEl) {
    const node = selectedNodes()[0];
    if (!node) return;
    beginTx();
    state.drag = {
      kind: 'resize',
      handle: handleEl.getAttribute('data-handle'),
      node,
      start: world,
      initialBox: { ...node.bbox },
      initialCenter: { ...node.center },
    };
    els.stage.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }

  const node = hitNode(world);
  if (node) {
    const now = performance.now();
    const prev = state.lastClick;
    const doubleCandidate = !e.shiftKey && prev && prev.id === node.id &&
      now - prev.time < 420 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 8;
    const wasSelected = state.selection.has(node.id);
    if (e.shiftKey) {
      if (wasSelected) {
        state.selection.delete(node.id);
        renderOverlay();
        updateSelectionPanel();
        return;
      }
      state.selection.add(node.id);
    } else if (!wasSelected) {
      setSelection([node.id]);
    }
    renderOverlay();
    updateSelectionPanel();
    beginTx();
    state.drag = {
      kind: 'move',
      start: world,
      moved: false,
      node,
      pointer: { x: e.clientX, y: e.clientY },
      doubleCandidate,
      collapseTo: !e.shiftKey && wasSelected && state.selection.size > 1 ? node.id : null,
      nodes: selectedNodes().map((n) => ({
        node: n,
        center: { ...n.center },
        bbox: { ...n.bbox },
      })),
    };
    els.stage.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }

  const edge = hitEdge(world);
  if (edge) {
    state.lastClick = null;
    if (e.shiftKey) {
      const next = new Set(state.edgeSelection);
      if (next.has(edge.id)) next.delete(edge.id);
      else next.add(edge.id);
      setEdgeSelection([...next]);
    } else {
      setEdgeSelection([edge.id]);
    }
    return;
  }

  state.lastClick = null;
  if (e.shiftKey) {
    state.edgeSelection.clear();
    renderOverlay();
    updateControls();
  } else {
    setSelection([]);
  }
  state.drag = {
    kind: 'marquee',
    startWorld: world,
    current: world,
    startScreen: { x: e.clientX, y: e.clientY },
    additive: e.shiftKey,
    base: new Set(state.selection),
  };
  els.stage.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function onPointerMove(e) {
  const drag = state.drag;
  if (!drag) return;
  if (drag.kind === 'pan') {
    panBy(e.clientX - drag.lastX, e.clientY - drag.lastY);
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    return;
  }
  const world = screenToWorld(e.clientX, e.clientY);
  if (drag.kind === 'anchor') {
    updateAnchorDrag(drag, world);
    return;
  }
  if (drag.kind === 'marquee') {
    drag.current = world;
    renderOverlay();
    return;
  }
  if (drag.kind === 'move') {
    const screenDx = (world.x - drag.start.x) * state.camera.zoom;
    const screenDy = (world.y - drag.start.y) * state.camera.zoom;
    if (!drag.moved && Math.hypot(screenDx, screenDy) < 2) return;
    drag.moved = true;
    let dx = world.x - drag.start.x;
    let dy = world.y - drag.start.y;
    if (state.canvas.snap) {
      dx = Math.round(dx / 8) * 8;
      dy = Math.round(dy / 8) * 8;
    }
    transactionMove(drag.nodes, dx, dy);
    refreshClusters(state.scene);
    rerouteEdgesFor(drag.nodes.map((d) => d.node), state.scene.edges);
    renderOverlay();
    updateSelectionPanel();
    if (drag.nodes.length) markDirty();
    return;
  }
  if (drag.kind === 'resize') {
    drag.node && resizeDrag(drag, world, e);
  }
}

function finishPointer(e) {
  const drag = state.drag;
  if (!drag) return;
  if (drag.kind === 'anchor') {
    finishAnchorDrag(e);
    return;
  }
  if (drag.kind === 'marquee') {
    const s = drag.startWorld;
    const c = drag.current ?? s;
    const moved = Math.hypot((c.x - s.x) * state.camera.zoom, (c.y - s.y) * state.camera.zoom) > 2;
    if (moved) {
      const box = {
        x: Math.min(s.x, c.x), y: Math.min(s.y, c.y),
        w: Math.abs(c.x - s.x), h: Math.abs(c.y - s.y),
      };
      const hits = state.scene.nodes.filter((n) => {
        const b = n.bbox;
        return b.x < box.x + box.w && b.x + b.w > box.x && b.y < box.y + box.h && b.y + b.h > box.y;
      }).map((n) => n.id);
      setSelection(drag.additive ? [...drag.base, ...hits] : hits);
    }
  }
  if (drag.kind === 'move' || drag.kind === 'resize') {
    if (drag.kind === 'move' && !drag.moved) {
      if (drag.doubleCandidate) {
        state.lastClick = null;
        state.tx = null;
        state.drag = null;
        startTextEdit(drag.node);
        renderOverlay();
        return;
      }
      state.lastClick = {
        id: drag.node.id, time: performance.now(),
        x: drag.pointer.x, y: drag.pointer.y,
      };
      if (drag.collapseTo) setSelection([drag.collapseTo]);
    } else {
      state.lastClick = null;
    }
    commitTx();
    if (drag.moved || drag.kind === 'resize') {
      updateFacts();
      scheduleSave();
    }
  }
  state.drag = null;
  els.stage.classList.remove('panning');
  if (els.stage.hasPointerCapture?.(e.pointerId)) els.stage.releasePointerCapture(e.pointerId);
  renderOverlay();
}

function onDoubleClick(e) {
  if (!state.ready) return;
  const world = screenToWorld(e.clientX, e.clientY);
  const node = hitNode(world);
  if (node) startTextEdit(node);
}

/* --------------------------------------------------------------- text edit -- */

function labelLines(node) {
  if (!node.labelEl) return '';
  const spans = Array.from(node.labelEl.querySelectorAll('tspan'));
  if (spans.length) return spans.map((t) => t.textContent).join('\n');
  return node.labelEl.textContent.replace(/\s+/g, ' ').trim();
}

function startTextEdit(node) {
  if (!node.labelEl || state.editing) return;
  const box = node.bbox;
  const rect = screenRect(box);
  const cs = getComputedStyle(node.labelEl);
  const fs = (parseFloat(cs.fontSize) || 15) * state.camera.zoom;
  const textarea = document.createElement('textarea');
  textarea.className = 'node-editor';
  textarea.value = labelLines(node);
  textarea.spellcheck = false;
  textarea.style.left = `${Math.max(4, rect.x)}px`;
  textarea.style.top = `${Math.max(4, rect.y)}px`;
  textarea.style.width = `${Math.max(90, rect.w)}px`;
  textarea.style.height = `${Math.max(34, rect.h)}px`;
  textarea.style.fontFamily = cs.fontFamily;
  textarea.style.fontSize = `${Math.max(11, fs)}px`;
  textarea.style.fontWeight = cs.fontWeight;
  textarea.style.color = cs.color;
  els.textLayer.appendChild(textarea);
  state.editing = { node, textarea, original: textarea.value, canceled: false };
  beginTx();
  textarea.focus();
  textarea.select();
  const grow = () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(420, Math.max(34, textarea.scrollHeight + 4))}px`;
  };
  textarea.addEventListener('input', grow);
  textarea.addEventListener('keydown', (ev) => {
    ev.stopPropagation();
    if (ev.key === 'Escape') {
      ev.preventDefault();
      state.editing.canceled = true;
      finishTextEdit();
    } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      textarea.blur();
    }
  });
  textarea.addEventListener('blur', () => finishTextEdit());
}

function finishTextEdit() {
  const edit = state.editing;
  if (!edit) return;
  state.editing = null;
  const { node, textarea, original, canceled } = edit;
  const value = textarea.value;
  textarea.remove();
  if (canceled || value === original) {
    state.tx = null;
    return;
  }
  const changed = setNodeLabel(state.root, node, value);
  if (changed) {
    markDirty();
    refreshClusters(state.scene);
    rerouteEdgesFor([node], state.scene.edges);
    renderOverlay();
    updateSelectionPanel();
    updateFacts();
    commitTx();
    scheduleSave();
  } else {
    state.tx = null;
  }
}

/* ------------------------------------------------------------------ actions -- */

function deleteSelection() {
  const nodeIds = new Set(state.selection);
  const edgeIds = new Set(state.edgeSelection);
  if (!nodeIds.size && !edgeIds.size) return;
  beginTx();
  for (const node of state.scene.nodes) {
    if (nodeIds.has(node.id)) node.el.remove();
  }
  let removedEdges = 0;
  for (const edge of state.scene.edges) {
    if (edgeIds.has(edge.id) || nodeIds.has(edge.from) || nodeIds.has(edge.to)) {
      edge.el.remove();
      edge.label?.el.remove();
      removedEdges++;
    }
  }
  state.selection.clear();
  state.edgeSelection.clear();
  reloadScene();
  refreshClusters(state.scene);
  renderOverlay();
  updateSelectionPanel();
  markDirty();
  commitTx();
  updateFacts();
  scheduleSave();
  if (nodeIds.size) toast(`已删除 ${nodeIds.size} 个节点、${removedEdges} 条连线`);
  else toast(`已删除 ${removedEdges} 条连线`);
}

function nudge(dx, dy) {
  if (!state.selection.size) return;
  beginTx();
  const nodes = selectedNodes().map((n) => ({ node: n, center: { ...n.center }, bbox: { ...n.bbox } }));
  transactionMove(nodes, dx, dy);
  refreshClusters(state.scene);
  rerouteEdgesFor(nodes.map((d) => d.node), state.scene.edges);
  renderOverlay();
  updateSelectionPanel();
  markDirty();
  commitTx();
  updateFacts();
  scheduleSave();
}

async function restoreDraft() {
  if (!confirm('丢弃当前人工修改并恢复 AI 初稿？此操作可以撤销。')) return;
  try {
    const res = await fetch('/api/restore-draft', { method: 'POST' });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    const data = await res.json();
    beginTx();
    state.canvas = data.canvas;
    await setDiagram(data.svg, { fit: true });
    markDirty();
    commitTx();
    await saveNow(false);
    toast('已恢复 AI 初稿');
  } catch (e) {
    toast(`恢复失败：${e.message}`, 4200);
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportSvg() {
  try {
    const transparent = state.canvas.background === 'transparent';
    const svg = exportSvgString(transparent);
    const res = await fetch('/api/export/svg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svg }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    downloadBlob(await res.blob(), `${state.boot.project.slug}.svg`);
    toast('SVG 已导出');
  } catch (e) {
    toast(`SVG 导出失败：${e.message}`, 4200);
  }
}

async function exportPng() {
  const btn = els.exportPng;
  if (btn.disabled) return;
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = '导出中…';
  setStatus('渲染 PNG…', 'saving');
  try {
    const transparent = state.canvas.background === 'transparent';
    const svg = exportSvgString(transparent);
    const res = await fetch('/api/export/png', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        svg,
        scale: state.boot.render.scale ?? 2,
        transparent,
        quality: els.pngQuality?.value ?? 'balanced',
      }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    downloadBlob(await res.blob(), `${state.boot.project.slug}.png`);
    setStatus('已导出', '');
    toast('PNG 已导出');
  } catch (e) {
    setStatus('导出失败', 'error');
    toast(`PNG 导出失败：${e.message}`, 4800);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

/* ------------------------------------------------------------------ events */

function onKeyDown(e) {
  const target = e.target;
  if (target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable)) return;

  if (e.code === 'Space') {
    if (!state.space) {
      state.space = true;
      els.stage.classList.add('space');
    }
    e.preventDefault();
    return;
  }
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (mod && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
    return;
  }
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void saveNow(true);
    return;
  }
  if (mod && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    setSelection(state.scene.nodes.map((n) => n.id));
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    deleteSelection();
    return;
  }
  if (e.key === 'Escape') {
    if (state.editing) return;
    setSelection([]);
    els.inspector.classList.remove('open');
    els.panelToggle.setAttribute('aria-expanded', 'false');
    return;
  }
  if (e.key === 'f' || e.key === 'F' || e.key === '0') {
    e.preventDefault();
    fitAll();
    return;
  }
  if (e.key === '1') {
    e.preventDefault();
    state.camera.zoom = 1;
    applyCamera();
    return;
  }
  if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    const r = els.stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2);
    return;
  }
  if (e.key === '-') {
    e.preventDefault();
    const r = els.stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2);
    return;
  }
  if (state.selection.size && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') nudge(-step, 0);
    if (e.key === 'ArrowRight') nudge(step, 0);
    if (e.key === 'ArrowUp') nudge(0, -step);
    if (e.key === 'ArrowDown') nudge(0, step);
  }
}

function bindEvents() {
  els.stage.addEventListener('pointerdown', onPointerDown);
  els.stage.addEventListener('pointermove', onPointerMove);
  els.stage.addEventListener('pointerup', finishPointer);
  els.stage.addEventListener('pointercancel', finishPointer);
  els.stage.addEventListener('dblclick', onDoubleClick);
  els.stage.addEventListener('contextmenu', (e) => e.preventDefault());
  els.stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.0015));
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      state.space = false;
      els.stage.classList.remove('space');
    }
  });
  window.addEventListener('blur', () => {
    state.space = false;
    els.stage.classList.remove('space');
  });

  const ro = new ResizeObserver(() => {
    if (!state.ready) return;
    applyCamera();
    applyGrid();
  });
  ro.observe(els.stage);

  els.undo.addEventListener('click', undo);
  els.redo.addEventListener('click', redo);
  els.fit.addEventListener('click', () => fitAll());
  els.zoomIn.addEventListener('click', () => {
    const r = els.stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2);
  });
  els.zoomOut.addEventListener('click', () => {
    const r = els.stage.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2);
  });
  els.restore.addEventListener('click', () => { void restoreDraft(); });
  els.exportSvg.addEventListener('click', () => { void exportSvg(); });
  els.exportPng.addEventListener('click', () => { void exportPng(); });
  els.deleteSelection.addEventListener('click', deleteSelection);
  els.clearSelection.addEventListener('click', () => setSelection([]));
  els.saveNow.addEventListener('click', () => { void saveNow(true); });
  els.themeSelect.addEventListener('change', () => { void switchTheme(els.themeSelect.value); });

  els.bgColor.addEventListener('input', () => {
    state.canvas.background = els.bgColor.value;
    state.canvas.backdrop = hasBackdrop() && els.themeBackdrop.checked;
    applyCanvas();
    scheduleSave();
  });
  els.bgTransparent.addEventListener('change', () => {
    if (els.bgTransparent.checked) {
      state.canvas.background = 'transparent';
      state.canvas.backdrop = false;
    } else {
      state.canvas.background = els.bgColor.value || state.boot.theme.background;
      state.canvas.backdrop = hasBackdrop();
    }
    applyCanvas();
    scheduleSave();
  });
  els.gridMode.addEventListener('change', () => {
    state.canvas.grid = els.gridMode.value;
    applyCanvas();
    scheduleSave();
  });
  els.snapGrid.addEventListener('change', () => {
    state.canvas.snap = els.snapGrid.checked;
    scheduleSave();
  });
  els.themeBackdrop.addEventListener('change', () => {
    state.canvas.backdrop = els.themeBackdrop.checked;
    if (state.canvas.backdrop) state.canvas.background = cssColorToHex(state.canvas.background);
    applyCanvas();
    scheduleSave();
  });
  els.panelToggle.addEventListener('click', () => {
    const open = els.inspector.classList.toggle('open');
    els.panelToggle.setAttribute('aria-expanded', String(open));
  });

  window.addEventListener('pagehide', () => {
    if (!state.dirty || !state.root) return;
    try {
      const body = JSON.stringify({
        svg: workingSvg(),
        scene: sceneSummary(state.scene, state.canvas),
        canvas: state.canvas,
      });
      navigator.sendBeacon('/api/save', new Blob([body], { type: 'application/json' }));
    } catch { /* best effort */ }
  });
}

/* -------------------------------------------------------------------- boot -- */

function docMeta() {
  const b = state.boot;
  els.docName.textContent = b.project.source;
  els.docSub.textContent = `块 ${b.project.index} · 行 ${b.project.line} · ${b.theme.name}${b.resumed ? ' · 已恢复工作稿' : ' · AI 初稿'}`;
  els.factTheme.textContent = b.theme.name;
}

async function boot() {
  try {
    const res = await fetch('/api/bootstrap');
    if (!res.ok) throw new Error(await res.text());
    state.boot = await res.json();
    state.canvas = { ...state.boot.canvas };
    if (els.pngQuality && ['fast', 'balanced', 'best'].includes(state.boot.pngQuality)) {
      els.pngQuality.value = state.boot.pngQuality;
    }
    populateThemes(state.boot.themes);
    applyTheme(state.boot.theme);
    docMeta();
    await waitForFonts(state.boot.fonts);
    await setDiagram(state.boot.svg, { fit: true });
    state.history.undo.length = 0;
    state.history.redo.length = 0;
    bindEvents();
    applyCanvas();
    updateControls();
    updateFacts();
    state.ready = true;
    applyCamera();
    if (!state.boot.hasDraftScene) void postDraftScene();
    if (state.boot.warnings?.length) toast(state.boot.warnings.join('；'), 4200);
    setStatus('已就绪');
    if (state.boot.resumed) setStatus('已恢复工作稿');
    console.info('[mmdx edit] ready', {
      nodes: state.scene.nodes.length,
      edges: state.scene.edges.length,
      clusters: state.scene.clusters.length,
    });
  } catch (e) {
    showError(`无法打开编辑器\n\n${e.message}`);
    setStatus('加载失败', 'error');
  }
}

/* -------------------------------------------------------------------- debug -- */

window.__mmdxEditor = {
  get ready() { return state.ready; },
  getState() {
    return {
      ready: state.ready,
      nodes: state.scene?.nodes.length ?? 0,
      edges: state.scene?.edges.length ?? 0,
      clusters: state.scene?.clusters.length ?? 0,
      selection: [...state.selection],
      edgeSelection: [...state.edgeSelection],
      theme: state.boot?.theme?.preset ?? state.boot?.theme?.name ?? null,
      stats: { ...state.stats },
      camera: { ...state.camera },
      canvas: clone(state.canvas),
      frameBox: state.frameBox ? { ...state.frameBox } : null,
      undo: state.history.undo.length,
      redo: state.history.redo.length,
      dirty: state.dirty,
    };
  },
  getNodeBox(id) {
    const n = state.scene?.nodes.find((x) => x.id === id);
    if (!n) return null;
    return {
      id,
      label: n.label,
      world: { ...n.bbox },
      screen: screenRect(n.bbox),
      center: { ...n.center },
      scale: { x: n.scaleX, y: n.scaleY },
    };
  },
  screenPoint(id) {
    const n = state.scene?.nodes.find((x) => x.id === id);
    if (!n) return null;
    const s = worldToScreen(n.bbox.x + n.bbox.w / 2, n.bbox.y + n.bbox.h / 2);
    return { x: s.x, y: s.y };
  },
  getEdge(id) {
    const e = state.scene?.edges.find((x) => x.id === id);
    if (!e) return null;
    const ends = edgeEndpointPositions(e);
    const screen = ends ? {
      from: worldToScreen(ends.from.x, ends.from.y),
      to: worldToScreen(ends.to.x, ends.to.y),
    } : null;
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      fromAnchor: e.fromAnchor,
      toAnchor: e.toAnchor,
      d: e.pathEl.getAttribute('d') ?? '',
      style: edgeStyle(e),
      screen,
    };
  },
  selectEdge(id) {
    setEdgeSelection(id ? [id] : []);
    return [...state.edgeSelection];
  },
  setEdgeAnchors(id, from, to) {
    const edge = state.scene?.edges.find((e) => e.id === id);
    if (!edge) return null;
    beginTx();
    if (from) {
      edge.fromAnchor = from;
      edge.el.setAttribute('data-mmdx-from-anchor', formatAnchor(from));
    }
    if (to) {
      edge.toAnchor = to;
      edge.el.setAttribute('data-mmdx-to-anchor', formatAnchor(to));
    }
    rerouteEdge(edge);
    markDirty();
    commitTx();
    renderOverlay();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
    return this.getEdge(id);
  },
  async setTheme(name) {
    await switchTheme(name);
    return state.boot?.theme?.preset ?? null;
  },
  edgeScreen(id, fraction = 0.5) {
    const e = state.scene?.edges.find((x) => x.id === id);
    if (!e) return null;
    const path = e.pathEl;
    const len = path.getTotalLength();
    const p = path.getPointAtLength(len * fraction);
    const m = path.getScreenCTM();
    return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  },
  select(ids) {
    setSelection(ids);
    return [...state.selection];
  },
  selectAll() {
    setSelection(state.scene.nodes.map((n) => n.id));
  },
  fitAll() { fitAll(false); },
  undo,
  redo,
  saveNow,
  getSvg() { return workingSvg(); },
  getExportSvg(transparent = false) { return exportSvgString(transparent); },
  getLabel(id) {
    const n = state.scene?.nodes.find((x) => x.id === id);
    return n ? nodeLabelText(n) : null;
  },
  getColors(id) {
    const n = state.scene?.nodes.find((x) => x.id === id);
    return n ? nodeColors(n) : null;
  },
  setColor(id, key, value) {
    const n = state.scene?.nodes.find((x) => x.id === id);
    if (!n) return null;
    beginTx();
    setNodeColor(n, key, value);
    markDirty();
    commitTx();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
    return nodeColors(n);
  },
  resetColors(id) {
    const n = state.scene?.nodes.find((x) => x.id === id);
    if (!n) return null;
    beginTx();
    resetNodeColors(n);
    markDirty();
    commitTx();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
    return nodeColors(n);
  },
  getEdgeStyle(id) {
    const edge = state.scene?.edges.find((x) => x.id === id);
    return edge ? edgeStyle(edge) : null;
  },
  setEdgeStyle(id, key, value) {
    const edge = state.scene?.edges.find((x) => x.id === id);
    if (!edge) return null;
    beginTx();
    setEdgeStyleValue(edge, key, value);
    markDirty();
    commitTx();
    renderOverlay();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
    return edgeStyle(edge);
  },
  resetEdgeStyle(id) {
    const edge = state.scene?.edges.find((x) => x.id === id);
    if (!edge) return null;
    beginTx();
    resetEdgeStyleScene(edge);
    markDirty();
    commitTx();
    renderOverlay();
    updateSelectionPanel();
    updateFacts();
    scheduleSave();
    return edgeStyle(edge);
  },
  setLabel(id, text) {
    const n = state.scene?.nodes.find((x) => x.id === id);
    if (!n) return false;
    const changed = setNodeLabel(state.root, n, String(text));
    if (changed) {
      refreshClusters(state.scene);
      rerouteEdgesFor([n], state.scene.edges);
      renderOverlay();
      updateSelectionPanel();
      updateFacts();
      scheduleSave();
    }
    return changed;
  },
  benchMove(count = 100) {
    if (!state.ready) return null;
    const subset = state.scene.nodes.slice(0, Math.min(count, state.scene.nodes.length));
    if (!subset.length) return null;
    const snap = snapshotState();
    const t0 = performance.now();
    for (const n of subset) {
      n.el.setAttribute('transform', `translate(${(n.center.x + 40).toFixed(2)} ${(n.center.y + 24).toFixed(2)})`);
    }
    for (const n of subset) {
      n.center.x += 40;
      n.center.y += 24;
      n.bbox.x += 40;
      n.bbox.y += 24;
    }
    const t1 = performance.now();
    refreshClusters(state.scene);
    rerouteEdgesFor(subset, state.scene.edges);
    const t2 = performance.now();
    applySnapshot(snap);
    return {
      nodes: state.scene.nodes.length,
      moved: subset.length,
      transformMs: +(t1 - t0).toFixed(2),
      clustersAndEdgesMs: +(t2 - t1).toFixed(2),
      totalMs: +(t2 - t0).toFixed(2),
    };
  },
  benchHit(count = 2000) {
    if (!state.ready) return null;
    const nodes = state.scene.nodes;
    const t0 = performance.now();
    let hits = 0;
    for (let i = 0; i < count; i++) {
      const x = (i * 37) % 1400;
      const y = (i * 53) % 900;
      if (hitNode({ x, y })) hits++;
    }
    return { tests: count, hits, ms: +(performance.now() - t0).toFixed(2) };
  },
  benchEdgeHit(count = 100) {
    if (!state.ready) return null;
    const bounds = sceneBounds(state.scene) ?? { x: 0, y: 0, w: 1000, h: 700 };
    const t0 = performance.now();
    let hits = 0;
    for (let i = 0; i < count; i++) {
      const x = bounds.x + bounds.w * ((i * 0.61803398875) % 1);
      const y = bounds.y + bounds.h * ((i * 0.38196601125) % 1);
      if (hitEdge({ x, y })) hits++;
    }
    return {
      tests: count,
      hits,
      edges: state.scene.edges.length,
      ms: +(performance.now() - t0).toFixed(2),
    };
  },
  benchAnchor(count = 120) {
    if (!state.ready) return null;
    const edge = state.scene.edges.find((e) => e.fromNode && e.toNode);
    if (!edge) return null;
    const snap = snapshotState();
    setEdgeSelection([edge.id]);
    const sides = ['right', 'bottom', 'left', 'top'];
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      edge.fromAnchor = { side: sides[i % sides.length], t: (i % 20) / 20 + 0.025 };
      rerouteEdge(edge);
      renderOverlay();
    }
    const ms = +(performance.now() - t0).toFixed(2);
    applySnapshot(snap);
    return { updates: count, ms, perUpdateMs: +(ms / count).toFixed(3) };
  },
};

void boot();
