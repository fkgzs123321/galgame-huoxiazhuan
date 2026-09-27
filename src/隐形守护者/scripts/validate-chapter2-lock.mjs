#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTER2_APPLY, detectChapter2Choice, CHAPTER2_CHECKPOINT_LINES } from './chapter2-choices.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const WRITE_DEAD = path.join(ROOT, '世界书/事件/第二章/第二章抉择全书-写死表.yaml');
const BE_SAMPLE = path.join(ROOT, '世界书/事件/第二章/第二章BE执行范例.yaml');
const EJS_CTRL = path.join(ROOT, '世界书/EJS/EJS（剧情）动态控制器.txt');
const MACHINE = path.join(ROOT, '世界书/事件/第二章/第二章写死机读表.yaml');

function main() {
  const errors = [];
  const writeDead = fs.readFileSync(WRITE_DEAD, 'utf8');
  const beSample = fs.readFileSync(BE_SAMPLE, 'utf8');
  const ejs = fs.readFileSync(EJS_CTRL, 'utf8');
  const machine = fs.readFileSync(MACHINE, 'utf8');

  for (const id of Object.keys(CHAPTER2_APPLY)) {
    if (!machine.includes(id)) errors.push(`[机读表] 缺少 ${id}`);
    if (!writeDead.includes(id) && !writeDead.includes('CHAPTER2_APPLY')) {
      /* 浓缩写死表引用脚本 */
    }
    const spec = CHAPTER2_APPLY[id];
    if (spec.be && !beSample.includes(spec.ending ?? '')) {
      errors.push(`[BE范例] ${id} 结局名「${spec.ending}」未出现在 BE 范例`);
    }
  }

  if (!ejs.includes('is_chapter2')) errors.push('[EJS] 缺少 is_chapter2');
  for (const name of [
    '第二章写死机读表',
    '第二章选项识别与一致性铁律',
    '第二章主持',
    '第二章节点推进铁律',
    '第二章抉择全书-写死表',
    '第二章BE执行范例',
    '第二章BE后禁止续玩',
    '第二章当前节点选项·常亮',
    '第二章非法节点熔断',
  ]) {
    if (!ejs.includes(name)) errors.push(`[EJS] 未 getwi ${name}`);
  }
  if (!ejs.includes('第二章-14-自保共荣') || !ejs.includes('第二章-22-倒酒')) {
    errors.push('[EJS] 未 getwi 关键分节点');
  }

  const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'tavern-cards-state.json'), 'utf8'));
  if (!state.extensions?.tavern_helper?.scripts?.['第二章写死强制']?.enabled) {
    errors.push('[脚本] 第二章写死强制 未启用');
  }
  const forceTs = fs.readFileSync(path.join(ROOT, '脚本/第二章写死强制/index.ts'), 'utf8');
  if (!forceTs.includes('enforceChapter2Write')) errors.push('[脚本] 缺少 enforceChapter2Write');
  if (!forceTs.includes('C2-22-A')) errors.push('[脚本] 缺少章末 C2-22-A');
  if (forceTs.includes('第一章已完成')) errors.push('[脚本] 残留 第一章已完成 字段');

  const samples = [
    ['C2-14-A', '第二章-14', '我只求自保而已'],
    ['C2-14-B', '第二章-14', '东亚共荣圈'],
    ['C2-12-B', '第二章-12', '掏枪对准李峰'],
    ['C2-22-A', '第二章-22', '为她倒酒'],
  ];
  for (const [expect, node, text] of samples) {
    const got = detectChapter2Choice(node, text);
    if (got !== expect) errors.push(`[choices] ${node}「${text}」→${got}，期望 ${expect}`);
  }

  if (CHAPTER2_APPLY['C2-14-B'].be !== false) errors.push('[choices] C2-14-B 应为非 BE');
  if (CHAPTER2_APPLY['C2-22-A'].node !== '第三章-0') errors.push('[choices] C2-22-A 应至 第三章-0');

  console.log('=== 第二章写死审计 ===');
  console.log(`选项数: ${Object.keys(CHAPTER2_APPLY).length}`);
  if (errors.length) {
    console.error(errors.map((e) => `- ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('全部通过');
}

main();
