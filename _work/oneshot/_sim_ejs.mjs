// _sim_ejs.mjs - 模拟 tavern-cards EJS 运行时，验证修改后条目的语法与运行时 token 估算
// 用法: node _sim_ejs.mjs
import ejs from './tongjisheng2-app/app/node_modules/ejs/lib/ejs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WB = path.join(__dirname, 'src', '欲妈群', '世界书');
const VAR_DIR = path.join(WB, '变量');

// ===== 装饰器剥离（tavern-cards 层语法，EJS 不识别）=====
function stripDecorators(src) {
  return src
    .replace(/^@@if\s*\([^)]*\)\s*\n?/gm, '')
    .replace(/^@@private\s*\n?/gm, '')
    .replace(/^@@generate_before\s*\n?/gm, '');
}

// ===== 条目名 → 文件路径（含变量目录）=====
function resolveEntry(name) {
  const map = {
    '[initvar]初始(别开)(勿动)': '变量/initvar.yaml',
    'MVU变量列表': '变量/变量列表.txt',
    '[mvu_update]变量输出格式': '变量/变量输出格式.txt',
    '[mvu_update]变量更新规则': '变量/变量更新规则.yaml',
  };
  const rel = map[name] || (name + '.txt');
  const p = path.join(WB, rel);
  return fs.existsSync(p) ? p : null;
}

// ===== 变量集（模拟首页开局：3 核心活跃，今日主题非空，无NSFW场景）=====
const vars = {
  'stat_data.元数据.时段': '下午',
  'stat_data.郝佳期.阶段': 3,
  'stat_data.玩家.察觉值.假阳具真相': 20,
  'stat_data.玩家.察觉值.群存在': 10,
  'stat_data.群.活跃度': 78,
  'stat_data.群.秘密任务': {},
  'stat_data.阶段守卫': {},
  'stat_data.群.联盟': {},
  'stat_data.群.今日主题': '不吵醒儿子的情况下让他射精',
  'stat_data.群.暴露风险': 0,
  'stat_data.元数据.日数': 45,
  'stat_data.元数据.高考日': 100,
  // 成员详情：3 个核心活跃（苏媚su_mei/林婉清lin_wanqing/苏晴su_qing），其余 false
  'stat_data.群.成员详情.su_mei.本轮活跃': true,
  'stat_data.群.成员详情.su_mei.阶段': 4,
  'stat_data.群.成员详情.su_mei.姓名': '苏媚',
  'stat_data.群.成员详情.su_mei.儿子名': '无',
  'stat_data.群.成员详情.lin_wanqing.本轮活跃': true,
  'stat_data.群.成员详情.lin_wanqing.阶段': 3,
  'stat_data.群.成员详情.lin_wanqing.姓名': '林婉清',
  'stat_data.群.成员详情.lin_wanqing.儿子名': '林子墨',
  'stat_data.群.成员详情.su_qing.本轮活跃': true,
  'stat_data.群.成员详情.su_qing.阶段': 4,
  'stat_data.群.成员详情.su_qing.姓名': '苏晴',
  'stat_data.群.成员详情.su_qing.儿子名': '苏晨',
  'stat_data.群.成员详情.han_xue.本轮活跃': false,
  'stat_data.群.成员详情.tao_tao.本轮活跃': false,
  'stat_data.群.成员详情.you_zi.本轮活跃': false,
  'stat_data.群.成员详情.bai_lu.本轮活跃': false,
  'stat_data.群.成员详情.lian_nai.本轮活跃': false,
  'stat_data.群.成员详情.xiao_ye.本轮活跃': false,
  'stat_data.群.成员详情.ling.本轮活跃': false,
  'stat_data.群.成员详情.qin_yu.本轮活跃': false,
};

// 平铺变量 → 嵌套树（支持 getvar 路径解析：stat_data.群.成员详情.su_qing.阶段）
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

// ===== getwi 递归渲染 =====
const rendered = {};
async function renderEntry(name, stack = []) {
  if (rendered[name] !== undefined) return rendered[name];
  const fp = resolveEntry(name);
  if (!fp) return `<!-- getwi:missing:${name} -->`;
  let src = stripDecorators(fs.readFileSync(fp, 'utf8'));
  try {
    const out = await ejs.render(src, {
      getvar, setvar: () => {}, incvar: () => {}, decvar: () => {},
      matchChatMessages: () => false,  // 场景：最近2楼未点名，仅靠活跃标记
      getwi: async (n) => renderEntry(n, [...stack, name]),
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

console.log('═══════ 运行时模拟：下午时段 / 2角色活跃 / 最近2楼未点名 ═══════');
console.log('（matchChatMessages 全部 false，仅"本轮活跃"标记触发 getwi）\n');

// 1. 验证 [总控]NSFW 与 [总控]人物 的 getwi 收敛
for (const n of ['[总控]人物', '[总控]NSFW']) {
  const out = await renderEntry(n);
  const err = out.includes('<!-- ERR') ? out.match(/<!-- ERR[^>]*-->/g) : [];
  const missing = out.match(/<!-- getwi:missing:[^>]*-->/g) || [];
  // 检查实际拉取到的档案
  const pulls = Object.keys(rendered).filter(k => k.includes('NSW档案') || k.includes('独立剧情线'));
  console.log(`[${n}] 渲染长度: ${out.length} 字符 / ${zhCount(out)} 中文`);
  if (err.length) console.log('   ⚠ 语法错误:', err);
  if (missing.length) console.log('   ⚠ 缺失条目:', missing);
  console.log('   本次实际拉取:', pulls.length ? pulls.join(', ') : '(无)');
  console.log();
}

// 2. 验证条件化条目
const condTests = [
  ['[mvu_plot]秘密任务系统', /当前无秘密任务/],
  ['[mvu_plot]群生态扩展', /NPC儿子对照线/],
  ['[mvu_plot]阶段晋升系统', /阶段3：身体教导期/],
  ['[mvu_plot]群内疑云', /风平浪静/],
  ['[mvu_plot]D20对抗判定系统', /判定值 = D20/],
  ['[世界观]欲妈群机制', /三个讨论组/],
  ['[mvu_plot]高考倒计时系统', /距高考/],
];
for (const [n, pat] of condTests) {
  rendered[n] = undefined;
  const out = await renderEntry(n);
  const err = out.includes('<!-- ERR') ? out.match(/<!-- ERR[^>]*-->/g) : [];
  const has = pat.test(out);
  console.log(`${err.length ? '⚠ 语法错误' : '✓'} ${n} | 长度 ${out.length}/${zhCount(out)}中文 | 关键内容${has ? '命中' : '缺失'}`);
  if (err.length) console.log('   ', err.join(' '));
}
