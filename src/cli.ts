#!/usr/bin/env bun
// mmdx — Mermaid → SVG/PNG exporter tuned for AI agents.
// Reads ```mermaid blocks from Markdown (or .mmd / stdin), renders via a
// shared Chromium pipeline with themed output.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { blockPage, cardToHtml, fenceKind, listToHtml, tableToHtml, type BlockKind } from './blocks.ts';
import { getBuildVersion, loadAssets } from './embed.ts';
import { Renderer } from './render.ts';
import { DEFAULT_THEME, deepMerge, PRESETS } from './themes.ts';

let VERSION = '1.0.0';

// svgo's css-tree dep does a dynamic require that breaks under bun --compile
// when resolved from the node entry; the official self-contained browser
// bundle (svgo/browser, zero requires) bundles cleanly into the binary.
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
            \`\`\`table and \`\`\`list blocks rendered as styled PNG images
  file.mmd  a single mermaid diagram
  -         mermaid source from stdin (single diagram)

Options:
  -o, --out <path>        output directory, or exact .svg/.png file when the
                          input renders exactly one diagram (default: next to input)
  -f, --format <fmt>      svg | png | both                     (default: both)
  -t, --theme <name>      tech (default) | openai | openai-dark | minimal |
                          latte | mocha | sketch                (default: tech)
  --background <color>    page background, e.g. white | transparent | #1A1A1A
  --scale <n>             PNG scale factor                     (default: 2)
  --width <px>            layout viewport width                (default: 1200)
  --layout <engine>       elk (default, better routing) | dagre
  --title <text>          embed a title into diagrams that don't have one
  --title-pos <pos>       top (default) | bottom
  --icon <pack>           iconify pack for @{icon: pack:name} nodes (repeatable,
                          fetched from unpkg and cached)
  --config <file.json>    extra Mermaid config, deep-merged over the theme
  --theme-js <file.js>    JS theming: file body is a function (config, ctx)
                          returning the modified config
  --css <file.css>        extra CSS appended to the theme's themeCSS
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
  mmdx a.md b.md -o dist/ -t mocha
  mmdx diagram.mmd -o out/diagram.svg     # writes out/diagram.svg + out/diagram.png
  echo "graph LR; A-->B" | mmdx - -f svg
`;

interface Options {
  inputs: string[];
  out: string | null;
  format: 'svg' | 'png' | 'both';
  theme: string;
  background: string | null;
  scale: number;
  width: number;
  layout: 'elk' | 'dagre';
  title: string | null;
  titlePos: 'top' | 'bottom';
  index: string | null;
  icons: string[];
  config: string | null;
  themeJs: string | null;
  css: string | null;
  browser: string | null;
  jobs: number;
  profile: boolean;
  list: boolean;
  json: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    inputs: [], out: null, format: 'both', theme: DEFAULT_THEME, background: null,
    scale: 2, width: 1200, layout: 'elk', title: null, titlePos: 'top', index: null, icons: [],
    config: null, themeJs: null, css: null, browser: null, jobs: 2, profile: false,
    list: false, json: false, quiet: false,
  };
  const need = (v: string | undefined, name: string): string => {
    if (v === undefined) { console.error(`mmdx: missing value for ${name}`); process.exit(2); }
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-o': case '--out': o.out = need(argv[++i], a); break;
      case '-f': case '--format': o.format = need(argv[++i], a) as Options['format']; break;
      case '-t': case '--theme': o.theme = need(argv[++i], a); break;
      case '--background': o.background = need(argv[++i], a); break;
      case '--scale': o.scale = parseFloat(need(argv[++i], a)); break;
      case '--width': o.width = parseInt(need(argv[++i], a), 10); break;
      case '--layout': o.layout = need(argv[++i], a) as Options['layout']; break;
      case '--title': o.title = need(argv[++i], a); break;
      case '--title-pos': o.titlePos = need(argv[++i], a) as Options['titlePos']; break;
      case '--index': o.index = need(argv[++i], a); break;
      case '--icon': o.icons.push(need(argv[++i], a)); break;
      case '--config': o.config = need(argv[++i], a); break;
      case '--theme-js': o.themeJs = need(argv[++i], a); break;
      case '--css': o.css = need(argv[++i], a); break;
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
        o.inputs.push(a); // '-' = stdin
    }
  }
  if (!o.inputs.length) { process.stdout.write(help()); process.exit(2); }
  if (!['svg', 'png', 'both'].includes(o.format)) {
    console.error(`mmdx: --format must be svg|png|both, got "${o.format}"`);
    process.exit(2);
  }
  return o;
}

interface Block {
  input: string;      // display name ('<stdin>' for stdin)
  base: string;       // output file stem base
  index: number;      // 1-based block index within its input
  line: number;
  code: string;
  kind: BlockKind;
}

// any fenced block with a recognized language (mermaid / table / list)
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

/** frontmatter title present? */
function hasTitle(code: string): boolean {
  return /^---\s*\n[\s\S]*?\n---\s*\n/.test(code) && /(^|\n)\s*title:/.test(code);
}

/** extract `title:` from a diagram's frontmatter, if any */
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

/** Run a user theme-js file. The file body receives (config, ctx) and must
 *  return the modified config — either directly or via `export default fn`.
 *  Executed with new Function, so it works identically in the compiled binary. */
function applyThemeJs(src: string, config: Record<string, unknown>, ctx: Record<string, unknown>): Record<string, unknown> {
  const body = src.replace(/^\s*export\s+default\s+/m, 'return ');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
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

async function main(): Promise<void> {
  VERSION = await getBuildVersion();
  const o = parseArgs(process.argv.slice(2));

  if (!PRESETS[o.theme]) {
    console.error(`mmdx: unknown theme "${o.theme}" (available: ${Object.keys(PRESETS).join(', ')})`);
    process.exit(2);
  }

  // ---- collect blocks from all inputs ----
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

  // ---- optional per-input block selection (--index) ----
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

  // ---- resolve output paths ----
  const exts = o.format === 'both' ? ['svg', 'png'] : [o.format];
  const single = selected.length === 1;
  const exact =
    o.out && single && /\.(svg|png)$/i.test(o.out) ? path.resolve(o.out) : null;
  const dir = exact ? path.dirname(exact) : o.out ? path.resolve(o.out) : path.dirname(path.resolve(selected[0].input === '-' ? '.' : selected[0].input));
  fs.mkdirSync(dir, { recursive: true });
  const outFileFor = (b: Block, ext: string): string => {
    if (exact) return exact.replace(/\.(svg|png)$/i, `.${ext}`);
    // keep the -m<n> suffix when a .md was filtered via --index so blocks
    // don't masquerade as the whole file's diagram
    const keepStem = (single && !o.index) || b.input.endsWith('.mmd');
    const stem = keepStem ? b.base : `${b.base}-m${b.index}`;
    return path.join(dir, `${stem}.${ext}`);
  };

  // ---- build theme config ----
  const preset = PRESETS[o.theme];
  let config = JSON.parse(JSON.stringify(preset.config)) as Record<string, unknown>;
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

  // ---- render pipeline: one browser, pooled pages, bounded parallelism ----
  const assets = await loadAssets();
  const renderer = await Renderer.create(assets, {
    browserPath: o.browser || undefined,
    layout: o.layout,
    scale: o.scale,
    width: o.width,
    iconPacks,
    profile: o.profile,
  });

  const results: Array<{ input: string; index: number; files: string[]; error?: string }> = [];
  let cursor = 0;
  const jobs = Math.min(o.jobs, selected.length);

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = cursor++;
      if (i >= selected.length) return;
      const b = selected[i];
      const injected = o.title && !hasTitle(b.code) && b.kind === 'mermaid';
      const code = injected ? `---\ntitle: ${o.title}\n---\n${b.code}` : b.code;
      // text used to locate the title node when --title-pos bottom
      const titleText = injected ? (o.title as string) : frontTitle(b.code);
      const wantPng = o.format === 'both' || o.format === 'png';

      // one retry: transient browser hiccups under concurrency are cheaper
      // to absorb here than to surface to the agent
      const attempt = async (): Promise<string[]> => {
        if (b.kind !== 'mermaid') {
          // table/list/card render to PNG only (HTML layout has no portable SVG form)
          const inner = b.kind === 'table' ? tableToHtml(b.code)
            : b.kind === 'card' ? cardToHtml(b.code)
            : listToHtml(b.code);
          const png = await renderer.renderHtml(blockPage(inner), background, `${b.input}#${b.index}`);
          const files: string[] = [];
          if (o.format === 'svg') {
            process.stderr.write(`mmdx: ${b.input}#${b.index} ${b.kind} renders to PNG only; writing PNG\n`);
          }
          const f = outFileFor(b, 'png');
          fs.writeFileSync(f, png);
          files.push(f);
          return files;
        }
        const { svg, png } = await renderer.render(code, config, background, wantPng, o.titlePos, titleText, preset.remap);
        const files: string[] = [];
        if (o.format === 'both' || o.format === 'svg') {
          const f = outFileFor(b, 'svg');
          if (!svgoOptimize && !svgoWarned) {
            svgoWarned = true;
            process.stderr.write('mmdx: svgo unavailable — writing SVG without minification\n');
          }
          const tSvgo = performance.now();
          let optimized = svg;
          if (svgoOptimize) {
            try {
              optimized = svgoOptimize(svg, {
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
            } catch {
              // svgo chokes on some SVGs under bun; the unminified file is valid
              log(o.quiet || o.json, `mmdx: ${b.input}#${b.index} svgo failed, writing unminified svg`);
            }
          }
          if (o.profile) renderer.profile.push({ stage: 'svgo', ms: Math.round(performance.now() - tSvgo), label: `${b.input}#${b.index}` });
          fs.writeFileSync(f, optimized);
          files.push(f);
        }
        if (png) {
          const f = outFileFor(b, 'png');
          fs.writeFileSync(f, png);
          files.push(f);
        }
        return files;
      };

      try {
        let files: string[];
        try {
          files = await attempt();
        } catch (first) {
          log(o.quiet || o.json, `mmdx: ${b.input}#${b.index} retrying after: ${(first as Error).message.split('\n')[0]}`);
          files = await attempt();
        }
        results.push({ input: b.input, index: b.index, files });
        log(o.quiet || o.json, `mmdx: ${b.input}#${b.index} → ${files.length} file(s)`);
      } catch (e) {
        results.push({ input: b.input, index: b.index, files: [], error: e instanceof Error ? e.message : String(e) });
      }
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
  await renderer.close();

  const failed = results.filter((r) => r.error);
  const written = results.flatMap((r) => r.files);

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
      blocks: blocks.length, rendered: results.length - failed.length,
      failed: failed.length, files: written,
      errors: failed.map((f) => ({ input: f.input, index: f.index, error: f.error })),
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
