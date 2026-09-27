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
    const entries = obj.data?.character_book?.entries || [];
    console.log('PNG tEXt:', keyword);
    console.log('  card name:', obj.data?.name);
    console.log('  entries count:', entries.length);
    console.log('');
    console.log('=== 查找地狱档条目 ===');
    const hellEntries = entries.filter(e => 
      (e.comment || '').includes('地狱') || 
      (e.name || '').includes('地狱') ||
      e.id === 'difficulty-hell'
    );
    if (hellEntries.length === 0) {
      console.log('❌ 未找到地狱档条目！');
    } else {
      hellEntries.forEach(e => {
        console.log('✅ 找到:', e.comment || e.name);
        console.log('   id:', e.id);
        console.log('   enabled:', e.enabled);
        console.log('   constant:', e.constant);
        console.log('   position:', e.position);
        console.log('   order:', e.order);
        console.log('   content长度:', (e.content || '').length, '字符');
      });
    }
    break;
  }
  pos += 12 + length;
  if (type === 'IEND') break;
}
