// 按 引擎模板 判定引擎 E3 重写面板判定：
//   P = 加权平均(三轮) ｜ R = clamp(基础要求 × 难度乘 × (1+她强度/100×权) + 阶段修正, 0, 100)
//   D = P − R ｜ S = clamp(50+D, 5, 95) ｜ V = LCG×100，V<S 成功 ｜ 档位 = judgeTier(D, 成败)
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';

// ① 把参数表（DC表/DIFF/权重表）换成 E3 契参数
const 旧参 = t.match(/var DC表=\{[^\n]*\n[\s\S]*?var 权重表=\{[^\n]*\n/);
if (!旧参) { console.log('⚠ 参数段未命中'); process.exit(1); }
const 新参 = [
  '/* ══ E3 判定的契约参数（机制层规范 · 引擎模板/引擎能力/判定引擎.txt）══',
  '   D = P − R ；S = clamp(50 + D, 5, 95) ；V = LCG×100，V < S 成功 ；档位 = judgeTier(D, 成败)',
  '   ★ 难度用【乘法】不用加法（引擎规范明写：无论基准值多高，难度感受一致）',
  '   ★ S 夹在 5~95：永远不会 0%（留一线）也永远不会有 100%（不出现必胜僵局） */',
  'var 基础要求={"微":15,"中":35,"强":45,"极":55};',
  'var 难度乘={"普通":0.55,"困难":0.95,"地狱":1.35};',
  'var 她强度权重=0.15;                       // R = 基础要求 × 难度乘 × (1 + 她强度/100 × 此值)',
  'var 阶修表={"1":0,"2":4,"3":9,"4":15,"5":24};   // 阶段修正加在【她的要求】上，不是扣他的分',
  'var 权重表={"识破":[3,1,1], "拦住":[1,3,1], "扛住":[1,1,3], "全场":[1,1,1]};',
  'var 她项表={"识破":"勇气", "拦住":"痴迷", "扛住":"兴奋", "全场":""};',
  '/* 档位：由【差值 + 成败】联合决定（引擎规范里修掉的 bug① 就是"分档与成败不同源"） */',
  'function judgeTier(D, ok){',
  '  if(ok){ if(D>=30) return "大成功"; if(D>=10) return "成功"; return "勉强成功"; }',
  '  if(D<=-30) return "大失败";',
  '  return "失败";',
  '}',
].join(eol) + eol;
t = t.replace(旧参[0], 新参);

// ② 判定段整体替换（m1/m2/m3 + rolls + 档位）
const i = t.indexOf('    var m1=Math.round(hExp*df.hk/20)');
const j = t.indexOf('    var 说明=', i);
if (i < 0 || j < 0) { console.log('⚠ 判定段未定位 ' + i + ' ' + j); process.exit(1); }
const 新判 = [
  '    /* ── E3 判定链 ─────────────────────────────────────── */',
  '    var 难度名=取难度();',
  '    /* ① 能力值 P：三轮各自加权，再按【主对】给三轮配权（这就是"每个选项公式不同"） */',
  '    var P1=(他观察*3+他理智*1+他警觉*1)/5;',
  '    var P2=技 + Math.round(willFix);',
  '    var P3=(他意志*3+Math.round(hBack)*1)/4;',
  '    var _w=权重表[String(主对||"拦住")]||权重表["拦住"];',
  '    var P=(P1*_w[0]+P2*_w[1]+P3*_w[2])/(_w[0]+_w[1]+_w[2]);',
  '    /* ② 要求值 R：基础要求 × 难度乘 × (1 + 她强度) + 阶段修正 */',
  '    var _她项=她项表[String(主对||"拦住")]||"";',
  '    var 她强度=_她项?num(h[_她项],0):Math.round((num(h.勇气,50)+num(h.痴迷,0)+num(h.兴奋,0))/3);',
  '    var 她阶段=Math.min(5,Math.max(1,num(h.阶段,1)));',
  '    var R=Math.max(0,Math.min(100,Math.round(基础要求[等级?String(等级):"中"]===undefined?35:基础要求[String(等级)]*难度乘[难度名]*(1+她强度/100*她强度权重)+num(阶修表[String(她阶段)],0))));',
  '    if(强制dc!==undefined&&强制dc!==null){ R=Math.max(0,Math.min(100,Math.round(强制dc*难度乘[难度名]*(1+她强度/100*她强度权重)+num(阶修表[String(她阶段)],0)))); }',
  '    /* ③ 差值 / 成功率 / 掷值 / 档位 */',
  '    var D=Math.round((P-R)*100)/100;',
  '    var S=Math.max(5,Math.min(95,Math.round(50+D)));',
  '    var V=Math.round((rollAt(base,1)%100000)/1000*100)/100;',
  '    var 成功=(V<S);',
  '    var 综合=judgeTier(D,成功);',
  '    var rolls=[V], mods=[], grades=[综合];',
  '    var 警觉=isBack?((综合==="大成功"||综合==="成功")?-(5+((day*13+turn*7)%11)):(DELTA[综合]||0)):(DELTA[综合]||0);',
  '    var _ev="";',
  '    try{',
  '      if(综合==="大失败"){ var _k=((day*7+hour*3+turn)%EVENT_BAD.length); _ev="｜抽到事件："+EVENT_BAD[_k]; }',
  '      else if(综合==="大成功"){ var _k2=((day*11+hour*5+turn)%EVENT_GOOD.length); _ev="｜抽到事件："+EVENT_GOOD[_k2]; }',
  '    }catch(e){}',
  '',
].join(eol);
t = t.slice(0, i) + 新判 + t.slice(j);
fs.writeFileSync(F, t, 'utf8');
console.log('✓ 判定段已按 E3 重写');
console.log('  新参数：基础要求/难度乘/她强度权重/阶修表/权重表/她项表 + judgeTier');
