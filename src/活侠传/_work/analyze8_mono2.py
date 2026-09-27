# -*- coding: utf-8 -*-
"""定位 MonoBehaviour 中属于 Mortal.* 程序集的实例，并 dump 其字段，寻找 checkpoint / 时间表数据。

要点：MonoBehaviour.m_Script 是指向 MonoScript 的 PPtr；UnityPy 的 read_typetree 可以直接读原始
typetree，从而避免 m_Script 解析失败。
"""
import os
import sys
from collections import Counter, defaultdict

import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

GAME = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data"
targets = sorted(f for f in os.listdir(GAME) if f.endswith(".assets") or f == "globalgamemanagers")

WANT = ["Mortal.Core", "Mortal.Story", "Mortal.Free", "Assembly-CSharp"]

report = []
hit_classes = Counter()
samples = defaultdict(list)

for fn in targets:
    path = os.path.join(GAME, fn)
    print("=== %s" % fn, flush=True)
    try:
        env = UnityPy.load(path)
    except Exception as e:
        print("  FAIL", e)
        continue

    # 1) 建立 MonoScript path_id -> (ns, class, asm)
    pid2script = {}
    for obj in env.objects:
        if obj.type.name != "MonoScript":
            continue
        try:
            d = obj.read()
            pid2script[obj.path_id] = (getattr(d, "m_Namespace", "") or "",
                                       getattr(d, "m_ClassName", "") or "",
                                       getattr(d, "m_AssemblyName", "") or "")
        except Exception:
            pass

    # 2) 遍历 MonoBehaviour，读 typetree，解析 m_Script
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
        info = pid2script.get(pid)
        if fid != 0 or info is None:
            continue
        ns, cls, asm = info
        if not any(w in asm for w in WANT):
            continue
        key = "%s.%s (%s)" % (ns, cls, asm)
        hit_classes[key] += 1
        if len(samples[key]) < 3:
            samples[key].append((fn, pid, tree))

print()
print("=" * 78)
print("=== 属于 Mortal.*/Assembly-CSharp 的 MonoBehaviour 实例 ===")
for k, v in hit_classes.most_common():
    print("  %-56s %5d" % (k, v))

print()
print("=" * 78)
print("=== 样例字段（每类最多 2 个）===")
for k, lst in sorted(samples.items()):
    print("-" * 70)
    print("### " + k)
    for fn, pid, tree in lst[:2]:
        print("  [%s pid=%s]" % (fn, pid))
        for kk, vv in tree.items():
            if kk in ("m_GameObject", "m_Script", "m_ObjectHideFlags", "m_CorrespondingSourceObject", "m_PrefabInstance", "m_PrefabAsset", "m_EditorHideFlags", "m_Name", "m_EditorClassIdentifier"):
                continue
            s = repr(vv)
            if len(s) > 400:
                s = s[:400] + " ...(截断)"
            print("      %-28s = %s" % (kk, s))
