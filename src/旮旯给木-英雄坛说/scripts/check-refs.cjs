// ════════════════════════════════════════════════════════════
// check-refs.cjs · 条目之间的引用完整性（★ 第十一道关）
//
// ★ 为什么需要（2026-09-17 抓到的）：
//   思维链里写着「路径写法见 变量/本卡变量路径」——
//   但英雄坛说的 变量/ 目录下**从来没有这份条目**（同级生有，我们漏搬了）。
//   结果是 AI 每层都去找一个不存在的东西。
//   这类错**不报错、不崩**，只是 AI 悄悄拿不到那条规则。
//
// 查三件事：
//   ① 条目正文里「见 XXX」「参见 XXX」「详见 XXX」的 XXX → 存在吗
//   ② 变量路径是否都在 initvar 里（防 AI 照抄错路径导致整批更新作废）
//   ③ 引用了「对AI隐藏」的条目吗（那种条目 AI 看不到，引了等于没引）
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const 根 = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const WB = path.join(根, '世界书');

// ── 收集所有条目名（按相对路径 + 文件名两种写法都能匹配）──
const 条目 = new Set(), 全部文件 = [];
function 走(d, 前) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) 走(p, 前 + '/' + e.name);
    else if (/\.(yaml|txt|md)$/.test(e.name) && !前.startsWith('/变量/')) {
      const 名 = e.name.replace(/\.(yaml|txt|md)$/, '');
      const 全 = (前 + '/' + 名).replace(/^\//, '');
      条目.add(名);
      条目.add(全);
      全部文件.push({ 文件: 全, 路径: p });
    }
  }
}
走(WB, '');

// initvar 的路径（查变量路径用）
const iv = YAML.parse(fs.readFileSync(path.join(WB, '变量/initvar.yaml'), 'utf8'));
function 路径在(p) {
  const q = String(p).replace(/^[/]/, '').replace(/^stat_data\./, '').split('.');
  let o = iv;
  for (const k of q) { if (o == null || typeof o !== 'object') return false; o = o[k]; }
  return o !== undefined;
}

let 错 = 0;

console.log('═'.repeat(72));
console.log('引用完整性 · 扫了 ' + 全部文件.length + ' 个条目');
console.log('═'.repeat(72));

// ── ① 引用 ──
console.log('\n【一】「见 / 参见 / 详见 XXX」里的 XXX 是否存在');
const 缺 = [];
for (const { 文件, 路径 } of 全部文件) {
  const 文 = fs.readFileSync(路径, 'utf8');
  for (const m of 文.matchAll(/(?<![常不看看只])(?:见|参见|详见)\s*([\u4e00-\u9fa5\w]+\/[\u4e00-\u9fa5\w\/]+)/g)) {
    const 引 = m[1].replace(/[」』"'）)]+$/, '');
    if (条目.has(引)) continue;
    // 允许「见 世界观/引擎/出招 的「…」」这种带尾注的
    const 主 = 引.split(/\s|的/)[0];
    if (条目.has(主)) continue;
    缺.push({ 文件, 引 });
  }
}
if (!缺.length) console.log('  ✅ 所有引用都能对上');
else {
  const g = {};
  缺.forEach(x => { (g[x.引] = g[x.引] || []).push(x.文件); });
  Object.entries(g).forEach(([k, v]) => { console.log('  ✗ 「' + k + '」← ' + v.slice(0, 3).join(' / ')); 错++; });
}

// ── ② 变量路径 ──
console.log('\n【二】正文里提到的变量路径是否都在 initvar 里');
const 坏路 = [];
for (const { 文件, 路径 } of 全部文件) {
  const 文 = fs.readFileSync(路径, 'utf8');
  for (const m of 文.matchAll(/"path"\s*:\s*"\/([^"]+)"/g)) {
    const q = m[1];
    // 动态表放行（键名未知）
    if (/^(技能\/(门派|逍遥)|关系|关系网|关系主体|关系别名表)/.test(q)) continue;
    // 只校验到「已知父 + 已知子」这一层
    const 段 = q.split('/');
    let o = iv, ok = true;
    for (const s of 段) {
      if (o == null || typeof o !== 'object') { ok = false; break; }
      if (o[s] === undefined) { ok = false; break; }
      o = o[s];
    }
    if (!ok) 坏路.push({ 文件, q });
  }
}
if (!坏路.length) console.log('  ✅ 样例里的路径都对得上');
else {
  坏路.slice(0, 10).forEach(x => { console.log('  ✗ /' + x.q + '　← ' + x.文件); 错++; });
}

// ── ③ 引用了「对AI隐藏」的条目吗 ──
console.log('\n【三】引用的条目是不是「对 AI 隐藏」的');
// 隐藏类通常以「对AI隐藏」开头的正则处理，被隐藏的是占位符而不是条目名；
// 这里只提示一个易踩点：引用了变量路径条目时，它必须**在 AI 上下文里**
const 隐 = [];
for (const { 文件, 路径 } of 全部文件) {
  const 文 = fs.readFileSync(路径, 'utf8');
  if (/详见\s*[^\s]*对AI隐藏/.test(文)) 隐.push(文件);
}
if (!隐.length) console.log('  ✅ 无');
else 隐.forEach(x => console.log('  ⚠ ' + x + ' 引用了对 AI 隐藏的东西'));

console.log('\n' + '─'.repeat(72));
console.log(错 ? '★ ' + 错 + ' 处必须修' : '✅ 通过');
console.log('★ 这类错不报错、不崩 —— 只是 AI 悄悄拿不到那条规则。');
console.log('─'.repeat(72));
process.exit(错 ? 1 : 0);
