# -*- coding: utf-8 -*-
"""从 event/simple/*.md + ends/*.md + badends/*.md 提取事件详情。

★★ 这是「活侠传全部内容用上」的主块：
   simple 223 个（逐事件详情）、ends 42 个（结局）、badends 21 个（坏结局）。

★ 素材的表格结构（每页一份）：
     <tr>
       <td>事件名称</td>
       <td>触发条件（多条 • 开头）</td>
       <td>事件内容（含 • 心相-20、向心-5 这类效果）</td>
       <td>备注</td>
     </tr>

★ 提取目标不是「原文照搬」，而是**能直接进世界书/代码的结构化数据**：
     · 触发条件里的时间窗（第一年四月上至五月下）→ 可解析成时序区间
     · 效果里的 心相-20、向心-5、唐中翎好感-1 → 与 schema 对得上的键
     · 前置（曾触发「偷懒怪1」）→ 前置链
     · 🚩 旗标 → EventFlags
     · 选项（👉選擇）→ 分支
"""
import html
import io
import json
import os
import re
import sys
import urllib.parse

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简, 自检  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
RAW = os.path.join(根, r"source\_raw\wiki\event")
OUT = os.path.join(根, r"_work\_events_detail.json")


def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r'<span[^>]*title="([^"]*)"[^>]*>(.*?)</span>', r"\2〔\1〕", s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def 提条目(text: str) -> list:
    """把 • 开头的行拆成列表项"""
    出 = []
    for ln in text.split("\n"):
        ln = ln.strip().lstrip("•").strip()
        if ln and ln != "-":
            出.append(ln)
    return 出


# ── 时间窗解析 ──
月名 = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
       "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12}
旬名 = {"上": 1, "中": 2, "下": 3}


def 解时间(文本: str):
    """从触发条件文本里解出时序区间。

    ★ 原文写法很杂（从真实数据里扫出来的）：
        第一年四月上至第一年五月下          ← 标准区间
        第一年四月中至第二年一月下
        最早第三年九月下旬 / 最晚第三年十月上旬   ← 「最早/最晚」前缀
        「…」 → 进入Demo线第三年十一月上旬     ← 混在句子中间
        第二年二月上旬[留学讨论](...)中      ← 带 Markdown 链接
        第三年九月下旬                      ← 单点

    ★ 早先的正则要求「第X年X月X旬」严格连续，只解出 1%（13/1042）。
      放宽成：先用**宽松正则找所有候选**，再取第一个能解出的。

    时序算法与 前置运行时.ts 的 时序() 一致： (年-1)*36 + (月-1)*3 + (旬-1)
    """
    def 单点(s):
        # ★ [一二三四五...] 要贪心匹配「十一」「十二」，否则「十」先吃掉
        m = re.search(r"第?([一二三四1234])年\s*([一二三四五六七八九十]{1,3})\s*月\s*([上中下])旬?", s)
        if not m:
            return None
        年 = int(m.group(1)) if m.group(1).isdigit() else "一二三四".index(m.group(1)) + 1
        if 年 < 1 or 年 > 4:
            return None
        月 = 月名.get(m.group(2))
        if 月 is None or 月 < 1 or 月 > 12:
            return None
        旬 = 旬名[m.group(3)]
        return (年 - 1) * 36 + (月 - 1) * 3 + (旬 - 1)

    # ① 先找区间（含 至/到/~/～/-）
    for m in re.finditer(
        r"第?[一二三四1234]年\s*[一二三四五六七八九十]{1,3}\s*月\s*[上中下]旬?"
        r"\s*[至到~～\-—]\s*"
        r"第?[一二三四1234]年\s*[一二三四五六七八九十]{1,3}\s*月\s*[上中下]旬?",
        文本,
    ):
        段 = re.split(r"[至到~～\-—]", m.group(0))
        a, b = 单点(段[0]), 单点(段[1])
        if a is not None and b is not None:
            return [min(a, b), max(a, b)]

    # ② 再找所有单点，取最早与最晚
    点s = []
    for m in re.finditer(
        r"第?[一二三四1234]年\s*[一二三四五六七八九十]{1,3}\s*月\s*[上中下]旬?", 文本
    ):
        t = 单点(m.group(0))
        if t is not None:
            点s.append(t)
    if 点s:
        return [min(点s), max(点s)]
    return None


# 效果解析：与卡内 schema 对得上的属性名
合法属性 = {
    "刀剑", "暗器", "拳掌", "腿法", "奇门", "软兵器", "枪棍", "内功",
    "轻功", "魅力", "学问", "嘴力", "道德", "性情", "处世", "修养",
    "心相", "阴阳", "体力", "内力", "武学点", "抗毒", "抗麻", "形意拳",
    "医术", "战术", "毒药", "麻痹", "锻造", "炼丹", "变心", "命运",
    "银两", "向心", "名声", "贡献度", "门派资产",
}
别名 = {"武学": "武学点", "贡献": "贡献度", "名声": "名声"}

效果模式 = re.compile(r"([\u4e00-\u9fa5]{2,4})([+-]?\d+)")


def 解效果(文本: str):
    属性, 好感, 旗标 = {}, {}, []
    if not 文本:
        return 属性, 好感, 旗标

    for m in re.finditer(r"(非)?🚩\s*[「『]?([\u4e00-\u9fa5]{2,12})", 文本):
        旗标.append({"非": bool(m.group(1)), "名": 简(m.group(2))})

    已占 = set()
    for m in re.finditer(r"([\u4e00-\u9fa5]{2,4})好感\s*([+-]\d+)", 文本):
        好感[简(m.group(1))] = int(m.group(2))
        已占.add((m.start(), m.end()))

    for m in 效果模式.finditer(文本):
        if any(s <= m.start() < e for s, e in 已占):
            continue
        名 = 别名.get(m.group(1), m.group(1))
        if 名 in 合法属性:
            属性[名] = 属性.get(名, 0) + int(m.group(2))
    return 属性, 好感, 旗标


表 = []

# ── ① simple：逐事件详情 ──
简单目录 = os.path.join(RAW, "simple")
for fn in sorted(os.listdir(简单目录)):
    if not fn.endswith(".md"):
        continue
    p = os.path.join(简单目录, fn)
    raw = io.open(p, encoding="utf-8").read()

    # ── 解析文件名 ──
    #   ★ 时间就编码在文件名里：`1-04-1-偷懒怪` = 第1年4月第1旬。
    #     这是**主要的**时间来源 —— 只有 17 行条件正文提到年月。
    #     早先我按条件正文统计时间窗覆盖率，得出「1%」，
    #     那是**统计错了字段**：真正的时在文件名上，223/223 全都解出来了。
    原始名 = urllib.parse.unquote(re.sub(r"\.md$", "", fn))
    m = re.match(r"^(\d+)-(\d+)-(\d+)-(.+)$", 原始名)
    if m:
        年, 月, 旬 = int(m.group(1)), int(m.group(2)), int(m.group(3))
        事名 = 简(m.group(4))
        时 = (年 - 1) * 36 + (月 - 1) * 3 + (旬 - 1) if 1 <= 年 <= 4 and 1 <= 月 <= 12 else None
    else:
        年 = 月 = 旬 = 0
        事名 = 简(原始名)
        时 = None
    名 = 简(原始名)  # ★ 页名也要转简体 —— 先前漏了，363 处繁体就是这么来的

    标题 = 事名
    tm = re.search(r"^title:\s*(.+)$", raw, re.M)
    if tm:
        标题 = 简(tm.group(1).strip())

    行s = []
    # ★★ 按**表头名**映射列，不按位置。
    #
    #   原文的表格有两种结构（都是真实存在的）：
    #     格式 A（4 列）：事件名稱 | 觸發條件 | 事件內容 | 備註
    #     格式 B（3 列）：        觸發條件 | 事件內容 | 備註    ← 没有事件名列
    #
    #   早先按位置取 v[0]/v[1]/v[2]，又用表头词过滤 v[0] ——
    #   于是格式 B 的每一行都因为「v[0] == 触发条件」被丢掉，
    #   62 个页面（含「游戏开局」「第一晚」「初识唐布衣」这些开局核心页）
    #   全部产出 0 段。这是审计脚本抓出来的。
    #
    #   现在：先读 <th> 定列位，再按列位取值；没有事件名列时用页面标题补。
    表头 = []
    for hm in re.finditer(r"<tr[^>]*class=\"[^\"]*header[^\"]*\"[^>]*>(.*?)</tr>", raw, re.S):
        表头 = [清(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", hm.group(1), re.S)]
        if 表头:
            break
    if not 表头:
        # 有些页的 header 行没有 class，退而取第一个含 <th> 的行
        for hm in re.finditer(r"<tr[^>]*>(.*?)</tr>", raw, re.S):
            if "<th" in hm.group(1):
                表头 = [清(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", hm.group(1), re.S)]
                break

    def 列位(*候选):
        """在表头里找第一个命中的列号"""
        for i, h in enumerate(表头):
            for c in 候选:
                if c in h:
                    return i
        return None

    列_名 = 列位("事件名稱", "事件名称", "阶段名称", "階段名稱", "事件")
    列_条件 = 列位("觸發條件", "触发条件", "條件", "条件")
    列_内容 = 列位("事件內容", "事件内容", "內容", "内容", "說明", "说明")
    列_备注 = 列位("備註", "备注")

    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
        if len(cells) < 2:
            continue
        v = [清(c) for c in cells]

        # 跳过表头行本身（有 <th> 且没有 <td>）
        if "<td" not in row:
            continue

        if 列_条件 is not None and 列_内容 is not None:
            # ★ 有表头 → 按表头映射
            事件名 = v[列_名].strip() if 列_名 is not None and 列_名 < len(v) else ""
            条件文本 = v[列_条件] if 列_条件 < len(v) else ""
            内容 = v[列_内容] if 列_内容 < len(v) else ""
            备注 = v[列_备注] if (列_备注 is not None and 列_备注 < len(v)) else ""
        else:
            # 没表头 → 退回按位置（格式 A）
            if len(cells) < 3:
                continue
            事件名 = v[0].strip()
            条件文本 = v[1]
            内容 = v[2]
            备注 = v[3] if len(cells) > 3 else ""

        # 事件名兜底：格式 B 没有名字列，用页面标题
        if not 事件名 or 事件名 in ("-", "—", "–"):
            事件名 = 标题
        # 事件名不该是一整句话
        if len(事件名) > 24 or "\n" in 事件名:
            事件名 = 标题

        条件s = 提条目(条件文本)

        # 逐条解析
        窗 = None
        前置 = []
        旗标 = []
        for c in 条件s:
            t = 解时间(c)
            if t and not 窗:
                窗 = t
            pm = re.search(r"曾觸發|曾触发|已觸發|已触发", c)
            if pm:
                qm = re.findall(r"[「『]([^」』]+)[」』]", c)
                前置.extend(简(x) for x in qm)
            for f in 解效果(c)[2]:
                旗标.append(f)

        属性, 好感, _ = 解效果(内容)
        # 选项（👉選擇）
        选项 = []
        for om in re.finditer(r"[「『]([^」』]+)[」』]〔([^〕]*)〕", 内容):
            选项.append({"说法": 简(om.group(1)), "效果原始": 简(om.group(2))})

        行s.append({
            "事件名": 简(v[0]),
            "触发条件": [简(x) for x in 条件s],
            "窗": 窗,
            "前置": 前置,
            "内容": 简(内容),
            "效果": 属性,
            "好感": 好感,
            "旗标": 旗标,
            "选项": 选项,
            "备注": 简(备注),
        })

    表.append({
        "页": 名,
        "标题": 标题,
        "类": "事件",
        "年": 年, "月": 月, "旬": 旬,
        "时": 时,
        "段": 行s,
    })

# ── ② ends / badends：结局 ──
for 子目录, 类 in [("ends", "结局"), ("badends", "坏结局")]:
    d = os.path.join(RAW, 子目录)
    if not os.path.isdir(d):
        continue
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md"):
            continue
        raw = io.open(os.path.join(d, fn), encoding="utf-8").read()
        原始名 = urllib.parse.unquote(re.sub(r"\.md$", "", fn))
        名 = 简(原始名)  # ★ 页名要转简体
        tm = re.search(r"^title:\s*(.+)$", raw, re.M)
        标题 = 简(tm.group(1).strip()) if tm else 名
        正文 = 简(清(re.sub(r"^---.*?---", "", raw, flags=re.S)))
        表.append({
            "页": 名, "标题": 标题, "类": 类,
            "年": 0, "月": 0, "旬": 0, "时": None,
            "段": [{"事件名": 标题, "触发条件": [], "窗": None, "前置": [],
                    "内容": 正文[:1200], "效果": {}, "好感": {}, "旗标": [],
                    "选项": [], "备注": ""}],
        })

print("提取到 %d 页\n" % len(表))

from collections import Counter
print("按类：")
for k, n in Counter(x["类"] for x in 表).most_common():
    print("  %-8s %d" % (k, n))

# 时间覆盖率
# ★ 判据要按**页**算，不是按「段里的时间窗」。
#   时间主要来自文件名（1-04-1-…），条件正文里提到年月的只有 17 行。
#   早先按段算，得出「1%」，看起来像解析失败 —— 其实是统计错了字段。
有页时 = sum(1 for x in 表 if x["时"] is not None)
事件页 = sum(1 for x in 表 if x["类"] == "事件")
print("\n有事件详情段的页：%d" % sum(1 for x in 表 if x["段"]))
print("★ 时序覆盖率：%d / %d 页（事件类 %d / %d）"
      % (有页时, len(表), sum(1 for x in 表 if x["类"] == "事件" and x["时"] is not None), 事件页))

总线段 = sum(len(x["段"]) for x in 表)
有窗段 = sum(1 for x in 表 for 段 in x["段"] if 段["窗"])
print("  共 %d 个事件段" % 总线段)
print("  其中条件正文里另带时间窗的 %d 段（补充信息，非主要来源）" % 有窗段)

有前置 = sum(1 for x in 表 for 段 in x["段"] if 段["前置"])
有旗标 = sum(1 for x in 表 for 段 in x["段"] if 段["旗标"])
有选项 = sum(1 for x in 表 for 段 in x["段"] if 段["选项"])
有数值 = sum(1 for x in 表 for 段 in x["段"] if 段["效果"] or 段["好感"])
print("  有前置链 %d 段 / 有旗标 %d 段 / 有选项 %d 段 / 有数值变化 %d 段"
      % (有前置, 有旗标, 有选项, 有数值))

# 效果属性统计
c = Counter()
for x in 表:
    for 段 in x["段"]:
        for k, v in 段["效果"].items():
            c[k] += 1
        for k in 段["好感"]:
            c["好感·" + k] += 1
print("\n涉及属性（前 16）：")
for k, n in c.most_common(16):
    print("  %-14s %d" % (k, n))

# 样例
print("\n样例（偷懒怪）：")
for x in 表:
    if "偷懒怪" in x["标题"] or "偷懶怪" in x["页"]:
        print("  页: %s  时序: %s" % (x["页"], x["时"]))
        for 段 in x["段"]:
            print("    [%s] 窗=%s 前置=%s" % (段["事件名"], 段["窗"], 段["前置"]))
            if 段["效果"] or 段["好感"]:
                print("         效果=%s 好感=%s" % (段["效果"], 段["好感"]))
            if 段["选项"]:
                print("         选项=%s" % [o["说法"] for o in 段["选项"]])
        break

残留 = 自检(表, "_events_detail.json")
print("\n繁体残留：%d" % 残留)

json.dump(表, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("已写入 " + OUT)
