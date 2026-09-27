// 统一地点 · 生成器
// ─────────────────────────────────────────────────────────────
// 单一事实来源：底座_nanpa2/地点表.json
// 由它生成 / 同步：
//   ① 世界书/地理/地理速览.yaml            （区域 → 地点[] ，给 AI 看的地理表）
//   ② 世界书/时间线/人物出现索引.yaml      （默认日程表 + 当前时段名单）
//   ③ 8 个区域门控                          （创作规划.yaml 的 condition ＋ state 的 contents）
//   ④ 变量口径                              （变量列表 / initvar / schema.ts 注释 / 变量更新规则）
//
// 跑法：node scripts/统一地点.cjs [--check]
//   --check 只体检不写盘
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '..');
const 表 = JSON.parse(fs.readFileSync(path.join(D, '底座_nanpa2', '地点表.json'), 'utf8'));
const 检查模式 = process.argv.includes('--check');

const 区域 = 表.区域;
const 表名 = Object.keys(区域);
const 地点归属 = {};            // 地点名 → 区域名
const 全部地点 = [];
for (const r of 表名) for (const s of 区域[r].地点) { 地点归属[s] = r; 全部地点.push(s); }

const ID名字 = {
  1: '鸣泽唯', 2: '水野友美', 3: '筱原泉', 4: '南川洋子', 5: '加藤美纪',
  6: '舞岛可怜', 7: '杉本樱子', 8: '都筑梢', 9: '野野村美里', 10: '安田爱美',
  11: '田中美沙', 12: '片桐美铃', 13: '鸣泽美佐子', 14: '永岛佐知子', 15: '永岛久美子',
};

// ── 体检 ──
const 问题 = [];
for (const s of Object.keys(表.默认日程表).flatMap((sl) => Object.keys(表.默认日程表[sl]))) {
  if (!(s in 地点归属)) 问题.push('日程表里的「' + s + '」不在区域地点表里');
}
const 重名 = 全部地点.filter((s, i) => 全部地点.indexOf(s) !== i);
if (重名.length) 问题.push('地点重名：' + [...new Set(重名)].join('/'));
for (const r of 表名) if (r === '八十八学园' && !区域[r].地点.includes('学园内')) 问题.push('八十八学园缺「学园内」');

console.log('═══ 地点表体检 ═══');
console.log('区域 ' + 表名.length + ' 个 ／ 地点 ' + 全部地点.length + ' 个');
表名.forEach((r) => console.log('  ' + r + '（' + 区域[r].地点.length + '）: ' + 区域[r].地点.join('、')));
if (问题.length) { console.log('❌ ' + 问题.length + ' 处不一致：'); 问题.forEach((x) => console.log('   ' + x)); process.exit(1); }
console.log('✅ 日程表的地点名全部落在区域表里');

// ══════════════════════════════════════════════════════════════
// ① 地理速览.yaml
// ══════════════════════════════════════════════════════════════
const 地理速览 = [
  '地理速览:',
  '  这是什么: 全町的**区域**与**地点**。★ 两级不能混用 —— 区域是移动单位（算距离），地点是站人的地方（查在场名单）。',
  '  ★ 场景.当前地点 只能填下面「区域」段里列出的**地点名**。',
  '',
  '  距离定义:',
];
for (const k of ['0', '1', '2', '3']) 地理速览.push('    距离' + k + ': ' + 表.距离定义[k]);
地理速览.push('    扣减对象: ' + 表.距离定义['扣减对象']);
地理速览.push('    说明: |');
地理速览.push('      ' + 表.距离定义['说明']);
地理速览.push('');
地理速览.push('  区域:');
for (const r of 表名) {
  地理速览.push('    ' + r + ':');
  地理速览.push('      区域说明: ' + 区域[r].区域说明);
  地理速览.push('      地点:');
  for (const s of 区域[r].地点) 地理速览.push('        - ' + s);
}
地理速览.push('');
地理速览.push('  子区域（★ 距离 0，只在写作用；**变量里仍填上面的地点名**）:');
地理速览.push('    自宅: 客厅 / 自己的房间 / 浴室');
地理速览.push('    永岛旅馆: 旅馆大厅 / 露天澡堂');
地理速览.push('    车站饭店: 饭店大厅');
地理速览.push('    八十八学园: 操场 = 校庭');
地理速览.push('    ⚠️ 「旅馆大厅」既能指永岛旅馆、也能指车站饭店（如月町），**看上下文** —— 变量里一律填地点名');
地理速览.push('');

// ══════════════════════════════════════════════════════════════
// ② 人物出现索引.yaml
// ══════════════════════════════════════════════════════════════
const S = JSON.stringify;
const 作息 = ['早', '上午', '下午', '晚', '深夜'];
const 日程JS = 作息.map((sl) =>
  '  ' + S(sl) + ': { ' +
  Object.entries(表.默认日程表[sl]).map(([p, ids]) => S(p) + ': [' + ids.join(', ') + ']').join(', ') +
  ' }').join(',\n');

const 索引 = `人物出现索引:
  这是什么: |
    按「时段 × 地点」查此刻有谁。默认模式在这里，某一天的特殊覆盖见「第NN天」。
    名单为空 = 该地点此刻没人。AI 不得凭空塞人。
  ★ 地点名口径: 只能填「地理速览」区域表里的地点名，不许自己造地名

<%_
/* ────────────────────────────────────────────────────────────
   默认日程表：地点 → 女角 id。★ 与「地理速览」的地点名同源
   （这张表由 scripts/统一地点.cjs 从 底座_nanpa2/地点表.json 生成）
   ──────────────────────────────────────────────────────────── */
const _SCHEDULE = {
${日程JS}
};

/* id → 名字（与「时间轴索引」的女角 id 表同源） */
const _NAMES = ${S(ID名字).replace(/"/g, "'").replace(/'(\d+)':/g, '$1:')};

/* 周间休假（与「时间轴索引」的「周间休假」同源） */
const _WEEKDAY_OFFS = ${S(表.周间休假).replace(/"/g, "'").replace(/'(\d+)':/g, '$1:')};

const _WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const _dayCount = Number(getvar('stat_data.时间.天数', { defaults: 1 })) || 1;
const _slot     = String(getvar('stat_data.时间.时段', { defaults: '早' }));
const _place    = String(getvar('stat_data.场景.当前地点', { defaults: '自宅' }));

/* 12-22 是周五 → 序号 5 */
const _weekday = _WEEKDAY_NAMES[(5 + (_dayCount - 1)) % 7];
const _off     = _WEEKDAY_OFFS[_weekday] || [];

function _avail(slot, place) {
  return ((_SCHEDULE[slot] || {})[place] || []).filter(function (id) {
    return _off.indexOf(id) === -1;
  });
}
function _line(ids) {
  return ids.length ? ids.map(function (id) { return _NAMES[id] || ('id' + id); }).join(' / ') : '（没人）';
}
const _slotMap = _SCHEDULE[_slot] || {};

/* 整块先拼成字符串再输出：行首缩进一致，也省得跟 EJS 的空白控制标签较劲 */
const _此刻 = '\\n  此刻在「' + _place + '」的人: ' +
  (_place in _slotMap ? _line(_avail(_slot, _place)) : '（这个时段没排在这里）');

const _名单 = '\\n' + Object.keys(_slotMap).map(function (place) {
  return '    ' + place + ': ' + _line(_avail(_slot, place));
}).join('\\n');

const _休假注 = _off.length
  ? '\\n\\n  ★ 今天（' + _weekday + '）是周间休假: ' +
    _off.map(function (id) { return _NAMES[id]; }).join(' / ') +
    ' 不在上面的名单里（她可能在别的地方）'
  : '';
_%>
  现在: 第 <%= _dayCount %> 天（<%= _weekday %>）· <%= _slot %>
  她此刻在: <%= _place %>
<%- _此刻 %><%- _名单 %><%- _休假注 %>
`;

// ══════════════════════════════════════════════════════════════
// ③ 门控
// ══════════════════════════════════════════════════════════════
const 底座门 = "getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'";
function 门控条件(r) {
  const 名单 = 区域[r].地点.map((s) => "'" + s + "'").join(', ');
  return "@@if " + 底座门 + " && [" + 名单 + "].includes(getvar('stat_data.场景.当前地点', { defaults: '' }))";
}
const 门控 = {};
for (const r of 表名) 门控[r] = 门控条件(r);

// ══════════════════════════════════════════════════════════════
// 写盘
// ══════════════════════════════════════════════════════════════
const 写 = (rel, 内容) => {
  const p = path.join(D, rel);
  const 旧 = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (旧 === 内容) { console.log('   未变  ' + rel); return; }
  if (检查模式) { console.log('   待写  ' + rel); return; }
  fs.writeFileSync(p, 内容, 'utf8');
  console.log('   已写  ' + rel + '  ' + (旧 ? 旧.length + ' → ' : '') + 内容.length + ' 字符');
};

console.log('\n═══ 写生成物 ═══');
写('世界书/地理/地理速览.yaml', 地理速览.join('\n'));
写('世界书/时间线/人物出现索引.yaml', 索引);

console.log('\n═══ 同步 8 个区域门控 ═══');
// state 的 contents：区域条目的 contents[0] 是 @@if 门控，后面那条 {file: ...} 是内容文件
const statePath = path.join(D, 'tavern-cards-state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
let 改state = 0;
for (const cat of Object.keys(state.entryManifest || {})) {
  for (const name of Object.keys(state.entryManifest[cat])) {
    if (!(name in 门控)) continue;
    const e = state.entryManifest[cat][name];
    if (!Array.isArray(e.contents)) continue;
    const i = e.contents.findIndex((c) => c && typeof c.content === 'string');
    if (i === -1) continue;
    const 旧 = e.contents[i].content;
    if (旧 === 门控[name]) continue;
    console.log('   ' + name + '\n     旧: ' + 旧.slice(0, 90) + '\n     新: ' + 门控[name].slice(0, 90));
    if (!检查模式) {
      e.contents[i].content = 门控[name];
      // 原本「底座门」与「区域门」分两条时，删掉多出来的那一条纯 @@if
      for (let j = e.contents.length - 1; j > i; j--) {
        if (e.contents[j] && typeof e.contents[j].content === 'string') e.contents.splice(j, 1);
      }
      改state++;
    }
  }
}
if (!检查模式 && 改state) { fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8'); console.log('   已写  tavern-cards-state.json（' + 改state + ' 条门控）'); }
else if (!改state) console.log('   无需改动');

// 创作规划.yaml 的 condition
const planPath = path.join(D, '创作规划.yaml');
let plan = fs.readFileSync(planPath, 'utf8');
let 改plan = 0;
for (const r of 表名) {
  // 抓 `- name: <区域>` 后面紧跟的 condition 行
  const re = new RegExp('(- name: ' + r + '\\n\\s+complexity: 条目显隐\\n\\s+condition: )"[^"]*"');
  if (re.test(plan)) {
    const 新 = plan.replace(re, (m, p1) => p1 + '"' + 门控[r].replace('@@if ', '') + '"');
    if (新 !== plan) { plan = 新; 改plan++; }
  } else 问题.push('创作规划.yaml 里找不到区域「' + r + '」的 condition');
}
if (!检查模式 && 改plan) { fs.writeFileSync(planPath, plan, 'utf8'); console.log('   已写  创作规划.yaml（' + 改plan + ' 条 condition）'); }
else console.log('   创作规划.yaml 改动 ' + 改plan + ' 条 condition');

console.log('\n═══ 同步变量口径 ═══');
const 地点清单 = 全部地点.join(' / ');
{ // 变量列表
  const p = '世界书/变量/变量列表.yaml';
  const t = fs.readFileSync(path.join(D, p), 'utf8');
  const 新 = t
    .replace(/^(  场景\.当前地点\.范围: ).*$/m, '$1' + 地点清单)
    .replace(/^(  场景\.当前地点\.意义: ).*$/m, '$1决定此刻有谁在场（见「人物出现索引」），进而决定她能看到哪些选项。★ 只能填「地理速览」区域表里的地点名');
  写(p, 新);
}
{ // initvar（两处）
  for (const p of ['世界书/变量/initvar.yaml', '底座_nanpa2/initvar.yaml']) {
    const fp = path.join(D, p);
    if (!fs.existsSync(fp)) continue;
    const t = fs.readFileSync(fp, 'utf8');
    写(p, t.replace(/^(  当前地点: ).*$/m, "$1'自宅'"));
  }
}
{ // schema.ts
  const p = 'schema.ts';
  const t = fs.readFileSync(path.join(D, p), 'utf8');
  写(p, t.replace("当前地点: z.string().prefault('自宅周边')", "当前地点: z.string().prefault('自宅')"));
}
{ // 变量更新规则（★ 必须幂等：只补不重插）
  const p = '世界书/变量/变量更新规则.yaml';
  const 口径 = '场景.当前地点.口径: 只能填「地理速览」区域表里的地点名。移动距离按同一张表算：同地点 0 / 同区域 1 / 跨区域 2 / 如月町与温泉乡 3，扣 时间.时段';
  const t = fs.readFileSync(path.join(D, p), 'utf8');
  // 先把历史上插重复的口径行全部去掉，再补一条
  const 行 = t.split('\n').filter((l) => !l.startsWith('场景.当前地点.口径:'));
  const 增长 = 行.findIndex((l) => l.startsWith('场景.当前地点.增长:'));
  if (增长 === -1) 问题.push('变量更新规则.yaml 里找不到 场景.当前地点.增长');
  else 行.splice(增长 + 1, 0, 口径);
  写(p, 行.join('\n'));
}

console.log('\n═══ 地名别名归一（只做无歧义的）═══');
// ★ 不做的：「旅馆大厅」—— 它在第13天指的是如月町的车站饭店、在第14天指的是永岛旅馆，
//   瞎替换会把事件地点改错。这条写进「地理速览」的子区域说明里交给 AI 按上下文判。
const 别名 = [
  ['弓道场', '弓箭练习场'],          // ★ 攻略原文用「弓箭练习场」
  ['弓箭场', '弓箭练习场'],
  ['幼稚园', '保育园'],              // 攻略里两种译名混用，本卡统一用「保育园」
  ['图书馆', '图书室'],
  ['办公室', '职员室'],
  ['写真部', '摄影社社办'],
  ['摄影部', '摄影社社办'],
  ['八十八町商业区', '商业区'],
  ['八十八海岸', '88海岸'],
  ['88学园', '八十八学园'],
];
const 跳过 = new Set(['世界书/地理/地理速览.yaml', '世界书/时间线/人物出现索引.yaml']);
const 待归一 = [];
(function w(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { w(p); continue; }
    if (!/\.(yaml|txt)$/.test(f.name) || /\.bak/.test(f.name)) continue;
    const rel = path.relative(D, p).replace(/\\/g, '/');
    if (跳过.has(rel)) continue;
    待归一.push(rel);
  }
})(path.join(D, '世界书'));
let 总改 = 0;
for (const rel of 待归一) {
  const fp = path.join(D, rel);
  let t = fs.readFileSync(fp, 'utf8');
  const 命中 = [];
  for (const [旧, 新] of 别名) {
    const n = t.split(旧).length - 1;
    if (!n) continue;
    命中.push(旧 + '→' + 新 + ' ×' + n);
    t = t.split(旧).join(新);
  }
  if (!命中.length) continue;
  总改 += 命中.length;
  console.log('   ' + rel + '\n     ' + 命中.join('　'));
  if (!检查模式) fs.writeFileSync(fp, t, 'utf8');
}
console.log(总改 ? '   共 ' + 总改 + ' 处' : '   无需归一');

// 场面.地点 也归到同一套（它是自由文本，但初值要与口径一致）
for (const [p, 表达式] of [
  ['schema.ts', (t) => t.replace("地点: z.string().prefault('自宅周边')", "地点: z.string().prefault('自宅')")],
  ['世界书/变量/initvar.yaml', (t) => t.replace(/^(    地点: )自宅周边$/m, '$1自宅')],
  ['底座_nanpa2/状态表.yaml', (t) => t
    .replace(/^(    初值: )自宅周边$/m, '$1自宅')
    .replace(/^(    范围: ).*$/m, '$1' + 地点清单)],
]) {
  const fp = path.join(D, p);
  if (!fs.existsSync(fp)) continue;
  写(p, 表达式(fs.readFileSync(fp, 'utf8')));
}

console.log('\n═══ 完成 ═══' + (检查模式 ? '（--check，未写盘）' : ''));
