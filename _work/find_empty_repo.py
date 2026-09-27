# -*- coding: utf-8 -*-
"""找一个「刚建好的空仓」—— 用户说建了个空仓库让我们推。"""
import json
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

tok = None
for ln in open(r"C:\Users\64806\.dsh\.env", encoding="utf-8"):
    if "GITHUB_PERSONAL_ACCESS_TOKEN" in ln:
        tok = ln.split("=", 1)[1].strip()
        break
if not tok:
    print("★ 没读到 token")
    sys.exit(1)


def api(址):
    req = urllib.request.Request(址, headers={
        "Authorization": "Bearer " + tok,
        "Accept": "application/vnd.github+json",
        "User-Agent": "find-repo",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


d = api("https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc")
print("══ 按最近更新排序 ══")
for r in d:
    print("  %-34s 更新=%-11s 建=%-11s %7.2f MB  %s"
          % (r["name"], (r.get("pushed_at") or "")[:10], r["created_at"][:10],
             r.get("size", 0) / 1024, "私有" if r["private"] else "公开"))

print()
print("══ 逐个看内容（找空的或只有 README 的）══")
for r in d:
    try:
        c = api(f"https://api.github.com/repos/{r['full_name']}/contents/")
    except Exception as e:
        print("  %-34s ★ %s" % (r["name"], str(e)[:40]))
        continue
    if isinstance(c, dict):
        print("  %-34s 空仓" % r["name"])
        continue
    名s = [x["name"] for x in c]
    print("  %-34s %2d 项: %s" % (r["name"], len(名s), "、".join(名s[:8])))
