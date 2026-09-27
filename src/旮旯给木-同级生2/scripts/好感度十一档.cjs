// 好感度改十一档 + 同步变量层
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* ① schema.ts：好感度范围 -100 ~ +100 */
let s = fs.readFileSync(D + '/schema.ts', 'utf8');
const n1 = (s.match(/好感度: z\.coerce\.number\(\)\.transform\(v => _\.clamp\(Math\.round\(v\), 0, 100\)\)\.prefault\(0\)/g) || []).length;
s = s.replace(/好感度: z\.coerce\.number\(\)\.transform\(v => _\.clamp\(Math\.round\(v\), 0, 100\)\)\.prefault\(0\)/g,
  '好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0)');
fs.writeFileSync(D + '/schema.ts', s);
console.log('✅ ① schema.ts：好感度 0~100 → −100~+100（' + n1 + ' 处）');

/* ② 变量列表 */
const p2 = D + '/世界书/变量/变量列表.yaml';
let v = fs.readFileSync(p2, 'utf8');
if (!v.includes('女角.好感度.范围')) {
  const 加 = [
    '',
    '女角.好感度.范围: −100 ~ +100',
    '女角.好感度.可见: 状态栏',
    '女角.好感度.意义: "她对你这个人走到哪一步了。★ 十一档：−5 仇视 / −4 厌恶 / −3 排斥 / −2 冷淡 / −1 不反感 / 0 中立（初始）/ +1 好感 / +2 喜欢 / +3 依恋 / +4 沦陷 / +5 独占"',
    '女角.好感度.分档: "−5 仇视 ≤−81｜−4 厌恶 −80~−61｜−3 排斥 −60~−41｜−2 冷淡 −40~−21｜−1 不反感 −20~−1｜0 中立｜+1 好感 +1~+20｜+2 喜欢 +21~+45｜+3 依恋 +46~+70｜+4 沦陷 +71~+95｜+5 独占 ≥+96"',
    '女角.关系阶段.与好感度的区别: 关系阶段是「名义上是什么关系」（同学/朋友/恋人），好感度是「她心里到哪一步」。★ 两者可以错位：名义上是同学但好感度已经 +4',
  ];
  fs.writeFileSync(p2, v.replace(/\s*$/, '\n') + 加.join('\n') + '\n');
  console.log('✅ ② 变量列表：加了 好感度 十一档说明');
}

/* ③ 变量更新规则 */
const p3 = D + '/世界书/变量/变量更新规则.yaml';
const o = YAML.parse(fs.readFileSync(p3, 'utf8'));
const 补 = {
  '女角.好感度.增长': '按她这一场收到的东西给：顺手帮一件事 +2~5 ／ 替她出头 +8~15 ／ 她主动靠近被接住 +5~10 ／ 睡过一次 +15~25 ／ 把她的心事说对 +5~10',
  '女角.好感度.衰减': '伤她的在意 +8~15 ／ 当众不给她面子 +10~20 ／ 提别人 +5~15 ／ 碰她但不认 +20~30（★ 这一条最重）',
  '女角.好感度.阈值': '[ {≤−81: −5 仇视}, {−80~−61: −4 厌恶}, {−60~−41: −3 排斥}, {−40~−21: −2 冷淡}, {−20~−1: −1 不反感}, {=0: 0 中立}, {+1~+20: +1 好感}, {+21~+45: +2 喜欢}, {+46~+70: +3 依恋}, {+71~+95: +4 沦陷}, {≥+96: +5 独占} ]',
};
let n3 = 0;
for (const [k, x] of Object.entries(补)) if (!(k in o)) { o[k] = x; n3++; }
fs.writeFileSync(p3, YAML.stringify(o, { lineWidth: 0 }));
console.log('✅ ③ 变量更新规则：加了 ' + n3 + ' 条');

/* ④ 已有三个文件的区间改成十一档 */
const 表 = {
  '好感度_厌恶.yaml': { 区间: '−80 ~ −61（−4 厌恶）', 档: '厌恶' },
  '好感度_中立.yaml': { 区间: '= 0（初始档）', 档: '中立' },
  '好感度_喜欢.yaml': { 区间: '+21 ~ +45（+2 喜欢）', 档: '喜欢' },
};
const 角色 = D + '/世界书/角色/底座_nanpa2/鸣泽唯';
for (const [f, x] of Object.entries(表)) {
  const p = path.join(角色, f);
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(/^区间: .*$/m, '区间: ' + x.区间);
  t = t.replace(/^_怎么触发: .*$/m, '_怎么触发: 只当 女角.鸣泽唯.好感度 落在「' + x.档 + '」这一档时，这份才进上下文（门控写在 tavern-cards-state.json 的 鸣泽唯_好感度_' + x.档 + ' 里）');
  fs.writeFileSync(p, t);
}
console.log('✅ ④ 已有 3 个文件的区间已改成十一档');
