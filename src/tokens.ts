// Semantic color roles for extension blocks and caption chrome.
// `--brand` only remaps accent (+ derived accent-tint). Flowchart shape
// coding in TECH_CSS is intentionally not driven by these variables.

import { blendOver, contrastRatio } from './color.ts';

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
  muted: '#5B6470',
  rule: '#D0D4DC',
  accent: '#2563EB',
  accentTint: '#E5ECFD',
  paper2: '#EEF1F5',
};

export { contrastRatio, relativeLuminance } from './color.ts';

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

/**
 * accent at 12% over `bg` — the light fill for chips / bars. The mix is taken
 * against the page colour, so a tinted chip stays inside a dark theme instead
 * of turning into a white panel.
 */
export function accentTint(accent: string, bg = '#FFFFFF'): string {
  return blendOver(accent, bg, 0.12);
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
