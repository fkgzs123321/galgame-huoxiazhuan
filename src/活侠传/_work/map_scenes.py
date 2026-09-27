# -*- coding: utf-8 -*-
"""建立「游戏地点 → 场景图」的映射。

★ 依据：
   · 唐门 12 处地点来自 `脚本/引擎.js` 的地点表
   · 场景图名来自游戏资源（screen_tang_door1 / screen_forge / screen_kitchen ...）
   · 对应关系靠**名字语义**匹配 + 逐个核对场景图内容

  这一步不猜：先列出引擎里的地点，再列场景图，能对的直接对，
  对不上的标出来 —— 宁缺勿错，错的场景图比没有更破坏沉浸。
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"

# ── ① 引擎里的地点表 ──
#   ★ 地点表在 schema.ts 的 `唐门地点`（对应游戏 `Mortal.Core.PositionType`），
#     不在 引擎.js 里 —— 引擎刻意不提世界观名词（那是它的红线）。
#     早先在 引擎.js 里搜「地点」数组，搜到 0 处。
schema = io.open(os.path.join(根, "schema.ts"), encoding="utf-8").read()
m = re.search(r"唐门地点\s*=\s*\[(.*?)\]\s*as const", schema, re.S)
地点表 = []
if m:
    地点表 = [x.strip().strip("'\"") for x in m.group(1).split(",") if x.strip()]
print("══ 唐门 %d 处地点（来自 schema.ts）══" % len(地点表))
for d in 地点表:
    print("    " + d)

# ── ② 场景图清单 ──
语义 = json.load(io.open(os.path.join(根, "素材", "scenes.json"), encoding="utf-8"))
场景s = sorted(语义["场景"])
print()
print("══ 场景图（%d 张，列出唐门相关的）══" % len(场景s))
钥匙 = ("tang", "forge", "kitchen", "center", "backmountain", "study",
       "pharmacy", "alchemy", "cellar", "tower", "firewood", "temple",
       "martial", "tang_mall", "section_001")
tang = [s for s in 场景s if any(k in s for k in 钥匙)]
for s in tang:
    print("    " + s)

# ── ③ 唐门 12 处 → 场景图 ──
#   ★ 键必须是 schema.ts 里的**真地名**（12 处），
#     早先我自己编了一套（中庭/厨房/药房/书房/柴房/市集/山道/大厅/地窖/练功塔），
#     跟引擎对不上，界面点了地点取不到图。
候选 = {
    "正心堂": ["screen_section_001_center", "screen_section_001_center2", "screen_center"],
    "练功场": ["screen_martial_day", "screen_section_001_fist_day", "screen_section_001_fist_dusk"],
    "男弟子房": ["screen_section_room1_day", "screen_section_room1_dusk", "screen_room"],
    "女弟子房": ["screen_section_room1_night", "screen_room_night", "screen_princess_room1"],
    "炼丹房": ["screen_alchemy", "screen_alchemy_night", "screen_pharmacy"],
    "锻冶场": ["screen_forge", "screen_forge2", "screen_forge_dust", "screen_forge_night"],
    "伙房": ["screen_kitchen", "screen_kitchen_night"],
    "大门": ["screen_tang_door1", "screen_tang_door_night1", "screen_section_001_door_day"],
    "后山": ["screen_backmountain", "screen_backmountain2", "screen_backmountain2_night"],
    "讲经堂": ["screen_study", "screen_study2_day", "screen_temple_day"],
    "神秘房子": ["screen_cellar_day", "screen_section_001_cave_day"],
    "外堡": ["screen_tang_mall", "screen_tang_mall_night", "screen_section_001_market_day"],
    # 以下不在 12 处里，但界面会用（外出/过场）
    "夜": ["screen_night", "screen_center_night"],
    "山道": ["screen_mountain_road", "screen_mountain_road1", "screen_mountain_road2"],
    "雪道": ["screen_snow_road_day", "screen_snow_mountain"],
    "小镇": ["screen_village_day", "screen_village_night", "screen_village2_day"],
    "闹市": ["screen_nightmarket_day", "screen_nightmarket_night", "screen_street_day"],
    "客栈": ["screen_inn_1", "screen_inn_1_night", "screen_inn_room_day"],
    "江边": ["screen_river", "screen_river_night", "screen_boat_day"],
    "竹林": ["screen_forest", "screen_forest_night", "screen_forest_dust"],
    "战场": ["screen_battlefield", "screen_champaign_day"],
    "地图": ["screen_map"],
}

print()
print("══ 地点 → 场景图对应 ══")
出 = {}
for 地, 候s in 候选.items():
    有 = [c for c in 候s if c in 语义["场景"]]
    出[地] = 有
    mark = "✓" if 有 else "★ 无"
    print("  %-8s %s  %s" % (地, mark, "、".join(有) if 有 else "（场景图里没有对应）"))

# ── ④ 引擎地点表里，我还没给候选的 ──
print()
print("══ 引擎地点里没覆盖到的 ══")
未 = [d for d in 地点表 if d not in 出 and not any(d in k or k in d for k in 出)]
if 未:
    for d in 未:
        print("    " + d)
else:
    print("    （都覆盖到了）")

# ── ⑤ 存成 UI 用的表 ──
io.open(os.path.join(根, "素材", "地点场景.json"), "w", encoding="utf-8", newline="\n").write(
    json.dumps(出, ensure_ascii=False, indent=1))
print()
print("  已写入 素材/地点场景.json")

# ── ⑥ 全部场景清单（做地图热点用）──
io.open(os.path.join(根, "素材", "场景清单.json"), "w", encoding="utf-8", newline="\n").write(
    json.dumps(场景s, ensure_ascii=False, separators=(",", ":")))
print("  已写入 素材/场景清单.json（%d 张）" % len(场景s))
