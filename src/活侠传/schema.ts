/**
 * 活侠传 · MVU 变量结构
 *
 * ★★ 全卡地基：前端界面、世界书条目、引擎脚本全部照它长。
 *
 * ★★★ 属性名一律用**原作官方中文名**，不是英文键直译。
 *      出处：`sharedassets0__Stat_zh-cn`（PlayerStat 表）
 *
 *      直译会丢掉系统语义：
 *        weapon   → ❌兵器  ✅锻造  「锻造点数。[锻冶场使用]」
 *        poison   → ❌毒术  ✅炼丹  「炼丹点数。[炼丹房使用]」
 *        internal → ❌内功  ✅阴阳  「老阴/少阴/调和/少阳/老阳」
 *        mental   → ❌心法  ✅心相  「影响锻冶、炼丹、修练活动成功率」
 *        talking  → ❌口才  ✅嘴力  「说话的才能，影响嘴攻效果」
 *
 * 设计依据（v2，见 design-spec-v2.md）：
 *   1. 原作 53 项属性     —— Stat_zh-cn 表官方中文名
 *   2. 原作性格分档       —— StatLevel 表（五档档位名）
 *   3. 原作门派发展六阶段 —— PlayerInfo/FictionTitle
 *   4. 原作条件系统 17 类 —— Mortal.Core.StatCheckType 枚举
 *   5. 原作错过三层机制   —— MissionCheckData 的 _timeCheckType 等字段
 */

const 夹 = (v: unknown, lo: number, hi: number) => _.clamp(Number(v) || 0, lo, hi);

/** 0~100 百分值 */
const 百分 = (初值 = 0) =>
  z.coerce
    .number()
    .transform(v => 夹(v, 0, 100))
    .prefault(初值);

/** 上限可变的资源 */
const 资源 = (初值: number, 上限: number) =>
  z
    .object({
      当前: z.coerce.number().transform(v => 夹(v, 0, 99999)).prefault(初值),
      上限: z.coerce.number().transform(v => 夹(v, 1, 99999)).prefault(上限),
    })
    .prefault({ 当前: 初值, 上限 });

/** 等级 + 经验 */
const 等级 = (初等级 = 1, 初经验 = 0, 上限 = 10) =>
  z
    .object({
      等级: z.coerce.number().transform(v => 夹(v, 1, 上限)).prefault(初等级),
      经验: z.coerce.number().transform(v => 夹(v, 0, 99999)).prefault(初经验),
    })
    .prefault({ 等级: 初等级, 经验: 初经验 });

// ══════════════════════════════════════════════════════════════
// 原作静态表（供前端与 EJS 共用，改一处两边同步）
// ══════════════════════════════════════════════════════════════

/** 六项性格的档位名 —— `StatLevel` 表原文，低 → 高 */
export const 性格档位 = {
  道德: ['恶棍', '坏人', '中庸', '好人', '侠客'],
  性情: ['懦夫', '谨慎', '中庸', '勇敢', '莽夫'],
  处世: ['矫情', '知礼', '中庸', '豪爽', '粗鲁'],
  修养: ['疯狂', '暴躁', '中庸', '沉着', '君子'],
} as const;

/** 心相三档 */
export const 心相档位 = ['忧郁', '平静', '快乐'] as const;

/** 阴阳五档 */
export const 阴阳档位 = ['老阴', '少阴', '调和', '少阳', '老阳'] as const;

/** ★ 门派发展六阶段 —— `PlayerInfo/FictionTitle` 原文 */
export const 门派阶段 = [
  { 阶段: 1, 名: '日薄西山', 述: '唐门人丁凋零，经已式微，昔日威风不再，强敌环伺，危如累卵' },
  { 阶段: 2, 名: '云开见日', 述: '一度潦倒，多亏当代弟子活跃，颇有起死回生的迹象' },
  { 阶段: 3, 名: '喷薄欲出', 述: '慕名拜师者众多，门人不再提内外姓制度，声势已不容小觑' },
  { 阶段: 4, 名: '旭日东升', 述: '风光直逼当年全盛，蜀中最受官府瞩目的武装团体' },
  { 阶段: 5, 名: '如日方中', 述: '以一介世家几乎能与大派分庭抗礼，你不再是某某人，而是你自己' },
  { 阶段: 6, 名: '烈日当空', 述: '威望空前绝后，当朝武林第一大派。能与唐门争雄者，唯有武林盟' },
] as const;

/** 唐门 12 处地点 —— `Mortal.Core.PositionType` */
export const 唐门地点 = [
  '正心堂',
  '练功场',
  '男弟子房',
  '女弟子房',
  '炼丹房',
  '锻冶场',
  '伙房',
  '大门',
  '后山',
  '讲经堂',
  '神秘房子',
  '外堡',
] as const;

/** 称号链 —— `PlayerInfo/Title` */
export const 称号链 = [
  '唐门杂鱼',
  '唐门丑侠',
  '下作侠',
  '鬼面郎中',
  '草食侠',
  '阎王使者',
  '风度翩翩丑郎君',
  '雪山大弟子',
] as const;

/** 一旬＝上中下；原作 `MonthStageType` */
export const 旬 = ['上旬', '中旬', '下旬'] as const;

export const Schema = z
  .object({
    // ══════════════════════════════════════════════════════════
    // 世界 —— 时间、地点、门派
    // ══════════════════════════════════════════════════════════
    世界: z
      .object({
        // ── 时间（IL 确证：起始第 1 年 4 月，一月三旬）──
        年: z.coerce.number().transform(v => 夹(v, 1, 99)).prefault(1),
        月: z.coerce.number().transform(v => 夹(v, 1, 12)).prefault(4),
        旬: z.enum(旬).prefault('上旬').describe('原作 Stage，一月三旬，时间最小推进单位'),
        昼夜: z.enum(['白天', '晚上']).prefault('白天').describe('原作 DayEnvironment'),
        天气: z.enum(['晴', '阴', '雨', '雪']).prefault('晴'),

        // ── 地点与节点 ──
        当前地点: z.string().prefault('正心堂').describe('唐门 12 处之一'),
        当前节点: z.string().prefault('第一年_四月上旬').describe('时间轴位置，唯一时间真值'),
        已发生节点: z.string().prefault('').describe('、分隔'),

        // ── ★ 路线分支（原作第二年与第三年末的核心机制）──
        //
        //   原作：第二年分四条线（崆峒留学 / 不留学住客栈 / 不留学住破庙 / 青城留学），
        //   第三年末分四条（无可救药 / 不成立西武林 / 成立西武林 / 遣散唐门）。
        //   同一旬不同路线走的是**不同事件** —— 这是活侠传最要紧的分岔，
        //   也是「错过就错过」的主要来源。
        路线: z.string().prefault('')
          .describe('已定的路线；空字符串表示尚未分线（各线共用事件照常出）'),
        可选路线: z.array(z.string()).prefault([])
          .describe('当前可选的路线；定了之后清空'),
        分线时间: z.string().prefault('')
          .describe('在哪一旬分线的，如「第二年_三月上旬」；空表示还没分'),

        // ── 行动点（原作按旬动态，并减 T0002 惩罚）──
        行动次数: z.coerce.number().transform(v => 夹(v, 0, 9)).prefault(3).describe('原作 action'),
        行动上限: z.coerce.number().transform(v => 夹(v, 1, 9)).prefault(3).describe('按旬查不同 stat，见 GetMaxActionCount()'),

        // ── 门派六项 ──
        门人: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(3).describe('门人数量'),
        向心: 百分(30).describe('门派的向心力'),
        门派规模: z.coerce.number().transform(v => 夹(v, 1, 6)).prefault(1).describe('★ 一至六阶段，见 门派阶段 表'),
        门派资产: z.coerce.number().transform(v => 夹(v, 0, 999999)).prefault(0),
        名声: z.coerce.number().transform(v => 夹(v, -999, 9999)).prefault(0).describe('原作 fame'),
        贡献度: z.coerce.number().transform(v => 夹(v, 0, 99999)).prefault(0),

        // ── 确定性伪随机种子 ──
        // ★ 对应原作存档的 `FreeRandomState`（4 个 LCG 种子）。
        //   判定与战斗都读它，**禁用 Math.random** —— 那样同一局面重渲染会给出不同结果。
        随机种子: z.coerce.number().transform(v => 夹(v, 1, 2147483647)).prefault(20260927),

        // ── 门派好感度（原作 H00001~H02003）──
        门派好感: z
          .record(z.string().describe('门派名'), z.coerce.number().transform(v => 夹(v, -100, 100)).prefault(0))
          .prefault({})
          .describe('原作用 H 前缀 flag 存，如 H00001=青城派好感度'),
      })
      .prefault({}),

    // ══════════════════════════════════════════════════════════
    // 你 —— 玩家角色（原作 53 项，官方中文名）
    // ══════════════════════════════════════════════════════════
    你: z
      .object({
        姓名: z.string().prefault('赵活'),
        身份: z.string().prefault('唐门外姓弟子'),
        出身: z.string().prefault('绵阳').describe('开局身份，决定初始配点'),
        称号: z.string().prefault('唐门杂鱼').describe('称号链见 称号链 表'),
        心上人: z.string().prefault('').describe('原作 lover'),

        // ── 基础六项 ──
        银两: z.coerce.number().transform(v => 夹(v, 0, 999999)).prefault(0).describe('money'),
        体力: 资源(50, 50).describe('life：影响生命、绝招威力（小）'),
        内力: 资源(20, 20).describe('stamina：影响攻击力(中)、绝招威力(中)、战役回气速度'),
        轻功: 百分(10).describe('dexterity：影响回避机率、绝招威力（中）、战役移动速度'),
        魅力: 百分(5).describe('charisma：原作说明「你所没有的某种东西」'),
        学问: 百分(10).describe('literacy：学习所得的知识'),

        // ── 六项性格（有 StatLevel 五档档位名）──
        道德: 百分(50).describe('karma：恶棍/坏人/中庸/好人/侠客。原作最高频条件 S_Kar_LE_40'),
        性情: 百分(50).describe('disposition：懦夫/谨慎/中庸/勇敢/莽夫'),
        处世: 百分(50).describe('behaviour：矫情/知礼/中庸/豪爽/粗鲁。原作 S_Beh_GE_60'),
        修养: 百分(50).describe('training：疯狂/暴躁/中庸/沉着/君子。原作 S_Tra_GE_40'),
        心相: 百分(50).describe('mental：忧郁/平静/快乐。影响锻冶、炼丹、修练成功率'),
        阴阳: 百分(50).describe('internal：老阴/少阴/调和/少阳/老阳'),
        变心: 百分(0).describe('change-heart'),
        命运: 百分(50).describe('fate'),

        // ── 嘴力（原作有明确数值前置「嘴力>32」）──
        嘴力: 百分(20).describe('talking：说话的才能，影响嘴攻效果'),

        // ── 三项技艺（原作有对应场地）──
        锻造: z.coerce.number().transform(v => 夹(v, 0, 999)).prefault(0).describe('weapon：锻造点数。[锻冶场使用]'),
        炼丹: z.coerce.number().transform(v => 夹(v, 0, 999)).prefault(0).describe('poison：炼丹点数。[炼丹房使用]'),
        武学点: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(0).describe('martial-point：修练秘籍消耗'),

        // ── 八系招式（原作 m-* 表）──
        八系: z
          .object({
            刀剑: 百分(0).describe('m-sword：影响攻击力(大)'),
            暗器: 百分(20).describe('m-projectile：唐门本门。影响暗器威力、爆击'),
            拳掌: 百分(10).describe('m-fist：影响攻击力(小)、影响防御(大)'),
            腿法: 百分(10).describe('m-leg'),
            奇门: 百分(0).describe('m-odd：机关、阵法'),
            软兵器: 百分(0).describe('m-soft'),
            枪棍: 百分(0).describe('m-stick'),
            内功: 百分(0).describe('m-internal'),
          })
          .prefault({}),

        // ── 三教 ──
        三教: z
          .object({
            儒学: 百分(0).describe('confucianism'),
            道学: 百分(0).describe('taoism'),
            释学: 百分(0).describe('buddhism'),
          })
          .prefault({}),

        形意拳: 百分(0).describe('xingyi：原作单列一项'),

        // ── 抗性与累积 ──
        抗毒: 百分(0).describe('影响血毒的抗性、代谢率'),
        抗麻: 百分(0).describe('影响神经毒的抗性、代谢率'),
        毒药: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(0).describe('poison-value：暗器击中毒药累积值'),
        麻痹: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(0).describe('paralysis-value：暗器击中麻痹累积值'),

        // ── 战斗派生（原作 combat-* 表）──
        战斗: z
          .object({
            攻击: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(10).describe('基础杀伤力'),
            防御: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(10).describe('备揍减伤率、格档率'),
            绝招: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(5).describe('绝招威力'),
            爆发: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(10).describe('combat-attack-dice：影响攻击的骰子'),
            暗器威力: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(10).describe('combat-weapon'),
            暗器爆发: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(10).describe('combat-weapon-dice'),
            生命上限: z.coerce.number().transform(v => 夹(v, 1, 99999)).prefault(100),
          })
          .prefault({}),
      })
      .prefault({}),

    // ══════════════════════════════════════════════════════════
    // 天赋 —— 原作 124 项（Talent 表）
    // ══════════════════════════════════════════════════════════
    天赋: z
      .record(z.string().describe('天赋名'), 等级(1, 0, 5))
      .prefault({})
      .describe('已习得。如「自恋」「唐门暗器」「金钟罩」「君子风」「孟子曰」'),

    // ══════════════════════════════════════════════════════════
    // 秘籍 —— 原作 77 本（ItemBook 表）
    // ══════════════════════════════════════════════════════════
    秘籍: z
      .record(
        z.string().describe('书名'),
        z
          .object({
            已读: z.boolean().prefault(false),
            熟练: 百分(0),
            师授: z.boolean().prefault(false).describe('★ 原作：无师长传授心诀则自学极难寸进'),
          })
          .prefault({})
      )
      .prefault({})
      .describe('如「唐门暗器总纲」（唐门二宝之一）「孔夫子剑」「鸳鸯拳剑谱」'),

    // ══════════════════════════════════════════════════════════
    // 物品
    // ══════════════════════════════════════════════════════════
    物品: z
      .record(
        z.string().describe('物品名'),
        z
          .object({
            数量: z.coerce.number().transform(v => 夹(v, 0, 9999)).prefault(1),
            品质: z.enum(['凡', '良', '优', '珍', '绝']).prefault('凡'),
            说明: z.string().prefault(''),
          })
          .prefault({})
      )
      .prefault({})
      .describe('原作 33 件特殊物品 + 丹药暗器材料'),

    装备: z
      .object({
        兵器: z.string().prefault(''),
        防具: z.string().prefault(''),
        暗器袋: z.string().prefault(''),
        饰品: z.string().prefault(''),
      })
      .prefault({}),

    // ══════════════════════════════════════════════════════════
    // 关系 —— 原作 34 条
    //   ★ 复用引擎 E15：对键排序存网 + 双向强度分开存
    // ══════════════════════════════════════════════════════════
    关系: z
      .record(
        z.string().describe('角色名'),
        z
          .object({
            身份: z.string().prefault(''),
            好感: z.coerce.number().transform(v => 夹(v, -100, 100)).prefault(0).describe('他对<user>的观感'),
            我的好感: z.coerce.number().transform(v => 夹(v, -100, 100)).prefault(0).describe('<user>对他的观感，双向分开存'),
            认知: z.string().prefault('').describe('★ 他知道什么 —— 原作认知边界机制的载体'),
            欠人情: z.coerce.number().transform(v => 夹(v, -9, 9)).prefault(0).describe('正=他欠我'),
            状态: z.enum(['未识', '相识', '相熟', '交心', '决裂']).prefault('未识'),
          })
          .prefault({})
      )
      .prefault({}),

    // ══════════════════════════════════════════════════════════
    // 关系网 —— ★ 引擎 E15
    //   与上面「玩家↔NPC」不同，这里存 **NPC↔NPC**。
    //   它撑的是认知边界机制：一件事发生后，会顺着这张网传到谁耳朵里。
    //
    //   ★★ 键必须按「排序后的两人」拼成 `甲|乙`。
    //      不排序的话 (甲,乙) 与 (乙,甲) 会存成两条，一条查得到一条查不到 ——
    //      引擎自带的 `查网` 就是查这个。AI 手写时最容易犯的错。
    // ══════════════════════════════════════════════════════════
    关系网: z
      .record(
        z.string().describe('对键：两人名按字典序拼成「甲|乙」'),
        z
          .object({
            甲: z.string().prefault(''),
            乙: z.string().prefault(''),
            类型: z.string().prefault('一般').describe('同门 / 师徒 / 兄妹 / 父女 / 挚友 / 仇敌 / 断了'),
            强度: z.coerce.number().transform(v => 夹(v, 0, 100)).prefault(50),
            双向: z.coerce.boolean().prefault(true).describe('false = 单方面（一边热一边冷是常态）'),
            曾经: z.string().prefault('').describe('断关系不删，记下「曾经是什么」'),
          })
          .prefault({})
      )
      .prefault({})
      .describe('★ 引擎 E15 关系网：NPC↔NPC。键须排序，否则同一条存两份'),

    // ══════════════════════════════════════════════════════════
    // 前置与错过 —— ★★ 本卡核心机制
    //   原作：413 Condition / 2654 Switch / 541 处 "~x" / 17 类检查
    // ══════════════════════════════════════════════════════════
    前置: z
      .object({
        已解锁: z.string().prefault('').describe('Condition 为真的 flag，、分隔（原作「旗標」类型）'),
        已错过: z.string().prefault('').describe('★★ 永久关闭的分支。对应 _modifyFlagsWhenFalse'),
        本旬已用: z.string().prefault('').describe('本旬已执行的行动 id，NextRound 时清空'),
        可见条件: z.string().prefault('').describe('玩家可见的解锁提示。原作 663 次判定里只有 3 处'),
        计数: z
          .record(z.string().describe('计数器名'), z.coerce.number().transform(v => 夹(v, -9999, 99999)).prefault(0))
          .prefault({})
          .describe('原作 TC 前缀计数器（TC0001 用了 122 次）'),
      })
      .prefault({}),

    // ══════════════════════════════════════════════════════════
    // 任务 —— 原作 96 组 / 129 节点 + 707 事件标记
    //   ★ 原作结构：{Name=任务组, Key=当前节点}，Key=="clear" 表示完成
    // ══════════════════════════════════════════════════════════
    任务: z
      .object({
        主线: z.string().prefault('').describe('当前主线目标，一句话'),
        主线节点: z.string().prefault('').describe('原作 MainMission 的 Key'),
        支线: z
          .record(
            z.string().describe('任务组 id'),
            z
              .object({
                名: z.string().prefault(''),
                节点: z.string().prefault('').describe('当前节点；clear 表示已完成'),
              })
              .prefault({})
          )
          .prefault({})
          .describe('原作 SubMissions，129 项 / 96 组'),
        事件标记: z.string().prefault('').describe('原作 707 个 EventFlags 的对应物'),
      })
      .prefault({}),

    // ══════════════════════════════════════════════════════════
    // 战斗 —— 引擎逐回合演算，AI 只写过程
    // ══════════════════════════════════════════════════════════
    战斗: z
      .object({
        状态: z.enum(['无', '进行中', '已结束']).prefault('无'),
        对手: z.string().prefault(''),
        回合: z.coerce.number().transform(v => 夹(v, 0, 99)).prefault(0),
        我方血: z.coerce.number().transform(v => 夹(v, 0, 99999)).prefault(100),
        我方血上限: z.coerce.number().transform(v => 夹(v, 1, 99999)).prefault(100),
        对方血: z.coerce.number().transform(v => 夹(v, 0, 99999)).prefault(100),
        对方血上限: z.coerce.number().transform(v => 夹(v, 1, 99999)).prefault(100),
        气: z.coerce.number().transform(v => 夹(v, 0, 10)).prefault(0).describe('绝招资源，嘴炮可破'),
        对方气: z.coerce.number().transform(v => 夹(v, 0, 10)).prefault(0).describe('★ 对手的气。回合制战斗用'),
        对方呆滞: z.coerce.number().transform(v => 夹(v, 0, 9)).prefault(0).describe('本回合不行动，计数递减'),
        我方防御: z.coerce.boolean().prefault(false).describe('本回合是否处于防御姿态'),
        我方状态: z.record(z.string(), z.coerce.number()).prefault({}).describe('增益减益：名→剩余回合'),
        对方状态: z.record(z.string(), z.coerce.number()).prefault({}),
        日志: z.string().prefault('').describe('逐回合记录，、分隔'),
        摘要: z.string().prefault('').describe('★ 引擎算完给 AI 的结论'),
      })
      .prefault({}),
  })
  .prefault({});

export type Schema = z.output<typeof Schema>;
