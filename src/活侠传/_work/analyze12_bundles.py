# -*- coding: utf-8 -*-
"""扫描 Addressables bundles，找出 CheckPoint 相关的 ScriptableObject 资产并导出。"""
import json
import os
import sys

import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

AA = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\StreamingAssets\aa\StandaloneWindows"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bundle_dump")
os.makedirs(OUT, exist_ok=True)

bundles = sorted(f for f in os.listdir(AA) if f.endswith(".bundle"))
print("bundle 数: %d" % len(bundles), flush=True)

WANT = ("Mortal", "Assembly-CSharp")
found = {}
script_map = {}
all_objs = 0

for i, bn in enumerate(bundles):
    p = os.path.join(AA, bn)
    try:
        env = UnityPy.load(p)
    except Exception as e:
        print("  fail %s: %r" % (bn, e))
        continue
    local_scripts = {}
    monos = []
    for obj in env.objects:
        all_objs += 1
        if obj.type.name == "MonoScript":
            try:
                d = obj.read()
                local_scripts[obj.path_id] = (getattr(d, "m_Namespace", "") or "",
                                              getattr(d, "m_ClassName", "") or "",
                                              getattr(d, "m_AssemblyName", "") or "")
            except Exception:
                pass
        elif obj.type.name == "MonoBehaviour":
            monos.append(obj)
    for obj in monos:
        try:
            tree = obj.read_typetree()
        except Exception:
            continue
        scr = tree.get("m_Script")
        if not isinstance(scr, dict):
            continue
        fid = scr.get("m_FileID", 0)
        pid = scr.get("m_PathID", 0)
        info = None
        if fid == 0:
            info = local_scripts.get(pid)
        if info is None:
            # 外部引用到其它 bundle 时，用全局表（后续补充）
            info = script_map.get(pid)
        if not info:
            continue
        ns, cls, asm = info
        if not any(w in asm for w in WANT):
            continue
        key = "%s.%s" % (ns, cls)
        found.setdefault(key, []).append((bn, obj.path_id, tree))
    # 补全全局 script_map（近似：pid 唯一性不一定成立，仅作兜底）
    for pid, info in local_scripts.items():
        script_map.setdefault(pid, info)
    if (i + 1) % 20 == 0:
        print("  ...%d/%d" % (i + 1, len(bundles)), flush=True)

print()
print("=== bundle 中的游戏类型资产 ===")
for k, v in sorted(found.items(), key=lambda x: -len(x[1])):
    print("  %-52s %5d" % (k, len(v)))

for k, v in found.items():
    safe = k.replace(".", "_")
    with open(os.path.join(OUT, safe + ".json"), "w", encoding="utf-8") as f:
        json.dump([{"bundle": a, "path_id": b, "tree": c} for a, b, c in v], f,
                  ensure_ascii=False, indent=1)
print("已写出到", OUT)
