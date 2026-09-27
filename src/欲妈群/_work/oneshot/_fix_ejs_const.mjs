// 全库修：EJS 段里的 const / let → var（ST 的 EJS 用 with 块，不允许词法声明）
import fs from 'fs'; import path from 'path';

function 走(d) {
  let out = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) out = out.concat(走(p));
    else if (/\.(txt|yaml|md)$/.test(f)) out.push(p);
  }
  return out;
}

const 根 = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/世界书';
let 总 = 0, 文件数 = 0;
for (const f of 走(根)) {
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let 本文件 = 0;
  // ★ 只处理 <%- ... -%> / <% ... %> 段内部
  const 新 = raw.replace(/<%[-_]?([\s\S]*?)[-_]?%>/g, (全, 体) => {
    // 先护住注释，避免把注释里的示例文字也改掉（其实改了也无害，但保持注释原意）
    const 改 = 体
      .replace(/(^|[^\w$.])(const|let)(\s+[A-Za-z_$])/g, (m, pre, kw, 后) => { 本文件++; return pre + 'var' + 后; })
      ;
    return 全.replace(体, 改);
  });
  if (本文件) {
    fs.writeFileSync(f, 新, 'utf8');
    总 += 本文件; 文件数++;
    console.log('✓ ' + path.basename(f).padEnd(34) + 本文件 + ' 处');
  }
}
console.log('\n共改 ' + 总 + ' 处 / ' + 文件数 + ' 个文件');
