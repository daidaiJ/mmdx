// Lossless PNG recompression for Chromium screenshots. Chromium writes PNGs
// with a fast encoder; re-filtering the scanlines, dropping an all-opaque
// alpha channel, and trying a couple of deflate strategies typically saves
// 10-25% on authored pages without changing a single pixel. Palette output
// stays in png-quant.ts; this module only handles 8-bit RGB/RGBA.

import zlib from 'node:zlib';
import { PNG } from 'pngjs';

export type PngEffort = 'fast' | 'balanced' | 'best';

interface Chunk {
  type: string;
  data: Buffer;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const KEEP_ANCILLARY = new Set(['sRGB', 'gAMA', 'cHRM', 'iCCP', 'pHYs', 'eXIf']);

function readChunks(png: Buffer): Chunk[] | null {
  if (png.length < 20 || !png.subarray(0, 8).equals(SIGNATURE)) return null;
  const out: Chunk[] = [];
  let p = 8;
  while (p + 12 <= png.length) {
    const len = png.readUInt32BE(p);
    if (len > png.length - p - 12) return null;
    const type = png.toString('latin1', p + 4, p + 8);
    out.push({ type, data: png.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return out.length > 0 ? out : null;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function score(row: Buffer): number {
  let s = 0;
  for (let i = 0; i < row.length; i++) {
    const v = row[i];
    s += v < 128 ? v : 256 - v;
  }
  return s;
}

interface Rows {
  /** RGBA pixels as returned by pngjs. */
  data: Buffer;
  width: number;
  height: number;
  /** 3 for RGB output, 4 for RGBA output. */
  bpp: number;
}

/** Filter packed scanlines (any bit depth: bpp is 1 for indexed rows). */
export function filterScanlines(
  raw: Buffer,
  rowBytes: number,
  height: number,
  bpp: number,
  adaptive: boolean,
): Buffer {
  const out = Buffer.alloc((rowBytes + 1) * height);
  const prev = Buffer.alloc(rowBytes);
  const cand = [Buffer.alloc(rowBytes), Buffer.alloc(rowBytes), Buffer.alloc(rowBytes),
    Buffer.alloc(rowBytes), Buffer.alloc(rowBytes)];
  let o = 0;
  for (let y = 0; y < height; y++) {
    const src = y * rowBytes;
    let bestFilter = 0;
    let bestScore = Infinity;
    if (adaptive) {
      for (let f = 0; f < 5; f++) {
        const dst = cand[f];
        for (let i = 0; i < rowBytes; i++) {
          const left = i >= bpp ? raw[src + i - bpp] : 0;
          const up = prev[i];
          const upLeft = i >= bpp ? prev[i - bpp] : 0;
          let v: number;
          if (f === 0) v = raw[src + i];
          else if (f === 1) v = raw[src + i] - left;
          else if (f === 2) v = raw[src + i] - up;
          else if (f === 3) v = raw[src + i] - ((left + up) >> 1);
          else v = raw[src + i] - paeth(left, up, upLeft);
          dst[i] = v & 255;
        }
        const s = score(dst);
        if (s < bestScore) {
          bestScore = s;
          bestFilter = f;
        }
      }
    } else {
      raw.copy(cand[0], 0, src, src + rowBytes);
    }
    out[o++] = bestFilter;
    cand[bestFilter].copy(out, o);
    o += rowBytes;
    raw.copy(prev, 0, src, src + rowBytes);
  }
  return out;
}

function filterRows(rows: Rows, adaptive: boolean): Buffer {
  const { data, width, height, bpp } = rows;
  const rowBytes = width * bpp;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const src = y * width * 4;
    if (bpp === 3) {
      for (let x = 0, p = src, q = y * rowBytes; x < width; x++, p += 4, q += 3) {
        raw[q] = data[p];
        raw[q + 1] = data[p + 1];
        raw[q + 2] = data[p + 2];
      }
    } else {
      data.copy(raw, y * rowBytes, src, src + rowBytes);
    }
  }
  return filterScanlines(raw, rowBytes, height, bpp, adaptive);
}

function strategies(effort: PngEffort): number[] {
  if (effort === 'fast') return [zlib.constants.Z_DEFAULT_STRATEGY];
  if (effort === 'balanced') {
    return [zlib.constants.Z_DEFAULT_STRATEGY, zlib.constants.Z_FILTERED];
  }
  return [
    zlib.constants.Z_DEFAULT_STRATEGY,
    zlib.constants.Z_FILTERED,
    zlib.constants.Z_RLE,
    zlib.constants.Z_HUFFMAN_ONLY,
  ];
}

export function deflateSmallest(raw: Buffer, effort: PngEffort): Buffer {
  let best: Buffer | null = null;
  for (const strategy of strategies(effort)) {
    const z = zlib.deflateSync(raw, { level: 9, memLevel: 9, strategy });
    if (!best || z.length < best.length) best = z;
  }
  return best!;
}

/**
 * Re-encode an 8-bit truecolor PNG when the result is smaller. Palette,
 * grayscale, 16-bit and interlaced inputs are returned untouched.
 */
export function optimizePngLossless(png: Buffer | Uint8Array, effort: PngEffort = 'balanced'): Buffer {
  const src = Buffer.isBuffer(png) ? png : Buffer.from(png);
  try {
    const chunks = readChunks(src);
    if (!chunks) return src;
    const ihdr = chunks.find((c) => c.type === 'IHDR');
    if (!ihdr || ihdr.data.length !== 13) return src;
    const width = ihdr.data.readUInt32BE(0);
    const height = ihdr.data.readUInt32BE(4);
    const bitDepth = ihdr.data[8];
    const colorType = ihdr.data[9];
    const interlace = ihdr.data[12];
    if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) return src;
    if (width < 1 || height < 1) return src;

    const img = PNG.sync.read(src);
    let opaque = colorType === 2;
    if (!opaque) {
      opaque = true;
      for (let i = 3; i < img.data.length; i += 4) {
        if (img.data[i] !== 255) {
          opaque = false;
          break;
        }
      }
    }
    const bpp = opaque ? 3 : 4;
    const rows: Rows = { data: img.data, width, height, bpp };
    const variants = effort === 'fast'
      ? [filterRows(rows, true)]
      : [filterRows(rows, true), filterRows(rows, false)];

    let best: Buffer | null = null;
    for (const raw of variants) {
      const z = deflateSmallest(raw, effort);
      if (!best || z.length < best.length) best = z;
    }

    const outIhdr = Buffer.from(ihdr.data);
    outIhdr[9] = opaque ? 2 : 6;
    const parts = [SIGNATURE, chunk('IHDR', outIhdr)];
    for (const c of chunks) {
      if (KEEP_ANCILLARY.has(c.type)) parts.push(chunk(c.type, c.data));
    }
    parts.push(chunk('IDAT', best!), chunk('IEND', Buffer.alloc(0)));
    const out = Buffer.concat(parts);
    return out.length < src.length ? out : src;
  } catch {
    return src;
  }
}
