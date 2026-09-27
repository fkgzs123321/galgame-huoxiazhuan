import fs from 'fs';
const F = 'C:/Users/64806/.workbuddy/skills/st-judge-calibration/SKILL.md';
const Q = String.fromCharCode(96);
const q = s => Q + Q + Q + s + Q + Q + Q;         // ```s```
const c = s => '`' + s + '`';                     // `s`
let t = fs.readFileSync(F, 'utf8');

const 补 = `

## 三、开局表单 / 选项面板：有现成范例就先照抄

> 这一条是三轮返工换来的。**动手前先去同工作区找已经跑通的卡**（本次是同级生2），照它的结构写。

### 1. 防重入（最容易漏、后果最明显）
切 swipe 或切楼层会让这块 DOM **重新渲染**，脚本**又跑一遍** → 表现就是"点了一直转圈/卡住"。

${q('js')}
(function () {
  var NS = 'xx';
  var ROOT = document.getElementById(NS + '-root');
  if (!ROOT) return;
  if (ROOT.getAttribute('data-' + NS + '-init') === '1') return;   // ★★ 必须有
  ROOT.setAttribute('data-' + NS + '-init', '1');
  // …
})();
${q('')}
→ 所以表单的根元素**必须有 id**（${c("id='xx-root'")}），否则拿不到它。

### 2. 写变量只要三条（照同级生2）
${q('js')}
updateVariablesWith(fn, { type: 'chat' });                                       // ★ chat 层第一优先
updateVariablesWith(fn, { type: 'message', message_id: getCurrentMessageId() });
triggerSlash('/setvar ' + full + ' ' + JSON.stringify(JSON.stringify(v)));
${q('')}
**不要自创** ${c('Mvu.getMvuData')} / ${c('Mvu.replaceMvuData')} / 延迟 / 读回验证那一套 —— 在真实环境里不稳。

### 3. 跨 swipe 的选择必须存 chat 层
每条开场白带自己的 ${c('initvar')}，**切 swipe 会重建 message 层的变量**。
所以"难度"这类**不能被重建**的选择：写 **chat 层**（${c('/setvar')}），面板**优先读 chat 层**、读不到才回落 stat_data。

### 4. 表单要内联，不要走 CDN
CDN 一变慢或拉不到，就永远停在「正在载入…」。
- **一次性初始化**的东西（开局表单）→ 内联（${c('replace_file')}）最稳
- **每轮都在**的东西（状态栏面板）→ 才适合 CDN + loader

### 5. 必须在 Node 里真跑一遍
用上一节的脚手架。跑出**调用序列 + 各层最终取值 + 防重入验证**（重跑一次看新增调用数是否为 0），
**通过了再说"好了"**。不要"改完让用户导卡试"。
`;
fs.writeFileSync(F, t + 补, 'utf8');
console.log('✓ skill 已补第三节（' + 补.length + ' 字符）');
console.log('  总长：' + (t + 补).length + ' 字符');
