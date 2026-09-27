# -*- coding: utf-8 -*-
"""把引擎生成的 关系网 段插进 initvar.yaml（在 前置: 之前）。"""
import io
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASE = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
INIT = BASE + r"\世界书\变量\initvar.yaml"
NET = BASE + r"\_work\_net.yaml"

init = io.open(INIT, encoding="utf-8").read()

if "关系网:" in init:
    # 已插过 —— 先摘掉旧的再插，保证与引擎输出一致（幂等）
    init = re.sub(r"\n关系网:\n(?:  .*\n|    .*\n|\n)*", "\n", init)
    print("  移除旧的 关系网 段")

net = io.open(NET, encoding="utf-8").read().rstrip("\n")

# 插在 前置: 之前
m = re.search(r"^前置:", init, re.M)
if not m:
    print("★ 找不到 前置: 锚点")
    sys.exit(1)

新 = init[: m.start()] + net + "\n\n" + init[m.start() :]

# 收尾：确保只留一个空行分隔
新 = re.sub(r"\n{3,}", "\n\n", 新)
if not 新.endswith("\n"):
    新 += "\n"

io.open(INIT, "w", encoding="utf-8", newline="\n").write(新)

# 校验
import yaml

try:
    d = yaml.safe_load(新)
    网 = d.get("关系网", {})
    print("  关系网 对数:", len(网))
    # 逐条验键
    坏 = []
    for k, v in 网.items():
        want = "|".join(sorted([v["甲"], v["乙"]]))
        if k != want:
            坏.append((k, want))
    print("  键排序检查:", "✓ 全部正确" if not 坏 else "✗ " + str(坏))
    print("  前置 还在:", "✓" if "前置" in d else "✗")
    print("  关系 还在:", "✓" if "关系" in d else "✗")
except Exception as e:
    print("★ YAML 解析失败:", e)
    sys.exit(2)

print("已写入", INIT)
