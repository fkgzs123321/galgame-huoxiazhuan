# -*- coding: utf-8 -*-
"""导出全部 SetMissionTime / IsTriggerSubMission / Mission / AddFlag 调用（含上下文）。"""
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]


def scan(label, pat, before=160, after=160, skip_dupe_lang=True, maxn=1000):
    print("=" * 30, label)
    RE = re.compile(pat)
    seen = set()
    n = 0
    for p in sorted(files):
        base = os.path.basename(p).replace(".txt", "")
        if skip_dupe_lang and base.endswith("__zh__2"):
            continue
        t = open(p, encoding="utf-8", errors="ignore").read()
        for m in RE.finditer(t):
            key = m.group(0)
            n += 1
            if n > maxn:
                continue
            s, e = max(0, m.start() - before), min(len(t), m.end() + after)
            print("  [%s]\n    ...%s..." % (base[:52], re.sub(r"\s+", " ", t[s:e])))
    print("  总计 %d" % n)


scan("SetMissionTime 全量", r"luamanager\.SetMissionTime\([^)]*\)", before=200, after=200)
print()
scan("IsTriggerSubMission 全量", r"statmodifymanager\.IsTriggerSubMission\([^)]*\)", before=120, after=200)
