# -*- coding: utf-8 -*-
"""查幕后词为什么零宽匹配。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

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

t = "眾人的準確年紀&身高"
m = 幕后词.search(t)
print("  测题: %r" % t)
print("  匹配: %s" % (m is not None))
if m:
    print("  group(0)=%r  位置=%d~%d" % (m.group(0), m.start(), m.end()))
    print("  group(0) 以 repr 看: %a" % m.group(0))

print()
# 逐分支试
分支s = 幕后词.pattern.split("|")
print("  分支数 %d" % len(分支s))
命中 = []
for b in 分支s:
    try:
        mm = re.search(b, t)
        if mm:
            命中.append((b, mm.group(0), mm.start(), mm.end()))
    except re.error as e:
        print("  ★ 非法分支 %r: %s" % (b, e))
print("  命中分支: %s" % 命中)

# 空分支？
空 = [b for b in 分支s if b == ""]
print("  空分支: %d 个" % len(空))
