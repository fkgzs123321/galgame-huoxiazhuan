// 把「关卡」体系改掉 —— 本卡是 17 天制，用「天」不用「关」
//   映射（语义级，不是盲替）：
//     关卡进度 → 游戏进度（变量名，要同步 schema / initvar / 变量列表）
//     解锁下一关 → 进入下一天
//     当前关卡 / 这一关 / 本关 → 当前这一天 / 这一天 / 本天
//     一关八层 → 一天八层
//     关卡序列 → （不存在，凡引用改指向 时间线/plot/第NN天）
//     关卡 → 天（兜底）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

const 映射 = [
  ['关卡进度', '游戏进度'],
  ['解锁下一关', '进入下一天'],
  ['解锁下一', '进入下一天'],
  ['当前关卡', '当前这一天'],
  ['这一关的', '这一天的'],
  ['本关的', '本天的'],
  ['这一关', '这一天'],
  ['本关', '本天'],
  ['下一关', '下一天'],
  ['一关八层', '一天八层'],
  ['一关中', '一天中'],
  ['一关能攒', '一天能攒'],
  ['每关', '每天'],
  ['关卡序列', '时间线/plot/第NN天'],
  ['关卡池', '当日池'],
  ['过关', '过一天'],
  ['关卡', '天'],
];

const 文件 = [];
const 扫 = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) 扫(p);
    else if (/\.(yaml|yml)$/.test(f.name)) 文件.push(p);
  }
};
扫(path.join(D, '世界书'));
文件.push(path.join(D, 'schema.ts'));

let 改数 = 0;
for (const p of 文件) {
  let t = fs.readFileSync(p, 'utf8');
  const 原 = t;
  for (const [a, b] of 映射) t = t.split(a).join(b);
  if (t !== 原) {
    fs.writeFileSync(p, t);
    改数++;
    console.log('  ✅ ' + p.replace(D + '\\', '').replace(D + '/', ''));
  }
}
console.log('\n共改 ' + 改数 + ' 个文件');

/* 校验 YAML 与 schema */
let 坏 = 0;
for (const p of 文件) {
  if (!/\.(yaml|yml)$/.test(p)) continue;
  try { YAML.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.log('  ⚠ YAML 坏: ' + p.split(/[\\/]/).pop() + ' → ' + e.message.split('\n')[0].slice(0, 40)); 坏++; }
}
console.log(坏 === 0 ? '✅ 所有 YAML 通过' : '⚠ ' + 坏 + ' 个 YAML 有问题');

/* 确认没有残留 */
const 残留 = [];
for (const p of 文件) if (fs.readFileSync(p, 'utf8').includes('关卡')) 残留.push(p.split(/[\\/]/).pop());
console.log('残留「关卡」的文件: ' + (残留.length ? 残留.join(' / ') : '无 ✅'));
