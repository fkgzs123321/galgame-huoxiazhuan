// 读取暗黑地牢的 tavern_helper 和正则脚本完整内容
import fs from 'fs';

const PNG_PATH = 'src/暗黑地牢/暗黑地牢v2.6.1.png';
const buf = fs.readFileSync(PNG_PATH);

let off = 8;
const chunks = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  const dataStart = off + 8;
  const dataEnd = dataStart + len;
  chunks.push({ type, len, data: buf.slice(dataStart, dataEnd) });
  if (type === 'IEND') break;
  off = dataEnd + 4;
}

let ccv3Obj = null;
for (const c of chunks) {
  if (c.type === 'tEXt') {
    const kwEnd = c.data.indexOf(0);
    const kw = c.data.toString('ascii', 0, kwEnd);
    const b64 = c.data.toString('ascii', kwEnd + 1);
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      const obj = JSON.parse(json);
      if (kw === 'ccv3' || kw === 'chara') {
        ccv3Obj = obj;
        break;
      }
    } catch (err) {}
  }
}

// 1. tavern_helper 结构
const th = ccv3Obj.data?.extensions?.tavern_helper;
console.log('=== tavern_helper 顶层字段 ===');
console.log('type:', typeof th, '| keys:', th ? Object.keys(th) : 'null');
if (th) {
  console.log('tavern_helper JSON (前500字符):', JSON.stringify(th).slice(0, 500));
  // 如果有 scripts 数组
  if (th.scripts) {
    console.log('\n--- tavern_helper.scripts ---');
    for (let i = 0; i < th.scripts.length; i++) {
      const s = th.scripts[i];
      console.log(`  [${i}] name=${s.name} | enabled=${s.enabled} | strategy=${s.strategy}`);
      if (s.content) {
        console.log(`      content 长度=${s.content.length} | 前200字符: ${s.content.slice(0,200).replace(/\n/g,'\\n')}`);
      }
    }
  }
  // 如果有其他结构
  if (th.html) {
    console.log('\n--- tavern_helper.html 长度:', th.html.length);
  }
}

// 2. 正则脚本完整内容
const regexes = ccv3Obj.data?.extensions?.regex_scripts || [];
console.log(`\n=== 正则脚本 (${regexes.length}个) ===`);
for (let i = 0; i < regexes.length; i++) {
  const r = regexes[i];
  console.log(`\n--- 正则[${i}]: ${r.scriptName} ---`);
  console.log('  disabled:', r.disabled);
  console.log('  findRegex:', r.findRegex);
  console.log('  replaceString (前300字符):', (r.replaceString || '').slice(0, 300).replace(/\n/g, '\\n'));
  if ((r.replaceString || '').length > 300) {
    console.log('  replaceString 总长度:', (r.replaceString || '').length);
  }
  console.log('  trimStrings:', r.trimStrings);
  console.log('  placement:', r.placement);
}

// 3. 检查 depth_prompt
console.log('\n=== depth_prompt ===');
console.log(JSON.stringify(ccv3Obj.data?.extensions?.depth_prompt));

// 4. 检查 alternate_greetings[0] 完整内容
console.log('\n=== alternate_greetings[0] 完整内容 ===');
const ag0 = ccv3Obj.data?.alternate_greetings?.[0] || '';
console.log('长度:', ag0.length);
console.log('内容:');
console.log(ag0);
console.log('--- 包含 <StatusPlaceHolderImpl/>?', ag0.includes('<StatusPlaceHolderImpl/>'));
console.log('--- 包含 <UpdateVariable>?', ag0.includes('<UpdateVariable>'));
