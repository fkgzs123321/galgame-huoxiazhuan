// fix_html_comments_v3.mjs - 修复方案：
// 1. 先撤销 v1 脚本的破坏：把超长块注释 /* ... */ 拆开，恢复原代码
// 2. 然后正确处理所有 // 单行注释：把 // xxx 转为 /* xxx */，注释范围到下一个 // 或 \n 或字符串末尾（取最早者）
import fs from 'fs';

const HTML_PATH = 'e:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html';
let html = fs.readFileSync(HTML_PATH, 'utf-8');

// === Step 1: 撤销 v1 脚本的破坏 ===
// v1 脚本把 // 注释及其后所有内容包成 /* ... */ 块注释。
// 我们找到所有 /* ... */ 块注释，如果内容里包含 // 或 var/function 等代码，说明是错误包装的。
// 把它们恢复为：/* 注释内容 */ + 代码
// 简化：直接把所有 /* ... */ 块注释中的 // xxx 模式找出来，重新切分。

const scriptRe = /<script>([\s\S]*?)<\/script>/g;
let totalFixed = 0;

html = html.replace(scriptRe, (full, jsContent) => {
  const out = [];
  let i = 0;
  const s = jsContent;
  const n = s.length;

  while (i < n) {
    const ch = s[i];
    const next = s[i + 1];

    // 块注释 /* ... */
    if (ch === '/' && next === '*') {
      const end = s.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      const blockBody = s.slice(i + 2, end === -1 ? n : end);

      // 检查块注释内是否有 // 单行注释（说明是 v1 错误包装的）
      const hasLineComment = blockBody.indexOf('//') !== -1;

      if (hasLineComment) {
        // 拆开：每个 // xxx 是一个独立块注释，代码部分要保留
        // 简化处理：把整个块注释内容当作"代码 + 注释"序列重新解析
        // 找到所有 // 位置，切分成段
        const segments = [];
        let pos = 0;
        while (pos < blockBody.length) {
          const lineCommentIdx = blockBody.indexOf('//', pos);
          if (lineCommentIdx === -1) {
            segments.push({ type: 'code', content: blockBody.slice(pos) });
            break;
          }
          if (lineCommentIdx > pos) {
            segments.push({ type: 'code', content: blockBody.slice(pos, lineCommentIdx) });
          }
          // 找 // 注释结束位置：下一个 // 或字符串末尾
          let nextLineComment = blockBody.indexOf('//', lineCommentIdx + 2);
          let commentEnd = nextLineComment === -1 ? blockBody.length : nextLineComment;
          // 注意：原 // 注释范围应该是到行尾（\n），但 v1 脚本没有保留 \n
          // 所以这里我们假设 // 注释范围是到下一个 // 或字符串末尾
          const commentContent = blockBody.slice(lineCommentIdx + 2, commentEnd);
          segments.push({ type: 'comment', content: commentContent });
          pos = commentEnd;
        }

        // 重新生成：注释段 -> /* */，代码段 -> 保留
        const rebuilt = [];
        for (const seg of segments) {
          if (seg.type === 'comment') {
            const safeContent = seg.content.replace(/\*\//g, '*\\/');
            rebuilt.push('/*' + safeContent + '*/');
            totalFixed++;
          } else {
            rebuilt.push(seg.content);
          }
        }
        out.push(rebuilt.join(''));
      } else {
        // 正常块注释，原样保留
        out.push(s.slice(i, stop));
      }
      i = stop;
      continue;
    }

    // 单行注释 // -> 转为 /* */（注释范围到下一个 // 或 \n 或字符串末尾）
    if (ch === '/' && next === '/') {
      // 找注释结束位置：下一个 // 或 \n 或字符串末尾（取最早者）
      const nextLineComment = s.indexOf('//', i + 2);
      const nextNewline = s.indexOf('\n', i + 2);
      let end = n;
      if (nextLineComment !== -1) end = Math.min(end, nextLineComment);
      if (nextNewline !== -1) end = Math.min(end, nextNewline);

      const commentBody = s.slice(i + 2, end);
      const safeBody = commentBody.replace(/\*\//g, '*\\/');
      out.push('/*' + safeBody + '*/');
      totalFixed++;
      i = end;
      continue;
    }

    // 字符串 "..." 跳过
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === quote) { j++; break; }
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

fs.writeFileSync(HTML_PATH, html, 'utf-8');
console.log('Done. Fixed', totalFixed, 'comments.');
