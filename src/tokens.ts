// Semantic color roles for extension blocks and caption chrome.
// `--brand` only remaps accent (+ derived accent-tint). Flowchart shape
// coding in TECH_CSS is intentionally not driven by these variables.

export interface Tokens {
  paper: string;
  ink: string;
  muted: string;
  rule: string;
  accent: string;
  accentTint: string;
  paper2: string;
}

export const DEFAULT_TOKENS: Tokens = {
  paper: '#FFFFFF',
  ink: '#1B1F26',
  muted: '#6B7280',
  rule: '#E6E7EC',
  accent: '#4098FC',
  accentTint: '#EEF3F8',
  paper2: '#F5F6F8',
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(raw: string): string | null {
  const m = HEX.exec(raw.trim());
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return `#${h.toUpperCase()}`;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** accent @ 0.12 over white — light fill for chips / bars. */
export function accentTint(accent: string): string {
  const [r, g, b] = hexRgb(accent);
  return rgbHex(255 * 0.88 + r * 0.12, 255 * 0.88 + g * 0.12, 255 * 0.88 + b * 0.12);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export interface BrandResult {
  tokens: Tokens;
  /** set when white-on-accent fails WCAG AA (4.5:1); never mutates the color */
  warning?: string;
}

export function applyBrand(hex: string): BrandResult {
  const accent = normalizeHex(hex);
  if (!accent) {
    throw new Error(`--brand must be a hex color (#RGB or #RRGGBB), got "${hex}"`);
  }
  const tokens: Tokens = { ...DEFAULT_TOKENS, accent, accentTint: accentTint(accent) };
  const cWhite = contrastRatio('#FFFFFF', accent);
  const warning =
    cWhite < 4.5
      ? `brand accent ${accent} on white text is ${cWhite.toFixed(2)}:1 (WCAG AA needs 4.5:1); color kept as given`
      : undefined;
  return { tokens, warning };
}

export function tokenCss(tokens: Tokens): string {
  return (
    `:root{` +
    `--paper:${tokens.paper};` +
    `--ink:${tokens.ink};` +
    `--muted:${tokens.muted};` +
    `--rule:${tokens.rule};` +
    `--accent:${tokens.accent};` +
    `--accent-tint:${tokens.accentTint};` +
    `--paper-2:${tokens.paper2};` +
    `}`
  );
}
