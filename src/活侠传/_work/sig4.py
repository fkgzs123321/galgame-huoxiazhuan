# -*- coding: utf-8 -*-
"""看 fight() 到底返回什么字段 —— summarize 读的 原我方/原对方 可能不存在。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

F = r"E:\Games\写卡\tavern_helper_template\src\活侠传\脚本\引擎.js"
c = open(F, encoding="utf-8").read()

# fight 的 return
m = re.search(r"this\.fight\s*=\s*function[\s\S]*?\n\};", c)
if m:
    body = m.group(0)
    r = re.search(r"return\s*\{[\s\S]*?\n  \};", body)
    print("── fight 的 return ──")
    print(r.group(0) if r else "（未匹配到 return）")
    print()

# summarize 读了哪些字段
m2 = re.search(r"this\.summarize\s*=\s*function[\s\S]*?\n\};", c)
if m2:
    body2 = m2.group(0)
    print("── summarize 读取的字段 ──")
    for mm in re.finditer(r"r\.(\w+)", body2):
        print("  r.%s" % mm.group(1))
    print()

# 受伤档
m3 = re.search(r"this\.受伤档\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?\n\};", c)
if m3:
    print("── 受伤档 ──")
    print(m3.group(0)[:500])
