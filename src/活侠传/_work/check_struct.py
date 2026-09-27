# -*- coding: utf-8 -*-
"""看清产物真实结构 —— 上次读错层级了。"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\活侠传.json"
j = json.load(open(P, encoding="utf-8"))

print("=== 顶层键 ===")
for k, v in j.items():
    t = type(v).__name__
    n = len(v) if isinstance(v, (list, dict, str)) else ""
    print("  %-24s %-8s %s" % (k, t, n))

print()
print("=== data 层（若存在）===")
if "data" in j:
    d = j["data"]
    for k, v in d.items():
        t = type(v).__name__
        n = len(v) if isinstance(v, (list, dict, str)) else ""
        print("  %-24s %-8s %s" % (k, t, n))
    cb = d.get("character_book")
    if isinstance(cb, dict):
        print("  世界书条目:", len(cb.get("entries", [])))
    alt = d.get("alternate_greetings")
    print("  alternate_greetings:", len(alt) if isinstance(alt, list) else alt)
    ex = d.get("extensions", {})
    print("  extensions 键:", list(ex.keys()) if isinstance(ex, dict) else ex)

print()
print("=== 对比参照卡产物结构（欲望都市.json）===")
import os
p2 = r"E:\Games\写卡\tavern_helper_template\src\欲望都市\欲望都市.json"
if os.path.exists(p2):
    j2 = json.load(open(p2, encoding="utf-8"))
    print("  顶层键:", list(j2.keys())[:14])
    if "data" in j2:
        print("  data 键:", list(j2["data"].keys())[:14])
