# -*- coding: utf-8 -*-
"""查 first_messages 在 state.json 里的格式，以及哪些卡用过。"""
import glob
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"E:\Games\写卡\tavern_helper_template"

print("=== 各卡 first_messages 条数 ===")
for p in glob.glob(os.path.join(ROOT, "src", "**", "tavern-cards-state.json"), recursive=True):
    try:
        j = json.load(open(p, encoding="utf-8"))
    except Exception as e:
        print("  [读失败]", p, e)
        continue
    fm = j.get("first_messages", [])
    name = os.path.basename(os.path.dirname(p))
    print("  %-28s %d 条" % (name, len(fm)))
    if fm:
        print("     样例:", json.dumps(fm[0], ensure_ascii=False)[:400])

print()
print("=== 类型定义 references/type/state.ts ===")
for p in glob.glob(os.path.join(ROOT, "_tc_repo", "**", "state.ts"), recursive=True):
    print("  文件:", p)
    txt = open(p, encoding="utf-8", errors="ignore").read()
    m = re.search(r"first_messages[\s\S]{0,900}", txt)
    if m:
        print(m.group(0)[:900])
    break
