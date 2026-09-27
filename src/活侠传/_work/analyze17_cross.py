# -*- coding: utf-8 -*-
"""交叉验证：写过的 flag vs 读过的 flag（Condition / Switch），找出「前置条件到底怎么被满足」。"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

RE_SET = re.compile(r'statmodifymanager\.SetFlag\(\s*"([^"]+)"')
RE_ADD = re.compile(r'statmodifymanager\.AddFlag\(\s*"([^"]+)"')
RE_COND = re.compile(r'checkpointmanager\.Condition\(\s*"([^"]+)"')
RE_SWITCH = re.compile(r'checkpointmanager\.Switch\(\s*"([^"]+)"')

written = Counter()
read_cond = Counter()
read_switch = Counter()

for p in files:
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in RE_SET.finditer(t):
        written[m.group(1)] += 1
    for m in RE_ADD.finditer(t):
        written[m.group(1)] += 1
    for m in RE_COND.finditer(t):
        read_cond[m.group(1)] += 1
    for m in RE_SWITCH.finditer(t):
        read_switch[m.group(1)] += 1

W = set(written)
C = set(read_cond)
S = set(read_switch)

print("写入过的 flag 唯一: %d" % len(W))
print("Condition 读过的 key 唯一: %d" % len(C))
print("Switch 读过的 key 唯一: %d" % len(S))
print()
print("=== Condition key 中，有脚本 SetFlag 写入的（可被满足）===")
ok = sorted(C & W)
print("  %d / %d" % (len(ok), len(C)))
for k in ok[:60]:
    print("   %-46s 读%2d 写%2d" % (k, read_cond[k], written[k]))
print()
print("=== Condition key 中，没有任何脚本写过的（=数据表判定，非 flag）===")
no = sorted(C - W)
print("  %d 个，样例：" % len(no))
for k in no[:60]:
    print("   %-46s 读%2d" % (k, read_cond[k]))
print()
print("=== Switch key 中「比较语义」的 50 个（引擎按属性实时判定）===")
cmpk = sorted(k for k in S if re.search(r"_(GE|LE|GT|LT|EQ|NE)_", k))
for k in cmpk:
    print("   %-32s 用%3d次" % (k, read_switch[k]))
print()
print("=== 仅被写、从未被读的 flag（=死数据/给存档/给外部系统）top 20 ===")
only = sorted(W - C - S, key=lambda x: -written[x])
for k in only[:20]:
    print("   %-40s 写%2d" % (k, written[k]))
print("  共 %d 个" % len(only))
