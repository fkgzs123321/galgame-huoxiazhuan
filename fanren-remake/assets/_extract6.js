const fs=require('fs');
const s=fs.readFileSync('pages/CharacterPage-9IQd-gsk.js','utf8');
function find(key, len=900){
  let m=s.indexOf(key);
  if(m<0){console.log('未找到:',key);return;}
  console.log('=== '+key+' ===');
  console.log(s.slice(m, m+len).replace(/\n/g,' '));
  console.log('');
}
find('function gs(');
find('baseCapacity');
find('budgetMultiplier');
find('function ac(');
find('突破加持');
