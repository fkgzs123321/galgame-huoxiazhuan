/**
 * 最终核验：PNG 里该有的都在。
 */
import fs from 'node:fs';

const raw = fs.readFileSync('src/活侠传/活侠传.png');
let pos = 8;
let 内嵌: any = null;
while (pos < raw.length - 8) {
  const len = raw.readUInt32BE(pos);
  const typ = raw.toString('latin1', pos + 4, pos + 8);
  if (typ === 'tEXt') {
    const data = raw.subarray(pos + 8, pos + 8 + len);
    const z = data.indexOf(0);
    if (data.toString('latin1', 0, z) === 'ccv3') {
      try { 内嵌 = JSON.parse(Buffer.from(data.toString('latin1', z + 1), 'base64').toString('utf8')); } catch { /* */ }
    }
  }
  pos += 12 + len;
}

const j = 内嵌.data ?? 内嵌;
let 缺 = 0;
const 查 = (名: string, 值: unknown, 条件: (v: any) => boolean) => {
  const ok = 条件(值);
  if (!ok) 缺++;
  const 显 = typeof 值 === 'string' ? `${值.length} 字` : Array.isArray(值) ? `${值.length} 项` : String(值);
  console.log(`  ${ok ? '✓' : '✗'} ${名.padEnd(28)} ${显}`);
};

console.log('══ 顶层字段 ══');
查('name', j.name, v => v === '活侠传');
查('first_mes', j.first_mes, v => v.length > 400);
查('alternate_greetings', j.alternate_greetings, v => v.length === 3);
查('description', j.description, v => v.length > 300);
查('personality', j.personality, v => v.length > 200);
查('scenario', j.scenario, v => v.length > 100);
查('mes_example', j.mes_example, v => v.length > 500);
查('creator_notes', j.creator_notes, v => v.length > 10);
查('tags', j.tags, v => v.length >= 4);

console.log('\n══ 世界书 ══');
const 条目 = j.character_book.entries;
查('世界书条目', 条目, v => v.length === 26);
查('  其中常驻', 条目.filter((e: any) => e.constant), v => v.length === 14);
查('  其中关键词触发', 条目.filter((e: any) => !e.constant), v => v.length === 12);
const 带条件 = 条目.filter((e: any) => String(e.content).includes('matchChatMessages'));
查('  带 @@if 条件', 带条件, v => v.length === 12);
const 全负 = 带条件.every((e: any) => /start:\s*-\d+/.test(String(e.content)));
查('  扫描范围全为负数', 全负, v => v === true);

console.log('\n══ 脚本 ══');
const 脚本 = j.extensions?.tavern_helper?.scripts ?? [];
查('脚本数', 脚本, v => v.length === 2);
for (const s of 脚本) {
  console.log(`      ${s.name}: ${s.content?.length ?? 0} 字符  enabled=${s.enabled}`);
}

console.log('\n══ 开场白 ══');
查('first_mes', j.first_mes, v => v.includes('赵活') || v.includes('正心堂'));
for (const [i, a] of (j.alternate_greetings ?? []).entries()) {
  console.log(`      greeting[${i + 1}]: ${String(a).length} 字`);
}

console.log('\n' + '═'.repeat(50));
if (缺) {
  console.log(`✗ 有 ${缺} 项不合格`);
  process.exit(1);
}
console.log('✓ 全部合格');
