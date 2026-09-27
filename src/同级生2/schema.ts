// ════════════════════════════════════════════════════════════
// 同级生2 MVU schema.ts — 全字段定义（v6.0：当前女角对齐 DB important_npc 表）
// 遵循 tavern-cards skill 的 Zod 4 规则：
//   - z 与 _ 全局可用，不导入
//   - 使用 .prefault() 而非 .default()
//   - 使用 z.coerce.number() + _.clamp 处理数值范围
//   - 嵌套 z.object 添加 .prefault({}) 保证可清空
// 与 DDL 表的关系：
//   - 单值状态（日期/时段/位置/主角属性等）→ MVU 变量
//   - 集合数据（物品/NPC列表/事件记录等）→ chatSheets 表格
//   - 表格行的字段值需被 EJS 控制器读取做条件分支 → 同时存一份到 MVU 变量
//
// 当前女角字段对齐 DB important_npc 表 83 列（去除纯静态描述字段）：
//   - 关系核心 6 + 互斥锁定 5 + H经验进度 4 = 15
//   - 6 维属性 6 + 13 项技能 13 = 19
//   - NSFW 身体测量 胸部12 + 腰2 + 手2 + 臀3 + 下体8 = 27
//   - 敏感度综合 3 + NSFW 实时状态 5 + 元数据 1 = 9
//   共 70 个字段，对齐 DB
// ════════════════════════════════════════════════════════════

export const Schema = z.object({
  // ─── 时间（8 个） ───
  时间: z.object({
    当前日期: z.coerce.string().prefault('12-22'),
    星期: z.enum(['周一','周二','周三','周四','周五','周六','周日']).prefault('周五'),
    时段: z.enum(['早','上午','下午','晚','深夜']).prefault('早'),
    当前时间: z.coerce.string().prefault('08:00'),
    天数: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 17)).prefault(1),
    季节: z.enum(['冬']).prefault('冬'),
    章节: z.enum(['寒假前奏','寒假核心','寒假尾声','结局']).prefault('寒假前奏'),
    天气: z.enum(['晴','阴','雨','雪','风','雾']).prefault('晴')
  }).prefault({}),

  // ─── 场景（3 个） ───
  场景: z.object({
    当前地点: z.coerce.string().prefault('未选择'), // 身份初始化后由 AI 重写为对应住所
    当前女角名: z.coerce.string().prefault('无'),
    场景模式: z.enum(['约会','上学','打工','事件','休息']).prefault('休息')
  }).prefault({}),

  // ─── 主角（25 个：身份1 + 姓名/年龄/住所3 + 6维属性 + 3生存属性 + 3副状态 + 经济3 + 法律2 + 今日消费4 + 储蓄目标1） ───
  主角: z.object({
    玩家身份: z.enum(['未选择','原作主角','川尻信良','长冈芳树','西御寺有友','天道新干线','自定义']).prefault('未选择'),
    玩家姓名: z.coerce.string().prefault(''),
    年龄: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 30)).prefault(0), // 0=未选择,身份初始化后改为实际值
    住所: z.coerce.string().prefault('未选择'), // 未选择=等待身份初始化
    // 6 维属性（0-100，身份感知未选择状态默认 0，玩家选择 P1~P6 后由 AI 重写）
    魅力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    学业: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    社交: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    敏感: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    声誉: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    // 3 生存属性（0-100）
    饥饿: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(30),
    口渴: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(20),
    清洁: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(80),
    // 3 副状态（0-100）
    疲劳: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    心情: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(70),
    睡眠质量: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(70),
    // 经济（身份感知未选择状态默认 0，玩家选择 P1~P6 后由 AI 重写为对应金额）
    现金: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    储蓄: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    // 法律/道德
    违法计数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 3)).prefault(0),
    法律警告: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 2)).prefault(0),
    // 今日消费统计（每日凌晨重置）
    今日餐费: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    今日礼费: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    今日交通费: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    今日总消费: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    储蓄目标: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(50000)
  }).prefault({}),

  // ─── 当前女角（70 个·v6.0 对齐 DB important_npc 表 83 列动态字段） ───
  // 与 DDL.important_npc 表的关系：DB 存全集（含静态描述），MVU 仅存动态/EJS 读取字段
  // 静态字段（姓名/性别/年龄/介绍/外貌/身份/基础属性/特有属性/人际关系/交互选项/过往经历）留 DB
  当前女角: z.object({
    // ═══ 关系核心（6 个） ═══
    姓名: z.coerce.string().prefault('无'),
    好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    心动值: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    嫉妒值: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    信任度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
    关系阶段: z.enum([
      '决裂','仇视','厌恶','冷漠','疏离',  // 负向 5 档
      '初识','熟悉','暧昧','心动','亲密',   // 正向 5 档
      '攻略完成','失恋'                    // 2 特殊状态
    ]).prefault('初识'),

    // ═══ 互斥与锁定（5 个·对应 DB stage_locked/is_pursued/route_locked/mutex_group/mutex_partner_name） ═══
    阶段锁定: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    是否在攻略中: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    攻略路线锁定: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    互斥组名: z.coerce.string().prefault(''),
    互斥伙伴姓名: z.coerce.string().prefault('无'),

    // ═══ H 经验进度（4 个·对应 DB h_exp/first_kiss_done/first_h_done/advanced_h_done） ═══
    H经验次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    初吻: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    初H: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    进阶H: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),

    // ═══ 6 维属性（新增·对应 DB charm/academic/physical/social/perception/reputation） ═══
    魅力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    学业: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    社交: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    敏感: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    声誉: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),

    // ═══ 13 项技能（新增·对应 DB strength/agility/intelligence/will_skill/stealth/speech/medical/cooking/art/driving/fighting/observation/romance_skill） ═══
    力量: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    敏捷: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    智力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    意志技能: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    潜行: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    口才: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    医学: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    烹饪: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    艺术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    驾驶: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    格斗: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    观察: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    恋爱技能: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),

    // ═══ NSFW 身体测量 - 胸部（12 个·对应 DB 列 33-44） ═══
    罩杯: z.enum(['无','A','B','C','D','E','F','G','H']).prefault('无'),
    胸围: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
    腰围: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
    臀围: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
    身高: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
    体重: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
    乳头大小: z.coerce.string().prefault(''),
    乳头颜色: z.coerce.string().prefault(''),
    乳晕大小: z.coerce.string().prefault(''),
    胸型: z.coerce.string().prefault(''),
    胸部敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
    泌乳: z.coerce.string().prefault(''),

    // ═══ NSFW 身体测量 - 腰部（2 个·对应 DB 列 41-42） ═══
    腰型: z.coerce.string().prefault(''),
    腰部敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),

    // ═══ NSFW 身体测量 - 手部（2 个·对应 DB 列 43-44） ═══
    手部描述: z.coerce.string().prefault(''),
    美甲风格: z.coerce.string().prefault(''),

    // ═══ NSFW 身体测量 - 臀部（3 个·对应 DB 列 45-47） ═══
    臀型: z.coerce.string().prefault(''),
    臀部敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
    后庭描述: z.enum(['紧致','松弛','未开发','半开发','已开发','发达','N/A']).prefault('N/A'),

    // ═══ NSFW 身体测量 - 下体（8 个·对应 DB 列 48-55） ═══
    阴毛: z.coerce.string().prefault(''),
    阴唇大小: z.coerce.string().prefault(''),
    阴唇颜色: z.coerce.string().prefault(''),
    阴道紧度: z.coerce.string().prefault(''),
    特殊体质: z.coerce.string().prefault(''),
    润滑程度: z.coerce.string().prefault(''),
    处女膜状态: z.coerce.string().prefault(''),
    生育能力: z.coerce.string().prefault(''),

    // ═══ 敏感度综合（3 个·对应 DB 列 56-58） ═══
    全身敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
    敏感带: z.coerce.string().prefault(''),
    兴奋触发点: z.coerce.string().prefault(''),

    // ═══ NSFW 实时状态（5 个·对应 DB 列 59-63） ═══
    当前衣着: z.coerce.string().prefault('N/A'),
    暴露程度: z.enum(['保守','日常','微露','暴露','半裸','全裸','N/A']).prefault('N/A'),
    湿润度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    兴奋度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    精液残留: z.coerce.string().prefault('N/A'),

    // ═══ 元数据（1 个·对应 DB 列 64） ═══
    最后更新: z.coerce.string().prefault('12-22 08:00')
  }).prefault({}),

  // ─── 技能（13 个） ───
  技能: z.object({
    力量: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(30),
    敏捷: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40),
    智力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50),
    意志: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40),
    潜行: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(20),
    口才: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40),
    医学: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(10),
    烹饪: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(20),
    艺术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(20),
    驾驶: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
    格斗: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(25),
    恋爱: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(25),
    观察: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40)
  }).prefault({}),

  // ─── 临时（10 个） ───
  临时: z.object({
    上次事件ID: z.coerce.string().prefault(''),
    上次选择结果: z.coerce.string().prefault(''),
    最近判定: z.coerce.string().prefault(''), // JSON：calcFinalResult 结果（战斗面板读取）
    判定历史: z.coerce.string().prefault('[]'), // JSON 数组：最近 5 次判定记录（战斗面板历史列表）
    本时段楼层数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 96)).prefault(0),
    当前难度: z.enum(['轻松','普通','挑战','地狱']).prefault('普通'),
    预期下时段序号: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 5)).prefault(1),
    连续无收入天数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    超自然妄想计数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 3)).prefault(0),
    死结局标识: z.coerce.string().prefault('')
  }).prefault({}),

  // ─── 经济（3 个） ───
  经济: z.object({
    当日收入: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    当日支出: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    累计储蓄: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0)
  }).prefault({}),

  // ─── 性格（6 个·第2层个人反应属性，不可训练，默认 50 平衡） ───
  性格: z.object({
    温柔: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50),
    果断: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50),
    幽默: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50),
    谨慎: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50),
    外向: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50),
    理性: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50)
  }).prefault({}),

  // ─── 隐藏（29 个·隐藏剧情 flag / 计数器 / 互斥触发状态） ───
  隐藏: z.object({
    // 日记收集系统（5+1 个）
    日记1: z.boolean().prefault(false),
    日记2: z.boolean().prefault(false),
    日记3: z.boolean().prefault(false),
    日记4: z.boolean().prefault(false),
    日记5: z.boolean().prefault(false),
    日记全收集: z.boolean().prefault(false),
    // 樱子线（3 个）
    樱子死讯: z.boolean().prefault(false),
    樱子线解锁: z.boolean().prefault(false),
    医院访问次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    // 美纪双身份（6 个）
    芳树偷拍美纪: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    美纪双身份揭示: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    美纪秘密保守: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    美纪秘密揭穿: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    美纪威胁事件: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    美纪完整揭示: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    // 变数屋（2 个）
    变数屋访问次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
    变数屋全解锁: z.boolean().prefault(false),
    // 西寺阴谋（3 个）
    阴谋偷听: z.boolean().prefault(false),
    西寺解决进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 2)).prefault(0),
    西寺债务陷阱: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    // 互斥关系触发 flag（9 个）
    齐藤互斥触发: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    田中铃木互斥触发: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    仁科正树互斥触发: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    永岛久美子分支: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    永岛佐知子分支: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    泉美H完成: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    友美误会解决: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    洋子短发完成: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
    毕业生外传完成: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0)
  }).prefault({}),

  // ─── 女角（动态键·按 女角姓名 索引的"非当前女角"镜像） ───
  // 镜像完整字段集，与当前女角命名空间对齐，便于场景女角切换时整体迁移
  女角: z.record(
    z.string(),
    z.object({
      姓名: z.coerce.string().prefault(''),
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
      心动值: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
      嫉妒值: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
      信任度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
      关系阶段: z.coerce.string().prefault('初识'),
      阶段锁定: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
      是否在攻略中: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
      攻略路线锁定: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
      互斥组名: z.coerce.string().prefault(''),
      互斥伙伴姓名: z.coerce.string().prefault('无'),
      H经验次数: z.coerce.number().transform(v => Math.max(0, Math.round(v))).prefault(0),
      初吻: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
      初H: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
      进阶H: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 1)).prefault(0),
      // ═══ 6 维属性（新增·对应 DB charm/academic/physical/social/perception/reputation） ═══
      魅力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      学业: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      社交: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      敏感: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      声誉: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      // ═══ 13 项技能（新增·对应 DB strength/agility/intelligence/will_skill/stealth/speech/medical/cooking/art/driving/fighting/observation/romance_skill） ═══
      力量: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      敏捷: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      智力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      意志技能: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      潜行: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      口才: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      医学: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      烹饪: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      艺术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      驾驶: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      格斗: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      观察: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      恋爱技能: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      罩杯: z.coerce.string().prefault('无'),
      胸围: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
      腰围: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
      臀围: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200)).prefault(0),
      身高: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
      体重: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
      乳头大小: z.coerce.string().prefault(''),
      乳头颜色: z.coerce.string().prefault(''),
      乳晕大小: z.coerce.string().prefault(''),
      胸型: z.coerce.string().prefault(''),
      胸部敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
      泌乳: z.coerce.string().prefault(''),
      腰型: z.coerce.string().prefault(''),
      腰部敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
      手部描述: z.coerce.string().prefault(''),
      美甲风格: z.coerce.string().prefault(''),
      臀型: z.coerce.string().prefault(''),
      臀部敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
      后庭描述: z.coerce.string().prefault('N/A'),
      阴毛: z.coerce.string().prefault(''),
      阴唇大小: z.coerce.string().prefault(''),
      阴唇颜色: z.coerce.string().prefault(''),
      阴道紧度: z.coerce.string().prefault(''),
      特殊体质: z.coerce.string().prefault(''),
      润滑程度: z.coerce.string().prefault(''),
      处女膜状态: z.coerce.string().prefault(''),
      生育能力: z.coerce.string().prefault(''),
      全身敏感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 300)).prefault(0),
      敏感带: z.coerce.string().prefault(''),
      兴奋触发点: z.coerce.string().prefault(''),
      当前衣着: z.coerce.string().prefault('N/A'),
      暴露程度: z.coerce.string().prefault('N/A'),
      湿润度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      兴奋度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0),
      精液残留: z.coerce.string().prefault('N/A'),
      最后更新: z.coerce.string().prefault('12-22 08:00')
    }).prefault({})
  ).prefault({})
});

export type Schema = z.output<typeof Schema>;
