#!/usr/bin/env node
// mmdx — Mermaid → SVG/PNG exporter tuned for AI agents.
// Extracts ```mermaid blocks from Markdown (or plain .mmd / stdin) and renders
// them via @mermaid-js/mermaid-cli with OpenAI-style themes, JS/CSS customization.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PKG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MMDC_ENTRY = path.join(PKG_DIR, 'node_modules', '@mermaid-js', 'mermaid-cli', 'src', 'cli.js');

const VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

const FONT_STACK = `-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif`;

// OpenAI-style: white canvas, near-black text, hairline gray borders,
// mint (#10A37F) as the single accent, straight connectors, generous spacing.
const OPENAI_LIGHT = {
  theme: 'base',
  themeVariables: {
    fontFamily: FONT_STACK,
    fontSize: '15px',
    // nodes
    primaryColor: '#FFFFFF',
    primaryTextColor: '#0D0D0D',
    primaryBorderColor: '#1F1F1F',
    secondaryColor: '#E9F5F1', // mint tint (highlighted nodes)
    tertiaryColor: '#F7F7F8',  // soft gray fill
    secondaryTextColor: '#0D0D0D',
    secondaryBorderColor: '#10A37F',
    tertiaryTextColor: '#0D0D0D',
    tertiaryBorderColor: '#D9D9E3',
    // connectors & labels
    lineColor: '#8E8EA0',
    textColor: '#0D0D0D',
    edgeLabelBackground: '#FFFFFF',
    // containers
    clusterBkg: '#FAFAFA',
    clusterBorder: '#E3E3E8',
    titleColor: '#0D0D0D',
    // sequence
    actorBkg: '#FFFFFF',
    actorBorder: '#1F1F1F',
    actorTextColor: '#0D0D0D',
    actorLineColor: '#D9D9E3',
    signalColor: '#404040',
    signalTextColor: '#0D0D0D',
    noteBkgColor: '#F7F7F8',
    noteTextColor: '#0D0D0D',
    noteBorderColor: '#D9D9E3',
    activationBkgColor: '#E9F5F1',
    activationBorderColor: '#10A37F',
    // state / class / er
    labelColor: '#0D0D0D',
    attributeBackgroundColorOdd: '#FFFFFF',
    attributeBackgroundColorEven: '#F7F7F8',
    // gantt/pie etc.
    sectionBkgColor: '#F7F7F8',
    altSectionBkgColor: '#FFFFFF',
    sectionBkgColor2: '#E9F5F1',
    gridColor: '#E3E3E8',
    pie1: '#10A37F',
    pie2: '#0D0D0D',
    pie3: '#8E8EA0',
    pie4: '#E9F5F1',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'linear',
    padding: 14,
    nodeSpacing: 55,
    rankSpacing: 65,
    wrappingWidth: 240,
  },
  sequence: {
    diagramMarginX: 24,
    diagramMarginY: 16,
    actorMargin: 56,
    boxMargin: 10,
    messageMargin: 40,
    mirrorActors: false,
    bottomMarginAdj: 8,
  },
  class: { padding: 12 },
  er: { diagramPadding: 16, entityPadding: 14, minEntityWidth: 120 },
  themeCSS: `
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 1.25px; }
.node rect { rx: 8px; ry: 8px; }
.cluster rect { rx: 10px; ry: 10px; stroke-width: 1px; }
.edgePath .path { stroke-width: 1.25px; }
.flowchartTitleText { font-weight: 600; }
`,
};

const OPENAI_DARK = deepClone(OPENAI_LIGHT);
OPENAI_DARK.themeVariables = {
  ...OPENAI_DARK.themeVariables,
  primaryColor: '#1A1A1A',
  primaryTextColor: '#ECECF1',
  primaryBorderColor: '#8E8EA0',
  secondaryColor: '#12332B',
  secondaryTextColor: '#ECECF1',
  secondaryBorderColor: '#10A37F',
  tertiaryColor: '#26262B',
  tertiaryTextColor: '#ECECF1',
  tertiaryBorderColor: '#3E3E44',
  lineColor: '#6B6B78',
  textColor: '#ECECF1',
  edgeLabelBackground: '#1A1A1A',
  clusterBkg: '#202123',
  clusterBorder: '#3E3E44',
  titleColor: '#ECECF1',
  actorBkg: '#1A1A1A',
  actorBorder: '#8E8EA0',
  actorTextColor: '#ECECF1',
  actorLineColor: '#3E3E44',
  signalColor: '#B4B4BD',
  signalTextColor: '#ECECF1',
  noteBkgColor: '#26262B',
  noteTextColor: '#ECECF1',
  noteBorderColor: '#3E3E44',
  activationBkgColor: '#12332B',
  activationBorderColor: '#10A37F',
  labelColor: '#ECECF1',
  attributeBackgroundColorOdd: '#1A1A1A',
  attributeBackgroundColorEven: '#26262B',
  sectionBkgColor: '#202123',
  altSectionBkgColor: '#1A1A1A',
  sectionBkgColor2: '#12332B',
  gridColor: '#3E3E44',
};

const PRESETS = {
  openai: { config: OPENAI_LIGHT, background: '#FFFFFF' },
  'openai-dark': { config: OPENAI_DARK, background: '#1A1A1A' },
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function deepClone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, extra) {
  if (!isPlainObject(base) || !isPlainObject(extra)) return extra;
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k]) ? deepMerge(base[k], v) : deepClone(v);
  }
  return out;
}

function extractMermaidBlocks(md) {
  const blocks = [];
  const re = /^\s*```[ \t]*mermaid[^\n]*\n([\s\S]*?)^[ \t]*```\s*$/gmd;
  let m;
  while ((m = re.exec(md)) !== null) {
    const code = m[1].replace(/\r\n/g, '\n').trim();
    if (code) blocks.push({ index: blocks.length + 1, line: m.indices[1][0] ? md.slice(0, m.indices[1][0]).split('\n').length : 0, code });
  }
  return blocks;
}

function detectBrowser() {
  const candidates = process.platform === 'win32' ? [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ] : [
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/snap/bin/chromium',
  ];
  for (const p of candidates) {
    try { fs.accessSync(p); return p; } catch { /* keep looking */ }
  }
  return null;
}

function runMmdc(args, label) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [MMDC_ENTRY, '-q', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    const timeout = setTimeout(() => { child.kill(); resolve({ ok: false, error: `${label}: timed out after 120s` }); }, 120_000);
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ ok: code === 0, error: code === 0 ? null : `${label}: exit ${code}\n${err.trim().split('\n').slice(-6).join('\n')}` });
    });
    child.on('error', (e) => { clearTimeout(timeout); resolve({ ok: false, error: `${label}: ${e.message}` }); });
  });
}

function withTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-'));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP = `
mmdx ${VERSION} — render Mermaid diagrams to SVG + PNG, styled for docs

Usage:
  mmdx <file.md | file.mmd | -> [options]

Input:
  file.md   every \`\`\`mermaid code block is rendered (batch)
  file.mmd  a single diagram
  -         mermaid source from stdin (single diagram)

Options:
  -o, --out <path>       output directory, or exact .svg/.png file for single-diagram
                         input (default: next to the input file)
  -f, --format <fmt>     svg | png | both            (default: both)
  -t, --theme <name>     openai (default) | openai-dark
  --background <color>   page background, e.g. white | transparent | '#1A1A1A'
  --scale <n>            PNG scale factor            (default: 2.5)
  --width <px>           viewport width used when rendering (default: 1200)
  --index <n[,n...]>     only render these 1-based blocks from a .md file
  --config <file.json>   extra Mermaid config, deep-merged on top of the theme
  --theme-js <file.mjs>  JS theming: export default (config, { preset }) => config
  --css <file.css>       extra CSS appended to the theme's themeCSS
  --puppeteer <file.json> puppeteer config; default pins the detected Edge/Chrome
  --browser <path>       browser executable override
  --json                 machine-readable result (one JSON array on stdout)
  --list                 list the mermaid blocks found in a .md file and exit
  -q, --quiet            suppress progress lines on stderr
  -h, --help             show this help
  -v, --version          show version

Examples:
  mmdx README.md                          # README-m1.(svg|png), README-m2.(svg|png), ...
  mmdx README.md -t openai-dark --json
  mmdx diagram.mmd -o out/diagram.svg     # writes out/diagram.svg + out/diagram.png
  echo "graph LR; A-->B" | mmdx - -f svg
`;

function parseArgs(argv) {
  const o = {
    input: null, out: null, format: 'both', theme: 'openai', background: null,
    scale: 2.5, width: 1200, index: null, config: null, themeJs: null, css: null,
    puppeteer: null, browser: null, json: false, list: false, quiet: false,
  };
  const need = (v, name) => { if (v === undefined) { console.error(`mmdx: missing value for ${name}`); process.exit(2); } return v; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-o': case '--out': o.out = need(argv[++i], a); break;
      case '-f': case '--format': o.format = need(argv[++i], a); break;
      case '-t': case '--theme': o.theme = need(argv[++i], a); break;
      case '--background': o.background = need(argv[++i], a); break;
      case '--scale': o.scale = parseFloat(need(argv[++i], a)); break;
      case '--width': o.width = parseInt(need(argv[++i], a), 10); break;
      case '--index': o.index = String(need(argv[++i], a)); break;
      case '--config': o.config = need(argv[++i], a); break;
      case '--theme-js': o.themeJs = need(argv[++i], a); break;
      case '--css': o.css = need(argv[++i], a); break;
      case '--puppeteer': o.puppeteer = need(argv[++i], a); break;
      case '--browser': o.browser = need(argv[++i], a); break;
      case '--json': o.json = true; break;
      case '--list': o.list = true; break;
      case '-q': case '--quiet': o.quiet = true; break;
      case '-h': case '--help': process.stdout.write(HELP); process.exit(0); break;
      case '-v': case '--version': console.log(VERSION); process.exit(0); break;
      default:
        if (a.startsWith('-')) { console.error(`mmdx: unknown option ${a}`); process.exit(2); }
        if (o.input !== null) { console.error('mmdx: only one input is accepted'); process.exit(2); }
        o.input = a;
    }
  }
  if (o.input === null) { process.stdout.write(HELP); process.exit(2); }
  if (!['svg', 'png', 'both'].includes(o.format)) { console.error(`mmdx: --format must be svg|png|both, got "${o.format}"`); process.exit(2); }
  return o;
}

const log = (quiet, msg) => { if (!quiet) process.stderr.write(msg + '\n'); };

async function buildThemeConfig(o, tmp) {
  const preset = PRESETS[o.theme];
  if (!preset) { console.error(`mmdx: unknown theme "${o.theme}" (available: ${Object.keys(PRESETS).join(', ')})`); process.exit(2); }
  let cfg = deepClone(preset.config);

  if (o.themeJs) {
    const mod = await import(path.resolve(o.themeJs).replace(/\\/g, '/').replace(/^([A-Za-z]:\/)/, 'file:///$1'));
    const fn = typeof mod === 'function' ? mod : mod.default;
    if (typeof fn !== 'function') { console.error(`mmdx: ${o.themeJs} must default-export a function (config) => config`); process.exit(2); }
    cfg = fn(cfg, { preset: o.theme });
    if (!isPlainObject(cfg)) { console.error(`mmdx: ${o.themeJs} must return a config object`); process.exit(2); }
  }

  if (o.config) {
    cfg = deepMerge(cfg, JSON.parse(fs.readFileSync(o.config, 'utf8')));
  }

  if (o.css) {
    const css = fs.readFileSync(o.css, 'utf8');
    cfg.themeCSS = (cfg.themeCSS ? cfg.themeCSS + '\n' : '') + css;
  }

  const cfgFile = path.join(tmp, 'mermaid-config.json');
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2));
  return { cfgFile, background: o.background || preset.background };
}

function buildPuppeteerConfig(o, tmp) {
  if (o.puppeteer) return path.resolve(o.puppeteer);
  const exe = o.browser || detectBrowser();
  const cfg = { args: ['--disable-gpu', '--disable-dev-shm-usage'] };
  if (exe) cfg.executablePath = exe;
  const f = path.join(tmp, 'puppeteer-config.json');
  fs.writeFileSync(f, JSON.stringify(cfg, null, 2));
  return f;
}

function resolveOutputs(o, inputPath, blockCount) {
  const exts = o.format === 'both' ? ['svg', 'png'] : [o.format];
  const isStdin = o.input === '-';
  const base = isStdin ? 'diagram' : path.basename(inputPath).replace(/\.(md|markdown|mmd)$/i, '');
  let dir = isStdin ? process.cwd() : path.dirname(path.resolve(inputPath));

  // exact .svg/.png target for single-diagram input: sibling gets the other format
  if (o.out && blockCount === 1 && /\.(svg|png)$/i.test(o.out)) {
    const exact = path.resolve(o.out);
    const stem = exact.replace(/\.(svg|png)$/i, '');
    return { dir: path.dirname(exact), files: () => exts.map((e) => `${stem}.${e}`) };
  }
  if (o.out) dir = path.resolve(o.out);
  const stem = blockCount === 1 ? base : `${base}-m`;
  return { dir, files: (n) => exts.map((e) => path.join(dir, `${stem}${blockCount === 1 ? '' : n}.${e}`)) };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));

  // ---- read input ----
  let raw;
  if (o.input === '-') {
    raw = fs.readFileSync(0, 'utf8');
  } else {
    const p = path.resolve(o.input);
    if (!fs.existsSync(p)) { console.error(`mmdx: input not found: ${p}`); process.exit(2); }
    raw = fs.readFileSync(p, 'utf8');
  }
  const isMd = o.input !== '-' && /\.(md|markdown)$/i.test(o.input);

  let blocks;
  if (isMd) {
    blocks = extractMermaidBlocks(raw);
  } else {
    const code = raw.trim();
    blocks = code ? [{ index: 1, line: 1, code }] : [];
  }

  if (o.list) {
    if (isMd) {
      for (const b of blocks) console.log(`${b.index}\tline ${b.line}\t${b.code.split('\n')[0].slice(0, 72)}`);
    } else {
      console.log(`1\tinput is not markdown\t${blocks[0] ? blocks[0].code.split('\n')[0].slice(0, 72) : '(empty)'}`);
    }
    process.exit(0);
  }

  if (!blocks.length) { console.error('mmdx: no mermaid blocks found'); process.exit(1); }

  const selected = o.index
    ? (() => {
      const want = new Set(o.index.split(',').map((s) => parseInt(s.trim(), 10)));
      const picked = blocks.filter((b) => want.has(b.index));
      if (!picked.length) { console.error(`mmdx: --index ${o.index} matches none of blocks 1..${blocks.length}`); process.exit(2); }
      return picked;
    })()
    : blocks;

  const { files } = resolveOutputs(o, o.input === '-' ? null : path.resolve(o.input), selected.length);
  fs.mkdirSync(files(1)[0] ? path.dirname(files(1)[0]) : process.cwd(), { recursive: true });

  const tmp = withTempDir();
  const { cfgFile, background } = await buildThemeConfig(o, tmp);
  const puppeteerCfg = buildPuppeteerConfig(o, tmp);

  // one temp .mmd per block; exact output names per format
  const jobs = selected.map((b, i) => {
    const inFile = path.join(tmp, `block-${b.index}.mmd`);
    fs.writeFileSync(inFile, b.code + '\n');
    const outs = files(i + 1);
    const fmtArgs = o.format === 'both'
      ? [] // two runs, handled below
      : ['-e', o.format];
    return { block: b, inFile, outs, fmtArgs };
  });

  const results = [];
  const CONCURRENCY = Math.min(4, jobs.length);
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const runs = o.format === 'both'
        ? [['-e', 'svg', job.outs[0]], ['-e', 'png', job.outs[1]]]
        : [['-e', o.format, job.outs[0]]];
      let firstError = null;
      for (const [fmtFlag, fmt, outFile] of runs) {
        const r = await runMmdc([
          '-i', job.inFile,
          '-o', outFile,
          fmtFlag, fmt,
          '-b', background,
          '-s', String(o.scale),
          '-w', String(o.width),
          '-c', cfgFile,
          '-p', puppeteerCfg,
        ], `block ${job.block.index} ${fmt}`);
        if (!r.ok) { firstError = r.error; break; }
      }
      const written = job.outs.filter((f) => fs.existsSync(f));
      results.push({
        index: job.block.index, ok: firstError === null && written.length > 0,
        line: job.block.line, files: written,
        error: firstError || (written.length ? null : 'no output produced'),
      });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  fs.rmSync(tmp, { recursive: true, force: true });
  results.sort((a, b) => a.index - b.index);

  const failed = results.filter((r) => !r.ok);
  const written = results.flatMap((r) => r.files || []);

  if (o.json) {
    console.log(JSON.stringify({
      theme: o.theme, format: o.format, blocks: blocks.length, rendered: results.length,
      failed: failed.length, files: written, errors: failed.map((f) => ({ index: f.index, error: f.error })),
    }, null, 2));
  } else {
    for (const f of written) console.log(f);
    for (const f of failed) process.stderr.write(`mmdx: block ${f.index} failed: ${f.error}\n`);
    log(o.quiet || o.json, `mmdx: ${results.length - failed.length}/${results.length} diagram(s) rendered [theme=${o.theme}]`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('mmdx:', e.message); process.exit(1); });
