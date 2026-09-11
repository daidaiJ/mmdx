> English · [中文](AGENT_GUIDE.md)

# mmdx — Agent Guide

Office diagram CLI. Renders fenced blocks to PNGs you can paste into PPT / Word / Feishu. Themes, CJK font, ELK, and padding are built in. **Do not hand-style diagram code; do not freehand SVG.**

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
# L0 office default: PNG + slide frame
mmdx doc.md --preset slide --title "Q1 mix" --unit "CNY wan" --source "Finance"
# L1 batch / targeted
mmdx a.md b.md -o dist/ --preset slide
mmdx doc.md --index 2 -f png
# L2 exact name / stdin
echo "graph LR; A-->B" | mmdx - -f png
```

Chat/slides: `-f png` or `--preset slide|a4|square` (preset defaults to png unless `-f` is explicit). **Projection / PPT / all-hands / big screen** must use `--preset slide` (18px type + heavier strokes) plus `--title`. Do not hand-tune contrast with `--css`; do not project `mocha`/`openai-dark`. Feishu cards: `square`. Word: `a4`. `both` is for developers embedding Markdown. Explicit `--width`/`--scale`/`-f` override the preset. Brand: `--brand #2563EB` (accent only; skip washed-out light blues on a projector).

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

One JSON on stdout: `theme/layout/format/background/preset?/brand?/caption?/blocks/rendered/failed/files[]/errors[]/warnings[{input,index,code,message}]`; with `--profile` an extra `profile`. Non-JSON mode prints artifact paths on stdout.

## Error triage

| Error | Nature | Fix |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | No browser | Install Edge/Chrome or `--browser`; never auto-downloads |
| `render timed out after 60s` | Resource pressure / hang | CLI already retried; isolate with `--jobs 1` |
| `icon pack "xxx" not found` | Network down (unpkg) | Drop `--icon`, or run once online to warm the cache |
| Chinese glyphs become boxes | Shouldn't happen (font bundled) | Check whether `--config`/`--theme-js` overrode fontFamily |
| `Parsing error` / limit message (exit 1) | **Diagram or fence is wrong** | Fix per the message; other blocks unaffected |
| exit 2 | Usage error | Compare against `mmdx --help` |
| SVG text vanishes in non-browser tools | svg is HTML-implemented | Use `-f png` |

Rule of thumb: **exit 2 = wrong flags; exit 1 = wrong diagram or over limit; look the error up before reinstalling anything**.

## Theme notes

`-t`: `tech` (default, shape-coded tinted fills — docs and projection) · `openai`/`openai-dark` · `minimal` · `latte`/`mocha` · `sketch`.
Layering: theme → `--brand` → `--theme-js` → `--config` → `--css`. `--brand` does not recolor flowchart decision diamonds. Do not project `mocha`/`openai-dark`.

## Exit codes

`0` success · `1` some blocks failed (others still render) · `2` usage error.

## Common pitfalls

- Batch > 30 blocks → `--jobs 4` (default 2; single-browser page pool, don't go higher)
- Same-named md files overwrite each other in one `-o` dir → separate directories or `--index`
- `--config` JSON must be a real file (no process substitution on Windows)
- Hand-written `xychart-beta` is the #1 ugly-chart source → use ` ```chart `
