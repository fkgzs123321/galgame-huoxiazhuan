# -*- coding: utf-8 -*-
"""追踪每月例会的入口链（meeting_*）。"""
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

for kw in ["meeting_start_01", "meeting_01", "meeting_option_01",
           'contribution", -50', 'contribution", -30', "S9903_01"]:
    print("=" * 26, kw)
    n = 0
    for p in sorted(files):
        b = os.path.basename(p)
        if b.endswith("__zh__2.txt"):
            continue
        t = open(p, encoding="utf-8", errors="ignore").read()
        for m in re.finditer(re.escape(kw), t):
            n += 1
            if n <= 4:
                s, e = max(0, m.start() - 230), min(len(t), m.end() + 170)
                print("  [%s] %s" % (b.replace(".txt", "")[:46], re.sub(r"\s+", " ", t[s:e])[:360]))
    print("   %s 总计 %d" % (kw, n))
    print()
