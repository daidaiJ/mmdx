> English · [中文](CHANGELOG.md)

# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned per [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-10-23

### Rendering engine

- **Default engine is now Pele 1.9.0** (`obsidianmd/pele`): Mermaid syntax straight to SVG, 1–50 ms per diagram; Mermaid 11 + ELK retained as `--engine mermaid` fallback, both bundles embedded in the binary
- New `--engine pele|mermaid|auto`; `auto` tries Pele then falls back to Mermaid, reported as `fallbacks` in `--json`
- New `--svg-themeable`: keeps `--pele-*` CSS variables; default bakes hex so Office/PPT can open the SVG
- `--layout elk` is now Mermaid-only and selects `--engine mermaid`; explicit `--engine pele --layout elk` is a parameter conflict
- PeleError maps to exit 1 with a `--engine mermaid` / `--engine auto` hint

### Themes (Breaking)

- Themes are a CSS-variable contract: all 7 presets emit `--pele-*` variables and `pele-shape-*` rules; PNG, SVG, and HTML blocks share one palette
- **Breaking:** `--theme-js` uses the v2 signature `(theme) => theme`, receiving a `ThemeSpec` (`vars` / `shapes` / `css`); 1.x `config.themeVariables` scripts fail with a migration error
- **Breaking:** `--config` is a Pele whitelist (`fontSize` / `padding` / `flowchart.nodeSpacing` / `rankSpacing` / `padding`); `themeVariables` and other keys emit `config-ignored`
- **Breaking:** `sketch` keeps warm paper and the handwriting font, but shapes are clean rounded rectangles (no hand-drawn jitter)
- `--brand` still changes only `theme.vars.accent`, with the contrast warning
- `--title-pos bottom` applies to the Mermaid fallback only; Pele keeps a frontmatter title inside the diagram at the top — use `--title` chrome for a bottom caption
- Iconify `--icon` is injected through Pele's `icons` callback and scaled from a 24×24 viewBox

### Pipeline and artifacts

- Engine bundles load on demand: Pele ~700 KB; Mermaid (3.5 MB) and ELK (7 MB) parse only on fallback
- Binary grows by ~0.7 MB because the Mermaid fallback stays embedded
- New engine/theme contract tests: Mermaid fallback, auto fallback, flat/themeable SVG, theme-js v2, v1 migration error, config warnings
- Docs and skill updated to v2: HUMAN_GUIDE / AGENT_GUIDE / README / SKILL.md cover engine semantics, migration, and troubleshooting

## [Unreleased]

- **Breaking:** the preset set is now three themes: `tech` (default) / `openai` / `excalidraw`. Eleven presets are removed: `openai-dark`, `openai-editorial`, `vercel`, `linear`, `stripe`, `notion`, `ibm`, `minimal`, `latte`, `mocha`, `sketch`. Old theme names now fail with `unknown theme`; `--help` lists what remains
- New `--tone paper|neutral|product`: structural block overrides only (radius/shadow/display type/table headers/chip radius); the palette stays with the theme. Applies only when passed, so existing output is unchanged
- New `mmdx card`: Markdown or URL → info-card PNG; default theme `openai`, with `--tone`, 480/600/900+ widths, splits by actual pixel height, `--json` reports `cards`/`files`/`pages`
- Gallery adds a [two-HTML-scenario page](docs/gallery/html-skills.en.md) and an [info-card tone page](docs/gallery/card-tones.en.md); `scripts/make-gallery.ts` renders the three themes, cross-style report/info cards and three tones
- Skill gains a scenario → theme / tone / preset recommendation table plus theme pairings for the HTML report and info-card scenarios; new standalone `skill/info-card-designer/`
- Gallery restores the v1.4.2 `editorial` / `visual-explainer` hand-drawn HTML samples with closest-current-preset mapping; skill adds their traits and scenarios
- Visual lint adds SVG label overflow (screen rect vs shape rect), rendered-text contrast (`fill` vs actual background, 3:1), and PNG edge clipping; determinism covers every built-in theme, including the hand-drawn Excalidraw jitter
- Tests cover info-card parsing/web extraction/width/splitting/tone differences, plus diagram and block audits for the three themes
- New `excalidraw` theme: Pele + rough.js hand-drawn strokes, pastel fills, Excalifont/LXGW stack; whiteboard-style blocks; `--style-fill solid|hachure`
- `ThemeSpec` gains `style` / `blockCss` / `fonts`; extension blocks can use theme-level layout CSS
- `peleCss` fills rounded/stadium/fr-rect/hex/lean-r/odd, class/entity and state start/end coverage for themes with `shapeCoverage`; old themes keep their output
- New `scripts/make-style-review.ts` generates diagram + block previews for the three themes under `review/styles/`
- New [style gallery](docs/GALLERY.en.md): the same “gray release retrospective” case as flowchart, KPI, cards, and table in `tech` / `openai` / `excalidraw`; the overview keeps one flowchart and the four scenes live on per-style pages; reproduced by `scripts/make-gallery.ts` and linked from the README
- Visual lint adds a bottom-blank rule (`max(90px, 5% × height)`) and a long-list fixture, so screenshots cannot bake viewport height into the PNG; new [quality-gate roadmap](docs/QUALITY.en.md)
- New `src/lint.ts`: DOM geometry audit (root/text overflow, elements outside the page, caption overlap), `diffPng` two-run determinism check, and a theme contrast gate; based on Playwright / jest-image-snapshot / reg-suit / Mermaid visual-regression practice
- Block and diagram screenshots now disable animations/transitions/caret and wait for the bundled font, reducing cross-run and cross-machine drift
- New [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `licenses/` inventory Pele / Mermaid / ELK / rough.js / svgo / puppeteer-core / Noto Sans SC with sources and licenses; linked from the README
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

[2.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v2.0.0
[1.1.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.1.0
[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
