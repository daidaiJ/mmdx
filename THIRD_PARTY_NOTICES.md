# Third-party notices / 第三方组件与来源

mmdx itself is released under the MIT License (see [LICENSE](LICENSE)). It bundles or
depends on the components below. Full license texts are kept in [`licenses/`](licenses/).

发布二进制或压缩包时，必须同时附带本文件和 `licenses/` 目录。组件版本以 `package.json`
与 `package-lock.json` 为准；升级依赖后同步更新此表。

## Bundled runtime assets

| Component | Version | License | Source | How it is used |
| --- | --- | --- | --- | --- |
| Pele | 1.9.0 | MIT | https://github.com/obsidianmd/pele | `vendor/pele.global.js`; the only Mermaid-syntax→SVG engine |
| rough.js | 4.6.6 | MIT | https://github.com/rough-stuff/rough | `vendor/rough.js`; hand-drawn stroke post-processing |
| svgo | 4.1.0 | MIT | https://github.com/svg/svgo | Browser build; SVG minification |
| Noto Sans SC (subset) | — | OFL-1.1 | https://github.com/notofonts/noto-cjk | `assets/fonts/NotoSansSC-Subset.woff2`; bundled CJK font |
| Noto Serif SC (subset) | — | OFL-1.1 | https://github.com/notofonts/noto-cjk | `assets/fonts/NotoSerifSC-Subset.woff2`; serif-stack CJK for authored HTML |
| LXGW WenKai (subset) | — | OFL-1.1 | https://github.com/lxgw/LxgwWenKai | `assets/fonts/LXGWWenKai-Subset.woff2`; kai CJK for `excalidraw` and authored HTML |
| Excalifont (subset) | — | OFL-1.1 | https://github.com/excalidraw/excalidraw (`packages/excalidraw/fonts/Excalifont`) | `assets/fonts/Excalifont-0.woff2`, `-1.woff2`; hand-drawn latin for `excalidraw`. Upstream ships per-script chunks; the two latin chunks ship here with their `unicode-range` |
| ZCOOL KuaiLe (subset) | — | OFL-1.1 | https://github.com/googlefonts/zcool-kuaile | `assets/fonts/ZCOOLKuaiLe-Subset.woff2`; rounded CJK for `acnh` |
| Baloo 2 (subset) | — | OFL-1.1 | https://github.com/EkType/Baloo2 | `assets/fonts/Baloo2-Subset.woff2`; rounded latin for `acnh` |
| Newsreader (subset) | — | OFL-1.1 | https://github.com/productiontype/Newsreader | `assets/fonts/Newsreader-Subset.woff2`; serif for `epaper` block pages |
| JetBrains Mono (subset) | — | OFL-1.1 | https://github.com/JetBrains/JetBrainsMono | `assets/fonts/JetBrainsMono-Subset.woff2`; monospace for code, kickers and footers on block pages |

All eight font files are subsets of the upstream families (or, for Excalifont, upstream
chunks), redistributed under the SIL Open Font License 1.1; `scripts/subset-font.py`
records the coverage contract and the download URLs. License texts ship next to them:
`assets/fonts/OFL-notoserifsc.txt`, `OFL-lxgwwenkai.txt`, `OFL-excalifont.txt`,
`OFL-zcoolkuaile.txt`, `OFL-baloo2.txt`, `OFL-newsreader.txt`, `OFL-jetbrainsmono.txt`,
and the sans subset under [`licenses/NotoSansSC-OFL.txt`](licenses/NotoSansSC-OFL.txt).
Copyright remains with the upstream projects as stated in the font metadata.

## Runtime dependencies

| Component | Version | License | Source | How it is used |
| --- | --- | --- | --- | --- |
| puppeteer-core | 25.10.0 | Apache-2.0 | https://github.com/puppeteer/puppeteer | Drives the system Edge/Chrome; copyright The Chromium Authors |
| pngjs | 7.0.0 | MIT | https://github.com/pngjs/pngjs | PNG decode and ink-bbox analysis |

## Transitive dependencies (runtime)

Generated from `package-lock.json` / `bun.lock` against the installed tree; 51 packages,
none of them dev-only. The compiled binary bundles them, so their licenses ship with it.

| Package | Version | License |
| --- | --- | --- |
| `@puppeteer/browsers` | 3.2.2 | Apache-2.0 |
| `ansi-regex` | 6.3.0 | MIT |
| `ansi-styles` | 6.2.3 | MIT |
| `boolbase` | 1.0.0 | ISC |
| `chromium-bidi` | 17.0.2 | Apache-2.0 |
| `cliui` | 9.0.1 | ISC |
| `cliui/node_modules/string-width` | 7.2.0 | MIT |
| `css-select` | 6.0.0 | BSD-2-Clause |
| `css-tree` | 3.2.1 | MIT |
| `css-what` | 7.0.0 | BSD-2-Clause |
| `csso` | 5.0.5 | MIT |
| `csso/node_modules/css-tree` | 2.2.1 | MIT |
| `csso/node_modules/mdn-data` | 2.0.28 | CC0-1.0 |
| `devtools-protocol` | 0.0.1666840 | BSD-3-Clause |
| `dom-serializer` | 2.0.0 | MIT |
| `domelementtype` | 2.3.0 | BSD-2-Clause |
| `domhandler` | 5.0.3 | BSD-2-Clause |
| `domutils` | 3.2.2 | BSD-2-Clause |
| `emoji-regex` | 10.6.0 | MIT |
| `entities` | 4.5.0 | BSD-2-Clause |
| `escalade` | 3.2.0 | MIT |
| `get-caller-file` | 2.0.5 | ISC |
| `get-east-asian-width` | 1.6.0 | MIT |
| `hachure-fill` | 0.5.2 | MIT |
| `mdn-data` | 2.27.1 | CC0-1.0 |
| `mitt` | 3.0.1 | MIT |
| `modern-tar` | 0.8.4 | MIT |
| `nth-check` | 2.1.1 | BSD-2-Clause |
| `path-data-parser` | 0.1.0 | MIT |
| `pele` | 1.9.0 | MIT |
| `picocolors` | 1.1.1 | ISC |
| `pngjs` | 7.0.0 | MIT |
| `points-on-curve` | 0.2.0 | MIT |
| `points-on-path` | 0.2.1 | MIT |
| `puppeteer-core` | 25.10.0 | Apache-2.0 |
| `roughjs` | 4.6.6 | MIT |
| `sax` | 1.6.1 | BlueOak-1.0.0 |
| `source-map-js` | 1.2.1 | BSD-3-Clause |
| `string-width` | 8.2.2 | MIT |
| `strip-ansi` | 7.2.0 | MIT |
| `svgo` | 4.1.0 | MIT |
| `svgo/node_modules/commander` | 11.1.0 | MIT |
| `typed-query-selector` | 2.12.2 | MIT |
| `webdriver-bidi-protocol` | 0.4.3 | Apache-2.0 |
| `wrap-ansi` | 9.0.2 | MIT |
| `wrap-ansi/node_modules/string-width` | 7.2.0 | MIT |
| `ws` | 8.21.3 | MIT |
| `y18n` | 5.0.8 | ISC |
| `yargs` | 18.1.0 | MIT |
| `yargs-parser` | 22.0.0 | ISC |
| `zod` | 3.25.76 | MIT |

License texts for the families that appear here: [`licenses/ISC.txt`](licenses/ISC.txt),
[`licenses/BSD-2-Clause.txt`](licenses/BSD-2-Clause.txt),
[`licenses/BSD-3-Clause.txt`](licenses/BSD-3-Clause.txt),
[`licenses/CC0-1.0.txt`](licenses/CC0-1.0.txt),
[`licenses/BlueOak-1.0.0.txt`](licenses/BlueOak-1.0.0.txt), plus MIT and Apache-2.0 above.

## Design references

These projects informed theme tokens or layout; no source code is copied unless noted.

| Project | License | Source | Use |
| --- | --- | --- | --- |
| Open Design | Apache-2.0 | https://github.com/nexu-io/open-design | Token and layout reference for the editorial and office presets that were evaluated and later dropped; nothing from it ships |
| Excalidraw | MIT | https://github.com/excalidraw/excalidraw | Palette and whiteboard-card reference for `excalidraw`; strokes are drawn by rough.js |

Brand names and design systems remain the property of their owners. The
`excalidraw` preset is an independent palette and layout implementation; it
ships no proprietary brand fonts or logos.

## License texts

- [`licenses/pele-MIT.txt`](licenses/pele-MIT.txt)
- [`licenses/roughjs-MIT.txt`](licenses/roughjs-MIT.txt)
- [`licenses/pngjs-MIT.txt`](licenses/pngjs-MIT.txt)
- [`licenses/svgo-MIT.txt`](licenses/svgo-MIT.txt)
- [`licenses/Apache-2.0.txt`](licenses/Apache-2.0.txt)
- [`licenses/NotoSansSC-OFL.txt`](licenses/NotoSansSC-OFL.txt)
- [`licenses/OFL-1.1.txt`](licenses/OFL-1.1.txt)
- [`licenses/ISC.txt`](licenses/ISC.txt)
- [`licenses/BSD-2-Clause.txt`](licenses/BSD-2-Clause.txt)
- [`licenses/BSD-3-Clause.txt`](licenses/BSD-3-Clause.txt)
- [`licenses/CC0-1.0.txt`](licenses/CC0-1.0.txt)
- [`licenses/BlueOak-1.0.0.txt`](licenses/BlueOak-1.0.0.txt)


## Release checklist

- [x] Direct bundled/runtime components listed with version, license, and source.
- [x] Apache-2.0 and OFL-1.1 texts included.
- [x] Regenerated the transitive dependency list from the lockfile (51 runtime packages,
      reconciled against the installed tree on 2026-10-31).
- [x] `THIRD_PARTY_NOTICES.md`, `licenses/` and `assets/fonts/OFL-*.txt` are copied into
      both release archives by `.github/workflows/release.yml`.
- [ ] Verify the license of any future scenario template or design system before
      importing its code or assets.
