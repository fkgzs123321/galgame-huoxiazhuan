# 独立端现代化阶段路线图

> 依据：`independent-narrative-app` 的垂直切片原则。
> 每阶段都以“可运行切片”收口：有真实用户动作、可观察结果、保存重开证据。

## 0. 凡人独立端深度对齐（2026-08-10 完成 P0，进行中 P1）

> 蓝图：`docs/dd-architecture-map.md`（14 层架构与 fanren-remake 逐层对照）

### P0 已完成 ✅
- **数据层全量提取 v3**（`scripts/extract-dd-data-v3.mjs`）：
  - 修复空壳：quirks 170 条、diseases 23 条、curios 60 种（含互动表）
  - 新增数据池：effects 1215、camping_skills 64、town_events 51、loot 4 表、encounters 7 区域 45 mash、dungeon_props、raid_ai 165、starting_roster 18、localization_en 10015 条
- **分层目录重构**：`store/`→`stores/`、`engine/`→`gateway/`；新增 `pages/ settings/ dialogs/ prompts/ schemas/ utils/ ui/ workers/ db/`
- **zod 契约层**：`schemas/`（hero/combat/save/quirk/numeric）
- **db 层**：IndexedDB（saves/backups/logs/media）
- **UI 基件**：`ui/`（Button/Panel/StatBar/Tabs/Toggle/Input 等）
- **网关服务**：directorService（开局/周导演）、loreScheduler（世界书选择+Trace）、archiveService（导出/导入/备份）
- **提示词层**：presetAssembler（Assembly Plan+预算裁剪）、director/combat/summary prompt
- **页面路由化**（react-router + HashRouter）：Settings / LogCenter / LLMDebug / SaveManager / Worldbook / Bestiary 六页
- **设置面板**：Ai/Combat/Dungeon/Narrative/Save/Appearance/ContentMode/Worldbook/Diagnostic
- **对话框**：AppDialog 基件 + ConfirmDialog
- **Worker**：saveArchive.worker（压缩/校验/校验和，含主线程降级）
- **行为测试**：16/16 通过（kernel 9 + contracts 7）

## Stage 1：统一 Command 与存档恢复（已完成）

目标：让至少一条正式状态变化走完整权威链。

- 建立 Command/Kernel：`commandId`、`expectedRevision`、fingerprint、幂等收据、CAS 写入。
- 建立统一存档：snapshot、schemaVersion、revision、command receipts、校验和、备份读档。
- 首个命令：`dd.recruitHero`，覆盖金币扣减、名册新增、驿站列表移除。
- 启动读档与手动保存/读档入口。
- 验收：招募命令提交一次；金币不足/名册满被拒绝；保存重开状态一致；重复 commandId 返回原收据。

产物：
- `src/gateway/kernel/`
- `src/stores/kernelStore.ts`
- `src/components/KernelStatusPanel.tsx`
- `tests/kernel.test.ts`

## Stage 2：内容包与正式状态收编

目标：把“游戏事实”与“界面临时状态”分开，建立内容身份。

- 定义 `content-pack.json`：`packageId`、版本、作者、来源、许可、依赖。
- 登记正式字段生命周期：owner、默认值、保存、迁移、失效。
- 迁移现有 Zustand persist 到统一 Save Contract。
- 收编金币/名册/任务/背包等高频变更到命令注册表。
- 验收：旧档可迁移，新档可读回；正式字段无第二真源。

## Stage 3：会话、历史与玩法联动

目标：为长期 RP 建立可追溯的正式回合。

- 引入会话与回合记录：revision 化正文、事件、状态 diff。
- 地牢/战斗/周推进改为 Command 提交。
- 增加 UI Projection：正式状态只读，草稿/流式/候选分层显示。
- 验收：跨阶段动作可回溯，重开不倒退。

## Stage 4：Prompt、Lore、Memory 与 Output Contract

目标：把 AI 叙事从“临时拼 Prompt”升级为可装配、可预算、可追踪的运行时。

- Prompt Assembly Plan：模块、role、Marker、预算、裁剪、Trace。
- Lore Runtime：世界书选择、命中、去重、预算、Trace。
- Memory/History：只消费已提交事实，摘要可按 revision 重建。
- Output Contract：完整响应校验、截断检测、Candidate 解码、降级链。
- 验收：真实模型一回合可复现，失败不污染正式状态。

## Stage 5：设置、平台与内容模式

目标：补齐底层设置域与平台能力。

- 总设置、模型/API、Prompt/预设、世界书、存档、正文、隐私、诊断。
- Platform Port：存储、密钥、文件、网络、离线、资源生命周期。
- SFW/NSFW 真实隔离矩阵（当前仅 SFW）。
- 验收：设置重开生效；断网读档；模式关闭无泄漏。

## Stage 6：行为规格、Trace 与发布

目标：把“能跑”升级为“可验证交付”。

- Behavior Spec 与回归夹具：正常/拒绝/越权/保存重开/模式切换。
- Integration Trace：commandId → revision → Save ACK → Projection。
- 发布门：干净环境安装、包哈希、旧档、回滚、已知限制。
- 验收：证据等级逐项标注，不把 build 通过当功能完成。

## 当前完成状态

- [x] 对齐 P0：数据全量提取 / 目录分层 / zod 契约 / db 层 / UI 基件 / 网关服务 / 提示词层 / 页面路由 / 设置面板 / 对话框 / Worker / 行为测试
- [x] Stage 1 文档与首个垂直切片（见 `docs/skill-gap-audit.md`）
- [ ] 对齐 P1：设置面板补全（45→目标 20 面板）、内容包契约、存档迁移收编
- [ ] Stage 2 内容包与状态收编
- [ ] Stage 3 会话、历史与玩法联动
- [ ] Stage 4 Prompt、Lore、Memory 与 Output Contract（已有：assemblePlan/loreScheduler/导演服务雏形）
- [ ] Stage 5 设置、平台与内容模式
- [ ] Stage 6 行为规格、Trace 与发布

## Stage 1 验证证据

- `npm test`：16 个用例全部通过（kernel 9 + contracts 7，覆盖招募提交、幂等、协议冲突、CAS、备份恢复、损坏保留、导入导出、zod 存档校验、组装预算裁剪、站位解析）。
- `npm run build`：TypeScript 与 Vite 构建通过（122 模块）。
- `npm run lint`：通过，0 错误（28 条既有警告）。
- 浏览器冒烟：启动开发服务器后，档案面板显示初始存档与 `atomic-readback-ack`；导入含金币存档后点击招募，修订从 0 到 1、命令数到 1、金币正确扣减；刷新页面后读档恢复修订 1 与队伍状态。
