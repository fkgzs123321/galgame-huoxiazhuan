import fs from 'fs';

const chars = ['小夜','怜奈','林婉清','柚子','桃桃','白露','秦雨','群主','苏晴','郝佳期','铃','韩雪'];
const HAND = '手部细节';

function extractSec3(body) {
  // 逐行提取：手部行保留，其余行收集
  const handLines = [];
  const otherLines = [];
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('- **' + HAND + '**')) handLines.push(line);
    else if (t.startsWith('- **')) otherLines.push(line);
    // 其他非列表行忽略（说明性文字）
  }
  return { handLines, otherLines };
}

for (const c of chars) {
  const base = 'src/欲妈群/世界书/' + c + '_基础信息.txt';
  const nsw  = 'src/欲妈群/世界书/' + c + '_NSW档案.txt';
  if (!fs.existsSync(base) || !fs.existsSync(nsw)) { console.log(c, '文件缺失'); continue; }
  let b = fs.readFileSync(base, 'utf8');
  let n = fs.readFileSync(nsw, 'utf8');

  const sec3Match = b.match(/## 三、身体[^\n]*\n([\s\S]*?)(?=\n## 四、)/);
  if (!sec3Match) { console.log(c, '无三节'); continue; }
  const { handLines, otherLines } = extractSec3(sec3Match[1]);

  // 1. 基础信息三节 → 手部 + 指引
  const newSec3 = '## 三、身体细节（日常手部；NSFW静态外观见NSW档案）\n' +
    (handLines.length ? handLines.join('\n') + '\n' : '- （无手部细节）\n');
  b = b.replace(sec3Match[0], newSec3);

  // 2. NSW 档案：静态外观节（替换或插入）
  const nsfwBody = otherLines.join('\n');
  if (!nsfwBody) { console.log(c, '无身体行可移入'); continue; }
  const staticSec = '### 静态外观（跨阶段恒定·完整身体）\n' + nsfwBody + '\n';
  if (n.includes('### 静态外观')) {
    // 替换已有静态外观节
    n = n.replace(/### 静态外观（跨阶段恒定[^\n]*\n[\s\S]*?(?=\n### |\n## |$)/, staticSec.replace(/\n$/, ''));
  } else {
    // 在第一个 ## 身体节后插入
    const firstSec = n.match(/^(## [^\n]*\n)([\s\S]*?)(?=\n## |$)/m);
    if (firstSec) {
      n = n.replace(firstSec[0], firstSec[1] + firstSec[2] + '\n' + staticSec);
    }
  }

  fs.writeFileSync(base, b);
  fs.writeFileSync(nsw, n);
  console.log(c, '| 手部保留:', handLines.length ? 'Y' : 'N', '| 移入NSW身体项:', otherLines.length, '项');
}
