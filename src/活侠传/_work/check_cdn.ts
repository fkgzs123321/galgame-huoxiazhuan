/**
 * 验证 CDN loader 方案：卡包里是 loader、面板在 CDN。
 */
import fs from 'node:fs';

// ── ① 卡里的 loader ──
const hist = 'src/活侠传/正则/状态栏界面.html';
const loader = fs.readFileSync(hist, 'utf8');
console.log('══ ① 卡内 loader ══');
console.log('  大小: ' + loader.length + ' 字符 / ' + (Buffer.byteLength(loader) / 1024).toFixed(1) + ' KB');
const m = /(https:\/\/[^"']+index\.html)/.exec(loader);
console.log('  URL: ' + (m ? m[1] : '✗ 没找到'));
console.log('  含 commit: ' + /@[0-9a-f]{7,40}\//.test(loader));
console.log('  含 jQuery 检查: ' + loader.includes('typeof $'));
console.log('  含失败提示: ' + loader.includes('界面没载入'));

// ── ② PNG 里注册的是什么 ──
const raw = fs.readFileSync('src/活侠传/活侠传.png');
console.log('\n══ ② 卡包 ══');
console.log('  大小: ' + (raw.length / 1024).toFixed(0) + ' KB');

let pos = 8;
let 内嵌 = null;
while (pos < raw.length - 8) {
  const len = raw.readUInt32BE(pos);
  const typ = raw.toString('latin1', pos + 4, pos + 8);
  if (typ === 'tEXt') {
    const data = raw.subarray(pos + 8, pos + 8 + len);
    const z = data.indexOf(0);
    if (data.toString('latin1', 0, z) === 'ccv3') {
      try { 内嵌 = JSON.parse(Buffer.from(data.toString('latin1', z + 1), 'base64').toString('utf8')); } catch { /* */ }
    }
  }
  pos += 12 + len;
}
const j = 内嵌.data ?? 内嵌;
const rs = j.extensions?.regex_scripts ?? [];
const 列表 = Array.isArray(rs) ? rs : Object.values(rs);
console.log('  正则条数: ' + 列表.length);
for (const r of 列表) {
  const n = String(r.replaceString ?? '').length;
  console.log('    ' + String(r.scriptName ?? r.name ?? '?').padEnd(16) +
    ' replaceString ' + (n / 1024).toFixed(1) + ' KB' +
    '  markdownOnly=' + r.markdownOnly + ' promptOnly=' + r.promptOnly);
}

// ── ③ CDN 可达性 ──
const url = m ? m[1] : null;
async function 查CDN() {
  if (!url) return;
  console.log('\n══ ③ CDN 可达性 ══');
  console.log('  试取: ' + url);
  try {
    const r = await fetch(url, { redirect: 'follow' });
    console.log('  HTTP ' + r.status + (r.ok ? ' ✓' : ' ✗'));
    if (r.ok) {
      const t = await r.text();
      console.log('  收到 ' + (t.length / 1024).toFixed(0) + ' KB');
      for (const [名, kw] of [
        ['代码块围栏', t.trimStart().startsWith('```')],
        ['挂载点', t.includes('id="app"')],
        ['行动面板', t.includes('本旬可做的事')],
        ['门派阶段', t.includes('云开见日')],
        ['物表', t.includes('鹿皮囊')],
      ] as [string, boolean][]) {
        console.log('    ' + (kw ? '✓' : '✗') + ' ' + 名);
      }
    }
  } catch (e) {
    console.log('  取失败: ' + String((e as Error).message).slice(0, 120));
  }
}
void 查CDN();
