import fs from 'fs';
const P = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/scripts/push-ui.cjs';
let t = fs.readFileSync(P, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';

// 把「① 推两份 … ② 提交推送 … ③ 两条正则换 loader」整段停用
const i = t.indexOf('// ── ① 推两份');
const j = t.indexOf('// ── ④ 清 jsDelivr 缓存 + 重打包');
if (i < 0 || j < i) { console.log('⚠ 未定位 i=' + i + ' j=' + j); process.exit(1); }

const 新 = [
  '/* ★★ 2026-09-23：状态栏与开局表单都改成【内联】（replace_file）了，不再走 CDN。',
  '   原因：状态栏的值要由 ST 在渲染楼层时替换 {{format_message_variable::…}} 宏，',
  '   走 CDN 注入的内容未必经过宏替换 → 值永远是旧的（"变量不显示到面板"的根因）。',
  '   所以 ①②③ 三步（推 CDN / 提交 / 改 loader）整段停用，只保留【打包】与【导出世界书】。',
  '   历史实现见 git 记录；若以后要回到 CDN 模式，把下面这段恢复即可。 */',
  '',
  '/* —— 以下为停用的 CDN 推送逻辑（保留备查） ——',
  'const 清单 = [ { 源: path.join(CARD, "正则", "状态栏.html"), 子: "index.html", 名: "状态栏" } ];',
  '... 见 git 历史 ...',
  '—— 停用结束 —— */',
  '',
].join(eol);

t = t.slice(0, i) + 新 + t.slice(j);
fs.writeFileSync(P, t, 'utf8');
console.log('✓ push-ui 的 CDN 推送段已停用');

// 语法检查
import { execFileSync } from 'child_process';
try {
  execFileSync('node', ['--check', P], { encoding: 'utf8' });
  console.log('✓ push-ui 语法通过');
} catch (e) { console.log('❌ 语法错：' + e.message); }
