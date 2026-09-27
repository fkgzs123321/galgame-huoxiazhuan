# -*- coding: utf-8 -*-
"""注册 3 条变量更新正则（隐藏 + 两个美化）。

★ 规范（.skills/tavern-cards/references/ui/regex-scripts.md）：
    `<UpdateVariable>` 这类通用标签「预设或卡，只留一处」——
    两边都放会重复处理，轻则样式叠加、重则前一条把标签吃掉后一条永不匹配。
  本卡选择**卡自带**，与 狼人杀 / 欲望都市 / 英雄坛说 一致：
    好处 = 不依赖玩家用哪个预设；坏处 = 若预设也带了会冲突。
  ★ 要改回「交给预设」：删掉这三条即可（面板那两条不受影响，必须留）。
"""
import json
import os
import sys
import uuid

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
P = os.path.join(根, "tavern-cards-state.json")
j = json.load(open(P, encoding="utf-8"))
rs = j.setdefault("regex_scripts", {})

# 两条美化片段必须先存在，否则 replace_file 指向空文件
for f in ["变量更新美化.html", "变量更新中美化.html"]:
    p = os.path.join(根, "正则", f)
    if not os.path.exists(p):
        print("★ 缺文件:", p)
        sys.exit(1)

# ── ① 对 AI 隐藏变量更新（完整 + 不完整两种形态一起吃掉）──
rs["对AI隐藏变量更新"] = {
    "id": str(uuid.uuid4()),
    "findRegex": "/<(update(?:variable)?)>(?:(?!.*<\\/\\1>)(?:(?!<\\1>).)*$|(?:(?!<\\1>).)*<\\/\\1?>)/gsi",
    "replaceString": "",
    "trimStrings": [],
    "placement": [1, 2],
    "disabled": False,
    "markdownOnly": False,
    "promptOnly": True,
    "runOnEdit": False,
    "substituteRegex": 0,
}

# ── ② 完整标签 → 折叠美化 ──
rs["变量更新美化"] = {
    "id": str(uuid.uuid4()),
    "findRegex": "/<(update(?:variable)?)>\\s*((?:(?!<\\1>).)*)\\s*<\\/\\1>/gsi",
    "replace_file": "正则/变量更新美化.html",
    "trimStrings": [],
    "placement": [1, 2],
    "disabled": False,
    "markdownOnly": True,
    "promptOnly": False,
    "runOnEdit": False,
    "substituteRegex": 0,
}

# ── ③ 不完整标签（AI 还在写）→ 「正在更新…」流光 ──
rs["变量更新中美化"] = {
    "id": str(uuid.uuid4()),
    "findRegex": "/<(update(?:variable)?)>(?!.*<\\/\\1>)\\s*((?:(?!<\\1>).)*)\\s*$/gsi",
    "replace_file": "正则/变量更新中美化.html",
    "trimStrings": [],
    "placement": [1, 2],
    "disabled": False,
    "markdownOnly": True,
    "promptOnly": False,
    "runOnEdit": False,
    "substituteRegex": 0,
}

json.dump(j, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("已注册，共 %d 条：" % len(rs))
for 名, r in rs.items():
    模式 = "replace_file:" + r["replace_file"] if r.get("replace_file") else "空替换"
    print("  %-18s placement=%-6s prompt=%-5s markdown=%-5s runOnEdit=%-5s  %s" % (
        名, r["placement"], r["promptOnly"], r["markdownOnly"], r["runOnEdit"], 模式))

# ── 自查 ──
print("\n配对自查：")
问题 = []
for 名, r in rs.items():
    # 隐藏类必须 promptOnly=true / markdownOnly=false
    if r["promptOnly"] and r["markdownOnly"]:
        问题.append(名 + "：promptOnly 与 markdownOnly 不能同真")
    if not r["promptOnly"] and not r["markdownOnly"]:
        问题.append(名 + "：两者皆假，这条规则不会生效")
    if r.get("replace_file"):
        fp = os.path.join(根, r["replace_file"])
        if not os.path.exists(fp):
            问题.append(名 + "：replace_file 指向不存在的文件 " + r["replace_file"])
# 面板两条与变量两条的 placement 约定
if rs["状态栏界面"]["placement"] != [2]:
    问题.append("状态栏界面 的 placement 应为 [2]")
if rs["对AI隐藏变量更新"]["placement"] != [1, 2]:
    问题.append("对AI隐藏变量更新 的 placement 应为 [1,2]")
if rs["变量更新美化"]["runOnEdit"] is not False:
    问题.append("变量更新美化 的 runOnEdit 应为 false")

if 问题:
    for p in 问题:
        print("  ✗ " + p)
    sys.exit(2)
print("  ✓ 五条规则字段合规")
print("  ✓ replace_file 都指向真实文件")
