import fs from 'fs';
import path from 'path';
const BAN_HEAD = fs.readFileSync('.skills/tavern-cards/references/contents-creation/presentation-styles.md','utf8');
const BAN = BAN_HEAD.split('\n').slice(1).join('\n').split('## 〇')[0].replace(/^#.*\n/,'').trim();
// 1) 冷冽文风文件加横幅
const f = '.skills/tavern-cards/references/contents-creation/presentation-style-01-冷冽.md';
let s = fs.readFileSync(f,'utf8');
if (!s.includes('全局硬禁：严禁用')) {
  const i = s.indexOf('\n');
  s = s.slice(0, i+1) + '\n' + BAN + '\n' + s.slice(i+1);
  fs.writeFileSync(f, s, 'utf8');
  console.log('✅ 写入 presentation-style-01-冷冽.md');
}
// 2) 五选一 → 四选一
const ps = '.skills/tavern-cards/references/contents-creation/presentation-styles.md';
let p = fs.readFileSync(ps,'utf8');
p = p.replace('3. **`style-` 只在「按需加载」里选一种** —— 五选一（或选白描）。',
  '3. **`style-` 只在「按需加载」里选一种** —— **四选一**（无尽骚妈 / 母猪 / 少妇白洁 / 阶段性反差）。\n   ★ **「冷冽」与「白描」已全局禁用**，不许再选（见本节顶部硬禁）。');
p = p.replace('（淫视 / 骚妈 / 母猪 / 冷冽 / 白洁 / 反差）', '（淫视 / 骚妈 / 母猪 / 白洁 / 反差；**冷冽已禁用**）');
fs.writeFileSync(ps, p, 'utf8');
console.log('✅ 更新选择条目');
// 3) 同步 _tc_repo
let n=0;
for (const rel of ['contents-creation/presentation-style-01-冷冽.md','contents-creation/presentation-styles.md']) {
  const a = path.join('.skills/tavern-cards/references', rel), b = path.join('_tc_repo/tavern-cards/references', rel);
  if (fs.existsSync(a)) { fs.mkdirSync(path.dirname(b),{recursive:true}); fs.copyFileSync(a,b); n++; }
}
console.log('同步 '+n+' 个文件');
