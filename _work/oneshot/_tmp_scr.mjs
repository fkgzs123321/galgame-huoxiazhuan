import fs from 'fs';
const card = JSON.parse(fs.readFileSync('src/欲望都市/欲望都市.json','utf8'));
const scripts = card.data.extensions.tavern_helper.scripts;
console.log('scripts type:', Array.isArray(scripts) ? 'array' : typeof scripts);
console.log('keys:', Object.keys(scripts));
console.log('script[0]:', JSON.stringify(scripts[0]).slice(0,400));
console.log('script[1] head:', JSON.stringify(scripts[1]?.content?.slice(0,200)));
