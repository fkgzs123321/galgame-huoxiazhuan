// 切换到「脚本注入 DOM」模式：
//   ① 脚本 状态栏填充 → 换成新的 状态栏注入（脚本直接创建 DOM）
//   ② 正则「状态栏界面」的替换内容 → 改成空（DOM 由脚本创建，占位符只留一个空行）
//      ★ 保留这条正则的必要性：不然 <StatusPlaceHolderImpl/> 会原样显示在正文里
//   ③ 「隐藏状态栏占位符」（promptOnly）保留 —— 对 AI 隐藏占位符
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

// 语法检查
{
  const t = fs.readFileSync(path.join(D, '脚本/状态栏注入.txt'), 'utf8');
  try { new Function('return ' + t); console.log('✅ 状态栏注入.txt 语法通过（' + t.length + ' 字符）'); }
  catch (e) { console.log('❌ 语法错误：' + e.message); process.exit(1); }
}

const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

// ① 脚本
const 脚本 = S.extensions.tavern_helper.scripts;
delete 脚本['状态栏填充'];
脚本['状态栏注入'] = {
  type: 'script', script_file: '脚本/状态栏注入.txt', enabled: true,
  id: 'b1c2d3e4-5f6a-4b7c-9d8e-2f3a4b5c6d7e', info: '',
  button: { enabled: false, buttons: [] }, data: {},
};
console.log('① 脚本：' + Object.keys(脚本).join(' / '));

// ② 状态栏界面 正则 → 替换成空
const 状 = S.regex_scripts['状态栏界面'];
状.replaceString = '';
delete 状.replace_file;
console.log('② 状态栏界面 正则 → 输出空字符串（DOM 由脚本创建）');

// ③ 重排
const 序 = ['隐藏状态栏占位符', '状态栏界面', '数值变化上色', '判定结果高亮', '屏幕外的人上色',
  '游戏角色上色', 'user上色', '对AI隐藏变量更新', '变量更新美化', '变量更新中美化',
  '对AI隐藏开局选择', '开局选择界面'];
const 新 = {}; 序.forEach(k => { if (S.regex_scripts[k]) 新[k] = S.regex_scripts[k]; });
Object.keys(S.regex_scripts).forEach(k => { if (!新[k]) 新[k] = S.regex_scripts[k]; });
S.regex_scripts = 新;

fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

// 打包
try {
  console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).split('\n').slice(-2).join('\n'));
} catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 3).join(' ')); }
