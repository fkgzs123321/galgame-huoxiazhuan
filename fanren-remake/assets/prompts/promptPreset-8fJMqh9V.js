import{i as e,r as t}from"./../db-DA34zuyh.js";import{n}from"./presetFiles-BJwIre4Q.js";import{n as r}from"./../featureIds-DQSI6tZ2.js";var i=`DUNGEON_PROMPT_CONFIG_V1`,a=`【成长 effect 字段契约】
effect 必须严格匹配下列一种，不得把专用字段改名为 art、artName；除 realm_progress 外，不得用通用 delta 替代专用字段：
- trait_gain: {"kind":"trait_gain","trait":{"name":"名称","description":"描述","source":"秘境"}}；rarity/effect 可选。
- trait_upgrade: {"kind":"trait_upgrade","traitName":"现有特质名","newRarity":"新稀有度"}
- skill_layer: {"kind":"skill_layer","skillName":"现有技能名","layerDelta":1}
- skill_grade: {"kind":"skill_grade","skillName":"现有技能名","newGrade":2}
- art_progress: {"kind":"art_progress","artKind":"artifact","progressDelta":5}；artKind 只能是 talisman|formation|alchemy|artifact|puppet|beastTaming|cooking|planting；必须给 progressDelta，或输出 {"kind":"art_progress","artKind":"artifact","tierUp":true}。
- realm_progress: {"kind":"realm_progress","delta":5}`,o={id:`default`,name:`默认秘境预设`,version:28,updatedAt:`2026-07-30`,stubTemplate:`你是修仙世界的秘境传闻生成器。请基于当前玩家、世界地图和用户补充指令，构思 1 座可探索秘境入口。

要求：
- 只生成地图上的传闻线索与入口，不生成内部房间结构。
- 避免与现有秘境重复。
- realmTier 是后续敌人和奖励的基准境界，必须结合玩家境界、任务、已知威胁和用户补充指令选择，不得为制造噱头随意拔高。
- realmTier 必须是单一标准境界，且精确等于合法白名单中的一个值：凡人；炼气一层、炼气二层、炼气三层、炼气四层、炼气五层、炼气六层、炼气七层、炼气八层、炼气九层、炼气十层、炼气十一层、炼气十二层、炼气十三层；筑基初期、筑基中期、筑基后期；结丹初期、结丹中期、结丹后期；元婴初期、元婴中期、元婴后期；化神初期、化神中期、化神后期；炼虚初期、炼虚中期、炼虚后期；合体初期、合体中期、合体后期；大乘初期、大乘中期、大乘后期；渡劫；真仙下位、真仙中位、真仙上位；金仙下位、金仙中位、金仙上位；太乙下位、太乙中位、太乙上位；大罗下位、大罗中位、大罗上位；道祖。
- realmTier 只能输出一个境界；不得输出多个境界、范围、斜杠、顿号组合、模糊词或说明文字，例如禁止“筑基后期/结丹期”“筑基至结丹”“结丹左右”“结丹以上”。
- sizeTier 只能是 small|medium|large，用于描述秘境规模：small 短程，medium 标准，large 长线多路径。
- entranceCoord 必须是 [x,y] 数组，靠近玩家所在区域；若用户指定区域，优先落在该区域附近。

【玩家快照】
\${playerSnapshot}

【现有地图 POI / 秘境】
\${mapContext}

【用户补充指令】
\${userInstruction}

只输出 JSON：
{
  "name": "秘境名",
  "brief": "2~3 句传闻线索，留悬念",
  "realmTier": "境界定位",
  "sizeTier": "small|medium|large",
  "entranceCoord": [0, 0]
}`,blueprintTemplate:`你是修仙秘境设计师。据 stub 与当前故事，生成进入后的【秘境蓝图】。
只出结构与节点骨架，不写房间正文，不输出难度数值（难度由系统派生）。

【stub】
\${stubJson}

【玩家与队伍快照】
\${teamSnapshot}

【最近正文】
\${recentStory}

【难度参考】
\${difficultyContext}

要求：
1. 输出 theme/styleProfile。
2. realmTier 承接 stub。
3. sizeTier 必须承接 stub.sizeTier，只能是 small|medium|large。
4. roomDistribution 可省略；路线、房间数量和 DAG 分叉由系统按 sizeTier 生成，不要强行设计线性路线。
5. keyNodeOutline 每个关键节点一句 brief。
6. entranceCoord 承接 stub，exitCoord 按 sizeTier 给距离。

只输出 JSON：
{
  "theme": "秘境主题",
  "styleProfile": "视觉风格",
  "realmTier": "境界",
  "sizeTier": "small|medium|large",
  "bossConcept": "BOSS 概念",
  "keyNodeOutline": [{"nodeId":"key_1","brief":"关键节点简介"}],
  "entranceCoord": [0,0],
  "exitCoord": [0,0]
}`,nodeTemplate:`你是修仙世界的秘境叙事者。请为玩家当前抵达的【探索节点】生成叙事和节点内容。

重要定义：
- DungeonNode 是叙事节点/探索阶段，不一定是 actual 房间。
- 不要把每个节点都写成“推门/破门/进入石室”。只有入口或上下文明确是门时才写门。
- 可按节点类型写成深入甬道、靠近灵压源、转入阵纹区、抵达岔路、穿过残阵、发现核心气息等阶段推进。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【玩家】
\${playerSnapshot}

【当前秘境队伍】
\${teamSnapshot}

【当前秘境在场 NPC】
\${presentNpcSnapshot}

【房间类型提示】
\${kindHint}

【当前可见去路】
\${branchContext}

【秘境内连续性上下文】
\${continuityContext}

要求：
1. narrative 是抵达/观察当前探索节点的叙事，不是结算叙事；不要提前写本节点收益已经入体、修为已经增长、宝物已经入袋、伤势已经恢复。
2. 开头必须承接“秘境内连续性上下文”；不要无视上一段日志重新破门、重新进入洞府或重新发现入口。
3. narrative 最后一段必须自然衔接当前可见去路，让下方分支按钮不显得凭空出现。
4. branchHints 必须按“当前可见去路”的序号输出 2~8 字按钮短文案，只写玩家能观察到的方向、材质、气息或地势；严禁写出目标房型答案，例如宝藏、机关、战斗、BOSS、休整、机缘、陷阱。
5. “当前秘境在场 NPC”已在本秘境中登场，可以在 narrative 中旁观、引导、提醒、阻拦或评价；除非其已加入“当前秘境队伍”，不得把他们写成参战者、同行队友或替玩家行动。
6. dialogue 可选；只允许当前秘境队伍成员说话，speakerId 必须来自“当前秘境队伍”中列出的角色 ID。未入队的在场 NPC 不得写入 dialogue 数组，其存在感应放在 narrative。
7. 队友台词用于点出观察、提醒或情绪反应，不要替代正文叙事。
8. 必须严格遵守系统注入的叙事人称协议；旁白不要用错误人称称呼 B1。
9. 只允许当前秘境队伍、当前秘境在场 NPC 和当前节点内实际存在的实体出现在 narrative/dialogue；入口前主线中已离场、未入队且不在当前秘境的 NPC 不得进入当前节点正文。
10. 若房间类型提示为剧情，narrative 必须给出秘境背景线索、人物互动、环境异变或抉择动机之一；不要只写成普通走廊移动。

请输出 JSON：
{
  "narrative": "180 字内节点叙事，承接上一节点，描述当前探索阶段、危机感、初始印象，并自然交代可见去路；不写结算收益",
  "branchHints": [
    {"index": 0, "label": "左侧石阶"},
    {"index": 1, "label": "雾中甬道"}
  ],
  "dialogue": [
    {"speakerId": "C1", "speakerName": "队友名", "text": "一句队友台词，可省略"}
  ],
  "content": {
    "enemyConcepts": ["仅战斗/BOSS房填写：与叙事一致的敌人名或敌群概念"],
    "enemyBrief": "仅战斗/BOSS房填写：敌人外观、来源和战斗特征一句话"
  }
}`,mechanismTemplate:`你是修仙秘境机关设计师。请为当前机关房生成谜面与可执行解法。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【玩家与队伍】
\${teamSnapshot}

要求：
1. puzzleNarrative 写清机关现象、危险和线索。
2. solutions 给 2-4 个解法，label 将直接显示为按钮。
3. method 只能是 realm|art|stat|itemTag|beast|linggen|roll|force。
4. requirement 按 method 写必要字段，例如 minRealm、artKind/minTier、stat/minValue、tag/minRarity、linggen、beastRole。
5. 至少保留一个 roll 或 force 解法，避免无解。
6. 若队伍快照显示气运极高、世界之子或“奇遇必定正面”类词条，机关风险应偏向逢凶化吉，失败叙事不要写成不可逆重大损毁。

只输出 JSON：
{
  "puzzleNarrative": "机关谜面",
  "solutions": [
    {
      "label": "以阵法破禁",
      "method": "art",
      "requirement": {"artKind": "formation", "minTier": "初窥门径"},
      "allowAllies": true,
      "d100Threshold": 55,
      "successNarrative": "阵纹被逐层解开。",
      "failureNarrative": "阵纹反震，灵力紊乱。"
    }
  ]
}`,rewardTemplate:`你是修仙秘境宝库设计师。请为当前宝库房生成可即时结算的真实物品奖励。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【队伍】
\${teamSnapshot}

【物品与装备领域契约（必须遵守）】
\${itemContract}

【秘境内连续性上下文】
\${continuityContext}

【奖励规格（必须遵守）】
\${rewardSpec}

要求：
1. itemCommands 的数量必须严格服从“奖励规格”，每项都是完整 createItem({...}) 字符串，owner 必须是 "B1"；createItem 只能有一个对象参数，owner、item、acquisition、reason 必须全部位于同一外层对象内，闭合 } 后不得再追加字段或参数。
2. 每个 item 必须按物品 SSOT 写完整：名称、合法分类、描述、数量；装备/功法/丹药/符箓/阵具等必须按契约补 numeric.v1。
3. 功法奖励的 numeric 必须写 "kind":"technique" 和合法 subtype；只写 subtype/realmEffects 不算完整 numeric。
4. 功法 numeric.realmEffects 只写少量玩家可读语义锚点：每条包含 unlockRealm、description、statLines；它不是完整层表、解锁预算或倍率表。不要为了覆盖所有境界机械列满；没有独特文案的派生层由代码按 grade 生成。
5. 只有终局传承或主题明确说明该功法能辅助冲击某个大境界时，才可在对应境界段附加完整 breakthrough 对象：targetRealms 只写精确大境界入口，intensity 只写 minor/normal/major 且不超过稀有度上限；普通功法省略。禁止写成功率、品质点或公式。
6. 功法不要输出 rollFactor、realmEffectsNumeric、per-realm 数值、倍率、百分比或固定属性模板；description 只写修炼表现/意象，statLines 只写属性方向。
7. 秘境可掉落灵药种子、灵药幼株或成株；凡灵药/灵草/灵植/药苗/灵种奖励都必须写 category:"灵药" 与 numeric.kind:"herb"。灵药种子必须写 stage:"seed"、ageMonthsTotal:0、合法 herbEffect，不得写成普通材料。
8. 物品 ID 使用 I_B1_DG_TMP_ 前缀即可；系统会在入库前重写为当前秘境节点的唯一 ID，禁止照抄示例固定 ID。
9. 每件物品的 numeric.grade 和 numeric.rarityTier 必须同时满足“奖励规格”中对应逐件规格的上下限；终局传承宝库第 1 件必须是规格中的核心奖励，不得低于随同奖励。
10. 不要输出 lootSpec，不要输出 placeholder、泛称或只有品阶没有玩法字段的物品。
11. backlashBaseChance 为 0~1，标准宝库建议 0.08~0.2；若队伍快照显示气运极高、世界之子或“奇遇必定正面”类词条，应偏低；终局传承宝库必须为 0。
12. narrative 只写宝物显露、禁制、诱惑和风险，不要写玩家已经取得宝物。
13. preparedTexts 是点击后使用的短结算文案：每项 1 句，贴合当前房间氛围，遵守叙事人称；不要写具体属性、物品或数值变化。
14. 终局传承宝库（final_treasure）必须按秘境主题自适应：第 1 件是核心传承/镇殿宝物/秘境遗宝；只有奖励规格允许第 2 件时，才可补一件丹药、材料、符箓、灵药种子或阵具添头；不要写反噬风险。
15. 下方示例的品阶与稀有度只演示字段结构，不代表当前奖励强度；实际输出必须服从本次注入的奖励规格。

只输出 JSON：
{
  "narrative": "宝库显露的短叙事",
  "itemCommands": [
    "createItem({\\"owner\\":\\"B1\\",\\"item\\":{\\"0\\":\\"I_B1_DG_TMP_REWARD_A\\",\\"1\\":\\"粗纹护心玉\\",\\"2\\":\\"法宝\\",\\"3\\":\\"一品人阶护身法器。玉面刻着粗浅护身纹，可在遇袭时激起微弱灵光。\\",\\"4\\":\\"战斗表现为轻微护体灵光。\\",\\"5\\":\\"1\\",\\"appearance\\":\\"一枚椭圆青玉护符，玉面留有数道浅淡护身纹。\\",\\"numeric\\":{\\"schema\\":\\"numeric.v1\\",\\"kind\\":\\"equipment\\",\\"grade\\":1,\\"rarityTier\\":\\"ren\\",\\"artifactTier\\":\\"spiritualTool\\",\\"statLines\\":[\\"magDef\\"],\\"effectProfile\\":\\"sturdyGuard\\"}},\\"acquisition\\":\\"秘境宝库所得\\",\\"reason\\":\\"秘境宝库奖励\\"})"
  ],
  "backlashBaseChance": 0.12,
  "preparedTexts": {
    "leaveWithoutTaking": "短句：未取任何宝物时离开宝库",
    "leaveAfterTaking": "短句：已取宝物后见好就收"
  }
}`,opportunityTemplate:`你是修仙秘境机缘设计师。请为当前机缘节点生成一个角色成长结算。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【队伍】
\${teamSnapshot}

【秘境内连续性上下文】
\${continuityContext}

要求：
1. narrative 是“未结算前”的机缘显化，只能写灵气、遗痕、异香、古修感悟、功法共鸣、可接触的征兆与诱惑。
2. narrative 绝对不要写玩家已经吸收、炼化、修为精进、技能提升、获得特质、状态变化或“修为进度前进”。
3. effect 是结构化状态变化，具体数值只能放在 effect；不要把 delta、层数、品阶变化写进 narrative。
4. preparedTexts.settled 是点击结算后的短反馈，可以写机缘入体、识海明悟、经脉变化或功法脉络响应，但不要写具体数值。
5. preparedTexts.noVisibleChange 是点击后暂无明显变化的短反馈。
6. 若队伍快照显示世界之子或“奇遇必定正面”类词条，机缘必须是正面效果，不要输出负向 delta 或负面词条。

${a}

只输出 JSON：
{
  "narrative": "机缘未被摄取前的短叙事",
  "effect": {"kind": "realm_progress", "delta": 5},
  "preparedTexts": {
    "settled": "短句：机缘落入体内/识海/功法脉络后的反馈，不写具体数值",
    "noVisibleChange": "短句：机缘气息已落定但暂无显著变化"
  }
}`,restTemplate:`你是修仙秘境休整点设计师。请生成 2 个可点击休整选项。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【队伍】
\${teamSnapshot}

【秘境内连续性上下文】
\${continuityContext}

要求：
1. narrative 只写休整点如何出现、环境为何适合调息或参悟，不要写玩家已经疗伤完成或参悟得益。
2. options[].settlementNarrative 是点击选项后的反馈，可以写疗伤完成、气息归位或参悟所得；不要写具体数值。
3. 若队伍快照显示世界之子或“奇遇必定正面”类词条，参悟选项不得输出负向成长效果。

只输出 JSON：
{
  "narrative": "休整点短叙事",
  "options": [
    {"label": "调息疗伤", "kind": "heal", "settlementNarrative": "短句：完成疗伤调息后的反馈", "effect": {"healHpPct": 0.25, "healMpPct": 0.2, "clearDebuff": true}},
    {"label": "参悟残痕", "kind": "insight", "settlementNarrative": "短句：完成参悟后的反馈", "effect": {"kind": "realm_progress", "delta": 3}}
  ]
}

kind=insight 时，options[].effect 必须遵守：
${a}`,trapTemplate:`你是修仙秘境陷阱设计师。请为当前陷阱节点生成一个进入后自动触发的一次性陷阱。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【队伍】
\${teamSnapshot}

【秘境内连续性上下文】
\${continuityContext}

要求：
1. narrative 只写陷阱显露前后的危险征兆，不要写最终扣损数字。
2. d100Threshold 是避开/扛过陷阱的门槛，标准建议 45~65，越高越危险。
3. damageHpPct 和 damageMpPct 是失败时扣损比例，轻量陷阱建议 0.04~0.12。
4. successNarrative / failureNarrative 是自动判定后的短反馈，不写具体数值。
5. 若队伍快照显示气运极高、世界之子或“奇遇必定正面”类词条，陷阱风险应偏向逢凶化吉，失败叙事不要写成不可逆重大损毁。

只输出 JSON：
{
  "narrative": "陷阱显露的短叙事",
  "d100Threshold": 55,
  "damageHpPct": 0.08,
  "damageMpPct": 0.06,
  "successNarrative": "短句：及时避开或稳住气机后的反馈",
  "failureNarrative": "短句：被陷阱波及后的反馈"
}`,keyNodeTemplate:`你是修仙秘境关键节点编排者。请为 DAG 汇合点生成关键剧情。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【队伍】
\${teamSnapshot}

只输出 JSON：
{
  "narrative": "关键节点叙事",
  "isConvergence": true,
  "introduceNpc": false,
  "introduceNpcHint": "若 introduceNpc=true，写此 NPC 的出场契机、身份气质、与秘境主题的关系"
}

只有当剧情确实需要结识临时友方或关键人物时，才让 introduceNpc=true。`,teleportTemplate:`你是修仙秘境大传送阵设计师。请为当前大传送阵生成【可选】传送诱因与远端新分区落点。

【秘境】
\${stubJson}

【主题】
\${theme}

【房间】
\${nodeJson}

【队伍】
\${teamSnapshot}

要求：
1. narrative 写当前传送阵的诱惑、异象、未知风险和远端若隐若现的线索，语气要勾起好奇心，但不要写玩家已经踏入、阵法已经启动或已经抵达。
2. 玩家可以选择不进入传送阵并继续原秘境路线，因此 narrative 必须保留选择边界，不得暗示传送是唯一去路。
3. targetPartition 是传送后的新秘境分区主题；它不是当前秘境入口，也不是回到原秘境开头。
4. landingNode.brief 写传送落点：必须是新分区中段的场景，例如断裂殿廊、半塌阵台、古战场侧厅、封印裂隙边缘；严禁写成“入口、山门、初入秘境、起点”。

只输出 JSON：
{
  "narrative": "传送阵未启动前的诱惑短叙事，保留不进入并继续前进的选择",
  "targetPartition": {
    "theme": "新分区主题",
    "styleProfile": "视觉风格",
    "realmTier": "境界定位",
    "entranceCoord": [0,0],
    "exitCoord": [0,0]
  },
  "landingNode": {"kind": "story", "brief": "新分区中段落点场景，不是入口"}
}`,backgroundImageTemplate:`为修仙秘境房间生成一张横幅场景图提示词。只输出图片提示词，不要 JSON。

主题：\${theme}
房间类型：\${nodeKind}
房间叙事：\${narrative}

要求：沉浸式仙侠秘境场景、无文字、无 UI、适合作为面板背景。`,outcomeTemplate:`你是修仙世界的叙事者，为秘境探索撰写简短的节点结果叙述。

秘境：\${dungeonName}
主题：\${dungeonTheme}
难度：\${difficultyLabel}
房间类型：\${nodeKind}
结果：\${outcomeLabel}
主角：\${playerName}

\${extraContext}

【秘境内连续性上下文】
\${continuityContext}

请按系统注入的叙事人称协议写 2-4 句话，描述本探索节点的行动结果。必须承接连续性上下文和额外背景，不要重复进入叙事；只围绕额外背景中已经发生的结算类型写结果：治疗调息写伤势、法力或气息恢复，参悟感悟写识海、法则理解或修为感悟，奖励写收获落定，机关/战斗写行动后果；不要把一种效果类型延伸成另一种，也不要编造额外数值。保持修仙文风，语言简练，不要把每个节点都写成破门入室，不要剧透后续节点。`},s=null;function c(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function l(e){return e.replace(/\\n/g,`
`)}function u(e){if(!c(e))return null;let t=e.stubTemplate,n=e.blueprintTemplate,r=e.nodeTemplate,i=e.mechanismTemplate,a=e.rewardTemplate,s=e.opportunityTemplate,u=e.restTemplate,d=e.trapTemplate,f=e.keyNodeTemplate,p=e.teleportTemplate,m=e.backgroundImageTemplate,h=e.outcomeTemplate;return typeof t!=`string`||typeof n!=`string`||typeof r!=`string`||typeof h!=`string`?null:{id:typeof e.id==`string`?e.id:`default`,name:typeof e.name==`string`?e.name:`默认秘境预设`,version:typeof e.version==`number`?e.version:void 0,updatedAt:typeof e.updatedAt==`string`?e.updatedAt:void 0,stubTemplate:l(t),blueprintTemplate:l(n),nodeTemplate:l(r),mechanismTemplate:typeof i==`string`?l(i):o.mechanismTemplate,rewardTemplate:typeof a==`string`?l(a):o.rewardTemplate,opportunityTemplate:typeof s==`string`?l(s):o.opportunityTemplate,restTemplate:typeof u==`string`?l(u):o.restTemplate,trapTemplate:typeof d==`string`?l(d):o.trapTemplate,keyNodeTemplate:typeof f==`string`?l(f):o.keyNodeTemplate,teleportTemplate:typeof p==`string`?l(p):o.teleportTemplate,backgroundImageTemplate:typeof m==`string`?l(m):o.backgroundImageTemplate,outcomeTemplate:l(h)}}async function d(){let e=await n(r.DUNGEON);return u(e==null?void 0:e.json)??o}async function f(){if(s)return s;let e=await t(i);return s={loaded:!0,activePreset:u(e==null?void 0:e.activePreset)??await d()},s}function p(){return(s==null?void 0:s.activePreset)??o}async function m(t){let n=await f(),r={...n.activePreset,id:n.activePreset.id===`default`?`custom`:n.activePreset.id,name:n.activePreset.id===`default`?`本地秘境预设`:n.activePreset.name,...t},a=u(r)??r;return s={loaded:!0,activePreset:a},await e(i,{activePreset:a}),a}async function h(){let t=await d();return s={loaded:!0,activePreset:t},await e(i,{activePreset:t}),t}function g(e,t){return e.replace(/\$\{([^}]+)\}/g,(e,n)=>t[n.trim()]??``)}export{h as a,g as i,p as n,m as o,f as r,o as t};