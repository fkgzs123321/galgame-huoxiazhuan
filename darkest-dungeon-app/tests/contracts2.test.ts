// 世界书契约/槽位映射/文本表 行为测试（node --test）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorldbookGenPrompt, parseWorldbookJson } from '../src/prompts/worldbookPrompt.ts';
import { slotKey, slotBackupKey } from '../src/db/saveSlots.ts';
import { launchPositions, isEnemyTarget } from '../src/utils/format.ts';

test('worldbook 输出契约提示词包含 JSON 要求', () => {
  const p = buildWorldbookGenPrompt('猪人之王');
  assert.ok(p.includes('猪人之王'));
  assert.ok(p.includes('JSON'));
  assert.ok(p.includes('keywords'));
});

test('parseWorldbookJson 解析合法输出（含代码块包裹）', () => {
  const raw = '```json\n{"title":"猪人之王","content":"兽窟的主宰，以腐肉为圣典。","keywords":["猪人","威尔伯","兽窟"]}\n```';
  const r = parseWorldbookJson(raw);
  assert.ok(r);
  assert.equal(r?.title, '猪人之王');
  assert.equal(r?.keywords.length, 3);
});

test('parseWorldbookJson 拒绝非法输出', () => {
  assert.equal(parseWorldbookJson('这不是 JSON'), null);
  assert.equal(parseWorldbookJson('{"title":"缺内容"}'), null);
  assert.equal(parseWorldbookJson(''), null);
});

test('存档槽位 key 映射：slot1 兼容旧档，slot2/3 独立', () => {
  assert.equal(slotKey('slot1'), 'dd-save-v3');
  assert.equal(slotBackupKey('slot1'), 'dd-save-v3.bak');
  assert.equal(slotKey('slot2'), 'dd-save-v3.slot2');
  assert.equal(slotBackupKey('slot2'), 'dd-save-v3.slot2.bak');
  assert.equal(slotKey('slot3'), 'dd-save-v3.slot3');
  // 三个槽位 key 互不相同
  const keys = new Set([slotKey('slot1'), slotKey('slot2'), slotKey('slot3')]);
  assert.equal(keys.size, 3);
});

test('站位解析与敌我判定', () => {
  assert.deepEqual(launchPositions(34), [3, 4]);
  assert.equal(isEnemyTarget('~123'), true);
  assert.equal(isEnemyTarget('@1234'), false);
  assert.equal(isEnemyTarget(''), false);
});
