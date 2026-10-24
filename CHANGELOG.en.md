> English · [中文](CHANGELOG.md)

# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned per [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-10-25

- New `file.html` whole-page input: the page is screenshotted as-is to PNG (fullPage, PNG only), keeping its own styles, scripts and background; `--width` is the layout viewport (an explicit, narrower `body` width wins), `--scale` / `--background` apply — a Playwright-free export backend for hand-drawn HTML workflows (e.g. diagram-design)
- HTML shots get the offline-Chinese guarantee: the bundled Noto Sans SC is registered as `'Noto Sans SC'` and aliased into the `sans-serif` / `serif` fallbacks for CJK code ranges — declared Latin fonts render untouched, Chinese glyphs stay offline-consistent, and the page's own CJK fonts still win
- A ` ```html ` fence inside `.md` is still not supported (standalone `.html` / `.htm` files only), so the extension blocks' layout discipline cannot be bypassed; HTML input carries no budget/lint/pixel-screening contract
- Docs spell out the pairing: skill §1c-4 / AGENT_GUIDE / HUMAN_GUIDE / README in both languages — trigger words, high-fidelity tips (`--scale 3`, canvas-width alignment, explicit transparent), and the guardrail (no hand-written HTML for office diagrams); the docs also establish the two-tier scene model as the top-level story: fast tier = fence templates (PNG @2x / mermaid SVG, seconds), premium tier = hand-drawn HTML (PNG @3x, minutes), both exported through mmdx with sharpness guaranteed by one-shot deviceScaleFactor rasterization (no post scaling, no JPEG)
- Vendored the [diagram-design](https://github.com/cathrynlavery/diagram-design) skill spec layer into [docs/editorial-diagram-design/](docs/editorial-diagram-design/README.md) (MIT, commit `0b9b10c`, `SKILL.md` + 63 `references/` files verbatim); the adaptation layer overrides: export via `mmdx file.html` (replaces Playwright), `'Noto Sans SC'` for offline Chinese, diagram picking still follows the mmdx skill
- README now shows Pele / mermaid engine collages (`tests/contact-sheet-pele.png`, `tests/contact-sheet-mermaid.png`)
- skill / AGENT_GUIDE / HUMAN_GUIDE spell out the engine gap: layout and chrome, not palette; ELK is mermaid-flowchart only
- Follow-up layout/color ideas: [docs/research-layout-color.md](docs/research-layout-color.md) (no second diagram language)

## [1.3.0] - 2026-10-23

- Default renderer is now **Pele** ([obsidianmd/pele](https://github.com/obsidianmd/pele) v1.9.0, MIT): own layout + wide S-turn routing, so flowchart edges are curved by default instead of polylines
- New `--engine pele|mermaid` (default `pele`); `--engine mermaid` keeps the original Chromium + mermaid.js + ELK path as fallback
- Shape coding mapped onto Pele classes: `.pele-shape-rect/rounded/stadium` process blue, `.pele-shape-diam/hex` decision amber, `.pele-shape-circle/ellipse` state green, `.pele-shape-cyl` store purple; `--pele-*` vars derived from each theme's themeVariables
- The mermaid fallback is curved too: `flowchart.curve` changed from `linear` to `basis` (also fixes `layoutAlgorithm` never being written, so `--layout elk` now actually activates)
- `sketch` has no hand-drawn Pele look, so it auto-falls back to mermaid with a stderr note
- `--layout elk|dagre` applies to `--engine mermaid` only (Pele has its own layout)
- `--theme-js` / `--config` keys Pele honors: `flowchart.nodeSpacing` / `rankSpacing` / `wrappingWidth` / `curve`, `fontSize`, `padding`; mermaid-only keys (`themeCSS`, `look`, `layoutAlgorithm`, …) are ignored under Pele
- Extension blocks (table/kpi/chart/…) and the pixel crop stay on Chromium, unchanged
- `--json` gains `engine`; `--help` documents `--engine`; version bumped to 1.3.0

## [1.2.0] - 2026-10-22

- New `--preset column` (800px@2, 18px type, 200px label wrap; ≈1/3 of a 2560×1440 office display) for chat / narrow-column surfaces; `column-landscape` / `column-shrink` in `--json.warnings`
- skill / AGENT_GUIDE: chat defaults to `column`, projection stays on `slide`; chat flowcharts use `TD`
- Pele engine switch parked as follow-up: [docs/research-pele.md](docs/research-pele.md)
- Heatmap restyled as an office card: larger tiles, visible empty days, Chinese date/month labels, counts in cells
- Default `tech` theme: shape-coding as tinted fills + 1.5px strokes, richer lines/pie/palette; default accent `#2563EB`
- `--preset slide` now 18px type with heavier strokes; skill / AGENT_GUIDE add a projection/PPT export playbook (trigger words → command → 5-metre check)

## [1.1.0] - 2026-09-11

### Office export

- New `--preset slide|a4|square` (defaults to PNG unless `-f` is explicit; `slide` enlarges node type/spacing and reserves a footer safe area)
- New caption chrome `--title` / `--subtitle` / `--source` / `--unit` on PNG (shared by mermaid and extension blocks). **Breaking:** `--title` is no longer injected as mermaid frontmatter
- New `--brand <hex>`: remaps extension-block accent only; flowchart shape coding stays; low-contrast warns without blocking
- New `--strict-chart` and `--json.warnings`: soft budget gate for pie / xychart / radar / flowchart / sequence
- New fences: ```chart ```kpi ```compare ```funnel ```task ```progress ```swimlane ```gauge ```vs ```heatmap
- `--help` now documents `--preset`, `--index`, and the flags above
- skill / AGENT_GUIDE rewritten around office intent: overview ≤9 nodes, when not to draw, degradation ladder, PNG default
- tech theme tightened: drop neo gradient/shadow, shape-coding as pale fill + hairline, quieter grays; extension blocks unify on 8px radius / no shadow, kpi accents only the first metric
- New extension-block gallery [docs/EXTENSIONS.en.md](docs/EXTENSIONS.en.md) (one tool-rendered PNG per fence)
- Tests turn on `profile` probes: fail if `page-reset` / `init-mermaid` counts or per-stage maxMs blow the budget; after HTML blocks the mermaid shell is rearmed by a cheap DOM reset, not a per-block re-inject

## [1.0.0] - 2026-09

First stable release.

### Theme system (tech default theme, official entry points first)

- Colors organized along mermaid's official three-layer entries: **full themeVariables surface** (core derivation chain primaryColor/secondary/tertiary/mainBkg/nodeBkg + per-diagram variables) → per-diagram config sections (c4/journey/radar/xyChart…) → themeCSS only for what official variables can't express (corner radius, shape coding, a few structural fixes)
- Data-class diagrams use the **AntV G2 categorical palette** (pie/xychart/treemap/radar) — modern report look
- Node `look: 'neo'`: rounded corners + soft gradients + shadows; flowcharts keep shape coding (blue = process, amber = decision, green = state, purple = storage)
- All 20 mermaid diagram types covered + pixel-level theme census script (`scripts/theme-census.ts`) as a regression guard

### Render pipeline

- Bundled Noto Sans SC font subset (GB2312 + latin, 1.9 MB woff2) for machine-consistent Chinese rendering
- ELK layout engine lazily loaded (flowchart/graph only); dagre for the rest
- Lossless 2x PNG + pixel-level padding crop (symmetric margins by construction); SVG minified by svgo (official browser build embedded in the binary)
- Serialized concurrent screenshots + adaptive viewport, 60s render-timeout circuit breaker + per-diagram retry

### Extension blocks

- ```table / ```list / ```card (convention syntax: `emoji | title | description`) rendered as styled PNG

### Agent friendly

- `--json` machine-readable output, `--profile` stage timings, `--theme-js`/`--config`/`--css` theme customization, `--icon` icon packs
- Per-diagram failure isolation — the batch never aborts; bundled agent skill (trigger words, picking table, self-check loop)

### Artifacts

- `mmdx-windows-x64.exe` — windows x64 single file (no Node; needs system Edge/Chrome)

[1.3.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.3.0
[1.2.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.2.0
[1.1.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.1.0
[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
