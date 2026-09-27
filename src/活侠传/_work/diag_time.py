# -*- coding: utf-8 -*-
"""单独测 解时间()：为什么不认那些条件。"""
import io
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import importlib.util

spec = importlib.util.spec_from_file_location(
    "eed", os.path.join(os.path.dirname(os.path.abspath(__file__)), "extract_events_detail.py")
)
# 不执行整个模块（它会写文件），只把函数抠出来
src = io.open(spec.origin, encoding="utf-8").read()
ns = {"io": io, "os": os, "re": __import__("re"), "sys": sys}
# 只取 月名 / 旬名 / 解时间 三段
for 段名 in ["月名", "旬名"]:
    m = __import__("re").search(rf"^{段名} = \{{.*?^\}}", src, __import__("re").M | __import__("re").S)
    if m:
        exec(m.group(0), ns)
m = __import__("re").search(r"^def 解时间\(文本: str\):.*?(?=^# ──|^# 效果解析)", src, __import__("re").M | __import__("re").S)
if m:
    exec(m.group(0), ns)
else:
    print("★ 抠不出 解时间")
    sys.exit(1)

解时间 = ns["解时间"]

样本 = [
    "第一年四月上至第一年五月下",
    "第一年四月中至第二年一月下",
    "最早第三年九月下旬",
    "最晚第三年十月上旬",
    "第三年九月下旬",
    "「能不能不用努力就变厉害。(已经无药可救的故事)」 → 进入Demo线第三年十一月上旬",
    "第二年二月上旬[留学讨论](/event/simple/2-02-1-留学讨论)中",
    "第三年十月中旬",
    "第二年六月上[离家出走](/event/simple/2-06-1-离家出走)时，",
    "第一年四月上",
    "一、四月",
    "第十二年十三月",       # 该被拒
]

print("══ 解时间() 逐样本 ══")
for s in 样本:
    r = 解时间(s)
    print("  %-58s → %s" % (s[:56], r))

print()
print("══ 真实数据里有多少条件行含「年」与「月」══")
import json
d = json.load(io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "_events_detail.json"), encoding="utf-8"))
n = 0
for x in d:
    for 段 in x["段"]:
        for c in 段["触发条件"]:
            if "年" in c and "月" in c:
                n += 1
print("  含年月字样 %d 行" % n)
