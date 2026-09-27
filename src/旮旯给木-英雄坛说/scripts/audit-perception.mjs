#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// audit-perception.mjs · 三层结构一致性巡查
//
// 为什么要这个脚本（来自同级生2 的一条教训）：
//   模型的错往往不出在「不知道结论」，而在「不知道边界」。
//   它知道「她不知道我」，但不知道「那 <user> 呢，我能推动他到什么程度」。
//   所以规则要写成「通道 + 条件 + 终点」，只写结论不够。
//
// 这个脚本做的事：把卡里所有涉及「感知 / 影响 / 通道」的表述抓出来，
// **列出上下文让人判断**，不自动判定对错。
//   ★ 脚本只列线索，判定必须人工（这是本工作区反复验证过的一条铁律）
//
// 巡查五类：
//   ① 她是否可能察觉到「我」          —— 命中即冲突（不存在这条线）
//   ② 影响链的表述                     —— 要看有没有写清通道与终点
//   ③ 危险断言（唯一 / 只有 / 绝不）    —— 每写一个都要能举反例否证自己
//   ④ 出戏词（玩家 / 用户 / 副本 / 系统）—— 正文口径是「我」和「她」
//   ⑤ 通道名的用词是否统一             —— 拒绝 / 自定义 不能有两个名字
//
// 用法: node scripts/audit-perception.cjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const WB = path.resolve(path.join(__dirname, '..', '世界书'));
const 跳过 = ['底座_yingxiong', 'scripts'];

const 类 = [
  {
    名: '① 她察觉到「我」（命中即冲突）',
    严重: true,
    re: /她(?:察觉|感觉到|意识到|注意到|发现|看出|听见|猜到)[^\n。]{0,20}(?:我|有人|反抗|不对劲|异常)|察觉(?:到)?有人|发现有人在/,
  },
  {
    名: '② 影响链表述（看有没有写清通道与终点）',
    严重: false,
    re: /影响不(?:到|了)|能影响|不通|收不到|察觉不到|作用于/,
  },
  {
    名: '③ 危险断言（唯一/只有/绝不 —— 要能举反例否证自己）',
    严重: false,
    re: /唯一(?:的)?(?:通道|一条|出口|能做|来源)|只有一[条个]|绝不(?:能|会)|完全(?:影响|收)不/,
  },
  {
    名: '④ 出戏词（正文口径是「我」与「她」）',
    严重: false,
    re: /玩家|用户|副本|系统提示|读档|存档点/,
  },
];

// ★ 通道名检查的正确口径：
//   「拒绝」和「自定义」是**两个不同的动作**（拒绝 = 拦住她正要点的那个；自定义 = 照自己意图硬做一次），
//   不是一个东西两个名字。真正要防的是**同义异名**：同一件事被写成好几个词，模型收到两个名字会当成两件事。
//   所以这里只查「已知同义词组」，不做全量两两比较（那必然误报）。
const 同义词组 = [
  { 正名: '自定义', 别名: ['自己来', '自作主张', '擅自行动'] },
  { 正名: '拒绝', 别名: ['抗拒', '驳回'] },
  { 正名: '离线态', 别名: ['脱机态', '下线态'] },
];
const 计数 = {};
for (const g of 同义词组) { 计数[g.正名] = 0; for (const a of g.别名) 计数[a] = 0; }

const 命中 = {};
let 扫描文件 = 0;

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (跳过.includes(e.name)) continue;
      walk(f);
      continue;
    }
    if (!/\.(yaml|txt|md)$/.test(e.name)) continue;
    扫描文件++;
    const t = fs.readFileSync(f, 'utf8');
    const rel = path.relative(WB, f);
    const L = t.split(/\r?\n/);
    for (const c of 类) {
      L.forEach((line, i) => {
        const m = line.match(c.re);
        if (!m) return;
        (命中[c.名] = 命中[c.名] || []).push({ 文件: rel, 行: i + 1, 文: line.trim().slice(0, 92), 例: m[0] });
      });
    }
    for (const k of Object.keys(计数)) 计数[k] += (t.match(new RegExp(k, 'g')) || []).length;
  }
}

console.log('='.repeat(74));
console.log('三层结构一致性巡查 · 扫描 ' + path.basename(path.dirname(WB)) + '/世界书');
console.log('='.repeat(74));
walk(WB);

let 冲突 = 0;
for (const c of 类) {
  const arr = 命中[c.名] || [];
  console.log('\n【' + c.名 + '】  ' + arr.length + ' 处' + (c.严重 ? '   ★ 命中即需人工核对' : ''));
  for (const a of arr.slice(0, 20)) {
    console.log('   ' + a.文件 + ':' + a.行);
    console.log('      ' + a.文);
  }
  if (arr.length > 20) console.log('   …还有 ' + (arr.length - 20) + ' 处');
  if (c.严重) 冲突 += arr.length;
}

console.log('\n【⑤ 同义异名检查（同一件事不能有两个名字）】');
let 异名 = 0;
for (const g of 同义词组) {
  const 别名命中 = g.别名.filter((a) => 计数[a] > 0);
  console.log('   ' + g.正名 + ' ' + 计数[g.正名] + (别名命中.length ? '   ⚠️ 同时出现别名：' + 别名命中.map((a) => a + ' ' + 计数[a]).join(' / ') : '   ✅'));
  if (别名命中.length) 异名 += 别名命中.length;
}

console.log('\n' + '='.repeat(74));
console.log('扫描 ' + 扫描文件 + ' 个文件 ／ ① 类冲突候选 ' + 冲突 + ' 处  →  ★ 逐条人工核对，脚本不判定对错');
console.log('='.repeat(74));
