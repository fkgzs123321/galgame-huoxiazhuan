// 验证 .pack 格式能否正确解出 WebP。
//
// ★ 这一步不能省：包是自制的二进制格式，
//   推上 CDN 之后 UI 端要靠同样的逻辑取图 —— 解不开就全白做。

const fs = require('node:fs');
const path = require('node:path');

const PACK = 'E:/Games/写卡/tavern_helper_template/src/活侠传/_work/_pack';
const mf = JSON.parse(fs.readFileSync(path.join(PACK, 'manifest.json'), 'utf8'));
const 条目 = mf['条目'];

console.log('manifest 条目数: ' + Object.keys(条目).length);

function 取图(逻辑路径) {
  const e = 条目[逻辑路径];
  if (!e) throw new Error('manifest 里没有: ' + 逻辑路径);
  const buf = fs.readFileSync(path.join(PACK, e['包']));
  const 片 = buf.subarray(e['偏移'], e['偏移'] + e['长度']);
  // 校验 WebP magic: RIFF....WEBP
  const ok = 片.toString('latin1', 0, 4) === 'RIFF' && 片.toString('latin1', 8, 12) === 'WEBP';
  return { 片, ok, e };
}

// 抽 8 个不同类别的条目验证
const 样本 = Object.keys(条目).filter((k) =>
  k.includes('background') || k.includes('battle_brother1') ||
  k.includes('portrait_girl_01') || k.includes('picture'),
).slice(0, 4);

const 更多 = [
  'background_01/screen_center_morning.webp',
  'battle_brother1/brother1_intro.webp',
  'portrait_girl_01/normal.webp',
];

console.log('');
let 通过 = 0, 失败 = 0;
for (const k of [...样本, ...更多]) {
  if (!条目[k]) { console.log('  —  跳过（不存在）: ' + k); continue; }
  const r = 取图(k);
  const tag = r.ok ? '✓ ' : '✗ ';
  if (r.ok) 通过++; else 失败++;
  console.log(`  ${tag} ${k.padEnd(46)} ${String(r.片.length).padStart(8)} B  包=${r.e['包']} 偏移=${r.e['偏移']}`);
}

// 全量校验：每个条目都能从对应包里取出、且是 WebP
console.log('');
console.log('全量校验中...');
const 包缓存 = {};
let 全通过 = 0, 全失败 = 0;
const 失败例 = [];
for (const k of Object.keys(条目)) {
  const e = 条目[k];
  if (!包缓存[e['包']]) 包缓存[e['包']] = fs.readFileSync(path.join(PACK, e['包']));
  const buf = 包缓存[e['包']];
  const 片 = buf.subarray(e['偏移'], e['偏移'] + e['长度']);
  const ok = 片.length === e['长度'] &&
    片.toString('latin1', 0, 4) === 'RIFF' &&
    片.toString('latin1', 8, 12) === 'WEBP';
  if (ok) 全通过++; else { 全失败++; if (失败例.length < 5) 失败例.push(k); }
}
console.log(`  通过 ${全通过} / 失败 ${全失败}`);
for (const k of 失败例) console.log('    ★ ' + k);
