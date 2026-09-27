# -*- coding: utf-8 -*-
"""看 src 里那 240 MB / 10486 个文件到底是什么，逐卡分解。"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template"
subprocess.run(["git", "config", "core.quotepath", "false"], cwd=根, capture_output=True)
r = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"],
                   cwd=根, capture_output=True)
新 = [x for x in r.stdout.decode("utf-8", "replace").split("\n") if x and x.startswith("src/")]

from collections import defaultdict

卡体 = defaultdict(int)
卡数 = defaultdict(int)
卡内大 = defaultdict(list)

for p in 新:
    段 = p.split("/")
    if len(段) < 2:
        continue
    卡 = 段[1]
    卡数[卡] += 1
    try:
        s = os.path.getsize(os.path.join(根, p))
    except OSError:
        continue
    卡体[卡] += s
    if s > 2 * 1024 * 1024:
        卡内大[卡].append((s, p))

print("══ src 下逐卡：%d 个文件，%.1f MB ══\n" % (len(新), sum(卡体.values()) / 1024 / 1024))
print("  %-34s %7s %9s" % ("卡", "文件数", "体积"))
print("  " + "-" * 54)
for 卡 in sorted(卡体, key=lambda k: -卡体[k]):
    print("  %-34s %7d %7.1f MB" % (卡[:32], 卡数[卡], 卡体[卡] / 1024 / 1024))

print()
print("══ 各卡里 >2 MB 的文件（这些是「该不该推」的判断题）══")
for 卡 in sorted(卡内大, key=lambda k: -卡体[k]):
    print("\n  【%s】" % 卡)
    for s, p in sorted(卡内大[卡], reverse=True)[:8]:
        print("    %7.1f MB  %s" % (s / 1024 / 1024, p[len("src/" + 卡 + "/"):][:66]))
