const fs=require('fs');
const s=fs.readFileSync('logic-x1zJkAu_.js','utf8');
function find(key, len=1500){
  let m=s.indexOf(key);
  if(m<0){console.log('未找到:',key);return;}
  console.log('=== '+key+' ===');
  console.log(s.slice(m, m+len).replace(/\n/g,' '));
  console.log('');
}
find('function fe(');
find('hardCapBreakdown');
find('nextMajor');
find('fe:');
find('import');
