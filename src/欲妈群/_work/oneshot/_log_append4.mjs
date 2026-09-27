import fs from 'fs';
const F = '.workbuddy/memory/2026-09-22.md';
const add = `

---

## ★★★ 思维链重做（用户：「这个思维链不像思维链，skills 里有要求吗」）—— skills 里**有**，我上一版方向错了

### 规范出处（权威）
- **.skills/tavern-card-builder/references/cot-design-and-authoring.md**（551 行，CoT 专章）
- 同目录 authoring-workflow.md 的 §4「CoT deployment and stitching decision」
- 同目录 card-writing.md 的 §4「CoT and narrative boundary」
- 路由依据：activate-tavernweave-soul/references/skill-routing.md 写着
  「Card concept, long material, worldbook, MVU, **custom CoT**」→ 归 tavern-card-builder

### 我上一版错在哪
我写成了 **10 条检查表**。规范 §1 的定义是：
> 自定义 CoT 是作者写给模型的**推演协议**：规定生成前检查什么、**按什么顺序判断**、何时跳过模块、失败时如何降级、以及最终允许输出什么。

§4.1 的正反例：
> 差：「深入思考角色下一步应该做什么。」
> 好：「检查角色已知信息、当前目标、能力限制和已承诺事项；**只选择四项都支持的行为**。」

→ 检查表只回答"要检查什么"，缺**顺序 / 判断 / 跳过 / 降级 / 输出边界**，所以"不像思维链"。

### 规范的分工铁律（§6）
默认装配是：**预设通用主 CoT ＋ 角色卡常驻专项增量 ＋ 当前条件激活的 CoT 模块**。
- 跨卡规则（输入/场景/行为/连贯/输出检查）放**预设**
- 只对本卡成立且每轮要用的，放**卡片增量**，且增量要**点名它挂在主 CoT 的哪个阶段**（形如 xxx.after）
- **卡片不得复制整套主 CoT**；只写「新增条件、例外、更窄的边界」（§6.3 语义去重）
- 主 CoT 稳定阶段 ID：input_check / scene_state / character_state / goal_conflict /
  action_selection / continuity_check / output_format
- 复杂群像/系统卡常驻部分预算：**约 600~1200 目标 token**（§4.4）
- 默认输出边界：**步骤名、检查表、候选行为、评分不进正文**；角色内心活动是正文，不是系统判断的证明
- §9.1 静态检查里就有两条：「是否默认支持缝入预设自定义 CoT」「是否错误复制了整套预设已有规则」

### 已做的改动
1. **主 CoT 照搬 skills 模板** → src/欲妈群/_work/preset/CoT主协议-复杂群像-缝预设用.txt
   取自 cot-design-and-authoring.md 的 §5.3「复杂群像 / 系统卡 CoT」模板**原文照搬、一字未改**：
   1033 字符、9 个阶段、两个插入点 npc_scheduling.after 与 system_judgement.after。
   本卡是群像+系统卡，正好用这一版。
2. **卡的条目重做为「卡片增量声明」**（依据 §6.2）：
   原 [mvu_plot]思维链强制输出 → 重命名为 **[mvu_plot]CoT卡片增量**（1233 字符，仍 enabled=false 留底）。
   内容 = 增量 ID／目标主 CoT／目标阶段／位置 after／激活 always／接收模型 plot／输出边界／回退，
   加三个插入点各自声明「**本卡专属限制取自哪些常驻条目**」——**不复制条文**，只给表格指向：
   私密通用规范、阶段骨架、[总控]阶段、防口胡与世界观铁律、共感假阳具系统、群生态扩展、
   在场味道、[总控]角色速览、D20对抗判定系统、玩家指令约束、输出格式规范。
   再加 output_check 的一条收紧（步骤名/检查表/评分/算式不进正文）。
3. pack_yumq.mjs 里那条注释同步改成新名与新理由。
4. 复核：121 条／正则 9 条／[mvu_plot]CoT卡片增量 enabled=false ✓／旧条目名 0 残留 ✓

### 待办
- 用户把 CoT主协议-复杂群像-缝预设用.txt 粘进预设即可；卡的专属限制**不用动**（世界书里本来就常驻）
- 仍待回答：变量更新那两条正则（通用标签 UpdateVariable）若预设也自带 → 是否一并收掉
`;
fs.appendFileSync(F, add, 'utf8');
console.log('已追加 ' + add.length + ' 字符');
