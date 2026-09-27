/**
 * 看打包后世界书条目的触发配置 —— 为写模拟器做准备。
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const png = 'src/活侠传/活侠传.png';
const raw = fs.readFileSync(png);

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
      try { 内嵌 = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')); } catch { /* */ }
    }
  }
  pos += 12 + len;
}

const d = 内嵌?.data ?? 内嵌;
const 条目 = d.character_book.entries;

console.log(`世界书条目 ${条目.length} 条\n`);
console.log('字段名:', Object.keys(条目[0]).join(', '));
console.log();
console.log('─'.repeat(100));
console.log('comment'.padEnd(26) + 'constant'.padEnd(10) + 'selective'.padEnd(11) + 'keys');
console.log('─'.repeat(100));

for (const e of 条目) {
  const keys = (e.keys ?? []).join('|') || '—';
  console.log(
    String(e.comment ?? '?').padEnd(26) +
    String(e.constant).padEnd(10) +
    String(e.selective ?? false).padEnd(11) +
    keys,
  );
}

console.log();
// 统计
const 常数 = 条目.filter((e: any) => e.constant).length;
const 选择性 = 条目.filter((e: any) => !e.constant).length;
console.log(`constant（常驻）: ${常数} 条`);
console.log(`非 constant（靠关键词）: ${选择性} 条`);

// 看一条 selective 的完整结构
const 样例 = 条目.find((e: any) => !e.constant && (e.keys ?? []).length);
if (样例) {
  console.log('\n非 constant 条目的完整结构示例：');
  console.log(JSON.stringify(样例, null, 2).slice(0, 1200));
}
