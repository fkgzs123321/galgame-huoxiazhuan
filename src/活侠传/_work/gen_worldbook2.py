# -*- coding: utf-8 -*-
"""补齐剩余素材 → 世界书条目（第二轮）。

第一轮做了：机制 8 / 事件 161 / 结局 63 / 势力 25 / 人物 105 / 秘籍 88
这一轮补：称号链、道具表、成就、心上人、开局指引、大事件详情、追求线、
         养成指令（144KB 的那份 develop-list）

★ 素材还有几份是**考据来源**（qna/*、test.md、dali-duan-lineage）——
  那些是「我们从中核实设定」用的，不是给 AI 演的东西，不进世界书。
  但它们的结论已经在别的条目里了。
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
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def 表行(体: str, 列数: int):
    """从 HTML 表格里抽行"""
    出 = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", 体, re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
        if len(cells) < 列数:
            continue
        v = [清(c) for c in cells]
        出.append(v)
    return 出


def 写(cat: str, 名: str, 内容: str, 关键词: list, 摘要: str, 路径: str):
    生成.setdefault(cat, {})[名] = {
        "path": 路径, "keywords": [k for k in 关键词 if k],
        "abstract": 摘要, "content": 内容,
    }


def 读文本(p: str) -> str:
    raw = io.open(p, encoding="utf-8-sig").read()
    return re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S)


# ══════════════════════════════════════════════════════════════
# ① 称号链 —— constant（主角自己叫什么，每轮都可能用到）
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "people", "title-list.md")
if os.path.exists(p):
    体 = 读文本(p)
    行s = 表行(体, 2)
    行 = ["称号链:", "说明: 称号随剧情推进获得，前后有承接关系"]
    for v in 行s:
        if v[0] in ("稱號", "称号"):
            continue
        名 = 简(v[0])
        方式 = 简(v[1]).replace("\n", "；")
        行.append(f"  {名}: {方式}")
    写("机制", "称号链", "\n".join(行), ["称号", "称号链"],
      "主角称号的取得方式与前后关系", "世界书/机制/称号链.yaml")
    print("① 称号链：%d 个称号" % (len(行s) - 1))

# ══════════════════════════════════════════════════════════════
# ② 道具表 —— 关键词触发（买东西时会用到）
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "system", "items", "index.md")
if os.path.exists(p):
    体 = 读文本(p)
    行s = 表行(体, 4)
    行 = ["道具表:", "说明: 四师兄处可购；价格与单次上限如列"]
    n = 0
    for v in 行s:
        if v[0] in ("名稱", "名称"):
            continue
        名 = 简(v[0])
        if not 名:
            continue
        行.append(f"  {名}:")
        行.append(f"    价格: {简(v[1])}")
        行.append(f"    单次上限: {简(v[2])}")
        行.append(f"    效果: {简(v[3]).replace(chr(10), '；')}")
        if len(v) > 4:
            行.append(f"    用法: {简(v[4]).replace(chr(10), '；')}")
        n += 1
    写("机制", "道具表", "\n".join(行), ["道具", "购买", "买", "四师兄", "物品"],
      "四师兄处的商品：价格、单次上限、效果、用法", "世界书/机制/道具表.yaml")
    print("② 道具表：%d 件" % n)

# ══════════════════════════════════════════════════════════════
# ③ 成就 —— 关键词触发
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "event", "achievements", "index.md")
if os.path.exists(p):
    体 = 读文本(p)
    行s = 表行(体, 2)
    if 行s:
        行 = ["成就:", "说明: 达成后解锁；部分成就奖励行动点等"]
        n = 0
        for v in 行s:
            if v[0] in ("名稱", "名称", "成就"):
                continue
            名 = 简(v[0])
            if not 名:
                continue
            行.append(f"  {名}: {简(v[1]).replace(chr(10), '；')[:400]}")
            n += 1
        写("机制", "成就", "\n".join(行), ["成就", "达成"],
          "成就列表与达成方式", "世界书/机制/成就.yaml")
        print("③ 成就：%d 条" % n)

# ══════════════════════════════════════════════════════════════
# ③b 结局总表（ends / badends 的 index 页）
#
#   ★★ 这是补上来的：早先我以为「索引页的内容都在子条目里」，
#      实际不是 —— 索引页是**汇总表**（编号 + 达成方式），
#      子条目是**详情页**（那段剧情本身）。两者内容不同。
#      保真度审计实测：badends/index 有 1242 个实词只在索引页出现、911 个没进卡；
#      ends/index 有 215 个只在索引页、86 个没进卡。
#      例：「三年五月小师妹出走时战败」这类**达成条件**只在索引页有。
# ══════════════════════════════════════════════════════════════
for 子, 标题, 关键s in [
    ("ends", "汗青书总表", ["汗青书", "结局", "结局总表"]),
    ("badends", "生死簿总表", ["生死簿", "坏结局", "结局总表"]),
]:
    p = os.path.join(RAW, "event", 子, "index.md")
    if not os.path.exists(p):
        continue
    体 = 读文本(p)
    行 = [f"{标题}:", "说明: 结局编号与达成方式；详情见对应条目"]
    n = 0
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", 体, re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
        if len(cells) < 2:
            continue
        v = [简(清(c)).replace("\n", "；") for c in cells]
        if not v[0] or "編號" in v[0] or "编号" in v[0]:
            continue
        行.append(f"  {v[0]}:")
        for x in v[1:]:
            # ★ 清掉强调标记 —— 结局总表的正文里有 `||...||`（原文的强调语法）。
            #   检查脚本抓到「生死簿总表」残留一处。
            x = re.sub(r"\|\|([^|]*)\|\|", r"\1", x)
            if x and x not in ("-", "—", "–"):
                行.append(f"    {x[:300]}")
        n += 1
    if n:
        写("结局", 标题, "\n".join(行), 关键s, f"{标题}：编号与达成方式",
          f"世界书/结局/{标题}.yaml")
        print("③b %s：%d 条" % (标题, n))

# ══════════════════════════════════════════════════════════════
# ④ 心上人机制 —— constant（原作核心机制之一）
# ══════════════════════════════════════════════════════════════
p = os.path.join(RAW, "people", "dream-sweetheart.md")
if os.path.exists(p):
    体 = 简(清(读文本(p)))
    体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
    行 = ["心上人机制:"]
    for ln in 体.split("\n"):
        ln = ln.strip().lstrip("•-|#").strip()
        if ln and len(ln) > 1:
            行.append(f"  - {ln[:400]}")
    if len(行) > 2:
        写("机制", "心上人", "\n".join(行), ["心上人", "心上"],
          "心上人如何确定与影响", "世界书/机制/心上人.yaml")
        print("④ 心上人：%d 行" % (len(行) - 1))

# ══════════════════════════════════════════════════════════════
# ⑤ 开局指引 —— constant
# ══════════════════════════════════════════════════════════════
行 = ["开局指引:"]
for fn, 键 in [("1-game-objective.md", "游戏目标"), ("2-how-to-start.md", "如何开始")]:
    p = os.path.join(RAW, "other", "guide", fn)
    if not os.path.exists(p):
        continue
    体 = 简(清(读文本(p)))
    体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
    body = [ln.strip().lstrip("•-|#").strip() for ln in 体.split("\n")]
    body = [x for x in body if x and len(x) > 1]
    行.append(f"  {键}:")
    for x in body[:8]:
        行.append(f"    - {x[:160]}")
if len(行) > 1:
    写("机制", "开局指引", "\n".join(行), ["开局", "开始", "目标"],
      "玩家的目标与开始方式", "世界书/机制/开局指引.yaml")
    print("⑤ 开局指引：%d 行" % (len(行) - 1))

# ══════════════════════════════════════════════════════════════
# ⑥ 大事件详情 —— 关键词触发（detailed_description，69KB）
# ══════════════════════════════════════════════════════════════
d = os.path.join(RAW, "event", "detailed_description")
n = 0
if os.path.isdir(d):
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md"):
            continue
        import urllib.parse
        名 = 简(urllib.parse.unquote(re.sub(r"\.md$", "", fn)))
        # 文件名形如 4-02-2-東西武林盟會戰
        m = re.match(r"^(\d+)-(\d+)-(\d+)-(.+)$", 名)
        标题 = 简(m.group(4)) if m else 名
        if m:
            时 = (int(m.group(1)) - 1) * 36 + (int(m.group(2)) - 1) * 3 + (int(m.group(3)) - 1)
        else:
            时 = None

        体 = 简(清(读文本(os.path.join(d, fn))))
        体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
        体 = re.sub(r"\|\|([^|]*)\|\|", r"\1", 体)
        行s = [x.strip().lstrip("•-|#").strip() for x in 体.split("\n")]
        行s = [x for x in 行s if x and len(x) > 2]

        行 = [f"大事件: {标题}"]
        if 时 is not None:
            行.append(f"时序: {时}")
        行.append("详细过程:")
        for x in 行s:
            行.append(f"  - {x[:200]}")

        关键词 = [标题] + [w for w in re.findall(r"[\u4e00-\u9fa5]{2,5}", 标题)][:3]
        关键词 = list(dict.fromkeys(关键词))[:4]
        写("事件", 标题, "\n".join(行), 关键词, f"大事件详情：{标题}", f"世界书/事件/{标题}.yaml")
        n += 1
print("⑥ 大事件详情：%d 条" % n)

# ══════════════════════════════════════════════════════════════
# ⑦ 追求线 —— 关键词触发（pursuit，39KB）
# ══════════════════════════════════════════════════════════════
d = os.path.join(RAW, "event", "pursuit")
n = 0
if os.path.isdir(d):
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md"):
            continue
        import urllib.parse
        名 = 简(urllib.parse.unquote(re.sub(r"\.md$", "", fn)))
        体 = 简(清(读文本(os.path.join(d, fn))))
        体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
        体 = re.sub(r"\|\|([^|]*)\|\|", r"\1", 体)
        tm = re.search(r"^title:\s*(.+)$", io.open(os.path.join(d, fn), encoding="utf-8-sig").read(), re.M)
        if tm:
            名 = 简(tm.group(1).strip())
        行s = [x.strip().lstrip("•-|#").strip() for x in 体.split("\n")]
        行s = [x for x in 行s if x and len(x) > 2]
        if len(行s) < 3:
            continue
        行 = [f"追求线: {名}", "记载:"]
        for x in 行s:
            行.append(f"  - {x[:200]}")
        关键词 = [名] + [w for w in re.findall(r"[\u4e00-\u9fa5]{2,4}", 名)][:3]
        关键词 = list(dict.fromkeys(关键词))[:4]
        写("事件", f"追求线·{名}", "\n".join(行), 关键词, f"{名}的追求线", f"世界书/事件/追求线·{名}.yaml")
        n += 1
print("⑦ 追求线：%d 条" % n)

# ══════════════════════════════════════════════════════════════
# ⑧ stories —— 关键词触发（14KB，5 个）
# ══════════════════════════════════════════════════════════════
d = os.path.join(RAW, "event", "stories")
n = 0
if os.path.isdir(d):
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md") or fn == "index.md":
            continue
        import urllib.parse
        名 = 简(urllib.parse.unquote(re.sub(r"\.md$", "", fn)))
        raw = io.open(os.path.join(d, fn), encoding="utf-8-sig").read()
        tm = re.search(r"^title:\s*(.+)$", raw, re.M)
        if tm:
            名 = 简(tm.group(1).strip())
        体 = 简(清(re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", raw, flags=re.S)))
        体 = re.sub(r"\{\{[^}]*\}\}", "", 体)
        行s = [x.strip().lstrip("•-|#").strip() for x in 体.split("\n")]
        行s = [x for x in 行s if x and len(x) > 2]
        if len(行s) < 3:
            continue
        行 = [f"故事: {名}", "记载:"]
        for x in 行s:
            行.append(f"  - {x[:200]}")
        关键词 = [名] + [w for w in re.findall(r"[\u4e00-\u9fa5]{2,4}", 名)][:3]
        关键词 = list(dict.fromkeys(关键词))[:4]
        写("事件", f"故事·{名}", "\n".join(行), 关键词, f"{名}（原作故事）", f"世界书/事件/故事·{名}.yaml")
        n += 1
print("⑧ 故事：%d 条" % n)

# ══════════════════════════════════════════════════════════════
# 保存
# ══════════════════════════════════════════════════════════════
print()
总 = 0
for 类, 条目s in 生成.items():
    print("  %-6s %4d 条" % (类, len(条目s)))
    总 += len(条目s)
print("  合计 %d 条" % 总)

json.dump(生成, io.open(os.path.join(OUTDIR, "_index.json"), "w", encoding="utf-8"),
          ensure_ascii=False)
print("已写入 " + os.path.join(OUTDIR, "_index.json"))
