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
import { scanLimits, type LimitHit } from './limits.ts';
import { Renderer } from './render.ts';
import { applyBrand, DEFAULT_TOKENS, type Tokens } from './tokens.ts';
import { applySlideDensity, DEFAULT_THEME, deepMerge, PRESETS, SIZE_PRESETS, type SizePreset } from './themes.ts';

let VERSION = '1.1.0';

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
  mmdx <file.md|file.mmd>... [-o OUT] [options]
  mmdx - < [options]                render mermaid from stdin

Input:
  file.md   every fenced block is rendered: \`\`\`mermaid diagrams, plus
            table/list/card/chart/kpi/compare/funnel/task/progress/swimlane/gauge/vs/heatmap
            extension blocks as styled PNG
  file.mmd  a single mermaid diagram
  -         mermaid source from stdin (single diagram)

Options:
  -o, --out <path>        output directory, or exact .svg/.png file when the
                          input renders exactly one diagram (default: next to input)
  -f, --format <fmt>      svg | png | both                     (default: both;
                          --preset defaults to png)
  -t, --theme <name>      tech (default) | openai | openai-dark | minimal |
                          latte | mocha | sketch                (default: tech)
  --preset <name>         slide | a4 | square  (width+scale+png; explicit
                          --width/--scale/-f win). slide=1600px@2, a4=900px@2,
                          square=1080px@2; slide also enlarges type, spacing,
                          and stroke weight for projection
  --background <color>    page background, e.g. white | transparent | #1A1A1A
  --scale <n>             PNG scale factor                     (default: 2)
  --width <px>            layout viewport width                (default: 1200)
  --layout <engine>       elk (default, better routing) | dagre
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
  --config <file.json>    extra Mermaid config, deep-merged over the theme
  --theme-js <file.js>    JS theming: file body is a function (config, ctx)
                          returning the modified config
  --css <file.css>        extra CSS appended to the theme's themeCSS
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
  mmdx a.md b.md -o dist/ -t mocha
  mmdx diagram.mmd -o out/diagram.svg     # writes out/diagram.svg + out/diagram.png
  echo "graph LR; A-->B" | mmdx - -f svg
`;

interface Options {
  inputs: string[];
  out: string | null;
  format: 'svg' | 'png' | 'both';
  formatExplicit: boolean;
  theme: string;
  preset: SizePreset | null;
  background: string | null;
  scale: number;
  scaleExplicit: boolean;
  width: number;
  widthExplicit: boolean;
  layout: 'elk' | 'dagre';
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
    preset: null, background: null,
    scale: 2, scaleExplicit: false, width: 1200, widthExplicit: false,
    layout: 'elk', title: null, subtitle: null, source: null, unit: null,
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
      case '--preset': {
        const v = need(argv[++i], a);
        if (!(v in SIZE_PRESETS)) {
          console.error(`mmdx: --preset must be slide|a4|square, got "${v}"`);
          process.exit(2);
        }
        o.preset = v as SizePreset;
        break;
      }
      case '--background': o.background = need(argv[++i], a); break;
      case '--scale': o.scale = parseFloat(need(argv[++i], a)); o.scaleExplicit = true; break;
      case '--width': o.width = parseInt(need(argv[++i], a), 10); o.widthExplicit = true; break;
      case '--layout': o.layout = need(argv[++i], a) as Options['layout']; break;
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

function applyThemeJs(src: string, config: Record<string, unknown>, ctx: Record<string, unknown>): Record<string, unknown> {
  const body = src.replace(/^\s*export\s+default\s+/m, 'return ');
  const factory = new Function('config', 'ctx', `"use strict";\n${body}`) as
    (c: Record<string, unknown>, x: Record<string, unknown>) => unknown;
  const out = factory(config, ctx);
  const resolved = typeof out === 'function'
    ? (out as (c: Record<string, unknown>, x: Record<string, unknown>) => unknown)(config, ctx)
    : out;
  if (!resolved || typeof resolved !== 'object') {
    throw new Error('--theme-js must return (a function returning) the config object');
  }
  return resolved as Record<string, unknown>;
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

async function main(): Promise<void> {
  VERSION = await getBuildVersion();
  const o = parseArgs(process.argv.slice(2));

  if (!PRESETS[o.theme]) {
    console.error(`mmdx: unknown theme "${o.theme}" (available: ${Object.keys(PRESETS).join(', ')})`);
    process.exit(2);
  }

  let tokens: Tokens = DEFAULT_TOKENS;
  const brandWarnings: string[] = [];
  if (o.brand) {
    try {
      const br = applyBrand(o.brand);
      tokens = br.tokens;
      if (br.warning) {
        brandWarnings.push(br.warning);
        log(o.quiet || o.json, `mmdx: ${br.warning}`);
      }
    } catch (e) {
      console.error(`mmdx: ${(e as Error).message}`);
      process.exit(2);
    }
  }

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
  let config = JSON.parse(JSON.stringify(preset.config)) as Record<string, unknown>;
  if (o.preset === 'slide') applySlideDensity(config);
  if (o.themeJs) {
    config = applyThemeJs(fs.readFileSync(o.themeJs, 'utf8'), config, { theme: o.theme });
  }
  if (o.config) {
    config = deepMerge(config, JSON.parse(fs.readFileSync(o.config, 'utf8')) as Record<string, unknown>);
  }
  if (o.css) {
    config.themeCSS = ((config.themeCSS as string) || '') + '\n' + fs.readFileSync(o.css, 'utf8');
  }

  const background = o.background || preset.background;
  const iconPacks = await Promise.all(o.icons.map(fetchIconPack));

  const pageOptsBase: PageOpts = {
    wrapWidth: o.preset ? o.width : undefined,
    density: o.preset === 'slide' ? 'slide' : 'standard',
    tokens,
  };

  const wrapMermaid = chromeOn || !!o.preset;

  const assets = await loadAssets();
  const renderer = await Renderer.create(assets, {
    browserPath: o.browser || undefined,
    layout: o.layout,
    scale: o.scale,
    width: o.width,
    iconPacks,
    profile: o.profile,
  });

  const results: Array<{ input: string; index: number; files: string[]; error?: string; warnings: JsonWarning[] }> = [];
  let cursor = 0;
  const jobs = Math.min(o.jobs, selected.length);

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
          const { svg } = await renderer.render(mermaid, config, background, false, 'top', '', preset.remap);
          const html = blockPage(`<div class="fig">${svg}</div>`, { ...pageOptsBase, caption: cap });
          const png = await renderer.renderHtml(html, background, label);
          return { files: writePngOnly(b, png), warnings };
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

        if (wrapMermaid) {
          const { svg } = await renderer.render(b.code, config, background, false, 'top', '', preset.remap);
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

        const { svg, png } = await renderer.render(
          b.code, config, background, wantPng, o.titlePos, frontTitle(b.code), preset.remap,
        );
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
        results.push({ input: b.input, index: b.index, files: out.files, warnings: out.warnings });
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
      theme: o.theme, layout: o.layout, format: o.format, background,
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
        `[theme=${o.theme} layout=${o.layout}]\n`,
      );
    }
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('mmdx:', e.message); process.exit(1); });
