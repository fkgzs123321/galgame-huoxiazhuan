# -*- coding: utf-8 -*-
"""定位产物里的语法错误：逐个 eval 模块做语法检查。

webpack devtool=eval 时，每个模块是 eval("...") 里的字符串，
构建期不解析 JS —— 所以语法错误只在运行时暴露。
这里把每个 eval 字符串还原出来逐个检查。
"""
import json
import os
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")

HTML = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏\index.html"
c = open(HTML, encoding="utf-8", errors="ignore").read()
print("产物长度:", len(c))

# ── 1. 找 onClose，看 @close="void 0" 编译成什么 ──
print("\n=== onClose 编译结果 ===")
for m in list(re.finditer(r"onClose", c))[:5]:
    s, e = max(0, m.start() - 120), min(len(c), m.end() + 160)
    print(repr(c[s:e]))
    print()

# ── 2. 提取所有 eval("...") 模块并逐个语法检查 ──
print("=== 逐个 eval 模块语法检查 ===")
pat = re.compile(r'eval\("((?:[^"\\]|\\.)*)"\)')
mods = pat.findall(c)
print("找到 eval 模块: %d 个" % len(mods))

坏 = []
tmp = os.path.join(tempfile.gettempdir(), "_syntax_probe.mjs")
node = r"C:\Users\64806\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

for i, raw in enumerate(mods):
    try:
        code = json.loads('"' + raw + '"')
    except Exception:
        continue
    # 只查我们自己的模块（含中文标记或源文件路径）
    if not re.search(r"活侠传|状态栏|分档|Tab[A-Z]|App\.vue|preview", code):
        continue
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(code)
    r = subprocess.run([node, "--check", tmp], capture_output=True, text=True, encoding="utf-8", errors="ignore")
    if r.returncode != 0:
        坏.append((i, code, r.stderr))
    else:
        # 也查我们自己的都通过？记录一下
        pass

print("我方模块中语法错误: %d 个" % len(坏))
for i, code, err in 坏[:6]:
    print("\n───── 模块 #%d ─────" % i)
    print(err[:900])
    print("...代码片段:")
    print(code[:400])
