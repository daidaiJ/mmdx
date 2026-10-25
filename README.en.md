> [中文](README.md) · English

# mmdx

[![Release](https://img.shields.io/github/v/release/daidaiJ/mmdx)](https://github.com/daidaiJ/mmdx/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**A diagram export CLI built for office agents**: batch-render mermaid and office fences (table / chart / kpi / compare / vs / funnel / task / progress / gauge / heatmap / swimlane …) in Markdown into PNG — themes, CJK fonts, layout engine, and padding are all built in. No MCP server, no browser extension, and the machine producing the output doesn't need Node.

**Scene tiers**: high-frequency office diagrams go through fence templates (PNG @2x, vector SVG for mermaid types; seconds, <1.5k tokens per image); the occasional editorial cover / proposal illustration is hand-drawn as HTML per the vendored [diagram-design specs](skill/editorial/README.md) (PNG @3x, minutes); the occasional **narrative explainer / diff·plan review / recap / slide deck** is assembled from a starter per the vendored [spec-only adaptation of visual-explainer](skill/explain/README.md) (PNG @3x) — all three tiers export through mmdx, rasterized once at deviceScaleFactor supersampling with no JPEG and an embedded CJK font, so sharpness is a construction guarantee.

The same `tests/diagrams` fixtures, one collage per engine.

**Pele (default)** — own layout, wide S-turn flowchart edges

![Pele, twenty diagram types](tests/contact-sheet-pele.png)

**mermaid + ELK** — `--engine mermaid`

![mermaid, twenty diagram types](tests/contact-sheet-mermaid.png)

## 📖 Documentation

| Reader | Doc | What's inside |
|---|---|---|
| 🤖 AI Agent | [docs/AGENT_GUIDE.en.md](docs/AGENT_GUIDE.en.md) | Token-lean: env self-check, diagram picking, flag cheatsheet, JSON contract, error triage |
| 👤 Human user | [docs/HUMAN_GUIDE.en.md](docs/HUMAN_GUIDE.en.md) | Readable: install & deploy, full CLI reference, theming, performance tuning, troubleshooting |
| 🖼 Extension blocks | [docs/EXTENSIONS.en.md](docs/EXTENSIONS.en.md) | One tool-rendered PNG + syntax per fence |
| 📜 Changelog | [CHANGELOG.md](CHANGELOG.md) | Release history |
| 🔧 Engine / layout notes | [docs/research-layout-color.md](docs/research-layout-color.md) | Layout and color knobs worth stealing (no second diagram language) |
| 🖋 Hand-drawn editorial specs | [skill/editorial/](skill/editorial/README.md) | Vendored diagram-design skill (MIT): for the occasional cover / proposal illustration, hand-draw per its specs and export with `mmdx file.html --scale 3` |
| 📃 Narrative explainer specs | [skill/explain/](skill/explain/README.md) | Vendored spec-only adaptation of visual-explainer (MIT): explainers / review pages / recaps / slide decks assembled from its starters, exported with the same command |
| 🔍 Skill selection research | [docs/research-visual-explainer.md](docs/research-visual-explainer.md) (zh) | Community HTML-to-image skill landscape, the license veto (vivid-illustration), the route argument (zero new runtime), and the font strategy with measured sizes |
| 📖 Rendered showcase | [docs/showcase-vendored-skills.en.md](docs/showcase-vendored-skills.en.md) | One real PNG per vendored skill (editorial / explain) plus the pipeline commands — the new fonts and lint at a glance |

Every doc is Chinese-first with an English `.en.md` sibling of the same name.

## ✨ Highlights

- **`tech` default theme**: white canvas, shape-coded tinted fills (blue = process, amber = decision, green = state, purple = storage); `--preset slide` thickens strokes and type for projection; 6 more presets; all 20 mermaid diagram types
- **Pele renderer (default)**: [obsidianmd/pele](https://github.com/obsidianmd/pele) with its own layout + wide S-turn routing, so flowchart edges are curved, not polylines; `--engine mermaid` falls back to Chromium + mermaid.js
- **Bundled CJK fonts (three families)**: Noto Sans SC / Noto Serif SC (variable weight) + LXGW WenKai subsets (full GB2312 + Latin, ~6.2 MB total) — identical rendering on any machine, correct wrapping for Chinese labels; injected on HTML export: sans body text, serif-stack Chinese resolves to the serif face, hand-drawn annotations can opt into `'LXGW WenKai'` kai
- **ELK layout engine**: official `@mermaid-js/layout-elk`, lazily loaded for `--engine mermaid` flowcharts only; Pele ships its own layout
- **Pixel-level even padding**: every image is re-cropped to its ink bounding box; symmetric margins are a construction guarantee, not mermaid's unreliable viewBox
- **Extension blocks**: ```table / ```list / ```card / ```chart / ```kpi / ```compare / ```vs / ```funnel / ```task / ```progress / ```gauge / ```heatmap / ```swimlane straight to PNG
- **Office delivery**: `--preset slide|a4|square|column`, title/source/unit chrome, `--brand` accent; agent-friendly `--json` (including `warnings`)
- **Whole-page HTML shots**: `file.html` exports as-is to a high-fidelity PNG (`--scale 3` for print) — system Edge, no Playwright, bundled CJK font fills the fallback; pairs with the vendored [diagram-design](skill/editorial/README.md) specs to hand-draw editorial images and export them
- **explain narrative tier (vendored, spec-only adaptation of visual-explainer)**: multi-figure explainers / diff·plan review pages / recaps / slide decks — copy one of the 4 register starters (instrument/blueprint/paper/editorial; the kit design system and 153 KB of Latin fonts are already inlined, assets never enter the context) → edit the body → `mmdx --scale 3`. In-page mermaid is pre-rendered by `mmdx - -f svg` and inlined. None of the upstream renderer ships — the skill adapts to mmdx, zero new runtime, zero mmdx core changes
- **Figure lint (constructive QA for hand-drawn pages)**: exporting a `file.html` inspects every figure — six check families: **overflow** (viewBox clipping, with direction and pixels), **text-on-shape / text-on-text**, **adhesion** (gaps to a node box under max(4px, 35% of font size) — exactly the "label glued to the box" case human eyes miss most), **effective font size <11px**, **missing caption/aria-label**. Messages are LSP-style and self-locating, ready to act on:

  ```
  figure-text-adhesion: 图1「读路径」 文字「① GET」(x242,y118) 左侧贴着「客户端」(间距3px)
  figure-overflow: 图2 文字「6 未命中」(x118,y86) 越出下缘约 3px
  ```

  Findings surface via `--json.warnings`; fix by coordinates and **ship at zero warnings** — pixel-squinting becomes a machine-readable list. Works for editorial, explain, and any hand-drawn HTML. Exemption strategies keep false positives down: own-group labels, line-riding labels exempt from lines but never boxes, centered in-box labels, hidden texts and sliver intersections

## 🚀 Quick start

```bash
# Option A: Release binary (windows x64, no Node; rendering uses system Edge/Chrome)
#   Latest: https://github.com/daidaiJ/mmdx/releases/latest
#   Direct: https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe

# Option B: dynamic runtime (needs bun)
#   Download mmdx-dynamic-<tag>.zip, then:
unzip mmdx-dynamic-v*.zip && cd mmdx-dynamic && bun install && bun run src/cli.ts --help

# Option C: clone & build
bun run build && ./dist/mmdx-windows-x64.exe --help

# Option D: skill + CLI bundle (recommended for AI agent users)
#   Download mmdx-skill-<tag>.zip, then copy the contents of the mmdx-skill
#   directory into your agent's skills dir (e.g. ~/.qwen/skills/mermaid/,
#   ~/.grok/skills/mermaid/, ~/.claude/skills/mermaid/) — skill installed.
#   The CLI is embedded at bin/mmdx.exe (windows x64); verify: bin/mmdx.exe --version
```

### Browser dependency

The render kernel is a real Chromium. Windows 10/11 **ships with Microsoft Edge**, so the binary works out of the box; Chrome works too. Detection order is Edge → Chrome at their common install paths; pass `--browser <path>` for any other Chromium. If none is found it fails fast and lists the searched paths — **Chromium is never downloaded**.

### First image in 30 seconds

```bash
mmdx README.md                              # README-m1.(svg|png), README-m2.(png|svg) …
echo "graph LR; A-->B" | mmdx - -f svg      # single diagram from stdin
```

More (multi-file batches, exact naming, title injection) in the [HUMAN_GUIDE quick start](docs/HUMAN_GUIDE.en.md#quick-start).

## 🖼 Usage

```bash
mmdx a.md b.md other/*.md -o dist/          # multi-file batch, parallel
mmdx diagram.mmd -o out/arch.svg            # exact name; sibling .png written alongside
mmdx page.html -o out/shot.png --scale 2    # whole-page HTML screenshot (Playwright-free)
mmdx report.md --index 2 --title "Architecture" --title-pos bottom
mmdx doc.md -t mocha --background transparent -f png --json
```

Fence languages: `mermaid` (diagrams) plus `table` / `list` / `card` / `chart` / `kpi` / `compare` / `vs` / `funnel` / `task` / `progress` / `gauge` / `heatmap` / `swimlane` (extension blocks, PNG only). For slides: `mmdx doc.md --preset slide --title "…" --source "…"`. For chat / a narrow column: `--preset column`. Standalone `.html` files are screenshotted whole (own styles kept, bundled CJK font fills the fallback chain) — see [HUMAN_GUIDE](docs/HUMAN_GUIDE.en.md#whole-page-html-screenshots).

**Card wall** — a ```card fence, one card per line: `emoji | title | description` (emoji and description optional):

```card
🚀 | Render pipeline | single-browser page pool, lossless 2x PNG export
🎨 | Theme system | seven presets, customizable via theme-js and css
```

![Card rendering sample](docs/ext-card.png)

## 🎨 Themes

| | |
| --- | --- |
| `tech` (default) | Design-doc style: white background, shape coding, thin borders; Pele wide S-turn edges by default |
| `openai` / `openai-dark` | Near-monochrome, thin borders, mint accents |
| `minimal` | Obsidian Minimal: warm neutrals + a single violet accent |
| `latte` / `mocha` | Catppuccin palettes |
| `sketch` | Mermaid `look: handDrawn` whiteboard style |

Layering order: preset → `--theme-js` → `--config` → `--css`. Customization (CSS snippets, full recolor functions) in the [HUMAN_GUIDE theming section](docs/HUMAN_GUIDE.en.md#theming).

## ⚡ Pipeline & performance

One Chromium + page pool + bounded workers; observable via `--profile`:

```
browser-launch  ~0.5s ×1      pele-render     ~15ms ×diagram
page-init       ~1.2s ×page   screenshot      ~90ms ×diagram (incl. pixel-level re-crop)
```

- The default Pele engine renders in-page (reusing Chromium's loaded CJK font, so CJK metrics match the mermaid path); with `--engine mermaid`, ELK (7 MB bundle) is parsed lazily and only for flowchart/graph
- Screenshots serialized across pages (headless Chrome serves one active tab) + viewport fitted to content; a 2x hi-res diagram still lands around ~100 ms
- A hung render always errors after 60s instead of stalling the batch; each diagram is retried once
- PNG is lossless 2x (typical architecture diagram 20–80 KB); SVG is minified by svgo — the official browser build is embedded in the binary (self-contained ESM), so minified SVG is as turnkey as PNG

Tuning knobs (concurrency, viewport, scale) in the [HUMAN_GUIDE performance section](docs/HUMAN_GUIDE.en.md#performance-tuning).

## 🧪 Testing

`bun run tests/run.ts`, two layers — visual review only looks at items the script flags as suspicious:

1. **Library sweep**: 20 mermaid diagram types + table/list/card, rendered in one browser session, then pixel-analyzed (margin symmetry ±8px, content ratio, blank-image detection)
2. **CLI behavior**: exit codes, `--index` naming, bad-block isolation, stdin, JSON contract, 19-file 4-concurrency batch

## License

[MIT](LICENSE)
