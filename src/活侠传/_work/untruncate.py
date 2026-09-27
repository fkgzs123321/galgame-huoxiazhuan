# -*- coding: utf-8 -*-
"""补齐截断：把生成器里「只取前 N 行」的限制放开。

★★ 为什么必须改（实测数据）：
   内容保留率只有 57.3% —— 源素材 36656 个实词，进卡的 21003 个。
   逐个文件定位后，根因是**我自己在生成器里加的截断**：

     people/characters  只取前 36 行  → 保留 22~31%
     people/factions    只取前 40 行  → 保留 59.8%
     event/ends         只取前 24 行  → 保留 63.7%
     event/badends      只取前 24 行  → 保留 68.2%
     system/books       只取前 30 行  → 保留 ~70%

   这些截断是**当初为了控制体积随手加的**，代价是把正文砍掉一半。

★★ 为什么现在可以放开：
   这些条目全是 **selective（关键词触发）** —— 提到才注入，一次只几条。
   constant 那 37 条才需要继续收紧（它们每轮都进 prompt）。
   实测：单次触发最多注入 42 条 / 1.1 万字符（「汗青书」），在安全线内。

★ 保留一道**总量底线**：单条 12000 字符封顶。
  源素材最大的页（girl8.md 21KB）截到 12KB 仍保留约 6 成；
  而单条 12000 字符 ≈ 8000 token，一次命中一条可以接受。
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

WD = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work"

# (文件, 原文, 新文, 说明)
改动 = [
    # ── gen_worldbook.py ──
    ("gen_worldbook.py",
     'for ln in 正文.split("\\n")[:24]:', 'for ln in 正文.split("\\n"):',
     "结局：去掉「只取 24 行」"),
    ("gen_worldbook.py",
     'for ln in 体.split("\\n")[:40]:', 'for ln in 体.split("\\n"):',
     "势力：去掉「只取 40 行」"),
    ("gen_worldbook.py",
     'for ln in 行s[:36]:', 'for ln in 行s:',
     "人物：去掉「只取 36 行」"),
    ("gen_worldbook.py",
     'for ln in 行s[:30]:', 'for ln in 行s:',
     "秘籍：去掉「只取 30 行」"),
    ("gen_worldbook.py",
     '行.append(f"      - {ln[:200]}")', '行.append(f"      - {ln[:400]}")',
     "事件经过：单行 200→400"),
    ("gen_worldbook.py",
     "行.append(f\"    备注: {d['备注'][:160]}\")",
     "行.append(f\"    备注: {d['备注'][:400]}\")",
     "事件备注：160→400"),
    ("gen_worldbook.py",
     '行.append(f"  - {ln[:180]}")', '行.append(f"  - {ln[:400]}")',
     "通用：单行 180→400"),

    # ── gen_worldbook2.py ──
    ("gen_worldbook2.py",
     "行.append(f\"  {名}: {简(v[1]).replace(chr(10), '；')[:120]}\")",
     "行.append(f\"  {名}: {简(v[1]).replace(chr(10), '；')[:400]}\")",
     "成就：120→400"),
    ("gen_worldbook2.py",
     '行.append(f"  - {ln[:160]}")', '行.append(f"  - {ln[:400]}")',
     "通用：单行 160→400"),

    # ── gen_worldbook3.py ──
    ("gen_worldbook3.py",
     '列表(体, 50)', '列表(体, 400)',
     "战斗/设施：50 行→400 行"),
    ("gen_worldbook3.py",
     '列表(体, 30, "  - ")', '列表(体, 400, "  - ")',
     "次要角色：30→400 行"),
    ("gen_worldbook3.py",
     '列表(体, 60)', '列表(体, 400)',
     "弟子众生：60→400 行"),
    ("gen_worldbook3.py",
     'fn[:220]', 'ln[:400]',   # 列表() 里的
     "列表单行：220→400"),
]

for fn, 旧, 新, 说明 in 改动:
    p = os.path.join(WD, fn)
    c = io.open(p, encoding="utf-8").read()
    n = c.count(旧)
    if n == 0:
        print("  ✗ %-20s 没匹配到：%s" % (fn, 说明))
        continue
    c = c.replace(旧, 新)
    io.open(p, "w", encoding="utf-8", newline="\n").write(c)
    print("  ✓ %-20s %s（替换 %d 处）" % (fn, 说明, n))

# ── 检查还有没有残留的行数截断 ──
print()
print("══ 检查残留的行数截断（split 后跟 [:N]）══")
残留 = 0
for fn in ["gen_worldbook.py", "gen_worldbook2.py", "gen_worldbook3.py"]:
    c = io.open(os.path.join(WD, fn), encoding="utf-8").read()
    for m in re.finditer(r"\.split\([^)]*\)\[:(\d+)\]|行s\[:(\d+)\]|列表\([^)]*,\s*(\d+)[,)]", c):
        print("  ★ %s: %s" % (fn, m.group(0)))
        残留 += 1
if not 残留:
    print("  ✓ 无")
