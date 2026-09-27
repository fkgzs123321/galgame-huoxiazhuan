// 修：含 <body> 的替换内容必须用 3 个反引号行包裹（regex-scripts.md 硬要求）
// 原文：「含 <body>（前端界面）——文件首尾需用 3 个反引号行包裹成独立代码块，
//        酒馆据此将含 <body> 的内容渲染为独立前端界面」
// 我漏了包裹 → 酒馆不认它是独立界面 → 状态栏和开局选择都不显示（用户实测）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const 包 = (url) => '```\n<body>\n<script>\n$(\'body\').load(\'' + url + '\');\n</script>\n</body>\n```\n';

const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
const CDN = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-nanpan2/';

S.regex_scripts['状态栏界面'].replaceString = 包(CDN + 'index.html');
S.regex_scripts['开局选择界面'].replaceString = 包(CDN + 'opening.html');

fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

for (const n of ['状态栏界面', '开局选择界面']) {
  const rs = S.regex_scripts[n].replaceString;
  console.log('✅ ' + n + '（' + rs.length + ' 字符）');
  console.log('   ' + JSON.stringify(rs));
  console.log('   首行反引号=' + rs.startsWith('```') + ' ｜ 尾行反引号=' + rs.trimEnd().endsWith('```'));
}

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 3).join(' ')); }
