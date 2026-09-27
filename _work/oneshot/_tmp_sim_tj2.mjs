// 同级生2 真实 EJS 渲染模拟 v2：共享 context（this.X 跨 getwi 链共享）+ define + lastMessageId
import ejs from './tongjisheng2-app/app/node_modules/ejs/lib/ejs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WB = path.join(__dirname, 'src', '同级生2', '世界书');

const index = parse(fs.readFileSync('src/同级生2/index.yaml', 'utf-8'));
const nameToRel = new Map();
function walk(list) {
  for (const it of list) {
    if (it.文件夹 && it.条目) walk(it.条目);
    else if (it.名称 && it.文件) nameToRel.set(it.名称, it.文件.replace('世界书/', ''));
  }
}
walk(index.条目);
function resolveEntry(name) {
  const rel = nameToRel.get(name);
  if (!rel) return null;
  for (const cand of [path.join(WB, rel), path.join(WB, rel + '.txt'), path.join(WB, rel + '.yaml')]) {
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

function stripDecorators(src) {
  return src
    .replace(/^@@if\s*\([^)]*\)\s*\n?/gm, '')
    .replace(/^@@private\s*\n?/gm, '')
    .replace(/^@@generate_before\s*\n?/gm, '')
    .replace(/^@@always_enabled\s*\n?/gm, '');
}

// ===== 共享上下文（模拟 ST-Prompt-Template prepareContext + SharedDefines）=====
const SharedDefines = {};
const rendered = {};
const renderedSizes = {};

// 变量集
const vars = {
  'stat_data.时间.当前日期': '12-22', 'stat_data.时间.星期': '周五', 'stat_data.时间.时段': '早',
  'stat_data.时间.当前时间': '08:00', 'stat_data.时间.天数': 1, 'stat_data.时间.季节': '冬',
  'stat_data.时间.章节': '寒假前奏', 'stat_data.时间.天气': '晴',
  'stat_data.场景.当前地点': '主角自宅客厅', 'stat_data.场景.当前女角名': '鸣泽唯', 'stat_data.场景.场景模式': '休息',
  'stat_data.主角.玩家身份': '原作主角', 'stat_data.主角.玩家姓名': '{{user}}', 'stat_data.主角.年龄': 18,
  'stat_data.主角.住所': '鸣泽家', 'stat_data.主角.魅力': 50, 'stat_data.主角.学业': 50, 'stat_data.主角.体力': 80,
  'stat_data.主角.社交': 50, 'stat_data.主角.敏感': 50, 'stat_data.主角.声誉': 50,
  'stat_data.主角.饥饿': 30, 'stat_data.主角.口渴': 20, 'stat_data.主角.清洁': 80,
  'stat_data.主角.疲劳': 20, 'stat_data.主角.心情': 70, 'stat_data.主角.睡眠质量': 70,
  'stat_data.主角.现金': 10000, 'stat_data.主角.储蓄': 3000, 'stat_data.主角.违法计数': 0,
  'stat_data.主角.法律警告': 0, 'stat_data.主角.今日餐费': 0, 'stat_data.主角.今日礼费': 0,
  'stat_data.主角.今日交通费': 0, 'stat_data.主角.今日总消费': 0, 'stat_data.主角.储蓄目标': 50000,
  'stat_data.当前女角.ID': 1, 'stat_data.当前女角.姓名': '鸣泽唯', 'stat_data.当前女角.关系阶段': '初识',
  'stat_data.当前女角.好感度': 10, 'stat_data.当前女角.心动值': 5, 'stat_data.当前女角.信任度': 15,
  'stat_data.当前女角.H经验': 0, 'stat_data.当前女角.魅力': 60, 'stat_data.当前女角.学业': 70,
  'stat_data.当前女角.体力': 65, 'stat_data.当前女角.社交': 55, 'stat_data.当前女角.敏感': 70,
  'stat_data.当前女角.声誉': 80, 'stat_data.当前女角.力量': 40, 'stat_data.当前女角.敏捷': 60,
  'stat_data.当前女角.智力': 75,
};
const _tree = (() => {
  const root = {};
  for (const [k, v] of Object.entries(vars)) {
    const segs = k.split('.');
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      if (typeof cur[s] !== 'object' || cur[s] === null) cur[s] = {};
      cur = cur[s];
    }
    cur[segs[segs.length - 1]] = v;
  }
  return root;
})();
function getvar(p, opts = {}) {
  if (vars[p] !== undefined) return vars[p];
  const segs = p.split('.');
  let cur = _tree;
  for (const s of segs) {
    if (cur && typeof cur === 'object' && s in cur) cur = cur[s];
    else return opts.defaults;
  }
  return cur === undefined ? opts.defaults : cur;
}

// 共享 context（模拟 prepareContext 结果，含 getter）
let context;
async function renderEntry(name, stack = []) {
  if (rendered[name] !== undefined) return rendered[name];
  const fp = resolveEntry(name);
  if (!fp) { console.log(`  ⚠ getwi 缺失条目: ${name}`); return `<!-- getwi:missing:${name} -->`; }
  let src = stripDecorators(fs.readFileSync(fp, 'utf8'));
  try {
    // 模拟 ST-Prompt-Template: ejs.compile + func.call(data, data, escape, include, rethrow)
    // 这样 this === data === context，this.X 挂载才能生效
    const compiled = ejs.compile(src, { async: true, _with: true, outputFunctionName: 'print' });
    const before = Object.keys(context).length;
    // 最小测试：this 是否挂载
    if (name === '__probe__') {
      const probe = ejs.compile('<% this.__PROBE = 999; %>', { async: true, _with: true });
      await probe.call(context, context, ejs.escapeXML || ((s) => String(s)), ejs.include, ejs.rethrow);
      console.log('   [probe] this.__PROBE =', context.__PROBE);
    }
    const out = await compiled.call(context, context, ejs.escapeXML || ((s) => String(s)), ejs.include, ejs.rethrow);
    if (['全局规则总表', '女角偏好系数表', '个人反应属性'].includes(name)) {
      console.log(`   [debug ${name}] 渲染后 context keys: ${Object.keys(context).length} (前 ${before}), PLAYER_IDENTITIES=${typeof globalThis.PLAYER_IDENTITIES} HEROINE=${typeof globalThis.HEROINE_PREFERENCES} PERSONALITY=${typeof globalThis.PERSONALITY_COMBINED_ARCHETYPES}`);
    }
    rendered[name] = out;
    renderedSizes[name] = out.length;
    return out;
  } catch (e) {
    rendered[name] = `<!-- ERR ${name}: ${e.message} -->`;
    return rendered[name];
  }
}

function makeContext() {
  context = {
    getvar, setvar: () => {}, incvar: () => {}, decvar: () => {},
    matchChatMessages: () => false,
    getChatMessage: () => '',
    activewi: () => {}, activateWorldInfo: () => {},
    replaceVariables: () => {}, getVariables: () => ({}),
    user: '你',
    // lastMessageId：模拟已有消息
    lastMessageId: 5,
    // getwi：绑定当前 context（子条目 this.X 挂到 context）
    getwi: async (n) => renderEntry(n, ['__root__']),
    getWorldInfo: async (n) => renderEntry(n, ['__root__']),
    // define：挂 SharedDefines + context
    define: (name, value, merge = false) => {
      SharedDefines[name] = value;
      if (context) context[name] = value;
      return undefined;
    },
    ...SharedDefines,
  };
  return context;
}

function zhCount(s) { return (s.match(/[\u4e00-\u9fff]/g) || []).length; }

// ===== 主流程 =====
makeContext();
(async () => { const probe = ejs.compile('<% this.__DBG_A = typeof this; this.__DBG_B = this === locals; this.__PROBE = 999; %>', { async: true, _with: true }); const out = await probe.call(context, context, ejs.escapeXML || ((s) => String(s)), ejs.include, ejs.rethrow); console.log('[probe] global.MARK-like check:', typeof globalThis.PLAYER_IDENTITIES, '| output:', JSON.stringify(out)); })();
console.log('═══════ 同级生2 模拟 v2：day1早 / 休息模式 / 当前女角=鸣泽唯(ID1) / 共享context+define ═══════');
const ctrl = ['D0系统控制器', '角色性格控制器', '世界观场景控制器'];
for (const n of ctrl) {
  const out = await renderEntry(n);
  const err = (out.match(/<!-- ERR[^>]*-->/g) || []);
  console.log(`[${n}] 渲染长度: ${out.length} 字符 / ${zhCount(out)} 中文 / ${Math.round(out.length / 1.5)} token`);
  if (err.length) console.log('   ⚠ 错误:', err.map((e) => e.slice(0, 160)).join('\n        '));
  if (n === 'D0系统控制器') {
    console.log('   [D0 输出全文]:', JSON.stringify(out.slice(0, 800)));
  }
  if (n === '角色性格控制器') {
    console.log('   [输出前 500]:', JSON.stringify(out.slice(0, 500)));
    console.log('   [输出后 300]:', JSON.stringify(out.slice(-300)));
  }
  // 即时检查
  console.log(`   [渲染后即时检查 ${n}]: PLAYER_IDENTITIES=${typeof globalThis.PLAYER_IDENTITIES}, HEROINE_PREFERENCES=${typeof globalThis.HEROINE_PREFERENCES}, PERSONALITY=${typeof globalThis.PERSONALITY_COMBINED_ARCHETYPES}`);
}
// 女角偏好系数表输出诊断
const prefOut = rendered['女角偏好系数表'] || '';
console.log('\n[女角偏好系数表] 渲染:', prefOut.length, 'B');
console.log('   [前 200]:', JSON.stringify(prefOut.slice(0, 200)));
console.log('   [后 200]:', JSON.stringify(prefOut.slice(-200)));

// context 挂载诊断
console.log('\n[context 关键键检查]');
for (const k of ['PLAYER_IDENTITIES', 'HEROINE_PREFERENCES', 'PERSONALITY_COMBINED_ARCHETYPES', 'STAGE_FRAMEWORK', 'DIFFICULTY_MODIFIERS', 'BAD_ENDINGS', 'calcPlayerPower', 'detectArchetype']) {
  const v = context[k];
  const t = v === undefined ? '❌ undefined' : typeof v === 'object' ? `✓ object(${Array.isArray(v) ? 'array' : Object.keys(v).length + '键'})` : `✓ ${typeof v}`;
  console.log(`   ${k}: ${t}`);
}
console.log();
console.log('=== 实际 getwi 拉取条目 ===');
for (const [k, v] of Object.entries(renderedSizes)) {
  console.log(`  ${k}: ${v}B ≈ ${Math.round(v / 1.5)} token`);
}
const total = Object.values(renderedSizes).reduce((a, b) => a + b, 0);
console.log('本次模拟渲染合计:', total, 'B ≈', Math.round(total / 1.5), 'token');
console.log();
console.log('SharedDefines 注册:', Object.keys(SharedDefines).join(', '));
