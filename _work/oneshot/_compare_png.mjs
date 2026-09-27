// _compare_png.mjs - 对比原始PNG与新打包PNG的chunk结构
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const CARD_DIR = path.join('src', '不要玩弄我的鸡吧-forge');
const candidates = [
  '不要玩弄我的鸡吧.png',
  '不要玩弄我的鸡吧 - 改关灯前.png',
  '头像_clean.png',
];

function readChunks(buf) {
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    if (off + 8 > buf.length) break;
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > buf.length) break;
    const data = buf.slice(dataStart, dataEnd);
    const crc = buf.readUInt32BE(dataEnd);
    const crcCalc = zlib.crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])) >>> 0;
    chunks.push({ type, len, crc, crcOk: crc === crcCalc, off, data });
    if (type === 'IEND') break;
    off = dataEnd + 4;
  }
  return chunks;
}

for (const name of candidates) {
  const p = path.join(CARD_DIR, name);
  if (!fs.existsSync(p)) {
    console.log(`\n[跳过] ${name} 不存在`);
    continue;
  }
  const buf = fs.readFileSync(p);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`文件: ${name}`);
  console.log(`大小: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`签名: ${buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) ? '✓' : '✗'}`);
  const chunks = readChunks(buf);
  console.log(`chunks: ${chunks.length}`);
  chunks.forEach((c, i) => {
    let kw = '';
    if (c.type === 'tEXt' || c.type === 'zTXt' || c.type === 'iTXt') {
      const kwEnd = c.data.indexOf(0);
      kw = c.data.toString('ascii', 0, kwEnd);
    }
    console.log(`  [${i}] ${c.type}  len=${c.len}  CRC=${c.crcOk ? '✓' : '✗'}${kw ? '  kw=' + kw : ''}`);
  });
}
