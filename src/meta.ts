// Image metadata for generated PNG/SVG files. PNG uses the standard text
// chunks (tEXt for Latin-1, iTXt for UTF-8); SVG uses an RDF/Dublin Core
// <metadata> block. Values are stamped at output time, after quantization and
// after svgo, so neither step drops them.

import zlib from 'node:zlib';

export const PROJECT_NAME = 'mmdx';
export const PROJECT_COPYRIGHT = 'Copyright © 2026 daidaiJ';

/** Keys the rest of the pipeline knows how to place in PNG and SVG. */
const KNOWN_KEYS: Record<string, string> = {
  title: 'Title',
  author: 'Author',
  creator: 'Author',
  copyright: 'Copyright',
  rights: 'Copyright',
  created: 'Creation Time',
  'creation time': 'Creation Time',
  'creation-time': 'Creation Time',
  creation_time: 'Creation Time',
  creationtime: 'Creation Time',
  date: 'Creation Time',
  software: 'Software',
  version: 'Version',
  theme: 'Theme',
  tone: 'Tone',
  source: 'Source',
  description: 'Description',
  comment: 'Comment',
};

export interface ImageMetaInput {
  version: string;
  title?: string | null;
  author?: string | null;
  copyright?: string | null;
  created?: string | null;
  theme?: string | null;
  tone?: string | null;
  source?: string | null;
  description?: string | null;
  software?: string | null;
  extra?: Record<string, string> | null;
  enabled?: boolean;
}

export function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Map common aliases to the PNG keywords and RDF properties used below. */
export function normalizeMetaKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) throw new Error('--meta key is empty');
  return KNOWN_KEYS[trimmed.toLowerCase()] ?? trimmed;
}

/** Parse one `key=value` pair; the first `=` splits, so URLs stay intact. */
export function parseMetaOption(value: string): [string, string] {
  const at = value.indexOf('=');
  if (at <= 0) throw new Error(`--meta expects key=value, got "${value}"`);
  const key = normalizeMetaKey(value.slice(0, at));
  assertPngKeyword(key);
  return [key, value.slice(at + 1)];
}

export function parseMetaOptions(values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const value of values) {
    const [key, entry] = parseMetaOption(value);
    out[key] = entry;
  }
  return out;
}

function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const out = String(value).replace(/\0/g, '').trim();
  return out ? out : null;
}

/**
 * Build the ordered field set written to an image. Automatic fields:
 * creation time, software/version, copyright and (when known) title/theme/
 * source. Explicit flags and `--meta` overrides win; an empty value removes
 * the field. `enabled: false` suppresses the whole set.
 */
export function buildImageMeta(opts: ImageMetaInput): Record<string, string> {
  if (opts.enabled === false) return {};
  const out: Record<string, string> = {};
  const put = (key: string, value: string | null | undefined): void => {
    const v = clean(value);
    if (v) out[key] = v;
  };
  put('Title', opts.title);
  put('Author', opts.author);
  put('Copyright', opts.copyright ?? PROJECT_COPYRIGHT);
  put('Creation Time', opts.created ?? isoNow());
  put('Software', opts.software ?? `${PROJECT_NAME} ${opts.version}`);
  put('Version', opts.version);
  put('Theme', opts.theme);
  put('Tone', opts.tone);
  put('Source', opts.source);
  put('Description', opts.description);
  for (const [rawKey, rawValue] of Object.entries(opts.extra ?? {})) {
    const key = normalizeMetaKey(rawKey);
    const value = clean(rawValue);
    if (value) out[key] = value;
    else delete out[key];
  }
  return out;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function assertPngKeyword(key: string): void {
  const length = Buffer.from(key, 'latin1').length;
  if (length < 1 || length > 79) {
    throw new Error(`PNG metadata key must be 1..79 bytes, got ${length}`);
  }
  for (const ch of key) {
    const code = ch.codePointAt(0) ?? 0;
    if (!((code >= 32 && code <= 126) || (code >= 161 && code <= 255))) {
      throw new Error(`PNG metadata key "${key}" must be Latin-1 printable`);
    }
  }
  if (key !== key.trim() || key.includes('  ')) {
    throw new Error(`PNG metadata key "${key}" has leading, trailing, or repeated spaces`);
  }
}

function isLatin1(value: string): boolean {
  return /^[\u0000-\u00ff]*$/.test(value);
}

function textChunk(key: string, value: string): Buffer {
  assertPngKeyword(key);
  if (isLatin1(value)) {
    return pngChunk('tEXt', Buffer.concat([
      Buffer.from(key, 'latin1'),
      Buffer.from([0]),
      Buffer.from(value, 'latin1'),
    ]));
  }
  // keyword, null; compression flag 0, method 0, empty language tag and
  // translated keyword, then the UTF-8 value.
  return pngChunk('iTXt', Buffer.concat([
    Buffer.from(key, 'latin1'),
    Buffer.from([0, 0, 0, 0, 0]),
    Buffer.from(value, 'utf8'),
  ]));
}

interface PngChunk {
  type: string;
  data: Buffer;
  raw: Buffer;
}

function readChunks(png: Buffer): PngChunk[] | null {
  if (png.length < 8 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    if (offset + 12 + length > png.length) return null;
    const type = png.toString('latin1', offset + 4, offset + 8);
    chunks.push({
      type,
      data: png.subarray(offset + 8, offset + 8 + length),
      raw: png.subarray(offset, offset + 12 + length),
    });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

function textKeyword(data: Buffer): string | null {
  const end = data.indexOf(0);
  if (end <= 0) return null;
  return data.toString('latin1', 0, end);
}

function isTextChunk(type: string): boolean {
  return type === 'tEXt' || type === 'iTXt' || type === 'zTXt';
}

/** Add or replace PNG text chunks; other chunks keep their order. */
export function addPngMetadata(png: Buffer | Uint8Array, meta: Record<string, string>): Buffer {
  const source = Buffer.from(png);
  const entries = Object.entries(meta);
  if (!entries.length) return source;
  const chunks = readChunks(source);
  if (!chunks) return source;
  const keys = new Set(entries.map(([key]) => key));
  const kept = chunks.filter((chunk) => {
    if (!isTextChunk(chunk.type)) return true;
    const key = textKeyword(chunk.data);
    return !key || !keys.has(key);
  });
  const inserts = entries.map(([key, value]) => textChunk(key, value));
  let at = kept.findIndex((chunk) => chunk.type === 'IDAT');
  if (at < 0) at = kept.findIndex((chunk) => chunk.type === 'IEND');
  if (at < 0) at = kept.length;
  return Buffer.concat([
    PNG_SIGNATURE,
    ...kept.slice(0, at).map((chunk) => chunk.raw),
    ...inserts,
    ...kept.slice(at).map((chunk) => chunk.raw),
  ]);
}

/** Read tEXt/iTXt/zTXt chunks back, for verification and diagnostics. */
export function readPngMetadata(png: Buffer | Uint8Array): Record<string, string> {
  const chunks = readChunks(Buffer.from(png));
  if (!chunks) return {};
  const out: Record<string, string> = {};
  for (const chunk of chunks) {
    const key = textKeyword(chunk.data);
    if (!key) continue;
    try {
      if (chunk.type === 'tEXt') {
        out[key] = chunk.data.toString('latin1', key.length + 1);
      } else if (chunk.type === 'zTXt') {
        const compressed = chunk.data.subarray(key.length + 2);
        out[key] = zlib.inflateSync(compressed).toString('latin1');
      } else if (chunk.type === 'iTXt') {
        let offset = key.length + 1;
        const compressed = chunk.data[offset] === 1;
        offset += 2;
        const languageEnd = chunk.data.indexOf(0, offset);
        if (languageEnd < 0) continue;
        const translatedEnd = chunk.data.indexOf(0, languageEnd + 1);
        if (translatedEnd < 0) continue;
        const text = chunk.data.subarray(translatedEnd + 1);
        out[key] = (compressed ? zlib.inflateSync(text) : text).toString('utf8');
      }
    } catch {
      // A malformed ancillary chunk must not make a readable PNG unreadable.
    }
  }
  return out;
}

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RDF/Dublin Core metadata block shared by CLI and editor SVG exports. */
export function svgMetadataXml(meta: Record<string, string>): string {
  const entries = Object.entries(meta);
  if (!entries.length) return '';
  const body: string[] = [];
  for (const [key, value] of entries) {
    const v = xml(value);
    switch (key) {
      case 'Title': body.push(`<dc:title>${v}</dc:title>`); break;
      case 'Author': body.push(`<dc:creator>${v}</dc:creator>`); break;
      case 'Copyright': body.push(`<dc:rights>${v}</dc:rights>`); break;
      case 'Creation Time':
        body.push(`<dc:date>${v}</dc:date>`, `<xmp:CreateDate>${v}</xmp:CreateDate>`, `<xmp:MetadataDate>${v}</xmp:MetadataDate>`);
        break;
      case 'Software': body.push(`<xmp:CreatorTool>${v}</xmp:CreatorTool>`); break;
      case 'Version': body.push(`<mmdx:version>${v}</mmdx:version>`); break;
      case 'Theme': body.push(`<mmdx:theme>${v}</mmdx:theme>`); break;
      case 'Tone': body.push(`<mmdx:tone>${v}</mmdx:tone>`); break;
      case 'Source': body.push(`<dc:source>${v}</dc:source>`); break;
      case 'Description': body.push(`<dc:description>${v}</dc:description>`); break;
      case 'Comment': body.push(`<mmdx:comment>${v}</mmdx:comment>`); break;
      default:
        body.push(`<mmdx:meta mmdx:key="${xml(key)}">${v}</mmdx:meta>`);
    }
  }
  return `<metadata data-mmdx-meta="1">` +
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"` +
    ` xmlns:dc="http://purl.org/dc/elements/1.1/"` +
    ` xmlns:xmp="http://ns.adobe.com/xap/1.0/"` +
    ` xmlns:mmdx="https://github.com/daidaiJ/mmdx/ns/1.0">` +
    `<rdf:Description rdf:about="">${body.join('')}</rdf:Description>` +
    `</rdf:RDF></metadata>`;
}

/** Insert (or replace) the mmdx metadata block directly under the root svg. */
export function addSvgMetadata(svg: string, meta: Record<string, string>): string {
  const xmlBlock = svgMetadataXml(meta);
  if (!xmlBlock) return svg;
  const withoutOld = svg.replace(/<metadata\b[^>]*data-mmdx-meta="1"[\s\S]*?<\/metadata>\s*/i, '');
  const root = /<svg\b[^>]*>/.exec(withoutOld);
  if (!root || root[0].endsWith('/>')) return svg;
  const at = root.index + root[0].length;
  return `${withoutOld.slice(0, at)}\n${xmlBlock}${withoutOld.slice(at)}`;
}

/** `<title>` of an authored HTML page, used when no --title is given. */
export function htmlTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return null;
  const title = match[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return title || null;
}
