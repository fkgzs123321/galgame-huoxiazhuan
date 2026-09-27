const fs = require('fs');
const t = fs.readFileSync('src/旮旯给木-英雄坛说/正则/_面板逻辑.js', 'utf8');
console.log('画丹房函数: ' + (t.includes('function 画丹房(') ? '有' : '无'));
console.log('dan 分支  : ' + (t.includes("页 === 'dan'") ? '有' : '无'));
console.log('dan 页签  : ' + (t.includes('id: "dan"') ? '有' : '无'));
const i = t.indexOf('function 画()');
console.log('\n=== 画() 的开头 ===');
console.log(t.slice(i, i + 560));
