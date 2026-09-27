import fs from 'fs';
const f = 'pack_yumq.mjs';
let s = fs.readFileSync(f, 'utf8');
const OLD = `// ===== 读取开场白列表 =====
function buildAltGreetings() {
  const greetDir = path.join(CARD_DIR, '开场白');
  if (!fs.existsSync(greetDir)) return [];
  const files = fs.readdirSync(greetDir).filter(f => f.endsWith('.txt') && f !== '0.txt').sort((a, b) => parseInt(a) - parseInt(b));
  return files.map(f => fs.readFileSync(path.join(greetDir, f), 'utf-8'));
}`;
const NEW = `// ===== 读取开场白列表 =====
// 按 skills references/mvu/initvar.md：需要不同初始变量的开场白，由 state.initvar_overrides 指定 override 文件，
// pack 时在对应开场白末尾自动嵌入 <UpdateVariable><initvar>…</initvar></UpdateVariable>（完全覆盖，非合并）。
function buildAltGreetings() {
  const greetDir = path.join(CARD_DIR, '开场白');
  if (!fs.existsSync(greetDir)) return [];
  const state = fs.existsSync(STATE_JSON) ? JSON.parse(fs.readFileSync(STATE_JSON, 'utf-8')) : {};
  const overrides = state.initvar_overrides || {};
  const files = fs.readdirSync(greetDir).filter(f => f.endsWith('.txt') && f !== '0.txt').sort((a, b) => parseInt(a) - parseInt(b));
  return files.map(f => {
    let text = fs.readFileSync(path.join(greetDir, f), 'utf-8');
    const rel = '开场白/' + f;
    const ov = overrides[rel];
    if (ov) {
      const ovPath = path.join(CARD_DIR, ov);
      if (fs.existsSync(ovPath)) {
        text = text.replace(/\\s*$/, '') + '\\n\\n<UpdateVariable>\\n<initvar>\\n' +
          fs.readFileSync(ovPath, 'utf-8').replace(/\\s+$/, '') + '\\n</initvar>\\n</UpdateVariable>\\n';
        console.log('    ↳ ' + rel + ' 已嵌入 initvar_override：' + ov);
      } else {
        console.warn('  ⚠ initvar_override 文件缺失: ' + ovPath);
      }
    }
    return text;
  });
}`;
if (!s.includes(OLD)) { console.log('MISS 锚点'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(f, s, 'utf8');
console.log('pack_yumq 已加 initvar_override 嵌入');
