# -*- coding: utf-8 -*-
"""提取引擎的真实函数签名 + 关键实现，用于校正调用方式。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

F = r"E:\Games\写卡\tavern_helper_template\src\活侠传\脚本\引擎.js"
c = open(F, encoding="utf-8").read()

for name in ["_roll", "_lcgNext", "judgeSeedOut", "judgePower", "judgeRequire", "judgeTier"]:
    m = re.search(r"this\." + name + r"\s*=\s*function\s*\(([^)]*)\)\s*\{", c)
    if not m:
        print("── this.%s 未找到\n" % name)
        continue
    s = m.start()
    e = c.find("\n};", s)
    if e < 0:
        e = s + 900
    print("── this.%s(%s) ──" % (name, m.group(1)))
    print(c[s : e + 2][:1100])
    print()

print("=" * 70)
for name in ["derive", "overall"]:
    m = re.search(r"this\." + name + r"\s*=\s*function\s*\(([^)]*)\)\s*\{", c)
    if not m:
        continue
    s = m.start()
    e = c.find("\n};", s)
    print("── this.%s(%s) ──" % (name, m.group(1)))
    print(c[s : e + 2][:1400])
    print()
