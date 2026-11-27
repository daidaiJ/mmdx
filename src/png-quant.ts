// Palette PNG output: quantize Chromium screenshots to an indexed PNG when the
// smaller file keeps text and edge detail. The palette builder is the weighted
// k-means used by mpl's PNG encoder (ISC): frequent colors are pinned exactly,
// the remaining centers are seeded by weighted farthest-point and refined by
// Lloyd iterations. The search over palette sizes, the quality tiers and the
// per-theme gates are mmdx's: flat themes tolerate fewer colors than textured
// backdrops, and `best` adds slimdeer's rare-color error feedback pass.

import { PNG } from 'pngjs';
import { parseColor } from './color.ts';
import { deflateSmallest, filterScanlines } from './png-opt.ts';

export type PngColorMode = 'off' | 'auto' | 'near' | number;
export type PngQuality = 'fast' | 'balanced' | 'best';

export interface PngQuantOptions {
  mode: PngColorMode;
  /** theme name, for the quality policy */
  theme: string;
  /** page background used for edge detection; 'transparent' is treated as white */
  background: string;
  /** effort tier; fast trades some quality for speed, best adds a refinement pass */
  quality?: PngQuality;
}

export interface PngQuantResult {
  png: Buffer;
  /** palette entries actually written */
  colors: number;
  psnr: number;
  edgePsnr: number;
  originalBytes: number;
  /** false when the palette file was not smaller (the original is returned) */
  used: boolean;
}

export interface PngPolicy {
  /** minimum PSNR over every pixel */
  global: number;
  /** minimum PSNR over pixels next to a luminance edge (text, strokes) */
  edge: number;
}

const DEFAULT_POLICY: PngPolicy = { global: 53.0, edge: 41.5 };

// `--png-colors near` is the low-loss path for authored HTML: 256 colors at
// 34.5 dB still keep text and photos readable, while gradients that would
// band below the edge floor fall back to the lossless screenshot.
const NEAR_POLICY: PngPolicy = { global: 34.5, edge: 27.5 };

// Calibrated on the fixed eight-theme corpus (72 2x PNGs, 2026-11-21). The
// global gate is a uniform 53 dB floor; each edge gate is the minimum edge
// PSNR at the smallest palette whose worst-case p99 edge Oklab ΔE stays under
// 0.035, minus 0.3 dB. Tier boosts make that standard 0.04 (fast) and 0.033
// (best); fast also lowers the global floor, while best keeps it at 53 dB so
// text-heavy block pages near the ceiling still get a palette. Reproduce with
// `bun scripts/calibrate-png.ts`. `paper` shares excalidraw's roughness;
// `document` covers arbitrary authored HTML.
const THEME_POLICIES: Record<string, Partial<PngPolicy>> = {
  tech: { global: 53.0, edge: 41.0 },
  openai: { global: 53.0, edge: 41.0 },
  ios: { global: 53.0, edge: 40.9 },
  zed: { global: 53.0, edge: 40.7 },
  'zed-light': { global: 53.0, edge: 40.7 },
  excalidraw: { global: 53.0, edge: 41.2 },
  paper: { global: 53.0, edge: 41.2 },
  acnh: { global: 53.0, edge: 39.9 },
  epaper: { global: 53.0, edge: 41.4 },
  document: { global: 53.0, edge: 41.0 },
};

export function pngPolicy(theme: string): PngPolicy {
  const p = THEME_POLICIES[theme] ?? {};
  return {
    global: p.global ?? DEFAULT_POLICY.global,
    edge: p.edge ?? DEFAULT_POLICY.edge,
  };
}

/** Parse a CLI value: auto | near | off | 2..256. */
export function parsePngColorMode(value: string): PngColorMode {
  if (value === 'auto' || value === 'near' || value === 'off') return value;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 2 || n > 256) {
    throw new Error(`--png-colors must be auto, near, off, or an integer 2..256, got "${value}"`);
  }
  return n;
}

export function parsePngQuality(value: string): PngQuality {
  if (value === 'fast' || value === 'balanced' || value === 'best') return value;
  throw new Error(`--png-quality must be fast, balanced, or best, got "${value}"`);
}

interface Tier {
  /** distinct colors sampled for k-means seeding and refinement */
  sample: number;
  /** Lloyd iterations per pass */
  iterations: number;
  /** second pass weight for colors far from their center; 0 disables it */
  feedback: number;
  /** dB added to the edge gate; a negative value also relaxes the global floor */
  gateBoost: number;
  /** palette sizes tried for auto, ascending */
  sizes: number[];
}

const TIERS: Record<PngQuality, Tier> = {
  fast: { sample: 2048, iterations: 3, feedback: 0, gateBoost: -1.5, sizes: [128, 192, 256] },
  balanced: { sample: 8192, iterations: 10, feedback: 0, gateBoost: 0, sizes: [128, 160, 192, 224, 256] },
  best: { sample: 16384, iterations: 10, feedback: 1, gateBoost: 0.5, sizes: [160, 192, 224, 256] },
};

const PIN = 0.0005;
const EDGE_LUMA = 8;

interface Entries {
  /** RGBA key, normalized so every fully transparent pixel shares one key */
  keys: Uint32Array;
  /** RGBA bytes, 4 per entry */
  colors: Uint8Array;
  counts: Float64Array;
  edgeCounts: Float64Array;
  total: number;
  edgePixels: number;
}

interface Quality {
  psnr: number;
  edgePsnr: number;
}

function bgRgb(background: string): [number, number, number] {
  if (background === 'transparent') return [255, 255, 255];
  try {
    return parseColor(background);
  } catch {
    return [255, 255, 255];
  }
}

function histogram(data: Buffer, width: number, height: number, background: string): Entries {
  const n = width * height;
  const bg = bgRgb(background);
  const luma = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const a = data[p + 3] / 255;
    const r = data[p] * a + bg[0] * (1 - a);
    const g = data[p + 1] * a + bg[1] * (1 - a);
    const b = data[p + 2] * a + bg[2] * (1 - a);
    luma[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const edge = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x > 0 && Math.abs(luma[i] - luma[i - 1]) > EDGE_LUMA) {
        edge[i] = 1;
        edge[i - 1] = 1;
      }
      if (y > 0 && Math.abs(luma[i] - luma[i - width]) > EDGE_LUMA) {
        edge[i] = 1;
        edge[i - width] = 1;
      }
    }
  }
  const map = new Map<number, { count: number; edge: number }>();
  let edgePixels = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const a = data[p + 3];
    const key = a === 0 ? 0 : ((data[p] << 24) | (data[p + 1] << 16) | (data[p + 2] << 8) | a) >>> 0;
    const e = map.get(key);
    if (e) {
      e.count++;
      if (edge[i]) e.edge++;
    } else {
      map.set(key, { count: 1, edge: edge[i] ? 1 : 0 });
    }
    if (edge[i]) edgePixels++;
  }
  const sorted = [...map].toSorted((a, b) => b[1].count - a[1].count || a[0] - b[0]);
  const m = sorted.length;
  const keys = new Uint32Array(m);
  const colors = new Uint8Array(m * 4);
  const counts = new Float64Array(m);
  const edgeCounts = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const [key, e] = sorted[i];
    keys[i] = key;
    colors[4 * i] = (key >>> 24) & 255;
    colors[4 * i + 1] = (key >>> 16) & 255;
    colors[4 * i + 2] = (key >>> 8) & 255;
    colors[4 * i + 3] = key & 255;
    counts[i] = e.count;
    edgeCounts[i] = e.edge;
  }
  return { keys, colors, counts, edgeCounts, total: n, edgePixels };
}

const dist2 = (a: Uint8Array, i: number, b: Uint8Array, j: number): number => {
  const dr = a[4 * i] - b[4 * j];
  const dg = a[4 * i + 1] - b[4 * j + 1];
  const db = a[4 * i + 2] - b[4 * j + 2];
  const da = a[4 * i + 3] - b[4 * j + 3];
  return dr * dr + dg * dg + db * db + da * da;
};

function nearest(a: Uint8Array, i: number, b: Uint8Array, k: number): number {
  let best = 0;
  let bd = Infinity;
  for (let j = 0; j < k; j++) {
    const d = dist2(a, i, b, j);
    if (d < bd) {
      bd = d;
      best = j;
    }
  }
  return best;
}

/** Weighted k-means palette, frequent colors pinned. Returns RGBA bytes. */
function paletteFor(e: Entries, max: number, tier: Tier): Uint8Array {
  const n = e.keys.length;
  const k = Math.min(max, n);
  if (k === n) {
    return e.colors.slice();
  }
  const sampleN = Math.min(n, tier.sample);
  const sample = e.colors.subarray(0, sampleN * 4);
  const counts = e.counts.subarray(0, sampleN);
  const centers = new Uint8Array(k * 4);
  let pinned = 0;
  while (pinned < k && pinned < sampleN && e.counts[pinned] >= PIN * e.total) {
    centers.set(sample.subarray(4 * pinned, 4 * pinned + 4), 4 * pinned);
    pinned++;
  }
  let m = pinned;
  const far = new Float64Array(sampleN).fill(Infinity);
  for (let i = 0; i < sampleN; i++) {
    for (let j = 0; j < m; j++) far[i] = Math.min(far[i], dist2(sample, i, centers, j));
  }
  while (m < k) {
    let bi = -1;
    let best = 0;
    for (let i = 0; i < sampleN; i++) {
      const score = far[i] * counts[i];
      if (score > best) {
        best = score;
        bi = i;
      }
    }
    if (bi < 0) break;
    centers.set(sample.subarray(4 * bi, 4 * bi + 4), 4 * m);
    for (let i = 0; i < sampleN; i++) far[i] = Math.min(far[i], dist2(sample, i, centers, m));
    m++;
  }
  refine(centers, counts, sample, sampleN, m, pinned, tier.iterations);
  if (tier.feedback > 0) {
    // slimdeer's rare-color feedback: colors far from their center pull harder
    // in a second pass, so small text/stroke details keep their own centers.
    const weights = new Float64Array(sampleN);
    for (let i = 0; i < sampleN; i++) {
      const j = nearest(sample, i, centers, m);
      let err = 0;
      for (let q = 0; q < 4; q++) err = Math.max(err, Math.abs(sample[4 * i + q] - centers[4 * j + q]));
      weights[i] = counts[i] * (1 + (tier.feedback * err) / 32);
    }
    refine(centers, weights, sample, sampleN, m, pinned, tier.iterations);
  }
  // usage is counted over every distinct color, not only the sample
  const use = new Float64Array(m);
  for (let i = 0; i < n; i++) use[nearest(e.colors, i, centers, m)] += e.counts[i];
  const order = Array.from({ length: m }, (_, j) => j)
    .filter((j) => use[j] > 0)
    .toSorted((a, b) => use[b] - use[a] || a - b);
  const out = new Uint8Array(order.length * 4);
  order.forEach((j, r) => out.set(centers.subarray(4 * j, 4 * j + 4), 4 * r));
  return out;
}

function refine(
  centers: Uint8Array,
  weights: Float64Array,
  sample: Uint8Array,
  sampleN: number,
  m: number,
  pinned: number,
  iterations: number,
): void {
  const sums = new Float64Array(5 * m);
  for (let it = 0; it < iterations; it++) {
    sums.fill(0);
    for (let i = 0; i < sampleN; i++) {
      const j = nearest(sample, i, centers, m);
      const w = weights[i];
      sums[5 * j] += w * sample[4 * i];
      sums[5 * j + 1] += w * sample[4 * i + 1];
      sums[5 * j + 2] += w * sample[4 * i + 2];
      sums[5 * j + 3] += w * sample[4 * i + 3];
      sums[5 * j + 4] += w;
    }
    let moved = false;
    for (let j = pinned; j < m; j++) {
      const w = sums[5 * j + 4];
      if (w === 0) continue;
      for (let q = 0; q < 4; q++) {
        const v = Math.round(sums[5 * j + q] / w);
        if (v !== centers[4 * j + q]) {
          centers[4 * j + q] = v;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function quality(e: Entries, palette: Uint8Array): Quality {
  const k = palette.length / 4;
  let se = 0;
  let edgeSe = 0;
  for (let i = 0; i < e.keys.length; i++) {
    const j = nearest(e.colors, i, palette, k);
    const d = dist2(e.colors, i, palette, j);
    se += d * e.counts[i];
    edgeSe += d * e.edgeCounts[i];
  }
  const globalMse = se / (e.total * 4);
  const edgeMse = e.edgePixels > 0 ? edgeSe / (e.edgePixels * 4) : globalMse;
  return {
    psnr: globalMse === 0 ? Infinity : 10 * Math.log10((255 * 255) / globalMse),
    edgePsnr: edgeMse === 0 ? Infinity : 10 * Math.log10((255 * 255) / edgeMse),
  };
}

function pick(
  e: Entries,
  mode: PngColorMode,
  theme: string,
  tier: Tier,
): { palette: Uint8Array; quality: Quality } | null {
  if (typeof mode === 'number') {
    const palette = paletteFor(e, mode, tier);
    return { palette, quality: quality(e, palette) };
  }
  if (mode === 'near') {
    if (theme !== 'document') return null;
    for (const size of [256, 224, 192]) {
      const palette = paletteFor(e, size, tier);
      const q = quality(e, palette);
      if (q.psnr >= NEAR_POLICY.global && q.edgePsnr >= NEAR_POLICY.edge) {
        return { palette, quality: q };
      }
    }
    return null;
  }
  const policy = pngPolicy(theme);
  const globalGate = policy.global + Math.min(0, tier.gateBoost);
  const edgeGate = policy.edge + tier.gateBoost;
  for (const size of tier.sizes) {
    const palette = paletteFor(e, size, tier);
    const q = quality(e, palette);
    if (q.psnr >= globalGate && q.edgePsnr >= edgeGate) return { palette, quality: q };
  }
  return null;
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

function bitDepthFor(colors: number): number {
  return colors <= 2 ? 1 : colors <= 4 ? 2 : colors <= 16 ? 4 : 8;
}

function encodeIndexed(
  width: number,
  height: number,
  indices: Uint8Array,
  palette: Uint8Array,
  effort: PngQuality = 'balanced',
): Buffer {
  const colors = palette.length / 4;
  const bitDepth = bitDepthFor(colors);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = 3; // indexed
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const plte = Buffer.alloc(colors * 3);
  for (let i = 0; i < colors; i++) {
    plte[3 * i] = palette[4 * i];
    plte[3 * i + 1] = palette[4 * i + 1];
    plte[3 * i + 2] = palette[4 * i + 2];
  }
  let trns: Buffer | null = null;
  let last = -1;
  for (let i = 0; i < colors; i++) if (palette[4 * i + 3] < 255) last = i;
  if (last >= 0) {
    trns = Buffer.alloc(last + 1);
    for (let i = 0; i <= last; i++) trns[i] = palette[4 * i + 3];
  }
  const rowBytes = Math.ceil((width * bitDepth) / 8);
  const packed = Buffer.alloc(rowBytes * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    if (bitDepth === 8) {
      for (let x = 0; x < width; x++) packed[o++] = indices[y * width + x];
    } else {
      const per = 8 / bitDepth;
      for (let x0 = 0; x0 < width; x0 += per) {
        let b = 0;
        for (let k = 0; k < per; k++) {
          const x = x0 + k;
          b = (b << bitDepth) | (x < width ? indices[y * width + x] : 0);
        }
        packed[o++] = b;
      }
    }
  }
  const filtered = effort === 'fast'
    ? [filterScanlines(packed, rowBytes, height, 1, true)]
    : [filterScanlines(packed, rowBytes, height, 1, true),
      filterScanlines(packed, rowBytes, height, 1, false)];
  let idat: Buffer | null = null;
  for (const raw of filtered) {
    const z = deflateSmallest(raw, effort);
    if (!idat || z.length < idat.length) idat = z;
  }
  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
  ];
  if (trns) parts.push(chunk('tRNS', trns));
  parts.push(chunk('IDAT', idat!), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/**
 * Quantize a Chromium screenshot to an indexed PNG. Returns null when the mode
 * is off, when no palette meets the theme's quality gates, or when the indexed
 * file is not smaller; the caller keeps the RGBA screenshot in each case.
 */
export function quantizePng(png: Buffer, opts: PngQuantOptions): PngQuantResult | null {
  if (opts.mode === 'off') return null;
  const img = PNG.sync.read(Buffer.from(png));
  const e = histogram(img.data, img.width, img.height, opts.background);
  const picked = pick(e, opts.mode, opts.theme, TIERS[opts.quality ?? 'balanced']);
  if (!picked) return null;
  const { palette, quality: q } = picked;
  const colors = palette.length / 4;
  if (colors === 0) return null;
  const lookup = new Map<number, number>();
  for (let i = 0; i < e.keys.length; i++) lookup.set(e.keys[i], nearest(e.colors, i, palette, colors));
  const indices = new Uint8Array(img.width * img.height);
  for (let i = 0, p = 0; i < indices.length; i++, p += 4) {
    const a = img.data[p + 3];
    const key = a === 0 ? 0 : ((img.data[p] << 24) | (img.data[p + 1] << 16) | (img.data[p + 2] << 8) | a) >>> 0;
    const j = lookup.get(key);
    if (j === undefined) return null;
    indices[i] = j;
  }
  const out = encodeIndexed(img.width, img.height, indices, palette, opts.quality ?? 'balanced');
  const used = out.length < png.length;
  return {
    png: used ? out : png,
    colors,
    psnr: q.psnr,
    edgePsnr: q.edgePsnr,
    originalBytes: png.length,
    used,
  };
}
