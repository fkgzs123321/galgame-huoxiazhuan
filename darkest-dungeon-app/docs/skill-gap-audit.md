# 对照独立端 Skill 的缺口清单

> 依据：`.skills/independent-narrative-app/SKILL.md`（v0.3.1）及其 references。
> 范围：`darkest-dungeon-app` 当前代码与文档。
> 结论分级：已满足 / 部分满足 / 缺口。

## 1. 最小宿主十三项能力

| # | 能力 | 当前状态 | 现状与证据 | 主要缺口 | 建议阶段 |
|---|---|---|---|---|---|
| 1 | 内容版本与作品身份 | 部分满足 | `docs/` 有草案与完整设计；`dd-db/index.json` 记录生成时间 | 没有内容包契约、稳定 `packageId`、作者/来源/许可边界 | Stage 2 |
| 2 | 角色、Persona、场景、世界书、预设和资源归属 | 部分满足 | 英雄/怪物/饰品 JSON 与 `public/dd-assets/manifest.json` 存在 | 没有内容包目录；资源无来源/许可/哈希；无世界书与预设概念 | Stage 2 |
| 3 | 玩家输入、UI Command 与只读 Projection | 缺口 | UI 直接读写 Zustand store，见 `src/store/townStore.ts` | 无 `commandId`、`expectedRevision`、只读 Projection | Stage 1 |
| 4 | 消息、会话和回合生命周期 | 部分满足 | 游戏阶段机（town/dungeon/battle/week）与叙事队列存在 | 无会话模型、无正式回合记录 | Stage 3 |
| 5 | 正式状态、规则、revision 和事务 | 缺口 | 多 store 各自 `set`，无统一提交入口 | 无 Kernel、CAS、原子提交、幂等收据 | Stage 1 |
| 6 | 模型接入、流式、取消和错误 | 部分满足 | `aiGateway.ts` 支持 OpenAI/Anthropic、SSE、取消、超时、错误归一 | 无 attemptId、无重试策略、无能力探测 | Stage 4 |
| 7 | Prompt/Preset、消息链和预算 | 部分满足 | `narrative.ts` 从事实清单组装 Prompt | 无 Assembly Plan、预算、Trace、Profile 体系 | Stage 4 |
| 8 | Lore/World Info 选择与注入 | 缺口 | 无世界书运行时 | 无选择管线、命中 Trace、预算 | Stage 4 |
| 9 | History、Memory、摘要和认知隔离 | 缺口 | 只有战斗/地牢日志，无正式历史与 Memory | 无 revision 化历史、摘要、认知作用域 | Stage 4 |
| 10 | Output Contract、候选变化和解码 | 缺口 | AI 文本直接 `trim()` 后进日志 | 无完整响应校验、截断检测、Candidate 解码 | Stage 4 |
| 11 | 保存、读取、迁移和恢复 | 部分满足 | Zustand persist 使用 localStorage；`gameStore` 有 v2 迁移 | 无统一存档契约、CAS/ACK、备份、损坏恢复、IndexedDB | Stage 1 |
| 12 | 平台、文件、资源、安全与隐私 | 部分满足 | Web 宿主 + Vite；API 配置存 localStorage | 无 Platform Port、资源生命周期、信任边界、离线方案 | Stage 5 |
| 13 | 行为测试、Trace、诊断和发布证据 | 缺口 | 只有 lint/build；无测试命令 | 无行为案例、集成 Trace、发布验收 | Stage 6 |

## 2. 全局铁律对照

| 铁律 | 当前状态 | 说明 |
|---|---|---|
| 铁律 0 先问清再动工 | 已满足 | 已有 `project-profile-and-draft.md` 与 `complete-design.md` |
| 铁律 1/2/3 单决定单元、分层决定权、不知道分流 | 部分满足 | 草案记录确认项，但没有持续更新的讨论文档与 Artifact Index |
| 铁律 4 讨论留痕、结论有状态 | 部分满足 | 草案有状态表；未按决定单元持续追加 |
| 铁律 5 系统与正式字段闭合生命周期 | 缺口 | 字段无 owner/默认值/失效/迁移登记 |
| 铁律 6 正式事实、运行过程、派生视图分离 | 缺口 | 无四态分离与统一提交链 |
| 铁律 7 内容、执行与验证分离 | 部分满足 | AI 不参与数值判定；但无验证证据分层 |
| 铁律 8 兼容保留来源 | 部分满足 | DD 数据已提取；资源来源/哈希未登记 |
| 铁律 9 实施交付可运行结果并分级 | 部分满足 | 已有可运行原型；无切片问题清单 |
| 铁律 10 验证等级诚实 | 缺口 | 无测试，未声明验证等级 |
| 铁律 11 产物与变化版本化 | 部分满足 | 存档 schema 有 v2；无内容包/契约版本矩阵 |
| 铁律 12 按风险分级保护改动 | 缺口 | app 目录未纳入 git 跟踪，无回滚基线 |

## 3. 当前首要切入点

按 `bridge-existing-app-audit-and-modernization.md`，本项目属于“已有独立应用改造”，应先补行为证据，再逐段收回状态与持久化权。

第一垂直切片选择：**驿站招募英雄**。

- 用户动作：城镇驿站点击招募。
- 权威链：`Command(dd.recruitHero) → 校验 → 候选状态 → Save CAS/ACK → 发布 revision → Projection 刷新`。
- 保存：统一存档快照（revision、收据、校验和、备份）。
- 恢复：启动时读档，关闭重开后状态一致。

