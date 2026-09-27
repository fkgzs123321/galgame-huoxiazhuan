import fs from 'fs';
import YAML from 'yaml';

const files = ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml'];
const 删的键 = [];
const 删 = (obj, path, keys) => {
  let cur = obj;
  for (const s of path) { if (cur == null || cur[s] === undefined) return; cur = cur[s]; }
  for (const k of keys) if (cur[k] !== undefined) { delete cur[k]; 删的键.push([...path, k].join('.')); }
};

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const head = raw.startsWith('#') ? raw.split('\n')[0] + '\n' : '';   // 保住 override 首行注释
  const o = YAML.parse(raw);
  // ① 玩家·身体：4 个设定事实字段
  删(o, ['玩家', '身体'], ['阳具长度', '阳具周长', '阳具弯曲', '包皮']);
  // ② 玩家·性经历：整段
  if (o.玩家 && o.玩家.性经历 !== undefined) { delete o.玩家.性经历; 删的键.push('玩家.性经历（整段）'); }
  // ③ 郝佳期·身体：整段
  if (o.郝佳期 && o.郝佳期.身体 !== undefined) { delete o.郝佳期.身体; 删的键.push('郝佳期.身体（整段）'); }
  // ④ 成员详情：上次活跃时 + 专属收敛
  for (const uid of Object.keys(o.群?.成员详情 || {})) {
    const m = o.群.成员详情[uid];
    if (m.上次活跃时 !== undefined) { delete m.上次活跃时; 删的键.push('群.成员详情.' + uid + '.上次活跃时'); }
    if (m.专属 && typeof m.专属 === 'object') {
      const keep = {};
      if (m.专属.竞技纪录 !== undefined) keep.竞技纪录 = m.专属.竞技纪录;
      const n = Object.keys(m.专属).length - Object.keys(keep).length;
      m.专属 = keep;
      if (n > 0) 删的键.push('群.成员详情.' + uid + '.专属（删 ' + n + ' 个无用键）');
    }
  }
  fs.writeFileSync(f, head + YAML.stringify(o, { lineWidth: 0 }), 'utf8');
  console.log('✓ ' + f);
}
console.log('\n删除合计 ' + 删的键.length + ' 项：');
console.log('  ' + 删的键.slice(0, 6).join('\n  '));
if (删的键.length > 6) console.log('  …（其余 ' + (删的键.length - 6) + ' 项同类）');
