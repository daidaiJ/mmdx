# Showcase: the two vendored skills, rendered (v1.4.2)

> Both images come out of **one pipeline**: a hand-authored self-contained HTML page → `mmdx file.html --scale 3` (system Edge, no browser download, three embedded CJK font families, figure lint on export). Sources live in `tests/` and reproduce as-is.

## editorial — diagram-design specs (polish tier: covers / solution art)

![editorial showcase](showcase-editorial.png)

- Source: `tests/editorial-showcase/layer-stack.html`, hand-drawn per the [skill/editorial/](../skill/editorial/README.md) specs (paper/ink palette, 4px grid, mono sublabels)
- Command: `mmdx tests/editorial-showcase/layer-stack.html -o docs/showcase-editorial.png --scale 3`
- What's new here: **Chinese serif headings are reliable offline** (serif stacks resolve to the embedded Noto Serif SC — the old "don't bet on serif" limitation is gone); the bottom side note is the embedded LXGW WenKai kai (`'LXGW WenKai'`); geometry (overflow / text-on-shape / adhesion) is checked by the export lint — this page renders with zero warnings

## explain — the spec-only adaptation of visual-explainer (narrative tier: explainers / review pages / recaps / slide decks)

![explain showcase](showcase-explain.png)

- Source: `tests/explain-e2e/cache-read-path.html`, assembled from `skill/explain/kit/starter-paper.html` (the starter already inlines kit.css + defs + the paper register's Latin fonts); the body is a hand-drawn mechanism figure, hand-written waffle/bars, and an in-page mermaid pre-rendered by mmdx
- Command: `mmdx tests/explain-e2e/cache-read-path.html -o docs/showcase-explain.png --scale 3`
- What's new here: none of the upstream renderer ships (route D); the three CJK families arrive via the pipeline (serif heading / sans body / kai side note); the in-page mermaid rides the mmdx engine and its Chinese fonts; export lint warnings = 0

Tier boundaries and discipline live in [skill/SKILL.md](../skill/SKILL.md); warning semantics in [skill/references/troubleshooting.md](../skill/references/troubleshooting.md).
