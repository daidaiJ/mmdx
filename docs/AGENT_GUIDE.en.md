> English · [中文](AGENT_GUIDE.md)

# mmdx — Agent Guide

Office diagram CLI. Renders fenced blocks to PNGs you can paste into PPT / Word / Feishu. Themes, CJK font, Pele layout, and padding are built in. **Do not hand-style diagram code.**

> Human-readable version: [HUMAN_GUIDE.en.md](HUMAN_GUIDE.en.md) · Extension gallery: [EXTENSIONS.en.md](EXTENSIONS.en.md) · On-demand references: [skill/references/](../skill/references/) (fence syntax / diagram examples / themes & Pele config / troubleshooting) · Overview: [README](../README.en.md)

## Scene tiers (pick the tier before writing)

| Tier | Scene | Path | Output | Cost |
| --- | --- | --- | --- | --- |
| **Fast** (default) | Process / approval / light data / layout blocks — weekly pastes, projection, high-frequency acceptance | Fences (mermaid types + extension blocks) per [diagram picking](#diagram-picking) | PNG @2x; vector SVG for mermaid types | ~0.3–1.5k tokens, seconds |
| **Polished** (rare) | Covers / proposal art — editorial feel, one-off | Hand-drawn HTML ([vendored diagram-design specs](../skill/editorial/README.md)) → [HTML export](#html-export) | PNG @3x | ~10–20k tokens, minutes |
| **Narrative** (rare) | Multi-figure explainers / diff·plan review pages / recaps / slide decks | HTML assembled from an explain starter ([vendored visual-explainer specs](../skill/explain/README.md)) → the same export command | PNG @3x | minutes |

Every tier exports through mmdx — one rasterization, supersampled, embedded CJK type — so sharpness is a construction guarantee. For more fidelity add `--scale 3`; never upscale an exported PNG.

**Guardrail**: office output defaults to the fast tier; don't drop to hand-drawn HTML to dodge fence discipline (budgets and pixel sweeps only hold inside the fence system). The polished / narrative tiers are for "HTML already exists" exports or one-offs that genuinely need editorial or explainer feel.

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
# L0 office default: PNG + slide frame
mmdx doc.md --preset slide --title "Q1 mix" --unit "CNY wan" --source "Finance"
# L0 chat / narrow column: 800px@2 (about 1/3 of a 2K display, tighter label wrap)
mmdx doc.md --preset column
# L1 batch / targeted
mmdx a.md b.md -o dist/ --preset slide
mmdx doc.md --index 2 -f png
# L2 exact name / stdin
echo "graph LR; A-->B" | mmdx - -f png
# Info card (Markdown or URL; --tone controls structure)
mmdx card --in note.md -t openai --tone neutral --width 600 -o card.png
```

Chat/slides: `-f png` or `--preset slide|a4|square|column` (preset defaults to png unless `-f` is explicit). **Projection / PPT / all-hands / big screen** must use `--preset slide` (18px type + heavier strokes) plus `--title`. Do not hand-tune contrast with `--css`; do not project a dark page in a meeting room. Chat / narrow column: `--preset column` (800px@2, 18px type, 200px label wrap) with `flowchart TD` — do not raise `--width` (smaller type after scaling). Feishu cards: `square`. Word: `a4`. `both` is for developers embedding Markdown. Explicit `--width`/`--scale`/`-f` override the preset. Brand: `--brand #2563EB` (accent only; skip washed-out light blues on a projector). `column-landscape` / `column-shrink` in `--json.warnings` → switch to `flowchart TD` or split.

Pele is the only engine — there is no `--engine` / `--layout` switch; syntax Pele cannot parse fails with `Parsing error` (exit 1), so rewrite it into an equivalent diagram type. `-f svg` bakes colors by default; `--svg-themeable` keeps CSS variables.

## HTML export

Trigger: the user hands you / asks for an HTML file to "export / screenshot / turn into PNG", or wants an editorial cover or a narrative explainer.

```bash
mmdx page.html -o out/page.png --scale 3    # 3x for print / large screens; 2 is enough for PPT
mmdx page.html --background transparent     # transparent only when passed
```

- Only standalone `.html` / `.htm` files; a ` ```html ` fence inside `.md` does **nothing**. Page styles, scripts, and background are kept; Chinese is filled by the three bundled families (sans body text, serif-stack Chinese to the serif face, explicit `'LXGW WenKai'` for kai), while CJK webfonts the page declares itself still win. `--width` is the layout viewport; an explicit narrower `body` width wins
- PNG only: an explicit `-f svg` still writes PNG and prints `... renders to PNG only`
- **Figure lint runs automatically** on export; findings land in `--json.warnings` — fix the source by coordinates until zero
- **Editorial cover / proposal art**: read [skill/editorial](../skill/editorial/README.md) (diagram-design specs, MIT), hand-draw a self-contained HTML per its general rules + the matching `references/type-*.md`, then export
- **Explainer / review page / recap / slide deck**: copy a [skill/explain](../skill/explain/README.md) `kit/starter-<register>.html` (instrument / blueprint / paper / editorial; kit and Latin fonts already inlined) → edit `<main>` → the same export command. Pre-render in-page mermaid with `mmdx - -f svg` and inline it as-is (never add a second `style` attribute to that svg — HTML drops the duplicate and the `--pele-*` theme vars with it). Starters are generated by `bun run scripts/explain-starter.ts`, which uses `import.meta.dir` and needs bun; run it only to regenerate starters
- **Guardrail**: don't hand-write HTML to dodge fences — budgets and pixel sweeps do not apply to arbitrary HTML; the hand-drawn path is for "HTML already exists" or one-offs that need editorial / narrative feel

Figure-lint codes and fixes:

| Code | Fix |
| --- | --- |
| `figure-overflow` | Widen the `viewBox` or pull the element back inside |
| `figure-text-overlap` | Move the label; put a node's own label and its shape in one `<g>` |
| `figure-text-adhesion` | Gap to a box under max(4px, 35% of the font size): shorten the label, spread it out, or raise it |
| `figure-small-text` | Enlarge the canvas or the type (<11px reads as illegible) |
| `figure-uncaptioned` / `svg-aria-label` | Add a `figcaption` (stating the claim) or an svg `aria-label` |

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
2. Overview ≤9 nodes / ≤12 edges / ≤2 accents; sequence ≤5 lifelines. Degrade in order: decoration → duplicate merge → fold leaf clusters → degree-1 sinks → cross-cutting infra → split
3. No global `style`/`classDef`; emphasize individual nodes only
4. Name your `subgraph`s; cross-team handoff prefers swimlane
5. Title/source/unit via `--title`/`--subtitle`/`--source`/`--unit`, never hand-written frontmatter
6. CJK ≥ 12px; thin rings/arrows hold digits only
7. **5-metre projection check** (Read the PNG): squint — shape coding still reads, title is on the figure, nothing truncated. If not, cut nodes; do not add `--css`

## Self-check loop

1. `--json`: `failed:0`; non-empty `warnings` → split or AntV (`--strict-chart` promotes to errors)
2. **Read the PNG**: caption visible, no truncated text, not over budget, even padding
3. If you cut density, one fidelity line: "18 source nodes → 9 on the figure"
4. Re-render with `--index N`; at most 2 iterations

## JSON contract (--json)

One JSON on stdout: `theme/engine/format/background/preset?/brand?/caption?/blocks/rendered/failed/files[]/errors[]/warnings[{input,index,code,message}]` (`engine` is always `"pele"`); with `--profile` an extra `profile`. Non-JSON mode prints artifact paths on stdout.

## Error triage

| Error | Nature | Fix |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | No browser | Install Edge/Chrome or `--browser`; never auto-downloads |
| `render timed out after 60s` | Resource pressure / hang | CLI already retried; isolate with `--jobs 1` |
| `icon pack "xxx" not found` | Network down (unpkg) | Drop `--icon`, or run once online to warm the cache |
| Chinese glyphs become boxes | Shouldn't happen (font bundled) | Check whether `--config`/`--theme-js` overrode fontFamily |
| `Parsing error` / `pele: Parse error` / limit message (exit 1) | **Diagram or fence is wrong** | Fix per the message; rewrite into an equivalent renderable type — there is no other engine to switch to |
| `unknown option --engine` / `--layout` | 1.x flags, removed with the second engine | Drop them; spacing via `--config` `flowchart.nodeSpacing` / `rankSpacing` |
| `--theme-js v2 receives a ThemeSpec` | 1.x recolor script | Use `theme.vars` / `theme.shapes` |
| `config "…" is not supported by the pele engine` | Key outside the whitelist | Colors via `--theme-js`; size/spacing via `fontSize` / `flowchart.*` |
| exit 2 | Usage error | Compare against `mmdx --help` |
| SVG loses color in Office | `--svg-themeable` used | Drop the flag, or use `-f png` |
| `.html` input with `-f svg` prints `renders to PNG only` | Normal degradation | Whole-page shots are PNG only; use mermaid SVG for vectors |
| `figure-*` / `svg-aria-label` warnings on `.html` input | Hand-drawn figure geometry or structure | Fix the source by figure number and coordinates until `--json.warnings` is empty |

Rule of thumb: **exit 2 = wrong flags; exit 1 = wrong diagram or over limit; look the error up before reinstalling anything**.

## Theme notes

`-t`: `tech` (default, shape-coded tinted fills — docs and projection) · `openai` (clean engineering docs: white, ink, mint accent, hairline borders) · `excalidraw` (hand-drawn strokes + pastel fills).
`excalidraw` uses solid fills by default; `--style-fill hachure` switches to hatched fills. Block pages and info cards use `--tone paper|neutral|product` for structure; the palette stays with the theme. Layering: theme → `--brand` → `--theme-js` → `--config` → `--css`. `--brand` does not recolor flowchart decision diamonds.

| Scenario | First choice | Alternative | tone |
| --- | --- | --- | --- |
| Design docs / weekly / projection | `tech` | `openai` | `neutral` |
| Engineering docs / README | `openai` | `tech` | `neutral` |
| Release notes / engineering blog | `openai` | `tech` | `product` |
| External report / print | `openai` | `tech` | `paper` |
| Finance / business report | `openai` | `tech` | `paper` |
| Knowledge base / long read | `tech` | `openai` | `neutral` |
| Enterprise architecture / compliance | `tech` | `openai` | `product` |
| Product review | `openai` | `tech` | `product` |
| Whiteboard / brainstorm | `excalidraw` | `openai` | `neutral` |
| Casual sharing | `excalidraw` | `tech` | `paper` |

Info cards: external/print → `openai` + `paper`; engineering docs → `tech` + `neutral`; release/product → `openai` + `product`. See `skill/info-card-designer/SKILL.md`.

`--theme-js` is the v2 contract: `(theme) => theme`, editing `theme.vars` / `theme.shapes` / `theme.css`; do not touch Mermaid `themeVariables`.

## Exit codes

`0` success · `1` some blocks failed (others still render) · `2` usage error.

## Common pitfalls

- Batch > 30 blocks → `--jobs 4` (default 2; single-browser page pool, don't go higher)
- Same-named md files overwrite each other in one `-o` dir → separate directories or `--index`
- `--config` JSON must be a real file (no process substitution on Windows); only `fontSize` / `padding` / `flowchart.spacing` are honored
- Hand-written `xychart-beta` is the #1 ugly-chart source → use ` ```chart `
