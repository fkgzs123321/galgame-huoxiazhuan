# -*- coding: utf-8 -*-
"""提取战斗引擎与物品/状态引擎的签名，用于接线。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

F = r"E:\Games\写卡\tavern_helper_template\src\活侠传\脚本\引擎.js"
c = open(F, encoding="utf-8").read()

for name in ["fight", "snapshot", "summarize", "multi", "rateFromDiff", "strike", "equip", "consume", "hasItem", "putIn", "takeOut"]:
    m = re.search(r"this\." + name + r"\s*=\s*function\s*\(([^)]*)\)", c)
    if m:
        print("  this.%-14s(%s)" % (name, m.group(1)))
    else:
        print("  this.%-14s — 未找到" % name)

print()
print("═" * 66)
for name in ["fight", "snapshot"]:
    m = re.search(r"this\." + name + r"\s*=\s*function\s*\(([^)]*)\)\s*\{", c)
    if not m:
        continue
    s = m.start()
    e = c.find("\n};", s)
    print("── this.%s(%s) ──" % (name, m.group(1)))
    print(c[s : e + 2][:2000])
    print()
