# -*- coding: utf-8 -*-
"""诊断 gen_qna 的筛选：为什么 0 题。"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

p = r"E:\Games\写卡\tavern_helper_template\src\活侠传\source\_raw\wiki\other\qna\interview-129.md"
c = io.open(p, encoding="utf-8-sig").read()
c = re.sub(r"\A\s*---\s*\n.*?\n---\s*\n", "", c, flags=re.S)

# ★ 关键：在 .py 文件里写正则，$ 不会被 shell 吃掉
题s = list(re.finditer(r"^###\s*(Q[\d-]+)\s*(.*)$", c, re.M))
print("  正则匹配到 %d 题" % len(题s))
if not 题s:
    print("  ★ 连一条都没匹配到 —— 看文件里 ### 行的真实样子：")
    for ln in c.split("\n"):
        if ln.strip().startswith("###"):
            print("    %r" % ln[:60])
            break
    sys.exit(1)

for m in 题s[:3]:
    print("    %s  %r" % (m.group(1), m.group(2).strip()[:30]))

print()
设定词 = re.compile(
    r"年紀|年龄|身高|生日|位置|用途|深度|形象|條件|条件|為何|为何|是否|"
    r"遺傳|遗传|速度|開銷|开销|設定|设定|世界觀|世界观|勢力|势力|"
    r"劇本|剧本|結緣|结缘|戲份|戏份|規格|规格|能力|拜入|門派|门派|"
    r"江湖|唐門|唐门|雪山|崆峒|青城|點蒼|点苍|錦香|锦香|南宮|南宫|上官"
)
幕后词 = re.compile(
    r"履歷|履历|錄取|录取|應徵|应征|面試|面试|"
    r"銷量|销量|周邊|周边|集資|集资|授權|授权|"
    r"訪談|访谈|實況|实况|建議|建议|經驗談|经验谈|轉職|转职|轉行|转行|"
    r"工時|工时|壓力|压力|感想|心得|技巧|要訣|要诀|推薦|推荐|"
    r"自我介紹|自我介绍|入坑|粉專|粉专|社群|小編|小编|"
    r"原聲帶|原声带|音樂會|音乐会|貼圖|贴图|愚人節|愚人节|周年|週年|"
    r"得獎|得奖|獲獎|获奖|感言|謠言|谣言|"
    r"血汗|疫情|確診|确诊|超忙|"
    r"平行版|性轉|性转|"
    r"牧場物語|牧场物语|GTA|"
    r"下個作品|下个作品|下回|"
)


def 是设定题(号, 题):
    if 幕后词.search(题):
        return False
    if 号.startswith("Q8-"):
        return True
    if 号.startswith("Q7-") and 设定词.search(题):
        return True
    if 设定词.search(题):
        return True
    return False


中 = [(m.group(1), m.group(2).strip()) for m in 题s if 是设定题(m.group(1), m.group(2).strip())]
print("  判为设定题 %d / %d：" % (len(中), len(题s)))
for 号, 题 in 中:
    print("    %-8s %s" % (号, 题[:30]))

print()
print("  Q8 全 19 题的判定：")
for m in 题s:
    if m.group(1).startswith("Q8-"):
        题 = m.group(2).strip()
        被 = 幕后词.search(题)
        print("    %-8s %-26s %s" % (m.group(1), 题[:24], "★ 被幕后词拦：" + 被.group(0) if 被 else "✓ 收"))
