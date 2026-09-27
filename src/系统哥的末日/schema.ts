// ═══ 系统哥的末日 Schema v1 ═══
// 现代都市小说 · 反派视角 · 死心塌地系统 · 三段暴走 · 交涉 d20
// 运行时 z（Zod v4）与 _（lodash）已由 MVU 框架全局注入，禁止任何 import。
// registerMvuSchema 由 pack 工具从 state.zod.importUrl 自动追加，无需手写。
//
// 精简原则：玩家看不见 / 不能拿它做决策 / 不改变叙事走向 的字段一律不要。
// 一个事实只写一处：
//   · 阶段唯一真源 = 绑定花名册.<真名>.时期（七值）；绑定深度只是 0~100 的数值，由它推出时期
//   · 文风门控读 镜头.绑定深度（由更新规则每轮镜像当前镜头对象的值），不重复存时期
//   · 心理旋钮不存变量，人物当前状态由各自的「多阶段」条目按时期渲染
//   · 旧卡的 系统变量 / user状态 / 评论系统 / 良知值 等平行维度已删，分别并入 世界 / 玩家 / 评论

const clamp = (v, lo, hi) => _.clamp(v, lo, hi);
const num = z.coerce.number().transform((v) => Math.max(0, v)).prefault(0).catch(0);
const pct = z.coerce.number().transform((v) => clamp(v, 0, 100)).prefault(0).catch(0);
const str = (d = '') => z.string().prefault(d).catch(d);
const bool = (d = false) => z.boolean().prefault(d).catch(d);
// ★ 列表类变量一律用「字符串」而不是数组：
//   Zod 卡里 {"op":"add"} 打到数组上会被 zod 层判「不是数字」而不消费，
//   落到核心后必抛 assignNonExtensibleArray（核心拿不到 extensible）。
//   正确做法＝整串 replace，条目之间用「；」分隔，超上限时删最前一条。
//   上限写在 变量更新规则.yaml 里，不在 schema 里截断（截断会静默吞内容）。
const listStr = (d = '') => z.string().prefault(d).catch(d);

// ===== 财富等级（全局共用的刻度） =====
const 财富等级 = z
  .enum(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'])
  .prefault('A9')
  .catch('A9');

// ===== 世界 =====
const 世界Schema = z
  .object({
    时间: str('2026/09/21-22:40'),
    地点: str('家'),
    章节: z.coerce.number().transform((v) => Math.max(1, v)).prefault(1).catch(1),
    回合: z.coerce.number().transform((v) => Math.max(1, v)).prefault(1).catch(1),
  })
  .prefault({});

// ===== 镜头（当前镜头落在谁身上；文风门控与角色条目显隐都读它） =====
const 镜头Schema = z
  .object({
    对象: str('苏婉'),
    绑定深度: pct.prefault(0),
  })
  .prefault({});

// ===== 反派状态（林天） =====
const 反派状态Schema = z
  .object({
    财富等级,
    资产: num.prefault(500000000),
    // ★ 判定引擎（E3）需要对手侧能力值：他的四维用同一套权重加权，得出目标个体修正
    交涉: z
      .object({
        气势: pct.prefault(85),
        口才: pct.prefault(88),
        情报: pct.prefault(92),
        地位: pct.prefault(90),
      })
      .prefault({}),
    评价值: pct.prefault(80),
    绑定名额上限: z.coerce.number().transform((v) => clamp(v, 0, 10)).prefault(8).catch(8),
    已绑定数: z.coerce.number().transform((v) => clamp(v, 0, 10)).prefault(8).catch(8),
    系统暴走次数: z.coerce.number().transform((v) => clamp(v, 0, 3)).prefault(0).catch(0),
    时停剩余: num.prefault(3),
    预感剩余: num.prefault(3),
    掌控剩余: num.prefault(3),
    救场剩余: num.prefault(1),
    强制洗白可用: bool(true),
    财富积分: num.prefault(500),
    第四面墙剩余: num.prefault(3),
  })
  .prefault({});

// ===== 绑定花名册（键＝女性真名，十位） =====
const 绑定女性Schema = z
  .object({
    时期: z
      .enum(['当前目标', '刚被控制', '绑定瞬间', '绑定深化', '完全绑定', '濒临解绑', '已解绑'])
      .prefault('当前目标')
      .catch('当前目标'),
    绑定深度: pct.prefault(0),
    清醒频率: pct.prefault(0),
    最近一次清醒: str('无'),
    身体状态: z
      .object({
        湿润: pct.prefault(0),
        乳尖: bool(false),
      })
      .prefault({}),
    占有印记: str('无'),
  })
  .prefault({});

const 绑定花名册Schema = z
  .record(z.string(), 绑定女性Schema)
  .prefault({});

// ===== 玩家（<user>） =====
const 玩家Schema = z
  .object({
    财富等级,
    资产: num.prefault(500000000),
    公司状态: z.enum(['正常', '承压', '濒临破产', '已失去']).prefault('正常').catch('正常'),
    觉醒度: pct.prefault(10),
    反抗力: pct.prefault(20),
    交涉: z
      .object({
        气势: pct.prefault(30),
        口才: pct.prefault(30),
        情报: pct.prefault(15),
        地位: pct.prefault(40),
      })
      .prefault({}),
    证据链: listStr(''),
    与妻子关系: z.enum(['亲密', '疏远', '敌对', '断裂']).prefault('亲密').catch('亲密'),
  })
  .prefault({});

// ===== 交涉状态 =====
// ★ 判定字段按 机制层规范 §E3 的标准判定链命名：
//   D = P - R + E　S = clamp(50+D, 5, 95)　V = LCG(seed)×100　V < S 成功
//   档位由 D 与成败联合决定（五档），effects_mult 随档位给出
const 交涉状态Schema = z
  .object({
    进行中: bool(false),
    对象: str(''),
    回合: num.prefault(0),
    幕次: z.enum(['寒暄', '辞锋', '共识', '结束']).prefault('结束').catch('结束'),
    玩家共识分: num.prefault(0),
    对手共识分: num.prefault(0),
    能力值: pct.prefault(0),            // P 本招加权后的能力值
    要求值: pct.prefault(0),            // R 基准值×难度乘数＋个体修正＋阶段修正
    成功率: pct.prefault(0),            // S = clamp(50+D, 5, 95)
    掷值: pct.prefault(0),              // V = LCG(seed)×100
    上轮判定: str('无'),                // 五档：大成功／成功／勉强成功／失败／大失败
    效果倍数: z.coerce.number().transform((v) => (Number(v) > 0 ? Number(v) : 1)).prefault(1).catch(1),
    本轮判定: str(''),                  // 一次性触发串：面板写、引擎条目读、AI 结算后清空
    交涉历史: listStr(''),
  })
  .prefault({});

// ===== 评论 =====
const 评论Schema = z
  .object({
    倾向: z.enum(['叫好', '中性偏叫好', '中性偏吐槽', '吐槽', '弃书']).prefault('叫好').catch('叫好'),
    热门: str(''),
  })
  .prefault({});

// ===== 设置 =====
const 设置Schema = z
  .object({
    骰子种子: num.prefault(20260915),
    主题: z.enum(['夜间', '浅色']).prefault('夜间').catch('夜间'),
  })
  .prefault({});

// ===== stat_data 完整结构 =====
export const Schema = z
  .object({
    世界: 世界Schema,
    镜头: 镜头Schema,
    反派状态: 反派状态Schema,
    绑定花名册: 绑定花名册Schema,
    玩家: 玩家Schema,
    交涉状态: 交涉状态Schema,
    评论: 评论Schema,
    设置: 设置Schema,
  })
  .prefault({});
