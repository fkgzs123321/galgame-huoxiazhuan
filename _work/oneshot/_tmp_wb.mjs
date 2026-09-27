import fs from 'fs';
const card = JSON.parse(fs.readFileSync('src/欲望都市/欲望都市.json','utf8'));
const entries = card.data.character_book.entries;
console.log('total entries:', entries.length);
for (const e of entries) {
  const pos = e.position || {};
  console.log([
    e.insertion_order,
    (e.constant?'C':'-'),
    (e.selective?'S':'-'),
    (e.enabled?'on':'off'),
    'depth=' + (e.extensions?.depth ?? '-'),
    'pos=' + (pos.position ?? '?') + '/' + (pos.depth ?? '-') + '/' + (pos.role ?? '-'),
    'order=' + pos.order,
    e.comment,
    '| keys=' + JSON.stringify(e.keys||[]),
  ].join(' '));
}
