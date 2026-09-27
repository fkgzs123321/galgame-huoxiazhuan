import fs from 'fs';

const PNG_PATH = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/不要玩弄我的鸡吧-forge.png';

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
        try {
          return JSON.parse(text);
        } catch (e) {
          try {
            return JSON.parse(Buffer.from(text, 'base64').toString('utf-8'));
          } catch (e2) {
            console.error('Failed to parse ccv3 chunk:', e.message, e2.message);
          }
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
if (target) {
  console.log('=== Found unmatched entry ===');
  console.log('uid:', target.uid);
  console.log('comment:', target.comment);
  console.log('key:', JSON.stringify(target.key || []));
  console.log('keysecondary:', JSON.stringify(target.keysecondary || []));
  console.log('constant:', target.constant);
  console.log('selective_logic:', target.selective_logic);
  console.log('enabled:', target.enabled);
  console.log('depth:', target.depth);
  console.log('order:', target.order);
  console.log('position:', target.position);
  console.log('disable:', target.disable);
  console.log('addMemo:', target.addMemo);
  console.log('displayIndex:', target.displayIndex);
  console.log('useRegex:', target.useRegex);
  console.log('--- content (first 2000 chars) ---');
  console.log((target.content || '').substring(0, 2000));
  console.log('--- content (last 500 chars) ---');
  console.log((target.content || '').slice(-500));
  console.log('--- total content length:', (target.content || '').length);
} else {
  console.log('NOT FOUND');
}
