# -*- coding: utf-8 -*-
"""检查 CDN 上的索引是不是最新的（jsDelivr 对 @main 有缓存）。"""
import io
import json
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

仓库 = "fkgzs123321/galgame-huoxiazhuan"


def 取(址):
    req = urllib.request.Request(址, headers={"User-Agent": "check/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read(), dict(r.headers)


for 标签 in ["@main", "@63b9130", "@dfe81bb"]:
    址 = f"https://testingcf.jsdelivr.net/gh/{仓库}{标签}/scenes.json"
    try:
        st, body, h = 取(址)
        j = json.loads(body.decode("utf-8"))
        e = j.get("场景", {}).get("screen_section_001_center")
        print("  %-14s HTTP %s  包=%r" % (标签, st, e["包"] if e else None))
        for k in ("cache-control", "age", "x-cache", "expires"):
            if k in h:
                print("        %s: %s" % (k, h[k]))
    except Exception as ex:
        print("  %-14s ★ %s" % (标签, str(ex)[:70]))

print()
print("═══ 本地文件（对照）═══")
d = json.load(io.open(r"E:\Games\写卡\tavern_helper_template\src\活侠传\素材\scenes.json",
                     encoding="utf-8"))
e = d["场景"].get("screen_section_001_center")
print("  本地 screen_section_001_center → %r" % (e["包"] if e else None))
