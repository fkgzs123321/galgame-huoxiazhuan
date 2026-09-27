// 切到 CDN 方案：正则把占位符替换成 `$('body').load(CDN)`
// 原理（regex-scripts.md 的示例）：
//   酒馆助手把「完整 HTML 文档」渲染成独立界面（iframe）→ 该 iframe 的 $ 是可用的 jQuery
//   → jQuery 的 .load(url) 会**执行**加载内容里的 <script> → 状态栏就跑起来了
//   ★ 这是唯一被规范示例验证过的形态
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const CDN = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-nanpan2/index.html';

const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

// ① 状态栏界面 正则 → $('body').load(CDN)
{
  const 状 = S.regex_scripts['状态栏界面'];
  状.replaceString = '<body>\n<script>\n$(\'body\').load(\'' + CDN + '\');\n</script>\n</body>\n';
  delete 状.replace_file;
  console.log('① 状态栏界面 → $(\'body\').load(CDN)');
  console.log('   ' + 状.replaceString.replace(/\n/g, ' '));
}

// ② 删掉「状态栏注入」脚本（CDN 方案已覆盖，避免双重显示）
{
  const 脚本 = S.extensions.tavern_helper.scripts;
  if (脚本['状态栏注入']) { delete 脚本['状态栏注入']; console.log('② 已删「状态栏注入」脚本（CDN 方案接管）'); }
  console.log('   脚本剩：' + Object.keys(脚本).join(' / '));
}

fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

// ③ 打包
try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).split('\n').slice(-2).join('\n')); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 3).join(' ')); }
