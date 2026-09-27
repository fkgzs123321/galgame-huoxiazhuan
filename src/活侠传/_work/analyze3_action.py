# -*- coding: utf-8 -*-
"""分析行动次数 / 回合推进 / 旬(Stage) 的语义。"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]


def scan(label, pat, limit=14, ctx=(90, 90)):
    print("=" * 26, label)
    RE = re.compile(pat)
    n = 0
    for p in files:
        t = open(p, encoding="utf-8", errors="ignore").read()
        for m in RE.finditer(t):
            n += 1
            if n <= limit:
                s, e = max(0, m.start() - ctx[0]), min(len(t), m.end() + ctx[1])
                print("  [%s]\n     %s" % (os.path.basename(p).replace(".txt", "")[:46],
                                           re.sub(r"\s+", " ", t[s:e])[:300]))
    print("  总计 %d" % n)


scan("SetEnableActions", r"luamanager\.SetEnableActions\([^)]*\)")
scan('Player("action"', r'statmodifymanager\.Player\(\s*"action"[^)]*\)')
scan('add-action', r'"[a-z-]*add-action[^"]*"')
scan("Switch 含 Action", r'checkpointmanager\.Switch\("[^"]*[Aa]ction[^"]*"\)')
scan("ActionCheck", r'ActionCheck\w*')
scan("ResetTalkFlag", r'statmodifymanager\.ResetTalkFlag\(\)', limit=6)
scan("NextRound", r'luamanager\.NextRound\(\)', limit=6)
scan("NextMonth", r'luamanager\.NextMonth\(\)', limit=6)
scan("SetGameTime", r'luamanager\.SetGameTime\([^)]*\)', limit=50)
print()
print("=== SetGameTime 出现的全部文件与上下文 ===")
RE = re.compile(r"luamanager\.SetGameTime\(([^)]*)\)")
for p in files:
    t = open(p, encoding="utf-8", errors="ignore").read()
    for m in RE.finditer(t):
        print("  %-52s %s" % (os.path.basename(p).replace(".txt", "")[:52], m.group(0)))
