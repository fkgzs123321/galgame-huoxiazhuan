// _inspect_th.mjs - 检查 tavern_helper 字段及JSON合法性
import fs from 'fs';
import path from 'path';

const CARD_DIR = path.join('src', '不要玩弄我的鸡吧-forge');
const NEW = path.join(CARD_DIR, '不要玩弄我的鸡吧-forge.png');

function readChunks(buf) {
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    chunks.push({ type, data: buf.subarray(dataStart, dataEnd) });
    if (type === 'IEND') break;
    off = dataEnd + 4;
  }
  return chunks;
}

const buf = fs.readFileSync(NEW);
const chunks = readChunks(buf);

let ccv3Obj = null;
for (const c of chunks) {
  if (c.type === 'tEXt') {
    const kwEnd = c.data.indexOf(0);
    const kw = c.data.toString('ascii', 0, kwEnd);
    if (kw === 'ccv3') {
      const b64 = c.data.toString('ascii', kwEnd + 1);
      const json = Buffer.from(b64, 'base64').toString('utf8');
      console.log(`ccv3 JSON字符数: ${json.length}`);
      console.log(`ccv3 JSON字节数: ${Buffer.byteLength(json, 'utf8')}`);
      // 1. 检查base64合法性
      const reB64 = /^[A-Za-z0-9+/=]+$/;
      const cleanB64 = b64;
      if (!reB64.test(cleanB64)) {
        console.log('✗ base64包含非法字符!');
        const bad = [];
        for (let i = 0; i < b64.length; i++) {
          const ch = b64[i];
          if (!reB64.test(ch)) bad.push({ i, ch: ch.charCodeAt(0) });
        }
        console.log(`  非法字符数: ${bad.length}`);
        console.log(`  前10个非法位置:`, bad.slice(0, 10));
      } else {
        console.log('✓ base64字符全部合法');
      }
      // 2. 验证base64长度是否4的倍数
      console.log(`base64长度: ${b64.length}, mod 4 = ${b64.length % 4}`);
      // 3. JSON.parse
      try {
        ccv3Obj = JSON.parse(json);
        console.log('✓ JSON.parse成功');
      } catch (e) {
        console.log(`✗ JSON.parse失败: ${e.message}`);
        // 找出错误位置
        const m = e.message.match(/position (\d+)/);
        if (m) {
          const pos = parseInt(m[1]);
          console.log(`  错误位置: ${pos}`);
          console.log(`  附近内容: ${JSON.stringify(json.slice(Math.max(0, pos - 100), pos + 100))}`);
        }
        process.exit(1);
      }
      break;
    }
  }
}

if (!ccv3Obj) {
  console.log('✗ 未找到ccv3');
  process.exit(1);
}

// 4. 检查tavern_helper
const th = ccv3Obj.data?.extensions?.tavern_helper;
if (!th) {
  console.log('tavern_helper: 不存在');
} else {
  console.log(`\n========== tavern_helper ==========`);
  console.log(`对象keys: ${Object.keys(th).join(', ')}`);
  for (const [k, v] of Object.entries(th)) {
    if (typeof v === 'string') {
      console.log(`\n[${k}] string, 字符=${v.length}, 字节=${Buffer.byteLength(v, 'utf8')}`);
      // 显示前200字符
      console.log(`  前200字符: ${v.slice(0, 200)}`);
      if (v.length > 200) console.log(`  ...`);
      console.log(`  后200字符: ${v.slice(-200)}`);
    } else if (Array.isArray(v)) {
      console.log(`\n[${k}] array, 长度=${v.length}, JSON字符=${JSON.stringify(v).length}`);
      v.forEach((item, i) => {
        const s = JSON.stringify(item);
        console.log(`  [${i}] 长度=${s.length} - ${s.slice(0, 150)}${s.length > 150 ? '...' : ''}`);
      });
    } else if (typeof v === 'object') {
      console.log(`\n[${k}] object, JSON字符=${JSON.stringify(v).length}`);
      console.log(`  keys: ${Object.keys(v).join(', ')}`);
    } else {
      console.log(`\n[${k}] ${typeof v}: ${v}`);
    }
  }
}

// 5. 重新序列化验证
console.log('\n========== 重新序列化验证 ==========');
try {
  const reJson = JSON.stringify(ccv3Obj);
  console.log(`✓ JSON.stringify成功, 字符数=${reJson.length}`);
  const reParse = JSON.parse(reJson);
  console.log(`✓ 再次JSON.parse成功`);
  // 比对
  if (reJson.length === Buffer.from(Buffer.from(JSON.stringify(ccv3Obj), 'utf8').toString('base64'), 'base64').toString('utf8').length) {
    console.log('✓ 长度一致');
  }
} catch (e) {
  console.log(`✗ 重新序列化失败: ${e.message}`);
}

// 6. 验证每个entry的JSON合法性
console.log('\n========== character_book entries 验证 ==========');
const entries = ccv3Obj.data?.character_book?.entries || [];
let badCount = 0;
for (let i = 0; i < entries.length; i++) {
  try {
    const s = JSON.stringify(entries[i]);
    JSON.parse(s);
  } catch (e) {
    badCount++;
    console.log(`  ✗ entry[${i}] (${entries[i].comment || '?'}) JSON异常: ${e.message}`);
  }
}
console.log(`entries验证完成: ${badCount}/${entries.length} 异常`);

// 7. 检查是否有控制字符
console.log('\n========== 控制字符检查 ==========');
const fullJson = JSON.stringify(ccv3Obj);
let ctrlChars = 0;
const ctrlFound = [];
for (let i = 0; i < fullJson.length; i++) {
  const code = fullJson.charCodeAt(i);
  // JSON允许 \b \t \n \f \r (转义形式), 但不允许原始控制字符
  if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
    ctrlChars++;
    if (ctrlFound.length < 10) ctrlFound.push({ pos: i, code });
  }
}
console.log(`原始控制字符数: ${ctrlChars}`);
if (ctrlFound.length > 0) console.log(`前10个位置:`, ctrlFound);
