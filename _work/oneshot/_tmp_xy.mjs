import fs from 'fs';
const wb = JSON.parse(fs.readFileSync('src/星月私立高等学院 MVU_3.9.6/解包/世界书.json','utf8'));
console.log('keys:', Object.keys(wb));
const entries = wb.entries || [];
console.log('entries:', entries.length);
for (const e of entries.slice(0, 8)) {
  console.log('-----', e.comment);
  console.log(JSON.stringify({keys:e.keys, constant:e.constant, selective:e.selective, position:e.position, insertion_order:e.insertion_order, enabled:e.enabled, extensions:{position:e.extensions?.position, depth:e.extensions?.depth, role:e.extensions?.role, sticky:e.extensions?.sticky, cooldown:e.extensions?.cooldown, delay:e.extensions?.delay, group:e.extensions?.group, prevent_recursion:e.extensions?.prevent_recursion, category:e.extensions?.category, display_index:e.extensions?.display_index}, contentHead:(e.content||'').slice(0,80)}, null, 1));
}
