# -*- coding: utf-8 -*-
"""
霍格沃茨 · 同层应用 构建脚本
把 parts/{html,css,js} 拼接为单文件 同层应用.html（零 CDN、全内联）
用法: python 同层应用/build.py
"""
import os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(ROOT, 'parts')
OUT = os.path.join(ROOT, '同层应用.html')

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def collect(dirpath, exts=('.html', '.css', '.js')):
    files = []
    for fn in sorted(os.listdir(dirpath)):
        if fn.startswith('.') or fn.startswith('_'):
            continue
        if fn.endswith(exts):
            files.append(os.path.join(dirpath, fn))
    return files

def main():
    head = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>\n<title>霍格沃茨 · 同层卡</title>\n'

    css_dir = os.path.join(PARTS, 'css')
    css_files = collect(css_dir, ('.css',))
    css_block = '<style>\n' + '\n'.join(read(f) for f in css_files) + '\n</style>\n'
    print('CSS 文件:', [os.path.basename(f) for f in css_files])

    html_dir = os.path.join(PARTS, 'html')
    html_files = collect(html_dir, ('.html',))
    html_block = '\n'.join(read(f) for f in html_files)
    print('HTML 文件:', [os.path.basename(f) for f in html_files])

    js_dir = os.path.join(PARTS, 'js')
    js_files = collect(js_dir, ('.js',))
    js_block = '<script>\n' + '\n'.join(read(f) for f in js_files) + '\n</script>\n'
    print('JS 文件:', [os.path.basename(f) for f in js_files])

    # HTML 文件可能包含 <html>/<body> 骨架，只保留 body 内内容；其余为片段直接拼接
    body_inner = []
    for f in html_files:
        c = read(f)
        # 10_shell.html 是完整骨架（含 <body>...</body></html>），取其 body 内部
        if '<body>' in c:
            start = c.index('<body>') + len('<body>')
            end = c.index('</body>') if '</body>' in c else len(c)
            body_inner.append(c[start:end])
        else:
            body_inner.append(c)

    out = head + css_block + '</head>\n' + '<body>\n' + '\n'.join(body_inner) + js_block + '</body>\n</html>\n'
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(out)

    size = os.path.getsize(OUT)
    print('=' * 40)
    print('构建完成:', OUT)
    print('大小: %.2f KB (%.2f MB)' % (size / 1024, size / 1024 / 1024))
    print('CSS: %.1f KB | HTML: %.1f KB | JS: %.1f KB' % (
        len(css_block) / 1024, sum(len(read(f)) for f in html_files) / 1024, len(js_block) / 1024))
    return size

if __name__ == '__main__':
    main()
