// 恢复原版开场白（备份 → 当前），宏换成卡里的具体名字，补上表单占位
import fs from 'fs';
const 备份 = 'E:/Games/写卡/tavern_helper_template/_backup_欲妈群_20260921/开场白';
const 当前 = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/开场白';

// 先确认卡里用什么名字
const initvar = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/欲妈群/世界书/变量/initvar.yaml', 'utf8');
console.log('initvar 里出现「郝佳期」：' + (initvar.match(/郝佳期/g) || []).length + ' 次');
const 找名 = ['宋泽宇', '程亦', '儿子'];
for (const n of 找名) if (initvar.includes(n)) console.log('  initvar 里出现「' + n + '」：' + (initvar.match(new RegExp(n, 'g')) || []).length);
console.log('');

const 备份读 = f => fs.readFileSync(备份 + '/' + f, 'utf8');
const 现读 = f => fs.readFileSync(当前 + '/' + f, 'utf8');

for (const f of ['0.txt', '1.txt', '2.txt', '3.txt', '4.txt']) {
  let t = 备份读(f);
  const 现 = 现读(f);
  // 从现版里取出「他」的名字（现版用的是具体名）
  const 他的名 = (现.match(/(宋泽宇|程亦)/) || [])[1] || '宋泽宇';
  t = t.split('{{char}}').join('郝佳期').split('{{user}}').join(他的名);
  // 补表单占位（若备份里没有）
  if (!/<OpeningSelectUI\s*\/>/.test(t)) {
    t = t.replace(/<StatusPlaceHolderImpl\s*\/>/, '<OpeningSelectUI/>\n\n<StatusPlaceHolderImpl/>');
  }
  t = t.replace(/\s*$/, '\n');
  fs.writeFileSync(当前 + '/' + f, t, 'utf8');
  console.log('✓ ' + f + '　原版 ' + 备份读(f).length + ' → 恢复后 ' + t.length + ' 字符');
}
console.log('');
console.log('══ 恢复后 0.txt 全文 ══');
console.log(fs.readFileSync(当前 + '/0.txt', 'utf8'));
