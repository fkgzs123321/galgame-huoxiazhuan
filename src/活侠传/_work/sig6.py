# -*- coding: utf-8 -*-
"""看 物品引擎 关键实现的完整返回形状。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

F = r"E:\Games\写卡\tavern_helper_template\src\活侠传\脚本\引擎.js"
c = open(F, encoding="utf-8").read()

for m in ["品质倍率", "实际加成", "装备后输入", "meetGates", "canHold", "putIn", "takeOut",
          "canAfford", "低于门槛", "强化", "强化材料", "合成"]:
    mm = re.search(r"this\." + re.escape(m) + r"\s*=\s*function\s*\(([^)]*)\)\s*\{", c)
    if not mm:
        continue
    s = mm.start()
    e = c.find("\n};", s)
    print("── this.%s(%s) ──" % (m, mm.group(1)))
    print(c[s : e + 2][:900])
    print()
