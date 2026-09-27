#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// check-contracts.mjs · 契约层体检
//
// 为什么要有这个：**契约文件是给代码读的。YAML 不合法 = 引擎读不到 = 契约等于不存在。**
// （同级生2 在这上面栽过：状态表.yaml / 目的清单.yaml 报错 3 类共 12 处，从来没被机器解析过）
//
// 六项检查：
//   ① 所有 YAML 能被真正解析
//   ② 值以 ** 开头的行（YAML 会当别名，整份文件挂）
//   ③ flow map 里的全角逗号（会把整串变成一个键）
//   ④ 目的清单：单元 id 唯一
//   ⑤ 目的清单：人设映射引用的 id 全部存在（★ 引用完整性）
//   ⑥ 阶段表：每一档都有「她能教你的」（互学武功的接口不能缺）
//
// 用法: node scripts/check-contracts.mjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const 契约目录 = path.resolve(path.join(__dirname, '..', '底座_yingxiong'));

let pass = 0, fail = 0;
const ok = (c, name, extra = '') => {
  if (c) { pass++; console.log('  [OK]   ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra ? '  → ' + extra : '')); }
};
const section = (t) => console.log('\n' + t);

console.log('='.repeat(72));
console.log('契约层体检 · ' + path.basename(契约目录));
console.log('='.repeat(72));

const files = fs.readdirSync(契约目录).filter((f) => f.endsWith('.yaml')).sort();
const 解析结果 = {};

// ── ①②③ YAML 合法性 ──
section('① YAML 可解析性');
for (const f of files) {
  const t = fs.readFileSync(path.join(契约目录, f), 'utf8');
  try {
    解析结果[f] = YAML.parse(t);
    ok(true, f + '  [' + Object.keys(解析结果[f]).join(' / ') + ']');
  } catch (e) {
    ok(false, f, e.message.split('\n')[0]);
  }
}

section('② 别名风险（值以 ** 开头 → YAML 当别名，整份挂）');
for (const f of files) {
  const 行 = fs.readFileSync(path.join(契约目录, f), 'utf8')
    .split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => /:\s+\*\*/.test(l));
  ok(行.length === 0, f, 行.length ? 行.map(([n]) => n + ' 行').join(', ') : '');
}

section('③ flow map 里的裸全角逗号（会把整串变成一个键）');
// ★ 只算「引号之外」的全角逗号 —— 引号里的中文逗号是正文，无害
const 有裸逗号 = (l) => {
  const 去引号 = l.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
  return /\{/.test(去引号) && /，/.test(去引号);
};
for (const f of files) {
  const 行 = fs.readFileSync(path.join(契约目录, f), 'utf8')
    .split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => 有裸逗号(l));
  ok(行.length === 0, f, 行.length ? 行.map(([n]) => n + ' 行').join(', ') : '');
}

// ── ④⑤ 目的清单 ──
section('④⑤ 目的清单 · 单元与引用');
const 目的 = 解析结果['目的清单.yaml'];
if (!目的) { ok(false, '目的清单.yaml 未解析成功，跳过 ④⑤'); }
else {
  const ids = [];
  for (const [类, arr] of Object.entries(目的.单元 || {})) {
    for (const u of arr || []) ids.push(u.id);
  }
  const 重复 = ids.filter((x, i) => ids.indexOf(x) !== i);
  ok(重复.length === 0, '单元 id 唯一（共 ' + ids.length + ' 个）', 重复.length ? '重复: ' + 重复.join(',') : '');
  ok(ids.length === 目的.meta.单元总数, '单元数与 meta 声明一致（' + ids.length + ' / ' + 目的.meta.单元总数 + '）');

  const id集 = new Set(ids);
  const 映射 = 目的.人设映射 || {};
  // 「单元: 全部」是特殊值，展开成全部 id
  const 取单元 = (cfg) => (cfg.单元 === '全部' ? ids : (cfg.单元 || []));
  let 全部命中 = true;
  const 明细 = [];
  for (const [人设, cfg] of Object.entries(映射)) {
    const 列 = 取单元(cfg);
    const 缺 = 列.filter((x) => !id集.has(x));
    if (缺.length) 全部命中 = false;
    明细.push(人设 + ' ' + 列.length + ' 个' + (缺.length ? '  ✗缺' + 缺.join(',') : ''));
    ok(缺.length === 0, '人设「' + 人设 + '」引用的 id 全部存在（' + 列.length + ' 个）', 缺.join(','));
  }
  console.log('      单位数: ' + 明细.join(' ｜ '));
  ok(全部命中, '★ 引用完整性：没有任何人设指向不存在的单元');
  ok(Object.keys(映射).length === 8, '人设数 = 8（含郁灼）', String(Object.keys(映射).length));
}

// ── ⑥ 阶段表 ──
section('⑥ 阶段表 · 互学武功的接口');
const 阶段 = 解析结果['阶段表.yaml'];
if (!阶段) { ok(false, '阶段表.yaml 未解析成功，跳过 ⑥'); }
else {
  const 档 = 阶段.阶段 || [];
  ok(档.length === 阶段.meta.阶段数, '阶段数与 meta 一致（' + 档.length + ' / ' + 阶段.meta.阶段数 + '）');
  for (const s of 档) {
    const 有 = s['她能教你的'] !== undefined && String(s['她能教你的']) !== '';
    ok(有, '「' + s.名 + '」声明了她能教你什么', String(s['她能教你的']));
    ok(s.拦不住时 !== undefined && s.允许的行为 !== undefined, '「' + s.名 + '」三列齐全（递进／允许／拦不住）');
  }
}

// ── 汇总 ──
console.log('\n' + '='.repeat(72));
console.log('通过 ' + pass + ' / 失败 ' + fail);
console.log('='.repeat(72));
process.exit(fail === 0 ? 0 : 1);
