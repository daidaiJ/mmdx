> English · [中文](AGENT_GUIDE.md)

# mmdx — Agent Guide

Mermaid diagram export CLI. Batch-renders ```mermaid / ```table / ```list / ```card fenced blocks into SVG + PNG; themes, CJK font, ELK layout, and padding are all built in. **Do not hand-style diagram code; do not use the VSCode plugin.**

> Human-readable version: [HUMAN_GUIDE.en.md](HUMAN_GUIDE.en.md) · Overview: [README](../README.en.md)

## Get the binary (by priority)

```bash
# 1. Release binary (recommended, no Node)
curl -L -o "$TMP/mmdx.exe" https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
# 2. Run from source (needs bun): bun run src/cli.ts
```

Below it's written as `mmdx` (any path above). Rendering needs system Edge/Chrome; if missing you get `no Chrome/Edge found` — pass `--browser <path>`. **Never auto-downloads a browser.**

## Env self-check (first use in a session, 30 seconds)

```bash
mmdx --version   # expect 1.0.0; not found → use the full path
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
```

Smoke JSON with `rendered:1` → environment ready. `rendered:0` → see [error triage](#error-triage).

## Command tiers (run the low tier first, escalate if needed)

```bash
# L0 default (80% of cases): all blocks → <name>-m1.svg/.png … next to input
mmdx doc.md
# L1 batch / targeted
mmdx a.md b.md docs/*.md -o dist/          # multi-file batch
mmdx doc.md --index 2 -f png               # export block 2 only
# L2 title / naming
mmdx doc.md --title "Architecture" --title-pos bottom -o out/arch.svg
echo "graph LR; A-->B" | mmdx - -f svg     # single diagram from stdin
```

Format: chat/standalone image `-f png`; markdown docs default both; dark backgrounds `--background transparent` (dark themes bake in their own background — don't pass it again).

## Diagram picking

| What the user wants | Type | Notes |
| --- | --- | --- |
| Process/steps/decisions | `flowchart LR/TD` | Pipelines LR; decisions/hierarchy TD |
| Message flow/protocols | `sequenceDiagram` | ≤ 6 participants; use `autonumber`, `alt/else` |
| State transitions | `stateDiagram-v2` | `[*] --> s1: event` |
| Classes/interfaces | `classDiagram` | |
| Data model | `erDiagram` | `USER \|\|--o{ ORDER : has` |
| Concept structure | `mindmap` | Indent levels + `root((topic))` |
| Schedule/share/evolution | `gantt` / `pie` / `timeline` | |
| Table/list/cards → image | ```table / ```list / ```card fence | **PNG only**; card syntax `emoji \| title \| description` |

## Diagram rules (violations are the #1 cause of ugly output)

1. Node labels ≤ 12 CJK chars (~30 latin); details go to edge labels/notes/body text
2. ≤ 15 nodes per diagram; split into "overview + detail" beyond that
3. No global `style`/`classDef` recoloring; classDef only to emphasize individual nodes
4. Name your `subgraph`s; container colors belong to the theme
5. ≤ 3 emoji per diagram; brand icons `A@{icon: logos:react}` + `--icon logos`
6. Titles via `--title`, never hand-written frontmatter

## Self-check loop (mandatory after rendering)

1. Verify with `--json`: `failed:0` and `files.length === blocks × formats`
2. **Read the generated PNG**: no truncated text, clear contrast, edges don't cross text, even margins on all four sides
3. Problem → fix the diagram or styling → re-render that block with `--index N`; at most 2 iterations, then ask the user

## JSON contract (--json)

One JSON on stdout: `theme/layout/format/background/blocks/rendered/failed/files[]/errors[{input,index,error}]`; with `--profile` an extra `profile{stage:{count,totalMs,avgMs,maxMs,maxLabel}}`. Non-JSON mode prints artifact paths line-by-line on stdout, progress on stderr.

## Error triage

| Error | Nature | Fix |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | No browser | Install Edge/Chrome or `--browser "<path-to-msedge.exe>"`; never auto-downloads |
| `render timed out after 60s` | Resource pressure / hang | CLI already retried; rerun the command, isolate with `--jobs 1` if persistent |
| `icon pack "xxx" not found` | Network down (unpkg) | Drop `--icon`, or run once online to warm the cache |
| Chinese glyphs become boxes | Shouldn't happen (font bundled) | Check whether `--config`/`--theme-js` overrode fontFamily |
| `Parsing error` (exit 1) | **Diagram syntax error** | Fix per the mermaid line info; other blocks unaffected |
| exit 2 | Usage error | Compare against `mmdx --help` |
| SVG text vanishes in non-browser tools | svg is HTML-implemented | Use `-f png` |

Rule of thumb: **exit 2 = wrong flags; Parsing error = wrong diagram; look the error up before reinstalling anything**.

## Theme notes

`-t`: `tech` (default, tech docs) · `openai`/`openai-dark` (minimal) · `minimal` (Obsidian) · `latte`/`mocha` (Catppuccin) · `sketch` (hand-drawn).
Layering: preset → `--theme-js` (function body `(config, ctx) => config`, must return config) → `--config` (native mermaid config deep-merge) → `--css`.

## Exit codes

`0` success · `1` some blocks failed (others still render) · `2` usage error.

## Common pitfalls

- Batch > 30 blocks → `--jobs 4` (default 2; single-browser page pool, don't go higher)
- Same-named md files overwrite each other in one `-o` dir → separate directories or `--index`
- `--config` JSON must be a real file (no process substitution on Windows)
