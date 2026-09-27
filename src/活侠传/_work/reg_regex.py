# -*- coding: utf-8 -*-
"""把前端面板注册成正则脚本 —— 让玩家在酒馆里真能看到状态栏。

★ 这一步之前漏了，是最严重的缺口：
  面板做出来了、截图也验证过，但那些截图看的是 dist/ 里的独立页面。
  卡里没有 regex_scripts，所以 <StatusPlaceHolderImpl/> 没人替换 ——
  AI 会看到一串无意义的标签，玩家**什么都看不到**。

做法（照 .skills/tavern-cards/references/ui/regex-scripts.md）：
  ① 状态栏界面    : 占位符 → 面板 HTML（replace_file，markdownOnly）
  ② 对AI隐藏状态栏 : 占位符 → 空（promptOnly）
"""
import json
import os
import shutil
import sys
import uuid

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
DIST = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
P = os.path.join(根, "tavern-cards-state.json")

# ══════════════════════════════════════════════════════════════
# ① 把 dist 的面板复制到 正则/状态栏界面.html
# ══════════════════════════════════════════════════════════════
正则目录 = os.path.join(根, "正则")
os.makedirs(正则目录, exist_ok=True)

if not os.path.exists(DIST):
    print("★ 找不到构建产物:", DIST)
    print("  先跑：node --import tsx node_modules/webpack-cli/bin/cli.js --mode production")
    sys.exit(1)

面板 = os.path.join(正则目录, "状态栏界面.html")
shutil.copy2(DIST, 面板)
print("① 面板已就位")
print("   %s" % 面板)
print("   %.1f KB" % (os.path.getsize(面板) / 1024))

# ══════════════════════════════════════════════════════════════
# ② 注册正则脚本
# ══════════════════════════════════════════════════════════════
j = json.load(open(P, encoding="utf-8"))
rs = j.setdefault("regex_scripts", {})

# ★ 只放「卡专属」的两条。
#   通用标签（<thinking> / <UpdateVariable>）的隐藏与美化交给预设 ——
#   两边都放会重复处理（规范雷区）。
rs["状态栏界面"] = {
    "id": str(uuid.uuid4()),
    "findRegex": "<StatusPlaceHolderImpl/>",
    "replace_file": "正则/状态栏界面.html",
    "trimStrings": [],
    "placement": [2],
    "disabled": False,
    "markdownOnly": True,
    "promptOnly": False,
    "runOnEdit": True,
    "substituteRegex": 0,
}

rs["对AI隐藏状态栏"] = {
    "id": str(uuid.uuid4()),
    "findRegex": "<StatusPlaceHolderImpl/>",
    "replaceString": "",
    "trimStrings": [],
    "placement": [2],
    "disabled": False,
    "markdownOnly": False,
    "promptOnly": True,
    "runOnEdit": True,
    "substituteRegex": 0,
}

json.dump(j, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("\n② 正则脚本已注册")
for 名, r in rs.items():
    print("   %-16s placement=%s  promptOnly=%-5s markdownOnly=%-5s runOnEdit=%s" % (
        名, r["placement"], r["promptOnly"], r["markdownOnly"], r["runOnEdit"]))

# ══════════════════════════════════════════════════════════════
# ③ 自查：配对是否合规
# ══════════════════════════════════════════════════════════════
print("\n③ 配对自查（规范要求：一真一假配对）")
问题 = []
隐 = rs["对AI隐藏状态栏"]
换 = rs["状态栏界面"]
if not (隐["promptOnly"] and not 隐["markdownOnly"]):
    问题.append("隐藏脚本应当 promptOnly=true / markdownOnly=false")
if not (换["markdownOnly"] and not 换["promptOnly"]):
    问题.append("替换脚本应当 markdownOnly=true / promptOnly=false")
if 隐["findRegex"] != 换["findRegex"]:
    问题.append("两条的 findRegex 必须相同（同一个锚点）")
if not 换.get("replace_file"):
    问题.append("替换脚本必须有 replace_file")
if 隐.get("replaceString") != "":
    问题.append("隐藏脚本的 replaceString 应为空串")

if 问题:
    for p in 问题:
        print("   ✗ " + p)
    sys.exit(2)
print("   ✓ findRegex 一致：" + 换["findRegex"])
print("   ✓ promptOnly / markdownOnly 一真一假")
print("   ✓ replace_file 指向面板")
print("   ✓ 隐藏脚本 replaceString 为空串")
