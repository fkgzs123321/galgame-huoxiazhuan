#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// push-ui.cjs · 把面板推到 CDN 仓库，并把卡里的 commit 号换掉
//
// 面板的单一事实来源 = 正则/状态栏界面.html
// 仓库只放一份 index.html（由它复制过去）
//
// 为什么要带 commit 号而不是 @latest：
//   jsDelivr 的 @main 有缓存，改完不会立刻生效；
//   带 commit 号是**不可变地址**，改一次换一个号，立刻生效。
//
// 用法: node scripts/push-ui.cjs ["提交信息"]
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const PUSH = 'E:/Games/写卡/_yxpush';            // CDN 仓库的本地副本
const REPO = 'fkgzs123321/galgame-yingxiongtanshuo';
const 源 = path.join(D, '正则', '状态栏界面.html');

const 提交信息 = process.argv[2] || '面板更新';

// ① 源 → 仓库
if (!fs.existsSync(PUSH)) {
  console.error('仓库本地副本不存在，先 clone：\n  git clone git@github.com:' + REPO + '.git ' + PUSH);
  process.exit(2);
}
// ① 源 → 仓库（★ 两份：面板 + 选人界面）
//   ★ 为什么选人界面也要上 CDN（2026-09-17 踩的）：
//     开场白里的界面**不能内联 HTML**。正则 replaceString 里的 ``` 代码块会被当**纯文本**渲染，
//     用户看到的就是一整屏源码。同级生的做法是：代码块里只放 <script>$('body').load(URL)</script>，
//     真正的 HTML 从 CDN 取 —— 这样才渲染得出来。
const 源s = [
  { 从: path.join(D, '正则', '状态栏界面.html'), 到: 'index.html' },
  { 从: path.join(D, '正则', '开局选择界面.html'), 到: 'kai.html' },
];
for (const x of 源s) {
  if (!fs.existsSync(x.从)) { console.error('缺文件: ' + x.从); process.exit(2); }
  fs.copyFileSync(x.从, path.join(PUSH, x.到));
  console.log('已同步 ' + path.basename(x.从) + ' → ' + x.到 + '（' + fs.statSync(x.从).size + ' 字节）');
}

// ② 提交 + 推送
const run = (args, opts) => execFileSync('git', args, { cwd: PUSH, encoding: 'utf8', ...opts });
const 状态 = run(['status', '--porcelain']).trim();
if (!状态) {
  console.log('没有改动，跳过提交');
} else {
  console.log(run(['add', '-A']).trim());
  console.log(run(['-c', 'user.email=noreply@example.com', '-c', 'user.name=fkgzs123321', 'commit', '-m', 提交信息]).trim());
  console.log(run(['push', 'origin', 'main']).trim());
}
const HASH = run(['rev-parse', '--short', 'HEAD']).trim();

// ③ 卡里的正则换成新地址（两个正则都换）
const URL = `https://testingcf.jsdelivr.net/gh/${REPO}@${HASH}/index.html`;
const URL开 = `https://testingcf.jsdelivr.net/gh/${REPO}@${HASH}/kai.html`;
// ★ 2026-09-17 改：载入失败要「看得见」
//   原来只有一句 $('body').load(URL)。拉不到时屏幕上什么都不显示，
//   用户只看到「面板没了」，排查全靠猜。现在给它一个可见的落点：
//   载入中 → 有字；成功 → 自己消失；失败 → 把状态码和地址写在屏幕上。
const 外链 = (u, 名) => [
  '```',
  '<body>',
  '<div id="yx-load">正在载入' + (名 || '界面') + '…</div>',
  '<script>',
  '(function(){',
  '  var U = "' + u + '";',
  '  var D = document.getElementById("yx-load");',
  '  if (typeof $ === "undefined") { if (D) D.textContent = "没载入：这个环境里没有 jQuery"; return; }',
  '  $("body").load(U, function (r, st, xhr) {',
  '    if (st !== "success") {',
  '      if (D) D.textContent = "没载入：" + st + " " + (xhr ? xhr.status : "") + "　地址：" + U;',
  '    } else if (D) { D.remove(); }',
  '  });',
  '})();',
  '</script>',
  '</body>',
  '```',
  '',
].join('\n');
const patch = [
  { op: 'replace', path: '/regex_scripts/状态栏界面/replaceString', value: 外链(URL, '面板') },
  { op: 'replace', path: '/regex_scripts/开局选择界面/replaceString', value: 外链(URL开, '选人界面') },
];
const pf = path.join(D, 'scripts', 'patch-cdn.json');
fs.writeFileSync(pf, JSON.stringify(patch, null, 1));

const FORGE = path.join(ROOT, '_tc_repo', 'tavern-cards', 'scripts', 'tavern-cards-forge.mjs');
console.log(execFileSync('node', [FORGE, 'patch', '旮旯给木-英雄坛说', '--file', pf], { encoding: 'utf8' }).trim());
console.log(execFileSync('node', [FORGE, 'pack', '旮旯给木-英雄坛说'], { encoding: 'utf8' }).trim());

console.log('\nCDN 面板: ' + URL);
console.log('CDN 开局: ' + URL开);
