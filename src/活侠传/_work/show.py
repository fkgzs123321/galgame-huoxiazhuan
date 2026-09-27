# -*- coding: utf-8 -*-
"""按关键字打印某个 dump 文件的完整内容（分段、带行号），避免整文件塞进上下文。"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
name = sys.argv[1]
start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
end = int(sys.argv[3]) if len(sys.argv) > 3 else 200

cands = [f for f in os.listdir(D) if name in f and "__zh" in f]
print("匹配文件: %s" % cands)
for c in cands:
    p = os.path.join(D, c)
    raw = open(p, encoding="utf-8", errors="ignore").read()
    raw = re.sub(r"\n{2,}", "\n", raw)
    lines = raw.split("\n")
    print("=" * 78)
    print("### %s   (%d 行)" % (c, len(lines)))
    print("=" * 78)
    for i, ln in enumerate(lines[start - 1:end], start):
        print("%5d| %s" % (i, ln))
