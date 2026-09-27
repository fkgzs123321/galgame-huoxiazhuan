#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// verify-dirty-ratio.mjs · 器官指称脏字占比校验器
//
// 落点: skills/tavern-cards/references/contents-creation/presentation-craft-05-词汇规范.md
//       「可数判据」四项里的第 ①②③ 项。
//
// 为什么要做成脚本: 这条判据原文是「部位带脏字的比例 ≥ 80%」，
//   既没说「谁算部位」「哪一段算私密段落」，也没说「一个词算一次还是一个短语算一次」
//   —— 没有口径的判据执行不了。本脚本把口径写死。
//
// 口径:
//   计数对象 = 器官头部词白名单（只收双字及以上，单字「奶」「乳」排除）
//   合格     = 该词自带脏字，或它前 6 字内挂着脏字
//   不计     = 动作与物（喂奶/挤奶/奶水/奶瓶）、成语（以死相逼）、解剖语（产道）、落点档名（小奶）
//
// 用法: node 引擎模板/scripts/verify-dirty-ratio.mjs <项目目录> [--scope 子目录,子目录] [--verbose]
//       退出码 0 = 达标，1 = 未达标，2 = 环境错误
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const positional = argv.filter((a) => !a.startsWith('--'));
const projectDir = path.resolve(positional[0] || '.');
const scopeArg = (() => {
  const i = argv.indexOf('--scope');
  return i >= 0 && argv[i + 1] ? argv[i + 1].split(',') : null;
})();

const 世界书 = path.join(projectDir, '世界书');
if (!fs.existsSync(世界书)) {
  console.error('[FAIL] 找不到 世界书/ 目录: ' + 世界书);
  process.exit(2);
}

// ── 口径（与 craft-05「可数判据」保持一字一致，改这里必须同步改文档）──
const 头部词 = [
  // 奶系
  '奶子', '奶头', '奶袋', '奶包',
  // 乳系（不含单字「乳」）
  '乳丘', '乳尖', '乳晕', '乳粒', '乳房', '乳沟',
  // 屄系
  '屄', '逼', '屄唇', '屄瓣', '腔肉', '阴唇', '阴蒂',
  // 臀腿
  '尻', '臀肉', '屁股', '腚肉', '腿根嫩肉',
];
const 脏字 = '脏臭腥黑骚烂淫臊馊秽贱雌畜母';
// 不计的复合词（动作/物/成语/解剖/档名）
const 不计 = ['乳交', '乳罩', '乳腺', '乳白', '逼成', '逼迫', '逼近', '产道', '奶奶', '穴位'];
const 不计语境 = /(喂|挤|吸|吃|喝|出|完|瓶|的|还)\s*奶|奶\s*(水|瓶|粉|油|酥|昔|酪|声|汪|茶)|酸奶|以死相逼|死相逼|小奶那一档|娇小加小奶|落点档|逼毛/;
// ② 材质词顶替主体（单独出现即不合格）
const 材质词 = ['奶肉', '乳肉', '屄肉', '腔肉', '尻肉', '臀肉', '腚肉'];
// ③ 模糊指代（这几类词后面必须能看出是哪个器官，否则算顶替）
const 指代词 = ['那两团', '那两坨', '那两片', '那两瓣', '那两点', '那道沟', '那道缝', '那处', '那东西'];
// 往后 14 字里出现器官名 = 合格形态（那两团 F 杯的骚奶子 / 那两瓣腴软肥尻）
const 往后是器官 = /(奶子|奶头|乳丘|乳尖|乳晕|乳粒|屄|逼|尻|臀|腚|屁股|腿根|媚肉|骚|臭|烂|淫)/;
// 往后出现这些 = 不是器官（布 / 门缝 / 疤痕 / 层 / 空间 / 时间…），豁免
const 往后非器官 = /(布|门|缝|疤|层|住|有|来|里|处|东西|地方|几秒|形状|分钟|小时|味道|声音|姿势|角度|节奏|手段|裂缝)/;

const 默认范围 = ['角色', '世界观', '扮演准则', '地理', '时间线', '阶段指导', 'NPC'];
// 照搬 skills 规范原文的文件与词表文件单列（它们定义上就列裸词，不计入合格率）
const 排除文件 = [/词料速查\.txt$/];

const walk = (d) => {
  const out = [];
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === '变量') continue;
      out.push(...walk(p));
    } else if (e.name.endsWith('.txt')) out.push(p);
  }
  return out;
};

const scope = scopeArg || 默认范围;
const files = [];
for (const s of scope) files.push(...walk(path.join(世界书, s)));
// 文风目录只取「门控两层」这类自撰文件
const 文风目录 = path.join(世界书, '文风');
if (fs.existsSync(文风目录)) {
  for (const f of fs.readdirSync(文风目录)) {
    if (f.endsWith('.txt') && !排除文件.some((r) => r.test(f))) files.push(path.join(文风目录, f));
  }
}

let 合格 = 0, 裸词 = 0;
const 明细 = [], 材质明细 = [], 指代明细 = [];

for (const p of files) {
  const rel = path.relative(projectDir, p).split(path.sep).join('/');
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const w of 头部词) {
      let idx = -1;
      while ((idx = line.indexOf(w, idx + 1)) !== -1) {
        const span = line.slice(Math.max(0, idx - 3), idx + w.length + 3);
        if (不计.some((b) => span.includes(b))) continue;
        if (不计语境.test(span)) continue;
        const before = line.slice(Math.max(0, idx - 6), idx);
        if (new RegExp('[' + 脏字 + ']').test(before)) 合格++;
        else {
          裸词++;
          明细.push(`${rel}:${i + 1}  …${line.slice(Math.max(0, idx - 14), idx + w.length + 8)}…`);
        }
      }
    }
    for (const w of 材质词) {
      let idx = -1;
      while ((idx = line.indexOf(w, idx + 1)) !== -1) {
        const before = line.slice(Math.max(0, idx - 6), idx);
        // 已带脏字（骚奶肉 / 臭尻肉）不算顶替；裸材质词才算
        if (new RegExp('[' + 脏字 + ']').test(before)) continue;
        材质明细.push(`${rel}:${i + 1}  …${line.slice(Math.max(0, idx - 18), idx + w.length + 12)}…`);
      }
    }
    for (const t of 指代词) {
      let idx = -1;
      while ((idx = line.indexOf(t, idx + 1)) !== -1) {
        // 词表与禁令说明行里出现指代词是合法的（那是在列举禁则）
        if (/一律禁止|模糊指代|指代/.test(line)) continue;
        const after = line.slice(idx + t.length, idx + t.length + 14);
        if (往后非器官.test(after)) continue;
        if (往后是器官.test(after)) continue;
        指代明细.push(`${rel}:${i + 1}  ${t}  …${line.slice(Math.max(0, idx - 14), idx + t.length + 14)}…`);
      }
    }
  }
}

const 总 = 合格 + 裸词;
const 比 = 总 ? (合格 / 总) * 100 : 100;

console.log('════════════════════════════════════════════════════');
console.log('器官指称脏字占比校验 · ' + path.basename(projectDir));
console.log('════════════════════════════════════════════════════');
console.log('① 器官指称 ' + 总 + ' 处｜带脏字 ' + 合格 + '｜裸词 ' + 裸词);
console.log('   脏字占比 ' + 比.toFixed(1) + '%   门槛 ≥80%   ' + (比 >= 80 ? '✅' : '❌'));
console.log('② 材质词顶替 ' + 材质明细.length + ' 处   ' + (材质明细.length === 0 ? '✅' : '❌'));
console.log('③ 模糊指代   ' + 指代明细.length + ' 处   ' + (指代明细.length === 0 ? '✅' : '❌'));
console.log('   （④ 密度/状态是量词与语感判据，用 grep 人工过，见文档）');

if (verbose || 比 < 80) {
  console.log('\n裸词明细:');
  明细.slice(0, 80).forEach((s) => console.log('  ' + s));
}
if (材质明细.length) {
  console.log('\n材质词顶替明细（只能作定语，不许单独指器官）:');
  材质明细.slice(0, 40).forEach((s) => console.log('  ' + s));
}
if (指代明细.length) {
  console.log('\n模糊指代明细（后面没跟器官名，也不是疤痕/门缝这类实体）:');
  指代明细.slice(0, 40).forEach((s) => console.log('  ' + s));
}

const 违规 = (比 < 80 ? 1 : 0) + (材质明细.length ? 1 : 0) + (指代明细.length ? 1 : 0);
console.log('\n' + (违规 ? '违规 ' + 违规 + ' 项，按上面明细逐条改' : '三项均达标'));
process.exit(违规 ? 1 : 0);
