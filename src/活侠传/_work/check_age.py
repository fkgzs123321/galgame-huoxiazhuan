# -*- coding: utf-8 -*-
"""核查原作女角的年龄线索：只输出命中原文，不做推断。"""
import os
import re
import sys
import glob

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump")
files = glob.glob(os.path.join(D, "*.txt"))
print("扫描文件数:", len(files))

NAMES = ["叶云裳", "龍湘", "龙湘", "虞小梅", "夏侯兰", "魏菊", "郁竹", "上官萤", "唐默铃"]
# 年龄/婚龄相关线索词
AGE = r"(岁|歲|年幼|还小|還小|尚小|年方|及笄|未成年|闺女|閨女|小姑娘|小丫头|丫头|年长|年長|几岁|幾歲|比.*小|比你小)"

cache = {}
def load(p):
    if p not in cache:
        try:
            cache[p] = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            cache[p] = ""
    return cache[p]

for name in NAMES:
    print("\n" + "=" * 70)
    print("=== %s ===" % name)
    found = 0
    for p in files:
        t = load(p)
        if name not in t:
            continue
        for m in re.finditer(re.escape(name), t):
            s = max(0, m.start() - 45)
            e = min(len(t), m.end() + 60)
            seg = t[s:e].replace("\n", " ").replace("\\n", " ")
            if re.search(AGE, seg):
                print("  [%s] %s" % (os.path.basename(p), seg.strip()))
                found += 1
                if found >= 8:
                    break
        if found >= 8:
            break
    if not found:
        print("  (未找到直接年龄线索)")
