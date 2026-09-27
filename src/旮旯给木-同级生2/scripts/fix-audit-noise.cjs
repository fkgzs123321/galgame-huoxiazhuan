// ① 修自查器的 3 类误报
//    · join() 是 JS 内置方法 → 加入白名单
//    · 隐藏类正则的 replaceString 是**空串**（合法）→ 判定要区分 undefined 与 ''
//    · H「卡内残留 EJS」：ST-Prompt-Template 的工作方式就是「世界里写 EJS，注入前执行」
//      → 卡里保留 EJS 源码是**正常的**，只有 EJS **注释块**才是可省的（它会占文件字符）
// ② ★ 真问题：pack 现在输出的是 .png（form=charactercard + 有 avatar）
//      → **`旮旯给木-同级生2.json` 停在 12:47，是过时的**！
//      → 从 PNG 的 chara chunk 提取，写回最新的 .json（供单独导世界书用）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');

// ① 修误报
{
  let t = fs.readFileSync(__filename.replace('fix-audit-noise', 'audit-runtime'), 'utf8');
  if (!t.includes("'join'")) {
    t = t.replace("'isNaN', 'RegExp', 'Set', 'Map',", "'isNaN', 'RegExp', 'Set', 'Map', 'join', 'concat', 'slice', 'split', 'replace', 'map', 'filter', 'forEach', 'push', 'indexOf', 'includes', 'trim', 'toString',");
  }
  t = t.replace(
    "if (!r.replaceString && !r.replaceFile) 报('F 既无 replaceString 也无 replaceFile', 名);",
    "if (r.replaceString === undefined && !r.replace_file) 报('F 既无 replaceString 也无 replace_file', 名);"
  );
  t = t.replace(
    "if (!r.replaceString && !r.replace_file) 报('F 既无 replaceString 也无 replace_file', 名);",
    "if (r.replaceString === undefined && !r.replace_file) 报('F 既无 replaceString 也无 replace_file', 名);"
  );
  fs.writeFileSync(__filename.replace('fix-audit-noise', 'audit-runtime'), t);
  console.log('① 自查器误报已修（join 白名单 / 空串判定）');
}

// ② 从 PNG 提取最新数据写回 .json
{
  const png = path.join(D, '旮旯给木-同级生2.png');
  const b = fs.readFileSync(png);
  let off = 8, chara = null;
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    if (type === 'tEXt' || type === 'iTXt') {
      const data = b.slice(off + 8, off + 8 + len).toString('binary');
      const i = data.indexOf('chara');
      if (i >= 0) chara = data.slice(i);
    }
    off += 12 + len;
    if (type === 'IEND') break;
  }
  if (chara) {
    const b64 = chara.replace(/^chara\s*\0/, '').trim();
    const j = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    fs.writeFileSync(path.join(D, '旮旯给木-同级生2.json'), JSON.stringify(j, null, 2));
    const d = j.data || j;
    console.log('② .json 已从 PNG 同步更新（之前停在 12:47 = 过时）');
    console.log('   条目 ' + ((d.character_book || {}).entries || []).length + ' ｜ 正则 ' + ((d.extensions || {}).regex_scripts || []).length + ' ｜ 脚本 ' + Object.keys(((d.extensions || {}).tavern_helper || {}).scripts || {}).length);
    // 验证：主角条目应该是纯 YAML 了（不再是 EJS）
    const 主角 = ((d.character_book || {}).entries || []).find(e => /^主角/.test(e.comment || ''));
    console.log('   主角条目含 EJS: ' + /<%(?!\/\*)/.test(String(主角 && 主角.content)) + '（应为 false —— 已改纯 YAML）');
  } else console.log('② ⚠ 没找到 chara chunk');
}

// ③ 重跑自查
const { execFileSync } = require('child_process');
try {
  console.log('\n' + execFileSync('node', [path.join(D, 'scripts/audit-runtime.cjs')], { encoding: 'utf8' }).trim());
} catch (e) { console.log(String(e.stdout || e.message).trim()); }
