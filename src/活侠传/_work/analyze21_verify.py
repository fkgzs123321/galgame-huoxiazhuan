# -*- coding: utf-8 -*-
"""最终核对：报告里要引用的片段，逐条确认原文与行号。"""
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")


def show(name, a=1, b=999, only=("__zh__1", "__zh__2", "__zh__")):
    for p in sorted(glob.glob(os.path.join(D, "*%s*" % name))):
        bn = os.path.basename(p)
        if not any(x in bn for x in only):
            continue
        if "__kr" in bn:
            continue
        raw = re.sub(r"\n{2,}", "\n", open(p, encoding="utf-8", errors="ignore").read())
        ls = raw.split("\n")
        print("### %s  (%d 行)  显示 %d-%d" % (bn, len(ls), a, min(b, len(ls))))
        for i, l in enumerate(ls[a - 1:b], a):
            print("%4d| %s" % (i, l))
        print()


show("resources__ch1_1_break_option__zh__1", 1, 45)
show("resources__ch0_meeting_option__zh__1", 1, 40)
show("resources__food_menu_001__zh__1", 1, 30)
show("resources__section_01_train_01__zh__1", 1, 40)
