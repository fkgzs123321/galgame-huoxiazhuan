// ════════════════════════════════════════════════════════════
// KK园区 MVU schema.ts — 受害者视角·飞机杯系统·精液成瘾能力
// 创意重构 v2.0：删除四身份系统，仅保留受害者路线
//   - 玩家=网恋被骗的受害者，唯一生理男性
//   - 持有飞机杯（按飞机杯通用系统世界书设定）
//   - 异性吃/被内射user精液会成瘾爱上user（园区仅知内射，不知口服）
//   - 园区想利用此能力对大陆女性诈骗钱财
// ════════════════════════════════════════════════════════════
// Zod 4 规则：
//   - z 与 _ 全局可用，不导入
//   - 使用 .prefault() 而非 .default()
//   - z.coerce.number() + _.clamp 处理数值范围
//   - 嵌套 z.object 添加 .prefault({}) 保证可清空
// ════════════════════════════════════════════════════════════

// ─── 女性角色子对象（70 字段，与飞机杯通用系统对齐 + 精液成瘾扩展） ───
const FemaleCharSchema = z.object({
  // ── 基础元数据（4） ──
  身份: z.coerce.string().prefault(''),
  已激活: z.coerce.boolean().prefault(false),
  被绑定状态: z.coerce.boolean().prefault(false),
  终局: z.coerce.boolean().prefault(false),

  // ── 飞机杯三系统核心数值（3） ──
  察觉度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
  倾心度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
  具现度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),

  // ── 精液成瘾系统（6·本次创意核心） ──
  成瘾度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
  爱意值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
  成瘾触发方式: z.enum(['未触发', '口服', '内射', '双重']).prefault('未触发'),
  已口服次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
  已内射次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
  成瘾觉醒日期: z.coerce.string().prefault(''),

  // ── 服装状态（6） ──
  服装: z.object({
    整体着装状态: z.enum(['全裸', '半裸', '着装', '未知']).prefault('未知'),
    上身: z.coerce.string().prefault('未知'),
    裤子: z.coerce.string().prefault('未知'),
    胸罩: z.coerce.string().prefault('未知'),
    内裤: z.coerce.string().prefault('未知'),
    配饰: z.coerce.string().prefault('未知')
  }).prefault({}),

  // ── 身体部位（7个部位对象，约 20 子字段） ──
  身体部位: z.object({
    胸部: z.object({
      状态: z.coerce.string().prefault('正常'),
      乳头: z.coerce.string().prefault('正常'),
      敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0)
    }).prefault({}),
    阴道: z.object({
      状态: z.coerce.string().prefault('正常'),
      湿润度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0)
    }).prefault({}),
    肛门: z.object({
      状态: z.coerce.string().prefault('正常')
    }).prefault({}),
    嘴部: z.object({
      状态: z.coerce.string().prefault('正常')
    }).prefault({}),
    肌肤: z.object({
      状态: z.coerce.string().prefault('正常'),
      体温: z.coerce.number().transform(v => _.clamp(v, 30, 45)).prefault(36.5)
    }).prefault({}),
    大腿: z.object({
      状态: z.coerce.string().prefault('正常')
    }).prefault({}),
    臀部: z.object({
      状态: z.coerce.string().prefault('正常')
    }).prefault({})
  }).prefault({}),

  // ── 生理状态（含孕期监测系统，约 20 字段） ──
  生理状态: z.object({
    是否已怀孕: z.coerce.boolean().prefault(false),
    周期日: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 28)).prefault(0),
    生理周期阶段: z.coerce.string().prefault(''),
    怀孕周数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    怀孕天数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    受孕日期: z.coerce.string().prefault(''),
    末次月经日期: z.coerce.string().prefault(''),
    受孕风险: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(0),
    累计受孕率锁定: z.coerce.boolean().prefault(false),
    阶段基础率: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(0),
    体内精液量: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    子宫状态: z.coerce.string().prefault('正常'),
    上次结算日期: z.coerce.string().prefault(''),
    最近暗骰结果: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    当前防护措施: z.coerce.string().prefault('无'),
    最近性行为时间戳: z.coerce.string().prefault(''),
    最近结算结果: z.coerce.string().prefault(''),
    生理状态描述: z.coerce.string().prefault(''),
    身体状况描述: z.coerce.string().prefault(''),
    近期性行为记录: z.array(z.object({
      时间戳: z.coerce.string().prefault(''),
      人物: z.coerce.string().prefault(''),
      事件: z.coerce.string().prefault('')
    }).prefault({})).prefault([]),
    结算历史: z.array(z.object({
      日期: z.coerce.string().prefault(''),
      触发条件: z.coerce.string().prefault(''),
      累计率: z.coerce.number().prefault(0),
      暗骰结果: z.coerce.number().prefault(0),
      结果: z.coerce.string().prefault('')
    }).prefault({})).prefault([])
  }).prefault({}),

  // ── 心理状态（8） ──
  心理状态: z.object({
    主导情绪: z.coerce.string().prefault(''),
    情绪强度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    羞耻感: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    恐惧感: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    欲望度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    期待感: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    心理防线: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100),
    精神状态: z.coerce.string().prefault('清醒')
  }).prefault({}),

  // ── 实时状态（5） ──
  实时状态: z.object({
    当前姿势: z.coerce.string().prefault(''),
    当前动作: z.coerce.string().prefault(''),
    当前场景: z.coerce.string().prefault(''),
    互动进度: z.coerce.string().prefault(''),
    当前刺激部位: z.coerce.string().prefault('无')
  }).prefault({}),

  // ── 互动过程（8） ──
  互动过程: z.object({
    本轮高潮次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    本轮互动时长: z.coerce.string().prefault('0分钟'),
    本轮刺激强度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    本轮快感累积: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    本轮心理冲击: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    高潮强度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    射精量: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    敏感点反应: z.coerce.string().prefault('')
  }).prefault({}),

  // ── 长期跟踪（6） ──
  总互动次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
  高潮次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
  总内射次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
  总潮吹次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
  关系阶段: z.coerce.string().prefault('未接触'),
  首次互动日期: z.coerce.string().prefault(''),

  // ── 总结（5） ──
  总结: z.object({
    总体发展趋势: z.coerce.string().prefault(''),
    近期变化方向: z.coerce.string().prefault(''),
    今日互动统计: z.coerce.string().prefault(''),
    最近变化: z.coerce.string().prefault(''),
    重要事件标记: z.array(z.coerce.string()).prefault([])
  }).prefault({}),

  // ── 状态文本（3） ──
  心情: z.coerce.string().prefault('—'),
  心声: z.coerce.string().prefault(''),
  当前状态: z.coerce.string().prefault('')
}).prefault({});

// ─── 男性角色子对象（飞机杯通用系统） ───
const MaleCharSchema = z.object({
  是否在场: z.coerce.boolean().prefault(false),
  当前位置: z.coerce.string().prefault(''),
  服装: z.object({
    整体着装状态: z.coerce.string().prefault('未知'),
    上身: z.coerce.string().prefault('未知'),
    裤子: z.coerce.string().prefault('未知')
  }).prefault({}),
  心情: z.coerce.string().prefault('—'),
  当前状态: z.coerce.string().prefault('')
}).prefault({});

export const Schema = z.object({
  // ─── 时间系统（3·与飞机杯系统对齐） ───
  日期: z.coerce.string().prefault('2024.11.15'),
  星期: z.coerce.string().prefault('周五'),
  时间: z.coerce.string().prefault('19:00'),

  // ─── 玩家状态（合并 KK园区 + 飞机杯 + 精液成瘾能力，30 字段） ───
  玩家: z.object({
    // 飞机杯三系统（3）
    当前位置: z.coerce.string().prefault('KK园区大门'),
    飞机杯当前绑定: z.coerce.string().prefault('无'),
    飞机杯定位: z.coerce.string().prefault('玩家身上'),

    // 生存属性（5·KK园区）
    体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(80),
    精神: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(80),
    饥饿: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(30),
    脱水: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(20),
    疲劳: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(20),

    // NSFW属性（3·飞机杯系统）
    性欲: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(30),
    勃起度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    累计射精次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),

    // 经济物品（2）
    金钱: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    持有物品: z.array(z.coerce.string()).prefault([]),

    // user专属（4·KK园区）
    容貌值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50),
    性别稀缺度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100),
    被觊觎度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    生育价值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),

    // 受害者状态（11·KK园区，仅受害者路线）
    伪装度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    逃跑准备: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    情报网: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    信任值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    伤势: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    恐惧值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    希望值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(80),
    被迫度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    权力接触: z.coerce.boolean().prefault(false),
    外部援助: z.coerce.boolean().prefault(false),
    警方线索: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 5)).prefault(0),

    // 精液成瘾能力（7·本次创意核心）
    精液成瘾能力: z.object({
      已觉醒: z.coerce.boolean().prefault(true),
      觉醒进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100),
      已触发口服次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      已触发内射次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      园区知晓程度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(60),
      园区知晓途径: z.coerce.string().prefault('网恋聊天记录+受害者体检'),
      成瘾女性总数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0)
    }).prefault({})
  }).prefault({}),

  // ─── 女性角色（飞机杯通用系统+精液成瘾扩展，70 字段/角色） ───
  女性角色: z.record(z.string(), FemaleCharSchema).prefault({}),

  // ─── 男性角色（飞机杯通用系统，6 字段/角色） ───
  男性角色: z.record(z.string(), MaleCharSchema).prefault({}),

  // ─── 园区状态（合并 阶段系统+暗网+派系+道德+任务+情报+成就+证据+LCG，30 字段） ───
  园区: z.object({
    // 阶段系统（3）
    当前阶段: z.coerce.string().prefault('入园恐惧'),
    剧情进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 100)).prefault(1),
    结局分支: z.coerce.string().prefault(''),

    // 暗网（5）
    拍卖状态: z.enum(['未上架', '拍卖中', '已成交', '已流拍']).prefault('未上架'),
    拍卖价格: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    直播次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    暗网知名度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    买家关注: z.array(z.coerce.string()).prefault([]),

    // 派系（5）
    园区董事会: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    管理层: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    打手团: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    受害者群: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    暗网网络: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),

    // 道德（1）
    善恶值: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),

    // 任务（3）
    当前主线任务: z.coerce.string().prefault(''),
    已接取支线: z.array(z.coerce.string()).prefault([]),
    已完成任务: z.array(z.coerce.string()).prefault([]),

    // 情报（2）
    已获取情报: z.array(z.coerce.string()).prefault([]),
    待验证情报: z.array(z.coerce.string()).prefault([]),

    // 成就（4）
    已达成: z.array(z.coerce.string()).prefault([]),
    生存天数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    结识NPC数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    救助人数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),

    // 同伙（2）
    已招募: z.array(z.coerce.string()).prefault([]),
    待招募候选: z.array(z.coerce.string()).prefault([]),

    // 证据（2）
    已收集: z.array(z.coerce.string()).prefault([]),
    已传递: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),

    // LCG（1）
    LCG种子: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),

    // 园区对user的利用（3·本次创意核心）
    利用计划: z.coerce.string().prefault(''),
    利用进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    已诈骗金额: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0)
  }).prefault({}),

  // ─── RPG（25 字段：六维 6 + 未分配 1 + 12 技能 + 成长 6+1） ───
  RPG: z.object({
    // 六维属性（1-10）
    力量: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 10)).prefault(5),
    敏捷: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 10)).prefault(5),
    体质: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 10)).prefault(5),
    智力: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 10)).prefault(5),
    感知: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 10)).prefault(5),
    魅力: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 10)).prefault(5),
    未分配点数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(30),
    // 12 技能（0-100）
    诈骗术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    格斗术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    潜行术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    社交术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    技术术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    求生术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    伪装术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    情报收集: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    逃脱术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    交际手腕: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    暗网操作: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    拷问抗性: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    // 成长子树
    成长: z.object({
      力量使用计数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      敏捷使用计数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      体质使用计数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      智力使用计数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      感知使用计数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      魅力使用计数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      技能使用计数: z.record(z.string(), z.coerce.number()).prefault({})
    }).prefault({})
  }).prefault({}),

  // ─── 人际关系（3） ───
  人际: z.object({
    NPC关系: z.record(z.string(), z.coerce.number()).prefault({}),
    当前在场角色: z.array(z.coerce.string()).prefault([]),
    互动计数: z.record(z.string(), z.coerce.number()).prefault({})
  }).prefault({}),

  // ─── 角色库（3） ───
  角色库: z.object({
    已生成列表: z.array(z.coerce.string()).prefault([]),
    当前交互角色: z.coerce.string().prefault(''),
    角色生成计数器: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0)
  }).prefault({})
}).prefault({});

export type Schema = z.output<typeof Schema>;
