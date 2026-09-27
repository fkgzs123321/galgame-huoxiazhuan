# -*- coding: utf-8 -*-
"""算清楚：推 GitHub 时，哪些是源码（该推）、哪些是可再生素材（该忽略）。

★ 判据：
   · **源码**：设计文档、schema、世界书条目、脚本、界面、正则、开场白
     —— 这些是「做卡」的产物，丢了要重做，必须推。
   · **可再生素材**：从游戏/网页扒下来的图、音频，以及解包中间产物
     —— 体积大、能重新生成，push 上去只会撑爆仓库。
   · **构建产物**：dist、node_modules —— 由源码生成，不推。

★ 为什么必须分开算：活侠传一张卡就 1638 MB，
  其中 99% 是从游戏里扒的素材。全推上去 GitHub 会拒绝，也没意义。
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template"
SRC = os.path.join(根, "src")

# ── 会被忽略的目录名（任意层级）──
忽略目录 = {
    "node_modules", "dist", ".git", "__pycache__", ".vite",
    "_assets",       # 从 Unity bundle 解出的原始 PNG（1116 MB）
    "_web",          # 压缩后的 WebP（133 MB）
    "_pack",         # 打包后的 .bin（149 MB）
    "_portraits",    # 从 wiki 扒的立绘（56 MB）
    "_work",         # 生成器中间产物（但与上面几个不同，见下）
    ".cache", ".tmp",
}

# ★ _work 单独处理：它里面混着两类
#   · 生成器脚本（gen_*.py / build_data.py）—— **是源码**，必须推
#   · 解包中间产物（_events_detail.json / _fanjian.json）—— 可重生成，但不大
#   实测 _work 里 1617 MB 全是 _assets/_web/_pack/_portraits 四个子目录，
#   其余（.py / .json / .ts）加起来不到 10 MB。所以「忽略 _work」是错的，
#   应该只忽略那四个子目录。
忽略子目录 = {"_assets", "_web", "_pack", "_portraits", "_shot", "_wiki_raw"}

忽略文件后缀 = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".ogg", ".wav", ".mp4", ".bin"}


def 算(路径: str):
    推 = 忽略 = 0
    推数 = 忽略数 = 0
    for r, ds, fs in os.walk(路径):
        # 就地剪枝
        ds[:] = [d for d in ds if d not in 忽略目录 and d not in 忽略子目录]
        for f in fs:
            p = os.path.join(r, f)
            try:
                sz = os.path.getsize(p)
            except OSError:
                continue
            在后缀 = any(f.lower().endswith(x) for x in 忽略文件后缀)
            # ★ .img / .webp 等在「正则」目录里可能是界面素材，但那些都很小；
            #   这里只按后缀粗分，后面人工复核大文件。
            if 在后缀:
                忽略 += sz
                忽略数 += 1
            else:
                推 += sz
                推数 += 1
    return 推, 推数, 忽略, 忽略数


卡s = sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)))
print("══ src 下 %d 张卡 ══\n" % len(卡s))
print("  %-34s %10s %8s %10s" % ("卡名", "该推", "文件数", "忽略(素材)"))
print("  " + "-" * 68)

总推 = 总忽 = 0
行s = []
for 卡 in 卡s:
    p = os.path.join(SRC, 卡)
    推, 推数, 忽, 忽数 = 算(p)
    总推 += 推
    总忽 += 忽
    行s.append((推, 卡, 推数, 忽))

for 推, 卡, 推数, 忽 in sorted(行s, reverse=True):
    print("  %-34s %8.1f MB %8d %8.1f MB" % (卡[:32], 推 / 1024 / 1024, 推数, 忽 / 1024 / 1024))

print("  " + "-" * 68)
print("  %-34s %8.1f MB %8s %8.1f MB" % ("合计", 总推 / 1024 / 1024, "", 总忽 / 1024 / 1024))
print()
print("  ⇒ 推上去约 %.0f MB；忽略素材约 %.0f MB" % (总推 / 1024 / 1024, 总忽 / 1024 / 1024))
