// mvu-audit.mjs · MVU 变量体系全量对账
// 对账面：schema 期望键集 ↔ initvar ↔ override1/2 ↔ 变量更新规则 ↔ 裁判脚本写入路径 ↔ 面板读取
import fs from 'fs';
import yaml from 'yaml';

const base = 'src/狼人杀/';
const 名单11 = ['庄晚棠', '白蘅', '灶婶', '小满', '姜芸', '苏黎', '陆霜霜', '闻人夏', '程郁', '顾青芜', '顾青黛'];

// ── schema 期望键集（自 schema.ts 全文硬编码对齐）──
const 期望 = {
  _世界: ['天数', '阶段', '存活名单', '昨夜死讯', '公开事实', '今日广播'],
  _玩家: ['身份', '存活'],
  _人物: 名单11,
  人物: 名单11,
  世界: ['传递事件'],
  $物品: ['草汁存量', '毒药已用', '麻沸散已用', '银匕在身', '铜镜在身', '草汁在身', '药囊在身'],
  $人物: 名单11,
};
const $人物子键 = ['身份', '持物', '被种', '兽化', '存活'];
const 人物子键 = ['好感', '怀疑'];

let fail = 0;
function 报(ok, name, detail) { console.log((ok ? '✓ ' : '✗ ') + name + (detail ? ' | ' + detail : '')); if (!ok) fail++; }

function checkKeys(obj, name) {
  const issues = [];
  for (const sec of Object.keys(期望)) {
    if (!obj[sec] || typeof obj[sec] !== 'object') { issues.push(`缺顶层 ${sec}`); continue; }
    const want = new Set(期望[sec]);
    for (const g of Object.keys(obj[sec])) if (!want.has(g)) issues.push(`${sec} 多余键:${g}`);
    for (const w of want) if (!(w in obj[sec])) issues.push(`${sec} 缺键:${w}`);
  }
  for (const e of Object.keys(obj)) if (!期望[e]) issues.push(`多余顶层:${e}`);
  for (const n of 名单11) {
    if (obj._人物?.[n] && !('已知' in obj._人物[n])) issues.push(`_人物.${n} 缺已知`);
    if (obj.人物?.[n]) for (const k of 人物子键) if (!(k in obj.人物[n])) issues.push(`人物.${n} 缺${k}`);
    if (obj.$人物?.[n]) for (const k of $人物子键) if (!(k in obj.$人物[n])) issues.push(`$人物.${n} 缺${k}`);
  }
  报(issues.length === 0, name, issues.join(' | ') || '键集与 schema 全等');
  return issues.length === 0;
}

// ── 1) initvar ──
const ivRaw = fs.readFileSync(base + '世界书/变量/initvar.yaml', 'utf8');
let ok = checkKeys(yaml.parse(ivRaw), 'initvar.yaml');

// ── 2) overrides ──
for (const f of ['开场白/initvar/1.yaml', '开场白/initvar/2.yaml']) {
  ok = checkKeys(yaml.parse(fs.readFileSync(base + f, 'utf8')), f) && ok;
}
// override 差异值断言
const o1 = yaml.parse(fs.readFileSync(base + '开场白/initvar/1.yaml', 'utf8'));
const o2 = yaml.parse(fs.readFileSync(base + '开场白/initvar/2.yaml', 'utf8'));
报(o1.人物.苏黎.好感 === 55 && o1.人物.陆霜霜.怀疑 === 15 && o1.人物.程郁.好感 === 45, 'override1 差异值', `苏黎${o1.人物.苏黎.好感}/陆霜霜疑${o1.人物.陆霜霜.怀疑}/程郁${o1.人物.程郁.好感}`);
报(o2.人物.程郁.好感 === 60 && o2.人物.程郁.怀疑 === 10, 'override2 差异值', `程郁${o2.人物.程郁.好感}/${o2.人物.程郁.怀疑}`);

// ── 3) 变量更新规则：AI 可改键 ⊆ schema 可改区（人物.好感/怀疑、世界.传递事件）──
const ur = yaml.parse(fs.readFileSync(base + '世界书/变量/变量更新规则.yaml', 'utf8'));
const urKeys = Object.keys(ur['变量更新规则'] || {});
const urOk = urKeys.length === 3 && urKeys.filter(k => k.startsWith('人物.${') && (k.includes('.好感') || k.includes('.怀疑'))).length === 2 && urKeys.includes('世界.传递事件');
报(urOk, '变量更新规则键', urKeys.join(' | '));
// 更新规则内不得出现 _ / $ 前缀（AI 不可见不可改）
报(!/(_人物|\$人物|\$物品|_世界|_玩家)/.test(JSON.stringify(ur)), '更新规则无 _/$ 前缀键', '');

// ── 4) 裁判脚本写入路径 ⊆ schema ──
const js = fs.readFileSync(base + '脚本/血月裁判.js', 'utf8');
const bad = [];
// 一级命名空间
for (const m of js.matchAll(/\bs\.(_世界|_玩家|世界|\$物品)\.(\w+)/g)) if (!期望[m[1]]?.includes(m[2])) bad.push(`s.${m[1]}.${m[2]}`);
for (const m of js.matchAll(/\bs\.(_人物|\$人物|人物)\[([^\]]+)\]\.(\w+)/g)) {
  const sec = m[1], key = m[3];
  const legal = sec === '_人物' ? ['已知'] : sec === '$人物' ? $人物子键 : 人物子键;
  if (!legal.includes(key)) bad.push(`s.${sec}[..].${key}`);
}
// 顶层命名空间误用
for (const m of js.matchAll(/\bs\.(\w+)\b(?!\.\w)/g)) { const n = m[1]; if (!['$人物', '$物品', '_人物', '_玩家', '_世界', '人物', '世界', 'stat_data'].includes(n) && !n.startsWith('_')) bad.push('未知顶层 s.' + n); }
报(bad.length === 0, '裁判脚本写入路径 ⊆ schema', bad.slice(0, 6).join(' | ') || '全部合法');
// 脚本变量（自由结构，仅列出确认存在）
const svKeys = ['血梦', '同伴', '玩家藏处', '玩家被种夜', '藏处', '互疑', '镜验', '暴露', '同屋', '银匕随身', '今夜麻沸', '夜计', '昼计'];
报(svKeys.every(k => js.includes(k)), '脚本变量键齐', svKeys.filter(k => !js.includes(k)).join(',') || '13/13');

// ── 5) 面板读取路径 ──
const panel = fs.readFileSync(base + '界面/状态栏.html', 'utf8');
报(panel.includes("type: 'message'") && panel.includes("type: 'script'"), '面板读取 message+script', '');
报(panel.includes('script_id'), '面板 script 变量带 script_id', '');
报(!/getVariables\(\s*\)/.test(panel), '面板无裸 getVariables()', '');
// 面板读的 stat_data 子字段 ⊆ schema
const pBad = [];
for (const m of panel.matchAll(/W\.(\w+)/g)) if (!期望._世界.includes(m[1])) pBad.push('W.' + m[1]);
for (const m of panel.matchAll(/P\.(\w+)/g)) if (!期望._玩家.includes(m[1])) pBad.push('P.' + m[1]);
for (const m of panel.matchAll(/s\.\$物品\.(\w+)/g)) if (!期望.$物品.includes(m[1])) pBad.push('$物品.' + m[1]);
报(pBad.length === 0, '面板 stat_data 子字段 ⊆ schema', pBad.join(',') || '全部合法');

// ── 6) 变量输出格式/变量列表存在性 ──
报(fs.existsSync(base + '世界书/变量/变量输出格式.txt'), '变量输出格式.txt 存在', '');
报(fs.existsSync(base + '世界书/变量/变量列表.txt'), '变量列表.txt 存在', '');

console.log(fail === 0 ? '══ MVU 全量对账：全部通过 ══' : `══ ${fail} 项失败 ══`);
