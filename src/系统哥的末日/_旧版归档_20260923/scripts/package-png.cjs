const fs = require('fs');

// PNG tEXt chunk CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeTextChunk(keyword, text) {
  const keywordBuf = Buffer.from(keyword, 'latin1');
  const textBuf = Buffer.from(text, 'latin1');
  const data = Buffer.concat([keywordBuf, Buffer.from([0]), textBuf]);
  const type = Buffer.from('tEXt', 'latin1');
  const typeAndData = Buffer.concat([type, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

const avatarPath = 'E:\\Games\\写卡\\tavern_resource-main\\src\\角色卡\\系统哥的末日\\头像.png';
const cardPath = 'E:\\Games\\写卡\\tavern_resource-main\\src\\角色卡\\系统哥的末日\\系统哥的末日.card.json';
const outputPath = 'E:\\Games\\写卡\\tavern_resource-main\\src\\角色卡\\系统哥的末日\\系统哥的末日.png';

try {
  const pngBuf = fs.readFileSync(avatarPath);
  const cardJson = fs.readFileSync(cardPath, 'utf-8');

  const ihdrEnd = 8 + 25;
  const cardBase64 = Buffer.from(cardJson, 'utf-8').toString('base64');
  const charaChunk = makeTextChunk('chara', cardBase64);
  const v3Chunk = makeTextChunk('chara_card_v3', cardBase64);

  const beforeIdat = pngBuf.subarray(0, ihdrEnd);
  const afterIdat = pngBuf.subarray(ihdrEnd);
  const outputBuf = Buffer.concat([beforeIdat, charaChunk, v3Chunk, afterIdat]);

  fs.writeFileSync(outputPath, outputBuf);
  console.log('PNG card packaged successfully:');
  console.log('  Output: ' + outputPath);
  console.log('  Card JSON size: ' + cardJson.length + ' bytes');
  console.log('  Base64 size: ' + cardBase64.length + ' bytes');
  console.log('  Output PNG size: ' + outputBuf.length + ' bytes');
} catch(e) {
  console.error('Error:', e.message);
  console.error(e.stack);
  process.exit(1);
}
