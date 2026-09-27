// 从 PNG 文件中提取 tEXt chunk (关键字 chara/ccv3) 数据
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node extract_card.js <png_path> [output_json_path]');
  process.exit(1);
}

const pngPath = args[0];
const outputPath = args[1] || pngPath.replace(/\.png$/i, '.extracted.json');

const buf = fs.readFileSync(pngPath);

// PNG 签名
const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
if (buf.slice(0, 8).compare(SIG) !== 0) {
  console.error('Not a valid PNG file');
  process.exit(1);
}

let offset = 8;
const chunks = [];
while (offset < buf.length - 8) {
  const length = buf.readUInt32BE(offset);
  const type = buf.slice(offset + 4, offset + 8).toString('latin1');
  const dataStart = offset + 8;
  const dataEnd = dataStart + length;
  // CRC 4 bytes after data
  const crc = buf.readUInt32BE(dataEnd);
  chunks.push({ type, length, offset, dataStart, dataEnd });
  offset = dataEnd + 4;
}

// Find tEXt chunks
const textChunks = chunks.filter(c => c.type === 'tEXt');
const iTXtChunks = chunks.filter(c => c.type === 'iTXt');

console.log('Total chunks:', chunks.length);
console.log('tEXt chunks:', textChunks.length);
console.log('iTXt chunks:', iTXtChunks.length);

const result = {};

for (const c of textChunks) {
  const data = buf.slice(c.dataStart, c.dataEnd);
  // tEXt: keyword \0 text
  const nullPos = data.indexOf(0);
  if (nullPos === -1) continue;
  const keyword = data.slice(0, nullPos).toString('latin1');
  const value = data.slice(nullPos + 1).toString('latin1');
  console.log(`tEXt keyword: ${keyword}, value length: ${value.length}`);
  result[keyword] = value;
}

for (const c of iTXtChunks) {
  const data = buf.slice(c.dataStart, c.dataEnd);
  // iTXt: keyword \0 compressionFlag compressionMethod langTag \0 translatedKeyword \0 text
  const nullPos = data.indexOf(0);
  if (nullPos === -1) continue;
  const keyword = data.slice(0, nullPos).toString('utf8');
  console.log(`iTXt keyword: ${keyword}`);
  // Skip compressionFlag(1) + compressionMethod(1) + langTag + \0 + translatedKeyword + \0
  let p = nullPos + 1;
  const compFlag = data[p]; p++;
  const compMethod = data[p]; p++;
  // langTag
  let n = data.indexOf(0, p);
  if (n === -1) continue;
  p = n + 1;
  // translatedKeyword
  n = data.indexOf(0, p);
  if (n === -1) continue;
  p = n + 1;
  let text = data.slice(p).toString('utf8');
  if (compFlag === 1) {
    try {
      const zlib = require('zlib');
      text = zlib.inflateSync(data.slice(p)).toString('utf8');
    } catch (e) {
      console.log(`inflate failed for ${keyword}: ${e.message}`);
    }
  }
  result[keyword] = text;
  console.log(`iTXt value length: ${text.length}`);
}

// Decode base64 for 'chara' or 'ccv3'
let jsonStr = null;
let jsonKey = null;
if (result.ccv3) {
  try {
    jsonStr = Buffer.from(result.ccv3, 'base64').toString('utf8');
    jsonKey = 'ccv3';
  } catch (e) {
    console.log('Failed to decode ccv3 base64:', e.message);
  }
}
if (!jsonStr && result.chara) {
  try {
    jsonStr = Buffer.from(result.chara, 'base64').toString('utf8');
    jsonKey = 'chara';
  } catch (e) {
    console.log('Failed to decode chara base64:', e.message);
  }
}

if (jsonStr) {
  console.log(`Decoded ${jsonKey} as base64, JSON length: ${jsonStr.length}`);
  // Write to file
  fs.writeFileSync(outputPath, jsonStr, 'utf8');
  console.log(`Wrote JSON to: ${outputPath}`);
  // Try parse
  try {
    const obj = JSON.parse(jsonStr);
    console.log('Parsed JSON. Top-level keys:', Object.keys(obj).join(', '));
    if (obj.extensions) {
      console.log('extensions keys:', Object.keys(obj.extensions).join(', '));
      if (obj.extensions.regex_scripts) {
        console.log(`regex_scripts count: ${obj.extensions.regex_scripts.length}`);
        obj.extensions.regex_scripts.forEach((r, i) => {
          console.log(`  [${i}] id=${r.id}, name=${r.scriptName}, disabled=${r.disabled}, markdownOnly=${r.markdownOnly}, promptOnly=${r.promptOnly}, placement=${JSON.stringify(r.placement)}`);
        });
      } else {
        console.log('No regex_scripts in extensions');
      }
    }
    if (obj.character_book) {
      console.log(`character_book entries: ${obj.character_book.entries ? obj.character_book.entries.length : 0}`);
    }
    if (obj.data && obj.data.character_book) {
      console.log(`data.character_book entries: ${obj.data.character_book.entries ? obj.data.character_book.entries.length : 0}`);
    }
  } catch (e) {
    console.log('Failed to parse JSON:', e.message);
  }
} else {
  console.log('No ccv3 or chara text chunk found');
}
