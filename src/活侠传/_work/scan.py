# -*- coding: utf-8 -*-
"""在游戏本体文本转储中做正则检索, 输出命中原文与出处。

用法:
  python scan.py "正则"
  python scan.py --ctx 120 --limit 40 "正则"
  python scan.py --files "ch3_6|Legend" "正则"     # 仅扫文件名匹配的文件
"""
import os
import re
import sys
import glob

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump")

CTX = 90
LIMIT = 30
FILEPAT = None
args = sys.argv[1:]
while args and args[0].startswith("--"):
    a = args.pop(0)
    if a == "--ctx":
        CTX = int(args.pop(0))
    elif a == "--limit":
        LIMIT = int(args.pop(0))
    elif a == "--all":
        LIMIT = 10 ** 9
    elif a == "--files":
        FILEPAT = args.pop(0)

if not args:
    print("需要正则")
    sys.exit(1)
PAT = args[0]

files = sorted(glob.glob(os.path.join(D, "*.txt")))
files = [f for f in files if not re.search(r"_kr\.txt$", os.path.basename(f))]
if FILEPAT:
    files = [f for f in files if re.search(FILEPAT, os.path.basename(f))]

print("扫描 %d 个文件 | 正则: %s" % (len(files), PAT))
print("=" * 80)
n = 0
hits = 0
for p in files:
    try:
        t = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for m in re.finditer(PAT, t):
        s = max(0, m.start() - CTX)
        e = min(len(t), m.end() + CTX)
        seg = t[s:e].replace("\r", " ").replace("\n", " ")
        seg = re.sub(r"\s+", " ", seg)
        # 同一行内的 key = value 结构, 提取 key
        key = ""
        km = re.search(r"([A-Za-z_]*/[A-Za-z0-9_]+)\s*=", t[max(0, m.start() - 400):m.start()])
        if km:
            key = km.group(1)
        print("[%s]%s ...%s..." % (os.path.basename(p), (" {" + key + "}") if key else "", seg))
        hits += 1
        if hits >= LIMIT:
            break
    if hits >= LIMIT:
        print("-- 达上限 --")
        break
if hits == 0:
    print("(无命中)")
print("\n命中 %d 条" % hits)
