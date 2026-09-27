// ════════════════════════════════════════════════════════════
// check-ejs-paths.cjs · EJS 引用路径校验
//
// ★ 为什么需要（2026-09-17 抓到的真问题）：
//   阶段指导写了四态循环（在线/暂停/离线/冻结），靠 getvar('stat_data.主角.状态') 分支。
//   但 initvar 里**没有「主角.状态」这个字段** → getvar 永远取到默认值「在线」
//   → 另外三态（暂停/离线/冻结）**永远进不去，形同虚设**。
//
//   EJS 写法本身没问题（只有 getvar + if/else，无循环无递归，开销可忽略）。
//   **真正的风险是「引用的路径不存在」—— 它不报错，只是安静地走默认值。**
//
// 查三件事：
//   ① 所有 getvar/setvar 的路径 → initvar 里有没有
//   ② 所有 === '值' 的取值 → 该字段的定义范围里有没有
//   ③ 引用了但从没被 setvar 写过的字段（可能是死分支）
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const 根 = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const 读 = (p) => { try { return YAML.parse(fs.readFileSync(p, 'utf8')) || {}; } catch (e) { return {}; } };

const initvar = 读(path.join(根, '世界书/变量/initvar.yaml'));
// ★ 取值范围以「变量列表」为权威（.范围 那一行）
const 变量列表 = 读(path.join(根, '世界书/变量/变量列表.yaml'));
const 范围表 = {};
for (const [k, v] of Object.entries(变量列表.变量 || {})) {
  if (k.endsWith('.范围')) 范围表[k.replace(/.范围$/, '')] = String(v);
}

function 有路径(p) {
  const q = String(p).replace(/^stat_data\./, '').split('.');
  let o = initvar;
  for (const k of q) { if (o == null || typeof o !== 'object') return false; o = o[k]; }
  return o !== undefined;
}
function 取值(p) {
  const q = String(p).replace(/^stat_data\./, '').split('.');
  let o = initvar;
  for (const k of q) { if (o == null) return undefined; o = o[k]; }
  return o;
}

// ── 收集所有条目（源文件 + 产物）──
const 源 = [];
function 走(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) 走(p);
    else if (f.endsWith('.yaml')) 源.push({ 名: f.replace('.yaml', ''), 文: fs.readFileSync(p, 'utf8') });
  }
}
走(path.join(根, '世界书'));

// ── ① 引用路径 ──
const 引用 = new Map();   // 路径 → [哪个条目引用的]
for (const { 名, 文 } of 源) {
  for (const m of 文.matchAll(/get(?:var|wi)\(\s*['"]([^'"]+)['"]/g)) {
    const p = m[1];
    if (!引用.has(p)) 引用.set(p, []);
    if (!引用.get(p).includes(名)) 引用.get(p).push(名);
  }
}
// ── ② 写入路径 ──
const 写入 = new Set();
for (const { 文 } of 源) {
  for (const m of 文.matchAll(/set(?:var|wi)\(\s*['"]([^'"]+)['"]/g)) 写入.add(m[1].replace(/^stat_data\./, ''));
}
// ── ③ 分支取值 ──
const 取值用法 = [];   // { 路径, 值, 条目 }
for (const { 名, 文 } of 源) {
  for (const m of 文.matchAll(/getvar\(\s*['"]([^'"]+)['"][^)]*\)\s*===?\s*['"]([^'"]+)['"]/g)) {
    取值用法.push({ 路径: m[1].replace(/^stat_data\./, ''), 值: m[2], 条目: 名 });
  }
}

console.log('══════ EJS 路径校验 ══════\n');

let 错 = 0;

console.log('【一】引用了但 initvar 里没有的路径（★ 会永远走默认值）');
const 缺 = [...引用.entries()].filter(([p]) => !有路径(p));
if (!缺.length) console.log('  ✅ 无');
else {
  缺.forEach(([p, 谁]) => { console.log('  ✗ ' + p + '   ← ' + 谁.join(' / ')); 错++; });
}

console.log('\n【二】分支取值的合法性');
const 值集 = new Map();
取值用法.forEach(x => {
  const k = x.路径 + '=' + x.值;
  if (!值集.has(k)) 值集.set(k, { ...x, 条目: [x.条目] });
  else 值集.get(k).条目.push(x.条目);
});
let 值错 = 0;
for (const [k, x] of 值集) {
  const 定 = 范围表[x.路径] || 取值(x.路径);
  let ok = false, 说明 = '';
  if (Array.isArray(定)) { ok = 定.some(v => String(v).includes(x.值) || String(v) === x.值); 说明 = ok ? '' : '定义是：' + 定.slice(0, 6).join(' / '); }
  else if (定 && typeof 定 === 'object') { ok = Object.keys(定).some(v => v === x.值 || obj含(定[v], x.值)); 说明 = ok ? '' : '定义是对象：' + Object.keys(定).slice(0, 6).join(' / '); }
  else if (typeof 定 === 'string') { ok = 定.indexOf(x.值) >= 0; 说明 = ok ? '' : '定义串是：' + 定.slice(0, 60); }
  if (!ok) { console.log('  ✗ ' + x.路径 + " === '" + x.值 + "'   ← " + [...new Set(x.条目)].join('/') + '　' + 说明); 值错++; }
}
function obj含(o, v) { if (!o || typeof o !== 'object') return false; return JSON.stringify(o).indexOf(v) >= 0; }
if (!值错) console.log('  ✅ 所有分支取值都在定义范围内');
else 错 += 值错;

console.log('\n【三】被引用但从没被写过的字段（可能是死分支）');
const 死 = [...引用.keys()].filter(p => {
  const q = p.replace(/^stat_data\./, '');
  if (写入.has(q)) return false;
  // 顶层字段（如 世界.底座）由引擎写，不算死
  if (q.split('.').length <= 2) return false;
  return true;
});
if (!死.length) console.log('  ✅ 无');
else 死.forEach(p => console.log('  ⚠ ' + p + '   ← ' + 引用.get(p).join(' / ')));

console.log('\n【四】规模');
console.log('  引用路径 ' + 引用.size + ' 条｜写入路径 ' + 写入.size + ' 条｜分支取值 ' + 值集.size + ' 处');
console.log('  扫描条目 ' + 源.length + ' 份');

console.log('\n' + (错 ? '★ 有 ' + 错 + ' 处必须修' : '✅ 全部通过'));
process.exit(错 ? 1 : 0);
