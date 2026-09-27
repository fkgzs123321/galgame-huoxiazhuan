// ① 补 initvar 的两个缺口：世界（底座门控的依据）+ 她（7 套人设的落点）
// ② 从 initvar + 状态表 机械派生 schema.ts（Zod 4，顶部禁 import，统一 prefault）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const IV = path.join(D, '世界书/变量/initvar.yaml');

const iv = YAML.parse(fs.readFileSync(IV, 'utf8'));
// ① 补缺口
if (!iv.世界) {
  iv.世界 = { 底座: 'nanpa2', 关卡进度: 0, 关系封闭: {} };
  console.log('＋ initvar 补 世界（底座 / 关卡进度 / 关系封闭）');
}
if (!iv.她) {
  iv.她 = { 人设: '', 目的进度: 0, 已拿到: 0, 熟练度: 1, 此刻: '' };
  console.log('＋ initvar 补 她（人设 / 目的进度 / 已拿到 / 熟练度 / 此刻）');
}
fs.writeFileSync(IV, YAML.stringify(iv, { lineWidth: 0 }));

// ② 状态表的 范围/阈值 → clamp 区间
const 范围表 = {};
{
  const st = fs.readFileSync(path.join(D, '底座_nanpa2/状态表.yaml'), 'utf8').split(/\r?\n/);
  let 名 = '';
  for (const l of st) {
    const n = l.match(/^\s{2}- 名:\s*(.+)$/); if (n) { 名 = n[1].trim(); continue; }
    const r = l.match(/^\s{4}范围:\s*(.+)$/);
    if (r && 名) 范围表[名] = r[1].trim();
  }
}
const 取区间 = (名) => {
  const r = 范围表[名];
  if (!r) return null;
  const m = r.match(/(-?\d+)\s*[~～-]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

const 名集 = new Set(['鸣泽唯', '水野友美', '筱原泉', '南川洋子', '加藤美纪', '舞岛可怜', '杉本樱子', '都筑梢',
  '野野村美里', '安田爱美', '田中美沙', '片桐美铃', '鸣泽美佐子', '永岛佐知子', '永岛久美子']);

function 转(键, 值, 缩, 上名) {
  const i = ' '.repeat(缩);
  const desc = `describe('${上名 ? 上名 + '.' : ''}${键}')`;
  if (值 === null || 值 === undefined || 值 === '') return `${i}${键}: z.string().prefault('').${desc},`;
  if (typeof 值 === 'string') return `${i}${键}: z.string().prefault('${值.replace(/'/g, "\\'")}').${desc},`;
  if (typeof 值 === 'boolean') return `${i}${键}: z.coerce.boolean().prefault(${值}).${desc},`;
  if (typeof 值 === 'number') {
    const r = 取区间(键) || (值 >= 0 && 值 <= 100 ? [0, 100] : null);
    const clamp = r ? `.transform(v => _.clamp(Math.round(v), ${r[0]}, ${r[1]}))` : '.transform(v => Math.round(v))';
    return `${i}${键}: z.coerce.number()${clamp}.prefault(${值}).${desc},`;
  }
  if (Array.isArray(值)) return `${i}${键}: z.array(z.string()).prefault([]).${desc},`;
  // object
  const keys = Object.keys(值);
  if (!keys.length) return `${i}${键}: z.record(z.string().describe('${键}的键'), z.any()).prefault({}).${desc},`;
  const 内 = keys.map(k => 转(k, 值[k], 缩 + 2, 键)).join('\n');
  // 动态键（女角 / 记录表）→ z.partialRecord 语义：用 record 包裹每个对象
  return `${i}${键}: z.object({\n${内}\n${i}}).prefault({}).${desc},`;
}

const 主体 = Object.keys(iv).map(k => 转(k, iv[k], 2, '')).join('\n');
const schema = `// ════════════════════════════════════════════════════════════
// 旮旯给木 · 同级生2 · MVU schema.ts
// 变量结构的唯一权威定义。**与 世界书/变量/initvar.yaml 严格对应**（本文件由它派生）
//
// 遵循 references/mvu/zod-rule.yaml（Zod 4）：
//   - 顶部禁止任何 import（z 与 _ 由 forge 通过 jiti 全局注入）
//   - 统一 z.prefault() 而非 z.default()，保证增量更新与「可清空对象」都能解析
//   - 数值一律 z.coerce.number() + _.clamp + Math.round：越界夹紧，而不是整块更新被丢弃
//   - 动态键（女角 / 记录表）用 z.record 包裹，键 = 可读标识
//
// 三层（模块化架构）：
//   引擎层 → 主角（体力/三维/不可逆损伤）/ 她（人设/目的进度/熟练度）
//   底座层 → 世界（底座/关卡进度/关系封闭）/ 时间 / 场景 / 女角 / 剧情 / 经济 / 过程
// ════════════════════════════════════════════════════════════

export const Schema = z.object({
${主体}
}).prefault({});

export type Schema = z.output<typeof Schema>;
`;
fs.writeFileSync(path.join(D, 'schema.ts'), schema);
console.log('✅ schema.ts 已生成：' + schema.length + ' 字符');
console.log('   顶层键：' + Object.keys(iv).join(' / '));
