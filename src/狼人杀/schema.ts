// 血月七夜 · MVU 变量结构定义（Zod 4）
// 禁止 import —— z（Zod v4）与 _（lodash）已全局注入
// 前缀约定：_ = AI 可见不可改（脚本产出）；$ = AI 不可见（脚本专属真相）；无前缀 = AI 可见可改（仅好感/怀疑/传递事件）
// 铁律：名单/事实/指令全部字符串整串 replace，不用数组；11 人命名空间用 z.record(z.enum) 固定键，预置于 initvar

export const Schema = z.object({
  _世界: z
    .object({
      天数: z.coerce
        .number()
        .transform((v) => _.clamp(v, 1, 7))
        .prefault(1),
      阶段: z.enum(['夜', '昼']).prefault('昼'),
      存活名单: z
        .string()
        .prefault('庄晚棠|白蘅|灶婶|小满|姜芸|苏黎|陆霜霜|闻人夏|程郁|顾青芜|顾青黛'),
      昨夜死讯: z.string().prefault(''),
      公开事实: z.string().prefault(''),
      今日广播: z.string().prefault(''),
    })
    .prefault({}),
  // 玩家血梦/同伴/藏处/被种夜一律存脚本变量（AI 不可见，UI 读）——_ 前缀字段会注入 prompt
  _玩家: z
    .object({
      身份: z.enum(['未指派', '狼', '民', '铜镜', '药囊', '银匕', '草汁']).prefault('未指派'),
      存活: z.enum(['存活', '死亡']).prefault('存活'),
    })
    .prefault({}),
  _人物: z
    .record(
      z.enum(['庄晚棠', '白蘅', '灶婶', '小满', '姜芸', '苏黎', '陆霜霜', '闻人夏', '程郁', '顾青芜', '顾青黛']),
      z.object({
        已知: z.string().prefault(''),
      }),
    )
    .prefault({}),
  人物: z
    .record(
      z.enum(['庄晚棠', '白蘅', '灶婶', '小满', '姜芸', '苏黎', '陆霜霜', '闻人夏', '程郁', '顾青芜', '顾青黛']),
      z.object({
        好感: z.coerce
          .number()
          .transform((v) => _.clamp(v, 0, 100))
          .prefault(50),
        怀疑: z.coerce
          .number()
          .transform((v) => _.clamp(v, 0, 100))
          .prefault(15),
      }),
    )
    .prefault({}),
  世界: z
    .object({
      传递事件: z.string().prefault(''),
    })
    .prefault({}),
  $物品: z
    .object({
      草汁存量: z.coerce
        .number()
        .transform((v) => _.clamp(v, 0, 3))
        .prefault(3),
      毒药已用: z.enum(['否', '是']).prefault('否'),
      麻沸散已用: z.enum(['否', '是']).prefault('否'),
      银匕在身: z.string().prefault(''),
      铜镜在身: z.string().prefault(''),
      草汁在身: z.string().prefault(''),
      药囊在身: z.string().prefault(''),
    })
    .prefault({}),
  $人物: z
    .record(
      z.enum(['庄晚棠', '白蘅', '灶婶', '小满', '姜芸', '苏黎', '陆霜霜', '闻人夏', '程郁', '顾青芜', '顾青黛']),
      z.object({
        身份: z.enum(['未指派', '狼', '民', '铜镜', '药囊', '银匕', '草汁']).prefault('未指派'),
        持物: z.string().prefault(''),
        被种: z.string().prefault(''),
        兽化: z.enum(['无', '进行中', '完成']).prefault('无'),
        存活: z.string().prefault('存活'),
      }),
    )
    .prefault({}),
});
