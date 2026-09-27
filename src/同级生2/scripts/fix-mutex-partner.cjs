const fs = require('fs');
const files = [
  'src/角色卡/同级生2/世界书/变量/initvar.yaml',
  'src/角色卡/同级生2/开场白/0.txt'
];
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/互斥伙伴ID: 0\s*# 被互斥影响的伙伴 row_id，0=无/g, "互斥伙伴ID: '无'         # 被互斥影响的伙伴姓名，'无'=无");
  c = c.replace(/互斥伙伴ID: 0(\s*$)/gm, "互斥伙伴ID: '无'$1");
  fs.writeFileSync(f, c);
  console.log(f, 'OK');
}
