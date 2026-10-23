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
mmdx doc.md --preset column                    # chat / narrow column
mmdx doc.md -t mocha --background transparent -f png --json
mmdx doc.md --brand #E4572E --preset square
mmdx doc.md --list                          # list the fenced blocks found, no rendering
```

Three input forms:

| Input | Behavior |
|---|---|
| `.md` file | Renders all ```mermaid fences plus extension fences (table/list/card/chart/kpi/compare/funnel/task/progress/swimlane/gauge/vs/heatmap) |
| `.mmd` file | Renders a single mermaid diagram |
| `-` (stdin) | Reads a single mermaid diagram from standard input |

Output naming: by default next to the input, `<name>-m<N>.svg/.png` numbered by block order; `-o` sets the output directory; when the input holds exactly one diagram, `-o` may be an exact filename.

## Full CLI reference

| Flag | Meaning |
| --- | --- |
| `-o, --out <path>` | Output directory; exact filename when input has one diagram (default: next to input) |
| `-f, --format <fmt>` | `svg` \| `png` \| `both` (default both; `--preset` defaults to png unless `-f` is explicit) |
| `-t, --theme <name>` | `tech` (default) · `openai` · `openai-dark` · `minimal` · `latte` · `mocha` · `sketch` |
| `--preset <name>` | `slide` (projection/PPT: 1600px@2, 18px type, heavier strokes, ~80px footer) \| `a4` (900px@2) \| `square` (1080px@2) \| `column` (chat/narrow column: 800px@2, ≈1/3 of 2560×1440, 18px type, 200px label wrap). Explicit `--width`/`--scale`/`-f` win |
| `--background <color>` | Page background, e.g. `white` \| `transparent` \| `#1A1A1A` (dark themes bake in their own background) |
| `--engine <name>` | `pele` (default: own layout + wide S-turn routing, curved flowchart edges) \| `mermaid` (Chromium + mermaid.js fallback) |
| `--layout <engine>` | `elk` (default) \| `dagre`. **`--engine mermaid` only** (Pele has its own layout); ELK loads for flowcharts only |
| `--scale <n>` | PNG scale factor (default 2) |
| `--width <px>` | Layout viewport width (default 1200) |
| `--title <text>` | Figure title (PNG chrome; no longer injected as mermaid frontmatter) |
| `--subtitle <text>` | Subtitle |
| `--source <text>` | Source line in the footer |
| `--unit <text>` | Unit line in the footer |
| `--title-pos <pos>` | `top` (default) \| `bottom` (chrome title above/below the figure) |
| `--index <n[,n…]>` | Render only these 1-based block indexes |
| `--brand <hex>` | Accent for extension blocks (default `#2563EB`; `2563EB` also works); does not recolor flowchart shapes. Use a deep hex on a projector |
| `--strict-chart` | Promote mermaid pie/xychart/radar/flowchart/sequence budget hits to errors (default: warn) |
| `--icon <pack>` | Iconify pack for `A@{icon: logos:react}` nodes (repeatable; fetched then cached). **`--engine mermaid` only** |
| `--config <file.json>` | Native mermaid config, deep-merged over the theme |
| `--theme-js <file.js>` | JS theming; file body is a `(config, ctx) => config` function |
| `--css <file.css>` | Extra CSS (mermaid: themeCSS; Pele: in-SVG `<style>`) |
| `--browser <path>` | Browser executable override (default: auto-detect Edge/Chrome) |
| `--jobs <n>` | Parallel render count (default 2; single-browser page pool — don't go high) |
| `--profile` | Per-stage timing summary (browser-launch / page-init / pele-render / mermaid-render / screenshot / svgo) |
| `--list` | List the fenced blocks found and exit, no rendering |
| `--json` | One machine-readable JSON on stdout (files + errors) |
| `-q, --quiet` | Suppress progress lines on stderr |
| `-h, --help` / `-v, --version` | Help / version |

Exit codes: `0` success · `1` at least one render failed (other blocks still render) · `2` usage error.

The `--json` contract:

```json
{
  "theme": "tech", "engine": "pele", "layout": "elk", "format": "png", "background": "#FFFFFF",
  "preset": "slide", "brand": "#E4572E",
  "caption": { "title": "Q1 mix", "subtitle": null, "source": "Finance", "unit": "CNY wan" },
  "blocks": 3, "rendered": 3, "failed": 0,
  "files": ["doc-m1.png", "…"],
  "errors": [],
  "warnings": [{ "input": "doc.md", "index": 1, "code": "pie-sectors", "message": "…" }],
  "profile": { "mermaid-render": { "count": 3, "totalMs": 285, "avgMs": 95, "maxMs": 120, "maxLabel": "doc#2" } }
}
```

(`preset`/`brand`/`caption` appear only when those flags are used; `warnings` is always an array; `profile` appears only when `--profile` is also passed.)

## Extension blocks

Besides mermaid diagrams, common markdown structures render directly into styled images. Extension blocks produce **PNG only** — HTML layout has no portable SVG form. All of them take `--title`/`--subtitle`/`--source`/`--unit` chrome and `--brand` accent.

Syntax, limits, and one sample image per fence: **[extension-block gallery](EXTENSIONS.en.md)**.

## Theming

### Pick a preset (zero cost)

| Scenario | `-t` |
| --- | --- |
| Design docs / architecture / projection (default) | `tech` (shape-coded tinted fills) |
| Minimal open-source README | `openai` / `openai-dark` |
| Obsidian notes | `minimal` |
| Dark docs site / dark UI | `mocha` (or `openai-dark`) |
| Casual sharing / blog | `sketch` (hand-drawn) |

### Renderer (--engine)

The gap is **layout and chrome**, not a prettier default palette. Flowchart blue / amber / green / purple is the same `tech` token set mapped onto Pele `.pele-shape-*`. `--layout elk` applies to **mermaid flowcharts only**; sequence, C4, mindmap, and gitgraph never used ELK — each engine lays those out itself. Collages: [Pele](../tests/contact-sheet-pele.png) · [mermaid](../tests/contact-sheet-mermaid.png).

| Type | Pele (default) | mermaid + ELK |
| --- | --- | --- |
| flowchart | Wide S-turns; subgraph membership follows the source (a worker outside the cluster stays outside) | Layered ELK + kinky edges; `curve: basis` still feels polyline |
| sequence | Numbered messages, CJK wraps, thin activations | Hyphenation artifacts, giant activation dots |
| C4 | Light office cards, dashed external box; **ignores** theme `c4` fills | Dark blocks + person glyph, closer to C4 textbooks |
| mindmap | Organic curves, leaves as plain text | Boxes colored by branch |
| gitgraph / state | Thinner, tighter | Thick orthogonal git lines; more dramatic state arcs |
| `@{icon}` / `-t sketch` | No icon resolver; no hand-drawn look | `--icon` works; `sketch` forces this path |

- `--engine mermaid`: Chromium + mermaid.js. `--layout elk|dagre` **only in this mode, and only for flowcharts**
- `-t sketch` has no Pele hand-drawn look: auto-falls back to mermaid with a stderr note
- Under Pele, `--config` **honors** `flowchart.nodeSpacing` / `rankSpacing` / `wrappingWidth` / `curve`, `fontSize`, `padding`; **ignores** `themeCSS`, `look`, `layoutAlgorithm`, `sequence.*`, `c4.*`. `--css` appends to the in-svg `<style>` — use `.pele-shape-*` / `.pele-edges`, not `.edgePath .path`
- Extension blocks and the pixel crop stay on Chromium
- Layout/color ideas worth stealing later (no second diagram language): [research-layout-color.md](research-layout-color.md)

### Fine-tuning (--css snippet library, appended after the theme)

Default Pele uses `.pele-shape-*` / `.pele-edges path`. The selectors below are for the mermaid engine (`--engine mermaid` or `-t sketch`):

```css
/* larger corner radius */   .node rect { rx: 14px; ry: 14px; }
/* subtle node shadow */     .node rect { filter: drop-shadow(0 1px 2px rgba(0,0,0,.10)); }
/* thicker border */         .node rect, .node polygon { stroke-width: 2px; }
/* thicker edges */          .edgePath .path { stroke-width: 2px; }
```

Font size / line color go through `--config` (native mermaid variables; the JSON must be a real file — no process substitution on Windows):

```bash
echo '{"themeVariables":{"fontSize":"17px","lineColor":"#4E5969"}}' > mq.json
mmdx doc.md --config mq.json
```

### Full recolor (--theme-js, file body is the function body)

```js
// brand.js — usage: mmdx doc.md --theme-js brand.js
export default (config, ctx) => {
  // ctx.theme = current theme name; brand colors example
  const ink = '#0D1B2A', brand = '#E4572E', soft = '#FDF0E5';
  config.themeVariables.primaryTextColor = ink;
  config.themeVariables.lineColor = ink;
  config.themeCSS += `
    .node rect { fill: ${soft}; stroke: ${brand}; }
    .node polygon { fill: ${soft}; stroke: ${brand}; }`;
  return config;   // must return config
};
```

Deeper needs (layout params, disabling mirrored actors…) use `--config` deep-merge over native settings (`flowchart.curve`, `sequence.mirrorActors`…).

**Layering order**: theme → `--brand` → `--theme-js` → `--config` → `--css`. `--brand` only remaps accent / accent-tint; flowchart shape coding stays. Low-contrast accents warn but are not rewritten.

## Performance tuning

`--profile` reports per-stage timings — look at the data before touching anything:

```
browser-launch  ~0.5s ×1      mermaid-render ~95ms ×diagram
page-init       ~1.2s ×page   screenshot      ~90ms ×diagram (incl. pixel-level re-crop)
```

| Lever | Advice |
| --- | --- |
| Batch > 30 blocks | `--jobs 4`; the default 2 is enough — single-browser page pool, diminishing returns and memory pressure beyond that |
| PNG too large | Lower `--scale` (default 2; 1 is fine for chat); PNG is lossless, typical architecture diagram 20–80 KB |
| Tiny type in chat / a narrow column | `--preset column` and `flowchart TD`; do not raise `--width` (a wider canvas shrinks even smaller) |
| Fill a projector / wide doc | `--preset slide`, or raise `--width` for a horizontal flowchart |
| SVG only | `-f svg` skips the screenshot stage |
| First image slow | browser-launch + page-init is fixed cost (~1.7s), amortized over batches; normal for single images |

Pipeline facts: one Chromium instance + page pool + bounded workers; ELK (7 MB bundle) lazily loads for flowchart/graph only, zero cost for sequence/pie/gantt etc.; screenshots serialize across pages (headless Chrome serves one active tab); a hung render trips a 60s circuit breaker, each diagram retried once.

## Troubleshooting

| Error / symptom | Nature | Fix |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | No browser in environment | Install Edge/Chrome, or pass `--browser "<path-to-msedge.exe>"` (any Chromium); never auto-downloads |
| `render timed out after 60s` | Resource pressure / browser hang | CLI already retried; rerun the whole command, or isolate with `--jobs 1` if persistent |
| `icon pack "xxx" not found` | Network down (unpkg) | Drop `--icon`, or run once online to warm the cache |
| Chinese glyphs turn into boxes | Shouldn't happen (font bundled) | Check whether `--config`/`--theme-js` overrode fontFamily |
| `Parsing error` (exit 1) | **Diagram syntax error** | Fix per the mermaid line info; other blocks are unaffected |
| exit 2 | Usage error | Compare against `mmdx --help` |
| SVG text disappears in non-browser tools (Inkscape etc.) | The svg is HTML-implemented | Use `-f png` instead |
| Text overlapped by edges | Manual `style` changed the background, defeating the theme's label mask | Remove manual styles; use classDef only to emphasize individual nodes |
| Same-named md files overwriting each other in one `-o` dir | Naming collision | Separate directories, or use `--index` to export specific blocks |

Rule of thumb: **exit 2 = wrong flags; Parsing error = wrong diagram; look the error up in the table before reinstalling anything**.

## Testing

`bun run tests/run.ts`, three layers — visual review only looks at items the script flags as suspicious:

1. **Library sweep**: 20 mermaid diagram types + extension blocks, rendered in one browser session, then pixel-analyzed (margin symmetry, content ratio, blank-image detection)
2. **CLI behavior**: exit codes, preset widths, caption, brand, over-limit warnings/`--strict-chart`, bad-block isolation, stdin, JSON contract
3. **Profile probes**: Renderer `profile` on; fail if `page-reset` / `init-mermaid` counts or per-stage maxMs blow the budget (must not re-inject mermaid after every HTML block)

Visual samples: `bun scripts/make-contact-sheet.ts` (Pele / mermaid engine collages) and `bun scripts/make-review.ts` (`docs/ext-*.png`).
