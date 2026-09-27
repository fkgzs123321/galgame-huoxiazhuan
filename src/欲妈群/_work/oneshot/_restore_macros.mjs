// 开场白：把我写死的名字还原成 {{char}} / {{user}} 宏
import fs from 'fs';
const D = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/开场白';
let n = 0;
for (const f of ['0.txt', '1.txt', '2.txt', '3.txt', '4.txt']) {
  const p = D + '/' + f;
  const raw = fs.readFileSync(p, 'utf8');
  const 前 = (raw.match(/郝佳期/g) || []).length;
  const 前2 = (raw.match(/宋泽宇/g) || []).length;
  let t = raw.split('郝佳期').join('{{char}}').split('宋泽宇').join('{{user}}');
  fs.writeFileSync(p, t, 'utf8');
  n += 前 + 前2;
  const 后 = (t.match(/\{\{char\}\}/g) || []).length;
  const 后2 = (t.match(/\{\{user\}\}/g) || []).length;
  console.log('✓ ' + f + '　郝佳期→{{char}} ' + 前 + ' 处｜宋泽宇→{{user}} ' + 前2 + ' 处　（现 {{char}} ' + 后 + '／{{user}} ' + 后2 + '）');
}
console.log('\n共还原 ' + n + ' 处');
console.log('');
console.log('══ 0.txt 前 3 行确认 ══');
console.log(fs.readFileSync(D + '/0.txt', 'utf8').split('\n').slice(0, 3).join('\n'));
