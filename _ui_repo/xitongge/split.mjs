// 把卡内那份整页面板拆成「来源分件」（供 CDN 仓库用）
// 产物：_ui_repo/xitongge/src/{共享.css, 状态栏.html, 交涉.html, 评论.html, 脚本.js, 外壳.html}
import fs from 'node:fs';
import path from 'node:path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/正则/状态栏界面.html';
const OUT = 'E:/Games/写卡/tavern_helper_template/_ui_repo/xitongge/src/';
fs.mkdirSync(OUT, { recursive: true });

let s = fs.readFileSync(CARD, 'utf8');
// 去掉最外层 ``` 围栏
s = s.replace(/^\s*```\s*\n/, '').replace(/\n```\s*$/, '');

const cut = (from, to) => {
  const i = s.indexOf(from);
  if (i < 0) throw new Error('找不到起点: ' + from);
  const j = to ? s.indexOf(to, i) : s.length;
  if (j < 0) throw new Error('找不到终点: ' + to);
  return s.slice(i, j);
};

const css = cut('<style>', '</style>').replace(/^<style>\s*/, '').replace(/\s*<\/style>\s*$/, '');
const A = cut('<div class="hs">', '<div class="hd"><b>交涉</b>');
const B = cut('<div class="hd"><b>交涉</b>', '<div class="hd"><b>读者</b>');
const C = cut('<div class="hd"><b>读者</b>', '<div class="foot">');
const foot = cut('<div class="foot">', '<script>').trim();
const js = cut('<script>', '</script>').replace(/^<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');

const head = (t, note) => '<!-- ' + t + ' · ' + note + ' -->\n';

fs.writeFileSync(OUT + '共享.css', css.trim() + '\n');
fs.writeFileSync(OUT + '状态栏.html', head('A 状态栏', '时间 / 评价值档位 / 林天 / 玩家 / 绑定花名册') + A.trim() + '\n');
fs.writeFileSync(OUT + '交涉.html', head('B 交涉面板', '共识分 / 骰值对 / 判定 / 四维 / 证据链') + B.trim() + '\n');
fs.writeFileSync(OUT + '评论.html', head('C 评论条', '倾向 / 热评') + C.trim() + '\n');
fs.writeFileSync(OUT + '页脚.html', foot.trim() + '\n');
fs.writeFileSync(OUT + '脚本.js', js.trim() + '\n');

const 外壳 = `<div id="xb-root">
{{A}}
{{B}}
{{C}}
{{页脚}}
</div>
`;
fs.writeFileSync(OUT + '外壳.html', 外壳);

console.log('拆分完成:');
for (const f of fs.readdirSync(OUT)) {
  const n = fs.readFileSync(OUT + f, 'utf8').length;
  console.log('  ' + f.padEnd(14) + n + ' 字符');
}
