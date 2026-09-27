import{n as e,r as t}from"./../db-JgkDa17f.js";import{t as n}from"./../react-DH4q67oS.js";const r=`CULTIVATION_DEEP_SUMMARY_CONFIG_V1`;function i(e){return`CULTIVATION_DEEP_SUMMARY_TEXT_${e}`}function a(e){return`CULTIVATION_DEEP_SUMMARY_HISTORY_${e}`}function o(e,t){return{id:`deep-summary-${String(t)}-${Math.random().toString(36).slice(2,8)}`,createdAt:t,text:e,charCount:e.length}}function s(e,t){if(typeof e!=`object`||!e||Array.isArray(e))return null;let n=e,r=typeof n.text==`string`?n.text.trim():``;if(!r)return null;let i=typeof n.createdAt==`number`&&Number.isFinite(n.createdAt)?n.createdAt:Date.now()+t;return{id:typeof n.id==`string`&&n.id.trim()?n.id:`deep-summary-${String(i)}-${String(t)}`,createdAt:i,text:r,charCount:typeof n.charCount==`number`&&Number.isFinite(n.charCount)?n.charCount:r.length}}function c(e){return Array.isArray(e)?e.map((e,t)=>s(e,t)).filter(e=>e!==null).sort((e,t)=>e.createdAt-t.createdAt).slice(-12):[]}const l={enabled:!1,autoDeepSummary:!1,deepSummaryThreshold:100,recentFullTextCount:5,smallSummaryWindowSize:25,deepSummaryPrompt:`你是一名专业的小说档案管理员。
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

{{content}}`,wrapPastMemory:!0};async function u(){let{useNarrativeMemoryStore:e}=await import(`./store-BDi7AZy5.js`),t=e.getState();t.loaded||await t.loadConfig(),e.getState().config.enabled&&await e.getState().updateConfig({enabled:!1})}const d=n()((n,s)=>({config:{...l},loaded:!1,isCompressing:!1,compressProgress:``,deepSummaryText:``,deepSummaryHistory:[],loadFromDB:async()=>{let t=await e(r);n({config:t?{...l,...t}:{...l},loaded:!0})},saveToDB:async()=>{await t(r,s().config)},updateConfig:e=>{n(t=>({config:{...t.config,...e}}))},setEnabled:async e=>{e&&await u(),n(t=>({config:{...t.config,enabled:e}})),await t(r,s().config)},setIsCompressing:e=>n({isCompressing:e}),setCompressProgress:e=>n({compressProgress:e}),loadDeepSummaryText:async(r,o)=>{let s=o?.trim()??``;try{let[o,l]=await Promise.all([e(i(r)),e(a(r))]),u=c(l);if(typeof o==`string`){n({deepSummaryText:o,deepSummaryHistory:u});return}n({deepSummaryText:s,deepSummaryHistory:u}),s&&await t(i(r),s)}catch{n({deepSummaryText:s,deepSummaryHistory:[]}),s&&await t(i(r),s)}},saveDeepSummaryText:async e=>{let n=s().deepSummaryText;await t(i(e),n)},setDeepSummaryText:e=>{n({deepSummaryText:e})},overwriteDeepSummaryText:async(r,o)=>{let l=o.trim(),u=s().deepSummaryText.trim();if(!l||l===u)return;let d=c(await e(a(r))),f=d.findLastIndex(e=>e.text.trim()===u),p=f>=0?d.map((e,t)=>t===f?{...e,text:l,charCount:l.length}:e):d,m=[t(i(r),l)];f>=0&&m.push(t(a(r),p)),await Promise.all(m),n({deepSummaryText:l,deepSummaryHistory:p})},clearDeepSummaryState:async e=>{await Promise.all([t(i(e),``),t(a(e),[])]),n({deepSummaryText:``,deepSummaryHistory:[]})},recordDeepSummaryVersion:async(r,i)=>{let s=i.trim();if(!s)return;let l=c(await e(a(r)));if(l.at(-1)?.text===s){n({deepSummaryHistory:l});return}let u=[...l,o(s,Date.now())].slice(-12);await t(a(r),u),n({deepSummaryHistory:u})}}));export{d as n,l as t};