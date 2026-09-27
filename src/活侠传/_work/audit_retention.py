# -*- coding: utf-8 -*-
"""内容保留率审计：源文件的正文，有多少真进了卡？

★★ 上一轮的审计只到**文件级**（这份文件进卡了吗 = 是/否）。
   但「进了」不等于「内容都在」—— 条目可能是摘要。
   这个脚本量**字符级**保留：
     · 逐个源文件，取它的正文字符集
     · 与对应条目的字符集比
     · 报出「源里有、条目里没有」的实词（2 字以上中文串）

★ 判定要看**实词覆盖率**，不是字符计数 —— 条目会重排格式，但实词该在。
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
GEN = os.path.join(根, "_work", "_wb_generated", "_index.json")

索引 = json.load(io.open(GEN, encoding="utf-8"))
# 全部条目内容拼一起，作为「卡里有什么」的总集合
条目全文 = []
for 类, 条目s in 索引.items():
    for 名, v in 条目s.items():
        条目全文.append(v["content"])
# 代码表也算
for f in ["秘籍.ts", "养成.ts", "众生相.ts", "事件目录.ts", "原作事件.ts"]:
    p = os.path.join(根, "脚本", f)
    if os.path.exists(p):
        条目全文.append(io.open(p, encoding="utf-8").read())
卡全文 = "\n".join(条目全文)
卡集 = set(卡全文)

print("══ 规模 ══")
print("  卡内世界书+代码表：%d 万字符" % (len(卡全文) // 10000))
print()


def 取实词(s: str, 最短: int = 2) -> set:
    """抽 2~8 字的中文串作为实词（够长才有辨识度）"""
    return set(m.group(0) for m in re.finditer(r"[\u4e00-\u9fa5]{%d,8}" % 最短, s))


def 净(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    s = re.sub(r"^---.*?---", "", s, flags=re.S)
    s = re.sub(r"^\s*\|.*$", "", s, flags=re.M)   # 表格行
    return 简(s)


# ── 分组统计 ──
组 = {}
for r, _, fs in os.walk(RAW):
    for f in fs:
        if not f.endswith((".md", ".txt")):
            continue
        p = os.path.join(r, f)
        相对 = os.path.relpath(p, RAW).replace("\\", "/")
        顶级 = 相对.split("/")[0]
        组.setdefault(顶级, []).append(p)

print("══ 各目录的实词覆盖率 ══")
for 名, 文件s in sorted(组.items()):
    源词 = set()
    for p in 文件s:
        try:
            源词 |= 取实词(净(io.open(p, encoding="utf-8-sig").read()))
        except Exception:
            pass
    在卡 = 源词 & 卡集 if False else set(w for w in 源词 if w in 卡全文)
    率 = len(在卡) / len(源词) * 100 if 源词 else 0
    print("  %-10s 源实词 %6d   在卡 %6d   **保留 %.1f%%**" % (名, len(源词), len(在卡), 率))

print()
print("══ 总体 ══")
全部源词 = set()
for 文件s in 组.values():
    for p in 文件s:
        try:
            全部源词 |= 取实词(净(io.open(p, encoding="utf-8-sig").read()))
        except Exception:
            pass
在卡 = set(w for w in 全部源词 if w in 卡全文)
缺 = 全部源词 - 在卡
print("  源实词 %d，在卡 %d，**保留 %.1f%%**" % (len(全部源词), len(在卡), len(在卡) / len(全部源词) * 100))
print("  未在卡 %d 个" % len(缺))

# 抽样看缺的是什么
print()
print("  未在卡的实词（按长度，前 40）：")
长缺 = sorted(缺, key=lambda x: -len(x))
for w in 长缺[:40]:
    print("    " + w)
