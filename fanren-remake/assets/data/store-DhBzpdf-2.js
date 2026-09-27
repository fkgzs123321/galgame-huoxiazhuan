import{t as e}from"./../react-BHeFgTA0.js";import{n as t}from"./../gateway/apiEndpointUrl-C7uIHu-B.js";import{c as n,i as r,r as i}from"./../db-DA34zuyh.js";var a,o=((a={BASE_URL:`/`,DEV:!1,MODE:`production`,PROD:!0,SSR:!1}.VITE_PUBLIC_ASSET_BASE_URL)==null?void 0:a.trim().replace(/\/+$/,``))||`https://pub-461073e9a31549eb838527f6cbc59989.r2.dev`;function s(e){return`${o}/${e.replace(/^\/+/,``)}`}function c(e,t){let n=s(t);if(typeof e!=`string`||!e.trim())return n;let r=e.trim();try{let e=new URL(r),i=new URL(n),a=`/${t.replace(/^\/+/,``)}`;if((e.protocol===`https:`||e.protocol===`http:`)&&/^pub-[a-z0-9]+\.r2\.dev$/i.test(e.hostname)&&e.hostname!==i.hostname&&e.pathname===a)return n}catch{return r}return r}function l(e,t,n){return t?e.split(t).join(n):e}function u(e){return e.trim()||`无`}function d({template:e,variables:t,stableTitle:n,dynamicTitle:r,stableRole:i=`system`}){let a=e.trim();for(let e of t){let t=`见后一条【${r}】字段：${e.label}`;for(let n of e.tokens)a=l(a,n,t)}let o=t.map((e,t)=>({variable:e,index:t})).sort((e,t)=>(e.variable.cacheOrder??2**53-1)-(t.variable.cacheOrder??2**53-1)||e.index-t.index).map(e=>e.variable).map(e=>`## ${e.label}\n${u(e.value)}`).join(`

`);return[{role:i,content:[`【${n}】`,a].filter(Boolean).join(`

`)},{role:`user`,content:[`【${r}】`,o].filter(Boolean).join(`

`)}]}function f(e,t){if(e.length!==t.length||e.length===0)return 0;let n=0,r=0,i=0;for(let a=0;a<e.length;a++){let o=e[a],s=t[a];n+=o*s,r+=o*o,i+=s*s}let a=Math.sqrt(r)*Math.sqrt(i);return a===0?0:n/a}function p(e,t,n=5,r=.3){return m(e,t,n,r).matches}function m(e,t,r=5,i=.3,a=r){let o=[],s=[];for(let r of t){let t=n(r.embedding);if(t.length===0)continue;let a=f(e,t);a>=i?o.push({vector:r,similarity:a}):i>0&&s.push({vector:r,similarity:a,threshold:i})}return o.sort((e,t)=>t.similarity-e.similarity),s.sort((e,t)=>t.similarity-e.similarity),{matches:o.slice(0,r),rejectedByThreshold:s.slice(0,a)}}function h(e,t,n=5){let r=e.toLowerCase().split(/\s+/).filter(e=>e.length>0);if(r.length===0)return[];let i=[];for(let e of t){let t=e.content.toLowerCase(),n=0;for(let e of r)t.includes(e)&&n++;n>0&&i.push({vector:e,matchCount:n})}return i.sort((e,t)=>t.matchCount-e.matchCount),i.slice(0,n)}function g(e,t){return t===0?[]:e.map(e=>({vector:e.vector,similarity:e.matchCount/t}))}function _(e,t,n,r=.7){let i=1-r,a=new Map;for(let t of e){let e=t.vector.id??0;a.set(e,{vector:t.vector,score:t.similarity*r})}for(let e of t){let t=e.vector.id??0,n=a.get(t);n?n.score+=e.similarity*i:a.set(t,{vector:e.vector,score:e.similarity*i})}return[...a.values()].sort((e,t)=>t.score-e.score).slice(0,n).map(e=>({vector:e.vector,similarity:e.score}))}function v(e,t,n,r=0){let i=t.filter(e=>e.relevance_score>=r).map(t=>{let n=e[t.index];return n?{vector:n.vector,similarity:t.relevance_score}:{vector:{content:``},similarity:t.relevance_score}});return i.sort((e,t)=>t.similarity-e.similarity),i.slice(0,n)}function y(e,t){return e.filter(e=>{let n=T(e.metadata).timestamp??0;return n===0||n<=t})}function b(e,t,n){let r=e.filter(e=>e.source===t);return r.sort((e,t)=>(t.id??0)-(e.id??0)),r.slice(0,n)}function ee(e){var t;let n=(t=e.title)==null?void 0:t.trim();if(n)return n;let r=e.content.split(`
`).map(e=>e.trim()).find(Boolean);return(r==null?void 0:r.slice(0,40))||`未命名条目`}function x(e){return[`标题: `+ee(e),`来源: ${e.source}`,`内容:`,e.content].join(`
`)}function S(e){return e.length===0?``:`## 相关知识检索结果\n\n以下是从知识库中检索到的相关内容,请参考:\n\n${e.map((e,t)=>`[知识片段 ${t+1}] (相关度: ${(e.similarity*100).toFixed(0)}%)\n${x(e.vector)}`).join(`

---

`)}`}function C(e,t){return e.length===0?``:`## 固定知识注入 (${t})\n\n${e.map((e,n)=>`[${t} #${n+1}]\n${x(e)}`).join(`

---

`)}`}function w(e){let t=e.split(`/`).map(e=>e.trim()).filter(Boolean);if(t.length<3||t[0]!==`导入库`)return null;let n=e=>e.replace(/[_-]?v\d+(?:\.\d+)*$/i,``).trim();return t.length>=4&&n(t[1]??``)===n(t[2]??``)?t.slice(2).join(`/`):t.slice(1).join(`/`)}function T(e){try{return JSON.parse(e)}catch{return{timestamp:0,chunkIndex:0,totalChunks:1}}}function E(e){return JSON.stringify(e)}var te=`这是主角\${playerName}的修仙故事
请作为全知史官，阅读并分析以下【剧情片段】。你需要将片段中的关键信息拆解并提炼为 1 到多个关键记忆档案。

【核心规则】
为保持档案系统的整洁和可检索性，请务必严格遵守以下规则。

0. 数据清洗与去码规则：
   - 禁止在文件夹名称、档案标题或正文中保留数据库代码、ID 标识符或无意义编号（例如：C4036, B1, ID_992, NPC_01）。
   - 如果原文中出现代表玩家的代码或化名，统一替换为 \${playerName} 或“主角”。

1. 分类与路径规则：
   你必须根据档案内容的性质，将其归档到以下特定路径中。

   - 人物传记：人物传记/{人物名称}
   - 势力档案：势力档案/{势力名称}
   - 地理志：地理志/{主疆域}/{下辖区域}/{兴趣点}
   - 物品图鉴：物品图鉴/法宝阵旗、物品图鉴/炼器材料、物品图鉴/灵草灵植、物品图鉴/丹药符箓、物品图鉴/天地神物、物品图鉴/其余杂项
   - 灵虫灵兽：灵虫灵兽
   - 功法能力：功法能力
   - 剧情时间线：剧情时间线

2. 命名规则：
   - 标题必须使用清洗后的中文名称，避免空泛标题。
   - 如果属于主角剧情线，标题前必须添加 【主角剧情线】 前缀。

3. 内容规则：
   - content 字段应全面、客观地提炼关键信息。
   - 保留关键事件、人物、地点、修炼突破、因果关系。
   - 去除冗余语气词和无意义重复描写。

4. 元数据规则：
   每个档案都应尽量包含 metadata 字段，用于后续检索过滤：
   - category：人物、地点、事件、物品、技能、势力、时间线、其他
   - tags：2-5 个描述性标签
   - keywords：3-5 个核心关键词
   - characters：涉及的角色名数组
   - locations：涉及的地点名数组
   - timeRange：时间范围（如有）

5. 输出规则：
   - 直接输出标准 JSON 数组。
   - 每个元素必须包含 folder、title、content，可选 metadata。
   - 不要输出解释、前言或 Markdown。

【剧情片段】
\${story_text}

【当前玩家输入】
\${user_input}

【隐藏思考】
\${thinking_content}

【人物传记参考】
\${character_biographies}

【世界地理】
\${worldGeography}

【场景地图】
\${sceneMapData}

【世界因子】
\${world_factors}

【状态快照】
\${state_snapshot}

当前游戏内时间：\${currentTime}
当前所在地名：\${currentLocation}
玩家姓名：\${playerName}

请开始执行，并直接返回 JSON 数组。`,D=`这是主角\${playerName}的修仙故事。
请作为全知史官，阅读并分析以下【剧情片段】。你需要将片段中的关键信息提炼为 1 到多个关键记忆档案，并严格复用现有知识库的目录结构与命名风格。

【核心规则】

0. 数据清洗与去码规则：
   - 禁止在 folder、title、content 中保留数据库代码、ID 标识符或无意义编号（例如：C4036, B1, ID_992, NPC_01）。
   - 如果原文中出现代表玩家的代码或化名，统一替换为 \${playerName} 或“主角”。

1. 目录复用规则（最高优先级）：
   - 你必须优先参考下方的【当前目录结构参考】。
   - 如果同一人物、地点、势力、物品或事件类型在现有知识库中已经有稳定 folder，必须复用完全相同的 folder 路径。
   - 不允许对同一实体一会儿使用扁平目录、一会儿使用多级目录。
   - 不允许随意省略或新增中间层级；如果已有目录中出现了同一实体的规范路径，必须沿用该规范路径。

2. 分类与路径规则：
   你必须根据档案内容的性质，将其归档到以下固定路径中。

   - 人物信息：人物信息/{人物名称}
   - 势力宗门信息：势力宗门信息/{势力名称}
   - 地点信息：地点信息/{地点名称或稳定地点路径}
   - 功法信息：功法、秘术、神通、修炼法门
   - 法宝法器信息：法宝、法器、古宝、通天灵宝
   - 阵法信息：阵法、禁制、阵盘、阵旗、布阵器具
   - 符箓信息：符箓、符宝
   - 丹药信息：丹药、药散、药液
   - 材料信息：矿材、灵材、炼器材料、布阵材料
   - 灵草信息：灵草、灵植、药材
   - 妖兽灵虫信息：妖兽、灵兽、灵虫、奇虫
   - 特殊体质：体质、血脉、特殊资质
   - 修为境界体系：境界体系、修炼阶段、突破条件
   - 秘境遗迹：秘境、洞府、遗迹、禁地
   - 主角剧情线：主角经历、主角主线推进、主角关键因果
   - 章节总结：整章、整段剧情的总结归档
   - 其他：确实无法归入以上目录时才使用
   - 如果属于主角剧情线，必须归入 主角剧情线，且 title 前必须保留 【主角剧情线】 前缀。
   - 与主角推进直接相关的世界事件、支线因果、阶段变化，也统一归入 主角剧情线；不要创建、使用或推荐任何年表/剧情梳理类目录。

3. 路径复用强约束：
   - 目录结构以当前知识库现状为准，不要强行套用另一套新命名。
   - 如果现有目录里已经出现 人物信息/韩立、材料信息/北极元晶、地点信息/落云宗/天泉峰 之类的稳定路径，必须复用它。
   - 不要把 json 文件名、版本号、压缩包名、导入批次名当作第一层目录。
   - 叶子对象（人物、材料、丹药、法宝、地点、妖兽等）应直接落在对象自己的目录或对象路径上，不要额外虚构一层同名目录。

4. 命名规则：
   - title 必须使用清洗后的中文名称，避免空泛标题。
   - 如果属于主角剧情线，title 前必须添加 【主角剧情线】 前缀。
   - 同一目录下如已有稳定标题风格，优先延续该风格。

5. 内容规则：
   - content 应全面、客观地提炼关键信息。
   - 保留关键事件、人物、地点、修炼突破、因果关系。
   - 去除冗余语气词和无意义重复描写。
   - 如果是单一人物/地点/物品档案，content 要围绕该对象本身，不要混入其他对象的主叙事。

6. 元数据规则：
   每个档案都应尽量包含 metadata 字段，用于后续检索过滤：
   - category：人物、地点、事件、物品、技能、势力、其他
   - tags：2-5 个描述性标签
   - keywords：3-5 个核心关键词
   - characters：涉及的角色名数组
   - locations：涉及的地点名数组
   - timeRange：时间范围（如有）

7. 输出规则：
   - 直接输出标准 JSON 数组。
   - 每个元素必须包含 folder、title、content，可选 metadata。
   - 不要输出解释、前言或 Markdown。

【当前目录结构参考】
\${folder_list}

【剧情片段】
\${story_text}

【当前玩家输入】
\${user_input}

【隐藏思考】
\${thinking_content}

【人物信息参考】
\${character_biographies}

【世界地理】
\${worldGeography}

【场景地图】
\${sceneMapData}

【世界因子】
\${world_factors}

【状态快照】
\${state_snapshot}

当前游戏内时间：\${currentTime}
当前所在地名：\${currentLocation}
玩家姓名：\${playerName}

请开始执行，并直接返回 JSON 数组。`;function O(e,t,n){let r=e;for(let e of t)r=r.split(`{{${e}}}`).join(n),r=r.split(`\${${e}}`).join(n);return r}function k(e){return typeof e==`string`?e.trim():``}function A(e){if(!Array.isArray(e))return;let t=e.map(e=>typeof e==`string`?e.trim():``).filter(Boolean);return t.length>0?t:void 0}var j=`# Role: 凡人修仙传·全息智能检索助手 (Immortal Cultivation Retrieval Agent)

你是一个拥有高级逻辑判断能力的智能检索助手。你的核心任务是深度分析当前游戏状态与文本，生成精准的 JSON 检索指令，从本地向量数据库中提取最匹配的上下文。

鉴于**剧情与时间线已由外部系统接管**，你的唯一使命是：**结合【人界篇总纲】校准状态，并对本地庞大的【设定集】进行饱和式检索**，确保所有专有名词和出场人物都能找到对应的参数与背景。

---

### 1. 当前上下文环境 (Context Analysis)
* **正在处理的文本 (\`text\`)**:
    \${text}
    *(注: 这是提取【设定名词】（法宝、丹药、功法、妖兽等）以及匹配元数据 [关键词] 字段的核心来源)*
* **当前时间 (\`currentTime\`)**:
    \${currentTime}
    *(注: 仅作记录，不再用于年表检索)*
* **当前地点 (\`currentLocation\`)**:
    \${currentLocation}
    *(注: Channel C [环境专线] 的核心锚点，用于检索宗门与地理设定)*
* **当前境界 (\`playerRank\`)**:
    \${playerRank}
    *(注: 辅助锚点)*
* **世界状态快照 (\`state_snapshot\`)**:
    \${state_snapshot}
    *(注: 外部系统接管剧情，此处作为环境状态参考，不再提取 E-ID)*
* **当前在场人物 (\`character_biographies\`)**:
    \${character_biographies}
    *(注: Channel C [人物专线] 的来源，用于提取需要查询人物志的配角)*
* **玩家姓名 (\`playerName\`)**:
    \${playerName}

---

### 2. 目标输出格式 (JSON)
请返回标准 JSON 格式的检索条件。**必须严格遵循以下结构，不得修改键名**：

\`\`\`json
{
  "keywords": [
    "【人界篇总纲】",
    "\${currentLocation} + 宗门势力 地理环境 特产资源",
    "[配角名A] + 设定图鉴 人物志 身份背景",
    "[配角名B] + 设定图鉴 人物志 身份背景",
    "[法宝/符箓名] + 设定图鉴 机制参数 威能效果",
    "[灵植/丹药/材料名] + 设定图鉴 药性用途 产地",
    "[灵兽/妖兽/魔物名] + 设定图鉴 天赋神通 弱点",
    "[功法/秘术名] + 设定图鉴 修炼条件 神通妙用",
    "[阵法/禁制名] + 设定图鉴 布阵器具 禁制效果"
  ],
  "folders": ["年表时间线梳理", "凡人修仙设定集"],
  "exclude_folders": ["凡人修仙年表", "凡人修仙传原著剧情", "剧情时间线", "无关文件夹"],
  "categories": ["设定", "总纲"],
  "filter": {
    "categories": ["设定", "总纲"],
    "requireTags": [],
    "excludeTags": ["剧情片段", "动态事件"],
    "requireCharacters": ["<提取文本中出现的所有原著配角名字，以数组形式列出>"],
    "requireLocations": ["<直接填入当前地点>"],
    "logic": "OR",
    "reason": "执行饱和式设定检索：Channel A 锚定总纲；Channel C 锁定当前环境并对所有在场配角进行全员检索；Channel B 启动[全类别识别]，精准区分法宝、丹药、功法、妖兽、阵法等，挂载对应后缀进行深度提取；彻底移除剧情与年表检索。"
  }
}
\`\`\`

### 3. 核心规则与执行逻辑 (System Logic)
请严格遵守以下三个通道的生成逻辑，确保对 10 大设定类别及所有出场人物的精准覆盖。

➤ 通道 A：全局总纲专线 (Global Calibration Channel)
目标文件夹：年表时间线梳理
核心任务：无视任何条件，强制检索整个人界篇的时间线总纲，作为最高优先级的世界观锚点。

生成逻辑：

[死命令锚定]：

格式强制："【人界篇总纲】"。

原理：世界观的定海神针，必须随身携带，防止 AI 产生境界与时间的幻觉。

➤ 通道 B：全类别设定专线 (Omni-Setting Channel)
目标文件夹：凡人修仙设定集
核心任务：对文本中出现的所有名词进行智能分类识别，并挂载最匹配的后缀。你必须识别以下类别：

宝物类：法宝、符箓、古宝、通天灵宝

资源类：灵植、材料、丹药、矿石

生物类：灵兽、妖兽、魔物、奇虫

玄学类：功法、秘术、神通

设施类：阵法、禁制、传送阵

生成逻辑：

[智能分类提取]：

从 \${text} 中提取 5-6 个最关键的专有名词。

严禁包含：常用动词、时间词。

[动态后缀挂载 (Dynamic Suffix)]：

若识别为法宝/符箓：追加 " 设定图鉴 机制参数 威能效果"

若识别为丹药/材料：追加 " 设定图鉴 药性用途 产地"

若识别为妖兽/灵兽：追加 " 设定图鉴 天赋神通 弱点"

若识别为功法/秘术：追加 " 设定图鉴 修炼条件 神通妙用"

若识别为阵法/禁制：追加 " 设定图鉴 布阵器具 禁制效果"

若无法确定类别：使用通用后缀 " 设定图鉴 机制参数 属性数据"

生成示例：

✅ 法宝："青竹蜂云剑 设定图鉴 机制参数 威能效果"

✅ 丹药："筑基丹 设定图鉴 药性用途 产地"

✅ 妖兽："墨蛟 设定图鉴 天赋神通 弱点"

✅ 功法："青元剑诀 设定图鉴 修炼条件 神通妙用"

➤ 通道 C：环境与全员人文专线 (Context & All-Characters Channel)
目标文件夹：凡人修仙设定集
核心任务：构建当前场景的地理与人文背景，对所有出场人物进行无死角检索。

生成逻辑：

[地理与势力锚定]：

从 \${currentLocation} 提取地点名词。

格式强制："\${currentLocation} + 宗门势力 地理环境 特产资源"

原理：确保 AI 了解当前所在城市或区域的背景信息（如“乱星海”有哪些势力，“阗天城”有什么规矩）。

[人物档案全员锚定]：

从 \${character_biographies} 或 \${text} 中提取所有出现的原著配角名。

格式强制：针对每一个提取出的配角，单独生成一条检索词 "[配角名] + 设定图鉴 人物志 身份背景"。

原理：文本中出现多少个配角，就生成多少条人物检索指令，实现“见一个查一个”，绝不遗漏人物关系。

### 4. 元数据过滤器规则 (Metadata Filter)
requireCharacters: 提取文本中出现的所有原著配角名，并组成数组（例如 ["南宫婉", "墨大夫", "张铁"]）。

requireLocations: 直接填入 \${currentLocation}。

categories: 仅包含 "设定", "总纲"。

exclude_folders: 必须包含 "凡人修仙年表", "凡人修仙传原著剧情", "剧情时间线"，确保物理隔离。

### 5. Reason 字段填写规范
必须在 reason 字段中明确写入你的思考逻辑，例如：

"执行饱和式设定检索：Channel A 锚定总纲；Channel C 锁定当前环境并全员检索在场配角；Channel B 识别名词类别并匹配专用后缀；原著与年表已彻底移除。"`,ne=`你是一个智能检索助手。请分析以下剧情内容，生成检索条件。

当前剧情/玩家行为：
\${text}

近期正文与总结：
\${story_text}

当前回合上下文总览：
\${context_history}

玩家状态：
\${player_snapshot}

在场人物：
\${on_screen_npcs}

当前任务：
\${current_tasks}

最近世界事件：
\${world_events}

世界地理：
\${world_geography}

世界因子：
\${world_factors}

地图上下文：
\${map_context}

本层快速交谈：
\${quick_chat_all}

人物传记：
\${character_biographies}

当前场景信息：
\${scene_info_block}

可用的知识库文件夹列表：
\${folder_list}

可参考的现有条目标题索引：
\${folder_title_index}

请返回 JSON 格式的检索条件：
{
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "folders": ["推荐检索的文件夹1", "推荐检索的文件夹2"],
  "exclude_folders": ["应排除的文件夹"],
  "categories": ["人物", "地点"],
  "characters": ["涉及的角色名"],
  "locations": ["涉及的地点名"],
  "tags": ["相关标签"],
  "filter": {
    "categories": ["优先检索的分类"],
    "requireTags": ["必须包含的标签"],
    "excludeTags": ["应该排除的标签"],
    "requireCharacters": ["当前场景涉及的角色"],
    "requireLocations": ["当前场景涉及的地点"],
    "logic": "OR",
    "reason": "简短说明过滤策略"
  }
}

规则与判断逻辑：

1. **keywords (关键词)**:
   - 生成 10 个**具体的自然语言短语**（主体+属性）。
   - 例如：["哥布林首领的弱点", "森林区域的隐藏道路"]，而不仅仅是 ["哥布林", "森林"]。

2. **folders (白名单 - 重点关注)**:
   - 从提供的 \${folder_list} 中，挑选 **1-3个最相关** 的文件夹。
   - 优先结合 \${folder_title_index} 判断哪个目录已经收录了同类实体或同类标题风格。
   - **判断逻辑**：
     - *战斗中* -> 选择包含 "Monster", "Skill", "Battle" 字眼的文件夹。
     - *剧情中* -> 选择包含 "Lore", "Character", "History" 字眼的文件夹。
     - *H/互动中* -> 选择包含 "Event", "Diary", "Relationship" 字眼的文件夹。

3. **exclude_folders (黑名单 - 排除干扰)**:
   - **必须填写**：为了提高检索准确率，请主动排除那些**明显与当前场景无关**的文件夹。
   - **判断逻辑**：
     - 如果当前是**纯战斗** -> 排除 "日常剧情"、"H事件"、"地理环境" 类文件夹（避免搜出无关的剧情描述）。
     - 如果当前是**纯日常对话** -> 排除 "战斗数据"、"怪物图鉴"、"物品掉落" 类文件夹（避免数值干扰）。
     - 如果当前是**严肃主线** -> 排除 "番外篇"、"现代架空" 等与主线无关的文件夹。

4. **filter (元数据过滤)**:
   - 这是一个高级过滤器，用于缩小范围。
   - **categories**: 如果知识库有明确分类（如 "Character", "Location", "Item"），请在此指定。
     - *例子*：想查把剑的属性 -> "categories": ["Item", "Weapon"]
   - **requireCharacters**: 如果剧情明显涉及特定角色（如 "艾丽丝"），请填入，确保只检索关于她的条目。
   - **logic**: 通常使用 "OR"，如果是非常精确的查找（既要是武器又要是火属性），使用 "AND"。

5. **Formatting**:
   - 必须严格返回 JSON 格式。
   - 如果某个字段确实没有相关内容，返回空数组 []。`,M=[`你是凡人项目的检索词生成助手。请分析以下剧情内容，生成适用于当前知识库结构的检索条件。`,``,`当前剧情/玩家行为：`,"${text}",``,`近期正文与总结：`,"${story_text}",``,`当前回合上下文总览：`,"${context_history}",``,`玩家状态：`,"${player_snapshot}",``,`在场人物：`,"${on_screen_npcs}",``,`当前任务：`,"${current_tasks}",``,`最近世界事件：`,"${world_events}",``,`世界地理：`,"${world_geography}",``,`世界因子：`,"${world_factors}",``,`地图上下文：`,"${map_context}",``,`本层快速交谈：`,"${quick_chat_all}",``,`人物信息参考：`,"${character_biographies}",``,`当前场景信息：`,"${scene_info_block}",``,`可用的知识库文件夹列表：`,"${folder_list}",``,`请返回 JSON 格式的检索条件：`,`{`,`  "keywords": ["关键词1", "关键词2", "关键词3"],`,`  "folders": ["推荐检索的文件夹1", "推荐检索的文件夹2"],`,`  "exclude_folders": ["应排除的文件夹"],`,`  "categories": ["人物", "地点"],`,`  "characters": ["涉及的角色名"],`,`  "locations": ["涉及的地点名"],`,`  "tags": ["相关标签"],`,`  "filter": {`,`    "categories": ["优先检索的分类"],`,`    "requireTags": ["必须包含的标签"],`,`    "excludeTags": ["应该排除的标签"],`,`    "requireCharacters": ["当前场景涉及的角色"],`,`    "requireLocations": ["当前场景涉及的地点"],`,`    "logic": "OR",`,`    "reason": "简短说明过滤策略"`,`  }`,`}`,``,`规则与判断逻辑：`,``,`1. **keywords (关键词)**:`,`   - 生成 6-10 个**具体的自然语言短语**，优先使用“实体 + 需要确认的属性/关系/背景”形式。`,`   - 关键词应尽量贴近凡人项目语义，例如：`,`     - "慕沛灵 假道侣契约 来历与目的"`,`     - "寒髓泉 淬炼真元 效果与限制"`,`     - "乙木长青诀 修炼条件 神通妙用"`,`     - "天泉峰 地理环境 药园资源"`,`   - 不要只给孤立名词，例如不要只写 ["慕沛灵", "寒髓泉"]。`,``,`2. **folders (白名单 - 重点关注)**:`,`   - 必须从上方【可用的知识库文件夹列表】中挑选 **1-3 个最相关** 的文件夹。`,`   - 目录判断应使用凡人项目自己的分类语义：`,`     - 人物身份、关系、动机、背景 -> 优先 人物信息/{角色名}`,`     - 宗门、家族、势力归属 -> 优先 势力宗门信息/{势力名}`,`     - 地点、区域、宗门驻地、洞府、城池 -> 优先 地点信息/...`,`     - 功法、秘术、神通、修炼法门 -> 优先 功法信息`,`     - 法宝、法器、古宝、通天灵宝 -> 优先 法宝法器信息`,`     - 阵法、禁制、阵盘、阵旗、布阵器具 -> 优先 阵法信息`,`     - 符箓、符宝 -> 优先 符箓信息`,`     - 丹药、药散、药液 -> 优先 丹药信息`,`     - 材料、矿材、炼器材料 -> 优先 材料信息`,`     - 灵草、灵植、药材 -> 优先 灵草信息`,`     - 妖兽、灵兽、灵虫、奇虫 -> 优先 妖兽灵虫信息`,`     - 体质、血脉、资质 -> 优先 特殊体质 或 修为境界体系`,`     - 秘境、遗迹、禁地 -> 优先 秘境遗迹`,`     - 主角经历、主角主线推进、主角关键因果，以及与主角推进直接相关的世界事件、支线因果、阶段变化 -> 优先 主角剧情线`,`   - 不要推荐任何年表/剧情梳理类目录。`,`   - 如果目录树已经显示某个实体存在稳定路径，优先复用那条路径，而不是临时猜一个新目录。`,``,`3. **exclude_folders (黑名单 - 排除干扰)**:`,`   - 应主动排除当前场景明显无关的目录，但不要把当前文本、地点或在场人物直接相关的目录排掉。`,`   - 判断示例：`,`     - 如果是在查人物关系、身份背景、立场变化 -> 可排除 材料信息、法宝法器信息、妖兽灵虫信息`,`     - 如果是在查地点环境、宗门布局、资源分布 -> 可排除 人物信息，并酌情排除无关的 主角剧情线`,`     - 如果是在查功法、神通、法宝效果 -> 可排除无关的 主角剧情线、地点信息、章节总结`,`     - 如果是在查主角近期推进 -> 优先保留 主角剧情线，可排除无关的 材料信息、灵草信息、妖兽灵虫信息`,`     - 如果是在查与主角推进直接相关的世界事件或支线因果 -> 仍优先保留 主角剧情线，可排除无关的 材料信息、灵草信息、妖兽灵虫信息`,`   - 若某个目录名、地点名、角色名已经在当前文本、当前地点或在场人物中直接出现，通常不要把对应目录列入 exclude_folders。`,``,`4. **filter (元数据过滤)**:`,`   - filter 用于进一步缩小范围，必须与上面的目录语义兼容，不是替代关系，而是在选定目录后再做元数据筛选。`,`   - categories 请使用凡人项目当前元数据分类：人物、地点、事件、物品、技能、势力、其他。`,`   - requireCharacters：当剧情明显涉及具体角色，或在场人物里已经给出角色名时，应填入对应角色名数组。`,`   - requireLocations：当当前地点明确，或文本里出现具体地点、宗门、洞府、秘境时，应填入对应地点数组。`,`   - logic：通常使用 OR；只有在“特定人物 + 特定分类”或“特定地点 + 特定事件”这类高精度检索中才使用 AND。`,`   - reason：简要说明为什么选这些目录和过滤条件，例如“当前场景发生在天泉峰寒髓泉，重点查询地点信息与主角剧情线，并要求地点命中寒髓泉”。`,``,`5. **Formatting**:`,`   - 必须严格返回 JSON 格式。`,`   - 如果某个字段确实没有相关内容，返回空数组 []。`,`   - folders / exclude_folders 中只能填写上方【可用的知识库文件夹列表】已存在或其明显父级语义一致的目录名称，不要凭空造英文目录名。`].join(`
`);function re(e,t){let n=typeof e==`string`?{text:e,userInput:e}:e,r=t.trim()||M;return r=r.replace(/\{\{#if worldBooks\}\}[\s\S]*?\{\{\/if\}\}/g,``),r=r.replace(/\{\{worldBooks\}\}/g,``),r=O(r,[`userInput`,`user_input`,`text`],n.text??n.userInput??``),r=O(r,[`storyText`,`story_text`],n.storyText??``),r=O(r,[`contextHistory`,`context_history`],n.contextHistory??``),r=O(r,[`currentTime`],n.currentTime??`未知时间`),r=O(r,[`currentLocation`],n.currentLocation??`未知地点`),r=O(r,[`playerRank`],n.playerRank??`未知境界`),r=O(r,[`stateSnapshot`,`state_snapshot`],n.stateSnapshot??`无`),r=O(r,[`playerSnapshot`,`player_snapshot`],n.playerSnapshot??`无`),r=O(r,[`characterSnapshots`,`character_snapshots`],n.characterSnapshots??`无`),r=O(r,[`onScreenNpcs`,`on_screen_npcs`],n.onScreenNpcs??`无`),r=O(r,[`currentTasks`,`current_tasks`],n.currentTasks??`无`),r=O(r,[`worldEvents`,`world_events`],n.worldEvents??`无`),r=O(r,[`worldGeography`,`world_geography`],n.worldGeography??`无`),r=O(r,[`worldFactors`,`world_factors`],n.worldFactors??`无`),r=O(r,[`currentSceneMap`,`current_scene_map`],n.currentSceneMap??`无`),r=O(r,[`mapContext`,`map_context`],n.mapContext??`无`),r=O(r,[`quickChatAll`,`quick_chat_all`],n.quickChatAll??`无`),r=O(r,[`characterBiographies`,`character_biographies`],n.characterBiographies??`无相关人物信息`),r=O(r,[`sceneInfoBlock`,`scene_info_block`],n.sceneInfoBlock??`无场景信息`),r=O(r,[`folderList`,`folder_list`],n.folderList??`未分类`),r=O(r,[`folderTitleIndex`,`folder_title_index`],n.folderTitleIndex??`暂无条目标题索引`),r=O(r,[`playerName`],n.playerName??`玩家`),r}function ie(e,t){let n=typeof e==`string`?{text:e,userInput:e}:e;return d({template:(t.trim()||M).replace(/\{\{#if worldBooks\}\}[\s\S]*?\{\{\/if\}\}/g,``).replace(/\{\{worldBooks\}\}/g,``),stableTitle:`RAG 检索增强固定规则`,dynamicTitle:`RAG 检索动态输入`,variables:[{label:`当前输入`,value:n.text??n.userInput??``,tokens:[`{{userInput}}`,"${userInput}",`{{user_input}}`,"${user_input}",`{{text}}`,"${text}"],cacheOrder:90},{label:`近期剧情`,value:n.storyText??``,tokens:[`{{storyText}}`,"${storyText}",`{{story_text}}`,"${story_text}"],cacheOrder:88},{label:`上下文历史`,value:n.contextHistory??``,tokens:[`{{contextHistory}}`,"${contextHistory}",`{{context_history}}`,"${context_history}"],cacheOrder:84},{label:`当前时间`,value:n.currentTime??`未知时间`,tokens:[`{{currentTime}}`,"${currentTime}"],cacheOrder:25},{label:`当前地点`,value:n.currentLocation??`未知地点`,tokens:[`{{currentLocation}}`,"${currentLocation}"],cacheOrder:30},{label:`主角境界`,value:n.playerRank??`未知境界`,tokens:[`{{playerRank}}`,"${playerRank}"],cacheOrder:35},{label:`状态快照`,value:n.stateSnapshot??`无`,tokens:[`{{stateSnapshot}}`,"${stateSnapshot}",`{{state_snapshot}}`,"${state_snapshot}"],cacheOrder:70},{label:`主角快照`,value:n.playerSnapshot??`无`,tokens:[`{{playerSnapshot}}`,"${playerSnapshot}",`{{player_snapshot}}`,"${player_snapshot}"],cacheOrder:72},{label:`角色快照`,value:n.characterSnapshots??`无`,tokens:[`{{characterSnapshots}}`,"${characterSnapshots}",`{{character_snapshots}}`,"${character_snapshots}"],cacheOrder:74},{label:`在场 NPC`,value:n.onScreenNpcs??`无`,tokens:[`{{onScreenNpcs}}`,"${onScreenNpcs}",`{{on_screen_npcs}}`,"${on_screen_npcs}"],cacheOrder:76},{label:`当前任务`,value:n.currentTasks??`无`,tokens:[`{{currentTasks}}`,"${currentTasks}",`{{current_tasks}}`,"${current_tasks}"],cacheOrder:60},{label:`世界事件`,value:n.worldEvents??`无`,tokens:[`{{worldEvents}}`,"${worldEvents}",`{{world_events}}`,"${world_events}"],cacheOrder:65},{label:`世界地理`,value:n.worldGeography??`无`,tokens:[`{{worldGeography}}`,"${worldGeography}",`{{world_geography}}`,"${world_geography}"],cacheOrder:40},{label:`世界因子`,value:n.worldFactors??`无`,tokens:[`{{worldFactors}}`,"${worldFactors}",`{{world_factors}}`,"${world_factors}"],cacheOrder:45},{label:`当前场景地图`,value:n.currentSceneMap??`无`,tokens:[`{{currentSceneMap}}`,"${currentSceneMap}",`{{current_scene_map}}`,"${current_scene_map}"],cacheOrder:50},{label:`地图上下文`,value:n.mapContext??`无`,tokens:[`{{mapContext}}`,"${mapContext}",`{{map_context}}`,"${map_context}"],cacheOrder:55},{label:`快速交谈`,value:n.quickChatAll??`无`,tokens:[`{{quickChatAll}}`,"${quickChatAll}",`{{quick_chat_all}}`,"${quick_chat_all}"],cacheOrder:82},{label:`人物信息参考`,value:n.characterBiographies??`无相关人物信息`,tokens:[`{{characterBiographies}}`,"${characterBiographies}",`{{character_biographies}}`,"${character_biographies}"],cacheOrder:78},{label:`场景信息`,value:n.sceneInfoBlock??`无场景信息`,tokens:[`{{sceneInfoBlock}}`,"${sceneInfoBlock}",`{{scene_info_block}}`,"${scene_info_block}"],cacheOrder:80},{label:`知识库文件夹列表`,value:n.folderList??`未分类`,tokens:[`{{folderList}}`,"${folderList}",`{{folder_list}}`,"${folder_list}"],cacheOrder:10},{label:`知识库标题索引`,value:n.folderTitleIndex??`暂无条目标题索引`,tokens:[`{{folderTitleIndex}}`,"${folderTitleIndex}",`{{folder_title_index}}`,"${folder_title_index}"],cacheOrder:15},{label:`玩家姓名`,value:n.playerName??`玩家`,tokens:[`{{playerName}}`,"${playerName}"],cacheOrder:20}]})}function ae(e){let t=e.trim().replace(/<think>[\s\S]*?<\/think>/gi,``).replace(/<thinking>[\s\S]*?<\/thinking>/gi,``).replace(/^```(?:json)?\s*/i,``).replace(/\s*```$/i,``);if(!t)return null;let n=t.match(/\{[\s\S]*\}/);if(n)try{let e=JSON.parse(n[0]),t=typeof e.filter==`object`&&e.filter!==null?e.filter:null;return{keywords:A(e.keywords)??[],folders:A(e.folders),excludeFolders:A(e.exclude_folders??e.excludeFolders),categories:A(e.categories),characters:A(e.characters),locations:A(e.locations),tags:A(e.tags),filter:t?{categories:A(t.categories),requireTags:A(t.requireTags),excludeTags:A(t.excludeTags),requireCharacters:A(t.requireCharacters),requireLocations:A(t.requireLocations),logic:k(t.logic).toUpperCase()===`AND`?`AND`:`OR`,reason:k(t.reason)||void 0}:void 0}}catch{return null}return null}var N=`RAG_CONFIG_V1`,P=`https://api.siliconflow.cn/v1/embeddings`,F=`https://api.siliconflow.com/v1/embeddings`,I=P,L=`Qwen/Qwen3-Embedding-8B`,R=1024,z=`/api/global-vector-search`,B=`https://api.siliconflow.cn/v1/rerank`,V=`Qwen/Qwen3-Reranker-8B`,H=.2,U=[{label:`硅基流动中国站 (.cn，推荐)`,value:`siliconflow-cn`},{label:`硅基流动国际站 (.com)`,value:`siliconflow-com`},{label:`自定义 OpenAI 兼容接口`,value:`custom`}],W=[{id:`fanren-wiki-v1`,name:`凡人wiki_v1.1`,version:`2026-06-30-cleaned-nangongque`,description:`条目化 wiki 设定、人物、地点、功法、法宝等公共资料；已清理章节来源标注，并补入南宫阙称谓。`},{id:`renjie-lingjie-persona-anime-like`,name:`人界、灵界与仙界设定集`,version:`2026-08-02-fanjingmei`,description:`部分人设比较接近动漫，并补充仙界篇人物、势力、地点与物品整理稿。`}],G=[],K={enabled:!1,autoSave:!1,autoInject:!0,autoMerge:!0,autoSaveFrequency:1,contextLimit:10,topK:20,similarityThreshold:.6,chunkSize:500,searchMethod:`semantic`,cooldownRounds:0,outdatedRetention:50,folders:[],rerank:{enabled:!1,url:B,apiKey:``,model:V,candidateTopK:20,scoreThreshold:H,topK:10},llmQueryEnabled:!1,deepSeekQueryWorkflowEnabled:!1,llmQueryPromptTemplate:M,embeddingProvider:`siliconflow-cn`,embeddingUrl:I,customEmbeddingUrl:``,embeddingModel:L,embeddingApiKey:``,customEmbeddingApiKey:``,publicKnowledgeSource:`local`,onlineVectorLibraryIds:G,timeFilterEnabled:!1,currentTimeRef:``,saveSummarizeEnabled:!1,vectorSavePromptTemplate:D,remoteLibraryManifestUrl:s(`vector-libs/index.json`)},q=K;function oe(e){let t=e==null?void 0:e.trim();return!t||t===j.trim()||t===ne.trim()||t.includes(`人物身份、关系、动机、背景 -> 优先 人物传记/{角色名}`)&&t.includes(`优先 势力档案/{势力名}`)&&t.includes(`优先 物品图鉴/...`)&&t.includes(`优先 时间线；整章回顾可参考 章节总结`)||t.includes(`主角经历、主角主线推进、主角关键因果 -> 优先 主角剧情线`)&&t.includes(`世界事件、支线因果、阶段推进 -> 优先 时间线；整章回顾可参考 章节总结`)||t.includes(`如果属于主角剧情线，仍然优先归入 时间线`)&&t.includes(`优先 剧情时间线`)?M:e??M}function se(e){let t=e==null?void 0:e.trim();return!t||t===te.trim()||t.includes(`主角剧情线：主角经历、主角主线推进、主角关键因果`)&&t.includes(`时间线：世界事件、支线事件、公共因果推进、阶段变化`)||t.includes(`人物传记：人物传记/{人物名称}`)&&t.includes(`势力档案：势力档案/{势力名称}`)&&t.includes(`地理志：地理志/{从大到小的稳定地理路径}`)&&t.includes(`物品图鉴：物品图鉴/法宝阵旗`)?D:e??D}function J(e){let t=Y(e.embeddingProvider),n=Z(e.embeddingProvider,e.embeddingUrl),r=Q(typeof e.customEmbeddingUrl==`string`?e.customEmbeddingUrl:n===`custom`?e.embeddingUrl:``),i=typeof e.customEmbeddingApiKey==`string`?e.customEmbeddingApiKey:!t&&n===`custom`&&typeof e.embeddingApiKey==`string`?e.embeddingApiKey:``,a=!t&&n===`custom`?``:typeof e.embeddingApiKey==`string`?e.embeddingApiKey:``;return{...e,searchMethod:fe(e.searchMethod),embeddingProvider:n,embeddingUrl:$(n,r),customEmbeddingUrl:r,embeddingApiKey:a,customEmbeddingApiKey:i,embeddingModel:L,publicKnowledgeSource:me(e.publicKnowledgeSource),onlineVectorLibraryIds:pe(e.onlineVectorLibraryIds),remoteLibraryManifestUrl:c(e.remoteLibraryManifestUrl,`vector-libs/index.json`)}}function ce(e){let t=e.embeddingProvider===`custom`?e.customEmbeddingApiKey:e.embeddingApiKey;return typeof t==`string`?t.trim():``}function le(e){return $(Z(e.embeddingProvider,e.embeddingUrl),typeof e.customEmbeddingUrl==`string`?e.customEmbeddingUrl:e.embeddingUrl)}function ue(e){return e.rerank.enabled?`hybrid`:`semantic`}function de(e){return e===0||typeof e!=`number`||!Number.isFinite(e)?H:Math.min(1,Math.max(0,e))}function fe(e){return e===`direct`||e===`hybrid`||e===`semantic`?e:e===`llm_index`?`direct`:q.searchMethod}function Y(e){return e===`siliconflow-cn`||e===`siliconflow-com`||e===`custom`}function X(e){if(typeof e!=`string`)return q.embeddingProvider;let n=e.trim();if(!n)return q.embeddingProvider;let r=t(n,`embeddings`);return r===`https://api.siliconflow.com/v1/embeddings`?`siliconflow-com`:r===`https://api.siliconflow.cn/v1/embeddings`?`siliconflow-cn`:`custom`}function Z(e,t){return Y(e)?e:X(t)}function Q(e){return typeof e==`string`?e.trim():``}function $(e,n){if(e===`siliconflow-com`)return F;if(e===`siliconflow-cn`)return P;let r=Q(n);return r?t(r,`embeddings`):``}function pe(e){if(!Array.isArray(e))return G;let t=new Set(W.map(e=>e.id));return Array.from(new Set(e.filter(e=>typeof e==`string`).map(e=>e.trim()).filter(e=>t.has(e))))}function me(e){return e===`online`?`online`:`local`}var he=e()((e,t)=>({config:{...q},loaded:!1,vectorizing:!1,searching:!1,lastSearchCount:0,updateConfig:async n=>{let i=J({...t().config,...n});e({config:i}),await r(N,i)},loadConfig:async()=>{let t=await i(N);if(t){var n,a,o;let i=Y(t.embeddingProvider),s=i?t.embeddingProvider:X(t.embeddingUrl),c=typeof t.customEmbeddingUrl==`string`?t.customEmbeddingUrl:s===`custom`?t.embeddingUrl:``,l=typeof t.customEmbeddingApiKey==`string`?t.customEmbeddingApiKey:s===`custom`?t.embeddingApiKey:``,u=J({...q,...t,embeddingProvider:s,customEmbeddingUrl:c,customEmbeddingApiKey:l,embeddingApiKey:!i&&s===`custom`?``:typeof t.embeddingApiKey==`string`?t.embeddingApiKey:``,llmQueryPromptTemplate:oe(t.llmQueryPromptTemplate),vectorSavePromptTemplate:se(t.vectorSavePromptTemplate),rerank:{...q.rerank,...t.rerank,url:((n=t.rerank)==null||(n=n.url)==null?void 0:n.trim())||`https://api.siliconflow.cn/v1/rerank`,model:((a=t.rerank)==null||(a=a.model)==null?void 0:a.trim())||`Qwen/Qwen3-Reranker-8B`,scoreThreshold:de((o=t.rerank)==null?void 0:o.scoreThreshold)}});e({config:u,loaded:!0}),(t.remoteLibraryManifestUrl!==u.remoteLibraryManifestUrl||!i||t.customEmbeddingUrl!==u.customEmbeddingUrl||t.customEmbeddingApiKey!==u.customEmbeddingApiKey)&&await r(N,u)}else e({loaded:!0})},setVectorizing:t=>e({vectorizing:t}),setSearching:t=>e({searching:t}),setLastSearchCount:t=>e({lastSearchCount:t}),updateRerank:async n=>{let i=t().config,a={...i.rerank,...n},o=J({...i,rerank:a});e({config:o}),await r(N,o)}}));export{w as A,re as C,y as D,m as E,p as F,E as I,d as L,_ as M,ae as N,C as O,T as P,s as R,ie as S,h as T,le as _,P as a,M as b,L as c,z as d,B as f,ce as g,J as h,I as i,b as j,S as k,U as l,H as m,N as n,F as o,V as p,G as r,R as s,K as t,W as u,ue as v,g as w,v as x,he as y};