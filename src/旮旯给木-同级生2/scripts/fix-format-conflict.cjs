// 修「变量更新规则」里与 MVU 输出格式冲突的表述
// 问题：我在更新规则里写「局面.当前选项: 写成一个表，键是序号」→ 那是**对象**写法，
//      而 `<变量输出格式>` 要求 `<JSONPatch>` 是 **JSON Patch (RFC 6902) 数组**
//      → 两处规范打架 → AI 折中成了「裸 JSON 对象」→ 既不是 JSONPatch、也没带 <UpdateVariable> 标签
// 修法：更新规则里**只描述字段长什么样**，不描述「怎么输出」（输出方式由格式条目管）
// 并顺带检查：选项池那 215 条给 AI 看到的格式是否正确
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const fsx = require('fs');
const D = path.join(__dirname, '..');
const R = 'E:/Games/写卡/tavern_helper_template';

// ── ① 改 变量更新规则 ──
{
  const p = path.join(D, '世界书/变量/变量更新规则.yaml');
  let t = fs.readFileSync(p, 'utf8');
  const o = t;
  // 找到「出招层要写什么」那一节里的「局面.当前选项」写法段
  t = t.replace(/局面\.当前选项: 写成一个表，键是序号[^\n]*\n(?:[^\n]*\n)*?[^\n]*等级: 微\|中\|强\|极\|锁[^\n]*\n/,
`局面.当前选项: 一张表，键是序号字符串（"1" 到 "4"）。每个值的字段是
  文本: 她看到的选项名
  等级: 微 / 中 / 强 / 极 / 锁
  消耗: 拒绝它要花多少反抗值（按等级：微 3~5 / 中 10~15 / 强 25~35 / 极 50 以上 / 锁 不可拒）
  ⚠️ 这只说明字段长什么样。**怎么写进变量，按 变量输出格式 的 JSONPatch 规范来**（不要自己拼一个对象）
`);
  // 若上面的正则没命中，做一次宽松替换
  if (t === o) {
    t = t.replace(/局面\.当前选项:.*\n/, '局面.当前选项: 一张表，键是序号字符串（"1" 到 "4"），每个值含 文本 / 等级（微·中·强·极·锁）/ 消耗。⚠️ 只说明字段长什么样，怎么写按 变量输出格式 的 JSONPatch 规范（不要自己拼对象）\n');
  }
  if (t !== o) { fs.writeFileSync(p, t); console.log('① 变量更新规则：局面.当前选项 的写法已改为「只描述字段」，并指向 JSONPatch 规范'); }
  else console.log('① ⚠ 未命中，需手查');
}

// ── ② 检查「变量输出格式」条目是否真的会注入 ──
{
  const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
  const e = (S.entryManifest.MVU || {})['[mvu_update]变量输出格式'];
  console.log('② 变量输出格式 条目：');
  console.log('   enabled:', e.enabled, '｜ position:', JSON.stringify(e.position));
  console.log('   strategy:', JSON.stringify(e.strategy));
  console.log('   part:', e.part, '｜ thresholds.MVU.output_format =', JSON.stringify(S.strategyThresholds.MVU.output_format));
}

// ── ③ 选项池给 AI 的格式：检查有没有把「等级」写成英文 ──
{
  let 英 = 0;
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(path.join(D, '世界书'));
  for (const p of 全) 英 += (fs.readFileSync(p, 'utf8').match(/\b(micro|mid|strong|extreme|lock)\b/g) || []).length;
  console.log('③ 内容文件里残留英文等级：' + 英 + ' 处' + (英 ? ' ❌' : ' ✅'));
}
