import fs from 'node:fs';
const R = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/角色/';
const 修 = [
  ['陈雪华/多阶段.txt', "p === '顺从期'", "p === '绑定瞬间'"],
  ['陈雪华/多阶段.txt', "p === '依赖期'", "p === '绑定深化'"],
  ['郑秀/多阶段.txt', "p === '家族play期'", "p === '绑定瞬间'"],
  ['沈梦瑶/多阶段.txt', "p === '被接近期'", "p === '刚被控制'"],
];
for (const [f, a, b] of 修) {
  const p = R + f;
  const s = fs.readFileSync(p, 'utf8');
  if (!s.includes(a)) { console.log('未命中', f, a); continue; }
  fs.writeFileSync(p, s.split(a).join(b));
  console.log('改', f, '|', a, '→', b);
}
