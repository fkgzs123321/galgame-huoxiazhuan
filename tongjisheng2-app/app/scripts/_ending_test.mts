import { detectEnding, extractPlayerStats } from '../src/runtime/ending-detector';

let pass = 0;
let fail = 0;
function assert(cond: boolean, name: string, detail = '') {
  if (cond) { pass++; console.log(`OK   | ${name}`); } else { fail++; console.log(`FAIL | ${name} ${detail}`); }
}

const base = {
  主角: { 魅力: 55, 学业: 60, 体力: 50, 社交: 65, 敏感: 45, 声誉: 60, 玩家姓名: '桐生同学', 玩家身份: '原作主角', 饥饿: 30, 口渴: 20, 心情: 70, 违法计数: 0 },
  时间: { 天数: 5, 章节: '寒假前奏', 当前日期: '12-24' },
  临时: { 死结局标识: '' },
  当前女角: { 姓名: '鸣泽美佐子', 好感度: 80, 嫉妒值: 0, 关系阶段: '心动' },
  隐藏: {},
};

// 1. 未到结局阶段 → null
assert(detectEnding(base) === null, '未到结局阶段 → null');

// 2. 死结局标识 → bad_end
const d1 = detectEnding({ ...base, 临时: { 死结局标识: '战斗败北_住院' } });
assert(d1?.endingType === 'bad_end' && d1.endingId === 'bad_end_any', '死结局标识 → bad_end', JSON.stringify(d1));

// 3. 饥饿死结局 → bad_end
const d2 = detectEnding({ ...base, 主角: { ...base.主角, 饥饿: 100 } });
assert(d2?.endingType === 'bad_end', '饥饿 100 → bad_end');

// 4. 隐藏结局:樱子死讯
const d3 = detectEnding({ ...base, 隐藏: { 樱子死讯: true } });
assert(d3?.endingType === 'hidden' && d3.endingId === 'sakurako_hidden', '樱子死讯 → hidden', JSON.stringify(d3));

// 5. 结局阶段 day17 + 攻略完成 → true_end
const e1 = detectEnding({ ...base, 时间: { 天数: 17, 章节: '结局', 当前日期: '01-07' }, 当前女角: { ...base.当前女角, 关系阶段: '攻略完成' } });
assert(e1?.endingType === 'true_end' && e1.endingId === 'true_end_misuzu', 'day17+攻略完成 → true_end_misuzu', JSON.stringify(e1));

// 6. 结局阶段 + 好感≥60 → good_end
const e2 = detectEnding({ ...base, 时间: { 天数: 17, 章节: '结局', 当前日期: '01-07' } });
assert(e2?.endingType === 'good_end' && e2.endingId === 'good_end_misuzu', 'day17+好感80 → good_end', JSON.stringify(e2));

// 7. 结局阶段 + 好感<60 → normal_end
const e3 = detectEnding({ ...base, 时间: { 天数: 17 }, 当前女角: { ...base.当前女角, 好感度: 30 } });
assert(e3?.endingType === 'normal_end', 'day17+好感30 → normal_end');

// 8. extractPlayerStats 提取六维
const stats = extractPlayerStats(base);
assert(stats.魅力 === 55 && stats.学业 === 60 && stats.体力 === 50 && stats.社交 === 65 && stats.敏感 === 45 && stats.声誉 === 60, 'extractPlayerStats 六维', JSON.stringify(stats));
assert(Object.keys(extractPlayerStats({})).length === 0, '空 stat_data → 空对象');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
