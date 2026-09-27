import fs from 'fs';
const B = String.fromCharCode(96); const b = s => B + s + B;
const M = 'E:/Games/写卡/tavern_helper_template/.workbuddy/memory/2026-09-22.md';
const log = `

---

## ★★ 开局表单照同级生2 重写（用户：「跟写进去有什么关系，我看一直转圈」「我从来没听过是这种写入的」「隔壁同级生2 都告诉你怎么做了」）

### 我错在哪（两处硬伤，都是自创 + 不测）
1. **我把开局表单改成 CDN loader 了** —— 而同级生2 是**内联**的。
   CDN 一变慢/拉不到 → 就永远停在「正在载入开局表单…」**转圈**。→ **改回 replace_file 内联** ✓
2. **表单没有防重入** —— 同级生2 的第一行就是
   ${b("if (ROOT.getAttribute('data-' + NS + '-init') === '1') return;")}
   我切完 swipe 后那块 DOM 会重渲染 → 脚本又跑一遍 → **卡在那里转**。→ **已加** ✓
3. **"写难度变量"那套是我发明的** —— 同级生2 的 ${b('set()')} 只有**三条**：
   ${b("updateVariablesWith(…, {type:'chat'})")} ／ ${b("updateVariablesWith(…, {type:'message', message_id: getCurrentMessageId()})")} ／ ${b("triggerSlash('/setvar ' + full + ' ' + JSON.stringify(JSON.stringify(v)))")}
   而且 **chat 层是第一优先**。我加的 ${b('Mvu.getMvuData')} / ${b('Mvu.replaceMvuData')} / 600ms 延迟 / 读回验证
   —— 全是多余的，**已全部删掉**（现在表单里 ${b('Mvu.')} 与 ${b('setTimeout')} 各 **0 处**）。

### 最终做法（= 同级生2 的做法）
| 项 | 怎么做的 |
|---|---|
| 难度存哪 | **chat 层**（${b("/setvar 欲妈群难度 …")}）—— 切 swipe 会重建 message 层的变量，**chat 层不动**，所以留得住 |
| 面板怎么读 | ${b('取难度()')} **优先读 chat 层**，读不到才回落 stat_data |
| 场景怎么选 | ${b('setChatMessages([{message_id:0, swipe_id:N}])')} 切开场白（每条自带 initvar） |
| 兜底 | 切不了 → ${b('generate({user_input:"【开局】…"})')}；再不行 → 提示手动切第 N 条 |
| 表单怎么进卡 | **内联（replace_file）**，不走 CDN —— 这样"重新导入卡"就一定生效 |

### ✅ 验证（模拟 ST/MVU 环境真跑 · ${b('_work/check/_test_opening2.mjs')}）
调用序列：${b('updateVariablesWith(chat) → updateVariablesWith(message 0) → /setvar 欲妈群难度 "地狱" → setChatMessages(swipe_id=2)')}
结果：chat 层 = 地狱 ✓　message 层被 initvar 重建（符合预期）✓　界面 = 「已定：地狱」
**防重入测试：重跑后新增调用 0 次 ✅**

### 验收
卡里开局表单 **6578 字符、内联**（非 loader）✓ 含防重入 ✓ 含 chat 层写 ✓ 无 Mvu / 无 setTimeout ✓
打包 121 条｜commit **32e0fee**｜push-ui 已改成**只推状态栏**（不再把开局表单改成 loader）

### ★ 教训（写进 skill）
- **有可用的现成范例（同级生2）时，先照抄，别自创。**
- **改完必须真跑一遍测试**（模拟 ST/MVU 环境），"改完祈祷"浪费了用户三轮。
`;
fs.appendFileSync(M, log, 'utf8');
console.log('✓ 记忆已追加（' + log.length + ' 字符）');
