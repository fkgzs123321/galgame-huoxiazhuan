# -*- coding: utf-8 -*-
"""
从《活侠传》游戏资源中提取文本与数据表。
目的：拿到原作的真实数值/技能/物品/角色名，替代网上考据。
"""
import json
import os
import sys
import UnityPy

GAME = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump")
os.makedirs(OUT, exist_ok=True)

targets = [
    os.path.join(GAME, "resources.assets"),
    os.path.join(GAME, "sharedassets0.assets"),
    os.path.join(GAME, "sharedassets1.assets"),
    os.path.join(GAME, "sharedassets2.assets"),
    os.path.join(GAME, "sharedassets3.assets"),
    os.path.join(GAME, "globalgamemanagers.assets"),
]

summary = []
mono_texts = []
text_assets = []
other = {}

for path in targets:
    if not os.path.exists(path):
        print("skip (missing):", path)
        continue
    print("=== loading", os.path.basename(path))
    try:
        env = UnityPy.load(path)
    except Exception as e:
        print("  FAIL load:", e)
        continue

    for obj in env.objects:
        t = obj.type.name
        other[t] = other.get(t, 0) + 1
        try:
            if t == "TextAsset":
                d = obj.read()
                name = getattr(d, "m_Name", None) or getattr(d, "name", "?")
                script = d.m_Script if hasattr(d, "m_Script") else b""
                if isinstance(script, str):
                    text = script
                else:
                    for enc in ("utf-8", "utf-16", "gbk"):
                        try:
                            text = bytes(script).decode(enc)
                            break
                        except Exception:
                            text = None
                    if text is None:
                        text = repr(script)[:200]
                text_assets.append({"file": os.path.basename(path), "name": name, "len": len(text)})
                safe = "".join(c if c.isalnum() or c in "._-一-龥" else "_" for c in str(name))
                with open(os.path.join(OUT, "textasset_%s.txt" % safe), "w", encoding="utf-8") as f:
                    f.write(text)
            elif t == "MonoBehaviour":
                d = obj.read()
                name = getattr(d, "m_Name", None)
                if name:
                    mono_texts.append({"file": os.path.basename(path), "name": name,
                                       "type": getattr(obj, "read_typetree", None) and "mono" or "mono"})
        except Exception as e:
            pass

print()
print("=== 对象类型统计 ===")
for k, v in sorted(other.items(), key=lambda x: -x[1]):
    print("  %-24s %d" % (k, v))

print()
print("=== TextAsset 汇总 (%d 个) ===" % len(text_assets))
for a in sorted(text_assets, key=lambda x: -x["len"])[:60]:
    print("  %8d  %-40s %s" % (a["len"], a["name"], a["file"]))

with open(os.path.join(OUT, "_summary.json"), "w", encoding="utf-8") as f:
    json.dump({"objects": other, "textassets": text_assets, "mono_named": mono_texts[:200]}, f,
              ensure_ascii=False, indent=2)
print()
print("dump 目录:", OUT)
