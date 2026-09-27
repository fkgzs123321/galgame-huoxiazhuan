import fs from 'fs';
const S = 'schema.ts';
const raw = fs.readFileSync(S, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(/\r?\n/);
const 记 = [];

// 删「A 到 B」之间的整块（含 A、B 行），B 从 A 之后找
const 删块 = (label, 起匹配, 止匹配) => {
  const i = lines.findIndex(l => 起匹配.test(l));
  if (i < 0) { console.log('MISS ' + label); return; }
  let j = -1;
  for (let k = i + 1; k < lines.length; k++) if (止匹配.test(lines[k])) { j = k; break; }
  if (j < 0) { console.log('MISS(止) ' + label); return; }
  const n = j - i + 1;
  lines.splice(i, n);
  记.push(label + '（删 ' + n + ' 行）');
};
// 删单行（含上一行的注释也可选删）
const 删行 = (label, 匹配, 连注释 = false) => {
  const i = lines.findIndex(l => 匹配.test(l));
  if (i < 0) { console.log('MISS ' + label); return; }
  let n = 1;
  if (连注释 && i > 0 && /^\s*\/\//.test(lines[i - 1])) { lines.splice(i - 1, 2); n = 2; }
  else lines.splice(i, 1);
  记.push(label + '（删 ' + n + ' 行）');
};

// ① 玩家·身体 删 4 个设定事实字段
for (const k of ['阳具长度', '阳具周长', '阳具弯曲', '包皮']) 删行('玩家.身体.' + k, new RegExp('^\\s*' + k + ':'));
// ② 玩家·性经历 整段 + 引用
删行('玩家·性经历 段注释', /^\/\/ ===== 玩家·性经历 =====$/, true);
删块('PlayerSexualSchema', /^const PlayerSexualSchema = z\.object\(\{/, /^\}\)\.prefault\(\{\}\);$/);
删行('玩家.性经历 引用', /^\s*性经历: PlayerSexualSchema,$/);
// ③ 郝佳期·身体 整段 + 引用
删块('HjqBodySchema', /^const HjqBodySchema = z\.object\(\{/, /^\}\)\.prefault\(\{\}\);$/);
删行('郝佳期.身体 引用', /^\s*身体: HjqBodySchema,$/);
// ④ 成员详情 删 上次活跃时
删行('成员详情.上次活跃时', /^\s*上次活跃时: num,$/);

fs.writeFileSync(S, lines.join(eol), 'utf8');
console.log('schema.ts ' + raw.length + ' → ' + lines.join(eol).length);
console.log('  ' + 记.join('\n  '));
