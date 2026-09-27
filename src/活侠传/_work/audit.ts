/**
 * 交付前盘点：卡里还有哪些字段是空的 / 未验证的。
 */
import fs from 'node:fs';
import path from 'node:path';

const 根 = 'src/活侠传';
const st = JSON.parse(fs.readFileSync(path.join(根, 'tavern-cards-state.json'), 'utf8'));

console.log('══ ① 角色卡顶层字段 ══');
const 字段 = [
  'name', 'description', 'personality', 'scenario', 'first_messages',
  'mes_example', 'system_prompt', 'post_history_instructions',
  'tags', 'creator', 'creator_notes', 'version', 'avatar',
];
for (const k of 字段) {
  const v = st[k];
  let 状态: string;
  if (Array.isArray(v)) 状态 = `${v.length} 条`;
  else if (typeof v === 'string') 状态 = v ? `${v.length} 字` : '★ 空';
  else 状态 = String(v ?? '★ 空');
  console.log(`  ${k.padEnd(26)} ${状态}`);
}

console.log('\n══ ② 开场白文件 ══');
for (const f of st.first_messages ?? []) {
  const p = path.join(根, f);
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8');
    console.log(`  ✓ ${f}  ${c.length} 字  ${c.split('\n').length} 行`);
  } else {
    console.log(`  ✗ ${f} 不存在`);
  }
}

console.log('\n══ ③ 世界书条目文件 ══');
let 缺 = 0;
let 条数 = 0;
for (const [组, 条目] of Object.entries(st.entryManifest ?? {})) {
  for (const [名, 项] of Object.entries(条目 as any)) {
    条数++;
    const p = (项 as any).path;
    if (p && !fs.existsSync(path.join(根, p))) {
      console.log(`  ✗ ${组}/${名} → ${p}`);
      缺++;
    }
  }
}
console.log(`  共 ${条数} 条，缺文件 ${缺} 条`);

console.log('\n══ ④ 引擎脚本与接入 ══');
const 脚本 = [
  '脚本/引擎.js', '脚本/引擎.esm.ts', '脚本/契约.ts',
  '脚本/前置运行时.ts', '脚本/结算.ts', '脚本/战斗结算.ts',
  '脚本/关系.ts', '脚本/物品.ts', '脚本/MVU.txt', '脚本/Zod.txt',
];
for (const f of 脚本) {
  const p = path.join(根, f);
  if (fs.existsSync(p)) {
    console.log(`  ✓ ${f.padEnd(24)} ${(fs.statSync(p).size / 1024).toFixed(1)} KB`);
  } else {
    console.log(`  ✗ ${f}`);
  }
}

console.log('\n══ ⑤ 自测脚本 ══');
const 自测 = fs.readdirSync(path.join(根, '_work'))
  .filter(f => /^(test-|check_|sim_)/.test(f));
for (const f of 自测) console.log(`  ${f}`);

console.log('\n══ ⑥ 世界书条目里，内容为空的 ══');
const 世界书目录 = path.join(根, '世界书');
function 走(d: string) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) 走(p);
    else if (/\.(yaml|txt)$/.test(f.name)) {
      const c = fs.readFileSync(p, 'utf8');
      // 去掉注释和空行后看有没有实内容
      const 实 = c.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).join('');
      if (实.length < 50) {
        console.log(`  ⚠ ${p.replace(根 + '\\', '')} 实内容仅 ${实.length} 字符`);
      }
    }
  }
}
走(世界书目录);
console.log('  （无输出 = 全部有实质内容）');
