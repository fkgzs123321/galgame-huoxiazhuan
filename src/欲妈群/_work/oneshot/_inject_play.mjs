// 把「这一档的戏」注入已写好的 _data_<uid>.mjs（插在每档 can: [ 之前）
import fs from 'fs';
import { pathToFileURL } from 'url';

const PLAY = (await import(pathToFileURL(process.cwd() + '/_play_1.mjs').href)).default;

const FILES = {
  郝佳期: '_data_hao_jiaqi.mjs', 韩雪: '_data_han_xue.mjs', 铃: '_data_ling.mjs',
  苏晴: '_data_su_qing.mjs', 桃桃: '_data_tao_tao.mjs', 柚子: '_data_you_zi.mjs',
  秦雨: '_data_qin_yu.mjs', 苏媚: '_data_su_mei.mjs',
};

function arrLines(items, indent) {
  const pad = ' '.repeat(indent);
  return 'play: [\n' + items.map(t => pad + "  '" + t.replace(/'/g, "\\'") + "',").join('\n') + '\n' + pad + '],';
}

for (const [name, file] of Object.entries(FILES)) {
  const plays = PLAY[name];
  if (!plays) { console.log('⚠ 无 play 数据：' + name); continue; }
  let s = fs.readFileSync(file, 'utf8');
  // 重复运行保护
  if (s.includes('play: [')) { console.log('跳过（已有 play）' + name); continue; }
  let idx = 0;
  s = s.replace(/^(      )can: \[$/gm, (m, sp) => {
    const items = plays[idx++];
    if (!items) return m;
    return '      ' + arrLines(items, 6) + '\n' + m;
  });
  fs.writeFileSync(file, s, 'utf8');
  console.log(`✅ ${name}｜注入 ${idx} 档的戏`);
}
