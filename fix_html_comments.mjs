// fix_html_comments.mjs - 把 HTML <script> 内的单行注释 // 替换为块注释 /* */，
// 避免压缩到一行的 JS 因 // 注释导致后续代码全部被吞掉。
// 跳过字符串字面量、模板字符串、正则表达式中的 //
import fs from 'fs';

const HTML_PATH = 'e:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html';

const html = fs.readFileSync(HTML_PATH, 'utf-8');

// 匹配 <script>...</script>（非贪婪）
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
      // 找到本注释结束位置：到下一个 \n 或字符串末尾
      let end = s.indexOf('\n', i + 2);
      if (end === -1) end = n;
      // 注释内容（不含换行符）
      const commentBody = s.slice(i + 2, end);
      // 检查块注释是否包含 */，如果有要转义
      const safeBody = commentBody.replace(/\*\//g, '*\\/'); // 不能出现 */
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
        j++;
      }
      out.push(s.slice(i, j));
      i = j;
      continue;
    }

    // 模板字符串 `...` 跳过（简化处理，不处理 ${} 内嵌表达式）
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

    // 正则表达式 /.../flags 简化识别：
    // 出现在 =, (, ,, !, &, |, ;, :, [, {, return, typeof 等之后
    // 避免误识别除法 a / b
    if (ch === '/' && next !== '/' && next !== '*') {
      // 看前一个非空白字符
      let k = out.length - 1;
      let prevCh = '';
      while (k >= 0) {
        const c = out[k];
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { k--; continue; }
        // 取最后一个字符
        prevCh = c[c.length - 1] || '';
        break;
      }
      const regexPrevChars = new Set(['=', '(', ',', '!', '&', '|', ';', ':', '[', '{', '?', '+', '-', '*', '/', '%', '~', '^', '<', '>']);
      const regexPrevWords = ['return', 'typeof', 'in', 'of', 'instanceof', 'new', 'delete', 'void', 'case', 'do', 'else'];
      let isRegex = regexPrevChars.has(prevCh);
      if (!isRegex) {
        // 检查前一个 word
        const tail = out.join('').slice(-30);
        for (const w of regexPrevWords) {
          if (tail.endsWith(w)) { isRegex = true; break; }
        }
      }
      if (isRegex) {
        // 找正则结束位置
        let j = i + 1;
        let inClass = false; // 字符类 [..]
        while (j < n) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s[j] === '[') inClass = true;
          else if (s[j] === ']') inClass = false;
          else if (s[j] === '/' && !inClass) {
            j++;
            // 吃掉 flags
            while (j < n && /[gimsuyd]/.test(s[j])) j++;
            break;
          }
          else if (s[j] === '\n') break;
          j++;
        }
        out.push(s.slice(i, j));
        i = j;
        continue;
      }
    }

    // 普通字符
    out.push(ch);
    i++;
  }
  return '<script>' + out.join('') + '</script>';
});

fs.writeFileSync(HTML_PATH, modified, 'utf-8');
console.log('Done. Replaced', totalReplaced, 'single-line comments to block comments.');
