# -*- coding: utf-8 -*-
"""按 MVU 规范补齐三项：
  1. zod 字段
  2. [InitVar]请勿打开 条目（enabled=false）
  3. part 命名 output_format → update_format
"""
import json
import sys
import uuid

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\tavern-cards-state.json"
j = json.load(open(P, encoding="utf-8"))

# ── ① zod 字段 ──
j["zod"] = {
    "scriptName": "Zod",
    "scriptId": str(uuid.uuid4()),
    "schemaPath": "schema.ts",
    "importUrl": "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js",
}

# ── ② part 命名对齐 MVU 规范 ──
mvu = j["entryManifest"].get("MVU", {})
if "变量输出格式" in mvu:
    mvu["变量输出格式"]["part"] = "update_format"

# ── ③ [InitVar]请勿打开 ──
#    ★ 关键：条目名必须是 [InitVar]请勿打开，且 enabled=false
#      —— MVU 靠它识别 initvar，靠 enabled=false 保证不把它塞进 prompt
initvar_path = "世界书/变量/initvar.yaml"
原来的 = mvu.pop("变量初始值", None)
mvu["[InitVar]请勿打开"] = {
    "path": initvar_path,
    "scope": "specific",
    "part": "initvar",
    "keywords": [],
    "abstract": "开局初值：第1年4月，赵活，唐门外姓弟子",
    "enabled": False,
    "position": {"type": "at_depth", "role": "system", "depth": 0, "order": 160},
}

j["entryManifest"]["MVU"] = mvu

json.dump(j, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("已补齐：")
print("  zod.scriptId =", j["zod"]["scriptId"])
print("  MVU 条目：")
for k, v in mvu.items():
    print("    %-18s part=%-14s enabled=%s" % (k, v.get("part"), v.get("enabled", True)))
