// MVU 一致性检查（mvu/guide.md 收尾步骤第 4 步）
//   ① EJS 变量映射完整性：所有 getvar('stat_data.X…') 路径必须在 initvar 里存在
//   ② schema 域覆盖：initvar 顶层域必须与 schema.ts 的 z.object 顶层键一致
//   ③ 变量↔条目双向：每个变量被哪些条目读；哪些条目提到数值名词却无对应变量
import fs from 'node:fs';
import path from 'node:path';

const P = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
const init = fs.readFileSync(P + '世界书/变量/initvar.yaml', 'utf8');
const schema = fs.readFileSync(P + 'schema.ts', 'utf8');

// ── 解析 initvar 的路径集合（只到两级，够判 getvar）──
const 路径集 = new Set();
let stack = [];
for (const raw of init.split('\n')) {
  if (!raw.trim() || raw.trim().startsWith('#')) continue;
  const m = raw.match(/^(\s*)([^\s#][^:]*):/);
  if (!m) continue;
  const depth = Math.floor(m[1].length / 2);
  stack = stack.slice(0, depth);
  stack[depth] = m[2].trim().replace(/^['"]|['"]$/g, '');
  路径集.add(stack.join('.'));
}
// 绑定花名册 的子键是真人名，展开
for (const who of ['陈雪华','林雅芝','王秀兰','赵敏','孙莉','周慧敏','吴琼','郑秀','苏婉','沈梦瑶']) {
  路径集.add('绑定花名册.' + who);
}

// ── ① 扫描所有条目里的 getvar ──
const 条目 = [];
const walk = (d) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.txt')) 条目.push(p);
  }
};
walk(P + '世界书');

const 缺失 = [];
const 引用计数 = {};
for (const p of 条目) {
  const rel = path.relative(P, p).split(path.sep).join('/');
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => {
    let m;
    const re = /getvar\('stat_data\.([^']+)'/g;
    while ((m = re.exec(l))) {
      let path_ = m[1];
      // 归一化：去掉具体人名 / 运行时字段，回到可判断的两级
      const segs = path_.split('.');
      const key2 = segs.slice(0, 2).join('.');
      const key1 = segs[0];
      const ok = 路径集.has(key2) || 路径集.has(key1) || 路径集.has(path_);
      if (!ok) 缺失.push(`${rel}:${i + 1}  stat_data.${path_}`);
      引用计数[key2] = (引用计数[key2] || 0) + 1;
    }
  });
}

// ── ② schema 顶层域 vs initvar 顶层域 ──
// ★ 注意 \w 不匹配中文，这里必须用 \S+
const schemaTop = [...schema.matchAll(/^\s+([^\s:]+):\s*\S+Schema,/gm)].map((m) => m[1]);
const initTop = [...new Set([...路径集].map((s) => s.split('.')[0]))];

console.log('═══ ① EJS 变量映射完整性 ═══');
if (缺失.length) {
  console.log('❌ 引用了 initvar 里不存在的路径 ' + 缺失.length + ' 处：');
  缺失.forEach((s) => console.log('   ' + s));
} else console.log('✅ 全部命中（getvar 路径都能在 initvar 里找到）');

console.log('\n═══ ② schema 顶层域 vs initvar 顶层域 ═══');
console.log('schema :', schemaTop.join(' / '));
console.log('initvar:', initTop.join(' / '));
const 域差异 = schemaTop.filter((x) => !initTop.includes(x)).concat(initTop.filter((x) => !schemaTop.includes(x)));
console.log(域差异.length ? '❌ 差异: ' + 域差异.join(' / ') : '✅ 一致');

console.log('\n═══ ③ 被条目读到的变量（引用次数）═══');
Object.entries(引用计数)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log('   ' + String(v).padStart(3) + '  ' + k));

// ── ④ 条目里提到的数值名词，是否有对应变量 ──
const 数值名词 = ['理智值','理智','怀疑度','良知值','反抗力','觉醒度','评价值','绑定深度','清醒频率','财富积分','共识分','好感度','名额','财富等级'];
const 全条目文本 = 条目.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
console.log('\n═══ ④ 条目里出现过的数值名词（人工核对是否都有变量）═══');
数值名词.forEach((n) => {
  const c = (全条目文本.match(new RegExp(n, 'g')) || []).length;
  if (c) console.log('   ' + String(c).padStart(3) + '  ' + n);
});
