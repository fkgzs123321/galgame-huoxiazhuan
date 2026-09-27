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

console.log('Total entries:', entries.length);
console.log('=== Enabled entries (亮灯) ===');
const enabled = entries.filter(e => e.enabled === true);
console.log('Count:', enabled.length);
enabled.forEach(e => console.log(`  ✓ ${e.comment}`));

console.log('\n=== [SPV]SQL填表规则 status ===');
const spv = entries.find(e => e.comment === '[SPV]SQL填表规则');
if (spv) {
  console.log('  enabled:', spv.enabled);
  console.log('  constant:', spv.constant);
  console.log('  depth:', spv.depth);
  console.log('  order:', spv.order);
  console.log('  position:', spv.position);
  console.log('  content length:', (spv.content||'').length);
  console.log('  content first 200:', (spv.content||'').substring(0, 200));
} else {
  console.log('  NOT FOUND');
}

console.log('\n=== state.json [SPV]SQL填表规则 ===');
const statePath = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/../../dist/不要玩弄我的鸡吧-forge.json';
if (fs.existsSync(statePath)) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const spvState = state.worldbookEntries?.['[SPV]SQL填表规则'] || state.entries?.find(e => e.comment === '[SPV]SQL填表规则');
  console.log('  state entry:', JSON.stringify(spvState, null, 2).substring(0, 500));
}

// Find state.json in src dir
const statePath2 = 'e:/Games/写卡/tavern_helper_template/src/同级生2/tavern-cards-state.json';
console.log('\n=== 同级生2 state.json (for comparison) ===');
if (fs.existsSync(statePath2)) {
  const s = JSON.parse(fs.readFileSync(statePath2, 'utf-8'));
  const keys = Object.keys(s.worldbookEntries || s.entries || {});
  const enabledEntries = keys.filter(k => {
    const e = s.worldbookEntries?.[k] || s.entries?.find(x => x.comment === k);
    return e && e.enabled === true;
  });
  console.log('  Enabled count:', enabledEntries.length);
  console.log('  Sample enabled:', enabledEntries.slice(0, 15).join('\n    '));
}
