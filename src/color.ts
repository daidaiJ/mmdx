// Colour maths shared by the theme gates and the visual lint: WCAG relative
// luminance / contrast, colour-vision-deficiency simulation, and an OKLab
// perceptual distance. Kept free of Node and browser dependencies so both the
// CLI side and the in-page audit can use it.

export type Rgb = [number, number, number];

export function parseColor(color: string): Rgb {
  const v = color.trim().toLowerCase();
  const m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
  }
  const h = /^#([0-9a-f]{3,8})$/.exec(v);
  if (h) {
    let s = h[1];
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    return [
      parseInt(s.slice(0, 2), 16),
      parseInt(s.slice(2, 4), 16),
      parseInt(s.slice(4, 6), 16),
    ];
  }
  throw new Error(`unparsed colour "${color}"`);
}

const toLinear = (n: number): number => {
  const s = n / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance. */
export function relativeLuminance(color: string): number {
  const c = parseColor(color);
  return 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
}

/** WCAG 2.x contrast ratio, 1:1 (identical) to 21:1 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export type CvdKind = 'protan' | 'deutan' | 'tritan';

/** Machado et al. (2009) colour-vision-deficiency matrices at severity 1.0. */
const CVD_MATRIX: Record<CvdKind, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};

export const CVD_KINDS: CvdKind[] = ['protan', 'deutan', 'tritan'];

export function simulateCvd(color: string, kind: CvdKind): Rgb {
  const c = parseColor(color);
  const m = CVD_MATRIX[kind];
  return [0, 1, 2].map((i) =>
    Math.max(0, Math.min(255, m[i][0] * c[0] + m[i][1] * c[1] + m[i][2] * c[2])),
  ) as Rgb;
}

function oklab(c: Rgb): Rgb {
  const [r, g, b] = [toLinear(c[0]), toLinear(c[1]), toLinear(c[2])];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

/**
 * Perceptual distance (OKLab) between two colours, so a palette can be checked
 * for the difference a viewer with a colour-vision deficiency would still see.
 * A luminance-only metric calls blue and purple identical for everyone.
 */
export function perceptualDelta(a: string | Rgb, b: string | Rgb): number {
  const x = oklab(typeof a === 'string' ? parseColor(a) : a);
  const y = oklab(typeof b === 'string' ? parseColor(b) : b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
