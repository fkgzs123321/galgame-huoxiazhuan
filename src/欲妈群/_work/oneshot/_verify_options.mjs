import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const h = fs.readFileSync(CARD + '/正则/状态栏.html', 'utf8');

// ① 残留检查
console.log('① 旧选项显隐段是否删净：');
console.log('   el.hidden=!有 残留：' + ((h.match(/el\.hidden=!有/g) || []).length) + '（应 0）');
console.log('   d-dc- / d-cost- 残留：' + ((h.match(/d-dc-|d-cost-/g) || []).length) + '（应 0）');

// ② 抽出 渲染选项() 单跑：一楼变量 vs 二楼变量
const i = h.indexOf('function 渲染选项(){');
let d = 0, j = i;
for (let k = i; k < h.length; k++) { if (h[k] === '{') d++; if (h[k] === '}') { d--; if (!d) { j = k + 1; break; } } }
const 体 = h.slice(i, j);

const 假box = { innerHTML: '' };
const 假id = n => (n === 'd-opts' ? 假box : null);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DC表 = { 微: 12, 中: 15, 强: 18, 极: 22 };
const 批指纹 = o => ['一', '二', '三', '四'].map(k => String(((o || {})[k] || {}).文本 || '')).join('\u0001');
const S = { stat: null, 锁批: '' };

const 渲染选项 = new Function('id', 'esc', 'DC表', '批指纹', 'S', 'return ' + 体.replace('function 渲染选项', 'function'))(假id, esc, DC表, 批指纹, S);

function 造(文本s) {
  const o = {}; ['一', '二', '三', '四'].forEach((k, n) => { if (文本s[n]) o[k] = { 文本: 文本s[n], 等级: '中', 技能: '意志', 主对: '扛住', 代价: '理智-5' }; });
  return { 当前选项: o, 她已选: '' };
}

console.log('');
console.log('② 单跑 渲染选项()：');
S.stat = { 局面: 造(['一楼A', '一楼B', '一楼C', '一楼D']) };
let c1 = 渲染选项();
const 一楼 = 假box.innerHTML;
console.log('   一楼：渲染 ' + c1 + ' 格');
console.log('   文本：' + (一楼.match(/>一楼[ABCD]</g) || []).join(' '));

S.stat = { 局面: 造(['二楼X', '二楼Y', '二楼Z', '二楼W']) };
let c2 = 渲染选项();
const 二楼 = 假box.innerHTML;
console.log('   二楼：渲染 ' + c2 + ' 格');
console.log('   文本：' + (二楼.match(/>二楼[XYZW]</g) || []).join(' '));

const 变了 = 一楼 !== 二楼 && 二楼.indexOf('二楼X') >= 0 && 二楼.indexOf('一楼A') < 0;
console.log('');
console.log('③ 变量一变、渲染结果跟着变：' + (变了 ? '✅ 是（这就是「选项会更新」）' : '❌ 否'));
console.log('');
console.log('④ 渲染出的第一格 HTML 样子：');
console.log('   ' + (二楼.match(/<div class="opt"[^>]*>[\s\S]*?<\/div>/) || ['—'])[0].replace(/\n/g, ' ').slice(0, 220));
