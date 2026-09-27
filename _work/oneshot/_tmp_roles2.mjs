import fs from 'fs';
const text = fs.readFileSync('src/欲望都市/创作规划.yaml', 'utf8');
const m = text.match(/^characters:\n([\s\S]*?)(?=^\S|\Z)/m);
const sec = m ? m[1] : '';
const re = /- name: (\S+)\n([\s\S]*?)(?=- name:|\Z)/g;
let mm, rows = [];
while ((mm = re.exec(sec)) !== null) {
  const name = mm[1], block = mm[2];
  const basic = block.match(/basic: \{([^}]*)\}/);
  const flavor = block.match(/flavor: (\S+)/);
  const nsfw = block.match(/nsfw: (\S+)/);
  const basicStr = basic ? basic[1] : '';
  const get = (k) => {
    const r = basicStr.match(new RegExp(k + ': ([^,}]+)'));
    return r ? r[1].trim() : '';
  };
  rows.push({
    name,
    identity: get('identity'),
    relationship: get('relationship'),
    flavor: flavor ? flavor[1].replace(/['"]/g, '') : '',
    nsfw: nsfw ? nsfw[1].replace(/['"]/g, '') : '',
  });
}
for (const r of rows) {
  console.log(`${r.name}\t${r.identity}\t关系=${r.relationship}\t${r.flavor}`);
}
