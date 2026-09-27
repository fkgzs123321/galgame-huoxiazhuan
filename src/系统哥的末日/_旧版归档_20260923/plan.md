# 系统哥的末日 - 角色卡项目

## 项目类型
- **类型**: 原创（original）现代社会 NTR 剧情角色卡
- **输出**: character_card（PNG 内嵌世界书）
- **资源**: MVU + EJS + regex + tavernHelper（首版不含 HTML 前端）

## 核心设定

### 世界观
- **世界**: 一本现代社会小说世界，主角（反派 AI）知晓这是小说世界，肆意妄为
- **系统**: 死心塌地系统，绑定女性对主角言听计从
- **财富等级**: A1（贫困户）→ A15（首富），A10=10亿，A11=500亿，A12=1000亿，A13=5000亿，A14=万亿，A15=首富
- **绑定规则**: 最多 10 人，需触碰 1 分钟，需匹配主角财富范畴，每提升一个财富等级获 1 个名额
- **解绑代价**: 轻则失忆，重则发疯，最严重死亡（超过 10 人时最初绑定的解绑）
- **主角起点**: A1 贫困户，目标 A15 首富

### 角色定位
- **user**: 受害者丈夫，青梅竹马妻子被主角绑定，家里濒临破产，不知道主角有系统
- **主角**: AI 操控反派，拥有系统，长得帅，知晓小说世界，肆意妄为
- **user 妻子**: 亿级财富，被绑定后变成另一个人，以死相逼要求 user 给主角项目
- **绑定女性**: 富家千金/富太太/财阀女老总，性格/身材/癖好/年龄各异，互相竞争

### 系统机制
- **小说评论系统**: 仅主角可见，含剧透/点赞/评价/吐槽，评论可互动，AI 生成 + 玩家间接影响
- **人设崩塌评价系统**: 类似小说烂尾评价，评价值降至 0 系统与主角解绑（弃书）

## 三大设计决策（已确认）

### 决策 1: 控制模型
- **问题**: 主角和 user 谁是被 AI 控制的角色？
- **答案**: 只控受害者(user)，主角是 AI 反派（AI 自主扮演主角作恶）
- **理由**: user 是受害者视角，体验被夺妻的痛苦与无力感；主角由 AI 自主决策推进剧情

### 决策 2: 评论机制
- **问题**: 小说评论系统的评论由谁生成？
- **答案**: AI 生成 + 玩家间接影响
- **理由**: AI 根据剧情发展生成评论内容（剧透/吐槽/点赞），user 的行为可间接影响评论倾向

### 决策 3: 首版范围
- **问题**: 首版是否包含前端界面？
- **答案**: 先纯世界书后前端
- **理由**: 优先完成世界观/约束/思维链/角色/语料库/MVU 等核心内容，前端界面（交涉面板/状态栏/评论显示）作为后续迭代

## 参考来源
- **raft_13**: EJS+MVU+SPV 数据库联动（已写入 skill references/database/）
- **ONEPIECE_muv_betav0.8**: 思维链 + 战斗面板（改造为交涉面板）
- **红果终结者**: 仅参考 HTML 是否可改造（未验证，降级参考）

## 技术规范
- EJS 控制器条目: `@@generate_before` + `.txt` 文件（ST-Prompt-Template 标准）
- MVU 变量路径: `stat_data.xxx`，`getvar('stat_data.xxx', { scope: 'local', defaults: N })`
- 世界书条目: `preventRecursion: true` + `excludeRecursion: true`
- 角色卡 description: `""`（人设全部写入世界书）

## 核心约束
- 防全知: user 不知主角有系统
- 防神化: 主角不能为所欲为，受系统规则/法律/道德约束
- 防绝望: user 有反抗空间和希望
- 合理性审查: 剧情需符合现实逻辑
- 法律道德: 现代社会背景，法律道德约束存在

## 交涉体系（改自 ONEPIECE 战斗面板）
- d20 对抗骰 + 6 档差值判定（碾压/重创/命中/刮擦/拂过/落空）
- 三幕制: 寒暄 → 辞锋 → 共识（替代对峙/激浪/余波）
- 交涉属性: 待定（参考 ONEPIECE 见闻色/韧性等改造）

## TODO
- [x] grill-me 确认关键决策（主角名/妻子名/首版女性数量/交涉属性维度）
- [x] 设计 schema.ts
- [x] 写入世界观条目
- [x] 写入约束条目
- [x] 写入属性体系+交涉体系
- [x] 写入思维链
- [x] 写入角色条目
- [x] 写入语料库
- [x] 写入 MVU 五件套
- [x] 写 index.yaml + 开场白
- [x] 校验交付
- [x] EJS+MVU+SPV 数据库联动架构（raft_13 参考）
- [x] SPV 10张表 DDL 设计（user=protagonist, 林天=antagonist_state 独立表）
- [x] 前端 HTML 双源 refresh 状态栏 + 交涉面板
- [x] regex 脚本（6 个）+ tavern_helper 脚本（SPV 注入按钮）

## 3. 用户决策记录

| 主角名/妻子名/财富起点/剧情切入点？ | 主角名林天，user 妻子名苏婉，主角起点 A1。游戏开始时主角已升到 A9（亿级范畴），已绑定 8 名女性（A1-A8 阶段各 1 名），苏婉是第 9 个绑定目标。user 财富等级 A9 亿级，与妻子苏婉同级。主角还差 A10-A15 共 6 个等级和 6 个绑定名额。 | 剧情切入点：主角已玩弄 A1-A8 很久，现在瞄准 user 妻子苏婉（A9 亿级）。user 是中途被接管，游戏开始时主角已是 A9 大佬。 |
| 首版绑定女性数量？ | 全部 10 人。每名女性需独立条目+调色盘+阶段EJS+家属条目。 | 首版工作量大，但完整性优先。可分批写入：先苏婉（user妻子）+2-3名样本女性，再补全其他。 |
| 评价系统初始值和衰减规则？ | 初始 80/100，剧情崩坏时降。主角 OOC/剧情不合理/女性解绑死亡时下降，user 成功反抗时也降（弃书），降到 0 系统与主角解绑。 | 评价系统是主角的生存压力来源，也是 user 反抗的间接武器。 |
| 交涉面板属性维度？ | 4 维属性：气势（威压）、口才（说服）、情报（信息差）、地位（社会等级）。d20 对抗骰 + 6 档差值判定，三幕制寒暄→辞锋→共识。 | 气势对应 ONEPIECE 见闻色（先手判定），口才对应武器熟练度（伤害输出），情报对应见闻色预知（闪避），地位对应韧性（防御）。 |
| 参考卡选择？ | raft_13（全海沙盒）而非隐形守护者。 | raft_13 的 DDL 设计更优秀：裁剪+合并+扩展+细化方法论，主题定制化表结构，options 固定 9 行设计，NSFW 7 列动态机制。 |
| 角色定位？ | user 是 protagonist（玩家主角），林天是 antagonist（反派）放 antagonist_state 独立表。 | user 是实际游玩主角；林天按逻辑放重要角色表，但作为反派独立表更清晰。 |
| DDL 设计方向？ | 自定义 DDL（参考 raft_13）而非通用模板。 | 自定义 DDL 通过主题裁剪（砍掉无关表）+合并同类+扩展主题表+细化列定义，完美适配功能。 |

## 验收标准

### 1. 结构完整性
- [x] worldbook.yaml 注册 80 个条目（含 3 个 SPV 新增）
- [x] source/entries/ 目录覆盖 5 大类（世界观/约束/系统/角色/语料库/MVU）
- [x] source/html/ 包含 2 个前端文件（状态栏.html + 交涉面板.html）
- [x] source/regex/scripts.yaml 包含 6 个 regex 脚本
- [x] source/tavern-helper/scripts.yaml 包含 1 个 SPV 注入按钮脚本
- [x] source/tavern-helper/schema.ts MVU 变量结构定义
- [x] draft/assets.yaml 配置 regex + tavernHelper 路径
- [x] draft/card.yaml 角色卡元数据
- [x] source/fields/ 包含开场白等角色卡字段

### 2. SPV 数据库完整性
- [x] SQL_v4.3.json 包含 10 张表完整 DDL（global_state/protagonist_info/antagonist_state/bound_women/family_members/factions/novel_comments/negotiation_log/chronicle/options）
- [x] 表格模板.txt 提取纯 DDL 文本，供 SPV 扩展 createTables() 注入
- [x] SQL填表规则.yaml 描述 AI 何时写哪张表
- [x] 开局初始化SQL.txt 提供 10 张表完整 INSERT 模板
- [x] 角色定位：user=protagonist_info，林天=antagonist_state 独立表

### 3. EJS+MVU+SPV 联动
- [x] MVU schema.ts 定义 stat_data 变量结构
- [x] MVU initvar/变量列表/mvu_plot/mvu_update 四件套完整
- [x] SPV 表格模板条目 enabled:false + constant:true + depth:2 + order:99981
- [x] tavern_helper 脚本通过 AutoCardUpdaterAPI.createTables() 注入表格
- [x] 前端 HTML 通过双源 refresh（Mvu.getMvuData + AutoCardUpdaterAPI.exportTableAsJson）渲染

### 4. 前端交互
- [x] 状态栏.html 4 行紧凑布局（场景/user/林天/苏婉）
- [x] 交涉面板.html 7 Tab 完整面板（概览/user/林天/女性/势力/日志/选项）
- [x] 双源 refresh 含 _refreshing 锁 + 5s 超时 + 800ms 延迟
- [x] eventOn('GENERATION_ENDED') + eventOn('MESSAGE_EDITED') 事件监听
- [x] triggerSlash('/setinput ...') 写入输入框交互

### 5. regex 脚本
- [x] 状态栏占位符 <StatusPlaceHolderImpl/> 隐藏+替换配对
- [x] 交涉面板占位符 <NegotiationPanel/> 隐藏+替换配对
- [x] 思维链 <thought_chain>...</thought_chain> 清理
- [x] UpdateTable <UpdateTable>...</UpdateTable> 隐藏（SQL 已执行）

### 6. 内容质量
- [x] 10 名绑定女性档案完整（含 5 部位身体数据+人物画像+调色盘+7 阶段 EJS）
- [x] 林天 7 阶段 EJS（按评价值分支）+ 7 阶段语料库
- [x] 19 名家属条目（绿灯关键字触发）
- [x] 5 大势力条目（战神/商会/朝廷/都市联盟/仙门）
- [x] 6 大约束（防全知/防神化/防绝望/合理性/法律道德/系统行为）
- [x] 思维链 10 段结构化推理（A-J）

## 验证记录

### 2026-07-01 初版交付验证
- **validate_project**: 0 errors, 2 warnings（plan.md 验收/验证 section 缺失，本次补齐）
- **check_delivery**: 0 errors, 2 warnings（同上）
- **打包产物**: 系统哥的末日.card.json + 系统哥的末日.worldbook.json（exports 目录）

### 2026-07-01 SPV 数据库联动架构补齐
- **新增条目**: 表格模板/SQL填表规则/开局初始化SQL（worldbook.yaml 注册 3 条）
- **新增前端**: 状态栏.html（14.2KB）+ 交涉面板.html（26.1KB）移至 source/html/
- **新增 regex**: 6 个脚本（source/regex/scripts.yaml）
- **新增 tavern_helper**: SPV 注入按钮脚本（source/tavern-helper/scripts.yaml + spv-inject-tables.js）
- **assets.yaml**: 配置 regex + tavernHelper 路径
- **validate_project**: 0 errors, 2 warnings → 0 errors, 0 warnings（补齐验收标准+验证记录后）

### 已知限制
- MVU/EJS 在 assets.yaml 中保持 enabled:false，因 source/mvu/ 目录未建立（schema/initvar 等文件在 source/entries/MVU/ 和 source/tavern-helper/schema.ts）。运行时由酒馆助手扩展直接读取 worldbook 条目，不依赖 assets.yaml 的 mvu/ejs 配置。
- HTML 前端使用 Vue3 CDN + Motion One CDN，需 SillyTavern 允许外链（testingcf.jsdelivr.net）。
- SPV 注入按钮需玩家手动点击触发首次表格创建，后续 AI 回复中 <UpdateTable> 块自动执行 SQL。

## 10. 验收标准

- ### 结构完整性
- worldbook.yaml 注册 80 个条目（含 3 个 SPV 新增）
- source/entries/ 目录覆盖 5 大类（世界观/约束/系统/角色/语料库/MVU）
- source/html/ 包含 2 个前端文件（状态栏.html + 交涉面板.html）
- source/regex/scripts.yaml 包含 6 个 regex 脚本
- source/tavern-helper/scripts.yaml 包含 1 个 SPV 注入按钮脚本
- source/tavern-helper/schema.ts MVU 变量结构定义
- draft/assets.yaml 配置 regex + tavernHelper 路径

### SPV 数据库完整性
- SQL_v4.3.json 包含 10 张表完整 DDL
- 表格模板.txt 提取纯 DDL 文本供 SPV 扩展 createTables() 注入
- SQL填表规则.yaml 描述 AI 何时写哪张表
- 开局初始化SQL.txt 提供 10 张表完整 INSERT 模板
- 角色定位：user=protagonist_info，林天=antagonist_state 独立表

### EJS+MVU+SPV 联动
- MVU schema.ts 定义 stat_data 变量结构
- MVU initvar/变量列表/mvu_plot/mvu_update 四件套完整
- SPV 表格模板条目 enabled:false + constant:true + depth:2 + order:99981
- tavern_helper 脚本通过 AutoCardUpdaterAPI.createTables() 注入表格
- 前端 HTML 通过双源 refresh（Mvu.getMvuData + AutoCardUpdaterAPI.exportTableAsJson）渲染

### 前端交互
- 状态栏.html 4 行紧凑布局（场景/user/林天/苏婉）
- 交涉面板.html 7 Tab 完整面板（概览/user/林天/女性/势力/日志/选项）
- 双源 refresh 含 _refreshing 锁 + 5s 超时 + 800ms 延迟
- eventOn('GENERATION_ENDED') + eventOn('MESSAGE_EDITED') 事件监听
- triggerSlash('/setinput ...') 写入输入框交互

### regex 脚本
- 状态栏占位符 <StatusPlaceHolderImpl/> 隐藏+替换配对
- 交涉面板占位符 <NegotiationPanel/> 隐藏+替换配对
- 思维链 <thought_chain>...</thought_chain> 清理
- UpdateTable <UpdateTable>...</UpdateTable> 隐藏（SQL 已执行）

### 内容质量
- 10 名绑定女性档案完整（含 5 部位身体数据+人物画像+调色盘+7 阶段 EJS）
- 林天 7 阶段 EJS（按评价值分支）+ 7 阶段语料库
- 19 名家属条目（绿灯关键字触发）
- 5 大势力条目（战神/商会/朝廷/都市联盟/仙门）
- 6 大约束（防全知/防神化/防绝望/合理性/法律道德/系统行为）
- 思维链 10 段结构化推理（A-J）

## 11. 验证记录

- ### 2026-07-01 初版交付验证
- **validate_project**: 0 errors, 2 warnings（plan.md 验收/验证 section 缺失，本次补齐）
- **check_delivery**: 0 errors, 2 warnings（同上）
- **打包产物**: 系统哥的末日.card.json + 系统哥的末日.worldbook.json（exports 目录）

### 2026-07-01 SPV 数据库联动架构补齐
- **新增条目**: 表格模板/SQL填表规则/开局初始化SQL（worldbook.yaml 注册 3 条）
- **新增前端**: 状态栏.html（14.2KB）+ 交涉面板.html（26.1KB）移至 source/html/
- **新增 regex**: 6 个脚本（source/regex/scripts.yaml）
- **新增 tavern_helper**: SPV 注入按钮脚本（source/tavern-helper/scripts.yaml + spv-inject-tables.js）
- **assets.yaml**: 配置 regex + tavernHelper 路径
- **validate_project**: 0 errors, 0 warnings

### 已知限制
- MVU/EJS 在 assets.yaml 中保持 enabled:false，因 source/mvu/ 目录未建立（schema/initvar 等文件在 source/entries/MVU/ 和 source/tavern-helper/schema.ts）。运行时由酒馆助手扩展直接读取 worldbook 条目，不依赖 assets.yaml 的 mvu/ejs 配置。
- HTML 前端使用 Vue3 CDN + Motion One CDN，需 SillyTavern 允许外链（testingcf.jsdelivr.net）。
- SPV 注入按钮需玩家手动点击触发首次表格创建，后续 AI 回复中 <UpdateTable> 块自动执行 SQL。

## 12. 2026-08-04 蓝灯化 + 系统哥加强（用户反馈）

### 反馈
- EJS 触控问题：基础信息（角色档案）和调色盘（三色）不应走绿灯/EJS 触控，应常驻蓝灯
- 难度问题：系统哥的权限和能力太弱，很容易通关

### 蓝灯化（worldbook.yaml，22 个条目 constant: false → true）
- 主角林天档案/调色盘、苏婉档案/调色盘、女1-女10 全部档案/调色盘改为蓝灯常驻（每轮固定注入）
- 代价：每轮固定消耗约 3 万 tokens 上下文（用户已确认接受）
- 参考：不要玩弄我的鸡吧-forge（基础信息/调色盘全部 constant: true）

### 堵通关路（约束改写）
- 防绝望.txt：重写——评价值归零 = 系统暴走（不解绑，系统哥更强），第 3 次归零才真解绑；系统救场/反派不死/剧情装甲强制执行；user 通关极难
- 防神化.txt：重写——防的是"呈现逻辑"（巧合形式/合法外衣），不防"强度"；执行优先级：光环/救场/不死定律 > 现实约束
- 合理性审查.txt：新增"短剧逻辑豁免"（巧合以意外形式呈现即合理）
- 法律道德.txt：新增"系统哥法律豁免"（法律流程永远差一步，评价值<10 时才咬住）

### 数值碾压（地狱档，运行时生效）
- 属性与技能系统（地狱档）：林天 100/95/100/100、user 30/30/15/40、绑定女性-35、策略修正 +8/-8；新增技能【绝对掌控】【大势掌控】【时停一瞬】
- 交涉属性体系（地狱档）：骰子 +8/-8、情境修正恶化、属性差≥40 触发"压制"状态、user 属性成长总和≤15
- 交涉判定规则（地狱档）：预判 40%/章3次、user 差值门槛累计+10（≥30 才碾压）、user 胜利收益缩水失败代价加重、证据修正×0.5、新增"交涉僵持规则"
- 数值约束与林天行为逻辑（地狱档）：user 下降上限≤8 恢复≤3、绑定女性≤3/≤12、暴走后评价值回升至25、user 成长封顶
- 数值变动表（地狱档）：评价值下降×0.5 恢复×1.8、user 下降×1.8 恢复×0.5、成长触发频率×0.7

### 新增系统权限/技能/规则系
- 死心塌地系统（地狱档）：新增第九节系统商店（8 道具，价格下调）、第十节绑定锁死（深度≥90 免疫唤醒）、第十一节系统场域（主场压制）
- 属性与技能系统（地狱档）+ initvar：同步新增 3 技能（绝对掌控/大势掌控/时停一瞬），user 技能全面削弱
- 新增条目《回合行动规则（地狱档）》（before_char 蓝灯，order 55）：每轮五阶段行动结构、user 行动点（主+副）、事件结算规则（单轮至多 1 次决定性进展 + 巧合化解判定）、章节节奏控制

### initvar 同步
- attrs：林天 85/70/80/90 → 100/95/100/100；user 50/50/30/60 → 30/30/15/40
- skills：林天 7 技能（含 3 新增）、user 3 技能削弱版

### 构建验证
- worldbook.yaml 校验：96 条目，蓝灯 52 个，22 个档案/调色盘目标全部到位
- generateJson：0 errors, 0 warnings
- postprocess：PNG 打包成功（2.81MB，96 entries，5 个 tavern_helper 脚本）
- 产物：tavern_resource-main/.worldbook/projects/系统哥的末日/exports/系统哥的末日.card.json + src/角色卡/系统哥的末日/系统哥的末日.png
- 本地 exports/系统哥的末日.card.json 已同步（旧版备份 .bak2）

## 13. 2026-08-04 规范复核修正（tavern-cards skill 为准）

用户指出：应看 skills 规范而非臆测。查证 `.skills/tavern-cards` 后确认规范：

### 规范依据
- `references/contents-creation/character/personality-palette.md`：三色 = 底色 + 主色调 + 点缀 + 衍生
- `references/contents-creation/character/multi-stage.md`：**多阶段调色盘 = 蓝灯条目 + 条目内容内部 EJS 段落控制**（`<%_ if (变量) { _%>`），底色写一次放外面
- `references/ejs/guide.md` 段落控制：条目内容内部按 MVU 变量状态渲染不同内容
- EJS 执行条目（`@@generate_before`）依赖每轮执行 → **必须蓝灯 constant**，否则 keys 未命中时 EJS 不执行、阶段描写缺失

### 复核结论
- 基础信息（角色档案）：静态 → 蓝灯 constant ✓（前轮已改，符合规范）
- 调色盘（三色）：蓝灯 constant ✓（前轮已改）；内容为全量静态而非段落控制 —— 因本卡调色盘阶段（叙事进程）与绑定深度（数值）是两套维度、无统一判定变量，未强行段落控制化（避免语义错误），每轮全量注入约 4000+ tokens
- **修正遗漏**：10 个女性"阶段EJS控制"条目原为绿灯 keys 触发（EJS 不执行则阶段描写缺失），本轮全部改蓝灯 constant（含苏婉/女1-女10；林天本就蓝灯）

### 本轮变更
- worldbook.yaml：10 个 stage 条目 constant:false → true
- 重新构建：generateJson 0 errors；postprocess 打包 PNG 2.81MB（96 entries）
- 蓝灯总数：62（原 52 + 10 阶段EJS）
- 本地 exports 已同步

## 14. 2026-08-04 调色盘段落控制化（彻底按 multi-stage 规范）

### 决策
用户确认彻底按 multi-stage 规范改造 10 个女性调色盘 + 主角林色调色盘（共 11 个）。

### 判定变量（复用现成体系，零新增）
- 女性调色盘：`stat_data.绑定花名册.女N.时期`（enum: 当前目标/刚被控制/绑定瞬间/完全绑定/绑定深化/濒临解绑/已解绑），由变量更新规则 4.7.9 每轮强制重算
- 女10 沈梦瑶：额外用 `状态`（待绑定 → 观察期）
- 主角林天色盘：`stat_data.反派状态.评价值`（rating ≥80 / ≥40 / >0 分三档）

### 阶段映射表（逐人设计）
| 女性 | 阶段一 ← 时期 | 阶段二 ← 时期 | 阶段三 ← 时期 |
|------|--------------|--------------|--------------|
| 女1~6（正弧线） | 当前目标/刚被控制/绑定瞬间 | 绑定深化 | 完全绑定 |
| 女7~8（倒弧线，阶段名已与时期对齐） | 完全绑定/绑定瞬间/刚被控制 | 绑定深化 | 濒临解绑/已解绑 |
| 女9 苏婉 | 当前目标/刚被控制→阶段零；绑定瞬间/完全绑定→阶段一 | 绑定深化→阶段二 | 濒临解绑/已解绑→阶段三 |
| 女10 沈梦瑶 | 状态=待绑定→观察期 | 当前目标/刚被控制/绑定瞬间 | 绑定深化/完全绑定 |
| 主角林天 | rating≥80 | rating≥40 | rating>0（=0 无阶段，只底色） |

初始状态验证：女1 完全绑定→宠物期 ✓、女2-5 绑定深化→阶段二 ✓、女6 完全绑定→离婚期 ✓、女7-8 绑定深化→波动期 ✓、女9 当前目标→阶段零 ✓、女10 待绑定→观察期 ✓、林天 rating=100→阶段一 ✓

### 格式
每个调色盘：`@@generate_before` + `<% %>` 定义时期/评价值局部变量 + `<% if/else if %>` 段落控制（与阶段EJS条目同格式，保证运行时一致）。崩坏期（濒临解绑/已解绑，女1-6 无对应阶段内容）→ 只输出底色，行为描写由阶段EJS条目负责。

### 验证
- 11 个调色盘 node --check 语法全过
- ejs 引擎模拟渲染 11 个场景全部输出正确阶段
- 构建 0 errors；PNG 2.81MB（96 entries）；蓝灯 62
- 产物：card.json 921KB（段落控制后体积略增，因 EJS 包装；但运行时每轮注入量从全量 3 阶段 → 当前 1 阶段，实际省 token）

## 15. 2026-08-04 程序级加固（"全往最硬的做"）

用户确认：把提示词级软规则往程序级加固。四项全做。

### 1. 技能/道具次数变量化（4.7.10）
- schema.ts + mvu-schema.js（运行时真身）反派状态新增 10 字段：时停剩余(1)/短剧剩余(3)/预判剩余(3)/绝对掌控剩余(3)/系统救场剩余(1)/系统积分(500)/道具库存(字符串)/强制洗白可用(true)/系统暴走次数(0)/四墙剩余(3)
- initvar 同步 setvar 初始化
- 变量更新规则新增 4.7.10：每轮强制输出当前值、使用后-1、章节切换重置规则
- 修复遗漏：schema.ts/mvu-schema.js 的 角色属性（85/70/80/90）与 技能（3槽旧版）此前未同步地狱档——已改为 100/95/100/100、9 技能槽（charSkillsObj 扩展 1..9，状态栏 renderSkills 同步 1..9）

### 2. EJS 动态强化（新条目《系统状态强化注入》）
- before_char 蓝灯（order 56），按变量每轮动态注入 <system_guard> 块：
  - 评价值=0 → 系统暴走提示（含次数）；<20 → 系统救场预警（含剩余次数）；<30 → 暴走预备
  - 交涉中属性差≥40 → 压制状态提示（user 骰-3）
  - 时停/预判/绝对掌控/道具/积分/强制洗白可用提示
- 修复 falsy 陷阱：`Number(x) || 100` 会把 0 变 100 → 改 isNaN 判断
- ejs 渲染验证 4 场景全对（正常/危机/暴走/缺变量）

### 3. 违规检测 regex（postprocess.cjs 新增 2 个，共 18 个）
- 单轮速胜检测：证据+报警+成功 组合 → 追加"系统守卫拦截，必须巧合化解"指令
- 系统哥被击败检测：林天被捕/击毙/败 → 追加"反派不死定律生效"指令
- 均为 promptOnly:true（发给 AI 的提示），配合已有防数值口胡

### 4. 骰子结果变量化（变量更新规则强化）
- 交涉状态.上轮user骰/上轮对手骰：交涉中每轮必须输出真实 d20 结果，禁止编造
- 上轮判定：必须按地狱档 6 档门槛计算
- 交涉历史：每轮追加"[第N回合] user骰A vs 对手骰B → 判定Y"

### 构建验证
- worldbook 97 条目（+系统状态强化注入）；构建 0 errors
- zod结构脚本（mvu-schema.js）含资源字段/新属性/9技能槽 ✓
- regex 18 个（含 2 新）✓；PNG 2.81MB
- 本地 card.json 935KB 已同步

## 16. 2026-08-04 林天色盘 7 档精细化（用户指出"为什么只有3档"）

用户反馈：林天的阶段应从 3 档细化为多档，行为/规则/能力都要按档区分。

### 发现的问题
- 林天色盘被我段落控制成 3 档（rating≥80/≥40/>0），而阶段EJS行为描写一直是 7 档——精细化倒退
- 档位边界两套不一致：阶段EJS 用 100/80/60/40/20/0，人设崩塌评价系统用 90/70/50/30/10/0

### 修正（统一为 7 档，边界 100/80/60/40/20/0）
1. **林天色盘**（主角林天/调色盘.txt）：3 档 → 7 档段落控制，每档性格三色+衍生（从阶段EJS提炼）：
   阶段1 满分狂欢·肆无忌惮(100) / 阶段2 巅峰期·玩世不恭(80-99) / 阶段3 警觉期·玩味收敛(60-79) / 阶段4 危机期·阴鸷算计(40-59) / 阶段5 崩坏期·不择手段(20-39) / 阶段6 解绑边缘·绝望挣扎(1-19) / 阶段7 系统解绑·失去一切(0)
2. **人设崩塌评价系统（地狱档）**：档位边界统一为 7 档，新增"能力分档表"——常备技能（时停/短剧/预判/绝对掌控/救场）全档可用由变量追踪；额外能力按档：100=金色特权+四墙+商店全开；80-99=四墙(≥90)+商店全开；60-79=商店正常；40-59=商店限购；20-39=暴走预备(道具不消耗轮次)；1-19=救场强制+洗白可用；0=暴走状态
3. **系统状态强化注入**：0/<20/<40/<60/<80/<100/100 细分 7 档注入（档位1-7 提示+对应能力）
4. 修复两处 if 顺序 bug：`rating < 20` 拦截 `rating=0`，导致阶段7/档位7 死代码——把 `rating === 0` 分支提到最前

### 验证
- ejs 渲染 7 档全对（林天色盘 阶段1-7、强化注入 档位1-7）
- 构建 0 errors；PNG 2.81MB（97 entries）；本地 card.json 940KB

## 17. 2026-08-07 参考欲望都市：速览总表 + 灯色降 token

用户要求：参考「欲望都市」卡的蓝灯/绿灯设置降 token，并引入"速览名单"。

### 欲望都市策略（调研结论）
- 角色**基础信息全部绿灯**（scope=specific + 关键词触发），蓝灯只放：世界观/规则/扮演准则 + **名录总表（38 人 1 行速览，蓝灯索引）** + MVU + 被阶段调度 getwi 的资源池
- 核心：蓝灯=必要的规则+速览索引；详细人设按需（关键词/getwi）加载

### 系统哥的末日改造
1. **新建《角色速览总表》**（蓝灯 before_char，order 95，part=roster，scope=catalog，904字节）：核心角色+10 女性（身份/等级/当前阶段一句话）+16 关键家属索引，只做识别用，不承载详细人设
2. **21 个档案/调色盘改回绿灯**（constant:false + 角色名/昵称关键词触发）：主角林天档案、苏婉档案/调色盘、女1-女10 档案+调色盘
3. **保持蓝灯**：林天色盘（7档EJS行为核心）、user受害者档案、11 个阶段EJS（渲染后每轮输出当前阶段约 400-1000 字）、世界观/约束/系统规则/MVU
4. 使用规则：AI 识别身份用速览表；角色登场/对话时角色名触发加载完整档案

### token 数据（ejs 真实渲染估算，过滤禁用条目）
- 改造前：22 档案+调色盘全蓝灯 ≈ 37,000 tokens/轮 固定注入
- 改造后：蓝灯 36 启用（+7 禁用不注入）≈ **17,361 tokens/轮** 固定注入（EJS 渲染 9.2K 字 + 静态 60.2K 字）
- **节省约 54%**；档案/调色盘仅在角色出现时注入（触发式）
- 灯色统计：98 条目 = 蓝灯 43（含 7 禁用）+ 绿灯 51

### 构建验证
- 构建 0 errors；PNG 2.81MB（98 entries）；本地 card.json 943KB

## 18. 2026-08-07 代号真名化 + 财富等级完整化（用户要求全卡一致）

用户要求：女1~女10、A1~A15 等代号换成真名和具体解释，全卡一致。

### 女N → 真名（内容层 100% 替换，75 个文件）
- 变量路径：`stat_data.绑定花名册.女N` → `stat_data.绑定花名册.真名`（陈雪华/林雅芝/王秀兰/赵敏/孙莉/周慧敏/吴琼/郑秀/苏婉/沈梦瑶）
- 覆盖：schema.ts、mvu-schema.js（运行时 schema 真身）、initvar（women key + k==='苏婉' 判断）、变量列表、变量更新规则（${真名|...} 模板 + 4.7.9/4.7.10）、变量输出格式、状态栏 HTML（DEFAULT_STAT 真名键）、10 调色盘 + 10 阶段EJS（getvar 路径）、10 语料库、家属文件、角色控制器、SQL填表规则、worldbook.yaml 分区注释
- 范围表述："女1~女10"→"陈雪华~沈梦瑶"、"女1-女8"→"已绑定的8名女性"
- **文件名保留**（女1-陈雪华.txt 等，worldbook content 路径不变，避免断链）
- 替换验证：内容层女N 残留 0；语法（node --check）与 EJS 渲染 22 个条目全过

### A 级 → 完整资产解释（财富等级体系重写）
- A1-A15 完整对照表：等级名+资产区间+社会地位+绑定名额（A1 贫困户<1万 → A9 准巨富1-5亿 → A10 巨富10亿 → A11 大富500亿 → A12 豪富1000亿 → A13 富可敌国5000亿 → A14 万亿级 → A15 首富）
- 明确 A9 以下逐级+1 名额，A10 起名额封顶 10；A9 初始=5亿（等级上限）
- 全卡 A 级引用（水军阈值 A7+/A9+、系统商店积分、主角档案 A9）与对照表一致

### 验证
- 构建 0 errors；PNG 2.81MB（98 entries）；本地 card.json 958KB
- ⚠️ 变量路径改动 → 旧存档变量断链，需开新档
