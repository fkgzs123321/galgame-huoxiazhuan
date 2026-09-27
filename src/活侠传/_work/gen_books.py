# -*- coding: utf-8 -*-
"""把提取的秘籍数据转成 TS 表（含效果/条件的结构化解析）。

★ 关键：原作的「效果」列混了两种东西 ——
    · 属性变化：刀劍10 / 輕功-5 / 性情+5
    · 技能名：  霹靂刀 / 疾如風 / 龍淵七絕
  必须分开，否则会把「霹雳刀」当成属性塞进 schema。
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # ★ 用卡内同源的表，不再直接调 zhconv（见 _zh.py）

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, "_work", "_books.json")
OUT = os.path.join(根, "脚本", "秘籍.ts")

书 = json.load(io.open(SRC, encoding="utf-8"))




# ── schema 里的合法属性名（对不上的一律当技能名）──
合法属性 = {
    "刀剑", "暗器", "拳掌", "腿法", "奇门", "软兵器", "枪棍", "内功",
    "轻功", "魅力", "学问", "嘴力", "道德", "性情", "处世", "修养",
    "心相", "阴阳", "体力", "内力", "武学点", "抗毒", "抗麻", "形意拳",
    "医术", "战术", "毒药", "麻痹", "锻造", "炼丹", "变心", "命运",
    "银两", "名声", "贡献度", "向心", "儒学", "佛学", "道学", "爆发", "防御",
}

# ★ 效果条目的形态（从真实数据看）：
#     刀劍10      属性 + 无符号数字（练成后 +
#     輕功-5      属性 + 负号
#     性情+5      属性 + 正号
#     霹靂刀      技能名（无数字）
#     儒學LV1     技能/天赋带等级
#     處世靠中    状态描述
#   早先正则是 `^([\u4e00-\u9fff]{2,4})([+-]\d+)?$` —— 漏了**无符号数字**，
#   于是「刀剑10」被当成技能名。自测的输出里能看见（技能列表混进属性）。
效果模式 = re.compile(r"^([\u4e00-\u9fff]{2,4})\s*([+-]?\d+)?$")

# 条件形态：刀劍20 / 性情>=60 / 輕功>=20
条件模式 = re.compile(r"^([\u4e00-\u9fff]{2,4})\s*(>=|<=|>|<|=)\s*(\d+)$")


# ★★ 三类分拣（第三类是从真实数据里看出来的）
#     属性变化：刀劍10 / 輕功-5 / 性情+5      → 加成
#     招式技能：霹靂刀 / 疾如風 / 金剛腿LV     → 技能
#     天赋/状态：儒學LV1 / 變心+ / 處世靠中   → 天赋与状态
#   早先把三类混成两类，结果「儒学LV」「处世靠中」被当成招式，
#   而那些其实对应 schema 里的 `天赋` 与性格档位。
状态词 = ("靠中", "靠左", "靠右", "上限", "下限")
天赋模式 = re.compile(r"^([\u4e00-\u9fff]{2,4})LV(\d*)$")
# 少数没有 LV/靠中 标记、但确实是天赋的（从数据里人工辨认）
天生天赋 = {"傲慢", "自恋", "谦逊", "仁心", "铁石心肠", "浪子", "书香"}


def 解析效果(items):
    属性, 技能, 天赋 = {}, [], []
    for raw in items:
        s = 简(raw).replace(" ", "")
        if not s:
            continue
        # ★ 先剥掉尾部的 «+» / «-» / «±数字»，再判断本体是不是属性名。
        #   原作的写法很杂：道德- / 變心+ / 陰陽- 都是「属性 + 方向符号」，
        #   只有先归一化才认得出来。
        裸 = re.sub(r"[+-]?\d*[+-]?$", "", s) or s

        m = 效果模式.match(s)
        if m and m.group(1) in 合法属性:
            属性[m.group(1)] = int(m.group(2) or "0")
            continue
        # 裸名是属性 + 只有方向符号（道德- / 阴阳-）
        if 裸 in 合法属性 and 裸 != s and not re.search(r"\d", s):
            方向 = -1 if s.endswith("-") else 1
            属性[裸] = 方向
            continue
        # 天赋：儒学LV1 / 战术LV2
        mt = 天赋模式.match(s)
        if mt:
            天赋.append({"名": mt.group(1), "等级": int(mt.group(2) or "1")})
            continue
        # 状态描述（处世靠中 / 变心+）→ 归天赋
        #   但「傲慢」这类没有标记的，靠一份小名单兜底
        if any(w in s for w in 状态词) or s.endswith("+") or s in 天生天赋:
            天赋.append({"名": 裸, "等级": 1})
            continue
        技能.append(re.sub(r"[+-]?\d+$", "", s))
    return 属性, 技能, 天赋


def 解析条件(items):
    """解析「条件」列。
    ★ 原作的写法有两种：
        · 平铺：  刀劍20 / 性情>=60 / 輕功>=20
        · 分段：  LV2, 內力>=20, 陰陽<40, LV5, 內力>=30, 陰陽>=60 …
                  —— LVn 是「练到第 n 层时」的标记，后面的条件属于那一段。
    ★ 早先版本把分段条件摊平成 7 条平铺门槛，语义就丢了
      （看起来像「要同时满足内力>=20 且 内力>=30 且…」）。
      现在按 LV 分组保留。
    """
    段 = []          # [{层: n|None, 条件: [...]}]
    当前 = {"层": None, "条件": []}
    for raw in items:
        s = 简(raw).replace(" ", "")
        if not s:
            continue
        ml = re.match(r"^LV(\d+)$", s, re.I)
        if ml:
            # 起新一段
            if 当前["条件"] or 当前["层"] is not None:
                段.append(当前)
            当前 = {"层": int(ml.group(1)), "条件": []}
            continue
        m = 条件模式.match(s)
        if m:
            当前["条件"].append({"目标": m.group(1), "比较": m.group(2), "值": int(m.group(3))})
    if 当前["条件"] or 当前["层"] is not None:
        段.append(当前)
    # 没有 LV 标记的平铺条件 → 归成一段（层为 None）
    return [x for x in 段 if x["条件"]]


表 = []
for b in 书:
    属性, 技能, 天赋 = 解析效果(b.get("效果", []))
    条件 = 解析条件(b.get("条件", []))
    名 = 简(b["名"])
    if not 名:
        continue
    try:
        点 = int(re.search(r"\d+", str(b.get("武学点", "0")).replace(",", "")).group(0))
    except Exception:
        点 = 0
    try:
        价 = int(re.search(r"\d+", str(b.get("价格", "0")).replace(",", "")).group(0))
    except Exception:
        价 = 0
    表.append({
        "名": 名,
        "类": 简(b["类"]),
        "武学点": 点,
        "价格": 价,
        "加成": 属性,
        "技能": 技能,
        "天赋": 天赋,
        "门槛": 条件,
        "获得": [简(x) for x in b.get("获得", [])],
        "条件原文": [简(x) for x in b.get("条件", [])],
    })

print("共 %d 本" % len(表))
有加成 = sum(1 for b in 表 if b["加成"])
有技能 = sum(1 for b in 表 if b["技能"])
有天赋 = sum(1 for b in 表 if b["天赋"])
有门槛 = sum(1 for b in 表 if b["门槛"])
分段门槛 = sum(1 for b in 表 if any(x["层"] is not None for x in b["门槛"]))
print("  有属性加成: %d" % 有加成)
print("  带招式:     %d" % 有技能)
print("  带天赋:     %d" % 有天赋)
print("  有修炼门槛: %d（其中分段门槛 %d）" % (有门槛, 分段门槛))

# 条件里出现的属性
from collections import Counter
c = Counter()
for b in 表:
    for 段 in b["门槛"]:
        for x in 段["条件"]:
            c[x["目标"]] += 1
print("\n修炼门槛涉及的属性：")
for k, n in c.most_common(12):
    print("  %-8s %d 次" % (k, n))

# 分段门槛长什么样
print("\n分段门槛示例：")
for b in 表:
    if any(x["层"] is not None for x in b["门槛"]):
        print("  %s：" % b["名"])
        for 段 in b["门槛"]:
            cond = "、".join("%s%s%d" % (g["目标"], g["比较"], g["值"]) for g in 段["条件"])
            print("    %s → %s" % ("LV%d" % 段["层"] if 段["层"] else "入门", cond))
        break

# 招式与天赋总览
全部技能 = Counter()
全部天赋 = Counter()
for b in 表:
    for s in b["技能"]:
        全部技能[s] += 1
    for t in b["天赋"]:
        全部天赋[t["名"]] += 1
print("\n不同招式：%d 个" % len(全部技能))
print("  " + "、".join(list(全部技能)[:20]))
print("\n不同天赋：%d 个" % len(全部天赋))
print("  " + "、".join(list(全部天赋)[:16]))

# ── 生成 TS ──
行 = []
行.append("/**")
行.append(" * 原作秘籍表")
行.append(" *")
行.append(" * ★ 由 _work/gen_books.py 从 source/_raw/wiki/system/books/index.md 提取，不要手改。")
行.append(" *   原文是繁体，已用繁简.ts 转成简体。")
行.append(" *")
行.append(" * ★ 原作这张表的「条件」列直接就是前置引擎要的数据（刀剑20 / 性情>=60）。")
行.append(" *   「效果」列混了两种东西，提取时已分开：")
行.append(" *     · 加成 → 属性变化（对得上 schema 的那些）")
行.append(" *     · 技能 → 学到的招式名（霹雳刀 / 疾如风 / 龙渊七绝）")
行.append(" */")
行.append("")
行.append("export interface 秘籍 {")
行.append("  名: string;")
行.append("  类: string;")
行.append("  武学点: number;")
行.append("  价格: number;")
行.append("  /** 练成后的属性变化，键都是 schema 里有的 */")
行.append("  加成: Record<string, number>;")
行.append("  /** 学到的招式名 */")
行.append("  技能: string[];")
行.append("  /** 附带的天赋（原作写「儒学LV1」这类） */")
行.append("  天赋: Array<{ 名: string; 等级: number }>;")
行.append("  /**")
行.append("   * 修炼门槛 —— 对应原作「条件」列。")
行.append("   *")
行.append("   * ★ 是**分段**的：`层` 为 null 表示入门条件；")
行.append("   *   有 `层` 则表示练到第 n 层时的条件（原作写 LV2 / LV5 / LV8）。")
行.append("   *   早先版本把它摊平成一条平铺数组，语义就丢了。")
行.append("   */")
行.append("  门槛: Array<{ 层: number | null; 条件: Array<{ 目标: string; 比较: string; 值: number }> }>;")
行.append("  /** 获得方式（含地点与事件线索） */")
行.append("  获得: string[];")
行.append("}")
行.append("")
行.append("export const 秘籍表: 秘籍[] = [")
for b in 表:
    行.append("  {")
    行.append("    名: %s," % json.dumps(b["名"], ensure_ascii=False))
    行.append("    类: %s," % json.dumps(b["类"], ensure_ascii=False))
    行.append("    武学点: %d," % b["武学点"])
    行.append("    价格: %d," % b["价格"])
    行.append("    加成: %s," % json.dumps(b["加成"], ensure_ascii=False))
    行.append("    技能: %s," % json.dumps(b["技能"], ensure_ascii=False))
    行.append("    天赋: %s," % json.dumps(b["天赋"], ensure_ascii=False))
    行.append("    门槛: %s," % json.dumps(b["门槛"], ensure_ascii=False))
    行.append("    获得: %s," % json.dumps(b["获得"], ensure_ascii=False))
    行.append("  },")
行.append("];")
行.append("")
行.append("/** 按名字取一本 */")
行.append("export function 取秘籍(名: string): 秘籍 | undefined {")
行.append("  return 秘籍表.find(b => b.名 === 名);")
行.append("}")
行.append("")
行.append("/** 判一条条件 */")
行.append("function 满足(c: { 目标: string; 比较: string; 值: number }, 值表: Record<string, number>): boolean {")
行.append("  const 有 = Number(值表[c.目标]) || 0;")
行.append("  switch (c.比较) {")
行.append("    case '>=': return 有 >= c.值;")
行.append("    case '>':  return 有 >  c.值;")
行.append("    case '<=': return 有 <= c.值;")
行.append("    case '<':  return 有 <  c.值;")
行.append("    case '=':  return 有 === c.值;")
行.append("    default:   return false;")
行.append("  }")
行.append("}")
行.append("")
行.append("/**")
行.append(" * 当前能不能练。")
行.append(" * ★ 只看**入门那一段**（层为 null 或最小层）。")
行.append(" *   分段门槛里更高的层是「练到那儿再要什么」，不该卡在入门。")
行.append(" */")
行.append("export function 能练吗(名: string, 值表: Record<string, number>): { 能: boolean; 缺: string[] } {")
行.append("  const b = 取秘籍(名);")
行.append("  if (!b) return { 能: false, 缺: ['没有这本秘籍'] };")
行.append("  // 取最靠前的一段")
行.append("  const 入选 = b.门槛.filter(x => x.层 === null);")
行.append("  const 首段 = 入选.length ? 入选 : b.门槛.slice(0, 1);")
行.append("  const 缺: string[] = [];")
行.append("  for (const 段 of 首段) {")
行.append("    for (const c of 段.条件) {")
行.append("      if (!满足(c, 值表)) 缺.push(c.目标 + ' ' + c.比较 + ' ' + c.值);")
行.append("    }")
行.append("  }")
行.append("  return { 能: 缺.length === 0, 缺 };")
行.append("}")
行.append("")
行.append("/** 练到第 n 层要满足什么（进阶用） */")
行.append("export function 进阶门槛(名: string, 层: number): Array<{ 目标: string; 比较: string; 值: number }> {")
行.append("  const b = 取秘籍(名);")
行.append("  if (!b) return [];")
行.append("  return b.门槛.find(x => x.层 === 层)?.条件 ?? [];")
行.append("}")
行.append("")
行.append("export default { 秘籍表, 取秘籍, 能练吗, 进阶门槛 };")
行.append("")

io.open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(行))
print("\n已生成 " + OUT)
print("  %d 字符" % len("\n".join(行)))
