# -*- coding: utf-8 -*-
"""把生成的 511 条世界书条目落盘 + 注册进 tavern-cards-state.json。

注册策略（按内容性质分）：
  · 机制     → constant（每轮都要遵守的规则）
  · 事件/结局/势力/人物/秘籍 → selective + 关键词（数量大、彼此独立，
                              全量加载会挤爆上下文）

★ 关键词触发的必要性：
   511 条如果全 constant，每轮 prompt 要几十万 token —— 不可行。
   关键词触发让「提到谁/去哪/做什么」时才注入对应条目。
"""
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
索引 = json.load(io.open(os.path.join(根, "_work", "_wb_generated", "_index.json"), encoding="utf-8"))
STATE = os.path.join(根, "tavern-cards-state.json")

# 各类的注册参数
#
# ★ 新增类别必须在这里登记 —— 否则 install 会 KeyError。
#   踩过：加了「角色」类（三面性/二次解释）但忘了登记，install 直接崩。
类配置 = {
    "机制": {"strategy": "constant", "order": 60, "depth": None},
    "事件": {"strategy": "selective", "order": 300, "depth": None},
    "结局": {"strategy": "selective", "order": 400, "depth": None},
    "势力": {"strategy": "selective", "order": 220, "depth": None},
    "人物": {"strategy": "selective", "order": 240, "depth": None},
    "秘籍": {"strategy": "selective", "order": 260, "depth": None},
    # 角色：三面性 / 二次解释。
    #   ★ 这两类是**核心角色的补充条目**，与已有的基础信息/性格调色盘并列。
    #     走 selective（提到该角色才注入），order 排在基础信息之后。
    "角色": {"strategy": "selective", "order": 600, "depth": None},
}

# ① 落盘
写文件 = 0
总字符 = 0
for 类, 条目s in 索引.items():
    for 名, v in 条目s.items():
        p = os.path.join(根, v["path"].replace("/", os.sep))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, "w", encoding="utf-8", newline="\n").write(v["content"])
        写文件 += 1
        总字符 += len(v["content"])

print("落盘 %d 个文件，共 %d 字符（%.1f 万）" % (写文件, 总字符, 总字符 / 10000))

# ② 注册
#
# ★★ 必须先清掉上一轮生成的条目再装新的。
#   踩过的坑：第一轮装了 511 条，第二轮生成 450 条（名字有变），
#   直接增量注册 → 卡里同时有新旧两套、总数虚高到 537。
#
# ★★ 但「角色」类**不能整体清** —— 那个组里有一部分是**手写的**：
#     主角 / 角色速览 / 6 个角色的 基础信息 + 性格调色盘 = 14 条
#   （由 _work/register_entries.py 注册）。
#   整体清空会把它们一起删掉 —— 真踩过，清完 Role 组只剩 12 条生成条目。
#   所以这里只清「本脚本生成的」那部分（名字以 _三面性 / _二次解释 结尾）。
state = json.load(io.open(STATE, encoding="utf-8"))
em = state.setdefault("entryManifest", {})

生成后缀 = ("_三面性", "_二次解释")
清理 = {}
for 类 in 类配置:
    旧 = em.get(类, {})
    if 类 == "角色":
        # 只清生成的那部分
        保留 = {k: v for k, v in 旧.items() if not k.endswith(生成后缀)}
        清理[类] = len(旧) - len(保留)
        em[类] = 保留
    else:
        清理[类] = len(旧)
        em[类] = {}

print("\n清掉上一轮：%s" % "、".join("%s %d" % (k, v) for k, v in 清理.items() if v))
if 类配置.get("角色"):
    print("  （角色类保留了手写条目：%s）" % "、".join(sorted(em["角色"].keys())))

新增 = 0
for 类, 条目s in 索引.items():
    配 = 类配置[类]
    组 = em.setdefault(类, {})
    for i, (名, v) in enumerate(sorted(条目s.items())):
        键 = 名  # 条目名即 key
        if 键 in 组:
            continue
        if 配["strategy"] == "constant":
            组[键] = {
                "path": v["path"],
                "scope": "specific",
                "keywords": [],
                "abstract": v["abstract"][:200],
                "strategy": {"type": "constant"},
                "position": {"type": "before_character_definition", "order": 配["order"] + i},
            }
        else:
            kws = v["keywords"][:6] or [名]
            组[键] = {
                "scope": "specific",
                "keywords": kws,
                "abstract": v["abstract"][:200],
                "contents": [
                    {"content": "@@if matchChatMessages(['" + "', '".join(kws) + "'], { start: -3 })"},
                    {"content": '---\n<wb_' + 类 + ' name="' + 名.replace('"', '') + '">'},
                    {"file": v["path"]},
                    {"content": "</wb_" + 类 + ">"},
                ],
                "strategy": {"type": "selective", "keys": kws},
                "position": {"type": "after_character_definition", "order": 配["order"] + i},
            }
        新增 += 1

json.dump(state, io.open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("\n已注册 %d 条" % 新增)
print("\nentryManifest 全景：")
总 = 0
for g, items in em.items():
    print("  %-10s %4d" % (g, len(items)))
    总 += len(items)
print("  ──────────────")
print("  合计 %d 条" % 总)
