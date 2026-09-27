# -*- coding: utf-8 -*-
"""用 CDP 抓产物在浏览器里的 console 与异常。

用法: python cdp_probe.py <url>
"""
import json
import subprocess
import sys
import time
import urllib.request
import os
import glob

sys.stdout.reconfigure(encoding="utf-8")

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:18884/index.html"
PORT = 9333

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PROFILE = os.path.join(os.environ["TEMP"], "edge-cdp-probe")


def 找():
    for p in glob.glob(os.path.join(PROFILE, "DevToolsActivePort")):
        return p
    return None


proc = subprocess.Popen(
    [
        EDGE,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={PROFILE}",
        "--enable-logging=stderr",
        "about:blank",
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

try:
    # 等 CDP 就绪
    ver = None
    for _ in range(40):
        try:
            ver = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=2))
            break
        except Exception:
            time.sleep(0.4)
    if not ver:
        print("CDP 未就绪")
        sys.exit(1)
    print("浏览器:", ver.get("Browser"))

    ws_url = ver["webSocketDebuggerUrl"]
    # 开新页
    req = urllib.request.Request(
        f"http://127.0.0.1:{PORT}/json/new?{urllib.parse.quote(URL, safe='')}",
        method="PUT",
    )
    page = json.load(urllib.request.urlopen(req, timeout=5))
    print("页面:", page.get("id"))
finally:
    pass

print()
print("（CDP websocket 需要额外库；改走简单法：读 DevToolsActivePort 后直接 dump）")
proc.terminate()
