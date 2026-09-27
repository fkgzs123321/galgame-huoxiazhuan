// push-ui.cjs：推送到远端时剥掉首尾的 ``` 围栏（围栏只该出现在卡里的 loader 那一层）
import fs from 'fs';
const F = 'scripts/push-ui.cjs';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;

// ① 把「原样复制」改成「复制并剥掉首尾围栏」
const a = `const dest = path.join(TARGET.PUSH, TARGET.SUB);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(源, dest);
console.log('已同步 状态栏.html → ' + TARGET.SUB + '（' + fs.statSync(源).size + ' 字节）');`;

const b = `const dest = path.join(TARGET.PUSH, TARGET.SUB);
fs.mkdirSync(path.dirname(dest), { recursive: true });
// ★ 远端必须是纯 HTML：loader 用 \`$("body").load(U)\` 把它注入页面，
//   若带上首尾的 \\\`\\\`\\\` 围栏，这对围栏会变成字面文本显示在界面顶部与底部。
//   （围栏只该出现在卡里那条 loader 的 replaceString 那一层——它才是「含 <body> 的界面」）
let 内容 = fs.readFileSync(源, 'utf8');
const 原长 = 内容.length;
内容 = 内容.replace(/^\\uFEFF?\\s*\\\`\\\`\\\`(?:html|HTML)?\\s*\\r?\\n/, '').replace(/\\r?\\n\\\`\\\`\\\`\\s*$/, '');
const 剥了多少 = 原长 - 内容.length;
fs.writeFileSync(dest, 内容, 'utf8');
console.log('已同步 状态栏.html → ' + TARGET.SUB + '（' + 内容.length + ' 字节' + (剥了多少 ? '，已剥掉首尾围栏 ' + 剥了多少 + ' 字节' : '，本来就没有围栏') + '）');`;

const c = t.split(a).length - 1;
if (c) { t = t.replace(a, b.split('\n').join(eol)); n++; console.log('✓ push-ui：复制逻辑改为「剥围栏」'); }
else console.log('⚠ push-ui 未命中（可能已改过）');

fs.writeFileSync(F, t, 'utf8');
console.log('共 ' + n + ' 处');
