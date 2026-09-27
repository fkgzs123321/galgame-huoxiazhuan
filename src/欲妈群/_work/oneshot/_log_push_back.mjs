import fs from 'fs';
const B = String.fromCharCode(96); const b = s => B + s + B;
const M = 'E:/Games/写卡/tavern_helper_template/.workbuddy/memory/2026-09-22.md';
const log = `

---

## ★★ 推送必须保留（用户：「不输入到下一楼，AI 怎么会知道？」→「SillyTavern 是靠输入框内容推送给 AI 才会知道」）

### 我上一轮改错了方向
转圈的真因是 ${b('await createChatMessages/triggerSlash')} 永不 resolve → 卡住。
**正确的修法是"不要 await"，不是"删掉推送"** —— 我把功能一起删了，等于让 AI 什么都收不到。

### ST 的官方接口（${b('@types/function/chat_message.d.ts')}）
${b('declare function createChatMessages(chat_messages: ChatMessageCreating[], {insert_before, refresh}?): Promise<void>;')}
- 每条**必须含 'role' 和 'message'** ← ★ 我原来写的是 ${b('content')}，**字段名错了**（所以一直没生效）
- 默认**插到聊天末尾** ✓
- 返回 Promise → **但我绝不 await** ✓

### 最终方案（两条通道，双保险）
**① 推一条玩家发言**（主通道，用户说的对）
${b('createChatMessages([{ role: "user", message: 摘要 }])')} —— **不 await、不用 busy**，发射后不管。
摘要内容：他做了什么 + 用哪个技能拦 + 难度 + P/R/D + 成功率 + 掷值 + 结果 + 说明 + 「按这个结果写，不要重算」。
→ AI 下一轮**一定**读到这条路发言 ✓

**② 世界书 EJS**（副通道，照 ${b('旮旯给木-同级生2/世界书/扮演准则/判定引擎.yaml')}）
在 ${b('[mvu_plot]D20对抗判定系统')} 开头加 ${b('@@generate_before')} + EJS：用 ${b('getvar("stat_data.局面.判定结果")')}
把它读出来拼成人话直接进 prompt —— 就算那条消息被删/被吞也丢不了。

### ✅ 验证
**① 推送不阻塞**（脚本抠出 ${b('推给AI')} 单跑，故意让 ${b('createChatMessages')} 返回**永不 resolve** 的 Promise）
→ 返回 ${b('true')}、耗时 **0 ms** ✓ 调用记录正确 ✓

**② EJS 能渲染**（喂假 ${b('getvar')}）→ 输出：
${b('')}
【玩家这一轮的动作（引擎已算好，直接采信，不要重算、不要改数）】
  他做的：她伸手隔布握住 ｜ 拦它用：意志　难度：困难　等级：极
  能力 P=79 − 她的要求 R=56 = D23　成功率 73%　掷出 41
  结果：**成功**　做成了，代价记在账上。
  ★ 照这个结果写这一轮。写完把 局面.判定结果 写成空表 {}，警觉度按结果增减。
${b('')}
✓ 正是 AI 会看到的话

### 验收
面板 JS 通过｜打包 121 条｜commit **b70c06e**

### 教训（补进 skill）
**该修"为什么卡"，不该删功能。** 转圈的根因是 ${b('await')}，不是推送本身。
以及：**用官方 ${b('@types')} 里的签名核对字段名**（${b('message')} vs ${b('content')} 差一个字就一直不生效）。
`;
fs.appendFileSync(M, log, 'utf8');
console.log('✓ 记忆已追加（' + log.length + ' 字符）');
