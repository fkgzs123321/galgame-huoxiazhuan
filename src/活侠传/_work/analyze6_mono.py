# -*- coding: utf-8 -*-
"""列出 Mortal_Data 里全部 MonoBehaviour 的 (脚本名 -> 数量) 与 ScriptableObject 名称，
寻找 checkpoint / 前置条件 / 时间表的定义表。"""
import os
import sys
from collections import Counter, defaultdict

import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

GAME = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data"
targets = sorted(f for f in os.listdir(GAME) if f.endswith(".assets") or f == "globalgamemanagers")

mono_by_script = Counter()
script_names = {}
samples = defaultdict(list)

for fn in targets:
    path = os.path.join(GAME, fn)
    print("=== loading %s" % fn, flush=True)
    try:
        env = UnityPy.load(path)
    except Exception as e:
        print("  FAIL:", e)
        continue
    for obj in env.objects:
        if obj.type.name == "MonoScript":
            try:
                d = obj.read()
                script_names[obj.assets_file.externals and 0 or 0] = None
                script_names[obj.path_id] = (d.m_ClassName, getattr(d, "m_Namespace", ""), d.m_AssemblyName)
            except Exception:
                pass
        elif obj.type.name == "MonoBehaviour":
            try:
                d = obj.read()
                m = d.m_Script
                key = None
                if m is not None:
                    key = (getattr(m, "m_ClassName", None) or
                           getattr(getattr(m, "read", lambda: None)(), "m_ClassName", None))
                if key is None:
                    key = "pid:%s" % getattr(d, "m_Script", None)
                if isinstance(key, tuple):
                    key = key[0]
                mono_by_script[key] += 1
            except Exception as e:
                mono_by_script["<err:%s>" % type(e).__name__] += 1

print()
print("=== MonoBehaviour 归属脚本统计 ===")
for k, v in mono_by_script.most_common(120):
    print("  %-60s %6d" % (k, v))

print()
print("=== MonoScript 类名（去重）===")
for pid, v in sorted(script_names.items(), key=lambda x: str(x[1])):
    print("  ", v)
