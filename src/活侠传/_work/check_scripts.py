# -*- coding: utf-8 -*-
"""查 MVU 卡是怎么注册 MVU / Zod 脚本的。"""
import glob
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"E:\Games\写卡\tavern_helper_template\src"

for 名 in ["欲望都市", "旮旯给木-同级生2"]:
    p = os.path.join(ROOT, 名, "tavern-cards-state.json")
    j = json.load(open(p, encoding="utf-8"))
    print("=== %s ===" % 名)

    ex = j.get("extensions", {})
    print("  extensions 键:", list(ex.keys()) if isinstance(ex, dict) else type(ex).__name__)
    # 找脚本清单
    blob = json.dumps(j, ensure_ascii=False)
    for kw in ["MagVarUpdate", "mvu_update", "MagicalAstrogy", "scripts", "tavern_helper", "脚本"]:
        n = blob.count(kw)
        if n:
            print("  含 %-16s %d 次" % (kw, n))

    # 打印 scripts / extensions.scripts
    scr = None
    if isinstance(ex, dict):
        scr = ex.get("scripts") or ex.get("Scripts")
    if scr:
        print("  scripts (%d 个):" % len(scr))
        for s in scr[:8]:
            if isinstance(s, dict):
                print("     name=%s  id=%s  enabled=%s" % (s.get("name"), s.get("id"), s.get("enabled")))
            else:
                print("     ", str(s)[:120])
    else:
        print("  scripts: 无（可能在 avatar/png 里）")
    print()
