// _verify_yyds_schedule.mjs - 验证欲望都市 阶段调度 getwi 链路 + 改造后每轮注入量
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

// ===== 变量集 =====
const raw = YAML.parse(fs.readFileSync(path.join(CARD, '世界书/变量/initvar.yaml'), 'utf8'));
const vars = {};
function flatten(d, prefix = 'stat_data') {
  for (const [k, v] of Object.entries(d)) {
    const p = `${prefix}.${k}`;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p); else vars[p] = v;
  }
}
flatten(raw);
function getvar(p, opts = {}) {
  if (vars[p] !== undefined) return vars[p];
  // p 是对象节点(存在子键) → 返回 truthy 对象
  const prefix = p + '.';
  for (const k of Object.keys(vars)) {
    if (k.startsWith(prefix)) return {};
  }
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
    .replace(/^@@generate_before\s*\n?/gm, '')
    .replace(/^@@generate_after\s*\n?/gm, '');
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
    rendered[name] = out;
    return out;
  } catch (e) {
    rendered[name] = `<!-- ERR ${name}: ${e.message} -->`;
    return rendered[name];
  }
}

function zhCount(s) { return (s.match(/[\u4e00-\u9fff]/g) || []).length; }

async function runScenario(label, overrides) {
  Object.assign(vars, overrides);
  delete rendered['[mvu_plot]阶段调度']; // 清缓存
  for (const k of Object.keys(rendered)) delete rendered[k];
  const out = await renderComment('[mvu_plot]阶段调度');
  const err = out.match(/<!-- ERR[^>]*-->/g);
  const missing = out.match(/<!-- getwi:missing:[^>]*-->/g) || [];
  console.log(`\n════ ${label} ════`);
  console.log(`输出长度: ${out.length} 字 / ${zhCount(out)} 中文`);
  if (err) console.log('⚠ EJS错误:', err);
  if (missing.length) console.log('⚠ 缺失条目:', missing);
  const pulls = Object.keys(rendered).filter(k => k !== '[mvu_plot]阶段调度');
  console.log('本次实际拉取:', pulls.length ? pulls.join(', ') : '(无)');
  console.log('渲染输出(前400字):');
  console.log(out.slice(0, 400).replace(/\n/g, '⏎'));
}

// 场景1: 战斗进行中,当前目标=丽莎,缴械75(阶段四)
await runScenario('场景1: 战斗目标=丽莎 缴械75', {
  'stat_data.排班.当前战斗目标': '丽莎·伊万诺娃',
  'stat_data.排班.战斗状态': '进行中',
  'stat_data.女性角色.丽莎·伊万诺娃.缴械值': 75,
});

// 场景2: 俘虏(缴械100)
await runScenario('场景2: 战斗目标=苏晚晴 缴械100(俘虏)', {
  'stat_data.排班.当前战斗目标': '苏晚晴',
  'stat_data.排班.战斗状态': '进行中',
  'stat_data.女性角色.苏晚晴.缴械值': 100,
});

// 场景3: 自由时段(无目标)
await runScenario('场景3: 无目标(自由时段)', {
  'stat_data.排班.当前战斗目标': '',
  'stat_data.排班.战斗状态': '未开始',
});
