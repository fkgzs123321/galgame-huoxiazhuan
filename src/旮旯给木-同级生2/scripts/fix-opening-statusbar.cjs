// 让「开局页」也有状态栏：
//   ① 状态栏界面 正则 → 恢复 CDN 加载（有占位符的楼层，即 8 个开场白，都能显示）
//   ② 脚本注入 → 加「跳过已注入楼层」判断（那一楼已有 #gg2 或 iframe 就不重复注入）
// 分工：
//   有占位符的楼层（8 个开场白）→ 正则/CDN
//   其他楼层（AI 每层生成）      → 脚本注入
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const CDN = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-nanpan2/index.html';

// ① 状态栏界面 正则 → CDN
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
S.regex_scripts['状态栏界面'].replaceString = '<body>\n<script>\n$(\'body\').load(\'' + CDN + '\');\n</script>\n</body>\n';
delete S.regex_scripts['状态栏界面'].replace_file;
fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));
console.log('① 状态栏界面 → $(\'body\').load(CDN)（开局页显示）');

// ② 脚本：加「跳过已注入楼层」
{
  const p = path.join(D, '脚本/状态栏注入.txt');
  let t = fs.readFileSync(p, 'utf8');
  const 锚 = `    var 旧 = 目标.querySelector('.' + NS);`;
  const 新 = `    // 该楼已有状态栏（CDN 注入的 #gg2 / iframe / 已注入的 DOM）→ 跳过，避免重复
    if (目标.querySelector('#' + NS) || 目标.querySelector('iframe')) return;
    var 旧 = 目标.querySelector('.' + NS);`;
  if (t.includes(锚) && !t.includes('避免重复')) {
    t = t.replace(锚, 新);
    fs.writeFileSync(p, t);
    console.log('② 脚本已加「跳过已注入楼层」判断');
  } else console.log('② 脚本已有该判断 或 锚点未命中');
  try { new Function('return ' + t); console.log('   ✅ 脚本语法通过'); } catch (e) { console.log('   ❌ ' + e.message.slice(0, 60)); }
}

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 3).join(' ')); }
