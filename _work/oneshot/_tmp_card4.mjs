import fs from 'fs';
const card = JSON.parse(fs.readFileSync('src/欲望都市/欲望都市.json','utf8'));
console.log('card.avatar:', JSON.stringify(card.avatar));
console.log('card.data.avatar:', JSON.stringify(card.data.avatar));
console.log('avatar.png exists:', fs.existsSync('src/欲望都市/avatar.png'), fs.statSync('src/欲望都市/avatar.png').size);
