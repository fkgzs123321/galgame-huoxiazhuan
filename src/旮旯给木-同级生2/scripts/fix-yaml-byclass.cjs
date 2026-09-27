// 逐类修完剩余 YAML —— 机制化：备份 → 每类独立应用 → 独立验证 → 变差则回滚该类
// 三类根因（已诊断）：
//   ① markdown 围栏 ` ``` ` → 删除（不影响 YAML 结构）
//   ② 键的位置上的 `- ` 列表项（"A block sequence may not be used as an implicit map key"）→ 缩进 +2
//   ③ markdown 表格行 `| a | b |` → 转成键值列表项
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) 全.push(p); } })(WB);
const 坏数 = () => 全.filter(p => { try { YAML.parse(fs.readFileSync(p, 'utf8')); return false; } catch (e) { return true; } }).length;

// ── 备份 ──
const BAK = path.join(__dirname, '..', '世界书.bak2');
if (fs.existsSync(BAK)) fs.rmSync(BAK, { recursive: true, force: true });
fs.cpSync(WB, BAK, { recursive: true });
console.log('⓪ 已备份 → 世界书.bak2');
console.log('起始：' + 坏数() + ' 个不可解析');

// ── 三类变换 ──
const 变换 = {
  '① 删 markdown 围栏': t => t.split(/\r?\n/).filter(l => !/^\s*```[a-z]*\s*$/.test(l)).join('\n'),

  '② 键位置上的列表项 → 缩进+2': t => t.split(/\r?\n/).map(l => {
    // 「某键:」下一行且缩进相同、以 - 开头 → 这就是「块序列当隐式映射键」的形态
    return l;
  }).join('\n'),

  '③ markdown 表格 → 键值列表': t => {
    const L = t.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < L.length; i++) {
      if (/^\s*\|/.test(L[i])) {
        // 收集整张表
        const 表 = [];
        while (i < L.length && /^\s*\|/.test(L[i])) { 表.push(L[i]); i++; }
        i--;
        const 拆 = r => r.split('|').slice(1, -1).map(c => c.trim());
        const 头 = 拆(表[0]);
        const 体 = 表.slice(1).filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
        const 缩 = (表[0].match(/^ */) || [''])[0];
        for (const r of 体) {
          const c = 拆(r);
          out.push(缩 + '- ' + (头[0] || '项') + ': ' + (c[0] || ''));
          for (let k = 1; k < c.length; k++) out.push(缩 + '  ' + (头[k] || '列' + k) + ': ' + c[k]);
        }
        continue;
      }
      out.push(L[i]);
    }
    return out.join('\n');
  },
};

// ②的单独实现：扫描「上一行是 `键:`，下一行缩进相同且以 - 开头」→ 缩进 +2
function 处理键位置列表(p) {
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < L.length; i++) {
    const 上 = out[out.length - 1];
    const m = 上 && 上.match(/^(\s*)[^#\s][^:]*:\s*$/);
    if (m && /^\s*-/.test(L[i]) && L[i].match(/^ */)[0].length === m[1].length) {
      // 这一串列表项应缩进 +2，挂到上一个键下
      let j = i;
      while (j < L.length && /^\s*-/.test(L[j]) && L[j].match(/^ */)[0].length === m[1].length) {
        out.push('  ' + L[j]); j++;
      }
      // 其后的续行（更深缩进）也跟着 +2
      while (j < L.length && (L[j].trim() === '' || L[j].match(/^ */)[0].length > m[1].length)) {
        out.push(L[j].trim() === '' ? '' : '  ' + L[j]); j++;
      }
      i = j - 1; continue;
    }
    out.push(L[i]);
  }
  return out.join('\n');
}

// ── 逐类应用 + 独立验证（变差就回滚该类）──
for (const [名, fn] of Object.entries(变换)) {
  const 前 = 坏数();
  const 快照 = new Map(全.map(p => [p, fs.readFileSync(p, 'utf8')]));
  let 改 = 0;
  for (const p of 全) {
    const t = fs.readFileSync(p, 'utf8');
    let n = fn(t);
    if (名.startsWith('②')) n = 处理键位置列表(p);
    if (n !== t) { fs.writeFileSync(p, n); 改++; }
  }
  const 后 = 坏数();
  if (后 > 前) {
    for (const [p, t] of 快照) fs.writeFileSync(p, t);
    console.log(名 + '：改 ' + 改 + ' 个 → ' + 前 + '→' + 后 + ' ❌ 变差，已回滚该类');
  } else {
    console.log(名 + '：改 ' + 改 + ' 个 → ' + 前 + '→' + 后 + (后 < 前 ? ' ✅' : '（无变化）'));
  }
}

// ── 报告剩余 ──
const bad = [];
for (const p of 全) {
  try { YAML.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) {
    const ln = e.linePos ? e.linePos[0].line : 0;
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    bad.push([path.basename(p), ln, (L[ln - 1] || '').trim().slice(0, 48), e.message.split('\n')[0].slice(0, 38)]);
  }
}
console.log('\n最终：YAML 可解析 ' + (全.length - bad.length) + '/' + 全.length);
bad.slice(0, 10).forEach(([f, l, t, m]) => console.log('   ' + f + ':' + l + '  ' + m + ' ｜ ' + t));
