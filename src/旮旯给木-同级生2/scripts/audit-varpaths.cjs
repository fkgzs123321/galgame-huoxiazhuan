// 深度检查 EJS 里的变量路径（不只顶层 —— 顶层对了不代表深层对）
// ★ 已预感的问题：阶段指导 用 `stat_data.她.情绪`，但 initvar 的 她 里可能没有 情绪
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');

const initvar = YAML.parse(fs.readFileSync(path.join(WB, '变量/initvar.yaml'), 'utf8'));
// 收集 schema 里的**全部合法路径**（含 z.record 的动态键：女角.<名>.<字段>）
const 合法 = new Set();
(function walk(o, pre) {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return;
  for (const [k, v] of Object.entries(o)) {
    const p = pre ? pre + '.' + k : k;
    合法.add(p);
    walk(v, p);
  }
})(initvar, '');
console.log('initvar 里的合法路径：' + 合法.size + ' 条');

// 扫所有 EJS 里的 stat_data.xxx 路径
const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

const 缺 = {};
for (const p of 全) {
  const rel = path.relative(D, p).replace(/\\/g, '/');
  const t = fs.readFileSync(p, 'utf8');
  const code = (t.match(/<%[\s\S]*?%>/g) || []).join('\n');
  for (const m of code.match(/stat_data\.([\u4e00-\u9fa5A-Za-z0-9_$.]+)/g) || []) {
    let 路径 = m.replace(/^stat_data\./, '').replace(/[.,;)'"\s]+$/, '');
    // 女角.<名字>.<字段> → 归一成 女角.<字段>
    const 段 = 路径.split('.');
    if (段[0] === '女角' && 段.length >= 2) 路径 = ['女角', ...段.slice(2)].join('.');
    if (段[0] === '世界' && 段[1] === '关系封闭' && 段.length > 2) 路径 = '世界.关系封闭';
    if (!合法.has(路径)) {
      // 前缀匹配：可能是 record 的动态键（女角 / 局面.当前选项）
      const 前 = 段.slice(0, -1).join('.');
      if (前 && !合法.has(前) && ![...合法].some(x => x.startsWith(前 + '.'))) {
        (缺[rel] = 缺[rel] || []).push(路径);
      } else if (![...合法].some(x => x === 路径 || x.startsWith(路径 + '.'))) {
        (缺[rel] = 缺[rel] || []).push(路径 + '（父 ' + 前 + ' 存在，但该子键不在 initvar 里）');
      }
    }
  }
}
console.log('\n═══ EJS 里引用了但 initvar 没有的变量路径 ═══');
const 键 = Object.keys(缺);
if (!键.length) console.log('✅ 全部存在');
else for (const f of 键) {
  console.log('\n' + f);
  [...new Set(缺[f])].forEach(x => console.log('   ❌ ' + x));
}
