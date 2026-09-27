// 一键：推送面板到 GitHub + 把卡的 CDN URL 换成新 commit + 打包
// 用法：node scripts/push-panel.cjs
// 为什么需要它：jsdelivr 对分支引用有长缓存，必须用 commit 引用才实时
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const DIST = path.join(ROOT, 'dist', 'nanpa2-ui');
const PUSH = 'E:/Games/写卡/_nanpa2push';
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const git = (args) => execFileSync('git', ['-C', PUSH, '-c', 'http.proxy=', '-c', 'https.proxy=', ...args], { encoding: 'utf8' });

// ① 初始化推送仓库（若空）
if (!fs.existsSync(path.join(PUSH, '.git'))) {
  fs.mkdirSync(PUSH, { recursive: true });
  execFileSync('git', ['-C', PUSH, 'init', '-q']);
  git(['remote', 'add', 'origin', 'https://github.com/fkgzs123321/galgame-nanpan2.git']);
  console.log('① 初始化推送仓库');
}
try { git(['fetch', '-q', '--depth', '1', 'origin', 'main']); git(['checkout', '-q', '-B', 'main', 'FETCH_HEAD']); } catch (e) {}
git(['config', 'user.email', 'fkgzs123321@users.noreply.github.com']);
git(['config', 'user.name', 'fkgzs123321']);

// ② 拷贝 dist
for (const f of fs.readdirSync(DIST)) {
  if (/\.html$/.test(f)) fs.copyFileSync(path.join(DIST, f), path.join(PUSH, f));
}
console.log('② 已拷贝 ' + fs.readdirSync(DIST).filter(f => /\.html$/.test(f)).join(' / '));

// ③ 提交 + 推送
try {
  git(['add', '-A']);
  const 有变化 = (() => { try { git(['diff', '--cached', '--quiet']); return false; } catch (e) { return true; } })();
  if (有变化) { git(['commit', '-q', '-m', 'panel update']); console.log('③ 已提交'); }
  else console.log('③ 无变化，跳过提交');
  console.log(git(['push', 'origin', 'HEAD:main']).trim().split('\n').slice(-1)[0] || '   已推送');
} catch (e) { console.log('③ 推送：' + String(e.stdout || e.message).split('\n').slice(-1)[0]); }

// ④ 取新 commit
const commit = git(['rev-parse', '--short', 'HEAD']).trim();
console.log('④ 新 commit: ' + commit);

// ⑤ 更新卡的 URL + 打包
const 基 = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-nanpan2@' + commit + '/';
const 包 = (u) => '```\n<body>\n<script>\n$(\'body\').load(\'' + u + '\');\n</script>\n</body>\n```\n';
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
S.regex_scripts['状态栏界面'].replaceString = 包(基 + 'index.html');
S.regex_scripts['开局选择界面'].replaceString = 包(基 + 'opening.html');
fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));
console.log('⑤ 卡 URL → ' + 基 + 'index.html');

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ pack: ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }
