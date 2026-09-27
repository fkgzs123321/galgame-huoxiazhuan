# -*- coding: utf-8 -*-
"""提取原作女角立绘，作为「原作如何描绘这些角色」的直接证据。

方法：对同一批角色（含已确认成年的对照组）提取立绘，横向比较体型描绘，
避免只看单人时的主观判断。
"""
import glob
import os
import sys

import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

AA = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\StreamingAssets\aa\StandaloneWindows"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_portraits")
os.makedirs(OUT, exist_ok=True)

# 关注的对象 + 对照组
PATTERNS = [
    "portrait_girl*", "portrait_sister*", "portrait_blacksmith*",
    "portrait_female*", "portrait_child*", "portrait_women*",
    "portrait_ranger*", "portrait_artist*", "portrait_dio*",
]

files = []
for pat in PATTERNS:
    files.extend(glob.glob(os.path.join(AA, pat + ".bundle")))
files = sorted(set(files))
print("找到 %d 个立绘 bundle\n" % len(files))

manifest = []
for fp in files:
    base = os.path.basename(fp)
    tag = base.split("_assets_all")[0]
    try:
        env = UnityPy.load(fp)
    except Exception as e:
        print("  [load fail] %s : %s" % (tag, e))
        continue

    n = 0
    for obj in env.objects:
        if obj.type.name not in ("Texture2D", "Sprite"):
            continue
        try:
            d = obj.read()
            name = getattr(d, "m_Name", None) or getattr(d, "name", "?")
            img = d.image
        except Exception:
            continue
        if img is None or img.width < 80 or img.height < 80:
            continue
        safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in "%s__%s" % (tag, name))
        p = os.path.join(OUT, safe + ".png")
        try:
            img.save(p)
        except Exception:
            continue
        manifest.append((tag, name, img.width, img.height, os.path.basename(p)))
        n += 1
        if n >= 6:
            break

print("%-34s %-26s %s" % ("BUNDLE", "SPRITE", "SIZE"))
for tag, name, w, h, fn in sorted(manifest):
    print("%-34s %-26s %dx%d" % (tag[:34], str(name)[:26], w, h))

print("\n共导出 %d 张 -> %s" % (len(manifest), OUT))
