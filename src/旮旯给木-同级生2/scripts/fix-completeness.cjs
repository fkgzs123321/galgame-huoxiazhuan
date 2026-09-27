// 按 skills「完整性」检查结果修正
//   A1: CoT注入 —— 规划登记了但文件没写 → 标为「已跳过 + 原因」
//   A3: 3 个注册了但规划漏登记 → 补进 entries
const fs = require('fs');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const P = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/创作规划.yaml';
const o = YAML.parse(fs.readFileSync(P, 'utf8'));

/* A1: CoT注入 —— 本卡的做法是「思维链」条目，不再单独设 CoT注入 */
const cot = o.entries.find(e => e && e.name === 'CoT注入');
if (cot) {
  cot['状态'] = '已跳过';
  cot['原因'] = '本卡把思维链做成了 扮演准则/思维链.yaml 条目（八步骨架）。CoT 的内容在那里 + 预设侧可由玩家自行注入，不需要单独的 CoT注入 条目';
  cot['替代'] = '思维链';
  console.log('✅ A1 CoT注入 → 标为「已跳过」，原因与替代已记录');
}

/* A3: 3 个漏登记的补进 entries */
const 补 = [
  { name: '人设补丁', type: '世界观', path: '世界书/世界观/底座_nanpa2/人设补丁.yaml', 说明: '七套「她」的底座相关手段表现（7 套 × 4 行）' },
  { name: '公共选项池', type: '世界观', path: '世界书/世界观/底座_nanpa2/公共选项池.yaml', 说明: '不涉及具体人的通用选项（15 条），求交集后补位用' },
  { name: '主角_性格调色盘', type: '角色', path: null, 说明: '主角分片条目之一（注册用 contents 组合）' },
];
const 已有 = new Set(o.entries.map(e => e && e.name));
let 加 = 0;
for (const x of 补) {
  if (已有.has(x.name)) continue;
  o.entries.push(x);
  加++;
}
console.log('✅ A3 补登记 ' + 加 + ' 个（人设补丁 / 公共选项池 / 主角_性格调色盘）');
console.log('   entries 总数: ' + o.entries.length);
o['变更记录'] = o['变更记录'] || [];
o['变更记录'].push({
  日期: '2026-09-16',
  内容: [
    '按 skills「完整性」检查修正：CoT注入 标为已跳过（由 思维链 替代）',
    '补登记 3 个漏登条目：人设补丁 / 公共选项池 / 主角_性格调色盘',
  ],
});
fs.writeFileSync(P, YAML.stringify(o, { lineWidth: 0 }));
try { YAML.parse(fs.readFileSync(P, 'utf8')); console.log('   YAML ✅'); } catch (e) { console.log('   ⚠ ' + e.message.split('\n')[0].slice(0, 50)); }
