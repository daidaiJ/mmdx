# Third-party notices / 第三方组件与来源

mmdx itself is released under the MIT License (see [LICENSE](LICENSE)). It bundles or
depends on the components below. Full license texts are kept in [`licenses/`](licenses/).

发布二进制或压缩包时，必须同时附带本文件和 `licenses/` 目录。组件版本以 `package.json`
与 `package-lock.json` 为准；升级依赖后同步更新此表。

## Bundled runtime assets

| Component | Version | License | Source | How it is used |
| --- | --- | --- | --- | --- |
| Pele | 1.9.0 | MIT | https://github.com/obsidianmd/pele | `vendor/pele.global.js`; default Mermaid→SVG engine |
| Mermaid | 11.17.2 | MIT | https://github.com/mermaid-js/mermaid | `vendor/mermaid.min.js`; `--engine mermaid` fallback |
| @mermaid-js/layout-elk | 0.2.3 | MIT | https://github.com/mermaid-js/mermaid-layout-elk | ELK layout entry, compiled into `vendor/elk.bundle.mjs` |
| elkjs | 0.9.3 | EPL-2.0 | https://github.com/kieler/elkjs | ELK layout runtime inside `vendor/elk.bundle.mjs` |
| rough.js | 4.6.6 | MIT | https://github.com/rough-stuff/rough | `vendor/rough.js`; hand-drawn stroke post-processing |
| svgo | 4.1.0 | MIT | https://github.com/svg/svgo | Browser build; SVG minification |
| Noto Sans SC (subset) | — | OFL-1.1 | https://github.com/notofonts/noto-cjk | `assets/fonts/NotoSansSC-Subset.woff2`; bundled CJK font |

`NotoSansSC-Subset.woff2` is a subset of the upstream font. It is redistributed under
the SIL Open Font License 1.1; the license text is in
[`licenses/NotoSansSC-OFL.txt`](licenses/NotoSansSC-OFL.txt). Copyright remains with the
upstream Noto project authors as stated in the font metadata.

## Runtime dependencies

| Component | Version | License | Source | How it is used |
| --- | --- | --- | --- | --- |
| puppeteer-core | 25.10.0 | Apache-2.0 | https://github.com/puppeteer/puppeteer | Drives the system Edge/Chrome; copyright The Chromium Authors |
| pngjs | 7.0.0 | MIT | https://github.com/pngjs/pngjs | PNG decode and ink-bbox analysis |

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
- [`licenses/mermaid-MIT.txt`](licenses/mermaid-MIT.txt)
- [`licenses/layout-elk-MIT.txt`](licenses/layout-elk-MIT.txt)
- [`licenses/elkjs-EPL-2.0.md`](licenses/elkjs-EPL-2.0.md)
- [`licenses/roughjs-MIT.txt`](licenses/roughjs-MIT.txt)
- [`licenses/pngjs-MIT.txt`](licenses/pngjs-MIT.txt)
- [`licenses/svgo-MIT.txt`](licenses/svgo-MIT.txt)
- [`licenses/Apache-2.0.txt`](licenses/Apache-2.0.txt)
- [`licenses/NotoSansSC-OFL.txt`](licenses/NotoSansSC-OFL.txt)
- [`licenses/OFL-1.1.txt`](licenses/OFL-1.1.txt)

## Release checklist

- [x] Direct bundled/runtime components listed with version, license, and source.
- [x] EPL-2.0, Apache-2.0, and OFL-1.1 texts included.
- [ ] Regenerate the transitive dependency list from the lockfile and reconcile it
      before publishing a release archive.
- [ ] Ship `THIRD_PARTY_NOTICES.md` and `licenses/` next to the binary.
- [ ] Verify the license of any future scenario template or design system before
      importing its code or assets.
