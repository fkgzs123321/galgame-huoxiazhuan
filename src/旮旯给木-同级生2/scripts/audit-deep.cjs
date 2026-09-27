// 深查 · 第四轮
// ① 前端 HTML 里的变量路径 vs initvar —— 手写了 30+ 个路径，最容易错，错了就是空值/白屏
// ② 正则的 findRegex 括号 vs 叙述准则 的「标记规范」—— 一字不差才上得了色
// ③ 死变量（审计铁律：有初值但全卡无人读 = 无落脚点）
// ④ 补齐变量后是否产生「同一件事两个载体」
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

const initvar = YAML.parse(fs.readFileSync(path.join(WB, '变量/initvar.yaml'), 'utf8'));
const 合法路径 = new Set();
(function walk(o, pre) { if (o === null || typeof o !== 'object' || Array.isArray(o)) return; for (const [k, v] of Object.entries(o)) { const p = pre ? pre + '.' + k : k; 合法路径.add(p); walk(v, p); } })(initvar, '');
const 存在 = (p) => {
  if (合法路径.has(p)) return true;
  // 支持 女角.<名字>.<字段> 与 局面.当前选项.<任意>
  const 段 = p.split('.');
  if (段[0] === '女角' && 段.length >= 3) return 合法路径.has('女角.' + 段.slice(2).join('.'));
  return [...合法路径].some(x => x === p || x.startsWith(p + '.'));
};

const 问题 = {};
const 报 = (类, x) => (问题[类] = 问题[类] || []).push(x);

// ── ① HTML 里的变量路径 ──
{
  const html = fs.readFileSync(path.join(D, '正则/状态栏界面.html'), 'utf8') + fs.readFileSync(path.join(D, '正则/开局选择界面.html'), 'utf8');
  const 路径集 = new Set();
  for (const m of html.match(/get\(\s*'([^']+)'/g) || []) 路径集.add(m.match(/'([^']+)'/)[1]);
  for (const m of html.match(/set\(\s*'([^']+)'/g) || []) 路径集.add(m.match(/'([^']+)'/)[1]);
  for (const m of html.match(/getvar\(\s*'stat_data\.([^']+)'/g) || []) 路径集.add(m.match(/stat_data\.([^']+)/)[1]);
  console.log('① 前端读取/写入的变量路径：' + 路径集.size + ' 条');
  for (const p of 路径集) {
    const 净 = p.replace(/^stat_data\./, '').replace(/\.\$骰子种子$/, '.$骰子种子');
    if (!存在(净)) 报('① 前端引用不存在的路径', 净);
  }
  console.log('   前端路径检查完成');
}

// ── ② 正则括号 vs 叙述准则 的标记规范 ──
{
  const 准则 = fs.readFileSync(path.join(WB, '扮演准则/叙述准则.yaml'), 'utf8');
  const 规定 = [
    ['她的声音上色', '〔', '〕'],
    ['游戏内台词上色', '「', '」'],
    ['内心与旁白上色', '（', '）'],
    ['系统与那个声音上色', '〖', '〗'],
  ];
  规定.forEach(([名, 开, 闭]) => {
    const r = S.regex_scripts[名];
    if (!r) { 报('② 正则缺失', 名); return; }
    const 用 = (r.findRegex || '').includes(开) && (r.findRegex || '').includes(闭);
    if (!用) 报('② 正则括号与准则不符', 名 + ' → 用了 ' + r.findRegex);
    if (!准则.includes('用' + 开) && !准则.includes(开)) 报('② 叙述准则里没有这个标记', 名 + ' 的 ' + 开 + 闭 + ' 未在准则中规定');
  });
  console.log('② 四色括号与 叙述准则 的标记规范：已核');
}

// ── ③ 死变量 ──
{
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt|html)$/.test(f)) 全.push(p); } })(WB);
  const 前端 = path.join(D, '正则');
  for (const f of fs.readdirSync(前端)) if (/\.html$/.test(f)) 全.push(path.join(前端, f));
  const 所有文本 = 全.map(p => fs.readFileSync(p, 'utf8')).join('\n');
  const 死 = [];
  for (const p of 合法路径) {
    const 末 = p.split('.').pop();
    if (/^(女角|世界|局面)\.[\u4e00-\u9fa5]{2,4}$/.test(p)) continue;  // 动态键
    if (p.split('.').length > 3) continue;
    // 只要路径的**末段**在任何一个文件里出现过，就算有落脚点
    if (!所有文本.includes(末)) 死.push(p);
  }
  console.log('③ 死变量（末段全卡无人提及）：' + 死.length + ' 个');
  死.slice(0, 25).forEach(x => console.log('   ' + x));
}

// ── ④ 两个载体 ──
{
  const 嫌疑 = [['主角.身体状态', '主角.身体'], ['主角.状态', '她.状态'], ['过程.死结局标识', '终局'], ['主角.反抗值', '主角.体力']];
  嫌疑.forEach(([a, b]) => {
    if (合法路径.has(a) && 合法路径.has(b)) 报('④ 疑似两个载体', a + ' ／ ' + b);
  });
  console.log('④ 疑似两个载体：已核');
}

console.log('\n═══ 深查结果 ═══');
let 总 = 0;
for (const [类, v] of Object.entries(问题).sort()) { 总 += v.length; console.log('\n【' + 类 + '】' + v.length); v.slice(0, 15).forEach(x => console.log('   ' + x)); }
if (!总) console.log('\n✅ 未发现问题');
