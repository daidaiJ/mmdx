#!/usr/bin/env bun
// mmdx — Mermaid → SVG/PNG exporter tuned for AI agents.
// Reads fenced blocks from Markdown (or .mmd / stdin), renders via a
// shared Chromium pipeline with themed output.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  blockPage, captionPresent, fenceKind, htmlKindToInner, HTML_KINDS,
  mergeCaption, type BlockKind, type Caption, type PageOpts,
} from './blocks.ts';
import { chartToMermaid, parseChart } from './chart.ts';
import { getBuildVersion, loadAssets } from './embed.ts';
import { MONO_FAMILY } from './fonts.ts';
import { scanColumnHints, scanLimits, type LimitHit } from './limits.ts';
import { Renderer } from './render.ts';
import { accentTint, applyBrand, type Tokens } from './tokens.ts';
import {
  applyBrandToTheme, applyColumnDensity, applySlideDensity, DEFAULT_THEME, deepMerge, getTheme, paperize, peleConfig,
  PRESETS, SIZE_PRESETS, type SizePreset, type ThemeSpec,
} from './themes.ts';
import { isToneName, type ToneName } from './tone.ts';
import type { IconPack } from './engine/types.ts';

let VERSION = '3.0.0';

type Optimize = (svg: string, opts: unknown) => { data: string };
let svgoOptimize: Optimize | null = null;
let svgoWarned = false;
try {
  svgoOptimize = (await import('svgo/browser')).optimize as unknown as Optimize;
} catch {
  svgoOptimize = null;
}

const help = () => `
mmdx ${VERSION} — render Mermaid diagrams to SVG + PNG, styled for docs

Usage:
  mmdx <file.md|file.mmd|file.html>... [-o OUT] [options]
  mmdx - < [options]                render mermaid from stdin
  mmdx card --in <file.md> [-o OUT] [options]
                                    render a Markdown/URL info card (PNG)

Input:
  file.md   every fenced block is rendered: \`\`\`mermaid diagrams, plus
            table/list/card/chart/kpi/compare/funnel/task/progress/swimlane/gauge/vs/heatmap
            extension blocks as styled PNG
  file.mmd  a single mermaid diagram
  file.html a standalone HTML page screenshotted as-is (fullPage, PNG only);
            keeps its own styles/scripts/background, --width is the layout
            viewport (an explicit body width wins). The bundled CJK font is
            registered as 'Noto Sans SC' and fills CJK glyphs through the
            sans-serif/serif fallbacks, so Chinese stays offline-consistent;
            declared webfonts still win
  -         mermaid source from stdin (single diagram)

Options:
  -o, --out <path>        output directory, or exact .svg/.png file when the
                          input renders exactly one diagram (default: next to input)
  -f, --format <fmt>      svg | png | both                     (default: both;
                          --preset defaults to png)
  -t, --theme <name>      tech (default) | openai | excalidraw | ios | acnh | epaper | zed | zed-light
  --tone <name>           paper | neutral | product — structural overrides for
                          block pages and info cards (radius/shadow/display type);
                          paper also repaints the diagram onto paper stock
  --style-fill <mode>     solid (default) | hachure — excalidraw only
  --preset <name>         slide | a4 | square | column  (width+scale+png; explicit
                          --width/--scale/-f win). slide=1600px@2, a4=900px@2,
                          square=1080px@2; slide also enlarges type, spacing,
                          and stroke weight for projection; column=800px@2
                          (2K office ~1/3 column, tighter wrap)
  --background <color>    page background, e.g. white | transparent | #1A1A1A
  --scale <n>             PNG scale factor                     (default: 2)
  --width <px>            layout viewport width                (default: 1200)
  --svg-themeable         keep --pele-* CSS variables in SVG output; default
                          bakes resolved paint so Office/PPT can open it
  --title <text>          figure title (PNG chrome; no mermaid frontmatter)
  --subtitle <text>       figure subtitle under the title
  --source <text>         source line in the footer
  --unit <text>           unit line in the footer
  --title-pos <pos>       top (default) | bottom  (chrome title above/below)
  --index <n[,n…]>        render only these 1-based block indexes
  --brand <hex>           accent color for extension blocks (#2563EB or 2563EB).
                          Does not recolor flowchart shape coding
  --icon <pack>           iconify pack for @{icon: pack:name} nodes (repeatable,
                          fetched from unpkg and cached)
  --config <file.json>    pele: fontSize / padding / flowchart spacing
  --theme-js <file.js>    v2 JS theming: file body is (theme, ctx) => theme,
                          where theme is a ThemeSpec ({ vars, shapes, ... })
  --css <file.css>        extra CSS appended to the theme CSS
  --strict-chart          treat mermaid pie/xychart/radar/flowchart/sequence
                          budget hits as errors (default: warn)
  --browser <path>        browser executable override (default: auto-detect Edge/Chrome)
  --jobs <n>              max diagrams rendered in parallel    (default: 2)
  --profile               per-stage timing summary on stderr / in --json
  --list                  list the mermaid blocks found and exit
  --json                  machine-readable result (one JSON on stdout)
  -q, --quiet             suppress progress lines on stderr
  -h, --help              show this help
  -v, --version           show version

Examples:
  mmdx README.md                          # README-m1.(svg|png), README-m2.(svg|png)...
  mmdx report.md --preset slide --title "Q1 构成" --unit 万元
  mmdx a.md b.md -o dist/ -t openai
  mmdx diagram.mmd -o out/diagram.svg     # writes out/diagram.svg + out/diagram.png
  echo "graph LR; A-->B" | mmdx - -f svg
  mmdx card --in note.md -t openai --tone neutral -o note-card.png
  mmdx card --url https://example.com/post -t excalidraw --width 600
`;

interface Options {
  inputs: string[];
  out: string | null;
  format: 'svg' | 'png' | 'both';
  formatExplicit: boolean;
  theme: string;
  tone: ToneName | null;
  styleFill: 'solid' | 'hachure' | null;
  preset: SizePreset | null;
  background: string | null;
  scale: number;
  scaleExplicit: boolean;
  width: number;
  widthExplicit: boolean;
  svgThemeable: boolean;
  title: string | null;
  subtitle: string | null;
  source: string | null;
  unit: string | null;
  titlePos: 'top' | 'bottom';
  index: string | null;
  brand: string | null;
  icons: string[];
  config: string | null;
  themeJs: string | null;
  css: string | null;
  strictChart: boolean;
  browser: string | null;
  jobs: number;
  profile: boolean;
  list: boolean;
  json: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    inputs: [], out: null, format: 'both', formatExplicit: false, theme: DEFAULT_THEME,
    tone: null, styleFill: null,
    preset: null, background: null,
    scale: 2, scaleExplicit: false, width: 1200, widthExplicit: false,
    svgThemeable: false,
    title: null, subtitle: null, source: null, unit: null,
    titlePos: 'top', index: null, brand: null, icons: [],
    config: null, themeJs: null, css: null, strictChart: false, browser: null,
    jobs: 2, profile: false, list: false, json: false, quiet: false,
  };
  const need = (v: string | undefined, name: string): string => {
    if (v === undefined) { console.error(`mmdx: missing value for ${name}`); process.exit(2); }
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-o': case '--out': o.out = need(argv[++i], a); break;
      case '-f': case '--format':
        o.format = need(argv[++i], a) as Options['format'];
        o.formatExplicit = true;
        break;
      case '-t': case '--theme': o.theme = need(argv[++i], a); break;
      case '--tone': {
        const v = need(argv[++i], a);
        if (!isToneName(v)) {
          console.error(`mmdx: --tone must be paper|neutral|product, got "${v}"`);
          process.exit(2);
        }
        o.tone = v;
        break;
      }
      case '--style-fill': {
        const v = need(argv[++i], a);
        if (v !== 'solid' && v !== 'hachure') {
          console.error(`mmdx: --style-fill must be solid|hachure, got "${v}"`);
          process.exit(2);
        }
        o.styleFill = v;
        break;
      }
      case '--preset': {
        const v = need(argv[++i], a);
        if (!(v in SIZE_PRESETS)) {
          console.error(`mmdx: --preset must be slide|a4|square|column, got "${v}"`);
          process.exit(2);
        }
        o.preset = v as SizePreset;
        break;
      }
      case '--background': o.background = need(argv[++i], a); break;
      case '--scale': o.scale = parseFloat(need(argv[++i], a)); o.scaleExplicit = true; break;
      case '--width': o.width = parseInt(need(argv[++i], a), 10); o.widthExplicit = true; break;
      case '--svg-themeable': o.svgThemeable = true; break;
      case '--title': o.title = need(argv[++i], a); break;
      case '--subtitle': o.subtitle = need(argv[++i], a); break;
      case '--source': o.source = need(argv[++i], a); break;
      case '--unit': o.unit = need(argv[++i], a); break;
      case '--title-pos': o.titlePos = need(argv[++i], a) as Options['titlePos']; break;
      case '--index': o.index = need(argv[++i], a); break;
      case '--brand': o.brand = need(argv[++i], a); break;
      case '--icon': o.icons.push(need(argv[++i], a)); break;
      case '--config': o.config = need(argv[++i], a); break;
      case '--theme-js': o.themeJs = need(argv[++i], a); break;
      case '--css': o.css = need(argv[++i], a); break;
      case '--strict-chart': o.strictChart = true; break;
      case '--browser': o.browser = need(argv[++i], a); break;
      case '--jobs': o.jobs = Math.max(1, parseInt(need(argv[++i], a), 10)); break;
      case '--profile': o.profile = true; break;
      case '--list': o.list = true; break;
      case '--json': o.json = true; break;
      case '-q': case '--quiet': o.quiet = true; break;
      case '-h': case '--help': process.stdout.write(help()); process.exit(0); break;
      case '-v': case '--version': console.log(VERSION); process.exit(0); break;
      default:
        if (a.startsWith('-') && a !== '-') {
          console.error(`mmdx: unknown option ${a}`);
          process.exit(2);
        }
        o.inputs.push(a);
    }
  }
  if (!o.inputs.length) { process.stdout.write(help()); process.exit(2); }
  if (!['svg', 'png', 'both'].includes(o.format)) {
    console.error(`mmdx: --format must be svg|png|both, got "${o.format}"`);
    process.exit(2);
  }
  if (o.preset) {
    const p = SIZE_PRESETS[o.preset];
    if (!o.widthExplicit) o.width = p.width;
    if (!o.scaleExplicit) o.scale = p.scale;
    if (!o.formatExplicit) o.format = 'png';
  }
  return o;
}

interface Block {
  input: string;
  base: string;
  index: number;
  line: number;
  code: string;
  kind: BlockKind;
}

const FENCE_RE = /^[ \t]*```([A-Za-z0-9_-]+)[^\n]*\n([\s\S]*?)^[ \t]*```\s*$/gm;

function extractBlocks(input: string, raw: string): Block[] {
  if (/\.html?$/i.test(input)) {
    // authored HTML document: shot as-is, never a fence kind in .md files
    const code = raw.trim();
    const base = path.basename(input).replace(/\.html?$/i, '');
    return code ? [{ input, base, index: 1, line: 1, code, kind: 'html' }] : [];
  }
  const isMd = /\.md$|\.markdown$/i.test(input);
  if (isMd) {
    const blocks: Block[] = [];
    const base = path.basename(input).replace(/\.(md|markdown)$/i, '');
    FENCE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FENCE_RE.exec(raw)) !== null) {
      const kind = fenceKind(m[1]);
      if (kind === 'unknown') continue;
      const code = m[2].replace(/\r\n/g, '\n').trim();
      if (!code) continue;
      const line = raw.slice(0, m.index).split('\n').length;
      blocks.push({ input, base, index: blocks.length + 1, line, code, kind });
    }
    return blocks;
  }
  const code = raw.trim();
  const base = input === '-' ? 'diagram' : path.basename(input).replace(/\.(md|markdown|mmd)$/i, '');
  return code ? [{ input, base, index: 1, line: 1, code, kind: 'mermaid' }] : [];
}

function frontTitle(code: string): string {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(code);
  if (!m) return '';
  const t = /^title:\s*(.+)$/m.exec(m[1]);
  return t ? t[1].trim().replace(/^["']|["']$/g, '') : '';
}

const log = (quiet: boolean, msg: string): void => {
  if (!quiet) process.stderr.write(msg + '\n');
};

async function fetchIconPack(name: string): Promise<{ name: string; json: string }> {
  const cacheDir = path.join(os.tmpdir(), 'mmdx-icons');
  const cacheFile = path.join(cacheDir, `${name}.json`);
  try {
    return { name, json: fs.readFileSync(cacheFile, 'utf8') };
  } catch { /* cache miss */ }
  const url = `https://unpkg.com/@iconify-json/${name}/icons.json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`icon pack "${name}" not found (${res.status} from ${url})`);
  const json = await res.text();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, json);
  return { name, json };
}

const THEME_JS_HINT =
  '--theme-js v2 receives a ThemeSpec, not a Mermaid config. ' +
  'Use theme.vars.accent / theme.shapes.process / theme.css; see docs/HUMAN_GUIDE.md#主题定制';

function applyThemeJs(src: string, theme: ThemeSpec, ctx: Record<string, unknown>): ThemeSpec {
  let body = src.replace(/^\s*export\s+default\s+/m, 'return ');
  // Accept both `(theme) => {...}` and a body that returns the theme.
  if (/^\s*(?:\(|function\b|async\b)/.test(body) && !/^\s*return\b/.test(body)) {
    body = `return ${body}`;
  }
  const factory = new Function('theme', 'ctx', `"use strict";\n${body}`) as
    (t: ThemeSpec, x: Record<string, unknown>) => unknown;
  try {
    const out = factory(theme, ctx);
    const resolved = typeof out === 'function'
      ? (out as (t: ThemeSpec, x: Record<string, unknown>) => unknown)(theme, ctx)
      : out;
    return validateThemeJs(resolved, theme);
  } catch (e) {
    throw new Error(`${THEME_JS_HINT}\n${(e as Error).message}`);
  }
}

function validateThemeJs(resolved: unknown, base: ThemeSpec): ThemeSpec {
  const t = resolved as Partial<ThemeSpec> | null;
  if (!t || typeof t !== 'object' || !t.vars || !t.shapes) {
    throw new Error(THEME_JS_HINT);
  }
  const shapes = (t.shapes ?? {}) as Partial<ThemeSpec['shapes']>;
  return {
    ...base,
    ...t,
    vars: {
      ...base.vars,
      ...t.vars,
      series: t.vars.series?.length ? t.vars.series : base.vars.series,
    },
    shapes: {
      process: { ...base.shapes.process, ...shapes.process },
      decision: { ...base.shapes.decision, ...shapes.decision },
      state: { ...base.shapes.state, ...shapes.state },
      store: { ...base.shapes.store, ...shapes.store },
      cluster: shapes.cluster ? { ...base.shapes.cluster!, ...shapes.cluster } : base.shapes.cluster,
    },
    name: t.name ?? base.name,
    background: t.background ?? base.background,
    css: t.css ?? base.css,
  };
}

function minifySvg(svg: string, label: string, quiet: boolean, json: boolean, renderer: Renderer, profile: boolean): string {
  if (!svgoOptimize && !svgoWarned) {
    svgoWarned = true;
    process.stderr.write('mmdx: svgo unavailable — writing SVG without minification\n');
  }
  if (!svgoOptimize) return svg;
  const tSvgo = performance.now();
  try {
    const optimized = svgoOptimize(svg, {
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: { overrides: {
            mergePaths: false,
            collapseGroups: false,
            convertShapeToPath: false,
            convertPathData: false,
            inlineStyles: false,
          } },
        },
      ],
    }).data;
    if (profile) renderer.profile.push({ stage: 'svgo', ms: Math.round(performance.now() - tSvgo), label });
    return optimized;
  } catch {
    log(quiet || json, `mmdx: ${label} svgo failed, writing unminified svg`);
    if (profile) renderer.profile.push({ stage: 'svgo', ms: Math.round(performance.now() - tSvgo), label });
    return svg;
  }
}

interface JsonWarning {
  input: string;
  index: number;
  code: string;
  message: string;
}

/** CSS px width mermaid wrote on the root svg (after our viewBox rewrite). */
function svgUserWidth(svg: string): number | null {
  const tag = /<svg\b[^>]*>/.exec(svg)?.[0];
  if (!tag) return null;
  const wAttr = /\bwidth="([\d.]+)(?:px)?"/.exec(tag);
  if (wAttr) {
    const n = Number(wAttr[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const vb = /\bviewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+[-\d.]+/.exec(tag);
  if (vb) {
    const n = Number(vb[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function columnShrinkHit(input: string, index: number, svg: string, colW: number): JsonWarning | null {
  const w = svgUserWidth(svg);
  if (w == null || w <= colW * 1.05) return null;
  return {
    input,
    index,
    code: 'column-shrink',
    message: `diagram intrinsic width ${Math.round(w)}px exceeds column ${colW}px and will be scaled down; use flowchart TD, fewer nodes, or --preset a4`,
  };
}

async function main(): Promise<void> {
  VERSION = await getBuildVersion();
  if (process.argv[2] === 'card') {
    const { runCardCommand } = await import('./card.ts');
    process.exit(await runCardCommand(process.argv.slice(3), VERSION));
  }
  const o = parseArgs(process.argv.slice(2));

  if (!PRESETS[o.theme]) {
    console.error(`mmdx: unknown theme "${o.theme}" (available: ${Object.keys(PRESETS).join(', ')})`);
    process.exit(2);
  }

  const configWarnings: string[] = [];
  const brandWarnings: string[] = [];
  let theme = getTheme(o.theme);
  if (o.tone === 'paper') theme = paperize(theme);
  if (o.styleFill) {
    if (theme.name === 'excalidraw') {
      theme.style = { ...(theme.style ?? {}), fillStyle: o.styleFill };
    } else {
      configWarnings.push(`--style-fill only applies to the excalidraw theme; ignored for "${theme.name}"`);
    }
  }
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
  if (o.brand) {
    try {
      const br = applyBrand(o.brand);
      applyBrandToTheme(theme, br.tokens.accent);
      if (br.warning) {
        brandWarnings.push(br.warning);
        log(o.quiet || o.json, `mmdx: ${br.warning}`);
      }
    } catch (e) {
      console.error(`mmdx: ${(e as Error).message}`);
      process.exit(2);
    }
  }
  let rawConfig: Record<string, unknown> | null = null;
  if (o.config) {
    try {
      rawConfig = JSON.parse(fs.readFileSync(o.config, 'utf8')) as Record<string, unknown>;
    } catch (e) {
      console.error(`mmdx: cannot read --config: ${(e as Error).message}`);
      process.exit(2);
    }
    const mapped = peleConfig(rawConfig);
    configWarnings.push(...mapped.warnings);
    if (mapped.fontSize !== undefined) fontSize = mapped.fontSize;
    if (mapped.padding !== undefined) padding = mapped.padding;
    if (mapped.flowchart) flowchart = { ...flowchart, ...mapped.flowchart };
  }
  if (o.themeJs) {
    try {
      theme = applyThemeJs(fs.readFileSync(o.themeJs, 'utf8'), theme, { theme: o.theme });
    } catch (e) {
      console.error(`mmdx: ${(e as Error).message}`);
      process.exit(2);
    }
  }
  if (o.css) {
    const extra = fs.readFileSync(o.css, 'utf8');
    theme.css = theme.css ? `${theme.css}\n${extra}` : extra;
  }
  const tokens: Tokens = {
    paper: theme.vars.bg,
    ink: theme.vars.fg,
    muted: theme.vars.muted,
    rule: theme.vars.border,
    accent: theme.vars.accent,
    accentTint: accentTint(theme.vars.accent, theme.vars.bg),
    paper2: theme.vars.surfaceAlt,
  };
  for (const w of configWarnings) log(o.quiet || o.json, `mmdx: ${w}`);

  const cliCaption: Caption = {
    title: o.title, subtitle: o.subtitle, source: o.source, unit: o.unit, titlePos: o.titlePos,
  };
  const chromeOn = captionPresent(cliCaption);

  const blocks: Block[] = [];
  for (const input of o.inputs) {
    let raw: string;
    if (input === '-') {
      raw = fs.readFileSync(0, 'utf8');
    } else {
      const p = path.resolve(input);
      if (!fs.existsSync(p)) { console.error(`mmdx: input not found: ${p}`); process.exit(2); }
      raw = fs.readFileSync(p, 'utf8');
    }
    const found = extractBlocks(input, raw);
    if (!found.length) log(o.quiet, `mmdx: no mermaid blocks in ${input}`);
    blocks.push(...found);
  }

  if (o.list) {
    for (const b of blocks) {
      console.log(`${b.input}\t${b.index}\tline ${b.line}\t${b.code.split('\n')[0].slice(0, 64)}`);
    }
    process.exit(0);
  }
  if (!blocks.length) { console.error('mmdx: no mermaid blocks found'); process.exit(1); }

  const selected = o.index
    ? (() => {
      const want = new Set(o.index.split(',').map((s) => parseInt(s.trim(), 10)));
      const picked = blocks.filter((b) => want.has(b.index));
      if (!picked.length) {
        console.error(`mmdx: --index ${o.index} matches none of the blocks`);
        process.exit(2);
      }
      return picked;
    })()
    : blocks;

  const exact =
    o.out && selected.length === 1 && /\.(svg|png)$/i.test(o.out) ? path.resolve(o.out) : null;
  const dir = exact ? path.dirname(exact) : o.out ? path.resolve(o.out) : path.dirname(path.resolve(selected[0].input === '-' ? '.' : selected[0].input));
  fs.mkdirSync(dir, { recursive: true });
  const outFileFor = (b: Block, ext: string): string => {
    if (exact) return exact.replace(/\.(svg|png)$/i, `.${ext}`);
    const keepStem = (selected.length === 1 && !o.index) || b.input.endsWith('.mmd');
    const stem = keepStem ? b.base : `${b.base}-m${b.index}`;
    return path.join(dir, `${stem}.${ext}`);
  };

  const preset = PRESETS[o.theme];
  let mermaidConfig = JSON.parse(JSON.stringify(preset.config)) as Record<string, unknown>;
  if (o.preset === 'slide') applySlideDensity(mermaidConfig);
  else if (o.preset === 'column') applyColumnDensity(mermaidConfig);
  if (rawConfig) mermaidConfig = deepMerge(mermaidConfig, rawConfig);
  if (o.css) {
    mermaidConfig.themeCSS = ((mermaidConfig.themeCSS as string) || '') + '\n' + fs.readFileSync(o.css, 'utf8');
  }

  const background = o.background || theme.background;
  const iconPacks: IconPack[] = await Promise.all(o.icons.map(fetchIconPack));

  const pageOptsBase: PageOpts = {
    wrapWidth: o.preset ? o.width : undefined,
    density: o.preset === 'slide' ? 'slide' : o.preset === 'column' ? 'column' : 'standard',
    tokens,
    blockCss: theme.blockCss,
    tone: o.tone ?? undefined,
  };

  const wrapMermaid = chromeOn || !!o.preset;

  const assets = await loadAssets();
  const renderer = await Renderer.create(assets, {
    browserPath: o.browser || undefined,
    scale: o.scale,
    width: o.width,
    fonts: [...(theme.fonts ?? []), MONO_FAMILY],
    iconPacks,
    profile: o.profile,
  });

  const results: Array<{
    input: string; index: number; files: string[];
    error?: string; warnings: JsonWarning[];
  }> = [];
  let cursor = 0;
  const jobs = Math.min(o.jobs, selected.length);

  const renderDiagram = async (
    code: string,
    needPng: boolean,
    label: string,
    titleText = '',
  ): Promise<{ svg: string; png?: Buffer }> => {
    return renderer.render({
      code, background, needPng, scale: o.scale, width: o.width,
      theme, mermaidConfig, fontSize, padding, flowchart,
      svgThemeable: o.svgThemeable, titlePos: o.titlePos, titleText,
      remap: preset.remap, iconPacks,
    });
  };

  const writePngOnly = (b: Block, png: Buffer, note?: string): string[] => {
    if (o.format === 'svg') {
      process.stderr.write(note || `mmdx: ${b.input}#${b.index} ${b.kind} renders to PNG only; writing PNG\n`);
    }
    const f = outFileFor(b, 'png');
    fs.writeFileSync(f, png);
    return [f];
  };

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = cursor++;
      if (i >= selected.length) return;
      const b = selected[i];
      const label = `${b.input}#${b.index}`;
      const wantPng = o.format === 'both' || o.format === 'png';
      const wantSvg = o.format === 'both' || o.format === 'svg';

      const attempt = async (): Promise<{ files: string[]; warnings: JsonWarning[] }> => {
        const warnings: JsonWarning[] = [];

        if (b.kind === 'chart') {
          const spec = parseChart(b.code);
          const mermaid = chartToMermaid(spec);
          const cap = mergeCaption(cliCaption, { title: spec.title, source: spec.source, unit: spec.unit });
          const { svg } = await renderDiagram(mermaid, false, label);
          if (o.preset === 'column') {
            const hit = columnShrinkHit(b.input, b.index, svg, o.width);
            if (hit) {
              warnings.push(hit);
              log(o.quiet || o.json, `mmdx: ${label} ${hit.message}`);
            }
          }
          const html = blockPage(`<div class="fig">${svg}</div>`, { ...pageOptsBase, caption: cap });
          const png = await renderer.renderHtml(html, background, label);
          return { files: writePngOnly(b, png), warnings };
        }

        if (b.kind === 'html') {
          // authored document: keep its own background unless --background
          const png = await renderer.renderDocument(b.code, o.background, label);
          const lint = renderer.docLintWarnings.map((w) => {
            const i = w.indexOf(':');
            return { input: b.input, index: b.index, code: w.slice(0, i), message: w.slice(i + 2) };
          });
          return { files: writePngOnly(b, png), warnings: lint };
        }

        if (HTML_KINDS.has(b.kind)) {
          const inner = htmlKindToInner(b.kind, b.code);
          const html = blockPage(inner, { ...pageOptsBase, caption: cliCaption });
          const png = await renderer.renderHtml(html, background, label);
          return { files: writePngOnly(b, png), warnings };
        }

        const hits: LimitHit[] = scanLimits(b.code);
        for (const h of hits) {
          warnings.push({ input: b.input, index: b.index, code: h.code, message: h.message });
          log(o.quiet || o.json, `mmdx: ${label} ${h.message}`);
        }
        if (o.strictChart && hits.length) {
          throw new Error(hits.map((h) => h.message).join('; '));
        }
        if (o.preset === 'column') {
          for (const h of scanColumnHints(b.code)) {
            warnings.push({ input: b.input, index: b.index, code: h.code, message: h.message });
            log(o.quiet || o.json, `mmdx: ${label} ${h.message}`);
          }
        }

        if (wrapMermaid) {
          const { svg } = await renderDiagram(b.code, false, label);
          if (o.preset === 'column') {
            const hit = columnShrinkHit(b.input, b.index, svg, o.width);
            if (hit) {
              warnings.push(hit);
              log(o.quiet || o.json, `mmdx: ${label} ${hit.message}`);
            }
          }
          const html = blockPage(`<div class="fig">${svg}</div>`, { ...pageOptsBase, caption: cliCaption });
          const files: string[] = [];
          if (wantSvg) {
            const f = outFileFor(b, 'svg');
            fs.writeFileSync(f, minifySvg(svg, label, o.quiet, o.json, renderer, o.profile));
            files.push(f);
          }
          if (wantPng || o.format === 'svg') {
            const png = await renderer.renderHtml(html, background, label);
            if (wantPng) {
              const f = outFileFor(b, 'png');
              fs.writeFileSync(f, png);
              files.push(f);
            } else if (o.format === 'svg' && chromeOn) {
              // chrome is PNG-only; SVG is the diagram
            }
          }
          return { files, warnings };
        }

        const { svg, png } = await renderDiagram(
          b.code, wantPng, label, frontTitle(b.code),
        );
        if (o.preset === 'column') {
          const hit = columnShrinkHit(b.input, b.index, svg, o.width);
          if (hit) {
            warnings.push(hit);
            log(o.quiet || o.json, `mmdx: ${label} ${hit.message}`);
          }
        }
        const files: string[] = [];
        if (wantSvg) {
          const f = outFileFor(b, 'svg');
          fs.writeFileSync(f, minifySvg(svg, label, o.quiet, o.json, renderer, o.profile));
          files.push(f);
        }
        if (png) {
          const f = outFileFor(b, 'png');
          fs.writeFileSync(f, png);
          files.push(f);
        }
        return { files, warnings };
      };

      try {
        let out: { files: string[]; warnings: JsonWarning[] };
        try {
          out = await attempt();
        } catch (first) {
          log(o.quiet || o.json, `mmdx: ${label} retrying after: ${(first as Error).message.split('\n')[0]}`);
          out = await attempt();
        }
        results.push({
          input: b.input, index: b.index, files: out.files, warnings: out.warnings,
        });
        log(o.quiet || o.json, `mmdx: ${label} → ${out.files.length} file(s)`);
      } catch (e) {
        results.push({
          input: b.input, index: b.index, files: [],
          error: e instanceof Error ? e.message : String(e),
          warnings: [],
        });
      }
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
  await renderer.close();

  const failed = results.filter((r) => r.error);
  const written = results.flatMap((r) => r.files);
  const warnings: JsonWarning[] = [
    ...brandWarnings.map((message) => ({ input: '', index: 0, code: 'brand-contrast', message })),
    ...configWarnings.map((message) => ({ input: '', index: 0, code: 'config-ignored', message })),
    ...results.flatMap((r) => r.warnings),
  ];

  const profileSummary = (): Record<string, { count: number; totalMs: number; avgMs: number; maxMs: number; maxLabel: string }> => {
    const out: Record<string, { count: number; totalMs: number; avgMs: number; maxMs: number; maxLabel: string }> = {};
    for (const e of renderer.profile) {
      const k = out[e.stage] ?? (out[e.stage] = { count: 0, totalMs: 0, avgMs: 0, maxMs: 0, maxLabel: '' });
      k.count++; k.totalMs += e.ms;
      if (e.ms > k.maxMs) { k.maxMs = e.ms; k.maxLabel = e.label || ''; }
    }
    for (const k of Object.values(out)) k.avgMs = Math.round(k.totalMs / k.count);
    return out;
  };

  if (o.json) {
    console.log(JSON.stringify({
      theme: o.theme, engine: 'pele', format: o.format, background,
      ...(o.tone ? { tone: o.tone } : {}),
      ...(o.preset ? { preset: o.preset } : {}),
      ...(o.brand ? { brand: tokens.accent } : {}),
      ...(chromeOn ? {
        caption: { title: o.title, subtitle: o.subtitle, source: o.source, unit: o.unit },
      } : {}),
      blocks: blocks.length, rendered: results.length - failed.length,
      failed: failed.length, files: written,
      errors: failed.map((f) => ({ input: f.input, index: f.index, error: f.error })),
      warnings,
      ...(o.profile ? { profile: profileSummary() } : {}),
    }, null, 2));
  } else {
    for (const f of written) console.log(f);
    for (const f of failed) process.stderr.write(`mmdx: ${f.input}#${f.index} failed: ${f.error}\n`);
    if (o.profile) {
      for (const [stage, k] of Object.entries(profileSummary())) {
        process.stderr.write(
          `mmdx: [profile] ${stage.padEnd(16)} n=${String(k.count).padEnd(4)} ` +
          `total=${String(k.totalMs).padEnd(6)}ms avg=${String(k.avgMs).padEnd(5)}ms ` +
          `max=${String(k.maxMs).padEnd(6)}ms (${k.maxLabel})\n`,
        );
      }
    }
    if (!o.quiet) {
      process.stderr.write(
        `mmdx: ${results.length - failed.length}/${results.length} diagram(s) rendered ` +
        `[theme=${o.theme} engine=pele]\n`,
      );
    }
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('mmdx:', e.message); process.exit(1); });
