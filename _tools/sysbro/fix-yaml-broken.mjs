// 修被 bash 转义弄坏的 YAML 记法 + 迭代复验
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('E:/Games/写卡/tavern_helper_template/');
const YAML = require('yaml');

const P = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/变量/变量更新规则.yaml';
let t = fs.readFileSync(P, 'utf8');

const 修 = [
  [/type:\s+\|\s+-/g, 'type: |-'],       // 块标量头被拆开
  [/type:\s+\|\s+>/g, 'type: |'],
  [/\|\s+-\s*\r?\n/g, '|-\n'],
  [/check:\s*\/n/g, 'check:\n          '],
];
for (const [re, to] of 修) {
  const n = (t.match(re) || []).length;
  if (n) { t = t.replace(re, to); console.log('修 ' + re.source + ' → ' + n + ' 处'); }
}
fs.writeFileSync(P, t);

for (let k = 0; k < 20; k++) {
  try {
    YAML.parse(fs.readFileSync(P, 'utf8'));
    console.log('\n✅ 变量更新规则.yaml YAML 解析通过');
    break;
  } catch (e) {
    const m = e.message.match(/line (\d+)/);
    const n = m ? Number(m[1]) : 0;
    const L = fs.readFileSync(P, 'utf8').split('\n');
    console.log('\n✗ 第 ' + n + ' 行: ' + e.message.split('\n')[0].slice(0, 70));
    if (n) console.log('    ' + JSON.stringify((L[n - 1] || '').slice(0, 120)));
    break;
  }
}
