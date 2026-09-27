# -*- coding: utf-8 -*-
"""验证打包出的 PNG 角色卡：图片有效性 + 内嵌的 chara 数据。"""
import base64
import json
import os
import struct
import sys
import zlib

sys.stdout.reconfigure(encoding="utf-8")

P = r"E:\Games\写卡\tavern_helper_template\src\活侠传\活侠传.png"
raw = open(P, "rb").read()
print("文件: %s" % P)
print("大小: %d 字节 (%.1f KB)" % (len(raw), len(raw) / 1024))
print("PNG 签名:", "✓" if raw[:8] == b"\x89PNG\r\n\x1a\n" else "✗")

# ── 解析 PNG chunk，找 tEXt 里的 chara ──
pos = 8
chunks = []
chara = None
while pos < len(raw):
    if pos + 8 > len(raw):
        break
    ln = struct.unpack(">I", raw[pos : pos + 4])[0]
    typ = raw[pos + 4 : pos + 8].decode("latin-1", "replace")
    data = raw[pos + 8 : pos + 8 + ln]
    chunks.append((typ, ln))
    if typ == "tEXt":
        try:
            k, v = data.split(b"\x00", 1)
            if k.decode("latin-1", "replace").lower() in ("chara", "ccv3"):
                chara = (k.decode("latin-1"), v)
        except Exception:
            pass
    pos += 12 + ln

print("\n=== chunk 概览 ===")
for t, l in chunks[:8]:
    print("  %-6s %d 字节" % (t, l))

print("\n=== 内嵌角色数据 ===")
if not chara:
    print("  ✗ 未找到 chara / ccv3 块")
else:
    key, val = chara
    print("  块名:", key)
    try:
        j = json.loads(base64.b64decode(val).decode("utf-8"))
    except Exception as e:
        print("  解码失败:", e)
        j = None
    if j:
        d = j.get("data", j)
        print("  name:", d.get("name"))
        print("  first_mes:", len(d.get("first_mes", "")), "字")
        print("  alternate_greetings:", len(d.get("alternate_greetings", [])), "条")
        cb = d.get("character_book", {})
        print("  世界书条目:", len(cb.get("entries", [])))
        th = d.get("extensions", {}).get("tavern_helper", {})
        scr = th.get("scripts", [])
        print("  脚本:", [(s.get("name"), len(s.get("content", ""))) for s in scr])
        print("  creator_notes:", str(d.get("creator_notes", ""))[:60])
