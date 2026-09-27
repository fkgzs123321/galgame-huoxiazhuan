#!/usr/bin/env node
// push.cjs · 活侠传界面发布器（构建 → 上传 → 回填 loader → 重打包）
//
// 用法:
//   node _ui_repo/huoxiazhuan/push.cjs                  全流程
//   node _ui_repo/huoxiazhuan/push.cjs --dry            只构建并打印将用的 URL
//   node _ui_repo/huoxiazhuan/push.cjs --commit <sha>   只回填已有 commit 并重打包
//
// ★ 与 _ui_repo/xitongge/push.cjs 同构（沿用既有约定），差异：
//   ① 上传走 push-api.cjs，其 token 读 ~/.dsh/.env（不是 workbuddy 的 mcp.json）
//   ② 面板是 Vue 单页，loader 用 jQuery 的 $("body").load()
//   ③ ★ 两个界面（2026-09-27）：状态栏 + 开局表单，各自一条 loader，
//      共用同一个 commit（同一份 CDN 产物里的两个文件）
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/huoxiazhuan/';
const cfgPath = REPO_DIR + 'repo.config.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const ci = argv.indexOf('--commit');
const GIVEN = ci >= 0 ? argv[ci + 1] : null;

const 节点 = process.execPath;
const run = (args, cwd) => execFileSync(节点, args, { cwd: cwd || REPO_DIR, stdio: 'inherit' });

console.log('══ 1/4 构建 ══');
run(['build.mjs']);

if (DRY) {
  console.log('\n══ 2/4 跳过上传（--dry）══');
  console.log('将使用的 URL:');
  console.log('  ' + cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@COMMIT/index.html');
  console.log('  ' + cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@COMMIT/open.html');
  process.exit(0);
}

if (!GIVEN) {
  console.log('\n══ 2/4 上传（Contents API）══');
  try {
    run(['push-api.cjs']);
  } catch {
    console.log('\n⚠ 上传失败。检查 ~/.dsh/.env 里的 GITHUB_PERSONAL_ACCESS_TOKEN 与 repo.config.json 的仓库名');
    process.exit(1);
  }
}

const commit = GIVEN || JSON.parse(fs.readFileSync(cfgPath, 'utf8')).LAST_COMMIT;
if (!commit) {
  console.log('\n✗ 没有可用 commit —— 先不带 --commit 跑一次，或补一个正确的 sha');
  process.exit(1);
}

// ── 造 loader ──
//   ★ 两个界面各一条。共用同一套 jQuery 检查与失败提示。
function 造Loader(opts) {
  const url = cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@' + commit + '/' + opts.文件;
  return [
    '```',
    '<body>',
    '<!-- 活侠传 · ' + opts.名 + ' loader',
    '     ★ 面板本身在 CDN 仓库里，不在这张卡里：',
    '       https://github.com/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME,
    '     ' + opts.说明,
    '     ⚠ 改了面板要跑 _ui_repo/huoxiazhuan/push.cjs，它会构建、上传、并把新 commit 回填到这里',
    '     ⚠ 必须带 commit：不带会被 jsDelivr 缓存住，改了看不到变化 -->',
    '<div id="hx-load" style="padding:12px;color:#9a9384;font-size:12px">正在载入界面…</div>',
    '<script>',
    '(function () {',
    '  var U = "' + url + '";',
    '  var D = document.getElementById("hx-load");',
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
}

console.log('\n══ 3/4 回填 loader ══');
const 界面s = [
  {
    名: '状态栏',
    文件: 'index.html',
    回填到: cfg.CARD_LOADER,
    说明: '状态栏 + 七页签（行动/属性/武学/行囊/人物/事务/见闻）+ 战斗浮层 + 前置检查浮层',
  },
  {
    名: '开局表单',
    文件: 'open.html',
    回填到: cfg.CARD_LOADER_FORM || 'src/活侠传/正则/开局表单.html',
    说明: '开局表单 —— 填人设、选身份、分配配点；挂在开场白的 <OpeningPlaceHolder/> 上',
  },
];

for (const 界面 of 界面s) {
  const loader = 造Loader(界面);
  fs.writeFileSync(WS + 界面.回填到, loader, 'utf8');
  console.log('  ' + 界面.名 + ' → ' + 界面.回填到 + '（' + loader.length + ' 字符）');
}

cfg.LAST_COMMIT = commit;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');

console.log('\n══ 4/4 重打包 ══');
try {
  run(['.skills/tavern-cards/scripts/tavern-cards-forge.mjs', 'pack', cfg.PROJECT_NAME], WS);
} catch {
  // 有的 checkout 只带 _tc_repo 下的 forge
  console.log('（.skills 下的 forge 不可用，改走 _tc_repo）');
  run(['_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs', 'pack', cfg.PROJECT_NAME], WS);
}
console.log('\n完成。回滚: node _ui_repo/huoxiazhuan/push.cjs --commit <旧 sha>');
