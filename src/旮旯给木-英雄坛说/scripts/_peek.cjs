// 修：物品操作与动手没恢复成功 + 加「面板配置」契约（通用面板的开关）
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let t = fs.readFileSync(p, 'utf8');

// ── ① 物品弹层：看现在长什么样 ──
const i = t.indexOf('开层(名, rows');
console.log('物品开层那行:');
console.log('  ' + t.slice(Math.max(0, i - 120), i + 160).replace(/\n/g, '\n  '));
