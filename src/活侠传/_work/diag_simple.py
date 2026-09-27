# -*- coding: utf-8 -*-
"""诊断：为什么 62 个事件页提取出 0 段。"""
import io
import os
import re
import sys
import urllib.parse

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # noqa: E402

d = r"E:\Games\写卡\tavern_helper_template\src\活侠传\source\_raw\wiki\event\simple"

失效 = [
    "1-04-1-%E5%88%9D%E8%AD%98%E5%94%90%E5%B8%83%E8%A1%A3.md",   # 初识唐布衣
    "1-04-1-%E9%81%8A%E6%88%B2%E9%96%8B%E5%B1%80.md",              # 游戏开局（猜的编码）
]

# 直接按前缀找
候选 = [f for f in sorted(os.listdir(d)) if f.startswith("1-04-1-")]
print("1-04-1 开头的文件 %d 个：" % len(候选))
for f in 候选[:8]:
    print("  " + urllib.parse.unquote(f))

print()
# 逐个查：<tr> 数 与 通过 len(cells)>=3 的行数
print("逐页检查（前 12）：")
n = 0
for f in 候选[:12]:
    p = os.path.join(d, f)
    if not os.path.exists(p):
        print("  ★ 读不到: " + f)
        continue
    raw = io.open(p, encoding="utf-8").read()
    trs = re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S)
    合格 = 0
    for row in trs:
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
        if len(cells) >= 3:
            合格 += 1
    print("  %-46s <tr> %2d  →  合格行 %2d" % (
        urllib.parse.unquote(f)[:44], len(trs), 合格))
    n += 1

print()
print("══ 找一个 0 段的页，dump 它的 <tr> ══")
for f in 候选:
    p = os.path.join(d, f)
    if not os.path.exists(p):
        continue
    raw = io.open(p, encoding="utf-8").read()
    trs = re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S)
    合格 = sum(
        1 for row in trs
        if len(re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)) >= 3
    )
    if 合格 == 0 and len(trs) > 0:
        print("  文件: " + urllib.parse.unquote(f))
        print("  长度: %d   <tr> %d 个   合格 0" % (len(raw), len(trs)))
        for i, row in enumerate(trs[:3]):
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
            print("    行%d: 单元格 %d 个" % (i, len(cells)))
            print("      %r" % row[:220])
        break
else:
    print("  （没找到「有 tr 但 0 合格行」的页）")
