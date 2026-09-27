#!/usr/bin/env node
// push.cjs · 界面发布器（构建 → 上传 → 回填 commit → 重打包）
//
// 用法:
//   node _ui_repo/xitongge/push.cjs                  全流程（构建 + 调 push-api 上传 + 回填 + 重打包）
//   node _ui_repo/xitongge/push.cjs --dry            只构建并打印将用的 URL
//   node _ui_repo/xitongge/push.cjs --commit <sha>   不构建不上传，只回填已有 commit 并重打包
//
// ★ 为什么必须回填 commit: jsdelivr 对 gh 的引用若不带 commit，会被 CDN 缓存住，
//   改了仓库界面却看不到变化。带 commit 号能保证「推一次、生效一次、可回滚」。
// ★ 上传走 push-api.cjs（GitHub Contents API + curl），不走 git —— 本机 git 连不上 github.com。
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/xitongge/';
const cfgPath = REPO_DIR + 'repo.config.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const ci = argv.indexOf('--commit');
const GIVEN = ci >= 0 ? argv[ci + 1] : null;

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd: cwd || REPO_DIR, stdio: 'inherit' });

console.log('══ 1/4 构建 ══');
run('node', ['build.mjs']);

if (DRY) {
  console.log('\n══ 2/4 跳过上传（--dry）══');
  console.log('将使用的 URL: ' + cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@COMMIT/' + cfg.UI_FILE);
  process.exit(0);
}

if (!GIVEN) {
  console.log('\n══ 2/4 上传（Contents API）══');
  try {
    run('node', ['push-api.cjs']);
  } catch (e) {
    console.log('\n⚠ 上传失败。检查: 1) mcp.json 里 github-pat 的 token 2) repo.config.json 的 GH_NAME/GH_PROJECT_NAME');
    process.exit(1);
  }
}

const commit = GIVEN || JSON.parse(fs.readFileSync(cfgPath, 'utf8')).LAST_COMMIT;
console.log('\n══ 3/4 回填 loader ══');
const finalUrl = cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@' + commit + '/' + cfg.UI_FILE;
const loader = [
  '```',
  '<body>',
  '<!-- ' + cfg.PROJECT_NAME + ' · 前端界面 loader',
  '     ★ 面板本身在 CDN 仓库里，不在这张卡里：',
  '       https://github.com/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME,
  '     四块面板: 状态栏 / 她的档案 / 交涉面板 / 评论条（分件在仓库根，成品单页是 index.html）',
  '     ⚠ 改了面板要跑 _ui_repo/xitongge/push.cjs，它会重建、上传、并把新 commit 回填到这里',
  '     ⚠ 必须带 commit：不带会被 jsDelivr 缓存住，改了看不到变化 -->',
  '<div id="xb-load" style="padding:12px;color:#828b98;font-size:12px">正在载入界面…</div>',
  '<script>',
  '(function () {',
  '  var U = "' + finalUrl + '";',
  '  var D = document.getElementById("xb-load");',
  '  if (typeof $ === "undefined") { if (D) D.textContent = "界面没载入：这个环境里没有 jQuery"; return; }',
  '  $("body").load(U, function (r, st) {',
  '    if (st === "error" && D) D.textContent = "界面没载入：CDN 取不到 " + U;',
  '  });',
  '})();',
  '</script>',
  '</body>',
  '```',
  '',
].join('\n');
fs.writeFileSync(WS + cfg.CARD_LOADER, loader);
cfg.LAST_COMMIT = commit;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log('已写入 ' + cfg.CARD_LOADER + '（' + loader.length + ' 字符）');
console.log('URL: ' + finalUrl);

console.log('\n══ 4/4 重打包 ══');
run('node', ['.skills/tavern-cards/scripts/tavern-cards-forge.mjs', 'pack', cfg.PROJECT_NAME], WS);
console.log('\n完成。回滚: node _ui_repo/xitongge/push.cjs --commit <旧 sha>');
