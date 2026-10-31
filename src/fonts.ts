// Bundled font registry: every family a theme names ahead of its generic
// fallbacks lives here, so a diagram or block page renders the same on a
// machine with none of these fonts installed. The subsets ship in
// assets/fonts/ with their OFL texts; scripts/subset-font.py documents the
// coverage contract and the upstream sources.

export interface FontFaceSpec {
  /** file under assets/fonts/ */
  file: string;
  /** @font-face weight descriptor (`400`, or a variable range like `100 800`) */
  weight: string;
  style?: 'normal' | 'italic';
  /** split display faces carry one chunk each; the range keeps them from shadowing */
  unicodeRange?: string;
}

export interface BundledFont {
  /** CSS family name, as theme stacks and authored HTML name it */
  family: string;
  faces: FontFaceSpec[];
}

/** the base face every diagram and block page gets */
export const BASE_FAMILY = 'Noto Sans SC';

/** code, kickers and footers on block pages, in every theme */
export const MONO_FAMILY = 'JetBrains Mono';

/** authored HTML documents may name these; diagram pages inject them per theme */
export const DOC_FAMILIES = ['Noto Serif SC', 'LXGW WenKai'];

export const BUNDLED_FONTS: BundledFont[] = [
  {
    family: BASE_FAMILY,
    faces: [{ file: 'NotoSansSC-Subset.woff2', weight: '100 900' }],
  },
  {
    family: 'Noto Serif SC',
    faces: [{ file: 'NotoSerifSC-Subset.woff2', weight: '200 900' }],
  },
  {
    family: 'LXGW WenKai',
    faces: [{ file: 'LXGWWenKai-Subset.woff2', weight: '400' }],
  },
  {
    // Upstream ships Excalifont as hashed per-script chunks; we keep the two
    // latin ones (basic latin + latin-1 + punctuation + symbols, then latin
    // extended), which is the same contract the other subsets follow.
    family: 'Excalifont',
    faces: [
      {
        file: 'Excalifont-0.woff2',
        weight: '400',
        unicodeRange:
          'U+0020-007E,U+00A0-00A3,U+00A5-00A6,U+00A8-00AB,U+00AD-00B1,U+00B4,' +
          'U+00B6-00B8,U+00BA-00FF,U+0131,U+0152-0153,U+02BC,U+02C6,U+02DA,U+02DC,' +
          'U+0304,U+0308,U+2013-2014,U+2018-201A,U+201C-201E,U+2020,U+2022,' +
          'U+2024-2026,U+2030,U+2039-203A,U+20AC,U+2122,U+2212',
      },
      {
        file: 'Excalifont-1.woff2',
        weight: '400',
        unicodeRange:
          'U+0100-0130,U+0132-0137,U+0139-0149,U+014C-0151,U+0154-017E,U+0192,' +
          'U+01FC-01FF,U+0218-021B,U+0237,U+1E80-1E85,U+1EF2-1EF3,U+2113',
      },
    ],
  },
  {
    family: 'ZCOOL KuaiLe',
    faces: [{ file: 'ZCOOLKuaiLe-Subset.woff2', weight: '400' }],
  },
  {
    family: 'Baloo 2',
    faces: [{ file: 'Baloo2-Subset.woff2', weight: '400 800' }],
  },
  {
    family: 'Newsreader',
    faces: [{ file: 'Newsreader-Subset.woff2', weight: '200 800' }],
  },
  {
    family: MONO_FAMILY,
    faces: [{ file: 'JetBrainsMono-Subset.woff2', weight: '100 800' }],
  },
];

const BY_FAMILY = new Map(BUNDLED_FONTS.map((f) => [f.family, f]));
const BY_LOWER = new Map(BUNDLED_FONTS.map((f) => [f.family.toLowerCase(), f]));

export function bundledFont(family: string): BundledFont | undefined {
  return BY_FAMILY.get(family) ?? BY_LOWER.get(family.toLowerCase());
}

export function isBundledFamily(family: string): boolean {
  return BY_LOWER.has(family.toLowerCase());
}

/**
 * Every bundled family. Dev tools that render all themes through one renderer
 * (gallery, review sheets, visual lint) pass this: an extra `@font-face` is
 * inert, and each theme's stack still picks its own family.
 */
export function allFamilies(): string[] {
  return BUNDLED_FONTS.map((f) => f.family);
}

/** every file name the build has to inline, in registry order */
export function fontFiles(): string[] {
  return BUNDLED_FONTS.flatMap((f) => f.faces.map((face) => face.file));
}

/** `@font-face` rules for the named families, using the given file→base64 map */
export function faceCss(families: string[], files: Record<string, string>): string {
  const out: string[] = [];
  for (const family of families) {
    const font = BY_FAMILY.get(family);
    if (!font) continue;
    for (const face of font.faces) {
      const b64 = files[face.file];
      if (!b64) continue;
      out.push(
        `@font-face{font-family:'${family}';` +
        `src:url(data:font/woff2;base64,${b64}) format('woff2');` +
        `font-weight:${face.weight};font-style:${face.style ?? 'normal'};` +
        (face.unicodeRange ? `unicode-range:${face.unicodeRange};` : '') +
        'font-display:block;}',
      );
    }
  }
  return out.join('');
}
