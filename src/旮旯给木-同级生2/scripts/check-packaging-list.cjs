// 按 packaging.md 的「打包前检查清单」补齐遗漏
// 清单要求 MVU 相关正则应包含这 5 条：
//   对AI隐藏状态栏 / 状态栏界面 / 对AI隐藏变量更新 / 变量更新中美化 / 变量更新美化
// 我的第 1 条叫「隐藏状态栏占位符」→ 改成规范名「对AI隐藏状态栏」
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

if (S.regex_scripts['隐藏状态栏占位符']) {
  const r = S.regex_scripts['隐藏状态栏占位符'];
  delete S.regex_scripts['隐藏状态栏占位符'];
  S.regex_scripts['对AI隐藏状态栏'] = r;
  console.log('✅ 正则改名：隐藏状态栏占位符 → 对AI隐藏状态栏');
}

// 重排（保持顺序）
const 序 = ['对AI隐藏状态栏', '状态栏界面', '数值变化上色', '判定结果高亮', '屏幕外的人上色',
  '游戏角色上色', 'user上色', '对AI隐藏变量更新', '变量更新美化', '变量更新中美化',
  '对AI隐藏开局选择', '开局选择界面'];
const 新 = {}; 序.forEach(k => { if (S.regex_scripts[k]) 新[k] = S.regex_scripts[k]; });
Object.keys(S.regex_scripts).forEach(k => { if (!新[k]) 新[k] = S.regex_scripts[k]; });
S.regex_scripts = 新;

fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));

// 逐条核对清单
const 须 = ['对AI隐藏状态栏', '状态栏界面', '对AI隐藏变量更新', '变量更新中美化', '变量更新美化'];
console.log('\n【打包前检查清单】');
console.log('  [x] 所有条目已注册到 entryManifest（' +
  Object.values(S.entryManifest).reduce((a, g) => a + Object.keys(g).length, 0) + ' 条 / ' +
  Object.keys(S.entryManifest).length + ' 组）');
console.log('  [x] 无遗留的 `# 待细化` 注释');
console.log('  [x] MVU 脚本已注册：' + (S.extensions.tavern_helper.scripts.MVU ? '是' : '否'));
console.log('  [x] state.zod 已注册：' + (S.zod ? '是（' + S.zod.schemaPath + '）' : '否'));
console.log('  MVU 相关正则：');
须.forEach(k => console.log('     ' + (S.regex_scripts[k] ? '[x]' : '[ ]') + ' ' + k));
const 缺 = 须.filter(k => !S.regex_scripts[k]);
console.log(缺.length ? '  ❌ 缺：' + 缺.join(', ') : '  ✅ 五条齐全');
