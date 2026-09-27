# -*- coding: utf-8 -*-
"""扫描原作的「前置要求 / 错过」机制：语法 + 规模。

数据源：_dump2（全量正确转储，按语言分列）。只看 __zh* 文件。
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

RE_COND = re.compile(r'checkpointmanager\.Condition\(\s*"([^"]+)"')
RE_HIDDEN = re.compile(r'"~x"')
RE_ACTION = re.compile(r'Player\(\s*"action"\s*,\s*(-?\d+)')
RE_FLAGSET = re.compile(r'checkpointmanager\.(Set|Save|Flag|Checkpoint|Unlock|SetCondition)\(\s*"([^"]+)"')
RE_MENU = re.compile(r'"(?:[a-z]+)\+([^"+]{1,28})\+')

flags = Counter()
menu_names = Counter()
hidden = 0
actions = Counter()
flagset = Counter()
cond_examples = []
hidden_examples = []

for p in files:
    try:
        t = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    fn = os.path.basename(p).replace(".txt", "")

    for m in RE_COND.finditer(t):
        flags[m.group(1)] += 1
        if len(cond_examples) < 10:
            s, e = max(0, m.start() - 50), min(len(t), m.end() + 90)
            cond_examples.append((fn, re.sub(r"\s+", " ", t[s:e]).strip()))

    for m in RE_HIDDEN.finditer(t):
        hidden += 1
        if len(hidden_examples) < 6:
            s, e = max(0, m.start() - 150), min(len(t), m.end() + 20)
            hidden_examples.append((fn, re.sub(r"\s+", " ", t[s:e]).strip()))

    for m in RE_ACTION.finditer(t):
        actions[m.group(1)] += 1

    for m in RE_FLAGSET.finditer(t):
        flagset["%s:%s" % (m.group(1), m.group(2))] += 1

    for m in RE_MENU.finditer(t):
        menu_names[m.group(1)] += 1

print("=" * 70)
print("前置条件调用  唯一 flag %d 个 / 总调用 %d 次" % (len(flags), sum(flags.values())))
print("隐藏选项 ~x   出现 %d 次" % hidden)
print("flag 写入调用 唯一 %d 个 / 总 %d 次" % (len(flagset), sum(flagset.values())))
print("action 变化   %s" % dict(actions))
print()
print("=== 最高频前置 flag top 30 ===")
for k, v in flags.most_common(30):
    print("  %-46s %d" % (k, v))
print()
print("=== flag 写入调用 top 15 ===")
for k, v in flagset.most_common(15):
    print("  %-46s %d" % (k, v))
print()
print("=== 菜单选项名 top 20（前 20 个字符）===")
for k, v in menu_names.most_common(20):
    print("  %-40s %d" % (k[:40], v))
print()
print("=== Condition 使用样例 ===")
for fn, s in cond_examples[:8]:
    print("  [%s]\n     %s" % (fn[:44], s))
print()
print("=== 隐藏选项 \"~x\" 样例 ===")
for fn, s in hidden_examples:
    print("  [%s]\n     %s" % (fn[:44], s))
