import fs from 'fs';
const F = 'C:/Users/64806/.workbuddy/skills/st-judge-calibration/SKILL.md';
const B = String.fromCharCode(96); const b = s => B + s + B;
const q = s => B + B + B + s + B + B + B;
let t = fs.readFileSync(F, 'utf8');
if (t.includes('### 6. 面板要推进剧情')) { console.log('· 已有第 6 条'); process.exit(0); }

const 补 = `

### 6. 面板要推进剧情：用 createChatMessages，但**绝不 await**

面板算完判定之后，AI 必须知道发生了什么。两条通道都用上：

**主通道 —— 推一条玩家发言**（官方接口，见 ${b('@types/function/chat_message.d.ts')}）：
${q('js')}
// ★ 字段是 role + message（不是 content！）；★ 不 await
createChatMessages([{ role: 'user', message: 摘要 }]);
${q('')}
**副通道 —— 世界书 EJS 读变量**（照 旮旯给木-同级生2 的 ${b('扮演准则/判定引擎.yaml')}）：
在常驻条目开头写 ${b('@@generate_before')} ＋ EJS，用 ${b("getvar('stat_data.局面.判定结果')")} 读出来拼成人话进 prompt。
这样就算那条消息被删/被吞也丢不了。

⚠️ **转圈的真凶不是推送，是 ${b('await')}。**
${b('await createChatMessages(...)')} ／ ${b("await triggerSlash('/trigger')")} 只要有一次不 resolve，
后面的代码（包括恢复 busy 的 ${b('finally')}）就永远不执行 → 界面卡死。
**修法是去掉 await，不是删掉推送。** 实测：故意让它返回永不 resolve 的 Promise，不 await 的版本仍然 0 ms 返回 true ✓

⚠️ **字段名要去 ${b('@types')} 核对**：${b('ChatMessageCreating')} 要的是 ${b('message')}，
写成 ${b('content')} 不会报错，但永远不生效。

⚠️ **别自己发明机制**：写面板前先在同工作区里找一张已经跑通的卡（本次是 ${b('旮旯给木-同级生2')}），
把它的 ${b('状态栏界面.html')} / ${b('开局选择界面.html')} / ${b('扮演准则/*.yaml')} 通读一遍 —— 它已经把"ST 里该怎么交互"趟平了。
`;
fs.writeFileSync(F, t + 补, 'utf8');
console.log('✓ skill 已补第 6 条（' + 补.length + ' 字符）');
