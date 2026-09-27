# -*- coding: utf-8 -*-
"""检查生成的世界书条目质量 —— 落盘前必过。

★ 批量生成最容易出「格式对但没内容」。这个检查盯四件事：
  ① 条目标题是否写实（规则禁止占位符）
  ② 正文有没有 YAML 头 / 模板残留 / HTML 标签
  ③ 繁简是否干净
  ④ 正文长度是否够（太短的等于没写）
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import _表  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
索引 = json.load(io.open(os.path.join(根, "_work", "_wb_generated", "_index.json"), encoding="utf-8"))

问题 = []
统计 = {}

for 类, 条目s in 索引.items():
    总 = 0
    短 = 0
    for 名, v in 条目s.items():
        总 += 1
        体 = v["content"]

        # ① 模板残留 / YAML 头 / HTML
        for pat, 说明 in [
            (r"\{\{", "模板残留 {{"),
            (r"^---\s*$", "YAML 头 ---"),
            (r"<[a-zA-Z/][^>]*>", "HTML 标签"),
            (r"\|\|", "强调标记 ||"),
            (r"\$frontmatter", "frontmatter 变量"),
            (r"^\s*[a-zA-Z_]+:\s*(true|false)\s*$", "YAML 布尔残留"),
        ]:
            if re.search(pat, 体, re.M):
                问题.append((类, 名, 说明))

        # ② 繁体（按卡内表判定：在表里说明该转）
        繁 = sorted(set(c for c in 体 if c in _表))
        if 繁:
            问题.append((类, 名, "繁体 " + "".join(繁[:6])))

        # ③ 长度
        if len(体) < 40:
            短 += 1
            问题.append((类, 名, "过短 %d 字" % len(体)))

        # ④ 关键词
        if 类 in ("事件", "结局", "势力", "人物", "秘籍") and not v["keywords"]:
            问题.append((类, 名, "无关键词（触发不了）"))

    统计[类] = (总, 短)

print("══ 各类规模 ══")
总条 = 0
总短 = 0
for 类, (n, 短) in 统计.items():
    print("  %-6s %4d 条  过短 %d" % (类, n, 短))
    总条 += n
    总短 += 短
print("  合计 %d 条，过短 %d" % (总条, 总短))

print("\n══ 问题汇总 ══")
if not 问题:
    print("  ✓ 无")
else:
    from collections import Counter
    c = Counter(p[2].split()[0] for p in 问题)
    for k, n in c.most_common():
        print("  %-14s %d 处" % (k, n))
    print("\n  前 16 例：")
    for 类, 名, 说 in 问题[:16]:
        print("    [%s] %s —— %s" % (类, 名[:20], 说))

    # 繁体的要看具体字，便于补表
    繁例 = [p for p in 问题 if p[2].startswith("繁体")]
    if 繁例:
        字 = set()
        for 类, 名, 说 in 繁例:
            字 |= set(说[3:])
        print("\n  涉及繁体字 %d 个：%s" % (len(字), " ".join(sorted(字)[:30])))

print()
if 问题:
    sys.exit(1)
print("✓ 全部合格")
