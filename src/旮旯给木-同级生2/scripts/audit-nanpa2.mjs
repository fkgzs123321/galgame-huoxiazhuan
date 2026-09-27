#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// audit-nanpa2.mjs · 同级生2 条目与变量审计器
//
// 判据（用户定）：
//   条目 —— 有调用者就开、无调用者就删
//   变量 —— 所有的数值都要有落脚点、都要有计算、都要有意义；没有这些的删
//
// 用法：
//   node scripts/audit-nanpa2.mjs --entries         条目审计
//   node scripts/audit-nanpa2.mjs --vars            变量审计
//   node scripts/audit-nanpa2.mjs --all             两者都跑
//   node scripts/audit-nanpa2.mjs --all --out report.md   同时写报告文件
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const argv = process.argv.slice(2);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.resolve(path.join(__dirname, '..', '..', '同级生2'));
const WB = path.join(SRC, '世界书');
const INDEX = path.join(SRC, 'index.yaml');
const VARLIST = path.join(WB, '变量', '变量列表.txt');
const doAll = argv.includes('--all');
const doEntries = doAll || argv.includes('--entries');
const doVars = doAll || argv.includes('--vars');
const outIdx = argv.indexOf('--out');
const OUT = outIdx >= 0 ? path.resolve(argv[outIdx + 1]) : null;

if (!fs.existsSync(INDEX)) { console.error('[FAIL] 找不到 index.yaml: ' + INDEX); process.exit(2); }

const buf = [];
const say = (s = '') => { buf.push(s); console.log(s); };
const L = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));
const R = (s, n) => ' '.repeat(Math.max(0, n - String(s).length)) + String(s);

// ── 遍历世界书所有文件 ──
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(txt|yaml|yml|json)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const allFiles = walk(WB);
const readAll = new Map();
for (const f of allFiles) readAll.set(f, fs.readFileSync(f, 'utf8'));

// 也扫 scripts 与其它的 .txt/.mjs
const extraDirs = [path.join(SRC, 'scripts'), path.join(SRC, '脚本'), path.join(SRC, '正则')];
for (const d of extraDirs) {
  for (const f of walk(d)) if (!readAll.has(f)) readAll.set(f, fs.readFileSync(f, 'utf8'));
}

// ════════════════════════════════════════════════════════════
// 一、解析 index.yaml（tavern_sync 格式）
// ════════════════════════════════════════════════════════════
function parseIndex() {
  // ⚠️ 必须用 /\r?\n/ 切行：Windows 行尾的 \r 会让 `(?:#.*)?$` 匹配失败
  //    （JS 里 `.` 不匹配 \r），导致「启用: false  # 注释」整行被漏读、误判为启用
  const lines = fs.readFileSync(INDEX, 'utf8').split(/\r?\n/);
  const entries = [];
  let folder = '(未分组)';
  let cur = null;
  const flush = () => { if (cur && cur.name) entries.push(cur); cur = null; };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const mf = ln.match(/^\s*-\s*文件夹:\s*(.+?)\s*$/);
    if (mf) { flush(); folder = mf[1]; continue; }
    const mn = ln.match(/^\s*-\s*名称:\s*(.+?)\s*$/);
    if (mn) {
      flush();
      const nm = mn[1].replace(/^["']|["']$/g, '');
      cur = { folder, name: nm, line: i + 1, enabled: true, posType: '', strategyType: '', order: null, depth: null, file: null };
      for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
        const l = lines[j];
        if (/^\s*-\s*(名称|文件夹):/.test(l)) break;
        const me = l.match(/^\s*(?:启用|enabled):\s*(\S+?)\s*(?:#.*)?$/);
        if (me) cur.enabled = !/^(false|no|0)$/i.test(me[1]);
        const mo = l.match(/^\s*(?:顺序|order):\s*(\d+)/);
        if (mo) cur.order = Number(mo[1]);
        const md = l.match(/^\s*(?:深度|depth):\s*(\d+)/);
        if (md) cur.depth = Number(md[1]);
        const mfi = l.match(/^\s*(?:文件|file):\s*(.+?)\s*(?:#.*)?$/);
        if (mfi) cur.file = mfi[1].trim();
      }
      continue;
    }
  }
  flush();
  // 再扫一遍：按「激活策略:」/「插入位置:」块归属类型字段
  let cur2 = null;
  for (let i = 0; i < lines.length; i++) {
    const mn = lines[i].match(/^\s*-\s*名称:\s*(.+?)\s*$/);
    if (mn) {
      const nm = mn[1].replace(/^["']|["']$/g, '');
      cur2 = entries.find((e) => e.name === nm && e.line === i + 1) || null;
      continue;
    }
    if (!cur2) continue;
    if (/^\s*激活策略:/.test(lines[i])) cur2._sect = 'strategy';
    else if (/^\s*插入位置:/.test(lines[i])) cur2._sect = 'position';
    else {
      const mt = lines[i].match(/^\s*类型:\s*(.+?)\s*(?:#.*)?$/);
      if (mt) {
        const v = mt[1].trim();
        if (cur2._sect === 'strategy') cur2.strategyType = v;
        else if (cur2._sect === 'position') cur2.posType = v;
      }
    }
  }
  return entries;
}

// ════════════════════════════════════════════════════════════
// 二、引用图：谁 getwi 了谁
// ════════════════════════════════════════════════════════════
function buildRefGraph(names) {
  const strong = new Map();  // getwi('X') —— 直接按需加载
  const weak = new Map();    // 字符串字面量命中条目名（映射表 / 数组 / 注释）
  const dyn = [];            // 无法静态解析的动态引用
  const add = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };

  for (const [f, text] of readAll) {
    const base = path.basename(f, path.extname(f));
    let m;
    const re = /getwi\(\s*(['"])((?:(?!\1).)+)\1\s*\)/g;
    while ((m = re.exec(text))) add(strong, m[2], base);
    const reDyn = /getwi\(\s*([_A-Za-z][\w.\[\]'"]*)\s*\)/g;
    while ((m = reDyn.exec(text))) dyn.push({ from: base, expr: m[1] });
    // 弱引用：任意字符串字面量命中条目名（覆盖 _dateMap / _chapterMap / 数组表 / 注释）
    const lits = new Set();
    const reLit = /['"]([^'"\n]{1,40})['"]/g;
    while ((m = reLit.exec(text))) lits.add(m[1]);
    for (const lit of lits) if (names.has(lit)) add(weak, lit, base);
  }
  return { strong, weak, dyn };
}

function entriesAudit() {
  const entries = parseIndex();
  const names = new Set(entries.map((e) => e.name));
  const { strong, weak, dyn } = buildRefGraph(names);
  const rows = [];

  for (const e of entries) {
    const s = strong.get(e.name) || [];
    const w = [...new Set(weak.get(e.name) || [])];
    rows.push({ ...e, strongBy: [...new Set(s)], weakBy: w, refCount: s.length + w.length, strongCount: s.length });
  }
  rows.sort((a, b) => (b.refCount - a.refCount) || a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name));

  // 分类
  const onDemand = [];   // 关闭 + 有引用 = 按需加载条（正确设计）
  const del = [];        // 关闭 + 零引用 = 真死条目
  const always = [];     // 启用 = 常驻条
  const deep = [];
  for (const r of rows) {
    if (r.depth !== null && r.depth > 0) deep.push(r);
    if (!r.enabled && r.refCount > 0) onDemand.push(r);
    else if (!r.enabled && r.refCount === 0) del.push(r);
    else always.push(r);
  }
  // 断链：getwi 引用了 index.yaml 里不存在的条目
  const broken = [];
  for (const [target, from] of strong) {
    if (!names.has(target)) broken.push({ target, from: [...new Set(from)] });
  }

  say('='.repeat(96));
  say('条目审计 · 同级生2（共 ' + entries.length + ' 条）');
  say('='.repeat(96));
  say('判据：有调用者就留、无调用者就删');
  say('');
  say('⚠️ 前置认知：getwi 直接读世界书条文内容，**不受 enabled 影响**。');
  say('   所以「关闭 + 被 getwi 引用」= 按需加载条（正确的 token 优化），不是 bug。');
  say('');
  say('【A. 按需加载条】启用=false 且有引用（' + onDemand.length + ' 条）—— 保留');
  for (const r of onDemand) {
    const s = r.strongBy.slice(0, 3).join(', ');
    const w = r.weakBy.slice(0, 2).join(', ');
    say('  ' + L(r.name, 30) + ' 强引用[' + r.strongBy.length + ']' + (s ? ' ' + s : '') + (w ? '  弱引用[' + r.weakBy.length + '] ' + w : ''));
  }
  say('');
  say('【B. 真死条目】启用=false 且零引用（' + del.length + ' 条）—— ★ 删除候选');
  for (const r of del) say('  ' + L(r.folder + '/' + r.name, 46) + ' 文件: ' + (r.file || '—'));
  say('');
  say('【C. 常驻条】启用=true 的条目（' + always.length + ' 条）');
  const keepByFolder = {};
  for (const r of always) { keepByFolder[r.folder] = (keepByFolder[r.folder] || 0) + 1; }
  for (const k of Object.keys(keepByFolder)) say('  ' + L(k, 20) + keepByFolder[k] + ' 条');
  say('');
  say('【D. 断链】getwi 引用了 index.yaml 里不存在的条目（' + broken.length + ' 处）');
  for (const b of broken) say('  ' + L(b.target, 30) + ' ← 被 ' + b.from.join(', ') + ' 引用');
  say('');
  say('【E. depth 违规】用了 depth ≥ 1（' + deep.length + ' 条）—— skills 铁律禁止，必须移到 before_char');
  for (const r of deep) say('  ' + L(r.name, 30) + ' depth=' + r.depth + '  位置类型=' + r.posType);
  say('');
  say('【F. 动态引用】（无法静态解析）' + dyn.length + ' 处');
  const dynMap = {};
  for (const d of dyn) { const k = d.expr; dynMap[k] = (dynMap[k] || 0) + 1; }
  for (const k of Object.keys(dynMap)) say('  getwi(' + k + ') × ' + dynMap[k]);
  say('');
  say('【G. 引用热度 TOP15】（被引用最多 = 最核心的机制条）');
  for (const r of rows.slice(0, 15)) say('  ' + R(r.refCount, 3) + ' × ' + L(r.name, 30) + (r.enabled ? '常驻' : '按需'));
  if (argv.includes('--list')) {
    say('');
    say('【完整清单】' + entries.length + ' 条');
    let lastFolder = '';
    for (const r of rows.slice().sort((a, b) => a.folder.localeCompare(b.folder) || (a.order ?? 999) - (b.order ?? 999))) {
      if (r.folder !== lastFolder) { say('  ── ' + r.folder + ' ──'); lastFolder = r.folder; }
      say('    ' + (r.enabled ? '[开]' : '[关]') + ' ' + L(r.name, 30) +
        L(r.strategyType || '?', 8) + L(r.posType || '?', 14) +
        (r.order != null ? 'order=' + r.order : '') + (r.depth ? ' depth=' + r.depth : ''));
    }
  }
  say('');
  return { entries, del, onDemand, broken, deep, strong, weak };
}

// ════════════════════════════════════════════════════════════
// 三、变量审计：落脚点 / 计算 / 意义
// ════════════════════════════════════════════════════════════
function parseVarList() {
  const text = fs.readFileSync(VARLIST, 'utf8');
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^-\s*(stat_data\.[^\s|]+)\s*\|([^\n]*)$/);
    if (m) {
      const rest = m[2].split('|').map((s) => s.trim());
      out.push({ path: m[1], type: rest[0] || '', range: rest[1] || '', def: rest[2] || '', note: rest[3] || '' });
    }
  }
  return out;
}

function varsAudit() {
  const vars = parseVarList();

  // 写点来源：initvar + 变量更新规则（规则里通常只写末段名，所以用 leaf 匹配）
  const initvarText = readAll.get(path.join(WB, '变量', 'initvar.yaml')) || '';
  const rulesText = readAll.get(path.join(WB, '变量', '变量更新规则.yaml')) || '';

  // 预统计末段名出现次数：同名 leaf 不能用「末段匹配」，否则 当前女角.魅力 会被 主角.魅力 误命中
  const leafCount = {};
  for (const v of vars) { const l = v.path.split('.').pop(); leafCount[l] = (leafCount[l] || 0) + 1; }

  const rows = [];
  for (const v of vars) {
    const full = v.path;
    const leaf = full.split('.').pop();
    const esc = full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let reads = 0, inFormula = 0, mentions = 0;
    const readers = new Set();

    for (const [f, text] of readAll) {
      const base = path.basename(f, path.extname(f));
      if (base === '变量列表') continue;
      let m;
      const reRead = new RegExp("getvar\\(\\s*['\"]" + esc, 'g');
      const reBare = new RegExp(esc, 'g');
      while ((m = reRead.exec(text))) { reads++; readers.add(base); }
      let bare = 0;
      while ((m = reBare.exec(text))) bare++;
      mentions += bare;
      // 「疑似计算」：读取后邻接算术/比较。跳过 initvar / 变量列表 / 输出格式 ——
      // 它们是默认值声明与文档，不是公式（把声明算成公式会造出「20 次公式参与」这种假信号）
      if (!/^(initvar|变量列表|变量输出格式|变量输出格式_额外模型|输出格式_剧情)$/.test(base)) {
        const reCalc = new RegExp(
          "getvar\\(\\s*['\"]" + esc + "[^)]{0,80}\\)[\\s\\S]{0,120}?[+\\-*/<>]|" +
          "[+\\-*/<>][^\\n]{0,60}getvar\\(\\s*['\"]" + esc, 'g');
        while ((m = reCalc.exec(text))) inFormula++;
      }
    }

    // 写点：① 精确路径出现在 initvar / 更新规则；② leaf 唯一时允许末段名匹配；③ 代码里的 setvar
    const exact = initvarText.includes(full) || rulesText.includes(full);
    const loose = leafCount[leaf] === 1 && (initvarText.includes(leaf) || rulesText.includes(leaf));
    let writes = 0;
    const writers = new Set();
    if (exact) { writes += 1; writers.add('initvar/规则·精确'); }
    else if (loose) { writes += 1; writers.add('initvar/规则·末段'); }
    for (const [f, text] of readAll) {
      const base = path.basename(f, path.extname(f));
      if (base === '变量列表') continue;
      const reW = new RegExp("setvar\\(\\s*['\"]" + esc, 'g');
      let m;
      while ((m = reW.exec(text))) { writes += 1; writers.add(base); }
    }

    const r = { ...v, reads, writes, inFormula, mentions, readers: [...readers], writers: [...writers] };
    if (mentions === 0 && writes === 0) r.verdict = '孤儿';
    else if (reads > 0 && writes > 0) r.verdict = 'OK';
    else if (writes > 0 && reads === 0) r.verdict = '无落脚点';
    else if (reads > 0 && writes === 0) r.verdict = '无计算';
    else r.verdict = '仅被提及';
    rows.push(r);
  }

  const by = (k) => rows.filter((r) => r.verdict === k);
  say('='.repeat(96));
  say('变量审计 · 同级生2（共 ' + rows.length + ' 个变量）');
  say('='.repeat(96));
  say('判据：有读=有落脚点｜有写=有意义｜进公式=有计算。三者缺一即候选删除');
  say('');
  say('⚠️ 本工具只提供【线索】，不提供【判定】。');
  say('   「被读几次」不等于「有意义」—— 例如 H经验次数 曾显示 20 次公式参与，');
  say('   其中 19 次只是 initvar.yaml 里 19 个女角的默认值声明。');
  say('   真正该问的是：玩家看得见吗？能用它做决策吗？会改变叙事走向吗？→ 必须人工过。');
  say('');
  for (const k of ['孤儿', '无落脚点', '无计算']) {
    const list = by(k);
    say('【' + k + '】' + list.length + ' 个' + (k === '孤儿' ? ' —— ★ 删除候选（全卡零接触）' : ''));
    for (const r of list) {
      say('  ' + L(r.path.replace('stat_data.', ''), 34) + L(r.type.slice(0, 10), 11) +
        R(r.reads, 4) + '读 ' + R(r.writes, 4) + '写 ' + R(r.inFormula, 4) + '公式  ' + r.note.slice(0, 30));
    }
    say('');
  }
  // 疑似重复：同名末段
  const byLeaf = {};
  for (const r of rows) { const l = r.path.split('.').pop(); (byLeaf[l] = byLeaf[l] || []).push(r); }
  const dups = Object.entries(byLeaf).filter(([, v]) => v.length > 1);
  say('【疑似重复】同名末段变量 ' + dups.length + ' 组 —— ★ 化繁为简的重点');
  for (const [l, list] of dups) {
    say('  ' + L(l, 18) + list.map((r) => r.path.replace('stat_data.', '') + '(' + r.verdict + ')').join('  |  '));
  }
  say('');
  say('【OK】' + by('OK').length + ' 个（读写俱全，保留）');
  say('【仅被提及】' + by('仅被提及').length + ' 个（被提到但既不读也不写）');
  say('');
  say('【公式参与 TOP15】数值链路最深的变量');
  for (const r of rows.filter((x) => x.inFormula > 0).sort((a, b) => b.inFormula - a.inFormula).slice(0, 15)) {
    say('  ' + L(r.path.replace('stat_data.', ''), 34) + R(r.inFormula, 4) + ' 次公式参与');
  }
  say('');
  say('【零接触变量】' + rows.filter((r) => r.mentions === 0 && r.writes === 0).length + ' 个（列表里写了但全卡没人用）');
  return { rows, vars };
}

// ── 执行 ──
let result = {};
if (doEntries) result.entries = entriesAudit();
if (doVars) result.vars = varsAudit();
if (!doEntries && !doVars) {
  say('用法：node scripts/audit-nanpa2.mjs --entries | --vars | --all [--out 报告.md]');
  process.exit(0);
}
if (OUT) {
  fs.writeFileSync(OUT, '# 同级生2 审计报告\n\n```\n' + buf.join('\n') + '\n```\n', 'utf8');
  console.log('\n[报告已写入] ' + OUT);
}
