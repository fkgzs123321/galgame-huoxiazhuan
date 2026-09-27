# -*- coding: utf-8 -*-
"""统计提取数据里的繁体字——只处理实际用到的，不装库。"""
import io
import json
import os
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"

# 收集所有提取数据里的中文字
文本 = []
for f in ["_books.json", "_events.json"]:
    p = os.path.join(根, "_work", f)
    if os.path.exists(p):
        文本.append(io.open(p, encoding="utf-8").read())
全部 = "\n".join(文本)

字 = Counter(c for c in 全部 if "\u4e00" <= c <= "\u9fff")
print("提取数据里的不同汉字：%d 个" % len(字))

# 常见繁体字集（用一批已知的繁体字做探测）
常见繁 = set("雲靂劍譜輕靈氣內力體學問術拳掌陰陽聲勢處世性情道德修養心相命運銀兩"
            "師兄門派機緣買賣價錢獲條條滿額貢獻聲譽稱號敵個體戰鬥勝負傷藥丹鐵材料"
            "讀選擇項記錄劉張陳楊趙錢孫李週週週週歸還錢財豐富貴賤貧窮豐滿嬌豔麗質")

命中 = {c: n for c, n in 字.items() if c in 常见繁}
print("命中的常见繁体：%d 个" % len(命中))
print("  " + " ".join(sorted(命中)))
print()

# 直接列出所有字，按频率，让人工看哪些是繁体
print("全部字（按频率，前 120）：")
s = "".join(c for c, _ in 字.most_common(120))
print("  " + s)
