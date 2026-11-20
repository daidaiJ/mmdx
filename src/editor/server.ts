// `mmdx edit` — local editor shell.
//
// The initial diagram is rendered by the normal Pele pipeline, then the
// browser edits that SVG directly. This server owns the project directory,
// serves the editor assets/fonts, and keeps one Chromium instance for PNG
// export. Nothing here is a second renderer: the theme, fonts, rough paths
// and backdrop are exactly what `mmdx` already produced.

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parse } from 'pele';
import { allFamilies, faceCss, BASE_FAMILY, MONO_FAMILY } from '../fonts.ts';
import { extractBlocks } from '../input.ts';
import { Renderer } from '../render.ts';
import { loadAssets } from '../embed.ts';
import { loadEditorFiles } from './embed.ts';
import {
  applyColumnDensity, applySlideDensity, deepMerge, getTheme, paperize, peleConfig,
  PRESETS, SIZE_PRESETS, type SizePreset, type ThemeSpec,
} from '../themes.ts';
import { isToneName, type ToneName } from '../tone.ts';

interface EditOptions {
  input: string;
  index: number | null;
  theme: string;
  themeExplicit: boolean;
  tone: ToneName | null;
  styleFill: 'solid' | 'hachure' | null;
  preset: SizePreset | null;
  background: string | null;
  width: number | null;
  scale: number;
  port: number;
  project: string | null;
  noOpen: boolean;
  browser: string | null;
  fresh: boolean;
  config: string | null;
}

interface CanvasState {
  background: string;
  grid: 'none' | 'dots' | 'lines';
  snap: boolean;
  backdrop: boolean;
}

interface RenderConfig {
  theme: string;
  tone: ToneName | null;
  styleFill: 'solid' | 'hachure' | null;
  preset: SizePreset | null;
  width: number;
  scale: number;
  background: string;
}

interface Meta {
  schema: 1;
  mmdx: string;
  source: {
    file: string;
    display: string;
    index: number;
    line: number;
    hash: string;
    mermaid: string;
  };
  render: RenderConfig;
  canvas: CanvasState;
  draft: { createdAt: string; canvas: CanvasState };
  working?: { updatedAt: string };
}

interface ModelInfo {
  diagramType: string;
  edges: Array<{ id: string; from: string; to: string; label: string }>;
  subgraphs: Array<{ id: string; title: string; nodes: string[] }>;
}

const HELP = `
mmdx edit — local canvas for manual touch-ups / interactive rendering (Phase 0)

Usage:
  mmdx edit <file.md|file.mmd> [options]

The canvas opens the AI draft rendered by the normal Pele / theme / font
pipeline. Move and resize nodes, edit labels, set node fill / stroke / text,
style edges (colour, width, dash, arrowhead) and switch routing (auto /
orthogonal / straight / curve), drag anchors or reconnect edges, switch among
the eight themes, toggle background / grid, undo / redo, export SVG or PNG,
and restore the AI draft.

Options:
  --index <n>          1-based block index in a Markdown file
  -t, --theme <name>   tech (default) | openai | excalidraw | ios | acnh | epaper | zed | zed-light
  --tone <name>        paper | neutral | product
  --style-fill <mode>  solid | hachure (excalidraw only)
  --preset <name>      slide | a4 | square | column
  --background <color> page background, e.g. white | transparent | #1A1A1A
  --width <px>         layout width used for the initial render (default: 1200)
  --scale <n>          PNG export scale (default: 2)
  --config <file.json> Pele fontSize / padding / flowchart spacing
  --project <dir>      project directory (default: <source>/.mmdx/<slug>)
  --port <n>           fixed local port (default: random free port)
  --browser <path>     Chrome/Edge executable override
  --fresh              ignore working.svg; start again from the AI draft
  --no-open            do not launch the browser
  -h, --help           show this help

The project keeps draft.svg, working.svg and their scene JSON. "还原初稿"
restores draft.svg without touching the source file.
`;

function editHelp(): string {
  return HELP.trimStart();
}

function need(argv: string[], i: number, name: string): string {
  if (i >= argv.length) throw new Error(`missing value for ${name}`);
  return argv[i];
}

function parseEditArgs(argv: string[]): EditOptions | null {
  const o: EditOptions = {
    input: '', index: null, theme: 'tech', themeExplicit: false, tone: null, styleFill: null, preset: null,
    background: null, width: null, scale: 2, port: 0, project: null, noOpen: false,
    browser: null, fresh: false, config: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h': case '--help':
        process.stdout.write(editHelp());
        return null;
      case '--index': {
        const v = need(argv, ++i, a);
        const n = Number.parseInt(v, 10);
        if (!Number.isFinite(n) || n < 1) throw new Error(`--index must be a positive integer, got "${v}"`);
        o.index = n;
        break;
      }
      case '-t': case '--theme':
        o.theme = need(argv, ++i, a);
        o.themeExplicit = true;
        break;
      case '--tone': {
        const v = need(argv, ++i, a);
        if (!isToneName(v)) throw new Error(`--tone must be paper|neutral|product, got "${v}"`);
        o.tone = v;
        break;
      }
      case '--style-fill': {
        const v = need(argv, ++i, a);
        if (v !== 'solid' && v !== 'hachure') throw new Error(`--style-fill must be solid|hachure, got "${v}"`);
        o.styleFill = v;
        break;
      }
      case '--preset': {
        const v = need(argv, ++i, a);
        if (!(v in SIZE_PRESETS)) throw new Error(`--preset must be slide|a4|square|column, got "${v}"`);
        o.preset = v as SizePreset;
        break;
      }
      case '--background': o.background = need(argv, ++i, a); break;
      case '--width': {
        const v = Number.parseInt(need(argv, ++i, a), 10);
        if (!Number.isFinite(v) || v < 240) throw new Error(`--width must be a number >= 240, got "${v}"`);
        o.width = v;
        break;
      }
      case '--scale': {
        const v = Number.parseFloat(need(argv, ++i, a));
        if (!Number.isFinite(v) || v < 0.5 || v > 4) throw new Error(`--scale must be between 0.5 and 4, got "${v}"`);
        o.scale = v;
        break;
      }
      case '--config': o.config = need(argv, ++i, a); break;
      case '--project': o.project = need(argv, ++i, a); break;
      case '--port': {
        const v = Number.parseInt(need(argv, ++i, a), 10);
        if (!Number.isFinite(v) || v < 0 || v > 65535) throw new Error(`--port must be 0..65535, got "${v}"`);
        o.port = v;
        break;
      }
      case '--browser': o.browser = need(argv, ++i, a); break;
      case '--fresh': o.fresh = true; break;
      case '--no-open': o.noOpen = true; break;
      default:
        if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
        if (o.input) throw new Error('edit opens one diagram at a time; pass a single input file');
        o.input = a;
    }
  }
  if (!o.input) throw new Error('missing input file');
  return o;
}

function sha256(text: string): string {
  return 'sha256:' + crypto.createHash('sha256').update(text).digest('hex');
}

function slugify(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'diagram';
}

function atomicWrite(file: string, data: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmp, data);
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.rmSync(file, { force: true });
    fs.renameSync(tmp, file);
  }
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function defaultCanvas(background: string, theme: ThemeSpec): CanvasState {
  return {
    background,
    grid: 'none',
    snap: true,
    backdrop: !!theme.backdrop,
  };
}

function validCanvas(raw: unknown, fallback: CanvasState): CanvasState {
  const c = raw as Partial<CanvasState> | null;
  if (!c || typeof c !== 'object') return fallback;
  const bg = typeof c.background === 'string' &&
    (/^#[0-9a-f]{3,8}$/i.test(c.background) || c.background === 'transparent' || /^rgba?\([^)]*\)$/i.test(c.background))
    ? c.background
    : fallback.background;
  return {
    background: bg,
    grid: c.grid === 'dots' || c.grid === 'lines' ? c.grid : 'none',
    snap: typeof c.snap === 'boolean' ? c.snap : fallback.snap,
    backdrop: typeof c.backdrop === 'boolean' ? c.backdrop : fallback.backdrop,
  };
}

function modelInfo(code: string): ModelInfo {
  const model = parse(code) as unknown as {
    type?: string;
    mermaidType?: string;
    nodes?: Map<string, unknown>;
    edges?: Array<{ id?: string; start?: string; end?: string; text?: string }>;
    subgraphs?: Array<{ id: string; title?: string; nodes?: string[] }>;
    graph?: {
      nodes?: Array<{ id: string }>;
      edges?: Array<{ id?: string; start?: string; end?: string; label?: string }>;
    };
  };
  const diagramType = model.mermaidType ?? model.type ?? 'unknown';
  const edges: ModelInfo['edges'] = [];
  if (Array.isArray(model.edges)) {
    for (const e of model.edges) {
      if (e.id && e.start && e.end) edges.push({ id: e.id, from: e.start, to: e.end, label: e.text ?? '' });
    }
  }
  for (const e of model.graph?.edges ?? []) {
    if (e.id && e.start && e.end) edges.push({ id: e.id, from: e.start, to: e.end, label: e.label ?? '' });
  }
  const subgraphs = (model.subgraphs ?? []).map((s) => ({
    id: s.id, title: s.title ?? s.id, nodes: s.nodes ?? [],
  }));
  return { diagramType, edges, subgraphs };
}

function contentType(file: string): string {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  return 'application/octet-stream';
}

function openBrowser(url: string): void {
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    /* the printed URL is the fallback */
  }
}

function cookies(req: http.IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function readBody(req: http.IncomingMessage, limit = 30_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function sendText(res: http.ServerResponse, status: number, body: string, type = 'text/plain; charset=utf-8'): void {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export async function runEditCommand(argv: string[], version: string): Promise<number> {
  let o: EditOptions | null;
  try {
    o = parseEditArgs(argv);
  } catch (e) {
    console.error(`mmdx edit: ${(e as Error).message}`);
    return 2;
  }
  if (!o) return 0;

  if (!PRESETS[o.theme]) {
    console.error(`mmdx edit: unknown theme "${o.theme}" (available: ${Object.keys(PRESETS).join(', ')})`);
    return 2;
  }

  const inputPath = path.resolve(o.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`mmdx edit: input not found: ${inputPath}`);
    return 2;
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  const blocks = extractBlocks(o.input, raw).filter((b) => b.kind === 'mermaid');
  if (!blocks.length) {
    console.error('mmdx edit: no mermaid block found');
    return 1;
  }
  const block = o.index ? blocks.find((b) => b.index === o.index) : blocks[0];
  if (!block) {
    const available = blocks.map((b) => b.index).join(', ');
    console.error(`mmdx edit: --index ${o.index} matches no mermaid block (available: ${available})`);
    return 2;
  }

  const model = (() => {
    try {
      return modelInfo(block.code);
    } catch (e) {
      console.error(`mmdx edit: cannot parse diagram: ${(e as Error).message}`);
      return null;
    }
  })();
  if (!model) return 1;
  if (model.diagramType !== 'flowchart-v2' && model.diagramType !== 'stateDiagram') {
    console.error(
      `mmdx edit: Phase 0 supports flowchart and state diagrams; this block is "${model.diagramType}".\n` +
      'Render it with `mmdx` and revisit in Phase 1 for class/ER/sequence editing.',
    );
    return 2;
  }

  const slugBase = block.base + (o.index ? `-m${block.index}` : '');
  const slug = slugify(slugBase);
  const projectDir = o.project
    ? path.resolve(o.project)
    : path.join(path.dirname(inputPath), '.mmdx', slug);
  fs.mkdirSync(projectDir, { recursive: true });

  const metaFile = path.join(projectDir, 'meta.json');
  const draftSvgFile = path.join(projectDir, 'draft.svg');
  const draftSceneFile = path.join(projectDir, 'draft.scene.json');
  const workingSvgFile = path.join(projectDir, 'working.svg');
  const workingSceneFile = path.join(projectDir, 'working.scene.json');
  const sourceHash = sha256(block.code);
  const oldMeta = readJson<Meta>(metaFile);

  // Reopen the template the project was last saved with. An explicit -t still
  // wins, and that render-key mismatch starts a new draft.
  if (oldMeta && !o.themeExplicit && oldMeta.source?.hash === sourceHash &&
    oldMeta.render?.theme && PRESETS[oldMeta.render.theme]) {
    o.theme = oldMeta.render.theme;
  }
  let activeThemeName = o.theme;

  const themeSpecFor = (name: string): ThemeSpec => {
    let t = getTheme(name);
    if (o.tone === 'paper') t = paperize(t);
    if (o.styleFill) t.style = { ...(t.style ?? {}), fillStyle: o.styleFill };
    return t;
  };
  const mermaidConfigFor = (name: string): Record<string, unknown> => {
    let cfg = JSON.parse(JSON.stringify(PRESETS[name].config)) as Record<string, unknown>;
    if (o.preset === 'slide') applySlideDensity(cfg);
    else if (o.preset === 'column') applyColumnDensity(cfg);
    if (rawConfig) cfg = deepMerge(cfg, rawConfig);
    return cfg;
  };
  const fontFamiliesFor = (name: string): string[] => {
    const t = themeSpecFor(name);
    return [...new Set([BASE_FAMILY, ...(t.fonts ?? []), MONO_FAMILY])];
  };
  const themePayload = (t: ThemeSpec, preset: string) => ({
    name: t.name,
    preset,
    dark: t.dark,
    background: t.background,
    vars: t.vars,
    hasBackdrop: !!t.backdrop,
    fonts: t.fonts ?? [],
  });

  let theme = themeSpecFor(activeThemeName);
  if (o.styleFill && theme.name !== 'excalidraw') {
    console.error(`mmdx edit: --style-fill only applies to excalidraw; ignored for "${theme.name}"`);
  }

  const size = o.preset ? SIZE_PRESETS[o.preset] : null;
  const width = o.width ?? size?.width ?? 1200;
  const scale = o.scale;
  let fontSize = 15;
  let padding = 0;
  let flowchart: { nodeSpacing?: number; rankSpacing?: number; padding?: number } | undefined;
  if (o.preset === 'slide') {
    fontSize = 18;
    flowchart = { nodeSpacing: 88, rankSpacing: 88, padding: 22 };
  } else if (o.preset === 'column') {
    fontSize = 18;
    flowchart = { nodeSpacing: 56, rankSpacing: 64, padding: 14 };
  }
  let rawConfig: Record<string, unknown> | null = null;
  if (o.config) {
    try {
      rawConfig = JSON.parse(fs.readFileSync(o.config, 'utf8')) as Record<string, unknown>;
    } catch (e) {
      console.error(`mmdx edit: cannot read --config: ${(e as Error).message}`);
      return 2;
    }
    const mapped = peleConfig(rawConfig);
    if (mapped.fontSize !== undefined) fontSize = mapped.fontSize;
    if (mapped.padding !== undefined) padding = mapped.padding;
    if (mapped.flowchart) flowchart = { ...flowchart, ...mapped.flowchart };
  }

  let background = o.background || theme.background;
  let renderCfg: RenderConfig = {
    theme: activeThemeName, tone: o.tone, styleFill: o.styleFill, preset: o.preset, width, scale, background,
  };
  const renderKey = JSON.stringify({ mmdx: version, ...renderCfg });
  const sameSource = oldMeta?.source?.hash === sourceHash;
  const sameRender = oldMeta ? JSON.stringify({ mmdx: oldMeta.mmdx, ...oldMeta.render }) === renderKey : false;

  const assets = await loadAssets();
  const embeddedEditor = await loadEditorFiles();
  const editorFile = (name: string): string | undefined => {
    // source runs pick up client edits without a restart; the compiled binary
    // has no client directory and falls through to the embedded copy.
    try {
      const disk = path.join(import.meta.dir, 'client', name);
      if (fs.existsSync(disk)) return fs.readFileSync(disk, 'utf8');
    } catch { /* embedded only */ }
    return embeddedEditor[name];
  };
  if (!editorFile('index.html')) {
    console.error('mmdx edit: editor client assets are missing');
    return 1;
  }

  let renderer: Renderer | null = null;
  const startRenderer = async (): Promise<Renderer> => {
    if (renderer) return renderer;
    renderer = await Renderer.create(assets, {
      browserPath: o.browser || undefined,
      scale,
      width,
      // One editor renderer serves every theme, so a template switch does not
      // wait for a second Chromium page pool. All faces are bundled locally.
      fonts: allFamilies(),
    });
    return renderer;
  };

  const renderDraftFor = async (name: string): Promise<string> => {
    const target = themeSpecFor(name);
    const r = await startRenderer();
    const { svg } = await r.render({
      code: block.code,
      background: o.background || target.background,
      needPng: false,
      scale,
      width,
      theme: target,
      mermaidConfig: mermaidConfigFor(name),
      fontSize,
      padding,
      flowchart,
      svgThemeable: false,
      titlePos: 'top',
      titleText: '',
      remap: PRESETS[name].remap,
    });
    return svg;
  };
  const renderDraft = (): Promise<string> => renderDraftFor(activeThemeName);

  const warned: string[] = [];
  let draftSvg: string;
  let initialSvg: string;
  let canvas: CanvasState;
  let resumed = false;

  if (!oldMeta || !sameSource || !sameRender) {
    if (oldMeta && fs.existsSync(workingSvgFile)) {
      const backup = path.join(projectDir, `working.prev-${Date.now()}.svg`);
      try {
        fs.renameSync(workingSvgFile, backup);
        warned.push(`previous working.svg kept as ${path.basename(backup)}`);
      } catch { /* leave it in place */ }
    }
    draftSvg = await renderDraft();
    canvas = defaultCanvas(background, theme);
    atomicWrite(draftSvgFile, draftSvg);
    atomicWrite(metaFile, JSON.stringify({
      schema: 1,
      mmdx: version,
      source: {
        file: inputPath,
        display: o.input,
        index: block.index,
        line: block.line,
        hash: sourceHash,
        mermaid: block.code,
      },
      render: renderCfg,
      canvas,
      draft: { createdAt: new Date().toISOString(), canvas },
    } satisfies Meta, null, 2));
    initialSvg = draftSvg;
    resumed = false;
  } else {
    canvas = validCanvas(oldMeta.canvas, defaultCanvas(background, theme));
    draftSvg = fs.existsSync(draftSvgFile) ? fs.readFileSync(draftSvgFile, 'utf8') : await renderDraft();
    if (!fs.existsSync(draftSvgFile)) atomicWrite(draftSvgFile, draftSvg);
    if (!o.fresh && fs.existsSync(workingSvgFile)) {
      initialSvg = fs.readFileSync(workingSvgFile, 'utf8');
      resumed = true;
    } else {
      initialSvg = draftSvg;
      if (o.fresh) {
        atomicWrite(workingSvgFile, draftSvg);
        const now = new Date().toISOString();
        oldMeta.working = { updatedAt: now };
        oldMeta.canvas = canvas;
        atomicWrite(metaFile, JSON.stringify(oldMeta, null, 2));
      }
    }
  }

  let pendingTheme: { name: string; svg: string } | null = null;

  const token = crypto.randomBytes(24).toString('base64url');
  const tokenOk = (req: http.IncomingMessage, url: URL): boolean => {
    const header = req.headers['x-mmdx-token'];
    const supplied = typeof header === 'string' ? header : url.searchParams.get('token') ?? cookies(req).mmdx_token;
    if (!supplied || supplied.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
  };
  const originOk = (req: http.IncomingMessage): boolean => {
    const origin = req.headers.origin;
    if (!origin) return true;
    try {
      const u = new URL(origin);
      const host = req.headers.host ?? '';
      return u.host === host;
    } catch {
      return false;
    }
  };
  const requestBase = (req: http.IncomingMessage): string => `http://${req.headers.host ?? '127.0.0.1'}`;

  let listeningPort = o.port;
  const server = http.createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', requestBase(req));
      if (!tokenOk(req, url)) {
        sendText(res, 403, 'mmdx edit: missing or invalid token');
        return;
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { Allow: 'GET, POST' });
        res.end();
        return;
      }

      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        if (url.searchParams.get('token') === token) {
          res.setHeader(
            'Set-Cookie',
            `mmdx_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`,
          );
        }
        sendText(res, 200, editorFile('index.html') ?? '', contentType('index.html'));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === 'GET' && (url.pathname === '/editor.css' || url.pathname === '/editor.js' || url.pathname === '/scene.js')) {
        const name = url.pathname.slice(1);
        const body = editorFile(name);
        if (!body) {
          sendText(res, 404, 'not found');
          return;
        }
        sendText(res, 200, body, contentType(name));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/fonts.css') {
        const requested = url.searchParams.get('theme');
        const fontTheme = requested && PRESETS[requested] ? requested : activeThemeName;
        const css = faceCss(fontFamiliesFor(fontTheme), assets.fonts);
        res.writeHead(200, {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Length': Buffer.byteLength(css),
        });
        res.end(css);
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
        sendJson(res, 200, {
          version,
          project: {
            dir: projectDir,
            slug,
            name: path.basename(projectDir),
            source: path.basename(inputPath),
            display: o.input,
            index: block.index,
            line: block.line,
          },
          theme: themePayload(theme, activeThemeName),
          themes: Object.keys(PRESETS).map((name) => themePayload(themeSpecFor(name), name)),
          fonts: fontFamiliesFor(activeThemeName),
          render: renderCfg,
          canvas,
          svg: initialSvg,
          edges: model.edges,
          subgraphs: model.subgraphs,
          resumed,
          hasDraftScene: fs.existsSync(draftSceneFile),
          hasWorking: fs.existsSync(workingSvgFile),
          warnings: warned,
        });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/theme/preview') {
        if (!originOk(req)) { sendJson(res, 403, { error: 'bad origin' }); return; }
        const body = JSON.parse(await readBody(req)) as { theme?: unknown };
        const name = typeof body.theme === 'string' ? body.theme : '';
        if (!name || !PRESETS[name]) {
          sendJson(res, 400, { error: `unknown theme "${name}"` });
          return;
        }
        const target = themeSpecFor(name);
        const svg = await renderDraftFor(name);
        pendingTheme = { name, svg };
        sendJson(res, 200, {
          svg,
          theme: themePayload(target, name),
          fonts: fontFamiliesFor(name),
        });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/theme/commit') {
        if (!originOk(req)) { sendJson(res, 403, { error: 'bad origin' }); return; }
        const body = JSON.parse(await readBody(req)) as {
          theme?: unknown; svg?: string; scene?: unknown; canvas?: unknown;
        };
        const name = typeof body.theme === 'string' ? body.theme : '';
        if (!name || !PRESETS[name]) {
          sendJson(res, 400, { error: `unknown theme "${name}"` });
          return;
        }
        if (typeof body.svg !== 'string' || !body.svg.includes('<svg')) {
          sendJson(res, 400, { error: 'missing svg' });
          return;
        }
        const target = themeSpecFor(name);
        const nextBackground = o.background || target.background;
        const nextCanvas = validCanvas(body.canvas, defaultCanvas(nextBackground, target));
        draftSvg = pendingTheme?.name === name ? pendingTheme.svg : await renderDraftFor(name);
        initialSvg = body.svg;
        theme = target;
        activeThemeName = name;
        background = nextBackground;
        renderCfg = { ...renderCfg, theme: name, background: nextBackground };
        canvas = nextCanvas;
        resumed = true;
        atomicWrite(draftSvgFile, draftSvg);
        atomicWrite(workingSvgFile, body.svg);
        atomicWrite(workingSceneFile, JSON.stringify({
          schema: 1,
          updatedAt: new Date().toISOString(),
          canvas: nextCanvas,
          scene: body.scene ?? null,
        }, null, 2));
        const latest = readJson<Meta>(metaFile) ?? oldMeta;
        if (latest) {
          latest.render = renderCfg;
          latest.canvas = nextCanvas;
          latest.working = { updatedAt: new Date().toISOString() };
          latest.draft = { createdAt: new Date().toISOString(), canvas: defaultCanvas(nextBackground, target) };
          atomicWrite(metaFile, JSON.stringify(latest, null, 2));
        }
        pendingTheme = null;
        sendJson(res, 200, {
          ok: true,
          theme: themePayload(target, name),
          fonts: fontFamiliesFor(name),
          canvas: nextCanvas,
        });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/save') {
        if (!originOk(req)) { sendJson(res, 403, { error: 'bad origin' }); return; }
        const body = JSON.parse(await readBody(req)) as {
          svg?: string; scene?: unknown; canvas?: unknown;
        };
        if (typeof body.svg !== 'string' || !body.svg.includes('<svg')) {
          sendJson(res, 400, { error: 'missing svg' });
          return;
        }
        const nextCanvas = validCanvas(body.canvas, canvas);
        atomicWrite(workingSvgFile, body.svg);
        atomicWrite(workingSceneFile, JSON.stringify({
          schema: 1,
          updatedAt: new Date().toISOString(),
          canvas: nextCanvas,
          scene: body.scene ?? null,
        }, null, 2));
        const latest = readJson<Meta>(metaFile) ?? oldMeta;
        if (latest) {
          latest.canvas = nextCanvas;
          latest.working = { updatedAt: new Date().toISOString() };
          atomicWrite(metaFile, JSON.stringify(latest, null, 2));
        }
        initialSvg = body.svg;
        resumed = true;
        canvas = nextCanvas;
        sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/draft-scene') {
        if (!originOk(req)) { sendJson(res, 403, { error: 'bad origin' }); return; }
        const body = JSON.parse(await readBody(req)) as {
          scene?: unknown; canvas?: unknown;
        };
        if (!fs.existsSync(draftSceneFile)) {
          const nextCanvas = validCanvas(body.canvas, canvas);
          atomicWrite(draftSceneFile, JSON.stringify({
            schema: 1,
            createdAt: new Date().toISOString(),
            canvas: nextCanvas,
            scene: body.scene ?? null,
          }, null, 2));
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/restore-draft') {
        if (!originOk(req)) { sendJson(res, 403, { error: 'bad origin' }); return; }
        const latest = readJson<Meta>(metaFile);
        draftSvg = fs.existsSync(draftSvgFile) ? fs.readFileSync(draftSvgFile, 'utf8') : draftSvg;
        const restoredCanvas = validCanvas(latest?.draft?.canvas, defaultCanvas(background, theme));
        atomicWrite(workingSvgFile, draftSvg);
        if (latest) {
          latest.canvas = restoredCanvas;
          latest.working = { updatedAt: new Date().toISOString() };
          atomicWrite(metaFile, JSON.stringify(latest, null, 2));
        }
        canvas = restoredCanvas;
        sendJson(res, 200, { svg: draftSvg, canvas });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/export/png') {
        if (!originOk(req)) { sendJson(res, 403, { error: 'bad origin' }); return; }
        const body = JSON.parse(await readBody(req)) as {
          svg?: string; scale?: number; transparent?: boolean;
        };
        if (typeof body.svg !== 'string' || !body.svg.includes('<svg')) {
          sendJson(res, 400, { error: 'missing svg' });
          return;
        }
        const r = await startRenderer();
        const png = await r.screenshotSvg(body.svg, {
          scale: typeof body.scale === 'number' ? body.scale : scale,
          transparent: !!body.transparent,
        });
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
          'Content-Length': png.length,
        });
        res.end(png);
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/health') {
        sendJson(res, 200, { ok: true, port: listeningPort });
        return;
      }

      sendText(res, 404, 'not found');
    })().catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) {
        sendJson(res, 500, { error: message });
      } else {
        res.end();
      }
      process.stderr.write(`mmdx edit: ${message}\n`);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(o.port, '127.0.0.1', () => {
      const addr = server.address();
      listeningPort = typeof addr === 'object' && addr ? addr.port : o.port;
      resolve();
    });
  });
  const url = `http://127.0.0.1:${listeningPort}/?token=${encodeURIComponent(token)}`;

  process.stderr.write(
    `mmdx edit ${version}  ${o.input}${o.index ? ` #${o.index}` : ''}\n` +
    `  theme   ${theme.name}${o.tone ? ` · ${o.tone}` : ''}\n` +
    `  project ${projectDir}\n` +
    `  ${resumed ? 'resumed working.svg' : 'opened draft.svg'}${warned.length ? ` (${warned.join('; ')})` : ''}\n` +
    `  ${url}\n` +
    '  Ctrl+C stops the server\n',
  );
  if (!o.noOpen) openBrowser(url);

  const shutdown = async (reason: string): Promise<void> => {
    process.stderr.write(`mmdx edit: ${reason}, closing\n`);
    server.close();
    if (renderer) await renderer.close().catch(() => {});
  };
  const onSignal = (): void => { void shutdown('stopping'); };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  return await new Promise<number>((resolve) => {
    server.once('close', () => {
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      resolve(0);
    });
  });
}
