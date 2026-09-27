# -*- coding: utf-8 -*-
"""第三轮：补齐审计查出的 16 个缺口文件。

清单（来自 _work/_audit_gap.txt 的第一版，逐个人工判定后）：
  event/pre-game-timeline.md      故事开始前的江湖大事 → 世界观的根，必进
  system/skill.md                 技能/天赋效果表
  system/hidden-params.md         隐藏参数（界面看不见的）
  system/develop-list.md          锻冶场/炼丹房开发表
  system/forge-roadmap.md         锻冶场开发路线图
  system/facility.md              培养设施
  system/pills.md                 已并入 develop-list（只留指针）
  system/engagement/*.md          战斗指令 / 战斗UI / 状态 / 技能（5 份）
  system/training/train-01.md     养成指令的另一份
  people/characters/other1,4,8.md 三个次要角色页
  people/mobs/*.md                已走众生相.ts；这里再抽「唐门男女弟子」入世界书

  ※ 有意不进的：qna/*（考据来源）、soundtrack（曲目表）、index 页（只列链接）
"""
import html as _h
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _zh import 简  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
RAW = os.path.join(根, r"source\_raw\wiki")
OUTDIR = os.path.join(根, "_work", "_wb_generated")
生成 = json.load(io.open(os.path.join(OUTDIR, "_index.json"), encoding="utf-8"))


def 清(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = _h.unescape(s)
    return re.sub(r"[ \t]+", " ", s).strip()


def 读文本(p: str) -> str:
    raw = io.open(p, encoding="utf-8-sig").read()
    return re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S)


def 净化(s: str) -> str:
    # ★ 顺序讲究：先把带属性的标签整个吃掉，再处理 markdown 链接。
    #   早先只在 清() 里清 `<[^>]+>`，但 清() 在 净化() 之前调用，
    #   而 净化() 里做的 [[..]] / [..](..) 替换会**留下**新的尖括号内容，
    #   于是 <img>/<br>/<table>/<div style> 漏进条目 —— 检查脚本抓到 12 处。
    s = re.sub(r"<img[^>]*>", "", s, flags=re.I)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    s = re.sub(r"\|\|([^|]*)\|\|", r"\1", s)
    s = re.sub(r"\[\[([^\]|]*)\|([^\]]*)\]\]", r"\2", s)   # [[A|B]] → B
    s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)          # [A](url) → A
    s = re.sub(r"^#+\s*", "", s, flags=re.M)
    # 清一遍替换后可能又出现的尖括号
    s = re.sub(r"<[^>]*>", "", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return 简(s).strip()


def 写(cat: str, 名: str, 内容: str, 关键词: list, 摘要: str, 路径: str):
    生成.setdefault(cat, {})[名] = {
        "path": 路径, "keywords": [k for k in 关键词 if k],
        "abstract": 摘要, "content": 内容,
    }


def 列表(文本: str, 上限: int = 60, 缩行: str = "  - ") -> list:
    出 = []
    for ln in 文本.split("\n"):
        ln = ln.strip().lstrip("•-|#").strip()
        if ln and len(ln) > 1:
            出.append(f"{缩行}{ln[:220]}")
        if len(出) >= 上限:
            break
    return 出


# ══════════════════════════════════════════════════════════════
# ① 序章前的江湖大事 —— constant
# ★ 这是世界观的根：唐门为什么被朝廷忌惮、掌门为什么有病根、
#   夏侯兰为什么改名 —— 全在这些「二十年前」里。
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "event", "pre-game-timeline.md")
if os.path.exists(p):
    体 = 净化(读文本(p))
    行 = ["序章前的江湖大事:", "说明: 这些事发生在故事开始之前，是各势力现状的由来"]
    # 表格行：| 相对年代 | 事件 | 概要 |
    表行s = 0
    for m in re.finditer(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$", 体, re.M):
        a, b, c = (x.strip() for x in m.groups())
        if a in ("相对年代", "---") or set(a) <= set("-: "):
            continue
        行.append(f"  {a}:")
        行.append(f"    事: {b}")
        行.append(f"    要: {c[:200]}")
        表行s += 1
    if 表行s == 0:
        行.extend(列表(体, 400))
    写("机制", "序章前的江湖大事", "\n".join(行),
       ["二十年前", "靖康", "武林同盟", "极乐教", "劫法场", "唐门历史"],
       "故事开始前的江湖大事：三次武林同盟、极乐教覆灭、唐门劫法场",
       "世界书/机制/序章前的江湖大事.yaml")
    print("① 序章前的江湖大事：%d 条" % 表行s)

# ══════════════════════════════════════════════════════════════
# ② 技能/天赋效果表 —— 关键词触发
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "system", "skill.md")
if os.path.exists(p):
    raw = 读文本(p)
    行 = ["技能效果:", "说明: 天赋/技能的获取方式与作用"]
    n = 0
    for m in re.finditer(
        r"<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>",
        raw, re.S,
    ):
        名 = 简(清(m.group(1)))
        if 名 in ("技能狀態", "技能状态", ""):
            continue
        lv = 简(清(m.group(2)))
        效 = 简(清(m.group(3))).replace("\n", "；")
        得 = 简(清(m.group(4))).replace("\n", "；")
        行.append(f"  {名}:")
        if lv and lv != "-":
            行.append(f"    等级: {lv}")
        行.append(f"    效果: {效[:200]}")
        if 得:
            行.append(f"    获取: {得[:200]}")
        n += 1
    if n:
        写("机制", "技能效果表", "\n".join(行), ["技能", "天赋", "技能效果"],
           "技能/天赋的等级、效果与获取方式", "世界书/机制/技能效果表.yaml")
        print("② 技能效果表：%d 项" % n)

# ══════════════════════════════════════════════════════════════
# ③ 隐藏参数 —— 关键词触发
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "system", "hidden-params.md")
if os.path.exists(p):
    raw = 读文本(p)
    行 = ["隐藏参数:", "说明: 游戏中无法从界面直接看到的参数"]
    n = 0
    for m in re.finditer(r"<tr>(.*?)</tr>", raw, re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", m.group(1), re.S)
        if len(cells) < 3:
            continue
        v = [简(清(c)).replace("\n", "；") for c in cells]
        if v[0] in ("名稱", "名称", ""):
            continue
        行.append(f"  {v[0]}:")
        行.append(f"    意义: {v[1][:120]}")
        行.append(f"    作用: {v[2][:160]}")
        if len(v) > 3 and v[3]:
            行.append(f"    增减: {v[3][:160]}")
        n += 1
    if n:
        写("机制", "隐藏参数", "\n".join(行), ["隐藏参数", "参数"],
           "界面看不到的参数：意义、作用、增减方式", "世界书/机制/隐藏参数.yaml")
        print("③ 隐藏参数：%d 项" % n)

# ══════════════════════════════════════════════════════════════
# ④ 锻冶场 / 炼丹房 开发表 —— 关键词触发
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "system", "develop-list.md")
if os.path.exists(p):
    raw = 读文本(p)
    行 = ["开发项目:", "说明: 锻冶场打装备、炼丹房炼药；解锁条件与各等级素质如列"]
    n = 0

    # ★ 按 `##` 分节，节内用 re.S 跨行匹配 <tr> ——
    #   早先逐行匹配 `<tr>`，而表格行是**跨多行**的（<td> 各占一行），
    #   单行正则一条都匹配不到，于是这项一条都没产出（自测输出里缺了「④」）。
    for 节m in re.finditer(r"^##\s*(.+)$", raw, re.M):
        节名 = 简(节m.group(1)).strip()
        # 本节范围：从这一行到下一个 ##
        起 = 节m.end()
        下 = re.search(r"^##\s", raw[起:], re.M)
        止 = 起 + (下.start() if 下 else len(raw) - 起)
        体 = raw[起:止]
        行.append(f"  ── {节名} ──")
        for rm in re.finditer(r"<tr>(.*?)</tr>", 体, re.S):
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", rm.group(1), re.S)
            if len(cells) < 4:
                continue
            v = [简(清(c)).replace("\n", "；") for c in cells]
            if v[0] in ("項目名稱", "项目名称", "") or "素質" in v[2] or "素质" in v[2]:
                continue
            行.append(f"    {v[0]}:")
            行.append(f"      解锁: {v[1][:120] or '无'}")
            行.append(f"      素质: {v[2][:80]}")
            等级 = [x for x in v[3:] if x and x != "-"]
            if 等级:
                行.append(f"      等级: {' | '.join(等级[:8])}")
            n += 1
    if n:
        写("机制", "开发项目表", "\n".join(行),
           ["锻冶场", "炼丹房", "开发", "打铁", "炼药", "装备"],
           "锻冶场与炼丹房的开发项目：解锁条件与各等级素质",
           "世界书/机制/开发项目表.yaml")
        print("④ 开发项目表：%d 项" % n)

# ══════════════════════════════════════════════════════════════
# ⑤ 战斗指令 / 战斗UI / 状态 / 技能 —— 关键词触发
# ══════════════════════════════════════════════════════════════
战斗名 = {
    "battle-commands": ("战斗指令", ["战斗", "招式", "出招", "指令"], "战斗中的指令与用法"),
    "battle-tips": ("战斗要诀", ["战斗", "打不过", "要诀"], "战斗的实用提示"),
    "battle-ui": ("战斗界面", ["战斗界面", "气", "血条"], "战斗界面各处的含义"),
    "status": ("状态效果", ["状态", "中毒", "麻痹", "内伤"], "各种状态的来源与效果"),
    "skills": ("武学技能", ["武学", "技能", "招式"], "武学技能一览"),
}
d = os.path.join(RAW, "system", "engagement")
n = 0
if os.path.isdir(d):
    for fn in sorted(os.listdir(d)):
        key = fn[:-3]
        if key not in 战斗名:
            continue
        名, 关键s, 摘要 = 战斗名[key]
        体 = 净化(读文本(os.path.join(d, fn)))
        行 = [f"{名}:"] + 列表(体, 400)
        if len(行) > 1:
            写("机制", 名, "\n".join(行), 关键s, 摘要, f"世界书/机制/{名}.yaml")
            n += 1
print("⑤ 战斗相关：%d 条" % n)

# ══════════════════════════════════════════════════════════════
# ⑥ 培养设施 —— 关键词触发
# ══════════════════════════════════════════════════════════════
for fn, 名, 关键s, 摘要 in [
    ("facility.md", "培养设施", ["设施", "培养", "练功场", "后山"], "各处设施的用途与效果"),
    ("forge-roadmap.md", "锻冶场路线图", ["锻冶场", "打铁", "开发路线", "装备"],
     "锻冶场各件装备的解锁顺序与条件"),
]:
    p = os.path.join(RAW, "system", fn)
    if not os.path.exists(p):
        continue
    raw = io.open(p, encoding="utf-8-sig").read()
    raw = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S)

    # ★★ forge-roadmap.md 的主体是 **mermaid 流程图**（实测 7 张图、33 个节点）。
    #    早先当普通 md 逐行拆，结果把图源码拆成乱码条目：
    #      「- graph TB / - subgraph 锻冶场 - 装备 - 武器 / - A[唐门小剑」
    #    那不是内容，是图。
    #
    #    正确做法：解析 mermaid 的节点定义 `X[名字<img...><br>需要：条件]`，
    #    还原成「物品 → 需要什么」的清单 —— 这才是图本来要表达的信息。
    if "```mermaid" in raw:
        行 = [f"{名}:", "说明: 各件装备/丹药的解锁条件"]
        # ★★ 按**图块分段**解析，键要带上块号。
        #   踩过：7 张 mermaid 图**每张都从 A 重新编号**，
        #   用一个 dict 存会把后面的覆盖前面的 —— 实测只留下 7 个节点（共 33 个）。
        全节点 = []
        for 块号, 块m in enumerate(re.finditer(r"```mermaid(.*?)```", raw, re.S)):
            块 = 块m.group(1)
            # 取这张图的分组名（subgraph 后面那串）
            组 = ""
            gm = re.search(r"subgraph\s+(.+)", 块)
            if gm:
                组 = 简(gm.group(1).strip())
            for m in re.finditer(r"^\s*([A-Z]\w*)\[([^\]]+)\]", 块, re.M):
                体2 = m.group(2)
                体2 = re.sub(r"<img[^>]*>", "", 体2)
                体2 = 体2.replace("<br>", "｜")
                体2 = re.sub(r"\s+", " ", 体2).strip()
                全节点.append((块号, 组, 简(体2)))
        # 按块输出，同一块内按出现顺序（图里就是从低阶到高阶）
        上一块 = -1
        for 块号, 组, 体2 in 全节点:
            if 块号 != 上一块:
                行.append(f"  ── {组 or ('第%d组' % (块号 + 1))} ──")
                上一块 = 块号
            if "｜" in 体2:
                名2, _, 需 = 体2.partition("｜")
                行.append(f"    {名2}: {需}")
            else:
                行.append(f"    {体2}")
        # 图外的说明文字也带上
        图外 = 净化(re.sub(r"```mermaid.*?```", "", raw, flags=re.S))
        for ln in 图外.split("\n"):
            ln = ln.strip().lstrip("•-|#").strip()
            if ln and len(ln) > 4 and not ln.startswith(("graph ", "subgraph ", "end", "%%")):
                行.append(f"  · {ln[:300]}")
        if 全节点:
            写("机制", 名, "\n".join(行), 关键s, 摘要, f"世界书/机制/{名}.yaml")
            print("⑥ %s：%d 个节点 / %d 组（从 mermaid 图解析）"
                  % (名, len(全节点), len(set(x[0] for x in 全节点))))
        continue

    体 = 净化(raw)
    行 = [f"{名}:"] + 列表(体, 400)
    if len(行) > 1:
        写("机制", 名, "\n".join(行), 关键s, 摘要, f"世界书/机制/{名}.yaml")
        print("⑥ %s" % 名)

# ══════════════════════════════════════════════════════════════
# ⑦ 三个次要角色页 —— 关键词触发
# ══════════════════════════════════════════════════════════════
d = os.path.join(RAW, "people", "characters")
n = 0
for fn in ["other1.md", "other4.md", "other8.md"]:
    p = os.path.join(d, fn)
    if not os.path.exists(p):
        continue
    raw = io.open(p, encoding="utf-8-sig").read()
    tm = re.search(r"^title:\s*(.+)$", raw, re.M)
    名 = 简(tm.group(1).strip()) if tm else fn[:-3]
    体 = 净化(re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S))
    行 = [f"人物: {名}", "记载:"] + 列表(体, 400, "  - ")
    if len(行) > 2:
        写("人物", 名, "\n".join(行), [名], f"{名}：身份、经历", f"世界书/人物/{名}.yaml")
        n += 1
print("⑦ 次要角色：%d 条" % n)

# ══════════════════════════════════════════════════════════════
# ⑧ 唐门男女弟子（mobs 的正文，已走众生相.ts，这里补叙事版）—— 关键词触发
# ══════════════════════════════════════════════════════════════
d = os.path.join(RAW, "people", "mobs")
n = 0
for fn, 名, 关键s in [
    ("tang-men-male.md", "唐门男弟子众生", ["唐门", "师弟", "师兄", "同门"]),
    ("tang-men-female.md", "唐门女弟子众生", ["唐门", "师姐", "师妹"]),
]:
    p = os.path.join(d, fn)
    if not os.path.exists(p):
        continue
    体 = 净化(读文本(p))
    行 = [f"{名}:", "说明: 唐门里的普通弟子，各有小故事"] + 列表(体, 400)
    if len(行) > 2:
        写("势力", 名, "\n".join(行), 关键s,
           f"{名}：门内普通弟子的众生相", f"世界书/势力/{名}.yaml")
        n += 1
print("⑧ 弟子众生：%d 条" % n)

# ══════════════════════════════════════════════════════════════
# 保存
# ══════════════════════════════════════════════════════════════
json.dump(生成, io.open(os.path.join(OUTDIR, "_index.json"), "w", encoding="utf-8"),
          ensure_ascii=False)

print()
总 = 0
for 类, 条目s in 生成.items():
    print("  %-6s %4d 条" % (类, len(条目s)))
    总 += len(条目s)
print("  合计 %d 条" % 总)
