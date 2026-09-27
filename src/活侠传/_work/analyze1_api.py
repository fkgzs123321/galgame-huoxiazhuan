# -*- coding: utf-8 -*-
"""扫描：全部 API 调用面（manager.X / 全局函数），用于梳理条件语法与系统接口。

数据源：_dump2（全量正确转储），只看 __zh* 文件。
"""
import glob
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
files = [p for p in glob.glob(os.path.join(D, "*.txt")) if "__zh" in os.path.basename(p)]
print("中文脚本文件数: %d\n" % len(files))

RE_CALL = re.compile(r'\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*\(')
RE_GLOBAL = re.compile(r'(?<![\w.])([a-z][A-Za-z0-9_]*)\s*\(')

mgr = Counter()
globals_ = Counter()
mgr_examples = {}

for p in files:
    try:
        t = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for m in RE_CALL.finditer(t):
        key = "%s.%s" % (m.group(1), m.group(2))
        mgr[key] += 1
        if key not in mgr_examples:
            s, e = max(0, m.start() - 60), min(len(t), m.end() + 120)
            mgr_examples[key] = (os.path.basename(p), re.sub(r"\s+", " ", t[s:e]).strip())
    for m in RE_GLOBAL.finditer(t):
        globals_[m.group(1)] += 1

print("=" * 78)
print("=== manager 调用 top 80 ===")
for k, v in mgr.most_common(80):
    print("  %-42s %6d" % (k, v))

print()
print("=" * 78)
print("=== 顶层函数 top 60 ===")
for k, v in globals_.most_common(60):
    print("  %-30s %6d" % (k, v))

print()
print("=" * 78)
print("=== checkpointmanager.* 全部方法 ===")
for k, v in sorted(mgr.items()):
    if k.startswith("checkpointmanager.") or k.startswith("CheckPoint") or "heckpoint" in k:
        print("  %-46s %6d" % (k, v))

print()
print("=" * 78)
print("=== 关键 manager 方法样例 ===")
for k in sorted(mgr):
    if any(x in k for x in ("checkpointmanager", "statmodifymanager", "luamanager",
                            "timemanager", "datemanager", "flagmanager", "eventmanager",
                            "missionmanager", "submission", "savemanager", "gamemanager")):
        fn, s = mgr_examples[k]
        print("  [%s] %s\n     %s" % (k, fn[:44], s[:180]))
