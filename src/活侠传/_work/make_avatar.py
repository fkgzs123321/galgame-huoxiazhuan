# -*- coding: utf-8 -*-
"""生成角色卡头像。

构图：原作立绘 + 宣纸底 + 竖排标题（水墨武侠风）
规格：1024x1861（对齐参照卡 欲望都市/头像.png）
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"E:\Games\写卡\tavern_helper_template\src\活侠传"
ART = os.path.join(ROOT, "_work", "_portraits")
OUT = os.path.join(ROOT, "头像.png")

W, H = 1024, 1861

# 配色（与前端 global.css 一致）
纸 = (242, 238, 226)
纸2 = (232, 227, 212)
墨 = (42, 40, 35)
朱砂 = (168, 51, 42)
淡墨 = (154, 147, 132)

楷 = r"C:\Windows\Fonts\simkai.ttf"
黑 = r"C:\Windows\Fonts\simhei.ttf"


def 字体(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def 居中(d, xy, text, f, fill):
    x, y = xy
    box = d.textbbox((0, 0), text, font=f)
    d.text((x - (box[2] - box[0]) / 2, y), text, font=f, fill=fill)


# ══════ 1. 底：宣纸渐变 ══════
im = Image.new("RGB", (W, H), 纸)
d = ImageDraw.Draw(im)
for y in range(H):
    t = y / H
    r = int(纸[0] * (1 - t) + 纸2[0] * t)
    g = int(纸[1] * (1 - t) + 纸2[1] * t)
    b = int(纸[2] * (1 - t) + 纸2[2] * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# ══════ 2. 放立绘 ══════
# 挑一张：小师妹（sister）的 normal，构图最完整
候选 = [
    "portrait_sister__normal.png",
    "portrait_girl_06__gloomy2.png",
    "portrait_girl_01__laugh1.png",
]
立绘 = None
for c in 候选:
    p = os.path.join(ART, c)
    if os.path.exists(p):
        立绘 = Image.open(p).convert("RGBA")
        print("用立绘:", c, 立绘.size)
        break

if 立绘:
    # 缩放到高度约占画面 56%，居下但不压到底部文字
    tw = int(W * 0.72)
    th = int(立绘.height * (tw / 立绘.width))
    if th > H * 0.56:
        th = int(H * 0.56)
        tw = int(立绘.width * (th / 立绘.height))
    立绘 = 立绘.resize((tw, th), Image.LANCZOS)

    x = (W - tw) // 2
    y = H - th - int(H * 0.12)  # ★ 留出底部信息带
    im.paste(立绘, (x, y), 立绘 if 立绘.mode == "RGBA" else None)
else:
    print("未找到立绘，只出纸面")

# ══════ 3. 标题：竖排「活侠传」 ══════
f_title = 字体(楷, 132)
f_sub = 字体(楷, 40)
f_sm = 字体(黑, 26)

# 竖排：一字一行
字 = "活侠传"
x0 = 118
y0 = 150
for i, ch in enumerate(字):
    d.text((x0, y0 + i * 150), ch, font=f_title, fill=墨)

# 朱砂印
d.rectangle([x0 - 14, y0 + 3 * 150 + 6, x0 + 118, y0 + 3 * 150 + 96], outline=朱砂, width=4)
f_seal = 字体(楷, 62)
d.text((x0 + 14, y0 + 3 * 150 + 14), "丑侠", font=f_seal, fill=朱砂)

# ══════ 4. 副题 ══════
d.text((x0, y0 + 3 * 150 + 130), "一 个 没 有 主 角 光 环 的 人", font=f_sub, fill=淡墨)

# ══════ 5. 底部信息（加一条纸色底带，避免压在人物上）══════
带顶 = H - 160
d.rectangle([0, 带顶, W, H], fill=纸2)
d.line([(60, 带顶), (W - 60, 带顶)], fill=(42, 40, 35), width=2)
d.text((60, H - 128), "原著向同人 · Obb Studio《活侠传》", font=f_sm, fill=淡墨)
右 = "数值与前置由引擎控制，AI 只写剧情"
box = d.textbbox((0, 0), 右, font=f_sm)
d.text((W - 60 - (box[2] - box[0]), H - 128), 右, font=f_sm, fill=淡墨)

# ══════ 6. 四角淡框 ══════
d.rectangle([28, 28, W - 28, H - 28], outline=(42, 40, 35), width=2)
d.rectangle([40, 40, W - 40, H - 40], outline=(42, 40, 35, 60), width=1)

im.save(OUT, "PNG")
print("已生成:", OUT, im.size, os.path.getsize(OUT), "字节")
