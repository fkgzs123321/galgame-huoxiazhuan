import fs from 'fs';
const P = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/scripts/push-ui.cjs';
let t = fs.readFileSync(P, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
const Q = String.fromCharCode(39);   // 单引号

const a = [
  'if (!fs.existsSync(PUSH)) {',
  "  console.error(" + Q + '仓库本地副本不存在：' + Q + ' + PUSH);',
  '  process.exit(2);',
  '}',
].join(eol);

const b = [
  '/* ★★ 2026-09-23：状态栏已改【内联】（replace_file），不再依赖 CDN 仓库。',
  '   仓库不存在也继续跑（只做打包 + 导世界书）。 */',
  'const 有仓库 = fs.existsSync(PUSH);',
  'if (!有仓库) console.log(' + Q + '（未找到 CDN 仓库副本，跳过推送，只打包）' + Q + ');',
].join(eol);

if (t.indexOf(a) < 0) { console.log('⚠ 退出段未命中'); process.exit(1); }
t = t.replace(a, b);

// 推 CDN 与清缓存两段都包在 有仓库 条件里
t = t.replace('// ── ① 推两份', '// ── ① 推两份（仅当仓库存在）');
const c = '  for (const x of 清单) {';
if (t.indexOf(c) >= 0) t = t.replace(c, '  for (const x of (有仓库 ? 清单 : [])) {');

fs.writeFileSync(P, t, 'utf8');
console.log('✓ push-ui 不再因缺仓库退出');
console.log('  有仓库 = ' + (t.includes('const 有仓库') ? '已加' : '未加'));
