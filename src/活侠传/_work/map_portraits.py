# -*- coding: utf-8 -*-
"""把立绘文件对到角色上。

★ 素材现状：
   _work/_portraits/ 有 84 张立绘（55.6 MB），文件名形如
     portrait_girl_02__gloomy2.png
     portrait_sister__normal.png
   `__` 前是**目录名**（对应 wiki 里的 /images/characters/<目录>/），
   `__` 后是**表情/姿态**。

★ 要对上角色，得读 wiki 人物页里的 src= 路径 ——
  那才是官方给的「这个目录是哪个角色」。
"""
import io
import json
import os
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
素材 = os.path.join(根, r"source\_raw\wiki")
立绘目录 = os.path.join(根, "_work", "_portraits")

# ── ① 从 wiki 人物页读「目录 → 角色名」 ──
目录到角色 = {}
for 子 in ["people/characters", "people/mobs"]:
    d = os.path.join(素材, 子.replace("/", os.sep))
    if not os.path.isdir(d):
        continue
    for r, _, fs in os.walk(d):
        for fn in fs:
            if not fn.endswith(".md"):
                continue
            p = os.path.join(r, fn)
            try:
                t = io.open(p, encoding="utf-8-sig").read()
            except Exception:
                continue
            tm = re.search(r"^title:\s*(.+?)\s*$", t, re.M)
            名 = 简(tm.group(1)) if tm else 简(fn[:-3])
            for m in re.finditer(r"""src=['"]([^'"]*?/images/(?:characters|mobs)/([^/'"]+)/[^'"]+)['"]""", t):
                目录 = m.group(2)
                目录到角色.setdefault(目录, 名)

print("══ wiki 里出现的立绘目录 → 角色 ══")
for 目录, 名 in sorted(目录到角色.items()):
    print("  %-18s → %s" % (目录, 名))

# ── ② 盘点本地立绘 ──
本地 = defaultdict(list)
for fn in sorted(os.listdir(立绘目录)):
    if not fn.lower().endswith((".png", ".webp", ".jpg")):
        continue
    m = re.match(r"^portrait_(.+?)__(.+)\.(png|webp|jpg)$", fn)
    if not m:
        本地["（未识别）"].append(fn)
        continue
    本地[m.group(1)].append({"文件": fn, "表情": m.group(2)})

print()
print("══ 本地立绘目录 → 张数 ══")
for 目录, xs in sorted(本地.items(), key=lambda kv: -len(kv[1])):
    名 = 目录到角色.get(目录, "？")
    print("  %-18s %2d 张  → %s" % (目录, len(xs), 名))

# ── ③ 存成映射，给界面用 ──
#
# ★★ 本地文件名与 wiki 目录名的**编号规则不同**，要归一化才对吧：
#     本地 portrait_girl_08__normal.png  → 目录 `girl_08`（补了前导零）
#     wiki   /images/characters/girl_8/  → 目录 `girl_8` （一位数）
#   直接比字串会全对不上（实测 0 个角色）。
#
#   归一化不能只去下划线 —— 那样 `girl_0` 和 `girl_08` 会撞车，
#   而它们**是不同的角色**（girl_0=唐默铃，girl_8=龙湘）。
#   正确做法：把「字母后跟数字」里的数字**去掉前导零**再比。
def 归(s: str) -> str:
    s = s.replace("_", "").replace("-", "").lower()
    # girl08 → girl8；girl0 保持 girl0
    return re.sub(r"(\d+)", lambda m: str(int(m.group(1))), s)


目录归 = {归(k): v for k, v in 目录到角色.items()}

出 = {}
未对 = []
for 目录, xs in 本地.items():
    if 目录 == "（未识别）":
        continue
    名 = 目录到角色.get(目录) or 目录归.get(归(目录))
    if not 名:
        未对.append((目录, len(xs)))
        continue
    出[名] = {
        "目录": 目录,
        "立绘": sorted(xs, key=lambda x: x["表情"]),
    }

OUT = os.path.join(根, "_work", "_portraits.json")
json.dump(出, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print()
print("══ 最终映射 %d 个角色 ══" % len(出))
for 名, v in sorted(出.items()):
    print("  %-12s %2d 张  %s" % (名, len(v["立绘"]),
                                "、".join(x["表情"] for x in v["立绘"][:7])))
print()
print("已写入 " + OUT)

if 未对:
    print()
    print("★ 仍未对上角色的目录（%d 个）：" % len(未对))
    for d, n in 未对:
        print("    %-18s %d 张" % (d, n))
