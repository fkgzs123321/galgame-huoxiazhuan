# -*- coding: utf-8 -*-
"""修正 position.type：at_depth_as_system → at_depth（合法取值之一）。"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\tavern-cards-state.json"
j = json.load(open(P, encoding="utf-8"))

合法 = {
    "before_character_definition",
    "after_character_definition",
    "before_example_messages",
    "after_example_messages",
    "before_author_note",
    "after_author_note",
    "at_depth",
}

改 = 0
for 组, 条目 in j.get("entryManifest", {}).items():
    for 名, 项 in 条目.items():
        pos = 项.get("position")
        if not isinstance(pos, dict):
            continue
        t = pos.get("type")
        if t not in 合法:
            print("  %-14s %-12s %s → at_depth" % (组, 名, t))
            pos["type"] = "at_depth"
            改 += 1
            # depth 型必须带 depth 字段
            if "depth" not in pos:
                pos["depth"] = 4

json.dump(j, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n共修正 %d 处" % 改)
