# -*- coding: utf-8 -*-
"""对产物做一次决定性诊断：语法 + 依赖 + 关键标识。"""
import os
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")

HTML = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
html = open(HTML, encoding="utf-8", errors="ignore").read()
print("产物: %d 字节 / %d 行" % (len(html), html.count("\n") + 1))

# ── 关键标识 ──
print("\n=== 关键标识 ===")
for kw in ["__marker", "未检测到宿主", "createApp", "defineMvuDataStore", "hx-bar", "TabAttributes"]:
    print("  %-22s %d" % (kw, html.count(kw)))

# ── var 声明（external 残留）──
print("\n=== external 残留 ===")
for name in ["$", "Vue", "_", "z", "Pinia", "VueRouter"]:
    pat = r"\bvar\s+" + re.escape(name) + r"\s*="
    n = len(re.findall(pat, html))
    if n:
        print("  var %-10s %d 处" % (name, n))

# ── 提取所有 script 内容做语法检查 ──
print("\n=== script 语法检查 ===")
node = r"C:\Users\64806\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
tmpdir = tempfile.gettempdir()

scripts = re.findall(r"<script[^>]*>([\s\S]*?)</script>", html)
print("  script 块数: %d" % len(scripts))

for i, s in enumerate(scripts):
    if len(s) < 200:
        continue
    ext = ".mjs" if "import" in s[:2000] or "export" in s[:2000] else ".cjs"
    p = os.path.join(tmpdir, "_probe_%d%s" % (i, ext))
    open(p, "w", encoding="utf-8").write(s)
    r = subprocess.run([node, "--check", p], capture_output=True, text=True, encoding="utf-8", errors="ignore")
    status = "OK" if r.returncode == 0 else "FAIL"
    print("  [%d] %s  %d 字符" % (i, status, len(s)))
    if r.returncode != 0:
        err = (r.stderr or "") + (r.stdout or "")
        print("      " + err.strip().split("\n")[0][:200])
        mm = re.search(r"_probe_%d\w*:(\d+)" % i, err)
        if mm:
            bad = int(mm.group(1))
            ls = s.split("\n")
            print("      出错行 %d:" % bad)
            for j in range(max(0, bad - 2), min(len(ls), bad + 1)):
                mk = ">>>" if j + 1 == bad else "   "
                ln = ls[j]
                print("      %s %s" % (mk, ln[:250]))
