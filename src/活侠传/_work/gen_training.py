# -*- coding: utf-8 -*-
"""生成 脚本/养成.ts —— 312 条原作养成指令。

★ 核心机制（我手写行动表时完全没想到的）：
   同一个行动的收益**随「心相」档位变化** ——
     心相 0~32   低落：效果打折甚至反效果
     心相 33~64  平常：基础效果
     心相 65~100 高昂：额外收益

   例：正心堂|焚香 / 课外书籍
     平常 → 学问+2、处世-1、向心-1
     高昂 → 武学+2、锻造+2、炼丹+2
     低落 → 学问-1

   schema 里本来就有 `心相`，但先前只当它是个普通属性。
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, "_work", "_training.json")
OUT = os.path.join(根, "脚本", "养成.ts")

原 = json.load(io.open(SRC, encoding="utf-8"))

# schema 里的合法属性名
合法属性 = {
    "刀剑", "暗器", "拳掌", "腿法", "奇门", "软兵器", "枪棍", "内功",
    "轻功", "魅力", "学问", "嘴力", "道德", "性情", "处世", "修养",
    "心相", "阴阳", "体力", "内力", "武学点", "抗毒", "抗麻", "形意拳",
    "医术", "战术", "毒药", "麻痹", "锻造", "炼丹", "变心", "命运",
    "银两", "向心", "名声", "贡献度",
}

# 「武學+2」里的「武學」对应本卡的武学点
别名 = {"武学": "武学点", "武學": "武学点", "银两": "银两", "銀兩": "银两"}


def 解析效果(文本: str):
    """从「学问+2、处世-1、向心-1」这类文本里抽属性变化。
    还会抽出「唐中翎好感+1」这类角色好感，以及 🚩 flag。"""
    属性 = {}
    好感 = {}
    flags = []
    if not 文本 or 文本.strip() in ("-", ""):
        return 属性, 好感, flags

    # 🚩 flag（如「非🚩无可救药线」「🚩福韫在唐门」）
    for m in re.finditer(r"(非)?🚩([\u4e00-\u9fa5]+)", 文本):
        flags.append({"非": bool(m.group(1)), "名": m.group(2)})

    # 角色好感：XXX好感+N（必须放在属性之前，否则会被属性正则吃掉）
    已占用 = set()
    for m in re.finditer(r"([\u4e00-\u9fa5]{2,4})好感([+-]\d+)", 文本):
        start = m.start()
        好感[m.group(1)] = int(m.group(2))
        已占用.add((start, m.end()))

    # 属性变化
    for m in re.finditer(r"([\u4e00-\u9fa5]{2,4})([+-]\d+)", 文本):
        if any(s <= m.start() < e for s, e in 已占用):
            continue
        名 = 别名.get(m.group(1), m.group(1))
        if 名 in 合法属性:
            属性[名] = 属性.get(名, 0) + int(m.group(2))
    return 属性, 好感, flags


表 = []
for x in 原:
    # 「指令」形如「正心堂|焚香」，拆成地点与动作
    地点, _, 动作 = x["指令"].partition("|")
    中, 中好, 中旗 = 解析效果(x["效果中"])
    高, 高好, 高旗 = 解析效果(x["效果高"])
    低, 低好, 低旗 = 解析效果(x["效果低"])

    try:
        贡献 = int(re.search(r"(\d+)", x["贡献"] or "0").group(1))
    except Exception:
        贡献 = 0
    try:
        心相耗 = int(re.search(r"(-?\d+)", x["心相耗"] or "0").group(1))
    except Exception:
        心相耗 = 0
    try:
        权重 = int(re.search(r"(\d+)", x["权重"] or "0").group(1))
    except Exception:
        权重 = 0

    表.append({
        "地点": x["地点"],
        "动作": 动作 or x["指令"],
        "事件": x["事件"],
        "贡献": 贡献,
        "心相耗": 心相耗,
        "权重": 权重,
        "效果": {"低落": 低, "平常": 中, "高昂": 高},
        "好感": {"低落": 低好, "平常": 中好, "高昂": 高好},
        "旗标": 中旗 + 高旗 + 低旗,
        "条件": x["条件"] if x["条件"] not in ("-", "") else "",
        "备注": x["备注"] if x["备注"] not in ("-", "") else "",
    })

print("共 %d 条" % len(表))
有分档 = sum(1 for x in 表 if x["效果"]["高昂"] or x["效果"]["低落"])
print("  效果分档: %d 条" % 有分档)
有旗 = sum(1 for x in 表 if x["旗标"])
print("  带旗标引用: %d 条" % 有旗)
有前提 = sum(1 for x in 表 if x["条件"])
print("  有必要条件: %d 条" % 有前提)

# 效果属性统计
from collections import Counter
c = Counter()
for x in 表:
    for 档 in x["效果"].values():
        for k in 档:
            c[k] += 1
print("\n效果涉及的属性（前 16）：")
for k, n in c.most_common(16):
    print("  %-8s %d" % (k, n))

# 好感统计
好 = Counter()
for x in 表:
    for 档 in x["好感"].values():
        for k in 档:
            好[k] += 1
print("\n涉及的角色好感（前 10）：")
for k, n in 好.most_common(10):
    print("  %-8s %d" % (k, n))

# 旗标
旗 = Counter()
for x in 表:
    for f in x["旗标"]:
        旗[f["名"]] += 1
print("\n旗标引用（前 12）：")
for k, n in 旗.most_common(12):
    print("  %-14s %d" % (k, n))

# ══════════════════════════════════════════════════════════════
# 生成 TS
# ══════════════════════════════════════════════════════════════
行 = []
行.append("/**")
行.append(" * 原作养成指令表")
行.append(" *")
行.append(" * ★ 由 _work/gen_training.py 从 source/_raw/wiki/system/training/index.md 提取，不要手改。")
行.append(" *   原文繁体，已转简体。")
行.append(" *")
行.append(" * ★★ 这张表替掉了先前手写的 15 条行动表（原作有 312 条）。")
行.append(" *")
行.append(" * ★★ 核心机制 —— **心相分档**（手写时完全没想到的）：")
行.append(" *   同一个行动的收益随「心相」档位变化：")
行.append(" *     低落 0~32    效果打折甚至反效果")
行.append(" *     平常 33~64   基础效果")
行.append(" *     高昂 65~100  额外收益")
行.append(" *")
行.append(" *   例：正心堂|焚香 / 课外书籍")
行.append(" *     平常 → 学问+2、处世-1、向心-1")
行.append(" *     高昂 → 武学+2、锻造+2、炼丹+2")
行.append(" *     低落 → 学问-1")
行.append(" */")
行.append("")
行.append("export type 心相档 = '低落' | '平常' | '高昂';")
行.append("")
行.append("export interface 养成指令 {")
行.append("  地点: string;")
行.append("  动作: string;")
行.append("  事件: string;")
行.append("  /** 耗贡献 */")
行.append("  贡献: number;")
行.append("  /** 耗心相（负数为消耗） */")
行.append("  心相耗: number;")
行.append("  /** 机率权重，1~100，越大越常出现 */")
行.append("  权重: number;")
行.append("  /** 三档心相下各自的属性变化 */")
行.append("  效果: Record<心相档, Record<string, number>>;")
行.append("  /** 三档心相下各自的角色好感变化 */")
行.append("  好感: Record<心相档, Record<string, number>>;")
行.append("  /** 依赖的旗标（原作 🚩 线） */")
行.append("  旗标: Array<{ 非: boolean; 名: string }>;")
行.append("  /** 必要条件原文 */")
行.append("  条件: string;")
行.append("  备注: string;")
行.append("}")
行.append("")
行.append("export const 养成表: 养成指令[] = [")
for x in 表:
    行.append("  {")
    行.append("    地点: %s," % json.dumps(x["地点"], ensure_ascii=False))
    行.append("    动作: %s," % json.dumps(x["动作"], ensure_ascii=False))
    行.append("    事件: %s," % json.dumps(x["事件"], ensure_ascii=False))
    行.append("    贡献: %d, 心相耗: %d, 权重: %d," % (x["贡献"], x["心相耗"], x["权重"]))
    行.append("    效果: %s," % json.dumps(x["效果"], ensure_ascii=False))
    行.append("    好感: %s," % json.dumps(x["好感"], ensure_ascii=False))
    行.append("    旗标: %s," % json.dumps(x["旗标"], ensure_ascii=False))
    行.append("    条件: %s," % json.dumps(x["条件"], ensure_ascii=False))
    行.append("    备注: %s," % json.dumps(x["备注"], ensure_ascii=False))
    行.append("  },")
行.append("];")
行.append("")
行.append("/** 心相值 → 档位（原作分界 32 / 64） */")
行.append("export function 心相档(值: number): 心相档 {")
行.append("  const v = Number(值) || 0;")
行.append("  if (v <= 32) return '低落';")
行.append("  if (v <= 64) return '平常';")
行.append("  return '高昂';")
行.append("}")
行.append("")
行.append("/** 按地点筛（界面用） */")
行.append("export function 地点指令(地点: string): 养成指令[] {")
行.append("  return 养成表.filter(x => x.地点 === 地点);")
行.append("}")
行.append("")
行.append("/**")
行.append(" * 按权重随机挑一条 —— 用确定性伪随机（同种子同结果）。")
行.append(" * ★ 不用 Math.random：那样同一回合重渲染结果会变。")
行.append(" */")
行.append("export function 抽一条(地点: string, 掷: number): 养成指令 | null {")
行.append("  const 选 = 地点指令(地点).filter(x => x.权重 > 0);")
行.append("  if (!选.length) return null;")
行.append("  const 总 = 选.reduce((s, x) => s + x.权重, 0);")
行.append("  let 落 = (掷 % 1) * 总;")
行.append("  for (const x of 选) {")
行.append("    落 -= x.权重;")
行.append("    if (落 <= 0) return x;")
行.append("  }")
行.append("  return 选[选.length - 1];")
行.append("}")
行.append("")
行.append("export default { 养成表, 心相档, 地点指令, 抽一条 };")
行.append("")

io.open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(行))
print("\n已生成 " + OUT)
print("  %d 字符" % len("\n".join(行)))
