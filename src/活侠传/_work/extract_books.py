# -*- coding: utf-8 -*-
"""从 system/books/index.md 提取原作秘籍表。

★ 为什么值得做：这张表的「條件」列直接就是前置引擎要的数据
  （刀劍20 / 性情>=60 / 輕功>=20），「效果」列是练成后的属性变化。
  本卡原来只有个空壳的 秘籍 schema，没有实际内容。

输出：_work/_books.json
"""
import html
import io
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, r"source\_raw\wiki\system\books\index.md")
OUT = os.path.join(根, r"_work\_books.json")

raw = io.open(SRC, encoding="utf-8").read()


def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "|", s)          # <br> 当分隔符保留
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return re.sub(r"[ \t]+", " ", s).strip()


# ── 按大标题分节（刀劍 / 拳掌 / 暗器 …）──
节s = re.split(r"^## (.+)$", raw, flags=re.M)
# 节s = [前言, 标题1, 内容1, 标题2, 内容2, ...]
秘籍 = []
for i in range(1, len(节s), 2):
    类 = 清(节s[i])
    体 = 节s[i + 1]
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", 体, re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if len(cells) < 6:
            continue
        v = [清(c) for c in cells]
        if v[0] == "名稱":
            continue
        名 = v[0]
        if not 名:
            continue
        秘籍.append(
            {
                "类": 类.replace("/", "·") if isinstance(类, str) else 类,
                "名": 名,
                "效果": [x for x in v[1].split("|") if x],
                "武学点": v[2],
                "条件": [x for x in v[3].split("|") if x],
                "获得": [x for x in v[4].split("|") if x],
                "价格": v[5],
            }
        )

print("提取到 %d 本秘籍\n" % len(秘籍))

print("分类：")
for k, n in Counter(m["类"] for m in 秘籍).most_common():
    print("  %-12s %d" % (k, n))

# ── 条件统计（这是前置引擎的原料）──
条件模式 = re.compile(r"([\u4e00-\u9fa5]{2,4})\s*(>=|<=|=|>|<|≧|≦)\s*(\d+)")
条数 = Counter()
有条件的 = 0
for m in 秘籍:
    if m["条件"]:
        有条件的 += 1
    for c in m["条件"]:
        for mm in 条件模式.finditer(c):
            条数[mm.group(1)] += 1

print("\n有条件的秘籍：%d / %d" % (有条件的, len(秘籍)))
print("条件涉及的属性（前 14）：")
for k, n in 条数.most_common(14):
    print("  %-8s %d 次" % (k, n))

# ── 效果统计 ──
效果属性 = Counter()
for m in 秘籍:
    for e in m["效果"]:
        mm = re.match(r"^([\u4e00-\u9fa5]{2,4})([+-]\d+)?", e)
        if mm:
            效果属性[mm.group(1)] += 1

print("\n效果涉及的属性（前 14）：")
for k, n in 效果属性.most_common(14):
    print("  %-8s %d 次" % (k, n))

# ── 武学点分布 ──
点s = []
for m in 秘籍:
    try:
        # 可能带「万」之类，先取数字
        mm = re.search(r"\d+", m["武学点"].replace(",", ""))
        if mm:
            点s.append(int(mm.group(0)))
    except Exception:
        pass
if 点s:
    print("\n武学点：%d 本有数据，范围 %d~%d，中位 %d" % (
        len(点s), min(点s), max(点s), sorted(点s)[len(点s) // 2]))

json.dump(秘籍, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n已写入 " + OUT)

# ── 抽三本看看 ──
print("\n样例：")
for m in 秘籍[:3]:
    print("  【%s】%s" % (m["类"], m["名"]))
    print("     效果: %s" % " / ".join(m["效果"]))
    print("     条件: %s" % (" / ".join(m["条件"]) or "无"))
    print("     获得: %s" % (" / ".join(m["获得"])[:70]))
