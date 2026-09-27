import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const V = ROOT + '/.skills/sillytavern-render-regex-pipeline/scripts/validate-tavern-regex.mjs';
const D = ROOT + '/src/欲妈群/正则';

const 文件 = fs.readdirSync(D).filter(f => f.endsWith('.json'));
let ok = 0, bad = 0;
for (const f of 文件) {
  const p = path.join(D, f);
  let out = '', code = 0;
  try {
    out = execFileSync('node', [V, p], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); code = e.status || 1; }
  const 通过 = code === 0;
  if (通过) ok++; else bad++;
  console.log('  ' + (通过 ? '✅' : '❌') + ' ' + f.replace('.json', '').padEnd(26) + (通过 ? 'OK' : ('\n      ' + out.split('\n').filter(Boolean).slice(0, 3).join('\n      '))));
}
console.log('');
console.log('通过 ' + ok + ' / ' + 文件.length + (bad ? ('　❌ ' + bad + ' 条有问题') : ' ✅ 全部通过'));
