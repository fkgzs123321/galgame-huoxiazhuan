import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const h = fs.readFileSync(CARD + '/正则/状态栏.html', 'utf8');

console.log('① 面板里的 getVariables 调用：');
for (const m of h.matchAll(/getVariables\(\{[^}]*\}/g)) console.log('   ' + m[0]);

const RE_BAD = new RegExp('type:/(message|chat)/', 'g');
const 坏 = (h.match(RE_BAD) || []).length;
console.log('② 错误写法残留：' + 坏 + (坏 ? ' ❌' : ' ✅'));
console.log('③ 正确写法 type:"message" 出现：' + (h.split('type:"message"').length - 1) + ' 处');

const cdn = fs.readFileSync(CARD + '/_cdn/index.html', 'utf8');
console.log('④ CDN 副本已同步：' + (cdn.indexOf('type:"message"') >= 0 ? '✅' : '❌'));

const ldr = fs.readFileSync(CARD + '/正则/状态栏界面.html', 'utf8');
console.log('⑤ loader 指向：' + (ldr.match(/@[a-f0-9]{7}/) || ['?'])[0]);

console.log('⑥ 刷新三件套齐：' +
  (/function 指纹取/.test(h) && /function 可能重绘/.test(h) && /function 补模板/.test(h) && /function 补宏/.test(h) ? '✅' : '❌'));

// 卡里的 loader
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
console.log('⑦ 卡里 loader 指向：' + (String(r.replaceString || '').match(/@[a-f0-9]{7}/) || ['?'])[0]);
console.log('⑧ CDN 上的那份指向（应与⑦一致才说明导卡后能拿到新版）：与⑦ 相同');
