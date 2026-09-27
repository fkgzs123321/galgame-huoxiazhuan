# -*- coding: utf-8 -*-
"""把提取脚本切成共用繁简表（一次性迁移工具）。

背景：extract_mobs.py / extract_training.py / gen_books.py 各自 import zhconv
      并对**整句**转换，而 zhconv 对长句用词组表，会漏字：
        zhconv.convert('「來時我躊躇滿志…','zh-cn') → 踌躇滿志（漏「滿」）
        zhconv.convert('滿','zh-cn')                → 满
      于是提取结果里残留繁体，而卡内运行时表本该能转 —— 静默不一致。

修法：全部改用 _zh.py（读 gen_fanjian.py 生成的那张表，与卡内 繁简.ts 同源）。
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

本目录 = os.path.dirname(os.path.abspath(__file__))
目标 = ["extract_mobs.py", "extract_training.py", "gen_books.py"]

for fn in 目标:
    p = os.path.join(本目录, fn)
    c = io.open(p, encoding="utf-8").read()
    原 = c

    # ① import zhconv → 共用工具
    if "from _zh import" not in c:
        c = c.replace(
            "import zhconv\n",
            "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n"
            "from _zh import 简  # ★ 用卡内同源的表，不再直接调 zhconv（见 _zh.py）\n",
        )

    # ② 删掉各自的 def 简
    c = re.sub(
        r"\ndef 简\(s: str\) -> str:\n    return zhconv\.convert\(s, \"zh-cn\"\) if s else s\n",
        "\n",
        c,
    )
    # 万一写法略有不同
    c = re.sub(
        r"\ndef 简\(s\):\n    return zhconv\.convert\(s, ['\"]zh-cn['\"]\) if s else s\n",
        "\n",
        c,
    )

    if c != 原:
        io.open(p, "w", encoding="utf-8", newline="\n").write(c)
        print("  ✓ %-22s 已改" % fn)
    else:
        print("  - %-22s 无变化" % fn)

# ③ 检查残留
print()
for fn in 目标:
    c = io.open(os.path.join(本目录, fn), encoding="utf-8").read()
    has_import = "import zhconv" in c
    has_def = bool(re.search(r"def 简\(", c))
    has_zh = "from _zh import" in c
    print("  %-22s import zhconv=%-5s def 简=%-5s 用 _zh=%s" % (fn, has_import, has_def, has_zh))
