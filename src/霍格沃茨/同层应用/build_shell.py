# -*- coding: utf-8 -*-
"""
把 同层应用.html 嵌入到 脚本/同层前端.js 中：
在 (async () => { 之前插入 App.SHELL_HTML 常量定义
用法: python 同层应用/build_shell.py
"""
import os, json

_HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(_HERE, '同层应用.html')
SHELL = os.path.join(_HERE, '..', '脚本', '同层前端.js')

with open(HTML, encoding='utf-8') as f:
    html = f.read()

# 转义 </script> 防止提前闭合外层 <script>：
# 必须在 json.dumps 输出层面替换 —— JSON 里 \/ 是合法转义，JS 解析后还原为 </script>。
# 若在 python 层替换后再 json.dumps，反斜杠会被二次转义成字面 \\/，
# srcdoc 里 script 永不闭合 → 应用 JS 全部不执行（已踩坑）。
json_str = json.dumps(html, ensure_ascii=False)
json_str = json_str.replace('</script>', '<\\/script>')

const_block = (
    '/**\n'
    ' ==========================================\n'
    '  霍格沃茨 · 同层应用完整 HTML（构建产物 · 自动嵌入）\n'
    '  构建命令: cd 同层应用 && python build.py && python build_shell.py\n'
    ' ==========================================\n'
    ' */\n'
    'window.HGW_APP_HTML = ' + json_str + ';\n'
    '\n'
)

with open(SHELL, encoding='utf-8') as f:
    shell = f.read()

marker = '(async () => {'
assert marker in shell, 'marker not found in shell'
head, tail = shell.split(marker, 1)
# 移除旧的嵌入块（如果存在）
if 'window.HGW_APP_HTML' in head:
    idx = head.find('/**\n ==========================================\n  霍格沃茨 · 同层应用完整 HTML')
    if idx != -1:
        end = head.find('*/', idx) + 2
        # 找到 const 块结尾：下一个 '\n\n' 之后的 marker 前
        rest = head[end:]
        nxt = rest.find('window.HGW_APP_HTML')
        if nxt != -1:
            end2 = rest.find('\n', rest.find(';\n', nxt)) + 1
            head = head[:idx] + rest[end2:]
new_head = head + const_block
out = new_head + marker + tail

with open(SHELL, 'w', encoding='utf-8') as f:
    f.write(out)

print('已嵌入: 同层应用.html (%.1f KB) → 同层前端.js (%.1f KB)' % (
    os.path.getsize(HTML) / 1024, os.path.getsize(SHELL) / 1024))
