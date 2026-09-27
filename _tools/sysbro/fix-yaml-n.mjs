// 修 `check:/n`（字面 /n 而不是换行）+ 迭代复验到 YAML 解析通过
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('E:/Games/写卡/tavern_helper_template/');
const YAML = require('yaml');

const P = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/变量/变量更新规则.yaml';
let t = fs.readFileSync(P, 'utf8');
const 前 = (t.match(/check:\/n/g) || []).length;
t = t.replace(/(\s*)check:\/n(\s+)/g, (_m, sp, sp2) => sp + 'check:\n' + sp2);
fs.writeFileSync(P, t);
console.log('修 check:/n 共 ' + 前 + ' 处\n');

for (let k = 0; k < 15; k++) {
  try {
    YAML.parse(fs.readFileSync(P, 'utf8'));
    console.log('✅ 变量更新规则.yaml YAML 解析通过');
    break;
  } catch (e) {
    const m = e.message.match(/line (\d+)/);
    const n = m ? Number(m[1]) : 0;
    const L = fs.readFileSync(P, 'utf8').split('\n');
    console.log('✗ 第 ' + n + ' 行: ' + e.message.split('\n')[0].slice(0, 70));
    if (n) console.log('    ' + JSON.stringify((L[n - 1] || '').slice(0, 120)));
    break;
  }
}
