# -*- coding: utf-8 -*-
"""截图 + 抓错误。比只看截图可靠：能拿到 DOM 里的错误框和 console。"""
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
DIR = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏"
OUT = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work\_shot"
PORT = "18950"

os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT], cwd=DIR,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2.5)

TABS = [
    ("act", "行动"),
    ("attr", "属性"),
    ("martial", "武学"),
    ("items", "行囊"),
    ("rel", "人物"),
    ("quest", "事务"),
    ("chronicle", "见闻"),
]
抓 = os.path.join(os.environ["TEMP"], "edge-reg")

try:
    for key, name in TABS:
        url = "http://127.0.0.1:%s/index.html#%s" % (PORT, key)
        png = os.path.join(OUT, "reg_%s.png" % key)
        dom = os.path.join(OUT, "reg_%s.html" % key)
        if os.path.exists(png):
            os.remove(png)

        # 截图
        subprocess.run(
            [EDGE, "--headless=new", "--disable-gpu", "--no-sandbox",
             "--user-data-dir=" + 抓, "--hide-scrollbars",
             "--window-size=880,1000", "--virtual-time-budget=15000",
             "--screenshot=" + png, url],
            capture_output=True, timeout=90)

        # dump-dom 抓错误框
        r = subprocess.run(
            [EDGE, "--headless=new", "--disable-gpu", "--no-sandbox",
             "--user-data-dir=" + 抓, "--virtual-time-budget=15000",
             "--dump-dom", url],
            capture_output=True, timeout=90)
        html = r.stdout.decode("utf-8", "replace")
        open(dom, "w", encoding="utf-8").write(html)

        size = os.path.getsize(png) if os.path.exists(png) else 0

        # ★ 错误框是运行时 createElement 出来的，源码里也有这段字符串。
        #   所以只能看 DOM 里**是否真的存在** id="__preview_err" 的元素：
        #   形如 <pre id="__preview_err" ...>内容</pre> 才算真出错。
        import re as _re

        m = _re.search(r'<pre[^>]*id="__preview_err"[^>]*>(.*?)</pre>', html, _re.S)
        有错 = bool(m)
        错误文本 = (m.group(1).strip()[:400] if m else "")

        标题 = ""
        i = html.find("<title>")
        if i >= 0:
            标题 = html[i + 7 : html.find("</title>", i)]

        状态 = []
        if size < 20000:
            状态.append("页面过小")
        if 有错:
            状态.append("✗ 运行时错误")
        if 标题 and "活侠传" not in 标题:
            状态.append("标题异常:" + 标题[:40])

        print("  %-6s %-8s %7d 字节  %s" % (name, key, size, "/".join(状态) if 状态 else "✓ OK"))

        if 有错:
            print("      错误内容: " + 错误文本.replace("\n", " ")[:350])
finally:
    srv.terminate()
