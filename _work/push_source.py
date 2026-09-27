# -*- coding: utf-8 -*-
"""把源码推成远端 main 之上的一个提交 —— 保住 CDN 素材。

★★ 为什么不能直接 push / 不能 force push
   · 远端 main（63b9130）是**单条提交**，装着 162 个 CDN 文件（152 个 .pack + 索引）
   · 本地 main（ffcef6e）是 495 条提交的模板历史
   · 两者**没有共同祖先** → 直接推会被拒（非快进）
   · force push 会**删掉那 152 个 .pack** → 面板与素材立刻全坏

★ 做法：用 git 底层命令，在远端那条提交之上造一个新提交，
  内容是「远端的 162 个文件 + 本地工作区里所有未被忽略的文件」。

  这样：
    · 远端变成 assets + source，素材一个不少
    · 本地工作区**一点不动**（不切分支、不检出那 152 MB 的包）
    · 结束把索引复位，本地仓状态与推之前一致

★ 关键细节：`git add --ignore-removal`
  远端那些 .pack 在本地工作区里并不存在。若用 `git add -A`，
  git 会认为「这些文件被删了」并把删除也暂存进去 → 素材照样丢。
  `--ignore-removal` 只加新文件与改动，不动索引里已有的条目。
"""
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

根 = r"E:\Games\写卡\tavern_helper_template"
仓 = "fkgzs123321/galgame-huoxiazhuan"

tok = None
for ln in open(r"C:\Users\64806\.dsh\.env", encoding="utf-8"):
    if "GITHUB_PERSONAL_ACCESS_TOKEN" in ln:
        tok = ln.split("=", 1)[1].strip()
        break
if not tok:
    print("★ 没读到 token")
    sys.exit(1)

地址 = f"https://{tok}@github.com/{仓}.git"
安全地址 = f"https://github.com/{仓}.git"


def run(*args, **kw):
    # ★ 必须带 "git" 前缀 —— 踩过：漏了它，subprocess 拿 "fetch" 当可执行文件，
    #   报 WinError 2（系统找不到指定的文件），看起来像 git 没装。
    r = subprocess.run(["git", *args], cwd=根, capture_output=True, **kw)
    return r.returncode, r.stdout.decode("utf-8", "replace"), r.stderr.decode("utf-8", "replace")


def 显形(s: str) -> str:
    """把输出里的 token 抹掉，避免写进日志"""
    return s.replace(tok, "***")


print("══ ① 取远端 main ══")
subprocess.run(["git", "config", "core.quotepath", "false"], cwd=根, capture_output=True)
rc, out, err = run("fetch", 地址, "main")
print("  fetch: %s" % ("ok" if rc == 0 else "★ " + 显形(err)[:120]))
rc, out, _ = run("rev-parse", "FETCH_HEAD")
远端 = out.strip()
print("  远端 main = " + 远端[:12])

rc, out, _ = run("ls-tree", "-r", "--name-only", 远端)
远端文件 = [x for x in out.split("\n") if x]
print("  远端有 %d 个文件" % len(远端文件))

print()
print("══ ② 查路径冲突（本地工作区 vs 远端）══")
冲突 = []
for p in 远端文件:
    fp = os.path.join(根, p.replace("/", os.sep))
    if os.path.exists(fp):
        冲突.append(p)
if 冲突:
    print("  ★ 有 %d 个同名文件会被本地覆盖：" % len(冲突))
    for p in 冲突[:20]:
        print("      " + p)
else:
    print("  ✓ 无冲突（远端文件在本地工作区都不存在）")

print()
print("══ ③ 用远端树建索引 ══")
rc, out, err = run("read-tree", 远端)
print("  read-tree: %s" % ("ok" if rc == 0 else "★ " + err[:120]))

print()
print("══ ④ 加入工作区文件（--ignore-removal：不删远端条目）══")
rc, out, err = run("add", "--ignore-removal", ".")
if rc != 0:
    print("  ★ add 失败: " + 显形(err)[:200])
    sys.exit(1)
print("  ok")

rc, out, _ = run("diff", "--cached", "--name-only", "--diff-filter=A")
新增 = [x for x in out.split("\n") if x]
print("  新增 %d 个文件" % len(新增))

rc, out, _ = run("write-tree")
树 = out.strip()
print("  树对象 = " + 树[:12])

# 核对：远端那 162 个文件还在索引里吗
rc, out, _ = run("ls-tree", "-r", "--name-only", 树)
树文件 = set(x for x in out.split("\n") if x)
丢 = [p for p in 远端文件 if p not in 树文件]
print()
print("══ ⑤ 核对素材没丢 ══")
rc, out, _ = run("ls-tree", "-r", "--name-only", 树)
树文件 = set(x for x in out.split("\n") if x)
丢 = [p for p in 远端文件 if p not in 树文件]
if 丢:
    print("  ★★ 有 %d 个远端文件不在新树里：" % len(丢))
    for p in 丢[:10]:
        print("      " + p)
else:
    print("  ✓ 远端 %d 个文件全部保留" % len(远端文件))
print("  新树共 %d 个文件" % len(树文件))

# ★ 顺手查一下 workflow 文件还在不在 —— token 没有 workflow scope，
#   带上任何一个 .github/workflows/* 都会让整个 push 被拒。
wf = [p for p in 树文件 if p.startswith(".github/workflows/")]
if wf:
    print()
    print("  ★★ 新树里还有 %d 个 workflow 文件，推送必被拒：" % len(wf))
    for p in wf:
        print("      " + p)
    print("  （已在 .gitignore 里加了 .github/workflows/，若仍出现说明规则没生效）")
    丢 = 丢 or ["（workflow 未排除）"]

if 丢:
    print()
    print("★★ 中止：宁可没推成，也不能把素材弄丢或撞 scope 限制。")
    run("reset")
    sys.exit(2)

print()
print("══ ⑥ 造提交 ══")
# ★ 这个仓是**独立历史**（远端只有一条 Contents API 造的提交），
#   而本机的 global git 身份没配 —— 直接 commit-tree 会报
#   「Author identity unknown」。这里按仓设一次，不动全局配置。
run("config", "user.name", "fkgzs123321")
run("config", "user.email", "fkgzs123321@users.noreply.github.com")

信息 = """源码入库：所有角色卡与技能

在 CDN 素材之上加入做卡的源码。

素材（152 个 .pack + 索引）保持原位不动 —— 面板与素材 CDN 仍指向同一批文件。
源码包含 27 张卡的 schema、世界书条目、脚本、界面、正则、开场白，
以及 .skills 下的技能文档。

从 Unity 包解出的贴图、以及可重新生成的中间产物不进仓（见 .gitignore），
跑 src/活侠传/_work 下的脚本即可重新解出。"""
rc, out, err = run("commit-tree", 树, "-p", 远端, "-m", 信息)
if rc != 0:
    print("  ★ commit-tree 失败: " + 显形(err)[:200])
    run("reset")
    sys.exit(1)
新提交 = out.strip()
print("  新提交 = " + 新提交[:12])

print()
print("══ ⑦ 推送 ══")
rc, out, err = run("push", 地址, f"{新提交}:refs/heads/main")
print("  " + 显形(out if rc == 0 else err)[:400])

print()
print("══ ⑧ 复位本地索引（工作区不动）══")
run("reset")
rc, out, _ = run("status", "--short")
print("  git status 前 3 行：")
for ln in out.split("\n")[:3]:
    print("    " + ln)

json.dump({"远端旧": 远端, "新提交": 新提交, "远端文件数": len(远端文件),
           "新文件数": len(树文件)},
          open(os.path.join(根, "_work", "_push_result.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print()
print("  已写入 _work/_push_result.json")
print()
print("  CDN 地址（仍可用，素材没动）:")
print("    https://testingcf.jsdelivr.net/gh/%s@%s/" % (仓, 远端[:7]))
print("  新提交:")
print("    https://github.com/%s/tree/%s" % (仓, 新提交[:12]))
