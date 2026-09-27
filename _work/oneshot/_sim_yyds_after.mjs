// _sim_yyds_after.mjs - 欲望都市 改造后每轮注入量模拟（对照改造前）
// 场景：当前战斗目标=丽莎·伊万诺娃，缴械值=75（阶段四），战斗进行中
import ejs from './tongjisheng2-app/app/node_modules/ejs/lib/ejs.js';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '欲望都市');
const card = JSON.parse(fs.readFileSync(path.join(CARD, '欲望都市.json'), 'utf8'));
function find_wb(o) {
  if (o && typeof o === 'object') {
    if (Array.isArray(o.entries)) return o.entries;
    for (const v of Object.values(o)) { const r = find_wb(v); if (r) return r; }
  }
  return null;
}
const entries = find_wb(card);
const byComment = {};
for (const e of entries) byComment[e.comment] = e;

const raw = YAML.parse(fs.readFileSync(path.join(CARD, '世界书/变量/initvar.yaml'), 'utf8'));
const vars = {};
function flatten(d, prefix = 'stat_data') {
  for (const [k, v] of Object.entries(d)) {
    const p = `${prefix}.${k}`;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p); else vars[p] = v;
  }
}
flatten(raw);
vars['stat_data.排班.当前战斗目标'] = '丽莎·伊万诺娃';
vars['stat_data.排班.战斗状态'] = '进行中';
vars['stat_data.女性角色.丽莎·伊万诺娃.缴械值'] = 75;
vars['stat_data.女性角色.丽莎·伊万诺娃.欲望积压'] = 60;

function getvar(p, opts = {}) {
  if (vars[p] !== undefined) return vars[p];
  const prefix = p + '.';
  for (const k of Object.keys(vars)) { if (k.startsWith(prefix)) return {}; }
  const segs = p.split('.');
  let cur = { ...vars };
  for (const s of segs) {
    if (cur && typeof cur === 'object' && s in cur) cur = cur[s]; else return opts.defaults;
  }
  return cur === undefined ? opts.defaults : cur;
}
function stripDecorators(src) {
  return src
    .replace(/^@@if\s*\([^)]*\)\s*\n?/gm, '')
    .replace(/^@@private\s*\n?/gm, '')
    .replace(/^@@generate_before\s*\n?/gm, '');
}
const rendered = {};
async function renderComment(name, stack = []) {
  if (rendered[name] !== undefined) return rendered[name];
  const entry = byComment[name];
  if (!entry) { rendered[name] = `<!-- getwi:missing:${name} -->`; return rendered[name]; }
  let src = stripDecorators(entry.content);
  try {
    const out = await ejs.render(src, {
      getvar, setvar: () => {}, incvar: () => {}, decvar: () => {},
      matchChatMessages: () => false,
      getwi: async (n) => renderComment(n, [...stack, name]),
      activewi: () => {}, define: () => {},
      getChatMessage: () => '', user: '你',
    }, { async: true });
    rendered[name] = out; return out;
  } catch (e) {
    rendered[name] = `<!-- ERR ${name}: ${e.message} -->`; return rendered[name];
  }
}
function zhCount(s) { return (s.match(/[\u4e00-\u9fff]/g) || []).length; }

console.log('═══════ 改造后 每轮注入（战斗目标=丽莎 / 缴械75 / 战斗进行中）═══════\n');

// ===== 常驻蓝灯（改造后：思维链已关灯）=====
const constant = [
  ['[mvu_update]变量更新规则', '世界书/变量/变量更新规则.yaml'],
  ['[mvu_update]变量字典与范围', '世界书/变量/变量字典与范围.yaml'],
  ['[mvu_plot]叙事输出规范', '世界书/变量/叙事输出规范.yaml'],
  ['[mvu_plot]情境上下文EJS', '世界书/变量/情境上下文EJS.yaml'],
  ['[mvu_update]变量输出格式', '世界书/变量/变量输出格式.txt'],
  ['[mvu_update]变量列表', '世界书/变量/变量列表.txt'],
  ['[mvu_plot]阶段调度', '世界书/阶段指导/阶段调度.yaml'],
];
console.log('── 常驻蓝灯（7 条, 思维链已关灯）──');
let constSum = 0;
for (const [n, p] of constant) {
  let out;
  if (n === '[mvu_plot]阶段调度') out = await renderComment('[mvu_plot]阶段调度');
  else out = await renderComment(n) || await renderEntry(n, path.join(CARD, p));
  const chars = out.length;
  constSum += chars;
  console.log(`  ${n.padEnd(28)} 注入 ${String(chars).padStart(5)}字 / ${zhCount(out)} 中文`);
}

// ===== 当前目标（基础信息绿灯 + 调度已含私密/阶段）=====
console.log('\n── 当前目标（基础信息绿灯 + 调度输出）──');
const basic = await renderComment('丽莎·伊万诺娃_基础信息');
console.log(`  丽莎_基础信息(绿灯)    注入 ${String(basic.length).padStart(5)}字 / ${zhCount(basic)} 中文`);

// ===== 命中绿灯（不含已关灯的缴械指导/俘虏结局）=====
console.log('\n── 命中绿灯（缴械指导/俘虏结局已关灯）──');
const green = [
  ['世界设定', '世界书/世界观/世界设定.yaml'],
  ['飞机杯网络规则', '世界书/世界观/飞机杯网络规则.yaml'],
  ['排班规则', '世界书/世界观/排班规则.yaml'],
  ['战斗系统', '世界书/世界观/战斗系统.yaml'],
  ['技能树', '世界书/世界观/技能树.yaml'],
  ['道具与恢复系统', '世界书/世界观/道具与恢复系统.yaml'],
  ['生理数值规范与限制', '世界书/世界观/生理数值规范与限制.yaml'],
  ['学业规则', '世界书/世界观/学业规则.yaml'],
  ['扮演准则', '世界书/扮演准则/扮演准则.yaml'],
];
let greenSum = 0;
for (const [n, p] of green) {
  const out = await renderComment(n);
  const chars = out.length;
  greenSum += chars;
  console.log(`  ${n.padEnd(22)} 注入 ${String(chars).padStart(5)}字 / ${zhCount(out)} 中文`);
}

const total = constSum + basic.length + greenSum;
console.log('\n═══════ 汇总 ═══════');
console.log(`常驻蓝灯(含调度): ${constSum} 字`);
console.log(`当前目标基础信息: ${basic.length} 字`);
console.log(`命中绿灯: ${greenSum} 字`);
console.log(`改造后合计: ${total} 字`);
console.log('');
console.log('对照改造前（同场景全命中口径）:');
console.log('  改造前 26,356 字 → 改造后 ' + total + ' 字');
console.log('  省: ' + (26356 - total) + ' 字（思维链1753 + 缴械指导149 + 俘虏结局464 + 私密/阶段由调度按需）');
