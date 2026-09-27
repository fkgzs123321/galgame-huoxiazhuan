/**
 * 查清两件事：
 *   ① 活侠传现在到底几条世界书条目（用户说是 28，我记得是 26）
 *   ② src/活侠传 下有没有「我没动过、但被改了」的文件 —— 即共用工作区的实证
 */
import fs from 'node:fs';
import path from 'node:path';

const 根 = 'src/活侠传';
const st = JSON.parse(fs.readFileSync(path.join(根, 'tavern-cards-state.json'), 'utf8'));

console.log('══ ① entryManifest 逐组计数 ══');
let 总 = 0;
for (const [g, items] of Object.entries(st.entryManifest ?? {})) {
  const n = Object.keys(items as object).length;
  总 += n;
  console.log(`  ${g.padEnd(12)} ${String(n).padStart(3)}`);
}
console.log(`  ${'合计'.padEnd(12)} ${String(总).padStart(3)}`);

// 打包产物里的条目数（这才是真正进了卡的数字）
const png = path.join(根, '活侠传.png');
if (fs.existsSync(png)) {
  const raw = fs.readFileSync(png);
  // 找 ccv3 / chara 块
  let pos = 8;
  let 内嵌: any = null;
  while (pos < raw.length - 8) {
    const len = raw.readUInt32BE(pos);
    const typ = raw.toString('latin1', pos + 4, pos + 8);
    if (typ === 'tEXt') {
      const data = raw.subarray(pos + 8, pos + 8 + len);
      const z = data.indexOf(0);
      const k = data.toString('latin1', 0, z);
      if (k === 'ccv3' || k === 'chara') {
        const b64 = data.toString('latin1', z + 1);
        try {
          内嵌 = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        } catch { /* ignore */ }
      }
    }
    pos += 12 + len;
  }
  if (内嵌) {
    const d = 内嵌.data ?? 内嵌;
    const e = d.character_book?.entries ?? [];
    console.log(`\n  PNG 内嵌世界书条目: ${e.length}`);
    console.log(`  PNG 修改时间: ${fs.statSync(png).mtime.toLocaleString('zh-CN')}`);
    // 按 comment 分组，看看构成
    const 计: Record<string, number> = {};
    for (const x of e) {
      const c = String(x.comment ?? '?');
      计[c] = (计[c] ?? 0) + 1;
    }
    console.log('  条目名:', Object.keys(计).join('、'));
  }
}

console.log('\n══ ② src/活侠传 下最近改动（按 mtime）══');
const 全: Array<{ p: string; t: number; s: number }> = [];
function 走(d: string) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) 走(p);
    else {
      try {
        const s = fs.statSync(p);
        全.push({ p, t: s.mtimeMs, s: s.size });
      } catch { /* ignore */ }
    }
  }
}
走(根);
全.sort((a, b) => b.t - a.t);
for (const x of 全.slice(0, 14)) {
  console.log(`  ${new Date(x.t).toLocaleString('zh-CN')}  ${x.p}`);
}

console.log('\n══ ③ 顶层是否有「共享记忆」类机制 ══');
for (const 名 of ['AGENTS.md', '.cardrc.json', '_work', '.dsh', 'MEMORY.md', 'memory', '.git']) {
  const p = path.resolve(名);
  const 有 = fs.existsSync(p);
  let 附 = '';
  if (有 && fs.statSync(p).isDirectory()) {
    附 = `  (${fs.readdirSync(p).length} 项)`;
  }
  console.log(`  ${有 ? '有' : '无'}  ${名}${附}`);
}

// forge 通道：哪些卡共用一个 .cardrc.json
console.log('\n══ ④ forge 通道共用情况 ══');
const rc = path.resolve('.cardrc.json');
if (fs.existsSync(rc)) {
  const j = JSON.parse(fs.readFileSync(rc, 'utf8'));
  const 卡 = Object.keys(j);
  console.log(`  .cardrc.json 里登记了 ${卡.length} 张卡 —— 所有卡共用这一个通道文件`);
  const 有活 = 卡.filter(k => k.includes('活侠'));
  console.log(`  其中活侠传相关: ${有活.join('、') || '(无)'}`);
  for (const k of 有活) console.log(`    ${k} → ${JSON.stringify(j[k])}`);
}
