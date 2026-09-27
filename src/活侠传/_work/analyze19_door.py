# -*- coding: utf-8 -*-
"""验证：
 1) Door_Free_001 -> door_free_* 的随机抽取（checkpointmanager.Position 是不是按编号前缀选一个）
 2) door_001 / door_001_01 / door_01_01 的调用关系
 3) 地点编号与门牌
"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]


def show(name, lines=200, only_zh1=True):
    for p in sorted(files):
        b = os.path.basename(p)
        if name not in b:
            continue
        if only_zh1 and b.endswith("__zh__2.txt"):
            continue
        raw = re.sub(r"\n{2,}", "\n", open(p, encoding="utf-8", errors="ignore").read())
        ls = raw.split("\n")
        print("=" * 74)
        print("### %s (%d 行)" % (b, len(ls)))
        for i, l in enumerate(ls[:lines], 1):
            print("%4d| %s" % (i, l))


show("door_001__zh__1", 60)
show("door_001_01__zh__1", 80)
show("door_01_01__zh__1", 60)
