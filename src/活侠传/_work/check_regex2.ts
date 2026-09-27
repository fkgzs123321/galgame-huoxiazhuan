/**
 * 安静版核验：只输出短行，绝不打印 HTML 内容。
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
const raw_rs = j.extensions?.regex_scripts;

console.log('regex_scripts 类型:', Array.isArray(raw_rs) ? '数组' : typeof raw_rs);
const 列表: any[] = Array.isArray(raw_rs) ? raw_rs : Object.values(raw_rs ?? {});
console.log('条数:', 列表.length);
console.log();

for (const [i, r] of 列表.entries()) {
  const 名 = r.scriptName ?? r.name ?? Object.keys(raw_rs)[i] ?? `#${i}`;
  const 内联 = String(r.replaceString ?? '').length;
  console.log(`[${i}] ${名}`);
  console.log(`    findRegex     ${r.findRegex}`);
  console.log(`    promptOnly    ${r.promptOnly}`);
  console.log(`    markdownOnly  ${r.markdownOnly}`);
  console.log(`    runOnEdit     ${r.runOnEdit}`);
  console.log(`    placement     ${JSON.stringify(r.placement)}`);
  console.log(`    disabled      ${r.disabled}`);
  console.log(`    replaceString ${内联} 字符 (${(内联 / 1024).toFixed(0)} KB)`);
  console.log();
}

// 找面板那条，验证关键字符串（只报存在性，不打印内容）
const 面板条 = 列表.find((r: any) => String(r.replaceString ?? '').length > 100000);
if (面板条) {
  const h = String(面板条.replaceString);
  console.log('══ 面板内容抽查（只报有无）══');
  for (const [名, kw] of [
    ['DOCTYPE', '<!DOCTYPE'],
    ['charset', 'charset'],
    ['挂载点', 'id="app"'],
    ['本旬可做的事', '本旬可做的事'],
    ['云开见日', '云开见日'],
    ['鹿皮囊', '鹿皮囊'],
    ['唐门', '唐门'],
    ['活侠传', '活侠传'],
  ] as [string, string][]) {
    console.log(`  ${h.includes(kw) ? '✓' : '✗'} ${名}`);
  }
} else {
  console.log('✗ 找不到含大段 HTML 的正则条目');
}

console.log();
console.log('══ 开场白占位符 ══');
const alt = j.alternate_greetings ?? [];
console.log(`  first_mes: ${String(j.first_mes).includes('<StatusPlaceHolderImpl/>') ? '✓' : '✗'}`);
console.log(`  备用 ${alt.length} 条: ${alt.every((a: string) => a.includes('<StatusPlaceHolderImpl/>')) ? '✓' : '✗'}`);
