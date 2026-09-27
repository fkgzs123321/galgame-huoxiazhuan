// 真正的验证：把每个内容文件里的 EJS 代码块抽出来，用 JS 引擎试解析（能捕获语法错误）
// —— 这是「判定引擎」那个错误本该被提前抓到的地方
const fs = require('fs');
const path = require('path');
const WB = path.join(__dirname, '..', '世界书');

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

let 检查块 = 0; const 错 = [];
for (const p of 全) {
  const t = fs.readFileSync(p, 'utf8');
  // 抓所有 <% ... %>（含 <%- <%= <%#），跨行
  const re = /<%(?![=#-])?([\s\S]*?)%>/g;
  let m;
  while ((m = re.exec(t))) {
    let code = m[1];
    // 去掉 EJS 注释块 /* ... */ 的包裹（<%/* ... */%> 里是注释）
    if (/^\s*\/\*[\s\S]*\*\/\s*$/.test(code)) continue;
    检查块++;
    // 去掉 <%# 注释 与 <%== 等标记残留
    code = code.replace(/^[=#-]/, '');
    try {
      // 只做语法检查，不执行
      new Function(code);
    } catch (e) {
      const 行 = t.slice(0, m.index).split('\n').length;
      错.push([path.relative(WB, p).replace(/\\/g, '/'), 行, e.message.slice(0, 70)]);
    }
  }
}
console.log('═══ EJS 语法验证 ═══');
console.log('检查了 ' + 检查块 + ' 个 EJS 代码块（' + 全.length + ' 个文件）');
if (!错.length) console.log('✅ 全部通过 —— 没有语法错误');
else {
  console.log('❌ ' + 错.length + ' 个块有语法错误：');
  错.slice(0, 12).forEach(([f, l, m]) => console.log('   ' + f + ':' + l + '  ' + m));
}
