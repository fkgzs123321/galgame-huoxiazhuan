import"./../data/store-DimW4mmP.js";import{t as e}from"./../react-BHeFgTA0.js";import{i as t,r as n}from"./../db-DA34zuyh.js";var r=`CULTIVATION_BRANCH_OPTIONS_CONFIG_V1`,i=`mortal-branch-options-preset`,a=`builtin-default`,o=`builtin-story-outline`,s=o,c=new Set([a,o]),l="${branchOptionsProtocol}.${branchOptionsComposition}.${推进选项构成偏好}.${actionOptionCount}.${当下行动数量}.${narrativeOptionCount}.${叙事推力数量}.${userInput}.${storyText}.${playerSnapshot}.${playerItems}.${玩家物品}.${worldGuidanceRules}.${timeLocation}.${recentStoryText}.${onScreenNpcs}.${currentTasks}.${sceneContext}.${worldFactors}.${plotEvolutionGuidance}.${previousDirectorGuidance}.${personalityCore}.${playerLongTermPlans}.${personality_core}.${主角性格}.${人格核心}.${dailyPaperContext}.${daily_paper_context}.${previousDailyPaper}.${上一封世界日报摘要}".split(`.`),u="《Mortal 推进选项独立生成器 · 故事正文版》,,你只负责为刚生成的主聊天正文补全推进选项。每个选项都是玩家点选后将进入的实际故事内容，不是作者说明、创作层描述或多种可能走向。,所有选项都是从同一个正文尾部出发的并列候选，互相独立、互斥，不得串成连续剧情链。,不要续写正文，不要输出解释，不要输出思维链。,最终输出必须且只能包含一个完整的 <branches>...</branches> 块；不要在块外输出任何内容。,,【推进选项协议】,${branchOptionsProtocol},,【选项构成偏好】,${branchOptionsComposition},,【本轮玩家输入】,${userInput},,【刚生成正文（已清洗）】,${storyText},,【B1 主角关键信息摘要】,${playerSnapshot},,【B1 当前可用物品】,以下清单只列当前实际持有/可调动的物品。历史小结、已完成任务、战斗摘要中出现过的消耗品或底牌，不代表当前仍持有；若本清单没有该物品，不得在选项中写扣住、使用或消耗该物品。,${playerItems},,【主角性格】,${personalityCore},,【玩家长期规划】,${playerLongTermPlans},,【修仙世界观指导全量条目】,${worldGuidanceRules},,【补充上下文】,当前时间地点天气：${timeLocation},,近期事态：,以下只是不含历史正文原文的前情小结；不得把它当成当前落点。推进选项必须锚定上方【刚生成正文（已清洗）】的正文尾部。,${recentStoryText},,上一封世界日报摘要：,${dailyPaperContext},,在场 NPC：,${onScreenNpcs},,当前任务：,${currentTasks},,场景/地图：,${sceneContext},,世界因子：,${worldFactors},,剧情演化指导：,${plotEvolutionGuidance},,【输出】,只输出一个 <branches>...</branches> 块；每项正文必须完整包在同一个 [] 内。".split(`,`).join(`
`),d=`<branches>`,f=[`《Mortal 推进选项独立生成器》`,``,`你只负责为刚生成的主聊天正文补全推进选项。不要续写正文，不要输出解释，不要输出思维链。`,`最终输出必须且只能包含一个完整的 <branches>...</branches> 块。`,``,`【推进选项协议】`,String.raw`
### 【Mortal 推进选项生成协议】
以下规则由 Mortal 运行时注入，只约束主聊天正文结束后的 <branches> 推进选项。
它高于正文预设中关于推进选项数量与格式的旧描述。

推进选项生成协议

职责：将当前场景信息转换为 10 个格式化选项。输出约束正文后的选项区域。

一、角色与核心原则

你是谁：非作者。职责：从当前场景中提取可接触面，生成 10 个选项。不创造事实、不设计走向、不替玩家决定。只呈现世界中可接触面。

五大原则：

1. 呈现而非反馈：选项呈现可接触面，不是对玩家行动的反馈。
2. 低规模不拖链：低规模行动反馈即时结束，不含调查、怀疑、代价链。
3. NPC 独立性：涉 NPC 选项自检——「没有玩家时这个 NPC 今天还会这样做吗？」须肯定。NPC 无默认恶意。
4. 可选而非强推：任何选项玩家可以不选，没有「不选就倒霉」的强制危机。
5. 吸引力驱动：推进力来自选项本身的吸引力，不来自压力或威胁。

质感自检：是否承诺超阶段收益？NPC 无来由关注？凭空飞跃？有问题重写。

二、输出格式

2.1 容器规则（硬性）

- 普通非接管回合正文后必须输出 <branches>...</branches>，不可省略。
- 战斗触发回合与双修触发回合是接管回合，不输出 <branches>。
- 不因 NPC 提问、场景悬停、情绪停顿而跳过。
- <branches> 成对出现，严格包裹全部 10 项。禁止残缺、嵌套、跨段。
- [] 只用于包裹选项正文，禁止用于注释或嵌套标签。

2.2 模板

<branches>（处事风格:互动型 | 行为义务:向外触及 | 行动方式:直接）[正文。]（处事风格:回避型 | 行为义务:远离/隐藏 | 行动方式:潜隐）[正文。]（处事风格:探索型 | 行为义务:获取信息 | 行动方式:间接）[正文。]（处事风格:收敛型 | 行为义务:收缩范围 | 行动方式:潜隐）[正文。]（处事风格:进取型 | 行为义务:明确风险动作 | 行动方式:直接）[正文。]（处事风格:稳健型 | 行为义务:自保/防御 | 行动方式:潜隐）[正文。]（处事风格:规划型 | 行为义务:内部建设/整理 | 行动方式:间接）[正文。]（处事风格:即时型 | 行为义务:应激反应 | 行动方式:直接）[正文。]（处事风格:驻时型 | 行为义务:深耕当前时刻 | 行动方式:间接）[正文。]（处事风格:跃时型 | 行为义务:时间推进 | 行动方式:—）[跳过X时间。]</branches>

2.3 格式细则

- 标签结构：（处事风格:类型名 | 行为义务:xx | 行动方式:xx）
- 正文包裹：[正文。] 句号结尾，标签与[]间无空格
- 排列：第1对到第5对，倾向A到倾向B，连续排列无分隔符
- 跃时正文：正常情况为时间跨度加纲要（0到3项），零跳态为时间感知
- 固定项：10项顺序不可调换，跃时始终排第10槽

三、10选项槽位体系（5对）

每对各一槽，5对10槽，每对倾向A和倾向B须各出现一次。

第1对
  - 倾向A：互动型。主动接触场景中的人、物、地点。行为义务：向外触及的具体动作（搭话、触碰、靠近等）。
  - 倾向B：回避型。与特定目标拉开距离。行为义务：远离、隐藏、切断接触的具体动作（后退、绕行、塞入等）。

第2对
  - 倾向A：探索型。获取新信息，试探未知。行为义务：获取信息行为（观察、倾听、翻找等），禁止暗示机缘。
  - 倾向B：收敛型。固守位置或缩小范围。行为义务：收缩行为域的动作（退回、蹲守、收窄注意力等）。

第3对
  - 倾向A：进取型。承担风险的主动行动。行为义务：带明确风险的动作（突进、夺取、正面冲突等）。
  - 倾向B：稳健型。以自保防御为先。行为义务：防御性动作（扣法器、后退、敛息、藏匿等）。

第4对
  - 倾向A：规划型。调整状态、整理资源。行为义务：内部建设或资源管理（清点、调整、观察环境做计划）。
  - 倾向B：即时型。直接回应眼前局面。行为义务：直觉应激动作（闪避、接话、抓起、挡住等）。

第5对
  - 倾向A：跃时型。跳过时间推进剧情。行为义务：含时间跨度或时间感知，按细则执行。
  - 倾向B：驻时型。深耕当前时刻。行为义务：细密体察或延续性动作（感受、等待等），不推进时间线。

跃时型细则：
- 正常跃时：[跳过X时间：纲要1·纲要2。]
- 零跳态：[感知周围环境中的时间痕迹。] 不推进时间线，表达时间流逝觉察。
- 红线：禁止主角状态（修为、伤势、领悟、心境等），禁止凭空跳跃。

四、内容写作规范

- 每个选项须指定一种行动方式：直接、间接、潜隐。
- B1 行动使用中文自然的省略主语动作叙述，以具体动作或场景行为起句；不得跟随正文切换成第一、第二或第三人称。
- 在非对白叙述中，禁止用“我、你、他、她”、B1、玩家名或其它称谓指代 B1；直接对白中为保持语义所必需的自然人称不受此限制。
- NPC、势力或世界主动推进时必须明确写出行动主体，禁止把其他主体的行动写成无主句。
- 选项仅由具体行动、肢体动作、对白构成。
- 禁止：心理描写、目的说明、情感描述、纯环境铺陈、文学比喻。
- 战争迷雾：基于玩家已知情报，禁止透露玩家不可能知道的信息。
- 当前库存优先：选项中凡是“扣住、拿出、激发、使用、消耗”B1 的物品，必须以当前物品清单为准；历史正文、前情小结、已完成任务、战斗摘要中出现过的一次性底牌或消耗品，不代表当前仍持有。

五、输出前校验清单

逐项检查，有一项不通过则全部10项重写。

1. 风格覆盖：5对10槽全部出现了吗？
2. 素材依据：每条选项的动作在当前场景中有依据吗？
3. 战争迷雾：含有玩家不可能知道的信息吗？
4. 自然感：读起来像故事还是像填空题？
5. 物品库存自检：每个使用/消耗/扣住/拿出的玩家物品，都能在当前物品清单中找到吗？若只能在历史小结中找到，必须重写。
6. B1 行动是否采用省略主语的动作叙述，且非对白部分没有用任何人称或名字指代 B1？其他主动方是否明确写出了行动主体？
`.trim(),``,`【本轮玩家输入】`,"${userInput}",``,`【刚生成正文（已清洗）】`,"${storyText}",``,`【B1 主角关键信息摘要】`,"${playerSnapshot}",``,`【B1 当前可用物品】`,`以下清单只列当前实际持有/可调动的物品。历史小结、已完成任务、战斗摘要中出现过的消耗品或底牌，不代表当前仍持有；若本清单没有该物品，不得在选项中写扣住、使用或消耗该物品。`,"${playerItems}",``,`【主角性格】`,"${personalityCore}",``,`【修仙世界观指导全量条目】`,"${worldGuidanceRules}",``,`【补充上下文】`,"当前时间地点天气：${timeLocation}",``,`近期事态：`,`以下只是不含历史正文原文的前情小结；不得把它当成当前落点。推进选项必须锚定上方【刚生成正文（已清洗）】的正文尾部。`,"${recentStoryText}",``,`上一封世界日报摘要：`,"${dailyPaperContext}",``,`在场 NPC：`,"${onScreenNpcs}",``,`当前任务：`,"${currentTasks}",``,`场景/地图：`,"${sceneContext}",``,`世界因子：`,"${worldFactors}",``,`剧情演化指导：`,"${plotEvolutionGuidance}",``,`【输出】`,`只输出 <branches>...</branches>。`].join(`
`);function p(){return new Date().toISOString()}function m(){let e=p();return{id:o,name:`内置推进选项预设（剧情推进优化）`,promptTemplate:u,assistantPrefill:d,createdAt:e,updatedAt:e}}function h(){let e=p();return{id:a,name:`内置推进选项预设（旧版默认）`,promptTemplate:f,assistantPrefill:d,createdAt:e,updatedAt:e}}function g(){return[h(),m()]}function _(){return m()}function v(e){return c.has(e)}function y(){return`branch-options-${crypto.randomUUID()}`}function b(e){return e===`dedicated`?`dedicated`:`inline`}function x(e,t){let n=typeof e==`number`?e:Number(e);return Number.isFinite(n)?Math.max(0,Math.min(10,Math.trunc(n))):t}function S(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function C(e){return typeof e==`string`?e:``}function w(e,t){if(!S(e))return t?{...t}:null;let n=C(e.promptTemplate).trim(),r=C(e.content).trim(),i=n||r||(t==null?void 0:t.promptTemplate);if(!i)return null;let a=p();return{id:C(e.id).trim()||(t==null?void 0:t.id)||y(),name:C(e.name).trim()||(t==null?void 0:t.name)||`推进选项预设`,promptTemplate:i,assistantPrefill:C(e.assistantPrefill).trim()||(t==null?void 0:t.assistantPrefill)||`<branches>`,createdAt:C(e.createdAt).trim()||(t==null?void 0:t.createdAt)||a,updatedAt:C(e.updatedAt).trim()||a,...t!=null&&t.source?{source:t.source}:{}}}function T(e,t){let n=w(S(e)&&S(e.preset)?e.preset:e);if(!n)throw Error(`推进选项预设缺少 promptTemplate。`);return{...n,id:v(n.id)?y():n.id,source:t}}function E(e){return{kind:i,schemaVersion:1,preset:{id:e.id,name:e.name,promptTemplate:e.promptTemplate,assistantPrefill:e.assistantPrefill}}}function D(){return{mode:`inline`,showBelowStory:!0,waitForDailyPaperBeforeGeneration:!1,actionOptionCountHint:2,narrativeOptionCountHint:2,activePresetId:s,presets:g()}}function O(e){let t=D();if(!S(e))return t;let n=Array.isArray(e.presets)?e.presets.map(e=>w(e)).filter(e=>e!==null):[],r=new Map;for(let e of n.filter(e=>!v(e.id)))r.set(e.id,e);let i=[...g(),...Array.from(r.values())],a=C(e.activePresetId).trim(),o=x(e.actionOptionCountHint,2),c=Math.min(x(e.narrativeOptionCountHint,2),10-o);return{mode:b(e.mode),showBelowStory:e.showBelowStory!==!1,waitForDailyPaperBeforeGeneration:e.waitForDailyPaperBeforeGeneration===!0,actionOptionCountHint:o,narrativeOptionCountHint:c,activePresetId:i.some(e=>e.id===a)?a:s,presets:i}}function k(e){return[`本轮选项构成偏好：当下行动约 ${e.actionOptionCountHint} 项，叙事推力约 ${e.narrativeOptionCountHint} 项。`,`X/Y 是构成参考，不是硬性数量；质量优先，总数不超过 10。`].join(``)}async function A(e){await t(r,e)}var j=e()((e,t)=>({config:D(),loaded:!1,loadConfig:async()=>{e({config:O(await n(r)),loaded:!0})},updateConfig:async n=>{let r=O({...t().config,...n});e({config:r,loaded:!0}),await A(r)},savePreset:async n=>{let r=w(n);if(!r)return;let i=t().config,a=[...i.presets.filter(e=>e.id!==r.id),{...r,updatedAt:p()}],o=O({...i,presets:a,activePresetId:r.id});e({config:o,loaded:!0}),await A(o)},deletePreset:async n=>{if(v(n))return;let r=t().config,i=r.presets.filter(e=>e.id!==n),a=O({...r,presets:i,activePresetId:r.activePresetId===n?s:r.activePresetId});e({config:a,loaded:!0}),await A(a)},importPreset:async(e,n)=>{let r=T(e,n);return await t().savePreset(r),r},resetActivePreset:async()=>{let n=t().config,r=O({...n,presets:n.presets.map(e=>e.id===n.activePresetId?{...e.id===a?h():m(),id:e.id,name:v(e.id)?e.id===a?`内置推进选项预设（旧版默认）`:`内置推进选项预设（剧情推进优化）`:e.name}:e)});e({config:r,loaded:!0}),await A(r)}}));async function M(){let e=j.getState();return e.loaded||await e.loadConfig(),j.getState().config}function N(e=j.getState().config){return e.presets.find(t=>t.id===e.activePresetId)??_()}export{E as a,v as c,M as i,T as l,l as n,k as o,D as r,N as s,r as t,j as u};