// ⑤-3 按钮文案对齐卡的设计（她挑，他只能看着或拒绝）＋ 世界书补选项池落点
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;
const 换 = (f, pairs, tag) => {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let hit = 0;
  for (const [a, b] of pairs) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + tag + '：' + a.slice(0, 34)); continue; }
    t = t.split(A).join(b.split('\n').join(eol)); hit += c;
  }
  if (hit) { fs.writeFileSync(f, t, 'utf8'); n += hit; }
  console.log((hit ? '✓' : '·') + ' ' + tag.padEnd(16) + hit);
};

// ① 面板：按钮文案改成卡的语言（她挑，他只能看着或拒绝）
换('正则/状态栏.html', [[
  `    s+='<div class="acts">'
      +'<button class="act" data-act="exec"'+(S.pick?"":" disabled")+'>执行选中'+(S.pick?"（"+S.pick+"）":"（先选一条）")+'</button>'
      +'<button class="act refuse" data-act="refuse"'+(S.pick?"":" disabled")+'>拒绝这条</button></div>';`,
  `    s+='<div class="acts">'
      +'<button class="act" data-act="exec"'+(S.pick?"":" disabled")+'>看着（不拦）'+(S.pick?"·"+S.pick:"·先选一条")+'</button>'
      +'<button class="act refuse" data-act="refuse"'+(S.pick?"":" disabled")+'>拒绝这条'+(S.pick?"·"+S.pick:"·先选一条")+'</button></div>';`,
], [
  '    s+=\'<div class="opt-head">她这一关摆出来的（点一条选中）</div><div class="opts">\';',
  '    var 她选=String(局.她已选||"");\n    s+=\'<div class="opt-head">她这一关摆出来的（点一条选中）\'+(她选?"　★ 她挑的是第 "+她选+" 条":"")+\'</div><div class="opts">\';',
], [
  `      await doRoll(skill, 头);`,
  `      await doRoll(skill, 头);`,
]], '面板文案');

// 默认选中她挑的那条
换('正则/状态栏.html', [[
  '  var 局=g("局面",{}), 选项=局.当前选项||{};',
  '  var 局=g("局面",{}), 选项=局.当前选项||{};\n  if(!S.pick){ var _pk=String(局.她已选||""); if(_pk && String((选项[_pk]||{}).文本||"").trim()) S.pick=_pk; }',
]], '默认选中她挑的');

// ② D20 条目：补「选项池写进哪里」一节
换('世界书/[mvu_plot]D20对抗判定系统.txt', [[
  '每位妈妈都有一条弱点后门，目标一律是她的儿子。',
  `## 十、她每轮摆的选项 = 写进 \`局面.当前选项\`（面板据此渲染）

她摆出来的选项**不写进正文**，写进变量，由前端面板渲染成按钮；玩家在那上面「看着」或「拒绝」。固定四格：一／二／三／四，一格一条，摆不满就留空。

| 字段 | 谁写 | 写什么 |
|---|---|---|
| \`局面.当前选项.{一~四}.文本\` | 剧情 AI | 把这一条拆成他看得懂的动作 |
| \`局面.当前选项.{一~四}.等级\` | 剧情 AI | 微／中／强／极，决定面板判定 DC（微12／中15／强18／极22） |
| \`局面.当前选项.{一~四}.代价\` | 剧情 AI | 他想拦下来要付什么，按等级写量级 |
| \`局面.她已选\` | 剧情 AI | 她从中挑走的那一条（一／二／三／四）——本轮主线就是它 |

- **四格固定，严禁 add 新键**（Zod 卡没有可扩展数组，add 会被 MVU 判 SCHEMA 违规）；换一批就逐格 replace。
- 一格一格写：\`{"op":"replace","path":"/局面/当前选项/一","value":{"文本":"…","等级":"中","代价":"警觉+8"}}\`
- 他点了「看着」或「拒绝这条」之后，**面板当场跑完判定并清零那一格**，然后把结果推给你。你不是裁判：不要自己另掷骰、不要改数值、不要重算，只按推来的结果写这一轮。

每位妈妈都有一条弱点后门，目标一律是她的儿子。`,
]], 'D20 选项池节');

// ③ 变量更新规则：补 局面 的写法
换('世界书/变量/变量更新规则.yaml', [[
  '    今日:\n      射精次数|幻触次数: { check: 当日累计，跨日归零 }',
  `    今日:
      射精次数|幻触次数: { check: 当日累计，跨日归零 }
  局面:
    当前选项.\${一|二|三|四}.文本: { type: string, check: 她这一关摆出来的这一条，拆成他能看懂的动作；不写正文，只写这里。四格固定，严禁 add 新键 }
    当前选项.\${一|二|三|四}.等级: { type: '微|中|强|极', check: 决定面板判定 DC（微12/中15/强18/极22） }
    当前选项.\${一|二|三|四}.代价: { type: string, check: 他想拦下来要付什么，按等级写量级 }
    她已选: { type: '一|二|三|四|', check: 她从中挑走的那一条，本轮主线就是它 }`,
]], '更新规则 局面');

// ④ 欲妈群规则：出招落点一句话
换('世界书/[mvu_plot]欲妈群规则.txt', [[
  '# 欲妈群 · 群规则',
  `# 欲妈群 · 群规则

> 她每轮摆出来的「这一关怎么完成」，写进 \`局面.当前选项\` 的四格，由前端面板渲染成按钮（见 [mvu_plot]D20对抗判定系统 · 十）。`,
]], '欲妈群规则 落点');

console.log('\n共 ' + n + ' 处');
