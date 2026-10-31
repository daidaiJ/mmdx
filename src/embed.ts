// Asset loading with a dual path:
//  - dev (bun/node run from the repo): read from vendor/ and assets/
//  - compiled binary: scripts/build.ts generates embed.generated.ts with the
//    assets inlined; the dynamic import below is resolved at build time.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFiles } from './fonts.ts';

const PKG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface Assets {
  /** Pele browser bundle (the only engine) */
  peleJs: string;
  /** rough.js UMD bundle, loaded only by hand-drawn themes */
  roughJs: string;
  /** bundled font files as base64 woff2, keyed by file name under assets/fonts/ */
  fonts: Record<string, string>;
}

async function fromGenerated(): Promise<Assets | null> {
  try {
    // build-time generated module (scripts/build.ts); committed as an empty
    // stub so the import always resolves
    const g = (await import('./embed.generated.js')) as {
      PELE_JS?: string;
      ROUGH_JS?: string;
      FONT_FILES?: Record<string, string>;
      BUILD_VERSION?: string | null;
    };
    // the committed stub is empty — that means "not built", fall back to files
    if (g.PELE_JS) {
      return {
        peleJs: g.PELE_JS,
        roughJs: g.ROUGH_JS ?? '',
        fonts: g.FONT_FILES ?? {},
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
    cachedVersion = g.BUILD_VERSION || '3.0.0';
  } catch {
    cachedVersion = '3.0.0';
  }
  return cachedVersion;
}

function read(rel: string): string {
  return fs.readFileSync(path.join(PKG_DIR, rel), 'utf8');
}

export async function loadAssets(): Promise<Assets> {
  const generated = await fromGenerated();
  if (generated) return generated;
  const fonts: Record<string, string> = {};
  for (const file of fontFiles()) {
    const p = path.join(PKG_DIR, 'assets', 'fonts', file);
    if (fs.existsSync(p)) fonts[file] = fs.readFileSync(p).toString('base64');
  }
  return {
    peleJs: fs.existsSync(path.join(PKG_DIR, 'vendor/pele.global.js'))
      ? read('vendor/pele.global.js')
      : '',
    roughJs: fs.existsSync(path.join(PKG_DIR, 'vendor/rough.js'))
      ? read('vendor/rough.js')
      : '',
    fonts,
  };
}
