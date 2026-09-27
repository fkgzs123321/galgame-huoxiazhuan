# -*- coding: utf-8 -*-
"""核对 tavern_helper 脚本与 MVU 相关字段。"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\活侠传.json"
j = json.load(open(P, encoding="utf-8"))
d = j["data"]
ex = d["extensions"]

print("=== extensions.tavern_helper ===")
th = ex.get("tavern_helper", {})
print("  类型:", type(th).__name__)
if isinstance(th, dict):
    for k in th.keys():
        print("  键:", k)
    scr = th.get("scripts")
    if isinstance(scr, dict):
        print("  scripts (%d):" % len(scr))
        for name, v in scr.items():
            if isinstance(v, dict):
                print("    %-10s %-22s enabled=%s" % (name, v.get("script_file"), v.get("enabled")))
    elif isinstance(scr, list):
        print("  scripts list (%d):" % len(scr))
        for s in scr:
            if isinstance(s, dict):
                print("    %-12s %s" % (s.get("name"), s.get("script_file")))
            else:
                print("    ", str(s)[:80])

print()
print("=== avatar 字段 ===")
print("  顶层 avatar:", repr(j.get("avatar")))

print()
print("=== depth_prompt ===")
print(" ", json.dumps(ex.get("depth_prompt"), ensure_ascii=False)[:200])

print()
print("=== 世界书前 8 条 ===")
for e in d["character_book"]["entries"][:8]:
    print("  %-22s order=%-6s const=%-6s keys=%s" % (
        str(e.get("comment"))[:22], e.get("insertion_order"), e.get("constant"),
        (e.get("keys") or [])[:2]))
