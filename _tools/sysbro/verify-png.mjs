// 真解 PNG 复核：chara chunk 是 base64 的 JSON
import fs from 'node:fs';
import zlib from 'node:zlib';

const png = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/系统哥的末日.png';
const buf = fs.readFileSync(png);

// 遍历 PNG chunk
let off = 8;
const chunks = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  const data = buf.subarray(off + 8, off + 8 + len);
  chunks.push({ type, data });
  off += 12 + len;
}
const t = chunks.find((c) => c.type === 'tEXt' && c.data.toString('latin1', 0, 5) === 'chara');
if (!t) throw new Error('没有 chara chunk');
const b64 = t.data.subarray(6).toString('latin1');
const card = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));

const d = card.data || {};
const ext = d.extensions || {};
const rx = ext.regex_scripts || [];

console.log('═══ 卡面复核 ═══');
console.log('name        :', d.name);
console.log('first_mes 长度:', (d.first_mes || '').length);
console.log('交替开场白数  :', (d.alternate_greetings || []).length);
console.log('占位符在 first_mes 里:', /<StatusPlaceHolderImpl\/>/.test(d.first_mes || ''));
console.log('占位符在 alternates 里:', (d.alternate_greetings || []).map((s) => /<StatusPlaceHolderImpl\/>/.test(s)).join(','));
console.log('世界书条目数  :', ((d.character_book || {}).entries || []).length);
console.log('regex_scripts:', rx.length, '条');

const 栏 = rx.find((r) => r.scriptName === '状态栏界面' || r.name === '状态栏界面');
console.log('\n── 状态栏界面 正则 ──');
if (!栏) console.log('❌ 没找到');
else {
  const keys = Object.keys(栏);
  console.log('字段:', keys.join(', '));
  const rs = 栏.replaceString || '';
  console.log('replaceString 长度:', rs.length);
  console.log('是否已内联 HTML :', /xb-root/.test(rs));
  console.log('是否还是文件路径 :', /^正则\//.test(rs.trim()));
  console.log('findRegex      :', 栏.findRegex);
  console.log('markdownOnly   :', 栏.markdownOnly, '| promptOnly:', 栏.promptOnly, '| placement:', JSON.stringify(栏.placement));
  if (/xb-root/.test(rs)) {
    const need = ['xb-rv', 'xb-roster', 'xb-jme', 'xb-cmt', 'format_message_variable::stat_data.玩家.觉醒度',
                  'Mvu.getMvuData', 'VARIABLE_UPDATE_ENDED'];
    console.log('\n关键片段齐全性:');
    need.forEach((k) => console.log('  ' + (/xb-root/.test(rs) && rs.includes(k) ? '✅' : '❌') + '  ' + k));
  }
}
const 隐藏 = rx.find((r) => /对AI隐藏状态栏/.test(r.scriptName || r.name || ''));
console.log('\n隐藏脚本 promptOnly:', 隐藏 ? 隐藏.promptOnly : '(缺)', '| markdownOnly:', 隐藏 ? 隐藏.markdownOnly : '');
