# -*- coding: utf-8 -*-
"""诊断：本地立绘目录名 vs wiki 目录名，到底差在哪。"""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
立绘 = os.path.join(根, "_work", "_portraits")

print("══ 本地立绘文件的真实名字（前 8）══")
for fn in sorted(os.listdir(立绘))[:8]:
    print("  %r" % fn)

print()
print("══ 用我的正则拆出来的「目录」══")
for fn in sorted(os.listdir(立绘))[:8]:
    m = re.match(r"^portrait_(.+?)__(.+)\.(png|webp|jpg)$", fn)
    if m:
        print("  %r  → 目录=%r 表情=%r" % (fn, m.group(1), m.group(2)))
    else:
        print("  %r  → ★ 不匹配" % fn)

print()
print("══ wiki 人物页里的 src ══")
p = os.path.join(根, r"source\_raw\wiki\people\characters\girl0.md")
t = open(p, encoding="utf-8-sig").read()
for m in list(re.finditer(r"""src=['"]([^'"]+)['"]""", t))[:5]:
    print("  %s" % m.group(1))

print()
print("══ 我的 wiki 正则能匹配吗 ══")
pat = r"""src=['"]([^'"]*?/images/(?:characters|mobs)/([^/'"]+)/[^'"]+)['"]"""
for m in list(re.finditer(pat, t))[:5]:
    print("  目录=%r" % m.group(2))
if not re.search(pat, t):
    print("  ★ 匹配不到")
