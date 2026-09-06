# Subset Noto Sans SC to GB2312 hanzi + latin + CJK punctuation, emit woff2
from fontTools.subset import main as ss_main
import sys
sys.argv = [
    "subset",
    "assets/fonts/NotoSansSC-VF.ttf",
    f"--output-file=assets/fonts/NotoSansSC-Subset.woff2",
    "--flavor=woff2",
    "--layout-features=*",
    "--unicodes=U+0020-00FF,U+2000-206F,U+3000-303F,U+FF00-FFEF,U+2E80-2EFF,U+2460-24FF,U+25A0-25FF,U+2700-27BF",
    "--text=" + open("scripts/gb2312-chars.txt", encoding="utf-8").read().replace("\n", ""),
    "--drop-tables+=DSIG",
]
ss_main()
