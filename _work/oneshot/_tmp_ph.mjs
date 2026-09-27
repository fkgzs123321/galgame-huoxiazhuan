import fs from 'fs';
import path from 'path';
const roots = ['src/欲望都市/世界书','src/欲望都市/开场白'];
function walk(p){
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const e of fs.readdirSync(p)) walk(path.join(p,e)); return; }
  const s = fs.readFileSync(p,'utf8');
  if (s.includes('StatusPlaceHolderImpl') || s.includes('【状态栏】')) {
    console.log('---', p);
    for (const line of s.split('\n')) {
      if (line.includes('StatusPlaceHolderImpl') || line.includes('【状态栏】')) console.log('  ', line.trim().slice(0,120));
    }
  }
}
for (const r of roots) walk(r);
