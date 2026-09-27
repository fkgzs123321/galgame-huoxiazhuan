# -*- coding: utf-8 -*-
"""一键重跑整条数据链 —— 顺序错了就会残留繁体。

★★ 为什么要有这个脚本：
   这条链有严格顺序，错一步就静默出错：

     ① gen_fanjian.py    建繁简表（从原始素材 + 提取结果）
     ② extract_*.py      提取（**用表转换**）
     ③ gen_*.py          生成卡内 TS 表

   实测踩过的坑：
     · 表从「提取结果」建，而提取结果又用「表」转 → 循环依赖，
       表里没有的字永远进不了表（`濃` 就这样漏了）。
       修法：单字也从原始素材取。
     · 先跑了 gen_*（用旧表生成的 _training.json），
       再跑 gen_fanjian 建新表 → 产物里残留旧表转不掉的繁体。
       修法：就是本脚本 —— 顺序固定，不许手敲。

用法：
    python _work/build_data.py
"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

本目录 = os.path.dirname(os.path.abspath(__file__))
Python = sys.executable


def 跑(脚本: str) -> bool:
    print("\n" + "─" * 56)
    print("▶ " + 脚本)
    print("─" * 56)
    r = subprocess.run(
        [Python, os.path.join(本目录, 脚本)],
        cwd=os.path.dirname(本目录),
        capture_output=True,
    )
    out = r.stdout.decode("utf-8", "replace")
    err = r.stderr.decode("utf-8", "replace")
    # 只显示有信息量的行
    for line in out.splitlines():
        if any(k in line for k in ["共 ", "提取到", "已生成", "已导出", "键数", "✓", "★", "残留",
                                   "单字", "样本", "验证对象", "zhconv", "原始素材"]):
            print("  " + line.strip())
    if err.strip():
        for line in err.splitlines()[:6]:
            print("  ! " + line.strip())
    if r.returncode != 0:
        print("  ★ 退出码 %d" % r.returncode)
    return r.returncode == 0


阶段 = [
    ("① 建繁简表", ["gen_fanjian.py"]),
    ("② 提取（用表转换）", ["extract_books.py", "extract_events.py",
                        "extract_training.py", "extract_mobs.py"]),
    ("③ 生成卡内表", ["gen_books.py", "gen_training.py", "gen_mobs.py"]),
    ("④ 自检", ["check_zh.py"]),
]

失败 = []
for 名, 脚本s in 阶段:
    print("\n" + "=" * 56)
    print("  " + 名)
    print("=" * 56)
    for s in 脚本s:
        if not 跑(s):
            失败.append(s)

print("\n" + "=" * 56)
if 失败:
    print("★ 失败的：%s" % "、".join(失败))
    sys.exit(1)
print("✓ 数据链跑完，无残留")
