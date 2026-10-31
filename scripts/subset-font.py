# Subset the bundled fonts, emit woff2. Two contracts:
#   CJK   — GB2312 hanzi + latin + CJK punctuation (matches the three Noto/LXGW subsets)
#   LATIN — latin-1 + latin-ext + punctuation + arrows/symbols (theme display faces)
# Sources: download to assets/fonts/ before regenerating; only the sans VF and the
# finished subsets are tracked, the rest are 0.5–25MB each:
#   sans:      assets/fonts/NotoSansSC-VF.ttf (tracked)
#   serif:     https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/Variable/TTF/Subset/NotoSerifSC-VF.ttf
#   kai:       https://github.com/lxgw/LxgwWenKai/releases (LXGWWenKai-Regular.ttf)
#   kuaile:    https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf
#   baloo2:    https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/Baloo2[wght].ttf
#   newsreader:https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader[opsz,wght].ttf
#   mono:      https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono[wght].ttf
from fontTools.subset import main as ss_main
import sys

CJK = [
    "--flavor=woff2",
    "--layout-features=*",
    "--unicodes=U+0020-00FF,U+2000-206F,U+3000-303F,U+FF00-FFEF,U+2E80-2EFF,U+2460-24FF,U+25A0-25FF,U+2700-27BF",
    "--text=" + open("scripts/gb2312-chars.txt", encoding="utf-8").read().replace("\n", ""),
    "--drop-tables+=DSIG",
]

LATIN = [
    "--flavor=woff2",
    "--layout-features=*",
    "--unicodes=U+0020-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+0304,U+0308,U+0329,U+2000-206F,U+2070-209F,U+20A0-20BF,U+2100-214F,"
    "U+2190-21BB,U+2200-22FF,U+2460-24FF,U+25A0-25FF,U+2700-27BF,U+FB00-FB06",
    "--drop-tables+=DSIG",
]

import os

for src, out, args in [
    ("assets/fonts/NotoSansSC-VF.ttf", "assets/fonts/NotoSansSC-Subset.woff2", CJK),
    ("assets/fonts/NotoSerifSC-VF.ttf", "assets/fonts/NotoSerifSC-Subset.woff2", CJK),
    ("assets/fonts/LXGWWenKai-Regular.ttf", "assets/fonts/LXGWWenKai-Subset.woff2", CJK),
    ("assets/fonts/ZCOOLKuaiLe-Regular.ttf", "assets/fonts/ZCOOLKuaiLe-Subset.woff2", CJK),
    ("assets/fonts/Baloo2[wght].ttf", "assets/fonts/Baloo2-Subset.woff2", LATIN),
    ("assets/fonts/Newsreader[opsz,wght].ttf", "assets/fonts/Newsreader-Subset.woff2", LATIN),
    ("assets/fonts/JetBrainsMono[wght].ttf", "assets/fonts/JetBrainsMono-Subset.woff2", LATIN),
]:
    sys.argv = ["subset", src, f"--output-file={out}", *args]
    if not os.path.exists(src):
        print("skip (source not downloaded)", src)
        continue
    ss_main()
    print("done", out)
