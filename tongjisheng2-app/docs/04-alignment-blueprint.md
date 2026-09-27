# 同级生2 独立端 × 凡人修仙传独立端 · 对齐蓝图

> 生成时间:2026-08-10 · **P0 基础设施已于 2026-08-10 完成并验收通过**
> 目标项目:`tongjisheng2-app/`(同级生2 独立前端卡,React 19 + Vite)
> 参考目标:`fanren-remake/`(凡人修仙传独立端镜像,515 文件分层重组版)
> 要求:完全对齐参考项目的架构深度与功能覆盖面。

---

## 0. 规模总览对比(完成后)

| 分层 | 凡人(参考目标) | 同级生2(P0 后) | 状态 |
|---|---|---|---|
| entry | 2(双域名容灾 boot + 多语言) | 1(main.tsx,HashRouter 通配挂载) | 中 |
| pages | 29(路由级页面) | 3(HomePage + PanelPage 19 面板 + PanelHandlersContext) | 路由化完成,页数待 P1 扩展 |
| settings | 45(独立设置面板) | 5 模块(Player/AiEndpoint/Preset/Save + SettingsPage Tabs 聚合) | 模块化完成,数量待扩 |
| dialogs | 29(对话框/弹窗) | 5(AchievementDetail/StatusField/CgViewer/ItemDetail/Confirm) | 抽取完成,已接入 4 面板 |
| components | 19(业务组件)+ 28 | 23 巨型面板(未拆分,待 P1) | 待拆分 |
| stores | 16(zustand 状态库) | 8(config/ui/chat/npc/save/mod/toast/gameplay) | 完成 |
| gateway | 12(API 网关/服务) | 4(modelGateway 保留 + archiveService/directorService/notificationService) | 完成 |
| prompts | 9(预设/提示词组装) | 3(promptTypes/presetAssembler + index) | 完成 |
| schemas | 4(Zod 数据契约) | 3(appConfigSchemas/saveSchemas + index) | 完成 |
| data | 38(世界书/知识库/预设池) | 14(content/*) | 中 |
| ui 基件 | 187(shadcn/ui + lucide + 五行色) | 16(Button/Card/Input/Select/Switch/Modal/Tabs/Badge/EmptyState/Loading/NumberInput/ScrollArea/Progress/Tooltip/Toast) | 完成 |
| workers | 1(存档传输 Worker) | 0 | 待 P1 |
| db | 1(Dexie 单入口) | 4(IndexedDB 封装) | 良 |
| 总源码 | 约 530 JS(镜像) | 60,818 行 TS/TSX | — |

**P0 验收结果(生产构建 + 浏览器实测)**:
- ✅ `npm run build` 通过(tsc -b + vite build)
- ✅ 19 个面板路由全部可访问(`/panel/*` 19/19)
- ✅ 多视图 6 个 tab(地图/相册/雷达图/关系图/物品栏/时间线)切换正常
- ✅ 设置页 Tabs 聚合正常
- ✅ 路由往返(主页 ↔ 面板)正常
- ✅ 应用侧无 JS 异常(仅 QQ 浏览器扩展注入的环境性报错,与本应用无关)

---
| prompts | 9(预设/提示词组装) | 1(prompt-assembly.ts) | 中 |
| schemas | 4(Zod 数据契约) | 1(content/mvu/schema.ts) | 中 |
| data | 38(世界书/知识库/预设池) | 14(content/*-data.ts) | 中 |
| utils | 99 | 少量散落 | 中 |
| ui 基件 | 187(shadcn/ui + lucide + 五行色) | 0(仅 index.css 243 行 + 大量内联样式) | **严重** |
| workers | 1(存档传输 Worker) | 0 | 缺 |
| db | 1(Dexie 单入口) | 4(IndexedDB 封装,可复用) | 良 |
| 总源码 | 约 530 JS(镜像) | 58,205 行 TS/TSX | — |

**核心结论**:同级生2 的**运行时引擎深度**(36 个 runtime 引擎:MVU 事务/回合内核/战斗/冲突/电话/电脑/商店/RPG/成就/CG/回放…)并不差,差距集中在**应用架构层**:单巨型组件、无路由页面体系、无状态库、无设置面板模块化、无对话框体系、无 UI 基件库、无服务网关层。

---

## 1. 现状盘点(同级生2)

### 1.1 现有分层
```
app/src/
├── main.tsx            # 入口(HashRouter 单路由)
├── App.tsx             # 5060 行巨型组件:状态+逻辑+全部视图切换
├── index.css           # 243 行(主题变量 3 套:樱花/深夜/咖啡?)
├── responsive.css      # 422 行
├── ai/                 # 2 文件:profiles(8 AI 角色)、index
├── content/            # 14 文件:achievements/bbs/conflicts/mvu schema/npc(关系+日程)/phone/presets/rpg(装备+任务+技能树)/shop/computer
├── db/                 # 4 文件:indexeddb、save-cas、perf-benchmark
├── runtime/            # 36 引擎(深度良好,可保留)
└── ui/                 # 23 巨型面板:GameView/MainChat/StatusBar/ConfigPage/NpcPanel/CombatSettlement/PhonePanel/ComputerPanel/ShopPanel/RpgPanel/ReplayPanel/AchievementPanel/ConflictPanel/ResistancePanel/PresetEditor/WorkshopPanel/DebugPanel/E2EVerifier…
```

### 1.2 主要架构债
1. **App.tsx 单点故障**:5060 行,视图切换靠 `viewMode` + 条件渲染,所有共享状态(配置/聊天/变量/引擎实例)全部提升在这里。
2. **巨型面板**:ui/ 组件平均 940 行,最大的 E2EVerifier 1653 行、MultiViewPanel 1513 行;弹窗/对话框全部内联。
3. **无状态库**:zustand 在 package.json 但 0 处使用。
4. **无路由页面**:只有 `/` 一个路由,所有"页面"都是 App 内的条件渲染。
5. **无 UI 基件**:样式大量内联,无统一 Button/Card/Modal/Input/Tabs/Toast 组件,主题只有 3 套变量。
6. **无服务层**:仅 model-gateway 一个网关,没有"导演服务/存档服务/肖像服务"这类业务服务层。

---

## 2. 对齐目标(凡人架构分层规范)

目标目录结构(对齐 `fanren-remake` 的 14 层规范):

```
app/src/
├── main.tsx                 # entry:boot 壳(保留现有)+ 路由
├── App.tsx                  # 瘦身:仅布局 + 路由出口 + 全局 Provider
├── pages/                   # 路由级页面(凡人 29 个 → 同级生2 映射后约 15~20 个)
├── settings/                # 设置面板模块(凡人 45 → 同级生2 约 15~20 个)
├── dialogs/                 # 对话框(凡人 29 → 同级生2 约 10~15 个)
├── components/              # 业务组件(从巨型面板拆出)
├── stores/                  # zustand 状态库(凡人 16 → 同级生2 约 8~12 个)
├── gateway/                 # 服务/API 网关(模型/导演/存档/媒体/通知)
├── prompts/                 # 预设与提示词组装(从 prompt-assembly 拆分)
├── schemas/                 # Zod 数据契约(与 content 分离)
├── data/                    # 世界书/知识库/预设数据池(content 迁移)
├── utils/                   # 工具函数
├── ui/                      # 基件层(shadcn 风格 Button/Card/Modal/…)
├── workers/                 # Web Worker(存档导出压缩等)
├── db/                      # IndexedDB 层(保留现状)
├── runtime/                 # 引擎层(保留现状,36 个)
└── ai/                      # AI profile(保留)
```

---

## 3. 对齐路线

### P0 基础设施(✅ 已完成并验收 2026-08-10)

| # | 动作 | 完成情况 | 实际产出 |
|---|---|---|---|
| P0-1 | **UI 基件库** | ✅ | `ui/base/` 16 组件:Button/Card/Input/Select/Switch/Modal/Tabs/Badge/EmptyState/Loading/NumberInput/ScrollArea/Progress/Tooltip/Toast + styles.css(基于 5 套 `--c-*` 主题) |
| P0-2 | **stores 状态库** | ✅ | `stores/` 8 库:configStore(配置/主题)/uiStore(视图/面板)/chatStore(消息/状态)/npcStore/gameplayStore/saveStore(存档+kernelRef)/modStore/toastStore;App.tsx 60+ useState 已迁移 |
| P0-3 | **pages 路由化** | ✅ | `pages/`:HomePage(主游戏)/PanelPage(19 面板路由 `/panel/:name`)/PanelHandlersContext;main.tsx 通配挂载;App.tsx 渲染区瘦身 |
| P0-4 | **settings 模块化** | ✅ | `settings/`:PlayerSettings/AiEndpointSettings/PresetSettings/SaveConfigSettings + SettingsPage(Tabs 聚合,含身份选择) |
| P0-5 | **dialogs 对话框层** | ✅ | `dialogs/`:AchievementDetailDialog/StatusFieldDialog/CgViewerDialog/ItemDetailDialog/ConfirmDialog;已替换 StatusBar/AchievementPanel/MultiViewPanel 内联弹窗 |
| P0-6 | **gateway 服务层** | ✅ | `gateway/`:archiveService(导出/导入/总览/恢复/回滚)/directorService(开局背景+导演裁定)/notificationService(toast+提示音);modelGateway 保留在 runtime |
| P0-7 | **prompts 层** | ✅ | `prompts/`:promptTypes(类型契约再导出)/presetAssembler(预设解析+缓存) |
| P0-8 | **schemas 层** | ✅ | `schemas/`:appConfigSchemas/saveSchemas(存档包校验);content/mvu/schema 保留为卡片契约 |

### P1 高价值功能(✅ 已完成并验收 2026-08-10)

| # | 功能 | 完成情况 | 实际产出 |
|---|---|---|---|
| P1-1 | **存档 zip 导出/导入 + 迁移** | ✅ | `workers/archiveExport.worker.ts`(Worker 打包/解包,主线程降级)+ `gateway/archiveService` 批量导入导出/版本迁移检查 + `pages/ArchivePage`(/archive) |
| P1-2 | **剧情导演服务** | ✅ | `gateway/directorService.directTurn` 接入回合流程(plot-evolution 端点已配置时,startTurn 后生成导演裁定,注入主 AI prompt 作为 system 消息) |
| P1-3 | **叙事记忆可视化** | ✅ | `pages/MemoryPage`(/memory):按女角/类型筛选 + 关键词搜索 + 态度修正预览 + 记忆详情/清除 |
| P1-4 | **关系图谱** | ✅ | `pages/RelationshipGraphPage`(/relations):20 女角圆环布局 + 静态关系边 + 动态好感度边 + 点击女角详情对话框 + 关系明细表 |
| P1-5 | **LLM 调试台 + 日志中心** | ✅ | `pages/LogCenterPage`(/logs):回合 Trace 汇总 + 类别过滤/搜索 + 详情对话框 + 复制/导出 |
| P1-6 | **工坊内容导入导出** | 未做 | WorkshopPanel 已有基础能力,与 P2 内容池合并规划 |
| P1-7 | **故事分享/人生快照** | ✅ | `pages/LifeSnapshotsPage`(/life):周目回顾 + 成就/NG+ 总览 + 周目详情对话框 + 回顾分享(复制) |
| P1-8 | **开局向导** | ✅ | `pages/OnboardingWizardPage`(/onboarding):欢迎 → AI 接口(连通测试) → 身份选择(6 种) → 完成检查;HomePage 未就绪时提供入口 |

**P1 验收结果(生产构建 + 浏览器实测)**:
- ✅ `npm run build` 通过
- ✅ 19 面板路由 19/19 + 6 新路由页 6/6(archive/relations/memory/logs/onboarding/life)
- ✅ GameView 快捷入口新增 5 个(存档管理/关系图谱/叙事记忆/日志中心/人生快照)
- ✅ 关系图谱 20 个可点节点 + 详情对话框正常
- ✅ 应用侧无 JS 异常(仅浏览器扩展环境性报错)
- 玩法扩展:新页面均以独立端为准设计,原卡内容仅作数据源

### P2 生态级(视需求)

| # | 功能 | 说明 | 对应凡人模块 |
|---|---|---|---|
| P2-1 | 世界地图 | 同级生2 有地理世界书,可做地图浏览页(町地图 + 地点跳转) | WorldMapPage + MapEditorDialog |
| P2-2 | 通知声音/TTS | 提示音设置、正文朗读 | NotificationSoundSettings + StoryTtsSettings |
| P2-3 | 自定义列/自定义内容 | 高级表格列配置、自创内容编辑 | CustomColumnsPage + CustomContentSettings |
| P2-4 | 多人在线/云同步 | 依赖后端,暂缓 | MultiplayerPage + CloudSyncSettings |
| P2-5 | 自动续写/自动对话框 | 长回合自动续写、自动对话框协调 | AutoContinue + autoDialogCoordinator |

---

## 4. 命名规范(对齐后统一)

| 目录 | 规范 | 示例 |
|---|---|---|
| pages | `XxxPage.tsx`,路由级 | `HomePage`/`ArchivePage` |
| settings | `XxxSettings.tsx`,设置子模块 | `AiEndpointSettings` |
| dialogs | `XxxDialog.tsx` / `XxxModal.tsx` | `RelationshipDialog` |
| components | 业务组件 PascalCase | `HeroineCard`/`StatusCard` |
| stores | `xxxStore.ts`(camelCase + Store) | `configStore`/`chatStore` |
| gateway | `xxxService.ts` / `xxxGateway.ts` | `directorService` |
| prompts | `xxxPrompt.ts` / `presetXxx.ts` | `presetAssembler` |
| schemas | `xxxSchemas.ts` | `appConfigSchemas` |
| data | 语义名 | `heroineData`/`questData` |
| workers | `xxx.worker.ts` | `archiveExport.worker` |
| db | `db/index.ts` 单入口 | 保留 |

---

## 5. 执行建议顺序

1. **P0-1 → P0-2 → P0-3**:基件库 → 状态库 → 路由化(三者联动,App.tsx 拆解的主干)
2. **P0-4 → P0-5**:设置模块化 + 对话框抽取(面板瘦身)
3. **P0-6 → P0-7 → P0-8**:服务层 / prompts / schemas(纯新增,不破坏现有)
4. **P1**:按用户优先级逐项补功能(1→8)
5. **P2**:视需求

每步完成后跑 `npm run build`(tsc -b)验证,并可用 dev 模式人工检查。
