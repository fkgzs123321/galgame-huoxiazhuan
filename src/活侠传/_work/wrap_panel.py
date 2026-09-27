# -*- coding: utf-8 -*-
"""修正面板 HTML 的包裹结构。

★ 问题：我的 dist 产物是 webpack 出的**片段**（`<head>...</head><body>...`），
  而参照卡的正则替换文件都是**```html 代码块包裹的完整文档**：
      ```html
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>...</head>
      <body>...</body>
      </html>
      ```
  酒馆把正则替换结果当 markdown 渲染，所以外层必须有代码块围栏；
  没有 DOCTYPE/html 标签，浏览器也会进 quirks mode，样式会走样。

做法：读 dist 产物 → 补全为完整文档 → 代码块包裹 → 写进 正则/状态栏界面.html
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
DIST = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
目标 = os.path.join(根, "正则", "状态栏界面.html")

src = io.open(DIST, encoding="utf-8").read()
print("源（dist 产物）:", len(src), "字符")
print("  含 DOCTYPE:", "<!DOCTYPE" in src)
print("  含 <html:", "<html" in src.lower())

# ── 从 dist 里拆出 <head> 内容与 <body> 内容 ──
m_head = re.search(r"<head>(.*?)</head>", src, re.S | re.I)
m_body = re.search(r"<body>(.*?)</body>", src, re.S | re.I)

头内 = m_head.group(1) if m_head else ""
体内容 = m_body.group(1) if m_body else src

print("\n  head 内容:", len(头内), "字符")
print("  body 内容:", len(体内容), "字符")

# ── 确保有 charset 与 viewport ──
if "charset" not in 头内.lower():
    头内 = '<meta charset="UTF-8">' + 头内
if "viewport" not in 头内.lower():
    头内 = 头内.replace('<meta charset="UTF-8">',
                      '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">', 1)

# ── 组装完整文档（对齐参照卡结构）──
文档 = (
    "<!DOCTYPE html>\n"
    '<html lang="zh-CN">\n'
    "<head>\n"
    + 头内.strip()
    + "\n</head>\n"
    "<body>\n"
    + 体内容.strip()
    + "\n</body>\n"
    "</html>"
)

# ── 代码块包裹（酒馆按 markdown 渲染替换结果）──
成品 = "```html\n" + 文档 + "\n```\n"

io.open(目标, "w", encoding="utf-8", newline="\n").write(成品)

print("\n已写出:", 目标)
print("  总长:", len(成品), "字符")
print("  含 ```html 围栏:", 成品.startswith("```html"))
print("  含 DOCTYPE:", "<!DOCTYPE" in 成品)
print("  含 </html>:", "</html>" in 成品)
print("  以 ``` 收尾:", 成品.rstrip().endswith("```"))

# ── 与参照卡对齐检查 ──
print("\n══ 与参照卡结构对比 ══")
for 卡, p in [("欲望都市", "src/欲望都市/正则/状态栏界面.html"), ("狼人杀", "src/狼人杀/正则/状态栏界面.html")]:
    fp = os.path.join(r"E:\Games\写卡\tavern_helper_template", p)
    if not os.path.exists(fp):
        continue
    c = io.open(fp, encoding="utf-8").read()
    围栏 = c.lstrip().startswith("```")
    print(f"  {卡}: 围栏={围栏} DOCTYPE={'<!DOCTYPE' in c} 长度={len(c)}")
print(f"  活侠传: 围栏={成品.lstrip().startswith('```')} DOCTYPE={'<!DOCTYPE' in 成品} 长度={len(成品)}")
