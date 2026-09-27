# -*- coding: utf-8 -*-
"""对比 MVP 卡（欲望都市）与我的卡，找出 MVU 相关字段的差别。"""
import glob
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"E:\Games\写卡\tavern_helper_template\src"


def 摘要(名, p):
    j = json.load(open(p, encoding="utf-8"))
    print("=== %s ===" % 名)
    print("  mvu:", j.get("mvu"))
    print("  zod 字段:", "有" if j.get("zod") else "无")
    if j.get("zod"):
        z = j["zod"]
        print("    zod 内容:", json.dumps(z, ensure_ascii=False)[:300])
    # 找 MVU / InitVar 相关条目
    for g, items in j.get("entryManifest", {}).items():
        for k, v in items.items():
            blob = json.dumps(v, ensure_ascii=False)
            if "InitVar" in blob or "initvar" in blob.lower() or "MagVar" in blob:
                print("  [%s] %s" % (g, k))
                print("     ", blob[:280])
    # 脚本
    print("  其他顶层键:", [k for k in j.keys() if k not in
          ("projectName", "worldbookName", "form", "mvu", "entryManifest", "typeLists",
           "strategyThresholds", "partOrder", "depth_defaults", "description",
           "first_messages", "creator", "creator_notes", "version", "create_date")])


for 名 in ["欲望都市", "旮旯给木-同级生2"]:
    p = os.path.join(ROOT, 名, "tavern-cards-state.json")
    if os.path.exists(p):
        摘要(名, p)
        print()

print("=== 我的卡 ===")
p = os.path.join(ROOT, "活侠传", "tavern-cards-state.json")
j = json.load(open(p, encoding="utf-8"))
print("  mvu:", j.get("mvu"))
print("  全部顶层键:", list(j.keys()))
