#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// fix-entry-positions.mjs · 修 depth 违规（skills 铁律：D1+ 禁止）
//
// 背景：原卡把 12 条条目放进了 depth 1-4，而且是有理由的 ——
//   `核心铁律` 的注释写着「depth=1 最高优先级行为约束（**近因偏差修复**）」。
//   近因偏差是真的（越靠近对话历史，AI 越容易遵守），但 skills 铁律禁止 D1+。
//
// 处置（两者都合规，且满足原作者「要近因优势」的诉求）：
//   扮演准则 10 条 → `before_char`（skills typeLists 的默认映射就是 before_char 含「扮演准则」）
//   核心铁律      → `depth: 0`（skills 只禁 D1+，D0 同样是「紧贴对话之前」，近因优势保留）
//   MVU 3 条      → `depth: 0`
//
// 用法：
//   node scripts/fix-entry-positions.mjs            # 预演，只显示会改什么
//   node scripts/fix-entry-positions.mjs --apply    # 实际写入（先自动备份）
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.resolve(path.join(__dirname, '..', '..', '同级生2'));
const INDEX = path.join(SRC, 'index.yaml');

if (!fs.existsSync(INDEX)) { console.error('[FAIL] 找不到 ' + INDEX); process.exit(2); }

// ── 修复清单（共 16 条，与 audit-nanpa2.mjs 报的 depth 违规数一致）──
// toBeforeChar: 改成「角色定义之前」，删掉「角色:」「深度:」两行
// toDepth0:     保留「指定深度」，把深度改成 0
const RULES = [
  // 扮演准则 11 条（含 AI推理链）
  {
    names: ['防口胡', '防神化', '防绝望', '防全知', '防崩溃', '防超自然',
      '道德伦理', '法律意识', '经济护栏', '合理性审查', 'AI推理链'],
    toBeforeChar: true,
  },
  // 核心铁律：最硬的规则，保留近因优势但降到合规的 depth 0
  { names: ['核心铁律'], toDepth0: true },
  // MVU 4 条
  {
    names: ['[mvu_plot]输出格式', '[mvu_update]变量输出格式',
      '[mvu_update]变量输出格式（额外模型）', '[mvu_update]变量更新规则'],
    toDepth0: true,
  },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const targetOf = (name) => RULES.find((r) => r.names.includes(name)) || null;

const original = fs.readFileSync(INDEX, 'utf8');
const lines = original.split(/\r?\n/);
const drop = new Set();
const changes = [];

for (let i = 0; i < lines.length; i++) {
  const mn = lines[i].match(/^\s*-\s*名称:\s*(.+?)\s*$/);
  if (!mn) continue;
  const name = mn[1].replace(/^["']|["']$/g, '');
  const rule = targetOf(name);
  if (!rule) continue;

  // 定位该条目的「插入位置」块
  let posIdx = -1;
  for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
    if (/^\s*-\s*(名称|文件夹):/.test(lines[j])) break;
    if (/^\s*插入位置:\s*\{\s*类型:\s*([^,}]+)/.test(lines[j])) {
      // 内联写法
      const m = lines[j].match(/类型:\s*([^,}]+)/);
      changes.push({ name, from: m ? m[1].trim() + ' (内联)' : '内联', to: rule.toDepth0 ? 'depth 0' : '角色定义之前', line: j + 1, mode: 'inline' });
      if (rule.toDepth0) lines[j] = lines[j].replace(/深度:\s*\d+/, '深度: 0').replace(/(类型:\s*[^,}]+)(?![\s\S]*深度)/, '$1');
      else lines[j] = lines[j].replace(/类型:\s*[^,}]+/, '类型: 角色定义之前');
      posIdx = j;
      break;
    }
    if (/^\s*插入位置:\s*$/.test(lines[j])) { posIdx = j; break; }
  }
  if (posIdx < 0) continue;

  // 在「插入位置」块内逐行改
  for (let k = posIdx + 1; k < Math.min(posIdx + 7, lines.length); k++) {
    const l = lines[k];
    if (/^\s*-\s*(名称|文件夹):/.test(l)) break;
    if (/^\s*(递归|文件|启用|激活策略):/.test(l)) break;

    if (rule.toBeforeChar) {
      if (/^\s*类型:\s*指定深度\s*$/.test(l)) {
        changes.push({ name, from: '类型: 指定深度', to: '类型: 角色定义之前', line: k + 1, mode: 'replace' });
        lines[k] = l.replace('指定深度', '角色定义之前');
      } else if (/^\s*角色:\s*\S+\s*$/.test(l)) {
        changes.push({ name, from: '角色: 系统', to: '（删除）', line: k + 1, mode: 'drop' });
        drop.add(k);
      } else if (/^\s*深度:\s*\d+\s*$/.test(l)) {
        changes.push({ name, from: l.trim(), to: '（删除）', line: k + 1, mode: 'drop' });
        drop.add(k);
      }
    } else if (rule.toDepth0) {
      if (/^\s*深度:\s*(\d+)\s*$/.test(l)) {
        const old = l.match(/深度:\s*(\d+)/)[1];
        if (old !== '0') {
          changes.push({ name, from: '深度: ' + old, to: '深度: 0', line: k + 1, mode: 'replace' });
          lines[k] = l.replace(/深度:\s*\d+/, '深度: 0');
        }
      }
    }
  }
}

// ── 输出 ──
console.log('='.repeat(76));
console.log('修正 depth 违规 · ' + (APPLY ? '应用模式' : '预演模式（加 --apply 才会写入）'));
console.log('='.repeat(76));
if (!changes.length) {
  console.log('无需修改（要么已修过，要么没找到目标条目）');
  process.exit(0);
}
let last = '';
for (const c of changes) {
  if (c.name !== last) { console.log('\n  ' + c.name); last = c.name; }
  console.log('    行 ' + String(c.line).padStart(5) + '  ' + c.from.padEnd(24) + ' → ' + c.to);
}
console.log('\n合计 ' + changes.length + ' 处改动，涉及 ' + new Set(changes.map((c) => c.name)).size + ' 个条目');

if (!APPLY) {
  console.log('\n（预演结束。确认无误后加 --apply 写入）');
  process.exit(0);
}

// ── 备份 + 写入 ──
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backup = INDEX + '.bak-' + stamp;
fs.copyFileSync(INDEX, backup);
console.log('\n已备份: ' + path.basename(backup));

const out = lines.filter((_, i) => !drop.has(i)).join('\n');
fs.writeFileSync(INDEX, out, 'utf8');
console.log('已写入: ' + INDEX);
console.log('（原 ' + original.split(/\r?\n/).length + ' 行 → 现 ' + out.split('\n').length + ' 行）');
