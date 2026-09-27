// fix_html_comments_v2.mjs - 简化版：只识别字符串和注释，把所有 // 单行注释转为 /* */ 块注释
import fs from 'fs';

const HTML_PATH = 'e:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html';
const html = fs.readFileSync(HTML_PATH, 'utf-8');

const scriptRe = /<script>([\s\S]*?)<\/script>/g;
let modified = html;
let totalReplaced = 0;

modified = modified.replace(scriptRe, (full, jsContent) => {
  const out = [];
  let i = 0;
  const s = jsContent;
  const n = s.length;
  while (i < n) {
    const ch = s[i];
    const next = s[i + 1];

    // 块注释 /* ... */ 整段保留
    if (ch === '/' && next === '*') {
      const end = s.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out.push(s.slice(i, stop));
      i = stop;
      continue;
    }

    // 单行注释 // -> 转为 /* */
    if (ch === '/' && next === '/') {
      let end = s.indexOf('\n', i + 2);
      if (end === -1) end = n;
      const commentBody = s.slice(i + 2, end);
      // 把注释体里的 */ 转义成 *\/ 避免提前结束块注释
      const safeBody = commentBody.replace(/\*\//g, '*\\/');
      out.push('/*' + safeBody + '*/');
      totalReplaced++;
      i = end;
      continue;
    }

    // 字符串 "..." 跳过（处理转义）
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === quote) { j++; break; }
        // 字符串不能跨行（标准JS）
        if (s[j] === '\n') { j++; break; }
        j++;
      }
      out.push(s.slice(i, j));
      i = j;
      continue;
    }

    // 模板字符串 `...` 跳过
    if (ch === '`') {
      let j = i + 1;
      while (j < n) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '`') { j++; break; }
        j++;
      }
      out.push(s.slice(i, j));
      i = j;
      continue;
    }

    // 普通字符
    out.push(ch);
    i++;
  }
  return '<script>' + out.join('') + '</script>';
});

fs.writeFileSync(HTML_PATH, modified, 'utf-8');
console.log('Done. Replaced', totalReplaced, 'single-line comments to block comments.');
