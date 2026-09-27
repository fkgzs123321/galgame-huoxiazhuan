# -*- coding: utf-8 -*-
"""从 Mortal.*.dll 中提取 #US (user string) 堆与 #Strings 堆，寻找 checkpoint 相关线索。

不做完整元数据解析：直接扫描 PE 文件中的 UTF-16LE 字符串（.NET #US 堆条目），
并在 #Strings 堆（ASCII）中找方法名。
"""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

MANAGED = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\Managed"
DLLS = ["Mortal.Story.dll", "Mortal.Core.dll", "Mortal.Free.dll", "Assembly-CSharp.dll"]

KEYWORDS = ["CheckPoint", "Checkpoint", "checkpoint", "Condition", "Switch", "Position",
            "Dice", "EventFlag", "SubMission", "Mission", "GameTime", "DayEnvironment",
            "GetStatData", "SetMissionTime", "IsTriggerSubMission"]


def utf16_strings(data, minlen=3):
    out = []
    cur = []
    i = 0
    n = len(data)
    while i + 1 < n:
        lo, hi = data[i], data[i + 1]
        if hi == 0 and 32 <= lo < 127:
            cur.append(chr(lo))
            i += 2
        else:
            if len(cur) >= minlen:
                out.append("".join(cur))
            cur = []
            i += 1
    if len(cur) >= minlen:
        out.append("".join(cur))
    return out


for dll in DLLS:
    p = os.path.join(MANAGED, dll)
    if not os.path.exists(p):
        print("缺失:", dll)
        continue
    data = open(p, "rb").read()
    print("=" * 70)
    print("### %s  (%d bytes)" % (dll, len(data)))
    ss = utf16_strings(data)
    uniq = sorted(set(ss))
    print("  UTF-16 串总数 %d, 去重 %d" % (len(ss), len(uniq)))
    for kw in KEYWORDS:
        hits = [s for s in uniq if kw.lower() in s.lower()]
        if hits:
            print("  [%s] %d 个:" % (kw, len(hits)))
            for h in hits[:40]:
                print("      %s" % h)
    # ascii 方法名
    ascii_strs = set(re.findall(rb"[A-Za-z_][A-Za-z0-9_]{3,60}", data))
    ascii_strs = set(s.decode() for s in ascii_strs)
    for kw in KEYWORDS:
        hits = sorted(s for s in ascii_strs if kw.lower() in s.lower())
        if hits:
            print("  <ascii:%s> %d 个: %s" % (kw, len(hits), ", ".join(hits[:30])))
