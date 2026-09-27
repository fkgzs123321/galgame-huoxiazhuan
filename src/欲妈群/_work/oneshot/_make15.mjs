// ★ 15 个开局：3 难度 × 5 场景，各带自己的 initvar（难度写在变量里，不用面板写）
import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const 场 = ['0.txt', '1.txt', '2.txt', '3.txt', '4.txt'];
const 难 = ['普通', '困难', '地狱'];

// 现有 initvar：默认 + 1~4（对应场景 1~5）
const 份 = [
  '世界书/变量/initvar.yaml',        // 场景1
  '开场白/initvar/1.yaml',           // 场景2
  '开场白/initvar/2.yaml',           // 场景3
  '开场白/initvar/3.yaml',           // 场景4
  '开场白/initvar/4.yaml',           // 场景5
];

// 读一份基准 initvar，改难度的写法
function 改难度(text, 新难) {
  if (/难度: (普通|困难|地狱)/.test(text)) {
    return text.replace(/难度: (普通|困难|地狱)/, '难度: ' + 新难);
  }
  if (/难度:/.test(text)) return text.replace(/难度:.*/, '难度: ' + 新难);
  // 没有就在 元数据 段里插一行
  return text.replace(/(元数据:[ \t]*\r?\n)/, '$1' + '  难度: ' + 新难 + '\n');
}

let 建 = 0;
// swipe 顺序：0~4 普通，5~9 困难，10~14 地狱
for (let d = 0; d < 3; d++) {
  for (let s = 0; s < 5; s++) {
    const idx = d * 5 + s;               // swipe_id
    const 正文 = fs.readFileSync(CARD + '/开场白/' + 场[s], 'utf8');
    // 写开场白正文（同名复制，只有 initvar 不同）
    fs.writeFileSync(CARD + '/开场白/' + idx + '.txt', 正文, 'utf8');
    // 写 initvar（0 号用默认那份，其余各建一份）
    if (idx === 0) continue;             // swipe 0 用 世界书/变量/initvar.yaml
    const 基准 = fs.readFileSync(CARD + '/' + 份[s], 'utf8');
    const out = 改难度(基准, 难[d]);
    fs.mkdirSync(CARD + '/开场白/initvar', { recursive: true });
    fs.writeFileSync(CARD + '/开场白/initvar/' + idx + '.yaml', out, 'utf8');
    建++;
  }
}
console.log('✓ 生成 15 条开场白（0~14.txt）');
console.log('✓ 生成 ' + 建 + ' 份 initvar（1~14.yaml，0 号用 世界书/变量/initvar.yaml）');
console.log('');
console.log('══ 映射表（swipe_id = 难度序 × 5 + 场景序）══');
let k = 0;
for (let d = 0; d < 3; d++) for (let s = 0; s < 5; s++) {
  const f = CARD + '/开场白/initvar/' + (d * 5 + s) + '.yaml';
  const src = d * 5 + s === 0 ? CARD + '/世界书/变量/initvar.yaml' : f;
  const t = fs.readFileSync(src, 'utf8');
  const m = t.match(/难度: (普通|困难|地狱)/);
  console.log('  swipe ' + String(k).padStart(2) + ' → ' + 难[d] + ' × 场景' + (s + 1) + '　initvar 里难度=' + (m ? m[1] : '？（缺失）'));
  k++;
}
