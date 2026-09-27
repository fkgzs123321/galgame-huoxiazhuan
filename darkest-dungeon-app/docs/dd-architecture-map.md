# 暗黑地牢独立端 —— 架构地图与对齐蓝图

> 参考：`fanren-remake/ARCHITECTURE-MAP.md`（凡人修仙传独立端构建产物镜像反推的源码级模块地图，515 文件 / 14 层）。
> 目标：让 `darkest-dungeon-app` 在**架构深度**上完全对齐凡人独立端 —— 同样的分层、同样的模块密度、同样的"内容/执行/验证"分离。
> 数据源：`E:\SteamLibrary\steamapps\common\DarkestDungeon`（暗黑地牢加强无敌版，原版数据 + 500+ DLC 模组）。

## 0. 统计总览（目标 vs 现状）

| 分层 | 凡人独立端 | DD 目标 | DD 当前 (2026-08-10) | 对齐动作 |
|---|---|---|---|---|
| entry | 2（引导壳+主入口） | 2 | 1（vite index.html） | 移植引导壳（看门狗/降级） |
| pages | 29 | 24 | 12 | 路由化 + 新增页 |
| settings | 45 | 20 | 16 面板（14 tab） | 模块化拆分 |
| dialogs | 29 | 15 | 6（AppDialog/Confirm/Recruit/QuestAccept/TrinketEquip+StressCheck） | 对话框基件 + 业务弹窗 |
| components | 19 | 20 | 25 | 对齐命名 |
| stores | 16 | 16 | 17 | 补 config/log/worldbook/timeline |
| gateway | 12 | 10 | 11 | engine 迁入 + 服务化 |
| prompts | 9 | 6 | 6 | 提示词组装层 |
| schemas | 4 | 5 | 5 | zod 契约层 |
| data | 38 | 24 | 23（dd-db） | 全量提取修复 |
| utils | 99 | 20 | 9 文件 | 工具函数层 |
| ui | 187 | 24 | 5 文件（24+ 基件） | 组件化基件 |
| workers | 1 | 1 | 1 | 存档压缩 worker |
| db | 1 | 1 | 1（IndexedDB） | 数据层 |

## 1. 入口与引导（entry）

| 模块 | 功能 |
|---|---|
| index.html | 引导壳：加载失败看门狗、资产降级、版本标记 |
| main.tsx | React 入口 + 路由系统（react-router）+ 数据预载（heroes/monsters/trinkets/quirks/effects） |

## 2. 页面层（pages · 24）

| 模块 | 对应凡人 | 功能摘要 |
|---|---|---|
| TownPage | GameDashboard | 庄园主城：资源栏/建筑导航/名册/出发冒险 |
| RosterPage | CharacterPage | 英雄名册：列表 + 详情 + 排序/筛选（自定义列） |
| QuestBoardPage | TaskPage | 任务公告板：接取/放弃/周刷新 |
| DungeonPage | CavePage | 地牢探索：地图节点/走廊事件/好奇物/火把 |
| CombatPage | BattlePanel | 站位战斗：技能/站位/暴击/压力 |
| CampPage | - | 扎营：扎营技能/篝火/守夜 |
| TrinketPage | WorkshopPage | 饰品背包：装备/卸下/出售 |
| DistrictsPage | - | 区域建筑（DLC 饰区） |
| BuildingPage | - | 城镇建筑面板（教堂/酒馆/铁匠/公会/疗养院/马车/野营车） |
| WeekPage | TimelinePage | 周推进：事件/刷怪/马车来客/镇内事件 |
| SettingsPage | SettingsPage | 设置总页（挂载全部 settings 面板） |
| LogCenterPage | LogCenterPage | 日志中心：事件日志/错误/诊断导出 |
| LLMDebugPage | LLMDebugPage | LLM 调试台：Prompt/Lore/响应 Trace |
| SaveManagerPage | ArchivePage | 存档管理：导出/导入/备份/迁移 |
| WorldbookPage | WorldbookManagerPage | 世界书管理：条目 CRUD/注入预览 |
| BestiaryPage | BeastPage | 怪物图鉴：全怪物数据/掉落/技能 |
| TimelinePage | TimelinePage | 编年史：每周大事记录 |
| SummaryPage | SummaryOverviewPage | 摘要概览：战役总结/英雄履历 |
| PlotEvolutionPage | PlotEvolutionPage | 剧情演化：预设选择/手动生成 |
| BehaviorPage | CharacterBehaviorAnalysisSettings | 英雄行为分析（AI 行为画像） |
| CanonPage | OriginalCanonGuidancePage | 原著指导：DD 世界观背景知识库 |
| ArenaPage | ArenaPage | 斗技场（Butcher's Circus 单机版） |
| FarmsteadPage | - | 农场无尽模式（Color of Madness） |
| CrimsonPage | - | 猩红庭院（Crimson Court 主线） |

## 3. 设置面板（settings · 20）

| 模块 | 功能摘要 |
|---|---|
| AiSettings | 模型接口/流式/取消/超时/重试 |
| CombatSettings | 战斗结算规则开关（暴击/压力/死亡之门） |
| NarrativeSettings | 叙事风格/视角/文风 |
| PromptSettings | 提示词组装：模块/顺序/预算 |
| WorldbookSettings | 世界书选择/注入预算 |
| MemorySettings | 记忆/摘要/历史轮数 |
| SaveSettings | 自动存档/备份/迁移策略 |
| AppearanceSettings | 主题/语言/字号 |
| SoundSettings | 音效/BGM/通知音 |
| ImageSettings | 生图接口（英雄肖像） |
| TtsSettings | 正文朗读 |
| NotificationSettings | 通知开关 |
| ContentModeSettings | SFW/NSFW 隔离矩阵 |
| DifficultySettings | 难度档位 |
| DungeonSettings | 地牢生成规则（火把/遭遇概率） |
| QuirkSettings | 怪癖规则 |
| DlcSettings | DLC/模组开关 |
| RuntimePromptSettings | 运行时提示词（吐槽/旁白） |
| DefaultResetPanel | 恢复默认 |
| DiagnosticSettings | 诊断包导出/日志级别 |

## 4. 对话框（dialogs · 15）

| 模块 | 功能摘要 |
|---|---|
| AppDialog | 通用模态基件（遮罩/标题/关闭/ESC） |
| ConfirmDialog | 确认框（危险操作） |
| StressCheckDialog | 压力事件结算（崩溃/美德） |
| RecruitDialog | 马车招募英雄 |
| TrinketEquipDialog | 饰品装备/卸下 |
| CampSkillDialog | 扎营技能选择 |
| CurioDialog | 好奇物互动结果 |
| QuestAcceptDialog | 任务接取确认 |
| WeekRewardDialog | 周奖励/任务回报 |
| DeathDialog | 英雄死亡/永久失去 |
| ResolveUpDialog | 抗压等级晋升 |
| QuirkDialog | 怪癖获得/锁定/移除 |
| WorldbookEntryDialog | 世界书条目编辑 |
| PromptEditorDialog | 提示词编辑 |
| SaveExportDialog | 存档导出/导入 |

## 5. 业务组件（components · 20）

对齐现有 24 组件为凡人式命名：StatusBar / TownHeader / HeroRoster / HeroPanel / BuildingPanel(+buildings/*) / Combat / BattleSetup / Dungeon / DungeonDispatch / QuestBoard / TrinketInventory / DistrictsPanel / CampScreen / WeekTransition / ModManager / KernelStatusPanel / StressCheckModal / AiSettingsModal + 新增 PlayerPane(庄园面板) / QuickActionsPane(快捷动作) / CharacterAvatar(英雄头像) / SpiritWallet(金币钱包) / ErrorBanner / LoadingFallback。

## 6. 状态库（stores · 16）

现有 14：gameStore / townStore / combatStore / dungeonStore / inventoryStore / questStore / weekStore / stressStore / narrativeStore / aiStore / kernelStore / modStore / kernelIntegration。
新增 3：**configStore**（设置持久化）/ **logStore**（日志中心）/ **worldbookStore**（世界书）。
（+ toastStore 并入 ui 基件层。）

## 7. 网关层（gateway · 10）

| 模块 | 对应凡人 | 功能 |
|---|---|---|
| aiGateway | api | 模型 API：SSE 流式/取消/超时/错误归一（现有，迁入） |
| directorService | directorService | 剧情导演：开局叙事/每周导演裁定 |
| combatEngine | service(Battle) | 战斗结算引擎（现有，迁入） |
| dungeonGenerator | - | 地牢生成（现有，迁入） |
| loreScheduler | loreScheduler | 世界书条目调度与注入 |
| archiveService | archiveZipTransfer | 存档导出/导入/备份/迁移 |
| questGenerator | - | 任务生成（现有，迁入） |
| modLoader | - | 模组加载（现有，迁入） |
| imageService | avatarService | 肖像生图 |
| ttsService | - | 正文 TTS |

## 8. 预设与提示词（prompts · 6）

| 模块 | 功能 |
|---|---|
| narrativePrompt | 叙事主提示词（世界/庄园/队伍事实组装） |
| combatPrompt | 战斗裁定提示词（站位/技能/数值规则） |
| directorPrompt | 导演提示词（开局/周事件/裁定） |
| summaryPrompt | 摘要提示词 |
| worldbookPrompt | 世界书条目格式契约 |
| presetAssembler | 预设组装器（模块/顺序/预算/Trace） |

## 9. 数据契约（schemas · 5）

| 模块 | 功能 |
|---|---|
| heroSchemas | 英雄数据/实例契约（zod） |
| combatSchemas | 战斗/技能/效果契约 |
| saveSchemas | 存档快照/迁移契约 |
| quirkSchemas | 怪癖/疾病契约 |
| numericSchemas + coerce | 数值字段归一（百分比/范围） |

## 10. 数据池（data · 24，dd-db）

| 模块 | 状态 | 内容 |
|---|---|---|
| heroes.json | ✅ 已有 | 15 英雄 × 武器/护甲/技能/扎营/抗性 |
| monsters.json | ✅ 已有 | 500+ 怪物变体 |
| trinkets.json | ✅ 已有 | 饰品条目/稀有度 |
| quirks.json | 🔧 修复 | 怪癖库（shared/quirk/quirk_library.json，含疾病标记） |
| diseases.json | 🔧 修复 | 疾病（is_disease 过滤 + trait_library） |
| curios.json | 🔧 修复 | 好奇物互动表（分节 CSV 解析） |
| provisions.json | ✅ 已有 | 补给品 |
| buildings.json | ✅ 已有 | 城镇建筑 |
| districts.json | ✅ 已有 | 区域建筑 |
| quests.json | ✅ 已有 | 任务类型/生成/退出惩罚 |
| effects.json | 🆕 新增 | 效果定义（base/mode/dd_effects） |
| camping_skills.json | 🆕 新增 | 扎营技能 |
| town_events.json | 🆕 新增 | 城镇事件 |
| loot.json | 🆕 新增 | 战利品表 |
| encounters.json | 🆕 新增 | 遭遇表（mash: hall/room/boss/stall） |
| dungeon_props.json | 🆕 新增 | 地牢道具概率（好奇物/陷阱/障碍） |
| raid_ai.json | 🆕 新增 | 怪物 AI 脑 |
| starting_roster.json | 🆕 新增 | 初始名册 |
| localization_en.json | 🆕 新增 | 英文文本表（string_table.xml 全集） |
| world_lore.json | 🆕 新增 | DD 世界观知识（原著指导数据池） |
| hero_profiles.json | 🆕 新增 | 英雄人物志（NPC 画像） |
| prompt_presets.json | 🆕 新增 | 预设池 |
| dungeon_mappings.json | 🔧 修复 | 地牢类型/房间模板 |
| index.json | 🔄 更新 | 生成索引 |

## 11. 工具函数（utils · 20）

format（伤害范围/百分比/金币）/ roll（骰子/概率/临界）/ id（稳定ID生成）/ chance（概率判定）/ targetPos（站位解析 launch/target 位掩码）/ buffApply（效果数值映射）/ validate / parse（.darkest 行解析器运行时版）/ migrate（存档迁移）/ time（游戏内时间）/ clamp / unique / deepMerge / shuffle / weightedPick / trace（Trace 记录）/ log / throttle / debounce / csv。

## 12. UI 基件（ui · 24）

Button（dd-btn 族）/ Panel / PanelHeader / Modal / Tooltip / Tabs / StatBar（HP/压力条）/ StatGrid / StatField / ValueChange（红涨绿跌）/ Badge / Divider / SectionTitle / EmptyState / LoadingSpinner / FlickerText（闪烁标题）/ Input / Select / Slider / Toggle / NumberInput / IconButton / Toast / ProgressRing。

## 13. 对齐路线（P0 → P2）

### P0 基础设施（本阶段）
1. **全量数据提取 v3**：修复 quirks/diseases/curios 空壳；新增 effects/camping/town_events/loot/encounters/props/raid_ai/starting_roster/localization_en。
2. **分层目录重构**：src 建立 pages/settings/dialogs/gateway/prompts/schemas/utils/ui/workers/db；store→stores、engine→gateway 迁入并改引用。
3. **zod 契约层**：hero/combat/save/quirk/numeric schemas。
4. **db 层**：IndexedDB 存档（快照/备份/列表），对接 kernel saveManager。
5. **UI 基件**：24 个 dd 主题基件。

### P1 高价值功能
1. **设置面板模块化**：SettingsPage + 16 面板（含 configStore 持久化）✅
2. **网关服务**：directorService（开局叙事+周导演）、loreScheduler（世界书注入）、archiveService（导出/导入/备份）✅
3. **提示词层**：presetAssembler + 6 个提示词模块，支持 Trace ✅
4. **页面路由化**：react-router，12 页 ✅（Settings/LogCenter/LLMDebug/SaveManager/Worldbook/Bestiary/Arena/Farmstead/Timeline/Summary/Canon/Plot）
5. **日志中心 + LLM 调试台**：事件记录、Prompt/Lore/响应 Trace 可视化 ✅

### 玩法联动（2026-08-10 完成）
- **周导演进周循环**：周结算后自动生成剧情事件（AI 导演或程序化），写入编年史 + 通知 + TTS 播报（`gateway/weekDirector.ts`）
- **世界书进叙事**：`requestNarrative` 自动注入命中条目（loreScheduler + 预算裁剪 + Trace）
- **斗技场/农场复用战斗**：combatStore standalone 模式，独立页接管战斗结束（不 setPhase）
- **编年史自动记录**：周推进/斗技场/农场结算自动写入时间线

### P2 生态级（待做）
- 猩红庭院主线页（CrimsonPage）、肖像生图接入英雄面板、存档 zip 传输（Worker 已就绪）
- 编年史导出/分享、多存档槽位

## 14. 命名规范（对齐后统一）

| 目录 | 规范 | 示例 |
|---|---|---|
| pages | `XxxPage.tsx`，路由级 | `LogCenterPage` |
| settings | `XxxSettings.tsx` 设置子模块 | `CombatSettings` |
| dialogs | `XxxDialog.tsx` | `TrinketEquipDialog` |
| components | 业务组件 PascalCase | `HeroRoster` |
| stores | `xxxStore.ts`（camelCase + Store） | `configStore` |
| gateway | `xxxService.ts` / 引擎 | `directorService` |
| prompts | `xxxPrompt.ts` / `presetXxx.ts` | `narrativePrompt` |
| schemas | `xxxSchemas.ts` | `combatSchemas` |
| data | 语义名 | `quirks.json` |
| utils | 语义名 | `roll.ts` |
| ui | 基件 PascalCase | `StatBar` |
| workers | `xxx.worker.ts` | `saveArchive.worker` |
| db | `index.ts` 单入口 | `db/index.ts` |

---

*生成时间：2026-08-10 · 依据 fanren-remake 14 层架构与 DD 加强无敌版数据源。*
