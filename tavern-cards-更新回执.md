# tavern-cards 更新回执

- **源仓库**：https://github.com/ai4rpg/tavern-cards
- **版本锚点**：commit `f2b0238`（2026-08-27 17:17）— `fix(cards-composition): differentiate palettes, clear scan reports before rescan, keep entry body in files, and round-trip character metadata`
- **执行时间**：2026-09-14
- **执行范围**：两个安装位置 + 子代理（按你的选择）

---

## 一、更新前 vs 更新后

| 项目 | 更新前 | 更新后 |
|---|---|---|
| `tavern-cards` | 旧版（65 文件，仍含已废弃的 in-skill `agents/`、`references/conversion/`、`scripts/validate-conversion-outline.mjs`） | **55 文件**（新结构，逐字节与仓库一致） |
| `tavern-design` | **未安装** | **11 文件**（新增） |
| `tavern-ui` | 旧版（4 文件，缺 2 个参考文件） | **6 文件**（+`interactive-opening-form.md` +`mvu-variables.md`） |
| 子代理 `~/.codex/agents/` | **完全不存在** | **4 个 TOML** |
| 工作区 `.skills/tavern-cards` | ⚠️ 整个仓库克隆（含 `.git`，140 文件），顶层无 `SKILL.md` → **宿主根本不加载** | 已重构为 3 个独立 Skill 目录 |

### 新版结构变化（本次更新的关键）

- **子代理从 skill 内部上移到仓库根 `agents/`**（旧版在 `tavern-cards/agents/`）
- **拆出新 skill `tavern-design`**：把 `references/conversion/` 与 `scripts/validate-conversion-outline.mjs` 迁过去
- 因此更新后 `tavern-cards/` 里**不再有** `agents/`、`references/conversion/`、`validate-conversion-outline.mjs`（已随旧目录整体归档，不会残留）

---

## 二、校验结果

### 三个 Skill 逐文件比对（仓库 vs 已安装）

```
### Codex 全局: C:\Users\64806\.codex\skills
  tavern-cards :  本地55 仓库55 | 同55 异0 缺0 多0 → ✅ 一致
  tavern-design:  本地11 仓库11 | 同11 异0 缺0 多0 → ✅ 一致
  tavern-ui    :  本地 6 仓库 6 | 同 6 异0 缺0 多0 → ✅ 一致

### 工作区 .skills: E:\Games\写卡\tavern_helper_template\.skills
  tavern-cards :  本地55 仓库55 | 同55 异0 缺0 多0 → ✅ 一致
  tavern-design:  本地11 仓库11 | 同11 异0 缺0 多0 → ✅ 一致
  tavern-ui    :  本地 6 仓库 6 | 同 6 异0 缺0 多0 → ✅ 一致
```

### CLI 冒烟测试（仓库安装自检第 5 项）

```
✅ C:\Users\64806\.codex\skills\tavern-cards\scripts\tavern-cards-forge.mjs → Usage: tavern-cards-forge [options] [command]
✅ E:\Games\写卡\tavern_helper_template\.skills\tavern-cards\scripts\tavern-cards-forge.mjs → Usage: tavern-cards-forge [options] [command]
```

### 子代理（Codex TOML 格式）

```
C:\Users\64806\.codex\agents\
  check-agent.toml           （禁词扫描）
  conversion-agent.toml      （材料转化 / 大纲提取）
  first-message-agent.toml   （叙事式开场白）
  schema-agent.toml          （MVU 变量结构 schema.ts）
```

每个 TOML 均含 Codex 要求的 `name` / `description` / `developer_instructions` 三字段；正文用 TOML 字面多行串 `'''`，无转义损耗。

---

## 三、数量核对

| 位置 | 目录总数 | TavernWeave | tavern-cards 系 | 其他自有（保留） |
|---|---|---|---|---|
| `C:\Users\64806\.codex\skills` | **29** | 22 / 22 ✅ | 3 / 3 ✅ | `.system`、`STDB`、`independent-narrative-app`、`sillytavern-web` |
| `E:\Games\写卡\tavern_helper_template\.skills` | **28** | 22 / 22 ✅ | 3 / 3 ✅ | `STDB`、`independent-narrative-app`、`sillytavern-web` |
| `C:\Users\64806\.codex\agents` | **4** | — | 4 个子代理 TOML | — |

**残留临时目录：0**（两个 skills 根均干净）

---

## 四、保留的源与备份

| 路径 | 内容 | 用途 |
|---|---|---|
| `_tc_repo/` | tavern-cards 仓库克隆（77 文件） | 后续校验 / 更新 |
| `_tc_backup/tavern-cards-old-clone/` | 你原先放在 `.skills/tavern-cards` 的整个仓库克隆（70 文件，含 `.git`） | 暂存未删，确认无误后可自行清理 |
| `C:\Users\64806\.codex\.tc-backup\` | 旧版 `tavern-cards`(65) + `tavern-ui`(4) | 回滚用 |
| `_tw_repo/` | 上一轮 TavernWeave 仓库克隆 | 同上 |

已清理：全部临时脚本与日志、`_tc_swap` 暂存区。

---

## 五、未改动 / 待你决定

1. **工作区 `.cardrc.json` 未覆盖** —— 它是你自己的配置（含 `欲望都市` / `怨妇救赎` / `霍格沃茨` 三个项目条目 + 自定义 `default_strategy_thresholds.阶段指导 = Infinity` 与 `default_type_lists.depth` 顺序）。对比后确认**仓库版没有你缺失的新键**，所以无需合并。
2. **写卡工作区**：`E:\Games\写卡\tavern_helper_template\.cardrc.json` 已存在，无需再复制。
3. **重启 / 新建会话**：让宿主重新发现这 3 个 Skill 与 4 个子代理。
4. 子代理模型优化（可选）：仓库支持给机械任务（`check-agent`、`conversion-agent`）配更廉价的模型与中等推理力度，需要的话我可以给 TOML 加 `model` / `model_reasoning_effort` 字段。
