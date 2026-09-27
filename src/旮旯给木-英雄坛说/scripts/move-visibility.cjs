// 把变量列表里的 .可见 挪出世界书（省 MVU 预算）
//   ★ 为什么：.可见 是「面板怎么显示」的元数据，AI 不需要（它写变量不需要知道显示在哪）。
//     实测：面板 0 处读它、生成器 0 处读它、条目 0 处读它 —— 纯文档。
//     挪到 底座_yingxiong/（不进世界书 → 不进 prompt 预算）。
const fs = require('fs');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const 根 = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const p = 根 + '/世界书/变量/变量列表.yaml';
const 文 = fs.readFileSync(p, 'utf8');
const o = YAML.parse(文);
const v = o.变量 || {};

const 可见 = {}, 留 = {};
let 挪 = 0, 省 = 0;
for (const [k, val] of Object.entries(v)) {
  if (k.endsWith('.可见')) {
    可见[k.replace(/\.可见$/, '')] = val;
    省 += Buffer.byteLength(k + ' ' + val, 'utf8') + 4;
    挪++;
  } else 留[k] = val;
}
o.变量 = 留;

// ── 写回变量列表（保留注释头）
const 头 = 文.split('\n').filter(l => l.startsWith('#') || l === '').slice(0, 2).join('\n');
fs.writeFileSync(p, (头 ? 头 + '\n' : '') + YAML.stringify(o));

// ── 可见表写到契约层（不进世界书）
const 表 = {
  '变量可见表': {
    '说明': '★ 从「世界书/变量/变量列表.yaml」挪出来（2026-09-17）。它是面板显示位置表，AI 不需要，所以不进 prompt 预算',
    '出处': '原来写在变量列表里，占 2082 字节的 MVU 常驻预算。实测：面板 0 处读、生成器 0 处读、条目 0 处读',
    '按位置分组': {}
  }
};
const 组 = {};
for (const [k, val] of Object.entries(可见)) {
  (组[String(val)] = 组[String(val)] || []).push(k);
}
Object.keys(组).sort().forEach(k => { 表['变量可见表']['按位置分组'][k] = 组[k]; });
表['变量可见表']['原始逐条'] = 可见;

fs.writeFileSync(根 + '/底座_yingxiong/变量可见表.yaml', YAML.stringify(表));

console.log('✅ 挪出 ' + 挪 + ' 行，省 ' + 省 + ' 字节');
console.log('   变量列表: ' + Object.keys(留).length + ' 行');
console.log('   可见表写到 底座_yingxiong/变量可见表.yaml（不进预算）');
console.log('   按位置: ' + Object.entries(组).map(([k, a]) => k + '×' + a.length).join(' / '));
