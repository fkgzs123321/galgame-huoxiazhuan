# -*- coding: utf-8 -*-
"""素材使用审计：逐个文件核对「这份素材进卡了吗」。

★★ 判定要用**正确的键**：
   · 源文件名可能是 URL 编码的（`1-04-1-%E5%81%B7%E6%87%B6%E6%80%AA`）→ 要先解码
   · 源文件是繁体，条目名是简体 → 要先转
   · 多数页面用的是 frontmatter 里的 `title:`，不是文件名 → 优先取 title

   前两版审计都因为漏了这三点，得出「未进卡 = 全部」的假结论。
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
GEN = os.path.join(根, "_work", "_wb_generated", "_index.json")

索引 = json.load(io.open(GEN, encoding="utf-8"))
已用名 = set()
for 类, 条目s in 索引.items():
    for 名 in 条目s:
        已用名.add(简(名))


def 取标题(p: str) -> str:
    """取这份素材在卡里的条目名。

    ★ 三种情况（都是真实存在的）：
      ① 有 frontmatter `title:` 且**不带数字前缀** → 直接用（如 事件页）
      ② 有 title 但**带数字前缀**（1-04-1-初识唐布衣）→ 去前缀
      ③ 没有 title → 用文件名，同样去前缀

    ★ 早先只做了 ①，于是带前缀的那批全被判成「未进卡」——
      实际它们**已经进卡了**，只是名字去掉了前缀。是审计错了，不是真缺。
    """
    try:
        head = io.open(p, encoding="utf-8-sig").read(2000)
    except Exception:
        head = ""
    m = re.search(r"^title:\s*(.+?)\s*$", head, re.M)
    标 = 简(m.group(1)) if m else 简(urllib.parse.unquote(os.path.basename(p)[:-3]))
    # 统一去掉数字前缀（1-04-1- / 2-03-1-）
    return re.sub(r"^\d+-\d+-\d+-", "", 标).strip()


def 命中(标题: str) -> bool:
    if not 标题:
        return False
    if 标题 in 已用名:
        return True
    # 短名做子串匹配（≥3 字，避免噪音）
    if len(标题) >= 3:
        for n in 已用名:
            if 标题 in n or n in 标题:
                return True
    return False


# ── 明确「有意不进」的：考据来源，不是给 AI 演的内容 ──
有意不进 = {
    "other/qna",            # 官方问答：我们核实设定用的
    "other/test.md",        # 测试页
    "other/lom-sheet.md",   # 表格索引
    "other/dali-duan-lineage.md",
    "other/image-generator",  # 生图提示词
}

# ── 走了**代码表**而非世界书条目的源文件 ──
#   ★ 这些同样算「用上了」—— 内容进了 脚本/*.ts，只是没变成世界书条目。
#     早先审计不认这一层，把它们全报成「未进卡」，虚高了缺口。
代码表来源 = {
    "event/story-branch-timeline.md": "原作事件.ts（24 条带选项）",
    "event/story-simple-table.md": "事件目录.ts（181 条含路线）",
    "system/books/index.md": "秘籍.ts（88 本汇总）",
    "system/training/index.md": "养成.ts（312 条指令）",
    "people/mobs/artists.md": "众生相.ts",
    "people/mobs/great-families.md": "众生相.ts",
    "people/mobs/martial-factions.md": "众生相.ts",
    "people/mobs/orthodox-sects.md": "众生相.ts",
    "people/mobs/other.md": "众生相.ts",
    "people/mobs/tang-men-male.md": "众生相.ts",
    "people/mobs/tang-men-female.md": "众生相.ts",
    # 已写成条目但名字与文件名不同的
    "event/achievements/index.md": "机制/成就",
    "event/pre-game-timeline.md": "机制/序章前的江湖大事",
    "people/title-list.md": "机制/称号链",
    "system/items/index.md": "机制/道具表",
    "system/skill.md": "机制/技能效果表",
    "system/hidden-params.md": "机制/隐藏参数",
    "system/develop-list.md": "机制/开发项目表",
    "system/facility.md": "机制/培养设施",
    "system/forge-roadmap.md": "机制/锻冶场路线图",
    "system/pills.md": "源文件自己写明「已并入开发项目列表」",
    "system/training/train-01.md": "养成.ts + 机制条目",
    "system/engagement/battle-commands.md": "机制/战斗指令",
    "system/engagement/battle-tips.md": "机制/战斗要诀",
    "system/engagement/battle-ui.md": "机制/战斗界面",
    "system/engagement/skills.md": "机制/武学技能",
    "system/engagement/status.md": "机制/状态效果",
    "other/guide/1-game-objective.md": "机制/开局指引",
    "other/guide/2-how-to-start.md": "机制/开局指引",
    "other/guide/mechanism/attribute.md": "机制/属性",
    "other/guide/mechanism/brother4-selling.md": "机制/四师兄卖货",
    # 核心角色：手写的 基础信息/性格调色盘 已覆盖
    "people/characters/brother2.md": "角色/唐铮（手写条目 + 三面性 + 二次解释）",
    "people/characters/brother3.md": "角色/唐升（手写条目 + 三面性 + 二次解释）",
    # 索引页：只列链接，没有内容
    "people/characters/index.md": "索引页（无内容）",
    "people/factions/index.md": "索引页（无内容）",
    "people/mobs/index.md": "索引页（无内容）",
    "system/soundtrack.md": "原声带曲目表（非叙事内容）",
}

print("══ 逐目录审计 ══\n")
总未进 = []
for 目录 in ["event", "people", "system", "other"]:
    根目录 = os.path.join(RAW, 目录)
    if not os.path.isdir(根目录):
        continue
    未进 = []
    总 = 0
    跳过 = 0
    for r, _, fs in os.walk(根目录):
        for f in fs:
            if not f.endswith((".md", ".txt")):
                continue
            总 += 1
            p = os.path.join(r, f)
            归 = os.path.relpath(p, 根目录).replace("\\", "/")
            全归 = f"{目录}/{归}"
            if any(全归.startswith(x) for x in 有意不进):
                跳过 += 1
                continue
            if 全归 in 代码表来源:
                跳过 += 1
                continue
            if not 命中(取标题(p)):
                未进.append(归)

    print("【%s】共 %d 个文件；有意不进/已走代码表 %d 个；**未进卡 %d 个**"
          % (目录, 总, 跳过, len(未进)))
    if 未进:
        from collections import Counter
        c = Counter(os.path.dirname(x) or "（根）" for x in 未进)
        for k, n in c.most_common():
            print("    %-26s %d" % (k, n))
            if n <= 12:
                for x in 未进:
                    if (os.path.dirname(x) or "（根）") == k:
                        print("        " + x)
        总未进.extend((目录 + "/" + x) for x in 未进)
    print()

print("══ 代码表 ══")
代码表 = {
    "秘籍.ts": "88 本汇总 → 结构化（效果/门槛/获得）",
    "养成.ts": "312 条养成指令（含心相分档）",
    "众生相.ts": "60 组龙套（people/mobs）",
    "事件目录.ts": "181 条事件目录（含路线分支）",
    "原作事件.ts": "24 条带选项事件（第一年）",
}
for k, v in 代码表.items():
    p = os.path.join(根, "脚本", k)
    sz = os.path.getsize(p) if os.path.exists(p) else 0
    print("  %-14s %7d 字节   %s" % (k, sz, v))

print()
print("══ 结论 ══")
print("  未进卡 %d 个文件" % len(总未进))

# 把未进的写出来，便于下一步处理
io.open(os.path.join(根, "_work", "_audit_gap.txt"), "w", encoding="utf-8", newline="\n").write(
    "\n".join(总未进)
)
print("  明细已写入 _work/_audit_gap.txt")
