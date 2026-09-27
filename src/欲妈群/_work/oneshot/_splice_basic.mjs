// 把 _basic_N.md 里的「外貌」「私密」块并进对应角色的 基础信息
import fs from 'fs';
import path from 'path';

const WB = path.join(process.cwd(), '世界书');
const blocks = {};
for (const f of ['_basic_1.md', '_basic_2.md', '_basic_3.md']) {
  const txt = fs.readFileSync(f, 'utf8');
  const parts = txt.split(/^@@@ /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const head = part.slice(0, nl).trim();          // 名字|类型
    const body = part.slice(nl + 1).trim();
    const [name, kind] = head.split('|');
    blocks[`${name}|${kind}`] = body;
  }
}

let n = 0;
for (const key of Object.keys(blocks)) {
  const [name, kind] = key.split('|');
  const fp = path.join(WB, `${name}_基础信息.txt`);
  if (!fs.existsSync(fp)) { console.log('⚠ 缺文件 ' + fp); continue; }
  let s = fs.readFileSync(fp, 'utf8');
  const before = s.length;
  if (kind === '外貌') {
    const re = /^## 二、外貌[^\n]*\n[\s\S]*?(?=^## )/m;
    if (!re.test(s)) { console.log('⚠ ' + name + ' 找不到外貌段'); continue; }
    s = s.replace(re, blocks[key] + '\n\n');
  } else {
    const i = s.indexOf('## 私密档案（NSFW 静态，跨阶段恒定）');
    if (i < 0) { console.log('⚠ ' + name + ' 找不到私密段'); continue; }
    s = s.slice(0, i).replace(/\s+$/, '') + '\n\n' + blocks[key] + '\n';
  }
  fs.writeFileSync(fp, s, 'utf8');
  console.log(`✅ ${name}·${kind}  ${before} → ${s.length} 字符`);
  n++;
}
console.log('共并入 ' + n + ' 段');
