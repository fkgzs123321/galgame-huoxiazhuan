# -*- coding: utf-8 -*-
"""把世界书条目注册进 tavern-cards-state.json。

参照 乱马二分之一 的注册格式：
  - 角色条目走三级 part（basic / personality），selective + 关键词
  - 准则 / 世界观 / 时间线 / 阶段指导 走 constant
  - MVU 走 at_depth
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\tavern-cards-state.json"

state = json.load(open(P, encoding="utf-8"))
em = state.setdefault("entryManifest", {})

# ══════════════════════════════════════════════════════════════
# 扮演准则 —— constant，最高优先级
# ══════════════════════════════════════════════════════════════
em["扮演准则"] = {
    "加载纪律": {
        "path": "世界书/扮演准则/加载纪律.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "两层结构与冲突处理；正文禁令、数值禁令；前置与错过铁律；时间铁律",
        "strategy": {"type": "constant"},
        "position": {"type": "before_character_definition", "order": 10},
    },
    "叙述准则": {
        "path": "世界书/扮演准则/叙述准则.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "第三人称限知；越界禁令；玩家输入权；动作与台词写法；称呼即信息",
        "strategy": {"type": "constant"},
        "position": {"type": "before_character_definition", "order": 11},
    },
    "基调": {
        "path": "世界书/扮演准则/基调.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "丑侠的江湖。苦但不认输；禁止爽文套路与卖惨；丑设定怎么用",
        "strategy": {"type": "constant"},
        "position": {"type": "before_character_definition", "order": 12},
    },
}

# ══════════════════════════════════════════════════════════════
# 世界观 —— constant
# ══════════════════════════════════════════════════════════════
em["世界观"] = {
    "唐门与江湖": {
        "path": "世界书/世界观/唐门与江湖.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "南宋背景；唐门内外姓之别与二宝；门派六阶段；江湖势力；时间结构",
        "strategy": {"type": "constant"},
        "position": {"type": "before_character_definition", "order": 20},
    },
    "性情分档": {
        "path": "世界书/世界观/性情分档.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "道德/性情/处世/修养/心相/阴阳 的档位名与含义，AI 说话做事要与之相称",
        "strategy": {"type": "constant"},
        "position": {"type": "before_character_definition", "order": 22},
    },
}

# ══════════════════════════════════════════════════════════════
# 时间线 —— constant
# ══════════════════════════════════════════════════════════════
em["时间线"] = {
    "第一年": {
        "path": "世界书/时间线/第一年.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "起始四月上旬；四月下旬后山夜谈窗口；五月庙会；节点推进条件；时间铁律",
        "strategy": {"type": "constant"},
        "position": {"type": "before_character_definition", "order": 30},
    },
}

# ══════════════════════════════════════════════════════════════
# 地理 —— constant
# ══════════════════════════════════════════════════════════════
em["地理"] = {
    "唐门十二处": {
        "path": "世界书/地理/唐门十二处.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "唐门十二地点；外姓弟子与入室弟子的活动区隔；闹市与山外",
        "strategy": {"type": "constant"},
        "position": {"type": "before_character_definition", "order": 40},
    },
}

# ══════════════════════════════════════════════════════════════
# 阶段指导 —— constant
# ══════════════════════════════════════════════════════════════
em["阶段指导"] = {
    "唐门日常": {
        "path": "世界书/阶段指导/唐门日常.yaml",
        "scope": "specific",
        "keywords": [],
        "abstract": "每旬流程；写什么不写什么；唐门日常质感；冷场怎么办；六阶段怎么体现",
        "strategy": {"type": "constant"},
        "position": {"type": "at_depth", "order": 90, "depth": 2},
    },
}

# ══════════════════════════════════════════════════════════════
# 角色 —— selective + 关键词
# ══════════════════════════════════════════════════════════════
人物 = {
    "唐中翎": (["唐中翎", "掌门"], "唐门第二十七代掌门。武林十大高手出身，久病；飞燕流星翎；丧妻之痛"),
    "唐布衣": (["唐布衣", "大师兄", "飞侠"], "唐门大弟子，飞侠。身世与生母；爽朗不羁、护短、爱惹师父生气"),
    "唐铮": (["唐铮", "二师兄", "辣手相公"], "唐门二弟子，辣手相公。毒学胜师、掌戒律、刻薄护短、酷爱胡椒粉；与默铃同母"),
    "唐升": (["唐升", "三师兄"], "唐门三弟子。带艺投师年纪最长；寒窗十载获罪入狱、被掌门所救；爱说书，上兵伐谋"),
    "唐惟元": (["唐惟元", "四师兄", "无孔不入"], "唐门关门弟子，管帐采购。贪财但不鄙穷人；走商为寻亲；带婴儿时在果箱中被发现"),
    "唐默铃": (["唐默铃", "小师妹", "默铃"], "掌门独女。天地无声势的修炼与代价；七串不响的铃铛；母亲的谎；嗜折纸"),
}

角色组 = {}

# 主角（单独，不走 basic/personality 二分）
角色组["主角"] = {
    "path": "世界书/角色/主角.yaml",
    "scope": "specific",
    "keywords": [],
    "abstract": "玩家扮演谁；赵活的默认档案（出身/相貌/处境/武艺）；可选身份；身份决定什么",
    "strategy": {"type": "constant"},
    "position": {"type": "after_character_definition", "order": 100},
}

角色组["角色速览"] = {
    "path": "世界书/角色/角色速览.yaml",
    "scope": "catalog",
    "keywords": [],
    "abstract": "唐门六人 + 江湖势力速览，供 AI 认人；含外姓弟子身份说明",
    "strategy": {"type": "constant"},
    "position": {"type": "after_character_definition", "order": 101},
}

序 = 200
for 名, (关键词, 摘要) in 人物.items():
    角色组[f"{名}_基础信息"] = {
        "scope": "specific",
        "part": "basic",
        "keywords": 关键词,
        "abstract": 摘要,
        "contents": [
            {"content": "@@if matchChatMessages(['" + "', '".join(关键词) + "'], { start: 0 })"},
            {"content": '---\n<character_basic character="' + 名 + '">'},
            {"file": f"世界书/角色/{名}/基础信息.yaml"},
            {"content": "</character_basic>"},
        ],
        "strategy": {"type": "selective", "keys": 关键词},
        "position": {"type": "after_character_definition", "order": 序},
    }
    角色组[f"{名}_性格调色盘"] = {
        "scope": "specific",
        "part": "personality",
        "keywords": 关键词,
        "abstract": f"{名}的性格调色盘：主色调/底色/点缀 + 每项三条衍生",
        "contents": [
            {"content": "@@if matchChatMessages(['" + "', '".join(关键词) + "'], { start: 0 })"},
            {"content": '---\n<character_personality character="' + 名 + '">'},
            {"file": f"世界书/角色/{名}/性格调色盘.yaml"},
            {"content": "</character_personality>"},
        ],
        "strategy": {"type": "selective", "keys": 关键词},
        "position": {"type": "after_character_definition", "order": 序 + 1},
    }
    序 += 2

em["角色"] = 角色组

# ══════════════════════════════════════════════════════════════
# MVU —— at_depth（若尚未注册）
# ══════════════════════════════════════════════════════════════
if "MVU" not in em or not em["MVU"]:
    em["MVU"] = {
        "变量列表": {
            "path": "世界书/变量/变量列表.txt",
            "scope": "specific",
            "part": "variable_list",
            "keywords": [],
            "abstract": "当前变量状态，供 AI 读取",
            "strategy": {"type": "constant"},
            "position": {"type": "at_depth", "order": 999, "depth": 0},
        },
        "变量更新规则": {
            "path": "世界书/变量/变量更新规则.yaml",
            "scope": "specific",
            "part": "update_rules",
            "keywords": [],
            "abstract": "每项变量的 check 与 rule；时间不可跳、错过不回滚、战斗不写数",
            "strategy": {"type": "constant"},
            "position": {"type": "at_depth", "order": 998, "depth": 4},
        },
        "变量输出格式": {
            "path": "世界书/变量/变量输出格式.yaml",
            "scope": "specific",
            "part": "output_format",
            "keywords": [],
            "abstract": "每回合末 JSON Patch 输出格式；引擎专属字段禁止 AI 更新",
            "strategy": {"type": "constant"},
            "position": {"type": "at_depth", "order": 997, "depth": 4},
        },
        "变量初始值": {
            "path": "世界书/变量/initvar.yaml",
            "scope": "specific",
            "part": "initvar",
            "keywords": [],
            "abstract": "开局初值：第1年4月，赵活，唐门外姓弟子",
            "strategy": {"type": "constant"},
            "position": {"type": "at_depth", "order": 996, "depth": 4},
        },
    }

json.dump(state, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("已注册。entryManifest 分组与条目数：")
总 = 0
for g, items in em.items():
    print("  %-10s %d" % (g, len(items)))
    总 += len(items)
print("  合计 %d 条" % 总)
