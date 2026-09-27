# -*- coding: utf-8 -*-
"""
重新提取《活侠传》文本资源 —— 修正旧 dump 的两个缺陷:
  1. 同名 TextAsset(zh-tw / zh-cn / kr 三套)互相覆盖 -> 用序号去重, 全部保留
  2. 旧脚本漏掉 sharedassets4/6/7/8/9 等 -> 这次扫全部 assets 文件
输出: _dump2/  , 并生成索引 _dump2/_index.tsv
"""
import os
import sys
import collections
import UnityPy

sys.stdout.reconfigure(encoding="utf-8")

GAME = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_dump2")
os.makedirs(OUT, exist_ok=True)

targets = sorted(
    f for f in os.listdir(GAME)
    if f.endswith(".assets") or f == "globalgamemanagers"
)

rows = []
seen = collections.Counter()   # (name, lang) -> 出现次数

def lang_of(name):
    for suf in ("_zh-tw", "_zh-cn", "_kr", "_en", "_ja"):
        if name.endswith(suf):
            return suf[1:]
    return "?"

for fn in targets:
    path = os.path.join(GAME, fn)
    print("=== loading", fn)
    try:
        env = UnityPy.load(path)
    except Exception as e:
        print("  FAIL load:", e)
        continue
    for obj in env.objects:
        if obj.type.name != "TextAsset":
            continue
        try:
            d = obj.read()
            name = getattr(d, "m_Name", None) or "?"
            script = d.m_Script if hasattr(d, "m_Script") else b""
            if isinstance(script, str):
                text = script
            else:
                text = None
                for enc in ("utf-8", "utf-16", "gbk"):
                    try:
                        text = bytes(script).decode(enc)
                        break
                    except Exception:
                        pass
                if text is None:
                    continue
            # 语言判定: 文件名后缀优先, 否则按内容统计
            lg = lang_of(name)
            if lg == "?":
                kor = sum(1 for c in text[:4000] if "\uac00" <= c <= "\ud7af")
                han = sum(1 for c in text[:4000] if "\u4e00" <= c <= "\u9fff")
                lg = "kr" if kor > han else "zh"
            key = (name, lg)
            seen[key] += 1
            n = seen[key]
            safe = "".join(c if (c.isalnum() or c in "._-") else "_" for c in name)
            outfn = "%s__%s__%s__%d.txt" % (os.path.splitext(fn)[0], safe, lg, n)
            with open(os.path.join(OUT, outfn), "w", encoding="utf-8") as f:
                f.write(text)
            rows.append((outfn, name, lg, len(text), fn))
        except Exception:
            pass

with open(os.path.join(OUT, "_index.tsv"), "w", encoding="utf-8") as f:
    f.write("outfile\tname\tlang\tlen\tsource\n")
    for r in rows:
        f.write("\t".join(str(x) for x in r) + "\n")

print()
print("总提取: %d 个 TextAsset" % len(rows))
by = collections.Counter(r[2] for r in rows)
print("语言分布:", dict(by))
with open(os.path.join(OUT, "_names.txt"), "w", encoding="utf-8") as f:
    for nm in sorted(set(r[1] for r in rows)):
        f.write(nm + "\n")
print("索引:", os.path.join(OUT, "_index.tsv"))
