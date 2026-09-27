# -*- coding: utf-8 -*-
"""找出繁简表漏掉的字——用真实数据，不靠猜。"""
import io
import json
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
表文件 = os.path.join(根, "脚本", "繁简.ts")
表 = io.open(表文件, encoding="utf-8").read()

# 已覆盖的键
已覆盖 = set(re.findall(r"^\s{2}([\u4e00-\u9fff]+):\s*'", 表, re.M))
单字覆盖 = {k for k in 已覆盖 if len(k) == 1}
词覆盖 = {k for k in 已覆盖 if len(k) > 1}
print("表里已覆盖：单字 %d 个，词 %d 个" % (len(单字覆盖), len(词覆盖)))

# 收集真实数据里的汉字
文本 = []
for f in ["_books.json", "_events.json"]:
    p = os.path.join(根, "_work", f)
    if os.path.exists(p):
        文本.append(io.open(p, encoding="utf-8").read())
全部 = "\n".join(文本)

字频 = Counter(c for c in 全部 if "\u4e00" <= c <= "\u9fff")
print("数据里的不同汉字：%d" % len(字频))

# 判断一个字符是不是繁体：用一份常见的繁体字形集合来探测
# （没有 opencc，就用「这个字在简体语料里罕见，但在台湾 wiki 里常见」这个特征近似）
# 朴素办法：列出所有字，人工过一遍——这里只输出候选
候选 = []
for c, n in 字频.most_common():
    if c in 单字覆盖:
        continue
    # 跳过日文假名与标点（已经过滤）
    # 用「繁体字表」判定：这里内置一份从本次数据里人工识别的清单
    候选.append((c, n))

print("\n未覆盖的字（按频率，前 200）：")
s = "".join(c for c, _ in 候选[:200])
print("  " + s)

# 直接列出看着像繁体/异体的
繁体感 = "颯變龍絕奪煉鍛鐵鐘壞禦盜賊劍譜輕氣內體學問術養處戰勝傷藥銀錢門雲週選還錄貢貴買賣質趙緣項額聲稱獻獲滿歸機條擇孫嬌師富鬥勢個兩爺媽兒媳婦亂爭淨準灣島嶼嶺巔巒巖澀濤湧澤潔濃濕濟濱洶溝準滯滿漲漸潑潔灑"
命中 = [(c, n) for c, n in 字频.items() if c in 繁体感 and c not in 单字覆盖]
print("\n★ 明显是繁体且表里没有的：")
for c, n in sorted(命中, key=lambda x: -x[1]):
    print("  %s  %d 次" % (c, n))

# 找词级未覆盖
词候选 = []
for w in re.findall(r"[\u4e00-\u9fff]{2,6}", 全部):
    pass

json.dump(
    {"单字覆盖": sorted(单字覆盖), "词覆盖": sorted(词覆盖), "缺字": [c for c, _ in 命中]},
    io.open(os.path.join(根, "_work", "_fanjian_gap.json"), "w", encoding="utf-8"),
    ensure_ascii=False,
    indent=2,
)
print("\n已写入 _work/_fanjian_gap.json")
