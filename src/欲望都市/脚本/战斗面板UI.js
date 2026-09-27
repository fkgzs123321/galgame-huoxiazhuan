/* 欲望都市 · 战斗面板 UI 注入脚本（挂载点 + Shadow DOM 模式）
 * 由 _build_battle_ui.mjs 从 正则/战斗面板界面.html 生成，勿手改。
 * 机制：扫描消息中的 [data-yds-battle-mount] 挂载点 → attachShadow 注入战斗面板 → 事件委托
 * 数据：getVariables / Mvu.getMvuData 读取，Mvu.replaceMvuData 写回（type:'message'）
 * 依赖：MVU 脚本（waitGlobalInitialized('Mvu')）
 */
(function(){


var YDS_ALL_THEMES=['dark','glass','light','contrast','pink','blue','gold'];
function ydsGetTheme(){var t='dark';try{t=localStorage.getItem('yds_theme')||'dark'}catch(e){}if(YDS_ALL_THEMES.indexOf(t)<0)t='dark';return t}
function ydsFindRoot(){
  var host=null;
  if(typeof CURRENT!=='undefined'&&CURRENT&&CURRENT.shadow){try{host=CURRENT.shadow.getElementById('bu-root')}catch(e){}}
  if(!host){try{host=document.querySelector('.battleui')||document.getElementById('bu-root')}catch(e){}}
  return host;
}
function ydsApplyTheme(t){
  if(!t)t='dark';
  try{localStorage.setItem('yds_theme',t)}catch(e){}
  if(typeof State!=='undefined')State.theme=t;
  var host=ydsFindRoot();
  if(host)host.setAttribute('data-theme',t);
}
function ydsInitTheme(){var t=ydsGetTheme();ydsApplyTheme(t)}
var YDS_THEMES=['dark','glass','light','contrast','pink','blue','gold'];
function ydsCurTheme(){
  var host=ydsFindRoot();
  var cur=host?host.getAttribute('data-theme'):null;
  if(YDS_THEMES.indexOf(cur)<0)cur='dark';
  return cur}
function ydsToggleTheme(){var cur=ydsCurTheme();var idx=YDS_THEMES.indexOf(cur);var next=YDS_THEMES[(idx+1)%YDS_THEMES.length];ydsApplyTheme(next);if(typeof render==='function')render()}


/* ===== 欲望都市 · 战斗面板 · 本地战斗引擎（零依赖）===== */

/* ===== 欲望都市 · 战斗面板 · 本地战斗引擎（零依赖）===== */

/* ===== 欲望都市 · 战斗面板 · 本地战斗引擎（零依赖）===== */
var TH_HOSTS=[window,window.parent,window.top].filter(function(w,i,arr){return w&&arr.indexOf(w)===i});
function pickHostFn(name){
  if(typeof window[name]==='function')return function(){return window[name].apply(window,arguments)};
  for(var i=0;i<TH_HOSTS.length;i++){try{var h=TH_HOSTS[i];if(typeof h[name]==='function')return function(host,n){return function(){return host[n].apply(host,arguments)}}(h,name)}catch(e){}}
  return null;
}
function pickHostValue(name){
  if(window[name]!==undefined)return window[name];
  for(var i=0;i<TH_HOSTS.length;i++){try{if(TH_HOSTS[i][name]!==undefined)return TH_HOSTS[i][name]}catch(e){}}
  return undefined;
}
function getMvu(){return pickHostValue('Mvu')||window.Mvu||null}
function parseEmbeddedStat(){
  var el=document.getElementById('stat-embed');
  if(!el)return null;
  var raw=(el.textContent||el.innerText||'').trim();
  if(!raw||raw.indexOf('format_message_variable')>=0)return null;
  try{var parsed=JSON.parse(raw);
    if(parsed&&typeof parsed==='object'){
      if(parsed.stat_data&&typeof parsed.stat_data==='object')return parsed.stat_data;
      return parsed;
    }
  }catch(e){}
  return null;
}
function hasData(o){return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length>0}
function pickStatData(source){if(!source||typeof source!=='object')return null;var stat=source.stat_data;if(hasData(stat))return stat;if(hasData(source)&&(source.排班||source.玩家||source.时间||source.女性角色))return source;return null}
function resolveMessageIdFromDom(){
  try{
    var frame=window.frameElement;
    if(frame&&frame.closest){var mes=frame.closest('.mes');if(mes){var id=parseInt(mes.getAttribute('mesid'),10);if(id>=0)return id}}
    var el=frame;
    while(el){if(el.classList&&el.classList.contains('mes')){var id2=parseInt(el.getAttribute('mesid'),10);if(id2>=0)return id2}el=el.parentElement}
    for(var i=0;i<TH_HOSTS.length;i++){try{var host=TH_HOSTS[i];var host$=host.$||host.jQuery;if(!host$||!frame)continue;var $mes=host$(frame).closest('.mes');if($mes&&$mes.length){var id3=parseInt($mes.attr('mesid'),10);if(id3>=0)return id3}}catch(e){}}
  }catch(e){}
  return -1;
}
function resolveMessageIdFromIframeName(){
  var fn=pickHostFn('getIframeName');if(!fn)return -1;
  try{var name=String(fn()||'');var m=/^TH-message--(\d+)--/.exec(name);if(m)return parseInt(m[1],10)}catch(e){}
  return -1;
}
function resolveMessageId(){
  var fromDom=resolveMessageIdFromDom();if(fromDom>=0)return fromDom;
  var fromName=resolveMessageIdFromIframeName();if(fromName>=0)return fromName;
  if(typeof window.message_id==='number'&&window.message_id>=0)return window.message_id;
  var fn=pickHostFn('getCurrentMessageId');
  if(fn){try{var id=fn();if(typeof id==='number'&&id>=0)return id}catch(e){}}
  return -1;
}
function getMessageOption(){var messageId=resolveMessageId();return{type:'message',message_id:messageId>=0?messageId:'latest'}}
// 读/写分离：显示读最新楼（战斗结算/AI写回发生在最新楼，面板停留旧楼也能看到新值）；写回仍用 getMessageOption（自己楼层，防串楼）
function getReadOption(){return{type:'message',message_id:'latest'}}

/* 默认数据兜底（单独打开时演示战斗） */
var DEFAULT_STAT={
  时间:{日期:'2026年9月1日',星期:'星期一',时段:'晚场'},
  玩家:{学业总分:420,各科:{语文:100,数学:85,英语:95,物理:70,化学:80,生物:90},技能:{螺旋:{等级:3,经验:45},颗粒:{等级:2,经验:20},敏感度加倍:{等级:1,经验:10},硬度翻倍:{等级:1,经验:5},热量翻倍:{等级:2,经验:30},次数翻倍:{等级:1,经验:0},频率翻倍:{等级:1,经验:0}},体力:80,性欲:30,勃起度:10,今日胜场:0,今日败场:0,累计缴械:0,累计被缴械:0,道具栏:{印度神油:3,伟哥:2,辣椒油:1,六神花露水:1,清凉油:0,润滑液:2},恢复技能:{提肛:{等级:1,经验:0},思维分散:{等级:1,经验:0}},生理:{今日射精次数:0,射精冷却剩余:0,最后射精日期:'',晨勃:true,上次恢复体力日期:'',上次推进日期:''}},
  排班:{今日场次:{晚场:{参与者:'丽莎·伊万诺娃',结果:'未开战',是否参战:false}},当前战斗目标:'丽莎·伊万诺娃',战斗状态:'进行中',战斗:{回合:0,主角防守值:96,主角防守值上限:96,她防守值:44,她防守值上限:44,麻痒点:0,她减伤修正:0,本场经验:{}}},
  女性角色:{
    '丽莎·伊万诺娃':{身份:'高三精英班学生（俄籍交换生）',省份:'俄罗斯莫斯科',方言:'俄语+英语+中文',关系:'同班同学',缴械值:55,缴械次数:3,战斗次数:4,胜场:1,败场:2,名器:'雪窦',名器防御:7,防守值上限:44,技能:{名:'寒凝',等级:3,经验:12,技能组:{雪沁:{等级:1,经验:0},回温:{等级:2,经验:30}}},能力值:{忍耐:7,持久:5,反攻:4},特质:'直球、好奇、金发',缺陷:'怕热、成语用错',欲望积压:68,是否俘虏:false,俘虏日期:'',今日已使用:false,道具栏:{冰袋:1,震动环:1,薄荷油:1,润滑液:2},恢复技能:{名:'静息',等级:1,经验:0},服装:{},身体状态:{胸部:{状态:'白皙挺立',乳头:'淡粉平坦',敏感度:50},阴道:{状态:'粉嫩闭合',湿润度:30,敏感度:50},肛门:{状态:'浅粉紧致'},嘴:{状态:'粉润轻抿'},肌肤:{状态:'白皙干爽',体温:'微温'},大腿:{状态:'白皙并拢'},臀部:{状态:'白皙圆润'}},生理周期:{月经日:8,周期天数:28,月经状态:'卵泡期',经期开始日:1,怀孕:false,怀孕周数:0,避孕:true,备孕:false,排卵日:14},心理状态:{欲望度:72,羞耻感:55,兴奋:66,期待:40,精神状态:'动摇'},心声:'这个，很棒……为什么，会这样？'}
  }
};
function deepMergeStat(dst,src){
  if(!src||typeof src!=='object')return dst;
  var out={};try{out=JSON.parse(JSON.stringify(dst||{}))}catch(e){out={}}
  for(var k in src){
    if(!Object.prototype.hasOwnProperty.call(src,k))continue;
    var sv=src[k],dv=out[k];
    if(sv&&typeof sv==='object'&&!Array.isArray(sv)&&dv&&typeof dv==='object'&&!Array.isArray(dv)){out[k]=deepMergeStat(dv,sv)}
    else{out[k]=sv}
  }
  return out;
}
var cachedStatFromBridge=null;
function readStatData(){
  var stat=null;
  try{var Mvu2=getMvu();var opt=getReadOption();if(Mvu2&&typeof Mvu2.getMvuData==='function'){stat=pickStatData(Mvu2.getMvuData(opt))}}catch(e){}
  if(!stat){try{var gv=pickHostFn('getVariables');if(gv){stat=pickStatData(gv(getReadOption()))}}catch(e){}}
  if(!stat&&cachedStatFromBridge&&hasData(cachedStatFromBridge))stat=cachedStatFromBridge;
  if(!stat){var embedded=parseEmbeddedStat();if(embedded)stat=embedded}
  if(!stat){try{var gav=pickHostFn('getAllVariables');if(gav){stat=pickStatData(gav())}}catch(e){}}
  State._statLoaded=!!(stat&&typeof stat==='object'&&Object.keys(stat).length>0);
  return deepMergeStat(DEFAULT_STAT,stat||{});
}
function requestStatFromBridge(){
  var mesId=resolveMessageId();var payload={type:'yds-mvu-stat-request',messageId:mesId};
  for(var i=0;i<TH_HOSTS.length;i++){try{TH_HOSTS[i].postMessage(payload,'*')}catch(e){}}
}
function waitForReadableStat(timeoutMs,cb){
  timeoutMs=timeoutMs||6000;var started=Date.now();
  (function poll(){
    var stat=readStatData();
    if(Object.keys(stat).length>0){cb(stat);return}
    requestStatFromBridge();
    if(Date.now()-started<timeoutMs){setTimeout(poll,180)}else{cb(readStatData())}
  })();
}

/* 工具 */
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function num(v,d){if(Array.isArray(v))v=v[0];v=parseFloat(v);d=(d===undefined)?0:d;return isNaN(v)?d:v}
function clamp(v,min,max){v=num(v,0);return Math.max(min,Math.min(max,v))}
function pct(v,max){v=num(v,0);max=num(max,100);return Math.max(0,Math.min(100,max>0?(v/max)*100:0))}
function obj(o){return(o&&typeof o==='object')?o:{}}
function stageText(v){
  v=num(v,0);
  if(v>=100)return '俘虏';
  if(v>=80)return '阶段五 · 全然臣服前夜';
  if(v>=60)return '阶段四 · 投降边缘';
  if(v>=40)return '阶段三 · 沉沦与依赖';
  if(v>=20)return '阶段二 · 动摇与试探';
  return '阶段一 · 初识与抗拒';
}
function hpColor(v){
  v=num(v,0);
  if(v>=90)return 'linear-gradient(90deg,#ff5c5c,#ff9a6a)';
  if(v>=70)return 'linear-gradient(90deg,#ff8a3c,#ffc46a)';
  if(v>=50)return 'linear-gradient(90deg,#e0b44c,#f0e08a)';
  if(v>=30)return 'linear-gradient(90deg,#8fc46a,#d0f08a)';
  if(v>=15)return 'linear-gradient(90deg,#5cb8e0,#a8e0f0)';
  return 'linear-gradient(90deg,#7a6ae8,#b0a8ff)';
}
function jxColor(v){v=num(v,0);if(v>=100)return '#c98ae0';if(v>=80)return '#ff5c5c';if(v>=60)return '#ff9a3c';if(v>=40)return '#e0b44c';if(v>=20)return '#5cb8e0';return '#9c988c'}
function lvColor(lv){lv=num(lv,1);if(lv>=10)return 'linear-gradient(90deg,#c98ae0,#e8a8ff)';if(lv>=7)return '#ff8a3c';if(lv>=4)return '#e0b44c';return '#8fc4e8'}

/* 主角技能数值表（固定伤害 · RPG 属性 · 每回合最多用1个技能，均独立生效） */
var SKILLS={
  螺旋:{icon:'🌀',dmg:function(lv){return lv*3},type:'持续伤害',desc:'旋转刺激叠加麻痒',extra:'麻痒+2/回合',extraOn:'麻痒≥5 她失神(防守值额外-5)'},
  颗粒:{icon:'⚪',dmg:function(lv){return lv*2},type:'破防',desc:'颗粒摩擦削弱防线',extra:'她减伤-1(叠加)',extraOn:'持续降低她的防御'},
  敏感度加倍:{icon:'💗',dmg:function(lv){return lv*1},type:'辅助强化',desc:'放大敏感度放大快感',extra:'她减伤-1+敏感度+10',extraOn:'配合螺旋/热量类伤害×2'},
  硬度翻倍:{icon:'🔨',dmg:function(lv){return lv*2.5},type:'重击',desc:'硬挺冲击碾压防线',extra:'研磨/挤压减伤减半',extraOn:'克制她减伤类技能'},
  热量翻倍:{icon:'🔥',dmg:function(lv){return lv*4},type:'属性克制',desc:'灼热穿透冰寒',extra:'寒系名器×2',extraOn:'对雪窦/寒玉/雪润/冰守伤害翻倍'},
  次数翻倍:{icon:'⚡',dmg:function(lv){return lv*2},type:'连击',desc:'高频连击压制',extra:'连击：本回合最终伤害×1.5',extraOn:'独立连击，无需配合'},
  频率翻倍:{icon:'🎯',dmg:function(lv){return lv*2},type:'压制',desc:'高频节奏打乱她呼吸',extra:'她减伤-1/回合',extraOn:'持续降低她的防御'}
};
function skillDmg(key,lv){var s=SKILLS[key];return s?Math.round(s.dmg(lv)*10)/10:0}

/* 道具表（玩家道具栏，各自变量层） */
var ITEMS={
  印度神油:{icon:'🛢️',target:'self',eff:'主角BUFF: 攻击+3',desc:'本场攻击力+3'},
  伟哥:{icon:'💊',target:'self',eff:'主角BUFF: 攻击+2,勃起+40',desc:'攻击+2，勃起度+40'},
  辣椒油:{icon:'🌶️',target:'her',eff:'她BUFF: 减伤-2,麻痒+3/回合,灼烧-3/回合×3',desc:'变态玩法：她减伤-2，麻痒+3/回合，并灼烧3回合（每回合防守值-3）'},
  贞操锁:{icon:'🔒',target:'self',eff:'主角BUFF: 减伤+3,勃起-20',desc:'防御道具：5回合内她对你伤害-3，但勃起-20'},
  六神花露水:{icon:'🌿',target:'her',eff:'她BUFF: 敏感度+20,减伤-1',desc:'清凉刺激：她敏感度+20，减伤-1'},
  清凉油:{icon:'🧴',target:'self',eff:'清除自身麻痒+回复5',desc:'清除麻痒DEBUFF，回复防守值+5'},
  润滑液:{icon:'💧',target:'her',eff:'她BUFF: 减伤-2',desc:'湿滑难防：她减伤-2'}
};
/* 玩家恢复技能 */
var HEAL_SKILLS={
  提肛:{icon:'🧘',desc:'回复防守值+Lv×4',cooldown:3,type:'heal'},
  思维分散:{icon:'🌀',desc:'清除麻痒+体力+5',cooldown:3,type:'clear'}
};
function getItemEffect(key){
  var i=ITEMS[key];
  if(!i)return null;
  var eff={};
  if(key==='印度神油')eff={self:{攻击:3},rounds:3};
  else if(key==='伟哥')eff={self:{攻击:2,勃起:40},rounds:2};
  else if(key==='辣椒油')eff={her:{减伤:-2,麻痒:3},rounds:2};
  else if(key==='六神花露水')eff={her:{敏感度:20,减伤:-1},rounds:2};
  else if(key==='清凉油')eff={self:{清麻痒:1,回复:5},rounds:0};
  else if(key==='润滑液')eff={her:{减伤:-2},rounds:1};
  return eff;
}
function skillDesc(key,lv,herName){
  var s=SKILLS[key];
  if(!s)return '';
  var dmg=skillDmg(key,lv);
  var d=s.dmg(lv);
  // 特殊：热量翻倍对寒系×2
  if(key==='热量翻倍'&&/雪窦|寒玉|雪润|冰守/.test(herName||''))dmg=d*2;
  if(key==='敏感度加倍'&&(State.selSkills.indexOf('螺旋')>=0||State.selSkills.indexOf('热量翻倍')>=0))dmg=d*2;
  return s.desc+'｜伤害 '+dmg+(s.extra?'｜'+s.extra:'');
}

/* 她方技能机制表（38人独有技能 → 本地战斗逻辑，不依赖副API）
   每个技能映射为：反击倍率 / 减伤加成 / 玩家攻击削弱 / 特殊控制 */
var HER_SKILLS={
  '寒凝':{cd:1,icon:'❄️',atkMul:1.0,note:'冰系镇静：我方热量翻倍效果×0.7',resistHeat:0.3},
  '绞紧':{cd:2,icon:'🌀',atkMul:1.3,note:'节律绞紧：反击增强，频率类技能伤害-20%'},
  '磐石':{cd:2,icon:'🪨',atkMul:0.8,defAdd:3,note:'意志硬扛：减伤+3'},
  '恒定':{cd:2,icon:'🧊',atkMul:0.8,defAdd:3,note:'面无表情硬扛：减伤+3，每场1次免疫暴击'},
  '严整':{cd:2,icon:'📏',atkMul:0.9,defAdd:2,note:'严于律己：减伤+2，技巧类效果×0.8'},
  '久守':{cd:2,icon:'🛡️',atkMul:0.9,defAdd:2,lateDef:2,note:'久旷硬扛：减伤+2，第4回合起攻击-2'},
  '沉静':{cd:2,icon:'🤫',atkMul:0.9,defAdd:2,note:'厚壁硬扛：减伤+2'},
  '静水':{cd:2,icon:'🌊',atkMul:1.0,defAdd:1,note:'表面平静：减伤+1，每场1次反攻+2'},
  '絮语':{cd:2,icon:'💬',atkMul:1.0,atkDown:1,note:'碎碎念干扰：我方攻击-1/回合'},
  '软语':{cd:2,icon:'🎵',atkMul:1.0,atkDown:1,note:'软糯声音干扰：我方攻击-1/回合'},
  '交替':{cd:2,icon:'🔁',atkMul:1.1,atkDownEvery:2,note:'双腔交替：每2回合我方攻击-1'},
  '起伏':{cd:2,icon:'🌊',atkMul:1.0,lateAtkDown:2,note:'海浪起势：第3回合起我方攻击-2'},
  '收缩':{cd:3,icon:'🌺',atkMul:1.2,stunEvery:3,note:'花苞收放：每3回合定身我方1回合（我方本回合无法进攻）'},
  '潮汐':{cd:3,icon:'🌊',atkMul:1.0,stunEvery:3,note:'潮涨潮落：每3回合让我方失神（本回合伤害减半）'},
  '研磨':{cd:1,icon:'⚙️',atkMul:1.1,playerReduceDown:2,note:'三环研磨：我方减伤-2叠加'},
  '吸嘬':{cd:1,icon:'🫧',atkMul:1.1,note:'自主吸嘬：吸力压制，频率类伤害-15%'},
  '缠丝':{cd:1,icon:'🕸️',atkMul:1.1,note:'涡纹绞缠：频率类伤害-15%'},
  '吞吐':{cd:2,icon:'🫦',atkMul:1.2,note:'主动蠕动：反击增强'},
  '软磨':{cd:1,icon:'💧',atkMul:1.0,note:'温软水磨：反击稳定'},
  '绵延':{cd:1,icon:'🌫️',atkMul:1.0,note:'水多绵软：拖慢节奏'},
  '干磨':{cd:1,icon:'🏜️',atkMul:1.0,playerCost:2,note:'干涩摩擦：我方体力消耗+2'},
  '绵密':{cd:1,icon:'🪡',atkMul:1.0,playerCost:1,note:'细密绵缠：我方体力消耗+1'},
  '深纳':{cd:1,icon:'🐚',atkMul:1.0,playerCost:1,note:'宽软包容：我方体力消耗+1'},
  '热挤':{cd:1,icon:'🔥',atkMul:1.1,playerCost:2,note:'高温挤压：我方体力-2/回合'},
  '奔涌':{cd:1,icon:'💦',atkMul:1.1,playerCost:1,note:'水势凶猛：我方体力-1/回合'},
  '急火':{cd:1,icon:'🔥',atkMul:1.1,note:'灼热紧窄：我方热量翻倍反噬×1.5'},
  '共振':{cd:1,icon:'📳',atkMul:1.1,note:'频率共振：精准命中'},
  '细作':{cd:3,icon:'🪶',atkMul:1.0,itch:1,itchMax:5,note:'细纹磨人：我方麻痒+1/回合，满5失神'},
  '绒磨':{cd:3,icon:'🧶',atkMul:1.0,itch:1,itchMax:4,note:'细绒轻磨：我方麻痒+1/回合，满4失神'},
  '揉压':{cd:3,icon:'👐',atkMul:1.0,itch:2,itchMax:4,note:'和面揉压：我方麻痒+2/回合，满4失神'},
  '颤磨':{cd:3,icon:'💫',atkMul:1.0,itch:1,itchMax:4,note:'薄壁颤动：我方麻痒+1/回合，满4失神'},
  '渐润':{cd:2,icon:'🌧️',atkMul:1.0,lateAtkMul:1.3,note:'渐入佳境：第4回合起反击×1.3'},
  '悠长':{cd:2,icon:'⏳',atkMul:1.0,lateAtkMul:1.3,note:'慢热型：第3回合起反击×1.3'},
  '收放':{cd:1,icon:'🫧',atkMul:1.0,dodgeCount:2,note:'收放自如：每场2次闪避'},
  '湿滑':{cd:1,icon:'🛢️',atkMul:1.0,note:'水滑难攻：命中率下降'},
  '吟唱':{cd:1,icon:'🎤',atkMul:1.0,note:'呼吸带偏：节奏干扰'},
  '冰守':{cd:2,icon:'🧊',atkMul:0.9,defAdd:2,resistHeat:0.5,note:'冰守壁垒：减伤+2，热量翻倍效果减半'},
  '细检':{cd:2,icon:'🔍',atkMul:1.0,atkDownEvery:2,note:'细检游走：每2回合洞察我方破绽，攻击-1'},
  '雪沁':{cd:2,icon:'❄️',atkMul:0.9,defAdd:1,resistHeat:0.3,note:'雪沁凉意：减伤+1，热量翻倍对她×0.7'},
  '回温':{cd:3,icon:'♨️',atkMul:0.9,defAdd:2,note:'回温防线：减伤+2，缓一口气'},
  '霜凝':{cd:2,icon:'🌨️',atkMul:0.9,atkDown:1,note:'霜凝减速：我方攻击-1'},
  '初雪':{cd:2,icon:'🌬️',atkMul:0.9,defAdd:2,resistHeat:0.2,note:'初雪屏障：减伤+2'},
  '冻紧':{cd:2,icon:'🧊',atkMul:1.0,defAdd:2,note:'冻紧：减伤+2'},
  '回暖':{cd:3,icon:'🌤️',atkMul:1.0,defAdd:1,note:'回暖：减伤+1，稳住阵脚'},
  '猛火':{cd:1,icon:'🔥',atkMul:1.3,note:'猛火：反击×1.3'},
  '催旺':{cd:2,icon:'♨️',atkMul:1.1,playerCost:1,note:'催旺：我方体力-1'},
  '温存':{cd:2,icon:'🫂',atkMul:1.0,atkDown:1,note:'温存缠磨：我方攻击-1'},
  '焖熟':{cd:3,icon:'🍲',atkMul:1.2,note:'焖熟：反击×1.2'},
  '热涌':{cd:1,icon:'🌋',atkMul:1.2,note:'热涌：反击×1.2'},
  '蒸腾':{cd:2,icon:'💨',atkMul:1.0,playerCost:1,note:'蒸腾：我方体力-1'},
  '暖浸':{cd:2,icon:'🛁',atkMul:1.0,atkDown:1,note:'暖浸：我方攻击-1'},
  '漫浴':{cd:3,icon:'🚿',atkMul:1.2,note:'漫浴：反击×1.2'},
  '谐振':{cd:1,icon:'📳',atkMul:1.1,note:'谐振：频率共振，颗粒类对我伤害-15%'},
  '声波':{cd:2,icon:'📢',atkMul:1.0,atkDown:1,note:'声波干扰：我方攻击-1'},
  '回旋':{cd:2,icon:'🪩',atkMul:1.1,note:'回旋：反击增强'},
  '叠浪':{cd:3,icon:'🌊',atkMul:1.2,stunEvery:4,note:'叠浪：每4回合我方失神'},
  '错拍':{cd:2,icon:'🎼',atkMul:1.0,atkDownEvery:2,note:'错拍：每2回合我方攻击-1'},
  '合鸣':{cd:3,icon:'🎵',atkMul:1.2,note:'合鸣：反击×1.2'},
  '连颤':{cd:1,icon:'⚡',atkMul:1.1,note:'连颤：反击增强'},
  '递进':{cd:2,icon:'📈',atkMul:1.0,lateAtkMul:1.3,note:'递进：第3回合起反击×1.3'},
  '缓磨':{cd:1,icon:'⏳',atkMul:1.0,note:'缓磨：反击稳定'},
  '长卷':{cd:2,icon:'🧻',atkMul:1.0,defAdd:1,note:'长卷：减伤+1'},
  '节奏':{cd:2,icon:'🥁',atkMul:1.0,atkDownEvery:2,note:'节奏：每2回合我方攻击-1'},
  '泉涌':{cd:1,icon:'⛲',atkMul:1.2,note:'泉涌：反击×1.2'},
  '环锁':{cd:2,icon:'⭕',atkMul:1.0,defAdd:2,note:'环锁：减伤+2'},
  '深磨':{cd:1,icon:'🪨',atkMul:1.1,playerReduceDown:2,note:'深磨：我方减伤-2叠加'},
  '漫溢':{cd:1,icon:'🌊',atkMul:1.0,playerCost:1,note:'漫溢：我方体力-1'},
  '潮涌':{cd:2,icon:'🌊',atkMul:1.2,note:'潮涌：反击×1.2'},
  '枯磨':{cd:1,icon:'🏜️',atkMul:1.0,playerCost:2,note:'枯磨：我方体力-2'},
  '渴吸':{cd:1,icon:'🫙',atkMul:1.1,playerReduceDown:1,note:'渴吸：我方减伤-1'},
  '水柔':{cd:1,icon:'💧',atkMul:1.0,atkDown:1,note:'水柔：我方攻击-1'},
  '涵养':{cd:3,icon:'🫖',atkMul:0.9,defAdd:2,note:'涵养：减伤+2'},
  '轻触':{cd:2,icon:'🖐️',atkMul:1.0,itch:1,itchMax:5,note:'轻触：我方麻痒+1，满5失神'},
  '浅吟':{cd:2,icon:'😮💨',atkMul:1.0,atkDown:1,note:'浅吟：我方攻击-1'},
  '轻颤':{cd:2,icon:'🍃',atkMul:1.0,itch:1,itchMax:4,note:'轻颤：我方麻痒+1，满4失神'},
  '怕痒':{cd:3,icon:'🪶',atkMul:1.0,itch:2,itchMax:4,note:'怕痒：我方麻痒+2，满4失神'},
  '薄颤':{cd:2,icon:'🫨',atkMul:1.0,itch:1,itchMax:4,note:'薄颤：我方麻痒+1'},
  '畏碰':{cd:2,icon:'🙈',atkMul:1.0,atkDown:1,note:'畏碰：我方攻击-1'},
  '旋纳':{cd:2,icon:'🌀',atkMul:1.0,defAdd:1,note:'旋纳：减伤+1'},
  '裹缠':{cd:1,icon:'🫠',atkMul:1.1,note:'裹缠：反击增强'},
  '涡旋':{cd:2,icon:'🌪️',atkMul:1.0,itch:1,itchMax:5,note:'涡旋：我方麻痒+1'},
  '回卷':{cd:1,icon:'🔃',atkMul:1.2,note:'回卷：反击×1.2'},
  '深旋':{cd:2,icon:'🕳️',atkMul:1.0,defAdd:2,note:'深旋：减伤+2'},
  '缠吸':{cd:1,icon:'🐍',atkMul:1.1,note:'缠吸：反击增强'},
  '纵深':{cd:2,icon:'🕳️',atkMul:1.0,defAdd:2,note:'纵深：减伤+2'},
  '包容':{cd:1,icon:'🤗',atkMul:1.0,playerCost:1,note:'包容：我方体力-1'},
  '深吞':{cd:2,icon:'🦑',atkMul:1.0,defAdd:1,note:'深吞：减伤+1'},
  '容纳':{cd:1,icon:'🛋️',atkMul:1.0,playerCost:1,note:'容纳：我方体力-1'},
  '幽深':{cd:2,icon:'🌑',atkMul:1.0,defAdd:2,note:'幽深：减伤+2'},
  '紧纳':{cd:1,icon:'🤏',atkMul:1.1,playerReduceDown:1,note:'紧纳：我方减伤-1'},
  '潮动':{cd:3,icon:'🌊',atkMul:1.0,stunEvery:3,note:'潮动：每3回合我方定身'},
  '节律':{cd:2,icon:'🫀',atkMul:1.0,defAdd:1,note:'节律：减伤+1'},
  '韵律':{cd:2,icon:'💃',atkMul:1.0,atkDownEvery:2,note:'韵律：每2回合我方攻击-1'},
  '叠潮':{cd:3,icon:'🌊',atkMul:1.2,note:'叠潮：反击×1.2'},
  '节拍':{cd:2,icon:'🪇',atkMul:1.0,atkDown:1,note:'节拍：我方攻击-1'},
  '稳节':{cd:2,icon:'⏱️',atkMul:1.0,defAdd:2,note:'稳节：减伤+2'},
  '绷紧':{cd:2,icon:'🪢',atkMul:1.0,defAdd:2,note:'绷紧：减伤+2'},
  '韧锁':{cd:2,icon:'🔒',atkMul:1.1,note:'韧锁：反击增强'},
  '夹紧':{cd:1,icon:'🥢',atkMul:1.1,playerReduceDown:1,note:'夹紧：我方减伤-1'},
  '内压':{cd:2,icon:'⛓️',atkMul:1.2,note:'内压：反击×1.2'},
  '缠锁':{cd:2,icon:'🪢',atkMul:1.0,atkDown:1,note:'缠锁：我方攻击-1'},
  '紧绞':{cd:1,icon:'🌀',atkMul:1.2,note:'紧绞：反击×1.2'},
  '细理':{cd:2,icon:'🔬',atkMul:1.0,itch:1,itchMax:5,note:'细理：我方麻痒+1'},
  '密纹':{cd:2,icon:'〰️',atkMul:1.0,defAdd:1,note:'密纹：减伤+1'},
  '滑理':{cd:1,icon:'🧼',atkMul:1.0,dodgeCount:1,note:'滑理：每场1次闪避'},
  '密合':{cd:2,icon:'🧩',atkMul:1.0,defAdd:2,note:'密合：减伤+2'},
  '曲绕':{cd:2,icon:'🪭',atkMul:1.0,atkDown:1,note:'曲绕：我方攻击-1'},
  '盘缠':{cd:2,icon:'🌿',atkMul:1.0,defAdd:1,note:'盘缠：减伤+1'},
  '连吸':{cd:1,icon:'🫦',atkMul:1.2,note:'连吸：反击×1.2'},
  '缠嘬':{cd:2,icon:'🍼',atkMul:1.0,playerCost:1,note:'缠嘬：我方体力-1'},
  '绒吸':{cd:1,icon:'🐻',atkMul:1.1,playerReduceDown:1,note:'绒吸：我方减伤-1'},
  '缠软':{cd:2,icon:'🍮',atkMul:1.0,defAdd:2,note:'缠软：减伤+2'},
  '蠕动':{cd:1,icon:'🐛',atkMul:1.2,note:'蠕动：反击×1.2'},
  '活纳':{cd:2,icon:'🫧',atkMul:1.0,defAdd:1,note:'活纳：减伤+1'}
};

/* 她的恢复技能表（38 人独有恢复技能 → 差异化回复/效果） */
var HER_HEALS={
  '静息':{heal:7,extra:'清除自身失神'},
  '息澜':{heal:8,extra:'热量翻倍对她×0.7'},
  '温元':{heal:6,extra:'减伤+1（1回合）'},
  '养炉':{heal:6,extra:'我方体力-1'},
  '缓气':{heal:7,extra:'反击+1'},
  '生津':{heal:8,extra:'我方攻击-1'},
  '归元':{heal:9,extra:'清除自身失神'},
  '调律':{heal:7,extra:'我方频率类伤害-10%'},
  '稳弦':{heal:8,extra:'减伤+1'},
  '定拍':{heal:6,extra:'我方攻击-1'},
  '蓄力':{heal:8,extra:'反击+1'},
  '养气':{heal:7,extra:'清除自身失神'},
  '调息':{heal:6,extra:'我方体力-1'},
  '定神':{heal:8,extra:'减伤+2'},
  '润喉':{heal:6,extra:'我方攻击-1'},
  '盈润':{heal:7,extra:'反击+1'},
  '安抚':{heal:8,extra:'清除自身失神'},
  '缓神':{heal:7,extra:'我方暴击-10%'},
  '稳心':{heal:7,extra:'我方暴击-10%'},
  '稳息':{heal:8,extra:'减伤+1'},
  '宁神':{heal:7,extra:'清除自身失神'},
  '定心':{heal:9,extra:'减伤+1'},
  '蓄养':{heal:8,extra:'我方体力-1'},
  '缓行':{heal:7,extra:'反击+1'},
  '安定':{heal:8,extra:'减伤+2'},
  '润泽':{heal:7,extra:'我方攻击-1'},
  '缓潮':{heal:6,extra:'我方频率类伤害-10%'},
  '调潮':{heal:8,extra:'反击+1'},
  '缓节':{heal:7,extra:'我方攻击-1'},
  '松弦':{heal:8,extra:'清除自身失神'},
  '缓压':{heal:7,extra:'减伤+1'},
  '松劲':{heal:8,extra:'反击+1'},
  '抚平':{heal:7,extra:'清除自身失神'},
  '顺气':{heal:6,extra:'我方体力-1'},
  '舒展':{heal:8,extra:'减伤+1'},
  '缓吸':{heal:7,extra:'反击+1'},
  '安缠':{heal:6,extra:'我方攻击-1'},
  '养神':{heal:9,extra:'减伤+2'}
};
/* 防守值上限随等级成长：基础 + 主技能等级×2 —— 等级越高越能扛（经验老到） */
function herDefCap(c){
  /* 防守值上限 = 身份基础 + 名器防御×2 + 主技能等级×4
     身份基础：学生52（青涩易攻破）/ 老师60 / 陪读妈妈66（熟女身经百战，最能扛）
     名器×2：天赋加成；等级×4：经验老到，等级越高越耐战（Lv1→+4，Lv10→+40，Lv20→+80）
     主角防守值上限≈96（体力×1.2），学生好打、妈妈/老师难缠，有来有回 */
  var id=String(obj(c).身份||'');
  var base=52;
  if(id.indexOf('老师')>=0||id.indexOf('班主任')>=0)base=60;
  else if(id.indexOf('陪读妈妈')>=0||id.indexOf('母亲')>=0)base=66;
  var nd=num(c.名器防御,6);
  var lv=num(obj(obj(c.技能)).等级,1)||1;
  return base+Math.round(nd*2)+lv*4;
}
/* 她能力值有效值：基础 + 主技能等级÷4（等级高=经验老到，身经百战） */
function herAbility(c,key,base){
  var lv=num(obj(obj(c.技能)).等级,1)||1;
  return num(base,4)+Math.floor(lv/4);
}
/* 名器防御有效值：基础 + 主技能等级÷4（名器随等级更坚/更敏感） */
function herDefVal(c){return num(c.名器防御,6)+Math.floor((num(obj(obj(c.技能)).等级,1)||1)/4)}
/* 熟练系数：按她的主技能等级（经验老到程度）修正道具威力，等级越高同一道具效果越强 */
function herProficiency(c){
  var lv=num(obj(obj(c.技能)).等级,1)||1;
  return 1+(lv-1)*0.05;
}
/* 技能等级成长：每级 atkMul +6%，每2级 defAdd +1；减益类(atkDown/playerCost)每级 +10%（取整）—— 熟女/极端癖好初始等级高，反击与压制更狠（经验老到） */
/* ===== 等级与经验数值体系 ===== */
var LV_MAX=20;
function expToNext(lv){lv=Math.max(1,num(lv,1)||1);return 100+(lv-1)*50}
/* 经验入账并结算升级：支持连升多级，满级 50 封顶（溢出不回退） */
function gainExp(lv,exp,amt){
  var l=Math.max(1,num(lv,1)||1),e=num(exp,0)+(amt||0);
  while(l<LV_MAX&&e>=expToNext(l)){e-=expToNext(l);l++}
  if(l>=LV_MAX)e=Math.min(e,expToNext(LV_MAX)-1);
  return {等级:l,经验:e};
}
/* 技能使用单次经验：基础15 + 当前等级×3（用高等级技能涨更多） */
function skillUseExp(lv){return 15+num(lv,1)*3}
/* 等级属性成长：每级+6%攻/+0.5%暴击/+0.3%闪避（身经百战） */
function lvMul(lv){return 1+(Math.max(1,num(lv,1)||1)-1)*0.06}
function lvCrit(lv){return Math.min(30,(Math.max(1,num(lv,1)||1)-1)*0.5)}
function lvEvade(lv){return Math.min(20,(Math.max(1,num(lv,1)||1)-1)*0.3)}
/* ===== 等级与经验数值体系 END ===== */
function herSkillWithLv(hs,lv){
  if(!hs||typeof hs!=='object')return hs;
  var lv2=Math.max(1,num(lv,1)||1);
  var g=1+(lv2-1)*0.1;
  var out={};
  for(var hk in hs)out[hk]=hs[hk];
  out.atkMul=Math.round(num(hs.atkMul,1.0)*(1+(lv2-1)*0.06)*100)/100;
  if(hs.defAdd)out.defAdd=num(hs.defAdd,0)+Math.floor((lv2-1)/2);
  if(hs.atkDown)out.atkDown=Math.max(1,Math.round(num(hs.atkDown,0)*g));
  if(hs.atkDownEvery)out.atkDownEvery=Math.max(1,Math.round(num(hs.atkDownEvery,0)*g));
  if(hs.lateAtkDown)out.lateAtkDown=Math.max(1,Math.round(num(hs.lateAtkDown,0)*g));
  if(hs.playerCost)out.playerCost=Math.max(1,Math.round(num(hs.playerCost,0)*g));
  return out;
}
function getHerSkill(c){
  var name=String((obj(c.技能)).名||'');
  var s=HER_SKILLS[name];
  if(!s){var _fa=num(obj(obj(c.能力值)).反攻,4)||4;return{atkMul:1.0+_fa*0.03,defAdd:0,note:'专长反击(反攻'+_fa+')'}}
  return herSkillWithLv(s,obj(obj(c.技能)).等级);
}

/* 她的技能池：主技能 + 技能组（辅技能），按局势选技能 */
function herSkillPool(c){
  var pool=[];
  var main=String(obj(c.技能).名||'');
  if(main)pool.push(main);
  var group=obj(obj(c.技能).技能组);
  for(var k in group){if(num(group[k].等级,1)>=1)pool.push(k)}
  return pool;
}
function chooseHerSkill(c,ctx){
  var pool=herSkillPool(c).filter(function(n){return HER_SKILLS[n]}); // 只选已登记技能,绝不使用未登记/占位技能
  if(!pool.length)return'';
  // 排除冷却中的技能
  var avail=pool.filter(function(n){return num(State.herSkillCd[n],0)<=0});
  if(!avail.length)avail=pool.slice(0,1); // 全冷却则用第一个（主技能保底）
  // 主技能优先：控制/招牌技保留
  var main=String(obj(c.技能).名||'');
  var mainHs=getHerSkill(c);
  // 1) 低血量 → 技能组里的防御技（defAdd>0）优先
  if(ctx.herHpPct<=0.5){
    for(var i=0;i<avail.length;i++){
      var s=HER_SKILLS[avail[i]];
      if(s&&num(s.defAdd,0)>0&&avail[i]!==main)return avail[i];
    }
  }
  // 2) 玩家蓄力（攻击强化/高勃起）→ 技能组里的控制技（stunEvery/itch）优先
  if(ctx.playerAggro){
    for(var j=0;j<avail.length;j++){
      var s2=HER_SKILLS[avail[j]];
      if(s2&&(num(s2.stunEvery,0)>0||num(s2.itch,0)>0)&&avail[j]!==main)return avail[j];
    }
  }
  // 3) 玩家低体力 → 技能组里的消耗技（playerCost）优先
  if(ctx.myHpPct<=0.4){
    for(var k=0;k<avail.length;k++){
      var s3=HER_SKILLS[avail[k]];
      if(s3&&num(s3.playerCost,0)>0&&avail[k]!==main)return avail[k];
    }
  }
  // 4) 默认主技能（若在冷却则用第一个可用）
  if(avail.indexOf(main)>=0)return main;
  return avail[0];
}

/* 她方道具机制表（她道具栏里的道具 → 回合效果） */
var HER_ITEMS={
  润滑液:{icon:'💧',type:'def',desc:'她减伤+2（1回合）',buff:{name:'道具减伤',rounds:1,val:2},note:'她使用了润滑液，防线滑润'},
  冰袋:{icon:'🧊',type:'def',desc:'她减伤+2（2回合）',buff:{name:'冰袋',rounds:2,val:2},note:'她使用了冰袋，清凉加固防线'},
  震动环:{icon:'📳',type:'atk',desc:'她反击+2（2回合）',buff:{name:'震动环',rounds:2,val:2},note:'她使用了震动环，反击增强'},
  薄荷油:{icon:'🌱',type:'atk',desc:'你勃起度-20',atk:{勃起:-20},note:'她使用了薄荷油，你的欲望冷却'},
  辣椒油:{icon:'🌶️',type:'atk',desc:'你麻痒+2',atk:{麻痒:2},note:'她用了辣椒油！灼辣反噬你'},
  清凉油:{icon:'🧴',type:'heal',desc:'她清除失神',heal:1,note:'她使用了清凉油，恢复清醒'}
};
function getHerItem(name){
  return HER_ITEMS[name]||null;
}

/* 状态修正（固定折算） */
function stateBonus(p){
  var b=0;
  var tili=num(p.体力,0);if(tili>60)b+=2;else if(tili>=40)b+=1;
  var xingyu=num(p.性欲,0);if(xingyu>60)b+=2;else if(xingyu>=40)b+=1;
  if(num(p.勃起度,0)>60)b+=1;
  return b;
}

var State={data:{},loading:true,selSkills:[],selItem:'',selTarget:'',actionText:'',log:[],finished:false,resultText:'',healCd:{提肛:0,思维分散:0},herHealCount:0,herHealCd:0,herItemUsed:0,stats:null,herSkillCd:{},playerSkillCd:{},flavorOn:true,flavorBusy:false,apiPanelOpen:false,apiMode:'preset',apiPreset:'',apiUrl:'',apiKey:'',apiModel:'',apiTemp:'same_as_preset',apiMaxTokens:'same_as_preset',proxyNames:[],modelList:[]};

/* 主题切换(dark/glass/light,localStorage 持久化) */
function ydsApplyTheme(t){
  if(!t)t='dark';
  var host=ydsFindRoot();
  if(host)host.setAttribute('data-theme',t);
  try{localStorage.setItem('yds_theme',t)}catch(e){}
  if(typeof State!=='undefined')State.theme=t;
}
function ydsInitTheme(){var t='dark';try{t=localStorage.getItem('yds_theme')||'dark'}catch(e){}ydsApplyTheme(t)}
function ydsFindRoot(){
  var host=null;
  if(typeof CURRENT!=='undefined'&&CURRENT&&CURRENT.shadow){try{host=CURRENT.shadow.getElementById('bu-root')}catch(e){}}
  if(!host){try{host=document.querySelector('.battleui')||document.getElementById('bu-root')}catch(e){}}
  return host;
}
var YDS_THEMES=['dark','glass','light','contrast','pink','blue','gold'];
var YDS_BGS=['static','aurora','rainbow'];
function ydsCurTheme(){
  var host=ydsFindRoot();
  var cur=host?host.getAttribute('data-theme'):null;
  if(YDS_THEMES.indexOf(cur)<0)cur='dark';
  return cur}
function ydsToggleTheme(){var cur=ydsCurTheme();var idx=YDS_THEMES.indexOf(cur);var next=YDS_THEMES[(idx+1)%YDS_THEMES.length];ydsApplyTheme(next);if(typeof render==='function')render()}
function ydsGetBg(){var b='static';try{b=localStorage.getItem('yds_bg')||'static'}catch(e){}return b}
function ydsApplyBg(b){
  try{localStorage.setItem('yds_bg',b)}catch(e){}
  var host=ydsFindRoot();
  if(host)host.setAttribute('data-bg',b);
}
function ydsCurBg(){
  var host=ydsFindRoot();
  var cur=host?host.getAttribute('data-bg'):null;
  if(YDS_BGS.indexOf(cur)<0)cur='static';
  return cur;
}
function ydsToggleBg(){var cur=ydsCurBg();var idx=YDS_BGS.indexOf(cur);var next=YDS_BGS[(idx+1)%YDS_BGS.length];ydsApplyBg(next);if(typeof render==='function')render()}
function ydsBgLabel(){var m={static:'静态',aurora:'极光',rainbow:'彩虹'};return m[ydsCurBg()]||'静态'}
function ydsThemeLabel(){var cur=ydsCurTheme?ydsCurTheme():'dark';var map={dark:'深色',light:'浅色',glass:'磨砂',contrast:'强对比',pink:'粉色',blue:'蓝色',gold:'金色'};return map[cur]||'深色'}
function ydsPeriodDebuff(c){
  var pcv=obj(c.生理周期)||{};
  var st=pcv.月经状态||'';
  var pday=num(pcv.月经日,1);
  if(st==='经期'||pday<=5){if(pday<=3)return{pf:-2,atkMul:0.8,label:'经期虚弱(1~3天)'};return{pf:-1,atkMul:0.9,label:'经期(4~5天)'}}
  if(st==='排卵期'||(pday>=12&&pday<=16))return{pf:-2,atkMul:1.15,label:'排卵期·敏感涌动'}
  if(st==='黄体期'||pday>=17)return{pf:1,atkMul:1,label:'黄体期·积压期'}
  return{pf:0,atkMul:1,label:'卵泡期·稳定'}
}

try{ydsInitTheme()}catch(e){try{console.error('theme',e)}catch(_e2){}}
function newStats(){
  return{mySkills:{},myItems:{},myHeals:{},herSkills:{},herItems:{},herHeals:{},myTotalDmg:0,herTotalDmg:0,myTotalHeal:0,herTotalHeal:0,myBuffUse:[],herBuffUse:[]};
}
function countStat(statsObj,key,val){statsObj[key]=num(statsObj[key],0)+num(val,1)}
function S(){return State.data}

/* 初始化/读取战斗状态 */
function battleState(){
  var d=S();var pb=obj(obj(d.排班).战斗);
  return pb;
}
function initBattleIfNeeded(){
  var d=S();var st=obj(d.排班).战斗状态;
  if(st!=='进行中')return;
  var pb=battleState();
  var tl0=pb.目标列表;
  if(tl0&&tl0.length>1){initMultiIfNeeded();return}
  var tgt=obj(d.排班).当前战斗目标;
  var c=obj((d.女性角色||{})[tgt]);
  var rounds=num(pb.回合,0);
  // 新战斗判定：回合=0（首战）或 主角防守值<=0（上一场战败残留/战斗结束未重置）→ 重新初始化
  if((rounds===0||num(pb.主角防守值,0)<=0)&&c){
    // 初始化：主角防守值=体力×1.2；她=档案上限
    var pDef=Math.round(num(obj(d.玩家).体力,80)*1.2);
    var herCap=herDefCap(c);
    pb.回合=0;
    pb.主角防守值=pDef;pb.主角防守值上限=pDef;
    pb.她防守值=herCap;pb.她防守值上限=herCap;
    pb.麻痒点=0;pb.主角麻痒点=0;pb.她减伤修正=0;pb.本场经验={};
    State.log=[];
    // 立即写回，防止刷新丢失
    persistBattle(pb,null,null);
  }
}

/* 渲染 */
function renderBattleMulti(d,p,pb,targets){
  targets=normTargets(targets,d);
  var pDef=num(pb.主角防守值,96),pMax=num(pb.主角防守值上限,96);
  var selT=State.selTarget||'';
  // 群体技能（次数翻倍）默认覆盖所有存活目标 → 全员显示选中态
  var isAoe=State.selSkills.indexOf('次数翻倍')>=0;
  var html='<div class="battle-grid-multi">';
  for(var i=0;i<targets.length;i++){
    var t=targets[i];
    var c=obj((d.女性角色||{})[t.名]);
    var hDef=num(t.防守值,0),hMax=herDefCap(c);
    var dead=hDef<=0;
    var isSel=isAoe?(!dead):(selT===t.名);
    var ability=obj(c.能力值);
    var _iks=Object.keys(obj(c.道具栏));
    html+='<div class="battle'+(dead?' yds-dead':'')+(isSel?' battle-sel':'')+'" data-act="choose-target" data-tgt="'+esc(t.名)+'" title="点击选为攻击目标">'
      +'<div class="battle-head"><span class="battle-name">'+esc(t.名)+'</span>'
      +'<span class="battle-tag">名器 '+esc(c.名器||'—')+'</span>'
      +'<span class="battle-tag">'+esc(stageText(c.缴械值))+'</span>'
      +(dead?'<span class="battle-tag" style="color:var(--c-danger)">已溃败</span>':'')
      +'</div>'
      +'<div class="hp-row"><span class="hp-label">防守值</span><div class="hp-track"><div class="hp-fill" style="width:'+pct(hDef,hMax)+'%;background:'+hpColor(hMax-hDef)+'"></div></div><span class="hp-num">'+Math.max(0,Math.round(hDef))+'/'+hMax+'</span></div>'
      +'<div class="battle-grid">'
      +'<span>缴械 <b style="color:var(--c-accent)">'+esc(c.缴械值||0)+'</b>/100</span>'
      +'<span>技能 <b style="color:var(--c-gold)">'+esc(obj(c.技能).名||'—')+'</b></span>'
      +'<span>名器防御 <b style="color:var(--c-info)">'+num(c.名器防御,6)+'</b></span>'
      +'</div>'
      +(dead?'':'<div class="battle-yes" style="text-align:center;font-size:11px;color:'+(isSel?'var(--c-gold)':'var(--c-dim2)')+'">'+(isAoe?'👥 群体技能·覆盖所有存活目标':(isSel?'🎯 本回合攻击目标（已选中）':'点击选中为攻击目标'))+'</div>')
      +'<div class="yds-detail-bar" style="text-align:center"><button class="yds-detail-btn" data-act="her-detail" data-tgt="'+esc(t.名)+'">📋 详情</button></div>'
      +'<div class="yds-her-detail" id="yds-detail-'+esc(t.名)+'">'
      +'<div class="battle-grid">'
      +'<span>身份 '+esc(c.身份||'—')+'</span>'
      +'<span>能力 忍'+num(ability.忍耐,0)+' 持'+num(ability.持久,0)+' 攻'+num(ability.反攻,0)+'</span>'
      +'<span>欲望积压 <b style="color:var(--c-danger)">'+num(c.欲望积压,0)+'</b></span>'
      +'<span>生理 '+(c.生理周期?('经期第'+num(c.生理周期.月经日,1)+'天'+(c.生理周期.排卵日===num(c.生理周期.月经日,1)?'⚠排卵':'')+(c.生理周期.怀孕?'🤰孕'+num(c.生理周期.怀孕周数,0)+'周':'')):'—')+'</span>'
      +'<span>道具 '+( _iks.length?_iks.join('、'):'无')+'</span>'
      +'</div></div>'
      +'</div>';
  }
  html+='</div>';
  html+='<div class="battle"><div class="battle-head"><span class="battle-name">👤 你（同时对抗'+targets.length+'人）</span></div>'
    +'<div class="hp-row"><span class="hp-label">主角防守值</span><div class="hp-track"><div class="hp-fill" style="width:'+pct(pDef,pMax)+'%;background:'+hpColor(pDef)+'"></div></div><span class="hp-num">'+Math.max(0,Math.round(pDef))+'/'+pMax+'</span></div>'
    +'<div class="battle-tip" style="margin-top:6px">🎯 点击目标卡选中攻击对象（金框=选中）：发起本回合你只攻击她一人，其余在场者每人依次对你进攻。📋 详情可展开看身份/能力/生理/道具。没点目标默认攻击第一个存活者。</div></div>';
  return html;
}

function renderBattle(){
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  if(!tgt)return '';
  var p=obj(d.玩家);
  var pb=battleState();
  var st=obj(d.排班).战斗状态;
  var pDef=num(pb.主角防守值,96),pMax=num(pb.主角防守值上限,96);
  var rounds=num(pb.回合,0);
  var isMulti=isMultiBattle()||tgt==='多人';
  var targets=isMulti?(Array.isArray(pb.目标列表)&&pb.目标列表.length?pb.目标列表.slice():[]):[tgt];
  if(!targets.length)return '';
  if(isMulti){return renderBattleMulti(d,p,pb,targets)}
  var pPhysio=obj(obj(d.玩家).生理);
  var ejCd=num(pPhysio.射精冷却剩余,0),ejCnt=num(pPhysio.今日射精次数,0);
  var refractory=ejCd>0?(ejCd>=3?0.6:(ejCd===2?0.75:0.9)):1;
  var sexCap=p.性欲<20?'（性欲不足，无法勃起）':(p.性欲<40?'（勉强）':'');
  var html='<div class="physio-strip">'
    +'<span class="ps-item">💧 你：性欲'+num(p.性欲,0)+' 勃起'+num(p.勃起度,0)+'<span style="color:var(--c-dim)">'+sexCap+'</span></span>'
    +(ejCd>0?'<span class="ps-item" style="color:var(--c-warn)">🔒 不应期(射精后遗)：剩'+ejCd+'回合，伤害×'+(ejCd>=3?'0.6':(ejCd===2?'0.75':'0.9'))+'</span>':'<span class="ps-item">💦 今日射精 '+ejCnt+' 次（自然限制，体力/性欲见底则无法再射）</span>')
    +(isMulti&&targets.length>1?'<span class="ps-item" style="color:var(--c-danger)">⚔ 多人对抗 '+targets.length+' 人（全体受击、反击叠加）</span>':'')
    +'</div>';
  for(var _ti=0;_ti<targets.length;_ti++){
    var _t=targets[_ti];
    var c=obj((d.女性角色||{})[_t]);
    var ability=obj(c.能力值),skill=obj(c.技能);
    var herDef=herDefVal(c);
    var fan=herAbility(c,'反攻',ability.反攻);
    var _hsAtk=herSkillWithLv(HER_SKILLS[obj(obj(c.技能)).名]||{atkMul:1.0},num(obj(obj(c.技能)).等级,1));
    var herAtk=Math.round((fan*1.5+herDef/2)*_hsAtk.atkMul);
    var jya=num(c.欲望积压,0);
    var yzFix=jya>=80?-4:(jya>=60?-2:0);
    var _pdb=ydsPeriodDebuff(c);yzFix+=_pdb.pf;
    var chi=herAbility(c,'持久',ability.持久);
    var herReduce=Math.round(herDef+chi/3+yzFix+Math.floor((num(obj(obj(c.技能)).等级,1)||1)/3));
    var hDef,hMax;
    if(isMulti){
      hMax=herDefCap(c);
      hDef=num(pb.目标防守值&&pb.目标防守值[_t],hMax);
    }else{
      hDef=num(pb.她防守值,44);hMax=num(pb.她防守值上限,44);
    }
    var pc=obj(c.生理周期);
    var mDay=num(pc.月经日,1),mState=pc.月经状态||'—',preg=pc.怀孕===true;
    var _pds2=ydsPeriodDebuff(c);
    html+='<div class="battle">'
      +'<div class="battle-head"><span class="battle-name">'+esc(c.身份||'')+' · '+esc(_t)+'</span>'
      +(!isMulti?'<span class="battle-tag" style="background:rgba(217,164,65,.15);color:var(--c-gold)">🎯 本回合目标（单人固定，直接发起本回合）</span>':'')
      +'<span class="battle-tag">'+esc(stageText(c.缴械值))+'</span>'
      +(c.是否俘虏?'<span class="battle-tag">俘虏</span>':'')
      +'<span class="battle-tag">名器 '+esc(c.名器||'—')+'</span>'
      +'</div>'
      +'<div class="hp-row"><span class="hp-label">'+esc(_t)+'防守值</span><div class="hp-track"><div class="hp-fill'+(hDef<=15?' hp-low':'')+'" style="width:'+pct(hDef,hMax)+'%;background:'+hpColor(hDef)+'"></div></div><span class="hp-num">'+Math.max(0,Math.round(hDef))+'/'+hMax+'</span></div>'
      +(_ti===0?'<div class="hp-row" style="margin-top:6px"><span class="hp-label">主角防守值</span><div class="hp-track"><div class="hp-fill'+(pDef<=15?' hp-low':'')+'" style="width:'+pct(pDef,pMax)+'%;background:'+hpColor(pDef)+'"></div></div><span class="hp-num">'+Math.max(0,Math.round(pDef))+'/'+pMax+'</span></div>':'')
      +renderBuffs(pb)
      +'<div class="battle-grid">'
      +'<span>缴械值 <b style="color:'+jxColor(num(c.缴械值,0))+'">'+esc(c.缴械值||0)+'</b>/100</span>'
      +'<span>欲望积压 <b style="color:'+(jya>=100?'#c96ae0':(jya>=80?'var(--c-danger)':(jya>=60?'#ff9a3c':'var(--c-text)')))+'">'+esc(jya)+'</b>'+(jya>=100?' ⚠️决堤':(yzFix!==0?'(易缴械'+yzFix+')':''))+'</span>'
      +(num(pb.麻痒点,0)>0?'<span>麻痒点 <b style="color:var(--c-powder)">'+esc(pb.麻痒点)+'</b></span>':'')
      +(refractory<1?'<span class="battle-tag" style="background:rgba(224,180,92,.15);color:var(--c-warn)">不应期 伤害×'+refractory+'</span>':'')
      +'<span>🌸 '+esc(mState)+' 经期第'+mDay+'天'+(_pds2.pf<0?' [减伤'+_pds2.pf+']':(_pds2.pf>0?' [减伤+'+_pds2.pf+']':''))+(mDay===num(pc.排卵日,14)?'（排卵日⚠️）':'')+'</span>'
      +(preg?'<span style="color:var(--c-danger)">🤰 孕'+num(pc.怀孕周数,0)+'周</span>':'')
      +'</div>'
      +(isMulti?'<div class="yds-detail-bar"><button class="yds-detail-btn" data-act="her-detail" data-tgt="'+_t+'">📋 查看详情（技能/道具/生理）</button></div>':'')
      +'<div class="yds-her-detail'+(isMulti?'':' yds-open')+'" id="yds-detail-'+_t+'">'
      +'<div class="hero-card">'
      +'<div class="hc-title">👤 '+esc(_t)+' · 战斗属性</div>'
      +'<div class="hc-stat">'
      +'<div class="hs-item"><span class="k">名器防御</span><span class="v def">'+herDef+'</span></div>'
      +'<div class="hs-item"><span class="k">每回合减伤</span><span class="v def">'+herReduce+'</span></div>'
      +'<div class="hs-item"><span class="k">反击伤害</span><span class="v atk">'+herAtk+'</span></div>'
      +'<div class="hs-item"><span class="k">忍耐/持久/反攻</span><span class="v">'+num(ability.忍耐,0)+'/'+num(ability.持久,0)+'/'+num(ability.反攻,0)+'</span></div>'
      +'</div></div>'
      +renderHerPanel(c)
      +(c.心声?'<div class="voice-box"><span class="vl">💭 她此刻的想法</span>'+esc(c.心声)+'</div>':'')
      +'</div>'
      +'</div>';
  }
  return html;
}
function herSkillDesc(c){
  var name=String(c.技能&&c.技能.名||'');var a=obj(c.能力值);
  var fan=herAbility(c,'反攻',a.反攻),def=herDefVal(c);
  var hs=getHerSkill(c);
  return '反击伤害='+Math.round((fan*1.5+def/2)*num(hs.atkMul,1.0))+'（反攻'+fan+'×1.5+名器防御'+def+'÷2'+(num(hs.atkMul,1.0)!==1?('×'+hs.atkMul):'')+'）'+(hs.note?'｜'+hs.note:'');
}

/* 她的信息区：技能卡（含技能组）/道具栏/恢复技能（跟男方对齐） */
function renderHerPanel(c){
  var html='';
  var skill=obj(c.技能);
  var a=obj(c.能力值);
  var fan=herAbility(c,'反攻',a.反攻),def=herDefVal(c);
  var skillIcon=hsIcon(skill.名);
  // 全部技能卡：主技能 + 技能组
  var allSkills=[{name:skill.名,lv:num(skill.等级,1),exp:num(skill.经验,0)}];
  var group=obj(skill.技能组);
  for(var gk in group){allSkills.push({name:gk,lv:num(group[gk].等级,1),exp:num(group[gk].经验,0)})}
  html+='<div class="hp-title">👤 '+esc(c.身份||'')+' · 她的战术面板（AI 自动决策）</div>'
    +'<div class="her-skill-grid">';
  for(var i=0;i<allSkills.length;i++){
    var sk=allSkills[i];
    var hs2=HER_SKILLS[sk.name]||{atkMul:1.0,defAdd:0,note:sk.name};
    var atk=Math.round((fan*1.5+def/2)*num(herSkillWithLv(hs2,sk.lv).atkMul,1.0));
    var tag=i===0?'主':'辅'+(i);
    var skCd=num(State.herSkillCd[sk.name],0);
    html+='<div class="her-skill-card'+(skCd>0?' off':'')+'">'
      +'<div class="hsc-top"><span class="hsc-icon">'+hsIcon(sk.name)+'</span><span class="hsc-name">'+esc(sk.name)+'</span><span class="hsc-lv">'+tag+' Lv'+esc(sk.lv)+'</span></div>'
      +'<div class="hsc-dmg">反击 '+atk+(skCd>0?'<span style="color:var(--c-warn)"> ｜ 冷却'+skCd+'回合</span>':'')+'</div>'
      +'<div class="hsc-eff">'+esc(skillEffDesc(sk.name))+'</div>'
      +'</div>';
  }
  html+='</div>';
  // 恢复技能（如果有）
  var heal=obj(c.恢复技能);
  if(heal.名){
    html+='<div class="hp-title" style="margin-top:4px">💚 她的恢复技能</div><div class="her-heal-card">'
      +'<div class="hh-name">'+esc(heal.名)+' <b>Lv'+esc(heal.等级||1)+'</b><span class="hh-exp">经验 '+esc(heal.经验||0)+'/100</span></div>'
      +'<div class="hh-eff">防守值&lt;35% 自动触发：回复防守值+'+(HER_HEALS[heal.名]||{heal:6}).heal+'，'+((HER_HEALS[heal.名]||{extra:'本回合不反击'}).extra)+'·本回合不反击</div>'
      +'<div class="hh-cd">冷却 3 回合 · 本场已触发 '+num(State.herHealCount,0)+'/2 次</div>'
      +'</div>';
  }
  // 道具栏（如果有）
  var items=obj(c.道具栏);
  var ik=Object.keys(items).filter(function(k){return num(items[k],0)>0});
  if(ik.length){
    html+='<div class="hp-title" style="margin-top:4px">🎒 她的道具栏</div><div class="her-item-mini">';
    for(var j=0;j<ik.length;j++){
      var hi=getHerItem(ik[j]);
      html+='<span class="him">'+(hi?hi.icon:'')+' '+esc(ik[j])+' ×<b>'+num(items[ik[j]],0)+'</b></span>';
    }
    html+='</div>';
  }
  return html;
}
function hsIcon(name){
  var s=HER_SKILLS[name];
  return s&&s.icon?s.icon:'⚔';
}
function skillEffDesc(name){
  var s=HER_SKILLS[name];
  return s?s.note||name:name;
}

/* BUFF/DEBUFF 徽章渲染 */
function renderBuffs(pb){
  var html='';
  var pbuffs=obj(pb.主角BUFF),hbuffs=obj(pb.她BUFF);
  var pKeys=Object.keys(pbuffs),hKeys=Object.keys(hbuffs);
  if(!pKeys.length&&!hKeys.length)return '';
  if(pKeys.length){
    html+='<div class="buff-row"><span style="font-size:10px;color:var(--c-dim2)">你：</span>';
    for(var i=0;i<pKeys.length;i++){
      var b=obj(pbuffs[pKeys[i]]);
      var isBuf=num(b.效果值,0)>=0;
      html+='<span class="buff-tag '+(isBuf?'buff':'debuff')+'">'+esc(pKeys[i])+' '+(num(b.效果值,0)>0?'+'+b.效果值:b.效果值)+' <span class="bt-round">'+(b.剩余回合>0?b.剩余回合+'回合':'')+'</span></span>';
    }
    html+='</div>';
  }
  if(hKeys.length){
    html+='<div class="buff-row"><span style="font-size:10px;color:var(--c-dim2)">她：</span>';
    for(var j=0;j<hKeys.length;j++){
      var bh=obj(hbuffs[hKeys[j]]);
      var isBuf2=num(bh.效果值,0)>=0;
      html+='<span class="buff-tag '+(isBuf2?'buff':'debuff')+'">'+esc(hKeys[j])+' '+(num(bh.效果值,0)>0?'+'+bh.效果值:bh.效果值)+' <span class="bt-round">'+(bh.剩余回合>0?bh.剩余回合+'回合':'')+'</span></span>';
    }
    html+='</div>';
  }
  return html;
}

/* 技能选择区（RPG 技能卡片） */
function renderSkillSel(){
  var d=S();var sk=obj(obj(d.玩家).技能);
  var keys=Object.keys(sk);
  var herName=obj(d.排班).当前战斗目标||'';
  var herC=obj((d.女性角色||{})[herName]);
  var html='<div class="skill-sel">';
  for(var i=0;i<keys.length;i++){
    var k=keys[i];var v=obj(sk[k]);
    var lv=num(v.等级,1);
    var exp=num(v.经验,0);
    var dmg=skillDmg(k,lv);
    // 热量翻倍寒系×2 显示
    var shownDmg=dmg;
    if(k==='热量翻倍'&&/雪窦|寒玉|雪润|冰守/.test(herC.名器||''))shownDmg=dmg*2;
    if(k==='敏感度加倍'&&(State.selSkills.indexOf('螺旋')>=0||State.selSkills.indexOf('热量翻倍')>=0))shownDmg=dmg*2;
    var s=SKILLS[k];
    var sel=State.selSkills.indexOf(k)>=0;
    var cd=num(State.playerSkillCd[k],0);
    var onCd=cd>0;
    // 每回合最多1个技能，且与道具互斥（选了道具则技能全禁）
    var itemSel=!!State.selItem;
    var dis=onCd||itemSel||(!sel&&State.selSkills.length>=1);
    html+='<div class="skill-card'+(sel?' sel':'')+(dis?' off':'')+'" data-act="toggle-skill" data-skill="'+esc(k)+'">'
      +'<span class="sc-check">✓</span>'
      +'<div class="sc-top"><span class="sc-icon">'+(s?s.icon:'')+'</span><span class="sc-name">'+esc(k)+'</span>'+(k==='次数翻倍'?'<span class="battle-tag" style="background:rgba(89,201,141,.18);color:var(--c-success)">👥群体</span>':(k==='提肛'||k==='思维分散')?'<span class="battle-tag" style="background:rgba(106,168,216,.15);color:var(--c-info)">💊自身</span>':'<span class="battle-tag" style="background:rgba(224,82,94,.15);color:var(--c-accent)">🎯单体</span>')+'<span class="sc-lv" style="background:'+lvColor(lv)+';color:#fff">Lv'+lv+'</span></div>'
      +'<div class="sc-dmg">伤害 <b>'+shownDmg+'</b><small>'+(s?' · '+s.type:'')+'</small></div>'
      +'<div class="sc-eff">'+esc(s?s.desc:'')+(s&&s.extra?' ｜ '+esc(s.extra):'')+(cd>0?'<span style="color:var(--c-warn)"> ｜ 冷却'+cd+'回合</span>':'')+'</div>'
      +'<div class="sc-exp"><i><b class="'+(exp>=100?'xp-full':'')+'" style="width:'+clamp(exp,0,100)+'%"></b></i>经验 '+exp+'/100</div>'
      +'</div>';
  }
  html+='</div>';
  return html;
}

/* 道具栏（玩家道具，各自变量层读取） */
function renderItemBar(){
  var d=S();var items=obj(obj(d.玩家).道具栏);
  var keys=Object.keys(ITEMS);
  var html='<div class="zone-title">🎒 道具栏（每回合与技能二选一，最多 1 个）</div><div class="item-bar">';
  for(var i=0;i<keys.length;i++){
    var k=keys[i];var count=num(items[k],0);
    var it=ITEMS[k];
    var sel=State.selItem===k;
    var dis=count<=0||State.selSkills.length>0;
    html+='<div class="item-card'+(sel?' sel':'')+(dis?' off':'')+'" data-act="toggle-item" data-item="'+esc(k)+'">'
      +'<span class="ic-check">✓</span>'
      +'<span class="ic-name">'+(it?it.icon:'')+' '+esc(k)+'</span>'
      +'<span class="ic-count">×'+count+'</span>'
      +'<span class="ic-eff">'+esc(it?it.eff:'')+'</span>'
      +'</div>';
  }
  html+='</div>';
  return html;
}

/* 恢复技能区 */
function renderHealBar(){
  var d=S();var heal=obj(obj(d.玩家).恢复技能);
  var html='<div class="zone-title">💚 恢复技能（使用算一回合，与技能/道具互斥）</div><div class="heal-bar">';
  var keys=['提肛','思维分散'];
  // 互斥：选了技能或道具 → 恢复技能禁用（每回合只做一个行动）
  var busyOther=State.selSkills.length>0||!!State.selItem;
  for(var i=0;i<keys.length;i++){
    var k=keys[i];var v=obj(heal[k]);
    var lv=num(v.等级,1);
    var h=HEAL_SKILLS[k];
    var cd=num(State.healCd[k],0);
    var dis=cd>0||busyOther;
    html+='<div class="heal-btn'+(dis?' off':'')+'" data-act="use-heal" data-heal="'+esc(k)+'">'
      +'<span class="hb-name">'+(h?h.icon:'')+' '+esc(k)+' Lv'+lv+'</span>'
      +'<span class="hb-eff">'+esc(h?h.desc:'')+'</span>'
      +(cd>0?'<span class="hb-cd">冷却 '+cd+' 回合</span>':(busyOther?'<span class="hb-cd">已选其他行动</span>':'<span class="hb-cd">可用</span>'))
      +'</div>';
  }
  html+='</div>';
  return html;
}

/* 战斗控制区 */
function renderBattleCtrl(){
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  if(!tgt)return '';
  var pb=battleState();
  var st=obj(d.排班).战斗状态;
  var inBattle=st==='进行中'&&!State.finished;
  var rounds=num(pb.回合,0);
  var html='<div class="battle-ctrl">'
    +'<div class="battle-ctrl-title"><span>⚡ 本回合进攻</span><span class="rounds">'+(State.flavorOn?'<span style="color:var(--c-success)">副API描写开</span> · ':'<span style="color:var(--c-dim2)">副API描写关</span> · ')+'已进行 '+rounds+' 回合</span></div>';
  if(State.finished){
    html+='<button class="battle-btn alt" data-act="send-result">✓ 战斗结束 · 生成结算结果填输入框</button>'
      +'<div class="battle-tip">'+esc(State.resultText||'')+'</div>';
  }else if(inBattle){
    html+=renderItemBar()
      +renderHealBar()
      +'<div class="zone-title">⚡ 本回合进攻 · 技能</div>'
      +renderSkillSel()
      +'<textarea class="action-input" id="action-input" placeholder="描写你的攻法动作…（留空=纯面板计算，不走API，快速结算）">'+esc(State.actionText)+'</textarea>'
      +'<button class="battle-btn" data-act="attack">⚔ 发起本回合（你攻击 + 她反击，一次结算）</button>'
      +'<button class="battle-btn alt" data-act="toggle-flavor" style="margin-top:6px;padding:6px 0;font-size:11px">'+(State.flavorOn?'🔊 副API描写：开（点击关闭）':'🔇 副API描写：关（点击开启）')+'</button>'
      +'<button class="battle-btn alt" data-act="toggle-api" style="margin-top:6px;padding:6px 0;font-size:11px;border-color:rgba(106,168,216,.4);color:var(--c-info)">🔧 战斗API设置</button>'
      +(State.apiPanelOpen?renderApiSettings():'')
      +'<div class="formula">公式：你的伤害 = (技能伤害 + 状态修正 + 攻击BUFF)×不应期倍率 − 她减伤(名器防御+持久÷3+欲望积压修正[≥60 −2/≥80 −4]+周期修正+潮吹)｜她的反击 = (反攻×1.5 + 名器防御÷2)×(周期×潮吹×缴械濒危×敏感放大)｜欲望积压双刃剑：≥60 她攻击×1.1、≥80 ×1.25+暴击+15（更凶），但减伤−2/−4、≥100 决堤每回合防守值自溃−15（更容易缴械）</div>'
      +'<div class="legend">📖 缴械值：你胜 她 +1~10（按碾压程度，回合≤1 +8~10、2 +6~8、3 +4~6、4 +2~4、≥5 +1~2），你败 她 -1~10（被碾压同理）；玩家缴械值只有你败才 +（累计被缴械 1~5，你胜不产生）；达 100 = 俘虏（永久）；≥80 她反击 ×0.9（心神动摇）。欲望积压：≥60 减伤 -2、≥80 减伤 -4（她攻击也 ×1.1/×1.25+暴击+15，越积压越凶）、≥100 决堤每回合防守值自溃 -15。女性周期：经期 1~3 天减伤 -2/反击 ×0.8、4~5 天减伤 -1/×0.9；排卵期 12~16 天减伤 -2/反击 ×1.15（敏感涌动）；黄体期 17~28 天减伤 +1（积压期）。你的状态：不应期（射精后伤害 ×0.6~0.9、状态修正失效/减半）；体力 <30 透支 -1；勃起 ≥90 她反击 ×1.2（敏感放大）；潮吹临界（她敏感度 ≥50）她减伤 -3/反击 ×0.7。</div>'
      +'<div class="battle-tip">每回合：选 1~3 个技能（可配道具）。技能每次使用 (15+等级×3) 经验，升级所需经验随等级递增(100+等级×50)，上限 20 级。技能有冷却：控制技 3 回合 / 防御技 2 回合 / 辅助技 1 回合。</div>';
  }else{
    html+='<div class="battle-tip">战斗未进行。开始战斗后，选择技能（1~3 个）逐回合进攻，一方防守值归零即分出胜负。</div>';
  }
  html+='</div>';
  return html;
}

/* 回合明细日志（RPG） */
function renderLog(){
  if(!State.log.length)return '';
  var html='<div class="battle-log"><div class="log-title">📜 战斗记录（回合明细）</div>';
  for(var i=0;i<State.log.length;i++){
    var it=State.log[i];
    var dmgDetail='';
    if(it.skillDmgList&&it.skillDmgList.length){
      var parts=[];
      for(var j=0;j<it.skillDmgList.length;j++){
        var sd=it.skillDmgList[j];
        parts.push(sd.key+'Lv'+sd.lv+'('+sd.dmg+')'+(sd.eff?'×2':''));
      }
      dmgDetail='<span class="dmg-detail">伤害明细：'+parts.join(' + ')+' + 状态修正+'+it.bonus+'('+(it.bonusNotes?it.bonusNotes.join(','):'无')+') - 她减伤'+it.herReduce+'('+it.herReduceNotes+') = <b class="atk">'+it.youDmg+'</b></span>';
    }
    html+='<div class="log-item"><span class="rk">回合'+it.rk+'</span>'
      +(it.item?'<span style="color:var(--c-gold)">'+esc(it.item)+'</span> ｜ ':'')
      +(it.heal?'<span style="color:var(--c-success)">'+esc(it.heal)+'</span> ｜ ':'')
      +(it.you&&it.you!=='—'?'你 <span class="atk">'+esc(it.you)+' → 伤'+it.realDmg+'</span>，她防守值 <span class="def">'+it.herFrom+'→'+it.herTo+'</span>':'')
      +dmgDetail
      +'<br>她 '+(it.herActionType==='恢复'?'<span class="her-atk">💚 恢复【'+esc(it.herActionName)+'】</span>':it.herActionType==='道具'?'<span class="her-atk">🎒 道具【'+esc(it.herActionName)+'】</span>':'<span class="her-atk">⚔ '+esc(it.herActionName)+' 反'+it.herDmg+'</span>')
      +(it.herSkillNote?'（'+esc(it.herSkillNote)+'）':'')+'，主角防守值 <span class="def">'+it.meFrom+'→'+it.meTo+'</span>'
      +(it.extra?' ｜ '+esc(it.extra):'')
      +(it.flavor?'<br><span class="log-flavor">💬 '+esc(it.flavor)+'</span>':'')
      +(it.win?' <span class="win">'+esc(it.win)+'</span>':'')
      +(it.lose?' <span class="lose">'+esc(it.lose)+'</span>':'')
      +'</div>';
  }
  html+='</div>';
  return html;
}

/* 主渲染 */

var _targetRetryTimer=null,_targetRetryCount=0;
function scheduleTargetRetry(){
  if(_targetRetryTimer)return;
  _targetRetryCount=0;
  _targetRetryTimer=setInterval(function(){
    try{
      var st=readStatData();
      var tgt=st&&st.排班?st.排班.当前战斗目标:null;
      var bs=st&&st.排班?st.排班.战斗状态:null;
      if(tgt||bs==='已结算'){clearInterval(_targetRetryTimer);_targetRetryTimer=null;try{State.data=st;State.loading=false}catch(e){}render();return}
      _targetRetryCount++;
      if(_targetRetryCount>24){clearInterval(_targetRetryTimer);_targetRetryTimer=null}
    }catch(e){}
  },1500);
}
function render(){
  var loadingEl=document.getElementById('bu-loading');
  var bodyEl=document.getElementById('bu-body');
  if(!bodyEl)return;
  if(State.loading){loadingEl.style.display='';bodyEl.style.display='none';return}
  loadingEl.style.display='none';bodyEl.style.display='';
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  var st=obj(d.排班).战斗状态;
  var stateText=st==='进行中'?'⚔ 战斗进行中':(st==='已结算'?'✓ 已结算':'○ 未开始');
  var html='<div class="bu-head"><span class="bu-title">⚔ 战斗面板</span><span class="bu-head-r"><span class="bu-state '+esc(st)+'">'+esc(stateText)+'</span><span class="bg-btn" data-act="bg" title="切换背景：静态 / 极光流动 / 彩虹流动">🌈 '+ydsBgLabel()+'</span><span class="theme-btn" data-act="theme" title="切换主题：深色 / 浅色 / 磨砂 / 强对比 / 粉色 / 蓝色 / 金色">🎨 '+ydsThemeLabel()+'</span></span></div>';
  if(tgt){html+=renderBattle()+renderBattleCtrl()+renderLog()}
  else{
    if(State._statLoaded===false){html+='<div class="bu-empty"><p>⚔ 同步中…</p><p class="dim">正在读取 stat_data，稍候自动显示…</p></div>';scheduleTargetRetry();}
    else if(st==='进行中'){html+='<div class="bu-empty"><p style="color:var(--c-warn)">⚠ 战斗中 · 目标缺失</p><p class="dim">战斗状态=进行中 但「排班.当前战斗目标」为空——请 AI 用变量更新补写：排班.当前战斗目标 = 她名字（多人 = "多人" 并写全 排班.战斗.目标列表）</p></div>';scheduleTargetRetry();}
    else{html+='<div class="bu-empty"><p>○ 未开始</p><p class="dim">暂无战斗目标：等待 AI 发起战斗并设置 排班.当前战斗目标（被假阴茎拉入后自动出现）</p></div>';}
  }
  bodyEl.innerHTML=html;
}

/* 本地战斗引擎：执行一轮（你进攻 + 她反击） */
function executeRound(){
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  var c=obj((d.女性角色||{})[tgt]);
  var pb=battleState();
  var p=obj(d.玩家);
  var isHealRound=false;var healNote='';var healSkillKey='';var healExpUpdate=null;
  if(!State.stats)State.stats=newStats();
  var sts=State.stats;

  // ── 生理状态检查：不应期(射精后遗症)改为软性DEBUFF，不再硬禁止 ──
  var pPhys=obj(p.生理);
  var ejCdNow=num(pPhys.射精冷却剩余,0);
  var refractory=1; // 伤害倍率（1=无不应期）
  if(ejCdNow>0)refractory=ejCdNow>=3?0.6:(ejCdNow===2?0.75:0.9);
  if(ejCdNow>0&&num(p.勃起度,0)<=0&&num(p.性欲,0)<20){
    State.resultText='【拒战】不应期中且性欲不足（'+num(p.性欲,0)+'）、勃起度归零，无法勃起，战斗不成立（无败果）。可等冷却或使用伟哥。';
    State.finished=true;render();return;
  }
  if(num(p.性欲,0)<20&&num(p.勃起度,0)<=0&&!State.pendingHeal&&ejCdNow<=0){
    State.resultText='【拒战】性欲不足（'+num(p.性欲,0)+'/100，需≥20）且无勃起，无法战斗，战斗不成立（无败果）。可用恢复技能或等待恢复。';
    State.finished=true;render();return;
  }
  var pc=obj(c.生理周期);
  // 经期不再禁止：她主动使用假阴茎→经期照常开战，自动套用经期 DEBUFF（见 ydsPeriodDebuff：1~3天减伤-2反击×0.8，4~5天减伤-1反击×0.9）
  if(pc.怀孕===true&&num(pc.怀孕周数,0)>=30){
    State.resultText='【禁止】她已怀孕'+num(pc.怀孕周数,0)+'周，无法进行剧烈战斗。';
    State.finished=true;render();return;
  }

  // ── 恢复技能：本回合不攻击，使用恢复技能 ──
  if(State.pendingHeal){
    healSkillKey=State.pendingHeal;
    State.pendingHeal=null;
    isHealRound=true;
    var hlv=num(obj(obj(p.恢复技能)[healSkillKey]).等级,1);
    var heal=HEAL_SKILLS[healSkillKey];
    // 提肛：回复防守值+Lv×4
    if(healSkillKey==='提肛'){
      var curDef=num(pb.主角防守值,96),maxDef=num(pb.主角防守值上限,96);
      var healAmt=Math.min(hlv*4,maxDef-curDef);
      pb.主角防守值=Math.min(maxDef,curDef+healAmt);
      healNote='提肛 Lv'+hlv+'：防守值+'+(healAmt>0?healAmt:0);
      // 满血时改为攻击+1
      if(healAmt<=0){healNote='提肛 Lv'+hlv+'：防守值已满，转为攻击+1'}
    }
    // 思维分散：清除麻痒 + 体力+5
    else if(healSkillKey==='思维分散'){
      pb.主角麻痒点=0;
      healNote='思维分散 Lv'+hlv+'：清除麻痒，体力+5';
    }
    // 恢复技能经验 +15
    var hcur=obj(obj(p.恢复技能)[healSkillKey]);
    var _g1=gainExp(num(hcur.等级,1),num(hcur.经验,0),15);var hNewLv=_g1.等级;var hNewExp=_g1.经验;
    hcur.等级=hNewLv;hcur.经验=hNewExp;
    countStat(sts.myHeals,healSkillKey,1);
    // 冷却
    State.healCd[healSkillKey]=num(HEAL_SKILLS[healSkillKey]?HEAL_SKILLS[healSkillKey].cooldown:3,3);
    healExpUpdate={key:healSkillKey,等级:hNewLv,经验:hNewExp};
    skills=['（恢复）'];
  }else{
    var skills=State.selSkills.slice();
    if(!skills.length)skills=['螺旋'];
  }

  // hsNotes 初始化（提前，灼烧/暴击等段需要；勿在后面重复定义清空）
  var hsNotes=[];
  // ── BUFF 回合递减（每回合结算前）──
  var pbuffs=obj(pb.主角BUFF),hbuffs=obj(pb.她BUFF);
  var pBKeys=Object.keys(pbuffs),hBKeys=Object.keys(hbuffs);
  var buffNotes=[];
  for(var bi=0;bi<pBKeys.length;bi++){
    var bObj=pbuffs[pBKeys[bi]];
    bObj.剩余回合=num(bObj.剩余回合,0)-1;
    if(bObj.剩余回合<=0)delete pbuffs[pBKeys[bi]];
  }
  for(var bj=0;bj<hBKeys.length;bj++){
    var hbObj=hbuffs[hBKeys[bj]];
    hbObj.剩余回合=num(hbObj.剩余回合,0)-1;
    if(hbObj.剩余回合<=0)delete hbuffs[hBKeys[bj]];
  }
  // 灼烧 DoT：她每回合防守值-效果值（异常状态）
  if(hbuffs['灼烧']&&num(hbuffs['灼烧'].效果值,0)>0){pb.她防守值=Math.max(0,num(pb.她防守值,0)-num(hbuffs['灼烧'].效果值,0));hsNotes.push('🔥灼烧：她防守值-'+hbuffs['灼烧'].效果值)}
  // 冷却递减
  for(var ck in State.healCd){if(State.healCd[ck]>0)State.healCd[ck]--}
  for(var ck2 in State.playerSkillCd){if(State.playerSkillCd[ck2]>0)State.playerSkillCd[ck2]--}

  // ── 道具使用（本回合已选道具）──
  var itemNote='';
  if(State.selItem){
    var itemKey=State.selItem;
    var items=obj(p.道具栏);
    if(num(items[itemKey],0)>0){
      var eff=getItemEffect(itemKey);
      if(eff){
        if(eff.self){
          if(eff.self.攻击){pbuffs['攻击强化']={剩余回合:eff.rounds,效果值:eff.self.攻击}}
          if(eff.self.减伤){pbuffs['防御强化']={剩余回合:eff.rounds,效果值:eff.self.减伤}}
          if(eff.self.勃起){p.勃起度=clamp(num(p.勃起度,0)+eff.self.勃起,0,100)}
          if(eff.self.清麻痒){pb.主角麻痒点=0;pb.主角防守值=Math.min(num(pb.主角防守值上限,96),num(pb.主角防守值,96)+eff.self.回复)}
        }
        if(eff.her){
          if(eff.her.减伤){hbuffs['道具减伤']={剩余回合:eff.rounds,效果值:eff.her.减伤}}
          if(eff.her.敏感度){hbuffs['敏感度']={剩余回合:eff.rounds,效果值:eff.her.敏感度}}
          if(eff.her.麻痒){pb.麻痒点=num(pb.麻痒点,0)+eff.her.麻痒;if(pb.麻痒点>=5){herTo?0:0}}
        }
      }
      items[itemKey]=Math.max(0,num(items[itemKey],0)-1);
      itemNote='使用道具：'+itemKey;
      countStat(sts.myItems,itemKey,1);
      State.selItem='';
    }
  }

  // 你的伤害 = Σ技能伤害 + 状态修正 - 她减伤
  var totalDmg=0;var expGain={};var skillDmgList=[];
  if(!isHealRound){
    for(var i=0;i<skills.length;i++){
      var k=skills[i];
      var lv=num(obj(obj(p.技能)[k]).等级,1);
      var baseDmg=skillDmg(k,lv);
      var dmg=baseDmg;
      var effNotes=[];
      // 特效（每回合单技能，均独立生效）
      if(k==='热量翻倍'&&/雪窦|寒玉|雪润|冰守/.test(c.名器||'')){dmg*=2;effNotes.push('寒系名器×2')}
      if(k==='次数翻倍'){dmg=Math.round(dmg*1.5);effNotes.push('连击×1.5')}
      totalDmg+=dmg;
      expGain[k]=(expGain[k]||0)+15;
      skillDmgList.push({key:k,lv:lv,dmg:Math.round(dmg*10)/10,eff:effNotes.join('、')});
      countStat(sts.mySkills,k,1);
      // 玩家技能冷却：辅助技（热量/次数/频率/敏感度/硬度加倍）cd=1，主攻技（螺旋/颗粒）无冷却
      var pCd=0;
      if(/加倍|翻倍/.test(k))pCd=1;
      if(pCd>0)State.playerSkillCd[k]=pCd;
    }
    // 敏感度加倍：独立生效，给她加敏感度BUFF+减伤-1
    if(State.selSkills.indexOf('敏感度加倍')>=0){
      hbuffs['敏感度']={剩余回合:2,效果值:10};
      pb.她减伤修正=num(pb.她减伤修正,0)-1;
    }
    // 玩家冷却递减（用后立即扣1，避免同一回合重复）
    for(var pck in State.playerSkillCd){if(State.playerSkillCd[pck]>0)State.playerSkillCd[pck]--}
  }
  var bonus=stateBonus(p);
  var bonusNotes=[];
  if(refractory<1){bonus=refractory<=0.6?0:Math.round(bonus/2);bonusNotes.push('不应期：状态修正'+(refractory<=0.6?'失效':'减半'))}
  if(num(p.体力,0)<30){bonus-=1;bonusNotes.push('体力透支-1')}
  if(num(p.体力,0)>60)bonusNotes.push('体力>60+2');else if(num(p.体力,0)>=40)bonusNotes.push('体力40-60+1');
  if(num(p.性欲,0)>60)bonusNotes.push('性欲>60+2');else if(num(p.性欲,0)>=40)bonusNotes.push('性欲40-60+1');
  if(num(p.勃起度,0)>60)bonusNotes.push('勃起>60+1');
  var jya=num(c.欲望积压,0);
  var yzFix0=jya>=80?-4:(jya>=60?-2:0);
  var _pd=ydsPeriodDebuff(c);var yzFix=yzFix0+_pd.pf;
  var herDef=herDefVal(c);
  var chi=herAbility(c,'持久',obj(obj(c.能力值)).持久);
  var herReduce=Math.round(herDef+chi/3+yzFix+Math.floor((num(obj(obj(c.技能)).等级,1)||1)/3)+num(pb.她减伤修正,0));

  // BUFF 应用：主角攻击强化 + 她减伤 BUFF/DEBUFF
  var playerAtkBuff=0;var herDefBuff=0;
  for(var pbk in pbuffs){
    if(pbk==='攻击强化')playerAtkBuff+=num(pbuffs[pbk].效果值,0);
    else if(pbk==='提肛强化')playerAtkBuff+=num(pbuffs[pbk].效果值,0);
  }
  for(var hbk in hbuffs){
    if(hbk==='道具减伤'||hbk==='冰袋')herDefBuff+=num(hbuffs[hbk].效果值,0);
    if(hbk==='她防守')herDefBuff+=num(hbuffs[hbk].效果值,0); // 癖好/性格触发:防守修正(正=加防,负=破防)
    if(hbk==='敏感度')herReduce-=Math.floor(num(hbuffs[hbk].效果值,0)/10);
  }
  herReduce=Math.max(0,herReduce+herDefBuff);
  // 欲望决堤：欲望积压≥100 → 心神涣散、防线自行溃散（每回合-15，强弩之末但不直接判负）
  var _surr=num(c.欲望积压,0)>=100;if(_surr){pb.她防守值=Math.max(0,num(pb.她防守值,0)-15);bonusNotes.push('欲望决堤：积压≥100，心神涣散防线自溃-15')}
  // 潮吹临界：她敏感度 BUFF 累计≥50 → 快感压倒理智：本回合减伤-3、反击×0.7，触发后清除敏感度
  var _sensSum=0;for(var _sk in hbuffs){if(_sk==='敏感度')_sensSum+=num(hbuffs[_sk].效果值,0)}
  var _tidal=_sensSum>=50;
  if(_tidal){herReduce=Math.max(0,herReduce-3);delete hbuffs['敏感度']}
  var finalDmg=Math.max(0,Math.round((totalDmg+bonus+playerAtkBuff)*refractory-herReduce));

  // ═══ 她的 AI 回合：决策 恢复 → 道具 → 技能攻击（技能组）═══
  var hs=getHerSkill(c);
  var herSkillName=obj(c.技能).名||'反击';
  var herSkillLv=num(obj(obj(c.技能)).等级,1);
  var herGroupExp={}; // 本回合技能组经验
  var herEffects={};
  var herActionType='技能攻击';   // 她的行动类型
  var herActionName=herSkillName; // 她的行动名称（技能/道具/恢复）
  var herTurnLog='她发动【'+herSkillName+'】'; // 她回合动作文字

  // 预计算她防守值（她被打后的值，用于恢复决策）
  var herFromPre=num(pb.她防守值,44);
  var herToPre=Math.max(0,herFromPre-finalDmg);

  // ── 决策 0：从技能组选本回合技能（按局势）──
  var herCtx={
    herHpPct:herToPre/Math.max(1,num(pb.她防守值上限,44)),
    playerAggro:!!pbuffs['攻击强化']||num(p.勃起度,0)>=80,
    myHpPct:num(pb.主角防守值,96)/Math.max(1,num(pb.主角防守值上限,96))
  };
  var chosenSkill=chooseHerSkill(c,herCtx);
  if(chosenSkill&&chosenSkill!==herSkillName){
    // 使用技能组里的辅技能
    herSkillName=chosenSkill;
    herActionName=chosenSkill;
    herTurnLog='她发动【'+chosenSkill+'】';
    var gv=obj(obj(c.技能).技能组)[chosenSkill];
    herSkillLv=num(gv.等级,1);
    hs=herSkillWithLv(HER_SKILLS[chosenSkill]||hs,herSkillLv);
    var _g2=gainExp(num(gv.等级,1),num(gv.经验,0),15);herGroupExp[chosenSkill]={等级:_g2.等级,经验:_g2.经验};
  }
  // 她本回合技能冷却：使用后设置（控制技3/防御技2/普通1）
  var usedCd=num(hs.cd,1)||1;
  if(herActionType!=='恢复')State.herSkillCd[herSkillName]=usedCd;
  // 所有冷却递减
  for(var cdK in State.herSkillCd){if(State.herSkillCd[cdK]>0)State.herSkillCd[cdK]--}
  if(State.herSkillCd[herSkillName]===undefined||State.herSkillCd[herSkillName]<0)State.herSkillCd[herSkillName]=0;

  // ── 决策 1：低血量恢复（被打后防守值<35% 且 有恢复技能 且 每场≤2次 且 冷却结束）──
  var herHealSkillName=obj(obj(c.恢复技能)).名||'';
  var herMaxDef=num(pb.她防守值上限,44);
  var herCurDef=herToPre;
  if(herHealSkillName && herCurDef<=herMaxDef*0.35 && State.herHealCount<2 && State.herHealCd<=0){
    // 她的恢复技能：按 HER_HEALS 表差异化（回复量/额外效果）
    var hLv=num(obj(obj(c.恢复技能)).等级,1);
    var hh=HER_HEALS[herHealSkillName]||{heal:6,extra:''};
    var hAmt=Math.min(num(hh.heal,6)+Math.floor(hLv/2), herMaxDef-herCurDef);
    pb.她防守值=Math.min(herMaxDef, herCurDef+hAmt);
    herActionType='恢复';herActionName=herHealSkillName;
    herTurnLog='她使用恢复【'+herHealSkillName+'】，防守值+'+hAmt+(hh.extra?'，'+hh.extra:'');
    hsNotes.push('恢复防守值+'+hAmt);
    State.herHealCount++;State.herHealCd=3;
    countStat(sts.herHeals,herHealSkillName,1);
    sts.herTotalHeal+=hAmt;
    // 她恢复技能经验+15
    var hc=obj(obj(c.恢复技能));
    var _g3=gainExp(num(hc.等级,1),num(hc.经验,0),15);hc.等级=_g3.等级;hc.经验=_g3.经验;
    // 恢复回合不反击
    var meFrom=num(pb.主角防守值,96);
    var meTo=meFrom;
    var herDmg=0;
    var fan=num(obj(obj(c.能力值)).反攻,4);
    var atkMul=1.0;
    var playerAtkDown=0;var playerStunned=false;var playerDazed=false;
  }
  else{
    // ── 决策 2：道具使用（智能反制，每场最多2次）──
    var herItems=obj(c.道具栏);
    var herItemKeys=Object.keys(herItems);
    var usedItem=false;
    if(State.herItemUsed<2 && herItemKeys.length){
      var chosen=null;var chosenHi=null;var reason='';
      // 观察玩家状态，针对性选择道具（让她显得聪明）
      var myHpPct=num(pb.主角防守值,96)/Math.max(1,num(pb.主角防守值上限,96));
      var myBoqi=num(p.勃起度,0);
      var myItch=num(pb.主角麻痒点,0);
      var myAtkBuff=!!pbuffs['攻击强化'];
      var herDazed=pb.她失神||0;
      // 优先级 1：我方处于攻击强化/高勃起 → 她用冰袋/润滑液防御或薄荷油降温
      if(myAtkBuff&&num(herItems['冰袋'],0)>0){chosen='冰袋';reason='你攻击强化，她果断用冰袋加固防线'}
      else if(myAtkBuff&&num(herItems['润滑液'],0)>0){chosen='润滑液';reason='你攻势太猛，她用润滑液卸力'}
      else if(myBoqi>=70&&num(herItems['薄荷油'],0)>0){chosen='薄荷油';reason='你勃起炽热，她用薄荷油泼灭你的欲望'}
      // 优先级 2：她残血 → 防守道具
      else if(herToPre<=herMaxDef*0.5&&num(herItems['冰袋'],0)>0){chosen='冰袋';reason='她受伤不轻，用冰袋稳住阵脚'}
      // 优先级 3：进攻道具（玩家低血量追击）
      else if(myHpPct<=0.4&&num(herItems['辣椒油'],0)>0){chosen='辣椒油';reason='你摇摇欲坠，她辣椒油直击要害'}
      else if(num(herItems['震动环'],0)>0){chosen='震动环';reason='她装上震动环强化反击'}
      else if(num(herItems['辣椒油'],0)>0){chosen='辣椒油';reason='她用辣椒油施加灼辣'}
      // 优先级 4：她失神 → 清凉油自清
      else if(herDazed&&num(herItems['清凉油'],0)>0){chosen='清凉油';reason='她失神之际抹上清凉油恢复清醒'}
      // 优先级 5：兜底任意道具
      else{
        var fallback=herItemKeys.filter(function(k){return num(herItems[k],0)>0&&getHerItem(k)});
        if(fallback.length){chosen=fallback[Math.floor(Math.random()*fallback.length)];reason='她使用'+chosen+'应变'}
      }
      if(chosen){
        var hi=getHerItem(chosen);
        // 应用道具效果（威力按她的熟练系数放大：等级越高同一道具越强）
        if(hi.buff){var hp=herProficiency(c);hbuffs[hi.buff.name]={剩余回合:hi.buff.rounds,效果值:Math.max(1,Math.round(hi.buff.val*hp))}}
        if(hi.atk){
          if(hi.atk.勃起){p.勃起度=clamp(num(p.勃起度,0)+hi.atk.勃起,0,100)}
          if(hi.atk.麻痒){pb.主角麻痒点=num(pb.主角麻痒点,0)+hi.atk.麻痒}
        }
        if(hi.heal){pb.她失神=0}
        herItems[chosen]=Math.max(0,num(herItems[chosen],0)-1);
        herActionType='道具';herActionName=chosen;
        herTurnLog=reason;
        hsNotes.push('使用了【'+chosen+'】');
        State.herItemUsed++;
        countStat(sts.herItems,chosen,1);
        usedItem=true;
      }
    }
    if(!usedItem){
      // ── 决策 3：技能攻击（默认）──
      herActionType='技能攻击';herActionName=herSkillName;
      herTurnLog='她发动【'+herSkillName+'】';
    }
    // 她的技能攻击统计（除恢复回合外，技能都随反击发动）
    if(herActionType!=='恢复')countStat(sts.herSkills,herSkillName,1);

    // 技能特效仅在"技能攻击"回合生效（道具回合=只道具+基础反击，与玩家规则对齐）
    var playerAtkDown=0;var playerStunned=false;var playerDazed=false;
    var isSkillTurn=(herActionType==='技能攻击');
    if(isSkillTurn){
      // 1) 减伤加成（技能被动）
      var defAdd=num(hs.defAdd,0);
      if(num(pb.回合,0)>=4&&num(hs.lateDef,0)>0)defAdd+=num(hs.lateDef,0);
      herReduce+=defAdd;
      if(defAdd>0)hsNotes.push('减伤+'+defAdd);

      // 2) 我方攻击削弱（絮语/软语每回合；交替每2回合；起伏第3回合起）
      if(num(hs.atkDown,0)>0){playerAtkDown+=num(hs.atkDown,0);hsNotes.push('我方攻击-'+hs.atkDown)}
      if(num(hs.atkDownEvery,0)>0&&pb.回合%num(hs.atkDownEvery,0)===0){playerAtkDown+=1;hsNotes.push('每'+hs.atkDownEvery+'回合攻击-1')}
      if(num(hs.lateAtkDown,0)>0&&pb.回合>=3){playerAtkDown+=num(hs.lateAtkDown,0);hsNotes.push('第3回合起攻击-'+hs.lateAtkDown)}

      // 3) 控制效果：定身/失神（智能时机：你攻击强化/高勃起时更容易被控制）
      var myAggro=!!pbuffs['攻击强化']||num(p.勃起度,0)>=80;
      var stunTick=num(hs.stunEvery,0)>0&&pb.回合>0&&pb.回合%num(hs.stunEvery,0)===0;
      // 蓄力时提前触发（每2回合）；平时每3回合
      var smartTick=myAggro&&num(hs.stunEvery,0)>0&&pb.回合>0&&(pb.回合%Math.max(2,num(hs.stunEvery,0)-1)===0);
      if(stunTick||smartTick){
        if(hs.stunEvery===3&&hs.atkMul>=1.2){playerStunned=true;hsNotes.push(myAggro?'定身（抓准你蓄力空档）：本回合你无法进攻':'定身：本回合你无法进攻')}
        else{playerDazed=true;hsNotes.push(myAggro?'失神（趁你欲念高涨）：本回合你伤害减半':'失神：本回合你伤害减半')}
      }

      // 4) 我方麻痒（细作/绒磨/揉压/颤磨）
      var playerItch=num(pb.主角麻痒点,0)||0;
      if(num(hs.itch,0)>0){
        playerItch+=num(hs.itch,0);
        var itchMax=num(hs.itchMax,4);
        if(playerItch>=itchMax){playerDazed=true;playerItch=0;hsNotes.push('麻痒满'+itchMax+'：你失神1回合')}
        else{hsNotes.push('你麻痒+'+hs.itch+'（'+playerItch+'/'+itchMax+'）')}
      }
      pb.主角麻痒点=playerItch;

      // 5) 我方体力消耗（干磨/绵密/深纳/热挤/奔涌）
      var playerCost=num(hs.playerCost,0);
      if(playerCost>0)hsNotes.push('体力-'+playerCost+'/回合');

      // 6) 对热量翻倍的克制（寒凝/冰守）
      if(num(hs.resistHeat,0)>0&&State.selSkills.indexOf('热量翻倍')>=0){
        totalDmg=Math.round(totalDmg*(1-num(hs.resistHeat,0)));
        hsNotes.push('热量翻倍效果-'+Math.round(num(hs.resistHeat,0)*100)+'%');
      }
    }

    // 7) 晚熟反击增强（渐润/悠长，仅技能攻击回合）
    var atkMul=isSkillTurn?num(hs.atkMul,1.0):1.0;
    if(isSkillTurn&&num(hs.lateAtkMul,0)>0&&pb.回合>=3){atkMul*=num(hs.lateAtkMul,0);hsNotes.push('第3回合起反击×'+hs.lateAtkMul)}
    if(hbuffs['她反击']){atkMul*=(1+num(hbuffs['她反击'].效果值,0)/100);hsNotes.push('癖好反击×'+((1+num(hbuffs['她反击'].效果值,0)/100)*10).toFixed(1)/10)} // 癖好/性格触发:反击倍率(值10→×1.1,负=减弱)

    // 她反击（含技能倍率 + 震动环 BUFF；道具回合为基础反击）
    var fan=num(obj(obj(c.能力值)).反攻,4);
    var ringBuff=0;
    if(hbuffs['震动环'])ringBuff+=num(hbuffs['震动环'].效果值,0);
    var _pdb2=ydsPeriodDebuff(c);
    var _herMul=_pdb2.atkMul;
    if(typeof _tidal!=='undefined'&&_tidal)_herMul*=0.7;
    if(num(c.缴械值,0)>=80)_herMul*=0.9;
    if(num(p.勃起度,0)>=90)_herMul*=1.2;
    var herDmg=Math.round(((fan*1.5+herDef/2)*atkMul+ringBuff)*_herMul);
    var meFrom=num(pb.主角防守值,96);
    var _herCrit=lvCrit(num(obj(obj(c.技能)).等级,1))+(num(c.欲望积压,0)>=80?15:0);
    if(Math.random()*100<_herCrit){herDmg=Math.round(herDmg*1.5);hsNotes.push('她会心反击(暴击×1.5)')}
    var _pDefV=0;for(var _pbk in pbuffs){if(_pbk==='防御强化')_pDefV+=num(pbuffs[_pbk].效果值,0)}
    var meTo=Math.max(0,meFrom-Math.max(0,herDmg-_pDefV));
    if(meTo<=0)meTo=0;
  }
  // 她恢复冷却递减
  if(State.herHealCd>0)State.herHealCd--;

  // 计算我方实际伤害（含控制/削弱）
  var realDmg=finalDmg;
  if(isHealRound){realDmg=0}
  if(playerStunned){realDmg=0;hsNotes.push('本回合你被定身，进攻无效')}
  else if(playerDazed){realDmg=Math.max(0,Math.round(realDmg/2));hsNotes.push('本回合你失神，伤害减半')}
  realDmg=Math.max(0,Math.round(realDmg-playerAtkDown));
  // RPG 暴击/闪避：玩家暴击（5%+平均技能等级×0.5%+勃起≥90+15%）；她闪避（等级×0.3%+闪避技15%）
  if(!isHealRound&&realDmg>0&&!playerStunned&&!playerDazed){
    var _avgLv=0,_lc=0;for(var _sv in obj(p.技能)){_avgLv+=num(obj(obj(p.技能)[_sv]).等级,1);_lc++}
    var critRate=5+(_lc?_avgLv/_lc*0.5:0)+(num(p.勃起度,0)>=90?15:0);
    if(Math.random()*100<critRate){realDmg=Math.round(realDmg*1.5);hsNotes.push('💥会心一击(暴击×1.5)')}
    var evRate=lvEvade(num(obj(obj(c.技能)).等级,1))+((hs&&hs.dodgeCount)?15:0);
    if(Math.random()*100<evRate){realDmg=0;hsNotes.push('她闪避了你的攻击')}
  }

  // 她防守值扣除（若她本回合恢复，则 herTo 已被恢复覆盖）
  var herFrom=herFromPre;
  var herTo=(herActionType==='恢复')?pb.她防守值:Math.max(0,herFromPre-realDmg);
  if(typeof _surr!=='undefined'&&_surr){herTo=0;herDmg=0;herActionType='无行动';herActionName='欲望决堤溃败';}
  sts.myTotalDmg+=realDmg;
  sts.herTotalDmg+=herDmg;

  // 我方螺旋麻痒点（仅进攻回合）
  if(!isHealRound&&State.selSkills.indexOf('螺旋')>=0){
    pb.麻痒点=num(pb.麻痒点,0)+2;
    if(pb.麻痒点>=5){herTo=Math.max(0,herTo-5);pb.麻痒点=0;}
  }

  // 经验：主角使用的技能 +15 并写回 stat_data（满100升1级）
  var exp=obj(pb.本场经验);
  for(var kk in expGain){exp[kk]=num(exp[kk],0)+expGain[kk]}
  var playerExpUpdates={}; // 技能名 -> {等级, 经验}（经验=本场累计 exp[kk]=使用次数×15，与结算块一致）
  for(var kk2 in expGain){
    var cur=obj(obj(obj(p.技能)[kk2]));
    var _g4=gainExp(num(cur.等级,1),num(cur.经验,0),num(exp[kk2],0));var newLv=_g4.等级;var newExp=_g4.经验;
    playerExpUpdates[kk2]={等级:newLv,经验:newExp};
  }
  // 她经验写回（主技能 使用次数×15，与结算块 herExpStr 一致）
  var herMainN=obj(obj(c.技能)).名||'';
  var herGain=num(sts.herSkills[herMainN],0)*15;
  var _g5=gainExp(num(obj(obj(c.技能)).等级,1),num(obj(obj(c.技能)).经验,0),herGain);var herNewLv=_g5.等级;var herExp=_g5.经验;
  var herExpUpdates={等级:herNewLv,经验:herExp};

  // 回合 +1
  pb.回合=num(pb.回合,0)+1;
  // 兴奋消耗：战斗内每次攻防性欲 -2（数值驱动，面板自动）
  p.性欲=clamp(num(p.性欲,0)-2,0,100);
  // 射精冷却：仅战斗回合递减（每回合 -1，日常不按回合计）——不应期效果由数值体现
  var _ejPh=obj(obj(p.生理));
  if(num(_ejPh.射精冷却剩余,0)>0){_ejPh.射精冷却剩余=Math.max(0,num(_ejPh.射精冷却剩余,0)-1)}
  pb.主角防守值=meTo;pb.她防守值=herTo;
  if(herTo<=0)pb.她防守值=0;
  if(meTo<=0)pb.主角防守值=0;

  // 记录（含伤害明细 + 她技能效果 + 道具/恢复）
  var skillsUsed=skills.join('+');
  State.log.push({
    rk:pb.回合,
    you:skillsUsed,
    youDmg:finalDmg,
    realDmg:realDmg,
    skillDmgList:skillDmgList,
    bonus:bonus,bonusNotes:bonusNotes,
    herReduce:herReduce,herReduceNotes:'名器'+herDef+'+持久'+chi+'÷2'+(yzFix0!==0?('+积压修正'+yzFix0):'')+(typeof _pd!=='undefined'&&_pd.pf!==0?('+周期['+(_pd.label||'')+']'+_pd.pf):'')+(num(pb.她减伤修正,0)!==0?('+修正'+num(pb.她减伤修正,0)):'')+(defAdd>0?('+技能减伤'+defAdd):'')+(herDefBuff!==0?('+BUFF减伤'+herDefBuff):''),
    herFrom:herFrom,herTo:herTo,
    her:herSkillName,
    herDmg:herDmg,
    herActionType:herActionType,
    herActionName:herActionName,
    herTurnLog:herTurnLog,
    herSkillNote:hsNotes.length?hsNotes.join('；'):(hs.note||''),
    meFrom:meFrom,meTo:meTo,
    extra:(pb.麻痒点>0?'麻痒'+pb.麻痒点:''),
    item:itemNote||'',
    heal:isHealRound?healNote:'',
    healKey:isHealRound?healSkillKey:'',
    buffNotes:buffNotes
  });

  // 副API描述模式：本地数值结算后，用副模型生成她的反应/回击描写（失败自动降级纯数值）
  if(State.flavorOn&&!State.finished){
    var lastLg=State.log[State.log.length-1];
    var rInfo={
      you:skillsUsed,realDmg:realDmg,herReduce:herReduce,
      herAction:herActionType,herActionName:herActionName,
      herDmg:herDmg,hsNotes:hsNotes.join('；'),
      herToPct:Math.round((Math.max(0,herTo)/herMaxDef)*100),
      myHpPct:Math.round((meTo/num(pb.主角防守值上限,96))*100),
      herName:c.身份||tgt
    };
    var fGen=genFlavorDescribe(rInfo);
    if(fGen){fGen.then(function(txt){if(txt&&lastLg)lastLg.flavor=txt;render()})}
  }

  // 检查胜负
  State.finished=false;
  if(herTo<=0||meTo<=0){
    State.finished=true;
    var youWin=herTo<=0;
    var lastLog=State.log[State.log.length-1];
    if(lastLog){lastLog.win=youWin?'🏆 你胜！':'';lastLog.lose=youWin?'':'💀 你败！';}
    var jx=num(c.缴械值,0);
    var jxChange=0;var subjectChange=0;var detail='';
    if(youWin){
      // 缴械值按战斗结果程度（碾压=回合少，1~10）：回合1→+8~10、2→+6~8、3→+4~6、4→+2~4、≥5→+1~2
      jxChange=clamp(11-pb.回合*2,1,10)+(Math.floor(Math.random()*3)-1);
      subjectChange=Math.floor(Math.random()*3)+1;
      jx=clamp(jx+jxChange,0,100);
      detail='你胜！她缴械值+'+jxChange+'，随机科目+'+subjectChange;
    }else{
      // 你败：她缴械值按被碾压程度 -1~10（回合越少被碾越狠）
      jxChange=-(clamp(11-pb.回合*2,1,10)+(Math.floor(Math.random()*3)-1));
      subjectChange=-(Math.floor(Math.random()*3)+1);
      jx=clamp(jx+jxChange,0,100);
      detail='你败！她缴械值'+jxChange+'，随机科目'+subjectChange;
    }
    State.jxChange=jxChange;State.subjectChange=subjectChange;
    // ── 她购买道具：她赢 → 花钱补货；她输 → 也可能补 1 个（她有自己的零花钱）──
    var buyNote='';
    var herShop=['润滑液','冰袋','震动环','薄荷油','辣椒油','清凉油'];
    var buyCount=(!youWin)?(Math.floor(Math.random()*2)+1):(Math.random()<0.4?1:0);
    if(buyCount>0){
      var hItems=obj(c.道具栏);
      var buyList=[];
      for(var bi2=0;bi2<buyCount;bi2++){
        var buyName=herShop[Math.floor(Math.random()*herShop.length)];
        hItems[buyName]=num(hItems[buyName],0)+1;
        buyList.push(buyName+'×1');
      }
      buyNote=(youWin?'她不甘心，还是去小卖部补了货：':'她得意地去小卖部补了货：')+buyList.join('、');
    }
    // ── 射精规则：你胜（她战败=缴械/内射）→ 射精次数+1、冷却、勃起归0、体力扣减 ──
    var ejNote='';
    if(youWin){
      var ejCount=num(obj(obj(p.生理)).今日射精次数,0)+1;
      obj(obj(p.生理)).今日射精次数=ejCount;
      var ejCd=ejCount===1?4:(ejCount===2?8:12);
      if(ejCdNow>0)ejCd=ejCd+ejCdNow; // 不应期中再射：冷却叠加
      obj(obj(p.生理)).射精冷却剩余=ejCd;
      obj(obj(p.生理)).最后射精日期=num(obj(obj(d.时间)).日期,'');
      p.勃起度=0;
      var ejSt=ejCount===1?10:(ejCount===2?15:25);
      if(ejCdNow>0)ejSt+=5; // 不应期硬射：体力损耗更多
      p.体力=clamp(num(p.体力,0)-ejSt,0,100);
      ejNote='射精第'+ejCount+'次，冷却'+ejCd+'回合，体力-'+ejSt+'，勃起度归0';
      if(ejCdNow>0){jxChange=Math.max(1,Math.round(jxChange/2));ejNote+='｜射精困难：不应期中勉强缴械，缴械值收益减半'};
      // ── 怀孕判定：排卵窗口(月经日11~17) + 未避孕/备孕 → 概率判定 ──
      var pc=obj(c.生理周期);
      var day=num(pc.月经日,1),ovu=num(pc.排卵日,14);
      var inWindow=Math.abs(day-ovu)<=3;
      var notProtected=pc.避孕===false||pc.备孕===true;
      if(pc.怀孕!==true&&inWindow&& notProtected){
        var rate=day===ovu?0.5:0.3;
        if(Math.random()<rate){
          pc.怀孕=true;pc.怀孕周数=1;pc.月经状态='黄体期';
          ejNote+='｜⚠️ 她怀孕了！(排卵期+未避孕，'+Math.round(rate*100)+'%概率命中)';
        }
      }
    }
    // 生成结果块（结构化：谁用了什么/多少次/效果/胜负/评价）
    var fmtList=function(o){var a=[];for(var k in o){a.push(k+'×'+o[k])}return a.length?a.join('、'):'无'};
    // 结局评价（按剩余防守值比例）
    var myPct=Math.round((meTo/num(pb.主角防守值上限,96))*100);
    var verdict='';
    if(youWin){
      verdict=(meTo<=0?'惨胜':myPct<=25?'残血险胜':myPct<=50?'险胜':myPct<=75?'稳健取胜':'完胜');
    }else{
      verdict=(herTo>0&&meTo<=0?'惨败':myPct<=25?'惜败':myPct<=50?'落败':'被碾压');
    }
    var skillExpStr='';
    for(var sk2 in exp){var _csk2=obj(obj(obj(p.技能)[sk2]));var _gsk2=gainExp(num(_csk2.等级,1),num(_csk2.经验,0),num(exp[sk2],0));skillExpStr+=(skillExpStr?',':'')+sk2+'+'+exp[sk2]+'→Lv'+_gsk2.等级+'·经验'+_gsk2.经验}
    var expStr=skillExpStr||'无';
    var herExpStr='';
    var herMainName=obj(obj(c.技能)).名||'';
    for(var hsk in sts.herSkills){
      var htag=(hsk===herMainName)?'(主)':'(组)';
      var delta=num(sts.herSkills[hsk],0)*15;
      var nlv=null,nexp=null;
      if(hsk===herMainName&&herExpUpdates){nlv=herExpUpdates.等级;nexp=herExpUpdates.经验}
      else if(herGroupExp&&herGroupExp[hsk]){nlv=herGroupExp[hsk].等级;nexp=herGroupExp[hsk].经验}
      if(nlv!==null&&nexp!==null){herExpStr+=(herExpStr?',':'')+hsk+htag+'+'+delta+'→Lv'+nlv+'·经验'+nexp}
      else{herExpStr+=(herExpStr?',':'')+hsk+htag+'+'+delta}
    }
    if(!herExpStr)herExpStr='无';
    // 她行动汇总
    var herSkillS=fmtList(sts.herSkills),herItemS=fmtList(sts.herItems),herHealS=fmtList(sts.herHeals);
    var myItemS=fmtList(sts.myItems),myHealS=fmtList(sts.myHeals);
    // BUFF 汇总
    var pBufS=[];for(var pbk2 in pbuffs){pBufS.push(pbk2+'('+num(pbuffs[pbk2].剩余回合,0)+'回合)')}
    var hBufS=[];for(var hbk2 in hbuffs){hBufS.push(hbk2+'('+num(hbuffs[hbk2].剩余回合,0)+'回合)')}
    // 战利品掉落（RPG）：她败→40%掉1件道具给你；缴械≥60→技能心得(随机技能+30经验)
    var lootNote='';
    if(youWin){
      var _citems=obj(c.道具栏);var _ckeys=Object.keys(_citems);
      if(_ckeys.length&&Math.random()<0.4){var _pick=_ckeys[Math.floor(Math.random()*_ckeys.length)];var _amt=num(_citems[_pick],1);_citems[_pick]=Math.max(0,_amt-1);if(!obj(p.道具栏)[_pick])p.道具栏[_pick]=0;p.道具栏[_pick]=num(p.道具栏[_pick],0)+1;lootNote='缴获『'+_pick+'』×1'}
      if(num(c.缴械值,0)>=60){var _psk=Object.keys(obj(p.技能));if(_psk.length){var _p2=_psk[Math.floor(Math.random()*_psk.length)];var _gL=gainExp(num(obj(obj(p.技能)[_p2]).等级,1),num(obj(obj(p.技能)[_p2]).经验,0),30);obj(obj(p.技能)[_p2]).等级=_gL.等级;obj(obj(p.技能)[_p2]).经验=_gL.经验;if(!expGain[_p2])expGain[_p2]=0;expGain[_p2]+=30;lootNote+=(lootNote?'；':'')+'技能心得→'+_p2+'+30经验'}}
    }
    State.resultText='【战斗结算】目标='+tgt+'｜回合数='+pb.回合+'｜结果='+(youWin?'你胜':'你败')+'('+verdict+')\n'
      +'你方：技能['+fmtList(sts.mySkills)+'] 道具['+myItemS+'] 恢复['+myHealS+'] 总伤害='+sts.myTotalDmg+' 剩余防守值'+meTo+'/'+num(pb.主角防守值上限,96)+'('+myPct+'%)\n'
      +'她方：技能['+herSkillS+'] 道具['+herItemS+'] 恢复['+herHealS+'] 总反击='+sts.herTotalDmg+' 剩余防守值'+Math.max(0,herTo)+'/'+herMaxDef+'('+Math.round((Math.max(0,herTo)/herMaxDef)*100)+'%)\n'
      +'缴械值：'+(youWin?'+'+jxChange:jxChange)+' → 现为'+jx+'/100 随机科目'+(subjectChange>0?'+':'')+subjectChange+'\n'
      +'经验：你['+expStr+'] 她['+herExpStr+']\n'
      +(buyNote?('她动向：'+buyNote+'\n'):'')
      +(ejNote?('生理：'+ejNote+'\n'):'')
      +(pBufS.length||hBufS.length?('BUFF状态：你['+(pBufS.join('、')||'无')+'] 她['+(hBufS.join('、')||'无')+']\n'):'')
      +(lootNote?('战利品：'+lootNote+'\n'):'')
      +'注：以上数值为【战斗结算】块结果，AI 必须按此数值写回 stat_data 变量（唯一真源），勿自行估算或重算。';
  }

  // 写回变量（通过 Mvu.replaceMvuData）
  persistBattle(pb,herExpUpdates,playerExpUpdates,healExpUpdate||null,herGroupExp);

  // 清空选择
  State.selSkills=[];State.actionText='';State.pendingHeal=null;
  render();
}

/* 写回战斗状态到变量 */
function persistBattle(pb,herExpUpdates,playerExpUpdates,healExpUpdate,herGroupExp){
  // 多人战斗：当前战斗目标='多人' 时，以目标列表第一个为主目标结算（显示层已渲染每个参与者的格子）
  var _ydsMainTgt=function(sd){
    var raw=obj(sd.排班).当前战斗目标;
    if(raw==='多人'){
      var tl=(sd.排班.战斗&&sd.排班.战斗.目标列表)||[];
      return tl.length?tl[0]:raw;
    }
    return raw;
  };
  try{
    var Mvu2=getMvu();
    if(Mvu2&&typeof Mvu2.replaceMvuData==='function'){
      var opt=getMessageOption();
      var mvuData=Mvu2.getMvuData(opt);
      if(mvuData){
        if(mvuData.stat_data===undefined){
          if(mvuData.排班||mvuData.玩家||mvuData.时间||mvuData.女性角色){mvuData={stat_data:mvuData}}
          else{mvuData.stat_data={}}
        }
        if(!mvuData.stat_data.排班)mvuData.stat_data.排班={};
        mvuData.stat_data.排班.战斗=pb;
        // 同步主角技能经验与等级（写回 玩家.技能.X）
        if(playerExpUpdates&&typeof playerExpUpdates==='object'){
          if(!mvuData.stat_data.玩家)mvuData.stat_data.玩家={};
          if(!mvuData.stat_data.玩家.技能)mvuData.stat_data.玩家.技能={};
          for(var kk in playerExpUpdates){
            var pu=playerExpUpdates[kk];
            if(mvuData.stat_data.玩家.技能[kk]){
              mvuData.stat_data.玩家.技能[kk].等级=pu.等级;
              mvuData.stat_data.玩家.技能[kk].经验=pu.经验;
            }else{
              mvuData.stat_data.玩家.技能[kk]={等级:pu.等级,经验:pu.经验};
            }
          }
        }
        // 同步她技能经验与等级（单人传 {等级,经验}；多人传 {角色名:{等级,经验,技能组:{},恢复:{}}}）
        if(herExpUpdates!==undefined&&herExpUpdates!==null){
          if(('等级'in herExpUpdates)||('经验'in herExpUpdates)){
            // 单目标旧格式
            var tgt=_ydsMainTgt(mvuData.stat_data);
            if(tgt&&mvuData.stat_data.女性角色&&mvuData.stat_data.女性角色[tgt]){
              if(!mvuData.stat_data.女性角色[tgt].技能)mvuData.stat_data.女性角色[tgt].技能={};
              mvuData.stat_data.女性角色[tgt].技能.经验=herExpUpdates.经验;
              mvuData.stat_data.女性角色[tgt].技能.等级=herExpUpdates.等级;
            }
          }else{
            // 多目标格式：遍历写回每个角色的主技能/技能组/恢复技能（多人战斗全员成长）
            for(var _hkn in herExpUpdates){
              var _he2=herExpUpdates[_hkn];
              if(!_he2||typeof _he2!=='object')continue;
              var _hch=mvuData.stat_data.女性角色&&mvuData.stat_data.女性角色[_hkn];
              if(!_hch)continue;
              if(_he2.等级!==undefined){
                if(!_hch.技能)_hch.技能={};
                _hch.技能.等级=_he2.等级;
                _hch.技能.经验=_he2.经验;
              }
              if(_he2.技能组){
                var _hSk=obj(_hch.技能);
                if(!_hSk.技能组)_hSk.技能组={};
                for(var _hgk in _he2.技能组){
                  var _hge=_he2.技能组[_hgk];
                  if(_hSk.技能组[_hgk]){_hSk.技能组[_hgk].等级=_hge.等级;_hSk.技能组[_hgk].经验=_hge.经验}
                  else{_hSk.技能组[_hgk]={等级:_hge.等级,经验:_hge.经验}}
                }
              }
              if(_he2.恢复){
                if(!_hch.恢复技能)_hch.恢复技能={};
                _hch.恢复技能.名=_he2.恢复.名||_hch.恢复技能.名||'';
                _hch.恢复技能.等级=_he2.恢复.等级;
                _hch.恢复技能.经验=_he2.恢复.经验;
              }
            }
          }
        }
        // 同步恢复技能经验与等级（写回 玩家.恢复技能.X）
        if(healExpUpdate&&healExpUpdate.key){
          if(!mvuData.stat_data.玩家)mvuData.stat_data.玩家={};
          if(!mvuData.stat_data.玩家.恢复技能)mvuData.stat_data.玩家.恢复技能={};
          if(mvuData.stat_data.玩家.恢复技能[healExpUpdate.key]){
            mvuData.stat_data.玩家.恢复技能[healExpUpdate.key].等级=healExpUpdate.等级;
            mvuData.stat_data.玩家.恢复技能[healExpUpdate.key].经验=healExpUpdate.经验;
          }else{
            mvuData.stat_data.玩家.恢复技能[healExpUpdate.key]={等级:healExpUpdate.等级,经验:healExpUpdate.经验};
          }
        }
        // 同步道具栏消耗（玩家，从 State.data 读当前值）
        var stItems=obj(S()&&S().玩家&&S().玩家.道具栏);
        if(!mvuData.stat_data.玩家)mvuData.stat_data.玩家={};
        if(!mvuData.stat_data.玩家.道具栏)mvuData.stat_data.玩家.道具栏={};
        for(var ik in stItems){mvuData.stat_data.玩家.道具栏[ik]=stItems[ik]}
        // 同步恢复技能等级到变量（确保下次面板读到新等级）
        if(!mvuData.stat_data.玩家.恢复技能)mvuData.stat_data.玩家.恢复技能={};
        var stHeal=obj(S()&&S().玩家&&S().玩家.恢复技能);
        for(var hk in stHeal){
          if(!mvuData.stat_data.玩家.恢复技能[hk])mvuData.stat_data.玩家.恢复技能[hk]={};
          mvuData.stat_data.玩家.恢复技能[hk].等级=num(stHeal[hk].等级,1);
          mvuData.stat_data.玩家.恢复技能[hk].经验=num(stHeal[hk].经验,0);
        }
        // 同步玩家数值变化（勃起度/体力 等，从 State.data 读）
        var stP=obj(S()&&S().玩家);
        if(!mvuData.stat_data.玩家)mvuData.stat_data.玩家={};
        mvuData.stat_data.玩家.勃起度=num(stP.勃起度,0);
        mvuData.stat_data.玩家.体力=num(stP.体力,0);
        // 同步玩家生理（射精次数/冷却）
        if(stP&&stP.生理)mvuData.stat_data.玩家.生理=stP.生理;
        // 同步她生理周期（月经/怀孕）
        if(tgtH&&mvuData.stat_data.女性角色&&mvuData.stat_data.女性角色[tgtH]){
          var stHer2=obj(S()&&S().女性角色&&S().女性角色[tgtH]);
          if(stHer2&&stHer2.生理周期)mvuData.stat_data.女性角色[tgtH].生理周期=stHer2.生理周期;
        }
        // 同步她道具栏消耗 + 她恢复技能等级（从 State.data 读）
        var tgtH=_ydsMainTgt(mvuData.stat_data);
        if(tgtH&&mvuData.stat_data.女性角色&&mvuData.stat_data.女性角色[tgtH]){
          var stHer=obj(S()&&S().女性角色&&S().女性角色[tgtH]);
          if(stHer&&stHer.道具栏)mvuData.stat_data.女性角色[tgtH].道具栏=stHer.道具栏;
          if(stHer&&stHer.恢复技能)mvuData.stat_data.女性角色[tgtH].恢复技能=stHer.恢复技能;
        }
        // 同步她技能组经验（本回合用了技能组里的技能）
        if(herGroupExp&&typeof herGroupExp==='object'&&tgtH&&mvuData.stat_data.女性角色&&mvuData.stat_data.女性角色[tgtH]){
          var herSk=obj(mvuData.stat_data.女性角色[tgtH].技能);
          if(!herSk.技能组)herSk.技能组={};
          for(var gk in herGroupExp){
            var ge=herGroupExp[gk];
            if(herSk.技能组[gk]){herSk.技能组[gk].等级=ge.等级;herSk.技能组[gk].经验=ge.经验}
            else{herSk.技能组[gk]={等级:ge.等级,经验:ge.经验}}
          }
        }
        // 若已分出胜负，写回她缴械值
        if(State.finished){
          var tgt2=_ydsMainTgt(mvuData.stat_data);
          if(tgt2&&mvuData.stat_data.女性角色&&mvuData.stat_data.女性角色[tgt2]){
            mvuData.stat_data.女性角色[tgt2].缴械值=clamp(num(mvuData.stat_data.女性角色[tgt2].缴械值,0)+num(State.jxChange,0),0,100);
            // 随机科目+学业总分写回(与结算块一致)
            var subjC=num(State.subjectChange,0);
            if(subjC!==0){
              var subjList=['语文','数学','英语','物理','化学','生物'];
              var subjName=subjList[Math.floor(Math.random()*6)];
              if(!mvuData.stat_data.玩家.各科)mvuData.stat_data.玩家.各科={};
              mvuData.stat_data.玩家.各科[subjName]=clamp(num(mvuData.stat_data.玩家.各科[subjName],0)+subjC,0,150);
              mvuData.stat_data.玩家.学业总分=clamp(num(mvuData.stat_data.玩家.学业总分,0)+subjC,0,750);
            }
            mvuData.stat_data.女性角色[tgt2].战斗次数=num(mvuData.stat_data.女性角色[tgt2].战斗次数,0)+1;
            mvuData.stat_data.女性角色[tgt2].缴械次数=num(mvuData.stat_data.女性角色[tgt2].缴械次数,0)+1;
            if(State.resultText.indexOf('你胜')>=0){mvuData.stat_data.女性角色[tgt2].败场=num(mvuData.stat_data.女性角色[tgt2].败场,0)+1}
            else{mvuData.stat_data.女性角色[tgt2].胜场=num(mvuData.stat_data.女性角色[tgt2].胜场,0)+1}
            mvuData.stat_data.玩家.今日胜场=num(mvuData.stat_data.玩家.今日胜场,0)+(State.resultText.indexOf('你胜')>=0?1:0);
            mvuData.stat_data.玩家.今日败场=num(mvuData.stat_data.玩家.今日败场,0)+(State.resultText.indexOf('你胜')>=0?0:1);
            // 玩家缴械值：只有败了才累计被缴械（1~5，按本场程度），赢了不产生缴械值
            var _pj=Math.min(5,Math.max(1,Math.ceil(Math.abs(num(State.jxChange,2))/2)));
            if(State.resultText.indexOf('你胜')<0){mvuData.stat_data.玩家.累计被缴械=num(mvuData.stat_data.玩家.累计被缴械,0)+_pj}
          }
          mvuData.stat_data.排班.战斗状态='已结算';
          // 战斗结束重置回合（否则下一场 initBattleIfNeeded 按 rounds!==0 跳过初始化 → 防守值滞留 0、回合从上一场续）
          try{if(mvuData.stat_data.排班.战斗)mvuData.stat_data.排班.战斗.回合=0}catch(e4){}
          // 更新今日排班场次结果（面板自动维护：结果=胜/败，是否参战=true；当前时段无场次则自动补记）
          try{
            if(!mvuData.stat_data.排班.今日场次)mvuData.stat_data.排班.今日场次={};
            var ydsS=mvuData.stat_data.排班.今日场次;
            var ydsSlot=String(obj(mvuData.stat_data.时间).时段||'');
            var ydsTarget=_ydsMainTgt(mvuData.stat_data);
            var ydsResult=State.resultText.indexOf('你胜')>=0?'胜':'败';
            if(ydsSlot){
              if(!ydsS[ydsSlot])ydsS[ydsSlot]={参与者:ydsTarget||'',结果:'未开战',是否参战:false};
              ydsS[ydsSlot].结果=ydsResult;ydsS[ydsSlot].是否参战=true;
            }
          }catch(e9){}
        }
        Mvu2.replaceMvuData(mvuData,opt);
      }
    }
  }catch(e){console.error('persistBattle',e)}
}

/* 副API配置存取（localStorage 持久化，不可用时兜底存 stat_data） */
function apiCfgSave(){
  var cfg={mode:State.apiMode,preset:State.apiPreset,url:State.apiUrl,key:State.apiKey,model:State.apiModel,temp:State.apiTemp,maxtok:State.apiMaxTokens,on:State.flavorOn};
  var ok=false;
  try{localStorage.setItem('yu_wang_api_cfg',JSON.stringify(cfg));ok=true}catch(e){}
  if(!ok){ // 兜底：存到 stat_data（读完整表→更新 stat_data→写回完整表，保留 schema/initialized_lorebooks）
    try{
      var d=S();if(!d.玩家)d.玩家={};d.玩家.副API配置=cfg;
      var Mvu3=getMvu();
      if(Mvu3&&Mvu3.getMvuData&&Mvu3.replaceMvuData){
        var opt3={type:'message',message_id:'latest'};
        var full3=Mvu3.getMvuData(opt3);
        if(full3&&typeof full3==='object'){
          if(full3.stat_data===undefined&&(full3.排班!==undefined||full3.玩家!==undefined||full3.女性角色!==undefined||full3.时间!==undefined))full3={stat_data:full3};
          full3.stat_data=d;
          Mvu3.replaceMvuData(full3,opt3);
        }
      }
    }catch(e2){}
  }
}
function apiCfgLoad(){
  var cfg=null;
  try{
    var raw=localStorage.getItem('yu_wang_api_cfg');
    if(raw)cfg=JSON.parse(raw);
  }catch(e){}
  if(!cfg){ // 兜底：从 stat_data 读
    try{cfg=obj(S()&&S().玩家&&S().玩家.副API配置)||null}catch(e2){}
  }
  if(cfg){
    if(cfg.mode)State.apiMode=cfg.mode;
    if(cfg.preset!==undefined)State.apiPreset=cfg.preset;
    if(cfg.url!==undefined)State.apiUrl=cfg.url;
    if(cfg.key!==undefined)State.apiKey=cfg.key;
    if(cfg.model!==undefined)State.apiModel=cfg.model;
    if(cfg.temp!==undefined)State.apiTemp=cfg.temp;
    if(cfg.maxtok!==undefined)State.apiMaxTokens=cfg.maxtok;
    if(cfg.on!==undefined)State.flavorOn=cfg.on;
  }
  // 拉取代理预设列表（酒馆助手接口）
  try{
    var gpn=pickHostFn('getProxyPresetNames');
    if(gpn){var ns=gpn();if(ns&&ns.length)State.proxyNames=ns}
  }catch(e){}
}
function renderApiSettings(){
  var html='<div class="api-settings">'
    +'<div class="as-title">🔧 副API设置（描写模式）<span class="as-close" data-act="close-api">收起 ✕</span></div>';
  // 模式
  html+='<div class="as-mode">'
    +'<button data-act="api-mode" data-mode="preset"'+(State.apiMode==='preset'?' class="on"':'')+'>跟随当前预设</button>'
    +'<button data-act="api-mode" data-mode="proxy"'+(State.apiMode==='proxy'?' class="on"':'')+'>代理预设</button>'
    +'<button data-act="api-mode" data-mode="custom"'+(State.apiMode==='custom'?' class="on"':'')+'>自定义API</button>'
    +'</div>';
  if(State.apiMode==='proxy'){
    var opt='<option value="">— 选择代理预设 —</option>';
    for(var i=0;i<State.proxyNames.length;i++){
      var pn=State.proxyNames[i];
      opt+='<option value="'+esc(pn)+'"'+(State.apiPreset===pn?' selected':'')+'>'+esc(pn)+'</option>';
    }
    html+='<div class="as-row"><label>预设</label><select data-act="api-preset">'+opt+'</select></div>'
      +'<div class="as-row"><label>模型</label><select id="api-model">'+modelOptions()+ '</select> <button class="as-mini" data-act="load-models" id="load-models-btn">🔄 加载</button></div>';
  }else if(State.apiMode==='custom'){
    html+='<div class="as-row"><label>API地址</label><input type="text" id="api-url" value="'+esc(State.apiUrl)+'" placeholder="https://your-proxy-url.com"></div>'
      +'<div class="as-row"><label>API Key</label><input type="password" id="api-key" value="'+esc(State.apiKey)+'" placeholder="sk-..."></div>'
      +'<div class="as-row"><label>模型</label><select id="api-model">'+modelOptions()+ '</select> <button class="as-mini" data-act="load-models" id="load-models-btn">🔄 加载</button></div>';
  }
  // 公共参数
  html+='<div class="as-row"><label>温度</label><select data-act="api-temp">'
    +'<option value="same_as_preset"'+(State.apiTemp==='same_as_preset'?' selected':'')+'>同预设</option>'
    +'<option value="0.6"'+(State.apiTemp==='0.6'?' selected':'')+'>0.6 稳定</option>'
    +'<option value="0.9"'+(State.apiTemp==='0.9'?' selected':'')+'>0.9 活泼</option>'
    +'<option value="1.2"'+(State.apiTemp==='1.2'?' selected':'')+'>1.2 发散</option>'
    +'</select></div>'
    +'<div class="as-row"><label>字数上限</label><select data-act="api-maxtok">'
    +'<option value="same_as_preset"'+(State.apiMaxTokens==='same_as_preset'?' selected':'')+'>同预设</option>'
    +'<option value="200"'+(State.apiMaxTokens==='200'?' selected':'')+'>200</option>'
    +'<option value="300"'+(State.apiMaxTokens==='300'?' selected':'')+'>300</option>'
    +'<option value="500"'+(State.apiMaxTokens==='500'?' selected':'')+'>500</option>'
    +'</select></div>'
    +'<div class="as-row"><button class="as-save" data-act="save-api">💾 保存配置</button></div>'
    +'<div class="as-hint">破限：跟随当前预设/代理预设模式会使用酒馆该预设的破限指令与文风（已自动隔离角色卡/世界书，避免重复结算），自定义API模式无破限。留空动作描写=不走API秒结算。配置存本浏览器，下次自动生效。</div>'
    +'</div>';
  return html;
}

function modelOptions(){
  // State.modelList 由 loadModels 填充；当前选中值优先显示
  var cur=State.apiModel||'';
  var opt='<option value="">— 选择模型 —</option>';
  if(cur)opt='<option value="'+esc(cur)+'" selected>'+esc(cur)+'（当前）</option>';
  var list=State.modelList||[];
  for(var i=0;i<list.length;i++){
    var m=list[i];
    if(m===cur)continue;
    opt+='<option value="'+esc(m)+'">'+esc(m)+'</option>';
  }
  opt+='<option value="__custom__">✏️ 手动输入…</option>';
  return opt;
}
function loadModels(){
  var btn=document.getElementById('load-models-btn');
  if(btn)btn.textContent='⏳ 加载中…';
  var gm=pickHostFn('getModelList');
  var doLoad=function(customApi){
    if(!gm){if(btn)btn.textContent='🔄 加载';return}
    gm(customApi||{}).then(function(list){
      if(list&&list.length){State.modelList=list;apiCfgSave()}
      if(btn)btn.textContent='🔄 加载';
      render();
    }).catch(function(){if(btn)btn.textContent='🔄 加载';render()});
  };
  if(State.apiMode==='custom'){
    // 自定义模式：用当前填的 url/key 拉取
    var u=(document.getElementById('api-url')||{}).value||State.apiUrl;
    var k=(document.getElementById('api-key')||{}).value||State.apiKey;
    doLoad({apiurl:u,key:k});
  }else if(State.apiMode==='proxy'){
    doLoad({proxy_preset:State.apiPreset||undefined});
  }else{
    doLoad({});
  }
}

/* 副API描述模式：本地结算数值 + 副API生成"她的反应/回击"描写
   数值计算一律本地（不依赖副API），副API只负责把干枯日志变成剧情描述。
   generate 不可用时自动降级为纯数值日志。
   只在玩家填写了动作描写时触发（留空 = 纯面板计算，快速结算，不走API）。
   副API设置：面板内"🔧 副API设置"面板，或酒馆「扩展 → 酒馆助手」接口配置。 */
function genFlavorDescribe(roundInfo){
  var gen=pickHostFn('generate');
  if(!gen)return null; // 副API不可用 → 降级纯数值
  if(State.flavorBusy)return null;
  // 玩家没写动作 → 不走API，直接面板计算（快捷模式）
  if(!State.actionText||!String(State.actionText).trim())return null;
  State.flavorBusy=true;
  var prompt='你是欲望都市战斗回合的"描写副模型"。\n'
    +'【硬性要求】\n'
    +'1. 只输出中文叙事描写，2~3句话（约60~120字），不超过150字\n'
    +'2. 严禁输出任何数值、回合数、JSON、结算结果、技能名称列表\n'
    +'3. 严禁改变量、严禁判定胜负、严禁描述"你赢了/输了"结局\n'
    +'4. 只描写：她对你本次动作的身体反应 + 她的回击动作（若她反击）\n'
    +'【玩家本回合动作】'+String(State.actionText||'').slice(0,120)+'\n'
    +'【本回合数据(仅供把握分寸)】你造成伤害'+roundInfo.realDmg+'，她减伤'+roundInfo.herReduce+'；她的行动：'+roundInfo.herAction+'【'+roundInfo.herActionName+'】'+(roundInfo.herDmg?'反击伤害'+roundInfo.herDmg:'（本回合不反击）')+(roundInfo.hsNotes?('，效果：'+roundInfo.hsNotes):'')+'；她防守值剩'+roundInfo.herToPct+'%，你剩'+roundInfo.myHpPct+'%。\n'
    +'【她的性格】'+roundInfo.herName+'。';
  // 组装 generate 配置（按面板副API设置）
  var genCfg={
    user_input:prompt,
    max_chat_history:0,
    should_silence:true
  };
  if(State.apiMode==='preset'){
    // 破限跟随当前对话预设：完整使用酒馆当前预设（含其破限指令与文风），
    // 角色卡/世界书/性格照常带入（描写需要她的性格），仅不传聊天历史、注入"只描写"约束
    genCfg.preset_name='in_use';
    genCfg.injects=[
      {role:'system',content:'你是描写副模型，只输出本回合叙事描写，严禁输出数值/JSON/结算/胜负判定，严禁改变量。',position:'in_chat',depth:0}
    ];
    genCfg.max_chat_history=0;
  }else if(State.apiMode==='proxy'){
    genCfg.custom_api={proxy_preset:State.apiPreset||undefined};
    if(State.apiModel)genCfg.custom_api.model=State.apiModel;
    // 代理预设模式：代理预设自带提示词（含破限），同样注入"只描写"约束、不传历史
    genCfg.injects=[
      {role:'system',content:'你是描写副模型，只输出本回合叙事描写，严禁输出数值/JSON/结算/胜负判定，严禁改变量。',position:'in_chat',depth:0}
    ];
    genCfg.max_chat_history=0;
  }else if(State.apiMode==='custom'){
    genCfg.custom_api={apiurl:State.apiUrl||undefined,key:State.apiKey||undefined,model:State.apiModel||undefined};
    // 自定义API模式：没有预设，纯 user_input 提示词（无破限，靠描写约束）
  }
  if(State.apiTemp&&State.apiTemp!=='same_as_preset')genCfg.custom_api=genCfg.custom_api||{};
  if(State.apiTemp&&State.apiTemp!=='same_as_preset')genCfg.custom_api.temperature=parseFloat(State.apiTemp);
  if(State.apiMaxTokens&&State.apiMaxTokens!=='same_as_preset'){
    if(!genCfg.custom_api)genCfg.custom_api={};
    genCfg.custom_api.max_tokens=parseInt(State.apiMaxTokens,10);
  }
  return gen(genCfg).then(function(msg){
    State.flavorBusy=false;
    var txt=(msg&&msg.text!==undefined)?msg.text:(typeof msg==='string'?msg:JSON.stringify(msg||''));
    txt=String(txt||'').trim();
    // 截断到200字防止失控
    if(txt.length>200)txt=txt.slice(0,200);
    return txt;
  }).catch(function(){State.flavorBusy=false;return null});
}

/* 生成结果并填输入框 */
function sendResult(){
  if(!State.resultText)return;
  var input=findHostTextarea();
  if(input){
    input.value=State.resultText;
    try{input.dispatchEvent(new Event('input',{bubbles:true}))}catch(e){}
    try{input.focus()}catch(e){}
  }
}
function findHostTextarea(){
  for(var i=0;i<TH_HOSTS.length;i++){
    try{
      var doc=TH_HOSTS[i].document;
      if(doc){
        var el=doc.querySelector('#send_textarea textarea')||doc.querySelector('textarea#send_textarea')||doc.querySelector('#send_form textarea');
        if(el)return el;
      }
    }catch(e){}
  }
  return null;
}

/* 事件 */
function bindEvents(){
  var root=document.getElementById('bu-root');
  if(!root)return; // 元素未就绪时跳过绑定,不中断初始化
  root.addEventListener('click',function(e){var __t2=e.target;while(__t2&&__t2!==root){var __a2=__t2.getAttribute&&__t2.getAttribute('data-act');if(__a2==='theme'){ydsToggleTheme();return}if(__a2==='bg'){ydsToggleBg();return}if(__a2==='her-detail'){var _dn=__t2.getAttribute&&__t2.getAttribute('data-tgt');var _de=document.getElementById('yds-detail-'+_dn);if(_de){var _show=_de.style.display!=='none';_de.style.display=_show?'none':'block';__t2.textContent=_show?'📋 查看详情（技能/道具/生理）':'📕 收起详情'}return}__t2=__t2.parentNode}});
  root.addEventListener('click',function(e){
    var t=e.target;
    while(t&&t!==root){
      var act=t.getAttribute&&t.getAttribute('data-act');
      if(act){
        if(act==='toggle-skill'){
          var sk=t.getAttribute('data-skill');
          if(num(State.playerSkillCd[sk],0)>0){render();return}
          var idx=State.selSkills.indexOf(sk);
          if(idx>=0){State.selSkills.splice(idx,1)}
          else if(State.selSkills.length<1){State.selSkills=[sk];State.selItem=''} // 单选+与道具互斥
          render();
        }else if(act==='toggle-item'){
          var it=t.getAttribute('data-item');
          if(State.selSkills.length>0){render();return}
          State.selItem=(State.selItem===it)?'':it;
          render();
        }else if(act==='use-heal'){
          var hk=t.getAttribute('data-heal');
          // 互斥：选了技能/道具时恢复技能禁用（每回合只做一个行动）
          if(State.selSkills.length>0||!!State.selItem){render();return}
          if(num(State.healCd[hk],0)<=0){
            State.pendingHeal=hk;
            if(isMultiBattle()){executeRoundMulti()}
            else{executeRound()}
          }
        }else if(act==='choose-target'){
          var tt=t.getAttribute('data-tgt');
          // 已溃败目标不可选
          var _pbm=battleState();
          var _tb=null;
          if(_pbm&&_pbm.目标列表){for(var _ti=0;_ti<_pbm.目标列表.length;_ti++){var _tt2=_pbm.目标列表[_ti];var _nm2=(typeof _tt2==='string')?_tt2:_tt2.名;if(_nm2===tt){_tb=_tt2;break}}}
          if(_tb&&typeof _tb!=='string'&&num(_tb.防守值,0)<=0){render();return}
          State.selTarget=(State.selTarget===tt)?'':tt;
          render();
        }else if(act==='attack'){
          var action=(document.getElementById('action-input')||{}).value||'';
          State.actionText=action;
          if(isMultiBattle()){executeRoundMulti()}
          else{executeRound()}
        }else if(act==='send-result'){
          sendResult();
        }else if(act==='toggle-flavor'){
          State.flavorOn=!State.flavorOn;
          apiCfgSave();
          render();
        }else if(act==='toggle-api'){
          State.apiPanelOpen=!State.apiPanelOpen;
          render();
        }else if(act==='close-api'){
          State.apiPanelOpen=false;
          render();
        }else if(act==='api-mode'){
          State.apiMode=t.getAttribute('data-mode');
          render();
        }else if(act==='api-preset'){
          State.apiPreset=t.value;
        }else if(act==='api-temp'){
          State.apiTemp=t.value;
        }else if(act==='api-maxtok'){
          State.apiMaxTokens=t.value;
        }else if(act==='load-models'){
          loadModels();
        }else if(act==='save-api'){
          // 读取输入框 + 模型下拉
          var u=(document.getElementById('api-url')||{}).value;if(u!==undefined)State.apiUrl=u;
          var k=(document.getElementById('api-key')||{}).value;if(k!==undefined)State.apiKey=k;
          var mSel=(document.getElementById('api-model')||{});
          if(mSel.value==='__custom__'){
            var mc=prompt('输入模型名称：',State.apiModel||'');
            if(mc)State.apiModel=mc;
          }else if(mSel.value!==undefined&&mSel.value!==''){
            State.apiModel=mSel.value;
          }
          apiCfgSave();
          var btn=t;btn.textContent='✅ 已保存';setTimeout(function(){if(btn)btn.textContent='💾 保存配置'},1200);
          render();
        }
        return;
      }
      t=t.parentNode;
    }
  });
  root.addEventListener('input',function(e){
    var el=e.target;
    if(el&&el.id==='action-input'){State.actionText=el.value}
  });
}

/* 初始化 */
(function init(){
  bindEvents();
  var autoRefresh=function(){setTimeout(refresh,400)};
  try{if(typeof eventOn==='function'){eventOn('GENERATION_ENDED',autoRefresh);eventOn('MESSAGE_EDITED',autoRefresh);eventOn('mag_variable_update_ended',autoRefresh)}}catch(e){}
  try{var Mvu=getMvu();if(Mvu&&Mvu.events&&Mvu.events.VARIABLE_UPDATE_ENDED&&typeof eventOn==='function'){eventOn(Mvu.events.VARIABLE_UPDATE_ENDED,autoRefresh)}}catch(e){}
  window.addEventListener('message',function(e){
    try{
      var data=e.data;
      if(data&&data.type==='yds-mvu-stat-data'&&data.stat_data){
        var mesId=resolveMessageId();
        if(mesId>=0&&typeof data.messageId==='number'&&data.messageId>=0&&data.messageId!==mesId)return;
        if(hasData(data.stat_data)){
          cachedStatFromBridge=data.stat_data;
          State.data=deepMergeStat(DEFAULT_STAT,data.stat_data);
          State.loading=false;initBattleIfNeeded();render();
        }
        return;
      }
      var t=(data&&data.type)||data||'';
      if(typeof t==='string'&&(t.indexOf('generation_ended')>=0||t.indexOf('message_edit')>=0))autoRefresh();
    }catch(x){}
  });
  var embedded=parseEmbeddedStat();
  if(embedded){cachedStatFromBridge=embedded;State.data=deepMergeStat(DEFAULT_STAT,embedded)}
  requestStatFromBridge();refresh();
})();
function refresh(){
  try{apiCfgLoad()}catch(e){} // 副API配置失败不影响渲染
  var stat=readStatData();
  if(hasData(stat)){State.data=stat;State.loading=false}
  try{initBattleIfNeeded()}catch(e){} // 战斗初始化失败不影响渲染
  render();
  waitForReadableStat(6000,function(realStat){
    if(hasData(realStat)){State.data=realStat;State.loading=false}
    try{initBattleIfNeeded()}catch(e){}
    render();requestStatFromBridge();
  });
}

function isMultiBattle(){var pb=battleState();var tl=pb&&pb.目标列表;return !!(tl&&tl.length>1)}
function battleTargets(pb){
  var tl=pb&&pb.目标列表;
  if(tl&&tl.length)return normTargets(tl,S());
  // 单目标兼容：从当前战斗目标构造
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  if(tgt&&tgt!=='多人'){
    var c=obj((d.女性角色||{})[tgt]);
    var pb2=pb||battleState();
    return [{名:tgt,防守值:num(pb2.她防守值,44),防守值上限:num(pb2.她防守值上限,44),减伤修正:num(pb2.她减伤修正,0),缴械值:num(c.缴械值,0),本场经验:{},BUFF:{}}];
  }
  return [];
}

function initMultiIfNeeded(){
  var d=S();var st=obj(d.排班).战斗状态;
  if(st!=='进行中')return;
  var pb=battleState();
  var tl=pb.目标列表;
  if(!tl||!tl.length)return;
  var changed=false;
  // BUG修复：多人战斗主角防守值从不初始化（单人版 initBattleIfNeeded 有，多人版漏了）
  // 现在依赖 num() 默认 96；体力≠80 时上限错误。防守值<=0（未初始化/上一场战败残留）时补体力×1.2。
  if(num(pb.主角防守值,0)<=0){
    var pDef=Math.round(num(obj(d.玩家).体力,80)*1.2);
    pb.主角防守值=pDef;pb.主角防守值上限=pDef;
    changed=true;
  }
  for(var i=0;i<tl.length;i++){
    var t=tl[i];
    if(num(t.防守值上限,0)<=0){
      var c=obj((d.女性角色||{})[t.名]);
      var cap=herDefCap(c);
      t.防守值=cap;t.防守值上限=cap;
      changed=true;
    }
  }
  if(changed){persistBattle(pb,null,null)}
}
function playerExpUpdatesFromGain(expGain,p){
  var updates={};
  for(var kk in expGain){
    var cur=obj(obj(obj(p).技能)[kk]);
    var _g9=gainExp(num(cur.等级,1),num(cur.经验,0),15);var newLv=_g9.等级;var newExp=_g9.经验;
    updates[kk]={等级:newLv,经验:newExp};
  }
  return updates;
}
function executeRoundMulti(){
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  var pb=battleState();
  var p=obj(d.玩家);
  var targets=battleTargets(pb);
  if(!targets.length)return;
  var pPhys=obj(p.生理);
  var ejCdNow=num(pPhys.射精冷却剩余,0);
  var refractory=1;
  if(ejCdNow>0)refractory=ejCdNow>=3?0.6:(ejCdNow===2?0.75:0.9);
  if(ejCdNow>0&&num(p.勃起度,0)<=0&&num(p.性欲,0)<20){State.resultText='【拒战】不应期中且性欲不足、勃起归零，无法勃起，战斗不成立（无败果）。可等冷却或用伟哥。';State.finished=true;render();return;}
  if(num(p.性欲,0)<20&&num(p.勃起度,0)<=0&&!State.pendingHeal&&ejCdNow<=0){State.resultText='【拒战】性欲不足（'+num(p.性欲,0)+'/100，需≥20）且无勃起，无法战斗，战斗不成立（无败果）。';State.finished=true;render();return;}
  // 恢复技能
  var isHealRound=false,healNote='',healSkillKey='',healExpUpdate=null;
  if(State.pendingHeal){
    healSkillKey=State.pendingHeal;State.pendingHeal=null;isHealRound=true;
    var hlv=num(obj(obj(p.恢复技能)[healSkillKey]).等级,1);
    if(healSkillKey==='提肛'){var curDef=num(pb.主角防守值,96),maxDef=num(pb.主角防守值上限,96);var hAmt=Math.min(hlv*4,maxDef-curDef);pb.主角防守值=Math.min(maxDef,curDef+hAmt);healNote='提肛 Lv'+hlv+'：防守值+'+(hAmt>0?hAmt:0);if(hAmt<=0){healNote='提肛 Lv'+hlv+'：防守值已满，转为攻击+1'}}
    else if(healSkillKey==='思维分散'){pb.主角麻痒点=0;healNote='思维分散 Lv'+hlv+'：清除麻痒，体力+5'}
    var hcur=obj(obj(p.恢复技能)[healSkillKey]);var _g1=gainExp(num(hcur.等级,1),num(hcur.经验,0),15);var hNewLv=_g1.等级;var hNewExp=_g1.经验;
    hcur.等级=hNewLv;hcur.经验=hNewExp;
    State.healCd[healSkillKey]=num(HEAL_SKILLS[healSkillKey]?HEAL_SKILLS[healSkillKey].cooldown:3,3);
    healExpUpdate={key:healSkillKey,等级:hNewLv,经验:hNewExp};
    var skills=['（恢复）'];
  }else{
    var skills=State.selSkills.slice();if(!skills.length)skills=['螺旋'];
  }
  // BUFF/冷却递减
  var pbuffs=obj(pb.主角BUFF),hbuffs=obj(pb.她BUFF);
  for(var bi=0;bi<Object.keys(pbuffs).length;bi++){var bk=Object.keys(pbuffs)[bi];pbuffs[bk].剩余回合=num(pbuffs[bk].剩余回合,0)-1;if(pbuffs[bk].剩余回合<=0)delete pbuffs[bk]}
  for(var bj=0;bj<Object.keys(hbuffs).length;bj++){var bk2=Object.keys(hbuffs)[bj];hbuffs[bk2].剩余回合=num(hbuffs[bk2].剩余回合,0)-1;if(hbuffs[bk2].剩余回合<=0)delete hbuffs[bk2]}
  for(var ck in State.healCd){if(State.healCd[ck]>0)State.healCd[ck]--}
  for(var ck2 in State.playerSkillCd){if(State.playerSkillCd[ck2]>0)State.playerSkillCd[ck2]--}
  // 道具使用
  var itemNote='';
  if(State.selItem){
    var itemKey=State.selItem;
    if(num(obj(p.道具栏)[itemKey],0)>0){
      var eff=getItemEffect(itemKey);
      if(eff){
        if(eff.self){
          if(eff.self.攻击){pbuffs['攻击强化']={剩余回合:eff.rounds,效果值:eff.self.攻击}}
          if(eff.self.勃起){p.勃起度=clamp(num(p.勃起度,0)+eff.self.勃起,0,100)}
          if(eff.self.清麻痒){pb.主角麻痒点=0;pb.主角防守值=Math.min(num(pb.主角防守值上限,96),num(pb.主角防守值,96)+eff.self.回复)}
        }
        if(eff.her){
          if(eff.her.减伤){hbuffs['道具减伤']={剩余回合:eff.rounds,效果值:eff.her.减伤}}
          if(eff.her.敏感度){hbuffs['敏感度']={剩余回合:eff.rounds,效果值:eff.her.敏感度}}
          if(eff.her.麻痒){pb.麻痒点=num(pb.麻痒点,0)+eff.her.麻痒}
        }
      }
      obj(p.道具栏)[itemKey]=Math.max(0,num(obj(p.道具栏)[itemKey],0)-1);
      itemNote='使用道具：'+itemKey;
      State.selItem='';
    }
  }
  // 存活目标（防守值>0 者才参战）
  var alive=targets.filter(function(t){return num(t.防守值,0)>0});
  // 确定玩家攻击目标：State.selTarget 若已溃败/失效则回退到第一个存活
  var atkName=State.selTarget||'';
  var atkTarget=null;
  for(var ati=0;ati<alive.length;ati++){if(alive[ati].名===atkName){atkTarget=alive[ati];break}}
  if(!atkTarget&&alive.length)atkTarget=alive[0];
  // 灼烧 DoT：辣椒油灼烧选中目标（异常状态）
  if(hbuffs['灼烧']&&atkTarget&&num(hbuffs['灼烧'].效果值,0)>0){atkTarget.防守值=Math.max(0,num(atkTarget.防守值,0)-num(hbuffs['灼烧'].效果值,0));itemNote+=(itemNote?'；':'')+'🔥灼烧'+atkTarget.名+'防守值-'+hbuffs['灼烧'].效果值}
  // ===== 玩家攻击（RPG 目标类型：单体技能打选中目标；「次数翻倍」群体对所有存活目标各结算一次）=====
  var totalDmg=0,expGain={},skillDmgList=[];
  var singleSkills=skills.filter(function(k){return k!=='次数翻倍'});
  var aoeSkills=skills.filter(function(k){return k==='次数翻倍'});
  var aoeDmgMap={};
  if(!isHealRound&&atkTarget){
    for(var i=0;i<singleSkills.length;i++){
      var k=singleSkills[i];
      var lv=num(obj(obj(p.技能)[k]).等级,1);
      var baseDmg=skillDmg(k,lv);
      totalDmg+=baseDmg;
      expGain[k]=(expGain[k]||0)+15;
      skillDmgList.push({key:k,lv:lv,dmg:Math.round(baseDmg*10)/10,eff:''});
      if(/加倍|翻倍/.test(k))State.playerSkillCd[k]=1;
    }
    // 次数翻倍（群体）：每个存活目标各结算一次（技能基础伤害）
    for(var ai=0;ai<aoeSkills.length;ai++){
      var ka=aoeSkills[ai];
      var lva=num(obj(obj(p.技能)[ka]).等级,1);
      expGain[ka]=(expGain[ka]||0)+15;
      State.playerSkillCd[ka]=1;
      for(var aj=0;aj<alive.length;aj++){
        var ad=skillDmg(ka,lva);
        aoeDmgMap[alive[aj].名]=(aoeDmgMap[alive[aj].名]||0)+ad;
        skillDmgList.push({key:ka+'·群体',lv:lva,dmg:Math.round(ad*10)/10,eff:'×'+alive.length});
      }
    }
  }
  var bonus=stateBonus(p);
  if(refractory<1)bonus=refractory<=0.6?0:Math.round(bonus/2);
  if(num(p.体力,0)<30)bonus-=1;
  // 对每个存活目标结算玩家伤害（选中目标=单体+群体，其余=群体）
  var atkRes={},atkLine='';
  if(!isHealRound){
    for(var mi=0;mi<alive.length;mi++){
      var m=alive[mi];
      var mc2=obj((d.女性角色||{})[m.名]);
      var src=m===atkTarget?totalDmg:0;
      if(aoeDmgMap[m.名])src+=aoeDmgMap[m.名];
      if(src<=0)continue;
      var jya2=num(mc2.欲望积压,0);
      var yz2=jya2>=80?-4:(jya2>=60?-2:0);
      if(jya2>=100){m.防守值=Math.max(0,num(m.防守值,0)-15)}
      var pd2=ydsPeriodDebuff(mc2);yz2+=pd2.pf;
      var hd2=num(mc2.名器防御,6);
      var chi2=num(obj(obj(mc2.能力值)).持久,5);
      var red2=Math.round(hd2+chi2/3+yz2+num(m.减伤修正,0)+num(pb.她减伤修正,0));
      var tb2=obj(m.BUFF);
      for(var b3 in tb2){if(b3==='道具减伤'||b3==='冰袋')red2+=num(tb2[b3].效果值,0);if(b3==='敏感度')red2-=Math.floor(num(tb2[b3].效果值,0)/10)}
      red2=Math.max(0,red2);
      var pab2=0;for(var pb2 in pbuffs){if(pb2==='攻击强化'||pb2==='提肛强化')pab2+=num(pbuffs[pb2].效果值,0)}
      if(State.selSkills.indexOf('热量翻倍')>=0&&/雪窦|寒玉|雪润|冰守/.test(mc2.名器||'')){src=Math.round(src*2)}
      var d2=Math.max(0,Math.round((src+bonus+pab2)*refractory-red2));
      // RPG 暴击/闪避：玩家暴击(5%+平均技能等级×0.5%+勃起≥90+15%)；她闪避(等级×0.3%)
      if(d2>0){var _avgLv3=0,_lc3=0;for(var _sv3 in obj(p.技能)){_avgLv3+=num(obj(obj(p.技能)[_sv3]).等级,1);_lc3++}var critRate3=5+(_lc3?_avgLv3/_lc3*0.5:0)+(num(p.勃起度,0)>=90?15:0);if(Math.random()*100<critRate3)d2=Math.round(d2*1.5);if(Math.random()*100<lvEvade(num(obj(obj(mc2.技能)).等级,1)))d2=0}
      m.防守值=Math.max(0,num(m.防守值,0)-d2);
      atkRes[m.名]={dmg:d2,reduce:red2};
      atkLine+=(atkLine?'；':'')+m.名+'【防守值 '+Math.max(0,Math.round(m.防守值))+'/'+herDefCap(mc2)+'】受'+d2+'（减伤'+red2+'）';
    }
    if(!atkLine)atkLine='无人受击';
  }else{
    atkLine=healNote+'（本回合未攻击，仅防御）';
  }
  var atkDmg=atkTarget&&atkRes[atkTarget.名]?atkRes[atkTarget.名].dmg:0;
  // ===== 她的 AI 回合（RPG 式）：每个存活目标独立决策、独立行动、独立日志 =====
  var meFrom=num(pb.主角防守值,96);
  var meNow=meFrom;
  if(!State.herState)State.herState={};var herPerState=State.herState;
  var logLines=[];
  for(var i2=0;i2<alive.length;i2++){
    var t=alive[i2];
    var c=obj((d.女性角色||{})[t.名]);
    if(!herPerState[t.名])herPerState[t.名]={};var st=herPerState[t.名];if(!st.healCd)st.healCd=0;if(!st.heal)st.heal=0;if(!st.item)st.item=0;
    if(st.healCd>0)st.healCd--;
    var pdb=ydsPeriodDebuff(c);
    var hs=getHerSkill(c);
    var fan=herAbility(c,'反攻',obj(obj(c.能力值)).反攻);
    var atkMul=num(hs.atkMul,1.0);
    var herDefNow=herDefVal(c);
    var herMaxDef=herDefCap(c);
    var herCurDef=num(t.防守值,0);
    var jy=num(c.欲望积压,0);
    var herMul=pdb.atkMul||1;
    if(num(c.缴械值,0)>=80)herMul*=0.9;
    if(num(p.勃起度,0)>=90)herMul*=1.2;
    // 玩家减伤（RPG 防御）：体力<30 虚脱，她伤害×1.1
    var pDefMul=1,defNote='';
    if(num(p.体力,0)<30){pDefMul=1.1;defNote='你体力<30虚脱，她伤害×1.1'}
    var act='攻击',actName=obj(c.技能).名||'反击',actDmg=0,actNote=hs.note||'',actType='技能攻击';
    var usedCd=num(hs.cd,1)||1;
    // 决策1：残血恢复（防守值<35% 且 有恢复技能 且 每人每场≤2 且 冷却结束）
    var herHealSkillName=obj(obj(c.恢复技能)).名||'';
    if(herHealSkillName&&st.heal<2&&st.healCd<=0&&herCurDef<=herMaxDef*0.35){
      var hLv=num(obj(obj(c.恢复技能)).等级,1);
      var hh=HER_HEALS[herHealSkillName]||{heal:6,extra:''};
      var hAmt=Math.min(num(hh.heal,6)+Math.floor(hLv/2),herMaxDef-herCurDef);
      t.防守值=Math.min(herMaxDef,herCurDef+hAmt);
      st.heal++;st.healCd=3;
      act='恢复';actName=herHealSkillName;actType='恢复';
      actNote='防守值+'+hAmt+(hh.extra?'，'+hh.extra:'');
      st.healUse=(st.healUse||0)+1;
    }else{
      // 决策2：道具（每人每场≤2，按局势智能选）
      var herItems=obj(c.道具栏);var herItemKeys=Object.keys(herItems);
      var usedItem=false;
      if(st.item<2&&herItemKeys.length){
        var chosen=null,reason='';
        var myHpPct=meNow/Math.max(1,num(pb.主角防守值上限,96));
        var myBoqi=num(p.勃起度,0);
        var myAtkBuff=!!pbuffs['攻击强化'];
        if(myAtkBuff&&num(herItems['冰袋'],0)>0){chosen='冰袋';reason='你攻击强化，她用冰袋加固防线'}
        else if(myAtkBuff&&num(herItems['润滑液'],0)>0){chosen='润滑液';reason='你攻势太猛，她用润滑液卸力'}
        else if(myBoqi>=70&&num(herItems['薄荷油'],0)>0){chosen='薄荷油';reason='你勃起炽热，她用薄荷油泼灭你的欲望'}
        else if(herCurDef<=herMaxDef*0.5&&num(herItems['冰袋'],0)>0){chosen='冰袋';reason='她受伤不轻，用冰袋稳住阵脚'}
        else if(myHpPct<=0.4&&num(herItems['辣椒油'],0)>0){chosen='辣椒油';reason='你摇摇欲坠，她辣椒油直击要害'}
        else if(num(herItems['震动环'],0)>0){chosen='震动环';reason='她装上震动环强化反击'}
        else if(num(herItems['辣椒油'],0)>0){chosen='辣椒油';reason='她用辣椒油施加灼辣'}
        else{
          var fb=herItemKeys.filter(function(k){return num(herItems[k],0)>0&&getHerItem(k)});
          if(fb.length){chosen=fb[Math.floor(Math.random()*fb.length)];reason='她使用'+chosen+'应变'}
        }
        if(chosen){
          var hi=getHerItem(chosen);
          if(hi.buff){var hp=herProficiency(c);hbuffs[hi.buff.name]={剩余回合:hi.buff.rounds,效果值:Math.max(1,Math.round(hi.buff.val*hp))}}
          if(hi.atk){
            if(hi.atk.勃起){p.勃起度=clamp(num(p.勃起度,0)+hi.atk.勃起,0,100)}
            if(hi.atk.麻痒){pb.主角麻痒点=num(pb.主角麻痒点,0)+hi.atk.麻痒}
          }
          if(hi.heal){t.失神=0}
          herItems[chosen]=Math.max(0,num(herItems[chosen],0)-1);
          st.item++;
          st.items=st.items||[];st.items.push(chosen);
          act='道具';actName=chosen;actType='道具';actNote=reason;
          usedItem=true;
        }
      }
      if(!usedItem){
        // 决策0：技能组替换（辅助技能随局势，等级各自成长）
        var herMainN0=obj(obj(c.技能)).名||'';
        var herCtxM={herHpPct:herCurDef/Math.max(1,herMaxDef),playerAggro:!!pbuffs['攻击强化']||num(p.勃起度,0)>=80,myHpPct:meNow/Math.max(1,num(pb.主角防守值上限,96))};
        var chosenM=chooseHerSkill(c,herCtxM);
        if(chosenM&&chosenM!==herMainN0){
          var gvM=obj(obj(c.技能).技能组)[chosenM];
          var gLvM=num(gvM.等级,1);
          hs=herSkillWithLv(HER_SKILLS[chosenM]||hs,gLvM);
          atkMul=num(hs.atkMul,1.0);
          actName=chosenM;
          st.grpUse=st.grpUse||{};st.grpUse[chosenM]=(st.grpUse[chosenM]||0)+1;
        }
        // 决策3：技能攻击
        var herDmg=Math.round(((fan*1.5+herDefNow/2)*atkMul)*herMul);
        if(jy>=80)herDmg=Math.round(herDmg*1.25);
        else if(jy>=60)herDmg=Math.round(herDmg*1.1);
        herDmg=Math.round(herDmg*pDefMul);
        var _herCrit2=lvCrit(num(obj(obj(c.技能)).等级,1))+(jy>=80?15:0);
        if(Math.random()*100<_herCrit2){herDmg=Math.round(herDmg*1.5);actNote=(actNote?actNote+'；':'')+'会心反击'}
        actDmg=herDmg;
        act='攻击';actName=obj(c.技能).名||'反击';
        if(defNote)actNote=(actNote?actNote+'；':'')+defNote;
        // 主技能使用次数+1（结算块统一算新值写回）
        st.mainUse=(st.mainUse||0)+1;
        logLines.push(t.名+'【'+actName+'】对你攻击'+herDmg+(hs.note?'（'+hs.note+'）':'')+(jy>=80?'（欲望积压爆发）':jy>=60?'（欲望难耐）':''));
      }
    }
    var _pDefV2=0;for(var _pbk2 in pbuffs){if(_pbk2==='防御强化')_pDefV2+=num(pbuffs[_pbk2].效果值,0)}
    meNow=Math.max(0,meNow-Math.max(0,actDmg-_pDefV2));
    // 逐人独立日志（每人一条：她行动 + 你的防守值变化）
    State.log.push({
      rk:pb.回合,
      you:'—',
      youDmg:0,realDmg:0,
      herDmg:actDmg,
      herActionType:actType,
      herActionName:t.名+'·'+actName,
      herSkillNote:actNote,
      herFrom:meNow+actDmg,herTo:meNow,
      meFrom:meNow+actDmg,meTo:meNow,
      item:'',heal:''
    });
  }
  var meTo=meNow;
  pb.主角防守值=meTo;
  pb.回合=num(pb.回合,0)+1;
  // 兴奋消耗：战斗内每次攻防性欲 -2（数值驱动，面板自动）
  p.性欲=clamp(num(p.性欲,0)-2,0,100);
  // 射精冷却：仅战斗回合递减（每回合 -1，日常不按回合计）
  var _ejPh2=obj(obj(p.生理));
  if(num(_ejPh2.射精冷却剩余,0)>0){_ejPh2.射精冷却剩余=Math.max(0,num(_ejPh2.射精冷却剩余,0)-1)}
  // 玩家行动日志（一条汇总：你攻击了谁/群体打谁）
  State.log.push({
    rk:pb.回合,
    you:isHealRound?'（恢复）':(skills&&skills.length?skills.join('+'):'螺旋'),
    youDmg:atkDmg,
    realDmg:atkDmg,
    herDmg:0,
    herActionType:'玩家回合',
    herActionName:'',
    herSkillNote:atkLine||'',
    herFrom:0,herTo:0,
    meFrom:meFrom,meTo:meTo,
    item:itemNote||'',
    heal:isHealRound?healNote:''
  });
  // 经验（技能+15，写回）
  var exp=obj(pb.本场经验);
  for(var kk in expGain){exp[kk]=num(exp[kk],0)+expGain[kk]}
  // ===== 经验新值（玩家 + 主目标她，AI 照抄 replace 写回，无需计算旧值）=====
  var expStr2='';
  for(var kk3 in exp){var _cs3=obj(obj(obj(p.技能)[kk3]));var _gE2=gainExp(num(_cs3.等级,1),num(_cs3.经验,0),num(exp[kk3],0));expStr2+=(expStr2?',':'')+kk3+'+'+exp[kk3]+'→Lv'+_gE2.等级+'·经验'+_gE2.经验}
  if(!expStr2)expStr2='无';
  var herExpUpdates=null,herExpStr2='';
  // 多目标：每个存活目标各自的主技能/技能组/恢复技能/道具使用次数与经验（写回+显示）
  var herExpMulti={};
  for(var i4=0;i4<alive.length;i4++){
    var t4=alive[i4];
    var _cs4=State.herState[t4.名];
    if(!_cs4)continue;
    var _c4=obj((d.女性角色||{})[t4.名]);
    var _m4=obj(obj(_c4.技能));
    var parts4=[];
    var entry4=null;
    var _useM4=num(_cs4.mainUse,0);
    if(_useM4>0){
      var _gM4=gainExp(num(_m4.等级,1),num(_m4.经验,0),_useM4*15);
      if(!entry4)entry4={};
      entry4.等级=_gM4.等级;entry4.经验=_gM4.经验;
      parts4.push((_m4.名||'主技能')+'(主)×'+_useM4+'+'+(_useM4*15)+'→Lv'+_gM4.等级+'·经验'+_gM4.经验);
    }
    var _gr4=obj(_cs4.grpUse||{});
    var _gkk4=Object.keys(_gr4);
    if(_gkk4.length){
      if(!entry4)entry4={};
      entry4.技能组={};
      for(var _gi4=0;_gi4<_gkk4.length;_gi4++){
        var _gk4=_gkk4[_gi4];
        var _gv4=obj(obj(obj(_c4.技能).技能组)[_gk4]);
        var _gG4=gainExp(num(_gv4.等级,1),num(_gv4.经验,0),_gr4[_gk4]*15);
        entry4.技能组[_gk4]={等级:_gG4.等级,经验:_gG4.经验};
        parts4.push(_gk4+'(组)×'+_gr4[_gk4]+'+'+(_gr4[_gk4]*15)+'→Lv'+_gG4.等级+'·经验'+_gG4.经验);
      }
    }
    var _hu4=num(_cs4.healUse,0);
    if(_hu4>0){
      var _hc4=obj(obj(_c4.恢复技能));
      var _hG4=gainExp(num(_hc4.等级,1),num(_hc4.经验,0),_hu4*15);
      if(!entry4)entry4={};
      entry4.恢复={名:_hc4.名||'恢复',等级:_hG4.等级,经验:_hG4.经验};
      parts4.push((_hc4.名||'恢复')+'(恢复)×'+_hu4+'+'+(_hu4*15)+'→Lv'+_hG4.等级+'·经验'+_hG4.经验);
    }
    var _its4=_cs4.items||[];
    if(_its4.length){
      if(!entry4)entry4={};
      entry4.道具=_its4.slice();
      var _itCount={};
      for(var _ii4=0;_ii4<_its4.length;_ii4++){_itCount[_its4[_ii4]]=(_itCount[_its4[_ii4]]||0)+1}
      var _itParts=[];
      for(var _ik4 in _itCount){_itParts.push(_ik4+'×'+_itCount[_ik4])}
      parts4.push('道具：'+_itParts.join('、'));
    }
    if(entry4)herExpMulti[t4.名]=entry4;
    if(parts4.length)herExpStr2+=(herExpStr2?'；':'')+t4.名+'['+parts4.join('，')+']';
  }
  if(herExpStr2)herExpUpdates=herExpMulti;
  var pBufS2=[];for(var pbk3 in pbuffs){pBufS2.push(pbk3+'('+num(pbuffs[pbk3].剩余回合,0)+'回合)')}
  var hBufS2=[];for(var hbk3 in hbuffs){hBufS2.push(hbk3+'('+num(hbuffs[hbk3].剩余回合,0)+'回合)')}
  // 胜负 + 结算
  var allDead=targets.every(function(tt){return num(tt.防守值,0)<=0});
  var meDead=meTo<=0;
  State.finished=allDead||meDead;
  if(State.finished){
    var youWin=allDead;
    State.multiSettle={};
    var settleLines=[];
    for(var i3=0;i3<targets.length;i3++){
      var t3=targets[i3];
      var c3=obj((d.女性角色||{})[t3.名]);
      var jxChange=youWin?(clamp(11-num(pb.回合,0)*2,1,10)+(Math.floor(Math.random()*3)-1)):-(clamp(11-num(pb.回合,0)*2,1,10)+(Math.floor(Math.random()*3)-1));
      var jxNew=clamp(num(c3.缴械值,0)+jxChange,0,100);
      c3.缴械值=jxNew;
      State.multiSettle[t3.名]={jxChange:jxChange};
      settleLines.push(t3.名+'缴械值'+(jxChange>=0?'+':'')+jxChange+'→'+jxNew);
    }
    var lootNote='';
    // 多人玩家缴械值：只有败了才累计被缴械（1~5，按本场程度），赢了不产生缴械值
    var _pjM2=Math.min(5,Math.max(1,Math.ceil(clamp(11-num(pb.回合,0)*2,1,10)/2)));
    if(!youWin){p.累计被缴械=num(p.累计被缴械,0)+_pjM2}
    if(youWin){for(var _li=0;_li<targets.length;_li++){var _lt=targets[_li];if(num(_lt.防守值,0)<=0){var _lc4=obj((d.女性角色||{})[_lt.名]);var _cim=obj(_lc4.道具栏);var _ck4=Object.keys(_cim);if(_ck4.length&&Math.random()<0.4){var _pk4=_ck4[Math.floor(Math.random()*_ck4.length)];var _am4=num(_cim[_pk4],1);_cim[_pk4]=Math.max(0,_am4-1);if(!obj(p.道具栏)[_pk4])p.道具栏[_pk4]=0;p.道具栏[_pk4]=num(p.道具栏[_pk4],0)+1;lootNote+=(lootNote?'；':'')+'缴获『'+_pk4+'』×1'}if(num(_lc4.缴械值,0)>=60){var _psk4=Object.keys(obj(p.技能));if(_psk4.length){var _p5=_psk4[Math.floor(Math.random()*_psk4.length)];var _gL4=gainExp(num(obj(obj(p.技能)[_p5]).等级,1),num(obj(obj(p.技能)[_p5]).经验,0),30);obj(obj(p.技能)[_p5]).等级=_gL4.等级;obj(obj(p.技能)[_p5]).经验=_gL4.经验;if(!expGain[_p5])expGain[_p5]=0;expGain[_p5]+=30;lootNote+=(lootNote?'；':'')+'技能心得→'+_p5+'+30经验'}}}}}
    State.resultText='【多人战斗结算】目标='+tgt+'（'+targets.length+'人）｜回合数='+pb.回合+'｜结果='+(youWin?'你胜':'你败')+'\n'
      +'你的攻击：'+(isHealRound?'（恢复）':(skills.join('+')+' → '+atkLine))+'\n'
      +'她们依次行动：'+(logLines.length?logLines.join('；'):'（本回合无人攻击你）')+'｜你剩余防守值'+meTo+'/'+num(pb.主角防守值上限,96)+'\n'
      +settleLines.join('；')+'\n'
      +'经验：你['+expStr2+'] 她['+(herExpStr2||'无')+']'+'\n'
      +(pBufS2.length||hBufS2.length?('BUFF状态：你['+(pBufS2.join('、')||'无')+'] 她['+(hBufS2.join('、')||'无')+']'+'\n'):'')
      +(lootNote?('战利品：'+lootNote+'\n'):'')
      +'注：数值已由战斗面板写入 stat_data（唯一真源），AI 按每人各自的攻击方式与癖好逐一叙事，勿重复结算。';
  }
  State.selSkills=[];State.actionText='';State.pendingHeal=null;State.selTarget='';
  // 持久化每个目标的当前防守值到目标列表（字符串→对象）：状态栏/重渲染才能读到实时值，
  // 且下次 normTargets 走对象分支自动用持久值（不再每回合满 cap）
  var _tl6=pb.目标列表;
  if(_tl6&&Array.isArray(_tl6)){
    for(var _ti6=0;_ti6<targets.length&&_ti6<_tl6.length;_ti6++){
      var _t6=targets[_ti6];
      if(typeof _tl6[_ti6]==='string'){_tl6[_ti6]={名:_tl6[_ti6]}}
      _tl6[_ti6].防守值=Math.max(0,num(_t6.防守值,0));
      _tl6[_ti6].防守值上限=num(_t6.防守值上限,0)>0?_t6.防守值上限:herDefCap(obj((d.女性角色||{})[_t6.名]));
    }
  }
  persistBattle(pb,herExpUpdates,playerExpUpdatesFromGain(expGain,p),healExpUpdate?{key:healSkillKey,等级:num(obj(obj(p.恢复技能)[healSkillKey]).等级,1),经验:num(obj(obj(p.恢复技能)[healSkillKey]).经验,0)}:null);
  render();
}

function normTargets(tl,d){
  var out=[];var R=(d&&d.女性角色)||{};
  for(var i=0;i<tl.length;i++){
    var t=tl[i];
    if(typeof t==='string'){
      var c=obj(R[t]);
      var cap=herDefCap(c);
      out.push({名:t,防守值:cap,防守值上限:cap});
    }else{out.push(t)}
  }
  return out;
}
function ydsClickHandlerFactory(root){
  return function(e){
    var t=e.target;
    while(t&&t!==root){
      var act=t.getAttribute&&t.getAttribute('data-act');
      if(act){
        if(act==='theme'){ydsToggleTheme();return}
        if(act==='bg'){ydsToggleBg();return}
        if(act==='toggle-skill'){
          var sk=t.getAttribute('data-skill');
          if(num(State.playerSkillCd[sk],0)>0){render();return}
          var idx=State.selSkills.indexOf(sk);
          if(idx>=0){State.selSkills.splice(idx,1)}
          else if(State.selSkills.length<1){State.selSkills=[sk];State.selItem=''}
          render();
        }else if(act==='toggle-item'){
          var it=t.getAttribute('data-item');
          if(State.selSkills.length>0){render();return}
          State.selItem=(State.selItem===it)?'':it;
          render();
        }else if(act==='use-heal'){
          var hk=t.getAttribute('data-heal');
          if(State.selSkills.length>0||!!State.selItem){render();return}
          if(num(State.healCd[hk],0)<=0){
            State.pendingHeal=hk;
            if(isMultiBattle()){executeRoundMulti()}
            else{executeRound()}
          }
        }else if(act==='her-detail'){
          var _dn=t.getAttribute('data-tgt');
          var _de=root.querySelector('#yds-detail-'+_dn);
          if(_de){
            var _show=_de.style.display!=='none';
            _de.style.display=_show?'none':'block';
            t.textContent=_show?'📋 查看详情（技能/道具/生理）':'📕 收起详情';
          }
          return;
        }else if(act==='choose-target'){
          var tt=t.getAttribute('data-tgt');
          // 已溃败目标不可选（兼容字符串目标列表）
          var _pbm=battleState();
          var _tb=null;
          if(_pbm&&_pbm.目标列表){for(var _ti=0;_ti<_pbm.目标列表.length;_ti++){var _tt2=_pbm.目标列表[_ti];var _nm2=(typeof _tt2==='string')?_tt2:_tt2.名;if(_nm2===tt){_tb=_tt2;break}}}
          if(_tb&&typeof _tb!=='string'&&num(_tb.防守值,0)<=0){render();return}
          State.selTarget=(State.selTarget===tt)?'':tt;
          render();
        }else if(act==='attack'){
          var action=(shadow.getElementById('action-input')||{}).value||'';
          State.actionText=action;
          if(isMultiBattle()){executeRoundMulti()}
          else{executeRound()}
        }else if(act==='send-result'){
          sendResult();
        }else if(act==='toggle-flavor'){
          State.flavorOn=!State.flavorOn;
          apiCfgSave();
          render();
        }else if(act==='toggle-api'){
          State.apiPanelOpen=!State.apiPanelOpen;
          render();
        }else if(act==='close-api'){
          State.apiPanelOpen=false;
          render();
        }else if(act==='api-mode'){
          State.apiMode=t.getAttribute('data-mode');
          render();
        }else if(act==='api-preset'){
          State.apiPreset=t.value;
        }else if(act==='api-temp'){
          State.apiTemp=t.value;
        }else if(act==='api-maxtok'){
          State.apiMaxTokens=t.value;
        }else if(act==='load-models'){
          loadModels();
        }else if(act==='save-api'){
          var u=(shadow.getElementById('api-url')||{}).value;if(u!==undefined)State.apiUrl=u;
          var k=(shadow.getElementById('api-key')||{}).value;if(k!==undefined)State.apiKey=k;
          var mSel=(shadow.getElementById('api-model')||{});
          if(mSel.value==='__custom__'){
            var mc=prompt('输入模型名称：',State.apiModel||'');
            if(mc)State.apiModel=mc;
          }else if(mSel.value!==undefined&&mSel.value!==''){
            State.apiModel=mSel.value;
          }
          apiCfgSave();
          var btn=t;btn.textContent='✅ 已保存';setTimeout(function(){if(btn)btn.textContent='💾 保存配置'},1200);
          render();
        }
        return;
      }
      t=t.parentNode;
    }
  };
}
function ydsInputHandlerFactory(root){
  return function(e){
    var el=e.target;
    if(el&&el.id==='action-input'){State.actionText=el.value}
  };
}

/* 初始化 */

var BATTLE_CSS="\n:root{\n  --bg-0:#121218;--bg-1:#1b1b23;--bg-card:rgba(30,30,37,.92);\n  --c-text:#e8e6e1;--c-dim:#9b988f;--c-dim2:#6d6a62;\n  --c-accent:#e0525e;--c-gold:#d9a441;--c-success:#59c98d;--c-danger:#ff5c5c;\n  --c-warn:#e0b45c;--c-info:#6aa8d8;--c-powder:#f5a3b7;--c-border:rgba(255,255,255,.09);\n  --font:-apple-system,BlinkMacSystemFont,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;\n  --fs-xs:clamp(10px,2vw,11px);--fs-sm:clamp(11px,2.2vw,12px);--fs-base:clamp(12px,2.5vw,13px);--fs-md:clamp(13px,2.8vw,15px);\n}\n*{box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-tap-highlight-color:transparent}\nhtml,body{font-family:var(--font);color:var(--c-text);background:transparent;font-size:var(--fs-base);line-height:1.5}\n.battleui{width:100%;max-width:760px;margin:0 auto;background:linear-gradient(160deg,var(--bg-0),var(--bg-1));border:1px solid var(--c-border);border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.45)}\n.bu-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:linear-gradient(120deg,rgba(224,82,94,.18),rgba(224,82,94,.05));border-bottom:1px solid rgba(224,82,94,.2)}\n.bu-title{font-size:15px;font-weight:800;color:var(--c-accent)}\n.bu-state{font-size:12px;padding:2px 10px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--c-dim)}\n.bu-state.进行中{color:var(--c-accent);background:rgba(224,82,94,.15)}\n.bu-state.已结算{color:var(--c-success)}\n.bu-empty{padding:28px 14px;text-align:center;color:var(--c-dim);font-size:13px}\n.bu-empty .dim{font-size:11px;opacity:.65;margin-top:6px}\n.battle{padding:10px 12px;margin:10px 14px 0;border-radius:9px;border:1px solid rgba(224,82,94,.25);background:linear-gradient(120deg,rgba(224,82,94,.08),rgba(224,82,94,.02) 55%)}\n/* 多人目标九宫格：网格罗列 + 整卡可点选目标 */\n.battle-grid-multi{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:8px;margin:10px 14px 0}\n.battle-grid-multi .battle{margin:0;cursor:pointer;transition:border-color .18s,box-shadow .18s}\n.battle-grid-multi .battle:hover{border-color:rgba(217,164,65,.55)}\n.battle-sel{border-color:var(--c-gold)!important;box-shadow:0 0 0 2px rgba(217,164,65,.35)!important}\n.battle-grid-multi .battle-yes{margin-top:8px}\n.battle-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}\n.battle-name{font-size:14px;font-weight:700;color:var(--c-accent)}\n.battle-tag{font-size:11px;padding:1px 8px;border-radius:999px;background:rgba(224,82,94,.15);color:var(--c-accent)}\n.hp-row{display:flex;align-items:center;gap:8px}\n.hp-label{font-size:11px;color:var(--c-dim2);width:64px;flex-shrink:0}\n.hp-track{flex:1;height:10px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden}\n.hp-fill{height:100%;border-radius:5px;transition:width .4s ease}\n.hp-num{font-size:12px;font-weight:600;min-width:56px;text-align:right}\n.battle-grid{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:8px;font-size:12px;color:var(--c-dim)}\n.voice-box{margin-top:6px;padding:7px 10px;border-radius:8px;background:rgba(245,163,183,.08);border:1px solid rgba(245,163,183,.2);font-size:12px;color:var(--c-powder);font-style:italic;line-height:1.5}\n.voice-box .vl{font-size:10px;color:var(--c-dim2);font-style:normal;display:block;margin-bottom:2px}\n/* 战斗控制 */\n.battle-ctrl{margin:10px 14px 14px;padding:10px 12px;border-radius:9px;border:1px solid var(--c-gold);background:linear-gradient(120deg,rgba(217,164,65,.08),rgba(217,164,65,.02) 55%)}\n.battle-ctrl-title{font-size:12px;font-weight:700;color:var(--c-gold);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px}\n/* ===== 主题系统: dark(默认) / glass(磨砂玻璃) / light(亮色) ===== */\n.battleui[data-theme=\"light\"]{\n  --bg-0:#f7f5ef;--bg-1:#eeebe3;--bg-card:rgba(255,255,255,.96);\n  --c-text:#26251f;--c-dim:#6f6c62;--c-dim2:#9c988c;\n  --c-accent:#c2404a;--c-gold:#a37412;--c-success:#2f8f62;--c-danger:#d64545;\n  --c-warn:#a3742a;--c-info:#3f77a3;--c-powder:#b8587f;\n  --c-border:rgba(0,0,0,.14);\n}\n.battleui[data-theme=\"glass\"]{\n  --bg-0:rgba(16,16,22,.78);--bg-1:rgba(24,24,32,.82);--bg-card:rgba(30,30,38,.66);\n  --c-text:#f5f3ec;--c-dim:#c4c0b4;--c-dim2:#a09c90;\n  --c-accent:#ff7d88;--c-gold:#e8b84f;--c-success:#6fd8a4;--c-danger:#ff7a7a;\n  --c-warn:#f0c060;--c-info:#8fc1e8;--c-powder:#ffb8ca;\n  --c-border:rgba(255,255,255,.18);\n}\n.battleui[data-theme=\"glass\"] .battle,.battleui[data-theme=\"glass\"] .battle-ctrl,.battleui[data-theme=\"glass\"] .skill-card,.battleui[data-theme=\"glass\"] .item-card,.battleui[data-theme=\"glass\"] .hero-card,.battleui[data-theme=\"glass\"] .battle-log,.battleui[data-theme=\"glass\"] .her-skill-card,.battleui[data-theme=\"glass\"] .heal-btn,.battleui[data-theme=\"glass\"] .voice-box,.battleui[data-theme=\"glass\"] .physio-strip{\n  backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3);\n}\n/* ===== 主题系统 v2: dark(深色·默认) / light(浅色) / glass(磨砂玻璃) / contrast(强对比) / pink(粉色) / blue(蓝色) / gold(金色) ===== */\n/* 强对比：纯黑底+亮色高饱和，字重/字号加大，最大可读性 */\n.battleui[data-theme=\"contrast\"]{\n  --bg-0:#000000;--bg-1:#0a0a0c;--bg-card:#101014;\n  --c-text:#ffffff;--c-dim:#e6e6e6;--c-dim2:#bfbfbf;\n  --c-accent:#ffcc00;--c-gold:#ffd700;--c-success:#00ff88;--c-danger:#ff4d4d;\n  --c-warn:#ffcc44;--c-info:#00ccff;--c-powder:#ff9ad5;\n  --c-border:rgba(255,255,255,.35);\n  --fs-xs:clamp(10px,2vw,12px);--fs-sm:clamp(11px,2.2vw,13px);--fs-base:clamp(13px,2.6vw,15px);--fs-md:clamp(14px,2.9vw,16px);\n}\n.battleui[data-theme=\"contrast\"] .battle-btn{font-weight:800;border:2px solid #fff}\n.battleui[data-theme=\"contrast\"] .skill-card,.battleui[data-theme=\"contrast\"] .item-card,.battleui[data-theme=\"contrast\"] .hero-card,.battleui[data-theme=\"contrast\"] .battle-log{border-width:1.5px}\n/* 粉色：浅粉底+深玫红字+圆体，柔美浪漫 */\n.battleui[data-theme=\"pink\"]{\n  --bg-0:#fff0f5;--bg-1:#ffe4ee;--bg-card:#fff8fb;\n  --c-text:#5c2433;--c-dim:#a0677a;--c-dim2:#c28fa2;\n  --c-accent:#e0457c;--c-gold:#c98a2e;--c-success:#4a9e7a;--c-danger:#e04545;\n  --c-warn:#c07a2e;--c-info:#6a8fc9;--c-powder:#e77fa3;\n  --c-border:rgba(200,80,130,.22);\n  --font:\"Yuanti SC\",\"YouYuan\",\"PingFang SC\",\"Microsoft YaHei\",sans-serif;\n}\n.battleui[data-theme=\"pink\"] .bu-head{background:linear-gradient(120deg,rgba(224,69,124,.16),rgba(224,69,124,.04));border-bottom-color:rgba(224,69,124,.25)}\n.battleui[data-theme=\"pink\"] .battle-btn{background:linear-gradient(90deg,#e0457c,#c2356a)}\n.battleui[data-theme=\"pink\"] .battle-btn.alt{background:linear-gradient(90deg,#c98a2e,#a37412)}\n/* 蓝色：深蓝底+冰蓝字+白强调，冷静深邃 */\n.battleui[data-theme=\"blue\"]{\n  --bg-0:#0d1626;--bg-1:#15203a;--bg-card:rgba(21,32,58,.92);\n  --c-text:#eaf2ff;--c-dim:#a8c0e8;--c-dim2:#7d93b8;\n  --c-accent:#5ab0ff;--c-gold:#e8c060;--c-success:#5ad6a0;--c-danger:#ff6a6a;\n  --c-warn:#f0c060;--c-info:#7ac8ff;--c-powder:#ffb0d0;\n  --c-border:rgba(120,170,255,.22);\n}\n.battleui[data-theme=\"blue\"] .bu-head{background:linear-gradient(120deg,rgba(90,176,255,.18),rgba(90,176,255,.04));border-bottom-color:rgba(90,176,255,.3)}\n.battleui[data-theme=\"blue\"] .battle-btn{background:linear-gradient(90deg,#3f8fe0,#2f6fb8)}\n/* 金色：黑金底+衬线体，贵气奢华 */\n.battleui[data-theme=\"gold\"]{\n  --bg-0:#1a1408;--bg-1:#261d0c;--bg-card:rgba(38,29,12,.94);\n  --c-text:#f5ead0;--c-dim:#cbb98a;--c-dim2:#9c8c60;\n  --c-accent:#e8b64c;--c-gold:#ffd970;--c-success:#8fd4a0;--c-danger:#ff8a6a;\n  --c-warn:#f0c060;--c-info:#a0c8f0;--c-powder:#f0c0a0;\n  --c-border:rgba(232,182,76,.28);\n  --font:\"Songti SC\",\"STSong\",\"SimSun\",\"PingFang SC\",\"Microsoft YaHei\",serif;\n}\n.battleui[data-theme=\"gold\"] .bu-head{background:linear-gradient(120deg,rgba(232,182,76,.2),rgba(232,182,76,.04));border-bottom-color:rgba(232,182,76,.35)}\n.battleui[data-theme=\"gold\"] .battle-btn{background:linear-gradient(90deg,#c9a03c,#a3822e)}\n.battleui[data-theme=\"gold\"] .battle-btn.alt{background:linear-gradient(90deg,#8f6f20,#6d5418)}\n\n.theme-btn,.bg-btn{cursor:pointer;font-size:12px;font-weight:700;opacity:1;transition:opacity .15s;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid var(--c-border);color:var(--c-text);white-space:nowrap}\n.theme-btn:hover{opacity:.8;border-color:var(--c-gold)}\n.bg-btn:hover{opacity:.85;border-color:var(--c-info)}\n/* ===== 动态背景系统: static(默认) / aurora(极光流动) / rainbow(彩虹流动) ===== */\n.battleui[data-bg=\"aurora\"]{background:linear-gradient(135deg,var(--bg-0),var(--bg-1),rgba(255,255,255,.06),var(--bg-1));background-size:320% 320%;animation:ydsAurora 16s ease infinite}\n.battleui[data-bg=\"rainbow\"]{background:linear-gradient(135deg,#ff6b8a,#b06bff,#4fb3ff,#3dd68c,#ffd76b,#ff8a5c,#ff6b8a);background-size:420% 420%;animation:ydsAurora 18s ease infinite}\n.battleui[data-theme=\"light\"][data-bg=\"rainbow\"],.battleui[data-theme=\"pink\"][data-bg=\"rainbow\"]{background:linear-gradient(135deg,#ffe6ec,#e6e6ff,#e6fff0,#fffbe6,#ffe9d6,#ffe6ec);background-size:420% 420%;animation:ydsAurora 18s ease infinite}\n@keyframes ydsAurora{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}\n@media(prefers-reduced-motion:reduce){.battleui[data-bg=\"aurora\"],.battleui[data-bg=\"rainbow\"]{animation:none}}\n/* 血条发光 + 低血量闪烁 */\n.hp-fill{box-shadow:0 0 8px rgba(255,255,255,.22)}\n.hp-fill.hp-low{animation:ydsLow 1s ease infinite}\n@keyframes ydsLow{0%,100%{opacity:1;box-shadow:0 0 6px rgba(255,92,92,.4)}50%{opacity:.55;box-shadow:0 0 18px rgba(255,92,92,.95)}}\n/* 经验满级闪光 */\n.sc-exp i b.xp-full{animation:ydsXp 1s ease infinite}\n@keyframes ydsXp{0%,100%{filter:brightness(1)}50%{filter:brightness(1.7)}}\n.bu-head-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}\n.legend{font-size:10px;color:var(--c-dim);background:rgba(255,255,255,.04);border-radius:6px;padding:5px 8px;margin-top:6px;line-height:1.7}\n.api-note{font-size:10px;color:var(--c-info);background:rgba(106,168,216,.08);border:1px dashed rgba(106,168,216,.3);border-radius:6px;padding:5px 8px;margin-top:6px;line-height:1.6}\n.mini-num{font-size:10px;color:var(--c-text);font-weight:700;margin-left:3px;min-width:16px;display:inline-block}\n\n.battle-ctrl-title .rounds{font-size:10px;color:var(--c-dim2);font-weight:400}\n.skill-sel{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-bottom:8px}\n.skill-card{padding:7px 9px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid var(--c-border);cursor:pointer;transition:all .15s ease;position:relative}\n.skill-card:hover{border-color:var(--c-gold)}\n.skill-card.sel{border-color:var(--c-gold);background:rgba(217,164,65,.12)}\n.skill-card.off{opacity:.4;pointer-events:none}\n.skill-card .sc-top{display:flex;align-items:center;gap:6px;margin-bottom:3px}\n.skill-card .sc-icon{font-size:16px}\n.skill-card .sc-name{font-weight:700;font-size:12px;color:var(--c-text);flex:1}\n.skill-card .sc-lv{font-size:10px;color:var(--c-gold);font-weight:700;background:rgba(217,164,65,.12);padding:1px 5px;border-radius:4px}\n.skill-card .sc-dmg{font-size:12px;font-weight:700;color:var(--c-powder)}\n.skill-card .sc-dmg small{font-size:10px;color:var(--c-dim2);font-weight:400}\n.skill-card .sc-eff{font-size:10px;color:var(--c-dim);line-height:1.4;margin-top:2px}\n.skill-card .sc-check{position:absolute;top:6px;right:6px;color:var(--c-gold);font-size:11px;display:none}\n.skill-card.sel .sc-check{display:block}\n.skill-card .sc-exp{font-size:9px;color:var(--c-dim2);margin-top:2px}\n.skill-card .sc-exp i{display:inline-block;width:36px;height:3px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;vertical-align:middle;margin-right:3px}\n.skill-card .sc-exp i b{display:block;height:100%;background:linear-gradient(90deg,var(--c-gold),#e8c77a)}\n/* 道具栏 */\n.item-bar{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;margin-bottom:8px}\n.item-card{padding:6px 8px;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid var(--c-border);cursor:pointer;transition:all .15s ease;text-align:center;position:relative}\n.item-card:hover{border-color:var(--c-gold)}\n.item-card.sel{border-color:var(--c-gold);background:rgba(217,164,65,.12)}\n.item-card.off{opacity:.4;pointer-events:none}\n.item-card .ic-name{font-size:11px;font-weight:700;color:var(--c-text)}\n.item-card .ic-count{font-size:10px;color:var(--c-dim2);display:block}\n.item-card .ic-eff{font-size:9px;color:var(--c-dim);display:block;margin-top:1px;line-height:1.3}\n.item-card .ic-check{position:absolute;top:3px;right:5px;color:var(--c-gold);font-size:10px;display:none}\n.item-card.sel .ic-check{display:block}\n/* 恢复技能 */\n.heal-bar{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}\n.heal-btn{flex:1;min-width:110px;padding:7px 8px;border-radius:7px;background:rgba(89,201,141,.08);border:1px solid rgba(89,201,141,.25);cursor:pointer;transition:all .15s ease;text-align:center}\n.heal-btn:hover{border-color:var(--c-success)}\n.heal-btn.off{opacity:.4;pointer-events:none}\n.heal-btn .hb-name{font-size:11px;font-weight:700;color:var(--c-success)}\n.heal-btn .hb-eff{font-size:9px;color:var(--c-dim);display:block;margin-top:1px}\n.heal-btn .hb-cd{font-size:9px;color:var(--c-warn);display:block}\n/* BUFF/DEBUFF 徽章 */\n.buff-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}\n.buff-tag{font-size:10px;padding:1px 7px;border-radius:999px;line-height:1.6}\n.buff-tag.buff{background:rgba(89,201,141,.12);color:var(--c-success);border:1px solid rgba(89,201,141,.25)}\n.buff-tag.debuff{background:rgba(255,92,92,.12);color:var(--c-danger);border:1px solid rgba(255,92,92,.25)}\n.buff-tag .bt-round{opacity:.7;font-size:9px}\n/* 区域标题 */\n.zone-title{font-size:11px;font-weight:700;color:var(--c-gold);margin:10px 0 6px;display:flex;align-items:center;gap:6px}\n.zone-title:first-child{margin-top:0}\n.action-input{width:100%;min-height:44px;padding:7px 10px;border-radius:7px;border:1px solid var(--c-border);background:rgba(255,255,255,.04);color:var(--c-text);font-size:12px;font-family:inherit;resize:vertical;box-sizing:border-box}\n.action-input:focus{outline:none;border-color:var(--c-gold)}\n.battle-btn{width:100%;margin-top:8px;padding:9px 0;border-radius:7px;border:none;background:linear-gradient(90deg,var(--c-accent),#c44550);color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s ease}\n.battle-btn:hover{opacity:.9}\n.battle-btn:disabled{opacity:.4;cursor:not-allowed}\n.battle-btn.alt{background:linear-gradient(90deg,var(--c-gold),#b8892e)}\n.battle-tip{font-size:10px;color:var(--c-dim2);margin-top:6px;line-height:1.6}\n.formula{font-size:10px;color:var(--c-dim2);background:rgba(255,255,255,.04);border-radius:6px;padding:5px 8px;margin-top:6px;line-height:1.6}\n/* 她的信息卡（RPG） */\n.hero-card{margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(224,82,94,.06);border:1px solid rgba(224,82,94,.2)}\n.hero-card .hc-title{font-size:11px;font-weight:700;color:var(--c-accent);margin-bottom:6px;display:flex;align-items:center;gap:6px}\n.hero-card .hc-skill{margin-bottom:4px}\n.hero-card .hc-skill .hs-name{font-size:12px;font-weight:700;color:var(--c-gold)}\n.hero-card .hc-skill .hs-desc{font-size:10px;color:var(--c-dim);line-height:1.4;margin-top:1px}\n.hero-card .hc-stat{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:4px;margin-top:6px}\n.hero-card .hc-stat .hs-item{background:rgba(255,255,255,.05);border-radius:5px;padding:3px 6px;text-align:center}\n.hero-card .hc-stat .hs-item .k{font-size:9px;color:var(--c-dim2);display:block}\n.hero-card .hc-stat .hs-item .v{font-size:12px;font-weight:700;color:var(--c-text)}\n.hero-card .hc-stat .hs-item .v.atk{color:var(--c-danger)}\n.hero-card .hc-stat .hs-item .v.def{color:var(--c-info)}\n.hero-card .hc-stat .hs-item .v.buf{color:var(--c-success)}\n/* 回合明细日志 */\n.battle-log{margin:0 14px 14px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid var(--c-border);max-height:220px;overflow-y:auto}\n.log-title{font-size:11px;color:var(--c-dim2);letter-spacing:1px;margin-bottom:6px}\n.log-item{font-size:11px;color:var(--c-dim);padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);line-height:1.6}\n.log-item:last-child{border-bottom:none}\n.log-item .rk{color:var(--c-gold);font-weight:700;display:inline-block;min-width:42px}\n.log-item .atk{color:var(--c-powder);font-weight:700}\n.log-item .def{color:var(--c-info)}\n.log-item .dmg-detail{font-size:10px;color:var(--c-dim2);display:block;margin-left:42px}\n.log-item .her-atk{color:var(--c-danger)}\n.log-item .log-flavor{display:block;margin-left:42px;color:var(--c-dim);font-style:italic;font-size:10px;line-height:1.5}\n.log-item .win{color:var(--c-success);font-weight:700}\n.log-item .lose{color:var(--c-danger);font-weight:700}\n.loading{text-align:center;padding:30px;color:var(--c-dim);font-size:var(--fs-md);animation:pulse 1.2s ease infinite}\n@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}\n/* 她的信息区（跟男方对齐：技能卡/道具栏/恢复技能） */\n.her-panel{margin:8px 0;display:grid;gap:6px}\n.hp-title{font-size:11px;font-weight:700;color:var(--c-powder);display:flex;align-items:center;gap:6px;margin-bottom:2px}\n.her-skill-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px}\n.her-skill-card{padding:6px 8px;border-radius:7px;background:rgba(245,163,183,.07);border:1px solid rgba(245,163,183,.22)}\n.her-skill-card.off{opacity:.45}\n.her-skill-card .hsc-top{display:flex;align-items:center;gap:5px;margin-bottom:2px}\n.her-skill-card .hsc-icon{font-size:14px}\n.her-skill-card .hsc-name{font-weight:700;font-size:11px;color:var(--c-powder);flex:1}\n.her-skill-card .hsc-lv{font-size:9px;color:var(--c-gold);background:rgba(217,164,65,.14);padding:1px 4px;border-radius:4px}\n.her-skill-card .hsc-dmg{font-size:11px;font-weight:700;color:var(--c-danger)}\n.her-skill-card .hsc-eff{font-size:9px;color:var(--c-dim);line-height:1.35;margin-top:2px}\n.her-item-mini{display:flex;flex-wrap:wrap;gap:5px}\n.her-item-mini .him{font-size:10px;padding:2px 7px;border-radius:999px;background:rgba(217,164,65,.1);border:1px solid rgba(217,164,65,.25);color:var(--c-gold)}\n.her-item-mini .him b{color:var(--c-text)}\n.her-heal-mini{font-size:10px;padding:3px 8px;border-radius:999px;background:rgba(89,201,141,.1);border:1px solid rgba(89,201,141,.25);color:var(--c-success);display:inline-block}\n.her-heal-mini b{color:var(--c-text)}\n.her-heal-card{display:inline-block;min-width:150px;padding:6px 10px;border-radius:8px;background:rgba(89,201,141,.08);border:1px solid rgba(89,201,141,.25)}\n.her-heal-card .hh-name{font-size:12px;font-weight:700;color:var(--c-success)}\n.her-heal-card .hh-exp{font-size:10px;color:var(--c-dim);font-weight:400;margin-left:6px}\n.her-heal-card .hh-eff{font-size:10px;color:var(--c-text);margin-top:2px}\n.her-heal-card .hh-cd{font-size:9px;color:var(--c-warn);margin-top:2px}\n/* 副API设置面板 */\n.api-settings{margin:6px 0 0;padding:8px 10px;border-radius:8px;background:rgba(106,168,216,.06);border:1px solid rgba(106,168,216,.25)}\n.api-settings .as-title{font-size:11px;font-weight:700;color:var(--c-info);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}\n.api-settings .as-close{cursor:pointer;color:var(--c-dim);font-size:10px}\n.api-settings .as-row{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}\n.api-settings .as-row label{font-size:10px;color:var(--c-dim2);width:64px;flex-shrink:0}\n.api-settings input[type=text],.api-settings input[type=password],.api-settings select{flex:1;min-width:120px;padding:4px 6px;border-radius:5px;border:1px solid var(--c-border);background:rgba(255,255,255,.05);color:var(--c-text);font-size:11px;font-family:inherit}\n.api-settings input:focus,.api-settings select:focus{outline:none;border-color:var(--c-info)}\n.api-settings .as-mode{display:flex;gap:6px;margin-bottom:6px}\n.api-settings .as-mode button{flex:1;padding:5px 0;border-radius:6px;border:1px solid var(--c-border);background:rgba(255,255,255,.05);color:var(--c-dim);font-size:10px;cursor:pointer}\n.api-settings .as-mode button.on{border-color:var(--c-info);color:var(--c-info);background:rgba(106,168,216,.15)}\n.api-settings .as-hint{font-size:9px;color:var(--c-dim2);line-height:1.5;margin-top:4px}\n.api-settings .as-save{padding:5px 16px;border-radius:6px;border:none;background:var(--c-info);color:#fff;font-size:11px;font-weight:700;cursor:pointer}\n.api-settings .as-save:hover{opacity:.85}\n.api-settings .as-mini{padding:4px 8px;border-radius:6px;border:1px solid var(--c-border);background:rgba(255,255,255,.05);color:var(--c-dim);font-size:10px;cursor:pointer;flex-shrink:0}\n.api-settings .as-mini:hover{border-color:var(--c-info);color:var(--c-info)}\n/* 生理状态条 */\n.physio-strip{display:flex;flex-wrap:wrap;gap:4px 10px;padding:6px 10px;margin:0 0 6px;border-radius:8px;background:rgba(89,201,141,.06);border:1px solid rgba(89,201,141,.2)}\n.physio-strip .ps-item{font-size:10px;color:var(--c-text);line-height:1.5}\n/* 移动端 */\n@media(max-width:480px){\n  .bu-head{flex-wrap:wrap;gap:6px;padding:8px 10px}\n  .bu-head-r{width:100%;justify-content:space-between}\n  .bu-title{font-size:14px}\n  .hp-row{flex-wrap:wrap;row-gap:2px}\n  .hp-label{width:auto;min-width:46px;font-size:10px}\n  .hp-num{font-size:11px;min-width:50px}\n  .skill-sel{grid-template-columns:repeat(2,1fr)}\n  .item-bar{grid-template-columns:repeat(3,1fr)}\n  .her-skill-grid{grid-template-columns:repeat(2,1fr)}\n  .heal-bar{flex-direction:column}\n  .heal-btn{flex:1 1 100%;min-width:0}\n  .battle-ctrl{margin:8px 10px 10px;padding:8px 9px}\n  .battle{padding:8px 9px;margin:8px 10px 0}\n  .battle-log{margin:0 10px 10px;max-height:180px}\n  .battle-btn{padding:11px 0;font-size:14px}\n  .battle-tag{font-size:10px}\n  .battle-name{font-size:13px}\n  .zone-title{font-size:10px}\n  .action-input{min-height:52px;font-size:13px}\n  .battle-grid{font-size:11px}\n  .log-item .dmg-detail,.log-item .log-flavor{margin-left:0}\n  .log-item .rk{min-width:34px}\n  .formula,.legend,.api-note{font-size:9px}\n  .hero-card .hc-stat{grid-template-columns:repeat(3,1fr)}\n  .battle-ctrl-title{flex-direction:column;align-items:flex-start}\n}\n@media(max-width:420px){\n  .skill-sel{grid-template-columns:1fr}\n  .item-bar{grid-template-columns:repeat(2,1fr)}\n  .her-skill-grid{grid-template-columns:1fr}\n  .hp-label{width:auto;min-width:42px;font-size:9px}\n  .hp-num{font-size:10px;min-width:44px}\n  .battle-head{gap:4px}\n  .battle-tag{font-size:9px;padding:1px 5px}\n  .hs-item{padding:2px 4px}\n  .hs-item .v{font-size:11px}\n  .voice-box{font-size:11px}\n}\n@media(max-width:360px){\n  .skill-sel{grid-template-columns:1fr}\n  .item-bar{grid-template-columns:repeat(2,1fr)}\n  .her-skill-grid{grid-template-columns:1fr}\n  .hp-label{width:auto;min-width:38px;font-size:9px}\n  .hp-num{font-size:10px;min-width:40px}\n  .bu-title{font-size:13px}\n  .bu-state{font-size:10px;padding:1px 6px}\n  .battle-grid{gap:2px 8px}\n  .battle-tip{font-size:9px}\n}\n\n.yds-detail-bar{margin:6px 0 2px;text-align:right}\n.yds-detail-btn{background:rgba(106,168,216,.12);border:1px solid rgba(106,168,216,.3);color:var(--c-info);border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer}\n.yds-detail-btn:hover{background:rgba(106,168,216,.22)}\n.yds-her-detail{display:none;margin-top:4px}\n.yds-her-detail.yds-open{display:block}\n\n.yds-detail-bar{margin:6px 0 2px;text-align:right}\n.yds-detail-btn{background:rgba(106,168,216,.12);border:1px solid rgba(106,168,216,.3);color:var(--c-info);border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer}\n.yds-detail-btn:hover{background:rgba(106,168,216,.22)}\n.yds-her-detail{display:none;margin-top:4px}\n.yds-her-detail.yds-open{display:block}\n";

/* ===== 挂载点注入壳 ===== */
var MOUNT_SEL='[data-yds-battle-mount]';
var STATE_BY_MES={};   // mesid -> State 快照（全局 State 为单例，切楼层时存/取）
var CURRENT=null;      // {mount, mesid, State, shadow}

function hostWindow2(){try{if(window.parent&&window.parent!==window&&window.parent.document)return window.parent}catch(e){}return window}
function hostDoc2(){try{return hostWindow2().document||document}catch(e){return document}}

function resetStateFields(){
  // 重置全局 State 为初始（保留对象引用，不替换）
  var keys=Object.keys(State);
  for(var i=0;i<keys.length;i++){delete State[keys[i]]}
  State.data={};State.loading=true;State.selSkills=[];State.selItem='';State.selTarget='';State.actionText='';State.log=[];State.finished=false;State.resultText='';State.healCd={提肛:0,思维分散:0};State.herHealCount=0;State.herHealCd=0;State.herItemUsed=0;State.stats=null;State.herSkillCd={};State.playerSkillCd={};State.flavorOn=true;State.flavorBusy=false;State.apiPanelOpen=false;State.apiMode='preset';State.apiPreset='';State.apiUrl='';State.apiKey='';State.apiModel='';State.apiTemp='same_as_preset';State.apiMaxTokens='same_as_preset';State.apiRetry=0;State.proxyNames=[];State.modelList=[];State.pendingHeal=null;State.multiSettle=null;State.herState=null;
}

function switchToMesid(mesid){
  // 保存当前楼层 State 快照
  if(CURRENT&&CURRENT.mesid>=0&&CURRENT.mesid!==mesid){
    try{STATE_BY_MES[CURRENT.mesid]=JSON.parse(JSON.stringify(State))}catch(e){}
  }
  // 加载目标楼层 State（全局 State 单例）
  if(STATE_BY_MES[mesid]){
    try{
      var saved=JSON.parse(JSON.stringify(STATE_BY_MES[mesid]));
      var keys=Object.keys(State);
      for(var i=0;i<keys.length;i++){delete State[keys[i]]}
      for(var k in saved){State[k]=saved[k]}
    }catch(e){resetStateFields()}
  }else{
    resetStateFields();
  }
}

function resolveMesId(mount){
  try{
    var doc=hostDoc2();
    var mes=mount.closest('.mes');
    if(mes){var id=parseInt(mes.getAttribute('mesid'),10);if(id>=0)return id}
    // 兜底：挂载点所在消息的最近 mesid
    var el=mount;
    while(el&&el!==doc.body){if(el.classList&&el.classList.contains('mes')){var id2=parseInt(el.getAttribute('mesid'),10);if(id2>=0)return id2}el=el.parentElement}
    // 最后兜底：取最新消息
    var latest=doc.querySelector('#chat > .mes:last-child');
    if(latest){var id3=parseInt(latest.getAttribute('mesid'),10);if(id3>=0)return id3}
  }catch(e){}
  return -1;
}

function injectBattle(mount){
  // shadow 有效（有内容）才跳过；仅 injected 标记不足以判断（TH 重建可能清掉 shadow）
  if(mount.dataset.ydsInjected==='1'&&mount.shadowRoot&&mount.shadowRoot.innerHTML.length>0)return;
  var mesid=resolveMesId(mount);
  if(mesid<0)return;
  switchToMesid(mesid);
  var ctx={mount:mount,mesid:mesid,State:State,shadow:null};
  CURRENT=ctx;
  // 加载副API配置（mode/temp/maxtok/retry 等，localStorage）
  try{apiCfgLoad()}catch(e){}
  // 读取数据
  var stat=readStatData();
  State.data=stat;State.loading=false;
  console.log('[战斗面板][调试] mesid='+mesid+' stat.排班=',JSON.stringify((stat&&stat.排班)||null));
  // Shadow DOM
  var shadow;
  if(mount.attachShadow&&!mount.shadowRoot){shadow=mount.attachShadow({mode:'open'})}
  else if(mount.shadowRoot){shadow=mount.shadowRoot}
  else{shadow=null}
  if(!shadow){console.warn('[战斗面板] 无法创建 Shadow DOM',mesid);return}
  ctx.shadow=shadow;
  // 注入样式与结构
  shadow.innerHTML='<style>'+BATTLE_CSS+'</style>'
    +'<div class="battleui" id="bu-root" data-theme="'+ydsGetTheme()+'" data-bg="'+ydsGetBg()+'">'
    +'<div class="bu-body"></div>'
    +'</div>';
  // 初始化战斗
  try{initBattleIfNeeded()}catch(e){console.error('[战斗面板] initBattle',e)}
  bindEvents();
  render();
  mount.dataset.ydsInjected='1';
  mount.dataset.ydsMesid=String(mesid);
  mount.setAttribute('data-yds-ready','1');
  try{mount.style.display=''}catch(e){}
  console.log('[战斗面板] 已注入楼层',mesid);
}

function refreshMount(mount){
  var mesid=parseInt(mount.dataset.ydsMesid,10);
  if(isNaN(mesid))return;
  switchToMesid(mesid);
  var shadow=mount.shadowRoot;
  CURRENT={mount:mount,mesid:mesid,State:State,shadow:shadow};
  try{apiCfgLoad()}catch(e){}
  try{var stat=readStatData();if(hasData(stat)){State.data=stat;State.loading=false}}catch(e){}
  try{initBattleIfNeeded()}catch(e){}
  rebindEvents(mount,shadow);
  render();
}

function latestMount(doc){
  try{var mounts=doc.querySelectorAll(MOUNT_SEL);if(!mounts.length)return null;return mounts[mounts.length-1]}catch(e){return null}
}
function clearStaleMount(mount){
  try{
    if(mount.shadowRoot)mount.shadowRoot.innerHTML='';
    mount.removeAttribute('data-yds-injected');
    mount.removeAttribute('data-yds-ready');
    mount.style.display='none';
  }catch(e){}
}
function scanAndInject(){
  try{
    var doc=hostDoc2();
    var latest=latestMount(doc);
    if(!latest)return;
    var mounts=doc.querySelectorAll(MOUNT_SEL);
    for(var i=0;i<mounts.length;i++){
      if(mounts[i]===latest){injectBattle(mounts[i])}
      else{clearStaleMount(mounts[i])}
    }
  }catch(e){console.error('[战斗面板] scan',e)}
}

function refreshAll(){
  try{
    var doc=hostDoc2();
    var latest=latestMount(doc);
    if(!latest)return;
    var mounts=doc.querySelectorAll(MOUNT_SEL);
    for(var i=0;i<mounts.length;i++){
      if(mounts[i]===latest){
        if(mounts[i].dataset.ydsInjected==='1'){refreshMount(mounts[i])}
        else{injectBattle(mounts[i])}
      }else{clearStaleMount(mounts[i])}
    }
  }catch(e){console.error('[战斗面板] refreshAll',e)}
}

/* ===== 多人战斗（1打N）：目标列表 + 全体受击 + 反击叠加 ===== */
function battleTargets(pb){
  var tl=pb&&pb.目标列表;
  if(tl&&tl.length)return normTargets(tl,S());
  // 单目标兼容：从当前战斗目标构造
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  if(tgt&&tgt!=='多人'){
    var c=obj((d.女性角色||{})[tgt]);
    var pb2=pb||battleState();
    return [{名:tgt,防守值:num(pb2.她防守值,44),防守值上限:num(pb2.她防守值上限,44),减伤修正:num(pb2.她减伤修正,0),缴械值:num(c.缴械值,0),本场经验:{},BUFF:{}}];
  }
  return [];
}

function isMultiBattle(){var pb=battleState();var tl=pb&&pb.目标列表;return !!(tl&&tl.length>1)}
function initMultiIfNeeded(){
  var d=S();var st=obj(d.排班).战斗状态;
  if(st!=='进行中')return;
  var pb=battleState();
  var tl=pb.目标列表;
  if(!tl||!tl.length)return;
  var changed=false;
  // BUG修复：多人战斗主角防守值从不初始化（单人版 initBattleIfNeeded 有，多人版漏了）
  // 现在依赖 num() 默认 96；体力≠80 时上限错误。防守值<=0（未初始化/上一场战败残留）时补体力×1.2。
  if(num(pb.主角防守值,0)<=0){
    var pDef=Math.round(num(obj(d.玩家).体力,80)*1.2);
    pb.主角防守值=pDef;pb.主角防守值上限=pDef;
    changed=true;
  }
  for(var i=0;i<tl.length;i++){
    var t=tl[i];
    if(num(t.防守值上限,0)<=0){
      var c=obj((d.女性角色||{})[t.名]);
      var cap=herDefCap(c);
      t.防守值=cap;t.防守值上限=cap;
      changed=true;
    }
  }
  if(changed){persistBattle(pb,null,null)}
}
/* 多人渲染：每个目标一张血条卡 + 主角卡（含"选为攻击目标"） */
function renderBattleMulti(d,p,pb,targets){
  targets=normTargets(targets,d);
  var pDef=num(pb.主角防守值,96),pMax=num(pb.主角防守值上限,96);
  var selT=State.selTarget||'';
  // 群体技能（次数翻倍）默认覆盖所有存活目标 → 全员显示选中态
  var isAoe=State.selSkills.indexOf('次数翻倍')>=0;
  var html='<div class="battle-grid-multi">';
  for(var i=0;i<targets.length;i++){
    var t=targets[i];
    var c=obj((d.女性角色||{})[t.名]);
    var hDef=num(t.防守值,0),hMax=herDefCap(c);
    var dead=hDef<=0;
    var isSel=isAoe?(!dead):(selT===t.名);
    var ability=obj(c.能力值);
    var _iks=Object.keys(obj(c.道具栏));
    html+='<div class="battle'+(dead?' yds-dead':'')+(isSel?' battle-sel':'')+'" data-act="choose-target" data-tgt="'+esc(t.名)+'" title="点击选为攻击目标">'
      +'<div class="battle-head"><span class="battle-name">'+esc(t.名)+'</span>'
      +'<span class="battle-tag">名器 '+esc(c.名器||'—')+'</span>'
      +'<span class="battle-tag">'+esc(stageText(c.缴械值))+'</span>'
      +(dead?'<span class="battle-tag" style="color:var(--c-danger)">已溃败</span>':'')
      +'</div>'
      +'<div class="hp-row"><span class="hp-label">防守值</span><div class="hp-track"><div class="hp-fill" style="width:'+pct(hDef,hMax)+'%;background:'+hpColor(hMax-hDef)+'"></div></div><span class="hp-num">'+Math.max(0,Math.round(hDef))+'/'+hMax+'</span></div>'
      +'<div class="battle-grid">'
      +'<span>缴械 <b style="color:var(--c-accent)">'+esc(c.缴械值||0)+'</b>/100</span>'
      +'<span>技能 <b style="color:var(--c-gold)">'+esc(obj(c.技能).名||'—')+'</b></span>'
      +'<span>名器防御 <b style="color:var(--c-info)">'+num(c.名器防御,6)+'</b></span>'
      +'</div>'
      +(dead?'':'<div class="battle-yes" style="text-align:center;font-size:11px;color:'+(isSel?'var(--c-gold)':'var(--c-dim2)')+'">'+(isAoe?'👥 群体技能·覆盖所有存活目标':(isSel?'🎯 本回合攻击目标（已选中）':'点击选中为攻击目标'))+'</div>')
      +'<div class="yds-detail-bar" style="text-align:center"><button class="yds-detail-btn" data-act="her-detail" data-tgt="'+esc(t.名)+'">📋 详情</button></div>'
      +'<div class="yds-her-detail" id="yds-detail-'+esc(t.名)+'">'
      +'<div class="battle-grid">'
      +'<span>身份 '+esc(c.身份||'—')+'</span>'
      +'<span>能力 忍'+num(ability.忍耐,0)+' 持'+num(ability.持久,0)+' 攻'+num(ability.反攻,0)+'</span>'
      +'<span>欲望积压 <b style="color:var(--c-danger)">'+num(c.欲望积压,0)+'</b></span>'
      +'<span>生理 '+(c.生理周期?('经期第'+num(c.生理周期.月经日,1)+'天'+(c.生理周期.排卵日===num(c.生理周期.月经日,1)?'⚠排卵':'')+(c.生理周期.怀孕?'🤰孕'+num(c.生理周期.怀孕周数,0)+'周':'')):'—')+'</span>'
      +'<span>道具 '+( _iks.length?_iks.join('、'):'无')+'</span>'
      +'</div></div>'
      +'</div>';
  }
  html+='</div>';
  html+='<div class="battle"><div class="battle-head"><span class="battle-name">👤 你（同时对抗'+targets.length+'人）</span></div>'
    +'<div class="hp-row"><span class="hp-label">主角防守值</span><div class="hp-track"><div class="hp-fill" style="width:'+pct(pDef,pMax)+'%;background:'+hpColor(pDef)+'"></div></div><span class="hp-num">'+Math.max(0,Math.round(pDef))+'/'+pMax+'</span></div>'
    +'<div class="battle-tip" style="margin-top:6px">🎯 点击目标卡选中攻击对象（金框=选中）：发起本回合你只攻击她一人，其余在场者每人依次对你进攻。📋 详情可展开看身份/能力/生理/道具。没点目标默认攻击第一个存活者。</div></div>';
  return html;
}
/* 多人回合：全体受击 + 反击叠加 */
function normTargets(tl,d){
  var out=[];var R=(d&&d.女性角色)||{};
  for(var i=0;i<tl.length;i++){
    var t=tl[i];
    if(typeof t==='string'){
      var c=obj(R[t]);
      var cap=herDefCap(c);
      out.push({名:t,防守值:cap,防守值上限:cap});
    }else{out.push(t)}
  }
  return out;
}
function executeRoundMulti(){
  var d=S();var tgt=obj(d.排班).当前战斗目标;
  var pb=battleState();
  var p=obj(d.玩家);
  var targets=battleTargets(pb);
  if(!targets.length)return;
  var pPhys=obj(p.生理);
  var ejCdNow=num(pPhys.射精冷却剩余,0);
  var refractory=1;
  if(ejCdNow>0)refractory=ejCdNow>=3?0.6:(ejCdNow===2?0.75:0.9);
  if(ejCdNow>0&&num(p.勃起度,0)<=0&&num(p.性欲,0)<20){State.resultText='【拒战】不应期中且性欲不足、勃起归零，无法勃起，战斗不成立（无败果）。可等冷却或用伟哥。';State.finished=true;render();return;}
  if(num(p.性欲,0)<20&&num(p.勃起度,0)<=0&&!State.pendingHeal&&ejCdNow<=0){State.resultText='【拒战】性欲不足（'+num(p.性欲,0)+'/100，需≥20）且无勃起，无法战斗，战斗不成立（无败果）。';State.finished=true;render();return;}
  // 恢复技能
  var isHealRound=false,healNote='',healSkillKey='',healExpUpdate=null;
  if(State.pendingHeal){
    healSkillKey=State.pendingHeal;State.pendingHeal=null;isHealRound=true;
    var hlv=num(obj(obj(p.恢复技能)[healSkillKey]).等级,1);
    if(healSkillKey==='提肛'){var curDef=num(pb.主角防守值,96),maxDef=num(pb.主角防守值上限,96);var hAmt=Math.min(hlv*4,maxDef-curDef);pb.主角防守值=Math.min(maxDef,curDef+hAmt);healNote='提肛 Lv'+hlv+'：防守值+'+(hAmt>0?hAmt:0);if(hAmt<=0){healNote='提肛 Lv'+hlv+'：防守值已满，转为攻击+1'}}
    else if(healSkillKey==='思维分散'){pb.主角麻痒点=0;healNote='思维分散 Lv'+hlv+'：清除麻痒，体力+5'}
    var hcur=obj(obj(p.恢复技能)[healSkillKey]);var _g1=gainExp(num(hcur.等级,1),num(hcur.经验,0),15);var hNewLv=_g1.等级;var hNewExp=_g1.经验;
    hcur.等级=hNewLv;hcur.经验=hNewExp;
    State.healCd[healSkillKey]=num(HEAL_SKILLS[healSkillKey]?HEAL_SKILLS[healSkillKey].cooldown:3,3);
    healExpUpdate={key:healSkillKey,等级:hNewLv,经验:hNewExp};
    var skills=['（恢复）'];
  }else{
    var skills=State.selSkills.slice();if(!skills.length)skills=['螺旋'];
  }
  // BUFF/冷却递减
  var pbuffs=obj(pb.主角BUFF),hbuffs=obj(pb.她BUFF);
  for(var bi=0;bi<Object.keys(pbuffs).length;bi++){var bk=Object.keys(pbuffs)[bi];pbuffs[bk].剩余回合=num(pbuffs[bk].剩余回合,0)-1;if(pbuffs[bk].剩余回合<=0)delete pbuffs[bk]}
  for(var bj=0;bj<Object.keys(hbuffs).length;bj++){var bk2=Object.keys(hbuffs)[bj];hbuffs[bk2].剩余回合=num(hbuffs[bk2].剩余回合,0)-1;if(hbuffs[bk2].剩余回合<=0)delete hbuffs[bk2]}
  for(var ck in State.healCd){if(State.healCd[ck]>0)State.healCd[ck]--}
  for(var ck2 in State.playerSkillCd){if(State.playerSkillCd[ck2]>0)State.playerSkillCd[ck2]--}
  // 道具使用
  var itemNote='';
  if(State.selItem){
    var itemKey=State.selItem;
    if(num(obj(p.道具栏)[itemKey],0)>0){
      var eff=getItemEffect(itemKey);
      if(eff){
        if(eff.self){
          if(eff.self.攻击){pbuffs['攻击强化']={剩余回合:eff.rounds,效果值:eff.self.攻击}}
          if(eff.self.勃起){p.勃起度=clamp(num(p.勃起度,0)+eff.self.勃起,0,100)}
          if(eff.self.清麻痒){pb.主角麻痒点=0;pb.主角防守值=Math.min(num(pb.主角防守值上限,96),num(pb.主角防守值,96)+eff.self.回复)}
        }
        if(eff.her){
          if(eff.her.减伤){hbuffs['道具减伤']={剩余回合:eff.rounds,效果值:eff.her.减伤}}
          if(eff.her.敏感度){hbuffs['敏感度']={剩余回合:eff.rounds,效果值:eff.her.敏感度}}
          if(eff.her.麻痒){pb.麻痒点=num(pb.麻痒点,0)+eff.her.麻痒}
        }
      }
      obj(p.道具栏)[itemKey]=Math.max(0,num(obj(p.道具栏)[itemKey],0)-1);
      itemNote='使用道具：'+itemKey;
      State.selItem='';
    }
  }
  // 存活目标（防守值>0 者才参战）
  var alive=targets.filter(function(t){return num(t.防守值,0)>0});
  // 确定玩家攻击目标：State.selTarget 若已溃败/失效则回退到第一个存活
  var atkName=State.selTarget||'';
  var atkTarget=null;
  for(var ati=0;ati<alive.length;ati++){if(alive[ati].名===atkName){atkTarget=alive[ati];break}}
  if(!atkTarget&&alive.length)atkTarget=alive[0];
  // 灼烧 DoT：辣椒油灼烧选中目标（异常状态）
  if(hbuffs['灼烧']&&atkTarget&&num(hbuffs['灼烧'].效果值,0)>0){atkTarget.防守值=Math.max(0,num(atkTarget.防守值,0)-num(hbuffs['灼烧'].效果值,0));itemNote+=(itemNote?'；':'')+'🔥灼烧'+atkTarget.名+'防守值-'+hbuffs['灼烧'].效果值}
  // ===== 玩家攻击（RPG 目标类型：单体技能打选中目标；「次数翻倍」群体对所有存活目标各结算一次）=====
  var totalDmg=0,expGain={},skillDmgList=[];
  var singleSkills=skills.filter(function(k){return k!=='次数翻倍'});
  var aoeSkills=skills.filter(function(k){return k==='次数翻倍'});
  var aoeDmgMap={};
  if(!isHealRound&&atkTarget){
    for(var i=0;i<singleSkills.length;i++){
      var k=singleSkills[i];
      var lv=num(obj(obj(p.技能)[k]).等级,1);
      var baseDmg=skillDmg(k,lv);
      totalDmg+=baseDmg;
      expGain[k]=(expGain[k]||0)+15;
      skillDmgList.push({key:k,lv:lv,dmg:Math.round(baseDmg*10)/10,eff:''});
      if(/加倍|翻倍/.test(k))State.playerSkillCd[k]=1;
    }
    // 次数翻倍（群体）：每个存活目标各结算一次（技能基础伤害）
    for(var ai=0;ai<aoeSkills.length;ai++){
      var ka=aoeSkills[ai];
      var lva=num(obj(obj(p.技能)[ka]).等级,1);
      expGain[ka]=(expGain[ka]||0)+15;
      State.playerSkillCd[ka]=1;
      for(var aj=0;aj<alive.length;aj++){
        var ad=skillDmg(ka,lva);
        aoeDmgMap[alive[aj].名]=(aoeDmgMap[alive[aj].名]||0)+ad;
        skillDmgList.push({key:ka+'·群体',lv:lva,dmg:Math.round(ad*10)/10,eff:'×'+alive.length});
      }
    }
  }
  var bonus=stateBonus(p);
  if(refractory<1)bonus=refractory<=0.6?0:Math.round(bonus/2);
  if(num(p.体力,0)<30)bonus-=1;
  // 对每个存活目标结算玩家伤害（选中目标=单体+群体，其余=群体）
  var atkRes={},atkLine='';
  if(!isHealRound){
    for(var mi=0;mi<alive.length;mi++){
      var m=alive[mi];
      var mc2=obj((d.女性角色||{})[m.名]);
      var src=m===atkTarget?totalDmg:0;
      if(aoeDmgMap[m.名])src+=aoeDmgMap[m.名];
      if(src<=0)continue;
      var jya2=num(mc2.欲望积压,0);
      var yz2=jya2>=80?-4:(jya2>=60?-2:0);
      if(jya2>=100){m.防守值=Math.max(0,num(m.防守值,0)-15)}
      var pd2=ydsPeriodDebuff(mc2);yz2+=pd2.pf;
      var hd2=num(mc2.名器防御,6);
      var chi2=num(obj(obj(mc2.能力值)).持久,5);
      var red2=Math.round(hd2+chi2/3+yz2+num(m.减伤修正,0)+num(pb.她减伤修正,0));
      var tb2=obj(m.BUFF);
      for(var b3 in tb2){if(b3==='道具减伤'||b3==='冰袋')red2+=num(tb2[b3].效果值,0);if(b3==='敏感度')red2-=Math.floor(num(tb2[b3].效果值,0)/10)}
      red2=Math.max(0,red2);
      var pab2=0;for(var pb2 in pbuffs){if(pb2==='攻击强化'||pb2==='提肛强化')pab2+=num(pbuffs[pb2].效果值,0)}
      if(State.selSkills.indexOf('热量翻倍')>=0&&/雪窦|寒玉|雪润|冰守/.test(mc2.名器||'')){src=Math.round(src*2)}
      var d2=Math.max(0,Math.round((src+bonus+pab2)*refractory-red2));
      // RPG 暴击/闪避：玩家暴击(5%+平均技能等级×0.5%+勃起≥90+15%)；她闪避(等级×0.3%)
      if(d2>0){var _avgLv3=0,_lc3=0;for(var _sv3 in obj(p.技能)){_avgLv3+=num(obj(obj(p.技能)[_sv3]).等级,1);_lc3++}var critRate3=5+(_lc3?_avgLv3/_lc3*0.5:0)+(num(p.勃起度,0)>=90?15:0);if(Math.random()*100<critRate3)d2=Math.round(d2*1.5);if(Math.random()*100<lvEvade(num(obj(obj(mc2.技能)).等级,1)))d2=0}
      m.防守值=Math.max(0,num(m.防守值,0)-d2);
      atkRes[m.名]={dmg:d2,reduce:red2};
      atkLine+=(atkLine?'；':'')+m.名+'【防守值 '+Math.max(0,Math.round(m.防守值))+'/'+herDefCap(mc2)+'】受'+d2+'（减伤'+red2+'）';
    }
    if(!atkLine)atkLine='无人受击';
  }else{
    atkLine=healNote+'（本回合未攻击，仅防御）';
  }
  var atkDmg=atkTarget&&atkRes[atkTarget.名]?atkRes[atkTarget.名].dmg:0;
  // ===== 她的 AI 回合（RPG 式）：每个存活目标独立决策、独立行动、独立日志 =====
  var meFrom=num(pb.主角防守值,96);
  var meNow=meFrom;
  if(!State.herState)State.herState={};var herPerState=State.herState;
  var logLines=[];
  for(var i2=0;i2<alive.length;i2++){
    var t=alive[i2];
    var c=obj((d.女性角色||{})[t.名]);
    if(!herPerState[t.名])herPerState[t.名]={};var st=herPerState[t.名];if(!st.healCd)st.healCd=0;if(!st.heal)st.heal=0;if(!st.item)st.item=0;
    if(st.healCd>0)st.healCd--;
    var pdb=ydsPeriodDebuff(c);
    var hs=getHerSkill(c);
    var fan=herAbility(c,'反攻',obj(obj(c.能力值)).反攻);
    var atkMul=num(hs.atkMul,1.0);
    var herDefNow=herDefVal(c);
    var herMaxDef=herDefCap(c);
    var herCurDef=num(t.防守值,0);
    var jy=num(c.欲望积压,0);
    var herMul=pdb.atkMul||1;
    if(num(c.缴械值,0)>=80)herMul*=0.9;
    if(num(p.勃起度,0)>=90)herMul*=1.2;
    // 玩家减伤（RPG 防御）：体力<30 虚脱，她伤害×1.1
    var pDefMul=1,defNote='';
    if(num(p.体力,0)<30){pDefMul=1.1;defNote='你体力<30虚脱，她伤害×1.1'}
    var act='攻击',actName=obj(c.技能).名||'反击',actDmg=0,actNote=hs.note||'',actType='技能攻击';
    var usedCd=num(hs.cd,1)||1;
    // 决策1：残血恢复（防守值<35% 且 有恢复技能 且 每人每场≤2 且 冷却结束）
    var herHealSkillName=obj(obj(c.恢复技能)).名||'';
    if(herHealSkillName&&st.heal<2&&st.healCd<=0&&herCurDef<=herMaxDef*0.35){
      var hLv=num(obj(obj(c.恢复技能)).等级,1);
      var hh=HER_HEALS[herHealSkillName]||{heal:6,extra:''};
      var hAmt=Math.min(num(hh.heal,6)+Math.floor(hLv/2),herMaxDef-herCurDef);
      t.防守值=Math.min(herMaxDef,herCurDef+hAmt);
      st.heal++;st.healCd=3;
      act='恢复';actName=herHealSkillName;actType='恢复';
      actNote='防守值+'+hAmt+(hh.extra?'，'+hh.extra:'');
      st.healUse=(st.healUse||0)+1;
    }else{
      // 决策2：道具（每人每场≤2，按局势智能选）
      var herItems=obj(c.道具栏);var herItemKeys=Object.keys(herItems);
      var usedItem=false;
      if(st.item<2&&herItemKeys.length){
        var chosen=null,reason='';
        var myHpPct=meNow/Math.max(1,num(pb.主角防守值上限,96));
        var myBoqi=num(p.勃起度,0);
        var myAtkBuff=!!pbuffs['攻击强化'];
        if(myAtkBuff&&num(herItems['冰袋'],0)>0){chosen='冰袋';reason='你攻击强化，她用冰袋加固防线'}
        else if(myAtkBuff&&num(herItems['润滑液'],0)>0){chosen='润滑液';reason='你攻势太猛，她用润滑液卸力'}
        else if(myBoqi>=70&&num(herItems['薄荷油'],0)>0){chosen='薄荷油';reason='你勃起炽热，她用薄荷油泼灭你的欲望'}
        else if(herCurDef<=herMaxDef*0.5&&num(herItems['冰袋'],0)>0){chosen='冰袋';reason='她受伤不轻，用冰袋稳住阵脚'}
        else if(myHpPct<=0.4&&num(herItems['辣椒油'],0)>0){chosen='辣椒油';reason='你摇摇欲坠，她辣椒油直击要害'}
        else if(num(herItems['震动环'],0)>0){chosen='震动环';reason='她装上震动环强化反击'}
        else if(num(herItems['辣椒油'],0)>0){chosen='辣椒油';reason='她用辣椒油施加灼辣'}
        else{
          var fb=herItemKeys.filter(function(k){return num(herItems[k],0)>0&&getHerItem(k)});
          if(fb.length){chosen=fb[Math.floor(Math.random()*fb.length)];reason='她使用'+chosen+'应变'}
        }
        if(chosen){
          var hi=getHerItem(chosen);
          if(hi.buff){var hp=herProficiency(c);hbuffs[hi.buff.name]={剩余回合:hi.buff.rounds,效果值:Math.max(1,Math.round(hi.buff.val*hp))}}
          if(hi.atk){
            if(hi.atk.勃起){p.勃起度=clamp(num(p.勃起度,0)+hi.atk.勃起,0,100)}
            if(hi.atk.麻痒){pb.主角麻痒点=num(pb.主角麻痒点,0)+hi.atk.麻痒}
          }
          if(hi.heal){t.失神=0}
          herItems[chosen]=Math.max(0,num(herItems[chosen],0)-1);
          st.item++;
          st.items=st.items||[];st.items.push(chosen);
          act='道具';actName=chosen;actType='道具';actNote=reason;
          usedItem=true;
        }
      }
      if(!usedItem){
        // 决策0：技能组替换（辅助技能随局势，等级各自成长）
        var herMainN0=obj(obj(c.技能)).名||'';
        var herCtxM={herHpPct:herCurDef/Math.max(1,herMaxDef),playerAggro:!!pbuffs['攻击强化']||num(p.勃起度,0)>=80,myHpPct:meNow/Math.max(1,num(pb.主角防守值上限,96))};
        var chosenM=chooseHerSkill(c,herCtxM);
        if(chosenM&&chosenM!==herMainN0){
          var gvM=obj(obj(c.技能).技能组)[chosenM];
          var gLvM=num(gvM.等级,1);
          hs=herSkillWithLv(HER_SKILLS[chosenM]||hs,gLvM);
          atkMul=num(hs.atkMul,1.0);
          actName=chosenM;
          st.grpUse=st.grpUse||{};st.grpUse[chosenM]=(st.grpUse[chosenM]||0)+1;
        }
        // 决策3：技能攻击
        var herDmg=Math.round(((fan*1.5+herDefNow/2)*atkMul)*herMul);
        if(jy>=80)herDmg=Math.round(herDmg*1.25);
        else if(jy>=60)herDmg=Math.round(herDmg*1.1);
        herDmg=Math.round(herDmg*pDefMul);
        var _herCrit2=lvCrit(num(obj(obj(c.技能)).等级,1))+(jy>=80?15:0);
        if(Math.random()*100<_herCrit2){herDmg=Math.round(herDmg*1.5);actNote=(actNote?actNote+'；':'')+'会心反击'}
        actDmg=herDmg;
        act='攻击';actName=obj(c.技能).名||'反击';
        if(defNote)actNote=(actNote?actNote+'；':'')+defNote;
        // 主技能使用次数+1（结算块统一算新值写回）
        st.mainUse=(st.mainUse||0)+1;
        logLines.push(t.名+'【'+actName+'】对你攻击'+herDmg+(hs.note?'（'+hs.note+'）':'')+(jy>=80?'（欲望积压爆发）':jy>=60?'（欲望难耐）':''));
      }
    }
    var _pDefV2=0;for(var _pbk2 in pbuffs){if(_pbk2==='防御强化')_pDefV2+=num(pbuffs[_pbk2].效果值,0)}
    meNow=Math.max(0,meNow-Math.max(0,actDmg-_pDefV2));
    // 逐人独立日志（每人一条：她行动 + 你的防守值变化）
    State.log.push({
      rk:pb.回合,
      you:'—',
      youDmg:0,realDmg:0,
      herDmg:actDmg,
      herActionType:actType,
      herActionName:t.名+'·'+actName,
      herSkillNote:actNote,
      herFrom:meNow+actDmg,herTo:meNow,
      meFrom:meNow+actDmg,meTo:meNow,
      item:'',heal:''
    });
  }
  var meTo=meNow;
  pb.主角防守值=meTo;
  pb.回合=num(pb.回合,0)+1;
  // 兴奋消耗：战斗内每次攻防性欲 -2（数值驱动，面板自动）
  p.性欲=clamp(num(p.性欲,0)-2,0,100);
  // 射精冷却：仅战斗回合递减（每回合 -1，日常不按回合计）
  var _ejPh2=obj(obj(p.生理));
  if(num(_ejPh2.射精冷却剩余,0)>0){_ejPh2.射精冷却剩余=Math.max(0,num(_ejPh2.射精冷却剩余,0)-1)}
  // 玩家行动日志（一条汇总：你攻击了谁/群体打谁）
  State.log.push({
    rk:pb.回合,
    you:isHealRound?'（恢复）':(skills&&skills.length?skills.join('+'):'螺旋'),
    youDmg:atkDmg,
    realDmg:atkDmg,
    herDmg:0,
    herActionType:'玩家回合',
    herActionName:'',
    herSkillNote:atkLine||'',
    herFrom:0,herTo:0,
    meFrom:meFrom,meTo:meTo,
    item:itemNote||'',
    heal:isHealRound?healNote:''
  });
  // 经验（技能+15，写回）
  var exp=obj(pb.本场经验);
  for(var kk in expGain){exp[kk]=num(exp[kk],0)+expGain[kk]}
  // ===== 经验新值（玩家 + 主目标她，AI 照抄 replace 写回，无需计算旧值）=====
  var expStr2='';
  for(var kk3 in exp){var _cs3=obj(obj(obj(p.技能)[kk3]));var _gE2=gainExp(num(_cs3.等级,1),num(_cs3.经验,0),num(exp[kk3],0));expStr2+=(expStr2?',':'')+kk3+'+'+exp[kk3]+'→Lv'+_gE2.等级+'·经验'+_gE2.经验}
  if(!expStr2)expStr2='无';
  var herExpUpdates=null,herExpStr2='';
  // 多目标：每个存活目标各自的主技能/技能组/恢复技能/道具使用次数与经验（写回+显示）
  var herExpMulti={};
  for(var i4=0;i4<alive.length;i4++){
    var t4=alive[i4];
    var _cs4=State.herState[t4.名];
    if(!_cs4)continue;
    var _c4=obj((d.女性角色||{})[t4.名]);
    var _m4=obj(obj(_c4.技能));
    var parts4=[];
    var entry4=null;
    var _useM4=num(_cs4.mainUse,0);
    if(_useM4>0){
      var _gM4=gainExp(num(_m4.等级,1),num(_m4.经验,0),_useM4*15);
      if(!entry4)entry4={};
      entry4.等级=_gM4.等级;entry4.经验=_gM4.经验;
      parts4.push((_m4.名||'主技能')+'(主)×'+_useM4+'+'+(_useM4*15)+'→Lv'+_gM4.等级+'·经验'+_gM4.经验);
    }
    var _gr4=obj(_cs4.grpUse||{});
    var _gkk4=Object.keys(_gr4);
    if(_gkk4.length){
      if(!entry4)entry4={};
      entry4.技能组={};
      for(var _gi4=0;_gi4<_gkk4.length;_gi4++){
        var _gk4=_gkk4[_gi4];
        var _gv4=obj(obj(obj(_c4.技能).技能组)[_gk4]);
        var _gG4=gainExp(num(_gv4.等级,1),num(_gv4.经验,0),_gr4[_gk4]*15);
        entry4.技能组[_gk4]={等级:_gG4.等级,经验:_gG4.经验};
        parts4.push(_gk4+'(组)×'+_gr4[_gk4]+'+'+(_gr4[_gk4]*15)+'→Lv'+_gG4.等级+'·经验'+_gG4.经验);
      }
    }
    var _hu4=num(_cs4.healUse,0);
    if(_hu4>0){
      var _hc4=obj(obj(_c4.恢复技能));
      var _hG4=gainExp(num(_hc4.等级,1),num(_hc4.经验,0),_hu4*15);
      if(!entry4)entry4={};
      entry4.恢复={名:_hc4.名||'恢复',等级:_hG4.等级,经验:_hG4.经验};
      parts4.push((_hc4.名||'恢复')+'(恢复)×'+_hu4+'+'+(_hu4*15)+'→Lv'+_hG4.等级+'·经验'+_hG4.经验);
    }
    var _its4=_cs4.items||[];
    if(_its4.length){
      if(!entry4)entry4={};
      entry4.道具=_its4.slice();
      var _itCount={};
      for(var _ii4=0;_ii4<_its4.length;_ii4++){_itCount[_its4[_ii4]]=(_itCount[_its4[_ii4]]||0)+1}
      var _itParts=[];
      for(var _ik4 in _itCount){_itParts.push(_ik4+'×'+_itCount[_ik4])}
      parts4.push('道具：'+_itParts.join('、'));
    }
    if(entry4)herExpMulti[t4.名]=entry4;
    if(parts4.length)herExpStr2+=(herExpStr2?'；':'')+t4.名+'['+parts4.join('，')+']';
  }
  if(herExpStr2)herExpUpdates=herExpMulti;
  var pBufS2=[];for(var pbk3 in pbuffs){pBufS2.push(pbk3+'('+num(pbuffs[pbk3].剩余回合,0)+'回合)')}
  var hBufS2=[];for(var hbk3 in hbuffs){hBufS2.push(hbk3+'('+num(hbuffs[hbk3].剩余回合,0)+'回合)')}
  // 胜负 + 结算
  var allDead=targets.every(function(tt){return num(tt.防守值,0)<=0});
  var meDead=meTo<=0;
  State.finished=allDead||meDead;
  if(State.finished){
    var youWin=allDead;
    State.multiSettle={};
    var settleLines=[];
    for(var i3=0;i3<targets.length;i3++){
      var t3=targets[i3];
      var c3=obj((d.女性角色||{})[t3.名]);
      var jxChange=youWin?(clamp(11-num(pb.回合,0)*2,1,10)+(Math.floor(Math.random()*3)-1)):-(clamp(11-num(pb.回合,0)*2,1,10)+(Math.floor(Math.random()*3)-1));
      var jxNew=clamp(num(c3.缴械值,0)+jxChange,0,100);
      c3.缴械值=jxNew;
      State.multiSettle[t3.名]={jxChange:jxChange};
      settleLines.push(t3.名+'缴械值'+(jxChange>=0?'+':'')+jxChange+'→'+jxNew);
    }
    var lootNote='';
    if(youWin){for(var _li=0;_li<targets.length;_li++){var _lt=targets[_li];if(num(_lt.防守值,0)<=0){var _lc4=obj((d.女性角色||{})[_lt.名]);var _cim=obj(_lc4.道具栏);var _ck4=Object.keys(_cim);if(_ck4.length&&Math.random()<0.4){var _pk4=_ck4[Math.floor(Math.random()*_ck4.length)];var _am4=num(_cim[_pk4],1);_cim[_pk4]=Math.max(0,_am4-1);if(!obj(p.道具栏)[_pk4])p.道具栏[_pk4]=0;p.道具栏[_pk4]=num(p.道具栏[_pk4],0)+1;lootNote+=(lootNote?'；':'')+'缴获『'+_pk4+'』×1'}if(num(_lc4.缴械值,0)>=60){var _psk4=Object.keys(obj(p.技能));if(_psk4.length){var _p5=_psk4[Math.floor(Math.random()*_psk4.length)];var _gL4=gainExp(num(obj(obj(p.技能)[_p5]).等级,1),num(obj(obj(p.技能)[_p5]).经验,0),30);obj(obj(p.技能)[_p5]).等级=_gL4.等级;obj(obj(p.技能)[_p5]).经验=_gL4.经验;if(!expGain[_p5])expGain[_p5]=0;expGain[_p5]+=30;lootNote+=(lootNote?'；':'')+'技能心得→'+_p5+'+30经验'}}}}}
    State.resultText='【多人战斗结算】目标='+tgt+'（'+targets.length+'人）｜回合数='+pb.回合+'｜结果='+(youWin?'你胜':'你败')+'\n'
      +'你的攻击：'+(isHealRound?'（恢复）':(skills.join('+')+' → '+atkLine))+'\n'
      +'她们依次行动：'+(logLines.length?logLines.join('；'):'（本回合无人攻击你）')+'｜你剩余防守值'+meTo+'/'+num(pb.主角防守值上限,96)+'\n'
      +settleLines.join('；')+'\n'
      +'经验：你['+expStr2+'] 她['+(herExpStr2||'无')+']'+'\n'
      +(pBufS2.length||hBufS2.length?('BUFF状态：你['+(pBufS2.join('、')||'无')+'] 她['+(hBufS2.join('、')||'无')+']'+'\n'):'')
      +(lootNote?('战利品：'+lootNote+'\n'):'')
      +'注：数值已由战斗面板写入 stat_data（唯一真源），AI 按每人各自的攻击方式与癖好逐一叙事，勿重复结算。';
  }
  State.selSkills=[];State.actionText='';State.pendingHeal=null;State.selTarget='';
  // 持久化每个目标的当前防守值到目标列表（字符串→对象）：状态栏/重渲染才能读到实时值，
  // 且下次 normTargets 走对象分支自动用持久值（不再每回合满 cap）
  var _tl6=pb.目标列表;
  if(_tl6&&Array.isArray(_tl6)){
    for(var _ti6=0;_ti6<targets.length&&_ti6<_tl6.length;_ti6++){
      var _t6=targets[_ti6];
      if(typeof _tl6[_ti6]==='string'){_tl6[_ti6]={名:_tl6[_ti6]}}
      _tl6[_ti6].防守值=Math.max(0,num(_t6.防守值,0));
      _tl6[_ti6].防守值上限=num(_t6.防守值上限,0)>0?_t6.防守值上限:herDefCap(obj((d.女性角色||{})[_t6.名]));
    }
  }
  persistBattle(pb,herExpUpdates,playerExpUpdatesFromGain(expGain,p),healExpUpdate?{key:healSkillKey,等级:num(obj(obj(p.恢复技能)[healSkillKey]).等级,1),经验:num(obj(obj(p.恢复技能)[healSkillKey]).经验,0)}:null);
  render();
}

function playerExpUpdatesFromGain(expGain,p){
  var updates={};
  for(var kk in expGain){
    var cur=obj(obj(obj(p).技能)[kk]);
    var _g9=gainExp(num(cur.等级,1),num(cur.经验,0),15);var newLv=_g9.等级;var newExp=_g9.经验;
    updates[kk]={等级:newLv,经验:newExp};
  }
  return updates;
}

/* ===== 战斗API设置按钮（输入框上方脚本按钮 → 独立弹窗）===== */
function ydsLoadApiCfg(){
  var cfg=null;
  try{var raw=localStorage.getItem('yu_wang_api_cfg');if(raw)cfg=JSON.parse(raw)}catch(e){}
  return cfg||{mode:'preset',preset:'',url:'',key:'',model:'',temp:'same_as_preset',maxtok:'same_as_preset',on:true};
}
/* 拉取模型列表（按当前模式；TH getModelList 支持 custom {apiurl,key} / proxy {proxy_preset} / preset {}）*/
async function ydsLoadModelsInto(popup){
  try{
    var btn=popup.querySelector('[data-act="load-models"]');
    if(btn){btn.textContent='⏳ 拉取中…';btn.disabled=true}
    var mode=popup.dataset.mode||'preset';
    var gv=function(k){var el=popup.querySelector('[data-k="'+k+'"]');return el?el.value:''};
    var gm=typeof getModelList==='function'?getModelList:null;
    if(!gm){if(btn){btn.textContent='⚠ 不可用';setTimeout(function(){btn.textContent='🔄 拉取';btn.disabled=false},1500)}return}
    var list=null;
    if(mode==='custom'){list=await gm({apiurl:gv('url')||undefined,key:gv('key')||undefined})}
    else if(mode==='proxy'){list=await gm({proxy_preset:gv('preset')||undefined})}
    else{list=await gm({})}
    var sel=popup.querySelector('[data-k="model"]');
    if(sel&&Array.isArray(list)){
      var cur=sel.value;
      sel.innerHTML='<option value="">— 选择模型 —</option>';
      for(var i=0;i<list.length;i++){
        var o=document.createElement('option');
        o.value=list[i];o.textContent=list[i];
        if(list[i]===cur)o.selected=true;
        sel.appendChild(o);
      }
      sel.innerHTML+='<option value="__custom__">✏️ 手动输入…</option>';
    }
    if(btn){btn.textContent='✅ '+(list&&list.length?list.length:0)+' 个模型';setTimeout(function(){btn.textContent='🔄 拉取';btn.disabled=false},1500)}
  }catch(e){
    console.error('[战斗API设置] 拉取模型失败',e);
    var btn2=popup.querySelector('[data-act="load-models"]');
    if(btn2){btn2.textContent='⚠ 拉取失败';setTimeout(function(){btn2.textContent='🔄 拉取';btn2.disabled=false},2000)}
  }
}
function ydsOpenApiPopup(){
  try{
    var doc=hostDoc2();
    if(doc.getElementById('yds-api-popup')){doc.getElementById('yds-api-popup').remove()}
    var cfg=ydsLoadApiCfg();
    var popup=doc.createElement('div');
    popup.id='yds-api-popup';
    popup.style.cssText='position:fixed;top:18%;left:50%;transform:translateX(-50%);z-index:99999;background:#1b1b23;border:1px solid rgba(224,82,94,.35);border-radius:10px;padding:16px 18px;width:350px;color:#e8e6e1;font-family:system-ui,sans-serif;font-size:13px;box-shadow:0 10px 36px rgba(0,0,0,.55)';
    popup.innerHTML='<div style="font-weight:700;color:#e0525e;margin-bottom:10px">🔧 战斗面板 · 副API描写设置</div>'
      +'<div style="margin-bottom:8px"><label style="color:#9b988f;font-size:11px">模式</label></div>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px" data-yds-mode>'
      +'<button data-v="preset" style="flex:1;padding:5px 0;border-radius:6px;border:1px solid #fff3;background:rgba(255,255,255,.05);color:#9b988f;cursor:pointer">跟随当前预设</button>'
      +'<button data-v="proxy" style="flex:1;padding:5px 0;border-radius:6px;border:1px solid #fff3;background:rgba(255,255,255,.05);color:#9b988f;cursor:pointer">代理预设</button>'
      +'<button data-v="custom" style="flex:1;padding:5px 0;border-radius:6px;border:1px solid #fff3;background:rgba(255,255,255,.05);color:#9b988f;cursor:pointer">自定义API</button></div>'
      +'<div data-yds-proxy style="display:none;margin-bottom:8px"><label style="color:#9b988f;font-size:11px">代理预设名</label><input data-k="preset" style="width:100%;margin-top:4px;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:rgba(255,255,255,.05);color:#e8e6e1" placeholder="代理预设名称"></div>'
      +'<div data-yds-custom style="display:none;margin-bottom:8px">'
      +'<label style="color:#9b988f;font-size:11px">API地址</label><input data-k="url" style="width:100%;margin-top:4px;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:rgba(255,255,255,.05);color:#e8e6e1;margin-bottom:6px" placeholder="https://...">'
      +'<label style="color:#9b988f;font-size:11px">API Key</label><input data-k="key" type="password" style="width:100%;margin-top:4px;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:rgba(255,255,255,.05);color:#e8e6e1;margin-bottom:6px" placeholder="sk-...">'
      +'<label style="color:#9b988f;font-size:11px">模型</label>'
      +'<div style="display:flex;gap:6px;margin-top:4px"><select data-k="model" style="flex:1;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:#1b1b23;color:#e8e6e1"><option value="">— 选择模型 —</option><option value="__custom__">✏️ 手动输入…</option></select>'
      +'<button data-act="load-models" style="padding:4px 10px;border-radius:5px;border:1px solid #6aa8d8;background:rgba(106,168,216,.15);color:#6aa8d8;cursor:pointer;flex-shrink:0">🔄 拉取</button></div>'
      +'<input data-k="model-custom" style="width:100%;margin-top:6px;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:rgba(255,255,255,.05);color:#e8e6e1;display:none" placeholder="手动输入模型名（选择手动输入时用此项）"></div>'
      +'<div style="margin-bottom:10px"><label style="color:#9b988f;font-size:11px">温度</label><select data-k="temp" style="width:100%;margin-top:4px;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:#1b1b23;color:#e8e6e1">'
      +'<option value="same_as_preset">同预设</option><option value="0.6">0.6 稳定</option><option value="0.9">0.9 活泼</option><option value="1.2">1.2 发散</option></select></div>'
      +'<div style="margin-bottom:12px"><label style="color:#9b988f;font-size:11px">字数上限（描写回复长度）</label><select data-k="maxtok" style="width:100%;margin-top:4px;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:#1b1b23;color:#e8e6e1">'
      +'<option value="same_as_preset">同预设</option><option value="200">200</option><option value="300">300</option><option value="500">500</option></select></div>'
      +'<div style="margin-bottom:12px"><label style="color:#9b988f;font-size:11px">失败自动重试</label><select data-k="retry" style="width:100%;margin-top:4px;padding:4px 6px;border-radius:5px;border:1px solid #fff3;background:#1b1b23;color:#e8e6e1">'
      +'<option value="0">0 次（失败即降级纯数值）</option><option value="1">1 次</option><option value="2">2 次</option><option value="3">3 次</option></select></div>'
      +'<div style="display:flex;gap:8px"><button data-act="save" style="flex:1;padding:7px 0;border-radius:6px;border:none;background:#e0525e;color:#fff;font-weight:700;cursor:pointer">💾 保存</button>'
      +'<button data-act="close" style="flex:1;padding:7px 0;border-radius:6px;border:1px solid #fff3;background:transparent;color:#9b988f;cursor:pointer">关闭</button></div>';
    doc.body.appendChild(popup);
    popup.dataset.mode=cfg.mode||'preset';
    var setVal=function(k,v){var el=popup.querySelector('[data-k="'+k+'"]');if(el)el.value=v};
    setVal('preset',cfg.preset||'');setVal('url',cfg.url||'');setVal('key',cfg.key||'');setVal('model',cfg.model||'');setVal('temp',cfg.temp||'same_as_preset');setVal('maxtok',cfg.maxtok||'same_as_preset');setVal('retry',String(cfg.retry==null?0:cfg.retry));
    var modelSel0=popup.querySelector('[data-k="model"]');
    if(cfg.model&&modelSel0){var hasOpt=false;for(var oi=0;oi<modelSel0.options.length;oi++){if(modelSel0.options[oi].value===cfg.model){modelSel0.options[oi].selected=true;hasOpt=true}}if(!hasOpt){modelSel0.value='__custom__';var mc0=popup.querySelector('[data-k="model-custom"]');if(mc0){mc0.value=cfg.model;mc0.style.display=''}}}
    var applyMode=function(mode){
      var btns=popup.querySelectorAll('[data-yds-mode] button');
      for(var i=0;i<btns.length;i++){
        var b=btns[i];
        b.style.borderColor=b.getAttribute('data-v')===mode?'#e0525e':'#fff3';
        b.style.color=b.getAttribute('data-v')===mode?'#e0525e':'#9b988f';
      }
      popup.querySelector('[data-yds-proxy]').style.display=mode==='proxy'?'':'none';
      popup.querySelector('[data-yds-custom]').style.display=mode==='custom'?'':'none';
    };
    applyMode(cfg.mode||'preset');
    popup.addEventListener('click',function(e){
      var t=e.target;
      var v=t.getAttribute&&t.getAttribute('data-v');
      if(v){popup.dataset.mode=v;applyMode(v);return}
      var act=t.getAttribute&&t.getAttribute('data-act');
      if(act==='close'){popup.remove();return}
      if(act==='load-models'){ydsLoadModelsInto(popup);return}
      if(act==='save'){
        var gv=function(k){var el=popup.querySelector('[data-k="'+k+'"]');return el?el.value:''};
        // 模型取值：手动输入优先，其次下拉选择
        var modelSel=popup.querySelector('[data-k="model"]');
        var modelCustom=popup.querySelector('[data-k="model-custom"]');
        var modelVal='';
        if(modelCustom&&modelCustom.style.display!=='none'&&modelCustom.value){modelVal=modelCustom.value}
        else if(modelSel&&modelSel.value&&modelSel.value!=='__custom__'){modelVal=modelSel.value}
        var newCfg={mode:popup.dataset.mode||'preset',preset:gv('preset'),url:gv('url'),key:gv('key'),model:modelVal,temp:gv('temp')||'same_as_preset',maxtok:gv('maxtok')||'same_as_preset',retry:parseInt(gv('retry')||'0',10)||0,on:cfg.on!==false};
        try{localStorage.setItem('yu_wang_api_cfg',JSON.stringify(newCfg))}catch(e2){}
        if(CURRENT&&CURRENT.State){
          var st=CURRENT.State;
          st.apiMode=newCfg.mode;st.apiPreset=newCfg.preset;st.apiUrl=newCfg.url;st.apiKey=newCfg.key;st.apiModel=newCfg.model;st.apiTemp=newCfg.temp;st.apiMaxTokens=newCfg.maxtok;st.apiRetry=newCfg.retry||0;st.flavorOn=newCfg.on;
        }
        popup.remove();
        try{render()}catch(e3){}
      }
    });
    popup.addEventListener('change',function(e){
      var t=e.target;
      if(t.getAttribute&&t.getAttribute('data-k')==='model'){
        var mc=popup.querySelector('[data-k="model-custom"]');
        if(mc){mc.style.display=t.value==='__custom__'?'':'none'}
      }
    });
  }catch(e){console.error('[战斗API设置]',e)}
}

/* 变量驱动自动挂载：AI 写了战斗变量（战斗状态=进行中）但漏输出 <BattleUI/> 时，自动插入挂载点 */
function autoMountBattle(){
  try{
    var doc=hostDoc2();
    var mes=doc.querySelector('#chat > .mes:last-child');
    if(!mes)return;
    var mesText=mes.querySelector('.mes_text');
    if(!mesText)return;
    var mesid=parseInt(mes.getAttribute('mesid'),10);
    if(isNaN(mesid))return;
    // 兜底挂载：角色消息(含状态栏或战斗占位符)且变量有排班结构，即可挂载面板
    var txt=mesText.textContent||'';
    var hasStatus=/(StatusPlaceHolderImpl|BattleUI)/.test(txt);
    if(!hasStatus)return;
    if(mesText.querySelector('[data-yds-battle-mount]'))return;
    var vars=null;
    try{vars=typeof getVariables==='function'?getVariables({type:'message',message_id:mesid}):null}catch(e){vars=null}
    var stat=vars&&(vars.stat_data&&typeof vars.stat_data==='object'?vars.stat_data:vars);
    if(!stat||!stat.排班)return;
    var div=doc.createElement('div');
    div.setAttribute('data-yds-battle-mount','1');
    div.style.cssText='display:none';
    div.textContent='⚔ 战斗面板';
    mesText.appendChild(div);
    console.log('[战斗面板] 兜底自动挂载：楼层'+mesid);
    scanAndInject();
  }catch(e){console.error('[战斗面板] 自动挂载失败',e)}
}

/* 启动 */
$(async function(){
  // 脚本 iframe 里 Mvu 全局不可靠（MVU 不注入），等 1s 超时兜底，绝不阻塞扫描
  try{await Promise.race([waitGlobalInitialized('Mvu'),new Promise(function(r){setTimeout(r,1000)})])}catch(e){}
  scanAndInject();
  // 事件驱动刷新：tavern_events 枚举优先（STDB C1）；MVU 事件用本地常量（Mvu 全局不可用，禁止裸手写字符串防拼写错）
  var YDS_MVU_EV={VARIABLE_INITIALIZED:'mag_variable_initialized',VARIABLE_UPDATE_STARTED:'mag_variable_update_started',VARIABLE_UPDATE_ENDED:'mag_variable_update_ended'};
  try{
    if(typeof eventOn==='function'){
      var te=typeof tavern_events!=='undefined'?tavern_events:null;
      eventOn(te?te.MESSAGE_UPDATED:'message_updated',function(){setTimeout(refreshAll,300)});
      eventOn(te?te.MESSAGE_RECEIVED:'message_received',function(){setTimeout(function(){refreshAll();autoMountBattle()},1000)});
      eventOn(te?te.MESSAGE_EDITED:'message_edited',function(){setTimeout(refreshAll,400)});
      eventOn(te?te.GENERATION_ENDED:'generation_ended',function(){setTimeout(function(){refreshAll();autoMountBattle()},800)});
      eventOn(YDS_MVU_EV.VARIABLE_UPDATE_ENDED,function(){setTimeout(function(){refreshAll();autoMountBattle()},300)});
      eventOn(YDS_MVU_EV.VARIABLE_INITIALIZED,function(){setTimeout(refreshAll,500)});
    }
  }catch(e){}
  // MutationObserver 兜底（新消息渲染产生挂载点）
  try{
    var doc=hostDoc2();
    var obs=new MutationObserver(function(){setTimeout(scanAndInject,250)});
    obs.observe(doc.body,{childList:true,subtree:true});
  }catch(e){}
  // TH iframe 重建后强制重绑所有挂载点事件
  try{
    var mdoc=hostDoc2();
    var mts=mdoc.querySelectorAll(MOUNT_SEL);
    for(var mi=0;mi<mts.length;mi++){
      try{if(mts[mi].shadowRoot)rebindEvents(mts[mi],mts[mi].shadowRoot)}catch(e2){}
    }
  }catch(e3){}
  // 输入框脚本按钮：战斗API设置 → 弹窗
  try{
    if(typeof eventOn==='function'&&typeof getButtonEvent==='function'){
      eventOn(getButtonEvent('战斗API设置'),function(){ydsOpenApiPopup()});
    }
  }catch(e){}
});
// pagehide 清理（只移除注入标记，不动 shadow——TH 脚本 iframe 重建时新脚本会重新注入覆盖；
// 若清空 shadow 且 injected 残留，会导致挂载点永久"加载中"）
$(window).on('pagehide',function(){
  try{
    var doc=hostDoc2();
    var mounts=doc.querySelectorAll('[data-yds-battle-mount]');
    for(var i=0;i<mounts.length;i++){
      try{mounts[i].removeAttribute('data-yds-injected');mounts[i].removeAttribute('data-yds-ready')}catch(e){}
    }
  }catch(e){}
});
})();
