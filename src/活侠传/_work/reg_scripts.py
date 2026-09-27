# -*- coding: utf-8 -*-
"""注册 MVU / Zod 脚本到 extensions.tavern_helper.scripts。"""
import json
import sys
import uuid

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\tavern-cards-state.json"
j = json.load(open(P, encoding="utf-8"))

ext = j.setdefault("extensions", {})
th = ext.setdefault("tavern_helper", {})
scripts = th.setdefault("scripts", {})

scripts["MVU"] = {
    "type": "script",
    "script_file": "脚本/MVU.txt",
    "enabled": True,
    "id": str(uuid.uuid4()),
    "info": "MVU 变量框架本体。没有它 stat_data 不会被创建",
    "button": {
        "enabled": True,
        "buttons": [
            {"name": "刷新变量面板", "visible": True},
            {"name": "刷新读取初始变量", "visible": True},
            {"name": "删除楼层", "visible": False},
            {"name": "新增楼层", "visible": False},
            {"name": "发送额外模型解析", "visible": False},
            {"name": "保存楼层截图", "visible": False},
        ],
    },
    "data": {},
}

scripts["Zod"] = {
    "type": "script",
    "script_file": "脚本/Zod.txt",
    "enabled": True,
    "id": str(uuid.uuid4()),
    "info": "把 schema.ts 注册给 MVU：初始化补全、脏数据夹紧、前后端同构",
    "button": {"enabled": False, "buttons": []},
    "data": {},
}

th.setdefault("variables", {})

json.dump(j, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("已注册脚本：")
for k, v in scripts.items():
    print("  %-8s %-20s enabled=%s" % (k, v["script_file"], v["enabled"]))
