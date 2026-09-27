// ⑤-1 选项池变量：局面.{当前选项(固定四格), 她已选}
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;
const 换 = (f, pairs, tag) => {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let hit = 0;
  for (const [a, b] of pairs) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + tag + '：' + a.slice(0, 40)); continue; }
    t = t.split(A).join(B); hit += c;
  }
  if (hit) { fs.writeFileSync(f, t, 'utf8'); n += hit; }
  console.log((hit ? '✓' : '·') + ' ' + tag.padEnd(18) + hit);
};

// ① schema.ts：加 局面Schema + 注册
换('schema.ts', [[
`const SettingsSchema = z.object({`,
`const OptionSchema = z.object({
  文本: str(''),                                   // 她这一关摆出来的这一条，写清楚她拆解后的动作
  等级: z.enum(['微', '中', '强', '极']).prefault('微').catch('微'),
  代价: str(''),                                   // 他拦下来的代价，写清量级
}).prefault({});

// ★ 面板说了算：四格固定，不新增键（Zod 卡拿不到 extensible，add 新键会被 MVU 判 SCHEMA 违规）
//   她摆不满就留空（文本为空的那一格面板不渲染）；他拒绝哪一格，就把那一格的 文本 清空。
const 局面Schema = z.object({
  当前选项: z.object({
    一: OptionSchema, 二: OptionSchema, 三: OptionSchema, 四: OptionSchema,
  }).prefault({}),
  她已选: str(''),                                 // 她从中挑走的那一条（一/二/三/四）
}).prefault({});

const SettingsSchema = z.object({`,
], ['  阶段守卫: PhaseGuardSchema,\n  设置: SettingsSchema,', '  阶段守卫: PhaseGuardSchema,\n  局面: 局面Schema,\n  设置: SettingsSchema,']], 'schema 局面');

// ② 5 份 initvar：加 局面 块（放在 阶段守卫 之前）
for (const f of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
  const t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t);
  if (t.includes('局面:')) { console.log('· ' + f.split('/').pop() + ' 已有局面'); continue; }
  const anchor = eol + '阶段守卫:';
  if (!t.includes(anchor)) { console.log('  ⚠ ' + f.split('/').pop() + ' 找不到 阶段守卫 锚点'); continue; }
  const block = eol + '局面:' + eol + '  当前选项:' + eol +
    ['一', '二', '三', '四'].map(k => '    ' + k + ':' + eol + '      文本: ""' + eol + '      等级: 微' + eol + '      代价: ""').join(eol) +
    eol + '  她已选: ""' + eol;
  fs.writeFileSync(f, t.replace(anchor, block + '阶段守卫:'), 'utf8');
  n++; console.log('✓ ' + f.split('/').pop().padEnd(14) + '加 局面');
}

console.log('\n共 ' + n + ' 处');
