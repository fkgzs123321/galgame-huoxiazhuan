# -*- coding: utf-8 -*-
"""核查原作女角年龄：只报命中原文，不做推断。

教训：上一版把「小姑娘」「小丫头」当年龄证据，被用户纠正——这类词在中文里
本就常称呼成年年轻女性。本版只认**明确年龄表述**（数字+岁、及笄、豆蔻、
年方、破瓜、待字、及冠、弱冠、成年），以及显式数字。
"""
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump")
files = sorted(glob.glob(os.path.join(D, "*.txt")))
print("扫描 %d 个文件\n" % len(files))

GIRLS = {
    "瑞杏": "girl1",
    "叶云裳": "girl2", "葉雲裳": "girl2", "云裳": "girl2", "雲裳": "girl2",
    "夏玉莲": "girl3", "夏玉蓮": "girl3",
    "龙湘": "girl4", "龍湘": "girl4",
    "虞小梅": "girl5",
    "夏侯兰": "girl6", "夏侯蘭": "girl6",
    "郁竹": "girl7",
    "魏菊": "girl8",
    "上官萤": "girl9", "上官螢": "girl9",
    "唐默铃": "sister1", "唐默鈴": "sister1", "默铃": "sister1", "默鈴": "sister1",
}

# 只认明确年龄表述
AGE = re.compile(
    r"(岁|歲|芳龄|芳齡|年方|及笄|豆蔻|破瓜|待字|及冠|弱冠|成年|二八|年已|年约|年約|年纪|年紀"
    r"|[一二三四五六七八九十百]{1,3}\s*(岁|歲))"
)

cache = {}


def load(p):
    if p not in cache:
        try:
            cache[p] = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            cache[p] = ""
    return cache[p]


seen = set()
for name, code in GIRLS.items():
    print("=" * 74)
    print("=== %s (%s) ===" % (name, code))
    hits = 0
    for p in files:
        t = load(p)
        if name not in t:
            continue
        for m in re.finditer(re.escape(name), t):
            s = max(0, m.start() - 60)
            e = min(len(t), m.end() + 80)
            seg = t[s:e].replace("\n", " ").replace("\\n", " ")
            if not AGE.search(seg):
                continue
            k = re.sub(r"\s+", "", seg)[:90]
            if k in seen:
                continue
            seen.add(k)
            fn = os.path.basename(p).replace("textasset_", "").replace(".txt", "")
            print("  [%-28s] %s" % (fn, seg.strip()))
            hits += 1
            if hits >= 15:
                break
        if hits >= 15:
            break
    if hits == 0:
        print("  (无明确年龄表述)")
