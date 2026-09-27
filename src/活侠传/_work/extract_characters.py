# -*- coding: utf-8 -*-
"""提取 6 个核心角色的完整资料（供写三面性/二次解释用）。

★ 为什么单独提：角色条目要写准，就得看全原文的「角色资料」表 +
  各标签页的行为描述，不能凭印象。
"""
import html
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, r"source\_raw\wiki\people\characters")
OUT = os.path.join(根, "_work", "_characters.json")

目标 = {
    "brother1": "唐布衣", "brother2": "唐铮", "brother3": "唐升",
    "brother4": "唐惟元", "girl0": "唐默铃", "master": "唐中翎",
}


def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "｜", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


出 = {}
for key, 名 in 目标.items():
    p = os.path.join(SRC, key + ".md")
    if not os.path.exists(p):
        continue
    raw = io.open(p, encoding="utf-8-sig").read()

    资料 = {}
    # 「角色资料」表：<ChTd isTitle=true>键</ChTd><ChTd>值</ChTd>
    for m in re.finditer(
        r"<ChTd[^>]*isTitle=true[^>]*>(.*?)</ChTd>\s*<ChTd[^>]*>(.*?)</ChTd>", raw, re.S
    ):
        k = 简(清(m.group(1)))
        v = 简(清(m.group(2)))
        if k and v and k not in 资料:
            资料[k] = v

    # 简介（ChMeet 的 desc）
    desc = ""
    dm = re.search(r"desc='(.*?)'", raw, re.S)
    if dm:
        desc = 简(清(dm.group(1))).replace("｜", "")

    # 各标签页里的正文（去掉标签与属性）
    正文 = []
    for tm in re.finditer(r"<ChTab[^>]*title=\"([^\"]+)\"[^>]*>(.*?)</ChTab>", raw, re.S):
        t = 简(tm.group(1))
        b = 清(tm.group(2))
        b = re.sub(r"\s+", " ", b).strip()
        b = re.sub(r"^[a-zA-Z][a-zA-Z0-9]*=", "", b)
        if b and len(b) > 4:
            正文.append((t, b[:300]))

    # 全部纯文本（兜底）
    全 = 简(清(raw))
    for pat in [r"\{\{[^}]*\}\}", r"<[^>]*>", r"\|\|([^|]*)\|\|"]:
        全 = re.sub(pat, r"\1" if "|" in pat else "", 全)
    全 = re.sub(r"\n{2,}", "\n", 全).strip()

    出[名] = {"资料": 资料, "简介": desc, "标签页": 正文, "全文": 全[:4000]}

json.dump(出, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("提取 %d 人 → %s\n" % (len(出), OUT))
for 名, d in 出.items():
    print("══ %s ══" % 名)
    print("  资料: %s" % json.dumps(d["资料"], ensure_ascii=False)[:200])
    print("  简介: %s" % d["简介"][:110])
    print("  标签页: %d 个 — %s" % (len(d["标签页"]), "、".join(t for t, _ in d["标签页"][:8])))
    print()
