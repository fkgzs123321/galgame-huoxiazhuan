# -*- coding: utf-8 -*-
"""探一个 bundle：里面有哪些对象、贴图长什么样。"""
import io
import os
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
import UnityPy  # noqa: E402

AA = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\StreamingAssets\aa\StandaloneWindows"

p = os.path.join(AA, [f for f in os.listdir(AA) if f.startswith("background_01")][0])
print("文件: %s  （%.2f MB）" % (os.path.basename(p), os.path.getsize(p) / 1024 / 1024))

env = UnityPy.load(p)
c = Counter()
贴图s = []
for obj in env.objects:
    c[obj.type.name] += 1
    if obj.type.name == "Texture2D":
        贴图s.append(obj)

print()
print("对象类型:")
for k, n in c.most_common():
    print("  %-22s %d" % (k, n))

print()
print("Texture2D %d 个：" % len(贴图s))
for o in 贴图s[:10]:
    try:
        d = o.read()
        print("    %-40s %sx%s  fmt=%s" % (
            d.m_Name[:38], getattr(d, "m_Width", "?"), getattr(d, "m_Height", "?"),
            getattr(d, "m_TextureFormat", "?")))
    except Exception as e:
        print("    ★ 读失败: %s" % e)
