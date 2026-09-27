# -*- coding: utf-8 -*-
"""接线开局表单：开场白加占位符 + 注册一对正则。

★ 表单式开场白的完整结构（skills: first-message.md#表单式）：
     （叙事开场白文本……）

     <OpeningPlaceHolder/>

   + 一对正则：
     替换（开局表单界面）  findRegex=<OpeningPlaceHolder/>  promptOnly=false markdownOnly=true
     隐藏（对AI隐藏开局表单）findRegex=<OpeningPlaceHolder/>  promptOnly=true  markdownOnly=false

★ 为什么开场白里的叙事要保留：
   你说的是「叙事 + 表单」。纯表单式没有叙事，玩家一进来只有一堆输入框；
   保留叙事能让玩家先进入情境，再决定自己是谁。
"""
import io
import json
import os
import sys
import uuid

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
GS = os.path.join(根, "开场白")
STATE = os.path.join(根, "tavern-cards-state.json")

# ── ① 给开场白 0 加占位符 ──
p = os.path.join(GS, "0.txt")
c = io.open(p, encoding="utf-8").read()

if "OpeningPlaceHolder" in c:
    print("① 开场白已有占位符，跳过")
else:
    # 把占位符插在末尾（状态栏占位符由打包器加，不在这里）
    c = c.rstrip() + "\n\n<OpeningPlaceHolder/>\n"
    io.open(p, "w", encoding="utf-8", newline="\n").write(c)
    print("① 开场白 0 已加 <OpeningPlaceHolder/>")

# ── ② 注册一对正则 ──
j = json.load(io.open(STATE, encoding="utf-8"))
rs = j.setdefault("regex_scripts", {})

rs["开局表单界面"] = {
    "id": str(uuid.uuid4()),
    "findRegex": "<OpeningPlaceHolder/>",
    "replace_file": "正则/开局表单.html",
    "trimStrings": [],
    "placement": [2],
    "disabled": False,
    "markdownOnly": True,
    "promptOnly": False,
    "runOnEdit": True,
    "substituteRegex": 0,
}

rs["对AI隐藏开局表单"] = {
    "id": str(uuid.uuid4()),
    "findRegex": "<OpeningPlaceHolder/>",
    "replaceString": "",
    "trimStrings": [],
    "placement": [2],
    "disabled": False,
    "markdownOnly": False,
    "promptOnly": True,
    "runOnEdit": True,
    "substituteRegex": 0,
}

json.dump(j, io.open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("\n② 已注册正则，共 %d 条：" % len(rs))
for 名, r in rs.items():
    print("  %-20s %-22s prompt=%-5s markdown=%-5s" % (
        名, r["findRegex"][:20], r["promptOnly"], r["markdownOnly"]))

# ── ③ 自查 ──
问题 = []
for 名, r in rs.items():
    if r["promptOnly"] and r["markdownOnly"]:
        问题.append(名 + "：两者同真")
    if not r["promptOnly"] and not r["markdownOnly"]:
        问题.append(名 + "：两者皆假")
    if r.get("replace_file") and not os.path.exists(os.path.join(根, r["replace_file"])):
        问题.append(名 + "：replace_file 不存在 " + r["replace_file"])

print()
if 问题:
    for x in 问题:
        print("  ✗ " + x)
else:
    print("  ✓ 字段合规")
