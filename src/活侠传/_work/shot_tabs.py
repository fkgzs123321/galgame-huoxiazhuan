# -*- coding: utf-8 -*-
"""逐页签截图，验证每个面板都能渲染。"""
import os
import subprocess
import sys
import time
import glob

sys.stdout.reconfigure(encoding="utf-8")

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
DIR = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏"
OUT = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work\_shot"
PORT = "18920"
PROFILE = os.path.join(os.environ["TEMP"], "edge-tabs")

os.makedirs(OUT, exist_ok=True)

# 起 HTTP 服务
srv = subprocess.Popen(
    [sys.executable, "-m", "http.server", PORT],
    cwd=DIR,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(2.5)

TABS = [
    ("attr", "属性", "01_attr"),
    ("martial", "武学", "02_martial"),
    ("items", "行囊", "03_items"),
    ("rel", "人物", "04_rel"),
    ("quest", "事务", "05_quest"),
    ("chronicle", "见闻", "06_chronicle"),
]

try:
    for key, name, fn in TABS:
        png = os.path.join(OUT, fn + ".png")
        if os.path.exists(png):
            os.remove(png)
        url = "http://127.0.0.1:%s/index.html#%s" % (PORT, key)
        subprocess.run(
            [
                EDGE,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--user-data-dir=" + PROFILE,
                "--hide-scrollbars",
                "--window-size=880,1100",
                "--virtual-time-budget=12000",
                "--screenshot=" + png,
                url,
            ],
            capture_output=True,
            timeout=90,
        )
        size = os.path.getsize(png) if os.path.exists(png) else 0
        ok = "OK " if size > 20000 else "空?"
        print("  %s %-6s %-12s %8d 字节" % (ok, name, fn + ".png", size))
finally:
    srv.terminate()
