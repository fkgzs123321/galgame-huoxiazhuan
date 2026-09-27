// 把「Zod 卡数组追加走不通」的结论写回 MVU 文档（原 ops 表说 add「也用于追加数组元素」，在 Zod 卡里是错的）
import fs from 'fs';
const F = '.skills/STDB/B1_变量更新规则.md';
let t = fs.readFileSync(F, 'utf8');
if (t.includes('Zod 卡：数组追加走不通')) { console.log('已有，跳过'); process.exit(0); }

const BT = String.fromCharCode(96); // 反引号
const b = s => BT + s + BT;

const warn = [
  '> ## ⛔ Zod 卡：数组追加走不通（2026-09-22 实测坐实，别再用 ' + b('/-') + '）',
  '>',
  '> **症状**：`{"op":"add","path":"/群/30天已用主题/-","value":"…"}` → MVU 报',
  '> 「SCHEMA违规：无法向路径「群/30天已用主题」处不可扩展的数组写入元素」，**带上 ' + b('/-') + ' 也照样报**。',
  '> 报错前缀是 `[MVU]` 而不是 `[MVU zod]` —— 这一条就能看出它来自核心而非 zod 层。',
  '>',
  '> **三层根因**',
  '> 1. MVU 核心把命令**同时**发给 zod 处理器（`mag_command_parsed_for_zod`）**并自己照旧执行**；',
  '>    zod 处理器把成功处理的命令从数组里 ' + b('_.pullAt') + ' 摘掉，核心就不会再碰它。',
  '> 2. **在 zod 命令语法里 `add` = 数字加减**（`case\'add\': if(\'number\'!==typeof 旧值) return null`），',
  '>    **追加数组要用 `insert`**（等价于 `_.assign`）。所以标准 JSON Patch 的 `{"op":"add"}` 打到数组上，',
  '>    zod 处理器判定「目标不是数字」→ `return null` **不消费** → 命令落到核心，由核心带着校验执行。',
  '> 3. 核心的数组校验是 `\'array\'===type && (!1===extensible || undefined===extensible)` → 必抛。',
  '>    而 **zod 卡拿不到 extensible**：`mvu_zod.js` 里 `extensible` 出现 **0 次**，',
  '>    JS-Slash-Runner 的 `registerVariableSchema` 里也是 **0 次**。',
  '>    命令式的 `$__META_EXTENSIBLE__$` 标记只对**非 zod 的 JSON 结构卡**有效（生产 zod 卡明确不用 `$meta`）。',
  '>    **`/-` 只负责「插到末尾」，它不负责把数组标成可扩展 —— 两件事，别混。**',
  '>',
  '> **Zod 卡的正确做法（三选一）**',
  '> - **首选：列表类变量别用数组，用字符串**（`、`／`；` 分隔），整串 `replace`，滚动裁剪由更新方自己切。',
  '> - 系统记账类（计数／历史／已用池）**交给卡内脚本写**：前端 `Mvu.replaceMvuData` / `updateVariablesWith` **不经过命令校验**，想怎么写都行。',
  '> - 真要数组：只能整组 `replace`（走 `set` 分支，无 extensible 检查）；注意核心对「恰好 2 个元素且第 2 个是字符串」的数组有 VWD 兼容误判，会只写第 0 项。',
  '',
].join('\n');

const anchor = '| `add` | ✅ | 扩展 | ✅ | 新增字段/record项；也用于追加数组元素 |';
const i = t.indexOf(anchor);
if (i < 0) { console.log('⚠ 找不到 ops 表锚点'); process.exit(1); }
fs.writeFileSync(F, t.slice(0, i) + warn + '\n' + t.slice(i), 'utf8');
console.log('✅ 警告块已插入 ops 表前（' + warn.length + ' 字符）');
