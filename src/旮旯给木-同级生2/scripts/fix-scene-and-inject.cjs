// 修两件事：
// ① initvar 的 局面.场面 是 euphoria 的残留（中央大厅/拷问装置）→ 换成本卡的中性初值
// ② iframe 里读不到「最新楼层」→ 恢复「状态栏注入」脚本（跑在主文档，getLastMessageId 可用）
//    卡的正则 状态栏界面 改成「替换为空」（DOM 由脚本创建），开局表单仍走 CDN
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

// ── ① 修 局面.场面 ──
{
  const p = path.join(D, '世界书/变量/initvar.yaml');
  const iv = YAML.parse(fs.readFileSync(p, 'utf8'));
  iv.局面 = iv.局面 || {};
  iv.局面.场面 = {
    地点: '自宅周边',
    体位: '',
    节奏: '',
    参与: {},
    留痕: '',
    她看到的: '',
  };
  fs.writeFileSync(p, YAML.stringify(iv, { lineWidth: 0 }));
  console.log('① initvar 的局面.场面 → 换成本卡的中性初值');
  const 检测 = YAML.parse(fs.readFileSync(p, 'utf8'));
  const t = fs.readFileSync(p, 'utf8');
  ['中央大厅', '拷问装置'].forEach(w => console.log('   ' + (t.includes(w) ? '⚠ 仍含 ' : '✓ 已无 ') + w));
}

// ── ② schema 重新生成 ──
try { console.log(execFileSync('node', [path.join(D, 'scripts/gen-schema.cjs')], { cwd: D, encoding: 'utf8' }).trim().split('\n')[0]); }
catch (e) { console.log('   schema: ' + String(e.stdout || e.message).split('\n')[0]); }

// ── ③ 恢复 状态栏注入 脚本 + 正则改空 ──
{
  const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
  const 脚本 = S.extensions.tavern_helper.scripts;
  if (!脚本['状态栏注入'] && fs.existsSync(path.join(D, '脚本/状态栏注入.txt'))) {
    脚本['状态栏注入'] = {
      type: 'script', script_file: '脚本/状态栏注入.txt', enabled: true,
      id: 'b1c2d3e4-5f6a-4b7c-9d8e-2f3a4b5c6d7e', info: '',
      button: { enabled: false, buttons: [] }, data: {},
    };
    console.log('③ 已恢复「状态栏注入」脚本');
  }
  // 状态栏界面 正则 → 空（DOM 由脚本创建，避免双重 + 避免 iframe 限制）
  S.regex_scripts['状态栏界面'].replaceString = '';
  delete S.regex_scripts['状态栏界面'].replace_file;
  console.log('   状态栏界面 正则 → 空（交给主文档脚本）');
  console.log('   脚本：' + Object.keys(脚本).join(' / '));
  fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));
}

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }
