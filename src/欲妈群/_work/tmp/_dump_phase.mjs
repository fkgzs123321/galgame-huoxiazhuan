// 打印某位角色某几档的指定字段原文，便于逐条手改
// 用法：node _work/tmp/_dump_phase.mjs _data_su_mei.mjs play,does,openness [档号...]
import { pathToFileURL } from 'url';
import path from 'path';
const [, , file, fields, ...tiers] = process.argv;
const C = (await import(pathToFileURL(path.resolve('_work/data', file)).href)).default;
const want = fields.split(',');
const idx = tiers.length ? tiers.map(Number) : [1, 2, 3, 4, 5];
for (const n of idx) {
  const p = C.phases[n - 1];
  console.log('\n########## ' + C.name + ' 阶段' + n + ' · ' + p.tier + ' ##########');
  for (const f of want) {
    const v = p[f];
    if (v === undefined) continue;
    console.log('--- ' + f + ' ---');
    if (Array.isArray(v)) v.forEach((x, i) => console.log('[' + i + '] ' + x));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) console.log('[' + k + '] ' + (typeof x === 'object' ? JSON.stringify(x) : x));
    else console.log(v);
  }
}
