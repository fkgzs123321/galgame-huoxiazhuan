import fs from 'node:fs';
import path from 'node:path';

// ════════════════════════════════════════════════════════════
// 缺口清点 · 找「登记了却没落地」「说了却没做」的东西
//
// 用法：node scripts/audit-gap.mjs [项目目录]
// 默认项目目录 = 本脚本的上一级
//
// 它查六件事：
//   1. 真空块        `键: |` 后面没有内容
//   2. 登记的条目     创作规划 entries 里 path 指向的文件是否存在
//   3. 未注册的文件   世界书里有文件但没进 entryManifest
//   4. 幽灵注册       entryManifest 里有 path 但文件不存在
//   5. 关卡齐全       关卡序列里第一关到第五关是否都在
//   6. 女角完整       每个女角目录是否都有基础信息 + 性格调色盘
// ════════════════════════════════════════════════════════════

const here = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));
const R = process.argv[2] || path.resolve(here, '..');
const log = [];
let problems = 0;
const bad = (s) => { problems++; log.push('  ✗ ' + s); };
const good = (s) => log.push('  ✓ ' + s);

const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(yaml|yml)$/.test(f)) out.push(p);
  }
  return out;
};

// ── 1) 真空块 ──
const empt = [];
for (const f of walk(path.join(R, '世界书'))) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  L.forEach((l, i) => {
    const m = l.match(/^(\s*)(\S.*?):\s*\|\s*$/);
    if (!m) return;
    const nx = L[i + 1] || '';
    const nxInd = (nx.match(/^(\s*)/) || ['', ''])[1].length;
    if (nx.trim() === '' || nxInd <= m[1].length) empt.push(`${path.relative(R, f)}:${i + 1}`);
  });
}
empt.length ? bad('真空块 ' + empt.length + ' 处：' + empt.join(', ')) : good('无真空块');

// ── 2) 创作规划登记的条目 ──
const planPath = path.join(R, '创作规划.yaml');
if (!fs.existsSync(planPath)) bad('找不到 创作规划.yaml');
else {
  const plan = fs.readFileSync(planPath, 'utf8');
  const entries = [...plan.matchAll(/- name:\s*([^\n]+)\n[\s\S]{0,200}?path:\s*([^\n]+)/g)]
    .map((m) => ({ n: m[1].trim(), p: m[2].trim() }))
    .filter((e) => e.p.startsWith('世界书'));
  const miss = entries.filter((e) => !fs.existsSync(path.join(R, e.p)));
  miss.length
    ? bad(`创作规划登记了但文件不存在 ${miss.length} 项：` + miss.map((e) => e.n).join(', '))
    : good(`创作规划登记 ${entries.length} 项，文件全部存在`);
}

// ── 3/4) 注册与文件的双向核对 ──
const statePath = path.join(R, 'tavern-cards-state.json');
if (!fs.existsSync(statePath)) bad('找不到 tavern-cards-state.json');
else {
  const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const reg = new Set();
  for (const g of Object.values(st.entryManifest))
    for (const e of Object.values(g)) {
      if (e.path) reg.add(e.path.replace(/\\/g, '/'));
      if (Array.isArray(e.contents)) e.contents.forEach((c) => c.file && reg.add(c.file.replace(/\\/g, '/')));
    }
  const un = walk(path.join(R, '世界书'))
    .map((f) => path.relative(R, f).replace(/\\/g, '/'))
    .filter((r) => !r.endsWith('变量/initvar.yaml') && !reg.has(r));
  un.length ? bad('世界书里有文件但未注册 ' + un.length + ' 个：' + un.join(', ')) : good('世界书文件全部已注册');

  const ghost = [...reg].filter((r) => !fs.existsSync(path.join(R, r)));
  ghost.length ? bad('注册了但文件不存在 ' + ghost.length + ' 个：' + ghost.join(', ')) : good('无幽灵注册');
}

// ── 5) 关卡齐全 ──
const ksPath = path.join(R, '世界书/世界观/底座_euphoria/关卡序列.yaml');
if (fs.existsSync(ksPath)) {
  const ks = fs.readFileSync(ksPath, 'utf8');
  const lack = ['第一关', '第二关', '第三关', '第四关', '第五关'].filter((k) => !ks.includes(`indexOf('${k}')`));
  lack.length ? bad('关卡序列缺：' + lack.join(', ')) : good('五关齐全');
}

// ── 6) 女角文件完整 ──
const hd = path.join(R, '世界书/角色/底座_euphoria');
if (fs.existsSync(hd)) {
  const lack = [];
  for (const n of fs.readdirSync(hd)) {
    const d = path.join(hd, n);
    if (!fs.statSync(d).isDirectory()) continue;
    const fs_ = fs.readdirSync(d);
    if (!fs_.includes('基础信息.yaml') || !fs_.includes('性格调色盘.yaml')) lack.push(n);
  }
  lack.length ? bad('女角文件不全：' + lack.join(', ')) : good('女角条目文件完整（' + fs.readdirSync(hd).filter((n) => fs.statSync(path.join(hd, n)).isDirectory()).length + ' 组）');
}

console.log('缺口清点 · ' + R);
console.log('─'.repeat(60));
console.log(log.join('\n'));
console.log('─'.repeat(60));
console.log(problems ? `✗ ${problems} 项待处理` : '✓ 结构层无遗留');

// 再扫一遍文字层面的 TODO（这类容易被忘在文件里）
const todos = [];
for (const f of walk(path.join(R, '世界书'))) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  L.forEach((l, i) => {
    if (/还差的|还没写成|TODO|待细化|待补|以后再说|没想好/.test(l)) todos.push(`${path.relative(R, f)}:${i + 1}  ${l.trim().slice(0, 60)}`);
  });
}
console.log('\n文字层 TODO：');
console.log(todos.length ? todos.map((x) => '  ✗ ' + x).join('\n') : '  ✓ 无');
