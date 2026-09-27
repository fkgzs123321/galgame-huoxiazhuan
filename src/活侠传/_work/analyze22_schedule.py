# -*- coding: utf-8 -*-
"""最后一批：日程/例会/评点 触发、心相阈值交叉验证、`X` 与 `x` 哨兵差异。"""
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

for kw in ["段考", "例會", "例会", "評點", "评点", "考試", "考试", "月旦", "例會", "Meeting_Start"]:
    print("=" * 24, kw)
    n = 0
    for p in sorted(files):
        b = os.path.basename(p)
        t = open(p, encoding="utf-8", errors="ignore").read()
        for m in re.finditer(re.escape(kw), t):
            n += 1
            if n <= 3:
                s, e = max(0, m.start() - 150), min(len(t), m.end() + 150)
                print("  [%s] %s" % (b.replace(".txt", "")[:44], re.sub(r"\s+", " ", t[s:e])[:300]))
    print("  %s 总计 %d" % (kw, n))
print()
print("=== meeting_start_01 全文 ===")
for p in sorted(files):
    if "meeting_start_01__zh__1" in os.path.basename(p) or "meeting_01__zh__1" in os.path.basename(p):
        raw = re.sub(r"\n{2,}", "\n", open(p, encoding="utf-8", errors="ignore").read())
        print("### " + os.path.basename(p))
        for i, l in enumerate(raw.split("\n")[:70], 1):
            print("%4d| %s" % (i, l))
        print()
print("=== S_Mental_GE_65 全部用法（含 back_free_001）===")
n = 0
for p in sorted(files):
    b = os.path.basename(p)
    if b.endswith("__zh__2.txt"):
        continue
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in re.finditer(r"S_Mental_GE_65", t):
        n += 1
        if n <= 4:
            s, e = max(0, m.start() - 220), min(len(t), m.end() + 260)
            print("  [%s]" % b.replace(".txt", "")[:46])
            print(re.sub(r"\n+", "\n", t[s:e]))
            print("  ---")
print("  S_Mental_GE_65 总计 %d" % n)
