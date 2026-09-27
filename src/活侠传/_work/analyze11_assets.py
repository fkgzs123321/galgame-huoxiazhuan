# -*- coding: utf-8 -*-
"""跨文件解析 MonoBehaviour.m_Script（含外部引用），找出 MissionCheckData / ConditionResultConfig /
SwitchResultConfig 等 ScriptableObject 资产，并 dump 其字段 —— 这是「前置要求表」的原始数据。"""
import json
import os
import sys

import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

GAME = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "asset_dump")
os.makedirs(OUT, exist_ok=True)

files = sorted([f for f in os.listdir(GAME) if f.endswith(".assets") or f == "globalgamemanagers"])
WANT = ("Mortal", "Assembly-CSharp")

envs = {}
print("加载中 ...", flush=True)
for fn in files:
    try:
        envs[fn] = UnityPy.load(os.path.join(GAME, fn))
        print("  ok", fn, flush=True)
    except Exception as e:
        print("  fail", fn, e)

# 1) 全局 MonoScript 映射: (文件名, path_id) -> (ns, cls, asm)
scripts = {}
for fn, env in envs.items():
    for obj in env.objects:
        if obj.type.name != "MonoScript":
            continue
        try:
            d = obj.read()
            scripts[(fn, obj.path_id)] = (
                getattr(d, "m_Namespace", "") or "",
                getattr(d, "m_ClassName", "") or "",
                getattr(d, "m_AssemblyName", "") or "",
            )
        except Exception:
            pass
print("MonoScript 总数: %d" % len(scripts))

# 2) 建立 externals 解析：assets_file.externals[i-1].path
buckets = {}
for fn, env in envs.items():
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        try:
            tree = obj.read_typetree()
        except Exception:
            continue
        scr = tree.get("m_Script")
        if not isinstance(scr, dict):
            continue
        fid = scr.get("m_FileID", 0)
        pid = scr.get("m_PathID", 0)
        if fid == 0:
            info = scripts.get((fn, pid))
        else:
            try:
                ext = obj.assets_file.externals[fid - 1].path
            except Exception:
                continue
            base = os.path.basename(ext)
            info = scripts.get((base, pid))
        if not info:
            continue
        ns, cls, asm = info
        if not any(w in asm for w in WANT):
            continue
        key = "%s.%s" % (ns, cls)
        buckets.setdefault(key, []).append((fn, obj.path_id, tree))

print()
print("=== 找到的游戏类型资产 ===")
for k, v in sorted(buckets.items(), key=lambda x: -len(x[1])):
    print("  %-50s %5d" % (k, len(v)))

# 3) 全量写盘
for k, v in buckets.items():
    safe = k.replace(".", "_")
    with open(os.path.join(OUT, safe + ".json"), "w", encoding="utf-8") as f:
        json.dump([{"file": a, "path_id": b, "tree": c} for a, b, c in v], f,
                  ensure_ascii=False, indent=1)
print()
print("已写出 %d 个 json 到 %s" % (len(buckets), OUT))
