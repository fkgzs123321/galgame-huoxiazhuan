# -*- coding: utf-8 -*-
"""提取 strike / rateFromDiff / snapshot 的实现，确认 rng 契约。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

F = r"E:\Games\写卡\tavern_helper_template\src\活侠传\脚本\引擎.js"
c = open(F, encoding="utf-8").read()

for name in ["strike", "rateFromDiff", "snapshot", "summarize"]:
    m = re.search(r"this\." + name + r"\s*=\s*function\s*\(([^)]*)\)\s*\{", c)
    if not m:
        print("── this.%s 未找到\n" % name)
        continue
    s = m.start()
    e = c.find("\n};", s)
    print("── this.%s(%s) ──" % (name, m.group(1)))
    print(c[s : e + 2][:1500])
    print()

# rng 怎么被调用
print("═" * 60)
print("=== rng 调用点 ===")
for m in re.finditer(r"rng\s*\([^)]*\)", c):
    s = max(0, m.start() - 80)
    print("  …" + c[s : m.end() + 60].replace("\n", " "))
