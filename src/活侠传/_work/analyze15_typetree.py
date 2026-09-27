# -*- coding: utf-8 -*-
"""为 MonoBehaviour 生成 TypeTree，从而可以在缺少 typetree 的构建里读取脚本字段。

尝试多种路径：
 1. 各 assets 文件里可能存在 typeTree 已内嵌的 MonoBehaviour（含 m_TypeTree 的 MonoBehaviour 变体）
 2. 若存在 Unity 的 il2cpp/global-metadata，可用 TypeTreeGenerator 从 DLL 生成
这里先只做「枚举 MonoBehaviour 的 raw 数据形态」，确认字段究竟如何存放。
"""
import os
import sys
from collections import Counter

import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

GAME = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data"
files = sorted([f for f in os.listdir(GAME) if f.endswith(".assets") or f == "globalgamemanagers"])

for fn in files:
    try:
        env = UnityPy.load(os.path.join(GAME, fn))
    except Exception as e:
        print("fail", fn, e)
        continue
    monos = [o for o in env.objects if o.type.name == "MonoBehaviour"]
    if not monos:
        continue
    sizes = Counter()
    ok = 0
    for o in monos:
        try:
            o.read_typetree()
            ok += 1
        except Exception:
            pass
        try:
            sizes[len(o.get_raw_data())] += 1
        except Exception:
            pass
    print("%-28s MonoBehaviour=%5d  可读typetree=%5d  唯一raw长度=%d" %
          (fn, len(monos), ok, len(sizes)))
