# -*- coding: utf-8 -*-
"""确认产物是否为「缺 charset 声明 → 中文被按错编码解析 → 字符串断裂」。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
raw = open(P, "rb").read()
print("字节数:", len(raw))
print("BOM:", raw[:3] == b"\xef\xbb\xbf")

txt = raw.decode("utf-8", errors="replace")
print("按 UTF-8 解码 OK:", "\ufffd" not in txt)

# 是否有 charset 声明
head = txt[:2000]
print("\n=== charset 声明 ===")
print("  <meta charset:", txt.count('charset'))
m = re.search(r'<meta[^>]*charset[^>]*>', txt[:3000], re.I)
print("  首个 meta charset:", m.group(0) if m else "（无）")
print("  Content-Type meta:", "有" if "http-equiv" in txt[:3000] else "（无）")

# 行 2 col 871 附近
lines = txt.split("\n")
print("\n总行数:", len(lines))
for i in (0, 1):
    if i < len(lines):
        print("  行 %d 长度: %d" % (i + 1, len(lines[i])))

if len(lines) > 1:
    ln = lines[1]
    print("\n=== 行 2 的 820-950 列 ===")
    print(repr(ln[820:950]))

# 该位置附近有没有变量名/中文字符串
print("\n=== 行 2 col 871 前后逐字符（含码点）===")
seg = lines[1][855:890]
for ch in seg:
    print("  %r U+%04X" % (ch, ord(ch)))
