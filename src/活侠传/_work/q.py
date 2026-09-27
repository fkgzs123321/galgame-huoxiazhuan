# -*- coding: utf-8 -*-
"""在完整重提取的转储(_dump2)中检索, 只扫中文版(排除 kr)。"""
import os
import re
import sys
import glob

sys.stdout.reconfigure(encoding="utf-8")
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")

CTX, LIMIT, ONLY = 90, 30, None
args = sys.argv[1:]
while args and args[0].startswith("--"):
    a = args.pop(0)
    if a == "--ctx":
        CTX = int(args.pop(0))
    elif a == "--limit":
        LIMIT = int(args.pop(0))
    elif a == "--all":
        LIMIT = 10 ** 9
    elif a == "--only":
        ONLY = args.pop(0)
PAT = args[0]

files = []
for f in sorted(glob.glob(os.path.join(D, "*.txt"))):
    b = os.path.basename(f)
    if "__kr__" in b:
        continue
    if ONLY and not re.search(ONLY, b):
        continue
    files.append(f)

print("扫描 %d 个中文文件 | 正则: %s" % (len(files), PAT))
print("=" * 84)
hits = 0
for p in files:
    try:
        t = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for m in re.finditer(PAT, t):
        s, e = max(0, m.start() - CTX), min(len(t), m.end() + CTX)
        seg = re.sub(r"\s+", " ", t[s:e].replace("\n", " ").replace("\r", " "))
        km = re.search(r"([A-Za-z_]*/[A-Za-z0-9_]+)\s*=", t[max(0, m.start() - 500):m.start()])
        print("[%s]%s ...%s..." % (os.path.basename(p), (" {" + km.group(1) + "}") if km else "", seg))
        hits += 1
        if hits >= LIMIT:
            break
    if hits >= LIMIT:
        print("-- 达上限 --")
        break
if hits == 0:
    print("(无命中)")
print("\n命中 %d 条" % hits)
