// 用「独立文件 + 拼接」的方式做替换（避开引号转义地狱）
const fs = require('fs');
const P = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
const S = 'src/旮旯给木-英雄坛说/scripts/';
let t = fs.readFileSync(P, 'utf8');
let 改 = [];

// ── ① 强化辅助：插到「图标库」之前 ──
if (!t.includes('function 强档(')) {
  const 助手 = fs.readFileSync(S + '_新_强化辅助.txt', 'utf8');
  t = t.replace('  /* ══ 图标库', 助手 + '  /* ══ 图标库');
  改.push('强化辅助');
}

// ── ② 开物品：整段替换 ──
{
  const a = t.indexOf('  function 开物品(');
  const b = t.indexOf('  function 绑物品按钮(');
  if (a < 0 || b < 0) { console.error('找不到 开物品 段'); process.exit(1); }
  const 新 = fs.readFileSync(S + '_新_开物品.txt', 'utf8');
  t = t.slice(0, a) + 新 + t.slice(b);
  改.push('开物品重写');
}

// ── ③ 强化按钮的处理：整段替换（从 if op === "enh" 到 else if equip）──
{
  const a = t.indexOf('        if (op === "enh") {');
  const b = t.indexOf('        } else if (op === "equip") {', a);
  if (a < 0 || b < 0) { console.error('找不到 enh 段'); process.exit(1); }
  const 新 = fs.readFileSync(S + '_新_强化按钮.txt', 'utf8');
  t = t.slice(0, a) + 新 + t.slice(b);
  改.push('强化按钮');
}

fs.writeFileSync(P, t);
console.log('✅ ' + 改.join(' / '));
console.log('   文件 ' + Math.round(Buffer.byteLength(t, 'utf8') / 1024) + ' KB');
