# Subset the bundled CJK fonts to GB2312 hanzi + latin + CJK punctuation, emit woff2.
# Sources (download to assets/fonts/ first when regenerating; sans VF is tracked,
# serif/kai are 25MB each so only subsets + OFL live in the repo):
#   sans:  assets/fonts/NotoSansSC-VF.ttf (tracked)
#   serif: https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/Variable/TTF/Subset/NotoSerifSC-VF.ttf
#   kai:   https://github.com/lxgw/LxgwWenKai/releases (LXGWWenKai-Regular.ttf)
from fontTools.subset import main as ss_main
import sys

ARGS = [
    "subset",
    "--flavor=woff2",
    "--layout-features=*",
    "--unicodes=U+0020-00FF,U+2000-206F,U+3000-303F,U+FF00-FFEF,U+2E80-2EFF,U+2460-24FF,U+25A0-25FF,U+2700-27BF",
    "--text=" + open("scripts/gb2312-chars.txt", encoding="utf-8").read().replace("\n", ""),
    "--drop-tables+=DSIG",
]
for src, out in [
    ("assets/fonts/NotoSansSC-VF.ttf", "assets/fonts/NotoSansSC-Subset.woff2"),
    ("assets/fonts/NotoSerifSC-VF.ttf", "assets/fonts/NotoSerifSC-Subset.woff2"),
    ("assets/fonts/LXGWWenKai-Regular.ttf", "assets/fonts/LXGWWenKai-Subset.woff2"),
]:
    sys.argv = ["subset", src, f"--output-file={out}", *ARGS]
    ss_main()
    print("done", out)

