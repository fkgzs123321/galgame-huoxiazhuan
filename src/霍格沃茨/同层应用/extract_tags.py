# -*- coding: utf-8 -*-
"""
从世界书提取性格/性癖条目全文 → 生成图鉴数据 JS（供同层应用图鉴展示）
产出: parts/js/43_tags_full.js
"""
import os, re, json

_HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(_HERE, '..', '世界书', '角色', '标签库')
OUT = os.path.join(_HERE, 'parts', 'js', '43_tags_full.js')

def extract_dir(sub):
    d = os.path.join(BASE, sub)
    items = {}
    if not os.path.isdir(d):
        return items
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.yaml'):
            continue
        name = fn[:-5]
        try:
            with open(os.path.join(d, fn), encoding='utf-8') as f:
                t = f.read()
        except Exception:
            continue
        items[name] = t
    return items

traits = extract_dir('性格')
kinks = extract_dir('性癖')

def js_str(s):
    return json.dumps(s, ensure_ascii=False)

lines = []
lines.append('/* ============================================================')
lines.append('   霍格沃茨 · 同层应用 标签全文数据（自动生成 · 与世界书同步）')
lines.append('   TraitFull: 性格条目全文 | KinkFull: 性癖条目全文')
lines.append('   ============================================================ */')
lines.append("'use strict';")
lines.append('')
lines.append('App.TraitFull = ' + js_str(traits) + ';')
lines.append('')
lines.append('App.KinkFull = ' + js_str(kinks) + ';')
lines.append('')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

size = os.path.getsize(OUT)
print('性格条目:', len(traits), '| 性癖条目:', len(kinks))
print('生成:', OUT, '%.1f KB' % (size / 1024))
