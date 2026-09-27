// 按 skills 规范改回：
//   regex-scripts.md「新增 UI 的完整步骤」第 1 步：
//     「有内容包裹标签 …… 需要在提示词（世界书条目）中约定 AI 使用此 XML 标签」
//     例：<StatusPlaceHolderImpl/> — 状态栏
//   → 正解 = ① 正则替换占位符（CDN）  ② 世界书条目里约定「AI 每层末尾输出占位符」
//   → 我自创的「脚本注入」删掉
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

// ① 状态栏界面 正则 → 恢复 CDN（含 3 反引号包裹 + body）
let commit = '';
try { commit = execFileSync('git', ['-C', 'E:/Games/写卡/_nanpa2push', 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (e) {}
const 基 = 'https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-nanpan2@' + (commit || 'ec84ceb') + '/';
const 包 = (u) => '```\n<body>\n<script>\n$(\'body\').load(\'' + u + '\');\n</script>\n</body>\n```\n';
S.regex_scripts['状态栏界面'].replaceString = 包(基 + 'index.html');
S.regex_scripts['状态栏界面'].replace_file = undefined;
delete S.regex_scripts['状态栏界面'].replace_file;
console.log('① 状态栏界面 正则 → CDN（' + 基 + 'index.html）');

// ② 删掉自创的「状态栏注入」脚本
if (S.extensions.tavern_helper.scripts['状态栏注入']) {
  delete S.extensions.tavern_helper.scripts['状态栏注入'];
  console.log('② 已删「状态栏注入」脚本（skills 用占位符方案，不需要自创脚本）');
}
console.log('   脚本：' + Object.keys(S.extensions.tavern_helper.scripts).join(' / '));

fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

// ③ 在世界书条目里约定「AI 每层末尾输出占位符」
{
  const p = path.join(D, '世界书/变量/变量输出格式.txt');
  let t = fs.readFileSync(p, 'utf8');
  const 标记 = '{}';
  if (!t.includes('StatusPlaceHolderImpl')) {
    t = t.replace(/\s*$/, '\n') + `
末尾锚点:
  - 每一层回复的最后，必须原样输出一行 <StatusPlaceHolderImpl/>
  - 它只是一个位置标记，不要解释它、不要改动它、不要漏
  - 漏了它，楼层下方的状态面板就不会出现
`;
    fs.writeFileSync(p, t);
    console.log('③ 变量输出格式：已加「每层末尾输出 <StatusPlaceHolderImpl/>」约定');
  } else console.log('③ 变量输出格式：已有该约定');
}

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }
