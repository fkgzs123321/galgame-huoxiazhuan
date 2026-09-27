// 修两件事：
//   ① 补回 Zod 脚本（它是 MVU schema 的必需脚本，之前被误删）
//   ② 状态栏：CDN 正则的替换改成空 —— 因为「要显示在每一层」只能靠脚本注入，
//      而 CDN 只能覆盖「有占位符的那一楼」（开局）→ 两者并存会在开局那楼双重显示
//      ★ 保留这条正则（替换成空）是为了不让 <StatusPlaceHolderImpl/> 原样露出来
//   ③ 开局表单仍走 CDN（它只需显示一次，且占位符所在楼层是固定的）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
const 脚本 = S.extensions.tavern_helper.scripts;

// ① 补回 Zod
if (!脚本['Zod']) {
  脚本['Zod'] = {
    type: 'script', script_file: '脚本/Zod.txt', enabled: true,
    id: '7c1e8a52-93b4-4a16-8f27-2d6b0c9e4f31', info: '',
    button: { enabled: false, buttons: [] }, data: {},
  };
  console.log('① 已补回 Zod 脚本');
}
// 如果磁盘上没有 Zod.txt，从 state.zod 的 importUrl 重建
if (!fs.existsSync(path.join(D, '脚本/Zod.txt'))) {
  const url = (S.zod && S.zod.importUrl) || 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
  fs.writeFileSync(path.join(D, '脚本/Zod.txt'), "import { registerMvuSchema } from '" + url + "';\n");
  console.log('   并重建了 脚本/Zod.txt');
}
console.log('   脚本：' + Object.keys(脚本).join(' / '));

// ② 状态栏 正则 → 替换成空（交给脚本注入）
S.regex_scripts['状态栏界面'].replaceString = '';
delete S.regex_scripts['状态栏界面'].replace_file;
console.log('② 状态栏界面 正则 → 空（由「状态栏注入」脚本在每一层创建 DOM）');

// ③ 重排
const 序 = ['对AI隐藏状态栏', '状态栏界面', '数值变化上色', '判定结果高亮', '屏幕外的人上色',
  '游戏角色上色', 'user上色', '对AI隐藏变量更新', '变量更新美化', '变量更新中美化',
  '对AI隐藏开局选择', '开局选择界面'];
const 新 = {}; 序.forEach(k => { if (S.regex_scripts[k]) 新[k] = S.regex_scripts[k]; });
Object.keys(S.regex_scripts).forEach(k => { if (!新[k]) 新[k] = S.regex_scripts[k]; });
S.regex_scripts = 新;

fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 3).join(' ')); }
