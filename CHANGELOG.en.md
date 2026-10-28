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

## [1.4.2] - 2026-10-25

- **New explain register (narrative tier)**: vendored a spec-only adaptation of [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) (10.6k★, MIT, commit `5f37886` v0.14.0) into [skill/explain/](skill/explain/README.md) — multi-figure explainers, diff/plan review pages, recaps, HTML slide decks. None of the upstream renderer ships (route D: visual-explainer adapts to mmdx — zero new runtime, zero mmdx code changes); `kit/*.mjs` runtimes, `plan/`, `pptx/`, `video/`, `mcp/` are all excluded, references and kit assets stay verbatim. Research and rationale: [docs/research-visual-explainer.md](docs/research-visual-explainer.md)
- explain workflow in three steps: copy `kit/starter-<register>.html` (4 registers: instrument/blueprint/paper/editorial, with kit.css + defs + that register's Latin fonts inlined; generated by [scripts/explain-starter.ts](scripts/explain-starter.ts)) → edit main → `mmdx name.html --scale 3`. Kit assets never enter the LLM context. In-page mermaid: pre-render with `mmdx - -f svg` and inline the file as-is (**never** add a second style attribute to the inlined svg — HTML duplicate-attribute parsing drops the `--pele-*` theme vars and the whole diagram goes black). JS-dependent states (steppers/replay/ve-ask) are forbidden for PNG delivery
- **Three CJK font families**: the exe now embeds Noto Serif SC (variable weight, 2.6 MB) and LXGW WenKai (1.6 MB) GB2312 subsets alongside Noto Sans SC, injected on HTML export — serif-stack Chinese now resolves to a real serif (fixing the "sans glyphs under a serif stack" mismatch) and hand-drawn annotations can opt into `'LXGW WenKai'` kai; the CJK alias over the `serif` generic rebinds to the serif file. Block/mermaid paths stay sans-only (no unused 4 MB faces in batch renders). The Latin font pack (Geist/IBM Plex/Newsreader/Atkinson/Instrument/JetBrains, 153 KB, all OFL, licenses shipped) is pre-embedded into starters as data-URL @font-face — every register renders identically offline
- **Figure lint for `file.html` input**: export now checks figure svgs automatically — caption/aria rules absorb the upstream render gate; geometry checks (viewBox overflow with direction and pixels, text-on-shape/text-on-text, **adhesion** — gaps under max(4px, 35% of font size) — and effective font size <11px) are new for hand-drawn figures. LSP-style messages carry the figure number, text content, viewBox coordinates and direction. False-positive strategies: own-group labels, line-riding halo/chip labels are exempt from lines but never from boxes, centered in-box labels, hidden texts and <24px² slivers. Findings surface via `--json.warnings` (`figure-overflow` / `figure-text-overlap` / `figure-text-adhesion` / `figure-small-text` / `figure-uncaptioned` / `svg-aria-label`; disposition table in skill troubleshooting.md)
- Root SKILL.md gains the narrative tier and mounts explain/ in the on-demand index and boundary notes; the editorial README's Simplified-Chinese practice notes are revised (serif headings and kai annotations are now available offline; geometry checks are delegated to the lint)
- Verified end to end: a paper-register Chinese explainer (serif heading / sans body / kai side note / hand-drawn mechanism figure / hand-written waffle+bars / pre-rendered in-page mermaid) passes with zero lint warnings plus visual QA; a deliberately broken fixture trips overflow/overlap checks precisely; the existing suite stays 94/94 (fixture: tests/explain-e2e/)

## [1.4.1] - 2026-10-25

- New release asset `mmdx-skill-<tag>.zip`: the skill directory plus the embedded windows-x64 CLI (`bin/mmdx.exe`) in one download — copy the contents into an agent's skills dir (`~/.qwen/skills/mermaid/`, etc.) and the skill is installed; ships with an `INSTALL.md` (install paths, CLI verification, non-Windows pointer to the dynamic bundle); README quick start gains Option D (both languages)
- skill `references/recipes.md` adds the "paired timeline (event vs countermeasure)" recipe: each period carries two lines (event / response) for stage-by-stage comparisons — half the node budget of two parallel flowchart chains, no crossing edges; includes a verified example and the `--source "© id"` credit-watermark usage
- skill `editorial/README.md` adds "Simplified-Chinese hand-drawn notes (mmdx context)": SC titles/callouts go sans (`'Noto Sans SC'` is registered at render time, reliable offline; serif titles are not guaranteed), sublabels stay Latin mono, two watermark options (fence `--source` / hand-drawn footer `<text>`), 4px grid discipline
- skill `SKILL.md` adds §1e "feedback: distilling novel diagram patterns": after the self-check the Agent Loop now asks whether the render used a reusable pattern missing from recipes/fences — if so, suggest contributing it back (copy the existing entry format, examples must be render-verified) **and keep the load-on-demand index in sync**; the index also gains the new "paired timeline" entry from this release (fixing an add-without-index miss)

## [1.4.0] - 2026-10-25

- New `file.html` whole-page input: the page is screenshotted as-is to PNG (fullPage, PNG only), keeping its own styles, scripts and background; `--width` is the layout viewport (an explicit, narrower `body` width wins), `--scale` / `--background` apply — a Playwright-free export backend for hand-drawn HTML workflows (e.g. diagram-design)
- HTML shots get the offline-Chinese guarantee: the bundled Noto Sans SC is registered as `'Noto Sans SC'` and aliased into the `sans-serif` / `serif` fallbacks for CJK code ranges — declared Latin fonts render untouched, Chinese glyphs stay offline-consistent, and the page's own CJK fonts still win
- A ` ```html ` fence inside `.md` is still not supported (standalone `.html` / `.htm` files only), so the extension blocks' layout discipline cannot be bypassed; HTML input carries no budget/lint/pixel-screening contract
- Docs spell out the pairing: skill §1c-4 / AGENT_GUIDE / HUMAN_GUIDE / README in both languages — trigger words, high-fidelity tips (`--scale 3`, canvas-width alignment, explicit transparent), and the guardrail (no hand-written HTML for office diagrams); the docs also establish the two-tier scene model as the top-level story: fast tier = fence templates (PNG @2x / mermaid SVG, seconds), premium tier = hand-drawn HTML (PNG @3x, minutes), both exported through mmdx with sharpness guaranteed by one-shot deviceScaleFactor rasterization (no post scaling, no JPEG)
- Vendored the [diagram-design](https://github.com/cathrynlavery/diagram-design) skill spec layer **inside the skill directory** at [skill/editorial/](skill/editorial/README.md) (MIT, commit `0b9b10c`; upstream `SKILL.md` renamed to `UPSTREAM-SKILL.md` to avoid clashing with the main skill, 63 `references/` files verbatim) — it ships with the skill directory, offline-capable after host install; the adaptation layer overrides: export via `mmdx file.html` (replaces Playwright), `'Noto Sans SC'` for offline Chinese, diagram picking still follows the mmdx skill
- Progressive-disclosure restructure of the skill: `skill/SKILL.md` is now an index + hot path (tier table, load-on-demand list, §1a picking table, diagram rules, preset commands, four surface routings, self-check loop), with cold content split into `skill/references/fences.md` (fence syntax/details/meeting-grade limits), `references/troubleshooting.md` (error table/warnings/exit codes) and `references/themes-engines.md` (themes/engines/Pele config keys), read on demand
- New `skill/references/recipes.md`: minimal examples for 16 mermaid diagram types (taken from the proven `tests/diagrams` fixtures) plus special-layout recipes — **two side-by-side flows in one image (subgraph `direction` mixing LR+TB; verified to work on the default Pele engine only, `--engine mermaid`+ELK ignores `direction`)**, nested containment, org chart, layered lanes; every example render-verified through mmdx (18/18)
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

[2.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v2.0.0
[1.1.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.1.0
[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
