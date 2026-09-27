# -*- coding: utf-8 -*-
"""生成 脚本/事件目录.ts —— 全四年 181 条事件索引。

★ 与 脚本/原作事件.ts 的分工：
   · 原作事件.ts   ：第一年，24 条，**带完整选项与数值后果**（从 timeline 提取）
   · 事件目录.ts   ：全四年，181 条，**只带事件名与详情页**（从 simple-table 提取）

   两者互补：目录负责「什么时候该发生什么」，事件表负责「发生了有什么后果」。

★ 第二年与第三年末有**路线分支**（崆峒留学 / 不留学住客栈 / 不留学住破庙 /
   青城留学 / 成立西武林 / 遣散唐门 …）—— 这是原作的重要机制，
   同一旬不同路线走的是不同事件。压平就丢了。
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, "_work", "_catalog.json")
OUT = os.path.join(根, "脚本", "事件目录.ts")

原 = json.load(io.open(SRC, encoding="utf-8"))

# 年名 → 层数
年序 = {"第一年": 1, "第二年": 2, "第三年": 3, "第四年": 4}
月序 = {"一月": 1, "二月": 2, "三月": 3, "四月": 4, "五月": 5, "六月": 6,
       "七月": 7, "八月": 8, "九月": 9, "十月": 10, "十一月": 11, "十二月": 12,
       "正": 1, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
       "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12}
旬序 = {"上旬": 1, "中旬": 2, "下旬": 3}


def 取年(名: str) -> int:
    for k, v in 年序.items():
        if k in 名:
            return v
    m = re.search(r"第([一二三四])年", 名)
    if m:
        return "一二三四".index(m.group(1)) + 1
    return 0


def 取月(名: str) -> int:
    n = 简(名).strip().rstrip("月")
    if n in 月序:
        return 月序[n]
    m = re.match(r"^(\d+)$", n)
    return int(m.group(1)) if m else 0


表 = []
坏 = []
for x in 原:
    年 = 取年(x["年"])
    月 = 取月(x["月"])
    旬 = 旬序.get(x["旬"], 0)
    if not 年 or not 月 or not 旬:
        坏.append(x)
        continue
    表.append({
        "年": 年,
        "月": 月,
        "旬": 旬,
        # 时序编号，与 前置运行时.ts 的 时序() 同算法
        "时": (年 - 1) * 36 + (月 - 1) * 3 + (旬 - 1),
        "名": x["名"],
        "页": x["页"],
        "路线": x.get("路线", ""),
    })

print("共 %d 条" % len(表))
if 坏:
    print("★ 有 %d 条年月旬解析不出来：" % len(坏))
    for x in 坏[:5]:
        print("    %s / %s / %s / %s" % (x["年"], x["月"], x["旬"], x["名"]))

# 时间范围
if 表:
    print("  时序范围：%d ~ %d" % (min(x["时"] for x in 表), max(x["时"] for x in 表)))
    print("  对应：第 %d 年 到 第 %d 年" % (
        min(x["年"] for x in 表), max(x["年"] for x in 表)))

from collections import Counter
print("\n按年：")
for k, n in sorted(Counter(x["年"] for x in 表).items()):
    print("  第 %d 年：%d 条" % (k, n))

路线 = Counter(x["路线"] for x in 表 if x["路线"])
print("\n路线：")
for k, n in 路线.most_common():
    print("  %-16s %d" % (k, n))

# ── 生成 TS ──
行 = []
行.append("/**")
行.append(" * 原作事件目录（全四年）")
行.append(" *")
行.append(" * ★ 由 _work/gen_catalog.py 从 source/_raw/wiki/event/story-simple-table.md 提取，不要手改。")
行.append(" *")
行.append(" * ★ 与 原作事件.ts 的分工：")
行.append(" *   · 原作事件.ts：第一年 24 条，**带完整选项与数值后果**")
行.append(" *   · 本文件    ：全四年 %d 条，**只带事件名与详情页**" % len(表))
行.append(" *   目录负责「什么时候该发生什么」，事件表负责「发生了有什么后果」。")
行.append(" *")
行.append(" * ★ 第二年与第三年末有**路线分支**（崆峒留学 / 不留学住客栈 /")
行.append(" *   不留学住破庙 / 青城留学 / 成立西武林 / 遣散唐门 …）——")
行.append(" *   同一旬不同路线走的是不同事件，这是原作的重要机制。")
行.append(" */")
行.append("")
行.append("export interface 目录项 {")
行.append("  /** 第几年（1~4） */")
行.append("  年: number;")
行.append("  /** 几月（1~12） */")
行.append("  月: number;")
行.append("  /** 上/中/下旬（1~3） */")
行.append("  旬: number;")
行.append("  /** 时序编号 = (年-1)*36 + (月-1)*3 + (旬-1)，与 前置运行时 的 时序() 同算法 */")
行.append("  时: number;")
行.append("  名: string;")
行.append("  /** 原作 wiki 的详情页 */")
行.append("  页: string;")
行.append("  /** 路线分支（空字符串表示各线共用） */")
行.append("  路线: string;")
行.append("}")
行.append("")
行.append("export const 事件目录: 目录项[] = [")
for x in 表:
    行.append("  { 年: %d, 月: %d, 旬: %d, 时: %d, 名: %s, 页: %s, 路线: %s },"
             % (x["年"], x["月"], x["旬"], x["时"],
                json.dumps(x["名"], ensure_ascii=False),
                json.dumps(x["页"], ensure_ascii=False),
                json.dumps(x["路线"], ensure_ascii=False)))
行.append("];")
行.append("")
行.append("/** 某一旬的目录（不含路线筛选） */")
行.append("export function 该旬目录(年: number, 月: number, 旬: number): 目录项[] {")
行.append("  const 时 = (年 - 1) * 36 + (月 - 1) * 3 + (旬 - 1);")
行.append("  return 事件目录.filter(x => x.时 === 时);")
行.append("}")
行.append("")
行.append("/**")
行.append(" * 某一旬在指定路线下的事件。")
行.append(" *")
行.append(" * ★「各线共用」的判定要认两种写法：")
行.append(" *     · 空字符串（提取时没标路线）")
行.append(" *     · 字面量「各线共用」（提取时 colspan 跨了所有路线列）")
行.append(" *   早先只判了 `!x.路线`，于是「各线共用」被当成一条真路线，")
行.append(" *   按任意具体路线筛都会把它漏掉 —— 该旬路线(x, '崆峒留学') 返回 0。")
行.append(" *   自测抓到的。")
行.append(" */")
行.append("const 共用 = '各线共用';")
行.append("")
行.append("export function 该旬路线(年: number, 月: number, 旬: number, 路线 = ''): 目录项[] {")
行.append("  const 时 = (年 - 1) * 36 + (月 - 1) * 3 + (旬 - 1);")
行.append("  return 事件目录.filter(x => {")
行.append("    if (x.时 !== 时) return false;")
行.append("    // 共用条目：任何路线都出")
行.append("    if (!x.路线 || x.路线 === 共用) return true;")
行.append("    // 有明确路线的：只在匹配时出")
行.append("    return x.路线 === 路线;")
行.append("  });")
行.append("}")
行.append("")
行.append("/** 这一旬有没有路线分支（有则值得在界面上提示） */")
行.append("export function 有分支(年: number, 月: number, 旬: number): boolean {")
行.append("  const 时 = (年 - 1) * 36 + (月 - 1) * 3 + (旬 - 1);")
行.append("  const 线s = new Set(")
行.append("    事件目录.filter(x => x.时 === 时 && x.路线 && x.路线 !== 共用).map(x => x.路线),")
行.append("  );")
行.append("  return 线s.size >= 2;")
行.append("}")
行.append("")
行.append("/** 这一旬涉及哪些路线 */")
行.append("export function 该旬路线名(年: number, 月: number, 旬: number): string[] {")
行.append("  const 时 = (年 - 1) * 36 + (月 - 1) * 3 + (旬 - 1);")
行.append("  return [...new Set(")
行.append("    事件目录.filter(x => x.时 === 时 && x.路线 && x.路线 !== 共用).map(x => x.路线),")
行.append("  )];")
行.append("}")
行.append("")
行.append("/** 全部路线名（去重，不含「各线共用」） */")
行.append("export function 所有路线(): string[] {")
行.append("  return [...new Set(事件目录.map(x => x.路线).filter(r => r && r !== 共用))];")
行.append("}")
行.append("")
行.append("/** 某一年的事件 */")
行.append("export function 该年目录(年: number): 目录项[] {")
行.append("  return 事件目录.filter(x => x.年 === 年);")
行.append("}")
行.append("")
行.append("/** 目录里有没有这一条（按名字查，模糊） */")
行.append("export function 有这事(名: string): boolean {")
行.append("  return 事件目录.some(x => x.名.includes(名));")
行.append("}")
行.append("")
行.append("export default { 事件目录, 该旬目录, 该旬路线, 所有路线, 该年目录, 有这事, 有分支, 该旬路线名 };")
行.append("")

io.open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(行))
print("\n已生成 " + OUT)
print("  %d 字符" % len("\n".join(行)))
