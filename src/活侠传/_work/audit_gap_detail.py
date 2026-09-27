# -*- coding: utf-8 -*-
"""定位保留率的真实缺口：哪些源文件的实词没进卡。"""
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

gen = json.load(io.open(GEN, encoding="utf-8"))
卡 = []
for 类, 条 in gen.items():
    for v in 条.values():
        卡.append(v["content"])
for f in ["秘籍.ts", "养成.ts", "众生相.ts", "事件目录.ts", "原作事件.ts"]:
    p = os.path.join(根, "脚本", f)
    if os.path.exists(p):
        卡.append(io.open(p, encoding="utf-8").read())
卡文 = "\n".join(卡)


def 净(s: str) -> str:
    s = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    return 简(s)


def 实词(s: str) -> set:
    return set(m.group(0) for m in re.finditer(r"[\u4e00-\u9fa5]{2,8}", s))


行 = []
for r, _, fs in os.walk(RAW):
    for f in fs:
        if not f.endswith((".md", ".txt")):
            continue
        p = os.path.join(r, f)
        相对 = os.path.relpath(p, RAW).replace("\\", "/")
        try:
            词 = 实词(净(io.open(p, encoding="utf-8-sig").read()))
        except Exception:
            continue
        if not 词:
            continue
        在 = set(w for w in 词 if w in 卡文)
        率 = len(在) / len(词)
        行.append((率, 相对, len(词), len(词) - len(在)))

行.sort()
print("══ 保留率最低的 30 个文件 ══")
print("  保留率   源实词   缺   文件")
for 率, 相对, 总, 缺 in 行[:30]:
    print("  %5.1f%%  %6d  %5d   %s" % (率 * 100, 总, 缺, 相对[:62]))

print()
print("══ 按目录看平均保留率 ══")
from collections import defaultdict

组 = defaultdict(list)
for 率, 相对, 总, 缺 in 行:
    d = os.path.dirname(相对) or "（根）"
    组[d].append((率, 总, 缺))

for d, xs in sorted(组.items(), key=lambda kv: sum(x[0] for x in kv[1]) / len(kv[1])):
    率 = sum(x[0] for x in xs) / len(xs)
    总 = sum(x[1] for x in xs)
    缺 = sum(x[2] for x in xs)
    print("  %5.1f%%  文件 %3d   源实词 %6d   缺 %6d   %s" % (率 * 100, len(xs), 总, 缺, d[:44]))
