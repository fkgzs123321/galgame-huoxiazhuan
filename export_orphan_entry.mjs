import fs from 'fs';
import path from 'path';

const PNG_PATH = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/不要玩弄我的鸡吧-forge.png';
const OUTPUT_PATH = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/世界书/[mvu_plot]被使用时受限视角叙事.txt';

function readPngCcv3(pngPath) {
  const buf = fs.readFileSync(pngPath);
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'tEXt' || type === 'iTXt') {
      const data = buf.toString('utf-8', offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf('\0');
      const keyword = data.substring(0, nullIdx);
      const text = data.substring(nullIdx + 1);
      if (keyword === 'ccv3') {
        try { return JSON.parse(text); }
        catch (e) {
          try { return JSON.parse(Buffer.from(text, 'base64').toString('utf-8')); }
          catch (e2) { return null; }
        }
      }
    }
    offset += 8 + length + 4;
  }
  return null;
}

const ccv3 = readPngCcv3(PNG_PATH);
const entries = ccv3.data?.character_book?.entries || [];

const target = entries.find(e => e.comment === '[mvu_plot]被使用时受限视角叙事');
if (!target) {
  console.error('Entry not found in PNG');
  process.exit(1);
}

const content = target.content || '';
console.log('Exporting content length:', content.length);
console.log('First 200 chars:', content.substring(0, 200));

// Write to file (preserving original content)
fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
console.log('Written to:', OUTPUT_PATH);

// Verify
const verify = fs.readFileSync(OUTPUT_PATH, 'utf-8');
console.log('Verified file length:', verify.length);
console.log('Match:', verify === content ? 'EXACT' : 'DIFFERENT');
