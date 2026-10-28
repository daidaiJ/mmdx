// Asset loading with a dual path:
//  - dev (bun/node run from the repo): read from vendor/ and assets/
//  - compiled binary: scripts/build.ts generates embed.generated.ts with the
//    assets inlined; the dynamic import below is resolved at build time.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface Assets {
  /** Pele browser bundle (the only engine) */
  peleJs: string;
  /** rough.js UMD bundle, loaded only by hand-drawn themes */
  roughJs: string;
  /** base64 woff2 of the bundled CJK font, or null when not bundled */
  fontB64: string | null;
  /** base64 woff2 of the serif CJK subset (authored HTML documents only) */
  fontSerifB64: string | null;
  /** base64 woff2 of the kai CJK subset (hand-drawn figure labels) */
  fontKaiB64: string | null;
}

async function fromGenerated(): Promise<Assets | null> {
  try {
    // build-time generated module (scripts/build.ts); committed as an empty
    // stub so the import always resolves
    const g = (await import('./embed.generated.js')) as {
      PELE_JS?: string;
      ROUGH_JS?: string;
      FONT_B64: string | null;
      FONT_SERIF_B64?: string | null;
      FONT_KAI_B64?: string | null;
      BUILD_VERSION?: string | null;
    };
    // the committed stub is empty — that means "not built", fall back to files
    if (g.PELE_JS) {
      return {
        peleJs: g.PELE_JS,
        roughJs: g.ROUGH_JS ?? '',
        fontB64: g.FONT_B64,
        fontSerifB64: g.FONT_SERIF_B64 ?? null,
        fontKaiB64: g.FONT_KAI_B64 ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

let cachedVersion: string | null = null;
/** Version injected at build time from the git tag; falls back to the package version. */
export async function getBuildVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const g = (await import('./embed.generated.js')) as { BUILD_VERSION?: string | null };
    cachedVersion = g.BUILD_VERSION || '2.0.0';
  } catch {
    cachedVersion = '2.0.0';
  }
  return cachedVersion;
}

function read(rel: string): string {
  return fs.readFileSync(path.join(PKG_DIR, rel), 'utf8');
}

export async function loadAssets(): Promise<Assets> {
  const generated = await fromGenerated();
  if (generated) return generated;
  let fontB64: string | null = null;
  const fontPath = path.join(PKG_DIR, 'assets', 'fonts', 'NotoSansSC-Subset.woff2');
  if (fs.existsSync(fontPath)) fontB64 = fs.readFileSync(fontPath).toString('base64');
  const optionalFont = (file: string): string | null => {
    const p = path.join(PKG_DIR, 'assets', 'fonts', file);
    return fs.existsSync(p) ? fs.readFileSync(p).toString('base64') : null;
  };
  return {
    peleJs: fs.existsSync(path.join(PKG_DIR, 'vendor/pele.global.js'))
      ? read('vendor/pele.global.js')
      : '',
    roughJs: fs.existsSync(path.join(PKG_DIR, 'vendor/rough.js'))
      ? read('vendor/rough.js')
      : '',
    fontB64,
    fontSerifB64: optionalFont('NotoSerifSC-Subset.woff2'),
    fontKaiB64: optionalFont('LXGWWenKai-Subset.woff2'),
  };
}
