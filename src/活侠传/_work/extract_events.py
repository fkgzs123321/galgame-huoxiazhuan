# -*- coding: utf-8 -*-
"""从 story-branch-timeline.md 提取原作事件表 → 结构化数据。

★ 为什么值得做：这张表就是「前置与错过」机制的原始数据。
  每条带 年月旬 / 类别 / 完整选项 / 数值后果 / 骰子门槛 ——
  正是本卡 `单元表` 该长的样子（我自己手写的只有 4 条）。

输出：_work/_events.json（原始提取）+ 打印统计
"""
import html
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, r"source\_raw\wiki\event\story-branch-timeline.md")
OUT = os.path.join(根, r"_work\_events.json")

raw = io.open(SRC, encoding="utf-8").read()

# ── 拆表格行 ──
rows = re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S)


def 清(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


事件 = []
for r in rows:
    cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)
    if len(cells) < 7:
        continue
    v = [清(c) for c in cells]
    if v[0] in ("類別", "类别", "") or "觸發地點" in v[1]:
        continue
    事件.append(
        {
            "类别": v[0],
            "地点": v[1],
            "年": v[2],
            "月": v[3],
            "旬": v[4],
            "内容": v[5],
            "触发条件": v[6],
            "备注": v[7] if len(v) > 7 else "",
        }
    )

print("提取到 %d 条事件\n" % len(事件))

# ── 统计 ──
from collections import Counter

print("类别分布：")
for k, n in Counter(e["类别"] for e in 事件).most_common():
    print("  %-12s %d" % (k, n))

print("\n时间分布：")
for k, n in sorted(Counter("%s%s%s" % (e["年"], e["月"], e["旬"]) for e in 事件).items()):
    print("  %-14s %d" % (k, n))

# ── 抽数值变化（选项里的 +/- 是核心资产）──
数值模式 = re.compile(r"([\u4e00-\u9fa5]{2,6})([+-]\d+)")
有数值 = 0
数值项 = Counter()
for e in 事件:
    for m in 数值模式.finditer(e["内容"]):
        数值项[m.group(1)] += 1
        有数值 += 1

print("\n数值变化出现次数：%d" % 有数值)
print("涉及属性（前 18）：")
for k, n in 数值项.most_common(18):
    print("  %-10s %d 次" % (k, n))

# ── 骰子门槛 ──
骰 = re.findall(r"[≧≦><]\s*=?\s*(\d+)", " ".join(e["内容"] for e in 事件))
print("\n骰子门槛 %d 处：%s" % (len(骰), "、".join(sorted(set(骰), key=int)[:14])))

# ── 选项数 ──
选项数 = sum(len(re.findall(r"選項\d", e["内容"])) for e in 事件)
print("选项总数：%d" % 选项数)

json.dump(事件, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n已写入 " + OUT)
