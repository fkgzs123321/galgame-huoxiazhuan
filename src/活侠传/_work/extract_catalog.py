# -*- coding: utf-8 -*-
"""从 event/story-simple-table.md 提取完整事件目录（含路线分支）。

★★ 三张表的表结构**各不相同**，必须分别处理：
   ① 第一年    ：月份 | 上旬 | 中旬 | 下旬        （4 列，按旬分）
   ② 第二年    ：月 | 旬 | 崆峒留学 | 不留学住客栈 |
                 不留学住破庙 | 青城留学          （6 列，**按路线分**）
   ③ 第三年+   ：结构又不同（见下）

   早先版本把三者都按 ① 解析，于是第二年的表头被当成月份，
   输出里出现「第二年中」「第二年三」这种假月份。
   自测报出来了。

★ 第二年那 4 条路线是原作的重要机制（留学去哪、留不留），
  压平就丢了 —— 所以这一版把「路线」作为独立字段保留。
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
SRC = os.path.join(根, r"source\_raw\wiki\event\story-simple-table.md")
OUT = os.path.join(根, r"_work\_catalog.json")

raw = io.open(SRC, encoding="utf-8").read()


def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def 抽链接(片段: str):
    """从一段 HTML 里抽出所有 [名](链接)"""
    出 = []
    for m in re.finditer(r"\[([^\]]+)\]\(([^)]+)\)", 片段):
        名 = 简(清(m.group(1)))
        if 名:
            出.append({"名": 名, "页": 简(m.group(2))})
    return 出


# ── 按年份节切开 ──
年节s = re.split(r"^## (.+)$", raw, flags=re.M)
目录 = []
年统计 = []

for i in range(1, len(年节s), 2):
    年名 = 简(清(年节s[i]))
    if "備註" in 年名 or "备注" in 年名:
        continue
    体 = 年节s[i + 1]

    # ── 找表头，判断这张表属于哪种结构 ──
    表头s = re.findall(r"<th[^>]*>(.*?)</th>", 体, re.S)
    表头 = [简(清(h)) for h in 表头s]

    是路线表 = (
        any("留學" in h or "留学" in h or "客棧" in h or "破廟" in h for h in 表头)
        # ★ 「第三年十一月至第四年」那张表也是路线表，但路线名是
        #   「无可救药 (Demo) / 不成立西武林 / 成立西武林 / 遣散唐门」——
        #   不含「留学/客栈」，所以必须另外认。
        #   早先漏了这一条，那张表被当成未知结构、只捞链接不保路线。
        or any("西武林" in h or "无可救药" in h or "遣散" in h for h in 表头)
        # 通用兜底：前两列是 月/旬，后面还跟着 3 列以上 → 视为路线表
        or (len(表头) >= 5 and 表头[0] in ("月", "月份") and 表头[1] in ("旬",))
    )
    是旬表 = "上旬" in " ".join(表头)

    本表条数 = 0
    if 是路线表 and len(表头) >= 4:
        # 前两列是 月 / 旬，其余是路线名
        路线名 = 表头[2:]
        上一个月 = ""   # ★ rowspan 会让「月」列只在第一行出现，后续行要沿用
        上一个旬 = ""
        for row in re.findall(r"<tr>(.*?)</tr>", 体, re.S):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
            if len(cells) < 2:
                continue
            首 = 简(清(cells[0]))
            if not 首 or 首 == "月":
                continue

            # ★ 判定这一行的首格是「月」、「旬」，还是**直接就是路线数据**。
            #   三种情况都真实存在（rowspan 惹的）：
            #     · 「三」          → 月份
            #     · 「下」/「下旬」  → 旬（月沿用上一行）
            #     · 「[唐门战后](…)」→ rowspan=2 把月与旬都占了，
            #                          本行起手就是路线格
            #   早先只处理了前两种，第三种被当成月份，输出里出现
            #   「第二年 / [唐门战后](…) / 巧遇龙渊」这种假月份。自测报出来了。
            if 抽链接(首):
                # 首格就是数据 —— 沿用上一行的月与旬，数据从第 0 格起
                月, 旬, 数据起 = 上一个月, 上一个旬, 0
            elif re.match(r"^[上中下]$", 首) or 首 in ("上旬", "中旬", "下旬"):
                月 = 上一个月
                旬 = 首 if 首.endswith("旬") else 首 + "旬"
                上一个旬 = 旬
                数据起 = 1
            else:
                月 = 首
                上一个月 = 月
                旬 = 简(清(cells[1]))
                if re.match(r"^[上中下]$", 旬):
                    旬 += "旬"
                上一个旬 = 旬
                数据起 = 2
            if not 月:
                continue

            # 余下的列对应路线
            colspan4 = bool(re.search(r'colspan\s*=\s*"?([2-9])', row))
            for j, cell in enumerate(cells[数据起:]):
                路线 = 路线名[j] if j < len(路线名) else "（共用）"
                for x in 抽链接(cell):
                    目录.append({
                        "年": 年名, "月": 月, "旬": 旬,
                        "路线": "各线共用" if colspan4 else 路线,
                        **x,
                    })
                    本表条数 += 1
    elif 是旬表:
        for row in re.findall(r"<tr>(.*?)</tr>", 体, re.S):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
            if len(cells) < 2:
                continue
            月 = 简(清(cells[0]))
            if not 月 or "月份" in 月:
                continue
            for j, cell in enumerate(cells[1:]):
                旬 = ["上旬", "中旬", "下旬"][j] if j < 3 else "第%d旬" % (j + 1)
                for x in 抽链接(cell):
                    目录.append({"年": 年名, "月": 月, "旬": 旬, "路线": "", **x})
                    本表条数 += 1
    else:
        # 未知结构 → 不硬解析，只把链接捞出来记下来
        print("  ★ %s 的表结构没识别：%s" % (年名, " / ".join(表头[:6])))
        for x in 抽链接(体):
            目录.append({"年": 年名, "月": "", "旬": "", "路线": "", **x})
            本表条数 += 1

    年统计.append((年名, 本表条数, 表头[:6]))

print("提取到 %d 条事件目录\n" % len(目录))

for 年名, n, 头 in 年统计:
    print("  %-22s %3d 条   表头: %s" % (年名, n, " | ".join(头)))

# ── 检查假月份（早先的 bug）──
假月 = [x for x in 目录 if x["月"] and not re.match(r"^[一二三四五六七八九十]+月?$", 月 := x["月"])]
print("\n可疑的「月」值：%d 个" % len(假月))
for x in 假月[:6]:
    print("    %s / %s / %s" % (x["年"], x["月"], x["名"]))

# ── 路线统计 ──
from collections import Counter
路线 = Counter(x["路线"] for x in 目录 if x["路线"])
if 路线:
    print("\n路线分布：")
    for k, n in 路线.most_common():
        print("  %-14s %d" % (k, n))

print("\n第一年四月：")
for x in 目录:
    if "第一年" == x["年"] and x["月"] == "四月":
        print("    %s %s" % (x["旬"], x["名"]))

json.dump(目录, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n已写入 " + OUT)
