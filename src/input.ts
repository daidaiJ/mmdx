// Input discovery shared by the render CLI and the editor. A fenced block is
// addressed by its 1-based index within the file, so `mmdx edit file.md
// --index 2` opens the same diagram the exporter calls `file-m2`.

import path from 'node:path';
import { fenceKind, type BlockKind } from './blocks.ts';

export interface InputBlock {
  input: string;
  base: string;
  index: number;
  line: number;
  code: string;
  kind: BlockKind;
}

const FENCE_RE = /^[ \t]*```([A-Za-z0-9_-]+)[^\n]*\n([\s\S]*?)^[ \t]*```\s*$/gm;

export function extractBlocks(input: string, raw: string): InputBlock[] {
  if (/\.html?$/i.test(input)) {
    // authored HTML document: shot as-is, never a fence kind in .md files
    const code = raw.trim();
    const base = path.basename(input).replace(/\.html?$/i, '');
    return code ? [{ input, base, index: 1, line: 1, code, kind: 'html' }] : [];
  }
  const isMd = /\.md$|\.markdown$/i.test(input);
  if (isMd) {
    const blocks: InputBlock[] = [];
    const base = path.basename(input).replace(/\.(md|markdown)$/i, '');
    FENCE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FENCE_RE.exec(raw)) !== null) {
      const kind = fenceKind(m[1]);
      if (kind === 'unknown') continue;
      const code = m[2].replace(/\r\n/g, '\n').trim();
      if (!code) continue;
      const line = raw.slice(0, m.index).split('\n').length;
      blocks.push({ input, base, index: blocks.length + 1, line, code, kind });
    }
    return blocks;
  }
  const code = raw.trim();
  const base = input === '-' ? 'diagram' : path.basename(input).replace(/\.(md|markdown|mmd)$/i, '');
  return code ? [{ input, base, index: 1, line: 1, code, kind: 'mermaid' }] : [];
}

export function frontTitle(code: string): string {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(code);
  if (!m) return '';
  const t = /^title:\s*(.+)$/m.exec(m[1]);
  return t ? t[1].trim().replace(/^["']|["']$/g, '') : '';
}
