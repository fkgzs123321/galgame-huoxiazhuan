# -*- coding: utf-8 -*-
"""统计 flag 写入 / 读取全貌：SetFlag、AddFlag、GetStatData→SetFlag、Condition/Switch key 命名。"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

RE_SET = re.compile(r'statmodifymanager\.SetFlag\(\s*"([^"]+)"\s*,\s*(-?\d+|var\d+)\s*\)')
RE_ADD = re.compile(r'statmodifymanager\.AddFlag\(\s*"([^"]+)"\s*,\s*(-?\d+|var\d+)\s*\)')
RE_READ = re.compile(r'checkpointmanager\.(Condition|Switch|Dice|Position)\(\s*"([^"]+)"')
RE_STAT = re.compile(r'statmodifymanager\.Player\(\s*"([^"]+)"\s*,\s*(-?\d+)')
RE_CHAR = re.compile(r'statmodifymanager\.Character\(\s*"([^"]+)"\s*,\s*(-?\d+)\s*,\s*(\d)')
RE_MISSION = re.compile(r'statmodifymanager\.Mission\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)')
RE_ACH = re.compile(r'statmodifymanager\.AddAchievementLib\(\s*"([^"]+)"')
RE_TAL = re.compile(r'statmodifymanager\.AddTalent\(\s*"([^"]+)')
RE_BOOK = re.compile(r'statmodifymanager\.AddBook\(\s*"([^"]+)')
RE_MISC = re.compile(r'statmodifymanager\.AddMisc\(\s*"([^"]+)')
RE_SPEC = re.compile(r'statmodifymanager\.AddSpecial\(\s*"([^"]+)')

setf, addf, readf = Counter(), Counter(), Counter()
stats, chars, missions, achs, tals, books, miscs, specs = (Counter() for _ in range(8))

for p in files:
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in RE_SET.finditer(t):
        setf[m.group(1)] += 1
    for m in RE_ADD.finditer(t):
        addf[m.group(1)] += 1
    for m in RE_READ.finditer(t):
        readf[(m.group(1), m.group(2))] += 1
    for m in RE_STAT.finditer(t):
        stats[m.group(1)] += 1
    for m in RE_CHAR.finditer(t):
        chars[m.group(1)] += 1
    for m in RE_MISSION.finditer(t):
        missions[(m.group(1), m.group(2))] += 1
    for m in RE_ACH.finditer(t):
        achs[m.group(1)] += 1
    for m in RE_TAL.finditer(t):
        tals[m.group(1)] += 1
    for m in RE_BOOK.finditer(t):
        books[m.group(1)] += 1
    for m in RE_MISC.finditer(t):
        miscs[m.group(1)] += 1
    for m in RE_SPEC.finditer(t):
        specs[m.group(1)] += 1

print("SetFlag 唯一 %d / 总 %d" % (len(setf), sum(setf.values())))
print("AddFlag 唯一 %d / 总 %d" % (len(addf), sum(addf.values())))
print("读 flag 唯一 %d / 总 %d" % (len(readf), sum(readf.values())))
print()
print("=== SetFlag 前缀分布 ===")
pref = Counter()
for k, v in setf.items():
    pref[re.match(r"^[A-Za-z]+", k).group(0) if re.match(r"^[A-Za-z]+", k) else "(中文/其他)"] += v
for k, v in pref.most_common(40):
    print("   %-14s %5d" % (k, v))
print()
print("=== SetFlag 样例（每前缀 3 个）===")
seen = Counter()
for k, v in sorted(setf.items()):
    m = re.match(r"^[A-Za-z]+", k)
    pfx = m.group(0) if m else "(中文/其他)"
    if seen[pfx] < 3:
        seen[pfx] += 1
        print("   %-24s x%d" % (k, v))
print()
print("=== 属性被修改的键（Player/Character）===")
for k, v in stats.most_common(60):
    print("   Player  %-24s %5d" % (k, v))
for k, v in chars.most_common(40):
    print("   Char    %-24s %5d" % (k, v))
print()
print("=== Mission 目录 top 30 ===")
for (a, b), v in missions.most_common(30):
    print("   %-14s %-16s %4d" % (a, b, v))
print()
print("Mission 主名唯一: %d" % len(set(a for a, _ in missions)))
print("Achievement 唯一: %d ; Talent: %d ; Book: %d ; Misc: %d ; Special: %d" %
      (len(achs), len(tals), len(books), len(miscs), len(specs)))
