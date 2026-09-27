# -*- coding: utf-8 -*-
"""提取 物品 / 状态 / 成长 引擎的真实签名与关键实现。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

F = r"E:\Games\写卡\tavern_helper_template\src\活侠传\脚本\引擎.js"
c = open(F, encoding="utf-8").read()

组 = {
    "物品": ["canAfford", "meetGates", "equip", "unequip", "equipBonus", "consume",
             "低于门槛", "canHold", "putIn", "takeOut", "hasItem", "品质倍率",
             "实际加成", "dropTable", "强化", "强化材料", "合成", "装备后输入"],
    "状态": ["挂上", "撤掉", "有没有", "几层", "过一回合", "状态倍率", "应用倍率",
             "概率修正", "进冷却", "在冷却", "冷却剩", "相克", "相克全表",
             "克我的", "我克的", "相克自检", "状态快照"],
    "成长": ["levelBase", "levelCost", "totalCost", "solveK", "canLevelUp",
             "feedBack", "applyFeed", "nextFeed"],
}

for 名, 方法们 in 组.items():
    print("═" * 66)
    print(f"  【{名}引擎】")
    print("═" * 66)
    for m in 方法们:
        mm = re.search(r"this\." + re.escape(m) + r"\s*=\s*function\s*\(([^)]*)\)", c)
        if mm:
            print("  this.%-16s(%s)" % (m, mm.group(1)))
        else:
            print("  this.%-16s — 未找到" % m)
    print()

# 关键实现：equip / consume / canAfford / meetGates
print("═" * 66)
print("  【关键实现】")
print("═" * 66)
for m in ["equip", "consume", "canAfford", "meetGates", "品质倍率", "实际加成", "挂上", "过一回合"]:
    mm = re.search(r"this\." + re.escape(m) + r"\s*=\s*function\s*\(([^)]*)\)\s*\{", c)
    if not mm:
        continue
    s = mm.start()
    e = c.find("\n};", s)
    seg = c[s : e + 2]
    print("── this.%s(%s) ──" % (m, mm.group(1)))
    print(seg[:1000])
    print()
