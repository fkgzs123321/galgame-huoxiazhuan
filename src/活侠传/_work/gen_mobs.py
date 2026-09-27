# -*- coding: utf-8 -*-
"""生成 脚本/众生相.ts —— 60 组龙套 NPC。

★ 进卡策略：不写全文（片段加起来太大），只留
    · 名 / 归类 / 人数
    · 身份（最长的那条片段，含来路与家世）
    · 关键词（从片段里抽的地点与事件名，供世界书触发）
    · 代表片段（最多 3 条，供 AI 写「遇见了谁」时取材）

★ 为什么值得进卡：主角是外姓弟子，日常打交道的本来就不是掌门与师兄，
   而是这些人。没有他们，唐门的日子就只剩几个名字在说话。
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
SRC = os.path.join(根, "_work", "_mobs.json")
OUT = os.path.join(根, "脚本", "众生相.ts")

原 = json.load(io.open(SRC, encoding="utf-8"))

# 归类 → 中文
归类名 = {
    "tang-men-male": "唐门男弟子",
    "tang-men-female": "唐门女弟子",
    "great-families": "两大世家",
    "orthodox-sects": "六大派",
    "martial-factions": "其他门派",
    "artists": "江湖人士",
    "other": "其他角色",
}

# 从片段里抽关键词（地点 / 事件名）
关键词源 = [
    "唐门", "正心堂", "练功场", "炼丹房", "锻冶场", "伙房", "后山", "大门", "外堡",
    "讲经堂", "男弟子房", "女弟子房", "闹市", "药铺", "茶肆", "客栈",
    "青城", "崆峒", "点苍", "峨嵋", "嵩山", "全真", "雪山", "丐帮", "飞石帮",
    "沧帮", "泥教", "南宫", "上官", "锦香宫", "千灯楼", "杏林", "岭南",
    "叶云舟", "叶云裳", "唐布衣", "唐铮", "唐升", "唐惟元", "唐默铃", "唐中翎",
    "武林大会", "破庙", "阎关三煞", "段考", "贡献", "留学",
]


def 抽关键词(文本: str):
    出 = []
    for k in 关键词源:
        if k in 文本 and k not in 出:
            出.append(k)
    return 出[:10]


表 = []
for x in 原:
    if not x["名"]:
        continue
    全文 = x["身份"] + " " + " ".join(f["故事"] for f in x["片段"])

    # ★★「名」是原文 `##` 标题，它**不一定是人名** ——
    #   实测混着三类：
    #     人名      肥肥 / 唐皓 / 唐敏华
    #     多人合称  方震天/易凡、欺善怕恶三人组
    #     事件名    破庙线、伙房偷吃、志远汤、后山告白、瑞笙拜帖兄弟之妻
    #
    #   早先界面直接拿这些名字去取立绘，于是「伙房偷吃」这种也去查立绘表，
    #   查不到就渲染一个**空白框**（截图里那个只有字的方框就是这么来的）。
    #
    #   判据（宁可判错成「不是人名」，也不要给事件配个空立绘框）：
    #     · 带 ` / ` → 多人，没有单人立绘
    #     · 含「线/组/众人/们/之妻/之女/夫妇/兄弟」→ 事或群体
    #     · 长度 > 7 → 事件名（人名很少这么长）
    #
    #   ★ 长度门槛设 7 而不是 6：「浓眉黑眼圈师兄」是**人物诨名**，7 个字，
    #     早先被误杀。真正的事件名都更长（「瑞笙拜帖兄弟之妻」8 字且含「之妻」）。
    def 像人名(s: str) -> bool:
        if "/" in s or "、" in s:
            return False
        if re.search(r"线$|组$|众人|们$|之妻|之女|夫妇|兄弟|事件|任务", s):
            return False
        if len(s) > 7:
            return False
        return True

    表.append({
        "名": x["名"],
        "类": 归类名.get(x["归类"], x["归类"]),
        "人数": x["人数"],
        "有人名": 像人名(x["名"]),
        "身份": x["身份"][:160],
        "片段": [
            {"场景": f["场景"][:40], "故事": f["故事"][:150]}
            for f in x["片段"][:3]
        ],
        "片段数": len(x["片段"]),
        "关键词": 抽关键词(全文),
    })

print("共 %d 组" % len(表))
print("  片段总数 %d" % sum(x["片段数"] for x in 表))
print("  有关键词的 %d 组" % sum(1 for x in 表 if x["关键词"]))
print("  名像人名的 %d 组 / 不像的 %d 组"
      % (sum(1 for x in 表 if x["有人名"]), sum(1 for x in 表 if not x["有人名"])))
print("\n  判为「不像人名」的（这些不该配立绘）：")
for x in 表:
    if not x["有人名"]:
        print("    %-22s 类=%s" % (x["名"][:20], x["类"]))

from collections import Counter
c = Counter()
for x in 表:
    for k in x["关键词"]:
        c[k] += 1
print("\n关键词（前 16）：")
for k, n in c.most_common(16):
    print("  %-12s %d" % (k, n))

# ── 生成 TS ──
行 = []
行.append("/**")
行.append(" * 江湖众生相 —— 龙套 NPC")
行.append(" *")
行.append(" * ★ 由 _work/gen_mobs.py 从 source/_raw/wiki/people/mobs/*.md 提取，不要手改。")
行.append(" *")
行.append(" * ★ 为什么要有这个：主角是外姓弟子，日常打交道的本来就不是掌门与师兄，")
行.append(" *   而是这些人 —— 欺善怕恶的同门、后山遇见的陌生人、闹市里的摊贩。")
行.append(" *   没有他们，唐门的日子就只剩几个名字在说话。")
行.append(" *")
行.append(" * ★ 原文的分组层级：## 是**人物组**（如「阎关三煞」），组内每个 <table> 是一个人。")
行.append(" *   所以「名」是组名、「人数」是组里有几个立绘。")
行.append(" */")
行.append("")
行.append("export interface 众生 {")
行.append("  /** 组名（原作 ## 标题） */")
行.append("  名: string;")
行.append("  /** 归类：唐门男弟子 / 六大派 / 江湖人士 … */")
行.append("  类: string;")
行.append("  /** 组里有几个立绘 */")
行.append("  人数: number;")
行.append("  /**")
行.append("   * 「名」像不像一个**人名**。")
行.append("   *")
行.append("   * ★ 原作的 `##` 标题混着三类：人名（肥肥）、多人合称（方震天/易凡）、")
行.append("   *   事件名（伙房偷吃 / 破庙线 / 后山告白）。")
行.append("   *   界面只在 有人名 为真时才去取立绘 —— 否则会给事件渲染一个空白框。")
行.append("   */")
行.append("  有人名: boolean;")
行.append("  /** 身份描述（最长的那条片段） */")
行.append("  身份: string;")
行.append("  /** 代表片段（最多 3 条） */")
行.append("  片段: Array<{ 场景: string; 故事: string }>;")
行.append("  /** 片段总数 */")
行.append("  片段数: number;")
行.append("  /** 相关地点与人物（供世界书触发） */")
行.append("  关键词: string[];")
行.append("}")
行.append("")
行.append("export const 众生表: 众生[] = [")
for x in 表:
    行.append("  {")
    行.append("    名: %s," % json.dumps(x["名"], ensure_ascii=False))
    行.append("    类: %s," % json.dumps(x["类"], ensure_ascii=False))
    行.append("    人数: %d," % x["人数"])
    行.append("    有人名: %s," % ("true" if x["有人名"] else "false"))
    行.append("    身份: %s," % json.dumps(x["身份"], ensure_ascii=False))
    行.append("    片段: %s," % json.dumps(x["片段"], ensure_ascii=False))
    行.append("    片段数: %d," % x["片段数"])
    行.append("    关键词: %s," % json.dumps(x["关键词"], ensure_ascii=False))
    行.append("  },")
行.append("];")
行.append("")
行.append("/** 按归类取 */")
行.append("export function 取类(类: string): 众生[] {")
行.append("  return 众生表.filter(x => x.类 === 类);")
行.append("}")
行.append("")
行.append("/** 按关键词找（谁跟这地方/这人有关） */")
行.append("export function 找相关(词: string): 众生[] {")
行.append("  return 众生表.filter(x => x.关键词.includes(词));")
行.append("}")
行.append("")
行.append("/**")
行.append(" * 给界面的：此地有谁 —— **只回人名**。")
行.append(" *")
行.append(" * ★ 区别于 找相关()：那个是按关键词搜、结果里混着事件名，")
行.append(" *   适合喂给 AI 写「这儿可能遇上的事」；")
行.append(" *   界面要拿名字去取立绘，混进事件名就会出现空白框。")
行.append(" */")
行.append("export function 此地人名(地点: string): string[] {")
行.append("  return 众生表")
行.append("    .filter(x => x.有人名 && x.关键词.includes(地点))")
行.append("    .map(x => x.名);")
行.append("}")
行.append("")
行.append("/** 给 AI 的一行速览：某地可能会遇见谁（含事件与群体） */")
行.append("export function 此地有谁(地点: string): string[] {")
行.append("  return 找相关(地点).map(x => x.名 + (x.人数 > 1 ? `（${x.人数} 人）` : ''));")
行.append("}")
行.append("")
行.append("export default { 众生表, 取类, 找相关, 此地人名, 此地有谁 };")
行.append("")

io.open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(行))
print("\n已生成 " + OUT)
print("  %d 字符" % len("\n".join(行)))
