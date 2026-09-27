// 四条未查项，一次做完
// ③ ★★★ 致命：7 套「她」是 selective（靠 AI 写「温砚」触发），但 AI 开局不知道她是谁
//     → 永远不会写那个词 → 条目永不加载 → **7 套人设机制整个是空的**
//     修法：加 EJS 门控 `@@if <底座判定> && getvar('stat_data.她.人设') === 'X'`
//     （keywords 管「纳入候选」，EJS 管「内容渲染」—— 与「关键词精准识别」那轮定的分工一致）
// ① 正则的数值关键词列表过时（列了已删的 信任度/心动值/嫉妒值）→ 按当前 initvar 字段名更新
// ② initvar_overrides 机制：查 skills 原文
// ④ 变量更新规则.yaml 里提到的字段 vs initvar 是否一一对应
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
const 记 = [];
const 补丁 = [];
const 写补丁 = () => {
  if (!补丁.length) return;
  const f = path.join(D, '_p.json');
  fs.writeFileSync(f, JSON.stringify(补丁));
  try { execFileSync('node', [forge, 'patch', '旮旯给木-同级生2', '--file', f], { encoding: 'utf8' }); }
  catch (e) { 记.push('⚠ patch 失败：' + String(e.stdout || e.message).split('\n')[0]); }
  fs.rmSync(f);
};

const 底座 = "getvar('stat_data.世界.底座', { defaults: '' }) === 'nanpa2'";

// ── ③ 七套「她」加 EJS 门控 ──
{
  const 套 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清'];
  let n = 0;
  for (const 名 of 套) {
    const e = (S.entryManifest.角色 || {})['她_' + 名];
    if (!e) continue;
    const file = (e.contents || []).find(c => c.file && c.file).file || e.path;
    if (!file) continue;
    const 条件 = `${底座} && getvar('stat_data.她.人设', { defaults: '' }) === '${名}'`;
    const 现 = ((e.contents || [])[0] || {}).content || '';
    if (现.includes('她.人设')) continue;
    补丁.push({ op: 'add', path: '/entryManifest/角色/她_' + 名 + '/contents', value: [{ content: '@@if ' + 条件 }, { file }] });
    if (e.path) 补丁.push({ op: 'remove', path: '/entryManifest/角色/她_' + 名 + '/path' });
    n++;
  }
  记.push('③ 七套「她」加 EJS 门控（`她.人设 === X`）：' + n + ' 条' + (n ? ' ✅ 修掉死锁' : '（已加过）'));
}

// ── ① 正则的数值关键词列表按当前 initvar 更新 ──
{
  const iv = YAML.parse(fs.readFileSync(path.join(D, '世界书/变量/initvar.yaml'), 'utf8'));
  // 收集所有「数值型」字段名（取 主角/她/经济/过程/女角 下的）
  const 数值字段 = new Set();
  const 收 = (o, 深度) => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (typeof v === 'number') 数值字段.add(k); if (深度 < 2 && v && typeof v === 'object') 收(v, 深度 + 1); } };
  收(iv, 0);
  // 排除明显不适用的
  ;
  const 纳入 = [...数值字段].filter(k => k.length >= 2 && !/种子|天数|序号|次数$/.test(k));
  const r = S.regex_scripts['数值变化上色'];
  const 旧 = (r.findRegex.match(/\(\?:([^)]+)\)/) || [])[1] || '';
  const 新词 = 纳入.join('|');
  if (旧 !== 新词) {
    const 新正则 = '/[（(]([^）)]*(?:' + 新词 + ')[^）)]*)[)）]/g';
    补丁.push({ op: 'add', path: '/regex_scripts/' + encodeURIComponent('数值变化上色').replace(/%/g, '~1'), value: Object.assign({}, r, { findRegex: 新正则 }) });
    记.push('① 正则「数值变化上色」关键词已按 initvar 更新：' + 旧.split('|').length + ' 个 → ' + 纳入.length + ' 个');
    记.push('   ' + 新词);
  } else 记.push('① 正则关键词无需更新');
}

// ── ④ 变量更新规则 提到的字段 vs initvar ──
{
  const iv = YAML.parse(fs.readFileSync(path.join(D, '世界书/变量/initvar.yaml'), 'utf8'));
  const 全路径 = new Set();
  (function walk(o, pre) { if (o === null || typeof o !== 'object' || Array.isArray(o)) return; for (const [k, v] of Object.entries(o)) { const p = pre ? pre + '.' + k : k; 全路径.add(p); walk(v, p); } })(iv, '');
  const 规则 = fs.readFileSync(path.join(D, '世界书/变量/变量更新规则.yaml'), 'utf8');
  const 提 = [...new Set((规则.match(/[\u4e00-\u9fa5]{2,6}(?=\s*[:：]|\.|\s*(?:为|按|加|减))/g) || []))].filter(x => x.length >= 2);
  const 疑 = 提.filter(x => !全路径.has(x) && ![...全路径].some(p => p.endsWith('.' + x)));
  记.push('④ 变量更新规则里提到的字段 ' + 提.length + ' 个 → 其中 initvar 里没有的：' + 疑.length);
  if (疑.length) 记.push('   ' + 疑.slice(0, 20).join(' / ') + '（多为说明性文字，需人工判定）');
}

// ── ② initvar_overrides 机制（查 skills）──
{
  const 文档 = [];
  for (const f of ['references/mvu/initvar.md', 'references/conventions.md']) {
    const p = path.join(ROOT, '_tc_repo/tavern-cards', f);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8').split('\n');
    t.forEach((l, i) => { if (/override/i.test(l)) 文档.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 110)); });
  }
  记.push('② initvar_overrides 的规范原文：');
  文档.slice(0, 6).forEach(x => 记.push('   ' + x));
}

写补丁();
console.log(记.join('\n'));
