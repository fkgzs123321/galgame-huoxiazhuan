# -*- coding: utf-8 -*-
"""把活侠传全部素材生成世界书条目。

★★ 这是「全部素材用上」的主生成器。产出五类条目：

   ① 机制（8 条 constant）    ← other/guide/mechanism/*.md
   ② 事件（223 条关键词触发）  ← event/simple/*.md（逐事件详情）
   ③ 结局（63 条关键词触发）   ← event/ends + badends
   ④ 势力（35 条关键词触发）   ← people/factions/*.md
   ⑤ 人物（130+ 条关键词触发） ← people/characters/*.md
   ⑥ 秘籍（88 条关键词触发）   ← system/books/book_*.md

★ 写作规范（.skills/tavern-cards/references/rules.md）：
   · 数据库格式优先，不是散文：列表与键值对，不用段落
   · 全文简体（转换由 _zh 统一做）
   · 禁止占位符：关键名称必须写实

★ 词条触发：事件/人物/势力/秘籍用**关键词触发**（selective），
   因为它们数量大、彼此独立，全量加载会挤爆上下文。
   机制类用 constant（每轮都要遵守）。
"""
import io
import json
import os
import re
import sys
import urllib.parse

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
RAW = os.path.join(根, r"source\_raw\wiki")
WB = os.path.join(根, "世界书")
OUTDIR = os.path.join(根, "_work", "_wb_generated")

os.makedirs(OUTDIR, exist_ok=True)

生成 = {}   # {分类: {条目名: {"path":..., "keywords":[...], "abstract":..., "content":...}}}


def 写(cat: str, 名: str, 内容: str, 关键词: list, 摘要: str, 相对路径: str):
    """登记一条"""
    生成.setdefault(cat, {})[名] = {
        "path": 相对路径,
        "keywords": [k for k in 关键词 if k],
        "abstract": 摘要,
        "content": 内容,
    }


def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    import html as _h
    s = _h.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def 提条(text: str) -> list:
    出 = []
    for ln in text.split("\n"):
        ln = ln.strip().lstrip("•-").strip()
        if ln:
            出.append(简(ln))
    return 出


# ══════════════════════════════════════════════════════════════
# ① 机制说明 —— constant，每轮都要遵守
# ══════════════════════════════════════════════════════════════
机制目录 = os.path.join(RAW, "other", "guide", "mechanism")
机制名 = {
    "action-point": ("行动点", ["行动", "行动点"], "行动点含义、初始三点、用完进入下一时段；特定事件错过不再来"),
    "mood": ("心相", ["心相", "情绪", "心情"], "心相三档与增减途径；影响培养与对话事件"),
    "attribute": ("属性", ["属性", "数值"], "各项属性的含义与影响"),
    "contribution": ("贡献度", ["贡献", "贡献度"], "贡献度的来源与用途；评点机制"),
    "destiny": ("命运", ["命运"], "命运值的作用；天命骰"),
    "dream-sweetheart": ("心上人", ["心上人", "心上"], "心上人机制"),
    "brother4-selling": ("四师兄卖货", ["卖货", "购买", "四师兄"], "四师兄的商品与购买时机"),
    "surrender": ("投降", ["投降", "认输"], "战斗中投降的后果"),
}

for fn in sorted(os.listdir(机制目录)):
    if not fn.endswith(".md"):
        continue
    key = fn[:-3]
    if key not in 机制名:
        continue
    名, 关键s, 摘要 = 机制名[key]
    # ★ 用 utf-8-sig 读 —— 源文件带 BOM（\ufeff），
    #   而 Python 的 \s **不匹配 BOM**，于是 `\A\s*---` 永远匹配不上，
    #   frontmatter 就被当成正文列进条目了。自测报出来的。
    raw = io.open(os.path.join(机制目录, fn), encoding="utf-8-sig").read()

    # 剥 frontmatter（BOM 已在读取时去掉）
    raw = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S)
    # 双保险：万一格式不同，按「首个 --- 到第二个 ---」切
    if raw.lstrip().startswith("---"):
        a = raw.find("---")
        b = raw.find("---", a + 3)
        if b > 0:
            raw = raw[b + 3:]
    raw = raw.lstrip()

    体 = 清(raw)
    # 去模板残留与标记
    体 = re.sub(r"\{\{[^}]*\}\}", "", 体)                # {{ $frontmatter.title }}
    体 = re.sub(r"\|\|([^|]*)\|\|", r"\1", 体)            # ||强调||
    体 = re.sub(r"^#+\s*", "", 体, flags=re.M)
    体 = 简(体)
    体 = re.sub(r"\n{3,}", "\n\n", 体).strip()
    if not 体:
        continue

    # 转成键值对格式（规则要求：数据库格式优先，不是散文）
    行 = ["机制说明:"]
    段 = None
    for ln in 体.split("\n"):
        ln = ln.strip().lstrip("-").strip()
        if not ln:
            continue
        # 小节标题：短、不以数字开头、含「如何/高/一般/低」这类特征
        if len(ln) < 24 and not ln[0].isdigit() and (
            "如何" in ln or "高心相" in ln or "一般心相" in ln or "低心相" in ln
        ):
            段 = ln
            行.append(f"  {段}:")
            continue
        内容 = re.sub(r"^\d+\.\s*", "", ln).strip()
        if not 内容:
            continue
        if 段:
            行.append(f"    - {内容}")
        else:
            行.append(f"- {内容}")
    写("机制", 名, "\n".join(行), 关键s, 摘要,
      f"世界书/机制/{名}.yaml")

print("① 机制 %d 条" % len(生成.get("机制", {})))

# ══════════════════════════════════════════════════════════════
# ② 事件详情 —— 关键词触发
# ══════════════════════════════════════════════════════════════
详情 = json.load(io.open(os.path.join(根, "_work", "_events_detail.json"), encoding="utf-8"))

事件数 = 0
for x in 详情:
    if x["类"] != "事件":
        continue
    标题 = x["标题"]
    段s = [d for d in x["段"] if d["事件名"]]
    if not 段s:
        continue

    行 = [f"事件: {标题}"]
    if x["时"] is not None:
        年 = x["年"]
        月 = x["月"]
        旬 = ["上旬", "中旬", "下旬"][x["旬"] - 1] if 1 <= x["旬"] <= 3 else ""
        行.append(f"时序: 第{年}年{月}月{旬}")
    if len(段s) > 1:
        行.append(f"系列: 共 {len(段s)} 环")

    for d in 段s:
        行.append(f"  {d['事件名']}:")
        if d["窗"]:
            行.append(f"    窗口: 时序 {d['窗'][0]} ~ {d['窗'][1]}")
        if d["前置"]:
            行.append(f"    前置: {'、'.join(d['前置'])}")
        if d["触发条件"]:
            行.append("    触发:")
            for c in d["触发条件"]:
                行.append(f"      - {c}")
        内容 = d["内容"]
        # 内容去掉效果部分（效果单独列，避免重复）
        if 内容:
            行.append("    经过:")
            for ln in 内容.split("\n"):
                ln = ln.strip()
                if ln:
                    行.append(f"      - {ln[:400]}")
        if d["效果"] or d["好感"]:
            行.append("    数值:")
            效果 = dict(d["效果"])
            for k, v in d["好感"].items():
                效果[k + "好感"] = v
            for k, v in 效果.items():
                行.append(f"      {k}: {v:+d}")
        if d["旗标"]:
            行.append("    旗标:")
            for f in d["旗标"]:
                行.append(f"      - {'非' if f['非'] else ''}{f['名']}")
        if d["选项"]:
            行.append("    选项:")
            for o in d["选项"]:
                行.append(f"      - {o['说法']}（{o['效果原始']}）")
        if d["备注"]:
            行.append(f"    备注: {d['备注'][:400]}")

    # ── 关键词 ──
    #
    # ★★ 只用**事件名本身**，不要用里面涉及的角色名。
    #
    #   为什么：角色名是事件里的**配角**，不是事件的标识。
    #   早先我把「涉及的角色」也加进关键词，碰撞检查抓到灾难性后果：
    #     提到「叶云裳」→ 一次注入 42 条 / 12.8 万字符
    #     提到「唐默铃」→ 21 条 / 7.2 万字符
    #   剧情里提一句女主名字，上下文就爆了。
    #
    #   正确做法：事件靠**自己的名字**触发（「偷懒怪」「四书事件」），
    #   角色相关的信息由 角色/人物 条目负责。
    关键词 = []
    纯名 = re.sub(r"[（(].*?[)）]", "", 标题).strip()
    if 纯名:
        关键词.append(纯名)
    # 标题里的实词（去掉「事件」「系列」这类通用词）
    停用 = {"事件", "系列", "初遇", "初识", "后续", "其一", "其二", "其三"}
    for mm in re.finditer(r"[\u4e00-\u9fa5]{2,6}", 纯名):
        w = mm.group(0)
        if w not in 停用 and len(w) >= 2:
            关键词.append(w)
    # 系列事件：每环自己的名字也是关键词（「偷懒怪1」等）
    for d in 段s[:6]:
        n = re.sub(r"\d+$", "", d["事件名"]).strip()
        if n and n != 标题:
            关键词.append(n)

    # ★★★ 关键词必须**像个名字**。碰撞检查抓到两类垃圾：
    #     · `-`（65 条）—— 表格里的空单元格
    #     · 整句条件文本（「四师兄好感5以上自动触发\n最快第一年四月下旬触发」）
    #   它们永远不会被匹配到，还会让「-」这种超高频词误伤一堆条目。
    干净 = []
    for k in 关键词:
        k = k.strip()
        if not k or k in ("-", "—", "–", "无", "有"):
            continue
        if len(k) > 12:            # 名字不会这么长
            continue
        if "\n" in k or "：" in k or ":" in k:
            continue
        if re.search(r"\d{2,}", k):  # 含长数字的多半是数值条件
            continue
        干净.append(k)
    关键词 = list(dict.fromkeys(干净))[:4]
    if not 关键词:
        # 兜底：至少用事件名（截断到 12 字）
        关键词 = [re.sub(r"[（(].*?[)）]", "", 标题).strip()[:12] or "事件"]

    摘要 = f"{标题}：触发条件、经过、数值后果" + ("、多环前置" if len(段s) > 1 else "")
    写("事件", 标题, "\n".join(行), 关键词, 摘要, f"世界书/事件/{标题}.yaml")
    事件数 += 1

print("② 事件 %d 条" % 事件数)

# ══════════════════════════════════════════════════════════════
# ③ 结局 —— 关键词触发
# ══════════════════════════════════════════════════════════════
结局数 = 0
for x in 详情:
    if x["类"] not in ("结局", "坏结局"):
        continue
    标题 = x["标题"]
    正文 = x["段"][0]["内容"] if x["段"] else ""
    # ★ 结局的正文来自 extract_events_detail.py 的「正文」字段，
    #   那条路径**没经过模板清理** —— 于是 {{ $frontmatter.title }} 这一类残留
    #   全带进来了（检查脚本抓到 63 条结局全中）。这里补一遍清理。
    正文 = re.sub(r"\{\{[^}]*\}\}", "", 正文)
    正文 = re.sub(r"\|\|([^|]*)\|\|", r"\1", 正文)
    正文 = re.sub(r"^---\s*$.*?^---\s*$", "", 正文, flags=re.M | re.S)
    正文 = re.sub(r"^#+\s*", "", 正文, flags=re.M)
    正文 = 简(正文)

    行 = [f"结局: {标题}", f"类别: {x['类']}"]
    for ln in 正文.split("\n"):
        ln = ln.strip().lstrip("•-|").strip()
        if ln and len(ln) > 1:
            行.append(f"  - {ln[:400]}")

    关键词 = [标题] + [m.group(0) for m in re.finditer(r"[\u4e00-\u9fa5]{2,5}", 标题)][:4]
    关键词 = list(dict.fromkeys(关键词))[:5]
    写("结局", 标题, "\n".join(行), 关键词, f"汗青书：{标题}", f"世界书/结局/{标题}.yaml")
    结局数 += 1

print("③ 结局 %d 条" % 结局数)

# ══════════════════════════════════════════════════════════════
# ④ 势力 —— 关键词触发（people/factions/*.md）
# ══════════════════════════════════════════════════════════════
势力目录 = os.path.join(RAW, "people", "factions")
势力数 = 0
for fn in sorted(os.listdir(势力目录)):
    if not fn.endswith(".md") or fn == "index.md":
        continue
    p = os.path.join(势力目录, fn)
    raw = io.open(p, encoding="utf-8-sig").read()
    raw = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S)

    tm = re.search(r"^title:\s*(.+)$", io.open(p, encoding="utf-8-sig").read(), re.M)
    名 = 简(tm.group(1).strip()) if tm else 简(fn[:-3])

    体 = 清(raw)
    体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
    体 = re.sub(r"\|\|([^|]*)\|\|", r"\1", 体)
    体 = re.sub(r"<[^>]*>", "", 体)
    体 = 简(体)
    体 = re.sub(r"\n{2,}", "\n", 体).strip()
    if not 体 or len(体) < 20:
        continue

    行 = [f"势力: {名}", "记载:"]
    for ln in 体.split("\n"):
        ln = ln.strip().lstrip("•-|").strip()
        if ln and len(ln) > 1:
            行.append(f"  - {ln[:400]}")

    关键词 = [名] + [m.group(0) for m in re.finditer(r"[\u4e00-\u9fa5]{2,4}", 名)][:3]
    关键词 = list(dict.fromkeys(关键词))[:4]
    写("势力", 名, "\n".join(行), 关键词, f"{名}：位置、人物、关系", f"世界书/势力/{名}.yaml")
    势力数 += 1
print("④ 势力 %d 条" % 势力数)

# ══════════════════════════════════════════════════════════════
# ⑤ 人物详情 —— 关键词触发（people/characters/*.md）
#
#   ★ 与已有的 6 个核心角色条目互补：
#     那 6 个是我手写的（基础信息 + 性格调色盘），
#     这里是从原作 wiki 提取的**全部 130+ 人物页**（含次要角色与 mobs）。
# ══════════════════════════════════════════════════════════════
人物目录 = os.path.join(RAW, "people", "characters")
# ★★ 6 个核心角色**不再跳过**。
#
#   早先这里 `continue` 跳过它们，理由是「那 6 个已有手写的基础信息+性格调色盘」。
#   但保真度审计发现：它们原作的页面有 6~21 KB，而手写条目只有 400~600 字符 ——
#   于是这 6 个页面的正文（人物列传、各标签页的选项与对话）**全没进卡**。
#   实测保留率：brother1 36% / brother2 34% / brother3 30% / brother4 24%
#              girl0 33% / master 44%。是缺口里最集中的一块。
#
#   现在改成：**两者并存，各管一块**——
#     手写的  基础信息/性格调色盘 → 管「他怎么说话、怎么做事」
#     生成的  原作记载            → 管「原作写了什么事实、有哪些选项」
已有角色 = {"唐中翎", "唐布衣", "唐铮", "唐升", "唐惟元", "唐默铃"}
人物数 = 0
跳过 = 0
for fn in sorted(os.listdir(人物目录)):
    if not fn.endswith(".md") or fn == "index.md":
        continue
    p = os.path.join(人物目录, fn)
    head = io.open(p, encoding="utf-8-sig").read()
    tm = re.search(r"^title:\s*(.+)$", head, re.M)
    名 = 简(tm.group(1).strip()) if tm else 简(fn[:-3])

    raw = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", head, flags=re.S)
    体 = 清(raw)
    体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
    体 = re.sub(r"\|\|([^|]*)\|\|", r"\1", 体)
    体 = re.sub(r"<[^>]*>", "", 体)
    体 = 简(体)
    # 去掉纯属性行（src='...' 之类）
    行s = [ln.strip() for ln in 体.split("\n")]
    行s = [ln for ln in 行s if ln and not re.match(r"^[a-zA-Z-]+=", ln) and len(ln) > 1]
    if len(行s) < 3:
        跳过 += 1
        continue

    # 核心角色：条目名加「原作记载」后缀，与手写条目区分
    条目名 = f"{名}_原作记载" if 名 in 已有角色 else 名
    头 = f"人物: {名}（原作记载）" if 名 in 已有角色 else f"人物: {名}"

    行 = [头, "记载:"]
    for ln in 行s:
        ln = ln.lstrip("•-|").strip()
        if ln:
            行.append(f"  - {ln[:400]}")

    关键词 = [名] + [m.group(0) for m in re.finditer(r"[\u4e00-\u9fa5]{2,4}", 名)][:3]
    关键词 = list(dict.fromkeys(关键词))[:4]
    写("人物", 条目名, "\n".join(行), 关键词,
      f"{名}：原作记载（人物列传、各标签页的选项与对话）",
      f"世界书/人物/{条目名}.yaml")
    人物数 += 1
print("⑤ 人物 %d 条（跳过已有核心角色/空页 %d）" % (人物数, 跳过))

# ══════════════════════════════════════════════════════════════
# ⑥ 秘籍详情 —— 关键词触发（system/books/book_*.md）
#
#   ★ 已有的 脚本/秘籍.ts 是**结构化表**（代码用），
#     这里是**每本的来历与招式描述**（叙事用）—— 互补，不重复。
# ══════════════════════════════════════════════════════════════
秘籍目录 = os.path.join(RAW, "system", "books")
秘籍数 = 0
for fn in sorted(os.listdir(秘籍目录)):
    if not fn.endswith(".md") or not fn.startswith("book_"):
        continue
    p = os.path.join(秘籍目录, fn)
    head = io.open(p, encoding="utf-8-sig").read()
    tm = re.search(r"^title:\s*(.+)$", head, re.M)
    名 = 简(tm.group(1).strip()) if tm else 简(fn[:-3])
    if not 名:
        continue

    raw = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", head, flags=re.S)
    体 = 清(raw)
    体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
    体 = re.sub(r"<[^>]*>", "", 体)
    体 = 简(体)
    行s = [ln.strip() for ln in 体.split("\n")]
    行s = [ln for ln in 行s if ln and not re.match(r"^[a-zA-Z-]+=", ln) and len(ln) > 1]
    if len(行s) < 3:
        continue

    行 = [f"秘籍: {名}", "记载:"]
    for ln in 行s:
        ln = ln.lstrip("•-|").strip()
        if ln:
            行.append(f"  - {ln[:400]}")

    关键词 = [名] + [m.group(0) for m in re.finditer(r"[\u4e00-\u9fa5]{2,4}", 名)][:3]
    关键词 = list(dict.fromkeys(关键词))[:4]
    写("秘籍", 名, "\n".join(行), 关键词, f"{名}：来历、需求、效果", f"世界书/秘籍/{名}.yaml")
    秘籍数 += 1
print("⑥ 秘籍 %d 条" % 秘籍数)

print("\n已生成 %d 类" % len(生成))
json.dump(
    {c: {k: {"path": v["path"], "keywords": v["keywords"], "abstract": v["abstract"], "content": v["content"]}
         for k, v in vs.items()} for c, vs in 生成.items()},
    io.open(os.path.join(OUTDIR, "_index.json"), "w", encoding="utf-8"),
    ensure_ascii=False,
)
print("索引已写入 " + os.path.join(OUTDIR, "_index.json"))
