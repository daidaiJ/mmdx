> [中文](vendored-html.md) · English

# Two hand-drawn HTML templates (v1.4.2)

The previous tag's showcase page used two vendored hand-drawn HTML skills, not mmdx theme presets:

- **editorial** from `diagram-design`: paper/ink palette, 4px grid, serif headings, mono sublabels, hand-drawn SVG.
- **visual-explainer** in its `paper` register: warm paper ground, Newsreader serif display, Atkinson body, ink-blue accent, 10px radii.

Both use “hand-written self-contained HTML → `mmdx page.html --scale 3`”, a different pipeline from v2's fences and themes.

That export path carries three v1.4.0–v1.4.2 capabilities: a whole `.html` file is screenshotted as-is to PNG (fullPage, PNG only — the page keeps its own styles, scripts and background; `--width` is the layout viewport, and an explicit narrower `body` width wins); three embedded CJK families — Noto Sans SC (body sans), Noto Serif SC (serif stacks and the `serif` generic's CJK fallback) and LXGW WenKai (kai, declared explicitly as `'LXGW WenKai'` for hand-drawn labels); and figure lint on export (`figure-overflow` / `figure-text-overlap` / `figure-text-adhesion` / `figure-small-text` / `figure-uncaptioned` / `svg-aria-label`), surfaced in `--json.warnings`. Both samples below render with zero lint warnings.

## editorial (diagram-design)

![Original editorial showcase](vendored-editorial.png)

**Look**: `#F7F4EE` paper, `#1F2328` ink, `#2563EB` blue accent, `#D8D2C4` rules; Georgia / Noto Serif SC headings, `ui-monospace` sublabels; 4px grid, 2px strokes, hand-drawn layer bands.

**Use for**: covers, architecture illustrations, one-page proposals, design reviews, low-frequency high-value editorial pages.

**Avoid**: weekly reports, dense data tables, compliance material that needs pixel alignment.

**Closest current preset**: `excalidraw` picks up the hand-drawn strokes and pastel feel; `openai` picks up the restrained palette and hairline borders. These are fence-theme approximations only; for the real paper palette and 4px grid, use the HTML export below.

## visual-explainer (paper register)

![Original visual-explainer showcase](vendored-visual-explainer.png)

**Look**: `#F7F7F4` warm paper, `#17191C` text, `#2C4CD0` ink-blue accent, `#E3E3DC` borders; Newsreader serif display, Atkinson Hyperlegible body, 10px radii; narrative sections + hand-drawn mechanism diagrams + waffle/bars.

**Use for**: explainers, retrospectives, review pages, recaps, slide pages; technical content that needs a narrative.

**Avoid**: compliance/audit, strict data tables, high-density dashboards.

**Closest current preset**: `openai + paper` for the restrained layout and serif captions; borrow `tech`'s blue accent. No preset keeps a warm paper ground.

## Mapping

| Old template | Closest preset | tone | Main difference |
| --- | --- | --- | --- |
| `editorial` | `openai` | `neutral` | Old is paper/ink/blue + 4px grid; `openai` is white/ink/mint + hairline borders |
| `editorial` (layer bands) | `excalidraw` | `neutral` | Old is paper with hand-drawn SVG; `excalidraw` is white with rough ink strokes and pastel fills |
| `visual-explainer` (paper) | `openai` | `paper` | Old is a warm paper ground with Newsreader display; `openai` is white and serif comes only from the tone |
| `visual-explainer` (blue) | `tech` | `neutral` | Old uses one ink-blue; `tech` uses blue/amber/green as shape semantics |

## Reproduce

Original hand-drawn HTML (sources live in `tests/`; use these to regenerate the samples with the current binary):

```bash
mmdx tests/editorial-showcase/layer-stack.html -o out/editorial.png --scale 3
mmdx tests/explain-e2e/cache-read-path.html -o out/explain.png --scale 3
```

Fence-theme approximation of the same look:

```bash
mmdx card --in note.md -t openai --tone paper -o out/editorial-like.png
mmdx card --in note.md -t openai --tone neutral -o out/explainer-like.png
```

[Back to gallery](../GALLERY.en.md) · [Two HTML scenarios](html-skills.en.md)
