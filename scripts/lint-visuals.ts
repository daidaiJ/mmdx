// Visual lint report. Renders the theme matrix and prints measured geometry,
// text-fit, contrast and margin results. Exit 1 when any check fails.
// Run: node --experimental-transform-types --no-warnings scripts/lint-visuals.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { blockPage, htmlKindToInner } from '../src/blocks.ts';
import { loadAssets } from '../src/embed.ts';
import { bottomBlankLimit } from '../src/lint.ts';
import { Renderer } from '../src/render.ts';
import { getTheme, PRESETS, type ThemeSpec } from '../src/themes.ts';
import { accentTint } from '../src/tokens.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const flow = fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', 'flowchart.md'), 'utf8')
  .match(/```mermaid\r?\n([\s\S]*?)```/)![1];
const card = fs.readFileSync(path.join(ROOT, 'tests', 'edge', 'card.md'), 'utf8')
  .match(/```card\r?\n([\s\S]*?)```/)![1];

function tokensFor(t: ThemeSpec) {
  return {
    paper: t.vars.bg, ink: t.vars.fg, muted: t.vars.muted, rule: t.vars.border,
    accent: t.vars.accent, accentTint: accentTint(t.vars.accent, t.vars.bg), paper2: t.vars.surfaceAlt,
  };
}

function margins(png: Buffer) {
  const img = PNG.sync.read(png);
  const { width, height, data } = img;
  const bg = [data[0], data[1], data[2], data[3]];
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const d = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) +
        Math.abs(data[i + 2] - bg[2]) + Math.abs(data[i + 3] - bg[3]);
      if (d > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { width, height, l: minX, r: width - 1 - maxX, t: minY, b: height - 1 - maxY };
}

const r = await Renderer.create(await loadAssets(), { scale: 2, width: 1200 });
let failed = 0;
const report: string[] = [];

for (const name of Object.keys(PRESETS)) {
  const theme = getTheme(name);
  const tokens = tokensFor(theme);
  const { svg } = await r.render({
    code: flow, background: theme.background, needPng: false,
    scale: 2, width: 1200, theme,
    mermaidConfig: (PRESETS[name]?.config ?? {}) as Record<string, unknown>,
    fontSize: 15, padding: 0, svgThemeable: false, titlePos: 'top', titleText: '',
    remap: PRESETS[name]?.remap,
  });
  const { png, issues } = await r.renderHtmlAudit(
    blockPage(`<div class="fig">${svg}</div>`, { tokens, tone: 'neutral' }),
    theme.background,
  );
  const m = margins(png);
  const bad = issues.filter((i) => i.kind !== 'caption-overlap');
  const edge = (['l', 'r', 't', 'b'] as const).filter((k) => m[k] <= 0);
  const blank = m.b > bottomBlankLimit(m.height);
  if (bad.length || edge.length || blank) failed++;
  report.push(
    `${bad.length || edge.length || blank ? 'FAIL' : 'PASS'}  ${name.padEnd(18)} ` +
    `${m.width}x${m.height} L${m.l} R${m.r} T${m.t} B${m.b}/${bottomBlankLimit(m.height)} ` +
    `issues=${bad.length}${bad.length ? ` (${bad.slice(0, 3).map((i) => `${i.kind}:${i.detail}`).join(' | ')})` : ''}` +
    `${edge.length ? ` edge=${edge.join('')}` : ''}${blank ? ' bottom-blank' : ''}`,
  );
}

for (const name of Object.keys(PRESETS)) {
  const theme = getTheme(name);
  const inner = htmlKindToInner('card', card);
  const { png, issues } = await r.renderHtmlAudit(
    blockPage(inner, { blockCss: theme.blockCss, tokens: tokensFor(theme), tone: 'neutral' }),
    theme.background,
  );
  const m = margins(png);
  const bad = issues.filter((i) => i.kind !== 'caption-overlap');
  const edge = (['l', 'r', 't', 'b'] as const).filter((k) => m[k] <= 0);
  const blank = m.b > bottomBlankLimit(m.height);
  if (bad.length || edge.length || blank) failed++;
  report.push(
    `${bad.length || edge.length || blank ? 'FAIL' : 'PASS'}  block/${name.padEnd(12)} ` +
    `${m.width}x${m.height} L${m.l} R${m.r} B${m.b}/${bottomBlankLimit(m.height)} issues=${bad.length}` +
    `${edge.length ? ` edge=${edge.join('')}` : ''}${blank ? ' bottom-blank' : ''}`,
  );
}

await r.close();
for (const line of report) console.log(line);
console.log(`\n${report.length - failed}/${report.length} passed.`);
process.exit(failed ? 1 : 0);
