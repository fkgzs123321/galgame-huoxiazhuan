// 变量对齐检查：扫描所有条目里引用的 stat_data 路径，对照 schema.ts 的定义
const fs = require('fs');
const path = require('path');
const ROOT = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const WB = path.join(ROOT, '世界书');

// 1) 收集所有被引用的路径（世界书文件 + state.json 的门控）
const 引用 = new Map();   // 路径 -> [来源...]
function 记(路径, 来源) {
  路径 = 路径.replace(/[。，、；：]+$/, '');
  if (!引用.has(路径)) 引用.set(路径, []);
  if (!引用.get(路径).includes(来源)) 引用.get(路径).push(来源);
}
function 扫文本(t, 来源) {
  const re = /stat_data\.([^\s'",)}\]]+)/g;
  let m;
  while ((m = re.exec(t))) 记('stat_data.' + m[1], 来源);
}
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!/\.(yaml|yml|txt|md)$/.test(f)) continue;
    扫文本(fs.readFileSync(p, 'utf8'), path.relative(WB, p));
  }
}
walk(WB);
// state.json 的 contents（门控都在这里）
{
  const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'tavern-cards-state.json'), 'utf8'));
  for (const g of Object.keys(S.entryManifest))
    for (const k of Object.keys(S.entryManifest[g] || {})) {
      const e = S.entryManifest[g][k];
      for (const c of (e.contents || [])) if (c.content) 扫文本(c.content, '[门控]' + k);
    }
}

// 2) 从 schema.ts 抽出定义的路径（按缩进层级推）
const sc = fs.readFileSync(path.join(ROOT, 'schema.ts'), 'utf8');
const 定义 = new Set();
{
  // 找到 z.object 块的起始行，按缩进建栈
  const lines = sc.split('\n');
  const 栈 = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const 缩进 = raw.match(/^\s*/)[0].length;
    const 名 = raw.match(/^\s*([\u4e00-\u9fa5A-Za-z0-9_]+)\s*:/);
    if (!名) continue;
    while (栈.length && 栈[栈.length - 1].缩进 >= 缩进) 栈.pop();
    const 全 = [...栈.map(x => x.名), 名[1]].join('.');
    // 只把「带 z.」的行当作叶子/容器
    if (/z\.(object|coerce|string|number|boolean|record|array|enum|any|literal)/.test(raw)) {
      定义.add(全);
      if (/z\.object|z\.record/.test(raw)) 栈.push({ 名: 名[1], 缩进 });
    }
  }
}

// 3) 比对
let 缺 = 0;
console.log('=== 被引用但 schema 里没找到的路径 ===');
const 排序 = [...引用.keys()].sort();
for (const p of 排序) {
  const 短路径 = p.replace(/^stat_data\./, '');
  // 逐级回退匹配（record 的键是动态的，允许前缀命中）
  const 段 = 短路径.split('.');
  let ok = false;
  for (let n = 段.length; n > 0; n--) {
    if (定义.has(段.slice(0, n).join('.'))) { ok = true; break; }
  }
  if (!ok) { console.log(`✗ ${p}   ← ${引用.get(p).slice(0, 3).join(', ')}`); 缺++; }
}
console.log(`\n引用到的路径 ${排序.length} 条，未命中 ${缺} 条`);

// 4) 打印「她」段的引用（本轮关注）
console.log('\n=== 她.* 的引用 ===');
for (const p of 排序) if (p.startsWith('stat_data.她')) console.log(`  ${p}  ← ${引用.get(p).join(', ')}`);
