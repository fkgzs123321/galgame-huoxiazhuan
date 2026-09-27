# -*- coding: utf-8 -*-
"""扫描 checkpointmanager 的 key 空间，分析命名规律与比较语义。"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

RE = re.compile(r'checkpointmanager\.(Condition|Switch|Dice|Position)\(\s*"([^"]*)"')
c = Counter()
ex = {}
for p in files:
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in RE.finditer(t):
        k = (m.group(1), m.group(2))
        c[k] += 1
        ex.setdefault(k, os.path.basename(p).replace(".txt", "")[:48])

print("唯一的 (方法,key) 组合数: %d" % len(c))
print("按方法统计: %r" % Counter(m for m, _ in c))

print()
print("=== key 含比较语义 GE/LE/GT/LT/EQ/NE ===")
sel = [(k, v) for k, v in c.items() if re.search(r"_(GE|LE|GT|LT|EQ|NE)_", k[1], re.I)]
print("数量: %d" % len(sel))
for (meth, key), v in sorted(sel, key=lambda x: x[0][1])[:70]:
    print("  %-10s %-48s x%-3d  [%s]" % (meth, key, v, ex[(meth, key)]))

print()
print("=== key 前缀（按 _ 切分第一段）分布 ===")
pref = Counter()
for (meth, key), v in c.items():
    pref[key.split("_")[0]] += 1
for k, v in pref.most_common(40):
    print("  %-28s %3d" % (k, v))

print()
print("=== 全部 Condition key（去重，按字母序）===")
conds = sorted(set(k[1] for k in c if k[0] == "Condition"))
print("Condition 唯一 key 数: %d" % len(conds))
for k in conds:
    print("   %-52s [%s]" % (k, ex[("Condition", k)]))
