#!/usr/bin/env node
// push-api.cjs · 用 GitHub Contents API 直推（本机 git 连不上 github.com 时的出路）
//
// 为什么要有这个:
//   - 本机到 github.com:443 走不通（代理 127.0.0.1 挂掉）
//   - curl 直连 api.github.com 需要 --ssl-no-revoke（否则 schannel 报 CRYPT_E_NO_REVOKE_CHECK）
//   - 走 MCP 通道能推，但文件内容得从模型上下文绕一圈；这个脚本直接从磁盘读文件上传
//
// 用法:
//   node _ui_repo/xitongge/push-api.cjs          推 dist/ 下全部文件
//   node _ui_repo/xitongge/push-api.cjs --dry    只列将上传的文件与字节数
//
// ★ token 从 ~/.workbuddy/mcp.json 的 github-pat.env.GITHUB_PERSONAL_ACCESS_TOKEN 读，不打印、不入日志
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/xitongge/';
const DIST = REPO_DIR + 'dist/';
const cfg = JSON.parse(fs.readFileSync(REPO_DIR + 'repo.config.json', 'utf8'));
const DRY = process.argv.includes('--dry');

const mcpPath = 'C:/Users/64806/.workbuddy/mcp.json';
const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
const TOKEN = (((mcp.mcpServers || mcp.servers || {})['github-pat'] || {}).env || {}).GITHUB_PERSONAL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('✗ 从 ' + mcpPath + ' 的 github-pat.env 里没读到 token');
  process.exit(2);
}

const API = 'https://api.github.com/repos/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '/contents/';
const H = ['-H', 'Authorization: Bearer ' + TOKEN, '-H', 'Accept: application/vnd.github+json', '-H', 'User-Agent: tavern-ui-push'];

const api = (method, url, body) => {
  // ★ body 走 stdin（--data-binary @-）。直接当参数传会在 Windows 撞 32767 字符的命令行上限，
  //   界面单页 base64 后 35KB+，必崩。
  const args = ['-sS', '--ssl-no-revoke', ...H, '-X', method, url];
  const opt = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (body) { args.push('--data-binary', '@-'); opt.input = JSON.stringify(body); }
  const out = execFileSync('curl', args, opt);
  try { return JSON.parse(out); } catch (e) { throw new Error('API 返回不是 JSON: ' + out.slice(0, 200)); }
};

const files = fs.readdirSync(DIST).filter((f) => !f.startsWith('_'));
console.log('将上传 ' + files.length + ' 个文件到 ' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '：');
files.forEach((f) => console.log('  ' + f.padEnd(16) + fs.statSync(DIST + f).size + ' 字节'));
if (DRY) process.exit(0);

let lastSha = '';
for (const f of files) {
  const content = fs.readFileSync(DIST + f).toString('base64');
  let sha = null;
  try {
    const cur = api('GET', API + encodeURIComponent(f) + '?ref=' + cfg.BRANCH);
    sha = cur.sha;
  } catch (e) {}
  const body = { message: 'ui: ' + f, content, branch: cfg.BRANCH };
  if (sha) body.sha = sha;
  const r = api('PUT', API + encodeURIComponent(f), body);
  if (r.commit && r.commit.sha) lastSha = r.commit.sha;
  console.log('  ✓ ' + f.padEnd(16) + (sha ? '(更新)' : '(新建)') + '  ' + String(lastSha).slice(0, 7));
}

cfg.LAST_COMMIT = lastSha.slice(0, 7);
fs.writeFileSync(REPO_DIR + 'repo.config.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('\n最新 commit = ' + lastSha);
console.log('回填 loader 并重打包: node _ui_repo/xitongge/push.cjs --commit ' + lastSha.slice(0, 7));
