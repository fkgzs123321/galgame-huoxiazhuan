// ════════════════════════════════════════════════════════════
// reorder.cjs · 按 order 区段把条目归位
//
// 区段规则（引擎模板/README.md）：
//   1-19   T0 宪法层    constant
//   20-49  T1 状态层    constant
//   50-99  T2 契约层    constant，只声明接口
//   200-299 T3 底座·世界 constant，必须门控
//   300-399 T3 底座·关卡/地理 必须 EJS 或 selective
//   400+   T4 按需层    selective 关键词触发，绝不 constant
//
// ★ 为什么手排而不是靠 configure：
//   configure 的 tens-group 只保证「同类型连续」，不保证落在规定区段。
//   它排完底座条目会停在 194-199，仍然插在引擎区里。
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const STATE = path.join(D, 'tavern-cards-state.json');
const S = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const M = S.entryManifest;

const patch = [];
const set = (t, k, order) => patch.push({ op: 'replace', path: `/entryManifest/${t}/${k}/position/order`, value: order });

// 引擎层
['四态循环', '反抗与判定', '兴奋度机制', '出招', '交互循环', '剧情推进', '边界情况', '离线行动']
  .forEach((k, i) => M.世界观[k] && set('世界观', k, 20 + i));
['加载纪律', '判定引擎', '思维链', '叙述准则', '感知禁令', '玩家的输入', '叙述底线', '文风_骚妈', '文风_母猪中']
  .forEach((k, i) => M.扮演准则[k] && set('扮演准则', k, 30 + i));
['阶段指导', '熟练度阶段'].forEach((k, i) => M.阶段指导[k] && set('阶段指导', k, 55 + i));

// 底座层
Object.keys(M.世界观).filter((k) => !['四态循环', '反抗与判定', '兴奋度机制', '出招', '交互循环', '剧情推进', '边界情况', '离线行动'].includes(k))
  .forEach((k, i) => set('世界观', k, 200 + i));
Object.keys(M.地理).forEach((k, i) => set('地理', k, 300 + i));

// 角色：速览留在 100（catalog 不参与计数），女角全部进 400+
let n = 0;
for (const k of Object.keys(M.角色)) {
  if (k === '角色速览') { set('角色', k, 100); continue; }
  if (k.startsWith('她_')) { set('角色', k, 40 + n++); continue; }    // ★ 她属引擎层 T1，不能跟女角一样进按需层
}
n = 0;
for (const k of Object.keys(M.角色)) {
  if (k === '角色速览' || k.startsWith('她_')) continue;
  set('角色', k, 500 + n++);                                          // 女角进 T4 按需层
}

// 事件
Object.keys(M.事件).forEach((k, i) => set('事件', k, 60 + i));

fs.writeFileSync(path.join(D, 'scripts', 'patch-reorder.json'), JSON.stringify(patch, null, 1));
console.log(`重排 ${patch.length} 条 order`);

const FORGE = path.join(ROOT, '_tc_repo', 'tavern-cards', 'scripts', 'tavern-cards-forge.mjs');
console.log(execFileSync('node', [FORGE, 'patch', '旮旯给木-英雄坛说', '--file', path.join(D, 'scripts', 'patch-reorder.json')], { encoding: 'utf8' }).trim());
console.log(execFileSync('node', [FORGE, 'pack', '旮旯给木-英雄坛说'], { encoding: 'utf8' }).trim());
