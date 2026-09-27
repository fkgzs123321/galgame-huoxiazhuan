import fs from 'fs';
const card = JSON.parse(fs.readFileSync('src/欲望都市/欲望都市.json','utf8'));
const entries = card.data.character_book.entries;
for (const e of entries) {
  if (['世界设定','扮演准则','缴械值阶段指导','名录总表','林汐瑶_基础信息','[InitVar]请勿打开','[mvu_update]变量更新规则'].includes(e.comment)) {
    console.log('=====', e.comment, '=====');
    console.log(JSON.stringify(e, null, 1));
  }
}
