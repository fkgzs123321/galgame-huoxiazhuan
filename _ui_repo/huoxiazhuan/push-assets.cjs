#!/usr/bin/env node
// push-assets.cjs · 把素材包推到 CDN 仓库
//
// ★ 与 push-api.cjs 的分工：
//     push-api.cjs    推 dist/ 下的界面（index.html / open.html）
//     push-assets.cjs 推 _pack/ 下的素材（156 个 .pack + manifest.json）
//   两者都推同一个仓库，互不干扰。
//
// ★ 为什么素材要打包而不是逐张推：
//     2047 张图逐个推要 4000+ 次 API 调用；打包成 157 个文件只要 314 次。
//
// 用法:
//   node _ui_repo/huoxiazhuan/push-assets.cjs          推全部
//   node _ui_repo/huoxiazhuan/push-assets.cjs --dry    只列
//   node _ui_repo/huoxiazhuan/push-assets.cjs --only background_01  只推匹配的
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/huoxiazhuan/';
const SRC = WS + 'src/活侠传/_work/_pack/';
const cfg = JSON.parse(fs.readFileSync(REPO_DIR + 'repo.config.json', 'utf8'));
const DRY = process.argv.includes('--dry');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

function 读token() {
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const envPath = 'C:/Users/64806/.dsh/.env';
  if (!fs.existsSync(envPath)) return null;
  const m = /GITHUB_PERSONAL_ACCESS_TOKEN\s*=\s*(\S+)/.exec(fs.readFileSync(envPath, 'utf8'));
  return m ? m[1] : null;
}
const TOKEN = 读token();
if (!TOKEN) { console.error('✗ 没读到 token'); process.exit(2); }

const API = 'https://api.github.com/repos/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '/contents/';
const H = ['-H', 'Authorization: Bearer ' + TOKEN, '-H', 'Accept: application/vnd.github+json',
  '-H', 'User-Agent: tavern-assets-push'];

const api = (method, url, body) => {
  const args = ['-sS', '--ssl-no-revoke', ...H, '-X', method, url];
  const opt = { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 };
  if (body) { args.push('--data-binary', '@-'); opt.input = JSON.stringify(body); }
  const out = execFileSync('curl', args, opt);
  try { return JSON.parse(out); } catch {
    throw new Error('API 返回不是 JSON: ' + out.slice(0, 300));
  }
};

if (!fs.existsSync(SRC)) { console.error('✗ 没有 ' + SRC); process.exit(2); }

let files = fs.readdirSync(SRC).filter((f) => f.endsWith('.pack') || f === 'manifest.json');
if (ONLY) files = files.filter((f) => f.includes(ONLY));
// 小文件先推，大文件后推 —— 这样即使中途断了，manifest 也已就位
files.sort((a, b) => {
  if (a === 'manifest.json') return 1;   // manifest 最后推（它是索引，最后才该生效）
  if (b === 'manifest.json') return -1;
  return fs.statSync(SRC + a).size - fs.statSync(SRC + b).size;
});

const 总 = files.reduce((s, f) => s + fs.statSync(SRC + f).size, 0);
console.log(`将上传 ${files.length} 个文件到 ${cfg.GH_NAME}/${cfg.GH_PROJECT_NAME}，合计 ${(总 / 1024 / 1024).toFixed(1)} MB`);
if (DRY) {
  for (const f of files) console.log('  ' + f.padEnd(38) + (fs.statSync(SRC + f).size / 1024).toFixed(0) + ' KB');
  process.exit(0);
}

let lastSha = '';
let done = 0;
const 失败 = [];
for (const f of files) {
  try {
    const content = fs.readFileSync(SRC + f).toString('base64');
    let sha = null;
    try {
      const cur = api('GET', API + encodeURIComponent(f) + '?ref=' + cfg.BRANCH);
      sha = cur.sha;
    } catch { /* 新文件 */ }
    const body = { message: 'assets: ' + f, content, branch: cfg.BRANCH };
    if (sha) body.sha = sha;
    const r = api('PUT', API + encodeURIComponent(f), body);
    if (r.commit && r.commit.sha) lastSha = r.commit.sha;
    done++;
    const mb = (fs.statSync(SRC + f).size / 1024 / 1024).toFixed(1);
    console.log(`  ✓ [${done}/${files.length}] ${f.padEnd(38)} ${mb.padStart(6)} MB  ${String(lastSha).slice(0, 7)}`);
  } catch (e) {
    失败.push(f);
    console.log(`  ✗ ${f}  ${String(e.message).slice(0, 90)}`);
  }
}

console.log('');
console.log(`完成 ${done}/${files.length}，失败 ${失败.length}`);
if (失败.length) for (const f of 失败) console.log('  ★ ' + f);

if (lastSha) {
  const P = REPO_DIR + 'repo.config.json';
  const c = JSON.parse(fs.readFileSync(P, 'utf8'));
  c.ASSETS_COMMIT = lastSha.slice(0, 7);
  fs.writeFileSync(P, JSON.stringify(c, null, 2) + '\n');
  console.log('');
  console.log('最新 commit = ' + lastSha);
  console.log('素材 CDN 前缀 = ' + cfg.CDN + '/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '@' + lastSha.slice(0, 7) + '/');
  console.log('已回填 repo.config.json 的 ASSETS_COMMIT');
}
