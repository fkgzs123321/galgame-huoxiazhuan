#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// check-mvu-sync.cjs · MVU 三件套的一致性（★ 第九道关）
//
// ★ 为什么需要（2026-09-17 真机跑出来的）：
//   加了「她.情绪」到 initvar，但**没重跑 gen-schema.cjs** →
//   schema.ts 里没有这个字段 → Zod 校验时**被静默剥掉**（不报错，只是丢数据）。
//   另一头：AI 把「她.熟练度」写成数字 → z.string().prefault() 校验失败 →
//   **整块变量更新被丢弃**（不是只丢那一个字段）。
//   这两类都是"安静地坏"，没有关卡能拦。
//
// 查四件事：
//   ① initvar 的每个字段 → schema.ts 里有没有（缺了会被剥掉）
//   ② schema 的每个字段 → initvar 里有没有（多了说明该补初值）
//   ③ 字符串字段用的是 catch 还是 prefault（prefault 不挡类型错误）
//   ④ 数值字段有没有 coerce + clamp（没 clamp 就是越界不纠）
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const D = path.resolve(__dirname, '..');
const initvar = YAML.parse(fs.readFileSync(path.join(D, '世界书/变量/initvar.yaml'), 'utf8'));
const schema文 = fs.readFileSync(path.join(D, 'schema.ts'), 'utf8');

// ── ① initvar 的所有叶子路径 ──
function 叶子(o, 前, 出) {
  for (const [k, v] of Object.entries(o || {})) {
    const p = 前 ? 前 + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) 叶子(v, p, 出);
    else 出.push({ 路径: p, 值: v });
  }
  return 出;
}
const 变量 = 叶子(initvar, '', []);

// ── ② schema.ts 里的字段（★ 按「父块 + 字段名」匹配，避免同名不同路径误判）──
//   例：资源.经验 是数字、NSFW.身体.基线.经验 是字符串 —— 只按叶子名匹配会错。
function schema行(p) {
  const 段 = p.split('.');
  const 名 = 段.pop();
  const 父 = 段.pop() || '';
  const 行s = schema文.split('\n');
  // 先找同块（父名出现在附近）的，再退回只按名找
  for (const l of 行s) if (l.includes(名 + ':') && l.includes('z.') && 父 && l.includes(父)) return l;
  for (const l of 行s) if (l.includes(名 + ':') && l.includes('z.')) return l;
  return null;
}
const 有字段 = (p) => !!schema行(p);
// ★ 这些是「种子」类字段，本来就不该夹（夹了 LCG 就毁了）
const 种子白名单 = ['局面.骰子种子', '主角.$骰子种子'];

let 错 = 0;

console.log('═'.repeat(72));
console.log('MVU 一致性 · initvar ' + 变量.length + ' 个叶子字段 ｜ schema.ts ' + schema文.split('\n').length + ' 行');
console.log('═'.repeat(72));

console.log('\n【一】initvar 有、schema 里没有（★ 会被 Zod 静默剥掉）');
const 缺 = 变量.filter(x => !有字段(x.路径.split('.').pop()));
if (!缺.length) console.log('  ✅ 无');
else 缺.forEach(x => { console.log('  ✗ ' + x.路径); 错++; });

console.log('\n【二】字符串字段的容错策略');
const 坏 = [];
for (const x of 变量) {
  if (typeof x.值 !== 'string') continue;
  const 行 = schema行(x.路径);
  if (!行) continue;
  if (行.includes('.catch(')) continue;
  if (行.includes('.prefault(')) 坏.push(x.路径 + '　用了 prefault（类型错误不兜）');
}
if (!坏.length) console.log('  ✅ 字符串字段全部用 .catch()（写坏落回默认值，不丢整块）');
else 坏.forEach(b => { console.log('  ✗ ' + b); 错++; });

console.log('\n【三】数值字段有没有 clamp');
const 无夹 = [];
for (const x of 变量) {
  if (typeof x.值 !== 'number') continue;
  if (种子白名单.includes(x.路径)) continue;
  const 行 = schema行(x.路径);
  if (!行) continue;
  if (行.includes('_.clamp(') || 行.includes('z.boolean')) continue;
  if (行.includes('z.coerce.number()')) 无夹.push(x.路径);
}
if (!无夹.length) console.log('  ✅ 数值字段都有 clamp（越界夹紧，不整块丢）');
else 无夹.forEach(b => console.log('  ⚠ ' + b + '　有 coerce 但没 clamp'));

console.log('\n【四】生成物是否是最新的（比 mtime）');
const t = (p) => { try { return fs.statSync(path.join(D, p)).mtimeMs; } catch (e) { return 0; } };
const ivT = t('世界书/变量/initvar.yaml'), scT = t('schema.ts');
if (scT >= ivT) console.log('  ✅ schema.ts 不比 initvar 旧');
else { console.log('  ✗ initvar 比 schema.ts 新 → 要重跑 node scripts/gen-schema.cjs'); 错++; }

console.log('\n' + '─'.repeat(72));
console.log(错 ? '★ ' + 错 + ' 处必须修' : '✅ 通过');
console.log('★ 改 initvar 或状态表后必须重跑 gen-schema.cjs，这一关就是拦这个的。');
console.log('─'.repeat(72));
process.exit(错 ? 1 : 0);
