const fs=require('fs');
const s=fs.readFileSync('lifespan-C3_jd9g-.js','utf8');
// 提取 T 函数定义（神识上限）
let idx=s.indexOf('function T(');
console.log('=== T函数 ===');
console.log(s.slice(idx, idx+1800).replace(/\n/g,' '));
