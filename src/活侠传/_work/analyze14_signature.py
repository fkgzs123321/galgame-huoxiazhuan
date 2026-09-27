# -*- coding: utf-8 -*-
"""不依赖 m_Script 解析：直接按 typetree 字段名特征识别 ScriptableObject 配置表。

MissionCheckData 特征字段: _timeCheckType / _specificTime / _startScript / _nextStateName
ConditionResultConfig 特征: 需先看实际字段
"""
import json
import os
import sys

import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

GAME = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "asset_dump2")
os.makedirs(OUT, exist_ok=True)

SIGNATURES = {
    "MissionCheckData": {"_timeCheckType", "_specificTime", "_startScript"},
    "GameTimeData": {"GameTime"},
    "MissionData": {"_currentKey", "_initKey", "_missions"},
    "GameTimeDataCollection": {"_defaultTime"},
    "SubMissionsData": {"_subMissions"},
    "PlayerStatManagerData": {"_gameTimeData", "_stats"},
}

files = sorted([f for f in os.listdir(GAME) if f.endswith(".assets") or f == "globalgamemanagers"])
buckets = {}

for fn in files:
    try:
        env = UnityPy.load(os.path.join(GAME, fn))
    except Exception as e:
        print("fail", fn, e)
        continue
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        try:
            tree = obj.read_typetree()
        except Exception:
            continue
        keys = set(tree.keys())
        for label, sig in SIGNATURES.items():
            if sig <= keys:
                buckets.setdefault(label, []).append((fn, obj.path_id, tree))
                break

print("=== 按字段特征识别到的资产 ===")
for k, v in sorted(buckets.items(), key=lambda x: -len(x[1])):
    print("  %-30s %5d" % (k, len(v)))

for k, v in buckets.items():
    with open(os.path.join(OUT, k + ".json"), "w", encoding="utf-8") as f:
        json.dump([{"file": a, "path_id": b, "tree": c} for a, b, c in v],
                  f, ensure_ascii=False, indent=1, default=str)
print("写出到", OUT)
