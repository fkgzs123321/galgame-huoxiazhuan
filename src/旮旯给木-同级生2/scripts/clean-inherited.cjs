// 按用户要求清洗「从 euphoria 带来的格式 + 我写的垃圾解释」
// ① 删 `CoT注入.yaml`（用户：我只需要手动把思维链复制到预设，不需要这条世界书条目）
// ② 删所有 EJS 注释块 <%/* ... */%> —— 那是**元叙事**（rules-check: 写作指引/用途说明一律删）
//    注记移到 `注记备份.md`（笔记留在设计稿，条目只留内容）
// ③ 报告「还有哪些 EJS 是 euphoria 带来的、但本卡不需要」
// ④ 清说明式开场白里的 CoT 提示
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const WB = path.join(D, '世界书');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const 记 = [];

// ── ① 删 CoT 条目 ──
{
  const p = path.join(WB, '扮演准则/CoT注入.yaml');
  if (fs.existsSync(p)) fs.rmSync(p);
  const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
  if ((S.entryManifest['扮演准则'] || {})['CoT注入']) {
    const f = path.join(D, '_p.json');
    fs.writeFileSync(f, JSON.stringify([{ op: 'remove', path: '/entryManifest/扮演准则/CoT注入' }]));
    try { execFileSync('node', [forge, 'patch', '旮旯给木-同级生2', '--file', f], { encoding: 'utf8' }); 记.push('① 已删 CoT注入 条目（文件 + entryManifest）'); }
    catch (e) { 记.push('① ⚠ ' + String(e.stdout || e.message).split('\n')[0]); }
    fs.rmSync(f);
  } else 记.push('① CoT注入 条目已不在 state');
}

// ── ④ 清说明式开场白里的 CoT 提示 ──
{
  const p = path.join(D, '开场白/0.txt');
  let t = fs.readFileSync(p, 'utf8');
  const 前 = t.length;
  t = t.replace(/\n*【要用上思维链注入[\s\S]*$/m, '\n');
  if (t.length !== 前) { fs.writeFileSync(p, t.trimEnd() + '\n'); 记.push('④ 说明式开场白已去掉 CoT 提示（' + (前 - t.length) + ' 字符）'); }
  else 记.push('④ 说明式开场白无 CoT 提示');
}

// ── ② 删所有 EJS 注释块 ──
{
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);
  const 备份 = [];
  let 文件数 = 0, 省 = 0;
  for (const p of 全) {
    let t = fs.readFileSync(p, 'utf8');
    const m = t.match(/<%\/\*[\s\S]*?\*\/%>/g);
    if (!m) continue;
    m.forEach(x => 备份.push('## ' + path.relative(D, p).replace(/\\/g, '/') + '\n\n```\n' + x.slice(3, -3).trim() + '\n```\n'));
    省 += m.join('').length;
    t = t.replace(/<%\/\*[\s\S]*?\*\/%>\s*/g, '');
    fs.writeFileSync(p, t.replace(/^\s*\n/, ''));
    文件数++;
  }
  if (备份.length) {
    fs.writeFileSync(path.join(D, '注记备份.md'),
      '# EJS 注释块里的注记（已从条目中删除）\n\n> 依据 `rules-check.md`：**元叙事（写作指引 / 用途说明 / 标记词）一律删**；\n> **注记留在设计稿，条目只留内容**。\n> 下面的内容原本写在条目的 `<%/* ... */%>` 注释里 —— 对 AI 无用，只占文件字符。\n\n' + 备份.join('\n'));
  }
  记.push('② 删 EJS 注释块：' + 备份.length + ' 处（' + 文件数 + ' 个文件），省 ' + 省 + ' 字符（注记已存到 `注记备份.md`）');
}

// ── ③ 还有哪些 EJS 是 euphoria 带来的 ──
{
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);
  const 有 = 全.filter(p => /<%/.test(fs.readFileSync(p, 'utf8')));
  记.push('③ 仍含 EJS 的文件（' + 有.length + ' 个）—— 逐个判断是不是本卡真的需要：');
  有.forEach(p => {
    const t = fs.readFileSync(p, 'utf8');
    const 用 = [];
    if (/getvar\(/.test(t)) 用.push('读变量');
    if (/setvar\(|incvar\(|decvar\(/.test(t)) 用.push('写变量');
    if (/getwi\(/.test(t)) 用.push('读条目');
    if (/injectPrompt\(/.test(t)) 用.push('CoT注入');
    if (/this\.[A-Za-z_$]+\s*=|function\s/.test(t)) 用.push('注册全局/函数');
    if (/<%=/.test(t)) 用.push('输出块');
    记.push('   ' + path.relative(WB, p).replace(/\\/g, '/') + '  → ' + (用.join('／') || '？'));
  });
}
console.log(记.join('\n'));
