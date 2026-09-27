import { readFileSync } from 'fs';

const html = readFileSync('src/欲妈群/正则/状态栏.html', 'utf8');
const lines = html.split('\n');
const line190 = lines[189]; // 0-indexed

console.log('Line 190 length:', line190.length);

// 找出所有 /* 和 */ 的位置
const blockCommentStarts = [];
const blockCommentEnds = [];
for (let i = 0; i < line190.length - 1; i++) {
  if (line190[i] === '/' && line190[i+1] === '*') {
    blockCommentStarts.push(i);
  }
  if (line190[i] === '*' && line190[i+1] === '/') {
    blockCommentEnds.push(i);
  }
}

console.log('\n/* positions (count=' + blockCommentStarts.length + '):');
blockCommentStarts.forEach((pos, idx) => {
  const ctx = line190.substring(Math.max(0, pos - 30), Math.min(line190.length, pos + 60));
  console.log(`  [${idx}] pos=${pos}: ...${ctx}...`);
});

console.log('\n*/ positions (count=' + blockCommentEnds.length + '):');
blockCommentEnds.forEach((pos, idx) => {
  const ctx = line190.substring(Math.max(0, pos - 40), Math.min(line190.length, pos + 10));
  console.log(`  [${idx}] pos=${pos}: ...${ctx}...`);
});
