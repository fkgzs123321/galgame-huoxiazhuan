// 修用户测出的两个运行时错误
// ① 判定引擎：我从 euphoria 复制的引擎层文件，被我的「裸文本行→列表项」脚本喂了 `- `
//    → `- _出 =` 变成列表项 → EJS「Invalid left-hand side in assignment」
//    修法：**直接从 euphoria 源还原**（该文件零耦合、我没对它做过任何有意修改）
// ② CoT注入：我编了一个不存在的 API `registerPromptInjection`
//    → 正确是 `injectPrompt(key, prompt, order, sticky, uid)`（references/ejs/reference.md:451）
//    ＋ 预设里用 `<%- getPromptsInjected("CoT") %>`（features.md:634）
// ③ 顺带：扫描所有内容文件，把「EJS 块（<% %>）内被误加的行首 - 」还原
// ★ 铁律：先单文件验证 → 才全量
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const EU = path.join(ROOT, 'src', '旮旯给木-euphoria');
const 记 = [];

// ── ① 判定引擎：从 euphoria 源还原 ──
{
  const src = path.join(EU, '世界书/扮演准则/判定引擎.yaml');
  const dst = path.join(D, '世界书/扮演准则/判定引擎.yaml');
  if (fs.existsSync(src)) {
    const 原 = fs.readFileSync(src, 'utf8');
    // 源文件也带 @@generate_before？确认它无 `- ` 污染
    const 脏 = 原.split(/\r?\n/).filter(l => /^\s*- /.test(l)).length;
    fs.writeFileSync(dst, 原);
    记.push('① 判定引擎：从 euphoria 源还原（' + 原.length + ' 字符，含 `- ` 行 ' + 脏 + ' 条 → 应为 0）');
  } else 记.push('① ⚠ euphoria 源不存在');
}

// ── ② CoT注入：换成正确 API ──
{
  const p = path.join(D, '世界书/扮演准则/CoT注入.yaml');
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('registerPromptInjection')) {
    t = t.replace(/this\.registerPromptInjection\(\s*'CoT'\s*,/, "this.injectPrompt('CoT',");
    // 同时校正常见笔误
    t = t.replace(/registerPromptInjection/g, 'injectPrompt');
    fs.writeFileSync(p, t);
    记.push('② CoT注入：registerPromptInjection → **injectPrompt**（skills `ejs/reference.md:451` 的真实签名）');
  } else 记.push('② CoT注入：已是 injectPrompt');
  // 报告签名
  记.push('   正确签名：injectPrompt(key, prompt, order, sticky, uid)；预设里用 getPromptsInjected 取回');
}

// ── ③ 还原 EJS 块内被误加的行首 `- ` ──
// 规则：处于 `<% ... %>` 内，且行匹配 `^(\s*)- `，且该行看起来是 JS（含 = ; ( ) { } 或 var/if/for/return）
{
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(path.join(D, '世界书'));

  const 清洗 = (t) => {
    const L = t.split(/\r?\n/);
    let 在EJS = false;
    let n = 0;
    const out = L.map(l => {
      const 开 = /<%/.test(l), 闭 = /%>/.test(l);
      const 本行内 = 在EJS || 开;
      if (开 && !闭) 在EJS = true;
      if (闭) 在EJS = false;
      if (!本行内) return l;
      const m = l.match(/^(\s*)- (.*)$/);
      if (m) { n++; return m[1] + m[2]; }   // EJS 块内不可能有合法 YAML 列表项 → 无条件还原
      return l;
    }).join('\n');
    return { t: out, n };
  };

  // 单文件验证（用 判定引擎.yaml，它刚被还原，作为「已干净」的基线不适用；改用第一个受污染文件）
  const 受污 = 全.filter(p => { const r = 清洗(fs.readFileSync(p, 'utf8')); return r.n > 0; });
  if (受污.length) {
    const 样例 = 受污[0];
    const a = fs.readFileSync(样例, 'utf8');
    const ra = 清洗(a);
    console.log('③ 单文件验证：' + path.basename(样例) + ' 命中 ' + ra.n + ' 行');
    console.log('   样例前：' + a.split(/\r?\n/).find(l => /^\s*- /.test(l) && /[=;()]/.test(l)));
    console.log('   样例后：' + ra.t.split(/\r?\n/).find((l, i) => a.split(/\r?\n/)[i] !== l) || '(无变化)');
    if (ra.n > 0) fs.writeFileSync(样例, ra.t);
  }
  let 改 = 0, 行 = 0;
  for (const p of 全) {
    const a = fs.readFileSync(p, 'utf8');
    const r = 清洗(a);
    if (r.n > 0 && r.t !== a) { fs.writeFileSync(p, r.t); 改++; 行 += r.n; }
  }
  记.push('③ 还原 EJS 块内误加的 `- `：' + 改 + ' 个文件 / ' + 行 + ' 行（'+受污.length+' 个受污染）');
}

// ── ④ 终验 ──
{
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) 全.push(p); } })(path.join(D, '世界书'));
  let ok = 0; const bad = [];
  for (const p of 全) { try { YAML.parse(fs.readFileSync(p, 'utf8')); ok++; } catch (e) { bad.push(path.basename(p)); } }
  记.push('④ YAML 可解析 ' + ok + '/' + 全.length);
  // 全局检查：还有没有 EJS 块内被误加 `- ` 的残留
  let 残留 = 0;
  for (const p of 全) {
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    let inE = false;
    for (const l of L) {
      if (/<%/.test(l) && !/%>/.test(l)) { inE = true; continue; }
      if (/%>/.test(l)) { inE = false; continue; }
      if (inE && /^\s*- /.test(l)) 残留++;
    }
  }
  记.push('   EJS 块内残留 `- ` 行：' + 残留 + (残留 ? ' ❌' : ' ✅'));
}
console.log(记.join('\n'));
