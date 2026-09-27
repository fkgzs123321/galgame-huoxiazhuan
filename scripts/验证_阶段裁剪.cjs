// 验证 8 套「阶段.yaml」：只有熟练度一个变量，5 档 EJS 精准裁剪
const fs = require('fs');
const path = require('path');
const DIR = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/世界书/角色/屏幕外的她';
const 人 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清', '郁灼'];

function render(tpl, vars) {
  const parts = tpl.split(/(<%[\s\S]*?%>)/);
  let body = '';
  for (const seg of parts) {
    if (seg.startsWith('<%')) {
      let code = seg.slice(2, -2);
      if (code.startsWith('_')) code = code.slice(1);
      if (code.endsWith('_')) code = code.slice(0, -1);
      body += code + '\n';
    } else body += '__out += ' + JSON.stringify(seg) + ';\n';
  }
  return new Function('getvar', 'let __out = "";\n' + body + '\nreturn __out;')(vars);
}

const 档 = ['新手', '上手', '沉浸', '狂热', '收官'];
const 值 = [1, 30, 50, 70, 90];

let bad = 0, maxR = 0; const 问题 = [];
for (const n of 人) {
  const tpl = fs.readFileSync(path.join(DIR, n, '阶段.yaml'), 'utf8');
  // 结构：不许再出现第二个变量
  if (/getvar\('stat_data\.她\.目的进度'/.test(tpl)) { 问题.push(`${n}: 阶段里还在读 目的进度`); bad++; }
  if (tpl.includes('目的进度 · 只渲染')) { 问题.push(`${n}: 阶段里还留着目的进度段`); bad++; }
  if (!/她的手段（★/.test(tpl)) { 问题.push(`${n}: 缺「她的手段」`); bad++; }
  if (/\n\s*她的样子\[?/.test('') ) {}
  // 身子描写：每档一份。新版是散文（「她这一档的身子」），旧版是清单（「她的样子（★…）」）
  const 散文 = (tpl.match(/她这一档的身子/g) || []).length;
  const 清单 = (tpl.match(/她的样子（★ 这一档她的身体是这样）/g) || []).length;
  const 明细 = 散文 + 清单;
  if (明细 !== 5) { 问题.push(`${n}: 身子描写应为 5 处（每档一份），实为 ${明细}（散文 ${散文} / 清单 ${清单}）`); bad++; }
  if (散文 > 0 && 清单 > 0) { 问题.push(`${n}: 混用了散文与清单两种身子写法`); bad++; }
  if (tpl.includes('她的样子: 见上面')) { 问题.push(`${n}: 还有「见上面」式引用`); bad++; }
  if (!/<% \{ %>/.test(tpl) || !/\n<% \} %>/.test(tpl)) { 问题.push(`${n}: 缺块作用域收尾`); bad++; }

  let 本套 = [];
  for (const v of 值) {
    let out;
    try { out = render(tpl, (k) => k.includes('熟练度') ? v : ''); }
    catch (e) { 问题.push(`${n} 熟=${v}: 渲染异常 ${e.message.split('\n')[0]}`); bad++; continue; }
    const 出 = 档.filter(x => new RegExp('^' + x + '$', 'm').test(out));
    if (!(出.length === 1 && 出[0] === 档[值.indexOf(v)])) {
      问题.push(`${n} 熟=${v}: 裁错，出了 [${出}]，期望 [${档[值.indexOf(v)]}]`); bad++; continue;
    }
    本套.push(out.length); maxR = Math.max(maxR, out.length);
  }
  console.log(`✓ ${n.padEnd(3)} 文件 ${String(tpl.length).padStart(5)} 字符 ｜ 渲染 ${Math.min(...本套)}~${Math.max(...本套)} 字符`);
}

console.log(`\n最大渲染 ${maxR} 字符（上限 5000）`);
if (问题.length) { console.log('问题：'); 问题.forEach(x => console.log('  - ' + x)); }
console.log(bad ? `异常 ${bad} 个` : '全部通过：5 档/套 × 8 套 = 40 次裁剪正确 / 单变量 / 无引用式写法');
