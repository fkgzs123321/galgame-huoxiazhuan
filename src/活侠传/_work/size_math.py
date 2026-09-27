# -*- coding: utf-8 -*-
"""算一下：去掉截断之后，卡会变多大。

★ 为什么要先算：世界书不是越大越好 ——
  constant 条目每轮都进 prompt，selective 条目提到才进。
  必须先看清「全量」是多少，再决定哪些放开、哪些仍要收。

  现状：条目分两类
    · constant（37 条）—— 每轮都进，**不能大**
    · selective（546 条）—— 关键词触发，**可以大**（一次只进几条）
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
RAW = os.path.join(根, r"source\_raw\wiki")

print("══ 各类源素材的真实总量（不截断）══\n")

类目录 = {
    "事件详情(simple)": "event/simple",
    "结局(ends+badends)": None,
    "人物(characters)": "people/characters",
    "势力(factions)": "people/factions",
    "龙套(mobs)": "people/mobs",
    "秘籍(books)": "system/books",
    "机制(guide)": "other/guide",
}

import html as _h


def 正文量(p: str) -> int:
    try:
        raw = io.open(p, encoding="utf-8-sig").read()
    except Exception:
        return 0
    raw = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S)
    raw = re.sub(r"<[^>]+>", "", raw)
    raw = _h.unescape(raw)
    raw = re.sub(r"\s+", "", raw)
    return len(raw)


for 名, 子 in 类目录.items():
    if 子 is None:
        文件s = []
        for d in ["event/ends", "event/badends"]:
            dd = os.path.join(RAW, d.replace("/", os.sep))
            if os.path.isdir(dd):
                文件s += [os.path.join(dd, f) for f in os.listdir(dd) if f.endswith(".md")]
    else:
        dd = os.path.join(RAW, 子.replace("/", os.sep))
        if not os.path.isdir(dd):
            print("  %-22s （目录不存在）" % 名)
            continue
        文件s = []
        for r, _, fs in os.walk(dd):
            文件s += [os.path.join(r, f) for f in fs if f.endswith((".md", ".txt"))]

    字 = sum(正文量(p) for p in 文件s)
    print("  %-22s %4d 个文件   %7.1f 万字符" % (名, len(文件s), 字 / 10000))

print()
print("══ 各目录全量 vs 当前卡内 ══")
gen = json.load(io.open(os.path.join(根, "_work", "_wb_generated", "_index.json"), encoding="utf-8"))
for 类 in ["机制", "事件", "结局", "势力", "人物", "秘籍", "角色"]:
    条 = gen.get(类, {})
    字 = sum(len(v["content"]) for v in 条.values())
    print("  %-6s %4d 条   %7.1f 万字符  平均 %d 字/条" % (类, len(条), 字 / 10000, 字 // max(1, len(条))))

print()
print("══ 全量会是多少 ══")
总数 = 0
for 名, 子 in 类目录.items():
    if 子 is None:
        文件s = []
        for d in ["event/ends", "event/badends"]:
            dd = os.path.join(RAW, d.replace("/", os.sep))
            if os.path.isdir(dd):
                文件s += [os.path.join(dd, f) for f in os.listdir(dd) if f.endswith(".md")]
    else:
        dd = os.path.join(RAW, 子.replace("/", os.sep))
        if not os.path.isdir(dd):
            continue
        文件s = []
        for r, _, fs in os.walk(dd):
            文件s += [os.path.join(r, f) for f in fs if f.endswith((".md", ".txt"))]
    总数 += sum(正文量(p) for p in 文件s)

print("  源素材正文合计 %.1f 万字符" % (总数 / 10000))
print("  当前卡内（世界书+代码表）约 76 万字符")
print()
print("  ★ 关键结论：")
print("     selective 条目**可以放宽截断** —— 提到才进，一次只几条。")
print("     constant 条目**必须继续收** —— 37 条每轮都进。")
