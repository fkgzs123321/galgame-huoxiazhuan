// 自检：① <script> 语法 ② 宏覆盖率 ③ JS 里引用的 id 是否都在 HTML 里存在
import fs from 'fs';
const P = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html';
const BAK = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/_work/oneshot/_状态栏.html.bak';
const 现在 = fs.readFileSync(P, 'utf8');
const 原 = fs.readFileSync(BAK, 'utf8');

/* ── ① 语法 ── */
const 抠 = h => [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const js = 抠(现在);
fs.writeFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/_work/oneshot/_panel.js', js, 'utf8');
console.log('【① 语法】script 长度 ' + js.length + ' 字节');

/* ── ② 宏覆盖率：JS 拼数值 的处数 ── */
const 拼值式 = [
  [/Math\.round\(num\(/g, 'Math.round(num('],
  [/Math\.round\(pct\(/g, 'Math.round(pct('],
  [/'<span class="v">' *\+/g, '<span class="v">+字符串拼接'],
  [/num\(心\./g, 'num(心.'],
  [/num\(身\./g, 'num(身.'],
  [/num\(心理\./g, 'num(心理.'],
  [/num\(关\./g, 'num(关.'],
  [/num\(统\./g, 'num(统.'],
  [/num\(today\./g, 'num(today.'],
  [/num\(aware\./g, 'num(aware.'],
  [/num\(学业\./g, 'num(学业.'],
  [/num\(竞\./g, 'num(竞.'],
  [/num\(d\.阶段/g, 'num(d.阶段'],
  [/num\(h\.阶段/g, 'num(h.阶段'],
];
function 统计(h, 域) {
  const sc = 抠(h);
  // 只统计「渲染段」里的拼值：整份 script 里找
  const r = {};
  let 合计 = 0;
  拼值式.forEach(([re, 名]) => { const n = (sc.match(re) || []).length; if (n) { r[名] = n; 合计 += n; } });
  return { 明细: r, 合计 };
}
const A = 统计(原); const B = 统计(现在);
console.log('\n【② JS 拼数值处数】改前 ' + A.合计 + ' → 改后 ' + B.合计);
console.log('  改前明细:', JSON.stringify(A.明细));
console.log('  改后明细:', JSON.stringify(B.明细));
const 宏前 = (原.match(/\{\{format_message_variable::/g) || []).length;
const 宏后 = (现在.match(/\{\{format_message_variable::/g) || []).length;
console.log('  宏处数：改前 ' + 宏前 + ' → 改后 ' + 宏后);
const 路 = [...new Set([...现在.matchAll(/\{\{format_message_variable::stat_data\.([^}]+)\}\}/g)].map(m => m[1]))];
console.log('  不同宏路径 ' + 路.length + ' 条');
console.log('  ' + 路.join(' | '));

/* ── ③ id 引用存在性 ── */
const htmlIds = new Set([...现在.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const 用了 = new Set();
[...js.matchAll(/id\("([^"]+)"\)/g)].forEach(m => 用了.add(m[1]));
[...js.matchAll(/(?:填|隐|宽|牌)\("([^"]+)"/g)].forEach(m => 用了.add(m[1]));
[...js.matchAll(/(?:填|隐|宽|牌)\("([^"]+)"\+/g)].forEach(m => 用了.add(m[1] + '<动态>'));
const 动态前缀 = ['d-mem-', 'd-det-', 'd-dot-', 'd-sbar-', 'd-days-', 'd-line-', 'd-party-', 'd-son-', 'd-jz-', 'd-bds-', 'd-str-', 'd-thk-', 'd-opt-', 'd-dc-', 'd-cost-', 'd-vd-r'];
const 缺 = [];
用了.forEach(x => {
  if (x.includes('<动态>')) { const p = x.replace('<动态>', ''); if (![...htmlIds].some(i => i.startsWith(p))) 缺.push(x); return; }
  if (!htmlIds.has(x)) 缺.push(x);
});
console.log('\n【③ id 引用】JS 引用 ' + 用了.size + ' 个 id，HTML 里缺失：' + (缺.length ? 缺.join(', ') : '无'));
console.log('  动态前缀检查：' + 动态前缀.map(p => p + (([...htmlIds].some(i => i.startsWith(p))) ? '✓' : '✗')).join(' '));

/* ── ④ 行数 ── */
console.log('\n【④ 规模】行数 ' + 原.split('\n').length + ' → ' + 现在.split('\n').length +
  '　script 行数 ' + 抠(原).split('\n').length + ' → ' + js.split('\n').length);
