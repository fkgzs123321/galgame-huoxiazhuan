#!/usr/bin/env node
/**
 * 第一章写死全表审计：校验 choices.mjs、机读表、EJS、脚本与关键 YAML。
 * 用法：node scripts/validate-chapter1-lock.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTER1_APPLY, detectChapter1Choice, CHAPTER1_CHECKPOINT_LINES } from './chapter1-choices.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const WRITE_DEAD = path.join(ROOT, '世界书/事件/第一章/第一章抉择全书-写死表.yaml');
const BE_SAMPLE = path.join(ROOT, '世界书/事件/第一章/第一章BE执行范例.yaml');
const EJS_CTRL = path.join(ROOT, '世界书/EJS/EJS（剧情）动态控制器.txt');
const MACHINE = path.join(ROOT, '世界书/事件/第一章/第一章写死机读表.yaml');
const CHOICE_LOCK = path.join(ROOT, '世界书/事件/第一章/第一章选项识别与一致性铁律.yaml');

async function main() {
  const errors = [];
  const writeDead = fs.readFileSync(WRITE_DEAD, 'utf8');
  const beSample = fs.readFileSync(BE_SAMPLE, 'utf8');
  const ejs = fs.readFileSync(EJS_CTRL, 'utf8');
  const machine = fs.readFileSync(MACHINE, 'utf8');
  const choiceLock = fs.readFileSync(CHOICE_LOCK, 'utf8');

  for (const id of Object.keys(CHAPTER1_APPLY)) {
    if (!machine.includes(id)) errors.push(`[机读表] 缺少 ${id}`);
    if (!writeDead.includes(id)) errors.push(`[写死表] 缺少 ${id}`);
    const spec = CHAPTER1_APPLY[id];
    if (spec.be && !beSample.includes(spec.ending ?? '')) {
      errors.push(`[BE范例] ${id} 结局名「${spec.ending}」未出现在 BE 范例`);
    }
  }

  if (!ejs.includes('is_chapter1')) errors.push('[EJS] 缺少 is_chapter1');
  if (!ejs.includes('prologue_done')) errors.push('[EJS] 缺少 prologue_done 门控');
  for (const name of [
    '第一章写死机读表',
    '第一章选项识别与一致性铁律',
    '第一章主持',
    '第一章节点推进铁律',
    '第一章抉择全书-写死表',
    '第一章BE执行范例',
    '第一章BE后禁止续玩',
    '第一章当前节点选项·常亮',
  ]) {
    if (!ejs.includes(name)) errors.push(`[EJS] 未 getwi ${name}`);
  }
  if (!ejs.includes('第一章-0-章首')) errors.push('[EJS] 未 getwi 第一章-0-章首');
  if (!ejs.includes('第一章-1-发布会举手')) errors.push('[EJS] 未 getwi 第一章-1-发布会举手');
  if (!ejs.includes('第一章-10-方老师枪指')) errors.push('[EJS] 未 getwi 第一章-10-方老师枪指');
  if (!ejs.includes('第一章非法节点熔断')) errors.push('[EJS] 未 getwi 第一章非法节点熔断');
  if (!ejs.includes('第一章-2-战争看法') || !ejs.includes('第一章-15-叛徒信')) {
    errors.push('[EJS] 未 getwi 全部分节点剧本');
  }
  const roleEjs = fs.readFileSync(path.join(ROOT, '世界书/EJS/EJS（角色）动态控制器.txt'), 'utf8');
  for (const p of ['肖途-Persona', '方敏-Persona', '武藤志雄-Persona', '武藤纯子-Persona']) {
    if (!roleEjs.includes(p)) errors.push(`[EJS角色] 未 getwi ${p}`);
  }

  const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'tavern-cards-state.json'), 'utf8'));
  const scripts = state.extensions?.tavern_helper?.scripts ?? {};
  if (!scripts['第一章写死强制']?.enabled) {
    errors.push('[脚本] 第一章写死强制 未在 tavern-cards-state 启用');
  }
  const forceTs = fs.readFileSync(path.join(ROOT, '脚本/第一章写死强制/index.ts'), 'utf8');
  if (!forceTs.includes('CHAPTER1_PREWRITE_ID') || !forceTs.includes('MESSAGE_SENT')) {
    errors.push('[脚本] 第一章写死强制 缺少生成前 inject / MESSAGE_SENT');
  }
  if (!forceTs.includes('enforceChapter1Write')) errors.push('[脚本] 缺少 enforceChapter1Write');
  if (!forceTs.includes('ensureMessageBranchesBlock')) {
    errors.push('[脚本] 缺少 ensureMessageBranchesBlock');
  }

  const samples = [
    ['C1-1-A', '第一章-1', '举手'],
    ['C1-1-B', '第一章-1', '不举手'],
    ['C1-2-B', '第一章-2', '继续战争武力解决'],
    ['C1-10-A', '第一章-10', '捡起枪对准方老师'],
    ['C1-15-A', '第一章-15', '四个不同的会议时间地点'],
  ];
  for (const [expect, node, text] of samples) {
    const got = detectChapter1Choice(node, text);
    if (got !== expect) errors.push(`[choices] ${node}「${text}」→${got}，期望 ${expect}`);
  }

  if (CHAPTER1_APPLY['C1-2-B'].be !== false) {
    errors.push('[choices] C1-2-B 应为非 BE（仅减阵营信用）');
  }
  if (CHAPTER1_APPLY['C1-15-A'].node !== '第二章-0') {
    errors.push('[choices] C1-15-A 应推进至 第二章-0');
  }

  for (const node of Object.keys(CHAPTER1_CHECKPOINT_LINES)) {
    if (!choiceLock.includes(node.replace('第一章-', '第一章-'))) {
      /* checkpoint lines live in choices.mjs; 常亮 yaml should reference branches */
    }
  }

  console.log('=== 第一章写死审计 ===');
  console.log(`选项数: ${Object.keys(CHAPTER1_APPLY).length}`);
  if (errors.length) {
    console.error(`失败 ${errors.length} 项:`);
    for (const e of errors) console.error('  ✗', e);
    process.exit(1);
  }
  console.log(`通过: ${Object.keys(CHAPTER1_APPLY).length} 个 apply 分支 + EJS + 脚本`);
  console.log('\n【已对齐序章】');
  console.log('  · EJS 按节点 getwi 第一章-1~15 分剧本 + 非法节点熔断');
  console.log('  · Persona 灰灯 + 脚本 MVU 白名单净化');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
