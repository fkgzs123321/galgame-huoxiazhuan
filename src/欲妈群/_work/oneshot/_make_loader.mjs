import fs from 'fs';
const Q = String.fromCharCode(96);
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const HASH = '2ea34d2';
const CDN = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-yumaqun';

// ① 按 skills（ui/text.md + regex-scripts.md）：
//    含 <body> 的前端界面 → 文件首尾用 3 个反引号行包裹成独立代码块，内容里用 CDN load
const loader = [
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
fs.writeFileSync(CARD + '/正则/状态栏界面.html', loader, 'utf8');
console.log('✓ 建 正则/状态栏界面.html（' + loader.length + ' 字符，带围栏 + CDN loader）');

// ② 正则用 replace_file 指向它（skills 的标准写法）
const F = CARD + '/正则/14-9状态栏界面.json';
const j = JSON.parse(fs.readFileSync(F, 'utf8'));
j.replace_file = '正则/状态栏界面.html';
delete j.replaceString;
fs.writeFileSync(F, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log('✓ 14-9状态栏界面.json → replace_file: 正则/状态栏界面.html');
console.log('  findRegex = ' + j.findRegex + '　M/P = ' + j.markdownOnly + '/' + j.promptOnly + '　placement = ' + JSON.stringify(j.placement));
console.log('  replaceString = ' + (j.replaceString === undefined ? '已删除' : '仍在'));

// ③ 面板本体保留在 正则/状态栏.html（作源；它不带 <body> 也能被 CDN 用）
const raw = fs.readFileSync(CARD + '/正则/状态栏.html', 'utf8');
console.log('');
console.log('面板源 正则/状态栏.html：' + raw.length + ' 字符（含宏 ' + ((raw.match(/\{\{format_message_variable::/g) || []).length) + ' 处）');
console.log('CDN 副本 _cdn/index.html：' + fs.readFileSync(CARD + '/_cdn/index.html', 'utf8').length + ' 字符');
