# -*- coding: utf-8 -*-
"""读 Addressables catalog，列出全部资源清单。

★ catalog.json 的结构（Unity Addressables 标准）：
     m_InternalIds  —— 资源清单（4281 项），形如
                       "{UnityEngine.AddressableAssets.Addressables.RuntimePath}/StandaloneWindows/xxx.bundle"
     m_KeyDataString / m_BucketDataString / m_EntryDataString
                    —— 这三个是 **二进制 base64**，装着「资源名 → 条目」的映射。
                       要读它们得按 Addressables 的格式解析。

★ 先看 m_InternalIds —— 它至少告诉我们有多少 bundle、叫什么。
"""
import base64
import io
import json
import os
import re
import struct
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

p = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\StreamingAssets\aa\catalog.json"
d = json.load(io.open(p, encoding="utf-8"))

ids = d.get("m_InternalIds", [])
print("══ m_InternalIds：%d 项 ══" % len(ids))

bundle = [x for x in ids if x.endswith(".bundle")]
其他 = [x for x in ids if not x.endswith(".bundle")]
print("  .bundle  %d" % len(bundle))
print("  其他     %d" % len(其他))

print()
print("  bundle 名字（前 30）：")
for x in bundle[:30]:
    print("    " + os.path.basename(x))

print()
print("  其他项（前 15）：")
for x in 其他[:15]:
    print("    " + x[:100])

# ── 解析 m_KeyDataString：Addressables 的 key 表 ──
#   格式：4 字节小端 count，然后每条 [4 字节 keyType] [4 字节 len] [len 字节 UTF8]
print()
print("══ 解析 m_KeyDataString ══")
raw = base64.b64decode(d["m_KeyDataString"])
print("  解码后 %d 字节" % len(raw))


def 读键表(buf: bytes):
    pos = 0
    (n,) = struct.unpack_from("<i", buf, pos)
    pos += 4
    出 = []
    for _ in range(n):
        (kt,) = struct.unpack_from("<i", buf, pos)   # 0=string, 1=long
        pos += 4
        if kt == 0:
            (ln,) = struct.unpack_from("<i", buf, pos)
            pos += 4
            s = buf[pos:pos + ln].decode("utf-8", "replace")
            pos += ln
            出.append(s)
        else:
            (v,) = struct.unpack_from("<q", buf, pos)
            pos += 8
            出.append(v)
    return 出


try:
    键s = 读键表(raw)
    print("  读出 %d 个 key" % len(键s))
    print()
    print("  key 样例（前 40）：")
    for k in 键s[:40]:
        print("    " + str(k)[:90])
    print()
    # 按后缀归类
    c = Counter()
    for k in 键s:
        s = str(k)
        ext = os.path.splitext(s)[1].lower()
        c[ext or "(无后缀)"] += 1
    print("  按后缀：")
    for k, n in c.most_common(20):
        print("    %-12s %d" % (k, n))
    # 存下来
    io.open(r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work\_aa_keys.txt",
            "w", encoding="utf-8", newline="\n").write("\n".join(str(k) for k in 键s))
    print()
    print("  已写入 _work/_aa_keys.txt")
except Exception as e:
    print("  ★ 解析失败: %s" % e)
