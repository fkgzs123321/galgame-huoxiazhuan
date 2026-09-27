// 恢复"推送给 AI"—— 用官方接口 createChatMessages([{role, message}])，但【不 await】避免卡住
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;
const 换 = (a, b, tag) => {
  const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
  const c = t.split(A).length - 1;
  if (!c) { console.log('  ⚠ 未命中 ' + tag); return; }
  t = t.split(A).join(B); n += c; console.log('✓ ' + tag);
};

// ① 那个"删掉推送"的注释块 → 换成正确的推送函数
换(`/* ★ 2026-09-22：删掉「/setinput → /send → /trigger」那套推送。
   同级生2 的 refuse() 根本不做推送 —— 它只在面板里算完、set() 写变量、把结果显示出来，
   AI 下一轮读 局面.判定结果 就知道发生了什么。
   我原来的写法里 await triggerSlash('/trigger') 永不返回 → S.busy 卡在 true → 卡片右上角 ✦ 一直转。 */`,
`/* ══ 推给 AI（2026-09-22 按 @types 官方接口重做）══
   之前错了两处：① 参数写 content（官方是 message）② await 了它 → 一旦不 resolve 就把界面卡住。
   现在：createChatMessages([{role:'user', message}]) 在聊天末尾插一条【玩家发言】，
   AI 下一轮一定读到。★ 不 await、不用 busy —— 发射后不管，界面不会卡。
   另外仍把结论写进 局面.判定结果 作为双保险（世界书 EJS 也能读到）。 */
function 推给AI(文本){
  try{
    if(typeof createChatMessages==="function"){
      createChatMessages([{ role:"user", message:String(文本) }]);      /* ★ 不 await */
      return true;
    }
  }catch(e){ console.warn("[欲妈群] createChatMessages 失败",e); }
  try{
    if(typeof triggerSlash==="function"){                               /* 兜底：走输入框 */
      triggerSlash("/setinput "+JSON.stringify(String(文本)));
      triggerSlash("/send "+JSON.stringify(String(文本)));
      return true;
    }
  }catch(e){ console.warn("[欲妈群] triggerSlash 失败",e); }
  S.source="没能推给 AI";
  return false;
}`,
   '推给AI 重做');

// ② doRoll：判定完 → 推给 AI（不 await）+ 写变量
换(`    S.结果=说明+"　（P"+Math.round(P)+" − R"+R+" = D"+D+"　成功率"+S+"%　掷"+V+" → "+综合+"）";
    await refresh(false);`,
`    var 摘要=(追发?追发+"\\n":"")
      +"【判定】"+skill+"　难度"+难度名
      +"　能力 P="+Math.round(P)+"　她的要求 R="+R+"　差值 D="+D
      +"　成功率 "+S+"%　掷出 "+V+"　→ "+综合+_ev
      +"\\n【结果】"+说明
      +"\\n★ 按上面这个结果写这一轮：你不是裁判，不要自己另掷骰、不要改数值、不要重算。";
    推给AI(摘要);                                                          /* ★ 不 await */
    S.结果=说明+"　（P"+Math.round(P)+" − R"+R+" = D"+D+"　成功率"+S+"%　掷"+V+" → "+综合+"）";
    refresh(false);`,
   'doRoll 推送');

// ③ 看着她：也推
换(`    S.结果="他什么都没做，就看着她。";`,
`    推给AI("【我这轮的动作】我什么都没做，就看着她。「"+文本+"」\\n★ 按她这一条往下写，不要自己另掷骰、不要改数值。");
    S.结果="他什么都没做，就看着她。";`,
   '看着她 推送');

// ④ 交给她判：也推（让她判这件事该用什么技能/难度）
换(`    S.结果="已经记下来了：「"+文+"」。现在你自己发一句话（比如「我这样做」）—— 她会判这件事该用什么技能与难度。";`,
`    推给AI("【我这轮想做】"+文+"\\n"
      +"★ 请先判断这件事该用哪个技能（观察／行动／意志）、什么等级（微／中／强／极）、主对（识破／拦住／扛住／全场），"
      +"写进 局面.自定义.{文本,技能,等级,主对} 并把 待掷 置 true；"
      +"你这次不要掷骰，等她按你给的值掷完再把结果给你。");
    S.结果="已经交给她判了：「"+文+"」。她判完，面板上会出「掷骰」按钮。";`,
   '交给她判 推送');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');
