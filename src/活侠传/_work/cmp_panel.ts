/**
 * 安静对比：面板 HTML 的结构 vs 参照卡；MVU 是否自带变量块隐藏。
 * 只输出短行。
 */
import fs from 'node:fs';

// ── ① 结构对比 ──
console.log('══ ① 面板 HTML 结构（前 200 字符）══');
for (const [卡, p] of [
  ['欲望都市', 'src/欲望都市/正则/状态栏界面.html'],
  ['狼人杀', 'src/狼人杀/正则/状态栏界面.html'],
  ['活侠传', 'src/活侠传/正则/状态栏界面.html'],
] as [string, string][]) {
  if (!fs.existsSync(p)) { console.log(`  ${卡}: 不存在`); continue; }
  const c = fs.readFileSync(p, 'utf8');
  const 头 = c.slice(0, 200).replace(/\s+/g, ' ');
  console.log(`  ${卡} (${(c.length / 1024).toFixed(0)} KB)`);
  console.log(`    ${头}`);
  console.log(`    含 DOCTYPE: ${/<!doctype/i.test(c)}  含 <html: ${/<html/i.test(c)}  含 <head>: ${/<head/i.test(c)}  含 <script>: ${/<script/i.test(c)}`);
  console.log(`    结尾: ${c.slice(-80).replace(/\s+/g, ' ')}`);
  console.log();
}

// ── ② MVU 是否自带 UpdateVariable 处理 ──
console.log('══ ② MVU 框架是否自带变量块隐藏 ══');
const mvuPaths = [
  '_work/mvu_bundle.js',
  '._mvu_bundle.js',
  '._magvar_bundle.js',
];
let 找到 = false;
for (const p of mvuPaths) {
  if (!fs.existsSync(p)) continue;
  找到 = true;
  const c = fs.readFileSync(p, 'utf8');
  console.log(`  ${p} (${(c.length / 1024).toFixed(0)} KB)`);
  for (const kw of ['UpdateVariable', 'updatevariable', '思考中', 'hidden', 'display:none', 'hideMessage', '变量更新']) {
    const n = c.split(kw).length - 1;
    if (n) console.log(`    含 ${kw}: ${n} 次`);
  }
  console.log();
}
if (!找到) console.log('  （本地没有 MVU bundle 副本）');

// ── ③ MVU 在线版本怎么处理 ──
console.log('══ ③ 参照卡是否包含变量更新类正则 ══');
for (const 卡 of ['欲望都市', '狼人杀', '旮旯给木-英雄坛说', '欲妈群']) {
  const p = `src/${卡}/tavern-cards-state.json`;
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ks = Object.keys(j.regex_scripts ?? {});
  const 变量类 = ks.filter(k => k.includes('变量') || k.includes('update') || k.includes('Update'));
  const 思维类 = ks.filter(k => k.includes('思维') || k.includes('thinking'));
  console.log(`  ${卡.padEnd(14)} 共 ${ks.length} 条  变量类: ${变量类.join('、') || '—'}  思维类: ${思维类.join('、') || '—'}`);
}
