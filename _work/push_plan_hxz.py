# -*- coding: utf-8 -*-
"""看 活侠传 那 5874 个文件 / 155.6 MB 到底是什么。"""
import os
import subprocess
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template"
subprocess.run(["git", "config", "core.quotepath", "false"], cwd=根, capture_output=True)
r = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"],
                   cwd=根, capture_output=True)
新 = [x for x in r.stdout.decode("utf-8", "replace").split("\n")
     if x.startswith("src/活侠传/")]

print("══ src/活侠传 下未忽略文件：%d 个 ══\n" % len(新))

# 按第二层目录归类
体 = defaultdict(int)
数 = defaultdict(int)
样例 = defaultdict(list)
for p in 新:
    段 = p.split("/")
    k = "/".join(段[2:3]) or "(根)"
    数[k] += 1
    try:
        s = os.path.getsize(os.path.join(根, p))
    except OSError:
        s = 0
    体[k] += s
    if len(样例[k]) < 4:
        样例[k].append(p[len("src/活侠传/"):])

print("  %-22s %6s %10s" % ("子目录", "文件数", "体积"))
print("  " + "-" * 44)
for k in sorted(体, key=lambda x: -体[x]):
    print("  %-22s %6d %8.1f MB" % (k[:20], 数[k], 体[k] / 1024 / 1024))
    for s in 样例[k][:2]:
        print("      " + s[:74])

print()
print("══ 世界书目录明细（条目文件数量最多的）══")
r2 = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "src/活侠传/世界书"],
                    cwd=根, capture_output=True)
ws = [x for x in r2.stdout.decode("utf-8", "replace").split("\n") if x]
d = defaultdict(int)
for p in ws:
    段 = p.split("/")
    d[段[3] if len(段) > 3 else "(根)"] += 1
for k, n in sorted(d.items(), key=lambda kv: -kv[1]):
    print("    %-16s %d 个" % (k, n))

print()
print("══ _work 下的明细（这里混着源码与产物）══")
r3 = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "src/活侠传/_work"],
                    cwd=根, capture_output=True)
w2 = [x for x in r3.stdout.decode("utf-8", "replace").split("\n") if x]
d2 = defaultdict(lambda: [0, 0])
for p in w2:
    段 = p.split("/")
    k = 段[3] if len(段) > 4 else "(文件)"
    try:
        s = os.path.getsize(os.path.join(根, p))
    except OSError:
        s = 0
    d2[k][0] += 1
    d2[k][1] += s
for k, (n, s) in sorted(d2.items(), key=lambda kv: -kv[1][1])[:20]:
    print("    %-26s %5d 个 %8.1f MB" % (k[:24], n, s / 1024 / 1024))
