// Accessibility report for the theme palettes: WCAG text tiers, the contrast
// between each shape's outline and its own fill, and how the shape colours hold
// up under simulated colour-vision deficiency. Exit 1 when a theme misses a
// bar, so it can run as a gate as well as by hand.
// Run: node --experimental-transform-types --no-warnings scripts/lint-a11y.ts
import { contrastRatio, CVD_KINDS, perceptualDelta, simulateCvd } from '../src/color.ts';
import { getTheme, paperize, PRESETS, type ThemeSpec } from '../src/themes.ts';

const FAMILIES = ['process', 'decision', 'state', 'store'] as const;
const TEXT_MIN = 4.5;      // WCAG AA body text
const AAA_MIN = 7;         // WCAG AAA body text
const MARK_MIN = 3;        // WCAG AA non-text marks
const CVD_MIN = 0.02;      // OKLab ΔE still visible after simulation

const failures: string[] = [];
const themes: Array<[string, ThemeSpec]> = Object.keys(PRESETS).map((n) => [n, getTheme(n)]);
themes.push(['paper (tone)', paperize(getTheme('tech'))]);

for (const [name, t] of themes) {
  const bg = t.vars.bg;
  const line = (label: string, value: number, min: number) => {
    const ok = value >= min;
    if (!ok) failures.push(`${name} ${label} ${value.toFixed(2)} < ${min}`);
    return `${value.toFixed(2)}${ok ? '' : '!'}`;
  };
  console.log(`\n== ${name}  bg ${bg}`);
  console.log(`   text      fg ${line('fg', contrastRatio(t.vars.fg, bg), AAA_MIN)} (AAA ${AAA_MIN})` +
    `  muted ${line('muted', contrastRatio(t.vars.muted, bg), TEXT_MIN)}` +
    `  accent ${line('accent', contrastRatio(t.vars.accent, bg), MARK_MIN)}` +
    `  critical ${line('critical', contrastRatio(t.vars.critical, bg), MARK_MIN)}`);

  for (const f of FAMILIES) {
    const { fill, stroke } = t.shapes[f];
    const onBg = contrastRatio(stroke, bg);
    const onFill = contrastRatio(stroke, fill);
    const ok = onBg >= MARK_MIN && onFill >= MARK_MIN;
    if (!ok) failures.push(`${name} ${f} outline bg=${onBg.toFixed(2)} fill=${onFill.toFixed(2)} < ${MARK_MIN}`);
    console.log(`   ${f.padEnd(9)} outline/bg ${onBg.toFixed(2)}  outline/fill ${onFill.toFixed(2)}${ok ? '' : '!'}`);
  }

  // Families that share an outline colour are told apart by shape, not colour;
  // only the distinct ones have to survive the simulation.
  const strokes = FAMILIES.map((f) => ({ f, stroke: t.shapes[f].stroke }));
  const cvd = CVD_KINDS.map((kind) => {
    let min = 9;
    let pair = '';
    for (let i = 0; i < strokes.length; i++) {
      for (let j = i + 1; j < strokes.length; j++) {
        if (strokes[i].stroke === strokes[j].stroke) continue;
        const d = perceptualDelta(simulateCvd(strokes[i].stroke, kind), simulateCvd(strokes[j].stroke, kind));
        if (d < min) { min = d; pair = `${strokes[i].f}/${strokes[j].f}`; }
      }
    }
    if (min < 9 && min < CVD_MIN) failures.push(`${name} ${kind} ${pair} ΔE ${min.toFixed(3)} < ${CVD_MIN}`);
    return `${kind} ${min === 9 ? 'n/a' : min.toFixed(3)}${min !== 9 && min < CVD_MIN ? '!' : ''}${pair && min < 9 ? ` (${pair})` : ''}`;
  });
  console.log(`   colour vision  ${cvd.join('  ')}`);
}

console.log(`\n${failures.length ? `${failures.length} issue(s):\n  ` + failures.join('\n  ') : 'all themes pass.'}`);
process.exit(failures.length ? 1 : 0);
