# -*- coding: utf-8 -*-
"""统计游戏文本中所有「汉字数字+歲」与「阿拉伯数字+歲」的出现, 输出去重后的上下文。"""
import os
import re
import sys
import glob

sys.stdout.reconfigure(encoding="utf-8")
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump")

files = sorted(glob.glob(os.path.join(D, "*.txt")))
files = [f for f in files if not re.search(r"_kr\.txt$", os.path.basename(f))]

# 只保留繁体 歲(游戏正文是繁体)
PAT = re.compile(r"[一二三四五六七八九十百兩０-９0-9]{1,4}\s*歲")
seen = {}
for p in files:
    try:
        t = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for m in PAT.finditer(t):
        s = max(0, m.start() - 70)
        e = min(len(t), m.end() + 45)
        seg = re.sub(r"\s+", " ", t[s:e].replace("\n", " ").replace("\r", " "))
        key = (m.group(0), seg)
        if key in seen:
            continue
        seen[key] = os.path.basename(p)

print("唯一命中 %d 条\n" % len(seen))
for (num, seg), fn in sorted(seen.items(), key=lambda x: x[0][1]):
    print("[%s] %s" % (fn, seg))
    print()
