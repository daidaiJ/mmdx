// Editor asset loading, kept out of the normal render path.
//
// Source runs read src/editor/client directly. The compiled binary gets the
// same files from src/editor/embed.generated.ts, which scripts/build.ts fills
// in and then restores to the committed empty stub. `src/embed.ts` never
// imports this module, so `mmdx file.md` pays no editor startup cost.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = ['index.html', 'editor.css', 'editor.js', 'scene.js'] as const;

export type EditorFile = (typeof FILES)[number];

function fromDisk(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of FILES) {
    const p = path.join(HERE, 'client', name);
    if (fs.existsSync(p)) out[name] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

export async function loadEditorFiles(): Promise<Record<string, string>> {
  try {
    const g = (await import('./embed.generated.js')) as { EDITOR_FILES?: Record<string, string> };
    if (g.EDITOR_FILES && Object.keys(g.EDITOR_FILES).length) return g.EDITOR_FILES;
  } catch {
    /* dev/source run */
  }
  return fromDisk();
}
