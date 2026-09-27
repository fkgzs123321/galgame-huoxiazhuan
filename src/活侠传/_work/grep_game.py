# -*- coding: utf-8 -*-
"""在游戏本体文本转储中做精确检索, 输出命中原文与出处文件名。

用法:
  python grep_game.py "关键词"                # 单关键词
  python grep_game.py "词A" "词B"             # 多关键词(任一命中)
  python grep_game.py --ctx 80 "关键词"       # 指定上下文宽度
  python grep_game.py --all "关键词"          # 不限条数
"""
import os
import re
import sys
import glob

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump")

CTX = 70
LIMIT = 25
args = sys.argv[1:]
while args and args[0].startswith("--"):
    a = args.pop(0)
    if a == "--ctx":
        CTX = int(args.pop(0))
    elif a == "--all":
        LIMIT = 10 ** 9
    elif a == "--limit":
        LIMIT = int(args.pop(0))
if not args:
    print("需要关键词")
    sys.exit(1)

# 只扫简体中文正文, 避免 kr/tw 重复
files = sorted(glob.glob(os.path.join(D, "*.txt")))
files = [f for f in files if not re.search(r"_kr\.txt$", os.path.basename(f))]

total = 0
for kw in args:
    print("=" * 78)
    print("关键词: %s" % kw)
    print("=" * 78)
    n = 0
    for p in files:
        try:
            t = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if kw not in t:
            continue
        for m in re.finditer(re.escape(kw), t):
            s = max(0, m.start() - CTX)
            e = min(len(t), m.end() + CTX)
            seg = t[s:e].replace("\r", " ").replace("\n", " ")
            seg = re.sub(r"\s+", " ", seg)
            print("  [%s] ...%s..." % (os.path.basename(p), seg))
            n += 1
            if n >= LIMIT:
                break
        if n >= LIMIT:
            break
    if n == 0:
        print("  (无命中)")
    else:
        print("  -- 命中 %d 条%s" % (n, " (已达上限)" if n >= LIMIT else ""))
    total += n
print("\n总计: %d 条" % total)
