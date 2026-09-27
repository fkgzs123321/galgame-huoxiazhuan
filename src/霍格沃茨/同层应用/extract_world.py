# -*- coding: utf-8 -*-
"""
从世界书提取学年剧情 + 世界观/准则 全文 → 生成图鉴数据 JS
产出: parts/js/44_world_full.js
"""
import os, json

_HERE = os.path.dirname(os.path.abspath(__file__))
WB = os.path.join(_HERE, '..', '世界书')
OUT = os.path.join(_HERE, 'parts', 'js', '44_world_full.js')

def collect_dir(d):
    items = {}
    if not os.path.isdir(d):
        return items
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(('.yaml', '.txt')):
            continue
        name = fn.rsplit('.', 1)[0]
        try:
            with open(os.path.join(d, fn), encoding='utf-8') as f:
                items[name] = f.read()
        except Exception:
            continue
    return items

years = collect_dir(os.path.join(WB, '学年'))
world = collect_dir(os.path.join(WB, '世界观'))
roles = collect_dir(os.path.join(WB, '角色'))
rules = collect_dir(os.path.join(WB, '扮演准则'))
stages = collect_dir(os.path.join(WB, '阶段指导'))
vars_ = collect_dir(os.path.join(WB, '变量'))

lines = []
lines.append('/* ============================================================')
lines.append('   霍格沃茨 · 同层应用 世界书全文数据（自动生成 · 与卡同步）')
lines.append('   YearFull: 学年剧情 | WorldFull: 世界观 | RuleFull: 准则')
lines.append('   StageFull: 阶段指导 | VarFull: 变量规则 | RosterFull: 名录')
lines.append('   ============================================================ */')
lines.append("'use strict';")
lines.append('')
lines.append('App.YearFull = ' + json.dumps(years, ensure_ascii=False) + ';')
lines.append('')
lines.append('App.WorldFull = ' + json.dumps(world, ensure_ascii=False) + ';')
lines.append('')
lines.append('App.RuleFull = ' + json.dumps(rules, ensure_ascii=False) + ';')
lines.append('')
lines.append('App.StageFull = ' + json.dumps(stages, ensure_ascii=False) + ';')
lines.append('')
lines.append('App.VarFull = ' + json.dumps(vars_, ensure_ascii=False) + ';')
lines.append('')
lines.append('App.RosterFull = ' + json.dumps(roles, ensure_ascii=False) + ';')
lines.append('')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('学年:', len(years), '| 世界观:', len(world), '| 准则:', len(rules), '| 阶段:', len(stages), '| 变量:', len(vars_), '| 名录:', len(roles))
print('生成:', OUT, '%.1f KB' % (os.path.getsize(OUT) / 1024))
