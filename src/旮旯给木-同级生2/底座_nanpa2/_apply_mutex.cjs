// 把 15×15「同时进行矩阵」写进 状态表.yaml 的世界规则段
// 存两块：① 原表逐格（照搬，未修正）② 对称闭包（可用的规则）+ 待核对格清单
// 幂等：可重复运行（先找已经写过的块，再替换；否则替换原「互斥（3 组）」块）
const fs = require('fs');
const P = '状态表.yaml';
const MARK = '  - 名: 互斥矩阵（15×15';

const names = ['鸣泽唯','鸣泽美佐子','筱原泉','田中美沙','加藤美纪','舞岛可怜','都筑梢','安田爱美',
  '水野友美','杉本樱子','野野村美里','永岛久美子','永岛佐知子','南川洋子','片桐美铃'];

// ── 原表逐格（照抄，未修正；'·' = 原表该格缺失）──
const raw = [
  '×○○○○×○○○○○○○○○',
  '×××○××○○○×××○○○',
  '○××××○○×××○××××',
  '○×××○○○○××××○○○',
  '○○××○○○○○×××○○○',
  '○××○○×○○××××○○○',
  '××○○○×○○×○○○○○○',
  '○○○○○○○○○○○○○○○',
  '○○×○○○○○○○○○○○○',
  '○○××○××○○○○○○○○',
  '○○××××○○○○○×××·',
  '○○××××○○○○○×××·',
  '○○××××○○○○○×××·',
  '○○×○○○○○○○××××○',
  '○○×○○○○○○○×××○○',
];

const rows = raw.map(r => r.split(''));
const padded = [];
for (let i = 0; i < 15; i++) {
  if (rows[i].length === 14) { rows[i].push(rows[14][14]); padded.push(names[i]); }
  if (rows[i].length !== 15) throw new Error(`第 ${i + 1} 行长度 ${rows[i].length}`);
}

const asym = [];
for (let i = 0; i < 15; i++) for (let j = i + 1; j < 15; j++)
  if (rows[i][j] !== rows[j][i]) asym.push([i, j]);

const C = rows.map(r => r.slice());
for (const [i, j] of asym) { C[i][j] = '×'; C[j][i] = '×'; }

const pairs = [], cnt = [];
for (let i = 0; i < 15; i++) {
  let n = 0;
  for (let j = 0; j < 15; j++) if (i !== j && C[i][j] === '×') { n++; if (i < j) pairs.push([i + 1, j + 1]); }
  cnt.push(n);
}

const pad = s => String(s).padStart(2);
// 每行缩进必须完全一致（否则 block scalar 会提前截断）
const w = s => s + '　'.repeat(Math.max(0, 5 - s.length));
const row = (cells, i) => `      ${i + 1}. ${w(names[i])} ${cells}`;
const rawLines = raw.map((r, i) => row(r.split('').join(' '), i));
const cloLines = C.map((r, i) => row(r.join(' '), i));
const pairLines = pairs.map(([a, b]) => `      - [${pad(a)}, ${pad(b)}]   # ${names[a - 1]} × ${names[b - 1]}`);
const asymLines = asym.map(([i, j]) =>
  `        · ${pad(i + 1)}·${pad(j + 1)}  ${names[i]} × ${names[j]}: 原表写 ${rows[i][j]}，反向写 ${rows[j][i]}`);
const idLines = names.map((n, i) => `      - ${i + 1}: ${n}`);
const cntLines = '{' + names.map((n, i) => `${n}: ${cnt[i]}`).join(', ') + '}';

const block = `${MARK}，攻略原表逐格照搬）
    来源: ★ 游侠网 ali213 全量流程附的「同时进行」表（原作攻略原表）
    说明: |
      这才是「只能选一个」这条世界规则的真实形态 —— 不是几个零散的互斥组，而是一张完整矩阵。
      ○ = 可同时推进；× = 会互相破坏。
      **规则由代码持有，不进 prompt**（T2 契约，零 token）。
    ID 表:
${idLines.join('\n')}

    原表逐格（照搬，未修正。「·」= 原表该格缺失）: |
${rawLines.join('\n')}

    对称闭包（可用版本；任一向为 × 即判冲突）: |
${cloLines.join('\n')}

    冲突对（上三角，共 ${pairs.length} 对）:
${pairLines.join('\n')}
    每行冲突数: ${cntLines}
    违反后果: 触发一组 → 冲突的那条线永久封闭（不可逆损伤）

    ⚠️ 待核对（**这是本表唯一的未完成项**）: |
      原表是 HTML 挤压排版，转录后**有 ${asym.length} 处左右不对称** ——
      相容矩阵本应对称，所以这些格子至少有一边抄错了。已全部列出，**请拿原表逐条核对**：
${asymLines.join('\n')}
      另：第 ${padded.join(' / ')} 行原表少最后一格（与第 15 行同列），
      已按第 15 行（片桐美铃）反填。

    注: |
      原卡的 3 组手写互斥（友美↔泉 / 美佐子↔唯 / 佐知子↔久美子）是这张矩阵的子集，
      写入本表后**不再单独维护**。原卡另 3 组（齐藤姐妹 / 田中铃木 / 仁科正树）随 5 位自创角色作废。
`;

let text = fs.readFileSync(P, 'utf8');
const start = text.indexOf(MARK);
if (start >= 0) {
  const tail = text.indexOf('\n  - 名: ', start + 3);
  const end = tail >= 0 ? tail + 1 : text.length;
  text = text.slice(0, start) + block + text.slice(end);
  console.log('（幂等）替换已写入的矩阵块');
} else {
  const old = `  - 名: 互斥（3 组，按原作）
    成员:
      - 水野友美 ↔ 筱原泉      # ★ 原作明写「不能同时做友美和泉的男朋友」
      - 鸣泽美佐子 ↔ 鸣泽唯    # 母女
      - 永岛佐知子 ↔ 永岛久美子 # 母女：女儿想走，母亲守着旅馆
    违反后果: 触发后另一条线永久封闭（不可逆损伤）
    注: 原卡的另 3 组（齐藤姐妹 / 田中铃木 / 仁科正树）随 5 位自创角色一起作废
`;
  if (!text.includes(old)) throw new Error('既没找到矩阵块，也没找到原「互斥（3 组）」块 → 终止');
  text = text.replace(old, block);
}
fs.writeFileSync(P, text);

console.log('反填行：', padded.join(' / '));
console.log('原表不对称：', asym.length, '处（已列进文件的待核对清单）');
console.log('闭包后冲突对：', pairs.length, '对');
console.log('每行冲突数：', names.map((n, i) => n + cnt[i]).join(' '));
console.log('最排他的 3 位：', names.map((n, i) => [n, cnt[i]]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0] + x[1]).join(' '));
console.log('冲突最少的 3 位：', names.map((n, i) => [n, cnt[i]]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0] + x[1]).join(' '));
