// 修 `键: 值` 后面跟更深缩进子键的问题（YAML: Nested mappings are not allowed in compact mappings）
// 修法：键名后留空，值另起一行写成 `值: xxx`
const fs = require('fs');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const p = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2/世界书/世界观/引擎/反抗与判定.yaml';

let 行 = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const 出 = [];
for (let i = 0; i < 行.length; i++) {
  const 本 = 行[i];
  const m = 本.match(/^(\s*)([^\s#:-][^:]*):[ \t]+(\S.*)$/);
  const 缩 = (本.match(/^\s*/) || [''])[0].length;
  const 下 = 行[i + 1] || '';
  const 下缩 = (下.match(/^\s*/) || [''])[0].length;
  const 下是子项 = 下.trim() && 下缩 > 缩 && !下.trim().startsWith('-');
  if (m && 下是子项) {
    出.push(m[1] + m[2] + ':');
    出.push(m[1] + '  值: ' + m[3]);
  } else {
    出.push(本);
  }
}
fs.writeFileSync(p, 出.join('\n'));
try {
  YAML.parse(fs.readFileSync(p, 'utf8'));
  console.log('✅ 反抗与判定.yaml YAML 通过');
} catch (e) {
  const ln = e.linePos ? e.linePos[0].line : 0;
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  console.log('⚠ 第' + ln + '行: ' + e.message.split('\n')[0].slice(0, 50));
  console.log('   ' + (L[ln - 2] || ''));
  console.log('   ' + (L[ln - 1] || ''));
}
