# -*- coding: utf-8 -*-
"""把压缩后的 WebP 打包成少量二进制文件，便于推 CDN。

★★ 为什么打包（不是懒得推）：
   2047 个文件逐个推要 4000+ 次 API 调用（每个文件先查 sha 再 PUT），
   按 300ms/次算要 20 分钟，还容易撞 GitHub 速率限制。
   改成「每类一个 .pack + 一份 manifest.json」：
     文件数 2047 → ~150
     API 调用 4000+ → ~310
     而且 UI 一次只取需要的那个包（约 1 MB），不用为一张图拉全部。

★ 包格式（极简，UI 里 20 行就能解）：
     [4 字节 小端：条目数 N]
     N × [4 字节 偏移][4 字节 长度]
     ... 后面是全部 WebP 原始字节，按顺序拼接

★ 单包上限 8 MB —— jsDelivr 单文件上限 20 MB，
  留足余量，同时保证一次请求不会太久。
"""
import io
import json
import os
import struct
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work"
SRC = os.path.join(根, "_web")
DST = os.path.join(根, "_pack")
os.makedirs(DST, exist_ok=True)

for f in os.listdir(DST):
    os.remove(os.path.join(DST, f))

清单 = json.load(io.open(os.path.join(SRC, "_清单.json"), encoding="utf-8"))

单包上限 = 8 * 1024 * 1024
manifest = {}
总包数 = 0
总字节 = 0

for 类 in sorted(清单):
    xs = 清单[类]
    if not xs:
        continue

    # 按单包上限切分
    批s = []
    当前 = []
    当前字节 = 0
    for x in xs:
        p = os.path.join(SRC, x["文件"])
        if not os.path.exists(p):
            continue
        b = os.path.getsize(p)
        if 当前 and 当前字节 + b > 单包上限:
            批s.append(当前)
            当前 = []
            当前字节 = 0
        当前.append((x, p, b))
        当前字节 += b
    if 当前:
        批s.append(当前)

    for i, 批 in enumerate(批s, 1):
        包名 = f"{类}.pack" if len(批s) == 1 else f"{类}.{i}.pack"
        头部 = struct.pack("<I", len(批))
        偏移表 = b""
        数据 = b""
        起点 = 4 + len(批) * 8
        for x, p, b in 批:
            偏移表 += struct.pack("<II", 起点 + len(数据), b)
            数据 += io.open(p, "rb").read()
            manifest[x["文件"]] = {
                "包": 包名,
                "偏移": 起点 + len(数据) - b,
                "长度": b,
                "宽": x["宽"], "高": x["高"],
                "用途": x["用途"],
                "名": x["名"],
                "类": 类,
            }
        io.open(os.path.join(DST, 包名), "wb").write(头部 + 偏移表 + 数据)
        总包数 += 1
        总字节 += os.path.getsize(os.path.join(DST, 包名))

# 落一份 manifest
io.open(os.path.join(DST, "manifest.json"), "w", encoding="utf-8", newline="\n").write(
    json.dumps({
        "说明": "活侠传素材包索引。键是逻辑路径，值是它在哪个 .pack、什么偏移与长度。",
        "条目数": len(manifest),
        "包数": 总包数,
        "总字节": 总字节,
        "条目": manifest,
    }, ensure_ascii=False)
)

print("══ 打包完成 ══")
print("  条目 %d 个 → %d 个 .pack + 1 个 manifest.json" % (len(manifest), 总包数))
print("  合计 %.1f MB" % (总字节 / 1024 / 1024))
print()
大 = sorted(((os.path.getsize(os.path.join(DST, f)), f) for f in os.listdir(DST) if f.endswith(".pack")),
           reverse=True)
print("  最大的 12 个包：")
for b, f in 大[:12]:
    print("    %7.2f MB  %s" % (b / 1024 / 1024, f))
print()
print("  最小的 5 个包：")
for b, f in 大[-5:]:
    print("    %7.2f MB  %s" % (b / 1024 / 1024, f))
print()
print("  写入 " + DST)
