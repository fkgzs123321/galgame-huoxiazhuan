// 生成 UI 预览：把 {{format_message_variable::stat_data.X}} 换成 initvar 里的真实值，
// 输出到 _tools/sysbro/ui-preview.html（放卡外，不进打包）
import fs from 'node:fs';

// ★ 界面已走 CDN：来源在 _ui_repo/xitongge，构建产物在 dist/
const CARD = 'E:/Games/写卡/tavern_helper_template/_ui_repo/xitongge/';
const CARD_WB = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
let html = fs.readFileSync(CARD + 'dist/index.html', 'utf8');

// ── 极简 YAML 解析（只取「两级路径 → 标量」）──
const y = fs.readFileSync(CARD_WB + '世界书/变量/initvar.yaml', 'utf8').split('\n');
const map = {};
let stack = [];
for (const raw of y) {
  if (!raw.trim() || raw.trim().startsWith('#')) continue;
  const m = raw.match(/^(\s*)([^\s#][^:]*):\s*(.*)$/);
  if (!m) continue;
  const depth = Math.floor(m[1].length / 2);
  stack = stack.slice(0, depth);
  stack[depth] = m[2].trim().replace(/^['"]|['"]$/g, '');
  const val = m[3].trim();
  if (val !== '') map[stack.filter(Boolean).join('.')] = val.replace(/^['"]|['"]$/g, '');
}

// ── 替换占位符 ──
let miss = [];
html = html.replace(/\{\{format_message_variable::stat_data\.([^}]+)\}\}/g, (all, path) => {
  const v = map[path];
  if (v === undefined) { miss.push(path); return '—'; }
  return v;
});

// ── 预览专用：把 initvar 拍成快照，塞回去让 JS 也能渲染（卡内不需要这段）──
const snap = {};
for (const [k, v] of Object.entries(map)) {
  const segs = k.split('.');
  let c = snap;
  for (let i = 0; i < segs.length - 1; i++) { if (typeof c[segs[i]] !== 'object' || c[segs[i]] === null) c[segs[i]] = {}; c = c[segs[i]]; }
  const last = segs[segs.length - 1];
  let val = v;
  if (val === 'true') val = true;
  else if (val === 'false') val = false;
  else if (/^-?\d+$/.test(val)) val = Number(val);
  c[last] = val;
}
const 锚 = "try { if (typeof waitGlobalInitialized === 'function') await waitGlobalInitialized('Mvu'); } catch (e) {}";
if (!html.includes(锚)) throw new Error('预览锚点没找到，界面文件改了要同步改这里');
const shim =
  '/* ⚠ 预览专用：卡外用 initvar 快照顶替 MVU 读取，不进打包 */\n' +
  '    var __PV__ = ' + JSON.stringify(snap) + ';\n' +
  '    allVars = async function () { return __PV__; };\n    ' + 锚;
html = html.replace(锚, shim);

fs.writeFileSync('E:/Games/写卡/tavern_helper_template/_tools/sysbro/ui-preview.html', html);
console.log('预览已生成。占位符未命中:', miss.length);
miss.forEach((m) => console.log('  ' + m));
console.log('快照顶层域:', Object.keys(snap).join(' / '));
console.log('输出 size:', html.length);
