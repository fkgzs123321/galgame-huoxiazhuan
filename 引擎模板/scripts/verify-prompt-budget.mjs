#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// verify-prompt-budget.mjs · prompt 预算与投放纪律校验器
//
// 校验六项（见 design-spec §7.8）：
//   1. order 分区      引擎条目 < 100，底座条目 ≥ 200（不许交错）
//   2. 底座门控        底座条目必须含 `世界.底座` 判定
//   3. 单条上限        常驻条目 ≤ 5000 字符（>6000 违规）
//   4. 分层预算        每层合计不超硬上限
//   5. 常驻总量        ≤ 44500 字符（渲染估算）
//   6. 按需层误常驻    T4 层不得为 constant
//
// 两个字符量：
//   文件 = 文件原始字符数（上限）
//   估算 = 渲染后估算。按两种裁剪折算：
//          a) state 层 @@if 门控 → 整条只在命中时渲染
//          b) 文件内 if/else 分支 → 只渲染命中的那一支
//          互斥组（同前缀 + 都有门控，如 7 套「她」、6 条支线）整组只计 1 条
//
// 用法：node scripts/verify-prompt-budget.mjs [项目目录] [--verbose]
//   退出码 0 = 通过，1 = 有违规，2 = 环境错误
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const positional = argv.filter((a) => !a.startsWith('--'));
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectDir = path.resolve(positional[0] || path.join(__dirname, '..'));
const statePath = path.join(projectDir, 'tavern-cards-state.json');

if (!fs.existsSync(statePath)) {
  console.error('[FAIL] 找不到 tavern-cards-state.json: ' + statePath);
  process.exit(2);
}

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const manifest = state.entryManifest || {};

// ── 预算表（字符数） ──
const BUDGET = {
  T0: { name: 'T0 宪法层', target: 8000, hard: 10000, single: 5000 },
  T1: { name: 'T1 状态层', target: 6000, hard: 8000, single: 5000 },
  T2: { name: 'T2 契约层', target: 1000, hard: 1500, single: 1500 },
  T3_BASE: { name: 'T3 底座世界', target: 4000, hard: 5000, single: 5000 },
  T3_DAY: { name: 'T3 底座关卡', target: 5000, hard: 6000, single: 5000 },
  T4: { name: 'T4 按需层', target: null, hard: null, single: null },
  MVU: { name: 'MVU', target: 12000, hard: 14000, single: 6000 },
  UNKNOWN: { name: '未分类', target: null, hard: null, single: null },
};
let TOTAL_HARD = 44500;
const BASE_MIN_ORDER = 200;

// ── 项目级预算覆盖：<projectDir>/budget.json ──
// 默认表来自 机制层规范 §E4「④ token 预算表」，那是按【同级生2 的内容量】定的。
// 每个底座的内容体量不同，预算应当按项目配，而不是所有项目共用一组数字。
// budget.json 形状：
//   { "note": "为什么这么定", "T0": {"target":8000,"hard":10000,"single":5000}, ..., "TOTAL_HARD": 44500 }
(function applyProjectBudget() {
  const bp = path.join(projectDir, 'budget.json');
  if (!fs.existsSync(bp)) return;
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(bp, 'utf8')); } catch (e) {
    console.log('[warn] budget.json 解析失败，沿用默认预算：' + e.message);
    return;
  }
  for (const k of Object.keys(BUDGET)) {
    if (cfg[k] && typeof cfg[k] === 'object') Object.assign(BUDGET[k], cfg[k]);
  }
  if (typeof cfg.TOTAL_HARD === 'number') TOTAL_HARD = cfg.TOTAL_HARD;
  console.log('[budget] 已应用项目级预算 budget.json' + (cfg.note ? '（' + cfg.note + '）' : ''));
})();

// ── 分层白名单（优先于路径启发式） ──
const T0_NAMES = ['加载纪律', '四态循环', '反抗与判定', '剧情推进', '交互循环', '出招', '兴奋度机制', '思维链', '叙述准则', '感知禁令', '玩家的输入'];
const T1_NAMES = ['边界情况', '离线行动', '熟练度阶段', '阶段指导', '终局', '开局'];

// ── 互斥组：同前缀 + 都有 state 门控 → 整组只渲染 1 条 ──
const MUTEX_GROUPS = [
  { prefix: '她_', label: '7 套屏幕外的她' },
  { prefix: '第', label: '17 天（按天互斥，EJS 已按天门控）' },
  { prefix: '[mvu_plot]支线·', label: '6 条支线' },
];

function classify(name, cat, filePath) {
  const p = filePath || '';
  if (cat === 'MVU') return 'MVU';
  const bare = name.replace(/^\[[^\]]+\]/, '');
  if (T0_NAMES.includes(bare)) return 'T0';
  if (T1_NAMES.includes(bare)) return 'T1';
  if (p.includes('角色/屏幕外的她/')) return 'T1';
  if (/速览|索引/.test(name)) return 'T1'; // 索引条目常驻（机制层规范 §E4 铁律 3）
  if (p.includes('世界观/引擎/')) return 'T0';
  if (p.includes('扮演准则/')) return 'T0';
  if (p.includes('阶段指导/')) return 'T1';
  if (p.includes('事件/')) return 'T1';
  if (p.includes('底座_') || p.includes('剧情/')) return 'T3_BASE';
  // 玩家档案（角色分区下名含「玩家/主角/<user>」）必须常驻——第二人称卡的 AI 每轮都需要玩家设定，不算按需层（2026-09-27 血月七夜）
  if (cat === '角色' && /玩家|主角|<user>|\buser\b/i.test(name)) return 'T1';
  if (cat === '角色') return 'T4';
  if (p.includes('契约')) return 'T2';
  return 'UNKNOWN';
}

const readText = (rel) => {
  try { return fs.readFileSync(path.join(projectDir, rel), 'utf8'); } catch { return null; }
};

// ── EJS 段落裁剪分析 ──
// 估算条目「实际渲染出来的字符数」。
// 做法：把文本按 EJS 标签切开，识别每个「if / else-if / else 链」的各分支长度，
//       链内取**最大分支**（上界，不会低估），链外文本照算，最后相加。
// 一个条目里可以有多条互不相干的链（如「熟练度 5 档 + 目的进度 3 档」），
//       这时各链各取 1 个分支 —— 和单链一样处理，不是「多维不折算」。
function analyzeEjs(t) {
  if (!t || !/<%/.test(t)) return { 链数: 0, 分支数: 1, 估算: t ? t.length : 0, multiDim: false };

  const 段 = t.split(/(<%[_-]?[\s\S]*?[_-]?%>)/);
  const 链们 = [];
  let 链外 = 0;
  let 当前链 = null;

  for (const s of 段) {
    if (!s.startsWith('<%')) {
      // 普通文本：归入当前分支，或在链外
      if (当前链) 当前链.分支[当前链.分支.length - 1] += s.length;
      else 链外 += s.length;
      continue;
    }
    const code = s.replace(/^<%[_-]?/, '').replace(/[_-]?%>$/, '').trim();
    if (/^if\s*\(/.test(code)) {
      // 开新链
      当前链 = { 分支: [0] };
      链们.push(当前链);
    } else if (/^\}\s*else/.test(code)) {
      // 「} else if (...) {」或「} else {」—— 同一条链的下一个分支
      if (当前链) 当前链.分支.push(0);
    } else if (/^\}\s*$/.test(code)) {
      // 「}」—— 分支/链结束（同时也会匹配最外层的块作用域收尾，此时链已为 null，无害）
      当前链 = null;
    }
  }

  const 分支数 = 链们.reduce((n, c) => n + c.分支.length, 0) || 1;
  let 估算 = 链外;
  for (const c of 链们) 估算 += Math.max(...c.分支);

  return {
    链数: 链们.length,
    分支数,
    估算,
    multiDim: 链们.length > 1,
  };
}

const rows = [];
const violations = [];
const warnings = [];

const closed = [];
for (const cat of Object.keys(manifest)) {
  for (const name of Object.keys(manifest[cat])) {
    const e = manifest[cat][name];
    // 关闭的条目不进 prompt，不计入任何预算。
    // 注意：ST 的投放看 strategy，但 enabled:false 是「这条根本没开」，
    // 与「开了但要关键词触发」是两回事，所以这里单独判。
    if (e.enabled === false) { closed.push({ cat, name }); continue; }
    let relPath = e.path || null;
    let gate = '';
    if (!relPath && Array.isArray(e.contents)) {
      const f = e.contents.find((x) => x.file);
      const c = e.contents.find((x) => x.content);
      if (f) relPath = f.file;
      if (c) gate = c.content || '';
    }
    const text = relPath ? readText(relPath) : null;
    const chars = text === null ? 0 : text.length + gate.length;
    const ejs = text ? analyzeEjs(text) : { 链数: 0, 分支数: 1, 估算: 0, multiDim: false };
    const stateGated = /@@if|matchChatMessages|getvar\(/.test(gate);
    // 渲染估算 = 条目内实际会渲染出来的部分（EJS 各链取最大分支）+ 门控本身
    const est = (text === null ? 0 : ejs.估算) + gate.length;

    const layer = classify(name, cat, relPath);
    const strategy = (e.strategy && e.strategy.type) || '?';
    const order = e.position && e.position.order != null ? e.position.order
      : (e.order != null ? e.order : 999); // MVU 分区为扁平形状（order 在顶层，无 position）
    const isConstant = strategy === 'constant';
    const isBase = layer === 'T3_BASE' || layer === 'T3_DAY';
    const hasBaseGate = /世界\.底座/.test((text || '') + gate);
    const hasTrim = stateGated || ejs.链数 > 0;

    rows.push({ cat, name, layer, chars, est, ejs, stateGated, strategy, order, gate,
      isConstant, isBase, hasBaseGate, hasTrim, marks: [] });
  }
}

// ── 互斥组聚合 ──
const absorbed = new Set();

// ★ 第二种互斥：同一个变量的不同区间（如 15 位女角 × 11 档好感度）
//   判据：EJS 门控里读的是同一个 stat_data 变量 → 运行时只会有 1 条命中
const 变量组 = new Map();
for (const r of rows) {
  if (!r.stateGated) continue;
  // 从 gate 里抓出所有 getvar('stat_data.X') 的变量名，取「最后那个」——
  // 前几个通常是 世界.底座 这类通用门控，真正的分档变量在后面
  const 全部 = [...(r.gate || '').matchAll(/getvar\(\s*['"]stat_data\.([^'"]+)['"]/g)].map((x) => x[1]);
  const m = 全部.length ? [null, 全部[全部.length - 1]] : null;
  if (!m) continue;
  const 变量 = m[1];
  if (!变量组.has(变量)) 变量组.set(变量, []);
  变量组.get(变量).push(r);
}
for (const [变量, members] of 变量组) {
  if (members.length < 3) continue;          // 少于 3 档不算组
  const keep = members.reduce((a, b) => (a.est >= b.est ? a : b));
  keep.groupLabel = '同一变量「' + 变量 + '」的 ' + members.length + ' 档（互斥，只渲染 1 条）';
  members.forEach((m) => { if (m !== keep) absorbed.add(m.cat + '/' + m.name); });
}

for (const g of MUTEX_GROUPS) {
  const members = rows.filter((r) => r.name.startsWith(g.prefix) && r.stateGated);
  if (members.length < 2) continue;
  const keep = members.reduce((a, b) => (a.est >= b.est ? a : b));
  keep.groupLabel = g.label + '（' + members.length + ' 条中只渲染 1）';
  members.forEach((m) => { if (m !== keep) absorbed.add(m.cat + '/' + m.name); });
}

// ── 逐条校验 ──
for (const r of rows) {
  if (r.isBase && !r.hasBaseGate) { r.marks.push('无底座门控'); violations.push(`[门控] ${r.name}：底座条目未包含 世界.底座 判定`); }
  if (r.isBase && r.order < BASE_MIN_ORDER) { r.marks.push('order越界'); violations.push(`[order] ${r.name}：底座条目 order=${r.order} < ${BASE_MIN_ORDER}（插在引擎区）`); }
  if (!r.isBase && r.layer !== 'UNKNOWN' && r.layer !== 'T4' && r.order >= BASE_MIN_ORDER) { r.marks.push('order越界'); violations.push(`[order] ${r.name}：${BUDGET[r.layer].name} 条目 order=${r.order} ≥ ${BASE_MIN_ORDER}（排在底座区）`); }
  const cap = BUDGET[r.layer].single;
  // 单条上限看**渲染估算**（真正进 prompt 的量）；文件量超了只提示「靠 EJS 撑着」
  if (r.isConstant && cap && r.est > cap * 1.2) { r.marks.push('单条超限'); violations.push(`[单条] ${r.name}：渲染估算 ${r.est} 字符 > 上限 ${cap}`); }
  else if (r.isConstant && cap && r.est > cap) { r.marks.push('单条超限'); warnings.push(`[单条] ${r.name}：渲染估算 ${r.est} 字符 > 目标 ${cap}`); }
  else if (r.isConstant && cap && r.chars > cap) { r.marks.push('文件超限/EJS撑'); warnings.push(`[单条] ${r.name}：文件 ${r.chars} 字符 > ${cap}，但渲染估算 ${r.est} —— 依赖 EJS 裁剪，确认变量读取不会失败`); }
  if (r.isBase && r.est > 3000 && !r.hasTrim) { r.marks.push('无裁剪'); warnings.push(`[裁剪] ${r.name}：估算 ${r.est} 字符且无任何 EJS 裁剪，确认是否应整份常驻`); }
  if (r.layer === 'T4' && r.isConstant) { r.marks.push('按需层误常驻'); violations.push(`[常驻] ${r.name}：按需层条目不得为 constant`); }
  if (r.layer === 'UNKNOWN') { r.marks.push('未分类'); warnings.push(`[分类] ${r.name}：无法自动判定层级，请确认归属`); }
}

rows.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

// ── 分层汇总（按渲染估算） ──
const totals = {};
for (const r of rows) {
  if (!totals[r.layer]) totals[r.layer] = { est: 0, chars: 0, count: 0 };
  totals[r.layer].count += 1;
  totals[r.layer].chars += r.chars;
  if (r.isConstant && !absorbed.has(r.cat + '/' + r.name)) totals[r.layer].est += r.est;
}
let grandEst = 0;
let grandChars = 0;
for (const k of Object.keys(totals)) {
  grandEst += totals[k].est;
  grandChars += totals[k].chars;
  const b = BUDGET[k];
  if (b && b.hard && totals[k].est > b.hard) {
    violations.push(`[分层] ${b.name}：渲染估算 ${totals[k].est} 字符 > 硬上限 ${b.hard}`);
  }
}
if (grandEst > TOTAL_HARD) {
  violations.push(`[总量] 常驻渲染估算 ${grandEst} 字符 > 硬上限 ${TOTAL_HARD}（约 ${Math.round(grandEst / 1.6)} token）`);
}

// ── 输出 ──
const L = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));
const R = (s, n) => ' '.repeat(Math.max(0, n - String(s).length)) + String(s);

console.log('='.repeat(100));
console.log('prompt 预算与投放纪律校验 · ' + (state.projectName || path.basename(projectDir)));
console.log('项目目录: ' + projectDir);
console.log('='.repeat(100));
console.log(L('order', 6) + L('层', 13) + L('strategy', 10) + R('文件', 7) + R('估算', 7) + '  条目 / 标记');
console.log('-'.repeat(100));
for (const r of rows) {
  const mark = [];
  if (r.groupLabel) mark.push(r.groupLabel);
  if (absorbed.has(r.cat + '/' + r.name)) mark.push('组内已计 1 条');
  if (r.stateGated) mark.push('state门控');
  else if (r.ejs.链数 > 0) mark.push('EJS裁剪 ' + r.ejs.链数 + '链/' + r.ejs.分支数 + '分支取最大');
  else if (r.chars > 1500) mark.push('无裁剪');
  mark.push(...r.marks);
  console.log(L(r.order, 6) + L(BUDGET[r.layer].name, 13) + L(r.strategy, 10) +
    R(r.chars, 7) + R(r.est, 7) + '  ' + r.cat + '/' + r.name +
    (mark.length ? '  << ' + mark.join(' / ') : ''));
}
console.log('-'.repeat(100));
console.log('分层汇总（渲染估算 / 硬上限）：');
for (const k of Object.keys(BUDGET)) {
  if (!totals[k]) continue;
  const b = BUDGET[k];
  const cap = b.hard ? String(b.hard) : '—';
  const flag = b.hard && totals[k].est > b.hard ? '  << 超限' : '';
  console.log('  ' + L(b.name, 13) + R(totals[k].est, 7) + ' / ' + R(cap, 6) +
    '   条目数 ' + R(totals[k].count, 3) + '（文件合计 ' + totals[k].chars + '）' + flag);
}
if (closed.length) {
  console.log('【已关闭】' + closed.length + ' 条（不计入预算）：' + closed.map((x) => x.name).join(' / '));
}
console.log('  ' + L('常驻合计', 13) + R(grandEst, 7) + ' / ' + R(TOTAL_HARD, 6) +
  '   ≈ ' + Math.round(grandEst / 1.6) + ' token');
console.log('  ' + L('（文件总量上限）', 13) + R(grandChars, 7) + '   —— 未裁剪时的最坏情况');
console.log('='.repeat(100));
if (violations.length) {
  console.log('违规 ' + violations.length + ' 项（打包前必须修）：');
  violations.forEach((v, i) => console.log('  ' + (i + 1) + '. ' + v));
} else {
  console.log('违规 0 项 — 通过');
}
if (warnings.length && (verbose || warnings.length <= 20)) {
  console.log('警告 ' + warnings.length + ' 项（建议处理）：');
  warnings.slice(0, verbose ? warnings.length : 20).forEach((v, i) => console.log('  ' + (i + 1) + '. ' + v));
} else if (warnings.length) {
  console.log('警告 ' + warnings.length + ' 项（加 --verbose 查看全部）');
}
console.log('='.repeat(100));
process.exit(violations.length ? 1 : 0);
