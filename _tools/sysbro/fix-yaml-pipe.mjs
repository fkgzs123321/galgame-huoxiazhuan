// 修 `type: 'A'|'B'|'C'` —— YAML 把引号后的 | 当成块标量头（Unexpected block-scalar-header）
//   改成不带引号的 `A | B | C`（| 不在首位时是普通字符）
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('E:/Games/写卡/tavern_helper_template/');
const YAML = require('yaml');

const P = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/变量/变量更新规则.yaml';
const L = fs.readFileSync(P, 'utf8').split('\n');
let n = 0;
for (let i = 0; i < L.length; i++) {
  const m = L[i].match(/^(\s*type:\s*)(.+)$/);
  if (!m) continue;
  if (!m[2].includes('|')) continue;
  // 去掉每一项外面的单引号，统一成 A | B | C
  const 新 = m[2]
    .split('|')
    .map((x) => x.trim().replace(/^'|'$/g, ''))
    .join(' | ');
  L[i] = m[1] + 新;
  n++;
}
fs.writeFileSync(P, L.join('\n'));
console.log('改了', n, '行 type');

// 复验
try { YAML.parse(fs.readFileSync(P, 'utf8')); console.log('✅ 变量更新规则.yaml 现在能被 YAML 解析'); }
catch (e) { console.log('✗ 仍有错 → ' + e.message.split('\n')[0].slice(0, 80)); }
