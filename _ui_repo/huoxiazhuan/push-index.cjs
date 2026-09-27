#!/usr/bin/env node
// push-index.cjs · 把两个索引 json 推到 CDN 仓库根目录
//
// ★ 为什么单独一个脚本：
//   push-assets.cjs 推的是 _work/_pack/ 下的 .pack 与 manifest.json；
//   而 UI 实际读的是 素材/pack_index.json 与 素材/scenes.json
//   （精简过的语义索引，53 KB + 15 KB，比 manifest 的 328 KB 小得多）。
//   这两份要放在仓库根，与 .pack 同级，UI 才能相对路径取。
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/huoxiazhuan/';
const SRC = WS + 'src/活侠传/素材/';
const cfg = JSON.parse(fs.readFileSync(REPO_DIR + 'repo.config.json', 'utf8'));

function 读token() {
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const m = /GITHUB_PERSONAL_ACCESS_TOKEN\s*=\s*(\S+)/.exec(
    fs.readFileSync('C:/Users/64806/.dsh/.env', 'utf8'));
  return m ? m[1] : null;
}
const TOKEN = 读token();
if (!TOKEN) { console.error('✗ 没读到 token'); process.exit(2); }

const API = 'https://api.github.com/repos/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '/contents/';
const H = ['-H', 'Authorization: Bearer ' + TOKEN, '-H', 'Accept: application/vnd.github+json',
  '-H', 'User-Agent: tavern-index-push'];

const api = (method, url, body) => {
  const args = ['-sS', '--ssl-no-revoke', ...H, '-X', method, url];
  const opt = { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 };
  if (body) { args.push('--data-binary', '@-'); opt.input = JSON.stringify(body); }
  const out = execFileSync('curl', args, opt);
  try { return JSON.parse(out); } catch { throw new Error('非 JSON: ' + out.slice(0, 200)); }
};

const files = ['pack_index.json', 'scenes.json'].filter((f) => fs.existsSync(SRC + f));
let lastSha = '';
for (const f of files) {
  const content = fs.readFileSync(SRC + f).toString('base64');
  let sha = null;
  try { sha = api('GET', API + f + '?ref=' + cfg.BRANCH).sha; } catch { /* 新文件 */ }
  const body = { message: 'assets: ' + f, content, branch: cfg.BRANCH };
  if (sha) body.sha = sha;
  const r = api('PUT', API + f, body);
  if (r.commit && r.commit.sha) lastSha = r.commit.sha;
  console.log(`  ✓ ${f.padEnd(20)} ${(fs.statSync(SRC + f).size / 1024).toFixed(0)} KB  ${sha ? '(更新)' : '(新建)'}`);
}

if (lastSha) {
  const P = REPO_DIR + 'repo.config.json';
  const c = JSON.parse(fs.readFileSync(P, 'utf8'));
  c.INDEX_COMMIT = lastSha.slice(0, 7);
  fs.writeFileSync(P, JSON.stringify(c, null, 2) + '\n');
  console.log('\n索引 commit = ' + lastSha.slice(0, 7));
}
