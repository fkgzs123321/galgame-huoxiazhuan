// 卡的 CDN 地址改用「commit 引用」—— jsdelivr 对分支引用有长缓存（purge 也不立即生效）
// 分支引用 /gh/user/repo/index.html        → 缓存版（实测 11168 字符 = 旧版）
// commit 引用 /gh/user/repo@<hash>/index.html → 实时（实测 15443 = 新版）
// → 每次推完面板，把卡的 URL 更新成新 commit
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const PUSH = 'E:/tmp/nanpa2push';

// 取当前 commit（短哈希）
let commit = '';
try {
  commit = execFileSync('git', ['-C', '/tmp/nanpa2push', 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
} catch (e) {
  try { commit = execFileSync('git', ['-C', PUSH, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (e2) {}
}
if (!commit) { console.log('❌ 取不到 commit'); process.exit(1); }
console.log('当前 commit: ' + commit);

const 基 = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-nanpan2@' + commit + '/';
const 包 = (u) => '```\n<body>\n<script>\n$(\'body\').load(\'' + u + '\');\n</script>\n</body>\n```\n';

const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
S.regex_scripts['状态栏界面'].replaceString = 包(基 + 'index.html');
S.regex_scripts['开局选择界面'].replaceString = 包(基 + 'opening.html');
fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

console.log('✅ 两条正则改用 commit 引用：');
console.log('   状态栏: ' + 基 + 'index.html');
console.log('   开局:   ' + 基 + 'opening.html');

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 3).join(' ')); }
