// _final_audit_forge.mjs - 不要玩弄我的鸡吧-forge 最终全面审计
// 以打包产物 dist/不要玩弄我的鸡吧-forge.json 为真相源, 逐项核对
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARD = path.join(__dirname, 'src', '不要玩弄我的鸡吧-forge');
const DIST = path.join(__dirname, 'dist', '不要玩弄我的鸡吧-forge.json');
const card = JSON.parse(fs.readFileSync(DIST, 'utf-8'));
const entries = card.data.character_book.entries;

let pass = 0, fail = 0;
const ok = (m) => { console.log('  ✅', m); pass++; };
const no = (m) => { console.log('  ❌', m); fail++; };

console.log('════════ 1. 打包产物条目结构 ════════');
console.log(`  总条目: ${entries.length}`);
const blue = entries.filter(e => e.enabled && e.constant);
const green = entries.filter(e => e.enabled && !e.constant && (e.keys || []).length);
const off = entries.filter(e => !e.enabled);
ok(`蓝灯 ${blue.length} | 绿灯 ${green.length} | 关灯 ${off.length} | 合计 ${entries.length}`);

console.log('════════ 2. 绿灯关键词完整性 ════════');
const greenNoKeys = entries.filter(e => e.enabled && !e.constant && !((e.keys || []).length));
if (greenNoKeys.length) { no(`绿灯无关键词 ${greenNoKeys.length} 条: ${greenNoKeys.map(e=>e.comment).slice(0,5)}`); }
else ok('全部绿灯条目均有 keys');

console.log('════════ 3. 关键条目状态 ════════');
const must = {
  '角色速览名单': { enabled: true, constant: true },
  'D0系统控制器': { enabled: true, constant: true },
  '被使用时受限视角叙事': { enabled: false, constant: true },
  '综合防口胡与世界观铁律': { enabled: true, constant: true },
};
for (const [kw, expect] of Object.entries(must)) {
  const hit = entries.find(e => (e.comment || '').includes(kw));
  if (!hit) { no(`条目不存在: ${kw}`); continue; }
  const eOk = hit.enabled === expect.enabled && hit.constant === expect.constant;
  if (eOk && hit.content && hit.content.length > 50) ok(`${kw} 状态正确 content=${hit.content.length}字符`);
  else no(`${kw} 状态异常: enabled=${hit.enabled} const=${hit.constant} len=${hit.content?.length}`);
}
// 基础信息/调色盘全绿灯
const base = entries.filter(e => (e.comment || '').endsWith('_基础信息'));
const pal = entries.filter(e => (e.comment || '').endsWith('_调色盘'));
const baseOff = base.filter(e => !e.enabled);
const palOff = pal.filter(e => !e.enabled);
if (base.length && baseOff.length === 0) ok(`基础信息 ${base.length} 条全绿灯`);
else no(`基础信息未全绿灯: ${baseOff.map(e=>e.comment).join(',')}`);
if (pal.length && palOff.length === 0) ok(`调色盘 ${pal.length} 条全绿灯`);
else no(`调色盘未全绿灯: ${palOff.map(e=>e.comment).join(',')}`);

console.log('════════ 4. 空/超短内容 ════════');
const short = entries.filter(e => !e.content || e.content.length < 20);
if (short.length) no(`空/超短内容 ${short.length} 条: ${short.map(e=>e.comment).join(',')}`);
else ok('无空内容条目');

console.log('════════ 5. getwi 目标全命中(静态) ════════');
const allSrc = [];
for (const [g, items] of Object.entries(cardData().entryManifest)) {
  for (const [n, c] of Object.entries(items)) {
    const p = path.join(CARD, c.path.replace(/\\/g, path.sep));
    if (fs.existsSync(p)) allSrc.push(fs.readFileSync(p, 'utf-8'));
  }
}
const names = new Set(entries.map(e => e.comment));
const DOC_EXAMPLES = new Set(['[总控]xxx']); // 注释说明中的占位示例, 非真实调用
let miss = [];
for (const src of allSrc) {
  // 仅匹配完整静态调用 getwi('xxx') — 引号后直接右括号, 排除动态拼接前缀与注释示例
  for (const m of src.matchAll(/getwi\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (DOC_EXAMPLES.has(m[1])) continue;
    if (!names.has(m[1])) miss.push(m[1]);
  }
}
if (miss.length) no(`静态 getwi 目标缺失: ${[...new Set(miss)].join(', ')}`);
else ok('所有静态 getwi 目标命中(含 变量/ 子目录条目)');

console.log('════════ 6. 场景判定一致性 ════════');
function find(fname, pat) {
  const src = fs.readFileSync(path.join(CARD, '世界书', fname), 'utf-8');
  return src.split('\n').filter(l => pat.test(l));
}
const lines = {
  '读取变量过滤': find('读取变量过滤.txt', /isNight && us >= 1/),
  'NSFW总控': find('[总控]NSFW.txt', /_isNight && _stage >= 1/),
  '事件总控': find('[总控]事件.txt', /_isEvtNight && _stage >= 1/),
  '人物总控': find('[总控]人物.txt', /_pStage >= 1/),
};
for (const [k, ls] of Object.entries(lines)) {
  if (ls.length) ok(`${k}: ${ls[0].trim().slice(0, 90)}`);
  else no(`${k} 未找到 stage>=1 判定`);
}

console.log('════════ 7. initvar 完整性 ════════');
try {
  const init = fs.readFileSync(path.join(CARD, '世界书', '变量', '[initvar]请勿打开.yaml'), 'utf-8');
  const doc = YAML.parse(init);
  const sd = doc.stat_data || doc;
  const fr = sd['女性角色'] || {};
  const uids = Object.keys(fr).filter(k => k !== 'UID顺序');
  ok(`YAML 解析成功, 女性角色 uid ${uids.length} 个`);
  const needFull = ['陈雅思','林心怡','何美琪','宋雅','白雪','阿茹娜','马晓月','马丽亚','阿莎·帕特尔','娜奥米·恩迪亚耶','奥克萨娜·科瓦连科','樱井美咲','艾米丽·沃克'];
  const bad = needFull.filter(u => !(fr[u]?.基础?.角色 && fr[u]?.基础?.身份));
  if (bad.length) no(`角色档案仍缺 角色/身份: ${bad.join(',')}`);
  else ok('13 个对齐角色 基础档案(角色/身份/班级等)齐全');
  if ('陌生模板' in sd) no('陌生模板 仍存在');
  else ok('陌生模板 段已清除');
} catch (e) { no('initvar YAML 解析失败: ' + e.message.slice(0, 120)); }

function cardData() { return JSON.parse(fs.readFileSync(path.join(CARD, 'tavern-cards-state.json'), 'utf-8')); }

console.log('════════ 8. manifest 双向一致性 ════════');
const state = cardData();
let missPath = [];
for (const [g, items] of Object.entries(state.entryManifest)) {
  for (const [n, c] of Object.entries(items)) {
    if (!fs.existsSync(path.join(CARD, c.path.replace(/\\/g, path.sep)))) missPath.push(n);
  }
}
if (missPath.length) no(`manifest path 不存在: ${missPath.join(',')}`);
else ok('manifest 全部 path 指向存在的文件');
// 文件→manifest 反向
const manifestPaths = new Set();
for (const [g, items] of Object.entries(state.entryManifest)) {
  for (const [n, c] of Object.entries(items)) manifestPaths.add(c.path.replace(/\\/g, '/').toLowerCase());
}
const unreg = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(txt|yaml|yml)$/.test(f)) continue;
    const rel = path.relative(CARD, p).replace(/\\/g, '/').toLowerCase();
    if (!manifestPaths.has(rel)) unreg.push(rel);
  }
})(path.join(CARD, '世界书'));
if (unreg.length) no(`未注册文件: ${unreg.join(', ')}`);
else ok('世界书目录所有文件均已注册');

console.log('════════ 9. PNG 与 dist 同步 ════════');
const pngStat = fs.statSync(path.join(CARD, '不要玩弄我的鸡吧-forge.png'));
const distStat = fs.statSync(DIST);
console.log(`  PNG: ${(pngStat.size/1048576).toFixed(2)}MB (${new Date(pngStat.mtime).toLocaleString('zh-CN')})`);
console.log(`  dist: ${(distStat.size/1048576).toFixed(2)}MB (${new Date(distStat.mtime).toLocaleString('zh-CN')})`);
if (pngStat.mtime >= distStat.mtime) ok('PNG 打包时间 ≥ dist, 产物为最新');
else no('PNG 可能早于 dist, 需重新打包');

console.log('\n════════ 审计结果 ════════');
console.log(`  通过 ${pass} | 失败 ${fail}`);
process.exit(fail ? 1 : 0);
