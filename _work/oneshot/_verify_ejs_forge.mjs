// _verify_ejs_forge.mjs - 不要玩弄我的鸡吧-forge EJS 全量渲染验证
// 用法: node _verify_ejs_forge.mjs
// 1. 解析 [initvar]请勿打开.yaml 构建真实 stat_data
// 2. 对 manifest 注册的每个 EJS 条目: 剥离 @@ 装饰器, 渲染, 捕获语法/运行时错误
// 3. getwi: 校验目标条目是否存在于 manifest(动态拼名也校验)
import ejs from './tongjisheng2-app/app/node_modules/ejs/lib/ejs.js';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '不要玩弄我的鸡吧-forge');
const STATE = JSON.parse(fs.readFileSync(path.join(CARD, 'tavern-cards-state.json'), 'utf-8'));

// ===== 构建 stat_data =====
const initRaw = fs.readFileSync(path.join(CARD, '世界书', '变量', '[initvar]请勿打开.yaml'), 'utf-8');
// 修复既有格式问题: '陌生模板: {}' 后误挂了13个重复角色档案 → 允许其成为子对象(仅验证用途,不改源文件)
const initFixed = initRaw.replace(/^陌生模板: \{\}$/m, '陌生模板:');
let stat_data = {};
try {
  const doc = YAML.parse(initFixed);
  stat_data = (doc && doc.stat_data) || doc || {};
} catch (e) {
  console.error('initvar YAML 解析失败:', e.message);
  process.exit(1);
}
// stat_data 兜底默认值(避免渲染时大量 undefined)
const DEF = {
  '女性角色': {}, '隐藏层': { 持有者ID: '林婉清', 确认使用者: [], 活跃使用人数: 0, 预期时段: 1, 预期日: 1, '$已初始化': true },
  '时间': { 天数: 1, 小时: 8, 星期: '周一', 日期: '02-24' },
  '状态': { 精力: 80, 精力上限: 80, 理智: 80, 健康: 75, 压力: 10, 体力: 80, 体力上限: 80, 金钱: 500, 怀疑值: 0, 堕落值: 0, 难度: '困难' },
  '使用阶段': { 当前阶段: 1, 总使用次数: 0, 今日使用: 0, 今日上限: 5, 经验: 0, 最后使用时: -99 },
  '学业': { 分数: 75, 阶段: 3, 考试倒计时: 7 },
};
for (const k in DEF) if (stat_data[k] === undefined) stat_data[k] = DEF[k];

// ===== manifest 条目名集合(供 getwi 校验) =====
const entryNames = new Set();
const entryContent = new Map();
for (const [grp, items] of Object.entries(STATE.entryManifest)) {
  for (const [name, cfg] of Object.entries(items)) {
    entryNames.add(name);
    const p = path.join(CARD, cfg.path.replace(/\\/g, path.sep));
    if (fs.existsSync(p)) entryContent.set(name, fs.readFileSync(p, 'utf-8'));
    else entryContent.set(name, '');
  }
}

// ===== 运行时函数 =====
function getPath(obj, p) {
  const segs = String(p).split('.');
  let cur = obj;
  for (const s of segs) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[s];
  }
  return cur;
}
const gvCache = new Map();
function getvar(p, opts = {}) {
  if (gvCache.has(p)) return gvCache.get(p);
  let v = getPath(stat_data, p.replace(/^stat_data\./, ''));
  if (v === undefined && opts.defaults !== undefined) v = opts.defaults;
  gvCache.set(p, v);
  return v;
}
const getwiMiss = [];
function getwi(name) {
  if (entryNames.has(name)) return entryContent.get(name) || '';
  getwiMiss.push(name);
  return '';
}
const triggerSlash = () => '';
const setvar = (p, v, o) => { /* no-op 验证环境 */ };
const getIframeName = () => 'verify';
const replaceVariables = (s) => s;

// ===== 剥离装饰器 =====
function stripDecorators(src) {
  return src
    .replace(/^@@if\s*\([^)]*\)\s*\n?/gm, '')
    .replace(/^@@private\s*\n?/gm, '')
    .replace(/^@@generate_before\s*\n?/gm, '');
}

// ===== 渲染全部 EJS 条目(异步模式, 支持 await getwi) =====
let ok = 0, fail = 0, skipped = 0;
const errors = [];
const RUNTIME = { getvar, getwi, triggerSlash, setvar, getIframeName, replaceVariables };
(async () => {
for (const [grp, items] of Object.entries(STATE.entryManifest)) {
  for (const [name, cfg] of Object.entries(items)) {
    const src = entryContent.get(name) || '';
    if (!/<%[=-]?/.test(src)) { skipped++; continue; }
    const tpl = stripDecorators(src);
    try {
      const out = await ejs.render(tpl, RUNTIME, { filename: name, async: true });
      ok++;
      if (getwiMiss.length) {
        errors.push(`[${name}] getwi 目标缺失: ${[...new Set(getwiMiss)].join(', ')}`);
        getwiMiss.length = 0;
      }
    } catch (e) {
      fail++;
      errors.push(`[${name}] 渲染失败: ${e.message.slice(0, 300)}`);
    }
  }
}
console.log(`EJS 条目渲染: 成功 ${ok} | 失败 ${fail} | 非EJS跳过 ${skipped}`);
if (errors.length) {
  console.log('\n===== 问题列表 =====');
  errors.forEach((er, i) => console.log(`${i + 1}. ${er}`));
} else {
  console.log('✅ 全部 EJS 条目渲染通过, 无 getwi 目标缺失');
}
})();
