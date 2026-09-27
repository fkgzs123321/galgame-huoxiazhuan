# -*- coding: utf-8 -*-
"""核对打包产物。"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\活侠传.json"
j = json.load(open(P, encoding="utf-8"))

print("=== 角色卡字段 ===")
for k in ["name", "description", "personality", "scenario", "creator", "creatorcomment", "version"]:
    v = j.get(k, "")
    print("  %-16s %s" % (k, (str(v)[:90] + "…") if len(str(v)) > 90 else v))

print("\n=== 开场白 ===")
print("  first_mes 长度:", len(j.get("first_mes", "")))
alt = j.get("alternate_greetings", [])
print("  alternate_greetings:", len(alt), "条")
for i, a in enumerate(alt):
    print("    [%d] %d 字" % (i + 1, len(a)))

print("\n=== 世界书 ===")
cb = j.get("character_book", {})
ents = cb.get("entries", [])
print("  条目数:", len(ents))
常数 = sum(1 for e in ents if e.get("constant"))
print("  constant:", 常数, " / selective:", len(ents) - 常数)
print("  条目名（前 30）:")
for e in ents[:30]:
    print("    %-24s order=%-5s const=%s" % (e.get("comment", "?")[:24], e.get("insertion_order"), e.get("constant")))

print("\n=== 扩展 ===")
ex = j.get("extensions", {})
print("  extensions 键:", list(ex.keys()))
th = ex.get("tavern_helper")
if isinstance(th, dict):
    print("  tavern_helper 键:", list(th.keys()))
    scr = th.get("scripts")
    print("  scripts 类型:", type(scr).__name__)
    if isinstance(scr, dict):
        for k, v in scr.items():
            print("    %-8s %s" % (k, v.get("script_file") if isinstance(v, dict) else str(v)[:60]))
    elif isinstance(scr, list):
        for s in scr:
            if isinstance(s, dict):
                print("    %-12s %s" % (s.get("name"), s.get("script_file", "")))
elif isinstance(th, list):
    print("  tavern_helper 是 list，%d 项" % len(th))
