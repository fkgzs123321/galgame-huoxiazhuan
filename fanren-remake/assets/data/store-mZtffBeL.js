import{n as e}from"./chineseTextNormalization-C1YoK6JQ.js";import{c as t,n,o as r,r as i,t as a}from"./../db-JgkDa17f.js";import{t as o}from"./../react-DH4q67oS.js";const s=[`武器`,`防具`,`饰品`,`功法`,`法宝`],c=[`丹药`,`符箓`,`材料`,`灵药`],l=[`阵具`,`重要物品`,`凡物`,`其他物品`],u=[...s,...c,...l],ee=`其他物品`;Object.fromEntries(u.map(e=>[e,e]));const te=new Set(u),d=new Set(s);new Set(c);const f={武器:`weapon`,防具:`armor`,饰品:`accessory`,功法:`technique`,法宝:`treasure`};function p(e){return(e??``).replace(/<[^>]+>/g,``).replace(/\s+/g,` `).trim()}function m(e,t){return t.some(t=>e.includes(t))}function ne(e){return m(e,[`内衣`,`小衣`,`肚兜`,`胸衣`,`文胸`,`抹胸`,`内裤`,`亵衣`,`情趣内衣`])}function re(e){return/丝袜|连裤袜|裤袜|长袜|过膝袜|罗袜|筒袜|吊带袜|stocking|tights|hosiery/i.test(e)}function h(e){return ne(e)||re(e)}function g(t){let n=e(t);return n?te.has(n)?n:/(^|[|/\s·,，；;])阵(盘|旗|图|具)|阵盘|阵旗|阵图|阵具|禁制盘/.test(n)?`阵具`:m(n,[`身份信物`,`信物`,`令牌`,`腰牌`,`任务物品`,`任务关键`,`剧情关键`,`关键物`,`通行凭证`,`凭证`,`契约`,`地契`,`玉简`,`地图`,`钥匙`])?`重要物品`:m(n,[`丹药`,`丹丸`,`灵丹`,`丹方成丹`,`药丸`,`药散`,`药粉`,`药液`,`灵兽丹`])?`丹药`:m(n,[`符箓`,`灵符`,`符纸`,`符宝`,`符篆`])||/(^|[|/\s·,，；;])符($|[|/\s·,，；;])/.test(n)?`符箓`:m(n,[`灵药`,`灵植`,`仙草`,`灵草`,`药苗`,`灵种`,`灵药种子`,`灵植种子`,`灵草种子`,`灵芝`,`灵参`])?`灵药`:m(n,[`材料`,`灵材`,`药材`,`草药`,`矿石`,`矿材`,`炼器材`,`炼丹材`,`妖兽材料`])?`材料`:m(n,[`补给`,`食物`,`食品`,`灵食`,`兽粮`,`香料`])?`其他物品`:m(n,[`凡物`,`凡俗物品`,`凡人用品`,`凡俗用品`,`俗物`,`普通物品`,`生活用品`])?`凡物`:m(n,[`武器`,`兵器`,`剑`,`刀`,`枪`,`弓`,`戟`])?`武器`:m(n,[`护甲`,`防具`,`护具`,`盔甲`,`甲胄`,`内甲`,`法衣`,`披风`,`斗篷`])||h(n)?`防具`:m(n,[`饰品`,`首饰`,`发簪`,`玉佩`,`戒指`,`项链`,`护符`])?`饰品`:m(n,[`功法`,`心法`,`口诀`,`经文`,`秘籍`,`秘典`,`功法载体`])?`功法`:m(n,[`法宝`,`法器`,`灵宝`,`古宝`,`仿制灵宝`,`通天灵宝`,`玄天圣器`,`玄天残宝`,`玄天之宝`])?`法宝`:m(n,[`杂物`,`其他`,`物品`,`道具`])?`其他物品`:null:null}function _(e,t={}){let n=t.fallback??`其他物品`;return g(p(e))??n}function v(e){let t=b(e,{fallback:``})||`其他物品`,n=e.type?_(e.type,{fallback:t})===`其他物品`?t:_(e.type,{fallback:t}):e.type;return e.category===t&&e.type===n?e:{...e,category:t,...n?{type:n}:{}}}function ie(e){return d.has(_(e,{fallback:``}))}function y(e){let t=_(e,{fallback:``});return d.has(t)&&t!==`功法`}function b(e,t={}){let n=t.fallback??`其他物品`;return h([e.name,e.type].filter(Boolean).join(` `))?`防具`:_(e.category,{fallback:``})||_(e.type,{fallback:``})||_([e.name,e.description,e.effect,e.currentEffect,e.realmEffects].filter(Boolean).join(` `),{fallback:``})||n}function ae(e){let t=_(e,{fallback:``});return t?f[t]??null:null}function oe(e){switch(e){case`weapon`:return`武器`;case`armor`:return`防具`;case`accessory`:return`饰品`;case`technique`:return`功法`;case`treasure`:return`法宝`;default:return null}}function se(){return[`装备子类：${s.join(` / `)}`,`消耗品子类：${c.join(` / `)}`,`特殊类：${l.join(` / `)}`].join(`
`)}const x=[`h24`,`h12`],ce=[`modern`,`shichen`],le=`modern`,S=999999,C=/^([0-9０-９]{1,2})\s*:\s*([0-9０-９]{2})(?:\s*([AaPp][Mm]))?$/u,w=/([0-9０-９]{1,6}\s*年\s*[0-9０-９]{1,2}\s*月\s*[0-9０-９]{1,2}\s*日)\s+([0-9０-９]{1,2}\s*:\s*[0-9０-９]{2})(?:\s*([AaPp][Mm]))?/u;function T(e){return e.replace(/[０-９]/g,e=>String.fromCharCode(e.charCodeAt(0)-65296+48))}function ue(e){return x.includes(e)}function de(e){return ce.includes(e)}function fe(e){if(!e)return null;let t=e.trim().toUpperCase();return t===`AM`||t===`PM`?t:null}function pe(e){let t=T(e.trim()).match(C);if(!t?.[1]||!t[2])return null;let n=Number.parseInt(t[1],10),r=Number.parseInt(t[2],10),i=fe(t[3]);return!Number.isInteger(n)||!Number.isInteger(r)||r<0||r>59?null:i?n<1||n>12?null:{hour:n===12?i===`AM`?0:12:n+(i===`PM`?12:0),minute:r}:n<0||n>23?null:{hour:n,minute:r}}function me(e){let t=(e.hour%24+24)%24;return`${String(t).padStart(2,`0`)}:${String(e.minute).padStart(2,`0`)}`}function he(e){let t=(e.hour%24+24)%24,n=t%12==0?12:t%12,r=t<12?`AM`:`PM`;return`${String(n).padStart(2,`0`)}:${String(e.minute).padStart(2,`0`)} ${r}`}function E(e,t){return t===`h12`?he(e):me(e)}function D(e,t=`h24`){let n=pe(e);return n?E(n,t):null}function O(e,t=`h24`){return T(e).replace(w,(e,n,r,i)=>{let a=D(`${r}${i?` ${i}`:``}`,t);return a?`${n.replace(/\s+/g,``)} ${a}`:e})}function ge(e){return e===`h12`?`12 小时制 AM/PM`:`24 小时制 HH:mm`}function _e(e){return e===`h12`?`{YYYY}年{MM}月{DD}日 {hh:mm} AM/PM`:`{YYYY}年{MM}月{DD}日 HH:mm`}function ve(e){return e===`h12`?"日期时间使用绝对时间，格式为 `{YYYY}年{MM}月{DD}日 {hh:mm} AM/PM`，日期后只允许半角空格加 12 小时制时间和 AM/PM 后缀。":"日期时间使用绝对时间，格式为 `{YYYY}年{MM}月{DD}日 HH:mm`，日期后只允许半角空格加 24 小时制时间；禁止追加 AM/PM。"}const k=[`all`],ye=[`stored`,`newest`,`name`,`grade`,`quantity`],be=`stored`;function xe(e){if(!Array.isArray(e))return k;let t=e.flatMap(e=>typeof e==`string`?[e.trim()]:[]).filter(Boolean);return t.length===0||t.includes(`all`)?k:Array.from(new Set(t))}function Se(e){return typeof e!=`number`||!Number.isFinite(e)?15:Math.min(50,Math.max(1,Math.round(e)))}function Ce(e){return typeof e==`string`&&ye.includes(e)}function we(e){return Ce(e)?e:be}const Te=[`serif`,`sans`,`wenkai`],Ee=`serif`;function De(e){return Te.includes(e)}function Oe(e){return e===`zh`||e===`vi`}const ke=`enter`;function Ae(e){return e===`enter`||e===`ctrl-enter`||e===`shift-enter`}function je(e){return typeof e!=`number`||!Number.isFinite(e)?50:Math.min(100,Math.max(0,Math.round(e)))}const Me=[`obsidian`,`bronze`,`amber`,`copper`,`highcontrast`,`transparent`,`custom`],Ne=[`inkwash`,`highcontrast`,`white`,`transparent`,`bronze`,`amber`,`copper`,`obsidian`,`custom`],Pe=[`gold`,`amber`,`copper`,`cinnabar`],Fe=`bronze`,Ie=`inkwash`,A={dark:{accent:`gold`,contrast:72,depth:58},light:{accent:`gold`,contrast:78,depth:44}};function Le(e){return e===`system`||e===`dark`||e===`light`}function Re(e){return Me.includes(e)}function ze(e){return Ne.includes(e)}function Be(e){return Pe.includes(e)}function Ve(e,t){if(!e||typeof e!=`object`)return t;let n=e;return{accent:Be(n.accent)?n.accent:t.accent,contrast:Ue(n.contrast,t.contrast),depth:Ue(n.depth,t.depth)}}function He(e){if(!e||typeof e!=`object`)return A;let t=e;return{dark:Ve(t.dark,A.dark),light:Ve(t.light,A.light)}}function Ue(e,t){return typeof e!=`number`||!Number.isFinite(e)?t:Math.min(100,Math.max(0,Math.round(e)))}const j=[`mundane`,`common`,`rare`,`epic`,`legendary`,`mythic`],We={mundane:0,common:2,rare:5,epic:11,legendary:17,mythic:33},Ge=[{maxGrade:1,lightColor:`#27251F`,darkColor:`#E4E2DC`},{maxGrade:4,lightColor:`#256B36`,darkColor:`#73D98A`},{maxGrade:7,lightColor:`#245F93`,darkColor:`#78B6E8`},{maxGrade:13,lightColor:`#6B3A91`,darkColor:`#C091E6`},{maxGrade:23,lightColor:`#963F70`,darkColor:`#EC91C3`},{maxGrade:36,lightColor:`#B12E3B`,darkColor:`#EF8A91`}];function Ke(e){let t=e[0]??Ge[0];return Object.fromEntries(j.map(n=>{let r=e[$e(e,We[n])]??t;return[n,{lightColor:r?.lightColor??`#27251F`,darkColor:r?.darkColor??`#E4E2DC`}]}))}const qe={version:1,enabled:!1,tiers:Ge,traitColors:Ke(Ge)},Je=/^#[0-9a-f]{6}$/i;Array.from({length:37},(e,t)=>`--item-grade-custom-${t}`),j.map(e=>`--trait-rarity-${e}`);function Ye(e){return Object.fromEntries(j.map(t=>[t,{...e[t]}]))}function Xe(e){return{...e,tiers:e.tiers.map(e=>({...e})),traitColors:Ye(e.traitColors)}}function M(e){return typeof e==`string`&&Je.test(e.trim())}function N(e){return e.trim().toUpperCase()}function Ze(e,t){let n=Ke(t);if(!e||typeof e!=`object`||Array.isArray(e))return n;let r=e,i=[];for(let e of j){let t=r[e];if(!t||typeof t!=`object`||Array.isArray(t))return n;let a=t,o=a.lightColor,s=a.darkColor;if(!M(o)||!M(s))return n;i.push([e,{lightColor:N(o),darkColor:N(s)}])}return Object.fromEntries(i)}function Qe(e){let t=Xe(qe);if(!e||typeof e!=`object`)return t;let n=e;if(n.version!==1||typeof n.enabled!=`boolean`||!Array.isArray(n.tiers)||n.tiers.length<1||n.tiers.length>12)return t;let r=-1,i=[];for(let e of n.tiers){if(!e||typeof e!=`object`)return t;let n=e,a=n.maxGrade,o=n.lightColor,s=n.darkColor;if(typeof a!=`number`||!Number.isInteger(a)||a<=r||a>36||!M(o)||!M(s))return t;i.push({maxGrade:a,lightColor:N(o),darkColor:N(s)}),r=a}return r===36?{version:1,enabled:n.enabled,tiers:i,traitColors:Ze(n.traitColors,i)}:t}function $e(e,t){let n=Math.min(36,Math.max(0,Math.trunc(t))),r=e.findIndex(e=>n<=e.maxGrade);return r>=0?r:Math.max(0,e.length-1)}const et=[`none`,`minimal`,`low`,`medium`,`high`,`xhigh`,`max`];function tt(e){return e.enabled!==!1}function nt(e){return typeof e==`string`&&et.includes(e)}function rt(e){return Math.round(e*1e3)/1e3}function it(e){if(!(typeof e!=`number`||!Number.isFinite(e)))return e}function at(e){let t=it(e);if(t!==void 0)return rt(Math.min(2,Math.max(0,t)))}function ot(e){let t=it(e);if(t!==void 0)return rt(Math.min(1,Math.max(0,t)))}function st(e){if(typeof e!=`number`||!Number.isFinite(e))return;let t=Math.floor(e);return t>=1?t:void 0}function ct(e){if(typeof e!=`number`||!Number.isFinite(e))return;let t=Math.floor(e);return t>=1?t:void 0}function lt(e){if(typeof e!=`number`||!Number.isFinite(e))return;let t=Math.floor(e);return t>=1?t:void 0}function P(e){return{...e,temperature:at(e.temperature),top_p:ot(e.top_p),api_format:e.api_format===`responses`?`responses`:`chat`,reasoning_effort:nt(e.reasoning_effort)?e.reasoning_effort:`max`,json_response_format:e.json_response_format===!0,preferStream:e.preferStream===!0,assistant_prefill_unsupported:e.assistant_prefill_unsupported===!0,assistant_prefill_prefix:e.assistant_prefill_prefix===!0,system_prompt_as_user:e.system_prompt_as_user===!0,maxInputTokens:st(e.maxInputTokens),maxOutputTokens:ct(e.maxOutputTokens),maxRequestsPerMinute:lt(e.maxRequestsPerMinute),enabled:tt(e)}}function ut(e){return e.map(P)}const dt=[`km`,`li`];function ft(e){return dt.includes(e)}function pt(e,t){return Math.round(Math.hypot(e[0]-t[0],e[1]-t[1])*10)}function mt(e,t){return t===`li`?Math.round(e*2):e}function ht(e){return e===`li`?`里`:`km`}function gt(e,t=`km`){return`${mt(e,t).toLocaleString(`zh-CN`)} ${ht(t)}`}function _t(e,t=`km`){return`${mt(e,t).toLocaleString(`zh-CN`)}${ht(t)}`}function vt(e=`km`){return e===`li`?`比例尺: 1坐标单位=20里`:`比例尺: 1坐标单位=10km`}function yt(e=`km`){return e===`li`?`比例尺1:20里`:`比例尺1:10km`}const bt=`endpointCombos`,xt=`featureRoutes`,St=`mainChatFavoriteRouteIds`,Ct=`selectedMainChatRouteId`,wt=`themePreference`,Tt=`uiLanguage`,Et=`darkThemePalette`,Dt=`lightThemePalette`,Ot=`customThemeConfig`,kt=`ITEM_GRADE_APPEARANCE_CONFIG_V1`,At=`mainMenuBackgroundVariant`,jt=`mainMenuBgmContinueInBackground`,Mt=`desktopSidebarCollapsed`,Nt=`desktopLayoutColumnWidths`,Pt=`plotEvolutionPreviewCollapsed`,Ft=`displayBrightness`,It=`fontScale`,Lt=`bodyFontScale`,Rt=`touchFontScale`,zt=`touchBodyFontScale`,Bt=`chatTranscriptSpacing`,Vt=`sceneMiniMapDockEnabled`,Ht=`runtimePanelFullscreenEnabled`,Ut=`inventoryPreviewCategoryFilters`,Wt=`inventoryPreviewLimit`,Gt=`inventorySortKey`,Kt=`bodyFontFamily`,qt=`chatSubmitKeyMode`,F=`gameTimeHourCycle`,I=`gameTimeDisplayMode`,L=`worldMapDistanceUnit`,R=`taskSystemEnabled`,z=`taskCultivationRewardsEnabled`,B=`cultivationSettlementCardDataSourceEnabled`,Jt=`APP_SHELL_CUSTOM_BACKGROUND_ID_V1`,Yt=`CUSTOM_CHARACTER_COLUMNS_V1`,V=`core-chat`,Xt={nav:192,player:288,quickActions:224},Zt={nav:{min:144,max:264},player:{min:208,max:360},quickActions:{min:176,max:320}};function H(e){if(typeof e!=`number`||!Number.isFinite(e))return 1;let t=Math.round(e*100)/100;return Math.min(2,Math.max(.8,t))}function Qt(e){if(typeof e!=`number`||!Number.isFinite(e))return 1;let t=Math.round(e*100)/100;return Math.min(1.2,Math.max(.85,t))}function $t(e,t){let n=Xt[t];if(typeof e!=`number`||!Number.isFinite(e))return n;let{min:r,max:i}=Zt[t];return Math.min(i,Math.max(r,Math.round(e)))}function en(e){let t=e&&typeof e==`object`?e:{};return{nav:$t(t.nav,`nav`),player:$t(t.player,`player`),quickActions:$t(t.quickActions,`quickActions`)}}const tn=`remake`;function nn(e){return e===`remake`||e===`classic`}function rn(e){if(!Array.isArray(e))return[];let t=new Set,n=[];for(let r of e)typeof r!=`string`||!r.trim()||t.has(r)||(t.add(r),n.push(r));return n}function an(e){return e[V]??[]}function U(e,t){let n=new Set(an(t));return e.filter(e=>n.has(e))}function W(e,t,n){if(!e)return null;let r=new Set(t),i=new Set(an(n));return r.has(e)&&i.has(e)?e:null}function G(e){return e instanceof Error&&e.message?e.message:`保存失败,请重试。`}let on=Promise.resolve();function K(e){return{endpointCombos:e.endpointCombos,featureRoutes:e.featureRoutes,mainChatFavoriteRouteIds:e.mainChatFavoriteRouteIds,selectedMainChatRouteId:e.selectedMainChatRouteId,themePreference:e.themePreference,uiLanguage:e.uiLanguage,darkThemePalette:e.darkThemePalette,lightThemePalette:e.lightThemePalette,customThemeConfig:e.customThemeConfig,itemGradeAppearanceConfig:e.itemGradeAppearanceConfig,mainMenuBackgroundVariant:e.mainMenuBackgroundVariant,mainMenuBgmContinueInBackground:e.mainMenuBgmContinueInBackground,desktopSidebarCollapsed:e.desktopSidebarCollapsed,desktopLayoutColumnWidths:e.desktopLayoutColumnWidths,plotEvolutionPreviewCollapsed:e.plotEvolutionPreviewCollapsed,displayBrightness:e.displayBrightness,fontScale:e.fontScale,bodyFontScale:e.bodyFontScale,touchFontScale:e.touchFontScale,touchBodyFontScale:e.touchBodyFontScale,chatTranscriptSpacing:e.chatTranscriptSpacing,sceneMiniMapDockEnabled:e.sceneMiniMapDockEnabled,runtimePanelFullscreenEnabled:e.runtimePanelFullscreenEnabled,inventoryPreviewCategoryFilters:e.inventoryPreviewCategoryFilters,inventoryPreviewLimit:e.inventoryPreviewLimit,inventorySortKey:e.inventorySortKey,bodyFontFamily:e.bodyFontFamily,taskSystemEnabled:e.taskSystemEnabled,taskCultivationRewardsEnabled:e.taskCultivationRewardsEnabled,cultivationSettlementCardDataSourceEnabled:e.cultivationSettlementCardDataSourceEnabled,gameTimeHourCycle:e.gameTimeHourCycle,gameTimeDisplayMode:e.gameTimeDisplayMode,worldMapDistanceUnit:e.worldMapDistanceUnit}}function q(e,t,n,r){t();let a=on.then(async()=>{try{await Promise.all([i(bt,e.endpointCombos),i(xt,e.featureRoutes),i(St,e.mainChatFavoriteRouteIds),i(Ct,e.selectedMainChatRouteId),i(wt,e.themePreference),i(Tt,e.uiLanguage),i(Et,e.darkThemePalette),i(Dt,e.lightThemePalette),i(Ot,e.customThemeConfig),i(kt,e.itemGradeAppearanceConfig),i(At,e.mainMenuBackgroundVariant),i(jt,e.mainMenuBgmContinueInBackground),i(Mt,e.desktopSidebarCollapsed),i(Nt,e.desktopLayoutColumnWidths),i(Pt,e.plotEvolutionPreviewCollapsed),i(Ft,e.displayBrightness),i(It,e.fontScale),i(Lt,e.bodyFontScale),i(Rt,e.touchFontScale),i(zt,e.touchBodyFontScale),i(Bt,e.chatTranscriptSpacing),i(Vt,e.sceneMiniMapDockEnabled),i(Ht,e.runtimePanelFullscreenEnabled),i(Ut,e.inventoryPreviewCategoryFilters),i(Wt,e.inventoryPreviewLimit),i(Gt,e.inventorySortKey),i(Kt,e.bodyFontFamily),i(F,e.gameTimeHourCycle),i(I,e.gameTimeDisplayMode),i(L,e.worldMapDistanceUnit),i(R,e.taskSystemEnabled),i(z,e.taskCultivationRewardsEnabled),i(B,e.cultivationSettlementCardDataSourceEnabled)]),n()}catch(e){throw r(G(e)),e}},async()=>{try{await Promise.all([i(bt,e.endpointCombos),i(xt,e.featureRoutes),i(St,e.mainChatFavoriteRouteIds),i(Ct,e.selectedMainChatRouteId),i(wt,e.themePreference),i(Tt,e.uiLanguage),i(Et,e.darkThemePalette),i(Dt,e.lightThemePalette),i(Ot,e.customThemeConfig),i(kt,e.itemGradeAppearanceConfig),i(At,e.mainMenuBackgroundVariant),i(jt,e.mainMenuBgmContinueInBackground),i(Mt,e.desktopSidebarCollapsed),i(Nt,e.desktopLayoutColumnWidths),i(Pt,e.plotEvolutionPreviewCollapsed),i(Ft,e.displayBrightness),i(It,e.fontScale),i(Lt,e.bodyFontScale),i(Rt,e.touchFontScale),i(zt,e.touchBodyFontScale),i(Bt,e.chatTranscriptSpacing),i(Vt,e.sceneMiniMapDockEnabled),i(Ht,e.runtimePanelFullscreenEnabled),i(Gt,e.inventorySortKey),i(Kt,e.bodyFontFamily),i(F,e.gameTimeHourCycle),i(I,e.gameTimeDisplayMode),i(L,e.worldMapDistanceUnit),i(R,e.taskSystemEnabled),i(z,e.taskCultivationRewardsEnabled),i(B,e.cultivationSettlementCardDataSourceEnabled)]),n()}catch(e){throw r(G(e)),e}});return on=a.catch(()=>void 0),a}function sn(e){return typeof URL>`u`||typeof URL.createObjectURL!=`function`?null:URL.createObjectURL(e)}function cn(e){return typeof Blob<`u`&&e instanceof Blob}function ln(e){let t=/^data:([^;,]+)?(;base64)?,(.*)$/s.exec(e);if(!t)return null;let n=t[1]||`application/octet-stream`,r=!!t[2],i=t[3]??``;try{if(r){let e=atob(i),t=new Uint8Array(e.length);for(let n=0;n<e.length;n+=1)t[n]=e.charCodeAt(n);return new Blob([t],{type:n})}return new Blob([decodeURIComponent(i)],{type:n})}catch{return null}}function J(e){!e?.objectUrl||typeof URL>`u`||typeof URL.revokeObjectURL!=`function`||URL.revokeObjectURL(e.objectUrl)}function un(e){if(!e||typeof e.id!=`number`)return null;if(cn(e.blob)){let t=sn(e.blob);if(t)return{id:e.id,name:e.name,sourceUrl:t,objectUrl:t}}if(e.dataUrl){let t=ln(e.dataUrl),n=t?sn(t):null;return n?{id:e.id,name:e.name,sourceUrl:n,objectUrl:n,dataUrl:e.dataUrl}:{id:e.id,name:e.name,sourceUrl:e.dataUrl,dataUrl:e.dataUrl}}return null}async function dn(e){return typeof e!=`number`||!Number.isInteger(e)?null:un(await a.backgrounds.get(e))}const fn=o()((e,r)=>({endpointCombos:[],featureRoutes:{},mainChatFavoriteRouteIds:[],selectedMainChatRouteId:null,themePreference:`dark`,uiLanguage:`zh`,darkThemePalette:Fe,lightThemePalette:Ie,customThemeConfig:A,itemGradeAppearanceConfig:qe,mainMenuBackgroundVariant:tn,mainMenuBgmContinueInBackground:!1,desktopSidebarCollapsed:!1,desktopLayoutColumnWidths:Xt,plotEvolutionPreviewCollapsed:!1,displayBrightness:1,fontScale:1,bodyFontScale:1,touchFontScale:1,touchBodyFontScale:1,chatTranscriptSpacing:50,sceneMiniMapDockEnabled:!1,runtimePanelFullscreenEnabled:!1,inventoryPreviewCategoryFilters:k,inventoryPreviewLimit:15,inventorySortKey:be,bodyFontFamily:Ee,customBackgroundImage:null,chatSubmitKeyMode:ke,gameTimeHourCycle:`h24`,gameTimeDisplayMode:le,worldMapDistanceUnit:`km`,taskSystemEnabled:!0,taskCultivationRewardsEnabled:!0,cultivationSettlementCardDataSourceEnabled:!0,customCharacterColumns:[],loaded:!1,saving:!1,lastSavedAt:null,saveError:null,pendingSaveCount:0,addCombo:async t=>{let n=P({id:crypto.randomUUID(),...t}),i=[...r().endpointCombos,n];e({endpointCombos:i}),await q({...K(r()),endpointCombos:i},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},duplicateCombo:async(t,n)=>{let i=r().endpointCombos,a=i.findIndex(e=>e.id===t),o=i[a];if(a<0||o===void 0)return;let s={...o};delete s.workflowLabel;let c=P({...s,id:crypto.randomUUID(),label:n}),l=[...i];l.splice(a+1,0,c),e({endpointCombos:l}),await q({...K(r()),endpointCombos:l},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},updateCombo:async(t,n)=>{let i=r().endpointCombos.map(e=>e.id===t?P({...e,...n}):e);e({endpointCombos:i}),await q({...K(r()),endpointCombos:i},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},deleteCombo:async t=>{let n=r().endpointCombos.filter(e=>e.id!==t),i={};for(let[e,n]of Object.entries(r().featureRoutes))i[e]=n.filter(e=>e!==t);let a=r().mainChatFavoriteRouteIds.filter(e=>e!==t),o=r().selectedMainChatRouteId===t?null:r().selectedMainChatRouteId;e({endpointCombos:n,featureRoutes:i,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o}),await q({...K(r()),endpointCombos:n,featureRoutes:i,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setFeatureRoutes:async(t,n)=>{let i={...r().featureRoutes,[t]:n},a=t===V?U(r().mainChatFavoriteRouteIds,i):r().mainChatFavoriteRouteIds,o=t===V?W(r().selectedMainChatRouteId,a,i):r().selectedMainChatRouteId;e({featureRoutes:i,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o}),await q({...K(r()),featureRoutes:i,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setManyFeatureRoutes:async t=>{if(t.length===0)return;let n={...r().featureRoutes},i=!1,a=!1;for(let e of t){let t=e.featureId.trim();t&&(n[t]=[...e.comboIds],i||=t===V,a=!0)}if(!a)return;let o=i?U(r().mainChatFavoriteRouteIds,n):r().mainChatFavoriteRouteIds,s=i?W(r().selectedMainChatRouteId,o,n):r().selectedMainChatRouteId;e({featureRoutes:n,mainChatFavoriteRouteIds:o,selectedMainChatRouteId:s}),await q({...K(r()),featureRoutes:n,mainChatFavoriteRouteIds:o,selectedMainChatRouteId:s},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},reorderFeatureRoute:async(t,n,i)=>{let a=r().featureRoutes,o=[...a[t]??[]];if(n<0||n>=o.length||i<0||i>=o.length||n===i)return;let[s]=o.splice(n,1);s!==void 0&&o.splice(i,0,s);let c={...a,[t]:o};e({featureRoutes:c}),await q({...K(r()),featureRoutes:c},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setMainChatRouteFavorite:async(t,n)=>{if(!new Set(an(r().featureRoutes)).has(t))return;let i=r().mainChatFavoriteRouteIds,a=n?i.includes(t)?i:[...i,t]:i.filter(e=>e!==t),o=!n&&r().selectedMainChatRouteId===t?null:W(r().selectedMainChatRouteId,a,r().featureRoutes);e({mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o}),await q({...K(r()),mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setSelectedMainChatRoute:async t=>{let n=W(t,r().mainChatFavoriteRouteIds,r().featureRoutes);e({selectedMainChatRouteId:n}),await q({...K(r()),selectedMainChatRouteId:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},reorderCombo:async(t,n)=>{let i=[...r().endpointCombos];if(t<0||t>=i.length||n<0||n>=i.length||t===n)return;let[a]=i.splice(t,1);a!==void 0&&i.splice(n,0,a),e({endpointCombos:i}),await q({...K(r()),endpointCombos:i},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setThemePreference:async t=>{e({themePreference:t}),await q({...K(r()),themePreference:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setUiLanguage:async t=>{e({uiLanguage:t}),await q({...K(r()),uiLanguage:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setDarkThemePalette:async t=>{e({darkThemePalette:t}),await q({...K(r()),darkThemePalette:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setLightThemePalette:async t=>{e({lightThemePalette:t}),await q({...K(r()),lightThemePalette:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setCustomThemeConfig:async t=>{let n=He(t);e({customThemeConfig:n}),await q({...K(r()),customThemeConfig:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setItemGradeAppearanceConfig:async t=>{let n=Qe(t);e({itemGradeAppearanceConfig:n}),await q({...K(r()),itemGradeAppearanceConfig:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setMainMenuBackgroundVariant:async t=>{e({mainMenuBackgroundVariant:t}),await q({...K(r()),mainMenuBackgroundVariant:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setMainMenuBgmContinueInBackground:async t=>{e({mainMenuBgmContinueInBackground:t}),await q({...K(r()),mainMenuBgmContinueInBackground:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setDesktopSidebarCollapsed:async t=>{e({desktopSidebarCollapsed:t}),await q({...K(r()),desktopSidebarCollapsed:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setDesktopLayoutColumnWidths:async t=>{let n=en({...r().desktopLayoutColumnWidths,...t});e({desktopLayoutColumnWidths:n}),await q({...K(r()),desktopLayoutColumnWidths:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setPlotEvolutionPreviewCollapsed:async t=>{e({plotEvolutionPreviewCollapsed:t}),await q({...K(r()),plotEvolutionPreviewCollapsed:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setDisplayBrightness:async t=>{let n=Qt(t);e({displayBrightness:n}),await q({...K(r()),displayBrightness:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setFontScale:async t=>{let n=H(t);e({fontScale:n}),await q({...K(r()),fontScale:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setBodyFontScale:async t=>{let n=H(t);e({bodyFontScale:n}),await q({...K(r()),bodyFontScale:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setTouchFontScale:async t=>{let n=H(t);e({touchFontScale:n}),await q({...K(r()),touchFontScale:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setTouchBodyFontScale:async t=>{let n=H(t);e({touchBodyFontScale:n}),await q({...K(r()),touchBodyFontScale:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setChatTranscriptSpacing:async t=>{let n=je(t);e({chatTranscriptSpacing:n}),await q({...K(r()),chatTranscriptSpacing:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setSceneMiniMapDockEnabled:async t=>{e({sceneMiniMapDockEnabled:t}),await q({...K(r()),sceneMiniMapDockEnabled:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setRuntimePanelFullscreenEnabled:async t=>{e({runtimePanelFullscreenEnabled:t}),await q({...K(r()),runtimePanelFullscreenEnabled:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setInventoryPreviewSettings:async({categoryFilters:t,limit:n})=>{let i=t===void 0?r().inventoryPreviewCategoryFilters:xe(t),a=n===void 0?r().inventoryPreviewLimit:Se(n);e({inventoryPreviewCategoryFilters:i,inventoryPreviewLimit:a}),await q({...K(r()),inventoryPreviewCategoryFilters:i,inventoryPreviewLimit:a},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setInventorySortKey:async t=>{let n=we(t);e({inventorySortKey:n}),await q({...K(r()),inventorySortKey:n},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setBodyFontFamily:async t=>{e({bodyFontFamily:t}),await q({...K(r()),bodyFontFamily:t},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},setCustomBackgroundImage:async({name:n,blob:i,dataUrl:o})=>{t(`保存界面背景`);let s=r().customBackgroundImage,c=s?.id,l=sn(i);if(!l&&!o)throw Error(`当前浏览器不支持读取这张背景图片。`);let u=null;e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}));try{if(await a.transaction(`rw`,a.backgrounds,a.settings,async()=>{let e=await a.backgrounds.add({name:n,blob:i,dataUrl:o,mimeType:i.type||void 0});await a.settings.put({key:Jt,value:JSON.stringify(e)}),typeof c==`number`&&await a.backgrounds.delete(c),u={id:e,name:n,sourceUrl:l??o??``,objectUrl:l??void 0,dataUrl:o}}),!u)throw Error(`保存失败,请重试。`);J(s),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{customBackgroundImage:u,pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw l&&J({id:-1,name:n,sourceUrl:l,objectUrl:l}),e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},clearCustomBackgroundImage:async()=>{t(`清除界面背景`);let n=r().customBackgroundImage,i=n?.id;e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}));try{await a.transaction(`rw`,a.backgrounds,a.settings,async()=>{await a.settings.delete(Jt),typeof i==`number`&&await a.backgrounds.delete(i)}),J(n),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{customBackgroundImage:null,pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setChatSubmitKeyMode:async t=>{e({chatSubmitKeyMode:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(qt,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setGameTimeHourCycle:async t=>{e({gameTimeHourCycle:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(F,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setGameTimeDisplayMode:async t=>{e({gameTimeDisplayMode:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(I,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setWorldMapDistanceUnit:async t=>{e({worldMapDistanceUnit:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(L,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setTaskSystemEnabled:async t=>{e({taskSystemEnabled:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(R,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setTaskCultivationRewardsEnabled:async t=>{e({taskCultivationRewardsEnabled:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(z,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setCultivationSettlementCardDataSourceEnabled:async t=>{e({cultivationSettlementCardDataSourceEnabled:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(B,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},setCustomCharacterColumns:async t=>{e({customCharacterColumns:t,pendingSaveCount:r().pendingSaveCount+1,saving:!0,saveError:null});try{await i(Yt,t),e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})}catch(t){throw e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:G(t)}}),t}},replaceApiRoutes:async(t,n)=>{let i=ut(t),a=U(r().mainChatFavoriteRouteIds,n),o=W(r().selectedMainChatRouteId,a,n);e({endpointCombos:i,featureRoutes:n,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o}),await q({...K(r()),endpointCombos:i,featureRoutes:n,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})})},loadFromDB:async()=>{let[t,i,a,o,s,c,l,u,ee,te,d,f,p,m,ne,re,h,g,_,v,ie,y,b,ae,oe,se,x,ce,S,C,w,T,fe,pe,me,he]=await Promise.all([n(bt),n(xt),n(St),n(Ct),n(wt),n(Tt),n(Et),n(Dt),n(Ot),n(kt),n(At),n(jt),n(Mt),n(Nt),n(Pt),n(Ft),n(It),n(Lt),n(Rt),n(zt),n(Bt),n(Vt),n(Ht),n(Ut),n(Wt),n(Gt),n(Kt),n(Jt),n(qt),n(F),n(I),n(L),n(R),n(z),n(B),n(Yt)]),E=H(h),D=H(_),O=i??{},ge=U(rn(a),O),_e=W(typeof o==`string`?o:null,ge,O),ve=r().customBackgroundImage,k=await dn(ce);J(ve),e({endpointCombos:ut(t??[]),featureRoutes:O,mainChatFavoriteRouteIds:ge,selectedMainChatRouteId:_e,themePreference:Le(s)?s:`dark`,uiLanguage:Oe(c)?c:`zh`,darkThemePalette:Re(l)?l:Fe,lightThemePalette:ze(u)?u:Ie,customThemeConfig:He(ee),itemGradeAppearanceConfig:Qe(te),mainMenuBackgroundVariant:nn(d)?d:tn,mainMenuBgmContinueInBackground:typeof f==`boolean`?f:!1,desktopSidebarCollapsed:typeof p==`boolean`?p:!1,desktopLayoutColumnWidths:en(m),plotEvolutionPreviewCollapsed:typeof ne==`boolean`?ne:!1,displayBrightness:Qt(re),fontScale:E,bodyFontScale:typeof g==`number`?H(g):E,touchFontScale:D,touchBodyFontScale:typeof v==`number`?H(v):D,chatTranscriptSpacing:je(ie),sceneMiniMapDockEnabled:typeof y==`boolean`?y:!1,runtimePanelFullscreenEnabled:typeof b==`boolean`?b:!1,inventoryPreviewCategoryFilters:xe(ae),inventoryPreviewLimit:Se(oe),inventorySortKey:we(se),bodyFontFamily:De(x)?x:Ee,customBackgroundImage:k,chatSubmitKeyMode:Ae(S)?S:ke,gameTimeHourCycle:ue(C)?C:`h24`,gameTimeDisplayMode:de(w)?w:le,worldMapDistanceUnit:ft(T)?T:`km`,taskSystemEnabled:typeof fe==`boolean`?fe:!0,taskCultivationRewardsEnabled:typeof pe==`boolean`?pe:!0,cultivationSettlementCardDataSourceEnabled:typeof me==`boolean`?me:!0,customCharacterColumns:Array.isArray(he)?he:[],loaded:!0,saving:!1,lastSavedAt:null,saveError:null,pendingSaveCount:0})},saveToDB:async()=>{let{endpointCombos:t,featureRoutes:n,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o,themePreference:s,uiLanguage:c,darkThemePalette:l,lightThemePalette:u,customThemeConfig:ee,itemGradeAppearanceConfig:te,mainMenuBackgroundVariant:d,mainMenuBgmContinueInBackground:f,desktopSidebarCollapsed:p,desktopLayoutColumnWidths:m,plotEvolutionPreviewCollapsed:ne,displayBrightness:re,fontScale:h,bodyFontScale:g,touchFontScale:_,touchBodyFontScale:v,chatTranscriptSpacing:ie,sceneMiniMapDockEnabled:y,runtimePanelFullscreenEnabled:b,inventoryPreviewCategoryFilters:ae,inventoryPreviewLimit:oe,inventorySortKey:se,bodyFontFamily:x,gameTimeHourCycle:ce,gameTimeDisplayMode:le,worldMapDistanceUnit:S,taskSystemEnabled:C,taskCultivationRewardsEnabled:w,cultivationSettlementCardDataSourceEnabled:T,customCharacterColumns:ue}=r(),de=ut(t);e({endpointCombos:de}),await q({endpointCombos:de,featureRoutes:n,mainChatFavoriteRouteIds:a,selectedMainChatRouteId:o,themePreference:s,uiLanguage:c,darkThemePalette:l,lightThemePalette:u,customThemeConfig:ee,itemGradeAppearanceConfig:te,mainMenuBackgroundVariant:d,mainMenuBgmContinueInBackground:f,desktopSidebarCollapsed:p,desktopLayoutColumnWidths:m,plotEvolutionPreviewCollapsed:ne,displayBrightness:re,fontScale:h,bodyFontScale:g,touchFontScale:_,touchBodyFontScale:v,chatTranscriptSpacing:ie,sceneMiniMapDockEnabled:y,runtimePanelFullscreenEnabled:b,inventoryPreviewCategoryFilters:ae,inventoryPreviewLimit:oe,inventorySortKey:se,bodyFontFamily:x,gameTimeHourCycle:ce,gameTimeDisplayMode:le,worldMapDistanceUnit:S,taskSystemEnabled:C,taskCultivationRewardsEnabled:w,cultivationSettlementCardDataSourceEnabled:T},()=>{e(e=>({pendingSaveCount:e.pendingSaveCount+1,saving:!0,saveError:null}))},()=>{e(e=>{let t=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:t,saving:t>0,lastSavedAt:Date.now(),saveError:null}})},t=>{e(e=>{let n=Math.max(0,e.pendingSaveCount-1);return{pendingSaveCount:n,saving:n>0,saveError:t}})}),await i(Yt,ue)}})),pn={CORE_CHAT:`core-chat`,COMBAT:`combat`,COMBAT_BATTLE_DATA:`combat-battle-data`,COMBAT_NPC_ACTION:`combat-npc-action`,COMBAT_RESULT:`combat-result`,COMBAT_SUMMARY:`combat-summary`,EVOLUTION:`evolution`,EVOLUTION_NPC_PRIORITY:`evolution-npc-priority`,EVOLUTION_ENTRY:`evolution-entry`,EVOLUTION_ITEM:`evolution-item`,EVOLUTION_PLAYER:`evolution-player`,EVOLUTION_NPC:`evolution-npc`,EVOLUTION_BEAST:`evolution-beast`,EVOLUTION_MISC:`evolution-misc`,EVOLUTION_IMAGE:`evolution-image`,EVOLUTION_BIO:`evolution-bio`,ARCHIVE_ASSISTANT:`archive-assistant`,EVOLUTION_DETAIL:`evolution-detail`,SUMMARY:`deep-summary`,QUICK_CHAT:`quick-chat`,DUAL_CULTIVATION:`dual-cultivation`,DUAL_CULTIVATION_IMAGE:`dual-cultivation-image`,CHARACTER_CREATION_AI:`character-creation-ai`,CUSTOM_PERSONALITY:`custom-personality`,AUTO_CONTINUE:`auto-continue`,RAG_EMBED:`rag-embedding`,RAG_SAVE:`rag-save`,RAG_QUERY:`rag-query`,NARRATIVE_MEMORY:`narrative-memory`,NARRATIVE_MEMORY_BEFORE_SEND:`narrative-memory-before-send`,NARRATIVE_MEMORY_AFTER_REPLY:`narrative-memory-after-reply`,DIVINATION:`divination`,WORLD_GUIDANCE:`world-guidance`,BRANCH_OPTIONS:`branch-options`,THEATER:`ai-theater`,PLOT_EVOLUTION:`plot-evolution`,WRITING_DIRECTIVE:`writing-directive`,CHARACTER_BEHAVIOR_ANALYSIS:`character-behavior-analysis`,WORLD_TIMELINE:`world-evolution-timeline`,ORIGINAL_CANON_GUIDANCE_AGENT:`original-canon-guidance-agent`,ORIGINAL_CANON_SCENE_SCAFFOLD:`original-canon-scene-scaffold`,FACTION_GENERATION:`faction-generation`,FACTION_GENERATION_STRUCTURE:`faction-generation-structure`,FACTION_GENERATION_INHERITANCE:`faction-generation-inheritance`,FACTION_GENERATION_DIPLOMACY:`faction-generation-diplomacy`,TEXT_OPTIMIZE:`text-optimize`,PORTRAIT_PROMPT:`portrait-prompt`,STORY_VIDEO_PROMPT:`story-video-prompt`,CRAFTING:`crafting`,LIFE_BOUND_ARTIFACT:`life-bound-artifact`,DUNGEON:`dungeon`,DUNGEON_STUB:`dungeon-stub`,DUNGEON_BLUEPRINT:`dungeon-blueprint`,DUNGEON_NODE:`dungeon-node`,DUNGEON_MECHANISM:`dungeon-mechanism`};Object.values(pn);const mn={"core-chat":`主聊天`,combat:`战斗模式`,"combat-battle-data":`战斗初始化`,"combat-npc-action":`NPC 行动决策`,"combat-result":`战斗行动裁决`,"combat-summary":`战斗总结`,evolution:`重点演化`,"evolution-npc-priority":`重点演化 NPC 调度`,"evolution-entry":`重点演化登场判断`,"evolution-item":`重点演化物品管理`,"evolution-player":`重点演化主角演化`,"evolution-npc":`重点演化 NPC 演化`,"evolution-beast":`重点演化灵兽演化`,"evolution-misc":`重点演化杂项演化`,"evolution-image":`重点演化正文生图`,"evolution-bio":`重点演化生平压缩`,"archive-assistant":`天道助手`,"evolution-detail":`NPC 视角正文`,"deep-summary":`深度总结`,"quick-chat":`快速交谈`,"dual-cultivation":`双修`,"dual-cultivation-image":`双修生图提示词`,"character-creation-ai":`开局参谋`,"custom-personality":`自定义性格`,"auto-continue":`自动续写`,"rag-embedding":`RAG 向量嵌入`,"rag-save":`RAG 自动归档`,"rag-query":`RAG 检索增强`,"narrative-memory":`叙事记忆`,"narrative-memory-before-send":`叙事记忆发送前整理`,"narrative-memory-after-reply":`叙事记忆回复后写入`,divination:`天机演算`,"world-guidance":`修仙世界观指导`,"branch-options":`推进选项`,"ai-theater":`世界日报`,"plot-evolution":`剧情演化`,"writing-directive":`正文写作指导`,"character-behavior-analysis":`人物行为分析`,"world-evolution-timeline":`原著年表`,"original-canon-guidance-agent":`原著指导 Agent`,"original-canon-scene-scaffold":`原著场景骨架`,"faction-generation":`原创势力生成`,"faction-generation-structure":`原创势力组织架构`,"faction-generation-inheritance":`原创势力传承配装`,"faction-generation-diplomacy":`原创势力外交时局`,"text-optimize":`正文润色`,"portrait-prompt":`肖像生成`,"story-video-prompt":`正文视频提示词`,crafting:`百艺合成`,"life-bound-artifact":`本命法宝淬炼`,dungeon:`秘境探索`,"dungeon-stub":`秘境入口生成`,"dungeon-blueprint":`秘境蓝图生成`,"dungeon-node":`秘境房间叙事`,"dungeon-mechanism":`秘境机关生成`},hn={chat:`/chat/completions`,responses:`/responses`,models:`/models`,embeddings:`/embeddings`},gn=new Set([`localhost`,`0.0.0.0`,`::1`,`[::1]`]);function _n(e){let t=/^100\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(e);if(!t)return!1;let n=Number(t[1]??NaN),r=Number(t[2]??NaN),i=Number(t[3]??NaN);return n>=64&&n<=127&&r>=0&&r<=255&&i>=0&&i<=255}function vn(e){try{let t=new URL(e.trim()).hostname.toLowerCase();return gn.has(t)||/^127(?:\.\d{1,3}){3}$/.test(t)||/^192\.168(?:\.\d{1,3}){2}$/.test(t)||_n(t)}catch{return!1}}function yn(e){let t=e.replace(/\/+$/,``),n=t.toLowerCase();for(let e of Object.values(hn))if(n.endsWith(e))return t.slice(0,-e.length);return t}function bn(e,t){let n=`${e===`/`?``:e.replace(/\/+$/,``)}${t}`;return n.startsWith(`/`)?n:`/${n}`}function xn(e,t){let n=e.trim();if(!n||n===`mock`)return n;let r=hn[t];try{let e=new URL(n);return e.pathname=bn(yn(e.pathname),r),e.toString()}catch{return`${yn(n.replace(/\/+$/,``))}${r}`}}const Sn={BASE_URL:`/`,DEV:!1,MODE:`production`,PROD:!0,SSR:!1}.VITE_PUBLIC_ASSET_BASE_URL?.trim().replace(/\/+$/,``)||`https://pub-461073e9a31549eb838527f6cbc59989.r2.dev`;function Cn(e){return`${Sn}/${e.replace(/^\/+/,``)}`}function wn(e,t){let n=Cn(t);if(typeof e!=`string`||!e.trim())return n;let r=e.trim();try{let e=new URL(r),i=new URL(n),a=`/${t.replace(/^\/+/,``)}`;if((e.protocol===`https:`||e.protocol===`http:`)&&/^pub-[a-z0-9]+\.r2\.dev$/i.test(e.hostname)&&e.hostname!==i.hostname&&e.pathname===a)return n}catch{return r}return r}function Tn(e,t,n){return t?e.split(t).join(n):e}function En(e){return e.trim()||`无`}function Dn({template:e,variables:t,stableTitle:n,dynamicTitle:r,stableRole:i=`system`}){let a=e.trim();for(let e of t){let t=`见后一条【${r}】字段：${e.label}`;for(let n of e.tokens)a=Tn(a,n,t)}let o=t.map((e,t)=>({variable:e,index:t})).sort((e,t)=>(e.variable.cacheOrder??2**53-1)-(t.variable.cacheOrder??2**53-1)||e.index-t.index).map(e=>e.variable).map(e=>`## ${e.label}\n${En(e.value)}`).join(`

`);return[{role:i,content:[`【${n}】`,a].filter(Boolean).join(`

`)},{role:`user`,content:[`【${r}】`,o].filter(Boolean).join(`

`)}]}function On(e,t){if(e.length!==t.length||e.length===0)return 0;let n=0,r=0,i=0;for(let a=0;a<e.length;a++){let o=e[a],s=t[a];n+=o*s,r+=o*o,i+=s*s}let a=Math.sqrt(r)*Math.sqrt(i);return a===0?0:n/a}function kn(e,t,n=5,r=.3){return An(e,t,n,r).matches}function An(e,t,n=5,i=.3,a=n){let o=[],s=[];for(let n of t){let t=r(n.embedding);if(t.length===0)continue;let a=On(e,t);a>=i?o.push({vector:n,similarity:a}):i>0&&s.push({vector:n,similarity:a,threshold:i})}return o.sort((e,t)=>t.similarity-e.similarity),s.sort((e,t)=>t.similarity-e.similarity),{matches:o.slice(0,n),rejectedByThreshold:s.slice(0,a)}}function jn(e,t,n=5){let r=e.toLowerCase().split(/\s+/).filter(e=>e.length>0);if(r.length===0)return[];let i=[];for(let e of t){let t=e.content.toLowerCase(),n=0;for(let e of r)t.includes(e)&&n++;n>0&&i.push({vector:e,matchCount:n})}return i.sort((e,t)=>t.matchCount-e.matchCount),i.slice(0,n)}function Mn(e,t){return t===0?[]:e.map(e=>({vector:e.vector,similarity:e.matchCount/t}))}function Nn(e,t,n,r=.7){let i=1-r,a=new Map;for(let t of e){let e=t.vector.id??0;a.set(e,{vector:t.vector,score:t.similarity*r})}for(let e of t){let t=e.vector.id??0,n=a.get(t);n?n.score+=e.similarity*i:a.set(t,{vector:e.vector,score:e.similarity*i})}return[...a.values()].sort((e,t)=>t.score-e.score).slice(0,n).map(e=>({vector:e.vector,similarity:e.score}))}function Pn(e,t,n,r=0){let i=t.filter(e=>e.relevance_score>=r).map(t=>{let n=e[t.index];return n?{vector:n.vector,similarity:t.relevance_score}:{vector:{content:``},similarity:t.relevance_score}});return i.sort((e,t)=>t.similarity-e.similarity),i.slice(0,n)}function Fn(e,t){return e.filter(e=>{let n=Vn(e.metadata).timestamp??0;return n===0||n<=t})}function In(e,t,n){let r=e.filter(e=>e.source===t);return r.sort((e,t)=>(t.id??0)-(e.id??0)),r.slice(0,n)}function Ln(e){return e.title?.trim()||e.content.split(`
`).map(e=>e.trim()).find(Boolean)?.slice(0,40)||`未命名条目`}function Rn(e){return[`标题: `+Ln(e),`来源: ${e.source}`,`内容:`,e.content].join(`
`)}function zn(e){return e.length===0?``:`## 相关知识检索结果\n\n以下是从知识库中检索到的相关内容,请参考:\n\n${e.map((e,t)=>`[知识片段 ${t+1}] (相关度: ${(e.similarity*100).toFixed(0)}%)\n${Rn(e.vector)}`).join(`

---

`)}`}function Bn(e,t){return e.length===0?``:`## 固定知识注入 (${t})\n\n${e.map((e,n)=>`[${t} #${n+1}]\n${Rn(e)}`).join(`

---

`)}`}function Vn(e){try{return JSON.parse(e)}catch{return{timestamp:0,chunkIndex:0,totalChunks:1}}}function Hn(e){return JSON.stringify(e)}const Un=`这是主角\${playerName}的修仙故事。
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

请开始执行，并直接返回 JSON 数组。`;function Y(e,t,n){let r=e;for(let e of t)r=r.split(`{{${e}}}`).join(n),r=r.split(`\${${e}}`).join(n);return r}function Wn(e){return typeof e==`string`?e.trim():``}function X(e){if(!Array.isArray(e))return;let t=e.map(e=>typeof e==`string`?e.trim():``).filter(Boolean);return t.length>0?t:void 0}const Z=[`你是凡人项目的检索词生成助手。请分析以下剧情内容，生成适用于当前知识库结构的检索条件。`,``,`当前剧情/玩家行为：`,"${text}",``,`近期正文与总结：`,"${story_text}",``,`当前回合上下文总览：`,"${context_history}",``,`玩家状态：`,"${player_snapshot}",``,`在场人物：`,"${on_screen_npcs}",``,`当前任务：`,"${current_tasks}",``,`最近世界事件：`,"${world_events}",``,`世界地理：`,"${world_geography}",``,`世界因子：`,"${world_factors}",``,`地图上下文：`,"${map_context}",``,`本层快速交谈：`,"${quick_chat_all}",``,`人物信息参考：`,"${character_biographies}",``,`当前场景信息：`,"${scene_info_block}",``,`可用的知识库文件夹列表：`,"${folder_list}",``,`请返回 JSON 格式的检索条件：`,`{`,`  "keywords": ["关键词1", "关键词2", "关键词3"],`,`  "folders": ["推荐检索的文件夹1", "推荐检索的文件夹2"],`,`  "exclude_folders": ["应排除的文件夹"],`,`  "categories": ["人物", "地点"],`,`  "characters": ["涉及的角色名"],`,`  "locations": ["涉及的地点名"],`,`  "tags": ["相关标签"],`,`  "filter": {`,`    "categories": ["优先检索的分类"],`,`    "requireTags": ["必须包含的标签"],`,`    "excludeTags": ["应该排除的标签"],`,`    "requireCharacters": ["当前场景涉及的角色"],`,`    "requireLocations": ["当前场景涉及的地点"],`,`    "logic": "OR",`,`    "reason": "简短说明过滤策略"`,`  }`,`}`,``,`规则与判断逻辑：`,``,`1. **keywords (关键词)**:`,`   - 生成 6-10 个**具体的自然语言短语**，优先使用“实体 + 需要确认的属性/关系/背景”形式。`,`   - 关键词应尽量贴近凡人项目语义，例如：`,`     - "慕沛灵 假道侣契约 来历与目的"`,`     - "寒髓泉 淬炼真元 效果与限制"`,`     - "乙木长青诀 修炼条件 神通妙用"`,`     - "天泉峰 地理环境 药园资源"`,`   - 不要只给孤立名词，例如不要只写 ["慕沛灵", "寒髓泉"]。`,``,`2. **folders (白名单 - 重点关注)**:`,`   - 必须从上方【可用的知识库文件夹列表】中挑选 **1-3 个最相关** 的文件夹。`,`   - 目录判断应使用凡人项目自己的分类语义：`,`     - 人物身份、关系、动机、背景 -> 优先 人物信息/{角色名}`,`     - 宗门、家族、势力归属 -> 优先 势力宗门信息/{势力名}`,`     - 地点、区域、宗门驻地、洞府、城池 -> 优先 地点信息/...`,`     - 功法、秘术、神通、修炼法门 -> 优先 功法信息`,`     - 法宝、法器、古宝、通天灵宝 -> 优先 法宝法器信息`,`     - 阵法、禁制、阵盘、阵旗、布阵器具 -> 优先 阵法信息`,`     - 符箓、符宝 -> 优先 符箓信息`,`     - 丹药、药散、药液 -> 优先 丹药信息`,`     - 材料、矿材、炼器材料 -> 优先 材料信息`,`     - 灵草、灵植、药材 -> 优先 灵草信息`,`     - 妖兽、灵兽、灵虫、奇虫 -> 优先 妖兽灵虫信息`,`     - 体质、血脉、资质 -> 优先 特殊体质 或 修为境界体系`,`     - 秘境、遗迹、禁地 -> 优先 秘境遗迹`,`     - 主角经历、主角主线推进、主角关键因果，以及与主角推进直接相关的世界事件、支线因果、阶段变化 -> 优先 主角剧情线`,`   - 不要推荐任何年表/剧情梳理类目录。`,`   - 如果目录树已经显示某个实体存在稳定路径，优先复用那条路径，而不是临时猜一个新目录。`,``,`3. **exclude_folders (黑名单 - 排除干扰)**:`,`   - 应主动排除当前场景明显无关的目录，但不要把当前文本、地点或在场人物直接相关的目录排掉。`,`   - 判断示例：`,`     - 如果是在查人物关系、身份背景、立场变化 -> 可排除 材料信息、法宝法器信息、妖兽灵虫信息`,`     - 如果是在查地点环境、宗门布局、资源分布 -> 可排除 人物信息，并酌情排除无关的 主角剧情线`,`     - 如果是在查功法、神通、法宝效果 -> 可排除无关的 主角剧情线、地点信息、章节总结`,`     - 如果是在查主角近期推进 -> 优先保留 主角剧情线，可排除无关的 材料信息、灵草信息、妖兽灵虫信息`,`     - 如果是在查与主角推进直接相关的世界事件或支线因果 -> 仍优先保留 主角剧情线，可排除无关的 材料信息、灵草信息、妖兽灵虫信息`,`   - 若某个目录名、地点名、角色名已经在当前文本、当前地点或在场人物中直接出现，通常不要把对应目录列入 exclude_folders。`,``,`4. **filter (元数据过滤)**:`,`   - filter 用于进一步缩小范围，必须与上面的目录语义兼容，不是替代关系，而是在选定目录后再做元数据筛选。`,`   - categories 请使用凡人项目当前元数据分类：人物、地点、事件、物品、技能、势力、其他。`,`   - requireCharacters：当剧情明显涉及具体角色，或在场人物里已经给出角色名时，应填入对应角色名数组。`,`   - requireLocations：当当前地点明确，或文本里出现具体地点、宗门、洞府、秘境时，应填入对应地点数组。`,`   - logic：通常使用 OR；只有在“特定人物 + 特定分类”或“特定地点 + 特定事件”这类高精度检索中才使用 AND。`,`   - reason：简要说明为什么选这些目录和过滤条件，例如“当前场景发生在天泉峰寒髓泉，重点查询地点信息与主角剧情线，并要求地点命中寒髓泉”。`,``,`5. **Formatting**:`,`   - 必须严格返回 JSON 格式。`,`   - 如果某个字段确实没有相关内容，返回空数组 []。`,`   - folders / exclude_folders 中只能填写上方【可用的知识库文件夹列表】已存在或其明显父级语义一致的目录名称，不要凭空造英文目录名。`].join(`
`);function Gn(e,t){let n=typeof e==`string`?{text:e,userInput:e}:e,r=t.trim()||Z;return r=r.replace(/\{\{#if worldBooks\}\}[\s\S]*?\{\{\/if\}\}/g,``),r=r.replace(/\{\{worldBooks\}\}/g,``),r=Y(r,[`userInput`,`user_input`,`text`],n.text??n.userInput??``),r=Y(r,[`storyText`,`story_text`],n.storyText??``),r=Y(r,[`contextHistory`,`context_history`],n.contextHistory??``),r=Y(r,[`currentTime`],n.currentTime??`未知时间`),r=Y(r,[`currentLocation`],n.currentLocation??`未知地点`),r=Y(r,[`playerRank`],n.playerRank??`未知境界`),r=Y(r,[`stateSnapshot`,`state_snapshot`],n.stateSnapshot??`无`),r=Y(r,[`playerSnapshot`,`player_snapshot`],n.playerSnapshot??`无`),r=Y(r,[`characterSnapshots`,`character_snapshots`],n.characterSnapshots??`无`),r=Y(r,[`onScreenNpcs`,`on_screen_npcs`],n.onScreenNpcs??`无`),r=Y(r,[`currentTasks`,`current_tasks`],n.currentTasks??`无`),r=Y(r,[`worldEvents`,`world_events`],n.worldEvents??`无`),r=Y(r,[`worldGeography`,`world_geography`],n.worldGeography??`无`),r=Y(r,[`worldFactors`,`world_factors`],n.worldFactors??`无`),r=Y(r,[`currentSceneMap`,`current_scene_map`],n.currentSceneMap??`无`),r=Y(r,[`mapContext`,`map_context`],n.mapContext??`无`),r=Y(r,[`quickChatAll`,`quick_chat_all`],n.quickChatAll??`无`),r=Y(r,[`characterBiographies`,`character_biographies`],n.characterBiographies??`无相关人物信息`),r=Y(r,[`sceneInfoBlock`,`scene_info_block`],n.sceneInfoBlock??`无场景信息`),r=Y(r,[`folderList`,`folder_list`],n.folderList??`未分类`),r=Y(r,[`folderTitleIndex`,`folder_title_index`],n.folderTitleIndex??`暂无条目标题索引`),r=Y(r,[`playerName`],n.playerName??`玩家`),r}function Kn(e,t){let n=typeof e==`string`?{text:e,userInput:e}:e;return Dn({template:(t.trim()||Z).replace(/\{\{#if worldBooks\}\}[\s\S]*?\{\{\/if\}\}/g,``).replace(/\{\{worldBooks\}\}/g,``),stableTitle:`RAG 检索增强固定规则`,dynamicTitle:`RAG 检索动态输入`,variables:[{label:`当前输入`,value:n.text??n.userInput??``,tokens:[`{{userInput}}`,"${userInput}",`{{user_input}}`,"${user_input}",`{{text}}`,"${text}"],cacheOrder:90},{label:`近期剧情`,value:n.storyText??``,tokens:[`{{storyText}}`,"${storyText}",`{{story_text}}`,"${story_text}"],cacheOrder:88},{label:`上下文历史`,value:n.contextHistory??``,tokens:[`{{contextHistory}}`,"${contextHistory}",`{{context_history}}`,"${context_history}"],cacheOrder:84},{label:`当前时间`,value:n.currentTime??`未知时间`,tokens:[`{{currentTime}}`,"${currentTime}"],cacheOrder:25},{label:`当前地点`,value:n.currentLocation??`未知地点`,tokens:[`{{currentLocation}}`,"${currentLocation}"],cacheOrder:30},{label:`主角境界`,value:n.playerRank??`未知境界`,tokens:[`{{playerRank}}`,"${playerRank}"],cacheOrder:35},{label:`状态快照`,value:n.stateSnapshot??`无`,tokens:[`{{stateSnapshot}}`,"${stateSnapshot}",`{{state_snapshot}}`,"${state_snapshot}"],cacheOrder:70},{label:`主角快照`,value:n.playerSnapshot??`无`,tokens:[`{{playerSnapshot}}`,"${playerSnapshot}",`{{player_snapshot}}`,"${player_snapshot}"],cacheOrder:72},{label:`角色快照`,value:n.characterSnapshots??`无`,tokens:[`{{characterSnapshots}}`,"${characterSnapshots}",`{{character_snapshots}}`,"${character_snapshots}"],cacheOrder:74},{label:`在场 NPC`,value:n.onScreenNpcs??`无`,tokens:[`{{onScreenNpcs}}`,"${onScreenNpcs}",`{{on_screen_npcs}}`,"${on_screen_npcs}"],cacheOrder:76},{label:`当前任务`,value:n.currentTasks??`无`,tokens:[`{{currentTasks}}`,"${currentTasks}",`{{current_tasks}}`,"${current_tasks}"],cacheOrder:60},{label:`世界事件`,value:n.worldEvents??`无`,tokens:[`{{worldEvents}}`,"${worldEvents}",`{{world_events}}`,"${world_events}"],cacheOrder:65},{label:`世界地理`,value:n.worldGeography??`无`,tokens:[`{{worldGeography}}`,"${worldGeography}",`{{world_geography}}`,"${world_geography}"],cacheOrder:40},{label:`世界因子`,value:n.worldFactors??`无`,tokens:[`{{worldFactors}}`,"${worldFactors}",`{{world_factors}}`,"${world_factors}"],cacheOrder:45},{label:`当前场景地图`,value:n.currentSceneMap??`无`,tokens:[`{{currentSceneMap}}`,"${currentSceneMap}",`{{current_scene_map}}`,"${current_scene_map}"],cacheOrder:50},{label:`地图上下文`,value:n.mapContext??`无`,tokens:[`{{mapContext}}`,"${mapContext}",`{{map_context}}`,"${map_context}"],cacheOrder:55},{label:`快速交谈`,value:n.quickChatAll??`无`,tokens:[`{{quickChatAll}}`,"${quickChatAll}",`{{quick_chat_all}}`,"${quick_chat_all}"],cacheOrder:82},{label:`人物信息参考`,value:n.characterBiographies??`无相关人物信息`,tokens:[`{{characterBiographies}}`,"${characterBiographies}",`{{character_biographies}}`,"${character_biographies}"],cacheOrder:78},{label:`场景信息`,value:n.sceneInfoBlock??`无场景信息`,tokens:[`{{sceneInfoBlock}}`,"${sceneInfoBlock}",`{{scene_info_block}}`,"${scene_info_block}"],cacheOrder:80},{label:`知识库文件夹列表`,value:n.folderList??`未分类`,tokens:[`{{folderList}}`,"${folderList}",`{{folder_list}}`,"${folder_list}"],cacheOrder:10},{label:`知识库标题索引`,value:n.folderTitleIndex??`暂无条目标题索引`,tokens:[`{{folderTitleIndex}}`,"${folderTitleIndex}",`{{folder_title_index}}`,"${folder_title_index}"],cacheOrder:15},{label:`玩家姓名`,value:n.playerName??`玩家`,tokens:[`{{playerName}}`,"${playerName}"],cacheOrder:20}]})}function qn(e){let t=e.trim().replace(/<think>[\s\S]*?<\/think>/gi,``).replace(/<thinking>[\s\S]*?<\/thinking>/gi,``).replace(/^```(?:json)?\s*/i,``).replace(/\s*```$/i,``);if(!t)return null;let n=t.match(/\{[\s\S]*\}/);if(n)try{let e=JSON.parse(n[0]),t=typeof e.filter==`object`&&e.filter!==null?e.filter:null;return{keywords:X(e.keywords)??[],folders:X(e.folders),excludeFolders:X(e.exclude_folders??e.excludeFolders),categories:X(e.categories),characters:X(e.characters),locations:X(e.locations),tags:X(e.tags),filter:t?{categories:X(t.categories),requireTags:X(t.requireTags),excludeTags:X(t.excludeTags),requireCharacters:X(t.requireCharacters),requireLocations:X(t.requireLocations),logic:Wn(t.logic).toUpperCase()===`AND`?`AND`:`OR`,reason:Wn(t.reason)||void 0}:void 0}}catch{return null}return null}const Q=`RAG_CONFIG_V1`,Jn=`Qwen/Qwen3-Embedding-8B`,Yn=1024,Xn=`/api/global-vector-search`,Zn=.2,Qn=[{id:`fanren-wiki-v1`,name:`凡人wiki_v1.1`,version:`2026-06-30-cleaned-nangongque`,description:`条目化 wiki 设定、人物、地点、功法、法宝等公共资料；已清理章节来源标注，并补入南宫阙称谓。`},{id:`renjie-lingjie-persona-anime-like`,name:`人界、灵界与仙界设定集`,version:`2026-08-02-fanjingmei`,description:`部分人设比较接近动漫，并补充仙界篇人物、势力、地点与物品整理稿。`}],$n=[],$={enabled:!1,autoSave:!1,autoInject:!0,autoMerge:!0,autoSaveFrequency:1,contextLimit:10,topK:20,similarityThreshold:.6,chunkSize:500,searchMethod:`semantic`,cooldownRounds:0,outdatedRetention:50,folders:[],rerank:{enabled:!1,url:`https://api.siliconflow.cn/v1/rerank`,apiKey:``,model:`Qwen/Qwen3-Reranker-8B`,candidateTopK:20,scoreThreshold:Zn,topK:10},llmQueryEnabled:!1,deepSeekQueryWorkflowEnabled:!1,llmQueryPromptTemplate:Z,embeddingProvider:`siliconflow-cn`,embeddingUrl:`https://api.siliconflow.cn/v1/embeddings`,customEmbeddingUrl:``,embeddingModel:Jn,embeddingApiKey:``,customEmbeddingApiKey:``,publicKnowledgeSource:`local`,onlineVectorLibraryIds:$n,timeFilterEnabled:!1,currentTimeRef:``,saveSummarizeEnabled:!1,vectorSavePromptTemplate:Un,remoteLibraryManifestUrl:Cn(`vector-libs/index.json`)};function er(e){let t=e?.trim();return!t||t===`# Role: 凡人修仙传·全息智能检索助手 (Immortal Cultivation Retrieval Agent)

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

"执行饱和式设定检索：Channel A 锚定总纲；Channel C 锁定当前环境并全员检索在场配角；Channel B 识别名词类别并匹配专用后缀；原著与年表已彻底移除。"`||t===`你是一个智能检索助手。请分析以下剧情内容，生成检索条件。

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
   - 如果某个字段确实没有相关内容，返回空数组 []。`||t.includes(`人物身份、关系、动机、背景 -> 优先 人物传记/{角色名}`)&&t.includes(`优先 势力档案/{势力名}`)&&t.includes(`优先 物品图鉴/...`)&&t.includes(`优先 时间线；整章回顾可参考 章节总结`)||t.includes(`主角经历、主角主线推进、主角关键因果 -> 优先 主角剧情线`)&&t.includes(`世界事件、支线因果、阶段推进 -> 优先 时间线；整章回顾可参考 章节总结`)||t.includes(`如果属于主角剧情线，仍然优先归入 时间线`)&&t.includes(`优先 剧情时间线`)?Z:e??Z}function tr(e){let t=e?.trim();return!t||t===`这是主角\${playerName}的修仙故事
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

请开始执行，并直接返回 JSON 数组。`||t.includes(`主角剧情线：主角经历、主角主线推进、主角关键因果`)&&t.includes(`时间线：世界事件、支线事件、公共因果推进、阶段变化`)||t.includes(`人物传记：人物传记/{人物名称}`)&&t.includes(`势力档案：势力档案/{势力名称}`)&&t.includes(`地理志：地理志/{从大到小的稳定地理路径}`)&&t.includes(`物品图鉴：物品图鉴/法宝阵旗`)?Un:e??Un}function nr(e){let t=cr(e.embeddingProvider),n=ur(e.embeddingProvider,e.embeddingUrl),r=dr(typeof e.customEmbeddingUrl==`string`?e.customEmbeddingUrl:n===`custom`?e.embeddingUrl:``),i=typeof e.customEmbeddingApiKey==`string`?e.customEmbeddingApiKey:!t&&n===`custom`&&typeof e.embeddingApiKey==`string`?e.embeddingApiKey:``,a=!t&&n===`custom`?``:typeof e.embeddingApiKey==`string`?e.embeddingApiKey:``;return{...e,searchMethod:sr(e.searchMethod),embeddingProvider:n,embeddingUrl:fr(n,r),customEmbeddingUrl:r,embeddingApiKey:a,customEmbeddingApiKey:i,embeddingModel:Jn,publicKnowledgeSource:mr(e.publicKnowledgeSource),onlineVectorLibraryIds:pr(e.onlineVectorLibraryIds),remoteLibraryManifestUrl:wn(e.remoteLibraryManifestUrl,`vector-libs/index.json`)}}function rr(e){let t=e.embeddingProvider===`custom`?e.customEmbeddingApiKey:e.embeddingApiKey;return typeof t==`string`?t.trim():``}function ir(e){return fr(ur(e.embeddingProvider,e.embeddingUrl),typeof e.customEmbeddingUrl==`string`?e.customEmbeddingUrl:e.embeddingUrl)}function ar(e){return e.rerank.enabled?`hybrid`:`semantic`}function or(e){return e===0||typeof e!=`number`||!Number.isFinite(e)?Zn:Math.min(1,Math.max(0,e))}function sr(e){return e===`direct`||e===`hybrid`||e===`semantic`?e:e===`llm_index`?`direct`:$.searchMethod}function cr(e){return e===`siliconflow-cn`||e===`siliconflow-com`||e===`custom`}function lr(e){if(typeof e!=`string`)return $.embeddingProvider;let t=e.trim();if(!t)return $.embeddingProvider;let n=xn(t,`embeddings`);return n===`https://api.siliconflow.com/v1/embeddings`?`siliconflow-com`:n===`https://api.siliconflow.cn/v1/embeddings`?`siliconflow-cn`:`custom`}function ur(e,t){return cr(e)?e:lr(t)}function dr(e){return typeof e==`string`?e.trim():``}function fr(e,t){if(e===`siliconflow-com`)return`https://api.siliconflow.com/v1/embeddings`;if(e===`siliconflow-cn`)return`https://api.siliconflow.cn/v1/embeddings`;let n=dr(t);return n?xn(n,`embeddings`):``}function pr(e){if(!Array.isArray(e))return $n;let t=new Set(Qn.map(e=>e.id));return Array.from(new Set(e.filter(e=>typeof e==`string`).map(e=>e.trim()).filter(e=>t.has(e))))}function mr(e){return e===`online`?`online`:`local`}const hr=o()((e,t)=>({config:{...$},loaded:!1,vectorizing:!1,searching:!1,lastSearchCount:0,updateConfig:async n=>{let r=nr({...t().config,...n});e({config:r}),await i(Q,r)},loadConfig:async()=>{let t=await n(Q);if(t){let n=cr(t.embeddingProvider),r=n?t.embeddingProvider:lr(t.embeddingUrl),a=typeof t.customEmbeddingUrl==`string`?t.customEmbeddingUrl:r===`custom`?t.embeddingUrl:``,o=typeof t.customEmbeddingApiKey==`string`?t.customEmbeddingApiKey:r===`custom`?t.embeddingApiKey:``,s=nr({...$,...t,embeddingProvider:r,customEmbeddingUrl:a,customEmbeddingApiKey:o,embeddingApiKey:!n&&r===`custom`?``:typeof t.embeddingApiKey==`string`?t.embeddingApiKey:``,llmQueryPromptTemplate:er(t.llmQueryPromptTemplate),vectorSavePromptTemplate:tr(t.vectorSavePromptTemplate),rerank:{...$.rerank,...t.rerank,url:t.rerank?.url?.trim()||`https://api.siliconflow.cn/v1/rerank`,model:t.rerank?.model?.trim()||`Qwen/Qwen3-Reranker-8B`,scoreThreshold:or(t.rerank?.scoreThreshold)}});e({config:s,loaded:!0}),(t.remoteLibraryManifestUrl!==s.remoteLibraryManifestUrl||!n||t.customEmbeddingUrl!==s.customEmbeddingUrl||t.customEmbeddingApiKey!==s.customEmbeddingApiKey)&&await i(Q,s)}else e({loaded:!0})},setVectorizing:t=>e({vectorizing:t}),setSearching:t=>e({searching:t}),setLastSearchCount:t=>e({lastSearchCount:t}),updateRerank:async n=>{let r=t().config,a={...r.rerank,...n},o=nr({...r,rerank:a});e({config:o}),await i(Q,o)}})),gr=`NARRATIVE_MEMORY_CONFIG_V1`,_r=5e3,vr={enabled:!0,recentFullTextCount:5,requestTimeoutSeconds:90,splitRoutesEnabled:!1,deepSeekBeforeSendWorkflowEnabled:!1,mergePostReplyWrites:!1,ingestAfterReply:!0,catchUpBeforeSend:!0,catchUpMaxPasses:12,compileBeforeSend:!0,useFastPathBeforeSend:!0,extractFactsAfterReply:!0,retrieveFactsBeforeSend:!0,useLLMCompileRerank:!0,useLLMQueryRewrite:!0,useLLMInjectionPlanner:!0,narrativeFactTopK:6,narrativeFactCandidateCount:24,narrativeFactScoreThreshold:.3,narrativeFactMinImportance:1,narrativeFactMaxPerType:1,narrativeFactQueryVariantLimit:4,narrativeFactUseRerank:!0,narrativeFactDistantTitleKeywordOnlyAfterTurns:200,narrativeIngestRetryCount:2,narrativeIngestRetryDelayMs:1200,maxThreads:4,maxStateSlots:5,maxRelations:3,maxEvents:8,maxEntities:6,maxArchiveCards:4};function yr(e){let t=vr,n=e.mode,r=typeof e.recentFullTextCount==`number`&&Number.isFinite(e.recentFullTextCount)?Math.min(10,Math.max(0,Math.floor(e.recentFullTextCount))):t.recentFullTextCount,i=typeof e.requestTimeoutSeconds==`number`&&Number.isFinite(e.requestTimeoutSeconds)?Math.min(300,Math.max(30,Math.floor(e.requestTimeoutSeconds))):t.requestTimeoutSeconds;return{...t,enabled:e.enabled??t.enabled,recentFullTextCount:r,requestTimeoutSeconds:i,splitRoutesEnabled:e.splitRoutesEnabled===!0,deepSeekBeforeSendWorkflowEnabled:e.deepSeekBeforeSendWorkflowEnabled===!0,mergePostReplyWrites:e.mergePostReplyWrites===!0,narrativeFactUseRerank:n===`lite`?t.narrativeFactUseRerank:e.narrativeFactUseRerank??t.narrativeFactUseRerank,narrativeFactDistantTitleKeywordOnlyAfterTurns:typeof e.narrativeFactDistantTitleKeywordOnlyAfterTurns==`number`&&Number.isFinite(e.narrativeFactDistantTitleKeywordOnlyAfterTurns)?Math.min(_r,Math.max(0,Math.floor(e.narrativeFactDistantTitleKeywordOnlyAfterTurns))):t.narrativeFactDistantTitleKeywordOnlyAfterTurns}}function br(){let e=hr.getState().config;if(rr(e))return!0;let t=fn.getState(),n=t.featureRoutes[pn.RAG_EMBED]??[];if(n.length===0)return!1;let r=new Map(t.endpointCombos.map(e=>[e.id,e]));return n.some(e=>{let t=r.get(e);return!t||!tt(t)?!1:!!(t.api_url.trim()&&t.api_key.trim()&&t.model.trim())})}async function xr(){let{useDeepSummaryStore:e}=await import(`./store-CUKWc_9Q.js`),t=e.getState();t.loaded||await t.loadFromDB(),e.getState().config.enabled&&(e.getState().updateConfig({enabled:!1}),await e.getState().saveToDB())}const Sr=o()((e,t)=>({config:{...vr},loaded:!1,ingesting:!1,lastError:null,loadConfig:async()=>{let t=yr(await n(`NARRATIVE_MEMORY_CONFIG_V1`)??vr);t.enabled&&await xr(),e({config:t,loaded:!0,lastError:null})},updateConfig:async n=>{let r=t().config,a=n.enabled===!0,o=yr({...r,...n});e({config:o,lastError:null}),await i(gr,o),a&&o.enabled&&await xr()},setIngesting:t=>e({ingesting:t}),setLastError:t=>e({lastError:t})}));export{pe as $,Dn as A,vt as B,zn as C,Vn as D,qn as E,mn as F,S as G,tt as H,fn as I,O as J,E as K,pt as L,vn as M,xn as N,kn as O,pn as P,T as Q,gt as R,Bn as S,Nn as T,nt as U,yt as V,ct as W,ge as X,_e as Y,ve as Z,Gn as _,Sr as a,ie as at,An as b,Jn as c,_ as ct,rr as d,ee as et,ir as f,Kn as g,Pn as h,br as i,b as it,Cn as j,Hn as k,Xn as l,hr as m,gr as n,ae as nt,Q as o,y as ot,ar as p,D as q,_r as r,oe as rt,Yn as s,v as st,vr as t,se as tt,nr as u,Mn as v,In as w,Fn as x,jn as y,_t as z};