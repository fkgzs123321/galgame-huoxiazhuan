# -*- coding: utf-8 -*-
"""定位 bundle 中 'Vue is not defined' 的引用点，确认是哪个模块请求了 vue。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
txt = open(P, encoding="utf-8", errors="ignore").read()
lines = txt.split("\n")

# 错误在 line=2, col=53240
if len(lines) > 1:
    ln = lines[1]
    print("行2 长度:", len(ln))
    pos = 53240
    print("\n=== 行2 col 53240 前 400 字符 ===")
    print(repr(ln[max(0, pos - 400) : pos + 200]))

# 找所有向 vue 请求 external 的地方
print("\n=== 引用 Vue 全局的形态 ===")
for pat, desc in [
    (r"module\.exports\s*=\s*Vue\b", "module.exports = Vue"),
    (r"\bVue\s*\)", "Vue)"),
    (r"__webpack_require__\(/\*! vue \*/", "require(/*! vue */)"),
]:
    m = re.findall(pat, txt)
    print("  %-40s %d" % (desc, len(m)))

# 具体看 vue 的 external 模块长什么样
print("\n=== vue external 模块定义 ===")
for m in re.finditer(r'"/?\.?/?node_modules[^"]*"\s*\(', txt):
    pass

for m in re.finditer(r'"\./node_modules/[^"]*vue[^"]*"|"\.\./node_modules/[^"]*vue[^"]*"|"vue"', txt):
    s, e = max(0, m.start() - 60), min(len(txt), m.end() + 200)
    print(repr(txt[s:e]))
    print()
    if m.start() > 200000:
        break

# 找 require 到 vue 的调用点，打印上下文
print("=== require vue 的调用点（前 3 处）===")
cnt = 0
for m in re.finditer(r'__webpack_require__\((?:"vue"|[^)]*?/vue[^)]*?)\)', txt):
    s, e = max(0, m.start() - 250), min(len(txt), m.end() + 80)
    print(repr(txt[s:e]))
    print()
    cnt += 1
    if cnt >= 3:
        break
if cnt == 0:
    print("  （未找到）")
