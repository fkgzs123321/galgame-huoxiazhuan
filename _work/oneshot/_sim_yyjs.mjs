// _sim_yyjs.mjs - 怨妇救赎 EJS 渲染模拟验证
// 用法: node _sim_yyjs.mjs
import ejs from './tongjisheng2-app/app/node_modules/ejs/lib/ejs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '怨妇救赎');

function stripDecorators(src) {
  return src
    .replace(/^@@if\s*\([^)]*\)\s*\n?/gm, '')
    .replace(/^@@private\s*\n?/gm, '')
    .replace(/^@@generate_before\s*\n?/gm, '');
}

// ===== 变量集 =====
let vars = {};
// 平铺键 → 嵌套对象（模拟 stat_data 真实结构）
function nest(flat) {
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    const segs = k.split('.');
    let cur = out;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      if (!(s in cur) || typeof cur[s] !== 'object') cur[s] = {};
      cur = cur[s];
    }
    cur[segs[segs.length - 1]] = v;
  }
  return out;
}
function getvar(p, opts = {}) {
  if (vars[p] !== undefined) return vars[p];
  if (p.startsWith('stat_data.')) {
    const segs = p.split('.');
    let cur = vars;
    for (const s of segs) {
      if (cur && typeof cur === 'object' && s in cur) cur = cur[s];
      else return opts.defaults;
    }
    return cur === undefined ? opts.defaults : cur;
  }
  return opts.defaults;
}

function makeVars(target, { jd = 1, xs = 0, kz = 0, zh = 85, huaiyun = '未孕', juolie = false, hc = '', qm = 10, ccj = 10, zy = 5, xl = 30, yl = 20, fz = 30, jing = '正常' } = {}) {
  const targetKey = target || '';
  return {
    'stat_data.时间.日期': '2026年9月1日',
    'stat_data.时间.星期': '星期二',
    'stat_data.时间.时段': '晚上',
    'stat_data.玩家.体力': 70,
    'stat_data.玩家.性欲': 40,
    'stat_data.玩家.勃起度': 20,
    'stat_data.当前目标': targetKey,
    ['stat_data.女主.' + targetKey + '.身份']: '测试身份',
    ['stat_data.女主.' + targetKey + '.丈夫']: '测试丈夫',
    ['stat_data.女主.' + targetKey + '.阶段']: jd,
    ['stat_data.女主.' + targetKey + '.吸收量']: xs,
    ['stat_data.女主.' + targetKey + '.转化率']: zh,
    ['stat_data.女主.' + targetKey + '.掌控值']: kz,
    ['stat_data.女主.' + targetKey + '.亲密值']: qm,
    ['stat_data.女主.' + targetKey + '.怀孕']: huaiyun,
    ['stat_data.女主.' + targetKey + '.丈夫察觉度']: ccj,
    ['stat_data.女主.' + targetKey + '.资源转移']: zy,
    ['stat_data.女主.' + targetKey + '.决裂']: juolie,
    ['stat_data.女主.' + targetKey + '.火葬场进度']: hc,
    ['stat_data.女主.' + targetKey + '.心理状态.精神状态']: jing,
    ['stat_data.女主.' + targetKey + '.心声']: '心声测试',
  };
}

const ENTRIES = {
  阶段调度: '世界书/阶段指导/阶段调度.yaml',
  追夫火葬场: '世界书/阶段指导/追夫火葬场.yaml',
  情境上下文EJS: '世界书/变量/情境上下文EJS.yaml',
  林曼云_阶段: '世界书/角色/林曼云/阶段.yaml',
  苏婉君_阶段: '世界书/角色/苏婉君/阶段.yaml',
  秦月娥_阶段: '世界书/角色/秦月娥/阶段.yaml',
  白芷若_阶段: '世界书/角色/白芷若/阶段.yaml',
  陈美兰_阶段: '世界书/角色/陈美兰/阶段.yaml',
};

// getwi 名称 → 文件路径（模拟运行时按条目名拉取）
const GETWI_MAP = {
  林曼云_阶段行为: '世界书/角色/林曼云/阶段.yaml',
  苏婉君_阶段行为: '世界书/角色/苏婉君/阶段.yaml',
  秦月娥_阶段行为: '世界书/角色/秦月娥/阶段.yaml',
  白芷若_阶段行为: '世界书/角色/白芷若/阶段.yaml',
  陈美兰_阶段行为: '世界书/角色/陈美兰/阶段.yaml',
  追夫火葬场: '世界书/阶段指导/追夫火葬场.yaml',
};
const getwiCache = {};
async function getwi(name) {
  if (getwiCache[name] !== undefined) return getwiCache[name];
  const fp = GETWI_MAP[name];
  if (!fp) return `<!-- getwi:missing:${name} -->`;
  try {
    const src = stripDecorators(fs.readFileSync(path.join(CARD, fp), 'utf8'));
    const out = await ejs.render(src, {
      getvar, setvar: () => {}, incvar: () => {}, decvar: () => {},
      matchChatMessages: () => false,
      getwi: async (n) => getwi(n), activewi: () => {}, define: () => {},
      getChatMessage: () => '', user: '你',
    }, { async: true });
    getwiCache[name] = out;
    return out;
  } catch (e) {
    return `<!-- getwi:ERR:${name}:${e.message} -->`;
  }
}

async function renderFile(fp, varset) {
  vars = nest(varset);
  getwiCache && Object.keys(getwiCache).forEach(k => delete getwiCache[k]);
  const src = stripDecorators(fs.readFileSync(path.join(CARD, fp), 'utf8'));
  try {
    const out = await ejs.render(src, {
      getvar, setvar: () => {}, incvar: () => {}, decvar: () => {},
      matchChatMessages: () => false,
      getwi, activewi: () => {}, define: () => {},
      getChatMessage: () => '', user: '你',
    }, { async: true });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

function zhCount(s) { return (s.match(/[\u4e00-\u9fff]/g) || []).length; }

console.log('═══════════ 怨妇救赎 EJS 渲染模拟 ═══════════\n');

// 1. 阶段调度：目标=秦月娥，阶段 1-5 各渲染一次（验证 getwi 拉取关灯阶段文件）
for (let jd = 1; jd <= 5; jd++) {
  const v = makeVars('秦月娥', { jd, xs: jd === 1 ? 0 : jd === 2 ? 15 : jd === 3 ? 40 : jd === 4 ? 75 : 75, kz: jd === 3 ? 34 : jd === 4 ? 64 : 0, juolie: jd === 5 });
  const r = await renderFile(ENTRIES.阶段调度, v);
  const stageName = ['', '陌生·攻略', '暧昧·初孕', '觉醒·掌控', '巅峰·蜜月', '决裂·火葬场'][jd];
  const pulled = r.ok ? (r.out.includes('秦月娥·五阶段详细行为') || r.out.includes('阶段' + ['一', '二', '三', '四', '五'][jd - 1]) ? '已拉取' : '未拉取!') : 'ERR';
  console.log(`${r.ok ? '✓' : '⚠'} 阶段调度·阶段${jd}(${stageName}) | ${zhCount(r.out)}中文 | ${pulled}${r.ok ? '' : ' | ' + r.err}`);
}

// 1b. 阶段调度·决裂时追加拉取追夫火葬场
{
  const v = makeVars('林曼云', { jd: 5, xs: 80, kz: 44, juolie: true, hc: '极端强制' });
  const r = await renderFile(ENTRIES.阶段调度, v);
  console.log(`${r.ok && r.out.includes('极端强制') ? '✓' : '⚠'} 阶段调度·决裂追加火葬场 | ${zhCount(r.out)}中文 | ${r.out.includes('追夫火葬场') || r.out.includes('极端强制') ? '已拉取' : '未拉取!'}`);
}

// 1c. 阶段调度·自由时段
{
  const v = makeVars('');
  const r = await renderFile(ENTRIES.阶段调度, v);
  console.log(`${r.ok ? '✓' : '⚠'} 阶段调度·自由时段 | ${zhCount(r.out)}中文`);
}

// 2. 追夫火葬场：各段渲染（目标=林曼云，决裂=true）
const hcStages = ['', '傲慢试探', '资源封杀', '认知崩塌', '抛弃一切', '极端强制', '自毁威胁', '替身反噬', '终局退场'];
for (const h of hcStages) {
  const v = makeVars('林曼云', { jd: 5, xs: 80, kz: 44, juolie: true, hc: h });
  const r = await renderFile(ENTRIES.追夫火葬场, v);
  console.log(`${r.ok ? '✓' : '⚠ 语法错误'} 追夫火葬场·${h || '刚决裂'} | ${zhCount(r.out)}中文${r.ok ? '' : ' | ' + r.err}`);
}

// 3. 情境上下文EJS（无目标 + 有目标+火葬场中）
let v3 = makeVars('');
let r3 = await renderFile(ENTRIES.情境上下文EJS, v3);
console.log(`${r3.ok ? '✓' : '⚠ 语法错误'} 情境上下文EJS·自由时段 | ${zhCount(r3.out)}中文`);
v3 = makeVars('陈美兰', { jd: 5, xs: 90, kz: 81, juolie: true, hc: '自毁威胁', huaiyun: '孕四月' });
r3 = await renderFile(ENTRIES.情境上下文EJS, v3);
console.log(`${r3.ok ? '✓' : '⚠ 语法错误'} 情境上下文EJS·火葬场中 | ${zhCount(r3.out)}中文 ${r3.ok ? (r3.out.includes('自毁威胁') ? '| 命中' : '| 未命中!') : r3.err}`);

// 4. 五位女主阶段行为：阶段1/3/5 三档抽查
for (const [name, fp] of Object.entries(ENTRIES)) {
  if (!name.endsWith('_阶段')) continue;
  let allOk = true;
  for (const jd of [1, 3, 5]) {
    const v = makeVars(name.replace('_阶段', ''), { jd, xs: jd === 1 ? 0 : jd === 3 ? 40 : 80, kz: jd === 3 ? 30 : 60, juolie: jd === 5 });
    const r = await renderFile(fp, v);
    if (!r.ok) { allOk = false; console.log(`⚠ ${name}·阶段${jd}: ${r.err}`); }
  }
  console.log(`${allOk ? '✓' : '⚠'} ${name}（阶段1/3/5 三档）`);
}

// 5. 语法总检：全部条目文件是否有未配对的 EJS 标签
console.log('\n--- EJS 标签配对检查（全部含 <% 的文件）---');
const files = ['世界书/阶段指导/阶段调度.yaml', '世界书/阶段指导/追夫火葬场.yaml', '世界书/阶段指导/危机事件.yaml', '世界书/阶段指导/后宫终局.yaml', '世界书/变量/情境上下文EJS.yaml'];
for (const n of ['林曼云', '苏婉君', '秦月娥', '白芷若', '陈美兰']) files.push(`世界书/角色/${n}/阶段.yaml`);
let allBalanced = true;
for (const f of files) {
  const src = fs.readFileSync(path.join(CARD, f), 'utf8');
  const open = (src.match(/<%_?/g) || []).length;
  const close = (src.match(/_?%>/g) || []).length;
  if (open !== close) { allBalanced = false; console.log(`⚠ ${f}: 开${open}/闭${close} 不平衡`); }
}
console.log(allBalanced ? '✓ 所有条目 EJS 标签配对平衡' : '⚠ 存在不平衡');
console.log('\n═══════ 模拟完成 ═══════');
