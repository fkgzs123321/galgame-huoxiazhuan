// 让开场白与 initvar 对得上：每条的 时间 与 当日大赛主题 必须写进对应的变量文件
//   0.txt → 世界书/变量/initvar.yaml（默认状态）
//   1~4  → 开场白/initvar/{n}.yaml（initvar_override）
// 主题一律取 [mvu_plot]欲妈群规则 §4.1 的真实条目，索引＝该条在池子里的编号
import fs from 'fs';

const PLAN = [
  { f: '世界书/变量/initvar.yaml', 小时: 7,  时段: '早晨', 日数: 1, 主题: '拍到儿子晨勃的高清特写',          索引: 2 },
  { f: '开场白/initvar/1.yaml',    小时: 23, 时段: '夜晚', 日数: 1, 主题: '在儿子面前自慰不被发现',          索引: 15 },
  { f: '开场白/initvar/2.yaml',    小时: 0,  时段: '半夜', 日数: 1, 主题: '用儿子穿过的T恤自慰并记录',        索引: 36 },
  { f: '开场白/initvar/3.yaml',    小时: 13, 时段: '中午', 日数: 1, 主题: '共感体验报告（描述使用假阳具时儿子的同步反应）', 索引: 26 },
  { f: '开场白/initvar/4.yaml',    小时: 22, 时段: '夜晚', 日数: 1, 主题: '拍下儿子穿紧身裤的裆部特写',        索引: 65 },
];

const LEGAL = ['早晨', '上午', '中午', '下午', '傍晚', '夜晚', '半夜'];

function setKey(text, key, value, indent) {
  const re = new RegExp('^' + indent + key + ':.*$', 'm');
  if (!re.test(text)) throw new Error('找不到键 ' + key);
  return text.replace(re, indent + key + ': ' + value);
}

let n = 0;
for (const p of PLAN) {
  if (!LEGAL.includes(p.时段)) throw new Error('时段不合法：' + p.时段);
  let t = fs.readFileSync(p.f, 'utf8');
  const before = t;
  t = setKey(t, '日数', p.日数, '  ');
  t = setKey(t, '小时', p.小时, '  ');
  t = setKey(t, '时段', p.时段, '  ');
  t = setKey(t, '今日主题', p.主题, '  ');
  t = setKey(t, '今日主题索引', p.索引, '  ');
  if (t === before) { console.log('⚠ 无变化 ' + p.f); continue; }
  fs.writeFileSync(p.f, t, 'utf8');
  console.log('✓ ' + p.f.padEnd(26) + p.日数 + '日 ' + String(p.小时).padStart(2, '0') + '点 ' + p.时段 + '  #' + p.索引 + ' ' + p.主题);
  n++;
}
console.log('共 ' + n + ' 个文件已对齐');
