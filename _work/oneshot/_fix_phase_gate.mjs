import fs from 'fs';

const chars = ['小夜','怜奈','林婉清','柚子','桃桃','白露','秦雨','群主','苏晴','郝佳期','铃','韩雪'];
// 只替换"独立阶段块门控"：if (phase >= N) { （排除外层 && isProfiled）
const re = /^<% if \(phase >= (\d)\) \{ %>$/gm;
let total = 0;
for (const c of chars) {
  const f = 'src/欲妈群/世界书/' + c + '_NSW档案.txt';
  if (!fs.existsSync(f)) continue;
  let t = fs.readFileSync(f, 'utf8');
  const before = t.length;
  const m = t.match(re);
  t = t.replace(re, '<% if (phase === $1) { %>');
  fs.writeFileSync(f, t);
  const n = m ? m.length : 0;
  total += n;
  console.log(c, '| 阶段门控替换:', n, '处 |', before, '→', t.length, '字符');
}
console.log('合计替换', total, '处');
