// ═══ 欲妈群 Schema v3 ═══
// 高三冲刺·100天倒计时 · 共感假阳具 · 5阶段堕落 · D20确定性判定 · 察觉值暗线
// 运行时 z（Zod v4）与 _（lodash）已由 MVU 框架全局注入，禁止任何 import
// registerMvuSchema 由 pack 工具自动追加，无需手写
//
// v3 精简原则：玩家看不见 / 不能拿它做决策 / 不改变叙事走向 的字段一律不要。
// 一个事实只写一处：
//   · 阶段真源 = 郝佳期.阶段（元数据.阶段、阶段守卫.当前阶段 已删）
//   · 复合阶段（A_理性期…E_清醒反扑期）已删
//   · 群.成员 数组已并入 群.成员详情（角色/等级/在线/上次活跃时）
//   · 今日* 记账字段（假阳具/偷抚/群消息/勃起）已删
//   · `_` 前缀 = 只读，只由前端脚本写（AI 不更新，故不写更新规则）

const clamp = (v, lo, hi) => _.clamp(v, lo, hi);
const num   = z.coerce.number().transform(v => Math.max(0, v)).prefault(0).catch(0);
const pct   = z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(0).catch(0);
const str   = (d = '')    => z.string().prefault(d).catch(d);
const bool  = (d = false) => z.boolean().prefault(d).catch(d);

// ===== 元数据（时间轴；阶段已移交 郝佳期.阶段） =====
const MetaSchema = z.object({
  日数: z.coerce.number().transform(v => Math.max(1, v)).prefault(1).catch(1),
  小时: z.coerce.number().transform(v => clamp(v, 0, 23)).prefault(14).catch(14),
  时段: z.enum(['早晨', '上午', '中午', '下午', '傍晚', '夜晚', '半夜']).prefault('下午').catch('下午'),
  回合: z.coerce.number().transform(v => Math.max(0, v)).prefault(0).catch(0),
  难度: z.enum(['普通', '困难', '地狱']).prefault('普通').catch('普通'),
  // 高考日=100（2月初开学 → 第100天高考）；剩余 = 高考日 - 日数
  高考日: z.coerce.number().transform(v => Math.max(1, v)).prefault(100).catch(100),
}).prefault({});

// ===== 玩家·学业（核心循环：想提分 ⇄ 欲望干扰） =====
const PlayerStudySchema = z.object({
  // 成绩(0~100)：学习类行为 +2~+5；被性事占用/熬夜/沦陷 -3~-8；与高考终局挂钩
  成绩: pct.prefault(50),
}).prefault({});

// ===== 玩家·身体 =====
const PlayerBodySchema = z.object({
  体力: pct.prefault(80),
  性欲: pct.prefault(75),
  不应期: z.coerce.number().prefault(30).catch(30),
}).prefault({});

// ===== 玩家·心理（原 怀疑/困惑/恐惧 三合一 → 怀疑） =====
const PlayerMindSchema = z.object({
  理智: pct.prefault(90),
  欲望: pct.prefault(0),
  兴奋: pct.prefault(0),
  怀疑: pct.prefault(5),
}).prefault({});

// ===== 玩家·技能（5 个，与 D20 判定一一对应） =====
const PlayerSkillsSchema = z.object({
  观察: pct.prefault(10), // 察觉异常 / 找线索（原 洞察＋调查）
  行动: pct.prefault(8),  // 隐藏反应 / 当场做什么（原 伪装）
  意志: pct.prefault(15), // 抵抗诱惑 / 拦住她（原 意志＋冥想）
}).prefault({});

// ===== 玩家·察觉值（可增可减，跨日保留） =====
const PlayerAwarenessSchema = z.object({
  假阳具真相: pct.prefault(0),
  群存在: pct.prefault(0),
  母亲欲望: pct.prefault(0),
  幻触: pct.prefault(5),
}).prefault({});

// ===== 玩家·今日 =====
const PlayerTodaySchema = z.object({
  射精次数: num,
  幻触次数: num,
}).prefault({});


// ===== 玩家 完整结构 =====
const PlayerSchema = z.object({
  姓名: str(''),
  年龄: z.coerce.number().transform(v => clamp(v, 18, 19)).prefault(18).catch(18),
  学校: str('上海市上海中学'),
  学业: PlayerStudySchema,
  身体: PlayerBodySchema,
  心理: PlayerMindSchema,
  技能: PlayerSkillsSchema,
  察觉值: PlayerAwarenessSchema,
  今日: PlayerTodaySchema,
  // 警觉度（0-100）：当场戒备。可增可减、跨日保留、永不每日清零；≥81 触发暴露
  警觉度: z.number().min(0).max(100).prefault(0).catch(0),
  // 证据清单（调查线收集，≥3 件触发法律结局条件）
  证据清单: str(''), // 字符串，`、`分隔，上限 5 条（调查线；≥3 件触发法律结局）
  // D20 判定历史（前端状态栏展示，保留最近 10 条）
  // ★ 前端（状态栏·行动面板）写入的确定性判定结果，AI 只读不写 → `_` 前缀
  _本轮判定: z.object({
    行为: str(''),
    投掷: z.array(z.number()).prefault([]).catch([]),
    综合: str(''),
    警觉: num,
    说明: str(''),
  }).prefault({}).catch({}),
}).prefault({});

// ===== 郝佳期 =====
const HjqMindSchema = z.object({
  兴奋: pct.prefault(0),
  润滑: pct.prefault(0),
  理智: pct.prefault(100),
  痴迷: pct.prefault(0),
  罪恶感: pct.prefault(0),
  勇气: pct.prefault(50),
  暴露恐惧: pct.prefault(0),
  // 看直播/看群聊时的实时想法（每轮 replace，不超过40字）
  此刻想法: str(''),
}).prefault({});


const HjqRelationshipSchema = z.object({
  亲密度: pct.prefault(50),
  信任度: pct.prefault(60),
  // 边界：越低越不设防（100 = 完全不越界）
  边界: pct.prefault(100),
  // ★ 叛逆恐惧（0~100）：她怕儿子翻脸/逃课/锁门 → 不敢逼学习，只敢"帮他减压"。
  // 儿子发脾气/冷暴力/锁门 → 涨；她得手越多、儿子越黏 → 降（她开始有底气）
  叛逆恐惧: pct.prefault(80),
}).prefault({});

const HjqStatsSchema = z.object({
  偷抚次数: num,
  诱导射精: num,
  假阳具使用: num,
  暴露次数: num,
}).prefault({});

const HjqContestSchema = z.object({
  今日排名: z.any().nullable().prefault(null),
  今日得分: num,
}).prefault({});

const HjqSchema = z.object({
  姓名: str('郝佳期'),
  年龄: z.coerce.number().prefault(32).catch(32),
  群等级: z.coerce.number().transform(v => clamp(v, 1, 5)).prefault(3).catch(3),
  积分: num,
  阶段: z.coerce.number().transform(v => clamp(v, 1, 5)).prefault(1).catch(1),
  阶段进度: pct.prefault(0),
  // 本阶段从第几天开始（用于节奏判定：每阶段至少5-7天）
  阶段起始日: z.coerce.number().transform(v => Math.max(1, v)).prefault(1).catch(1),
  心理: HjqMindSchema,
  关系: HjqRelationshipSchema,
  统计: HjqStatsSchema,
  竞赛: HjqContestSchema,
  后门类型: z.enum(['心理弱点', '生理弱点', '情感缺口', '身份反差']).prefault('情感缺口').catch('情感缺口'),
  后门描述: str(''),
  后门策略: str(''),
  后门目标: str('主角'),
  后门已发现: bool(false),
  后门已利用: bool(false),
  后门进度: pct.prefault(0),
}).prefault({});

// ===== 共感假阳具（静态信息已移入条目，变量只留会变的部分） =====
const DildoSchema = z.object({
  当前持有者: str('hao_jiaqi'),
  持有起始日: z.coerce.number().prefault(1).catch(1),
  持有到期日: z.coerce.number().prefault(7).catch(7),
  绑定目标: str('主角'),
  共感强度: z.coerce.number().transform(v => clamp(v, 0, 200)).prefault(100).catch(100),
  今日使用: num,
  上次使用时: z.coerce.number().prefault(-12).catch(-12),
  是否激活: bool(true),
  借用者: str(''),
  借用期限: num,
}).prefault({});

// ===== 群成员详情（已并入原 群.成员 的 角色/等级/在线/上次活跃时；共 11 位，郝佳期走顶层） =====
const GroupMemberDetailSchema = z.object({
  UID: str(''),
  姓名: str(''),
  儿子名: str(''),
  角色: z.enum(['群主', '核心', '资深', '进阶', '新人']).prefault('新人').catch('新人'),
  等级: z.coerce.number().transform(v => clamp(v, 1, 5)).prefault(1).catch(1),
  在线: bool(false),
  阶段: z.coerce.number().transform(v => clamp(v, 1, 5)).prefault(1).catch(1),
  阶段起始日: z.coerce.number().transform(v => Math.max(1, v)).prefault(1).catch(1),
  兴奋: pct.prefault(0),
  润滑: pct.prefault(0),
  罪恶感: pct.prefault(50),
  痴迷: pct.prefault(40),
  勇气: pct.prefault(30),
  暴露恐惧: pct.prefault(40),
  关系: z.object({
    亲密度: pct.prefault(70),
    信任度: pct.prefault(80),
    边界: pct.prefault(50),
  }).prefault({}).catch({}),
  此刻想法: str(''),
  统计: z.object({
    假阳具使用: num,
    偷抚次数: num,
    诱导射精: num,
    暴露次数: num,
  }).prefault({}).catch({}),
  // ★ 暴露度（0~100）：她的儿子对「妈妈在玩他」这件事知情到什么程度。
  // 0 = 完全不知情（隐蔽原则成立）；100 = 完全暴露。
  // 群周派对/群P 的硬门槛之一（另一条是本成员 阶段 === 5），两条同时满足才发邀请。
  // 郝佳期本人不设此字段，统一取 玩家.察觉值.母亲欲望。
  暴露度: pct,
  本轮活跃: bool(false),
  儿子在场: bool(false),
  // ★ 只留真正被机制读的一个；原来 33 个任意键里 32 个没人读（2026-09-21 审计）
  专属: z.object({ 竞技纪录: num }).partial().prefault({}).catch({}),
  后门类型: z.enum(['心理弱点', '生理弱点', '情感缺口', '身份反差']).prefault('心理弱点').catch('心理弱点'),
  后门描述: str(''),
  后门策略: str(''),
  后门目标: str(''),
  后门已发现: bool(false),
  后门已利用: bool(false),
  后门进度: pct.prefault(0),
}).prefault({});

// ===== 群 =====
const GroupSchema = z.object({
  成员数: z.coerce.number().prefault(12).catch(12),
  在线数: num,
  活跃度: pct.prefault(78),
  今日主题: str(''),
  今日主题索引: num,
  30天已用主题: str(''), // 字符串，`、`分隔，上限 30 条（由状态栏面板记账）
  竞赛进行中: bool(true),
  秘密任务: z.object({
    成员: str(''),
    内容: str(''),
    期限日: num,
    进行中: bool(false),
  }).prefault({}).catch({}),
  暴露风险: pct.prefault(0),
  联盟: z.record(z.string(), z.enum(['盟友', '对手', '中立'])).prefault({}).catch({}),
  周冠军UID: str('hao_jiaqi'),
  周竞赛历史: str(''), // 字符串，`；`分隔，上限 8 期（由状态栏面板记账）
  成员详情: z.object({
    su_mei: GroupMemberDetailSchema.prefault({ UID: 'su_mei', 姓名: '苏媚', 儿子名: '（无儿子，神秘观察者）', 角色: '群主', 等级: 5 }),
    lin_wanqing: GroupMemberDetailSchema.prefault({ UID: 'lin_wanqing', 姓名: '林婉清', 儿子名: '林子墨', 角色: '核心', 等级: 4 }),
    su_qing: GroupMemberDetailSchema.prefault({ UID: 'su_qing', 姓名: '苏晴', 儿子名: '苏晨', 角色: '核心', 等级: 4 }),
    han_xue: GroupMemberDetailSchema.prefault({ UID: 'han_xue', 姓名: '韩雪', 儿子名: '韩子轩', 角色: '资深', 等级: 3 }),
    bai_lu: GroupMemberDetailSchema.prefault({ UID: 'bai_lu', 姓名: '白露', 儿子名: '白墨', 角色: '资深', 等级: 3 }),
    tao_tao: GroupMemberDetailSchema.prefault({ UID: 'tao_tao', 姓名: '桃桃', 儿子名: '陶宇', 角色: '进阶', 等级: 2 }),
    lian_nai: GroupMemberDetailSchema.prefault({ UID: 'lian_nai', 姓名: '怜奈', 儿子名: '温言', 角色: '进阶', 等级: 2 }),
    you_zi: GroupMemberDetailSchema.prefault({ UID: 'you_zi', 姓名: '柚子', 儿子名: '唐野', 角色: '进阶', 等级: 2 }),
    xiao_ye: GroupMemberDetailSchema.prefault({ UID: 'xiao_ye', 姓名: '小夜', 儿子名: '夜凉', 角色: '新人', 等级: 1 }),
    qin_yu: GroupMemberDetailSchema.prefault({ UID: 'qin_yu', 姓名: '秦雨', 儿子名: '秦朗', 角色: '新人', 等级: 1 }),
    ling: GroupMemberDetailSchema.prefault({ UID: 'ling', 姓名: '铃', 儿子名: '林悠', 角色: '新人', 等级: 1 }),
  }).prefault({}).catch({}),
}).prefault({});

// ===== 阶段守卫（只守护，不重复存阶段数） =====
const PhaseGuardSchema = z.object({
  已锁定: bool(false),
  结局已触发: bool(false),
  结局类型: z.enum(['好结局·挣脱', '好结局·理性', '坏结局·法律', '坏结局·暴露', '隐藏结局·共生']).nullable().prefault(null),
  后日谈已读: bool(false),
}).prefault({});

// ===== 设置 =====
const OptionSchema = z.object({
  文本: str(''),                                   // 她这一关摆出来的这一条，写清楚她拆解后的动作
  等级: z.enum(['微', '中', '强', '极']).prefault('微').catch('微'),
  代价: str(''),                                   // 他拦下来的代价，写清量级
  技能: z.enum(['观察', '行动', '意志']).prefault('行动').catch('行动'),  // ★ 这一条要用哪个技能拦（每条可以不同）
  主对: z.enum(['识破', '拦住', '扛住', '全场']).prefault('拦住').catch('拦住'),  // ★ 这条主要考验哪一轮 → 决定三轮权重（见面板 权重表）
}).prefault({});

// ★ 面板说了算：四格固定，不新增键（Zod 卡拿不到 extensible，add 新键会被 MVU 判 SCHEMA 违规）
//   她摆不满就留空（文本为空的那一格面板不渲染）；他拒绝哪一格，就把那一格的 文本 清空。
const 局面Schema = z.object({
  当前选项: z.object({
    一: OptionSchema, 二: OptionSchema, 三: OptionSchema, 四: OptionSchema,
  }).prefault({}),
  她已选: str(''),                                 // 她从中挑走的那一条（一/二/三/四）
  自定义: z.object({                               // ★ 玩家自己写要做的事：先交给她判，判完面板再掷骰
    文本: str(''),
    技能: z.enum(['观察', '行动', '意志']).prefault('行动').catch('行动'),
    等级: z.enum(['微', '中', '强', '极']).prefault('中').catch('中'),
    主对: z.enum(['识破', '拦住', '扛住', '全场']).prefault('拦住').catch('拦住'),
    待掷: bool(false),
  }).prefault({}),
}).prefault({});

const SettingsSchema = z.object({
  主题: z.enum(['夜间', '浅色']).prefault('夜间').catch('夜间'),
}).prefault({});

// ===== stat_data 完整结构 =====
export const Schema = z.object({
  元数据: MetaSchema,
  玩家: PlayerSchema,
  郝佳期: HjqSchema,
  假阳具: DildoSchema,
  群: GroupSchema,
  阶段守卫: PhaseGuardSchema,
  局面: 局面Schema,
  设置: SettingsSchema,
}).prefault({});

export type Schema = z.output<typeof Schema>;

// ===== 注册 MVU Schema =====
// registerMvuSchema 由 pack 工具从 state.zod.importUrl 自动追加，无需手写 import。
// mvu_zod.js 内部会自动包装为 {stat_data: schema} 并注册到 message 作用域。
