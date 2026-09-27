# -*- coding: utf-8 -*-
"""生成 UI 用的精简索引。

★★ 为什么不能直接用 manifest.json：
   它 328 KB，而 UI 每次开一局都要下载。
   实际上 UI 只需要两件事：
     · 某个角色的某个表情 → 在哪个包、什么偏移、多长
     · 某个场景图 → 同上
   manifest 里那些「用途/宽/高/类」对 UI 是冗余的。

★ 输出两份：
    pack_index.json   包 → {贴图名: [偏移, 长度]}
                        UI 按包取图时用（一个包一次请求，取多张）
    scenes.json       地点 → 场景图名 + 角色 → 立绘包
                        这是**语义层**：把游戏概念对到素材上
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
PACK = os.path.join(根, "_work", "_pack")
OUT = os.path.join(根, "素材")
os.makedirs(OUT, exist_ok=True)

mf = json.load(io.open(os.path.join(PACK, "manifest.json"), encoding="utf-8"))
条目 = mf["条目"]

# ── ① pack_index：包 → {名: [偏移, 长度]} ──
#
# ★ 键要去掉 `.pack` 后缀 —— 早先直接用 `e["包"]`（形如 portrait_sister.pack）
#   当键，后面拿裸名 `portrait_sister` 去查就全落空（16 个角色一个都没对上）。
#   同时记录「一个包被切成了几份」，UI 才知道要不要多取几个包。
包索引 = {}
包分片 = {}
for 路径, e in 条目.items():
    包 = e["包"][:-5] if e["包"].endswith(".pack") else e["包"]
    名 = 路径.split("/")[-1]
    if 名.endswith(".webp"):
        名 = 名[:-5]
    包索引.setdefault(包, {})[名] = [e["偏移"], e["长度"]]
    # 记录分片序号：combat.1.pack / combat.2.pack → combat 有 2 片
    base = re.sub(r"\.\d+$", "", 包)
    包分片.setdefault(base, 0)
    包分片[base] = max(包分片[base], int(包[len(base) + 1:]) if 包 != base else 1)

p1 = os.path.join(OUT, "pack_index.json")
io.open(p1, "w", encoding="utf-8", newline="\n").write(
    json.dumps(包索引, ensure_ascii=False, separators=(",", ":")))
print("① pack_index.json  %.1f KB  （%d 个包 / %d 张贴图）"
      % (os.path.getsize(p1) / 1024, len(包索引), len(条目)))

# ── ② scenes：场景图清单 ──
#   ★ 包名要**去掉 .pack 后缀**，与 包索引 的键保持一致。
#     踩过：这里存了 `background_03.pack`，而 UI 的取包函数会再拼一次 `.pack`，
#     于是请求变成 `background_03.pack.pack` → 404。
#     症状很隐蔽 —— 索引能取到、别的包能解开，只有场景图一直出不来。
场景 = {}
for 路径, e in 条目.items():
    if not e["名"].startswith("screen_"):
        continue
    包 = e["包"][:-5] if e["包"].endswith(".pack") else e["包"]
    场景[e["名"]] = {"包": 包, "宽": e["宽"], "高": e["高"]}

# ── ③ 角色 → 立绘包 ──
#   ★ 映射来自 wiki 人物页里 /images/characters/<目录>/ 的引用
#     （见 _work/map_portraits.py 的推导）。
角色包 = {
    "赵活": "portrait_player",
    "唐中翎": "portrait_master",
    "唐布衣": "portrait_brother1",
    "唐铮": "portrait_brother2",
    "唐升": "portrait_brother3",
    "唐惟元": "portrait_brother4",
    "唐默铃": "portrait_sister",
    "瑞杏": "portrait_girl_01",
    "叶云裳": "portrait_girl_02",
    "虞小梅": "portrait_girl_03",
    "上官萤": "portrait_girl_04",
    "夏侯兰": "portrait_girl_05",
    "郁竹": "portrait_girl_06",
    "魏菊": "portrait_girl_07",
    "龙湘": "portrait_girl_08",
    "唐娇娇": "portrait_bigtrainee",
}
# 只保留真有这个包的
角色包 = {k: v for k, v in 角色包.items() if v in 包索引}
缺失 = [k for k, v in {
    "赵活": "portrait_player", "唐中翎": "portrait_master", "唐布衣": "portrait_brother1",
    "唐铮": "portrait_brother2", "唐升": "portrait_brother3", "唐惟元": "portrait_brother4",
    "唐默铃": "portrait_sister", "瑞杏": "portrait_girl_01", "叶云裳": "portrait_girl_02",
    "虞小梅": "portrait_girl_03", "上官萤": "portrait_girl_04", "夏侯兰": "portrait_girl_05",
    "郁竹": "portrait_girl_06", "魏菊": "portrait_girl_07", "龙湘": "portrait_girl_08",
    "唐娇娇": "portrait_bigtrainee",
}.items() if v not in 包索引]

# ── ④ 战斗立绘包 ──
战斗包 = sorted(c for c in 包索引 if c.startswith("battle_"))

# ── ⑤ 地点 → 场景图 ──
#   ★ 并进 scenes.json。UI 端只取一份索引就够，
#     不必为了「这个地点用哪张图」再拉第二个文件。
地点场景 = {}
p3 = os.path.join(根, "素材", "地点场景.json")
if os.path.exists(p3):
    地点场景 = json.load(io.open(p3, encoding="utf-8"))

出 = {
    "说明": "活侠传素材语义索引：把游戏概念对到 .pack 里的贴图。",
    "场景": 场景,
    "地点": 地点场景,          # 地点中文名 → [场景图名, ...]（按昼夜顺序）
    "角色立绘": 角色包,
    "战斗立绘": 战斗包,
}

p2 = os.path.join(OUT, "scenes.json")
io.open(p2, "w", encoding="utf-8", newline="\n").write(
    json.dumps(出, ensure_ascii=False, separators=(",", ":")))
print("② scenes.json      %.1f KB  （场景 %d / 角色 %d / 战斗 %d）"
      % (os.path.getsize(p2) / 1024, len(场景), len(角色包), len(战斗包)))

if 缺失:
    print()
    print("★ 这些角色没找到对应立绘包（wiki 里也没有）：")
    for k in 缺失:
        print("    " + k)

print()
print("  写入 " + OUT)
