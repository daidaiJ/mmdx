> English · [中文](QUALITY.md)

# Quality and release gates

This file records what the render-output lint covers, where the known blind spots are, which community strategies informed it, and the license requirements for a release. It is a roadmap; the executable assertions live in `tests/run.ts`.

## Current coverage

`tests/run.ts` and `src/lint.ts` form the visual lint:

- **Pixels**: four margins, L/R and T/B balance, ink ratio, near-blank and overfull guards.
- **Bottom blank band**: `bottom <= max(90px, 5% × height)`, so a screenshot cannot bake viewport height into the PNG.
- **Very tall pages**: 40 list rows at a fixed 600px width, rendered taller than the initial viewport.
- **DOM geometry**: root horizontal overflow, text clipped by `overflow:hidden`, elements outside `.wrap`, and caption/content vertical overlap.
- **SVG labels**: every `<text>` inside a Pele node must fit its shape rectangle (2px horizontal, 4px vertical tolerance), catching long Latin tokens and unbreakable CJK.
- **Rendered contrast**: each SVG label's `fill` is compared with its actual opaque background; below 3:1 is `low-contrast`, so dark themes are checked after rendering rather than by token alone.
- **Edge clipping**: ink touching any PNG edge (margin ≤ 0) fails, covering arrowheads, rough jitter and hard shadows.
- **Determinism**: the same input rendered twice and compared per pixel (channel tolerance 2); difference ratio must stay under 0.05%; loops over every built-in theme, including the hand-drawn Excalidraw jitter.
- **Contrast**: body `fg` on background ≥ 4.5:1; `muted` / `accent` / `critical` on background ≥ 3.0:1.
- **Stability**: wait for the bundled font before rendering; CSS disables animations/transitions/caret; Chromium runs with `--font-render-hinting=none`.
- **Readable report**: `scripts/lint-visuals.ts` renders the flowchart and card block of every theme, printing measured margins, thresholds and issues line by line; `scripts/lint-a11y.ts` reports contrast, shape outlines, CVD simulation, connectors and series colours; `scripts/calibrate-png.ts` calibrates the palette-PNG gates (next section).
- **Image metadata**: CLI / card / edit PNG and SVG outputs carry `Title` / `Author` / `Copyright` / `Creation Time` / `Software` / `Version` / `Theme` / `Tone` / `Source` plus custom fields; `unit/meta-*`, `cli/meta-image` and `cli/card-meta` assert PNG text chunks, SVG RDF, `--no-meta` and invalid arguments. Metadata is written after quantization / svgo and does not participate in pixel determinism.
- **Contracts**: required `ThemeSpec` fields, `shapeCoverage`, `--style-fill`, block CSS, CLI exit codes/naming/JSON/concurrency.

Current baseline: `225/225 passed`. Measured at 2x: a 44,548px-tall list ended 51px above the image bottom; a 56,952px-tall flowchart ended 22px above it; two consecutive Excalidraw flowchart renders had zero pixel difference. The lowest measured theme values are `fg` 8.35:1 (`acnh`), `muted` 4.54:1 (`ios`), shape outline 3.06:1 (`zed-light` state), connector 3.11:1 (`--tone paper`), series CVD ΔE 0.040 and series colour 3.01:1 (`zed`).

## PNG palette quality gates (measured)

Palette output is judged by **p99 edge OKLab ΔE**: pixels on both sides of a text/stroke luminance edge, compared before and after quantization, with the 99th percentile taken. Flat fills are pinned exactly, so they are not counted separately. The fixed corpus is 8 themes × flowchart / state / class / ER / pie / xychart / mindmap / sequence / table, 72 2× PNGs. Each image is quantized at 128 / 160 / 192 / 224 / 256 colours; the smallest palette where every surface in a theme stays at p99 ≤0.035 sets that theme's floor, and the edge gate is that floor's minimum edge PSNR minus 0.3 dB. The global gate is a uniform 53 dB.

| Theme | Palette floor | Edge gate | Measured worst p99 ΔE | Measured min edge PSNR |
| --- | --- | --- | --- | --- |
| `tech` | 192 | 41.0 | 0.033 | 41.3 |
| `openai` | 224 | 41.0 | 0.034 | 41.4 |
| `excalidraw` | 224 | 41.2 | 0.033 | 41.5 |
| `ios` | 224 | 40.9 | 0.032 | 41.3 |
| `acnh` | 128 | 39.9 | 0.033 | 40.2 |
| `epaper` | 160 | 41.4 | 0.032 | 41.7 |
| `zed` | 128 | 40.7 | 0.034 | 41.0 |
| `zed-light` | 160 | 40.7 | 0.034 | 41.1 |

`paper` shares excalidraw's rough-stroke gate; `document` (arbitrary authored HTML) keeps a conservative 41.0. The three output tiers on the same corpus:

| Tier | Total size | Worst p99 edge ΔE | Median / p95 time |
| --- | --- | --- | --- |
| `fast` | 40.9% | 0.040 | 49 / 169 ms |
| `balanced` | 41.2% | 0.035 | 69 / 170 ms |
| `best` | 41.8% | 0.033 | 81 / 193 ms |

At a fixed palette size the tiers differ by <0.15 dB: k-means has converged, so the tier difference comes from candidate sizes and gates. `fast` also lowers the global floor to 51.5 dB; `best` raises only the edge gate (+0.5 dB) and keeps 53 dB, so text-heavy cards still get a palette at 256 colours. The `mmdx edit` PNG export exposes the same three tiers as a toolbar dropdown (balanced / best / fast); it defaults to the launch-time `--png-quality` and sends the tier per export. Reproduce:

```bash
bun scripts/calibrate-png.ts
# report: review/png-calibration/report.md; corpus PNGs: review/png-calibration/off/
```

## Next: harden the lint

| Scenario | Today | Target |
| --- | --- | --- |
| Very tall screenshots | Bottom-band rule + 40-row fixture | Cover 1x/2x, `--preset slide`, the 16,000px viewport cap, extreme aspect ratios |
| Text overflow | HTML blocks check `scrollWidth/clientWidth`; SVG labels check screen rects | Direct `getComputedTextLength()` comparison, long Latin tokens, unbreakable CJK |
| Horizontal overflow | Root and clipping containers checked | Cover table cells, wide `overflow:visible` content, card grid columns |
| Caption collision | Block-page captions checked | Cover mermaid internal titles, `--title` chrome vs SVG bounds |
| Edge clipping | Ink touching any PNG edge is checked | Local checks for arrowheads, rough jitter and hard shadows |
| Dark-theme legibility | SVG `fill` vs actual background checked at 3:1 | Separate 4.5:1 tier for body text; HTML block text included |
| Determinism | Flowcharts for every built-in theme, two runs | Every diagram type, two runs, SVG structure included |
| Paging / splitting | Info cards split by actual pixel height; `--max-height` adjustable | Block-page boundaries, repeated footers, continued titles for long content |
| Golden baselines | Not enabled | Per-platform baselines in a pinned CI container, compared with pixelmatch |

Order of work:

1. Run `auditLayout` from `src/lint.ts` across all 12 block types and the slide preset; fix false positives, then freeze fixtures.
2. Add SVG text metrics for mermaid output: fail when `getComputedTextLength()` exceeds the node width. (Pele's native `<text>` is already covered; a `foreignObject` path would need its own DOM measurement.)
3. Add golden baselines once CI pins Chromium and fonts; follow Playwright's per-platform layout with pixelmatch `threshold=0.1` and `maxDiffPixels` at 0.1%.
4. Extend `scripts/lint-visuals.ts` to every diagram type and the slide preset, not just flowcharts and cards.
5. Keep measured values and thresholds in failure messages instead of PASS/FAIL only.

Threshold rule: fixed padding uses absolute pixels (90px at 2x); content-height whitespace uses a ratio (5%); take the larger bound to avoid false positives on small images.

## Community strategies referenced

| Source | Strategy | What we adopted |
| --- | --- | --- |
| [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) | Golden images; `threshold` (default 0.2) plus `maxDiffPixels`; per-browser/platform snapshots; explicit `--update-snapshots`; wait for stability | Threshold layering and stability settings; baselines deferred until CI is pinned |
| [jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot) | pixelmatch / SSIM; per-pixel threshold plus whole-image failure threshold; 1% SSIM recommendation | `diffPng` uses channel tolerance plus difference ratio |
| [reg-suit / reg-cli](https://github.com/reg-viz/reg-cli) | Baseline and diff report separated for human review | Manual review of artifacts today; diff report planned for CI |
| [Mermaid](https://github.com/mermaid-js/mermaid) | PR visual regression hosted on Argos, reviewed per PR | No external service; local reproducible review images instead |

## Before release: licenses and attribution

- The component, font, and design-reference inventory is in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
- Full Apache-2.0 and OFL-1.1 texts are in [`licenses/`](../licenses/); the leftover Mermaid / ELK license files cover earlier releases only — those components no longer ship.
- Release archives must include `THIRD_PARTY_NOTICES.md`, `licenses/`, and the binary.
- After dependency upgrades or new scenario templates, verify the upstream license before updating the inventory.
- Regenerate the transitive dependency list from the lockfile before publishing and confirm no copyleft component is missing.

## Related

- [Testing and visual screening](HUMAN_GUIDE.en.md#testing)
- [Style gallery](GALLERY.en.md)
- [Handoff record](handoff/style-ports.md)
