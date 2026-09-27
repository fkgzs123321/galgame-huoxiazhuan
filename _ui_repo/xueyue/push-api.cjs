#!/usr/bin/env node
// push-api.cjs · 用 GitHub Contents API 直推（Node fetch 版，不依赖 curl）
// token 从 ~/.workbuddy/mcp.json 的 github-pat.env.GITHUB_PERSONAL_ACCESS_TOKEN 读，不打印、不入日志
const fs = require('node:fs');

const WS = 'E:/Games/写卡/tavern_helper_template/';
const REPO_DIR = WS + '_ui_repo/xueyue/';
const DIST = REPO_DIR + 'dist/';
const cfg = JSON.parse(fs.readFileSync(REPO_DIR + 'repo.config.json', 'utf8'));
const DRY = process.argv.includes('--dry');

const mcpPath = 'C:/Users/64806/.workbuddy/mcp.json';
const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
const TOKEN = (((mcp.mcpServers || mcp.servers || {})['github-pat'] || {}).env || {}).GITHUB_PERSONAL_ACCESS_TOKEN;
if (!TOKEN) { console.error('✗ 没读到 github-pat token'); process.exit(2); }

const API = 'https://api.github.com/repos/' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '/contents/';
const headers = {
  Authorization: 'Bearer ' + TOKEN,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'tavern-ui-push',
  'Content-Type': 'application/json',
};

async function api(method, url, body) {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { throw new Error('API 返回不是 JSON: ' + text.slice(0, 200)); }
}

(async () => {
  const files = fs.readdirSync(DIST).filter((f) => !f.startsWith('_'));
  console.log('将上传 ' + files.length + ' 个文件到 ' + cfg.GH_NAME + '/' + cfg.GH_PROJECT_NAME + '：');
  files.forEach((f) => console.log('  ' + f.padEnd(16) + fs.statSync(DIST + f).size + ' 字节'));
  if (DRY) process.exit(0);

  let lastSha = '';
  for (const f of files) {
    const content = fs.readFileSync(DIST + f).toString('base64');
    let sha = null;
    try {
      const cur = await api('GET', API + encodeURIComponent(f) + '?ref=' + cfg.BRANCH);
      if (cur && cur.sha) sha = cur.sha;
    } catch (e) {}
    const body = { message: 'ui: ' + f, content, branch: cfg.BRANCH };
    if (sha) body.sha = sha;
    const r = await api('PUT', API + encodeURIComponent(f), body);
    if (r.commit && r.commit.sha) lastSha = r.commit.sha;
    console.log('  ✓ ' + f.padEnd(16) + (sha ? '(更新)' : '(新建)') + '  ' + String(lastSha).slice(0, 7));
  }

  cfg.LAST_COMMIT = lastSha.slice(0, 7);
  fs.writeFileSync(REPO_DIR + 'repo.config.json', JSON.stringify(cfg, null, 2) + '\n');
  console.log('\n最新 commit = ' + lastSha);
  console.log('回填 loader 并重打包: node _ui_repo/xueyue/push.cjs --commit ' + lastSha.slice(0, 7));
})().catch((e) => { console.error('✗ ' + (e && e.message || e)); process.exit(1); });
