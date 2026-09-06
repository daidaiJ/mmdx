> English · [中文](CHANGELOG.md)

# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned per [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09

First stable release.

### Theme system (tech default theme, official entry points first)

- Colors organized along mermaid's official three-layer entries: **full themeVariables surface** (core derivation chain primaryColor/secondary/tertiary/mainBkg/nodeBkg + per-diagram variables) → per-diagram config sections (c4/journey/radar/xyChart…) → themeCSS only for what official variables can't express (corner radius, shape coding, a few structural fixes)
- Data-class diagrams use the **AntV G2 categorical palette** (pie/xychart/treemap/radar) — modern report look
- Node `look: 'neo'`: rounded corners + soft gradients + shadows; flowcharts keep shape coding (blue = process, amber = decision, green = state, purple = storage)
- All 20 mermaid diagram types covered + pixel-level theme census script (`scripts/theme-census.ts`) as a regression guard

### Render pipeline

- Bundled Noto Sans SC font subset (GB2312 + latin, 1.9 MB woff2) for machine-consistent Chinese rendering
- ELK layout engine lazily loaded (flowchart/graph only); dagre for the rest
- Lossless 2x PNG + pixel-level padding crop (symmetric margins by construction); SVG minified by svgo (official browser build embedded in the binary)
- Serialized concurrent screenshots + adaptive viewport, 60s render-timeout circuit breaker + per-diagram retry

### Extension blocks

- ```table / ```list / ```card (convention syntax: `emoji | title | description`) rendered as styled PNG

### Agent friendly

- `--json` machine-readable output, `--profile` stage timings, `--theme-js`/`--config`/`--css` theme customization, `--icon` icon packs
- Per-diagram failure isolation — the batch never aborts; bundled agent skill (trigger words, picking table, self-check loop)

### Artifacts

- `mmdx-windows-x64.exe` — windows x64 single file (no Node; needs system Edge/Chrome)

[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
