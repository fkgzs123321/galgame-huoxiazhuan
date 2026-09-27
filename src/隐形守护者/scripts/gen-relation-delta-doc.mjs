#!/usr/bin/env node
/**
 * 从 choices.mjs 生成《数值尺度与写死选项对照》世界书 YAML
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROLOGUE_APPLY } from './prologue-choices.mjs';
import { CHAPTER1_APPLY } from './chapter1-choices.mjs';
import { CHAPTER2_APPLY } from './chapter2-choices.mjs';
import { CHAPTER3_APPLY } from './chapter3-choices.mjs';
import {
  REL_EMOTION_MIN,
  REL_EMOTION_MAX,
  REL_TRUST_MAX,
  GATE_FANG_TRUST,
  GATE_ZHUANG_EMOTION_CH2_END,
  GATE_ZHUANG_EMOTION_CH3_MAIN,
  GATE_ZHUANG_MUTUAL_OPS,
  GATE_ZHUANG_EMOTION_OPS,
  INIT_TRUST,
  formatApplyDeltasTable,
} from './relation-scale.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, '世界书/MVU/数值尺度与写死选项对照.yaml');

const body = `名称: 数值尺度与写死选项对照
类型: MVU
启用: true
激活策略:
  类型: 蓝灯
  优先级: 98
插入位置:
  类型: 指定深度
  角色: system
  深度: 0
  顺序: 94

内容: |
  【关系数值尺度 · 防爆炸 · 权威】

  > **玩家可见数只许** \`choices.mjs\` + 写死脚本 \`deltas\` 改动；AI 在写死章内擅自 patch 会被脚本回滚。
  > **不新增支线节点**；门槛用现有节点 + 派生门闩。

  ## 一、尺度（已收紧，勿用旧版 0~100 / -20~20 理解关系）

  | 字段 | 范围 | 初始 | 硬门闩 |
  |------|------|------|--------|
  | 情感值 | ${REL_EMOTION_MIN}~+${REL_EMOTION_MAX} | 0 | 庄第二章末累计≥${GATE_ZHUANG_EMOTION_CH2_END}；第三章主路≥${GATE_ZHUANG_EMOTION_CH3_MAIN} |
  | 信任度/互信度 | 0~${REL_TRUST_MAX} | 方敏/纯子${INIT_TRUST.方敏}；庄互信${INIT_TRUST.庄晓曼互信} | 方敏可交底≥${GATE_FANG_TRUST}；庄协同互信≥${GATE_ZHUANG_MUTUAL_OPS}且情感≥${GATE_ZHUANG_EMOTION_OPS} |
  | 伪装/身心/组织/阵营 | 0~100 | 见 initvar | 与关系分开，仍可按《变量更新规则》小步 delta |
  | 武藤怀疑度 | 0~10 | 3 | 序章禁止 AI 乱涨 |

  **单轮建议 |Δ|**：情感≤2；信任/互信≤4（关键抉择最多情感±3、信任±5）。一章内单角色情感净增建议≤5。

  ## 二、派生（Zod 只读，禁止 patch）

  - \`$方敏可交底\` ← 方敏信任≥${GATE_FANG_TRUST}
  - \`$庄晓曼可协同高危任务\` ← 互信≥${GATE_ZHUANG_MUTUAL_OPS} 且情感≥${GATE_ZHUANG_EMOTION_OPS}
  - \`$第三章主路可通关\` ← 第二章分歧=自保 + 线索「自保的感慨」+ 庄情感≥${GATE_ZHUANG_EMOTION_CH3_MAIN}（第三章写死硬判）

  ## 三、写死选项 ↔ 数值（自动生成，勿手改）

${formatApplyDeltasTable(PROLOGUE_APPLY, '序章').split('\n').map((l) => `  ${l}`).join('\n')}

${formatApplyDeltasTable(CHAPTER1_APPLY, '第一章').split('\n').map((l) => `  ${l}`).join('\n')}

${formatApplyDeltasTable(CHAPTER2_APPLY, '第二章').split('\n').map((l) => `  ${l}`).join('\n')}

${formatApplyDeltasTable(CHAPTER3_APPLY, '第三章').split('\n').map((l) => `  ${l}`).join('\n')}

  ## 四、与调色盘分段（中等方案 · 无新节点）

  - 方敏：信任 <28 / 28~34 / ≥${GATE_FANG_TRUST}（可交底）→ 见《方敏-调色盘》
  - 庄晓曼：情感 <3 / 3~6 / ≥${GATE_ZHUANG_EMOTION_CH3_MAIN} → 见《庄晓曼-调色盘》

  ## 五、第三章门闩（写死脚本）

  - C3-14-B「黄夫人」：非自保或无「自保的感慨」→ BE·生死归途（共荣圈暗线）
  - C3-16-A：主路→第四章-0；庄情感<7 且有感慨→ BE·信口雌黄
`;

fs.writeFileSync(outPath, body, 'utf8');
console.log('Wrote', outPath);
