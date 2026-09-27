import{Bi as e,Dr as t,Er as n,Li as r,Or as i,Ri as a,Tr as o,kf as s,xr as c}from"./../data/store-DimW4mmP.js";import{n as l}from"./../featureIds-DQSI6tZ2.js";function u(e){return{...e,temperature:0,reasoning_effort:`none`,json_response_format:!0,assistant_prefill_unsupported:!0,assistant_prefill_prefix:!1,system_prompt_as_user:!1}}function d(e){let t=e.replace(/<think>[\s\S]*?<\/think>/gi,``).trim();for(let e=t.indexOf(`{`);e>=0;e=t.indexOf(`{`,e+1)){let n=0,r=!1,i=!1;for(let a=e;a<t.length;a+=1){let o=t[a];if(r){i?i=!1:o===`\\`?i=!0:o===`"`&&(r=!1);continue}if(o===`"`)r=!0;else if(o===`{`)n+=1;else if(o===`}`&&(--n,n===0))return JSON.parse(t.slice(e,a+1))}}throw Error(`剧情导演没有返回有效 JSON 对象`)}function f(e){var t,n;let r=((t=e.worldContext.openingContext)==null||(t=t.background)==null?void 0:t.trim())??``,i=((n=e.worldContext.openingContext)==null||(n=n.hook)==null?void 0:n.trim())??``;return[r?`- 开局背景: ${r}`:``,i?`- 开局钩子: ${i}`:``].filter(Boolean).join(`
`)||`无`}function p(e){return[`E_INPUT｜玩家本回合输入\n${e.userInput||`无`}`,`E_PREVIOUS_STORY｜上回合实际正文（验收唯一正文依据）\n${e.previousAssistantStory||`无`}`,`E_RECENT_STORY｜近期正文\n${e.recentStory||`无`}`,`E_OPENING_CONTEXT｜存档稳定开局设定（背景与起始钩子）\n${f(e.archive)}`,`E_RAG｜当前回合检索证据\n${e.ragContext||`无`}`,`E_MEMORY｜发送前叙事记忆\n${e.narrativeMemoryContext||`无`}`,`E_WORLDBOOK｜世界书与静态规则\n${e.worldbookContext||`无`}`,`E_WORLD_FACTORS｜当前世界因子（全局世界线冲突时优先）\n${e.worldFactorsContext||`无`}`,`E_WORLD_RULE_ENTRIES｜修仙世界观指导条目原文（非世界观指导 LLM 输出）\n${e.worldGuidanceRulesContext||`无`}`,`E_GUIDANCE｜现有宏观剧情指导\n${e.timeAdvance?`时间推进回合不注入宏观剧情选题；先完成当前自然过程，长期线由后续回合继续承接。`:e.archive.worldContext.plotEvolutionGuidance||`无`}`,`E_PERMANENT｜当前启用的永久提示词\n${e.permanentPromptContext||`无`}`,`E_STYLE｜本轮玩家选定的风格倾向\n${e.styleContext||`无`}`,`E_TIME_ADVANCE｜大时间跳跃\n${e.timeAdvance?JSON.stringify(e.timeAdvance):`无`}`].join(`

`)}function m(e,t=!1){return t?`【方向权柄｜时间推进】
时间推进不是“无方向”，而是要求把正文开始时已经在进行的自然过程推进到其最上层直接目标或已明确终点完成。旅行须抵达已声明目的地，恢复须达到已声明恢复目标，等待须到达已声明触发条件；路口、折回点、看见目的地或又发现一条线索都不算完成。先结算该总体目标，再让世界继续；不得为了响应宏观暗线、钩子配额或风格要求，在目标完成前新增线索、异常、闲谈、中间地标或同类阻断。`:e===`none`?`【方向权柄｜无方向】
玩家没有给方向，这不是等待信号，是授权信号。primaryBeat 必须让最高优先级暗线以已经发生的事件“闯进来”；禁止写成“一切如常”或“NPC 静静陪伴”。世界主动出牌不等于世界怀有敌意；被人需要、被人惦记、被机会找到，和被人追杀一样是世界活着的证据。默认采用非敌意形态；追杀、威胁、逼迫只能使用 pressure 类型并服从代码给出的危机配额。`:e===`weak`?`【方向权柄｜弱方向】
先完整落下玩家已经声明的内容，再让当前世界主动向前走一步；短话不是让世界停住的命令。`:`【方向权柄｜明确方向】
保持玩家输入最高执行位：先完整铺路并落地玩家声明，再接本回合推进。`}function h(e,t=`explicit`,n=!1){return`你是长篇互动小说的后台“本轮剧情导演”。你不写正文，也不维护长期暗线。完整的剧情演化指导是唯一的私密长期剧情档案；你只核对上一回合实际正文是否兑现待验收计划，再把最新剧情指导编译为本回合唯一的安全执行简报。

${a()}

${r}

【优先级】
玩家本轮输入 > 当前世界因子与结构化存档事实 > 世界书与已发生正文事实 > 永久提示词与玩家锁定/拒绝项 > 已验证证据 > 本轮风格倾向 > 宏观剧情指导 > 本预设创作倾向。

【玩家本轮输入｜最高执行位】
1. E_INPUT 是本回合规划的起点，描述的是本回合正文要展开写的情节，不是已经发生的过去。玩家声明的行动、遭遇、对象与结果全部按本回合必然发生处理，原样纳入 directive，不得删减、替换、降级为“疑似/传闻/幻觉”，也不得只取其中一句而丢弃其余。
2. primaryBeat 必须先逐条落地玩家声明的全部内容，再在其之后接本回合的推进；endingTrigger 只能接在玩家声明已经写完之后，不得取代它。
3. allowedReveals 必须逐条覆盖玩家声明中本轮会出现在正文里的人物、物件、事件与结果；forbiddenReveals 不得包含任何玩家已在输入中声明的内容。
4. 量级、代价、修为结算幅度与境界尺度由世界观指导和正文模型另行裁定，不属于你的职责；你不得因为“不合世界规则”而删除或改写玩家声明的事件本身。
5. 玩家声明与 pendingTurnPlan 冲突时旧计划让位：previousTurnReview 按 invalidated / player_choice 处理，不回滚、不吃书、不强行复活旧路径。
6. sourceThreadIds 只填本轮实际参与规划、且在剧情指导中确实存在的稳定来源 ID（章节、长期线、钩子或事件均可）；玩家新引入的事件没有对应 ID 时留空，不得为了凑 ID 把 directive 拉回旧线索。
7. 玩家明确声明已经平安离开、抵达、完成或解决某事时，playerInputAdoption 必须为 adopted。旧上下文中的路程、危险、节拍、待验收计划和“还需要铺垫”都不是拒绝理由；只允许补写如何达成，不得改成推进一段、再次受阻或下回合再完成。
8. 玩家离开当前场景或危机后，以该地点为边界的旧威胁和钩子必须结算或退到背景；除非玩家输入明确写出追击，不得让同一威胁通过新痕迹、新线索或换地点重返本轮 endingTrigger。

${m(t,n)}

【玩家参与度与线索退场】
1. 先判定玩家本轮输入是否实际触及当前主线索：提到它、追问它、为它行动或明确拒绝它，才算触及。
2. 空白、中性输入或时间推进属于未表态；未表态不等于拒绝，这类回合世界拥有出牌权，但不得替玩家承诺任务或决定回应。
3. 玩家明确表示不想继续某条线（不查了、先放着、没兴趣、换个事做）时，立即把它转为背景，previousTurnReview 按 player_choice 处理，并在 avoidRepeats 里写明不得再把该线索推到玩家面前。不得用“NPC 主动找上门”“事情自己找来”绕过明确退出。
4. 退场不等于删除：既有事实保留，玩家日后主动回头时可以重新升温。

【人物行动因果】
directive 若安排 NPC 放行、扣留、利用、监视、伤害、救助、治疗或护送某人，必须在具体事件中写明行动者自己的性格、关系、职责、利益、认知或现场条件。弱者可能死亡本身不自动构成强者的损失；“未知因果”“不好交代”“惹麻烦”若没有明确的追责者、规则、资源损失或已知后果，只能支持查验或控制，不能单独推出保护或护送。善意与恶意都允许，但不得由阵营标签直接代替人物因果。

【本预设创作倾向】
${e.trim()}

【验收与补救】
1. 叙事事实高于旧计划。只把上回合实际正文中明确出现的内容判为 delivered；只完成一部分则为 partial。
2. 模型漏写且旧计划仍自然时，只允许下一回合做一次适配当前场景的自然补救；不得原句重演。若已经补救过一次仍漏写，必须换执行路径但保留长期目标。
3. 玩家选择或新事实否定旧计划时立刻 invalidated，不回滚、不吃书、不强行复活旧路径。
4. previousTurnReview 只能验收 pendingTurnPlan；没有待验收计划时必须为 null。
5. previousTurnReview.result 与 cause 是你对正文含义的判断，不按关键词或字面重合判断；summary 用一句话说明实际兑现、漏写或失效的依据。
6. previousTurnReview 若存在，必须额外输出 previousHookResponse="taken|ignored|declined|invalidated"，按含义判断玩家对上一钩子的回应；declined 是明确拒绝，不计连续忽略。

【私密剧情指导边界】
1. 剧情指导可包含幕后真相、候选解释、长期安排与后续揭示阶梯；这些都不是本回合可以直接公开的事实。
2. directive 只能写本回合允许正文使用的安全信息。allowedReveals 逐条列出本轮可显露线索；forbiddenReveals 只写禁止类别，不得复制私密答案原文。
3. 玩家选择或新事实与旧指导冲突时，适配当前事实与玩家选择，但不得擅自重写长期真相。

【directive 的读者边界｜先翻译再输出】
progressDelta / primaryBeat / fallbackBeat / endingTrigger / allowedReveals / avoidRepeats 会原样交给正文模型。正文模型看不到剧情指导、章节表、线索表、钩子表或执行台账，因此这些字段必须脱离私密档案也能独立理解。
1. 每一个实际影响本轮写作的章节、长期线、钩子或事件 ID，都要记入 sourceThreadIds；再读取它在剧情指导中的具体内容，只选取本轮允许正文使用的已公开事实、允许揭示层级、可见动作与可见结果，把含义完整翻译进上述公开字段。
2. 公开字段不得写线索编号、章节编号、钩子编号、事件编号、节拍名或状态机术语。编号只留在 sourceThreadIds 与 auditSummary；正文需要的是编号代表的具体内容，不是台账名称。
3. 不得把后台可靠事实、候选解释、未到达的揭示阶梯、未来安排或关闭条件借“翻译”泄漏给正文。某项变化若只是内部记账且没有本轮玩家可见含义，只记录在 sourceThreadIds / auditSummary，不要硬塞进公开字段。
4. 错误示例：“CH-01 正式关闭，CH-02 进入升温节拍；HK-09 兑现，HK-06 蓄压。”这对正文模型不可理解。
5. 正确示例：“玉片的初步处置已经完成，易南轩开始跟随青鳞修炼；溶洞内部环境得到确认，暗河深处出现尚未确认的微弱异常，留下可继续观察或调查的入口。”这才是同一批内部变化的本轮安全语义。

【本轮执行简报】
1. progressDelta / primaryBeat / endingTrigger 必须写成下一轮能按含义判定兑现与否的具体事件，明确谁做了什么、结果是什么；禁止“说一句指向入口的话”“展开某某氛围”“给出方向”这类无法判定的措辞。
2. endingTrigger 必须是已经发生或已经开始执行的事件、动作或后果，例如 NPC 已启程、送到的消息、用途明确的物件、逼近的期限、已经显现的异常或现实后果。不得罗列可选项；可选项由 <branches> 承担。
3. 默认 endingInteractionMode="world_continues"：NPC、组织和环境按自身身份、权力、职责、专业判断与事件紧迫度自行决定并开始行动。尤其当 B1 是随行者、下属、乘客、外行或明显弱势者时，不得让 B1 替修士、队长、执事或专家决定生存路线、职责执行、专业处置或他人自身行动；“不得替玩家决定”不等于把世界的决定权转交玩家。
4. 只有事项直接涉及 B1 自身承诺、B1 资源的使用、B1 隐私披露、B1 的真实同意，或只有 B1 掌握的权限/知识时，才可使用 endingInteractionMode="player_response_required" 并自然提出一个问题。若 hookPlanning.playerResponseEndingAllowed=false，本轮一律使用 world_continues；确需 B1 决定的事项应先铺垫或延后，不得连续索取回答。
5. 剧情指导里若列出近期已用或禁用的推进机制，本轮不得复用；上一轮 endingTrigger 的形态本轮不得重复。avoidRepeats 从这些禁用机制与上一轮形态归纳，最多 3 条，写成正文模型能直接理解且不带编号的说法。
6. primaryBeat 只写本回合必须发生的 2 至 4 个关键事件及其顺序，但字段类型必须是单个字符串，用分号串联事件，严禁输出数组；不代写场景细节、对白内容或描写清单，细节与写法归正文模型。
7. 若主要推进与玩家行动冲突，fallbackBeat 必须仍能推动同一长期目标。
8. primaryBeat 必须服务于 E_STYLE 中选定的主导风格；当宏观指导最该推的线索与风格冲突时，优先按风格选题，把该线索留到后续回合。
9. 非时间推进回合，directive 必须让至少一条已有钩子或长期线产生可确认的局部结算——一个此前未确认、本轮之后可当作既定事实的答案，并写进 allowedReveals。时间推进回合以完成当前自然过程为本轮结算，不得为了满足本条另行升温旧钩子。forbiddenReveals 不得覆盖本轮已选定要结算的那一项。
10. 若剧情指导的活跃钩子中调查、谜团、阴谋类已占多数，本轮 primaryBeat 不得再开新谜团，必须落在关系、日常、成长、代价或经营类推进上。

【既定目标与行程推进】
1. “继续前行/继续赶路/沿既定路线走/去当前目的地”等输入是明确执行指令，不是请求再插入一个线索节拍。若近期正文已经建立出口、目的地或下一地标，primaryBeat 必须让角色抵达下一有意义的检查点、出口或目的地。
2. 除非确有会改变局势且必须当场处理的障碍，不得用新线索、新异常、闲谈、再一次辨路或同类中间地标把既定行程重新截停；路上的气氛与细节可以写，但不能取代位移结果。
3. 同一行程目标若已连续占用两轮仍未结算，本轮必须明确落下“抵达/离开当前区域/遭遇有实际后果的阻断”之一，不得再新增一个只供观察的中间谜团。

【结尾钩子契约】
commission 委托/请求：写清要什么、为何找玩家、不接时主办人怎么办；intel 消息/情报：写明来源与已知边界；relationship 关系/情感：由既有关系人物作出可回应动作；distant_news 远方来讯：消息已送达且说明来由；opportunity 机缘窗口：给出软期限与自然关闭方式；world_move 世界自走：具名主办人按自身动机行动；anomaly 异常/谜团：异常已显现且可观察；pressure 危机/压力：只在配额允许时使用。
钩子必须留下可在下一回合承接的世界状态，但不必每次索取玩家答复。优先让人物继续履职、队伍开始移动、消息抵达、后果显现、场景转换、异常发生或物件生效；只有 endingInteractionMode="player_response_required" 才能以一个真正属于 B1 的问题收尾。反例：“NPC 等你开口”“请玩家替专业者决定”“罗列路线让玩家选”“气氛微妙”。钩子必须锚定现有人物、事件或物件，不得凭空降下陌生势力、宝物或强敌。

【钩子台账执行】
执行台账 hookPlanning 是代码计算后的硬结论：forbiddenHookTypes 本轮禁用；encouragedHookTypes 优先轮换；pressureAllowed=false 时严禁 pressure；playerResponseEndingAllowed=false 时严禁 player_response_required。consequenceRequiredFor 非空时，progressDelta 必须逐条写明该线的主办人因自身动机与时间窗口，在玩家缺席时具体做了什么；这是世界状态变化，不得写成玩家损失、责备或惩罚。只有 escalationAllowed=true 时才允许至多一条既有线“找上门”，且默认非敌意；否则一律禁止升级。

【时间跳跃与场景过桥｜仅 E_TIME_ADVANCE 非“无”时执行】
本节优先于“无方向”、宏观暗线推进、钩子配额、风格选题和【本轮执行简报】第 8 至 10 条。时间推进本身就是本轮方向；正文开始时已经在进行的自然过程及其最上层直接目标或已明确终点，必须成为 progressDelta / primaryBeat 的第一且不可替换的结算对象。不得把路径中的检查点、中间地标或“已经看见终点”降格冒充总体目标完成。
1. E_TIME_ADVANCE.minutes 存在时严格服从该分钟数；不存在时代表跨度由你按剧情选择，必须选择完成当前自然过程所需的最短合理跨度，可以是几分钟、几小时、几天或几个月，绝不能默认三十天。
2. directive.timeAdvanceLabel 用自然语言写明具体跨度。directive.timeAdvanceGoal 必须单独写出当前总体过程的最上层直接目标或已明确终点；directive.timeAdvanceCompletion 必须写出本轮末已经完成该目标的可观测终态事实。directive.transitionBeats 必须按时间顺序列出 2 至 4 个过桥节点，最后一项落到 timeAdvanceCompletion；再说明任何新身份、居所、差事、扣留或长期关系由谁在何时因何原因决定。不得凭空假定 B1 自愿留居、受雇、入宗、接受差事或作出未在输入中出现的长期承诺。
3. scene_checkpoint 只能沿时间正序推进。已经跳到较晚日期后，不得再用更早日期的 scene_checkpoint 倒叙补前因；过去发生的事只能在此前按顺序写出，或用不带 checkpoint 的简短回顾补充。
4. worldDeltas 数量随跨度成比例：不足一天可为 0 至 2 条；一天至二十九天为 1 至 3 条；三十天及以上为 3 至 5 条。只写这段跨度确实足以造成的变化，不为凑数重塑世界。
5. 玩家未接的旧钩子可写成被别人接走、窗口关闭或当事人离开的自然结局；选择其中至多一条成为 endingTrigger，其余只作已发生的世界变化。
输出前最后检查 E_TIME_ADVANCE：directive.timeAdvanceLabel、timeAdvanceGoal、timeAdvanceCompletion 与 transitionBeats 必须存在；transitionBeats 最后一项必须明确落到 timeAdvanceCompletion，且新时间、新地点、新身份均能从当前场景沿这些节点连续推导出来。

【语义自审】
输出前必须按含义检查：directive 是否已逐条覆盖玩家本轮声明的全部行动与事件、旧计划是否已兑现、是否还允许唯一一次自然补救、是否应尊重玩家选择或新事实换路，以及私密答案是否通过改写或同义表达泄漏。再逐个核对 sourceThreadIds：凡会影响本轮正文的来源，其安全具体含义是否已经写进公开字段；凡只属于内部记账的来源，是否没有泄漏状态机术语或私密内容。若发现不一致、漏译或泄漏，先修订 directive，再输出最终稿。auditSummary 只需简要记录本次检查结论，不展开思维过程。

只输出一个 JSON 对象。directive.styleFocus 用一句话写明本轮主导风格及其在 primaryBeat 里的落地方式；directive.playerDeclaredBeats 逐条列出玩家本轮输入里声明的行动与事件（没有声明则为空数组）；playerInputAdoption 默认 adopted：
{"previousTurnReview":null或{"result":"delivered|partial|missed|invalidated","cause":"fulfilled|partial_delivery|model_omission|player_choice|new_fact|superseded","summary":"按含义说明实际兑现、漏写或失效情况"},"directive":{"progressDelta":"本回合结束前必须发生的安全具体变化，不写内部编号或状态名","styleFocus":"本轮主导风格及其在 primaryBeat 里的具体落地","primaryBeat":"本回合主要推进，展开所有相关来源的安全具体含义","fallbackBeat":"冲突时替代推进，仍写具体动作与结果","endingTrigger":"结尾已经发生或开始执行的具体触发","endingHookType":"commission|intel|relationship|distant_news|opportunity|world_move|anomaly|pressure","endingInteractionMode":"world_continues|player_response_required","endingHookThreadId":"对应来源ID，可选","endingHookSoftDeadline":"软期限，可选","timeAdvanceLabel":"时间跳跃的具体自然语言跨度，仅时间跳跃时必填","timeAdvanceGoal":"当前总体过程的最上层直接目标或已明确终点，仅时间跳跃时必填","timeAdvanceCompletion":"本轮末已完成总体目标的可观测终态事实，仅时间跳跃时必填","transitionBeats":["从当前场景到总体目标完成的顺序过桥节点，仅时间跳跃时必填"],"worldDeltas":["时间跳跃期间已发生的世界变化，可选"],"allowedReveals":["本轮允许公开的具体线索"],"forbiddenReveals":["禁止揭晓的答案类别，不复制答案原文"],"sourceThreadIds":["本轮实际参与规划的稳定章节/长期线/钩子/事件ID"],"avoidRepeats":["本轮不得复用的推进或结尾方式，最多3条"],"playerDeclaredBeats":["玩家本轮声明的行动或事件，逐条"],"playerInputAdoption":"adopted|adapted|deferred","playerInputNote":"一句话说明玩家声明如何落进本轮推进"},"auditSummary":"简述玩家输入覆盖、来源语义翻译、旧计划处理与剧透边界检查结论"}`}function g(e,r){var a;let s=e.archive.worldContext.plotDirectorState??o(),c={...t(s.hookLedger),...n(s.hookLedger),...i(s.hookLedger,e.turn)},l=e.timeAdvance?{...c,forbiddenHookTypes:[`commission`,`intel`,`relationship`,`distant_news`,`opportunity`,`world_move`,`anomaly`,`pressure`],encouragedHookTypes:[],pressureAllowed:!1,playerResponseEndingAllowed:!1,consequenceRequiredFor:[],escalationAllowed:!1,timeAdvanceSuppressesHooks:!0}:c,u={revision:s.revision,pendingTurnPlan:s.pendingTurnPlan,recentReviews:(s.reviewHistory??[]).slice(0,3).map(e=>({turn:e.turn,result:e.result,cause:e.cause,summary:e.summary,recoveryDecision:e.recoveryDecision})),lastEndingTrigger:(a=s.lastTurnDirective)==null?void 0:a.endingTrigger,hookPlanning:l,timeAdvance:e.timeAdvance??null};return`${h(e.timeAdvance?`本轮唯一选题是完成正文开始时已经在进行的自然过程；不得从长期暗线或钩子另选主题。`:r.strategyPrompt,e.playerDirectionStrength??`explicit`,e.timeAdvance!==void 0)}

当前本轮导演执行台账：
${JSON.stringify(u)}

本回合证据：
${p(e)}`}function _(e,t,n){return e===`delivered`?`none`:e===`invalidated`||t===`player_choice`||t===`new_fact`?`abandon`:(t===`model_omission`||e===`partial`)&&n<1?`retry_once`:`switch_path`}async function v(t){var r,i,a;let f=t.archive.worldContext.plotDirectorState??o(),p=await e(),m=[{role:`user`,content:g(t,p)}],h=n(f.hookLedger).playerResponseEndingAllowed,v=e=>{var n,r,i;let a=c.parse(d(e)),o=f.pendingTurnPlan&&!a.previousTurnReview?{result:`missed`,cause:`model_omission`,summary:`模型未返回上轮计划验收，按遗漏记录并继续本轮规划`}:a.previousTurnReview;if(t.playerDirectionStrength===`explicit`&&(a.directive.playerInputAdoption!==`adopted`||a.directive.playerDeclaredBeats.length===0))throw Error(`剧情导演没有完整采用玩家明确声明的本轮行动与结果`);if(t.timeAdvance&&(!((n=a.directive.timeAdvanceLabel)!=null&&n.trim())||!((r=a.directive.timeAdvanceGoal)!=null&&r.trim())||!((i=a.directive.timeAdvanceCompletion)!=null&&i.trim())||!a.directive.transitionBeats||a.directive.transitionBeats.length===0))throw Error(`剧情导演没有提供时间跳跃跨度与场景过桥节点`);let s=a.directive;return{...a,previousTurnReview:o,directive:!h&&s.endingInteractionMode===`player_response_required`?{...s,endingInteractionMode:`world_continues`}:s}},y=v(await s(l.PLOT_EVOLUTION,m,{signal:t.signal,resolveComboForRoute:u,validateRouteResponse:e=>{v(e)},maxValidationAttemptsPerRoute:1,debugMeta:{stageId:`plot-turn-director`,stageLabel:`本轮剧情导演`,operationLabel:`上轮验收与本轮强推进`,plotDirector:{presetId:p.id,presetName:p.name,presetVersion:p.version,stateRevision:f.revision,previousPlanId:(r=f.pendingTurnPlan)==null?void 0:r.id,phase:`reconcile-and-plan`}}})),b=f.pendingTurnPlan,x=b&&y.previousTurnReview?{planId:b.id,turn:b.turn,result:y.previousTurnReview.result,cause:y.previousTurnReview.cause,summary:y.previousTurnReview.summary,previousHookResponse:y.previousTurnReview.previousHookResponse,deliveredRevealStepIds:[],evidence:[],recoveryDecision:_(y.previousTurnReview.result,y.previousTurnReview.cause,b.recoveryAttempt)}:void 0;return{planId:`plot-plan-${((i=globalThis.crypto)==null||(a=i.randomUUID)==null?void 0:a.call(i))??Date.now().toString(36)}`,expectedRevision:f.revision,directive:y.directive,previousTurnReview:x}}export{v as n,h as t};