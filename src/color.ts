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

const toSrgb = (n: number): number => {
  const c = Math.max(0, Math.min(1, n));
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
};

const toHex = (c: Rgb): string =>
  '#' + c.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');

/**
 * `fg` at `opacity` over `bg`, mixed per channel. Zed tints an accent by
 * laying the accent itself over the page colour, so the tint follows a dark
 * page instead of washing out toward white.
 */
export function blendOver(fg: string, bg: string, opacity: number): string {
  const a = parseColor(fg);
  const b = parseColor(bg);
  return toHex([0, 1, 2].map((i) => a[i] * opacity + b[i] * (1 - opacity)) as Rgb);
}

function oklabFromLinear(r: number, g: number, b: number): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function linearFromOklab(L: number, a: number, b: number): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

/**
 * A text colour for an opaque background: 15% of the background's own chroma
 * is kept in OKLab so the text belongs to its surroundings, lightness goes to
 * whichever side clears WCAG AA, and a binary search backs the chroma off when
 * the tinted colour alone does not. Zed derives label and chip text this way.
 */
export function textColorFor(background: string): string {
  const lab = oklab(parseColor(background));
  const chroma = Math.hypot(lab[1], lab[2]);
  const hue = Math.atan2(lab[2], lab[1]);
  const bgLuminance = relativeLuminance(background);
  const lightness = bgLuminance > 0.18 ? 0.18 : 0.96;
  const build = (c: number): Rgb => {
    const [r, g, b] = linearFromOklab(lightness, c * Math.cos(hue), c * Math.sin(hue));
    return [toSrgb(r) * 255, toSrgb(g) * 255, toSrgb(b) * 255];
  };
  const passes = (c: Rgb): boolean => contrastRatio(toHex(c), background) >= 4.5;
  const full = build(chroma * 0.15);
  if (passes(full)) return toHex(full);
  let lo = 0;
  let hi = chroma * 0.15;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (passes(build(mid))) lo = mid;
    else hi = mid;
  }
  return passes(build(lo)) ? toHex(build(lo)) : bgLuminance > 0.18 ? '#000000' : '#FFFFFF';
}

/**
 * Scale a colour's OKLab lightness, the way Zed's `adjust_lightness` steps an
 * accent before it derives a chip: darken on a light theme, lighten on a dark
 * one, so the chip stock keeps its hue but moves off the page.
 */
export function scaleLightness(color: string, factor: number): string {
  const lab = oklab(parseColor(color));
  const [r, g, b] = linearFromOklab(Math.max(0, Math.min(1, lab[0] * factor)), lab[1], lab[2]);
  return toHex([toSrgb(r) * 255, toSrgb(g) * 255, toSrgb(b) * 255]);
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
  return oklabFromLinear(toLinear(c[0]), toLinear(c[1]), toLinear(c[2]));
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
