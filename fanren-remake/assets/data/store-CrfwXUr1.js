import{t as e}from"./../react-BHeFgTA0.js";import{i as t,r as n}from"./../db-DA34zuyh.js";import{_ as r,g as i,v as a,w as o,x as s,y as c}from"./store-CfzTOtlj.js";var l=`custom-pre-main-request:`,u=`## 自定义正文前请求`,d=`after-character-behavior`,f=[`before-original-canon`,`after-original-canon`,`after-writing-directive`,`after-character-behavior`],p={"before-original-canon":`原著指导前`,"after-original-canon":`原著指导后`,"after-writing-directive":`正文写作指导后`,"after-character-behavior":`人物行为分析后`},m=`《自定义正文前请求》

【任务】
请基于本轮上下文，输出一段可直接注入正文模型的辅助分析。
不要写正文，不输出状态命令，不创建已成事实。

【当前玩家输入】
\${playerAction}

【近期正文】
\${storyText}

【当前时间地点】
\${currentTime}
\${currentLocation}

【玩家状态】
\${playerSnapshot}

【在场NPC】
\${onScreenNpcs}

【叙事记忆】
\${narrativeMemoryContext}

【知识库检索内容】
\${ragContext}

【输出要求】
只输出给正文模型看的分析结果。`;function h(e){return i(l,e)}var g=s,_=c,v=a;function y(e){return f.indexOf(e)}function b(e){return e.map((e,t)=>({request:e,index:t})).sort((e,t)=>y(e.request.runStage)-y(t.request.runStage)||e.index-t.index).map(({request:e})=>e)}function x(e,t){return b(e).filter(e=>e.runStage===t)}function S(e,t){let n=y(t);return b(e).filter(e=>e.enabled&&y(e.runStage)<n)}function C(e,t,n){let r=n?new Set(S(e,n).map(e=>e.id)):null;return Object.fromEntries(e.filter(e=>e.enabled).map(e=>{var n;let i=g(e.outputPlaceholder);return[i,!r||r.has(e.id)?((n=t[i])==null?void 0:n.trim())??``:``]}))}function w(e,t){if(!e.enabled)return[];let n=t?S(e.requests,t):b(e.requests).filter(e=>e.enabled),r=new Set;return n.flatMap(e=>{let t=g(e.outputPlaceholder);return!t||r.has(t)?[]:(r.add(t),[{id:`custom_pre_main_${t}`,label:t,description:`本回合自定义正文前请求“${e.name||t}”的完整结果。`,group:`自定义正文前请求`,source:`stage`,aliases:[t],usageHint:e.name||void 0}])})}function T(e,t,n){return r(e,t,n,u)}function E(e,t=new Set){return o(b(e),t)}var D=`CULTIVATION_CUSTOM_PRE_MAIN_REQUESTS_CONFIG_V1`,O={id:`default-analysis`,name:`自定义分析`,enabled:!1,outputPlaceholder:`custom_analysis`,promptTemplate:m,executionMode:`parallel`,autoInjectWhenUnused:!0,runStage:d},k={enabled:!1,requests:[{...O}]};function A(){return typeof crypto<`u`&&typeof crypto.randomUUID==`function`?crypto.randomUUID():`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}function j(e){return e===`sequential`?`sequential`:`parallel`}function M(e){return e===`before-original-canon`||e===`after-original-canon`||e===`after-writing-directive`||e===`after-character-behavior`?e:d}function N(e,t){if(!e||typeof e!=`object`)return null;let n=e,r=typeof n.id==`string`&&n.id.trim()?n.id.trim():A(),i=typeof n.name==`string`&&n.name.trim()?n.name.trim():`自定义请求 ${t+1}`,a=typeof n.outputPlaceholder==`string`&&n.outputPlaceholder.trim()?n.outputPlaceholder.trim():`custom_result_${t+1}`,o=typeof n.promptTemplate==`string`&&n.promptTemplate.trim()?n.promptTemplate:m;return{id:r,name:i,enabled:n.enabled===!0,outputPlaceholder:a,promptTemplate:o,executionMode:j(n.executionMode),autoInjectWhenUnused:n.autoInjectWhenUnused!==!1,runStage:M(n.runStage)}}function P(e){if(!Array.isArray(e))return[{...O}];let t=e.map((e,t)=>N(e,t)).filter(e=>e!==null);return t.length>0?t:[{...O}]}function F(e){return{enabled:(e==null?void 0:e.enabled)===!0,requests:P(e==null?void 0:e.requests)}}async function I(){let e=R.getState();return e.loaded||await e.loadConfig(),R.getState().config}function L(e={}){return{id:A(),name:e.name??`自定义请求`,enabled:e.enabled??!0,outputPlaceholder:e.outputPlaceholder??`custom_result`,promptTemplate:e.promptTemplate??m,executionMode:e.executionMode??`parallel`,autoInjectWhenUnused:e.autoInjectWhenUnused??!0,runStage:e.runStage??`after-character-behavior`}}var R=e()((e,r)=>({config:{...k},loaded:!1,loadConfig:async()=>{e({config:F(await n(D)),loaded:!0})},updateConfig:async n=>{let i=F({...r().config,...n});e({config:i,loaded:!0}),await t(D,i)}}));export{E as _,l as a,h as c,T as d,v as f,b as g,g as h,u as i,w as l,x as m,I as n,f as o,_ as p,R as r,p as s,L as t,C as u};