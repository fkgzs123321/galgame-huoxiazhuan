# -*- coding: utf-8 -*-
"""
把 同层应用.html 转成 JS 字符串常量文件（供 同层前端.js 以 srcdoc 加载）
产出: parts/js/60_shell_html.js
"""
import os, json

_HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(_HERE, '同层应用.html')
OUT = os.path.join(_HERE, 'parts', 'js', '_60_shell_html.js')

with open(SRC, encoding='utf-8') as f:
    html = f.read()

# 转义 </script> 防止提前闭合外层 <script>（必须在 json.dumps 输出层面替换，
# JSON 里 \/ 是合法转义，JS 解析后还原为 </script>；python 层转义会被二次转义成字面 \\/）
json_str = json.dumps(html, ensure_ascii=False)
json_str = json_str.replace('</script>', '<\\/script>')

lines = [
    '/* ============================================================',
    '   霍格沃茨 · 同层应用 完整 HTML（自动生成 · srcdoc 常量）',
    '   ============================================================ */',
    "'use strict';",
    'App.SHELL_HTML = ' + json_str + ';',
    '',
    '/* 保持 /script 转义一致性（json.dumps 已处理引号与换行） */',
    '',
]
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('HTML 源: %.1f KB → JS 常量: %.1f KB' % (
    os.path.getsize(SRC) / 1024, os.path.getsize(OUT) / 1024))
