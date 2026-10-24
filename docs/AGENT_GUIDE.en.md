> English · [中文](AGENT_GUIDE.md)

# mmdx — Agent Guide

Office diagram CLI. Renders fenced blocks to PNGs you can paste into PPT / Word / Feishu. Themes, CJK font, Pele layout, and padding are built in. **Do not hand-style diagram code; do not freehand SVG.**

> Human-readable version: [HUMAN_GUIDE.en.md](HUMAN_GUIDE.en.md) · Extension gallery: [EXTENSIONS.en.md](EXTENSIONS.en.md) · Overview: [README](../README.en.md)

## Get the binary (by priority)

```bash
# 1. Release binary (recommended, no Node)
curl -L -o "$TMP/mmdx.exe" https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
# 2. Run from source (needs bun): bun run src/cli.ts
```

Below it's written as `mmdx`. Rendering needs system Edge/Chrome; if missing you get `no Chrome/Edge found` — pass `--browser <path>`. **Never auto-downloads a browser.**

## Env self-check (first use in a session, 30 seconds)

```bash
mmdx --version
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
```

Smoke JSON with `rendered:1` → environment ready. `rendered:0` → see [error triage](#error-triage).

## When not to draw

- Plain list → ` ```list ` or prose
- Two-sentence before/after → ` ```compare `
- Two numbers on the same metric → ` ```vs `
- A single labeled box → write a sentence
- The figure teaches nothing beyond a paragraph → don't draw it

Before drawing, state in one or two sentences: type, `--preset` (if any), what the budget will cut. Office default voice is `mixed` (component names + plain verbs, no ports/protocols).

## Command tiers

```bash
# L0 chat / narrow column: PNG + 800px (≈1/3 of 2K)
mmdx doc.md --preset column
# L0b projection / PPT
mmdx doc.md --preset slide --title "Q1 mix" --unit "CNY wan" --source "Finance"
# L1 batch / targeted
mmdx a.md b.md -o dist/ --preset column
mmdx doc.md --index 2 -f png
# L2 exact name / stdin
echo "graph TD; A-->B" | mmdx - -f png --preset column
```

Chat / narrow-column surfaces: `--preset column` (800px@2, 18px type, 200px label wrap; ≈1/3 of a 2560×1440 display). **Projection / PPT / all-hands / big screen** must use `--preset slide` (18px type + heavier strokes) plus `--title`. Do not hand-tune contrast with `--css`; do not project `mocha`/`openai-dark`. Feishu cards: `square`. Word: `a4`. `both` is for developers embedding Markdown. Explicit `--width`/`--scale`/`-f` override the preset. Brand: `--brand #2563EB` (accent only; skip washed-out light blues on a projector). `column-landscape` / `column-shrink` in `--json.warnings` → switch to `flowchart TD` or split; do not raise `--width`.

## HTML file export (pairs with diagram-design)

Trigger: the user hands over / generates an HTML file and wants it "exported / screenshotted / converted to PNG", or occasionally asks for an editorial cover image.

```bash
mmdx page.html -o out/page.png --scale 3    # 3x high fidelity (print / big-screen zoom); default 2 is fine for slides
mmdx page.html --background transparent     # transparent only when explicit
```

- Standalone `.html` / `.htm` files only; an ` ```html ` fence inside `.md` is **ignored**. The page's own styles, scripts and background are kept; Chinese glyphs fall through to the bundled font (offline-consistent); `--width` is the layout viewport, an explicit narrower `body` width wins
- **Hand-drawn editorial images** (covers / proposal illustrations, low-frequency high-fidelity): specs live in [editorial-diagram-design](editorial-diagram-design/README.md) (vendored diagram-design skill, MIT) — follow its primer plus the matching `type-*.md`, write the HTML, export with the command above; use `'Noto Sans SC'` for Chinese
- **Guardrail**: do not hand-write HTML to route around the fences for office diagrams — budgets / lint / pixel screening do not apply to arbitrary HTML; the hand-drawn path is only for "the HTML already exists" or one-off editorial needs

## Diagram picking

| What the user wants | Use | Cap |
| --- | --- | --- |
| Share / mix | pie / ` ```chart ` pie | 3–6 slices |
| Trend / numeric compare | ` ```chart ` line / bar | ≤6 cats × ≤2 series |
| Option compare | ` ```compare ` | exactly 2 columns |
| Numeric before/after | ` ```vs ` | ≤6 rows × 2 cols |
| Process / approval / decision | flowchart | ≤9 nodes / ≤12 edges |
| Cross-team handoff | ` ```swimlane ` | ≤5 lanes, ≤8 steps |
| Task-status snapshot | ` ```task ` | ≤10 rows |
| Concentric attainment | ` ```progress ` | ≤4 rings |
| Side-by-side gauges | ` ```gauge ` | ≤4 dials |
| KPI big numbers | ` ```kpi ` | ≤4 rows |
| Commit / ship calendar | ` ```heatmap ` | ≤12 weeks |
| Funnel | ` ```funnel ` | ≤6 layers |
| Table / list / cards | ` ```table ` / ` ```list ` / ` ```card ` | |
| Schedule / composition / flow | gantt / treemap / sankey | |
| Quadrant / journey / timeline / scores | quadrant / journey / timeline / radar | radar ≤8×3 |

**Appendix (renders, not featured):** sequence, state, class, ER, gitgraph, C4. Over limit → split overview+detail, or hand data charts to [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart).

## Diagram rules

1. Node labels ≤ 12 CJK chars; details go to edges/notes/prose
2. Labels containing `()`/`[]` brackets must be fully quoted: `A["O(1) overhead"]` — bare brackets break the parser at `(` with a Parsing error
3. Overview ≤9 nodes / ≤12 edges / ≤2 accents; sequence ≤5 lifelines. Degrade in order: decoration → duplicate merge → fold leaf clusters → degree-1 sinks → cross-cutting infra → split
4. **No single-chain snakes**: ≥6 nodes in one line (TD or LR) makes a skinny canvas that layouts badly in documents → split into 2-4 phase `subgraph`s (outer `TD` for chat; outer `LR` + inner `direction TB` only on a wide slide); pure linear stories → timeline
5. No global `style`/`classDef`; emphasize individual nodes only
6. Name your `subgraph`s; cross-team handoff prefers swimlane
7. Title/source/unit via `--title`/`--subtitle`/`--source`/`--unit`, never hand-written frontmatter
8. CJK ≥ 12px; thin rings/arrows hold digits only
9. **5-metre projection check** (Read the PNG): squint — shape coding still reads, title is on the figure, nothing truncated. If not, cut nodes; do not add `--css`

## Self-check loop

1. `--json`: `failed:0`; non-empty `warnings` → split or AntV (`--strict-chart` promotes to errors)
2. **Read the PNG**: caption visible, no truncated text, not over budget, even padding. Flowchart full of polylines → you are on mermaid+ELK; C4 as light office cards → Pele (use `--engine mermaid` for textbook dark blocks)
3. **sequence: always check the bottom** — note box / lifeline tails complete (large fonts make height measurement undershoot; see Common pitfalls)
4. If you cut density, one fidelity line: "18 source nodes → 9 on the figure"
5. Re-render with `--index N`; at most 2 iterations

## JSON contract (--json)

One JSON on stdout: `theme/layout/format/background/preset?/brand?/caption?/blocks/rendered/failed/files[]/errors[]/warnings[{input,index,code,message}]`; with `--profile` an extra `profile`. Non-JSON mode prints artifact paths on stdout.

## Error triage

| Error | Nature | Fix |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | No browser | Install Edge/Chrome or `--browser`; never auto-downloads |
| `render timed out after 60s` | Resource pressure / hang | CLI already retried; isolate with `--jobs 1` |
| `icon pack "xxx" not found` | Network down (unpkg) | Drop `--icon`, or run once online to warm the cache |
| Chinese glyphs become boxes | Shouldn't happen (font bundled) | Check whether `--config`/`--theme-js` overrode fontFamily |
| `Parsing error` / limit message (exit 1) | **Diagram or fence is wrong** | Fix per the message; other blocks unaffected; stuck at `(`/`[` usually means an unquoted label with brackets (rule 2) |
| exit 2 | Usage error | Compare against `mmdx --help` |
| SVG text vanishes in non-browser tools | svg is HTML-implemented | Use `-f png` |
| sequence clipped at the bottom (note box / lifeline tails cut) | Global `fontSize` is not part of sequence layout math | `--config` must also set `sequence.actorFontSize/messageFontSize/noteFontSize`; do NOT band-aid with `overflow:visible` (lifelines paint far past the viewBox and pierce page content) |

Rule of thumb: **exit 2 = wrong flags; exit 1 = wrong diagram or over limit; look the error up before reinstalling anything**.

## Theme notes

`-t`: `tech` (default, shape-coded tinted fills — docs and projection) · `openai`/`openai-dark` · `minimal` · `latte`/`mocha` · `sketch`.
Layering: theme → `--brand` → `--theme-js` → `--config` → `--css`. `--brand` does not recolor flowchart decision diamonds. Do not project `mocha`/`openai-dark`.

## Renderer

The gap is **layout and chrome**, not a better palette. Flowchart shape coding is the same `tech` tokens. `--layout elk` applies to **mermaid flowcharts only**. Collages: [Pele](../tests/contact-sheet-pele.png) / [mermaid](../tests/contact-sheet-mermaid.png).

| Want | Engine |
| --- | --- |
| Flow / sequence / state (default) | `pele`: wide S-turns; subgraph membership follows the source; numbered sequence messages, CJK wraps |
| C4 dark blocks + person, mindmap boxes colored by branch, `@{icon}` | `mermaid`: C4 uses the theme `c4` section; ELK only on flowcharts |
| Hand-drawn | `-t sketch` (forces mermaid) |

Under Pele, `--config` honors `flowchart.nodeSpacing/rankSpacing/wrappingWidth/curve`, `fontSize`, `padding`; `themeCSS` / `look` / `layoutAlgorithm` / `sequence.*` are ignored. Extension blocks and the pixel crop stay on Chromium. Layout/color ideas worth stealing later: [research-layout-color.md](research-layout-color.md) (no second diagram language).

## Exit codes

`0` success · `1` some blocks failed (others still render) · `2` usage error.

## Common pitfalls

- Batch > 30 blocks → `--jobs 4` (default 2; single-browser page pool, don't go higher)
- Same-named md files overwrite each other in one `-o` dir → separate directories or `--index`
- `--config` JSON must be a real file (no process substitution on Windows)
- Hand-written `xychart-beta` is the #1 ugly-chart source → use ` ```chart `
- **Enlarging sequence fonts**: global `themeVariables.fontSize` scales text but not layout — also set `sequence:{actorFontSize,messageFontSize,noteFontSize}` to the same value, or the bottom gets clipped
- **Embedding SVG into HTML/PDF**: artifacts ship a fixed pixel width and `max-width:none` → container CSS needs `svg{max-width:100%!important;height:auto!important}`; inject a `viewBox` when missing (some sequence outputs); add `break-inside:avoid` print rules to stop page-break slicing
