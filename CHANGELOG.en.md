> English · [中文](CHANGELOG.md)

# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned per [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Themes (added)

- Added `zed` / `zed-light`: Zed's One Dark / One Light, palette taken from Zed's `assets/themes/one/one.json` and mapped the way `crates/markdown/src/mermaid.rs` (`build_mermaid_theme`) maps editor tokens. The first dark preset in the set
- Nodes now follow Zed's own rule: **flowchart / class / state nodes walk the eight player colours by reading order (`node_counter % 8`), taking the accent as the outline and that accent at 15% over the page as the fill** (`blendOver` in `src/color.ts`, matching Zed's `ACCENT_FILL_OPACITY`). Pele writes a diagram's nodes into one `<g>` in document order, so this is `ThemeStyle.nodeRotation` plus a set of `:nth-child(8n+k)` rules, with `:not()` keeping state start/end markers and composite frames out of it. **This is the clearest difference from `tech`**: `tech` colour-codes by shape family on one hue, the Zed pair cycles hues by reading order
- The shape-family rules now serve the remaining slots (ER entities, notes, class dividers, state markers, clusters) in Zed's syntax colours: `zed` `#74ADE8` / `#BF956A` / `#A1C181` / `#B477CF`, `zed-light` `#5C78E2` / `#AD6E26` / `#3F953A` / `#984EA5`
- Status chips now use Zed's chip recipe: scale the accent's lightness (`adjust_lightness`: ×0.7 dark, ×1.3 light — the new `scaleLightness()` in `src/color.ts`, applied to OKLab L), then derive the text colour from that stock. They used the node-fill recipe (accent at 15% over the page) before
- `zed-light`'s block pages became **editor panels** instead of document cards: `#EBEBEC` sheets, `#C9C9CA` hairlines, 6px radii, no accent stripe on a card, `#E4E4E5` for table headers and heat cells. They previously used the shared `PAGE_CSS` and read like `tech`
- Added `textColorFor(bg)` (OKLab keeping 15% of the background chroma, binary search to hold 4.5:1): `zed`'s block-page status chips derive their text from their own stock, so one rule covers light and dark
- `accentTint(accent, bg)` now mixes against the theme's page colour (it used to mix with white), and six `color-mix(..., white)` rules in `PAGE_CSS` became `color-mix(..., var(--paper))` (progress bars, comparison bars, heatmap levels 1-3). Themes with a white page render byte-identically; themes whose page is tinted (`ios` / `glass` / `epaper` / `acnh` / `--tone paper`) shift those bars and cells 1-3% toward their own stock
- Added a dark block-page stylesheet: `color-scheme: dark`, `#2F343E` panels, `#464B57` hairlines; everything else still reads `var(--paper)` / `var(--ink)`
- `src/tokens.ts` now re-exports `contrastRatio` / `relativeLuminance` from `src/color.ts` instead of keeping a second copy
- Reworked `glass`'s material layer: 24px ruling at 0.22 opacity (was 28px at 0.10, invisible at 1x), white sheet 0.30 → 0.16, grain 4% → 10%, panels `rgba(255,255,255,.55)` → `.45` with `backdrop-filter: blur(5px)` (was 20px), so the ruling reads through the panels and the acrylic reads as material. Dropped the violet blob (`#E7E3F4`, which read as a dirty patch on a cool canvas) for a white sheen, and moved the decision outline `#B07514` → `#B45309` (the old one was olive and muddy)
- Strengthened `ios`: 10 → 14px radii, 1.25 → 1.6px strokes, firmer system-colour tints for decision/state/store, plus HIG grouped-list chrome on block pages (a `›` chevron on every card, separators at iOS's 0.29 alpha, 20px/700 caption title)

### Fixed

- `mmdx card` failed under bun with `buf.readUInt32BE is not a function`: `pngSize()` in `src/card.ts` assumed a Node `Buffer`, while bun's screenshot path hands back a `Uint8Array`. It now wraps with `Buffer.from()` (as `src/capture.ts` / `src/lint.ts` already did), which takes `bun run test` from 205/209 to **209/209**

### Accessibility (new gates)

- Added `lint/theme-connectors`: connector colour ≥ 3:1 against the page (a connector carries meaning, so it clears the same non-text bar as a shape outline). Measured minimum 3.11 (`paper` tone); `zed` `#636D83` (2.70) and `ios` `#8E8E93` (2.92) missed it and became `#7A8598` (3.76) and `#7C7C82` (3.72)
- Added `lint/theme-series-cvd`: **every pair** of the 8-colour chart series holds OKLab ΔE ≥ 0.02 under protan / deutan / tritan simulation (previously only the shape families were checked). Worst before the fix: `openai` protan 0.005, `zed-light` deutan 0.009, `zed` tritan 0.013, `ios` tritan 0.017, `paper` protan 0.019. After re-picking with the smallest possible movement (same hue, same chroma band) all nine themes reach ≥ 0.040, most of them by moving only 0–2 colours; `epaper`'s grey ramp was already there and stays as it was
- Added `lint/theme-node-rotation`: in a rotating theme (`zed` / `zed-light`) every one of the eight player colours holds ≥ 3:1 against its own 15% tint (measured 3.00) — the rotation turns all eight into outlines, so checking the four shape families is no longer enough
- Added `lint/theme-series-contrast`: every series colour holds ≥ 3:1 against the page. Pele prints a pie's value in the **page colour** punched into the slice, so a pale slice loses its number (the worst case was 2.04:1 in `acnh`); all nine now reach ≥ 3.00
- `scripts/lint-a11y.ts` gained connector contrast, series colour-vision and series-against-page lines per theme

### Gallery

- The case's flowchart now uses all four shape families: `([需求冻结])` stadium, `[灰度 5%]` rect, `{错误率 < 1%?}` diamond, `[(发布台账)]` cylinder. The samples used to carry only rects and one diamond, so the shape coding was invisible in the gallery
- Added a fifth scene, `chart`: a ` ```chart ` pie with six slices, so the shape families and the 8-colour series both appear in the samples; nine themes × five scenes
- Regenerated the whole gallery from one machine (so the icon emoji glyphs match the rest of the pages) and re-rendered `tests/contact-sheet.png`, the diagram collage at the top of the README, from the current artifacts

### Docs

- `docs/gallery/zed.md` / `zed-light.md` (with English pages) and section 3.1c of `docs/STYLE_PORTS.md` record the palette, the mechanisms and the measured gates; the gallery overview is now nine themes in a 3x3 grid
- The per-theme gallery pages, `docs/GALLERY.md`, `docs/QUALITY.md`, the skills and the README now carry the new grid / material / gate numbers

## [2.0.0] - 2026-10-30

### Rendering engine (Breaking)

- **One engine only: Pele** (`pele@1.9.0`, obsidianmd/pele) renders Mermaid syntax straight to SVG, 1–50 ms per diagram. `--engine pele|mermaid|auto`, `--layout elk|dagre` and `--json.fallbacks` are gone, along with the `mermaid` / `@mermaid-js/layout-elk` dependencies and their bundled assets (mermaid.min.js ~3.5 MB, elk.bundle.mjs ~5.0 MB). Input stays Mermaid (fences / `.mmd` / stdin) and `--json.engine` is always `pele`; a diagram Pele cannot parse no longer has a fallback engine
- New `--svg-themeable`: keeps `--pele-*` CSS variables; the default bakes hex so Office/PPT can open the SVG
- PeleError maps to exit 1; `--json` reports `engine: "pele"`
- Iconify `--icon` is injected through Pele's `icons` callback, scaled from a 24×24 viewBox

### Themes (Breaking)

- Themes are a CSS-variable contract: every preset emits `--pele-*` variables and `pele-shape-*` rules, and PNG, SVG and HTML blocks share one palette. **Seven presets**: `tech` (default) / `openai` / `excalidraw` / `ios` / `acnh` / `glass` / `epaper`
- **Breaking:** `--theme-js` uses the v2 signature `(theme) => theme`, receiving a `ThemeSpec` (`vars` / `shapes` / `css`); 1.x `config.themeVariables` scripts fail with a migration error
- **Breaking:** `--config` is a Pele whitelist (`fontSize` / `padding` / `flowchart.nodeSpacing` / `rankSpacing` / `padding`); `themeVariables` and other keys emit `config-ignored`
- **Breaking:** eleven old themes removed (`openai-dark`, `openai-editorial`, `vercel`, `linear`, `stripe`, `notion`, `ibm`, `minimal`, `latte`, `mocha`, `sketch`); those names now fail as `unknown theme`, see `--help` for what is available
- New `excalidraw`: Pele plus a rough.js pass, pastel fills, Excalifont/LXGW stack, whiteboard block pages; `--style-fill solid|hachure` switches the fill (hatching costs roughly 1.5–2× the SVG size)
- New `ios`: flat iOS system interface — grouped grey page `#F2F2F7`, white cards, hairline separators `#D1D1D6`, Apple's darker system colours (blue `#007AFF` / green `#248A3D` / orange `#C93400` / red `#D70015` / purple `#8944AB`); block pages follow the HIG grouped-list recipe and skip the accent side stripe
- New `acnh`: Animal Crossing — cream paper `#FFF8E7`, dotted grid, 2.6px brown outlines, hard offset sticker shadows, rounded type and pill labels; block pages share the paper
- New `glass`: Fluent acrylic — pale blue-grey canvas `#E9EEF6`, 28px ruling, one translucent white sheet (0.30) with 4% grain, panels at `rgba(255,255,255,.72)` with 8px radii and a light rim; block pages are HTML, where `backdrop-filter: blur(20px)` really renders
- New `epaper`: e-ink — `#F5F1EB` stock with a 5% `feTurbulence` grain, `#1A1A1A` hairline strokes, square corners, no shadow, no accent colour; shape families differ by grey level and shape. Block pages use serif body text with uppercase monospace headers
- New `ThemeSpec.backdrop` for styles that paint their own ground: the engine inserts an `mmdx-backdrop` layer (blobs with a gaussian blur, dot or line grids as `<pattern>`, a translucent sheet, grain, plus a 14px-inset radial fade mask). Those PNGs are captured full-bleed instead of cropped to their ink, `--background transparent` skips the backdrop, and flatten bakes CSS `filter` into the SVG
- New `--tone paper|neutral|product` overrides block structure (radius, shadow, display type, table headers, chip radius); `paper` also repaints both the diagram and the block page onto editorial ruled stock (`#FAFAF8` sheet with a 24px fine / 96px bold grid, burnt-tangerine `#BF4520` accent). `neutral` and `product` leave the diagram palette alone
- New `--style-fill solid|hachure`: only `excalidraw` honours it; other themes get a `config-ignored` warning

### Accessibility (information never rides on colour alone)

- Theme palettes now have hard bars, enforced by the test suite: body text ≥ 7:1 against its background (AAA), secondary text ≥ 4.5:1, accent/warning colours ≥ 3:1; every shape family's outline ≥ 3:1 against the page *and* against its own fill; families with different outline colours stay pairwise distinguishable under simulated protan / deutan / tritan vision (OKLab ΔE ≥ 0.02); the four families must be four different forms (rect / diamond / stadium / cylinder)
- New `src/color.ts` (WCAG luminance and contrast, Machado 2009 CVD simulation, OKLab perceptual distance) and `scripts/lint-a11y.ts` (per-theme report)
- The rendered-text contrast audit now uses WCAG tiers (4.5:1 for body text, 3:1 for large text, decided from computed font size and weight)
- Palettes fixed to clear the bars: `openai` state/store fills lifted (the outline was 2.86:1 against its own fill), `excalidraw` muted `#6C757D`, `acnh` muted `#7A6350`, and the `--tone paper` store outline `#7A5AA8` (blue and purple were nearly identical under deuteranopia)

### Added

- New `mmdx card`: Markdown or a URL to info-card PNGs; default theme `openai`, with `--tone`, 480/600/900+ widths, automatic pagination by real pixel height, and `cards` / `files` / `pages` in `--json`. Ships with a standalone `skill/info-card-designer/`
- New `scripts/lint-a11y.ts` (accessibility report), `scripts/lint-visuals.ts` (render screening across all seven themes) and `scripts/make-style-review.ts` (theme previews)
- The gallery grew to **7 themes × 4 scenes** and gained the [scenario guide (statechart)](docs/gallery/scenario.md) (one statechart, two looks), the [two imported HTML scenarios](docs/gallery/html-skills.md), the [info-card tone comparison](docs/gallery/card-tones.md), `glass` / `epaper` style pages, and the original v1.4.2 `editorial` / `visual-explainer` hand-drawn HTML samples with their nearest-theme mapping; the README links all of it
- The skill gained a "scenario → theme / tone / preset" table (glass covers, black-and-white print, incident retros) plus theme combinations for the HTML report card and info card, and drawing rules for the scenario guide (states are what the reader sees, arrows are the reader's actions)

### Pipeline and artifacts

- Engine bundles load on demand: Pele ~700 KB, with no Mermaid / ELK assets shipped
- Block pages and diagram captures disable animation, transitions and caret, wait for the embedded font, and normalise the body box before capture (the browser's default 8px body margin used to offset a full-bleed capture)
- Visual lint covers DOM geometry (root/text overflow, elements outside the page, caption overlap), SVG label overflow, rendered text contrast, PNG edge clipping, the bottom-blank rule (`max(90px, 5% × height)`) and an over-long list fixture; determinism is checked for every built-in theme
- The test matrix is now **189 checks**: seven themes × four diagram types (flowchart / state / class / ER) plus three block-page audits, determinism, accessibility bars, and the CLI contract (presets, captions, brand, bad-block isolation, stdin, `--json`, info-card pagination, `.html` input and figure lint)
- New [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) with `licenses/` (Pele, rough.js, svgo, puppeteer-core, Noto Sans SC) and a [quality-gate plan](docs/QUALITY.md)

### Other

- Calendar heatmaps became office cards: cells scale with the week count, empty days stay visible, Chinese dates and month labels, counts inside populated cells
- `tech` (default) now paints visible fills with 1.5px outlines; default accent `#2563EB`
- `--preset slide` uses 18px type and heavier strokes; `--preset column` targets roughly a third of a 2560×1440 office display and reports `column-landscape` / `column-shrink` in `--json.warnings`
- Three CJK font families: the binary embeds Noto Serif SC and an LXGW WenKai GB2312 subset alongside Noto Sans SC for HTML page export
- Figure lint for `file.html` input: six checks (out of bounds, text over shape or text, adhesion, effective size below 11px, missing caption/aria) with LSP-style located messages in `--json.warnings`
- New `skill/explain/` (a spec-only adaptation of visual-explainer) and `skill/editorial/` (diagram-design)

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
