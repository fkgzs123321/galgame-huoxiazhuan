#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  CHAPTER3_APPLY,
  CHAPTER3_CHECKPOINT_LINES,
  CHAPTER3_NODE_HINTS,
  CHAPTER3_NODES,
} from './chapter3-choices.mjs';

const dir = path.resolve(import.meta.dirname, '../世界书/事件/第三章');
fs.mkdirSync(dir, { recursive: true });

const machineRows = Object.entries(CHAPTER3_APPLY)
  .map(([id, s]) => {
    const be = s.be ? 'true' : 'false';
    const end = s.ending || (s.requireZibaoForHuang ? '暗线·生死归途' : s.requireMainClear ? '主路/信口雌黄' : '—');
    return `  | ${s.node.replace('第三章-', '').replace('第四章-0', '→四') } | ${id} | →${s.node} | ${be} | ${end} |`;
  })
  .join('\n');

const alwaysLines = Object.entries(CHAPTER3_CHECKPOINT_LINES)
  .map(([node, lines]) => {
    return `  **${node}**\n${lines.split('\n').map((l) => `  ${l}`).join('\n')}\n`;
  })
  .join('\n');

const beTable = `  | C3-4-A | 蔷薇之刺 | BE-第三章-蔷薇之刺 |
  | C3-6-A/B | 铁血锄奸/刀下亡魂 | 对应 BE |
  | C3-8-A | 铁血锄奸 | BE-第三章-铁血锄奸 |
  | C3-9-A/B | 香消玉损/色中恶鬼 | 对应 BE |
  | C3-12-A | 引火烧身 | BE-第三章-引火烧身 |
  | C3-13-A | 香消玉损 | BE-第三章-香消玉损 |
  | C3-14-A/C/D | 香消玉损/色中恶鬼 | 错绑对象 |
  | C3-14-B | 黄夫人 | **自保+自保感慨** 否则 **生死归途**（共荣圈暗线） |
  | C3-16-A | 章末 | 主路→**第四章-0**；庄情感<7→**信口雌黄** |`;

const files = {
  '第三章抉择全书-写死表.yaml': `名称: 第三章抉择全书-写死表
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 56
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 231

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第三章·生死途 · 抉择全书 · 写死表】

  来源：《隐形守护者》第三章本体；选项原文、结局名、节点 ID **不可改**。  
  **同楼写死**：本楼点选 → 本回合写完后果；BE 同回合收束。

  **章末通关**：C3-16-A 且 \`$第三章主路可通关\`（第二章分歧=自保 + 线索「第二章-自保的感慨」+ 庄情感≥7）→ **第四章-0**。

  **暗线**：第二章选**共荣圈**或缺自保感慨时，C3-14-B「黄夫人」→ **生死归途**（隐藏失败，不新增节点）。

  **信口雌黄**：有自保感慨但庄情感<7，章末 C3-16-A 收束。

  全表见《第三章BE执行范例》+机读表；脚本「第三章写死强制」\`CHAPTER3_APPLY\` 为权威。

  @@endif
`,
  '第三章写死机读表.yaml': `名称: 第三章写死机读表
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 55
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 230

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章'

  【第三章 · 写死机读表 · ${Object.keys(CHAPTER3_APPLY).length} 分支】

  | 节点序 | ID | 节点→ | 已死亡 | 代表 BE/备注 |
  |--------|-----|-------|--------|-------------|
${machineRows}

  @@endif
`,
  '第三章当前节点选项·常亮.yaml': `名称: 第三章当前节点选项·常亮
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 62
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 77

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第三章 · branches 照抄（与写死表逐字一致）】

${alwaysLines}
  当前节点：{{ getvar('stat_data.剧情.当前节点', { scope: 'local', defaults: '第三章-0' }) }}

  @@endif
`,
  '第三章选项识别与一致性铁律.yaml': `名称: 第三章选项识别与一致性铁律
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 53
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 224

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第三章 · 识别↔叙事↔变量（与「第三章写死强制」一致）】

  **唯一依据**：{{user}} 本楼点选原文。禁止用 AI 正文反推 ID。

  | 节点 | 通过 | BE / 暗线 |
  |------|------|-----------|
  | 4 | C3-4-B 叫住套取 | C3-4-A 蔷薇之刺 |
  | 6 | C3-6-C 跳舞 | C3-6-A/B 不理会/追方敏 |
  | 8~9 | C3-8-C 再考虑→万全 | C3-8-A 拒绝；C3-8-B→9 欺辱方敏 |
  | 10~13 | 万全之策链 | 错答→香消玉损/引火烧身等 |
  | 14 | **C3-14-B 黄夫人**（须自保+感慨） | A/C/D 错对象 BE |
  | 16 | C3-16-A→第四章 | 门闩失败→信口雌黄/生死归途 |

  @@endif
`,
  '第三章节点推进铁律.yaml': `名称: 第三章节点推进铁律
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 54
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 225

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第三章 · 节点推进铁律】

  1. 单轮最多前进 **1** 个节点（第三章-0→…→第三章-16→第四章-0）。
  2. **禁止跳关**：\`当前节点\` 不得领先 \`检查点\`。
  3. 须已触发 **第二章-完成** 方可进入第三章。
  4. **第二章分歧/自保感慨** 在第三章只读校验，不在本章改写（C3-14-B 黄夫人硬判暗线）。

  @@endif
`,
  '第三章非法节点熔断.yaml': `名称: 第三章非法节点熔断
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 63
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 78

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) !== true

  【第三章 · 非法节点熔断】

  检查点：{{ getvar('stat_data.剧情.检查点', { scope: 'local', defaults: '第三章-0' }) }}  
  当前节点：{{ getvar('stat_data.剧情.当前节点', { scope: 'local', defaults: '第三章-0' }) }}

  若 \`当前节点\` **超前于** \`检查点\`：**本楼禁止**跳段叙事、擅自进入第四章。

  @@endif
`,
  '第三章BE后禁止续玩.yaml': `名称: 第三章BE后禁止续玩
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 57
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 223

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章' && getvar('stat_data.剧情.已死亡', { scope: 'local', defaults: false }) === true

  【第三章 · BE 后禁止续玩】

  已死亡=true。本楼只收束 BE 叙事 + branches；**禁止**推进节点、禁止进入第四章。

  @@endif
`,
  '第三章BE执行范例.yaml': `名称: 第三章BE执行范例
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 58
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 229

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章'

  【第三章 · BE · 同楼收束】

  **通用 BE JSON 骨架**：
  \`\`\`json
  [
    { "op": "replace", "path": "/剧情/已死亡", "value": true },
    { "op": "replace", "path": "/剧情/结局分支", "value": "（标准结局名）" },
    { "op": "insert", "path": "/剧情/已解锁死亡结局/-", "value": "BE-第三章-（ID后缀）" }
  ]
  \`\`\`

  | ID | 结局名 | unlock |
  |----|--------|--------|
${beTable}

  **C3-16-A 通关 JSON**（主路）：
  \`\`\`json
  [
    { "op": "replace", "path": "/剧情/当前章节", "value": "第四章" },
    { "op": "replace", "path": "/剧情/当前节点", "value": "第四章-0" },
    { "op": "replace", "path": "/剧情/检查点", "value": "第四章-0" },
    { "op": "insert", "path": "/剧情/已触发事件/-", "value": "第三章-完成" }
  ]
  \`\`\`

  @@endif
`,
};

const overview = `名称: 第三章-生死途
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 58
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 232

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章'

  【第三章·生死途 · 节点链】

  第三章-0 → … → 第三章-16 → **第四章-0**（主路通关）

  | 节点 | 要点 |
  |------|------|
  | 0~5 | 澳门商团、庄晓曼试探、对接人 |
  | 6~9 | 舞会；杀方敏计划；欺辱方敏 BE |
  | 10~14 | 万全之策；**黄夫人**（自保+感慨） |
  | 15~16 | 武藤追问；章末门闩 |

  写死包：EJS \`is_chapter3\` + 脚本「第三章写死强制」。

  @@endif
`;

const nodeTpl = (node, hint) => `名称: ${node}-${hint}
类型: 事件
启用: false
激活策略:
  类型: 蓝灯
  优先级: 59
插入位置:
  类型: 指定深度
  角色: system
  深度: 2
  顺序: 240

内容: |
  @@if getvar('stat_data.剧情.当前章节', { scope: 'local', defaults: '' }) === '第三章' && getvar('stat_data.剧情.当前节点', { scope: 'local', defaults: '' }) === '${node}'

  【${node} · ${hint}】

  本节点选项见《第三章当前节点选项·常亮》；写死 ID 见《第三章写死机读表》。

  @@endif
`;

fs.writeFileSync(path.join(dir, '../第三章.yaml'), overview, 'utf8');
for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, name), body, 'utf8');
  console.log('wrote', name);
}
for (const node of CHAPTER3_NODES) {
  const hint = CHAPTER3_NODE_HINTS[node] ?? '节点';
  const slug = hint.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 12) || '节点';
  const fname = `${node}-${slug}.yaml`;
  fs.writeFileSync(path.join(dir, fname), nodeTpl(node, slug), 'utf8');
  console.log('wrote', fname);
}
