// LCG 确定性骰子回归测试
// 运行: node scripts/_lcg_test.mjs
import { createLcg, seedFromStatData, rollD100FromStatData } from '../src/runtime/lcg-engine.ts';

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK   ' : 'FAIL '}| ${name}${detail ? ` | ${detail}` : ''}`);
};

const seedA = { day: 1, timeSlot: '早', heroineId: 1, chapter: '寒假前奏' };
const lcgA1 = createLcg(seedA);
const lcgA2 = createLcg(seedA);
check(
  '同种子同序列',
  [1, 2, 3].every(() => lcgA1.rollD100() === lcgA2.rollD100()),
);

const lcgB = createLcg({ ...seedA, day: 2 });
const seqA = [lcgA1.rollD100(), lcgA1.rollD100(), lcgA1.rollD100()];
const seqB = [lcgB.rollD100(), lcgB.rollD100(), lcgB.rollD100()];
check('不同天数产生不同序列', seqA.join(',') !== seqB.join(','));

const sd = {
  时间: { 天数: 3, 时段: '下午', 章节: '寒假核心' },
  场景: { 当前女角id: 2 },
  当前女角: { id: 2 },
};
const seed = seedFromStatData(sd);
check(
  'seedFromStatData 读取 stat_data',
  seed.day === 3 && seed.timeSlot === '下午' && seed.heroineId === 2 && seed.chapter === '寒假核心',
  JSON.stringify(seed),
);

check(
  'stat_data 同盐同结果',
  rollD100FromStatData(sd, 'combat-test') === rollD100FromStatData(sd, 'combat-test'),
);
check(
  '不同盐不同结果',
  rollD100FromStatData(sd, 'combat-test') !== rollD100FromStatData(sd, 'other-test'),
);

let inRange = true;
for (let i = 0; i < 100; i++) {
  const roll = createLcg({ ...seedA, salt: i }).rollD100();
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    inRange = false;
    break;
  }
}
check('1d100 范围与整数', inRange);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
