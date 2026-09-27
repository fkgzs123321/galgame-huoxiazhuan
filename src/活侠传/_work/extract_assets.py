# -*- coding: utf-8 -*-
"""全量解包：把 155 个 Unity bundle 里的贴图全部抽出来。

★ 输出结构：
    _work/_assets/<类别>/<贴图名>.png
  类别从 bundle 名取（background / battle_girl4 / portrait_special01 ...）。

★ 这一步先**不压缩**，原样导出 PNG 并统计总量；
  压缩与转 WebP 是下一步（要按用途定尺寸）。
"""
import io
import json
import os
import re
import sys
import time
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
import UnityPy  # noqa: E402

AA = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\StreamingAssets\aa\StandaloneWindows"
OUT = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work\_assets"

os.makedirs(OUT, exist_ok=True)

bundles = sorted(f for f in os.listdir(AA) if f.endswith(".bundle"))
print("共 %d 个 bundle" % len(bundles))

清单 = defaultdict(list)
总数 = 0
失败 = []
开始 = time.time()

for i, fn in enumerate(bundles, 1):
    类别 = re.sub(r"_assets_all_[0-9a-f]{32}\.bundle$", "", fn)
    p = os.path.join(AA, fn)
    try:
        env = UnityPy.load(p)
    except Exception as e:
        失败.append((fn, str(e)[:80]))
        continue

    n = 0
    for obj in env.objects:
        if obj.type.name != "Texture2D":
            continue
        try:
            d = obj.read()
            名 = d.m_Name
            img = d.image
        except Exception as e:
            失败.append((fn + "/" + str(obj.path_id), str(e)[:60]))
            continue

        目录 = os.path.join(OUT, 类别)
        os.makedirs(目录, exist_ok=True)
        # 名字里可能有 / 之类
        安全 = re.sub(r"[\\/:*?\"<>|]", "_", 名)
        目标 = os.path.join(目录, 安全 + ".png")
        try:
            img.save(目标)
        except Exception as e:
            失败.append((fn + "/" + 名, str(e)[:60]))
            continue

        清单[类别].append({
            "名": 名, "宽": img.width, "高": img.height,
            "文件": os.path.relpath(目标, OUT).replace("\\", "/"),
        })
        n += 1
        总数 += 1

    print("[%3d/%d] %-46s %2d 张  (%.0fs)" % (i, len(bundles), 类别[:44], n, time.time() - 开始))
    sys.stdout.flush()

print()
print("══ 完成 ══")
print("  贴图 %d 张，用时 %.0f 秒" % (总数, time.time() - 开始))
print("  失败 %d 处" % len(失败))
for a, b in 失败[:10]:
    print("    %s → %s" % (a[:52], b))

json.dump(清单, io.open(os.path.join(OUT, "_清单.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

print()
print("══ 按类别 ══")
for k in sorted(清单, key=lambda x: -len(清单[x])):
    xs = 清单[k]
    sz = sum(os.path.getsize(os.path.join(OUT, x["文件"])) for x in xs)
    print("  %-34s %3d 张  %7.1f MB" % (k, len(xs), sz / 1024 / 1024))
