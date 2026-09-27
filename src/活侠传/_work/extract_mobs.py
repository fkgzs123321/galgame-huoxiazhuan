# -*- coding: utf-8 -*-
"""从 people/mobs/*.md 提取「江湖众生相」—— 龙套 NPC。

★ 原文层级（早先理解错了，这是修正后的）：
    ## 阎关三煞              ← 人物组名
      <img badguy1> <table>  ← 组内第 1 人（三煞之一）
      <img badguy2> <table>  ← 第 2 人
      <img badguy3> <table>  ← 第 3 人
    ## 破戒僧
      <img badguy4> <table>  ← 只一人

    每个 <table> 的行是「场景 | 他的故事」。
    同组的人共享部分故事（同一段剧情的不同视角）。

★ 早先版本把「第一行的第一格」当人名 —— 那是场景名，
  于是同一个 NPC 被拆成好几条、名字还是错的（如「大师兄玩耍」）。

★ 进卡时按**组**聚合：一组就是一则「你会遇见的一群人」。
"""
import html
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # ★ 用卡内同源的表，不再直接调 zhconv（见 _zh.py）

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
MOBS = os.path.join(根, r"source\_raw\wiki\people\mobs")
OUT = os.path.join(根, r"_work\_mobs.json")




def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "‖", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return re.sub(r"[ \t]+", " ", s).strip()


组表 = []
for fn in sorted(os.listdir(MOBS)):
    if not fn.endswith(".md") or fn == "index.md":
        continue
    分类 = 简(re.sub(r"\.md$", "", fn))
    raw = io.open(os.path.join(MOBS, fn), encoding="utf-8").read()

    节s = re.split(r"^## (.+)$", raw, flags=re.M)
    for i in range(1, len(节s), 2):
        组名 = 简(清(节s[i]))
        体 = 节s[i + 1]

        成员 = []
        for tbl in re.findall(r"<table>(.*?)</table>", 体, re.S):
            片段 = []
            for r in re.findall(r"<tr>(.*?)</tr>", tbl, re.S):
                cells = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)
                if len(cells) < 2:
                    continue
                场景 = 简(清(cells[0])).replace("‖", "｜")
                故事 = 简(清(cells[1])).replace("‖", "；")
                if not 故事:
                    continue
                片段.append({"场景": 场景, "故事": 故事})
            if 片段:
                成员.append(片段)

        if not 成员:
            continue

        # 组内合并：把各成员的故事去重后归到一条
        #   同一段剧情会在多个成员的表里重复（同组不同视角）
        全部片段 = []
        见过 = set()
        for 片段s in 成员:
            for f in 片段s:
                if f["故事"] in 见过:
                    continue
                见过.add(f["故事"])
                全部片段.append(f)

        # 「身份描述」通常是最长的那条片段（含家世/来路）
        身份 = max(全部片段, key=lambda f: len(f["故事"]))["故事"] if 全部片段 else ""

        组表.append({
            "名": 组名,
            "归类": 分类,
            "人数": len(成员),
            "身份": 身份,
            "片段": 全部片段,
        })

print("提取到 %d 组龙套 NPC（涉及 %d 个立绘/人次）\n" % (
    len(组表), sum(x["人数"] for x in 组表)))

from collections import Counter

print("按分类：")
for k, n in Counter(x["归类"] for x in 组表).most_common():
    print("  %-22s %d 组" % (k, n))

print("\n多人组（有配角群的）：")
for x in sorted(组表, key=lambda y: -y["人数"])[:8]:
    print("  %-16s %d 人  片段 %d 条" % (x["名"], x["人数"], len(x["片段"])))

print("\n样例：")
for x in 组表[:5]:
    print("  【%s】%s（%d 人）" % (x["归类"], x["名"], x["人数"]))
    print("     %s" % x["身份"][:90])
    for f in x["片段"][:2]:
        print("     · %s：%s" % (f["场景"], f["故事"][:64]))

总片段 = sum(len(x["片段"]) for x in 组表)
print("\n片段总计 %d 条" % 总片段)

json.dump(组表, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("已写入 " + OUT)
