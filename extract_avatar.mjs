// extract_avatar.mjs - 从下载的 欲妈群.png 提取纯净头像（删除角色卡数据 chunk）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC = 'C:\\Users\\Carrot\\Downloads\\欲妈群.png';
const DST = path.join(__dirname, 'avatar.png');

function readChunk(buf, offset) {
  const len = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  const dataStart = offset + 8;
  const dataEnd = dataStart + len;
  const crcEnd = dataEnd + 4;
  return { type, len, dataStart, dataEnd, crcEnd, next: crcEnd };
}

const buf = fs.readFileSync(SRC);
const sig = buf.slice(0, 8);
const expectedSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!sig.equals(expectedSig)) {
  console.error('✗ 不是有效的 PNG 文件');
  process.exit(1);
}

const out = [sig];
let offset = 8;
let removed = [];
let kept = [];

while (offset < buf.length) {
  const chunk = readChunk(buf, offset);
  const chunkData = buf.slice(offset, chunk.crcEnd);
  
  let shouldRemove = false;
  let desc = chunk.type;
  
  if (['ccv3', 'chara'].includes(chunk.type)) {
    shouldRemove = true;
    desc = `${chunk.type} (角色卡V3数据)`;
  }
  else if (chunk.type === 'tEXt') {
    let sep = -1;
    for (let i = chunk.dataStart; i < chunk.dataEnd; i++) {
      if (buf[i] === 0) { sep = i; break; }
    }
    if (sep > 0) {
      const keyword = buf.toString('ascii', chunk.dataStart, sep);
      if (keyword === 'chara' || keyword === 'ccv3') {
        shouldRemove = true;
        desc = `tEXt (keyword="${keyword}" - 角色卡数据)`;
      } else {
        desc = `tEXt (keyword="${keyword}")`;
      }
    }
  }
  
  if (shouldRemove) {
    removed.push(desc);
  } else {
    out.push(chunkData);
    kept.push(desc);
  }
  
  offset = chunk.crcEnd;
  if (chunk.type === 'IEND') break;
}

const result = Buffer.concat(out);
fs.writeFileSync(DST, result);

console.log('═══════════════════════════════════════');
console.log('  欲妈群头像提取工具');
console.log('═══════════════════════════════════════');
console.log(`源文件: ${SRC}`);
console.log(`源大小: ${(buf.length / 1024).toFixed(2)} KB`);
console.log('');
console.log(`保留 chunk:`);
kept.forEach(t => console.log(`  ✓ ${t}`));
console.log(`删除 chunk:`);
if (removed.length) {
  removed.forEach(t => console.log(`  ✗ ${t}`));
} else {
  console.log(`  (无)`);
}
console.log('');
console.log(`输出文件: ${DST}`);
console.log(`输出大小: ${(result.length / 1024).toFixed(2)} KB`);
console.log(`节省: ${((buf.length - result.length) / 1024).toFixed(2)} KB`);
console.log('');
console.log('✅ 头像提取完成（仅图片，无角色卡数据）');
