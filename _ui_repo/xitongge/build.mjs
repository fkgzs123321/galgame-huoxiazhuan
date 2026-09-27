// 把来源分件合成单页 → dist/系统哥的末日/界面/index.html
//   分件（状态栏 / 交涉 / 评论）同时留在 dist 里，各自可被单独引用与单独更新
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/Games/写卡/tavern_helper_template/_ui_repo/xitongge/';
const SRC = ROOT + 'src/';
const PROJECT = '系统哥的末日';
// ★ 仓库根目录扁平放（照 galgame-nanpan2 / galgame-yumaqun 的约定）
const DIST = ROOT + 'dist/';

const read = (f) => fs.readFileSync(SRC + f, 'utf8').trim();

const css = read('共享.css');
const shell = read('外壳.html')
  .replace('{{A}}', read('状态栏.html'))
  .replace('{{D}}', read('她的档案.html'))
  .replace('{{B}}', read('交涉.html'))
  .replace('{{C}}', read('评论.html'))
  .replace('{{页脚}}', read('页脚.html'));
const js = read('脚本.js');

const page = [
  '```',
  '<body>',
  '<!-- ' + PROJECT + ' · 前端界面（CDN 产物，由 _ui_repo/xitongge 构建，勿手改） -->',
  '<!-- 分件: 状态栏.html / 交涉.html / 评论.html / 页脚.html / 共享.css / 脚本.js -->',
  '<style>',
  css,
  '</style>',
  '',
  shell,
  '',
  '<script>',
  js,
  '</script>',
  '</body>',
  '```',
  '',
].join('\n');

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(DIST + 'index.html', page);

// 分件也推一份到 dist，供单独引用
for (const f of fs.readdirSync(SRC)) {
  if (f === '外壳.html') continue;
  fs.copyFileSync(SRC + f, DIST + f);
}

const files = fs.readdirSync(DIST).map((f) => f + ' ' + fs.readFileSync(DIST + f, 'utf8').length);
console.log('构建完成 → dist/');
files.forEach((f) => console.log('  ' + f));
console.log('\nindex.html 反引号围栏:', (page.match(/^```$/gm) || []).length, '（应为 2）');
console.log('index.html 含 <body>:', page.includes('<body>'), '| 含 脚本:', page.includes('VARIABLE_UPDATE_ENDED'));
