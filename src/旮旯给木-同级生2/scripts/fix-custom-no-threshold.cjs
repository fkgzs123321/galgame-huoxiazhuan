// 修 ① 的错误：自定义不该有「反抗值不足就不能用」的门槛
//   门槛只在「拒绝」那边（用户第 ② 条要求）
//   自定义 = 「用一次就掏空」的代价 → 不设门槛，扣到 0 为止
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let h = fs.readFileSync(p, 'utf8');
const 记录 = [];

// 1) 自定义按钮去掉 disabled
const a = `+'<button class="fr" type="button"'+(当前反抗<50?' disabled title="反抗值不够"':'')+'>自定义</button>'`;
if (h.includes(a)) { h = h.replace(a, `+'<button class="fr" type="button">自定义</button>'`); 记录.push('自定义按钮去掉 disabled'); }

// 2) 自定义不设门槛：删掉「反抗不够就拦住」那段
const b = `      if(反抗<耗){ if(res){res.className='res on no';res.textContent='反抗值不够（要 '+耗+'，你只有 '+反抗+'）。';} return; }`;
if (h.includes(b)) { h = h.replace(b, `      /* 自定义不设门槛：不够也照扣，扣到 0 —— 这是「用一次就掏空」的代价 */`); 记录.push('自定义不设门槛'); }

// 3) 文案改清楚
const c = `+'<span class="tx">自己来 —— 不按她摆的，照自己的想法硬做一次</span>'`;
if (h.includes(c)) { h = h.replace(c, `+'<span class="tx">自定义 —— 写一件你想做的事，照自己的来（掏空反抗值，一局顶多一两次）</span>'`); 记录.push('文案改清楚'); }

// 4) tip 补一句
h = h.replace('自己来＝照自己的想法做一次，代价最大，一局基本只用一两次',
              '自定义＝照自己的想法做一次，**掏空反抗值**，一局基本只用一两次');

fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 语法通过（' + h.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 80)); process.exit(1); }
console.log('   改动：' + (记录.join(' ｜ ') || '（无）'));
console.log('   自定义仍有 disabled: ' + /class="fr"[^>]*disabled/.test(h));
console.log('   自定义的门槛判断已删: ' + !h.includes('自定义不设门槛') === false);
