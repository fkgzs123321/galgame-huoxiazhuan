// 用法: node extract-facts.mjs 女4-赵敏 女5-孙莉
import fs from 'node:fs';

const BASE = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/source/entries/角色/';
const dirs = process.argv.slice(2);
if (!dirs.length) throw new Error('需要目录名参数');

for (const dir of dirs) {
  const name = dir.split('-')[1];
  console.log('\n\n╔═══ ' + name + ' · 档案（详细身体数据只留子键）═══');
  const lines = fs.readFileSync(BASE + dir + '.txt', 'utf8').split('\n');
  let skipping = false;
  for (const l of lines) {
    if (/^\s{2}详细身体数据:\s*$/.test(l)) {
      skipping = true;
      console.log('  [详细身体数据 · 子键]');
      continue;
    }
    if (skipping) {
      const m = l.match(/^\s{4}(\S[^:]*):\s*$/);
      if (m) {
        console.log('    · ' + m[1]);
        continue;
      }
      if (/^\s{2}\S/.test(l)) skipping = false;
      else continue;
    }
    console.log(l);
  }

  console.log('\n──── ' + name + ' · 阶段EJS（描述开头 + 对白 + 肢体 + 独有触发）────');
  const src = fs.readFileSync(BASE + dir + '/阶段EJS.txt', 'utf8');
  const blocks = src.split(/<% \} else if|<% if/).slice(1);
  for (const b of blocks) {
    const head = (b.match(/\[[^\]]*\]/) || [''])[0];
    if (!head) continue;
    const desc = b.replace(/\n/g, ' ').match(/\]\s*([^【]{20,130})/);
    const 对白 = (b.match(/【典型对白】([^\n]*)/) || [, ''])[1];
    const 肢 = (b.match(/【肢体语言】([^\n]*)/) || [, ''])[1];
    const 独 = (b.match(/【独有触发】([^\n]*)/) || [, ''])[1];
    console.log('\n' + head);
    if (desc) console.log('  描述: ' + desc[1].trim() + '…');
    if (对白) console.log('  对白: ' + 对白.trim());
    if (肢) console.log('  肢体: ' + 肢.trim());
    if (独) console.log('  独有: ' + 独.trim());
  }
}
