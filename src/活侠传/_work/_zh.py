# -*- coding: utf-8 -*-
"""提取脚本共用的繁简转换工具。

★★ 为什么不直接 import zhconv 调：
   zhconv 对**长句**用词组表转换，会漏字 —— 实测：
     zhconv.convert('「來時我躊躇滿志…', 'zh-cn') → 踌躇滿志   （漏了「滿」）
     zhconv.convert('滿', 'zh-cn')                → 满        （单字是对的）

   于是 extract_mobs.py 转过的句子，卡里的运行时表（单字建的）本该能转，
   但两边不一致 —— 而且不报错，静默残留繁体。

   现在所有提取脚本都用 **gen_fanjian.py 生成的那张表**（_work/_fanjian.json），
   与卡内 脚本/繁简.ts 同源。这样「Python 转过了」和「TS 表里有」不可能脱节。

用法：
    from _zh import 简, 转
"""
import io
import json
import os
import re
import sys

_根 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_表文件 = os.path.join(_根, "_work", "_fanjian.json")

if not os.path.exists(_表文件):
    sys.stderr.write(
        "★ 缺 %s —— 先跑 gen_fanjian.py 生成繁简表。\n" % _表文件
    )
    raise SystemExit(2)

_表 = json.load(io.open(_表文件, encoding="utf-8"))
# 长键优先，避免「師兄」被单字「師」先拆
_键序 = sorted(_表, key=len, reverse=True)


def 转(文本: str) -> str:
    """繁体 → 简体。用与卡内同源的表。"""
    if not 文本:
        return 文本
    for k in _键序:
        文本 = 文本.replace(k, _表[k])
    return 文本


# 语义化别名（各脚本里都写成 简(...)）
简 = 转


def 查漏(文本: str) -> list:
    """找出表里没覆盖、但看着像繁体的字（用来补表）。"""
    try:
        import zhconv
    except ImportError:
        return []
    遗 = set()
    for c in 文本:
        if "\u4e00" <= c <= "\u9fff" and zhconv.convert(c, "zh-cn") != c and c not in _表:
            遗.add(c)
    return sorted(遗)


def 自检(对象, 标签: str = "") -> int:
    """★ 提取脚本写盘前必须调用。

    判据：**某个字符在表里（说明它该被转），但转完还在** → 真残留。
    不去用 zhconv 猜「这字是不是繁体」—— 那会误报一大片简繁同形字，
    实测在真实数据上误报 505 个、真残留只有 21 个。

    返回残留数；有残留就打印出来。
    """
    import json as _json

    s = 对象 if isinstance(对象, str) else _json.dumps(对象, ensure_ascii=False)
    残留 = sorted(set(c for c in s if c in _表))
    if 残留:
        sys.stderr.write(
            "★ %s 有 %d 个繁体没转：%s\n" % (标签 or "数据", len(残留), " ".join(残留))
        )
    return len(残留)


__all__ = ["转", "简", "查漏", "自检", "_表"]
