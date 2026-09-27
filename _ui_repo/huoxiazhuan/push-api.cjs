#!/usr/bin/env node
// push-api.cjs · 用 GitHub Contents API 直推
//
// 为什么要这个（沿用 _ui_repo/xitongge 的既有结论）:
//   - 本机 git 连不上 github.com
//   - curl 直连 api.github.com 需要 --ssl-no-revoke
//   - 走 MCP 通道推的话，文件内容得从模型上下文绕一圈（641 KB 不现实）
//
// ★ 与参照仓的唯一差异：token 从 ~/.dsh/.env 读，不读 ~/.workbuddy/mcp.json。
//   两个 agent 各用各有凭据，互不依赖。
//
// 用法:
//   node _ui_repo/huoxiazhuan/push-api.cjs          推 dist/ 下全部文件
//   node _ui_repo/huoxiazhuan/push-api.cjs --dry    只列将上传的文件与字节数
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/huoxiazhuan/';
const DIST = REPO_DIR + 'dist/';
const cfg = JSON.parse(fs.readFileSync(REPO_DIR + 'repo.config.json', 'utf8'));
const DRY = process.argv.includes('--dry');

// ── token：优先环境变量，其次 ~/.dsh/.env ──
function 读token() {
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const envPath = 'C:/Users/64806/.dsh/.env';
  if (!fs.existsSync(envPath)) return null;
  const m = /GITHUB_PERSONAL_ACCESS_TOKEN\s*=\s*(\S+)/.exec(fs.readFileSync(envPath, 'utf8'));
  return m ? m[1] : null;
}
const TOKEN = 读token();
if (!TOKEN) {
  console.error('✗ 没读到 token（找过 $GITHUB_PERSONAL_ACCESS_TOKEN 与 ~/.dsh/.env）');
  process.exit(2);
}

const API = 'https://api.github.com/repos/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '/contents/';
const H = ['-H', 'Authorization: Bearer ' + TOKEN, '-H', 'Accept: application/vnd.github+json', '-H', 'User-Agent: tavern-ui-push'];

const api = (method, url, body) => {
  // ★ body 走 stdin（--data-binary @-）。
  //   直接当参数传会在 Windows 撞 32767 字符命令行上限 —— 641 KB 的 base64 必崩。
  const args = ['-sS', '--ssl-no-revoke', ...H, '-X', method, url];
  const opt = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (body) { args.push('--data-binary', '@-'); opt.input = JSON.stringify(body); }
  const out = execFileSync('curl', args, opt);
  try { return JSON.parse(out); } catch {
    throw new Error('API 返回不是 JSON: ' + out.slice(0, 300));
  }
};

if (!fs.existsSync(DIST)) {
  console.error('✗ 没有 ' + DIST + '，先跑 node _ui_repo/huoxiazhuan/build.mjs');
  process.exit(2);
}

const files = fs.readdirSync(DIST).filter((f) => !f.startsWith('_'));
console.log('将上传 ' + files.length + ' 个文件到 ' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '：');
for (const f of files) {
  console.log('  ' + f.padEnd(16) + (fs.statSync(DIST + f).size / 1024).toFixed(0) + ' KB');
}
if (DRY) process.exit(0);

let lastSha = '';
for (const f of files) {
  const content = fs.readFileSync(DIST + f).toString('base64');
  let sha = null;
  try {
    const cur = api('GET', API + encodeURIComponent(f) + '?ref=' + cfg.BRANCH);
    sha = cur.sha;
  } catch { /* 新文件，没有 sha */ }
  const body = { message: 'ui: ' + f, content, branch: cfg.BRANCH };
  if (sha) body.sha = sha;
  const r = api('PUT', API + encodeURIComponent(f), body);
  if (r.commit && r.commit.sha) lastSha = r.commit.sha;
  console.log('  ✓ ' + f.padEnd(16) + (sha ? '(更新)' : '(新建)') + '  ' + String(lastSha).slice(0, 7));
}

// ★★ commit 必须回填：jsDelivr 对 gh 的引用若不带 commit 会被 CDN 缓存住，
//    改了仓库但玩家看不到变化。带 commit 才能「推一次、生效一次、可回滚」。
cfg.LAST_COMMIT = lastSha.slice(0, 7);
fs.writeFileSync(REPO_DIR + 'repo.config.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('\n最新 commit = ' + lastSha);
console.log('回填 loader 并重打包: node _ui_repo/huoxiazhuan/push.cjs --commit ' + lastSha.slice(0, 7));
