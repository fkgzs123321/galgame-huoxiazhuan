# -*- coding: utf-8 -*-
"""验证 checkpointmanager.Position(key) 的解析规则：
 key 形如 Door_Free_001 / Mall_Free_001 / Section_01_00。
 找出每个 key 对应的候选脚本文件，并检验「是否有脚本直接按名字引用这些候选」
 —— 若没有，则说明 Position 的映射表在资产（PositionResultConfig）里，
    编号 001/101/201/301/401/501/901 是「按章节/阶段切换的行动表档位」。
"""
import glob
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]

script_names = set()
texts = {}
for p in files:
    b = os.path.basename(p).replace(".txt", "")
    parts = b.split("__")
    nm = parts[1].lower() if len(parts) > 1 else b
    script_names.add(nm)
    texts[nm] = open(p, encoding="utf-8", errors="ignore").read()

# 全部 SetNextScript 的字面量目标
RE_NEXT = re.compile(r'luamanager\.SetNextScript\(\s*"([^"]+)"')
literal_targets = Counter()
for nm, t in texts.items():
    for m in RE_NEXT.finditer(t):
        literal_targets[m.group(1).lower()] += 1

# 全部 Position key
RE_POS = re.compile(r'checkpointmanager\.Position\(\s*"([^"]+)"')
pos_keys = Counter()
for nm, t in texts.items():
    for m in RE_POS.finditer(t):
        pos_keys[m.group(1)] += 1

print("=== Position key -> 候选脚本（同前缀的编号变体）===")
for key in sorted(pos_keys):
    low = key.lower()
    # 候选：小写名以 low 开头，或把 key 里的 _free_ 等去掉
    cands = sorted(n for n in script_names if n.startswith(low))
    if not cands:
        # 尝试 Section_01_00 -> section_01_free_00
        m = re.match(r"^section_(\d+)_(\d+)$", low)
        if m:
            cands = sorted(n for n in script_names if n.startswith("section_%s_" % m.group(1)))
    if not cands:
        cands = ["<无同名脚本>"]
    # 是否有脚本用字面量引用过这些候选
    direct = [c for c in cands if literal_targets.get(c)]
    print("  %-24s x%-3d -> %s" % (key, pos_keys[key], ", ".join(cands[:14])))
    if direct:
        print("      其中被字面 SetNextScript 引用: %s" % ", ".join(direct))

print()
print("=== 各编号档位的脚本数（地点行动表档位）===")
tier = Counter()
for n in script_names:
    m = re.match(r"^(door|back|mall|center|room|alchemy|forge|kitchen|study|girlroom|pharmacy|teashop|fortress|farm|spa|fish|chess)_(free|work)?_?(\d{3})", n)
    if m:
        tier[(m.group(1), m.group(3)[0] + "xx")] += 1
byt = Counter()
for (loc, t), v in tier.items():
    byt[t] += v
for k, v in sorted(byt.items()):
    print("   档位 %-5s %3d" % (k, v))
print()
print("=== 001/101/201/301/401/501/901 各档样例 ===")
for pre in ["door_free", "door_work", "back_free", "mall_free", "mall_work", "center_work"]:
    got = sorted(n for n in script_names if n.startswith(pre))
    print("  %-14s %s" % (pre, ", ".join(got)))
