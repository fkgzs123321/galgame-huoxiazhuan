// 修复 12 份 剧情线.yaml 的 EJS 语法错误：
//   生成脚本写成了  <%_ else if (...) { _%>   ← 少了闭合上一段 `if (...) {` 的 `}`
//   正确写法       <%_ } else if (...) { _%>
// 成因：EJS 把代码块拼接后整体编译，`if (x) {\n else if (y) {` 是非法 JS → Unexpected token 'else'
const fs = require('fs');
const path = require('path');

const 根 = path.join(__dirname, '..', '世界书');
const 目标 = [];
(function w(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) w(p);
    else if (/\.(yaml|txt)$/.test(f)) 目标.push(p);
  }
})(根);

let 改 = 0;
const 明细 = [];
for (const p of 目标) {
  const 原 = fs.readFileSync(p, 'utf8');
  // 只替换「块首的 else if」——即 <%(下划线空格)else if，前面没有 }
  const 新 = 原.replace(/<%_\s+else\s+if\b/g, '<%_ } else if');
  if (新 !== 原) {
    const n = (原.match(/<%_\s+else\s+if\b/g) || []).length;
    fs.writeFileSync(p, 新, 'utf8');
    改++;
    明细.push([path.relative(根, p).replace(/\\/g, '/'), n]);
  }
}
console.log('═══ 修复 <%_ else if → <%_ } else if ═══');
console.log('改动文件 ' + 改 + ' 个');
明细.forEach(([f, n]) => console.log('   ' + f + '  ×' + n));
