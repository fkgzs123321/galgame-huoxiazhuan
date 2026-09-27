import fs from 'fs';
const card = JSON.parse(fs.readFileSync('src/欲望都市/欲望都市.json','utf8'));
const d = card.data;
console.log('=== 欲望都市 regex_scripts ===');
for (const r of d.extensions.regex_scripts) {
  console.log(JSON.stringify({scriptName:r.scriptName, id:r.id, findRegex:r.findRegex.slice(0,80), replaceString:r.replaceString?.slice(0,60), replace_file:r.replace_file, placement:r.placement, disabled:r.disabled, markdownOnly:r.markdownOnly, promptOnly:r.promptOnly, runOnEdit:r.runOnEdit, substituteRegex:r.substituteRegex, minDepth:r.minDepth, maxDepth:r.maxDepth}, null, 1));
}
console.log('=== 欲望都市 tavern_helper scripts ===');
for (const [name, s] of Object.entries(d.extensions.tavern_helper.scripts)) {
  console.log(name, '=>', JSON.stringify({id:s.id, enabled:s.enabled, content:(s.content||'').slice(0,120), buttons:s.button}));
}
console.log('=== 欲望都市 zod ===');
console.log(JSON.stringify(d.extensions.tavern_helper.scripts['Zod'] ? d.extensions.tavern_helper.scripts['Zod'].content.slice(0,300) : 'NO Zod script'));
