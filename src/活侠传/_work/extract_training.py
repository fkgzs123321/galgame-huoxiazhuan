# -*- coding: utf-8 -*-
"""从 system/training/index.md 提取养成指令表（315 行）。

★★ 这张表解决了「卡为什么小」的根子问题：
   我之前手写 15 条行动表，而原作有 315 条养成指令，每条还带：
     · 心相分档效果（同一个行动，心相 33-64 / 65-100 / 0-32 收益不同）
     · 贡献消耗、心相消耗
     · 机率权重（决定这条多常出现）
     · 必要条件

   最要紧的是「心相分档」—— 我手写时完全没想到这个机制。
"""
import html
import io
import json
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # ★ 用卡内同源的表，不再直接调 zhconv（见 _zh.py）

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, r"source\_raw\wiki\system\training\index.md")
OUT = os.path.join(根, r"_work\_training.json")

raw = io.open(SRC, encoding="utf-8").read()




def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "|", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return re.sub(r"[ \t]+", " ", s).strip()


行s = re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S)
表 = []
for r in 行s:
    cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)
    if len(cells) < 11:
        continue
    v = [清(c) for c in cells]
    if v[0] in ("地點", "地点", "") or "指令" in v[1]:
        continue
    表.append({
        "地点": 简(v[0]),
        "指令": 简(v[1]),
        "事件": 简(v[2]),
        # ★ 这三列也必须过 简() —— 它们的原文里带中文（如「基礎: 50」），
        #   早先直接取 v[n] 原样，于是「礎」残留繁体。自测抓到的。
        "贡献": 简(v[3]),
        "心相耗": 简(v[4]),
        "效果中": 简(v[5]),
        "效果高": 简(v[6]),
        "效果低": 简(v[7]),
        "权重": 简(v[8]),
        "条件": 简(v[9]),
        "备注": 简(v[10]),
    })

print("提取到 %d 条养成指令\n" % len(表))

print("地点分布：")
for k, n in Counter(x["地点"] for x in 表).most_common(12):
    print("  %-12s %d" % (k, n))

print("\n指令分布（前 14）：")
for k, n in Counter(x["指令"] for x in 表).most_common(14):
    print("  %-16s %d" % (k, n))

# ── 心相分档：有多少条效果随档位变化 ──
变档 = [x for x in 表 if x["效果高"] not in ("-", "") or x["效果低"] not in ("-", "")]
print("\n★ 效果随心相档位变化的有 %d 条（%.0f%%）" % (len(变档), len(变档) / len(表) * 100))
for x in 变档[:4]:
    print("  【%s】%s / %s" % (x["地点"], x["指令"], x["事件"]))
    print("     心相 33~64: %s" % x["效果中"])
    print("     心相 65~100: %s" % (x["效果高"] or "（无额外）"))
    print("     心相 0~32:  %s" % (x["效果低"] or "（无额外）"))

# ── 权重分布 ──
权 = []
for x in 表:
    m = re.search(r"(\d+)", x["权重"])
    if m:
        权.append(int(m.group(1)))
if 权:
    print("\n机率权重：%d 条有数据，范围 %d~%d" % (len(权), min(权), max(权)))

# ── 必要条件 ──
有条件 = [x for x in 表 if x["条件"] not in ("-", "")]
print("有必要条件：%d 条" % len(有条件))
for x in 有条件[:4]:
    print("  %s / %s → %s" % (x["地点"], x["事件"], x["条件"][:70]))

# ── 抽效果里出现的属性（这是产出表的原料）──
属性模式 = re.compile(r"([\u4e00-\u9fa5]{2,4})([+-]\d+)")
属性计 = Counter()
for x in 表:
    for f in (x["效果中"], x["效果高"], x["效果低"]):
        for m in 属性模式.finditer(f):
            属性计[m.group(1)] += 1
print("\n效果涉及的属性（前 18）：")
for k, n in 属性计.most_common(18):
    print("  %-10s %d 次" % (k, n))

json.dump(表, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n已写入 " + OUT)
