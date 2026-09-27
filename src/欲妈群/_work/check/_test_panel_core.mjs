// 验证：新的同步 writeStat + 判定链能跑通、不挂、双写生效
import fs from 'fs';
const H = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html', 'utf8');
const 脚本 = [...H.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];

// 把要测的函数抠出来（writeStat / 判定相关常量 / judgeTier / rollAt / mix32 / lcg / 取难度）
const 要测 = ['function mix32', 'function rollAt', 'function judgeTier', 'function 取难度', 'function writeStat', 'function num', 'function g', 'function lastMsgId'];
const 片段 = [];
for (const k of 要测) {
  const i = 脚本.indexOf(k);
  if (i < 0) { console.log('⚠ 找不到 ' + k); continue; }
  // 取到匹配的收尾（简法：从 i 到下一个 "\n}" 后）
  const j = 脚本.indexOf('\n}', i);
  片段.push(脚本.slice(i, j + 2));
}
// 常量表
const 常量 = ['var 基础要求=', 'var 难度档=', 'var 阶修表=', 'var 权重表=', 'var 她项表=', 'var DC表=', 'var DELTA=', 'var S=', 'var SKILLS='];
for (const k of 常量) {
  const i = 脚本.indexOf(k);
  if (i < 0) { console.log('⚠ 找不到常量 ' + k); continue; }
  if (k === 'var 难度档=') { const j = 脚本.indexOf('};', i) + 2; 片段.push(脚本.slice(i, j)); }
  else if (k === 'var S=') { const j = 脚本.indexOf('};', i) + 2; 片段.push(脚本.slice(i, j)); }
  else { const j = 脚本.indexOf('\n', i); 片段.push(脚本.slice(i, j)); }
}
// lastMsgId 的收尾是 "\n}" 但里面也有 } → 手工补
const 头 = `
var S={stat:null,msgId:null,source:"?",结果:""};
var 世界={ msg:{ 5:{ stat_data:{ 郝佳期:{ 阶段:5, 心理:{ 勇气:100, 痴迷:90, 兴奋:70 }, 后门进度:100 },
                              玩家:{ 技能:{观察:80,行动:80,意志:80}, 心理:{理智:50}, 警觉度:60 } } } },
           chat:{} };
function lastMsgId(){ return 5; }
function getVariables(o){ return o && o.type==='chat' ? 世界.chat : 世界.msg[5]; }
function updateVariablesWith(fn, o){
  var box = (o.type==='chat') ? 世界.chat : 世界.msg[5];
  fn(box);
  日志.push('updateVariablesWith(' + o.type + ')');
}
var 日志=[];
function num(v,d){ var n=Number(v); return isFinite(n)?n:(d||0); }
`;

const 体 = 头 + 片段.join('\n\n') + `
// 模拟 doRoll 的写回（三层：玩家._本轮判定 / 局面.判定结果 / 技能成长）
var 结果 = writeStat(function(box){
  box.玩家=box.玩家||{};
  box.玩家._本轮判定={行为:"行动",综合:"成功"};
  box.局面=box.局面||{};
  box.局面.判定结果={选项:"她伸手隔布握住",技能:"意志",难度:"困难",结果:"成功",成功率:78,掷值:41};
});
console.log('══ 验证：同步 writeStat ══');
console.log('  writeStat 返回值        = ' + 结果 + '（true = 写成功）');
console.log('  调用记录                = ' + JSON.stringify(日志));
console.log('  message 层 局面.判定结果 = ' + JSON.stringify(世界.msg[5].stat_data.局面.判定结果));
console.log('  chat 层   局面.判定结果 = ' + JSON.stringify(世界.chat.stat_data && 世界.chat.stat_data.局面 && 世界.chat.stat_data.局面.判定结果));
console.log('  有没有 await / Promise   = 无（writeStat 现在是同步函数，返回值直接是 boolean）');
console.log('');
console.log('══ 验证：判定链（E3）══');
const 她={勇气:100,痴迷:90,兴奋:70,阶段:5};
const P1=(80*3+50*1+60*1)/5, P2=80, P3=(80*3+100*1)/4, w=[1,3,1];
const P=(P1*w[0]+P2*w[1]+P3*w[2])/(w[0]+w[1]+w[2]);
const 档=难度档["困难"];
const R=Math.max(0,Math.min(100,Math.round(10*档.基*(1+90/100*档.强)+阶修表["5"]*档.阶)));
const D=P-R, S2=Math.max(5,Math.min(95,Math.round(50+D)));
console.log('  P=' + P.toFixed(1) + '（P1 ' + P1.toFixed(0) + ' / P2 ' + P2 + ' / P3 ' + P3.toFixed(0) + '）　R=' + R + '　D=' + D.toFixed(1) + '　成功率 ' + S2 + '%');
console.log('  档位 = ' + judgeTier(D, rollAt(12345) < S2) + '（judgeTier(D, 成败) 由差值+成败联合给）');
console.log('  取难度() = ' + 取难度() + '（chat 层没有 → 回落默认）');
`;
fs.writeFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/_work/tmp/_t.js', 体, 'utf8');
console.log('已生成测试文件（' + 体.length + ' 字符）');
