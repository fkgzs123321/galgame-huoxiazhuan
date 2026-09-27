/**
 * 算一笔账：素材能不能进卡。
 */
import fs from 'node:fs';
import path from 'node:path';

const 根 = 'src/活侠传';

function 量(d: string) {
  let n = 0;
  let 字 = 0;
  const 走 = (p: string) => {
    for (const f of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, f.name);
      if (f.isDirectory()) 走(fp);
      else if (/\.(md|txt|yaml|json)$/i.test(f.name)) {
        n++;
        字 += fs.readFileSync(fp, 'utf8').length;
      }
    }
  };
  走(d);
  return { n, 字 };
}

// 中文大致 1.5 字/token（保守估计）
const 到token = (字: number) => Math.round(字 / 1.5);

console.log('══ 各方体量（字符 → 估算 token）══\n');

const 各组: Array<[string, string]> = [
  ['卡内：世界书', 根 + '/世界书'],
  ['卡内：开场白', 根 + '/开场白'],
  ['素材：wiki 全部', 根 + '/source/_raw/wiki'],
  ['素材：wiki/event（剧情）', 根 + '/source/_raw/wiki/event'],
  ['素材：wiki/people（人物）', 根 + '/source/_raw/wiki/people'],
  ['素材：原作数据表', 根 + '/source/原作数据表'],
];

let 卡总 = 0;
for (const [名, p] of 各组) {
  if (!fs.existsSync(p)) continue;
  const { n, 字 } = 量(p);
  if (名.startsWith('卡内')) 卡总 += 字;
  console.log(`  ${名.padEnd(26)} ${String(n).padStart(4)} 文件  ${(字 / 1024).toFixed(0).padStart(6)} KB  ≈ ${到token(字).toLocaleString().padStart(9)} token`);
}

console.log('\n' + '─'.repeat(70));
console.log('  上下文窗口对照：');
for (const w of [32, 128, 200]) {
  console.log(`    ${String(w).padStart(3)}K 窗口 = ${(w * 1024).toLocaleString()} token`);
}

const wiki = 量(根 + '/source/_raw/wiki');
const event = 量(根 + '/source/_raw/wiki/event');
console.log('\n' + '─'.repeat(70));
console.log('  结论：');
console.log(`    wiki 全量 ≈ ${到token(wiki.字).toLocaleString()} token`);
console.log(`    → 占 200K 窗口的 ${(到token(wiki.字) / (200 * 1024) * 100).toFixed(1)}%`);
console.log(`    → 光剧情 event 就 ${到token(event.字).toLocaleString()} token，占 200K 的 ${(到token(event.字) / (200 * 1024) * 100).toFixed(1)}%`);
console.log(`    卡总量 ≈ ${到token(卡总).toLocaleString()} token，占 200K 的 ${(到token(卡总) / (200 * 1024) * 100).toFixed(1)}%`);
