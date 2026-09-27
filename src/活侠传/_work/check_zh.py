# -*- coding: utf-8 -*-
"""检查最终产物（卡内 TS 表）有没有残留繁体。

★ 判据说明：不要用 zhconv 去猜「这字是不是繁体」——
  那会把一大堆简繁同形字（丟/國/媽… zhconv 单字映射到自己）误报成残留，
  实测在真实数据上误报 505 个、真残留只有 21 个。

  正确判据：**某字符在本卡繁简表里有映射（说明它该被转），但转换后还在**。
"""
import io
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

from _zh import _表  # noqa: E402

根 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

要查 = [
    ("脚本/秘籍.ts", "秘籍表"),
    ("脚本/养成.ts", "养成表"),
    ("脚本/众生相.ts", "众生相"),
    ("脚本/原作事件.ts", "原作事件表"),
    ("脚本/繁简.ts", "繁简表（自身，跳过）"),
]

总 = 0
for 相对, 名 in 要查:
    p = os.path.join(根, 相对)
    if not os.path.exists(p):
        print("  %-16s （还没有）" % 名)
        continue
    if "繁简" in 相对:
        print("  %-16s （是转换表本身，跳过）" % 名)
        continue
    c = io.open(p, encoding="utf-8").read()
    残留 = sorted(set(ch for ch in c if ch in _表))
    总 += len(残留)
    if 残留:
        print("  %-16s ★ %d 个残留：%s" % (名, len(残留), " ".join(残留)))
    else:
        print("  %-16s ✓ 干净" % 名)

print()
print("  最终产物合计残留：%d" % 总)

# 顺带查世界书与开场白（那些是我手写的，本来就没繁体，但顺手验一下）
其他 = []
for d in ["世界书", "开场白"]:
    dp = os.path.join(根, d)
    if not os.path.isdir(dp):
        continue
    for root, _, files in os.walk(dp):
        for fn in files:
            if fn.endswith((".yaml", ".txt", ".md")):
                其他.append(os.path.join(root, fn))
if 其他:
    n = 0
    for p in 其他:
        c = io.open(p, encoding="utf-8").read()
        n += len(set(ch for ch in c if ch in _表))
    print("  世界书+开场白（%d 文件）残留：%d" % (len(其他), n))
    总共 = 总 + n
else:
    总共 = 总

print()
if 总共:
    print("★ 还有残留，需要重跑生成链")
    sys.exit(1)
print("✓ 全部干净")
