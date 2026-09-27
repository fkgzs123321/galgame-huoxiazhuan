// ════════════════════════════════════════════════════════════
// gen-schema.cjs · 由 initvar.yaml 机械派生 schema.ts
//
// 依据：references/mvu/zod-rule.yaml（Zod 4）
//   · 顶部禁止任何 import（z 与 _ 由 forge 通过 jiti 全局注入）
//   · 统一 z.prefault() 而非 z.default()：增量更新与「可清空对象」都能解析
//   · 数值一律 z.coerce.number() + _.clamp + Math.round：越界**夹紧**，而不是整块更新被丢弃
//
// clamp 区间从哪来：底座_yingxiong/状态表.yaml 的「范围」列。
//   状态表是 T2 契约，它是唯一权威 —— 手写区间必然与它漂移。
//
// ⚠️ 动态表（键未知的表）单独处理：Zod 的 z.record(z.any()) 能解析但**不会纠错**，
//    而 MVU 的价值恰恰在于「AI 改坏变量时自动纠正」。所以这三张表用强类型。
//
// 用法: node scripts/gen-schema.cjs
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const IV = path.join(D, '世界书/变量/initvar.yaml');

const iv = YAML.parse(fs.readFileSync(IV, 'utf8'));

// ── ① 状态表的「范围」列 → clamp 区间 ──
const 范围表 = {};
{
  const st = fs.readFileSync(path.join(D, '底座_yingxiong/状态表.yaml'), 'utf8').split(/\r?\n/);
  let 名 = '';
  for (const l of st) {
    const n = l.match(/^\s{2}- 名:\s*(.+)$/);
    if (n) { 名 = n[1].trim(); continue; }
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

// ── ② 动态表的强类型（键未知，值要能被纠正）──
const 动态表 = {
  '技能.门派': `z.record(
      z.string().describe('技能名'),
      z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 255))
    ).prefault({})`,
  '技能.逍遥': `z.record(
      z.string().describe('技能名'),
      z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 255))
    ).prefault({})`,
  '关系': `z.record(
      z.string().describe('女角名'),
      z.object({
        好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
        关系阶段: z.string().catch('陌生'),
        已学自她: z.array(z.string()).prefault([]),
      }).prefault({})
    ).prefault({})`,
  '局面.判定结果': `z.record(z.string(), z.any()).prefault({})`,
  '局面.战斗结果': `z.record(z.string(), z.any()).prefault({})`,
};

// ── ③ 递归生成 ──
function 转(键, 值, 缩, 上名) {
  const i = ' '.repeat(缩);
  const 路径 = 上名 ? 上名 + '.' + 键 : 键;
  const desc = `describe('${路径}')`;

  /* 动态表优先 */
  if (动态表[路径] !== undefined) {
    return `${i}${键}: ${动态表[路径]}.${desc},`.replace(/\n\s*\./g, '\n' + i + '  .');
  }

  // ★ 字符串一律 z.string().catch(默认)：catch 连类型错误一起兜住
  //   （2026-09-17 修：原来用 prefault，只处理 undefined；AI 把「熟练度」写成数字时
  //    校验失败会**丢掉整块变量更新**，而不是只丢这一个字段。
  //    数值那边的哲学是「越界夹紧，不整块丢弃」，字符串也照这个来：
  //    写坏了 → 落回默认值（熟练度回「新手」），其余字段照常保存。）
  if (值 === null || 值 === undefined || 值 === '') return `${i}${键}: z.string().catch('').${desc},`;
  if (typeof 值 === 'string') return `${i}${键}: z.string().catch('${值.replace(/'/g, "\\'")}').${desc},`;
  if (typeof 值 === 'boolean') return `${i}${键}: z.coerce.boolean().prefault(${值}).${desc},`;

  if (typeof 值 === 'number') {
    /* 区间来自状态表；找不到就退回 [0,100]（仅当原值落在这个量级），否则只取整 */
    const r = 取区间(键) || (值 >= 0 && 值 <= 100 ? [0, 100] : null);
    const clamp = r
      ? `.transform(v => _.clamp(Math.round(v), ${r[0]}, ${r[1]}))`
      : '.transform(v => Math.round(v))';
    return `${i}${键}: z.coerce.number()${clamp}.prefault(${值}).${desc},`;
  }

  if (Array.isArray(值)) return `${i}${键}: z.array(z.string()).prefault([]).${desc},`;

  /* 对象 */
  const keys = Object.keys(值);
  if (!keys.length) return `${i}${键}: z.record(z.string(), z.any()).prefault({}).${desc},`;
  const 内 = keys.map((k) => 转(k, 值[k], 缩 + 2, 键)).join('\n');
  return `${i}${键}: z.object({\n${内}\n${i}}).prefault({}).${desc},`;
}

const 主体 = Object.keys(iv).map((k) => 转(k, iv[k], 2, '')).join('\n');

const schema = `// ════════════════════════════════════════════════════════════
// 旮旯给木 · 英雄坛说 · MVU schema.ts
// 变量结构的唯一权威定义。**与 世界书/变量/initvar.yaml 严格对应**（本文件由它派生）
//
// 遵循 references/mvu/zod-rule.yaml（Zod 4）：
//   - 顶部禁止任何 import（z 与 _ 由 forge 通过 jiti 全局注入）
//   - 统一 z.prefault() 而非 z.default()，保证增量更新与「可清空对象」都能解析
//   - 数值一律 z.coerce.number() + _.clamp + Math.round：越界夹紧，而不是整块更新被丢弃
//   - 动态表（技能.门派 / 技能.逍遥 / 关系）用强类型 record —— 键未知但值要能纠正
//
// 三层（模块化架构）：
//   引擎层 → 世界（底座门控的依据）/ 她（8 套人设的落点）/ 局面（判定与战斗的交接台）
//   底座层 → 时间（年龄主轴 + 两年倒计时）/ 场景 / 天赋 / 技能 / 资源 / 身体 / 关系 / 战斗临时
//
// 生成器: scripts/gen-schema.cjs（改 initvar 或状态表后必须重跑）
// ════════════════════════════════════════════════════════════

export const Schema = z.object({
${主体}
}).prefault({});

export type Schema = z.output<typeof Schema>;
`;

fs.writeFileSync(path.join(D, 'schema.ts'), schema);
console.log('✅ schema.ts 已生成：' + schema.length + ' 字符');
console.log('   顶层键：' + Object.keys(iv).join(' / '));
console.log('   clamp 区间来源: 状态表.yaml（取到 ' + Object.keys(范围表).length + ' 条范围）');
