import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const h = fs.readFileSync(CARD + '/正则/状态栏.html', 'utf8');

const 坏 = (h.match(/type:\//g) || []).length;
console.log('① type:/ 错误写法残留：' + 坏 + ' 处' + (坏 ? ' ❌' : ' ✅'));

console.log('② 正确写法：');
for (const m of h.matchAll(/\{type:"(message|chat)"[^}]*\}/g)) console.log('     ' + m[0]);

const cdn = fs.readFileSync(CARD + '/_cdn/index.html', 'utf8');
console.log('③ CDN 副本同步：' + (cdn.indexOf('type:"message"') >= 0 ? '✅' : '❌'));

const ldr = fs.readFileSync(CARD + '/正则/状态栏界面.html', 'utf8');
console.log('④ loader commit：' + (ldr.match(/@([a-f0-9]{7})/) || ['?', '?'])[1]);

// 卡里
const buf = fs.readFileSync(CARD + '/欲妈群.png');
let p = 8, found = null;
while (p < buf.length - 8) {
  const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
  if (type === 'tEXt') {
    const d = buf.slice(p + 8, p + 8 + len); const z = d.indexOf(0);
    if (d.toString('ascii', 0, z) === 'chara') { found = d.slice(z + 1).toString('ascii'); break; }
  }
  p += 12 + len; if (type === 'IEND') break;
}
const c = JSON.parse(Buffer.from(found, 'base64').toString('utf8'));
const r = c.data.extensions.regex_scripts.find(x => /状态栏界面/.test(x.scriptName));
const s = String(r.replaceString || '');
console.log('⑤ 卡里 loader commit：' + ((s.match(/@([a-f0-9]{7})/) || ['?', '?'])[1]));
console.log('⑥ 卡里围栏行数：' + s.split('\n').filter(l => /^```/.test(l.trim())).length + '（应 2）');
console.log('⑦ 世界书 ' + c.data.character_book.entries.length + ' 条｜正则 ' + c.data.extensions.regex_scripts.length + ' 条｜开场白 ' + (1 + (c.data.alternate_greetings || []).length) + ' 条');
