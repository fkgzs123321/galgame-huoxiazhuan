# -*- coding: utf-8 -*-
"""精确统计：按 .gitignore，实际会推上去多少。

★ 为什么必须算准：工作区 3289 MB，若不忽略会推爆仓库。
   PowerShell 处理中文/URL 编码路径会出错，所以用 Python 调 git 并算字节。
"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template"


def git(*args):
    r = subprocess.run(["git", *args], cwd=根, capture_output=True)
    # ★ 加 -z 之外，还要关掉 core.quotepath，否则中文路径会被转义成 \344\270\255
    return r.stdout.decode("utf-8", "replace")


# 关掉路径转义
subprocess.run(["git", "config", "core.quotepath", "false"], cwd=根, capture_output=True)

新 = [x for x in git("ls-files", "--others", "--exclude-standard").split("\n") if x]
改 = [x for x in git("ls-files", "--modified").split("\n") if x]
已 = [x for x in git("ls-files").split("\n") if x]

print("══ 会进仓的文件 ══")
print("  已跟踪（模板原有）  %6d" % len(已))
print("  新增（未被忽略）    %6d" % len(新))
print("  修改                %6d" % len(改))


def 体(路径s):
    总 = 0
    n = 0
    缺 = 0
    for p in 路径s:
        fp = os.path.join(根, p)
        try:
            总 += os.path.getsize(fp)
            n += 1
        except OSError:
            缺 += 1
    return 总, n, 缺


新体, 新数, 新缺 = 体(新)
已体, 已数, _ = 体(已)
print()
print("  新增合计  %.1f MB" % (新体 / 1024 / 1024))
print("  已跟踪    %.1f MB" % (已体 / 1024 / 1024))
print("  ⇒ 推上去约 %.1f MB" % ((新体 + 已体) / 1024 / 1024))
if 新缺:
    print("  （%d 个路径读不到，多半是中文编码问题）" % 新缺)

print()
print("══ 新增文件按顶层目录 ══")
from collections import Counter, defaultdict

c = Counter()
sz = defaultdict(int)
for p in 新:
    top = p.split("/")[0]
    c[top] += 1
    try:
        sz[top] += os.path.getsize(os.path.join(根, p))
    except OSError:
        pass
for k, n in c.most_common(24):
    print("  %-32s %6d 个  %8.1f MB" % (k[:30], n, sz[k] / 1024 / 1024))

print()
print("══ 大文件（新增里 >5 MB 的）══")
大 = []
for p in 新 + 改:
    try:
        s = os.path.getsize(os.path.join(根, p))
    except OSError:
        continue
    if s > 5 * 1024 * 1024:
        大.append((s, p))
大.sort(reverse=True)
if not 大:
    print("  （没有）")
for s, p in 大[:20]:
    print("  %8.1f MB  %s" % (s / 1024 / 1024, p[:76]))

print()
print("══ 抽查：确认素材确实被忽略了 ══")
for p in ["src/活侠传/_work/_assets", "src/活侠传/_work/_pack",
          "src/霍格沃茨/_shelltest", "node_modules", "src/活侠传/活侠传.png"]:
    r = subprocess.run(["git", "check-ignore", "-q", p], cwd=根)
    print("  %-40s %s" % (p, "已忽略 ✓" if r.returncode == 0 else "★ 未忽略"))

print()
print("══ 抽查：确认源码没被误忽略 ══")
for p in ["src/活侠传/schema.ts", "src/活侠传/脚本/引擎.js",
          "src/活侠传/世界书/事件/偷懒怪.yaml", "src/活侠传/_work/gen_worldbook.py",
          "src/活侠传/正则/状态栏界面.html", "src/活侠传/界面/状态栏/App.vue",
          "src/活侠传/素材/scenes.json"]:
    fp = os.path.join(根, p)
    if not os.path.exists(fp):
        print("  %-46s ★ 文件不存在" % p)
        continue
    r = subprocess.run(["git", "check-ignore", "-q", p], cwd=根)
    print("  %-46s %s" % (p[:44], "★ 被忽略了（不该）" if r.returncode == 0 else "会推 ✓"))
