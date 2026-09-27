const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/data/store-DJKCpIRv.js","assets/data/store-B0QujAZR.js","assets/db-DA34zuyh.js","assets/chunk-Dlw1TIMF.js","assets/preload-helper-BMwy4Dhw.js","assets/react-BHeFgTA0.js","assets/react-2HmPiAds.js","assets/featureIds-DQSI6tZ2.js","assets/stores/configStore-BaIrYsRn.js","assets/itemCategories-D6C0gn0w.js","assets/chineseTextNormalization-CbUrTa9r.js","assets/languages-B5FKjVNP.js","assets/gameTimeFormat-BN-4_tTX.js","assets/data/store-DhBzpdf-2.js","assets/gateway/apiEndpointUrl-C7uIHu-B.js"])))=>i.map(i=>d[i]);
import{t as e}from"./../preload-helper-BMwy4Dhw.js";import{t}from"./../react-BHeFgTA0.js";import{i as n,r}from"./../db-DA34zuyh.js";var i=`CULTIVATION_DEEP_SUMMARY_CONFIG_V1`,a=12;function o(e){return`CULTIVATION_DEEP_SUMMARY_TEXT_${e}`}function s(e){return`CULTIVATION_DEEP_SUMMARY_HISTORY_${e}`}function c(e,t){return{id:`deep-summary-${String(t)}-${Math.random().toString(36).slice(2,8)}`,createdAt:t,text:e,charCount:e.length}}function l(e,t){if(typeof e!=`object`||!e||Array.isArray(e))return null;let n=e,r=typeof n.text==`string`?n.text.trim():``;if(!r)return null;let i=typeof n.createdAt==`number`&&Number.isFinite(n.createdAt)?n.createdAt:Date.now()+t;return{id:typeof n.id==`string`&&n.id.trim()?n.id:`deep-summary-${String(i)}-${String(t)}`,createdAt:i,text:r,charCount:typeof n.charCount==`number`&&Number.isFinite(n.charCount)?n.charCount:r.length}}function u(e){return Array.isArray(e)?e.map((e,t)=>l(e,t)).filter(e=>e!==null).sort((e,t)=>e.createdAt-t.createdAt).slice(-a):[]}var d={enabled:!1,autoDeepSummary:!1,deepSummaryThreshold:100,recentFullTextCount:5,smallSummaryWindowSize:25,deepSummaryPrompt:`你是一名专业的小说档案管理员。
请阅读下方提供的剧情记录，将其整理为清晰、可回看的深度记忆档案。
请按"约每10层"或"剧情小节"为单位进行分段记录，并在整合时保留已有深度记忆中的关键事实。

硬性要求:
1. 最终 <deep_summary> 正文至少 300 字，推荐 300-500 字；已有档案本来就更长时，允许继续超过 500 字。
2. 绝对不能把已有深度记忆压缩成一句话、单段概述或几条极短 bullet。
3. 必须保留关键阶段、重要人物关系变化、未完任务、当前局势，不得因为“精炼”而删空旧事实。
4. 如果新增内容较少，也要在旧档基础上做增量更新，而不是回缩成更短版本。

请严格遵守以下输出格式（保留XML标签）：

<deep_summary>
<过往事件(可按时间段或剧情段整理)>
{剧情小节}: [时间/地点]
剧情概括: (忠实记录NPC与主角的言行举止，主角经历的事件，保留关键细节)
[重要NPC记录]
- NPC名字: 共同经历事件 | 态度转变 | 当前关系 | 当前进行的事件
- NPC名字: ...

(根据输入内容的长度，请重复上述结构及其详细信息，确保不遗漏)
</deep_summary>

{{content}}`,wrapPastMemory:!0};async function f(){let{useNarrativeMemoryStore:t}=await e(async()=>{let{useNarrativeMemoryStore:e}=await import(`./store-DJKCpIRv.js`);return{useNarrativeMemoryStore:e}},__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14])),n=t.getState();n.loaded||await n.loadConfig(),t.getState().config.enabled&&await t.getState().updateConfig({enabled:!1})}var p=t()((e,t)=>({config:{...d},loaded:!1,isCompressing:!1,compressProgress:``,deepSummaryText:``,deepSummaryHistory:[],loadFromDB:async()=>{let t=await r(i);e({config:t?{...d,...t}:{...d},loaded:!0})},saveToDB:async()=>{await n(i,t().config)},updateConfig:t=>{e(e=>({config:{...e.config,...t}}))},setEnabled:async r=>{r&&await f(),e(e=>({config:{...e.config,enabled:r}})),await n(i,t().config)},setIsCompressing:t=>e({isCompressing:t}),setCompressProgress:t=>e({compressProgress:t}),loadDeepSummaryText:async(t,i)=>{let a=(i==null?void 0:i.trim())??``;try{let[i,c]=await Promise.all([r(o(t)),r(s(t))]),l=u(c);if(typeof i==`string`){e({deepSummaryText:i,deepSummaryHistory:l});return}e({deepSummaryText:a,deepSummaryHistory:l}),a&&await n(o(t),a)}catch{e({deepSummaryText:a,deepSummaryHistory:[]}),a&&await n(o(t),a)}},saveDeepSummaryText:async e=>{let r=t().deepSummaryText;await n(o(e),r)},setDeepSummaryText:t=>{e({deepSummaryText:t})},overwriteDeepSummaryText:async(i,a)=>{let c=a.trim(),l=t().deepSummaryText.trim();if(!c||c===l)return;let d=u(await r(s(i))),f=d.findLastIndex(e=>e.text.trim()===l),p=f>=0?d.map((e,t)=>t===f?{...e,text:c,charCount:c.length}:e):d,m=[n(o(i),c)];f>=0&&m.push(n(s(i),p)),await Promise.all(m),e({deepSummaryText:c,deepSummaryHistory:p})},clearDeepSummaryState:async t=>{await Promise.all([n(o(t),``),n(s(t),[])]),e({deepSummaryText:``,deepSummaryHistory:[]})},recordDeepSummaryVersion:async(t,i)=>{let o=i.trim();if(!o)return;let l=u(await r(s(t))),d=l.at(-1);if((d==null?void 0:d.text)===o){e({deepSummaryHistory:l});return}let f=[...l,c(o,Date.now())].slice(-a);await n(s(t),f),e({deepSummaryHistory:f})}}));export{p as n,d as t};