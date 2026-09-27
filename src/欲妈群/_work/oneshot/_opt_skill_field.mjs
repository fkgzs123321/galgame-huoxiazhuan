// ① 选项加「技能」字段　② 面板：技能区去"拒绝"、选项区改成 4 格 ×（顺着/拒）、点即判定即推送　③ 表单默认不预选 + 先切 swipe 再写难度
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;
const 换 = (f, pairs, tag) => {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let hit = 0;
  for (const [a, b] of pairs) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + tag + '：' + a.slice(0, 34)); continue; }
    t = t.split(A).join(B); hit += c;
  }
  if (hit) { fs.writeFileSync(f, t, 'utf8'); n += hit; }
  console.log((hit ? '✓' : '·') + ' ' + tag.padEnd(20) + hit);
};

// ── ① schema：OptionSchema 加「技能」
换('schema.ts', [[
  `const OptionSchema = z.object({
  文本: str(''),                                   // 她这一关摆出来的这一条，写清楚她拆解后的动作
  等级: z.enum(['微', '中', '强', '极']).prefault('微').catch('微'),
  代价: str(''),                                   // 他拦下来的代价，写清量级
}).prefault({});`,
  `const OptionSchema = z.object({
  文本: str(''),                                   // 她这一关摆出来的这一条，写清楚她拆解后的动作
  等级: z.enum(['微', '中', '强', '极']).prefault('微').catch('微'),
  代价: str(''),                                   // 他拦下来的代价，写清量级
  技能: z.enum(['观察', '行动', '意志']).prefault('行动').catch('行动'),  // ★ 这一条要用哪个技能拦（每条可以不同）
}).prefault({});`,
]], 'schema 选项技能');

// ── ② 5 份 initvar：每格加 技能
for (const f of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let c = 0;
  t = t.replace(/(\n {4}([一二三四]):\n {6}文本: ""\n {6}等级: 微\n {6}代价: "")/g, (m, g1, k) => (c++, g1 + eol + '      技能: 行动'));
  if (c) { fs.writeFileSync(f, t, 'utf8'); n += c; }
  console.log((c ? '✓' : '·') + ' ' + f.split('/').pop().padEnd(20) + c + ' 格');
}

// ── ③ 更新规则：补 技能 字段
换('世界书/变量/变量更新规则.yaml', [[
  "    当前选项.${一|二|三|四}.代价: { type: string, check: 他想拦下来要付什么，按等级写量级 }",
  `    当前选项.\${一|二|三|四}.代价: { type: string, check: 他想拦下来要付什么，按等级写量级 }
    当前选项.\${一|二|三|四}.技能: { type: '观察|行动|意志', check: ★ 这一条要用哪个技能拦——不同选项要用不同技能（例如"把牛奶放床头"用观察认出蹊跷、"当众撩他"用意志顶住）。四条里最少要有两种不同技能 }`,
]], '更新规则 选项技能');

// ── ④ 面板：技能区去掉「拒绝」按钮
换('正则/状态栏.html', [[
  `  s+='<button class="act refuse" data-act="roll" data-skill="拒绝">拒绝<small>DC12 · 意志'+num((p.技能||{}).意志,0)+"</small></button>";
`, '',
]], '面板 去掉拒绝技能按钮');

fs.writeFileSync('正则/状态栏.html', fs.readFileSync('正则/状态栏.html', 'utf8'), 'utf8');
console.log('\n共 ' + n + ' 处');
