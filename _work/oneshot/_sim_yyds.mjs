// _sim_yyds.mjs - 欲望都市 每轮注入量模拟
// 场景：当前战斗目标=丽莎·伊万诺娃，缴械值=75（阶段四），对话提到 战斗/缴械值/阶段/飞机杯 等词
import ejs from './tongjisheng2-app/app/node_modules/ejs/lib/ejs.js';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '欲望都市');

// ===== 变量集：从 initvar.yaml 加载 + 场景覆写 =====
const raw = YAML.parse(fs.readFileSync(path.join(CARD, '世界书/变量/initvar.yaml'), 'utf8'));
const vars = {};
function flatten(d, prefix = 'stat_data') {
  for (const [k, v] of Object.entries(d)) {
    const p = `${prefix}.${k}`;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p);
    else vars[p] = v;
  }
}
flatten(raw);
// 场景覆写：当前目标=丽莎，缴械值75，战斗进行中
vars['stat_data.排班.当前战斗目标'] = '丽莎·伊万诺娃';
vars['stat_data.排班.战斗状态'] = '进行中';
vars['stat_data.女性角色.丽莎·伊万诺娃.缴械值'] = 75;
vars['stat_data.女性角色.丽莎·伊万诺娃.欲望积压'] = 60;
vars['stat_data.玩家.体力'] = 55;
vars['stat_data.玩家.性欲'] = 65;
vars['stat_data.玩家.勃起度'] = 70;
vars['stat_data.玩家.今日胜场'] = 2;
vars['stat_data.玩家.今日败场'] = 0;

function getvar(p, opts = {}) {
  if (vars[p] !== undefined) return vars[p];
  const segs = p.split('.');
  let cur = { ...vars };
  for (const s of segs) {
    if (cur && typeof cur === 'object' && s in cur) cur = cur[s];
    else return opts.defaults;
  }
  return cur === undefined ? opts.defaults : cur;
}

// ===== 装饰器剥离 =====
function stripDecorators(src) {
  return src
    .replace(/^@@if\s*\([^)]*\)\s*\n?/gm, '')
    .replace(/^@@private\s*\n?/gm, '')
    .replace(/^@@generate_before\s*\n?/gm, '');
}

const rendered = {};
async function renderEntry(name, filePath) {
  if (rendered[name] !== undefined) return rendered[name];
  let src = stripDecorators(fs.readFileSync(filePath, 'utf8'));
  try {
    const out = await ejs.render(src, {
      getvar, setvar: () => {}, incvar: () => {}, decvar: () => {},
      matchChatMessages: () => false,
      getwi: async (n) => `<!-- getwi:${n} -->`,
      activewi: () => {}, define: () => {},
      getChatMessage: () => '',
      user: '你',
    }, { async: true });
    rendered[name] = out;
    return out;
  } catch (e) {
    rendered[name] = `<!-- ERR ${name}: ${e.message} -->`;
    return rendered[name];
  }
}

function zhCount(s) { return (s.match(/[\u4e00-\u9fff]/g) || []).length; }
function tok(s) { return zhCount(s) * 1.3 + (s.match(/\S+/g) || []).length * 0.5; }

console.log('═══════ 欲望都市 每轮注入模拟（当前目标=丽莎·伊万诺娃 / 缴械75 / 战斗进行中）═══════\n');

const results = [];

// ===== 1. 常驻（蓝灯 constant）条目 =====
const constant = [
  ['[mvu_update]变量更新规则', '世界书/变量/变量更新规则.yaml'],
  ['[mvu_update]变量字典与范围', '世界书/变量/变量字典与范围.yaml'],
  ['[mvu_plot]叙事输出规范', '世界书/变量/叙事输出规范.yaml'],
  ['[mvu_plot]思维链强制输出', '世界书/变量/思维链强制输出.yaml'],
  ['[mvu_plot]情境上下文EJS', '世界书/变量/情境上下文EJS.yaml'],
  ['[mvu_update]变量输出格式', '世界书/变量/变量输出格式.txt'],
  ['[mvu_update]变量列表', '世界书/变量/变量列表.txt'],
];
console.log('── 常驻条目（7） ──');
let constSum = 0;
for (const [n, p] of constant) {
  const out = await renderEntry(n, path.join(CARD, p));
  const err = out.includes('<!-- ERR') ? out.match(/<!-- ERR[^>]*-->/g) : null;
  const chars = out.length, zh = zhCount(out);
  constSum += chars;
  console.log(`  ${n.padEnd(30)} 渲染后 ${String(chars).padStart(5)}字 / ${zh} 中文 ${err ? '⚠' + err.join(',') : ''}`);
  results.push([n, chars]);
}

// ===== 2. 当前目标角色三件套 =====
console.log('\n── 当前目标（丽莎·伊万诺娃）3 条目 ──');
const role = [
  ['丽莎_基础信息', '世界书/角色/丽莎·伊万诺娃/基础.yaml'],
  ['丽莎_私密档案', '世界书/角色/丽莎·伊万诺娃/私密.yaml'],
  ['丽莎_阶段行为(EJS)', '世界书/角色/丽莎·伊万诺娃/阶段.yaml'],
];
let roleSum = 0;
for (const [n, p] of role) {
  const out = await renderEntry(n, path.join(CARD, p));
  const err = out.includes('<!-- ERR') ? out.match(/<!-- ERR[^>]*-->/g) : null;
  const chars = out.length, zh = zhCount(out);
  roleSum += chars;
  console.log(`  ${n.padEnd(22)} 渲染后 ${String(chars).padStart(5)}字 / ${zh} 中文 ${err ? '⚠' + err.join(',') : ''}`);
  results.push([n, chars]);
}

// ===== 3. 可能命中的绿灯条目（含 EJS 渲染）=====
console.log('\n── 命中绿灯（含 EJS 条目渲染后） ──');
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
  ['缴械值阶段指导(EJS)', '世界书/阶段指导/缴械值阶段指导.yaml'],
  ['俘虏结局(EJS)', '世界书/阶段指导/俘虏结局.yaml'],
];
let greenSum = 0;
for (const [n, p] of green) {
  const out = await renderEntry(n, path.join(CARD, p));
  const err = out.includes('<!-- ERR') ? out.match(/<!-- ERR[^>]*-->/g) : null;
  const chars = out.length, zh = zhCount(out);
  greenSum += chars;
  console.log(`  ${n.padEnd(22)} 渲染后 ${String(chars).padStart(5)}字 / ${zh} 中文 ${err ? '⚠' + err.join(',') : ''}`);
  results.push([n, chars]);
}

console.log('\n═══════ 汇总 ═══════');
console.log(`常驻 7 条目: ${constSum} 字`);
console.log(`当前目标 3 条目: ${roleSum} 字`);
console.log(`命中绿灯 ${green.length} 条目: ${greenSum} 字`);
console.log(`合计: ${constSum + roleSum + greenSum} 字 ≈ ${Math.round(tok(String(results.map(r=>r[1]).join(' '))))} token 估算`);
