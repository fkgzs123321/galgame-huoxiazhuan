import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const V = ROOT + '/.skills/sillytavern-render-regex-pipeline/scripts/validate-tavern-regex.mjs';
const TMP = ROOT + '/src/欲妈群/_work/tmp';

// 从卡里导出 12 条正则（打包后的真实形态）
const buf = fs.readFileSync(ROOT + '/src/欲妈群/欲妈群.png');
let p = 8, found = null;
while (p < buf.length - 8) {
  const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
  if (type === 'tEXt') {
    const d = buf.slice(p + 8, p + 8 + len); const z = d.indexOf(0);
    if (d.toString('ascii', 0, z) === 'chara') { found = d.slice(z + 1).toString('ascii'); break; }
  }
  p += 12 + len; if (type === 'IEND') break;
}
const c = JSON.parse(Buffer.from(found, 'base64').toString('utf8'));
const rs = c.data.extensions.regex_scripts;

fs.mkdirSync(TMP, { recursive: true });
let ok = 0, bad = 0;
console.log('校验【卡里】的 ' + rs.length + ' 条正则（skills 的官方校验器）：');
console.log('');
for (let i = 0; i < rs.length; i++) {
  const f = TMP + '/_reg_' + String(i).padStart(2, '0') + '.json';
  fs.writeFileSync(f, JSON.stringify(rs[i], null, 2), 'utf8');
  let out = '';
  try { out = execFileSync('node', [V, f], { encoding: 'utf8' }); } catch (e) { out = String(e.stdout || ''); }
  let j = null; try { j = JSON.parse(out); } catch (e) { }
  const 有错 = j && j.errors && j.errors.length;
  if (有错) bad++; else ok++;
  console.log('  ' + (有错 ? '❌' : '✅') + ' ' + String(rs[i].scriptName).padEnd(24) +
    (有错 ? ('\n      ' + j.errors.join('\n      ')) : (j && j.warnings && j.warnings.length ? ('（warning: ' + j.warnings.join('; ') + '）') : 'OK')));
}
console.log('');
console.log('通过 ' + ok + ' / ' + rs.length + (bad ? ('　❌ ' + bad + ' 条') : ' ✅ 全部通过'));
