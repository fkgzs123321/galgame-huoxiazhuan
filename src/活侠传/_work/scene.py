# -*- coding: utf-8 -*-
"""抽取某个 Story key 附近的完整段落(按 key = value 逐条输出), 便于核对上下文与说话人。"""
import os
import re
import sys
import glob

sys.stdout.reconfigure(encoding="utf-8")
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")

key = sys.argv[1]
BEFORE = int(sys.argv[2]) if len(sys.argv) > 2 else 40
AFTER = int(sys.argv[3]) if len(sys.argv) > 3 else 40
LANG = sys.argv[4] if len(sys.argv) > 4 else "zh"

pat = re.compile(r"([A-Za-z_]*/[A-Za-z0-9_]+)\s*=\s*(.*?)(?=\n\s*[A-Za-z_]*/[A-Za-z0-9_]+\s*=|\Z)", re.S)

for f in sorted(glob.glob(os.path.join(D, "*.txt"))):
    b = os.path.basename(f)
    if "__kr__" in b:
        continue
    t = open(f, encoding="utf-8", errors="ignore").read()
    if key not in t:
        continue
    items = [(m.group(1), m.group(2).strip()) for m in pat.finditer(t)]
    idxs = [i for i, (k, _) in enumerate(items) if key in k]
    if not idxs:
        continue
    print("### 文件: %s  (%d 条文本, 命中 %d)" % (b, len(items), len(idxs)))
    for i in idxs[:3]:
        lo, hi = max(0, i - BEFORE), min(len(items), i + AFTER)
        print("-" * 80)
        for j in range(lo, hi):
            k, v = items[j]
            v = re.sub(r"\s+", " ", v)
            mark = ">>" if j == i else "  "
            print("%s %-34s %s" % (mark, k, v))
        print()
    break
