// Asset loading with a dual path:
//  - dev (bun/node run from the repo): read from vendor/ and assets/
//  - compiled binary: scripts/build.ts generates embed.generated.ts with the
//    assets inlined; the dynamic import below is resolved at build time.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface Assets {
  mermaidJs: string;
  elkJs: string;
  /** Pele UMD bundle (`vendor/pele.global.js`); '' when not vendored */
  peleJs: string;
  /** base64 woff2 of the bundled CJK sans, or null when not bundled */
  fontB64: string | null;
  /** base64 woff2 of the bundled CJK serif (authored HTML pages), or null */
  fontSerifB64: string | null;
  /** base64 woff2 of the bundled CJK kai (hand-drawn figure labels), or null */
  fontKaiB64: string | null;
}

async function fromGenerated(): Promise<Assets | null> {
  try {
    // build-time generated module (scripts/build.ts); committed as an empty
    // stub so the import always resolves
    const g = (await import('./embed.generated.js')) as {
      MERMAID_JS: string;
      ELK_JS: string;
      PELE_JS: string;
      FONT_B64: string | null;
      FONT_SERIF_B64: string | null;
      FONT_KAI_B64: string | null;
      BUILD_VERSION?: string | null;
    };
    // the committed stub (and any build predating the pele asset) is empty —
    // that means "not built", so fall back to reading vendor/ from disk
    if (g.MERMAID_JS && g.PELE_JS) {
      return {
        mermaidJs: g.MERMAID_JS,
        elkJs: g.ELK_JS,
        peleJs: g.PELE_JS,
        fontB64: g.FONT_B64,
        fontSerifB64: g.FONT_SERIF_B64,
        fontKaiB64: g.FONT_KAI_B64,
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
    cachedVersion = g.BUILD_VERSION || '1.4.0';
  } catch {
    cachedVersion = '1.4.0';
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
  let fontSerifB64: string | null = null;
  let fontKaiB64: string | null = null;
  const b64Of = (name: string): string | null => {
    const p = path.join(PKG_DIR, 'assets', 'fonts', name);
    return fs.existsSync(p) ? fs.readFileSync(p).toString('base64') : null;
  };
  fontB64 = b64Of('NotoSansSC-Subset.woff2');
  fontSerifB64 = b64Of('NotoSerifSC-Subset.woff2');
  fontKaiB64 = b64Of('LXGWWenKai-Subset.woff2');
  return {
    mermaidJs: read('vendor/mermaid.min.js'),
    elkJs: fs.existsSync(path.join(PKG_DIR, 'vendor/elk.bundle.mjs'))
      ? read('vendor/elk.bundle.mjs')
      : '',
    peleJs: fs.existsSync(path.join(PKG_DIR, 'vendor/pele.global.js'))
      ? read('vendor/pele.global.js')
      : '',
    fontB64,
    fontSerifB64,
    fontKaiB64,
  };
}
