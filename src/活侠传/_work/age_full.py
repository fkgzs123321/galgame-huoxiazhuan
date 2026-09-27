# -*- coding: utf-8 -*-
"""在完整转储(_dump2, 仅中文)中枚举全部年龄表述, 去重后输出。"""
import os
import re
import sys
import glob

sys.stdout.reconfigure(encoding="utf-8")
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")

PATS = [
    r"[一二三四五六七八九十百兩0-9]{1,4}\s*歲",
    r"年方[一二三四五六七八九十百0-9]{1,4}",
    r"芳齡[一二三四五六七八九十0-9]{0,4}",
    r"妙齡",
    r"及笄",
    r"二八(年華)?",
    r"弱冠",
    r"而立",
    r"不惑",
    r"花甲",
    r"適婚",
    r"待嫁",
    r"婚齡",
]
BIG = re.compile("|".join("(%s)" % p for p in PATS))

files = [f for f in sorted(glob.glob(os.path.join(D, "*.txt")))
         if "__kr__" not in os.path.basename(f)]

# 同一句只保留一次: 用 (匹配词, 归一化上下文) 去重
seen = {}
for p in files:
    try:
        t = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for m in BIG.finditer(t):
        s, e = max(0, m.start() - 85), min(len(t), m.end() + 60)
        seg = re.sub(r"\s+", " ", t[s:e].replace("\n", " ").replace("\r", " "))
        # 归一化: 去掉繁简差异影响不大, 这里只按文本去重
        key = seg
        if key in seen:
            continue
        seen[key] = (os.path.basename(p), m.group(0))

print("唯一命中 %d 条\n" % len(seen))
for seg, (fn, kw) in seen.items():
    print("[%s] <%s> %s" % (fn, kw.strip(), seg))
    print()
