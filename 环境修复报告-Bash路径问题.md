# Bash 环境故障诊断与修复报告

- **日期**：2026-09-14
- **症状**：Bash 里 `ls` / `head` / `find` / `grep` / `cat` / `dirname` 全部 command not found
- **结论**：**不是 coreutils 缺失，而是 WorkBuddy 注入的 PATH 少了 MSYS 的 `/usr/bin`**；由 WorkBuddy 侧更新引入，与本次任何仓库更新无关
- **状态**：✅ 已修复（需重启 WorkBuddy 生效）

---

## 一、症状

```
$ ls
bash: line 1: ls: command not found

$ cat >> file      # ← 危险：静默失败，却返回 exit 0
```

每条 bash 命令都附带两行噪音：
```
shell-runtime-bash-env.sh: line 3: dirname: command not found
shell-runtime-bash-env.sh: line 3: cd: null directory
```
`npm` 报 `/usr/bin/env: 'bash': No such file or directory`。

## 二、根因

| 检查项 | 结果 |
|---|---|
| `…/PortableGit/versions/1.2.0/usr/bin` 是否存在 | ✅ 存在，**358 个文件齐全**（ls / cat / head / dirname / grep / find / bash 全在） |
| bash 用的是哪个 | `…/.workbuddy/binaries/PortableGit/versions/1.2.0/bin/bash.exe`（WorkBuddy 自带 PortableGit） |
| 注入 PATH 里有没有该 `usr/bin` | ❌ **没有** |
| 手动补上 `usr/bin` 后 | ✅ `ls` / `cat` / `grep` / `find` / `head` / `dirname` **全部立即恢复** |

**机制**：WorkBuddy 构造 bash 的 PATH 时 = 用户 PATH + 系统 PATH + 它自己两项，
**唯独漏了它自己那份 PortableGit 的 `usr/bin`**。于是 bash 起来没有 coreutils；
而 `BASH_ENV` 指向的 `shell-runtime-bash-env.sh` 第 3 行就要用 `dirname`，所以每条命令都吐那两行错（纯噪音，非致命）。

## 三、时间线：是不是"更新导致的"

| 时间 | 事件 |
|---|---|
| 2026-08-07 ~ 08-12 | 记忆日志显示 bash 工作正常（大量 `ls`/`head`/`grep`/管道） |
| 2026-08-13 | `PortableGit` 根目录 mtime |
| **2026-08-31 03:25** | **`versions/1.2.0` + `.extracted` 被重新解压** ← 回归起点 |
| 2026-09-11 | WorkBuddy `safe-bin` shim 更新 |
| 2026-09-14 | 本次会话第一条命令即为坏的（早于本日所有改动） |

**结论：是 WorkBuddy 侧的运行时更新（重新解压 PortableGit / 调整 PATH 注入）导致的回归。**
今天安装 TavernWeave / tavern-cards / agent-foundry-vault / tavern-tanuki 这些操作只动了 skill 文件、MCP 配置和酒馆 settings.json，**从未触碰 PATH 或 shell**；且本次会话一开始就是坏的。

## 四、修复内容

### 1. 建稳定 junction（抗版本升级）

```
C:\Users\64806\.workbuddy\binaries\PortableGit\usr-bin
        └──(junction)→ versions\1.2.0\usr\bin
```
用 PowerShell `New-Item -ItemType Junction`（PS 5.1 原生，不需要 cmd / mklink）。
将来 PortableGit 升级到 1.3.0，只需重指 junction，**PATH 不用改**。

### 2. 追加进用户级 PATH

```
[Environment]::SetEnvironmentVariable('Path', <原值 + 该 junction>, 'User')
```

追加前后用户 PATH 对比：

```
修复前：
  C:\Users\64806\AppData\Local\pnpm\bin
  C:\Users\64806\AppData\Local\Microsoft\WindowsApps
  C:\Users\64806\AppData\Roaming\npm
  C:\Users\64806\.lmstudio\bin
  %USERPROFILE%\AppData\Local\Microsoft\WindowsApps

修复后（+1 条）：
  …
  C:\Users\64806\.workbuddy\binaries\PortableGit\usr-bin   ← 新增（追加在末尾）
```

### 3. 验证

```
$ PATH="<junction>:$PATH" command -v dirname
/c/Users/64806/.workbuddy/binaries/PortableGit/usr-bin/dirname
$ ls -d /e/Games           → /e/Games
$ cat --version            → cat (GNU coreutils) 8.32
$ find --version           → find (GNU findutils) 4.10.0
```

## 五、副作用 / 注意

- Git 版 `find`、`sort` 等会优先于 Windows 同名命令 —— 影响极小（现在的脚本几乎不用 Windows 的 `find`），且**完全可逆**
- **必须重启 WorkBuddy** 才生效：当前进程的环境快照是启动时固定的，新 PATH 只对新进程有效
- 这是 **WorkBuddy 的 bug**（自带的 bundled bash 没把它自己的 `usr/bin` 放进 PATH），建议顺手向官方反馈

## 六、回滚

备份文件：`E:\Games\写卡\tavern_helper_template\_env_userpath_backup_20260914154717.txt`

回滚两步：
```powershell
# 1) 还原用户 PATH 原文（从上面备份文件读取）
[Environment]::SetEnvironmentVariable('Path', (Get-Content '备份文件路径' -Raw).Trim(), 'User')
# 2) 删掉 junction
Remove-Item -LiteralPath 'C:\Users\64806\.workbuddy\binaries\PortableGit\usr-bin' -Force
```
