# -*- coding: utf-8 -*-
"""截图 + 抓错误（安静版：只输出短行）。"""
import os
import re
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
DIR = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏"
OUT = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work\_shot"
PORT = "18970"

os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT], cwd=DIR,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2.5)

TABS = [("act", "行动"), ("attr", "属性"), ("martial", "武学"), ("items", "行囊"),
        ("rel", "人物"), ("quest", "事务"), ("chronicle", "见闻")]
抓 = os.path.join(os.environ["TEMP"], "edge-ev")

try:
    for key, name in TABS:
        url = "http://127.0.0.1:%s/index.html#%s" % (PORT, key)
        png = os.path.join(OUT, "ev_%s.png" % key)
        if os.path.exists(png):
            os.remove(png)
        subprocess.run(
            [EDGE, "--headless=new", "--disable-gpu", "--no-sandbox",
             "--user-data-dir=" + 抓, "--hide-scrollbars",
             "--window-size=880,1050", "--virtual-time-budget=15000",
             "--screenshot=" + png, url],
            capture_output=True, timeout=90)
        r = subprocess.run(
            [EDGE, "--headless=new", "--disable-gpu", "--no-sandbox",
             "--user-data-dir=" + 抓, "--virtual-time-budget=15000",
             "--dump-dom", url],
            capture_output=True, timeout=90)
        html = r.stdout.decode("utf-8", "replace")
        m = re.search(r'<pre[^>]*id="__preview_err"[^>]*>(.*?)</pre>', html, re.S)
        size = os.path.getsize(png) if os.path.exists(png) else 0
        状态 = "✓ OK" if size > 20000 and not m else "✗ 有问题"
        print("  %-6s %-8s %7d 字节  %s" % (name, key, size, 状态))
        if m:
            print("      " + m.group(1).strip().replace("\n", " ")[:200])
finally:
    srv.terminate()
