# -*- coding: utf-8 -*-
"""修角色条目的 @@if 条件：start: 0 → start: -3。

★ 规范（.skills/tavern-cards/references/ejs/guide.md L75-77）：
    matchChatMessages(['关键词A'])                // 扫描最后2楼
    matchChatMessages(['关键词A'], { start: -5 }) // 扫描最后5楼
  `start` 是**往回数几楼**的负数。

★ 我写成了 { start: 0 } —— 0 意味着只扫当前楼，
  而角色名通常出现在更早的楼层里，结果就是**角色永不加载**。
  （这是照抄参照卡格式时没核对语义造成的。）
"""
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\tavern-cards-state.json"
j = json.load(open(P, encoding="utf-8"))

改 = 0
for 组, 条目 in j.get("entryManifest", {}).items():
    for 名, 项 in 条目.items():
        for i, c in enumerate(项.get("contents", [])):
            if not isinstance(c, dict):
                continue
            s = c.get("content", "")
            if "matchChatMessages" in s and "start: 0" in s:
                新 = s.replace("start: 0", "start: -3")
                项["contents"][i]["content"] = 新
                改 += 1
                print("  修 %-24s → %s" % (名, 新[:70]))

json.dump(j, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n共修 %d 处" % 改)

# 复核：确认没有残留的 start: 0
残留 = 0
for 组, 条目 in j.get("entryManifest", {}).items():
    for 名, 项 in 条目.items():
        for c in 项.get("contents", []):
            if isinstance(c, dict) and "start: 0" in str(c.get("content", "")):
                残留 += 1
print("残留 start: 0 的条目：%d 处" % 残留)
