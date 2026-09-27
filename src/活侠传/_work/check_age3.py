# -*- coding: utf-8 -*-
"""活侠传女角年龄深度核查。

方法：只认「硬标记」，不认描述性词汇。
硬标记 = 明确岁数 / 及笄·二八·豆蔻等年龄代称 / 婚配生育 / 功名职位 / 师徒辈分
           / 与已知年龄者的明确比较
禁止：小姑娘、丫头、少女、年轻、初出茅庐（这些不是年龄证据）
"""
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump")
files = sorted(glob.glob(os.path.join(D, "*.txt")))

TARGETS = [
    ("龙湘", "girl4"), ("龍湘", "girl4"),
    ("虞小梅", "girl5"), ("小梅", "girl5"),
    ("郁竹", "girl7"), ("小竹", "girl7"),
    ("瑞杏", "girl1"),
    ("夏玉莲", "girl3"), ("夏玉蓮", "girl3"),
    ("夏侯兰", "girl6"), ("夏侯蘭", "girl6"),
    ("魏菊", "girl8"), ("小菊", "girl8"),
    ("上官萤", "girl9"), ("上官螢", "girl9"),
]

# 硬标记
HARD = re.compile(
    r"("
    r"[一二三四五六七八九十百千0-9]{1,4}\s*(岁|歲)"          # 明确岁数
    r"|及笄|二八|豆蔻|破瓜|待字|及冠|弱冠|束发|束髮|而立|不惑|知天命"
    r"|出嫁|婚配|成亲|成親|拜堂|洞房|夫妻|夫君|丈夫|妻子|娘子|结发|結髮"
    r"|有孕|身孕|怀孕|懷孕|诞下|誕下|生子|生女|孩儿|孩兒|儿女|兒女"
    r"|掌门|掌門|当家|當家|家主|状元|狀元|功名|天子门生|天子門生|为官|為官"
    r"|弟子|师父|師父|师叔|師叔|师姐|師姐|师兄|師兄|师娘|師娘|长辈|長輩"
    r"|兄长|兄長|姊弟|姐弟|妹妹|姊姊|姐姐|大几岁|大不了|比你大|比你小|年长|年長"
    r"|以往|当年|當年|那时|那時|小时候|小時候|自幼|自小|年少时|年少時"
    r")"
)

cache = {}


def load(p):
    if p not in cache:
        try:
            cache[p] = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            cache[p] = ""
    return cache[p]


for name, code in TARGETS:
    print("=" * 78)
    print("### %s  (%s)" % (name, code))
    print("=" * 78)
    segs = {}
    for p in files:
        t = load(p)
        if name not in t:
            continue
        fn = os.path.basename(p).replace("textasset_", "").replace(".txt", "")
        for m in re.finditer(re.escape(name), t):
            s = max(0, m.start() - 70)
            e = min(len(t), m.end() + 110)
            seg = t[s:e].replace("\n", " ").replace("\\n", " ")
            seg = re.sub(r"\s+", " ", seg).strip()
            if not HARD.search(seg):
                continue
            key = seg[:70]
            if key in segs:
                continue
            segs[key] = (fn, seg)

    if not segs:
        print("  【无硬标记命中】\n")
        continue

    shown = 0
    for k, (fn, seg) in segs.items():
        print("  [%-22s] %s" % (fn[:22], seg))
        shown += 1
        if shown >= 22:
            break
    print("  （共 %d 条命中，显示 %d 条）\n" % (len(segs), shown))
