# -*- coding: utf-8 -*-
"""扫描：关系门槛、物品门槛、身份门槛、时间窗口、Lover/Talk_Count 等特殊 key。"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]


def scan(label, pat, limit=12, before=170, after=170, dedupe_file=True):
    print("=" * 28, label)
    RE = re.compile(pat)
    n = 0
    seen = set()
    for p in sorted(files):
        base = os.path.basename(p).replace(".txt", "")
        t = open(p, encoding="utf-8", errors="ignore").read()
        for m in RE.finditer(t):
            n += 1
            if n <= limit:
                s, e = max(0, m.start() - before), min(len(t), m.end() + after)
                print("  [%s]\n     %s" % (base[:52], re.sub(r"\s+", " ", t[s:e])[:340]))
    print("  总计 %d" % n)
    print()


scan("Switch key 含 Lover", r'checkpointmanager\.Switch\("[^"]*Lover[^"]*"\)')
scan("Switch key 含 Talk_Count", r'checkpointmanager\.\w+\("[^"]*Talk_Count[^"]*"\)')
scan("Switch key 含 Girl", r'checkpointmanager\.\w+\("[^"]*[Gg]irl[^"]*"\)', limit=6)
scan("GetStatData（用于比较属性）", r'luamanager\.GetStatData\([^)]*\)', limit=20)
scan("statmodifymanager.SetFlag 含 M8/M7 (关系/剧情)", r'statmodifymanager\.SetFlag\("M8\d+"[^)]*\)', limit=6)
scan('AddBook / Miscs 判定（道具持有）', r'checkpointmanager\.\w+\("[^"]*(Book|Misc|Item|Food)[^"]*"\)', limit=20)
scan("身份/头衔/职位 判定", r'checkpointmanager\.\w+\("[^"]*(Title|Rank|Identity|Faction|Position|Job)[^"]*"\)', limit=20)
scan("年份/月份/阶段相关变量（脚本内）", r'\b(GetYear|getYear|CurrentYear|GameYear|GetMonth|CurrentStage|GetStage)\b', limit=20)
scan("runblock(flowcharts.common", r'runblock\(flowcharts\.common[^)]*\)', limit=8)
scan("getvar(flowcharts.", r'getvar\(flowcharts\.[^)]*\)', limit=10)
