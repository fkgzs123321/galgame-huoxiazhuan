# -*- coding: utf-8 -*-
"""把存档里的关键结构导出成可读文本，便于分析 EventFlags / SubMissions 命名规律。"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")

SAVE = r"C:\Users\64806\AppData\LocalLow\Obb Studio\Mortal\76561198069348623\Save_001.dat.ss.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "save_report.txt")

d = json.load(open(SAVE, encoding="utf-8"))
buf = []
W = buf.append


def sect(t):
    W("")
    W("=" * 78)
    W("### " + t)
    W("=" * 78)


sect("时间与场景")
for k in ("CurrentYear", "CurrentMonth", "CurrentStage", "CurrentDayEnvironment",
          "CurrentStoryScript", "StartStoryScript", "CurrentScene", "CurrentSceneKey",
          "CurrentNextScene", "CurrentTravelScript", "TempScript1", "TempScript2", "TempScript3",
          "IsTriggerSubMission", "TriggerSubMissionKey", "Version"):
    W("  %-24s = %r" % (k, d.get(k)))

sect("TimeSave (len=%d)" % len(d.get("TimeSave", [])))
for i, x in enumerate(d.get("TimeSave", [])):
    W("  [%2d] %r" % (i, x))

sect("StorySave (len=%d)" % len(d.get("StorySave", [])))
for i, x in enumerate(d.get("StorySave", [])):
    W("  [%2d] %r" % (i, x))

sect("MainMission")
W("  %r" % (d.get("MainMission"),))

sect("Stats (len=%d)" % len(d.get("Stats", [])))
for i, x in enumerate(d.get("Stats", [])):
    W("  [%2d] %r" % (i, x))

sect("Relationships (len=%d)" % len(d.get("Relationships", [])))
for i, x in enumerate(d.get("Relationships", [])):
    W("  [%2d] %r" % (i, x))

sect("SubMissions (len=%d)  --- 原样" % len(d.get("SubMissions", [])))
for i, x in enumerate(d.get("SubMissions", [])):
    W("  [%3d] %r" % (i, x))

sect("EventFlags (len=%d)  --- 全量" % len(d.get("EventFlags", [])))
for i, x in enumerate(d.get("EventFlags", [])):
    W("  [%3d] %r" % (i, x))

sect("EventFlags 命名前缀统计")
names = []
for x in d.get("EventFlags", []):
    if isinstance(x, dict):
        k = x.get("Key") or x.get("Name") or x.get("Flag") or ""
        names.append((k, x))
    else:
        names.append((str(x), x))
pref = Counter()
for k, _ in names:
    m = re.match(r"^([A-Za-z]+)", k)
    pref[m.group(1) if m else "(非字母)"] += 1
for k, v in pref.most_common():
    W("  %-10s %4d" % (k, v))

open(OUT, "w", encoding="utf-8").write("\n".join(buf))
print("已写出 %s  (%d 行)" % (OUT, len(buf)))
