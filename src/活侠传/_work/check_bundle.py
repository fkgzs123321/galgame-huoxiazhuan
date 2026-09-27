# -*- coding: utf-8 -*-
"""查产物里 jQuery external 的真实形态"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

p = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
c = open(p, encoding="utf-8", errors="ignore").read()
print("产物长度:", len(c))
print()

pats = {
    "var $ 声明": r"var\s+\$\s*=",
    "var z 声明": r"var\s+z\s*=",
    "var Vue 声明": r"var\s+Vue\s*=",
    "$ 调用($(() =>": r"\$\(\s*\(\s*\)\s*=>",
    "$ 调用($(fn)": r"\$\(\s*function",
    "jQuery 字样": r"jQuery",
    "module.exports 判空": r'"undefined"\s*!=\s*typeof',
}
for k, v in pats.items():
    print("  %-22s %d 次" % (k, len(re.findall(v, c))))

print()
print("=== var $ 附近 300 字符 ===")
for m in re.finditer(r"var\s+\$\s*=", c):
    s, e = max(0, m.start() - 150), min(len(c), m.end() + 150)
    print(repr(c[s:e]))
    print()
    break

print("=== $(() => 附近 200 字符 ===")
for m in re.finditer(r"\$\(\s*\(\s*\)\s*=>", c):
    s, e = max(0, m.start() - 200), min(len(c), m.end() + 200)
    print(repr(c[s:e]))
    print()
    break

print("=== 是否所有 external 都被 require 包装 ===")
for name in ["$", "Vue", "_", "z"]:
    # webpack external 的典型形态: module.exports = $;
    pat = r'module\.exports\s*=\s*' + re.escape(name) + r'\s*;'
    print("  module.exports = %-6s : %d" % (name, len(re.findall(pat, c))))
