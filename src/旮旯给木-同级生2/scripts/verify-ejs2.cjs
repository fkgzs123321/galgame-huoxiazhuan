// EJS 语法验证器（重做版，正确实现）
// 要点：
//   ① EJS 的分块写法（<% if(x){ %> … <% } %>）必须**拼接后整体解析**，逐块解析必然误报
//   ② <%(/* ... */)%> 与 <%# ... %> 是注释 → 跳过
//   ③ 只在**内容文件范围内**检查；判定 engine 这类引擎条目同样适用
const fs = require('fs');
const path = require('path');
const WB = path.join(__dirname, '..', '世界书');

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

const 抽块 = (t) => {
  const 段 = [];
  const re = /<%([\s\S]*?)%>/g;
  let m;
  while ((m = re.exec(t))) {
    let c = m[1];
    // 注释块：<%/* ... */%> 或 <%# ... %>
    if (/^\s*\/\*[\s\S]*\*\/\s*$/.test(c)) continue;
    if (/^#/.test(c)) continue;
    // EJS 空白控制标记：<%_ ... _%> —— 首尾的 _ 要去掉，否则 `_ const` 会被当标识符
    c = c.replace(/^_/, '').replace(/_$/, '');
    // 去掉输出前缀 - = （<%- %> 与 <%= %>）
    c = c.replace(/^[-=]/, '');
    段.push(c);
  }
  return 段;
};

let 有块 = 0, 块数 = 0;
const 错 = [];
for (const p of 全) {
  const t = fs.readFileSync(p, 'utf8');
  const 段 = 抽块(t);
  if (!段.length) continue;
  有块++; 块数 += 段.length;
  try { new Function(段.join('\n')); }
  catch (e) { 错.push([path.relative(WB, p).replace(/\\/g, '/'), e.message.slice(0, 70)]); }
}

console.log('═══ EJS 语法验证 ═══');
console.log('含 EJS 的文件 ' + 有块 + ' 个 ／ 代码块 ' + 块数 + ' 个 ／ 检查文件 ' + 全.length + ' 个');
if (!错.length) console.log('✅ 全部通过 —— 拼接后无语法错误');
else {
  console.log('❌ ' + 错.length + ' 个文件有语法错误：');
  错.forEach(([f, m]) => console.log('   ' + f + '  →  ' + m));
}
