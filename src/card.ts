// `mmdx card` — Markdown/URL → magazine-style info card PNG.
//
// This is the executable form of the imported info-card scenario. It keeps the
// theme palette (--theme) and tone (--tone) separate: the theme supplies color,
// the tone supplies panel geometry and display type. Long input is packed into
// several cards at render time, using the actual pixel height instead of a
// character-count guess.

import fs from 'node:fs';
import path from 'node:path';
import { blockPage, inlineMd, tableToHtml } from './blocks.ts';
import { loadAssets } from './embed.ts';
import { Renderer } from './render.ts';
import { accentTint, applyBrand, type Tokens } from './tokens.ts';
import { isToneName, type ToneName } from './tone.ts';
import { getTheme, PRESETS } from './themes.ts';

const MONO = `"Cascadia Code", "SF Mono", Consolas, monospace`;
const SYNC_LIMIT = 2 * 1024 * 1024;

export type CardBlock =
  | { type: 'h'; level: 2 | 3; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; lang: string; text: string }
  | { type: 'table'; text: string };

export interface CardDoc {
  kicker: string;
  title: string;
  deck: string;
  source: string;
  blocks: CardBlock[];
}

interface CardOptions {
  input: string | null;
  url: string | null;
  out: string | null;
  width: number;
  scale: number;
  theme: string;
  tone: ToneName;
  title: string | null;
  kicker: string | null;
  deck: string | null;
  source: string | null;
  brand: string | null;
  maxHeight: number;
  browser: string | null;
  json: boolean;
  quiet: boolean;
  help: boolean;
}

const HELP = `
mmdx card — render Markdown or a URL as a styled info card

Usage:
  mmdx card --in <file.md|-> [options]
  mmdx card --url <url> [options]

Options:
  -i, --in <path>         Markdown/text input; "-" reads stdin
  --url <url>             fetch a page and extract its title/description/article
  -o, --out <path>        exact .png or output directory (default: next to input)
  --width <px>            card width in CSS px                  (default: 600)
  --scale <n>             PNG scale factor                    (default: 2)
  -t, --theme <name>      palette (default: openai)
  --tone <name>           paper | neutral | product           (default: neutral)
  --title <text>          override the card title
  --kicker <text>         small label above the title
  --deck <text>           standfirst under the title
  --source <text>         footer credit
  --brand <hex>           accent color override
  --max-height <px>       split into another card above this height (default: 1200)
  --browser <path>        browser executable override
  --json                  machine-readable result
  -q, --quiet             suppress progress lines
  -h, --help              show this help
`;

function parseCardArgs(argv: string[]): CardOptions {
  const o: CardOptions = {
    input: null, url: null, out: null, width: 600, scale: 2,
    theme: 'openai', tone: 'neutral',
    title: null, kicker: null, deck: null, source: null, brand: null,
    maxHeight: 1200, browser: null, json: false, quiet: false, help: false,
  };
  const need = (v: string | undefined, name: string): string => {
    if (v === undefined) throw new Error(`missing value for ${name}`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-i': case '--in': o.input = need(argv[++i], a); break;
      case '--url': o.url = need(argv[++i], a); break;
      case '-o': case '--out': o.out = need(argv[++i], a); break;
      case '--width': o.width = parseInt(need(argv[++i], a), 10); break;
      case '--scale': o.scale = parseFloat(need(argv[++i], a)); break;
      case '-t': case '--theme': o.theme = need(argv[++i], a); break;
      case '--tone': {
        const v = need(argv[++i], a);
        if (!isToneName(v)) throw new Error(`--tone must be paper|neutral|product, got "${v}"`);
        o.tone = v;
        break;
      }
      case '--title': o.title = need(argv[++i], a); break;
      case '--kicker': o.kicker = need(argv[++i], a); break;
      case '--deck': o.deck = need(argv[++i], a); break;
      case '--source': o.source = need(argv[++i], a); break;
      case '--brand': o.brand = need(argv[++i], a); break;
      case '--max-height': o.maxHeight = parseInt(need(argv[++i], a), 10); break;
      case '--browser': o.browser = need(argv[++i], a); break;
      case '--json': o.json = true; break;
      case '-q': case '--quiet': o.quiet = true; break;
      case '-h': case '--help': o.help = true; break;
      default:
        if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
        if (!o.input) o.input = a;
        else throw new Error(`unexpected argument "${a}"`);
    }
  }
  if (!o.help) {
    if (o.input && o.url) throw new Error('use --in or --url, not both');
    if (!o.input && !o.url) o.input = '-';
    if (!Number.isFinite(o.width) || o.width < 320 || o.width > 1200) {
      throw new Error('--width must be 320..1200');
    }
    if (!Number.isFinite(o.scale) || o.scale < 1 || o.scale > 4) {
      throw new Error('--scale must be 1..4');
    }
    if (!Number.isFinite(o.maxHeight) || o.maxHeight < 480) {
      throw new Error('--max-height must be >= 480');
    }
    if (!PRESETS[o.theme]) {
      throw new Error(`unknown theme "${o.theme}" (available: ${Object.keys(PRESETS).join(', ')})`);
    }
  }
  return o;
}

function splitFrontmatter(src: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: src.slice(m[0].length) };
}

function isTableStart(lines: string[], i: number): boolean {
  return lines[i].includes('|') && i + 1 < lines.length &&
    /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes('-');
}

function isListLine(line: string): boolean {
  return /^(\s*)([-*+]|\d+[.)])\s+/.test(line);
}

export function parseCardMarkdown(src: string): CardDoc {
  const { meta, body } = splitFrontmatter(src.replace(/\r\n/g, '\n'));
  const lines = body.split('\n');
  const blocks: CardBlock[] = [];
  let title = '';
  let deck = '';
  let source = '';
  let kicker = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push({ type: 'code', lang, text: buf.join('\n') });
      continue;
    }

    if (isTableStart(lines, i)) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].includes('|')) buf.push(lines[i++]);
      blocks.push({ type: 'table', text: buf.join('\n') });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 1 && !title) title = text;
      else blocks.push({ type: 'h', level: level <= 2 ? 2 : 3, text });
      i++;
      continue;
    }

    if (isListLine(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && isListLine(lines[i])) {
        items.push(lines[i].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trim());
        i++;
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: buf.join('\n').trim() });
      continue;
    }

    const buf: string[] = [line.trim()];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim() || /^```/.test(l) || /^(#{1,6})\s+/.test(l) || isListLine(l) ||
          /^\s*>/.test(l) || isTableStart(lines, i)) break;
      buf.push(l.trim());
      i++;
    }
    const text = buf.join(' ').replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ type: 'p', text });
  }

  return {
    kicker: meta.kicker ?? kicker,
    title: meta.title || title || '信息卡',
    deck: meta.deck || deck,
    source: meta.source || source,
    blocks,
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function metaContent(html: string, key: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`,
    'i',
  );
  const tag = re.exec(html)?.[0];
  if (!tag) return '';
  const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
  return content ? decodeEntities(content).trim() : '';
}

/** Lightweight extraction: enough for article-like pages, no DOM dependency. */
export function extractCardHtml(html: string): { title: string; description: string; markdown: string } {
  let doc = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
    .replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, '');

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(doc)?.[1] ?? '';
  const title = metaContent(doc, 'og:title') || decodeEntities(titleTag).trim();
  const description = metaContent(doc, 'og:description') || metaContent(doc, 'description');

  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(doc)?.[1]
    ?? /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(doc)?.[1]
    ?? /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(doc)?.[1]
    ?? doc;

  const markdown = decodeEntities(
    article
      .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
      .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();

  return { title, description, markdown };
}

async function loadInput(o: CardOptions): Promise<string> {
  if (o.url) {
    const res = await fetch(o.url, {
      headers: { 'user-agent': 'mmdx-card/2.0' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`fetch ${o.url} → HTTP ${res.status}`);
    const html = await res.text();
    const extracted = extractCardHtml(html);
    const meta = [
      extracted.title ? `title: ${extracted.title}` : '',
      extracted.description ? `deck: ${extracted.description}` : '',
      `source: ${new URL(o.url).hostname}`,
    ].filter(Boolean).join('\n');
    return `---\n${meta}\n---\n${extracted.markdown}`;
  }
  if (o.input === '-') {
    const buf = fs.readFileSync(0);
    if (buf.length > SYNC_LIMIT) throw new Error('stdin is larger than 2 MB');
    return buf.toString('utf8');
  }
  const p = path.resolve(o.input ?? '-');
  if (!fs.existsSync(p)) throw new Error(`input not found: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function blockHtml(b: CardBlock): string {
  switch (b.type) {
    case 'h':
      return `<h2 class="ic-h">${inlineMd(b.text)}</h2>`;
    case 'p':
      return `<p class="ic-p">${inlineMd(b.text)}</p>`;
    case 'ul':
    case 'ol':
      return `<${b.type} class="ic-list">${b.items.map((x) => `<li>${inlineMd(x)}</li>`).join('')}</${b.type}>`;
    case 'quote':
      return `<blockquote class="ic-quote">${b.text.split('\n').map((x) => inlineMd(x)).join('<br>')}</blockquote>`;
    case 'code':
      return `<pre class="ic-code"><code>${esc(b.text)}</code></pre>`;
    case 'table':
      return `<div class="ic-table">${tableToHtml(b.text)}</div>`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cardCss(width: number, font: string): string {
  const titleSize = width <= 520 ? 32 : width <= 700 ? 38 : 44;
  const bodySize = width <= 520 ? 14 : 15;
  return `
.wrap { font-family:${font}; color:var(--ink); background:var(--paper); }
.ic { display:flex; flex-direction:column; gap:18px; }
.ic-masthead { display:flex; flex-direction:column; gap:10px; }
.ic-kicker { font-family:${MONO}; font-size:11px; line-height:1.4; letter-spacing:0.14em; text-transform:uppercase; color:var(--accent); }
.ic-title { margin:0; font-family:var(--tone-heading-font, ${font}); font-size:${titleSize}px; font-weight:var(--tone-heading-weight, 600); line-height:1.08; letter-spacing:var(--tone-heading-tracking, -0.02em); color:var(--ink); }
.ic-deck { margin:0; font-size:${bodySize + 2}px; line-height:1.55; color:var(--muted); }
.ic-rule { height:2px; background:linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 10%, transparent)); }
.ic-body { display:flex; flex-direction:column; gap:14px; }
.ic-h { margin:6px 0 0; font-family:var(--tone-heading-font, ${font}); font-size:${bodySize + 5}px; font-weight:600; line-height:1.3; letter-spacing:-0.01em; color:var(--ink); }
.ic-p { margin:0; font-size:${bodySize}px; line-height:1.72; color:var(--ink); }
.ic-p strong, .ic-h strong { font-weight:650; }
.ic-p code, .ic-list code { font-family:${MONO}; font-size:0.9em; background:var(--paper-2); border-radius:3px; padding:1px 5px; }
.ic-p a, .ic-list a { color:var(--accent); text-decoration:none; border-bottom:1px solid color-mix(in srgb, var(--accent) 35%, transparent); }
.ic-list { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px; font-size:${bodySize}px; line-height:1.65; }
.ic-list li { position:relative; padding-left:18px; }
.ic-list li::before { content:""; position:absolute; left:2px; top:0.65em; width:5px; height:5px; border-radius:50%; background:var(--accent); }
ol.ic-list { counter-reset:ic; }
ol.ic-list li { counter-increment:ic; padding-left:24px; }
ol.ic-list li::before { content:counter(ic) "."; top:0; width:auto; height:auto; border-radius:0; background:none; color:var(--accent); font-weight:600; font-size:12px; }
.ic-quote { margin:0; padding:14px 18px; border-left:3px solid var(--accent); background:var(--paper-2); border-radius:0 var(--tone-radius-sm, 6px) var(--tone-radius-sm, 6px) 0; font-size:${bodySize}px; line-height:1.65; color:var(--ink); }
.ic-code { margin:0; padding:14px 16px; background:var(--paper-2); border-radius:var(--tone-radius-sm, 6px); font-family:${MONO}; font-size:12.5px; line-height:1.55; white-space:pre-wrap; overflow-wrap:anywhere; color:var(--ink); }
.ic-table { overflow-x:auto; }
.ic-table table { width:100%; font-size:${bodySize - 1}px; }
.ic-table th, .ic-table td { padding:9px 12px; }
.ic-foot { display:flex; justify-content:space-between; gap:16px; border-top:1px solid var(--rule); padding-top:12px; font-size:12px; color:var(--muted); }
.ic-foot .ic-cont { font-family:${MONO}; letter-spacing:0.08em; text-transform:uppercase; }
`;
}

export function cardPage(
  doc: CardDoc,
  blocks: CardBlock[],
  tone: ToneName,
  width: number,
  font: string,
  part: number,
  tokens: Tokens,
): string {
  const head = [
    doc.kicker ? `<div class="ic-kicker">${esc(doc.kicker)}</div>` : '',
    `<h1 class="ic-title">${esc(doc.title)}</h1>`,
    doc.deck ? `<p class="ic-deck">${esc(doc.deck)}</p>` : '',
  ].filter(Boolean).join('');
  const footBits = [
    doc.source ? `<span>${esc(doc.source)}</span>` : '<span></span>',
    `<span class="ic-cont">${part > 0 ? `续 ${part + 1}` : tone}</span>`,
  ].join('');
  const inner = `<div class="ic"><header class="ic-masthead">${head}</header>` +
    `<div class="ic-rule"></div><div class="ic-body">${blocks.map(blockHtml).join('')}</div>` +
    `<footer class="ic-foot">${footBits}</footer></div>`;
  return blockPage(inner, {
    wrapWidth: width,
    tokens,
    blockCss: cardCss(width, font),
    tone,
  });
}

function splitLongText(text: string): string[] {
  const sentences = text.split(/(?<=[。！？.!?])\s*/).filter(Boolean);
  if (sentences.length < 2) {
    const parts: string[] = [];
    for (let i = 0; i < text.length; i += 420) parts.push(text.slice(i, i + 420));
    return parts.filter(Boolean);
  }
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && (buf + s).length > 420) { out.push(buf.trim()); buf = ''; }
    buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length > 1 ? out : [text];
}

function splitBlock(b: CardBlock): CardBlock[] {
  switch (b.type) {
    case 'p':
      return splitLongText(b.text).map((text) => ({ type: 'p', text }));
    case 'quote':
      return splitLongText(b.text).map((text) => ({ type: 'quote', text }));
    case 'ul':
    case 'ol': {
      if (b.items.length < 2) return [b];
      const mid = Math.ceil(b.items.length / 2);
      return [
        { type: b.type, items: b.items.slice(0, mid) },
        { type: b.type, items: b.items.slice(mid) },
      ];
    }
    case 'code': {
      const lines = b.text.split('\n');
      if (lines.length < 4) return [b];
      const mid = Math.ceil(lines.length / 2);
      return [
        { type: 'code', lang: b.lang, text: lines.slice(0, mid).join('\n') },
        { type: 'code', lang: b.lang, text: lines.slice(mid).join('\n') },
      ];
    }
    default:
      return [b];
  }
}

function pngSize(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export interface CardRenderOptions {
  themeName: string;
  tone: ToneName;
  width: number;
  scale: number;
  maxHeight: number;
  brand?: string | null;
}

export async function renderCardDoc(
  renderer: Renderer,
  doc: CardDoc,
  opts: CardRenderOptions,
): Promise<Buffer[]> {
  const theme = getTheme(opts.themeName);
  const tokens: Tokens = {
    paper: theme.vars.bg,
    ink: theme.vars.fg,
    muted: theme.vars.muted,
    rule: theme.vars.border,
    accent: theme.vars.accent,
    accentTint: accentTint(theme.vars.accent),
    paper2: theme.vars.surfaceAlt,
  };
  if (opts.brand) {
    const b = applyBrand(opts.brand);
    tokens.accent = b.tokens.accent;
    tokens.accentTint = b.tokens.accentTint;
  }

  const renderPart = async (blocks: CardBlock[], part: number): Promise<{ png: Buffer; height: number }> => {
    const html = cardPage(
      doc, blocks, opts.tone, opts.width, theme.fontFamily ?? 'sans-serif', part, tokens,
    );
    const png = await renderer.renderHtml(html, theme.background, `card#${part + 1}`);
    return { png, height: pngSize(png).height / opts.scale };
  };

  const pages: Buffer[] = [];
  const pack = async (blocks: CardBlock[], part: number): Promise<void> => {
    if (!blocks.length) return;
    let lo = 1;
    let hi = blocks.length;
    let best = 0;
    let bestPng: Buffer | null = null;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const attempt = await renderPart(blocks.slice(0, mid), part);
      if (attempt.height <= opts.maxHeight) {
        best = mid;
        bestPng = attempt.png;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best === 0) {
      const parts = splitBlock(blocks[0]);
      if (parts.length > 1) {
        await pack([...parts, ...blocks.slice(1)], part);
        return;
      }
      bestPng = (await renderPart(blocks.slice(0, 1), part)).png;
      best = 1;
    }
    pages.push(bestPng as Buffer);
    await pack(blocks.slice(best), part + 1);
  };
  await pack(doc.blocks, 0);
  return pages;
}

export async function runCardCommand(argv: string[], version: string): Promise<number> {
  let o: CardOptions;
  try {
    o = parseCardArgs(argv);
  } catch (e) {
    console.error(`mmdx card: ${(e as Error).message}`);
    return 2;
  }
  if (o.help) {
    process.stdout.write(HELP);
    return 0;
  }

  try {
    const doc = parseCardMarkdown(await loadInput(o));
    if (o.title) doc.title = o.title;
    if (o.kicker) doc.kicker = o.kicker;
    if (o.deck) doc.deck = o.deck;
    if (o.source) doc.source = o.source;
    if (!doc.blocks.length) throw new Error('no card content found');

    const assets = await loadAssets();
    const renderer = await Renderer.create(assets, {
      browserPath: o.browser || undefined,
      layout: 'elk', scale: o.scale, width: o.width,
    });
    const pages = await renderCardDoc(renderer, doc, {
      themeName: o.theme, tone: o.tone, width: o.width,
      scale: o.scale, maxHeight: o.maxHeight, brand: o.brand,
    });
    await renderer.close();

    const files = writeCards(pages, o);
    const sizes = pages.map((p) => pngSize(p));
    if (o.json) {
      console.log(JSON.stringify({
        command: 'card', version,
        theme: o.theme, tone: o.tone, width: o.width, scale: o.scale,
        cards: files.length,
        files,
        pages: files.map((f, i) => ({ file: f, width: sizes[i].width, height: sizes[i].height })),
      }, null, 2));
    } else {
      for (const f of files) console.log(f);
    }
    return 0;
  } catch (e) {
    console.error(`mmdx card: ${(e as Error).message}`);
    return 1;
  }
}

function writeCards(pages: Buffer[], o: CardOptions): string[] {
  const out = o.out ? path.resolve(o.out) : null;
  const exact = out && /\.png$/i.test(out);
  const dir = exact ? path.dirname(out) : out ?? process.cwd();
  fs.mkdirSync(dir, { recursive: true });
  const inputBase = o.input && o.input !== '-'
    ? path.basename(o.input).replace(/\.[^.]+$/, '')
    : 'card';
  const stem = exact
    ? path.basename(out!).replace(/\.png$/i, '')
    : `${inputBase}-card`;
  const files: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const name = pages.length === 1 ? `${stem}.png` : `${stem}-${i + 1}.png`;
    const f = path.join(dir, name);
    fs.writeFileSync(f, pages[i]);
    files.push(f);
  }
  return files;
}
