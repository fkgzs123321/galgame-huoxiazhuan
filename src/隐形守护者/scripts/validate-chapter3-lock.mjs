#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  CHAPTER3_APPLY,
  CHAPTER3_NODES,
  detectChapter3Choice,
  CHAPTER3_CHECKPOINT_LINES,
  isChapter3MainRouteClear,
} from './chapter3-choices.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const WRITE_DEAD = path.join(ROOT, '世界书/事件/第三章/第三章抉择全书-写死表.yaml');
const BE_SAMPLE = path.join(ROOT, '世界书/事件/第三章/第三章BE执行范例.yaml');
const EJS_CTRL = path.join(ROOT, '世界书/EJS/EJS（剧情）动态控制器.txt');
const MACHINE = path.join(ROOT, '世界书/事件/第三章/第三章写死机读表.yaml');

function main() {
  const errors = [];
  const beSample = fs.readFileSync(BE_SAMPLE, 'utf8');
  const ejs = fs.readFileSync(EJS_CTRL, 'utf8');
  const machine = fs.readFileSync(MACHINE, 'utf8');

  for (const id of Object.keys(CHAPTER3_APPLY)) {
    if (!machine.includes(id)) errors.push(`[机读表] 缺少 ${id}`);
    const spec = CHAPTER3_APPLY[id];
    if (spec.be && spec.ending && !beSample.includes(spec.ending)) {
      errors.push(`[BE范例] ${id} 结局名「${spec.ending}」未出现在 BE 范例`);
    }
  }
  for (const end of ['信口雌黄', '生死归途']) {
    if (!beSample.includes(end)) errors.push(`[BE范例] 缺少门闩结局 ${end}`);
  }

  if (!ejs.includes('is_chapter3')) errors.push('[EJS] 缺少 is_chapter3');
  for (const name of [
    '第三章写死机读表',
    '第三章选项识别与一致性铁律',
    '第三章主持',
    '第三章节点推进铁律',
    '第三章抉择全书-写死表',
    '第三章BE执行范例',
    '第三章BE后禁止续玩',
    '第三章当前节点选项·常亮',
    '第三章非法节点熔断',
  ]) {
    if (!ejs.includes(name)) errors.push(`[EJS] 未 getwi ${name}`);
  }

  const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'tavern-cards-state.json'), 'utf8'));
  if (!state.extensions?.tavern_helper?.scripts?.['第三章写死强制']?.enabled) {
    errors.push('[脚本] 第三章写死强制 未启用');
  }
  const forceTs = fs.readFileSync(path.join(ROOT, '脚本/第三章写死强制/index.ts'), 'utf8');
  if (!forceTs.includes('enforceChapter3Write')) errors.push('[脚本] 缺少 enforceChapter3Write');
  if (!forceTs.includes('C3-16-A')) errors.push('[脚本] 缺少章末 C3-16-A');
  for (const n of CHAPTER3_NODES) {
    if (!forceTs.includes(`'${n}'`)) errors.push(`[脚本] CHAPTER3_NODES 缺少 ${n}`);
  }
  if (/第三章-1[7-9]|第三章-2[0-9]/.test(forceTs)) {
    errors.push('[脚本] 残留第二章节点数（第三章-17~22），请重生 index.ts');
  }
  if (CHAPTER3_NODES.length !== 17) errors.push(`[choices] 节点数应为 17，实际 ${CHAPTER3_NODES.length}`);
  if (!forceTs.includes('requireZibaoForHuang')) errors.push('[脚本] 缺少黄夫人暗线门闩');
  if (forceTs.includes('第三章分歧')) errors.push('[脚本] 残留 第三章分歧 字段');

  const samples = [
    ['C3-14-B', '第三章-14', '黄夫人'],
    ['C3-4-B', '第三章-4', '叫住她套取情报'],
    ['C3-16-A', '第三章-16', '继续布置绑架计划'],
    ['C3-12-B', '第三章-12', '利用胡一彪'],
  ];
  for (const [expect, node, text] of samples) {
    const got = detectChapter3Choice(node, text);
    if (got !== expect) errors.push(`[choices] ${node}「${text}」→${got}，期望 ${expect}`);
  }

  if (CHAPTER3_APPLY['C3-16-A'].node !== '第四章-0') errors.push('[choices] C3-16-A 应至 第四章-0');

  const mockMain = {
    剧情: { 第二章分歧: '自保', 已收集线索: ['第二章-自保的感慨'] },
    对user: { 庄晓曼: { 情感值: 7 } },
  };
  if (!isChapter3MainRouteClear(mockMain)) errors.push('[choices] 主路门闩判定异常');

  console.log('=== 第三章写死审计 ===');
  console.log(`选项数: ${Object.keys(CHAPTER3_APPLY).length}`);
  if (errors.length) {
    console.error(errors.map((e) => `- ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('全部通过');
}

main();
