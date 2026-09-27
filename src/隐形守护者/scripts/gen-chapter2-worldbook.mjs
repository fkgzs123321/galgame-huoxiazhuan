#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTER2_APPLY, CHAPTER2_CHECKPOINT_LINES } from './chapter2-choices.mjs';

const dir = path.resolve(import.meta.dirname, '../世界书/事件/第二章');
fs.mkdirSync(dir, { recursive: true });

const machineRows = Object.entries(CHAPTER2_APPLY)
  .map(([id, s]) => {
    const be = s.be ? 'true' : 'false';
    const end = s.ending || '—';
    return `  | ${s.node.replace('第二章-', '')} | ${id} | →${s.node} | ${be} | ${end} |`;
  })
  .join('\n');

const alwaysLines = Object.entries(CHAPTER2_CHECKPOINT_LINES)
  .map(([node, lines]) => {
    const title = node.replace('第二章-', '');
    return `  **${node}**\n${lines.split('\n').map((l) => `  ${l}`).join('\n')}\n`;
  })
  .join('\n');

const files = {
  '第二章抉择全书-写死表.yaml': `名称: 第二章抉择全书-写死表
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 56
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 221

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第二章·狩猎者 · 抉择全书 · 写死表】

  来源：《隐形守护者》第二章本体；选项原文、结局名、节点 ID **不可改**。  
  **同楼写死**：本楼点选 → 本回合写完后果；BE 同回合收束。  
  文末：\`</叙事>\` → \`<StatusPlaceHolderImpl/>\` → \`<UpdateVariable>\`。

  **章末通关**：C2-22-A「为她倒酒」且庄晓曼情感值累计≥4 → **第三章-0**；写入 \`第二章分歧\`（C2-14-A 自保 / C2-14-B 共荣圈）。

  **关键 BE**：枪声何处、十面埋伏、甜蜜子弹、无处偷生、黄雀在后、恻隐之殇、万千心事、切肤之痛、切齿之恨。

  全表 JSON 与分支见《第二章BE执行范例》+机读表；脚本「第二章写死强制」\`CHAPTER2_APPLY\` 为权威。

  @@endif
`,
  '第二章写死机读表.yaml': `名称: 第二章写死机读表
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 55
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 220

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章'

  【第二章 · 写死机读表 · ${Object.keys(CHAPTER2_APPLY).length} 分支】

  | 节点序 | ID | 节点→ | 已死亡 | 代表 BE/备注 |
  |--------|-----|-------|--------|-------------|
${machineRows}

  @@endif
`,
  '第二章当前节点选项·常亮.yaml': `名称: 第二章当前节点选项·常亮
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 62
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 67

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第二章 · branches 照抄（与写死表逐字一致）】

${alwaysLines}
  当前节点：{{ getvar('stat_data.剧情.当前节点', { scope: 'local', defaults: '第二章-0' }) }}

  @@endif
`,
  '第二章选项识别与一致性铁律.yaml': `名称: 第二章选项识别与一致性铁律
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 53
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 214

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第二章 · 识别↔叙事↔变量（与「第二章写死强制」一致）】

  **唯一依据**：{{user}} 本楼点选原文。禁止用 AI 正文反推 ID。

  | 节点 | 通过 | BE |
  |------|------|-----|
  | 14 | C2-14-A 只求自保→分歧自保+线索 | C2-14-B 共荣圈→分歧共荣圈（非 BE） |
  | 22 | C2-22-A 倒酒→第三章（庄情感≥4） | C2-22-B/C 甜蜜子弹 |

  全表见《第二章写死机读表》。李峰问动机、庄晓曼酒吧三连为 **好感累计**，非单轮跳关。

  @@endif
`,
  '第二章节点推进铁律.yaml': `名称: 第二章节点推进铁律
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 54
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 215

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第二章 · 节点推进铁律】

  1. 单轮最多前进 **1** 个节点（第二章-0→…→第二章-22→第三章-0）。
  2. **禁止跳关**：\`当前节点\` 不得领先 \`检查点\`。
  3. 须已触发 **第一章-完成** 方可进入第二章（\`当前章节=第二章\`）。
  4. **第二章分歧** 仅在 C2-14 写入一次（自保|共荣圈）。

  @@endif
`,
  '第二章非法节点熔断.yaml': `名称: 第二章非法节点熔断
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 63
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 68

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第二章 · 非法节点熔断】

  检查点：{{ getvar('stat_data.剧情.检查点', { scope: 'local', defaults: '第二章-0' }) }}  
  当前节点：{{ getvar('stat_data.剧情.当前节点', { scope: 'local', defaults: '第二章-0' }) }}

  若 \`当前节点\` **超前于** \`检查点\`：**本楼禁止**跳段叙事、提前庄晓曼酒吧收束、擅自进入第三章。

  @@endif
`,
  '第二章BE后禁止续玩.yaml': `名称: 第二章BE后禁止续玩
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 57
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 213

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) === true

  【第二章 · BE 后禁止续玩】

  已死亡=true。本楼只收束 BE 叙事 + branches（检查点选项）；**禁止**推进节点、禁止进入第三章。

  @@endif
`,
  '第二章BE执行范例.yaml': `名称: 第二章BE执行范例
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 58
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 219

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章'

  【第二章 · BE · 同楼收束】

  **通用 BE JSON 骨架**：
  \`\`\`json
  [
    { "op": "replace", "path": "/剧情/已死亡", "value": true },
    { "op": "replace", "path": "/剧情/结局分支", "value": "（标准结局名）" },
    { "op": "insert", "path": "/剧情/已解锁死亡结局/-", "value": "BE-第二章-（ID后缀）" }
  ]
  \`\`\`

  | ID | 结局名 | unlock |
  |----|--------|--------|
  | C2-5-C/D | 无处偷生 | BE-第二章-无处偷生 |
  | C2-6-B/C2-7-B | 黄雀在后 | BE-第二章-黄雀在后 |
  | C2-8-B | 恻隐之殇 | BE-第二章-恻隐之殇 |
  | C2-9-B/C | 万千心事 | BE-第二章-万千心事 |
  | C2-12-B | 枪声何处 | BE-第二章-枪声何处 |
  | C2-13-B/C | 切肤之痛/切齿之恨 | BE-第二章-切肤之痛 等 |
  | C2-16-B/C2-19-B/C | 十面埋伏 | BE-第二章-十面埋伏 |
  | C2-17-B/C | 万千心事/切肤之痛 | 见上 |
  | C2-22-B/C | 甜蜜子弹 | BE-第二章-甜蜜子弹 |

  **C2-22-A 通关 JSON**：
  \`\`\`json
  [
    { "op": "replace", "path": "/剧情/当前章节", "value": "第三章" },
    { "op": "replace", "path": "/剧情/当前节点", "value": "第三章-0" },
    { "op": "replace", "path": "/剧情/检查点", "value": "第三章-0" },
    { "op": "insert", "path": "/剧情/已触发事件/-", "value": "第二章-完成" }
  ]
  \`\`\`

  **C2-14-A** 另 replace \`第二章分歧\`=自保 + insert 线索「第二章-自保的感慨」。

  @@endif
`,
};

const overview = `名称: 第二章-狩猎者
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 58
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 221

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第二章'

  【第二章·狩猎者 · 节点链】

  第二章-0 → 第二章-1 … → 第二章-22 → **第三章-0**（通关）

  | 节点 | 要点 |
  |------|------|
  | 1~3 | 李峰、胡一彪、顾君如 |
  | 5~9 | 刺杀吴明达/顾君如线 |
  | 12~14 | 李峰夜遇；**自保/共荣圈分歧** |
  | 20~22 | 庄晓曼酒吧；情感门槛 |

  写死包：EJS \`is_chapter2\` getwi + 脚本「第二章写死强制」。

  @@endif
`;

fs.writeFileSync(path.join(dir, '../第二章.yaml'), overview, 'utf8');
for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, name), body, 'utf8');
  console.log('wrote', name);
}
