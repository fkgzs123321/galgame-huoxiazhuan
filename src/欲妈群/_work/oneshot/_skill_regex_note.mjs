// 给 skills 的 regex-scripts.md 补一条「别和预设重复」的警告
import fs from 'fs';
const F = '.skills/tavern-cards/references/ui/regex-scripts.md';
let t = fs.readFileSync(F, 'utf8');
if (t.includes('别和预设重复处理同一个标签')) { console.log('已有，跳过'); process.exit(0); }

const warn = `## ⛔ 别和预设重复处理同一个标签（2026-09-22 补）

**预设（preset）常自带一批「通用标签」的正则**，典型是 \`<thinking>/<thinking/>\` 与 \`<UpdateVariable>\`：

- 思维链的「对 AI 隐藏」与「前端折叠/抹除」
- 变量更新的「美化」与「对 AI 隐藏」

**卡片里不要再放一份同样的规则**，否则同一条标签被两条正则各处理一次：轻则重复替换、样式叠加，
重则前面的替换把标签吃掉，后面那条永远匹配不到（看起来"规则失效"）。

**判断谁该带（分清「卡专属标签」与「通用标签」）**：

| 标签 | 谁带 | 理由 |
|---|---|---|
| \`<StatusPlaceHolderImpl/>\`、\`<OpeningPlaceHolder/>\` 等占位符 | **卡** | 由本卡开场白/打包器追加，预设不可能知道 |
| 本卡自造的叙事标签（如 \`<group_msg>\`、\`<contest_notify>\`、\`<phase_up>\`、\`<D20Judge>\`、\`<task_result>\`） | **卡** | 标签名是本卡在世界书里约定的，预设不认识 |
| \`<thinking>\`、\`<UpdateVariable>\` 这类**通用标签** | **预设或卡，只留一处** | 通用约定；两边都放就会重复处理 |

**做法**：动手前先看预设里已经有哪些 \`findRegex\`，把重合的从卡片里删掉。
**不要**两侧都留「为了保险」—— 那不是保险，是冲突源。

**配套检查**：卡里保留的那几条也要按本文件上面的「配对」表核对字段
（\`promptOnly\`／\`markdownOnly\` 必须一真一假配对；变量更新类 \`placement\` 用 \`[1,2]\`、\`runOnEdit: false\`；
状态栏类 \`placement [2]\`、\`runOnEdit: true\`）。

---

`;

const anchor = '## 什么是 regex_scripts';
const i = t.indexOf(anchor);
if (i < 0) { console.log('⚠ 找不到锚点'); process.exit(1); }
fs.writeFileSync(F, t.slice(0, i) + warn + t.slice(i), 'utf8');
console.log('✅ 已插入「别和预设重复处理同一个标签」章节（' + warn.length + ' 字符）');
