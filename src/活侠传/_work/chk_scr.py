# -*- coding: utf-8 -*-
"""看清打包后脚本的真实字段（script_file 可能被内联为 content）。"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\活侠传.json"
j = json.load(open(P, encoding="utf-8"))
scr = j["data"]["extensions"]["tavern_helper"]["scripts"]

print("scripts 类型:", type(scr).__name__, " 长度:", len(scr))
print()
for s in scr:
    print("───── 一项 ─────")
    if isinstance(s, dict):
        for k, v in s.items():
            if k == "content" and isinstance(v, str):
                print("  content: %d 字符  %r" % (len(v), v[:120]))
            else:
                print("  %-14s %s" % (k, json.dumps(v, ensure_ascii=False)[:160] if not isinstance(v, str) else v[:160]))
    else:
        print("  ", str(s)[:200])
    print()
