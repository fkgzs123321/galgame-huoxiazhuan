# -*- coding: utf-8 -*-
"""截新游戏界面，验证素材能不能真从 CDN 取到。

★ 这一步验证三件事（缺一不可）：
   ① 界面能渲染出来（不是白屏）
   ② CDN 的 pack_index.json / scenes.json 能取到
   ③ .pack 能解开、背景图与立绘真的显示出来

  前两项看截图有没有崩，第三项要**看图里有没有画**——
  白屏和「有图但取不到素材占位」在字节数上都能过，必须人眼看。
"""
import os
import subprocess
import sys
import time
import glob

sys.stdout.reconfigure(encoding="utf-8")

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
DIR = r"E:\Games\写卡\tavern_helper_template\dist\活侠传\界面\状态栏"
OUT = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work\_shot"
PORT = "18931"
PROFILE = os.path.join(os.environ["TEMP"], "edge-game")

os.makedirs(OUT, exist_ok=True)

srv = subprocess.Popen(
    [sys.executable, "-m", "http.server", PORT],
    cwd=DIR,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(2.5)

# 界面默认落在「人物」页；再多截一张属性页
图s = [
    ("主界面", "game_main"),
    ("人物页", "game_rel"),
]

try:
    for 名, fn in 图s:
        png = os.path.join(OUT, fn + ".png")
        if os.path.exists(png):
            os.remove(png)
        url = "http://127.0.0.1:%s/index.html" % PORT
        subprocess.run(
            [
                EDGE,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--user-data-dir=" + PROFILE,
                "--hide-scrollbars",
                "--window-size=1000,900",
                # ★ 给足时间：素材要走 CDN（索引 + 包），12 秒常不够
                "--virtual-time-budget=30000",
                "--screenshot=" + png,
                url,
            ],
            capture_output=True,
            timeout=140,
        )
        size = os.path.getsize(png) if os.path.exists(png) else 0
        ok = "OK " if size > 20000 else "空?"
        print("  %s %-8s %-16s %8d 字节" % (ok, 名, fn + ".png", size))
        if size > 20000:
            print("       " + png)
finally:
    srv.terminate()
