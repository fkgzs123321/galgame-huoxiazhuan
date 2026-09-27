# -*- coding: utf-8 -*-
"""按用途压缩并转 WebP。

★ 为什么必须压：原图 2047 张 / 1.2 GB，jsDelivr 单文件上限与加载速度都受不了。
  网页实际需要：
     · 场景背景  1920x1080 → 1280x720，q=82   （铺满界面，不必原分辨率）
     · 立绘      1268x1700 → 高 900，q=85     （站在对话旁，150~250 KB 够）
     · 战斗立绘  1824x1088 → 宽 1400，q=85    （横构图，要看清动作）
     · 道具图标  312x300   → 原尺寸，q=88     （本来就小）
     · 事件图    480x700   → 原尺寸，q=85

★ 保留透明通道（立绘要靠它叠在场景上）。
"""
import io
import json
import os
import sys
import time
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image  # noqa: E402

根 = r"E:\Games\写卡\tavern_helper_template\src\活侠传\_work"
SRC = os.path.join(根, "_assets")
DST = os.path.join(根, "_web")

清单 = json.load(io.open(os.path.join(SRC, "_清单.json"), encoding="utf-8"))

# ── 按类别/名字定压缩规则 ──
def 规则(类: str, 名: str, 宽: int, 高: int):
    n = 名.lower()
    c = 类.lower()
    if n.startswith("screen_"):
        return 1280, None, 82, "背景"
    if c.startswith("battle_"):
        if 宽 > 1500:
            return 1400, None, 85, "战斗立绘"
        return None, None, 85, "战斗立绘"     # 小图不动
    if c.startswith("portrait_") or c.startswith("portarit_"):
        return None, 900, 85, "立绘"
    if n.startswith("item_"):
        return None, None, 88, "道具图标"
    if n.startswith(("pic_girl", "pic_", "pic")):
        if 宽 >= 1600:
            return 1280, None, 82, "事件大图"
        return None, None, 85, "事件图"
    if c.startswith("combat_"):
        return 1280, None, 85, "战斗界面"
    if c.startswith("picture"):
        if 宽 >= 1600:
            return 1280, None, 82, "事件大图"
        return None, None, 86, "图片"
    # 其余（video 等）
    return None, None, 85, "其他"


新清单 = defaultdict(list)
总数 = 0
原字节 = 新字节 = 0
开始 = time.time()
类别数 = defaultdict(int)

for 类, xs in 清单.items():
    for x in xs:
        p = os.path.join(SRC, x["文件"])
        if not os.path.exists(p):
            continue
        try:
            im = Image.open(p)
            if im.mode not in ("RGBA", "RGB", "LA", "P"):
                im = im.convert("RGBA")
        except Exception:
            continue

        宽, 高, q, 用途 = 规则(类, x["名"], im.width, im.height)
        if 宽 and im.width > 宽:
            im = im.resize((宽, round(im.height * 宽 / im.width)), Image.LANCZOS)
        elif 高 and im.height > 高:
            im = im.resize((round(im.width * 高 / im.height), 高), Image.LANCZOS)

        子 = os.path.join(DST, 类)
        os.makedirs(子, exist_ok=True)
        目标 = os.path.join(子, x["名"] + ".webp")
        try:
            im.save(目标, "WEBP", quality=q, method=4)
        except Exception:
            continue

        a = os.path.getsize(p)
        b = os.path.getsize(目标)
        原字节 += a
        新字节 += b
        总数 += 1
        类别数[用途] += 1

        新清单[类].append({
            "名": x["名"], "用途": 用途,
            "宽": im.width, "高": im.height,
            "文件": os.path.relpath(目标, DST).replace("\\", "/"),
            "字节": b,
        })

json.dump(新清单, io.open(os.path.join(DST, "_清单.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

print("══ 压缩完成 ══")
print("  %d 张   用时 %.0f 秒" % (总数, time.time() - 开始))
print("  原始 %.1f MB → 压缩后 %.1f MB（%.0f%%）"
      % (原字节 / 1024 / 1024, 新字节 / 1024 / 1024, 新字节 / 原字节 * 100))
print()
print("  按用途：")
for k in sorted(类别数, key=lambda x: -类别数[x]):
    print("    %-12s %4d 张" % (k, 类别数[k]))
print()
print("  最大 10 个文件：")
大 = sorted(((v["字节"], v["文件"]) for vs in 新清单.values() for v in vs), reverse=True)[:10]
for b, f in 大:
    print("    %6d KB  %s" % (b // 1024, f))
print()
print("  写入 " + DST)
