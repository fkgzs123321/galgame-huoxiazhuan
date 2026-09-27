const fs=require('fs');
const s=fs.readFileSync('shenshiCapacity-B99PQdkI.js','utf8');
function find(key, len=1200){
  let m=s.indexOf(key);
  if(m<0){console.log('未找到:',key);return;}
  console.log('=== '+key+' ===');
  console.log(s.slice(m, m+len).replace(/\n/g,' '));
  console.log('');
}
find('enhancedMind');
find('legendaryMind');
find('function dr');
find('equippedItems');
find('rarityTierCoef');
