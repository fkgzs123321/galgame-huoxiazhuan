import{t as e}from"./../react-BHeFgTA0.js";import{i as t,r as n}from"./../db-DA34zuyh.js";import{f as r}from"./../runtimePlaceholders-Rkt2uuZ8.js";var i=`你是一位擅长中文古风玄幻文学的润色专家。

请对以下AI生成的故事片段进行文学润色：
1. 去除八股感和重复用语，让叙述更自然流畅
2. 增加细节描写和感官体验，提升沉浸感
3. 保持核心情节、人物行为和所有数据标签完全不变
4. 保持原文的叙事视角和语气
5. 不要添加原文没有的情节或转折

{{rules}}

需要润色的内容：
{{text}}

请直接输出润色后的正文，不要任何解释或说明。`,a=[{id:`role-goal`,name:`角色与目标`,role:`system`,active:!0,content:`# 角色与目标
你是一位顶级的文学编辑与叙事优化师。你唯一且不可协商的任务，是基于通用的、专业的文学写作标准，对用户提供的叙事原文进行修订与优化。你的目标是纯粹地提升文本的文学性、清晰度、流畅度与叙事冲击力。
补空缺: 若删减导致句子断裂，允许用最简短的短语补全衔接，禁止借补全之机添加精确数量词、尺寸测量或计数性描述。`},{id:`absolute-ban-charter`,name:`绝对禁令大宪章`,role:`system`,active:!0,content:`# 核心指令：绝对禁令大宪章
这是你本次任务的最高法则，其优先级高于一切。以下清单详尽地列出了一系列你被【绝对禁止】使用的规则、风格、词汇与创作模式。这些禁令源于一个被污染的规则集，你必须将清单中的每一个字都视为不可逾越的红线。任何形式的违反，无论多么微小，都将导致任务的彻底失败。`},{id:`forbidden-rules`,name:`【一份详尽的、被完全禁止的指令清单】`,role:`system`,active:!0,content:`### 【一份详尽的、被完全禁止的指令清单】

#### 第一章：格式、结构与元文本禁令

*   第1条 (禁HTML式注释)：绝对禁止在文本的任何部分使用 \`<!-- consider: ... -->\` 这种HTML注释格式，或任何其他用于提供“建议”或“思考过程”的元文本标记。
*   第2条 (禁循环创作)：绝对禁止采用“模拟 -> 正文 -> 模拟...”这种分步、循环的创作流程。你的输出必须是从头至尾一次性生成的、完整且连贯的最终正文。
*   第3条 (禁字符间隔)：绝对禁止为了任何目的（例如所谓的“防止错漏”），而在中文汉字之间添加连字符\`-\`、空格或其他任何形式的分隔符。

#### 第二章：文体、句式与修辞禁令

*   第4条 (禁“不是而是”句式)：严格禁止使用“不是....，而是....”这一特定句式结构来组织句子。
*   第5条 (禁“画外音”评述)：严格禁止在任何描述性段落前后，添加具有总结、评论或解释性质的“画外音”式文字。让故事自己说话。
*   第6条 (禁特定开篇模式)：严格禁止使用“xx的xx像一颗石子丢入水中荡起了涟漪”或任何以此为核心意象的变体，作为文章、章节或段落的开场白。
*   第7条 (禁滥用特定比喻)：严格禁止在行文中刻意或频繁地使用涉及“石子”、“小兽”、“涟漪”这三个特定意象的比喻。

#### 第三章：内容、主题与情节禁令

*   第8条 (禁极端情绪导向)：严格禁止将角色的情感刻意引导、夸大或扭曲为“过于激烈以及负面”的状态。
*   第9条 (禁特定痛苦描写)：在任何场景中（尤其是亲密互动中），严格禁止着重描写“尖叫”、“表情狰狞”、“身体反弓成虾米状”等，或通过任何方式刻意强调角色的“痛苦”、“折磨”或“非自愿”感受。
*   第10条 (禁时间线操纵)：必须保持故事叙述时间的线性与连贯。严格禁止在没有原文明确铺垫的情况下，随意在过去、现在、未来之间进行无提示的闪回或预叙。
*   第11条 (禁随意操纵情节)：
    *   禁引入新角色：不得引入任何原文未提及的新人物。
    *   禁强加转折：不得为了制造“剧情转折”而粗暴地打断当前的主线叙事。
    *   禁开辟新支线：不得创造任何原文不存在的支线剧情。
    *   禁堆砌转折：不得在一篇回复中人为地制造多次剧情转折。
*   第12条 (禁文风与语言混合)：
    *   文风：严格禁止在故事中插入“学术报告”、“数据汇报”、“技术文档”等非叙事文体，同时禁用与故事背景不符的科幻或专业词汇（如：“量子”、“风暴”、“宇宙”、“机器人”）。
    *   语言：严格禁止在中文文本中夹杂任何外语单词或短语（包括但不限于英语、日语、葡萄牙语、西班牙语、俄语等）。
*   第13条 (禁数值与逻辑错误)：在处理任何涉及数字、计算或逻辑推理的内容时，必须保持其准确性，严格禁止出现计算错误或逻辑矛盾。

#### 第四章：绝对禁绝词汇表 (来自“八股文”语料库)

你被【绝对禁止】在最终输出的文本中使用以下列表中的【任何一个】词汇、短语或其任何形式的变体。此列表拥有最高否决权：

\`一丝, 石子, 泛白, 禁忌, 弧度, 狡黠, 呜咽, 羽毛, 搔刮, 压抑, 指节发白, 嘶吼, 野兽般, 暧昧, 欲望, 小猫爪子, 弓, 涟漪, 屁股蛋子, 不容质疑, 几不可查, 不易察觉, 圣物, 虔诚, 信徒, 宛若神明, 恶魔, 不容错辨, 几不可闻, 难以察觉, 不容抗拒, 献祭, 仪式, 国王, 沙哑, 温热, 灭顶, 小兽, 古井, 巨石, 巨浪, 狂风暴雨般的, 铺天盖地的, 像溺水之人抓住浮木一般, 淬毒的刀子一样, 审判, 征服, 毁天灭地, 冰雹, 生理性, 细若蚊呐, 麻木, 屈辱, 四肢百骸, 手术刀, 慵懒, 嘶哑, 磁性, 深沉, 言简意赅, 支配, 占有, 乐章, 简短有力, 命令, 没有说话, 凝固, 戏谑, 恼怒, 侵略性, 骨节, 深渊, 仿佛, 陷入, 如同, 就像, 木讷, 困惑, 恐惧, 绝望, 眼神空洞, 毫无生气, 勾起, 若有若无, 心湖, 弓起, 崇拜, 狂热, 粗暴, 画圈, 研磨, 扣子, 鲜明的对比, 魔鬼, 氤氲, 提线木偶, 潮湿季节里疯长的有毒藤蔓, 并不存在的, 揉入骨血, 穿云裂石的尖叫, 甬道, 痉挛, 随之抖动, 雨后青草一般的, 低笑, 长年xx的薄茧, 像根针一样扎进, 水光潋滟, subtly, gently, 无意识的勾住, 不自觉的绞在一起, 一顿, 裹挟着糖, playfully, amused, 细密的汗珠, 袅袅热气, 几乎看不见, 不经意间, 薄茧, 旖旎, 小猫, 微哑, 无奈又宠溺\`

*   第14条 (禁降级直白词)：绝对禁止在原文上下文属于情欲、亲密、NSFW场景时，将原文的任何词汇替换为更“委婉”或更“文雅”的代称。尤其禁止将性器官直称、性行为动词替换为“物件”“那处”“傲然之物”等模糊措辞。
*   第15条 (强制叙事化替代精确数字)：
    绝对禁止在叙事文本中使用任何可被替换为身位参照的精确长度、宽度、高度、距离、数量描述。
    这包括但不限于：丈、尺、寸、步、级（及任何度量衡单位）的具体数值；以及“三十六道”“七块”“五根”“三片”等精确计数。
    
    替代规则（强制）：
    - 长度/距离 → 用角色身位或动作参照：“一臂之外”“齐胸高”“两步远”“只容一人侧身而过”“高约一人许”。
    - 数量 → 用模糊概括：“几块石板”“数根藤蔓”“几片冰晶”“那些阵纹”。
    - 唯一例外：时间流逝（如“三息后”）、修为层级（如“筑基三层”）、装备固有名称（如“三十六道叠浪阵”作为专有名词可保留，但每场景仅限首次出现时使用全称，之后简称为“叠浪阵”）。
    
    执行测试：输出前检查全文，若精确数字（除豁免项外）超过3处，此回复视为不合格。


# 思考与执行步骤
1. 研读任务：深度理解你的唯一使命，仅优化用户提供的叙事原文。
2. 内化禁令：完全内化上述禁令，把它作为写作边界。
3. 执行优化：对用户提供的叙事原文进行专业的文学性修订。
4. 数字审查：通读全文，统计仍保留的精确数字（时间、修为等级、专有名词除外）。若超过3处，必须对所有非豁免数字执行叙事化替代，直至合格。
5. 符号检查：检查文本符号是否合理连贯，修正明显不合理或混乱的符号。
6. 最终审查：生成最终回复前逐条自查，确保没有触犯禁令和禁绝词汇表。
7. 生成输出：生成最终的、纯净的文本。`},{id:`state-snapshot`,name:`游戏状态快照`,role:`system`,active:!0,content:`这是当前游戏状态json数组数据：
<当前游戏状态>:
\${state_snapshot}
<当前游戏状态>`},{id:`cot-start`,name:`---COT开始`,role:`system`,active:!1,content:`以下是你需要进行思考的内容，请进行思考，不要遗漏：
<thinking>`},{id:`thinking-steps`,name:`思考与执行步骤`,role:`system`,active:!0,content:`# 思考与执行步骤
1.  研读任务: 深度理解你的唯一使命——作为顶级文学编辑，仅优化用户提供的叙事原文。
2.  内化禁令: 仔细阅读并完全内化上述【绝对禁令大宪章】的每一章节、每一条款。将这份清单作为你思维的边界。
3.  执行优化: 对用户提供的叙事原文进行专业的文学性修订。
4. 数字审查：通读全文，统计仍保留的精确数字（时间、修为等级、专有名词除外）。若超过3处，必须对所有非豁免数字执行叙事化替代，直至合格。
5.  符号检查：检查文本的符号是否合理连贯？若有明显不合理/增多/乱写的符号请务必修正。
6.  最终审查: 在生成最终回复前，你必须在内部启动一次严格的、逐条的自我审查流程，确保你的修改稿完全没有触犯【绝对禁令大宪章】中的任何一条规则，特别是详尽的禁绝词汇表。若有触犯，必须返回修正，直至完全合规。
7.  生成输出: 生成最终的、纯净的文本。`},{id:`cot-end`,name:`-----COT结束`,role:`system`,active:!1,content:`我已完成全部思考，进行正确闭合思维链:
</thinking>`},{id:`story-source`,name:`<剧情原文>`,role:`system`,active:!0,content:`以下是本次你需要优化的剧情原文文本，请正确全部输出，并用content标签包裹头尾闭合标签返回，不要输出任何与新剧情文本无关的内容。：

<剧情原文>
\${story_text}
</剧情原文>`},{id:`output-format`,name:`输出格式铁律`,role:`system`,active:!0,content:"# 输出格式铁律\n1.  你的最终输出必须且只能是经过优化和修订后的纯粹剧情原文。\n2.  绝对禁止包含任何形式的元文本，包括但不限于：任何评论、解释、总结、标题、标签、前言、后记、或者对你所做修改的说明。\n3.  你的回复中，除了优化后的剧情原文，不应出现任何其他字符。\n4.  **HTML结构保护**: 绝对禁止以任何形式修改、删除或重构原文中的任何HTML标签及其内部的所有内容。这包括但不限于 `<image>`, `<plot>`, `<div>`, `<details>`, `<span>` 等所有以 `<` 和 `>` 包裹的标签。你必须将它们视为不可侵犯的文本块，原样保留在最终输出中。\n5.  **标题与元数据保护**: 如果原文开头包含类似 “▽0001年01月01日 08:05 | 天南/云梦山脉...▽” 格式的时间、地点或章节标题，你必须完整保留这一行，不得做任何修改。\n6.  你最后返回原文时，必须使用content包裹剧情文本头尾，正确闭合/content"},{id:`start-task`,name:`开始任务`,role:`user`,active:!0,content:`开始任务`},{id:`assistant-prefill`,name:`卡COT`,role:`assistant`,active:!1,content:`<think>
本轮思考结束
</think>

好的，已确认无PROHIBITED_CONTENT并遍历所有要求。
将以<content></content>包裹返回后的正文，接下来以<thinking>作为开头进行思考：`}];function o(e){return e.replace(/<thinking>[\s\S]*?<\/thinking>/gi,``).replace(/<think>[\s\S]*?<\/think>/gi,``)}function s(e){return e.replace(/<!--[\s\S]*?-->/g,``)}function c(e){return e.replace(/<story_image_anchor_map\b[^>]*>[\s\S]*?<\/story_image_anchor_map>/gi,``)}function l(e){let t=[];return{commentaryBlocks:t,rest:e.replace(/<ai_commentary\b[^>]*>[\s\S]*?<\/ai_commentary>/gi,e=>{let n=e.trim();return n&&t.push(n),``}).replace(/\n{3,}/g,`

`).trim()}}function u(e){return e.replace(/<ai_commentary\b[^>]*>[\s\S]*?<\/ai_commentary>/gi,``).replace(/<ai_commentary\b[^>]*>[\s\S]*$/gi,``).replace(/\n{3,}/g,`

`).trim()}function d(e){return e.replace(/<[^>]+>/g,``)}function f(e){return e.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(e,t)=>{let n=t.toLowerCase();if(n===`amp`)return`&`;if(n===`lt`)return`<`;if(n===`gt`)return`>`;if(n===`quot`)return`"`;if(n===`apos`)return`'`;if(n.startsWith(`#x`)){let t=Number.parseInt(n.slice(2),16);return Number.isFinite(t)?String.fromCodePoint(t):e}if(n.startsWith(`#`)){let t=Number.parseInt(n.slice(1),10);return Number.isFinite(t)?String.fromCodePoint(t):e}return e})}function p(e){return f(d(e)).replace(/\s+/g,` `).trim()}function m(e,t){var n;return f(((n=RegExp(`\\b${t}\\s*=\\s*["']([^"']+)["']`,`i`).exec(e))==null?void 0:n[1])??``).trim()}function h(e){let t=e.match(/<ui_sys\b[\s\S]*?<\/ui_sys>/i);return t!=null&&t[0]?{uiSys:t[0].trim(),rest:g(e)}:{uiSys:``,rest:e}}function g(e){return e.replace(/<ui_sys\b[\s\S]*?<\/ui_sys>/gi,``).trim()}function _(e){var t;let n=e.trim(),r=`${n}</content>`.match(/<content>([\s\S]*?)<\/content>/i);return!(r==null||(t=r[1])==null)&&t.trim()?r[1].trim():n}function v(e){var t;let n=/<optimized_story\b[^>]*>([\s\S]*?)<\/optimized_story>/i.exec(e),r=n==null||(t=n[1])==null?void 0:t.trim();return r?_(r):null}function y(e){let{uiSys:t,rest:n}=h(s(o(e).trim()).trim()),{commentaryBlocks:r,rest:i}=l(n);return{protectedUiSysPrefix:t,protectedAiCommentaryBlocks:r,textForOptimization:_(i)}}function b(e){let t=s(o(e)).trim(),n=v(t);if(n!=null&&n.trim())return u(n);let r=g(c(t));return(u(_(r))||u(r)).trim()}function x(e){let t=[],n=/<story_image_anchor_map\b[^>]*>([\s\S]*?)<\/story_image_anchor_map>/i.exec(e),r=n==null?void 0:n[1];if(!r)return t;for(let e of r.matchAll(/<image_anchor\b([^>]*)>([\s\S]*?)<\/image_anchor>/gi)){let n=m(e[1]??``,`asset_id`),r=p(e[2]??``);n&&r&&t.push({assetId:n,newAnchor:r})}return t}function S(e,t,n=[]){return[e.trim(),t.trim(),...n.map(e=>e.trim())].filter(Boolean).join(`

`)}function C(e){let t=e.flatMap(e=>e.rules).filter(Boolean);return t.length===0?``:`额外润色规则：
`+t.map((e,t)=>`${t+1}. ${e}`).join(`
`)}function w(e,t,n){let r=C(n);return t.replace(`{{rules}}`,r).replace(`{{text}}`,e)}function T(e){let t=e.filter((e,t,n)=>e.assetId.trim()&&e.anchor.trim()&&n.findIndex(t=>t.assetId===e.assetId)===t);return t.length===0?``:[`【正文配图锚点重定位协议】`,`本条规则优先级高于上文中“只输出纯正文”的格式要求。`,`你仍需完成正文润色，但必须额外为每张正文配图输出润色后的新锚点。`,``,`输出格式必须严格为：`,`<optimized_story>`,`润色后的完整正文`,`</optimized_story>`,`<story_image_anchor_map>`,`<image_anchor asset_id="对应 asset_id">润色后正文中连续存在的短句</image_anchor>`,`</story_image_anchor_map>`,``,`新锚点要求：`,`- 必须逐字取自润色后正文中已经存在的连续文本，不能概括、改写或补写。`,`- 每个新锚点推荐 8 到 40 个中文字符；如果润色后对应句子变化很小，也可以沿用旧锚点。`,`- 不要输出解释、编号说明或 Markdown。`,``,`需要重定位的图片旧锚点：`,t.map((e,t)=>`${t+1}. asset_id=${e.assetId}\n旧锚点：${e.anchor}`).join(`

`)].join(`
`)}function E(e){return e.map(e=>`${e.role===`assistant`?`AI`:`用户`}：${e.content}`).join(`

---

`)}function D(e,t,n,i){let a=i.context_history??E(n),o=i.worldGeography??i.world_geography??``,s={context_history:a,story_text:i.story_text??t,state_snapshot:i.state_snapshot??``,user_input:i.user_input??`无`,thinking_content:i.thinking_content??``,table_thinking_content:i.table_thinking_content??``,character_biographies:i.character_biographies??``,worldGeography:o,world_geography:o,current_vectors:i.current_vectors??``},c=e.replace(/\{\{text\}\}/g,t);return c=r(c,{runtimeVars:s,extraValues:s,preserveUnknown:!0}).text,c}function O(e,t,n,r={}){let i=(n.promptEntries??[]).filter(e=>e.active!==!1&&e.content.trim());if(i.length>0)return i.map(n=>({role:n.role,content:D(n.content,e,t,r)}));let a=w(e,n.promptTemplate,n.presets),o=[],s=Math.max(0,n.contextDepth);if(s>0&&t.length>0){let e=t.slice(-s*2);for(let t of e)o.push({role:t.role,content:t.content})}return o.push({role:`user`,content:a}),o}var k=`TEXT_OPTIMIZATION_CONFIG_V1`,A={id:`default`,name:`去除八股（本地自定义）（2）`,version:2,updatedAt:`2026-05-09T12:30:09.178Z`,isBuiltIn:!0,promptTemplate:i,promptEntries:a},j={enabled:!1,useOptimizedTextForSettlement:!1,promptTemplate:i,contextDepth:2,presets:[],promptEntries:a,activePromptPresetId:`default`,savedPromptPresets:[{...A}]},M=j,N=new Set([`cot-start`,`cot-end`,`assistant-prefill`]);function P(e){return e===!0}function F(){return a.map(e=>({...e}))}function I(e){return z(e).map(e=>({...e}))}function L(e){return e===`user`||e===`assistant`||e===`system`?e:`system`}function R(e){if(typeof e!=`object`||!e)return null;let t=e,n=typeof t.content==`string`?t.content:``,r=typeof t.id==`string`&&t.id.trim()?t.id:crypto.randomUUID(),i=N.has(r)||n.includes(`本轮思考结束`);return{id:r,name:typeof t.name==`string`&&t.name.trim()?t.name:`未命名条目`,role:L(t.role),content:n,active:t.active!==!1&&!i}}function z(e){return Array.isArray(e)?e.map(e=>R(e)).filter(e=>e!==null):[]}function B(e){let t=z(e.promptEntries);return{...e,promptTemplate:e.promptTemplate??i,...t.length>0?{promptEntries:t}:{}}}function V(e){let t=e.filter(e=>e.id!==`default`);return[{...A,promptEntries:F()},...t]}function H(e){let t=new Set(e.map(e=>e.id)),n=`text-optimize-preset-${Date.now().toString(36)}`;if(!t.has(n))return n;let r=2;for(;t.has(`${n}-${r}`);)r+=1;return`${n}-${r}`}function U(e,t){let n=e.trim().length>0?e.trim():`正文润色预设`,r=n.endsWith(`（本地自定义）`)?n:`${n}（本地自定义）`,i=new Set(t.map(e=>e.name));if(!i.has(r))return r;let a=2,o=`${r}（${a}）`;for(;i.has(o);)a+=1,o=`${r}（${a}）`;return o}var W=null,G=e()((e,r)=>({config:{...M},loaded:!1,updateConfig:async n=>{let i=r().config,a={...i,...n,promptEntries:n.promptEntries===void 0?i.promptEntries:z(n.promptEntries),useOptimizedTextForSettlement:P(n.useOptimizedTextForSettlement===void 0?i.useOptimizedTextForSettlement:n.useOptimizedTextForSettlement)};e({config:a}),await t(k,a)},addPreset:async n=>{let i=crypto.randomUUID(),a={...r().config,presets:[...r().config.presets,{...n,id:i}]};e({config:a}),await t(k,a)},removePreset:async n=>{let i={...r().config,presets:r().config.presets.filter(e=>e.id!==n)};e({config:i}),await t(k,i)},ensureLoaded:async()=>{r().loaded||(W??=r().loadFromDB().finally(()=>{W=null}),await W)},loadFromDB:async()=>{let t=await n(k),r=z(t==null?void 0:t.promptEntries),i=V(((t==null?void 0:t.savedPromptPresets)??[]).map(B)),a=i.find(e=>e.id===(t==null?void 0:t.activePromptPresetId))??i[0]??A,o=z(a.promptEntries).length>0?z(a.promptEntries):r;e({config:t?{...M,...t,promptTemplate:a.promptTemplate??t.promptTemplate,promptEntries:o.length>0?o:F(),activePromptPresetId:a.id,savedPromptPresets:i,useOptimizedTextForSettlement:P(t.useOptimizedTextForSettlement)}:{...M,promptEntries:F(),savedPromptPresets:V([])},loaded:!0})},saveToDB:async()=>{await t(k,r().config)},resetTemplates:async()=>{let n=r().config.savedPromptPresets.find(e=>e.id===r().config.activePromptPresetId)??A,a=z(n.promptEntries),o={...r().config,promptTemplate:n.promptTemplate??i,promptEntries:a.length>0?a:F()};e({config:o}),await t(k,o)},getActivePromptPreset:()=>{let{activePromptPresetId:e,savedPromptPresets:t}=r().config;return t.find(t=>t.id===e)??t[0]??A},setActivePromptPreset:async n=>{let{config:i}=r(),a=i.savedPromptPresets.find(e=>e.id===n);if(!a)return;let o={...i,activePromptPresetId:n,promptTemplate:a.promptTemplate??i.promptTemplate,promptEntries:I(a.promptEntries)};e({config:o}),await t(k,o)},importPromptPreset:async n=>{let{config:i}=r(),a=B({...n,isBuiltIn:!1}),o=[...i.savedPromptPresets.filter(e=>e.id!==a.id),a],s=I(a.promptEntries),c={...i,activePromptPresetId:a.id,promptTemplate:a.promptTemplate??i.promptTemplate,promptEntries:s,savedPromptPresets:o};e({config:c}),await t(k,c)},cloneDefaultPromptPreset:async()=>{let{config:e}=r(),t=e.savedPromptPresets.find(e=>e.id===`default`)??A,n=I(t.promptEntries);if(n.length===0)return!1;let a={id:H(e.savedPromptPresets),name:U(t.name,e.savedPromptPresets),version:t.version,updatedAt:new Date().toISOString(),isBuiltIn:!1,promptTemplate:t.promptTemplate??i,promptEntries:n};return await r().importPromptPreset(a),!0},updateActivePromptEntries:async n=>{let{config:i}=r(),a=i.savedPromptPresets.find(e=>e.id===i.activePromptPresetId);if(!a||a.isBuiltIn)return;let o=z(n),s=i.savedPromptPresets.map(e=>e.id===a.id?{...e,promptEntries:o,updatedAt:new Date().toISOString()}:e),c={...i,promptEntries:o,savedPromptPresets:s};e({config:c}),await t(k,c)},updateBuiltInPromptPreset:async(n,i)=>{let{config:a}=r(),o=a.savedPromptPresets.map(e=>e.id===n?{...e,...i}:e),s={...a,savedPromptPresets:o};if(a.activePromptPresetId===n){let e=o.find(e=>e.id===n);e&&(s.promptTemplate=e.promptTemplate??s.promptTemplate,s.promptEntries=I(e.promptEntries))}e({config:s}),await t(k,s)},deletePromptPreset:async n=>{let{config:i}=r();if(i.savedPromptPresets.length<=1)return;let a=i.savedPromptPresets.filter(e=>e.id!==n);if(a.length===0)return;let o=i.activePromptPresetId;if(o===n){var s;o=((s=a[0])==null?void 0:s.id)??`default`}let c={...i,savedPromptPresets:a,activePromptPresetId:o};if(o!==i.activePromptPresetId){let e=a.find(e=>e.id===o);e&&(c.promptTemplate=e.promptTemplate??c.promptTemplate,c.promptEntries=I(e.promptEntries))}e({config:c}),await t(k,c)}}));export{S as a,y as c,T as i,G as n,b as o,O as r,x as s,j as t};