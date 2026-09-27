# -*- coding: utf-8 -*-
"""菜单串格式、~ 哨兵变体、Lover/TalkCount 计数机制、DayNight 用法。"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

RE_MENU = re.compile(r'"([A-Za-z_]+)\+([^"+\n]{1,40})\+(-?\d+)\+(-?\d+)"')
RE_TILDE = re.compile(r'"~(O_[A-Za-z0-9_]+|x|X)"')
pref = Counter()
c3 = Counter()
c4 = Counter()
tilde = Counter()

for p in files:
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in RE_MENU.finditer(t):
        pref[m.group(1)] += 1
        c3[m.group(3)] += 1
        c4[m.group(4)] += 1
    for m in RE_TILDE.finditer(t):
        tilde[m.group(1)[:1] if m.group(1) in ("x", "X") else "O_*"] += 1

print("=== 菜单串第1段（图标/动作类型）分布 top 30 ===")
for k, v in pref.most_common(30):
    print("   %-16s %5d" % (k, v))
print()
print("=== 菜单串第3段（消耗行动）分布 ===")
for k, v in c3.most_common():
    print("   %-6s %5d" % (k, v))
print()
print("=== 菜单串第4段（消耗贡献/门槛）分布 top 15 ===")
for k, v in c4.most_common(15):
    print("   %-6s %5d" % (k, v))
print()
print("=== ~ 哨兵变体统计 ===")
for k, v in tilde.most_common():
    print("   %-10s %5d" % (k, v))
print()
print("=== ~O_* 全部出现 ===")
RE_T2 = re.compile(r'"~(O_[A-Za-z0-9_]+)"')
s = Counter()
for p in files:
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in RE_T2.finditer(t):
        s[m.group(1)] += 1
for k, v in s.most_common(40):
    print("   %-46s %d" % (k, v))
print()
print("=== talk_girl5_check（Talk_Count 计数机制）===")
for p in sorted(files):
    if "talk_girl5_check" in os.path.basename(p):
        print(open(p, encoding="utf-8", errors="ignore").read())
