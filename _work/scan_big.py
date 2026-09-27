# -*- coding: utf-8 -*-
"""找大文件：GitHub 单文件超 100 MB 直接拒收，超 50 MB 警告。

★ 为什么必须先查：
   GitHub 的硬限制是单文件 100 MB，超过就整个 push 失败。
   而软限制 50 MB 会警告，仓库建议 1 GB 以内。
   工作区里混着从游戏/wiki 扒的素材，不先扫一遍就推，必然撞墙。
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template"
跳过 = {"node_modules", ".git", ".pnpm-store"}

大 = []      # (>20MB)
总 = 0
总文件 = 0

for r, ds, fs in os.walk(根):
    ds[:] = [d for d in ds if d not in 跳过]
    for f in fs:
        p = os.path.join(r, f)
        try:
            sz = os.path.getsize(p)
        except OSError:
            continue
        总 += sz
        总文件 += 1
        if sz > 20 * 1024 * 1024:
            大.append((sz, os.path.relpath(p, 根)))

大.sort(reverse=True)

print("══ 工作区规模（不含 node_modules/.git）══")
print("  %d 个文件，合计 %.1f MB" % (总文件, 总 / 1024 / 1024))
print()
print("══ >20 MB 的文件 %d 个 ══" % len(大))
if not 大:
    print("  （没有）")
for sz, p in 大[:40]:
    flag = "★超100MB会被拒" if sz > 100 * 1024 * 1024 else ("警告" if sz > 50 * 1024 * 1024 else "")
    print("  %9.1f MB  %-64s %s" % (sz / 1024 / 1024, p[:62], flag))

print()
超100 = [x for x in 大 if x[0] > 100 * 1024 * 1024]
超50 = [x for x in 大 if 50 * 1024 * 1024 < x[0] <= 100 * 1024 * 1024]
print("  超 100 MB：%d 个" % len(超100))
print("  50~100 MB：%d 个" % len(超50))
print("  >20 MB 合计 %.1f MB" % (sum(x[0] for x in 大) / 1024 / 1024))
