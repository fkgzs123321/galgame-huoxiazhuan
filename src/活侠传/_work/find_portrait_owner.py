# -*- coding: utf-8 -*-
"""补齐没对上的 11 个立绘目录。

★ 它们对不上是因为 wiki 里那些页用的**不是** /images/characters/<目录>/
  这个路径前缀，而是 /images/mobs/... 或干脆没在人物页里出现。
  逐个查这些目录名在 wiki 里出现过没有，再人工判定。
"""
import io
import json
import os
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
素材 = os.path.join(根, r"source\_raw\wiki")

待查 = ["artist", "blacksmith", "child", "dio", "female",
       "girl_04_01", "girl_07_01", "girl_09", "ranger", "sister", "women"]

print("══ 这些目录名在 wiki 里哪出现过 ══")
命中 = defaultdict(list)
for r, _, fs in os.walk(素材):
    for f in fs:
        if not f.endswith(".md"):
            continue
        p = os.path.join(r, f)
        try:
            t = io.open(p, encoding="utf-8-sig").read()
        except Exception:
            continue
        for d in 待查:
            if f"/{d}/" in t:
                命中[d].append(os.path.relpath(p, 素材).replace("\\", "/"))

for d in 待查:
    xs = 命中.get(d, [])
    print("  %-14s %d 处  %s" % (d, len(xs), "、".join(x[:34] for x in xs[:3]) if xs else "（wiki 里没有）"))

print()
print("══ 取每个目录的第一处上下文（看是哪个角色） ══")
for d in 待查:
    for r, _, fs in os.walk(素材):
        for f in fs:
            if not f.endswith(".md"):
                continue
            p = os.path.join(r, f)
            try:
                t = io.open(p, encoding="utf-8-sig").read()
            except Exception:
                continue
            i = t.find(f"/{d}/")
            if i < 0:
                continue
            tm = re.search(r"^title:\s*(.+?)\s*$", t, re.M)
            标题 = tm.group(1).strip() if tm else f
            # 往前找最近的 <ChTab title= 或 <ChName nameZh=
            head = t[:i]
            tbt = re.findall(r'ChTab title="([^"]+)"', head)
            nm = re.findall(r"nameZh='([^']+)'|nameZh=\"([^\"]+)\"", head)
            print("  %-14s 标题=%-14s 标签=%s 名=%s" % (
                d, 标题[:12],
                (tbt[-1] if tbt else "-"),
                (nm[-1][0] or nm[-1][1]) if nm else "-"))
            break
        else:
            continue
        break
