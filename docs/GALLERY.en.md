> English · [中文](GALLERY.md)

# Style gallery

One case, split into one page per style. The overview keeps a single flowchart for a quick comparison; each new theme adds a page with the same structure instead of growing this page.

[![The same case as a flowchart in nine themes](gallery/overview.png)](gallery/overview.png)

## All 9 themes

One flow per built-in theme; use this for the overall comparison, then open the style pages for block layouts:

[![All 9 built-in themes](gallery/all-themes-overview.png)](gallery/all-themes-overview.png)

## Scenario guide (statechart)

The change of situation in an incident or an approval, drawn as a statechart with risky states marked. One chart, two looks: ruled paper stock (`--tone paper`) and the iOS system interface (`-t ios`).

| Ruled paper | iOS system interface |
| --- | --- |
| [![Scenario guide · paper](gallery/scenario-paper.png)](gallery/scenario.en.md) | [![Scenario guide · iOS](gallery/scenario-ios.png)](gallery/scenario.en.md) |

Rules and commands: [Scenario guide](gallery/scenario.en.md); source: [examples/gallery/scenario.md](../examples/gallery/scenario.md).

## HTML scenario templates

The two imported HTML scenarios now have cross-style galleries: the report card (OpenAI editorial skill) and the info card (qiaomu info-card skill).

| Report card (3 themes) | Info card (standalone skill) |
| --- | --- |
| [![openai report](gallery/html-report-openai.png)](gallery/html-skills.en.md) | [![paper info card](gallery/card-tone-paper.png)](gallery/card-tones.en.md) |

Full comparison: [Two HTML scenario templates](gallery/html-skills.en.md).

## Hand-drawn HTML templates (v1.4.2)

The previous tag used the `editorial` and `visual-explainer` hand-drawn HTML skills. They are not v2 theme presets; see [hand-drawn HTML templates](gallery/vendored-html.en.md) for the originals and the closest current presets.

| editorial | visual-explainer |
| --- | --- |
| [![editorial](gallery/vendored-editorial.png)](gallery/vendored-html.en.md) | [![visual-explainer](gallery/vendored-visual-explainer.png)](gallery/vendored-html.en.md) |

## The case

“Gray release retrospective”: the workflow, metrics, operating rules, and follow-ups after one deployment. It combines a flowchart, a pie (` ```chart ` fence) and three office blocks and stays industry-neutral, so the comparison is about layout and palette.

Source: [examples/gallery/release-review.md](../examples/gallery/release-review.md). The overview uses a compact top-down version so labels stay readable at README width; the style pages show the full flowchart, the pie and all three blocks. The flowchart uses all four shape families (stadium / rect / diamond / cylinder) and the pie uses the full series palette, so one style page shows both the shape coding and the chart colours.

## Style index

Pick the scenario from the “Use it for” column, then check the look. `tone` applies to block pages and info cards only.

| Style | Use it for | Look | Full comparison |
| --- | --- | --- | --- |
| `tech` (default) | Design docs, weekly reports, general delivery | Blue / amber / green shape coding, 1.5px strokes, highest density | [tech](gallery/tech.en.md) |
| `openai` | External reports, engineering docs, minimal READMEs | White, ink, mint accent, hairline borders; shapes differ only by thin borders | [openai](gallery/openai.en.md) |
| `excalidraw` | Whiteboard sessions, brainstorming, informal sharing | Pastel fills with rough ink strokes, whiteboard cards, Kai fallback for Chinese | [excalidraw](gallery/excalidraw.en.md) |
| `ios` | Product UI, iOS app docs, anything that should read as a system screenshot | Flat grouped grey page, white cards, hairline separators, system colours; no accent side stripe on cards | [ios](gallery/ios.en.md) |
| `acnh` | Sticker-style weekly updates, team boards, casual reports | Cream paper, thick brown outlines, hard offset sticker shadows, rounded type; block pages carry a dotted grid | [acnh](gallery/acnh.en.md) |
| `glass` | Glass covers, modern product reviews, anything that wants material depth | Fluent acrylic: pale blue-grey canvas, 24px ruling, a translucent white sheet with grain, 8px panels with a light rim; the ruling shows through the panels | [glass](gallery/glass.en.md) |
| `epaper` | Black-and-white print, e-reader reading, compliance and audit docs | `#F5F1EB` stock with paper grain, hairline black strokes, square corners, no shadow; families differ by grey level and shape | [epaper](gallery/epaper.en.md) |
| `zed` | Dark docs sites, tech talks, terminal-adjacent deliverables | Zed One Dark: `#282C33` canvas, hairlines, no shadow and no texture; families outlined in the syntax colours and filled with the same colour at 15% over the page | [zed](gallery/zed.en.md) |
| `zed-light` | The light half of the Zed pair | One Light: `#FAFAFA` canvas with `#EBEBEC` editor panels and the same rotation rules | [zed-light](gallery/zed-light.en.md) |
| Scenario guide (statechart) | Incident retros, approvals, releases: how the situation changes | States named for what the reader sees, risky states marked; ruled paper or iOS backdrop | [scenario](gallery/scenario.en.md) |
| HTML report card / info card | The two imported HTML scenarios across themes | Same content; theme and `--tone` control palette and structure | [html-skills](gallery/html-skills.en.md) |
| Hand-drawn HTML (v1.4.2) | editorial covers/illustrations; visual-explainer explainers/recaps | Hand-written HTML + SVG, paper/ink/blue; not a theme preset | [vendored-html](gallery/vendored-html.en.md) |

All nine themes consume the same Markdown: same diagram, same `kpi` / `card` / `table` / `chart` fences, only `-t` changes. `--brand` overrides the accent; the theme keeps its shape coding.

The two HTML scenarios are compared in [html-skills](gallery/html-skills.en.md); the three info-card tones are in [card tones](gallery/card-tones.en.md).

The overview shows every built-in theme. A new theme adds a page, an index row and a tile.

## Reproduce

```bash
node --experimental-transform-types --no-warnings scripts/make-gallery.ts
```

The script writes the per-theme scene pages, the report card and info card, 3 info-card tones, the `--tone paper` block report (`tone-paper-report.png`), both scenario renders (ruled paper / iOS system interface) and both overview strips. `vendored-*.png` are the original v1.4.2 hand-drawn HTML samples; regenerate them from the `tests/` sources with `mmdx tests/editorial-showcase/layer-stack.html --scale 3` and the equivalent.

Render one scene yourself:

```bash
mmdx examples/gallery/release-review.md -t openai -o out/
mmdx examples/gallery/release-review.md -t excalidraw --style-fill hachure -o out/
```

## Related

- [Theming](HUMAN_GUIDE.en.md#theming)
- [Extension blocks](EXTENSIONS.en.md)
- [Style port decisions and implementation notes](STYLE_PORTS.md)
