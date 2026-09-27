# -*- coding: utf-8 -*-
"""查 forge-roadmap.md 的真实结构（含 mermaid 图）。"""
import io
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

p = r"E:\Games\写卡\tavern_helper_template\src\活侠传\source\_raw\wiki\system\forge-roadmap.md"
c = io.open(p, encoding="utf-8-sig").read()
print("  长度 %d" % len(c))
n = len(re.findall(r"```mermaid", c))
print("  mermaid 块 %d 个" % n)
print()

i = c.find("```mermaid")
if i >= 0:
    print("  第一个 mermaid 块（原貌，前 800 字）:")
    print(c[i:i + 800])
    print()

# 图里有多少节点
节点s = re.findall(r"^\s*([A-Z]\d*)\[([^\]]+)\]", c, re.M)
print("  图节点 %d 个，前 8 个：" % len(节点s))
for k, v in 节点s[:8]:
    print("    %s = %r" % (k, v.replace("\n", " ")[:50]))

# 边
边s = re.findall(r"([A-Z]\d*)\s*-->\s*([A-Z]\d*)", c)
print("  图边 %d 条" % len(边s))
