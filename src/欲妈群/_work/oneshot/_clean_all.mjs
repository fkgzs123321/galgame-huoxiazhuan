import fs from 'fs';
const FILES = [
  '_work/data/_basic_data.mjs', '_work/data/_basic_data_2.mjs', '_work/data/_basic_data_3.mjs',
  '_work/data/_smell.mjs', '_work/tmp/_patch_priv.json', '_work/tmp/_patch_orgasm.json',
  '世界书/郝佳期_基础信息.txt',
];
for (const f of FILES) {
  if (!fs.existsSync(f)) { console.log('缺 ' + f); continue; }
  let s = fs.readFileSync(f, 'utf8');
  const b = s;
  // ① 破折号 → 该断句的断句，该逗号的就逗号
  s = s.replace(/——(?=[她他它这那不无很就才])/g, '。').replace(/——/g, '，');
  // ② 加粗
  s = s.replace(/\*\*/g, '');
  // ③ 模糊词给具体说法
  s = s.replace(/几乎没味/g, '尝不出味').replace(/几乎不返味/g, '返不出味')
       .replace(/几乎不上妆/g, '从不上妆').replace(/几乎没有/g, '没有')
       .replace(/几乎不/g, '不').replace(/几乎/g, '')
       .replace(/似乎/g, '').replace(/仿佛/g, '').replace(/如同/g, '').replace(/宛如/g, '');
  // ④ 四禁句式
  s = s.replace(/她觉得那是在完成一个仪式/g, '那是她给自己定下的仪式')
       .replace(/她觉得/g, '').replace(/她不知道/g, '').replace(/她经常/g, '').replace(/她喜欢/g, '');
  if (s !== b) { fs.writeFileSync(f, s, 'utf8'); console.log('✓ ' + f); }
}
// 复核
let d = 0, st = 0, v = 0, four = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  d += (s.match(/——/g) || []).length; st += (s.match(/\*\*/g) || []).length;
  v += ['似乎', '几乎', '仿佛', '如同', '宛如'].reduce((n, t) => n + (s.split(t).length - 1), 0);
  four += ['她觉得', '她不知道', '她经常', '她喜欢'].reduce((n, t) => n + (s.split(t).length - 1), 0);
}
console.log('源文件残留：破折号' + d + ' 星号' + st + ' 模糊词' + v + ' 四禁' + four);
