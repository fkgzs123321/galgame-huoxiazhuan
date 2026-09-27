/**
 * 调试 EJS 解析(找出哪个<%没有匹配的%>)
 */
import ejs from 'ejs';
import fs from 'fs';

const src = fs.readFileSync('debug-expanded.txt', 'utf8');

// 复制 ejs 内部 regex (无 g flag,与 ejs.js 实际行为一致)
const _REGEX_STRING = '(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)';
const pat = new RegExp(_REGEX_STRING);

function parseTemplateText(str) {
  let result = pat.exec(str);
  const arr = [];
  let firstPos;
  while (result) {
    firstPos = result.index;
    if (firstPos !== 0) {
      arr.push(str.substring(0, firstPos));
      str = str.slice(firstPos);
    }
    arr.push(result[0]);
    str = str.slice(result[0].length);
    result = pat.exec(str);
  }
  if (str) arr.push(str);
  return arr;
}

const matches = parseTemplateText(src);
console.log('总 matches 数:', matches.length);

// 复制 generateSource 中的检查
const d = '%';
const o = '<';
const c = '>';
let failIdx = -1;
let failLine = null;
for (let i = 0; i < matches.length; i++) {
  const line = matches[i];
  if (
    line.indexOf(o + d) === 0 &&
    line.indexOf(o + d + d) !== 0
  ) {
    const closing = matches[i + 2];
    if (!(closing == d + c || closing == '-' + d + c || closing == '_' + d + c)) {
      failIdx = i;
      failLine = line;
      break;
    }
  }
}

if (failIdx >= 0) {
  console.log('失败位置:');
  console.log('  index:', failIdx);
  console.log('  line:', JSON.stringify(failLine).slice(0, 200));
  console.log('  matches[i+1]:', JSON.stringify(matches[failIdx + 1]?.slice(0, 200)));
  console.log('  matches[i+2] (closing):', JSON.stringify(matches[failIdx + 2]?.slice(0, 200)));
  // 计算源码字符位置
  let pos = 0;
  for (let j = 0; j < failIdx; j++) pos += matches[j].length;
  console.log('  源码字符位置:', pos);
  console.log('  上下文(前 200 字符):');
  console.log(src.slice(Math.max(0, pos - 200), pos));
  console.log('--- 失败点 ---');
  console.log(src.slice(pos, pos + 300));
} else {
  console.log('未发现失败');
}
