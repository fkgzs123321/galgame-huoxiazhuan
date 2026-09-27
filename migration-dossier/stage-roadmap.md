# 垂直阶段路线图

## 路线图信息

- 项目/设计版本:同级生2 独立前端卡 v1.0
- Design Gate Package:[complete-design.md](./complete-design.md) + [host-capability-map.md](./host-capability-map.md)
- 当前阶段:阶段2 核心可运行(步骤2 39/39 全绿;LCG 确定性/NPC 自然行动/H 场景/多女角已接入),待阶段2 浏览器全量验收与阶段3
- 总体交付目标:把 SillyTavern 同级生2 角色卡全量忠实迁移为独立前端 RP 应用,并纳入8AI细粒度分工、多视图UI、结算CG、成就多周目、调试工坊、RPG养成、商城手机、**NPC自然行动系统**、**酒馆预设兼容**等增强模块

## 阶段总览

| 阶段 | 用户可完成的闭环 | 依赖契约 | 主要实现范围 | 验证/恢复 | 状态 |
|---|---|---|---|---|---|
| 1 核心运行时垂直切片 | 玩家配置2个AI Key(主聊天+变量)→**导入或选择内置酒馆预设快速配置Sampler/Prompt顺序**→选择P1原作主角→进入12-22早晨→与1位女角(如鸣泽美佐子)对话1轮→看到叙事正文+状态栏正确显示身份/时间/地点/属性 | Host Foundation / Turn-State Transaction / Lore Runtime / Prompt Assembly / Executable Profile / Macro / Model Gateway / UI Projection / Save-Recovery / Platform-Asset / Trust-Dataflow / **Preset Compatibility(基础)** | EJS引擎+getwi加载器+MVU事务+Zod schema+IndexedDB CAS+世界书选择器+2AI并行调用+主聊天视图+状态栏9分类+存档重开+OpenAI兼容网关+**ST预设导入器+预设模板库(内置)+预设与8AI绑定(2AI)** | 调用链Trace/getwi加载Trace/JSONPatch before-after/存档重开一致性/Chrome+Firefox验证/**ST预设导入与Sampler生效** | 待开始 |
| 2 基础玩法完整化 | 玩家完成17天寒假全程→20女角全部可互动→**NPC自然行动(在场外女角按日程/剧情/关系网行动,玩家可听说/遭遇/错过)**→LCG骰子7类预判生效→4难度切换→经济/物品/任务系统运转→多结局可达→存档重开一致 | 阶段1全部 + Gameplay-Narrative + Memory-History + Content Mode + **NPC Schedule Engine + NPC自然行动AI** | LCG骰子原生实现+7类行为预判+4难度反方向配置+20女角档案加载+13维技能+经济系统+物品效果表+任务系统+寒假日程推进+Memory摘要重建+多结局分支+破产/法律/嫉妒/崩溃死结局+**NPC日程引擎+NPC关系网+NPC独立剧情触发器+NPC自然行动AI(每轮轻量决策+关键事件触发)+NPC记忆+NPC状态字段扩展** | 17天全程无状态不一致/骰子确定性/难度切换7字段同步/结局分支覆盖/失败恢复七类/**NPC行动Trace/关系网触发/错过事件体验** | 待开始 |
| 3 增强模块接入 | 玩家触发H场景→H结算页+CG收录→战斗触发→战斗结算页+音效→地图/手机/相册/inventory/雷达图/关系图/时间线视图可用→成就解锁→多周目继承→回放历史回合 | 阶段2全部 + 增强模块8.1~8.8 | 战斗结算AI+H场景结算AI+NPC内心戏(原NPC视角AI)+剧情演化AI+世界观AI+开局AI(6个触发型AI接入)+多视图UI(地图/手机/相册/inventory/雷达/关系图/时间线+**NPC日程热力图/NPC关系网图**)+CG画廊+音效+成就系统+多周目继承+回放系统+RPG养成+90年代手机/电脑模块+商城+**预设编辑器+预设导出器+预设快捷切换** | 6AI触发型调用Trace/H结算页注入(iframe vs React组件)/CG解锁条件/多周目继承平衡/90年代设定符合性/RPG养成数值平衡/**NPC关系网可视化/预设编辑器实时预览** | 待开始 |
| 4 打磨与优化 | 玩家在8AI全配置下体验流畅,8AI协调延迟可接受,冲突裁定有效,无状态不一致,跨浏览器一致 | 阶段3全部 + 性能优化 + 冲突裁定 | 8AI并行延迟优化(Promise.all+超时降级)+冲突裁定规则验证+IndexedDB性能调优(批量写/索引)+EJS预处理缓存+Prompt上下文预算管理+Trace查看器+变量监视器+Prompt检查器(调试工具)+创意工坊(MOD导入导出)+跨浏览器测试(Chrome/Firefox/Safari/Edge)+响应式移动端适配 | 8AI全配置延迟<15s/轮/冲突裁定无死锁/IndexedDB查询<200ms/EJS缓存命中率/移动端可玩性 | 待开始 |
| 5 完整发布与回归 | 应用可独立部署,脱离ST运行,无外部运行时依赖(除API),全局验收标准6项全通过 | 阶段4全部 + 部署 + 回归 | PWA可选升级(离线缓存)/部署打包(Vite build)/全局回归测试(6项验收标准)/5个代表性行为案例全通过/七类失败恢复演练/真实模型+真实浏览器边界验证/文档(用户手册+API配置+MOD开发) | 验收标准6项/代表案例5个/失败恢复7类/真实环境/部署可访问性 | 待开始 |

## 当前阶段实施计划(阶段1:核心运行时垂直切片)

### 目标体验

玩家从浏览器打开应用 → 在配置页**选择内置预设或导入ST预设JSON**(快速配置Sampler/Prompt顺序)→ 填入主聊天AI和变量AI的API Key(OpenAI兼容端点) → 选择男主身份 P1 原作主角 → 进入 12-22 周五早晨 08:00 自宅客厅 → 系统自动调用开局AI(或主聊天AI兼并)生成开场叙事(美佐子叫起床场景) → 玩家输入"起床去客厅找美佐子" → 主聊天AI流式输出叙事正文(≤1300字,第一人称,口语化)+`<StatusPlaceHolderImpl/>`占位符 → 变量AI并行输出`<UpdateVariable>`(Analysis+JSONPatch)+`<UpdateTable>`(SQL) → Kernel聚合候选 → Zod校验 → IndexedDB CAS原子提交 → 状态栏实时渲染(9分类:属性/时间/场景/经济/任务/角色)+历史追加 → 玩家点存档 → 重开 → revision恢复 → stat_data+历史+状态栏一致。**预设切换可在配置页测试,验证Sampler参数生效**。

### 本阶段非目标

- 不接入6个触发型AI(开局/剧情演化/NPC内心戏/战斗结算/H场景结算/世界观),由主聊天AI兼并
- 不实现LCG骰子(阶段2)
- 不实现20女角全档案(只验证1-2位女角加载)
- 不实现4难度切换(阶段2)
- 不实现NPC自然行动系统(阶段2)
- 不实现预设编辑器/导出器/快捷切换(阶段3,阶段1只做导入器+模板库)
- 不实现增强模块(地图/手机/相册/CG/成就/多周目/RPG/商城,阶段3)
- 不实现调试工具/创意工坊(阶段4)
- 不做移动端优化(阶段4)
- 不做PWA/离线(阶段5)

### 最小读取集

- `references/workflow-entry-discovery-and-draft.md`:入口发现与草案流程(已用)
- `references/bridge-st-card-to-app.md`:ST卡迁移指南,兼容档位判定
- `references/runtime-host-foundation-and-content-pack.md`:宿主基础与内容包,IndexedDB/EJS/资源加载
- `references/runtime-turn-kernel-and-state-transactions.md`:回合内核与状态事务,StreamDraft/RawModelResponse/CandidateChangeSet/CommittedFacts四态
- `references/runtime-memory-context-and-history.md`:记忆上下文与历史,revision重建
- `references/runtime-worldbook-selection-and-injection.md`:世界书选择与注入,constant/selective/at_depth策略
- `references/runtime-prompt-assembly-and-context-budget.md`:Prompt组装与上下文预算,8AI各自Profile
- `references/runtime-model-gateway-and-streaming.md`:模型网关与流式,OpenAI兼容+并行+降级
- `references/runtime-save-migrations-and-recovery.md`:存档迁移与恢复,CAS+revision+分支
- `references/ui-narrative-reading-and-message-rendering.md`:正文渲染与消息显示,流式+占位符
- `references/quality-behavior-specs-and-regression.md`:行为规格与回归,验证设计

### 受影响边界

| 区域 | 需变化的契约/文件/接口 | 不应变化的行为 |
|---|---|---|
| 内容 | 原卡190世界书条目原生加载;原卡EJS按标准语法重构(4196处标签);原卡MVU 5件套原生执行 | 原卡世界书条目内容/策略/位置语义不变;原卡MVU变量路径/schema字段不变 |
| Command/State | Kernel(身份校验/时间锁/行动次数/疲劳/死结局检查);StreamDraft→RawModelResponse→CandidateChangeSet→CommittedFacts四态;IndexedDB CAS revision | 原卡回合内核行为语义不变(时间每轮+30分钟/疲劳累积/死结局触发条件) |
| Prompt/Lore/Model | 世界书选择器(190条目);getwi加载器(D0→7分控→角色档案);2AI Profile(主聊天+变量);OpenAI兼容网关;**ST预设导入器+预设模板库(内置);预设映射器(prompt_order/prompts/sampler/context/instruct);2AI预设绑定** | 原卡D0调度树语义不变;原卡[mvu_plot]/[mvu_update]/无前缀路由规则不变;原卡宏语义({{user}}/{{format_message_variable::stat_data}})不变;**预设不破坏原卡核心机制** |
| UI/Save/Platform | 主聊天视图(流式+占位符);状态栏9分类(属性/时间/场景/经济/任务/角色,统一renderRecordItem);IndexedDB存档(替代ST chatSheets);Vite+React+TS;**配置页预设选择/导入** | 状态栏9分类字段对齐schema.ts;存档重开一致性;**预设导入后Sampler/Prompt顺序生效** |

### 实施步骤

#### 1. 项目脚手架与内容包

- 初始化 Vite + React + TS 项目,目录结构:`src/runtime`(内核)/`src/ai`(8AI Profile)/`src/ui`(React组件)/`src/content`(原卡资产)/`src/db`(IndexedDB)
- 把原卡资产迁移到 `src/content/`:世界书190条目(JSON化,保留key/content/strategy/position/depth/order/enabled)、MVU 5件套(initvar.yaml/变量列表.txt/变量输出格式.txt/变量更新规则.yaml/schema.ts)、EJS 41条目(按标准语法重构,移除ST特有装饰器)、9正则(JSON化,保留pattern/placement/promptOnly/markdownOnly)、角色档案(20女+4男,阶段@@if重构为标准)、SQL_v4.3 DDL(JSON化,ObjectStore映射)
- 完成证据:`src/content/` 目录下所有原卡资产可被TS import,类型完整

#### 2. Host Foundation(IndexedDB + EJS引擎)

- IndexedDB 封装层(`src/db/indexeddb.ts`):ObjectStore定义(global_state/protagonist_info/important_npc/world_state/save_revisions/memory)/CAS内容寻址(sha256)/原子写入(事务)/revision版本化
- 标准 ejs.js 引入(`src/runtime/ejs-engine.ts`):支持`<% %>`/`<%= %>`/`<%- %>`/`<%_ %>`四种标准标签;自建 getwi 加载器(按条目名从IndexedDB/内存缓存拉取,支持@@if/@@private装饰器语义)
- 完成证据:EJS引擎能渲染原卡D0系统控制器,输出含 getwi 调用的调度指令;getwi 加载器能拉取7分控条目

#### 3. Lore Runtime(世界书选择器 + getwi 调度树)

- 世界书选择器(`src/runtime/worldbook-selector.ts`):按 constant(蓝灯)/selective(关键词触发)/at_depth(深度注入)策略筛选190条目;递归纪律(关键词触发后递归扫描)
- getwi 调度树(`src/runtime/getwi-loader.ts`):D0入口→[总控]核心铁律/[总控]人物/[总控]NSFW/[总控]事件/[总控]剧情/[总控]阶段/[mvu_plot]系列;[总控]人物→角色档案(按timeslot场景动态拉取)
- 关灯条目精准调用(避免双重加载):selective触发的条目不再被getwi重复拉取
- 完成证据:190条目按策略正确注入;getwi调度树Trace可查;token计数正常(无双重加载)

#### 4. MVU 事务(Zod schema + JSONPatch + 变量AI输出解析)

- Zod schema(`src/runtime/schema.ts`):从原卡schema.ts移植,顶部禁import(CDN import由pack追加→独立应用改为本地import);`export const Schema = ...`;registerMvuSchema原生实现
- MVU 事务(`src/runtime/mvu-transaction.ts`):getvar/setvar原生实现;JSONPatch applyPatch(支持replace/delta/insert/remove);Zod运行时校验(失败拒绝该字段变更)
- 变量AI输出解析:`<UpdateVariable>`标签内JSON数组解析;`<UpdateTable>`SQL解析为IndexedDB操作;`<Analysis>`解析为审计日志
- 完成证据:变量AI输出JSONPatch→Zod校验通过→applyPatch到stat_data→IndexedDB持久化;状态栏渲染正确

#### 5. Turn Kernel(回合内核 + 四态事务)

- Kernel(`src/runtime/kernel.ts`):Command入口(玩家动作);base revision读取(stat_data+chatSheets快照);身份校验(未选择→开局AI触发);时间锁(每轮+30分钟);行动次数;疲劳检查;死结局检查(饥饿/口渴/心情/违法/嫉妒)
- 四态事务:StreamDraft(流式未解析)→RawModelResponse(解析完成)→CandidateChangeSet(8AI候选聚合)→CommittedFacts(Zod校验+裁定后提交)
- 规则裁定:变量AI数值优先于主聊天AI叙事数值;NPC视角AI补充不覆盖(阶段3)
- 完成证据:玩家输入动作→Kernel流程→2AI候选→裁定→IndexedDB CAS提交→状态栏更新

#### 6. Prompt Assembly + Model Gateway(2AI并行) + 预设兼容基础

- 8AI Profile(`src/ai/profiles/`):阶段1实现2个(主聊天AI/变量AI);各配模型端点/Key/Prompt组装/输出协议/上下文预算
- Prompt组装(`src/runtime/prompt-assembly.ts`):系统条目+角色档案+场景条目+历史+Memory摘要;[mvu_plot]→主聊天AI;[mvu_update]→变量AI;无前缀→双发
- Model Gateway(`src/runtime/model-gateway.ts`):OpenAI兼容协议;流式(主聊天AI);非流式(变量AI);Promise.all并行;超时降级;重试3次;**sampler参数从预设Port读取**
- **预设导入器**(`src/runtime/preset/importer.ts`):支持 ST 预设 JSON 格式(已验证 ChatCompletion 格式:prompts/prompt_order/sampler/上下文/会话/extensions);解析全字段;自动识别版本;**文件名特殊字符兼容(全角—（）等)**
- **预设映射器**(`src/runtime/preset/mapper.ts`):ST 字段 → 应用内部 PresetProfile;
  - ST 内置标识符(main/nsfw/charDescription/charPersonality/scenario/dialogueExamples/chatHistory/worldInfoBefore/worldInfoAfter/personaDescription/enhanceDefinitions/jailbreak/agentSystemPrompt/agentResults)→ 应用对应槽位
  - 自定义命名标识符(prism-style-depth2/hulu-style-* 等)→ 自定义条目槽位
  - prompts[](identifier/name/enabled/role/content/injection_position/injection_depth/injection_order/system_prompt/marker/forbid_overrides)→ 条目完整映射
  - sampler(temperature/top_p/top_k/top_a/min_p/repetition_penalty/frequency_penalty/presence_penalty/seed/reasoning_effort/verbosity)→ Gateway 参数
  - 上下文(openai_max_context/openai_max_tokens/max_context_unlocked)→ 预算
  - 会话(stream_openai/use_sysprompt/squash_system_messages/assistant_prefill/continue_*/new_*_prompt/names_behavior/send_if_empty/wi_format)→ 会话控制
  - extensions(bias_preset_selected 等)→ 扩展数据
  - 冲突处理(内置优先/预设优先/合并,默认合并)
- **预设模板库**(`src/content/presets/`):内置"原卡默认"预设(基于原卡D0调度树+扮演准则+MVU格式,使用ST内置标识符);内置"恋爱模拟"预设(优化Sampler)
- **2AI预设绑定**:主聊天AI/变量AI分别绑定预设(可同可异);预设提供sampler/上下文预算/Prompt顺序/会话控制
- 完成证据:2AI并行调用Trace可查;流式叙事正文显示;变量AI输出JSONPatch;**导入真实"三人逆行"1.3MB/264条目预设不崩溃;ST内置标识符全识别;sampler参数生效(可从Trace查看);内置预设可加载;预设切换后行为变化;宏{{user}}/{{char}}/{{getvar}}在预设content中保留并运行时展开**

#### 7. UI Projection(主聊天 + 状态栏)

- 主聊天视图(`src/ui/MainChat.tsx`):流式显示叙事正文;`<StatusPlaceHolderImpl/>`占位符解析为状态栏更新事件;第一人称视角;滚动/停止/重试按钮
- 状态栏(`src/ui/StatusBar.tsx`):9分类(属性/时间/场景/经济/任务/角色);统一renderRecordItem(列表项+详情模态框);字段对齐schema.ts;响应mag_variable_update_ended事件
- 配置页(`src/ui/ConfigPage.tsx`):8AI端点配置(阶段1只用2个);API Key本地存(IndexedDB,不上传);玩家姓名输入;**预设选择(内置/导入ST预设JSON);8AI预设绑定下拉;Sampler参数预览**
- 开局身份选择(`src/ui/IdentitySelect.tsx`):P1-P6选择;P6自定义(360属性总和上限)
- 完成证据:玩家配置Key→选P1→看到开场叙事→状态栏9分类正确渲染

#### 8. Save-Recovery(CAS + revision + 重开一致性)

- Save CAS(`src/db/save-cas.ts`):每个revision内容寻址存储(sha256);ACK后发布;分支存档(多周目,阶段3启用)
- 重开一致性(`src/runtime/recovery.ts`):从最新revision恢复stat_data+chatSheets+历史+Memory;校验一致性
- 失败恢复:模型调用失败→保留StreamDraft→重试/降级;解析失败→不污染状态→回退上一revision
- 完成证据:存档→重开→revision恢复→状态栏一致;模型失败→StreamDraft保留→重试成功

#### 9. 端到端垂直切片验证

- 6个验证场景:(1)配置Key+选P1+开场叙事;(2)玩家输入动作+2AI并行+状态栏更新;(3)存档+重开一致性;(4)模型失败+重试恢复;(5)Zod校验失败+拒绝候选;(6)**导入真实"三人逆行v11.0—PrismFox"预设(1.3MB/264条目)+ST内置标识符全识别+Sampler生效+预设切换行为变化**
- Trace验证:8AI调用链Trace(阶段1只2AI);getwi加载链Trace;变量更新Trace(JSONPatch before/after);世界书命中Trace;**预设应用Trace(字段映射/Sampler参数/Prompt顺序/ST内置标识符槽位)**
- 浏览器验证:Chrome + Firefox 主流浏览器
- 完成证据:6场景全通过;2浏览器一致;无状态不一致;**"三人逆行"预设导入后字段完整、不崩溃、Sampler生效**

### 失败语义与回退

| 失败 | revision/数据结果 | 用户反馈 | 重试/恢复 | 回退点 |
|---|---|---|---|---|
| 模型调用失败(网络/限流/Key错误) | 不创建新revision,保留base revision | 红色错误提示+重试按钮 | 重试3次→降级默认模型→保留StreamDraft | 回退到base revision,玩家可重新输入 |
| 输出解析失败(JSONPatch格式错误) | 不创建新revision,保留base revision | 黄色警告+解析错误详情 | 拒绝该候选→不污染状态→回退上一revision | 回退到base revision,变量AI重新生成 |
| Zod校验失败(字段类型/范围错误) | 部分提交(合法字段)+拒绝非法字段 | 黄色警告+非法字段详情 | 拒绝非法字段→保留合法字段→提示用户 | 部分提交,不回退 |
| IndexedDB写入失败(配额/事务冲突) | 内存缓存+重试 | 红色错误+存档冲突提示 | 内存缓存→重试3次→提示存档冲突 | 内存缓存保留,玩家可导出 |
| getwi加载失败(条目缺失/语法错误) | 跳过该条目+降级运行 | 黄色警告+缺口条目名 | 跳过→降级运行→记录缺口 | 降级运行,不回退 |
| EJS渲染失败(标签语法错误) | 不创建新revision | 红色错误+EJS错误位置 | 跳过该条目→降级运行→记录缺口 | 回退到base revision |
| **ST预设导入失败(格式不符/版本不支持)** | 不应用预设,使用内置默认预设 | 黄色警告+预设错误详情 | 降级为内置"原卡默认"预设→提示用户检查格式 | 内置默认预设运行 |
| **预设与原卡Prompt冲突** | 按优先级规则处理(用户>内置>原卡) | 黄色提示+冲突字段 | 按用户选择(内置优先/预设优先/合并)处理 | 不回退,按规则合并 |
| 浏览器崩溃 | 重开恢复最新revision | 重开提示+一致性校验 | 从最新revision恢复→校验一致性 | 恢复到最新revision |

### 验证计划

- **结构/路由**:190世界书条目按策略正确注入(constant/selective/at_depth);getwi调度树D0→7分控→角色档案链路完整;[mvu_plot]/[mvu_update]/无前缀路由正确;**预设prompt_order正确映射为Prompt组装顺序**
- **行为正反例**:(正)玩家选P1→开场叙事为鸣泽家;(正)玩家输入动作→2AI并行→状态栏更新;(正)存档→重开→一致;(反)模型失败→StreamDraft保留;(反)Zod校验失败→拒绝非法字段;(正)**导入ST预设→Sampler参数生效**;(反)**预设格式错误→降级内置预设**
- **集成与 Trace**:8AI调用链Trace(2AI);getwi加载Trace;变量更新Trace(JSONPatch before/after);世界书命中Trace;**预设应用Trace(字段映射/Sampler参数/Prompt顺序)**
- **保存重开/迁移**:存档→重开→revision恢复→stat_data+历史+状态栏一致;ST存档导入工具(可选,导入stat_data JSON);**预设配置随存档保存**
- **真实环境**:Chrome最新版 + Firefox最新版;真实OpenAI兼容API(如DeepSeek/通义千问/Moonshot);**真实ST预设JSON导入测试(用户提供的"三人逆行v11.0—PrismFox 正式版(数据库变量版).json",1.3MB/264条目,含全角特殊字符文件名)**

## 阶段变更记录

| 日期 | 新证据/变化 | 影响 owner | 决定 | 是否回退 |
|---|---|---|---|---|
| 2026-07-30 | 初始路线图创建,5阶段划分 | 全部 | 进入阶段1实施 | 否 |
| 2026-07-30 | 新增 NPC自然行动系统(8.7)和酒馆预设兼容(8.8);NPC视角AI升级为NPC自然行动AI;阶段1纳入预设导入器+模板库;阶段2纳入NPC日程引擎+关系网+独立剧情触发器+NPC自然行动AI | 全部 | 阶段1/2范围扩展;阶段1新增预设兼容基础;阶段2新增NPC自然行动 | 否 |
| 2026-07-30 | 步骤9 E2E 端到端垂直切片验证完成:6 场景全通过(s1 开场/s2 2AI并行/s3 存档重开/s4 模型失败重试/s5 Zod部分提交/s6 三人逆行预设导入);5 类 Trace 可查(aiCall/variableUpdate/presetApply/getwiLoad/worldbookHit);s5 断言修正为检查 txResult.validations(Zod 拒绝记录所在地)而非 candidateTrace(仅记录2AI候选裁定) | 全部 | 阶段1 核心运行时垂直切片就绪,可进入阶段2 | 否 |
| 2026-08-05 | 修复 npm run build(tsc 脚本/IDB 测试钩子);EJS async+动态 getwi;D0 共享变量去重与 typeof 兜底;schema prefault 索引 14→220;LCG 确定性接入战斗/冲突/NPC;开发者步骤2 39/39 全绿 | 全部 | 阶段2 核心可运行(LCG/NPC/H场景/多女角),待浏览器全量验收 | 否 |

## 当前门建议

- **证据摘要**:完整设计已完成(complete-design.md),Host能力已评估(host-capability-map.md),5阶段路线图清晰,阶段1垂直切片范围明确(2AI+核心运行时+1-2女角验证+**预设兼容基础**);阶段2扩展NPC自然行动
- **未解决风险**:8AI并行延迟(阶段1验证2AI,阶段4验证8AI);getwi加载器复现(阶段1核心验证);IndexedDB承载SP数据库(阶段1验证基础读写,阶段2验证报表查询);战斗/H结算页注入(阶段3验证);**NPC自然行动AI质量与成本(阶段2验证)**;**NPC关系网触发复杂性(阶段2验证)**;**ST预设格式兼容性(阶段1调研+验证)**;**预设与原卡Prompt冲突处理(阶段1验证)**
- **建议**:**通过**阶段1路线图,进入阶段1实施
- `SKILL.md` Gate State 更新:Stage Roadmap 已完成,Design Gate Package 齐全(complete-design + host-capability-map + stage-roadmap + project-profile-and-draft),可进入阶段1垂直切片实施(含预设兼容基础)
