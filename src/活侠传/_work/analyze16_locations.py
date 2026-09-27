# -*- coding: utf-8 -*-
"""地点行动组织：door_ / back_ / section_ / talk_ / center_ 等前缀的调用关系。"""
import glob
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

# 索引所有脚本名
names = set()
for p in files:
    base = os.path.basename(p).replace(".txt", "")
    # resources__NAME__zh__1  -> NAME
    parts = base.split("__")
    if len(parts) >= 2:
        names.add(parts[1].lower())

print("脚本名总数（去重，含多语言）: %d" % len(names))

RE_NEXT = re.compile(r'luamanager\.SetNextScript\(\s*"([^"]+)"')
RE_POS = re.compile(r'checkpointmanager\.Position\(\s*"([^"]+)"')
RE_TRAVEL = re.compile(r'luamanager\.SetCurrentTravelScript\(\s*"([^"]+)"')
RE_STORY = re.compile(r'luamanager\.SetCurrentStoryScript\(\s*"([^"]+)"')
RE_SCENE = re.compile(r'luamanager\.ChangeScene\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"')

out = defaultdict(set)
pos2script = defaultdict(set)
next_edges = Counter()
scene_edges = Counter()
travel_edges = Counter()

for p in files:
    base = os.path.basename(p).replace(".txt", "")
    src = base.split("__")[1].lower() if len(base.split("__")) > 1 else base
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in RE_NEXT.finditer(t):
        next_edges[(src, m.group(1).lower())] += 1
    for m in RE_POS.finditer(t):
        pos2script[m.group(1)].add(src)
    for m in RE_TRAVEL.finditer(t):
        travel_edges[(src, m.group(1).lower())] += 1
    for m in RE_SCENE.finditer(t):
        scene_edges[(m.group(1), m.group(2), m.group(3))] += 1

print()
print("=== Position(key) -> 出现的脚本 ===")
for k in sorted(pos2script):
    if len(pos2script[k]) <= 6:
        print("  %-26s <- %s" % (k, ", ".join(sorted(pos2script[k])[:6])))

print()
print("=== ChangeScene 目标统计 ===")
sc = Counter()
for (a, b, c), v in scene_edges.items():
    sc[(a, c)] += v
for (a, c), v in sc.most_common(40):
    print("   scene=%-14s next=%-10s x%d" % (a, c or "-", v))

print()
print("=== 地点前缀 -> 出现文件数 ===")
pref = Counter()
for n in names:
    m = re.match(r"^([a-z]+)", n)
    if m:
        pref[m.group(1)] += 1
for k, v in pref.most_common(40):
    print("   %-16s %4d" % (k, v))

print()
print("=== door_* 前缀样例 ===")
for n in sorted(x for x in names if x.startswith("door_")):
    print("   ", n)
