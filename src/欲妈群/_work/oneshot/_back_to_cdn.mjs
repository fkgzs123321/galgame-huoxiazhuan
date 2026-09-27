import fs from 'fs';
import { execFileSync } from 'child_process';

const Q = String.fromCharCode(96);
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const F = CARD + '/正则/14-9状态栏界面.json';

// 备份
const bak = CARD + '/_work/oneshot/_14-9.json.bak-' + Date.now();
fs.copyFileSync(F, bak);
console.log('✓ 已备份 → ' + bak.split('/').pop());

const j = JSON.parse(fs.readFileSync(F, 'utf8'));
const CDN = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-yumaqun';
let HASH = 'main';
try { HASH = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: 'E:/Games/写卡/_yumqpush', encoding: 'utf8' }).trim(); } catch (e) { }

j.replaceString = [
  Q + Q + Q,
  '<body>',
  '<div id="ymq-load">正在载入状态栏…</div>',
  '<script>',
  '(function(){',
  '  var U="' + CDN + '@' + HASH + '/index.html";',
  '  var D=document.getElementById("ymq-load");',
  '  if(typeof $==="undefined"){ if(D) D.textContent="没载入：这个环境里没有 jQuery"; return; }',
  '  $("body").load(U,function(r,st,xhr){',
  '    if(st!=="success"){ if(D) D.textContent="没载入："+st+" "+(xhr?xhr.status:"")+"　地址："+U; }',
  '    else if(D){ D.remove(); }',
  '  });',
  '})();',
  '</script>',
  '</body>',
  Q + Q + Q,
  '',
].join('\n');
delete j.replace_file;

fs.writeFileSync(F, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log('✓ 状态栏改回 CDN loader（@' + HASH + '）');
console.log('  findRegex = ' + j.findRegex);
console.log('  M/P = ' + j.markdownOnly + '/' + j.promptOnly + '　placement = ' + JSON.stringify(j.placement));
console.log('  replace_file = ' + (j.replace_file || '无（已删）'));
console.log('  replaceString = ' + String(j.replaceString).length + ' 字符（loader）');
