const fs = require('fs');
const cardPath = 'E:\\Games\\写卡\\tavern_resource-main\\.worldbook\\projects\\系统哥的末日\\exports\\系统哥的末日.card.json';
const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
const entries = card.data?.character_book?.entries || [];

console.log('=== 所有约束类条目 ===');
entries.forEach(e => {
  const comment = e.comment || e.name || '';
  if (comment.includes('地狱') || comment.includes('约束') || comment.includes('数值') || comment.includes('短剧')) {
    console.log('id:', e.id);
    console.log('  comment:', comment);
    console.log('  disable:', e.disable);
    console.log('  enabled:', e.enabled);
    console.log('  constant:', e.constant);
    console.log('  position:', e.position);
    console.log('  order:', e.order);
    console.log('  keys:', JSON.stringify(e.keys));
    console.log('  secondary_keys:', JSON.stringify(e.secondary_keys));
    console.log('');
  }
});
