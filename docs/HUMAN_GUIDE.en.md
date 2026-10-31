> English · [中文](HUMAN_GUIDE.md)

# HUMAN_GUIDE — Install · Configure · Tune · Troubleshoot (human-readable)

This guide targets **human users** and covers installing mmdx, the full CLI reference, theming, performance tuning, and troubleshooting. The token-lean version for AI agents is [AGENT_GUIDE.en.md](AGENT_GUIDE.en.md); project overview in the [README](../README.en.md).

## Contents

- [Installation](#installation)
  - [Option A: release binary (recommended)](#option-a-release-binary-recommended)
  - [Option B: dynamic runtime](#option-b-dynamic-runtime-needs-bun)
  - [Option C: clone & build](#option-c-clone--build)
  - [Browser dependency](#browser-dependency)
- [Quick start](#quick-start)
- [Full CLI reference](#full-cli-reference)
- [Extension blocks](#extension-blocks)
- [Whole-page HTML screenshots](#whole-page-html-screenshots)
- [Theming](#theming)
- [Performance tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)
- [Testing](#testing)

---

## Installation

### Option A: release binary (recommended)

Download `mmdx-windows-x64.exe` from the [release page](https://github.com/daidaiJ/mmdx/releases/latest) — a single file, no Node runtime. Put it on your PATH or call it by full path:

```bash
# direct download
curl -L -o mmdx.exe https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
./mmdx.exe --version
```

If the GitHub CDN times out, prefix the command with your proxy (e.g. `HTTPS_PROXY=... curl ...`).

### Option B: dynamic runtime (needs bun)

Download `mmdx-dynamic-<tag>.zip` from the release assets and run the source with bun (handy when tweaking themes or render logic):

```bash
unzip mmdx-dynamic-v*.zip && cd mmdx-dynamic
bun install
bun run src/cli.ts --help
```

### Option C: clone & build

```bash
git clone https://github.com/daidaiJ/mmdx.git && cd mmdx
bun install
bun run build          # artifact at dist/mmdx-windows-x64.exe
```

### Browser dependency

The render kernel is a **real Chromium** (driven by puppeteer-core). mmdx neither bundles a browser nor **ever downloads Chromium**:

- Windows 10/11 ships with Microsoft Edge, so the binary works out of the box; Chrome works too
- Detection order: Edge → Chrome at their common install paths (registry + default directories)
- Non-standard install location, or another Chromium: `--browser "C:\path\to\msedge.exe"`
- If none is found it fails fast and lists every searched path — it never hangs

## Quick start

```bash
mmdx README.md                              # README-m1.(svg|png), README-m2.(svg|png) …
mmdx a.md b.md other/*.md -o dist/          # multi-file batch, parallel
mmdx diagram.mmd -o out/arch.svg            # exact name; sibling .png written alongside
echo "graph LR; A-->B" | mmdx - -f svg      # single diagram from stdin
mmdx report.md --preset slide --title "Architecture" --unit "ms" --source "bench"
mmdx doc.md --preset column                 # chat / narrow column (800px@2)
mmdx doc.md -t tech --background transparent -f png --json
mmdx doc.md --brand #E4572E --preset square
mmdx doc.md --list                          # list the fenced blocks found, no rendering
```

Four input forms:

| Input | Behavior |
|---|---|
| `.md` file | Renders all ```mermaid fences plus extension fences (table/list/card/chart/kpi/compare/funnel/task/progress/swimlane/gauge/vs/heatmap) |
| `.mmd` file | Renders a single mermaid diagram |
| `.html` / `.htm` file | Screenshots the page as-is to PNG (fullPage, PNG only) — see [Whole-page HTML screenshots](#whole-page-html-screenshots) |
| `-` (stdin) | Reads a single mermaid diagram from standard input |

Output naming: by default next to the input, `<name>-m<N>.svg/.png` numbered by block order; `-o` sets the output directory; when the input holds exactly one diagram, `-o` may be an exact filename.

## Full CLI reference

| Flag | Meaning |
| --- | --- |
| `-o, --out <path>` | Output directory; exact filename when input has one diagram (default: next to input) |
| `-f, --format <fmt>` | `svg` \| `png` \| `both` (default both; `--preset` defaults to png unless `-f` is explicit) |
| `-t, --theme <name>` | `tech` (default) · `openai` · `excalidraw` · `ios` · `acnh` · `epaper` · `zed` · `zed-light` |
| `--tone <name>` | `paper` \| `neutral` \| `product`; structural block overrides (radius/shadow/display type/table headers), and `paper` also repaints the diagram onto a ruled off-white sheet |
| `--style-fill <mode>` | `solid` (default) \| `hachure`; `excalidraw` only |
| `--preset <name>` | `slide` (projection/PPT: 1600px@2, 18px type, heavier strokes, ~80px footer) \| `a4` (900px@2) \| `square` (1080px@2) \| `column` (chat/narrow column: 800px@2, about 1/3 of a 2560×1440 display, 18px type, 200px label wrap). Explicit `--width`/`--scale`/`-f` win |
| `--background <color>` | Page background, e.g. `white` \| `transparent` \| `#1A1A1A` (pass it explicitly for a dark page) |
| `--svg-themeable` | Keep `--pele-*` CSS variables in SVG; default bakes hex for Office/PPT |
| `--scale <n>` | PNG scale factor (default 2) |
| `--width <px>` | Layout viewport width (default 1200; Pele uses it as `maxWidth` without flipping direction) |
| `--title <text>` | Figure title (PNG chrome; no longer injected as mermaid frontmatter) |
| `--subtitle <text>` | Subtitle |
| `--source <text>` | Source line in the footer |
| `--unit <text>` | Unit line in the footer |
| `--title-pos <pos>` | `top` (default) \| `bottom` (chrome title above/below the figure) |
| `--index <n[,n…]>` | Render only these 1-based block indexes |
| `--brand <hex>` | Accent for extension blocks (default `#2563EB`; `2563EB` also works); does not recolor flowchart shapes. Use a deep hex on a projector |
| `--strict-chart` | Promote mermaid pie/xychart/radar/flowchart/sequence budget hits to errors (default: warn) |
| `--icon <pack>` | Iconify pack for `A@{icon: logos:react}` nodes (repeatable; fetched then cached) |
| `--config <file.json>` | Pele whitelist: `fontSize` / `padding` / `flowchart.nodeSpacing` / `rankSpacing` / `padding`; other keys warn |
| `--theme-js <file.js>` | v2 theming: `(theme, ctx) => theme`, where theme is a `ThemeSpec` (`vars` / `shapes` / `css`) |
| `--css <file.css>` | Extra CSS appended after the theme (target Pele class names) |
| `--browser <path>` | Browser executable override (default: auto-detect Edge/Chrome) |
| `--jobs <n>` | Parallel render count (default 2; single-browser page pool — don't go high) |
| `--profile` | Per-stage timing summary (browser-launch / page-init / init-pele / pele-render / screenshot / svgo) |
| `--list` | List the fenced blocks found and exit, no rendering |
| `--json` | One machine-readable JSON on stdout (files + errors) |
| `-q, --quiet` | Suppress progress lines on stderr |
| `-h, --help` / `-v, --version` | Help / version |

Exit codes: `0` success · `1` at least one render failed (other blocks still render) · `2` usage error.

The `--json` contract:

```json
{
  "theme": "tech", "engine": "pele", "format": "png", "background": "#FFFFFF",
  "preset": "slide", "brand": "#E4572E",
  "caption": { "title": "Q1 mix", "subtitle": null, "source": "Finance", "unit": "CNY wan" },
  "blocks": 3, "rendered": 3, "failed": 0,
  "files": ["doc-m1.png", "…"],
  "errors": [],
  "warnings": [{ "input": "doc.md", "index": 1, "code": "pie-sectors", "message": "…" }],
  "profile": { "pele-render": { "count": 3, "totalMs": 78, "avgMs": 26, "maxMs": 40, "maxLabel": "doc#2" } }
}
```

(`preset`/`brand`/`caption` appear only when those flags are used; `engine` is always `"pele"`; `warnings` is always an array; `profile` appears only when `--profile` is also passed.)

## Info cards (`mmdx card`)

Turn Markdown or a web article into one or more styled info cards. `--theme` picks the palette, `--tone` picks the structure, `--width` sets the canvas (480/600/900 and so on). Content above `--max-height` (default 1200 CSS px) splits into additional cards.

```bash
mmdx card --in note.md -t openai --tone neutral --width 600 -o note-card.png
mmdx card --url https://example.com/post -t openai --tone paper --json
```

`--json` reports `cards`, `files` and pixel sizes. `--url` uses lightweight extraction (`article` / `main` / `body`); log-in walls and JS-only pages should be saved as Markdown first.

## Extension blocks

Besides mermaid diagrams, common markdown structures render directly into styled images. Extension blocks produce **PNG only** — HTML layout has no portable SVG form. All of them take `--title`/`--subtitle`/`--source`/`--unit` chrome and `--brand` accent.

Syntax, limits, and one sample image per fence: **[extension-block gallery](EXTENSIONS.en.md)**.

## Whole-page HTML screenshots

A `file.html` input screenshots the whole page **as-is to PNG** (fullPage, PNG only): the page keeps its own styles, scripts, and background; `--width` is the layout viewport (an explicit narrower `body` width wins); `--scale` / `--background` still apply. Passing `-f svg` still writes PNG and prints `... renders to PNG only` on stderr.

```bash
mmdx page.html -o out/page.png --scale 3
mmdx page.html --background transparent   # transparent only when passed explicitly
```

- **CJK fallback (three families)**: the bundled Noto Sans SC / Noto Serif SC (variable weight) / LXGW WenKai are aliased over the CJK ranges of the `sans-serif` / `serif` fallback chains — the page's declared Latin type renders as-is, Chinese body text resolves to the sans face, serif-stack Chinese to the serif face, and hand-drawn annotations get kai via `'LXGW WenKai'`, offline-identical; CJK webfonts the page declares itself still win. Fences and mermaid keep the sans face alone and never load the other two.
- **Figure lint**: every figure is inspected on export; findings land in `--json.warnings` with figure number, text, viewBox coordinates, and direction — fix the source by coordinates and ship at zero.
- **Fidelity advice**: use `--scale 3` for print or large-screen scaling (the default 2 is enough for PPT); on fixed-canvas pages set `body` width = canvas width (or align `--width` to the design width) to avoid responsive reflow; pass `--background transparent` only when you need transparency; webfont and image loading is awaited automatically. PNG is this tier's fidelity form — type and supersampling are baked into pixels, identical on any viewing machine.
- **A renderer, not a layout gate**: budgets, over-limit warnings, and pixel sweeps apply to fences only. A ` ```html ` fence inside `.md` is **not supported** (it would bypass extension-block discipline); only standalone `.html` / `.htm` files are recognized.
- **Paired hand-drawn HTML workflows**: two vendored specs (MIT) — occasional editorial covers / proposal art per [skill/editorial/](../skill/editorial/README.md) (diagram-design); narrative explainers / review pages / recaps / slide decks per [skill/explain/](../skill/explain/README.md) (spec-only adaptation of visual-explainer: copy `kit/starter-<register>.html` → edit the body → `mmdx name.html --scale 3`). Starters are generated by `bun run scripts/explain-starter.ts`, which uses `import.meta.dir` and therefore needs bun; run it only when regenerating starters.

Warning codes:

| Code | Meaning |
| --- | --- |
| `figure-overflow` | An element escapes the figure canvas (direction and pixels included) |
| `figure-text-overlap` | Text sits on another shape or on other text |
| `figure-text-adhesion` | Text-to-box gap under max(4px, 35% of the font size) — visually glued |
| `figure-small-text` | Effective font size under 11px after the svg is scaled down |
| `figure-uncaptioned` | A `<figure>` lacks a `figcaption` |
| `svg-aria-label` | A figure svg lacks an `aria-label` (and has no figcaption to fall back on) |

Exemptions keep false positives down: own-group labels, line-riding labels (exempt from lines, never from boxes), centered in-box labels, hidden text, and sliver intersections.

## Theming

### Pick a preset (zero cost)

| Scenario | `-t` |
| --- | --- |
| Design docs / architecture / projection (default) | `tech` (shape-coded tinted fills) |
| Engineering docs / README / architecture (clean) | `openai` (white, ink, mint accent, hairline borders) |
| External reports / print / compliance delivery | `openai` with `--tone paper` (serif captions, 10px radii, ruled stock; best printed with `--preset a4`) |
| Knowledge bases / internal notes / long reads | `tech` (highest information density) |
| Whiteboard / brainstorm / casual sharing | `excalidraw` (hand-drawn strokes + pastel fills; `--style-fill hachure`) |
| Product UI screenshots / iOS app docs | `ios` (grouped grey background, white cards, hairline separators, system colours) |
| Sticker-style weekly updates / team boards | `acnh` (cream paper, thick brown outlines, hard offset shadows, rounded type) |
| Black-and-white print / e-reader / compliance docs | `epaper` (paper stock, hairline black strokes, square corners, no shadow, grey-level shape coding) |
| Dark docs sites, tech talks, terminal-adjacent diagrams | `zed` (Zed One Dark: dark canvas, hairlines, syntax-coloured shape families); `zed-light` for the matching light look |
| A dark page | `openai` or `tech` plus `--background '#1A1A1A'` (do not project a dark page in a meeting room) |

### Fine-tuning (--css snippet library, appended after the theme)

Pele class names are stable; target a shape explicitly:

```css
/* larger corner radius */   .pele-flowchart .pele-shape-rect rect { rx: 14px; ry: 14px; }
/* subtle node shadow */     .pele-node { filter: drop-shadow(0 1px 2px rgba(0,0,0,.10)); }
/* thicker decision border */ .pele-shape-diam polygon { stroke-width: 2px; }
/* thicker edges */          .pele-edge path { stroke-width: 2px; }
/* bolder labels */          .pele-label { font-weight: 600; }
```

Font size / spacing go through `--config` (the JSON must be a real file — no process substitution on Windows):

```json
{ "fontSize": 18, "flowchart": { "nodeSpacing": 88, "rankSpacing": 88, "padding": 22 } }
```

```bash
mmdx doc.md --config mq.json
```

Pele ignores `themeVariables` / `themeCSS`; those keys produce a `config-ignored` warning. Use `--theme-js` or `--css` for colors.

### Full recolor (--theme-js v2)

```js
// brand.js — usage: mmdx doc.md --theme-js brand.js
export default (theme) => {
  const brand = '#E4572E';
  theme.vars.accent = brand;
  theme.vars.line = '#0D1B2A';
  theme.shapes.process.fill = '#FDF0E5';
  theme.shapes.process.stroke = brand;
  theme.shapes.decision.fill = '#FFF4D6';
  theme.shapes.decision.stroke = '#A87428';
  theme.css += `.pele-label { font-weight: 600; }`;
  return theme;   // must return a ThemeSpec
};
```

`theme.vars` maps to `--pele-bg/fg/muted/line/surface/surface-alt/border/accent/critical/radius/font/series`; `theme.shapes` has `process` / `decision` / `state` / `store` / `cluster`.

**Layering order**: theme → `--brand` → `--theme-js` → `--config` → `--css`. `--brand` only changes `theme.vars.accent`. Low-contrast accents warn but are not rewritten.

### Migrating from 1.x (v2 breaking changes)

| 1.x usage | v2 behavior |
| --- | --- |
| `--theme-js` mutating `config.themeVariables` | Errors with a migration hint to `theme.vars` / `theme.shapes` |
| `--config` with `themeVariables` / `themeCSS` | Ignored by Pele; `config-ignored` warning |
| `--layout elk` (1.x leftover) | Flag removed; exits as a usage error (exit 2). Use Pele's own layout, or tune `flowchart.nodeSpacing` / `rankSpacing` via `--config` |
| `excalidraw` lines are still straight | Check `-t excalidraw`; `rough.js asset missing` means `vendor/rough.js` was not bundled into the build |
| Default `-f svg` colors | Still baked to hex; add `--svg-themeable` for a re-themeable SVG |
| `--title-pos bottom` + frontmatter title | Pele keeps the in-diagram title at the top; use `--title` chrome for a bottom caption |

## Performance tuning

`--profile` reports per-stage timings — look at the data before touching anything:

```
browser-launch  ~0.5s ×1      pele-render     ~26ms ×diagram
page-init       ~1.0s ×page   screenshot      ~90ms ×diagram (incl. pixel-level re-crop)
```

| Lever | Advice |
| --- | --- |
| Batch > 30 blocks | `--jobs 4`; the default 2 is enough — single-browser page pool, diminishing returns and memory pressure beyond that |
| PNG too large | Lower `--scale` (default 2; 1 is fine for chat); PNG is lossless, typical architecture diagram 20–80 KB |
| Type too small in chat / a narrow column | `--preset column` (800px@2) with `flowchart TD`; do not raise `--width` (wider canvas, smaller type after scaling) |
| Wide diagram squashed | Raise `--width` (default 1200); horizontal flowcharts tolerate 1600+ |
| SVG only | `-f svg` skips the screenshot stage |
| First image slow | browser-launch + page-init is fixed cost (~1.7s), amortized over batches; normal for single images |

Pipeline facts: one Chromium instance + page pool + bounded workers; the only engine asset is the Pele bundle (~700 KB), injected on demand — there is no second engine to fall back to and no extra layout bundle; screenshots serialize across pages (headless Chrome serves one active tab); a hung render trips a 60s circuit breaker, each diagram retried once.

## Troubleshooting

| Error / symptom | Nature | Fix |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | No browser in environment | Install Edge/Chrome, or pass `--browser "<path-to-msedge.exe>"` (any Chromium); never auto-downloads |
| `render timed out after 60s` | Resource pressure / browser hang | CLI already retried; rerun the whole command, or isolate with `--jobs 1` if persistent |
| `icon pack "xxx" not found` | Network down (unpkg) | Drop `--icon`, or run once online to warm the cache |
| Chinese glyphs turn into boxes | Shouldn't happen (font bundled) | Check whether `--config`/`--theme-js` overrode fontFamily |
| `Parsing error` / `pele: Parse error` (exit 1) | **Diagram syntax error** | Fix per the line info; rewrite unsupported syntax into an equivalent renderable type (flowchart / state / sequence …) — there is no other engine to switch to |
| `unknown option --engine` / `--layout` | 1.x flags, removed with the second engine | Drop them; tune layout and spacing with `--config` `flowchart.nodeSpacing` / `rankSpacing` |
| `--theme-js v2 receives a ThemeSpec` | 1.x recolor script | Move to `theme.vars` / `theme.shapes` |
| `config "…" is not supported by the pele engine` | Key outside the whitelist | Colors via `--theme-js`; size/spacing via `fontSize` / `flowchart.*` |
| exit 2 | Usage error | Compare against `mmdx --help` |
| SVG loses color in Office | `--svg-themeable` was used | Drop the flag (hex is baked by default), or use `-f png` |
| Text overlapped by edges | Manual `style` changed the background, defeating the theme's label mask | Remove manual styles; use classDef only to emphasize individual nodes |
| Same-named md files overwriting each other in one `-o` dir | Naming collision | Separate directories, or use `--index` to export specific blocks |
| `.html` input with `-f svg` prints `renders to PNG only` | Normal degradation | Whole-page shots are PNG only; use mermaid SVG when you need vectors |
| `.html` input ignores `-t` / `--tone` / `--title` | Those are fence flags | The page carries its own styles and layout; theme and caption chrome are not overlaid |
| `--json.warnings` shows `figure-*` / `svg-aria-label` | Hand-drawn figure geometry or structure | Fix the source by the figure number and coordinates, see [whole-page HTML screenshots](#whole-page-html-screenshots) |
| `column-landscape` / `column-shrink` | Flowchart too wide under `--preset column` | Switch to `flowchart TD` or split; do not raise `--width` |

Rule of thumb: **exit 2 = wrong flags; Parsing error = wrong diagram; look the error up in the table before reinstalling anything**.

## Testing

`bun run tests/run.ts`, four layers — visual review only looks at items the script flags as suspicious:

1. **Library sweep**: 20 mermaid diagram types + extension blocks, rendered in one browser session, then pixel-analyzed (margin symmetry, content ratio, blank-image detection)
2. **CLI behavior**: exit codes, preset widths, caption, brand, over-limit warnings/`--strict-chart`, bad-block isolation, stdin, JSON contract, info-card splitting and tone, `.html` input and figure lint
3. **Profile probes**: Renderer `profile` on; fail if `page-reset` / `init-pele` counts or per-stage maxMs blow the budget (must not re-inject an engine after every HTML block)
4. **Visual lint**: bottom blank band, DOM overflow/outside elements/caption overlap, SVG label overflow, rendered contrast, PNG edge clipping, two-run determinism; rules in [QUALITY.en.md](QUALITY.en.md)

Visual samples: `bun scripts/make-contact-sheet.ts` (mermaid collage) and `bun scripts/make-review.ts` (`docs/ext-*.png`).
