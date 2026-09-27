# 完整设计方案

## 1. 方案状态

- 项目/版本:同级生2 独立前端卡 v1.0
- 设计范围:从 SillyTavern 角色卡全量忠实迁移为独立前端 RP 应用 + 4类增强(多视图UI/结算CG/成就多周目/调试工坊) + RPG养成 + 商城手机 + NPC自然行动 + 酒馆预设兼容
- 状态:草案(待用户确认)
- Task Envelope:[project-profile-and-draft.md](./project-profile-and-draft.md)
- Artifact Index / Gate State:本文件 + host-capability-map.md + stage-roadmap.md

## 2. 目标与非目标

### 作品目标

把基于 SillyTavern 的同级生2 角色卡迁移为**独立前端 RP 应用**,全量忠实复现原卡核心体验(17天寒假日程+20女角+13维技能+LCG骰子+4难度+6男主+SP数据库+多结局+NSFW),并利用脱离 ST 的自由度实现原卡受 ST 限制无法实现的增强:8AI细粒度分工、多视图UI、H场景结算页、CG画廊、成就系统、多周目继承、回放系统、调试工具、创意工坊、RPG养成玩法、90年代手机/电脑模块、商城、**NPC自然行动系统**(女角独立日程+独立剧情+关系网,不依赖玩家在场)、**酒馆预设兼容**(支持ST预设导入/导出/编辑,方便玩家复用既有配置)。

### 首版成功体验

玩家在浏览器打开应用 → 导入(或选择内置)酒馆预设快速配置Prompt顺序与Sampler → 配置8个AI的API Key(或仅配主聊天+变量2个,其余按需) → 选择男主身份(P1-P6) → 进入1995年寒假17天 → 与20位女角恋爱互动,**女角即便不在场也按自己的日程/剧情/关系网自然行动**(玩家可能听说/遭遇/错过) → 每轮主聊天AI生成叙事 + 变量AI更新状态 + NPC自然行动AI推进在场外女角剧情 → LCG骰子判定行动 → H场景/战斗触发独立结算页 → 状态栏实时可视化 → 存档重开一致性 → 达成多结局。

### 独立应用边界

- **交付物是独立应用**,不依附 SillyTavern 页面/插件/全局对象
- **复用 ST 数据契约**(World Info/Prompt/角色字段/宏语义)作为外部兼容契约,由独立运行时原生执行
- **生产运行时不依赖 ST 页面、插件、全局对象或未声明脚本**
- 4个外部CDN脚本(MVU bundle/Zod/LCG骰子/SP数据库)全部原生重写,无外部运行时依赖
- 原卡 EJS 代码按标准语法重构,不受酒馆 EJS 限制

### 明确非目标

- 不复刻 ST 全部 UI(只做 RP 应用需要的 UI)
- 不自动执行原卡插件代码(4个外部脚本重写而非移植)
- 不强制用户配置全部8个AI(默认2个必配,6个可选,降级运行)
- 不做实时多人协作(单机应用,云存档可选)
- 不做移动端原生 App(纯Web,移动端浏览器自适应)
- 不做 ST 向后兼容导出(独立应用存档格式自成体系)

### 关键假设及证据

| 假设 | 证据 | 风险 |
|---|---|---|
| 标准 ejs.js 能承载原卡4196处EJS标签 | 调研:仅用4种标准标签,无复杂装饰器 | 低 |
| 自建 getwi 加载器能复现三级调度树 | 原卡 D0→7分控→角色档案链路清晰 | 中(需测试) |
| 8AI分工可并行协调 | 每轮仅2必调,6按触发;Promise.all并行 | 中(冲突裁定需验证) |
| IndexedDB 能承载 SP数据库表格语义 | chatSheets DDL可映射为 ObjectStore | 低 |
| LCG骰子完全确定性可原生复现 | 原卡自定义LCG公式,无crypto/Math.random | 低 |
| 90年代手机/电脑模块可融入恋爱模拟 | 原卡有日程/经济/联系系统基础 | 低 |

## 3. 内容设计引用

| 契约 | 当前版本/位置 | 已确认结论摘要 | 未决项 |
|---|---|---|---|
| World Contract | 原卡`世界书/地理/`+`事件/`+`时间线/` | 7地理+3节日事件+17天日程+关键事件总表;1995年日本背景 | 90年代手机/电脑/商城的世界设定需补 |
| Agency Contract | 原卡`主角设定.txt`+`玩家画像.txt` | 6种可扮演男性(P1-P6),开局身份校验固定 | RPG养成下玩家表达权边界 |
| Character Portfolio | 原卡`角色/`20女×5文件+4男×2文件 | 20女角(基础信息/性格调色盘/三面性/NSFW反差/剧情线)+4男配角;阶段3-5 NSFW | 增强后的女角培养面板字段 |
| Narrative Contract | 原卡`阶段指导/`+`结局分支矩阵`+`破产结局机制` | 寒假前奏/核心/尾声/结局4阶段+多结局分支 | 多周目继承的剧情处理 |
| Expression Direction Card | 原卡`[mvu_plot]输出格式.txt` | 第一人称口语化;每轮≤1300字(H≤1600);时间每轮+30分钟;禁止数值外泄 | 8AI各自文风一致性 |
| Content Mode Contract | 原卡 NSFW 单模式 | NSFW内容(阶段3-5);无多模式切换 | H场景结算页的NSFW档位 |
| Lore Authoring Package | 原卡190世界书条目 | 7蓝灯+65关灯+其余;constant/selective策略;before_char/at_depth/after_char位置 | 关灯条目由 getwi 调度的原生实现 |
| Prompt Policy Package | 原卡`扮演准则/`(防口胡/防神化/防绝望/防全知/防崩溃/防超自然/道德伦理/法律意识/经济护栏/合理性审查/思维链) | 11个扮演准则;D0每轮强制加载 | 8AI各自的准则分配 |
| Gameplay-Narrative Contract | 原卡`全局规则/`+`属性系统`+`LCG骰子`+`恋爱互动`+`技能系统` | 13维技能+LCG骰子(11动作+7类预判)+4难度+经济+物品效果 | RPG养成(技能树/装备/任务)扩展 |

## 4. 系统联动结构

```text
[玩家动作输入]
→ [回合内核 Kernel:身份校验/时间锁/行动次数/疲劳/死结局检查]
→ [LCG骰子预判定:7类行为(冥想/洞察/伪装/意志/锻炼/社交/调查)]
→ [EJS预处理:D0系统控制器 → getwi加载7分控 → 角色档案按场景]
→ [世界书选择器:190条目按constant/selective/at_depth策略注入]
→ [Prompt组装:8AI各自Profile独立组装]
→ [Model Gateway:8AI并行/串行调用(主聊天+变量必调,6个按触发)]
→ [Output Contract解析:叙事正文/UpdateVariable/UpdateTable/结算HTML]
→ [规则裁定:变量AI数值优先于叙事;冲突裁定的Kernel聚合]
→ [原子提交:CommittedFacts → IndexedDB CAS]
→ [Projection:状态栏/地图/手机/相册/inventory/雷达图/关系图]
→ [Memory/History:已提交叙事+动作历史;摘要/索引可重建]
→ [成就/CG/回放:触发型增强模块消费已提交事实]
```

### 单系统内部闭环

- **LCG骰子**:玩家行为→7类预判→种子公式→11动作判定→结果注入Prompt→变量AI更新技能/属性
- **MVU变量**:变量AI输出JSONPatch→Zod校验→applyPatch到stat_data→IndexedDB持久化→状态栏渲染
- **SP数据库**:变量AI输出UpdateTable(SQL)→解析为IndexedDB操作→hydrate到表格→报表查询
- **寒假日程**:时间推进→天数变化→getwi加载dayXX→场景模式切换→D0指令模式加载

### 剧情 → 系统

- 剧情演化AI判定阶段切换 → 触发阶段指导条目 → 变量AI更新阶段字段 → 解锁对应NSFW阶段内容
- 关键事件触发 → CG触发条件表判定 → CG画廊收录 → 成就检查

### 系统 → 剧情

- LCG骰子大失败 → 死结局触发器 → 剧情AI生成失败叙事
- 经济破产 → 破产结局机制 → 结局分支
- 女角好感达阈值 → 剧情线推进 → NPC视角AI补充内心戏

### 系统 ↔ 系统

- 变量AI ↔ SP数据库:每轮双写同步(stat_data ↔ chatSheets)
- 主聊天AI ↔ 变量AI:主聊天叙事→变量AI读取场景→输出变量变更
- 世界观AI ↔ 主聊天AI:世界观AI输出场景描写→注入主聊天AI上下文
- **NPC自然行动AI ↔ 主聊天AI**:在场外女角行动摘要→作为"环境事件"注入主聊天AI上下文(玩家可能听说/遭遇/错过);NPC内心戏作为补充→不覆盖主聊天叙事
- **NPC自然行动AI ↔ 变量AI**:NPC行动→变量AI同步更新NPC状态(位置/心情/关系/剧情进度/嫉妒值等)
- **NPC自然行动AI ↔ NPC关系网**:女角A行动影响女角B(如唯发现玩家与美佐子亲密→唯嫉妒值+;美佐子与可怜相遇→朋友关系强化)
- 战斗结算AI ↔ LCG骰子:骰子结果→战斗结算AI生成HTML→注入主界面
- H场景结算AI ↔ NSFW阶段:H场景触发→结算AI生成HTML→CG画廊收录
- **酒馆预设 ↔ Prompt Assembly**:导入的ST预设→映射为Prompt组装顺序+Sampler参数+上下文预算→8AI各自Profile应用
- **酒馆预设 ↔ Model Gateway**:ST预设的sampler(temperature/top_p等)→Model Gateway调用参数

### 保存重开与失败恢复

- **Save CAS**:每个 revision 内容寻址存储(Content-Addressable Storage),ACK 后发布
- **重开一致性**:重开时从最新 revision 恢复 stat_data + chatSheets + 历史 + Memory
- **失败恢复**:模型调用失败→保留 StreamDraft→重试/降级;解析失败→不污染状态→回退到上一 revision
- **分支存档**:多周目分支管理,New Game+ 继承部分属性/关系

## 5. 运行时设计引用

| 契约 | 当前选择 | 关键边界 | 证据/缺口 |
|---|---|---|---|
| Host Foundation | 纯前端Web(Vite+React+TS),浏览器内运行时 | 不依赖ST页面/插件/全局对象;4外部脚本原生重写 | 已确认;无原生文件系统(用IndexedDB) |
| Turn-State Transaction | Kernel协调,8AI候选事实聚合,原子提交 | StreamDraft/RawModelResponse/CandidateChangeSet/CommittedFacts四态分离;变量AI数值优先 | 已确认;冲突裁定规则待验证 |
| Memory-History | 已提交叙事+动作历史;摘要/索引可重建 | Memory只消费已提交事实,不造事实;按revision重建 | 已确认 |
| Lore Runtime | 世界书选择器(190条目)+getwi加载器 | constant/selective/at_depth策略;关灯条目由getwi精准调用避免双重加载 | 已确认;getwi加载器需自建 |
| Prompt Assembly | 8AI各自Profile独立组装,独立上下文预算 | [mvu_plot]→主聊天AI相关;[mvu_update]→变量AI相关;无前缀→双发;6触发型AI独立条目集 | 已确认;8AI条目分配待细化 |
| Executable Profile | 8个Profile,各配模型端点/Key/Prompt/输出协议 | 主聊天+变量每轮必调;6个按触发;模型分级(便宜/强);**NPC自然行动AI每轮轻量决策+关键事件触发** | 已确认 |
| Macro Compatibility | 完整({{user}}+{{format_message_variable::stat_data}}) | 仅2宏,原生实现;{{user}}→玩家名;{{format_message_variable::stat_data}}→stat_data序列化注入 | 已确认 |
| Model Gateway | 多端点(8AI各一),流式/取消/重试/降级 | OpenAI兼容协议;失败降级到默认模型;并行调用(Promise.all);**sampler参数由预设Port提供** | 已确认;8端点配置UI待设计 |
| **Preset Compatibility** | **ST预设JSON导入/导出/编辑** | **prompt_order→Prompt组装顺序;prompts→原生条目;sampler→Gateway参数;context→预算;8AI各绑独立预设;内置原卡预设** | **新增;ST预设格式待调研** |
| **NPC Schedule Engine** | **女角日程引擎+关系网+独立剧情触发** | **20女角×5时段×7区域日程表;日期覆盖;NPC关系图(朋友/情敌/姐妹);独立剧情线按day/好感/关系触发;不依赖玩家在场** | **新增;原卡人物出现总表+主动事件触发器扩展** |
| UI Command-Projection | React组件Projection,状态栏/地图/手机/相册/inventory | 状态栏响应mag_variable_update_ended事件;结算页iframe/组件 | 已确认;iframe vs React组件待定 |
| Save-Recovery | IndexedDB CAS,revision版本化,分支存档 | 原子写入;重开一致性;崩溃恢复到上一revision;多周目分支 | 已确认 |
| Platform-Asset Port | 浏览器Web,资源fetch加载,无原生文件系统 | 头像/CG/音效静态资源;90年代手机/电脑UI素材 | 已确认 |
| Trust-Dataflow | API Key本地存(localStorage/IndexedDB),不上传 | 密钥隔离;可执行代码默认惰性;Prompt不泄露Key | 已确认 |

## 6. 权威执行链

### Command 入口

玩家输入动作 → Kernel 接收 Command → 读取 base revision(当前 stat_data + chatSheets 快照)

### base revision 与正式快照

- 每个 revision 是 stat_data + chatSheets + 历史 + Memory 的不可变快照
- base revision 作为本轮基准,所有候选变化基于此
- 正式快照存 IndexedDB,CAS 内容寻址

### Prompt/Lore/Memory 来源

- **Lore**:世界书选择器从190条目按策略筛选 + getwi 加载器按 D0 调度树精准拉取关灯条目
- **Prompt**:8AI各自Profile组装(系统条目+角色档案+场景条目+历史+Memory摘要)
- **Memory**:已提交叙事摘要 + 关键事实索引(按revision可重建)

### Output Contract 与候选

- **主聊天AI**:叙事正文(≤1300字,H≤1600)+ `<StatusPlaceHolderImpl/>` 占位符
- **变量AI**:`<UpdateVariable>`(Analysis+JSONPatch)+ `<UpdateTable>`(SQL)
- **开局AI**:开场场景叙事(P1-P6对应)
- **剧情演化AI**:剧情推进指令+阶段摘要
- **NPC视角AI**(升级为**NPC自然行动AI**):每轮轻量决策生成在场外女角行动摘要(去了哪里/做了什么/遇到谁)+ 关键事件触发完整独立剧情;NPC内心戏作为补充不覆盖主聊天叙事
- **战斗结算AI**:战斗HTML结算页(LCG骰子结果)
- **H场景结算AI**:H场景HTML结算页(NSFW阶段3-5)
- **世界观AI**:场景描写+地理注入

### 规则裁定与 CommitRecord

- **变量AI数值优先**:变量AI的JSONPatch数值变更优先于主聊天AI叙事中的数值描写
- **NPC视角补充**:NPC自然行动AI输出的在场外女角行动摘要作为"环境事件"注入主聊天AI上下文(玩家可能听说/遭遇/错过);NPC内心戏作为叙事补充,不覆盖主聊天AI叙事
- **NPC独立剧情推进**:NPC自然行动AI按女角_剧情线文件触发独立剧情(不依赖玩家),变量AI同步NPC状态(位置/心情/关系/剧情进度)
- **冲突裁定**:Kernel 聚合8AI候选事实,按裁定规则解决冲突,生成 CommitRecord
- **Zod校验**:所有变量变更经 Zod schema 校验,失败则拒绝该候选

### Save CAS/ACK 与发布

- CommitRecord → IndexedDB CAS 写入(内容寻址)→ ACK 确认 → 发布新 revision
- 发布后通知所有 Projection(状态栏/地图/手机等)更新
- 发布后触发增强模块(成就/CG/回放)消费

### Projection/History/Memory 消费

- **Projection**:状态栏/地图/手机/相册/inventory/雷达图/关系图/时间线 实时渲染
- **History**:已提交叙事+动作追加到历史
- **Memory**:摘要/索引从已提交事实重建(可按revision重放)

## 7. 兼容、迁移与平台

### 来源资产及兼容档位

| 资产 | 兼容档位 | 处理方式 |
|---|---|---|
| 190世界书条目 | 完整支持 | 原生世界书选择器+getwi加载器,保留constant/selective/at_depth策略 |
| MVU 5件套 | 完整支持 | 原生MVU事务(getvar/setvar/JSONPatch/Zod),对接IndexedDB |
| EJS预处理41条目 | 映射但有差异 | 标准 ejs.js + 自建 getwi;原卡EJS按标准语法重构 |
| 4外部CDN脚本 | 重写 | MVU bundle/Zod/LCG骰子/SP数据库 全部TS原生重写 |
| 9正则 | 转换 | 原生正则引擎+placement/promptOnly/markdownOnly语义 |
| 角色档案(20女+4男) | 完整支持 | 原生条目加载,保留阶段@@if控制(重构为标准) |
| schema.ts(Zod) | 完整支持 | 原生zod运行时,registerMvuSchema原生实现 |
| 状态栏前端 | 转换 | iframe+postMessage 或 React组件(待定) |
| SQL_v4.3(chatSheets) | 映射但有差异 | DDL转IndexedDB ObjectStore,保留表格语义 |

### 旧档/Schema 策略

- 独立应用存档格式自成体系(不复用ST存档)
- 提供 ST 存档导入工具(可选,导入 stat_data JSON)
- Schema 版本化,迁移工具处理版本升级

### Host 选择及理由

- 选择:纯前端Web(Vite+React+TS+IndexedDB+zod)
- 理由:用户确认;跨平台零安装;不依赖原生文件系统;ST兼容运行时本身不依赖原生FS
- 不做物理分离(Worker/Tauri)的理由:首版聚焦功能完整;性能问题可后续优化

### 资源/离线/降级

- 静态资源(头像/CG/音效)打包进应用,fetch加载
- 离线:首版不支持(需API调用);后续可升级PWA
- 降级:8AI中6个触发型AI未配置Key时降级(主聊天AI兼并其职责)

## 8. 增强模块设计(独立前端独有)

### 8.1 多视图UI + 实时数据可视化

- **主聊天视图**:核心叙事流,第一人称视角,流式显示
- **状态栏**:属性/时间/场景/经济/任务/角色(9分类统一renderRecordItem,模态框详情)
- **地图视图**:7地理(自宅/学园/商业区/海岸/温泉乡/医院/保育园)+当前位置+可移动地点
- **90年代手机视图**:翻盖/直板手机UI,通话/短信/邮件(简单手机,非智能);电脑上网(拨号,邮件/简单网页/聊天室)
- **相册/CG画廊**:NSFW场景CG触发与收藏,按女角/场景分类
- **inventory/装备**:RPG道具/装备栏,物品效果表联动
- **雷达图/关系图**:13维技能雷达图;20女角好感/信任关系图
- **时间线**:17天寒假日程时间线,关键事件标记

### 8.2 结算页 + CG + 音效

- **战斗结算页**:LCG骰子结果可视化(种子/动作/判定/伤害),独立HTML页,动画+音效
- **H场景结算页**:NSFW阶段3-5场景结算,独立HTML页,CG+音效(非"双修",95年原作叫法)
- **CG画廊**:场景CG收录,按女角/阶段/场景分类,解锁条件联动CG触发条件表
- **音效**:场景切换/骰子/战斗/H场景/成就解锁音效

### 8.3 成就 + 多周目 + 回放

- **成就系统**:结局解锁(多结局)/女角全攻略/技能满级/隐藏剧情触发/CG全收集
- **多周目继承**:New Game+ 继承部分属性/关系/物品;周目数影响开局
- **回放系统**:回合历史回放(按revision);分支回放(从某revision分叉重玩)

### 8.4 调试 + 创意工坊

- **调试工具**:Trace查看器(8AI调用链/Prompt/Lore/状态变更);变量监视器(stat_data实时);Prompt检查器(8AI各自Prompt)
- **创意工坊**:自定义角色档案/世界书条目/剧情线导入导出;MOD支持(参考凡人修仙传)

### 8.5 RPG养成玩法

- **技能树**:13维技能可视化技能树,升级解锁,前置依赖
- **装备系统**:武器/防具/饰品,属性加成,物品效果表联动
- **任务系统**:主线/支线/隐藏任务,任务追踪面板
- **探索系统**:地图探索,地点发现,随机事件
- **女角培养**:女角能力培养(原卡"女性初始能力上限"扩展),独立培养面板
- **经营/经济**:经济系统扩展,投资/打工/经营,报表可视化

### 8.6 商城

- **游戏内商城**:道具/装备/礼物/特殊物品购买,经济系统联动
- **90年代设定**:符合1995年的商品/价格/购物方式(实体店/邮购)

### 8.7 NPC自然行动系统(让女角"活起来")

**原卡基础与差距**:原卡有"人物出现总表"(20女角×5时段×7区域默认出现模式+日期覆盖)和"主动事件触发器"(15事件,仅当前女角+玩家在场触发),但 NPC 行为仍依赖玩家在场。独立前端增强为 NPC 即便不在场也按自己的日程/剧情/关系网自然行动。

**核心组件**:

- **NPC日程引擎**(`src/runtime/npc/schedule-engine.ts`):
  - 扩展原卡"人物出现总表":20女角×5时段(早/上午/下午/晚/深夜)×7地理(自宅周边/学园/商业区/海岸/温泉乡/医院/保育园)默认位置
  - 日期覆盖:17天日程文件(day01~day17)对默认表覆盖(如圣诞夜/元日/跨年特殊日程)
  - 关系覆盖:玩家与女角关系阶段达阈值时覆盖(如攻略完成后女角常驻玩家自宅)
  - 天气覆盖:恶劣天气调整 NPC 出现地点(如雨雪天减少海岸出现)

- **NPC关系网**(`src/runtime/npc/relationship-graph.ts`):
  - 20女角之间的关系矩阵:朋友/情敌/姐妹/师生/邻居/同班/同社团
  - 关系影响行动:女角A与女角B是情敌→同时在场时行动互相干扰;姐妹→行动同步;朋友→结伴出行
  - 嫉妒链扩展:原卡嫉妒值机制扩展为"NPC发现玩家与其他女角亲密→嫉妒值+→NPC关系网波动→可能触发NPC间冲突/联合"
  - 关系网可视化:与8.1关系图视图联动

- **NPC独立剧情触发器**(`src/runtime/npc/plot-trigger.ts`):
  - 基于原卡20女角_剧情线文件:每个女角的独立剧情线(不依赖玩家)
  - 触发条件:day_count + 女角当前关系阶段 + 女角位置 + NPC关系网事件
  - 剧情推进:NPC独立剧情线按阶段(寒假前奏/核心/尾声/结局)推进,玩家可能错过/听说/遭遇
  - 错过事件:玩家未在 NPC 剧情地点时,NPC 独立推进,玩家可能错过关键剧情(增加重玩价值,与8.3多周目继承联动)
  - 遭遇事件:玩家移动到 NPC 剧情地点时,按 NPC 日程表判定可能遭遇(原卡人物出现总表机制)

- **NPC自然行动AI**(8AI架构升级):
  - **每轮轻量决策**(必调或按预算):生成在场外女角行动摘要(去了哪里/做了什么/遇到谁),输出 `<NPCDailyAction>` 标签
  - **关键事件触发**(按触发):NPC独立剧情线触发时,生成完整剧情叙事片段,输出 `<NPCPlotAdvance>` 标签
  - **NPC内心戏**(按触发,多女角同场时):NPC视角内心戏/反应,输出 `<NPCInnerVoice>` 标签(原 NPC视角AI 职责)
  - 与主聊天AI协调:NPC行动作为"环境事件"注入主聊天AI上下文(玩家可能听说/遭遇/错过);不覆盖主聊天叙事
  - 与变量AI协调:NPC行动后状态变更由变量AI同步(位置/心情/关系/嫉妒值/剧情进度)
  - 模型分级:NPC自然行动AI可用便宜模型(轻量决策);关键剧情用强模型

- **NPC记忆**(`src/runtime/npc/memory.ts`):
  - NPC记得与玩家的历次互动(基于历史+Memory)
  - NPC记得与其他NPC的互动(NPC关系网事件历史)
  - 影响:NPC后续行动受记忆影响(如女角A记得玩家曾拒绝她→后续回避玩家)

- **NPC状态字段扩展**(schema.ts):
  - 每个女角新增:`当前位置`/`当前心情`/`今日行动`/`独立剧情进度`/`NPC关系状态`(与其他女角的关系快照)
  - 与原卡`当前女角.位置`等字段对齐,扩展为20女角全量(原卡仅当前女角)

- **NPC调试视图**(与8.4调试工具联动):
  - NPC日程可视化:20女角×5时段×7区域热力图
  - NPC关系网可视化:关系图实时变化
  - NPC行动日志:每轮NPC行动摘要+剧情触发记录
  - NPC错过事件提示:调试模式下显示玩家错过的NPC剧情(正式模式隐藏,避免破坏沉浸)

### 8.8 酒馆预设兼容(方便玩家复用既有配置)

**原卡基础与差距**:原卡在脚本里有 `presetName` 引用但仅用于表格模板命名,非真正 ST 预设。原卡 Prompt 组合通过世界书条目+D0调度树实现,无独立预设文件。独立前端增强为支持 ST 预设导入/导出/编辑。

**已验证的真实 ST 预设格式**(证据:用户提供的"三人逆行v11.0—PrismFox 正式版(数据库变量版).json",1.3MB,264个prompt条目,标准 ST ChatCompletion 预设):

- **prompts 数组**(每项字段):
  - `identifier`:UUID 或 ST 内置命名标识符(见下)
  - `name`:显示名(如"🔒 ┏ 三人逆行"/"⚫丨角色描述")
  - `enabled`:是否启用(与 prompt_order 联动)
  - `role`:system/user/assistant
  - `content`:Prompt 内容(可含宏 {{user}}/{{char}}/{{getvar}} 等,可含 EJS)
  - `injection_position`:0=相对于角色定义,1=相对深度注入
  - `injection_depth`:注入深度(配合 injection_position=1)
  - `injection_order`:注入顺序(同深度多条目排序)
  - `system_prompt`/`marker`/`forbid_overrides`:标志位

- **ST 内置命名标识符**(映射器必须识别并对接应用对应槽位):
  - `main`:主提示词 → 对应主聊天AI系统条目
  - `nsfw`:NSFW 提示词 → 对应 H场景结算AI/NSFW阶段
  - `jailbreak`:越狱提示词 → 可选,对应主聊天AI附加条目
  - `charDescription`:角色描述 → 对应角色档案_基础信息
  - `charPersonality`:角色性格 → 对应角色档案_性格调色盘
  - `scenario`:角色情景 → 对应场景条目
  - `dialogueExamples`:对话示例 → 对应开场白/示例对话
  - `chatHistory`:聊天历史 → 对应历史+Memory
  - `worldInfoBefore`:角色定义之前的世界书 → 对应蓝灯 constant 条目(before_char)
  - `worldInfoAfter`:角色定义之后的世界书 → 对应蓝灯 constant 条目(after_char)
  - `personaDescription`:用户角色描述 → 对应玩家画像/主角设定
  - `enhanceDefinitions`:增强定义 → 对应角色档案_三面性/NSFW反差
  - `agentSystemPrompt`/`agentResults`:Agent 功能 → 对应8AI扩展槽

- **自定义命名标识符**(预设作者定义,如 `prism-style-depth2`/`hulu-style-*`):作为"自定义条目"加载,可挂载到任意 AI Profile

- **prompt_order 数组**:与 prompts 一一对应,控制启用状态与顺序;映射为应用 Prompt 组装顺序

- **sampler 顶级字段**(映射为 Model Gateway 调用参数):
  - `temperature`/`top_p`/`top_k`/`top_a`/`min_p`:采样参数
  - `repetition_penalty`/`frequency_penalty`/`presence_penalty`:惩罚参数
  - `seed`:随机种子(可空)
  - `reasoning_effort`:推理强度(新字段,Gemini/o系列模型)
  - `verbosity`:冗长度

- **上下文/会话字段**:
  - `openai_max_context`:最大上下文(如 128000)
  - `openai_max_tokens`:最大回复 token
  - `max_context_unlocked`:上下文解锁标志
  - `stream_openai`:流式输出
  - `use_sysprompt`/`squash_system_messages`:系统消息处理
  - `assistant_prefill`/`assistant_impersonation`/`impersonation_prompt`:助手前缀/扮演
  - `continue_nudge_prompt`/`continue_postfix`/`continue_prefill`:继续提示
  - `new_chat_prompt`/`new_example_chat_prompt`/`new_group_chat_prompt`/`group_nudge_prompt`:新对话/群聊提示
  - `names_behavior`:名字行为
  - `send_if_empty`:空输入处理
  - `wi_format`:世界书格式
  - `function_calling`:函数调用
  - `image_inlining`/`media_inlining`/`video_inlining`/`request_images`:多模态
  - `show_thoughts`:思考链显示

- **extensions 字段**:扩展数据(如 bias_preset_selected 偏置预设),按需加载

**核心组件**:

- **预设导入器**(`src/runtime/preset/importer.ts`):
  - 支持 SillyTavern 预设 JSON 格式:`openai_prompt_order.json`(ChatCompletion 预设,已验证)和 `textgen presets`(TextGeneration WebUI 预设,待验证)
  - 解析上述全部字段:prompts/prompt_order/sampler/上下文/会话/extensions
  - 自动识别 ST 预设版本(ST 1.11+ ChatCompletion / 旧版 / TextGen)并适配
  - 文件名特殊字符兼容(如"三人逆行v11.0—PrismFox 正式版(数据库变量版).json"含全角—和括号)
  - 导入后映射为应用内部 `PresetProfile` 格式

- **预设映射器**(`src/runtime/preset/mapper.ts`):
  - ST `prompt_order` + `prompts[].enabled` → 应用 Prompt 组装顺序(按 order 数组顺序,仅 enabled=true 的条目)
  - ST `prompts[].role` → 应用消息角色(system/user/assistant)
  - ST `prompts[].content` → 应用条目内容(保留宏,运行时展开 {{user}}/{{char}}/{{getvar}} 等)
  - ST `prompts[].injection_position`/`injection_depth`/`injection_order` → 应用条目注入位置(0=相对角色定义槽位;1=相对深度,按 depth+order 排序)
  - ST 内置命名标识符 → 应用对应槽位(见上表)
  - ST 自定义命名标识符 → 应用"自定义条目"槽位(挂载到指定 AI Profile)
  - ST `sampler` 字段 → Model Gateway 调用参数(temperature/top_p 等)
  - ST `openai_max_context`/`openai_max_tokens` → 上下文预算管理
  - ST `stream_openai`/`assistant_prefill`/`continue_*`/`new_*` → 会话控制
  - ST `wi_format` → 世界书条目格式(影响 Lore Runtime 注入格式)
  - ST `extensions` → 扩展数据(按需)
  - 冲突处理:ST预设与原卡内置 Prompt 冲突时,用户选择"内置优先/预设优先/合并"(默认合并:ST 预设条目追加到原卡条目之后)

- **预设模板库**(`src/content/presets/`):
  - 内置预设:原卡默认(基于原卡D0调度树+扮演准则+MVU格式)/恋爱模拟/NSFW剧情向/RPG数值向/快速调试
  - 内置预设与原卡 Prompt 组合对齐(原卡扮演准则/MVU格式/D0指令等作为内置条目,使用 ST 内置标识符)
  - 用户可基于内置预设或导入预设创建自定义预设

- **预设编辑器**(`src/ui/PresetEditor.tsx`):
  - 可视化编辑 Prompt 顺序(拖拽排序,对齐 prompt_order)
  - 每条目编辑:identifier/name/enabled/role/content/injection_position/injection_depth/injection_order
  - Sampler 参数编辑(滑块/输入框,带推荐值提示)
  - 上下文设置编辑(openai_max_context/openai_max_tokens/预算分配)
  - 会话控制编辑(stream/assistant_prefill/continue/new_chat 等)
  - 实时预览:编辑后可预览组装后的完整 Prompt(按 AI Profile 分别预览)
  - 8AI 预设绑定:每个 AI Profile(MainChat/Variable/Opening/PlotEvolution/NPCAction/CombatResolve/HSceneResolve/Worldview)可独立绑定不同预设;同一预设可拆分为8AI共用或8AI各用不同子集

- **预设导出器**(`src/runtime/preset/exporter.ts`):
  - 应用配置导出为 ST 预设 JSON 格式(可选,方便在 ST 使用)
  - 导出格式严格对齐 ST ChatCompletion 预设(prompts/prompt_order/sampler/上下文/会话/extensions 全字段)
  - 导出后玩家可在 ST 直接加载预设,与原卡角色卡配合使用
  - 8AI 预设分别导出(主聊天预设/变量预设等)或合并导出为单一预设(8AI 条目用自定义标识符区分)

- **预设与原卡协同**:
  - 原卡 D0 调度树/扮演准则/MVU 格式作为"内置预设"(使用 ST 内置标识符 main/worldInfoBefore 等),用户预设可叠加/覆盖
  - 优先级:用户导入预设 > 内置预设 > 原卡世界书条目(可配置;默认合并)
  - 预设不破坏原卡核心机制(MVU/LCG骰子/SP数据库/D0调度):预设条目作为"额外 Prompt"注入,不替换原卡核心机制条目
  - ST 预设的 `worldInfoBefore`/`worldInfoAfter` 与原卡世界书选择器协同(预设格式定义世界书条目包装,选择器决定哪些条目注入)

- **预设快捷切换**:
  - 多预设切换(玩家可在不同场景切换预设,如日常用恋爱预设,H场景切NSFW预设)
  - 预设与场景模式联动(自动切换:约会模式→恋爱预设;事件模式→剧情预设;D0指令模式对应预设)
  - 预设与8AI联动(主聊天AI用恋爱预设;NPC自然行动AI用轻量预设;变量AI用结构化预设)
  - 预设热切换(运行中切换预设,下一轮立即生效,不中断当前回合)

- **预设与Sampler高级配置**:
  - 8AI各自独立sampler(主聊天AI高temperature增创意;变量AI低temperature保结构;NPC自然行动AI中等平衡)
  - 8AI各自独立上下文预算(主聊天AI大预算;变量AI中预算;NPC自然行动AI小预算)
  - 预设保存sampler预设方案(创意模式/精准模式/平衡模式)
  - 支持ST预设的 reasoning_effort/verbosity 新字段(适配Gemini/o系列模型)

- **预设兼容性验证清单**(基于真实"三人逆行"预设):
  - [ ] 导入1.3MB/264条目预设不崩溃
  - [ ] 全角特殊字符文件名(—（）)正确读取
  - [ ] ST 内置标识符(main/nsfw/charDescription/chatHistory/worldInfoBefore/worldInfoAfter/personaDescription/enhanceDefinitions/jailbreak/agentSystemPrompt/agentResults)全部识别
  - [ ] 自定义命名标识符(prism-style-depth2/hulu-style-*)作为自定义条目加载
  - [ ] injection_position(0/1)+injection_depth+injection_order 注入位置正确
  - [ ] sampler 全字段(temperature/top_p/top_k/top_a/min_p/repetition_penalty/frequency_penalty/presence_penalty/seed)映射
  - [ ] 上下文(openai_max_context/openai_max_tokens)生效
  - [ ] 会话控制(stream_openai/assistant_prefill/continue_*/new_*_prompt)生效
  - [ ] 宏({{user}}/{{char}}/{{getvar}})在预设 content 中保留并运行时展开
  - [ ] 导出后能在 ST 重新加载(字段完整)

## 9. 风险与可行性

| 风险/未知 | 影响 | 当前证据 | 缓解或验证 | owner |
|---|---|---|---|---|
| 8AI协调延迟 | 每轮响应慢 | 每轮仅2必调+6触发;Promise.all并行 | 阶段1验证并行调用延迟 | Model Gateway |
| 8AI冲突裁定 | 状态不一致 | 变量AI数值优先规则 | 阶段2验证冲突场景 | Kernel |
| getwi加载器复现 | 调度树断裂 | 原卡D0→7分控链路清晰 | 阶段1验证getwi加载 | Lore Runtime |
| IndexedDB承载SP数据库 | 查询性能 | chatSheets表格语义可映射 | 阶段2验证报表查询 | Save/SP |
| 战斗/H结算页注入 | UI割裂 | iframe或React组件 | 阶段3验证结算页 | UI |
| EJS重构工作量 | 迁移周期长 | 4196处标签,但仅4种标准语法 | 分批重构,阶段1验证核心 | Runtime |
| 90年代手机/电脑模块 | 设定偏差 | 1995年日本背景 | 参考原卡+史料 | Content |
| 多周目继承平衡 | 数值膨胀 | 原卡4难度反方向设计 | 继承系数设计 | Gameplay |
| **NPC自然行动AI成本** | 每轮多一次AI调用 | 轻量决策可用便宜模型;关键事件按触发 | 阶段2验证NPC行动摘要质量+成本 | NPC Runtime |
| **NPC关系网复杂性** | 关系矩阵爆炸 | 20女角关系网可控(朋友/情敌/姐妹等有限类型) | 阶段2验证关系网触发 | NPC Runtime |
| **NPC错过事件挫败感** | 玩家错过关键剧情 | 与多周目继承联动增加重玩价值;调试模式提示 | 阶段2验证玩家体验 | NPC/Runtime |
| **ST预设格式差异** | 导入失败 | ST预设格式有版本差异(1.11+/旧版) | 阶段1调研ST预设格式;兼容多版本 | Preset Port |
| **预设与原卡Prompt冲突** | 行为不一致 | 优先级规则(用户>内置>原卡) | 阶段1验证冲突处理 | Preset/Prompt |

## 10. 验证设计

### 代表性行为案例

1. **开局身份选择**:玩家选P3长冈芳树 → 开局AI生成长冈家起床场景(非P1鸣泽家)→ 变量AI初始化12条JSONPatch → 状态栏显示长冈身份
2. **LCG骰子大失败**:玩家"调查"行动 → LCG预判(种子公式)→ 大失败 → 死结局触发 → 主聊天AI生成失败叙事
3. **H场景触发**:NSFW阶段3 → H场景结算AI生成HTML结算页 → CG画廊收录 → 变量AI更新女角NSFW状态
4. **多女角同场**:2+女角在场 → NPC视角AI生成各女角内心戏 → 注入主聊天AI上下文(不覆盖叙事)
5. **存档重开**:存档 → 重开 → revision恢复 → stat_data+chatSheets+历史一致 → 状态栏正确渲染
6. **NPC自然行动**:玩家在自宅 → NPC自然行动AI生成在场外女角行动(如唯去医院/美佐子开店/可怜海边散步)→ 注入主聊天AI上下文(玩家可能听说)→ 变量AI同步NPC状态;玩家次日移动到NPC剧情地点 → 判定遭遇/错过
7. **NPC关系网**:玩家与美佐子亲密 → 唯(情敌)嫉妒值+ → 唯行动受影响(回避/质问)→ 关系网波动;美佐子与可怜(朋友)结伴 → 玩家在商业区可能同时遭遇
8. **酒馆预设导入**:玩家导入ST预设JSON → 映射为PresetProfile → 8AI应用预设 → Sampler/Prompt顺序生效;玩家切预设 → 主聊天AI行为变化(创意/精准)

### 集成/Trace

- 8AI调用链Trace(端点/Prompt/输出/耗时/状态)
- getwi加载链Trace(D0→分控→角色档案)
- 变量更新Trace(JSONPatch before/after)
- 世界书命中Trace(条目/策略/递归)
- **NPC行动Trace**(每轮NPC行动摘要/剧情触发/关系网变化)
- **预设应用Trace**(预设字段映射/Sampler参数/Prompt顺序变化)

### 七类失败及恢复

1. 模型调用失败 → 重试3次 → 降级默认模型 → 保留StreamDraft
2. 输出解析失败 → 拒绝候选 → 不污染状态 → 回退上一revision
3. Zod校验失败 → 拒绝该字段变更 → 保留其他合法变更 → 提示用户
4. IndexedDB写入失败 → 内存缓存 → 重试 → 提示存档冲突
5. getwi加载失败 → 跳过该条目 → 降级运行 → 记录缺口
6. 8AI冲突无解 → Kernel裁定失败 → 暂停提交 → 提示用户介入
7. 浏览器崩溃 → 重开恢复最新revision → 校验一致性

### 真实模型/浏览器边界

- 真实模型:阶段2接入真实API验证8AI输出协议
- 浏览器:Chrome/Firefox/Safari/Edge 验证IndexedDB/EJS/流式
- 桌面:Windows/macOS 浏览器验证
- 移动端:响应式验证(非原生优化)

### 全局验收标准

1. 玩家完成17天寒假全程,无状态不一致
2. 20女角全部可互动,NSFW阶段3-5可触发
3. 8AI各自职责正确,冲突裁定有效
4. 存档重开一致性,多周目继承正确
5. 增强模块(多视图/结算/成就/回放/调试/工坊/RPG/商城/手机/NPC自然行动/酒馆预设)功能完整
6. 脱离ST独立运行,无外部运行时依赖(除API)
7. **NPC自然行动有效**:20女角即便不在场也按日程/剧情/关系网行动;玩家可听说/遭遇/错过;NPC关系网波动影响行动
8. **酒馆预设兼容有效**:ST预设JSON可导入;8AI应用预设后Sampler/Prompt顺序生效;预设切换不破坏原卡核心机制

## 11. 设计门结论

### 通过项

- 目标与非目标清晰,关键假设有证据
- 系统结构完整,8AI协调有明确实现路径
- 兼容档位明确,迁移分类合理
- 增强模块设计完整,与原卡系统联动清晰

### 退回项

- 无(待用户确认)

### 未验证项

- 8AI并行延迟(阶段1验证)
- 8AI冲突裁定(阶段2验证)
- getwi加载器复现(阶段1验证)
- 战斗/H结算页注入(阶段3验证)
- **NPC自然行动AI质量与成本**(阶段2验证)
- **NPC关系网触发复杂性**(阶段2验证)
- **ST预设格式兼容性**(阶段1调研+验证)
- **预设与原卡Prompt冲突处理**(阶段1验证)

### 建议

**进入阶段路线图**。设计已具备可验证切片条件,建议按垂直切片推进实施。

### 用户确认

[待用户审查本完整设计后确认]
