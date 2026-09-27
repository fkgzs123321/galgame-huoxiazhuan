// 修 EJS 注释块里的敏感字符
// 根因：EJS 注释 `<%/* ... */%>` 的正文里如果出现 `%>`，会**提前终止 EJS 块**，
//       后续文本被当代码解析 → 报「Invalid or unexpected token」/「Unexpected token」
// 修法：注释块正文里的 `%>` / `<%` 改成安全写法（注释只是给人看的）
const fs = require('fs');
const path = require('path');
const WB = path.join(__dirname, '..', '世界书');

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

let 改 = 0; const 详情 = [];
for (const p of 全) {
  let t = fs.readFileSync(p, 'utf8');
  const 原 = t;
  // 逐个找出 <%/* ... */%> 注释块，把正文里的 %> / <% 清掉
  t = t.replace(/<%(\/\*[\s\S]*?\*\/)%>/g, (m, body) => {
    if (!/%>|<%/.test(body)) return m;
    const 清 = body.replace(/%>/g, '％>').replace(/<%/g, '<％');
    详情.push(path.basename(p));
    return '<%' + 清 + '%>';
  });
  if (t !== 原) { fs.writeFileSync(p, t); 改++; }
}
console.log('① 清理 EJS 注释块里的敏感字符：' + 改 + ' 个文件' + (详情.length ? '（' + [...new Set(详情)].join(', ') + '）' : ''));

// ② 重跑验证器
const { execFileSync } = require('child_process');
try {
  console.log(execFileSync('node', [path.join(__dirname, 'verify-ejs2.cjs')], { encoding: 'utf8' }).trim());
} catch (e) { console.log(String(e.stdout || e.message).trim()); }

// ③ 同时确认 YAML 侧没被影响
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
let ok = 0; const bad = [];
for (const p of 全) if (/\.yaml$/.test(p)) { try { YAML.parse(fs.readFileSync(p, 'utf8')); ok++; } catch { bad.push(path.basename(p)); } }
console.log('③ YAML 可解析 ' + ok + '/' + 全.filter(p => /\.yaml$/.test(p)).length);
