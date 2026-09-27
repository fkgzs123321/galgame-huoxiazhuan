# TavernWeave 完整更新回执 · v1.6.0

- **源仓库**：https://github.com/LiarMTTT/TavernWeave
- **更新版本**：`1.6.0`（作品资料库）
- **权威清单**：`tavernweave-install-manifest.json` → `schemaVersion 2` / `version 1.6.0` / `skillCount 22`
- **执行时间**：2026-09-14
- **执行方式**：官方 `scripts/install-tavernweave.ps1`（Codex 全局）+ 等效安全流程（工作区，因目录名非 `skills` 被官方安装器拒绝）

---

## 一、更新前 vs 更新后

| 项目 | 更新前 | 更新后 |
|---|---|---|
| 官方 Skill 数量 | **9 / 22**（缺 13） | **22 / 22** |
| 已装 Skill 内容 | 全部**过期**（无 `tw-guidance-entry` 共享引导区块，缺 references/scripts/tests 多个文件） | 全部与仓库**逐文件一致**（tree fingerprint 匹配） |
| Host Front Door | **未安装**（`AGENTS.md` = 0 字节） | **已安装**（10414 B，v1.6.0 受控区块） |
| 校验回执 | 无 | 两份均 `PASS` |

### 补齐的 13 个新增 Skill

`activate-tavernweave-soul`、`build-work-library`、`consult-tavernweave-library`、
`orchestrate-project-blueprint`、`reflect-on-vibe-code-growth`、`rewrite-natural-prose`、
`sillytavern-component-update`、`sillytavern-database-rolecards`、`sillytavern-extension-dev`、
`sillytavern-media-live2d-runtime`、`sillytavern-render-regex-pipeline`、
`sillytavern-rolecard-performance`、`sillytavern-rolecard-security`

### 内容刷新的 9 个既有 Skill

`code-quality-workflow`（+2 参考文件）、`rolecard-workshop-ops`、`shadcn-tailwind-ui`、
`sillytavern-api-reference`、`sillytavern-card-components`、`sillytavern-card-pipeline`（+1 参考文件）、
`sillytavern-embedded-ui`、`sillytavern-runtime-debug`、
`tavern-card-builder`（+6 文件，新增创作权威/材料来源链/记忆架构体系）

---

## 二、回执 1 · Codex 全局 `C:\Users\64806\.codex\skills`

```
TavernWeave installation receipt
Status: PASS
Version: 1.6.0
Layout: skills
Target: C:\Users\64806\.codex\skills
Skills: 22/22 matched
Missing skills: none
Drifted skills: none
Missing required paths: none
Manifest version mismatches: none
Unrelated target directories preserved: .system, independent-narrative-app, sillytavern-web, STDB, tavern-cards, tavern-ui
Library: present-and-matched
Library picker: present
Soul: present-and-matched
Host Front Door: current
Host Front Door target: C:\Users\64806\.codex\AGENTS.md
Host rediscovery: required-new-task
引导挡位：unset
INSTALLATION VERIFIED: 22/22
```

## 三、回执 2 · 工作区 `E:\Games\写卡\tavern_helper_template\.skills`

```
TavernWeave installation receipt
Status: PASS
Version: 1.6.0
Layout: skills
Target: E:\Games\写卡\tavern_helper_template\.skills
Skills: 22/22 matched
Missing skills: none
Drifted skills: none
Missing required paths: none
Manifest version mismatches: none
Unrelated target directories preserved: independent-narrative-app, sillytavern-web, STDB, tavern-cards
Library: present-and-matched
Library picker: present
Soul: present-and-matched
Host Front Door: current
Host Front Door target: C:\Users\64806\.codex\AGENTS.md
Host rediscovery: required-new-task
引导挡位：unset
INSTALLATION VERIFIED: 22/22
```

## 四、全局入口回执（Host Front Door）

```
TavernWeave 全局入口检查结果
Host: Codex
Action: install
Target: C:\Users\64806\.codex\AGENTS.md
Status: missing-block -> current
Adapter version: 1.6.0
Changed: True
Backup: C:\Users\64806\.codex\AGENTS.md.tavernweave-backup-20260914T070351Z-361353d7.bak
Rediscovery: new-task-or-restart
引导挡位：尚未选择
```

---

## 五、数量核对

| 位置 | 目录总数 | 官方 Skill | 本地自有（原样保留） |
|---|---|---|---|
| `C:\Users\64806\.codex\skills` | 28 | **22 / 22** | `.system`、`independent-narrative-app`、`sillytavern-web`、`STDB`、`tavern-cards`、`tavern-ui` |
| `E:\Games\写卡\tavern_helper_template\.skills` | 26 | **22 / 22** | `independent-narrative-app`、`sillytavern-web`、`STDB`、`tavern-cards` |

**关键模块**：`Library: present-and-matched` · `Library picker: present` · `Soul: present-and-matched`
（Library 离线挑选页：`skills/consult-tavernweave-library/assets/picker/index.html`）

---

## 六、后续动作

1. **新建任务或重启 Codex**，让宿主重新发现 Skill（安装回执 ≠ 宿主已加载）。
2. **引导挡位未选择**（新人 / 入门 / 熟练 / 老手）——未替你决定，需要时在对话里说一声即可保存。
3. 保留 `_tw_repo/`（源仓库克隆）供后续校验与更新；临时脚本与日志已清理。
4. 需要再次自检时可运行：
   `verify-install.ps1 -PluginRoot _tw_repo -TargetRoot <目标> -Layout skills -AgentHost Codex`
