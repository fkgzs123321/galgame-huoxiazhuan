const fs=require('fs');
const s=fs.readFileSync('lifespan-C3_jd9g-.js','utf8');
// 找 Y 函数（shouyuan计算），导出 b -> Y
let idx=s.indexOf('shouyuan:n.remainingShouyuan');
console.log('=== Y函数前文 ===');
console.log(s.slice(Math.max(0,idx-3000), idx+200));
