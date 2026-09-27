// 契约层与组装器行为测试（node --test）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSave } from '../src/schemas/saveSchemas.ts';
import { assemblePlan, mod } from '../src/prompts/presetAssembler.ts';
import { launchPositions, targetPositions, fmtPct } from '../src/utils/format.ts';
import { weightedPick, clamp } from '../src/utils/roll.ts';

test('validateSave 接受合法快照并填充默认值', () => {
  const r = validateSave({
    schemaVersion: 1,
    revision: 3,
    createdAt: 123,
    fingerprint: 'abc',
    state: {},
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.state.roster.length, 0);
    assert.equal(r.data.receipts.length, 0);
  }
});

test('validateSave 拒绝缺失必填字段', () => {
  const r = validateSave({ revision: 3 });
  assert.equal(r.ok, false);
});

test('assemblePlan 按预算裁剪模块并保留 essential', () => {
  const plan = assemblePlan(
    [
      mod('a', 'system', 'm1', 'A'.repeat(100)),   // ≈50 tok
      mod('b', 'user', 'm2', 'B'.repeat(100)),     // ≈50 tok
      mod('c', 'user', 'm3', 'C'.repeat(100)),     // ≈50 tok（essential）
    ],
    95,
    { essential: ['c'] }
  );
  assert.ok(plan.text.includes('C'), 'essential 模块必须保留');
  assert.ok(!plan.text.includes('B'), '超预算模块应被裁剪');
  assert.ok(plan.dropped.includes('b'), '裁剪列表应包含 b');
});

test('assemblePlan 禁用模块不进入输出', () => {
  const m = mod('x', 'user', 'mx', '内容', -1);
  m.enabled = false;
  const plan = assemblePlan([m]);
  assert.equal(plan.text, '');
  assert.equal(plan.dropped[0], 'x（disabled）');
});

test('站位掩码解析：21 → [2,1]，@1234 → [1,2,3,4]', () => {
  assert.deepEqual(launchPositions(21), [2, 1]);
  assert.deepEqual(launchPositions('1234'), [1, 2, 3, 4]);
  assert.deepEqual(targetPositions('~123'), [1, 2, 3]);
  assert.deepEqual(targetPositions('@1234'), [1, 2, 3, 4]);
});

test('百分比格式化', () => {
  assert.equal(fmtPct(0.85), '85%');
  assert.equal(fmtPct(0.125, 1), '12.5%');
  assert.equal(fmtPct(null), '-');
});

test('加权随机与钳制', () => {
  const picked = weightedPick([
    { value: 'a', weight: 1 },
    { value: 'b', weight: 0 },
  ]);
  assert.equal(picked, 'a');
  assert.equal(weightedPick([]), null);
  assert.equal(clamp(150, 0, 100), 100);
  assert.equal(clamp(-5, 0, 100), 0);
});
