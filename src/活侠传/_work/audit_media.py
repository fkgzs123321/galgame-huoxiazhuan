# -*- coding: utf-8 -*-
"""盘点界面可用的素材：图片、地图、立绘、战斗 UI。"""
import io
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"

print("══ ① 项目里现有的图片文件 ══")
图 = []
for r, _, fs in os.walk(根):
    if "node_modules" in r:
        continue
    for f in fs:
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
            图.append(os.path.join(r, f))
for p in 图:
    print("  %8d KB  %s" % (os.path.getsize(p) // 1024,
                           os.path.relpath(p, 根)))
print("  共 %d 个" % len(图))

print()
print("══ ② wiki 里引用的图片（按目录归类）══")
c = Counter()
总引用 = 0
for r, _, fs in os.walk(os.path.join(根, "source", "_raw", "wiki")):
    for f in fs:
        if not f.endswith(".md"):
            continue
        try:
            t = io.open(os.path.join(r, f), encoding="utf-8-sig").read()
        except Exception:
            continue
        for m in re.finditer(r"""src=['"]([^'"]+)['"]""", t):
            p = m.group(1)
            d = os.path.dirname(p)
            c[d] += 1
            总引用 += 1
print("  共引用 %d 次" % 总引用)
for k, n in c.most_common(20):
    print("    %-52s %4d 张" % (k[:50], n))

print()
print("══ ③ 图片是否在本地 ══")
# 引用形如 /images/characters/brother1/normal.webp 或 /LoM-wiki/images/...
样例 = []
for r, _, fs in os.walk(os.path.join(根, "source", "_raw", "wiki")):
    for f in fs:
        if not f.endswith(".md"):
            continue
        try:
            t = io.open(os.path.join(r, f), encoding="utf-8-sig").read()
        except Exception:
            continue
        for m in re.finditer(r"""src=['"]([^'"]+)['"]""", t):
            样例.append(m.group(1))
            if len(样例) >= 5:
                break
        if len(样例) >= 5:
            break
    if len(样例) >= 5:
        break
for s in 样例:
    print("  引用: %s" % s)
    # 试几个可能的位置
    for 试 in [
        os.path.join(根, s.lstrip("/")),
        os.path.join(根, "source", s.lstrip("/")),
        os.path.join(根, "source", "_raw", s.lstrip("/")),
    ]:
        if os.path.exists(试):
            print("       ✓ 本地有: %s" % os.path.relpath(试, 根))
            break
    else:
        print("       ★ 本地没有")

print()
print("══ ④ source 下有没有 images 之类目录 ══")
for r, ds, fs in os.walk(os.path.join(根, "source")):
    for d in ds:
        if d.lower() in ("images", "img", "assets", "static", "pic", "pics"):
            p = os.path.join(r, d)
            n = sum(len(f) for _, _, f in os.walk(p))
            print("  %s  （%d 个文件）" % (os.path.relpath(p, 根), n))
