# -*- coding: utf-8 -*-
"""读取产物第 46 行 + 提取 script 做完整语法检查，定位真实错误。"""
import os
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")

HTML = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
html = open(HTML, encoding="utf-8", errors="ignore").read()
lines = html.split("\n")
print("HTML 总行数:", len(lines))

print("\n=== 第 43-50 行（截断显示，看结构）===")
for i in range(42, min(50, len(lines))):
    ln = lines[i]
    show = ln if len(ln) <= 200 else ln[:200] + " …[%d 字符]" % len(ln)
    print("%4d: %s" % (i + 1, show))

# 第 46 行前 300 字符原样
if len(lines) >= 46:
    print("\n=== 第 46 行前 300 字符 ===")
    print(repr(lines[45][:300]))

# ── 提取 <script type="module"> 内容，交给 node --check ──
m = re.search(r'<script type="module">([\s\S]*?)</script>', html)
if not m:
    print("\n未找到 module script")
    sys.exit(0)

body = m.group(1)
print("\nscript 内容长度:", len(body))
print("script 内行数:", body.count("\n") + 1)

tmpdir = tempfile.gettempdir()
tmp = os.path.join(tmpdir, "_bundle_check.mjs")
open(tmp, "w", encoding="utf-8").write(body)

node = r"C:\Users\64806\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
r = subprocess.run([node, "--check", tmp], capture_output=True, text=True, encoding="utf-8", errors="ignore")
print("\n=== node --check 结果 ===")
print("returncode:", r.returncode)
if r.stdout.strip():
    print(r.stdout[:1500])
if r.stderr.strip():
    print(r.stderr[:1500])

# 若报错，打印出错行附近
err = r.stderr or r.stdout
mm = re.search(r"_bundle_check\.mjs:(\d+)", err)
if mm:
    bad = int(mm.group(1))
    blines = body.split("\n")
    print("\n=== 出错行 %d 附近 ===" % bad)
    for i in range(max(0, bad - 3), min(len(blines), bad + 2)):
        mark = ">>>" if i + 1 == bad else "   "
        ln = blines[i]
        show = ln if len(ln) <= 300 else ln[:300] + " …"
        print("%s %5d: %s" % (mark, i + 1, show))
