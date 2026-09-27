# -*- coding: utf-8 -*-
"""算清楚：做一个「能点、像游戏」的界面，技术上要什么、我给得起的有什么。

★ 不带热情算账。用户要的是截图里那种观感：
    · 地图上点建筑进场        （唐门全景 + 地点热点）
    · 战斗界面按招式           （立绘对峙 + 招式按钮 + 气条）
    · 对话时旁边站人           （立绘 + 表情切换）
    · 多路线 / 古风 / 幻想      （标签、分支）

  要还原这些，需要**四类素材**。我逐个查手上有没有。
"""
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"

print("══ 还原游戏画面需要什么 vs 我手上有什么 ══")
print()

项 = [
    ("① 地点/地图背景", "唐门全景图、各建筑场景图",
     "source/_raw/wiki 里引用了 528 张图，但**一张都没有本地副本**"),
    ("② 角色立绘", "对话时站在旁边的半身像 + 表情切换",
     "_work/_portraits/ 有 84 张（55.6 MB），**能用**"),
    ("③ 战斗画面", "双方对峙立绘、招式图标、背景",
     "立绘有（对峙可用），招式图标与背景**没有**"),
    ("④ 道具/装备图标", "背包里每件东西的小图",
     "wiki 引用了 7 张刀剑图标，**本地没有**"),
    ("⑤ 界面边框/纹样", "古风 UI 的框、卷轴、按钮底",
     "没有，只能用 CSS 画"),
]

for 名, 要, 有 in 项:
    print("  %s" % 名)
    print("     要: %s" % 要)
    print("     有: %s" % 有)
    print()

print("══ 立绘覆盖（决定「对话时站人」能做多少）══")
m = json.load(io.open(os.path.join(根, "_work", "_portraits.json"), encoding="utf-8"))
print("  已对上角色 %d 个：" % len(m))
for 名, v in sorted(m.items()):
    print("    %-8s %2d 张" % (名, len(v["立绘"])))
print()
print("  未对上 %d 个目录（wiki 里没有这些路径，需人工认人）：" % 0)
for d in ["sister", "girl_09", "girl_04_01", "girl_07_01", "artist",
         "blacksmith", "child", "dio", "female", "ranger", "women"]:
    n = len([f for f in os.listdir(os.path.join(根, "_work", "_portraits"))
             if f.startswith("portrait_%s__" % d)])
    print("    %-14s %d 张" % (d, n))

print()
print("══ 关键问题：立绘怎么进卡/进 CDN ══")
总 = sum(os.path.getsize(os.path.join(根, "_work", "_portraits", f))
        for f in os.listdir(os.path.join(根, "_work", "_portraits")))
print("  全部 %d 张 = %.1f MB" % (len(os.listdir(os.path.join(根, "_work", "_portraits"))), 总 / 1024 / 1024))
print("  卡本体现在是 6.35 MB —— 全部塞进卡不现实")
print()
print("  可行路径：")
print("    · 走 CDN（与面板同一仓库），界面按需加载 → 图片不占卡体积")
print("    · 但要压缩：现在平均 678 KB/张，网页用 100~200 KB 就够")
print("    · 压到 150 KB：84 张 ≈ 12.6 MB，jsDelivr 单文件限制内没问题")
