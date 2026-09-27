const fs = require('fs');
const pngPath = 'E:\\Games\\写卡\\tavern_resource-main\\src\\角色卡\\系统哥的末日\\系统哥的末日.png';
const pngBuf = fs.readFileSync(pngPath);

let pos = 8;
while (pos < pngBuf.length) {
  const length = pngBuf.readUInt32BE(pos);
  const type = pngBuf.toString('latin1', pos + 4, pos + 8);
  if (type === 'tEXt') {
    const data = pngBuf.subarray(pos + 8, pos + 8 + length);
    const nulIdx = data.indexOf(0);
    const keyword = data.toString('latin1', 0, nulIdx);
    const b64 = data.toString('latin1', nulIdx + 1);
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    const obj = JSON.parse(json);
    console.log('tEXt keyword:', keyword);
    console.log('  card name:', obj.data?.name || obj.name);
    console.log('  description:', (obj.data?.description || obj.description || '').substring(0, 80));
    console.log('  entries count:', obj.data?.character_book?.entries?.length || obj.entries?.length);
    const entries = obj.data?.character_book?.entries || obj.entries || [];
    if (entries.length > 0) {
      console.log('  first 3 entries:');
      entries.slice(0, 3).forEach((e, i) => console.log(`    [${i}]`, e.comment || e.name));
    }
    console.log('  extensions.tavern_helper.scripts:');
    const scripts = obj.data?.extensions?.tavern_helper?.scripts || [];
    scripts.forEach((s, i) => console.log(`    [${i}]`, s.name, '- enabled:', s.enabled));
    break;
  }
  pos += 12 + length;
  if (type === 'IEND') break;
}
