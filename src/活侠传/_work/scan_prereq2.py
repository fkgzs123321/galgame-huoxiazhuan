# -*- coding: utf-8 -*-
"""逆向原作的「前置 / 错过」闭环：Condition(读) <-> Switch(写)。"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

reads = Counter()
writes = Counter()
hints = Counter()
dice = Counter()
sw_examples = []
hint_examples = []

for p in files:
    t = open(p, encoding="utf-8", errors="ignore").read()
    fn = os.path.basename(p).replace(".txt", "")
    for m in re.finditer(r'checkpointmanager\.Condition\(\s*"([^"]+)"', t):
        reads[m.group(1)] += 1
    for m in re.finditer(r'checkpointmanager\.Switch\(\s*"([^"]+)"([^)]{0,40})\)', t):
        writes[m.group(1)] += 1
        if len(sw_examples) < 10:
            s, e = max(0, m.start() - 40), min(len(t), m.end() + 60)
            sw_examples.append((fn, re.sub(r"\s+", " ", t[s:e]).strip()))
    for m in re.finditer(r'"~解锁条件[:：]?([^"]{1,40})"', t):
        hints[m.group(1).strip()] += 1
    for m in re.finditer(r'checkpointmanager\.Dice\(\s*"([^"]+)"', t):
        dice[m.group(1)] += 1

print("=" * 72)
print("【读】Condition  唯一 %d / 总 %d" % (len(reads), sum(reads.values())))
print("【写】Switch     唯一 %d / 总 %d" % (len(writes), sum(writes.values())))
print("【骰】Dice       唯一 %d / 总 %d" % (len(dice), sum(dice.values())))
print("【提示】解锁条件 唯一 %d / 总 %d" % (len(hints), sum(hints.values())))
print()

key = set(reads) & set(writes)
print("★ 既被读又被写的 flag：%d 个（闭环）" % len(key))
print("★ 只被读（写端可能是 Switch 之外的入口）：%d 个" % len(set(reads) - set(writes)))
print()

print("=== Switch 写入样例 ===")
for fn, s in sw_examples:
    print("  [%s]\n     %s" % (fn[:46], s))
print()
print("=== 解锁条件提示（玩家可见）top 30 ===")
for k, v in hints.most_common(30):
    print("  %-38s %d" % (k[:38], v))
print()
print("=== Dice 判定项 top 15 ===")
for k, v in dice.most_common(15):
    print("  %-38s %d" % (k[:38], v))
print()
print("=== 读写交集样例 top 20 ===")
for k in sorted(key)[:20]:
    print("  %-46s 读%d 写%d" % (k, reads[k], writes[k]))
