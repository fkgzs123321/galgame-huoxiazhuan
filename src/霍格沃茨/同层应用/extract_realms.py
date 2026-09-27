# -*- coding: utf-8 -*-
"""提取阶位 27 条全文 → 51_realm_full.js"""
import os, json
_HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(_HERE, '..', '世界书', '角色', '标签库', '阶位')
OUT = os.path.join(_HERE, 'parts', 'js', '51_realm_full.js')
items = {}
for fn in sorted(os.listdir(SRC)):
    if fn.endswith('.yaml'):
        name = fn[:-5]
        try:
            with open(os.path.join(SRC, fn), encoding='utf-8') as f:
                items[name] = f.read()
        except Exception:
            pass
lines = [
    '/* 阶位 27 条全文（自动生成） */',
    "'use strict';",
    'App.RealmFull = ' + json.dumps(items, ensure_ascii=False) + ';',
    '',
]
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('阶位:', len(items), '→ %.1f KB' % (os.path.getsize(OUT) / 1024))
