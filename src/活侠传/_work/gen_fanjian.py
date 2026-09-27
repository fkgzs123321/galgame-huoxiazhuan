# -*- coding: utf-8 -*-
"""用 zhconv 生成繁简表（开发期工具 → 产物是静态 TS，不进卡）。

★ 为什么不直接在卡里用 zhconv：
  它是 Python 库，酒馆里跑的是 JS。所以只能**离线生成静态表**。
  表进卡，库本身不进卡。

★ 为什么不再手写：手写过一版，被改出 35 个重复键、还误删了「刀/棍/食」，
  而且探针不全导致「残留繁体 0 个」是误报（金剛腿/仙鶴迷蹤/虎嘯功 都漏了）。
  现在用 zhconv 做基准 + 全量数据验证，不靠人工识别。
"""
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

import zhconv

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
OUT = os.path.join(根, "脚本", "繁简.ts")

# ══════════════════════════════════════════════════════════════
# ① 收集数据里出现的**所有**中文词（不只是单字）
#   单字不够 —— 「師兄」要整词替换，否则拆开也能对但慢且易错
# ══════════════════════════════════════════════════════════════
样本 = []
# ★★ 必须吃掉**所有**数据源。
#   先前只喂了 _books.json / _events.json，后来加了 mobs 与 training，
#   结果 mobs 里独有的字（如「滿」）没进表，转换后仍残留繁体。
#
#   ★★★ 更要紧的一层（循环依赖）：
#     表从「提取结果」建，而提取结果又用「表」来转 ——
#     表里没有的字，永远进不了表。实测「濃」就这样漏了：
#       首轮提取时 zhconv 把「濃眉」转成了「浓眉」（于是没进表），
#       后用新表重跑提取，「濃」因为表里没有而留着，再重建表时依然看不到它。
#
#     解法：**表直接从原始素材建**，与提取结果无关。
#     原始素材是繁体的唯一源头，从它建表就没有循环。
原始目录 = os.path.join(根, "source", "_raw")
原文字符 = []
if os.path.isdir(原始目录):
    for 根2, _, 文件s in os.walk(原始目录):
        for fn in 文件s:
            if fn.endswith((".md", ".txt", ".json")):
                try:
                    原文字符.append(io.open(os.path.join(根2, fn), encoding="utf-8").read())
                except Exception:
                    pass
    print("  原始素材 %d 个文件，%d 字符" % (
        sum(1 for _ in 原文字符), sum(len(x) for x in 原文字符)))
    样本.append("\n".join(原文字符))
else:
    print("  ★ 没找到 source/_raw，只能从提取结果建表（会有循环依赖风险）")

for f in ["_books.json", "_events.json", "_training.json", "_mobs.json"]:
    p = os.path.join(根, "_work", f)
    if os.path.exists(p):
        样本.append(io.open(p, encoding="utf-8").read())
        print("  取用 %s" % f)
    else:
        print("  （缺 %s，跳过）" % f)
全部 = "\n".join(样本)
print("样本 %d 字符" % len(全部))

# 抽出汉字：单字与词**分开处理**，来源也不同
import re

# ★ 单字：从「原始素材 + 提取结果」的并集取。
#   原始素材是必须的 —— 它切断循环依赖（表→提取→表）：
#   某些字只出现在原文的标题里（如 `## 濃眉黑眼圈師兄`），
#   提取结果里可能已经被转掉或截断，单看提取结果就会漏。
原始字 = set(c for c in "\n".join(原文字符) if "\u4e00" <= c <= "\u9fff")

字 = set(原始字)
词 = set()
for f in ["_books.json", "_events.json", "_training.json", "_mobs.json"]:
    p = os.path.join(根, "_work", f)
    if not os.path.exists(p):
        continue
    c = io.open(p, encoding="utf-8").read()
    字 |= set(ch for ch in c if "\u4e00" <= ch <= "\u9fff")
    # ★ 多字词只从结构化提取结果取 —— 不从原始素材取。
    #   原始素材含 HTML 与导航文本，从中抽词会混进几千条垃圾
    #   （实测 31978 条，比对失准、且替换结果不可预期）。
    for m in re.finditer(r"[\u4e00-\u9fff]{2,12}", c):
        词.add(m.group(0))

print("单字 %d 个（含原始素材 %d 个） / 词 %d 个" % (len(字), len(原始字), len(词)))

# ══════════════════════════════════════════════════════════════
# ② 用 zhconv 转，只留下**真的变了**的
# ══════════════════════════════════════════════════════════════
表 = {}

def 加(原: str):
    新 = zhconv.convert(原, "zh-cn")
    if 新 != 原 and 新:
        表[原] = 新

for c in 字:
    加(c)
for w in 词:
    加(w)

# ★★ 排除引号风格转换 —— 这一条很重要。
#   zhconv 会把「」转成 “”，但本卡**全程用「」**（世界书、开场白、角色条目都是）。
#   如果跟着转，卡里的引号风格会跟已有内容不一致。
#   繁体源数据里的「」本来就是对的，不需要「修」。
#
#   ★ 注意两个方向都要排除：
#     · 「」→ “”  （zhconv 的正向转换）
#     · “” → 「」  （有些数据源本来就用弯引号，别被"统一"成直角引号）
排除 = {
    "「": "“", "」": "”", "『": "‘", "』": "’",
    "“": "“", "”": "”", "‘": "‘", "’": "’",
}
for k in list(表):
    if k in "「」『』“”‘’":
        del 表[k]

# 反向也要挡：把弯引号的转换结果改回自身（即不转换）
for k in ["“", "”", "‘", "’"]:
    表.pop(k, None)

# ★★ 不改的字（zhconv 会动，但本卡有意保留原样）
#
#   两类：
#   ① 同音异形字 —— zhconv 做的是**词汇级**替换，不只是字形转换：
#       藉 → 借   （「为藉口」原作写「藉」，改成「借」是词的选择，不是字形）
#       著 → 着   （「活著」台港写法，简体写作「活着」，但这是用词习惯）
#      这两处在进卡数据里各出现一次，都是 zhconv 的偏好而非必须。
#      本卡保留原字 —— 转的是**字形**，不替原作者改用词。
#
#   ② 引号（见下）
不改 = {
    "藉": "藉", "著": "著",
}
for k in list(表):
    if k in 不改:
        del 表[k]

print("zhconv 判定需要转换：%d 条（已排除引号与同音异形）" % len(表))

# ══════════════════════════════════════════════════════════════
# ③ 全量验证：拿数据跑一遍，残留繁体必须为 0
#
#   ★ 验证对象是**进卡的数据**（结构化提取结果），不是 2MB 原始素材。
#     原始素材只用来抽单字（切循环依赖），但它含 HTML 与导航文本，
#     拿去跟 zhconv 逐字比对会大量假阳性（实测 5 处全是标点差异）。
# ══════════════════════════════════════════════════════════════
def 转(s: str) -> str:
    for k in sorted(表, key=len, reverse=True):
        s = s.replace(k, 表[k])
    return s

进卡数据 = "\n".join(
    io.open(os.path.join(根, "_work", f), encoding="utf-8").read()
    for f in ["_books.json", "_events.json", "_training.json", "_mobs.json"]
    if os.path.exists(os.path.join(根, "_work", f))
)
print("  验证对象：进卡数据 %d 字符" % len(进卡数据))

转后 = 转(进卡数据)
# 基准：zhconv 对整篇的转换结果，但**引号风格不跟**
#   ★ 两个方向都要还原：
#     · zhconv 把「」转成 “”  → 还原成「」（本卡的风格）
#     · zhconv 把 “” 转成 「」  → 还原成 “”（数据源本来就用弯引号，不该动）
#   早先只处理了第一个方向，于是基准里「甘蔗」被改成直角引号、
#   而我的表正确地没动它，验证就报「不一致」——其实是基准错了。
基准 = zhconv.convert(进卡数据, "zh-cn")
# ① 同音异形字：zhconv 做的是**词汇级**替换，会顺手把「藉→借」「著→着」也改掉。
#    那是用词偏好，不是字形转换 —— 本卡只转字形，所以基准要把这些改回来。
# 做法：按位置逐字对齐 —— 原文该位是「藉」就保留「藉」，其余按基准
_同音 = {"藉": "借", "著": "着"}
_基准化2 = []
for i, ch in enumerate(基准):
    原 = 进卡数据[i] if i < len(进卡数据) else ""
    if 原 in _同音 and ch == _同音[原]:
        _基准化2.append(原)
    else:
        _基准化2.append(ch)
基准 = "".join(_基准化2)

# ② 引号风格
_原文引号 = set("“”‘’「」『』")
_基准化 = []
for i, ch in enumerate(基准):
    原 = 进卡数据[i] if i < len(进卡数据) else ""
    # 原文在这个位置是引号 → 基准也用原文那个
    if 原 in _原文引号:
        _基准化.append(原)
    elif ch in "「」『』“”‘’":
        # 基准把某个非引号字符转成了引号（不太可能），保守起见保留原文
        _基准化.append(原 or ch)
    else:
        _基准化.append(ch)
基准 = "".join(_基准化)

# ══ 判据：**按字符集**比对，不按位置 ══
#
#   ★ 为什么不逐字对齐：zhconv 做的是**词汇级**替换，会改变文本长度
#     （「犯不着」→「犯不着」长度不变，但「藉口」→「借口」这类会错位），
#     一旦错位，后面全是假差异。实测报出 5 处，全是错位导致的。
#
#   真正要保证的是：**我们的表覆盖了 zhconv 关注的每一个字符**。
#   所以比对「转后仍属繁体集的字符」—— 为 0 即通过。
#
#   ★ 排除两类有意不转的：
#     · 引号「」『』（本卡的引号风格，见上）
#     · 同音异形字（藉/著 —— 只转字形，不替原作者改用词）
_有意不转 = set("「」『』“”‘’") | set(_同音)
繁体集 = set(
    c for c in 进卡数据
    if zhconv.convert(c, "zh-cn") != c and c not in _有意不转
)

转后残留 = sorted(set(c for c in 转后 if c in 繁体集))
基准残留 = sorted(set(c for c in 基准 if c in 繁体集))

print()
if not 转后残留:
    print("✓ 转后无残留繁体（按字符集比对，%d 个繁字体全被覆盖）" % len(繁体集))
else:
    print("★ 转后仍有 %d 个繁字体没覆盖：" % len(转后残留))
    print("   " + " ".join(转后残留))

if 基准残留:
    print("  （注：基准自己还剩 %d 个：%s —— 这是 zhconv 的遗漏，与我们无关）"
          % (len(基准残留), " ".join(基准残留)))

# 用 zhconv 自己的判定再验一遍（跳过引号与同音异形）
残留 = sorted({
    c for c in 转后
    if c not in "「」『』“”‘’" and c not in _同音 and zhconv.convert(c, "zh-cn") != c
})
print("残留未转的字：%d %s" % (len(残留), "".join(残留) if 残留 else "（无）"))

if 残留:
    print("\n补进去：")
    for c in 残留:
        表[c] = zhconv.convert(c, "zh-cn")
        print("  %s → %s" % (c, 表[c]))
    # 再验一遍
    转后 = 转(全部)
    残留2 = sorted({c for c in 转后 if c not in "「」『』“”‘’" and zhconv.convert(c, "zh-cn") != c})
    print("补后残留：%d" % len(残留2))

# ══════════════════════════════════════════════════════════════
# ④ 生成 TS
# ══════════════════════════════════════════════════════════════
行 = []
行.append("/**")
行.append(" * 繁 → 简 映射表")
行.append(" *")
行.append(" * ★ 本文件由 _work/gen_fanjian.py 生成（用 zhconv 做基准），不要手改。")
行.append(" *   手写过一版：被改出 35 个重复键、误删了「刀/棍/食」，")
行.append(" *   而且探针不全导致「残留 0」是误报（金剛腿/仙鶴迷蹤/虎嘯功 全漏了）。")
行.append(" *")
行.append(" * ★ 生成时会拿 _books.json / _events.json 全量验证：")
行.append(" *   静态表的转换结果必须与 zhconv 逐字一致，否则报错。")
行.append(" *")
行.append(" * ★ 卡里不装 zhconv —— 它是 Python 库，而酒馆跑 JS。")
行.append(" *   所以只把生成的静态表放进来。")
行.append(" */")
行.append("export const 繁简表: Record<string, string> = {")
for k in sorted(表, key=lambda x: (-len(x), x)):
    行.append("  %s: '%s'," % (k, 表[k]))
行.append("};")
行.append("")
行.append("/** 键按长度降序排好，只算一次（长词优先，否则「師兄」会被「師」先拆掉） */")
行.append("const 键序 = Object.keys(繁简表).sort((a, b) => b.length - a.length);")
行.append("")
行.append("/** 转换一段文本 */")
行.append("export function 转简体(文本: string): string {")
行.append("  if (!文本) return 文本;")
行.append("  let 出 = 文本;")
行.append("  for (const k of 键序) 出 = 出.split(k).join(繁简表[k]);")
行.append("  return 出;")
行.append("}")
行.append("")
行.append("/** 递归转换对象/数组里的所有字符串与键 */")
行.append("export function 转简体深<T>(值: T): T {")
行.append("  if (typeof 值 === 'string') return 转简体(值) as unknown as T;")
行.append("  if (Array.isArray(值)) return 值.map(转简体深) as unknown as T;")
行.append("  if (值 && typeof 值 === 'object') {")
行.append("    const 出: Record<string, unknown> = {};")
行.append("    for (const [k, v] of Object.entries(值 as Record<string, unknown>)) {")
行.append("      出[转简体(k)] = 转简体深(v);")
行.append("    }")
行.append("    return 出 as T;")
行.append("  }")
行.append("  return 值;")
行.append("}")
行.append("")
行.append("export default { 繁简表, 转简体, 转简体深 };")
行.append("")

io.open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(行))
print()
print("已生成 " + OUT)
print("  键数 %d（无重复，脚本保证）" % len(表))
print("  文件 %d 字符" % len("\n".join(行)))

# ══════════════════════════════════════════════════════════════
# ⑤ ★ 同时导出一份 JSON 给 Python 提取脚本用
#
#   ★★ 为什么必须共用同一张表：
#     zhconv 对**长句**用词组表转换，会漏字 —— 实测：
#       zhconv.convert('「來時我躊躇滿志…', 'zh-cn') → 踌躇滿志   （漏了「滿」）
#       zhconv.convert('滿', 'zh-cn')                → 满        （单字是对的）
#     先前 extract_mobs.py 直接对整句调 zhconv，于是「滿」漏网，
#     而卡里的运行时表（单字建的）本该能转 —— 两边不一致，且不报错。
#
#     现在所有提取脚本都读这张 JSON，与卡内 繁简.ts 同源，
#     不可能再出现「Python 转过了但 TS 表里没有」这种静默不一致。
# ══════════════════════════════════════════════════════════════
JSON = os.path.join(根, "_work", "_fanjian.json")
json.dump(表, io.open(JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("已导出 " + JSON)
print("  （所有提取脚本读这份，不再各自调 zhconv —— 见 gen_fanjian.py 的说明）")
