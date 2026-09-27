import fs from 'fs';
const F = [
  ['世界书/[mvu_plot]玩家指令约束.txt', [
    ['## 〇、理智/欲望双轨对冲', '## 一、理智/欲望双轨对冲'],
    ['## 五、AI扮演约束', '## 四、AI扮演约束'],
  ]],
  ['世界书/[mvu_plot]高考倒计时系统.txt', [
    ['## 四、当前区间里程碑', '## 三、当前区间里程碑'],
    ['## 五、倒计时对AI的约束', '## 四、倒计时对AI的约束'],
    ['## 六、群像视角', '## 五、群像视角'],
  ]],
];
for (const [f, reps] of F) {
  let s = fs.readFileSync(f, 'utf8'); let n = 0;
  for (const [a, b] of reps) { if (s.includes(a)) { s = s.replace(a, b); n++; } else console.log('MISS ' + f + ' :: ' + a.slice(0, 14)); }
  fs.writeFileSync(f, s, 'utf8');
  console.log(f.split('/').pop() + ' 重排 ' + n + ' 处');
}
