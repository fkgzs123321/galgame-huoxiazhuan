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
        try { return JSON.parse(text); }
        catch (e) {
          try { return JSON.parse(Buffer.from(text, 'base64').toString('utf-8')); }
          catch (e2) { console.error('Failed:', e2.message); }
        }
      }
    }
    offset += 8 + length + 4;
  }
  return null;
}

const ccv3 = readPngCcv3(PNG_PATH);
const entries = ccv3.data?.character_book?.entries || [];

console.log('=== Sample [mvu_plot] entries metadata ===');
const samples = ['[mvu_plot]阶段1_初级玩具', '[mvu_plot]阶段感知控制器', '[mvu_plot]玩家_NSW档案', '[mvu_plot]反向掌控', '[mvu_plot]被使用时受限视角叙事'];
samples.forEach(name => {
  const e = entries.find(e => e.comment === name);
  if (e) {
    console.log(`\n[${name}]`);
    console.log('  uid:', e.uid);
    console.log('  enabled:', e.enabled);
    console.log('  constant:', e.constant);
    console.log('  depth:', e.depth);
    console.log('  order:', e.order);
    console.log('  position:', e.position);
    console.log('  selective_logic:', e.selective_logic);
    console.log('  useRegex:', e.useRegex);
    console.log('  key:', JSON.stringify(e.key || []));
  } else {
    console.log(`\n[${name}] NOT FOUND`);
  }
});

// Stats
const noUid = entries.filter(e => e.uid === undefined || e.uid === null || e.uid === '');
console.log('\n=== Entries without uid:', noUid.length, '===');
noUid.forEach(e => console.log('  ', e.comment));

const noDepth = entries.filter(e => e.depth === undefined || e.depth === null);
console.log('\n=== Entries without depth:', noDepth.length, '===');
noDepth.forEach(e => console.log('  ', e.comment, '(uid:', e.uid + ')'));
