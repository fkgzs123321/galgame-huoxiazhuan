import { z, registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

// 数值范围限制（替代 _.clamp，不依赖 lodash 全局注入）
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Number(v) || 0));
const floor0 = (v: number) => Math.max(0, Number(v) || 0);
const floor1 = (v: number) => Math.max(1, Number(v) || 0);

// ═══════════════════════════════════════
// 工厂函数
// ═══════════════════════════════════════

// 4维属性对象（气势/口才/情报/地位，0-100）
const attrObj = (defs: { 气势: number; 口才: number; 情报: number; 地位: number }) => z.object({
  气势: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(defs.气势),
  口才: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(defs.口才),
  情报: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(defs.情报),
  地位: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(defs.地位),
});

// 单个技能对象（参数可为 undefined，未使用的技能槽留空）
const skillObj = (name: string | undefined, type: string | undefined, desc: string | undefined) => z.object({
  名称: z.string().prefault(name || ''),
  类型: z.string().prefault(type || ''),
  说明: z.string().prefault(desc || ''),
  已使用: z.coerce.boolean().prefault(false),
});

// 角色技能对象（9个技能槽，未使用的槽位留空）
const charSkillsObj = (slots: Array<{ 名: string; 类型: string; 说明: string } | undefined>) => z.object({
  技能1: skillObj(slots[0] && slots[0].名, slots[0] && slots[0].类型, slots[0] && slots[0].说明),
  技能2: skillObj(slots[1] && slots[1].名, slots[1] && slots[1].类型, slots[1] && slots[1].说明),
  技能3: skillObj(slots[2] && slots[2].名, slots[2] && slots[2].类型, slots[2] && slots[2].说明),
  技能4: skillObj(slots[3] && slots[3].名, slots[3] && slots[3].类型, slots[3] && slots[3].说明),
  技能5: skillObj(slots[4] && slots[4].名, slots[4] && slots[4].类型, slots[4] && slots[4].说明),
  技能6: skillObj(slots[5] && slots[5].名, slots[5] && slots[5].类型, slots[5] && slots[5].说明),
  技能7: skillObj(slots[6] && slots[6].名, slots[6] && slots[6].类型, slots[6] && slots[6].说明),
  技能8: skillObj(slots[7] && slots[7].名, slots[7] && slots[7].类型, slots[7] && slots[7].说明),
  技能9: skillObj(slots[8] && slots[8].名, slots[8] && slots[8].类型, slots[8] && slots[8].说明),
});

// 绑定花名册单项
const womanObj = (d: { 姓名: string; 类型: string; 绑定等级: string; 绑定顺序: number; 状态: string; 绑定深度: number; 清醒频率: number; 解绑代价: string }) => z.object({
  姓名: z.string().prefault(d.姓名),
  类型: z.string().prefault(d.类型),
  绑定等级: z.enum(['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10']).prefault(d.绑定等级),
  绑定顺序: z.coerce.number().transform(v => clamp(v, 1, 10)).prefault(d.绑定顺序),
  状态: z.enum(['已绑定', '绑定中', '待绑定', '已解绑', '死亡']).prefault(d.状态),
  绑定深度: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(d.绑定深度),
  清醒频率: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(d.清醒频率),
  解绑代价: z.string().prefault(d.解绑代价),
});

export const Schema = z.object({
  // ═══════════════════════════════════════
  // 系统变量
  // ═══════════════════════════════════════
  系统变量: z.object({
    游戏阶段: z.enum(['日常轮', '交涉中', '结算中', '结束']).prefault('日常轮'),
    当前章节: z.coerce.number().transform(v => floor1(v)).prefault(1),
    天数: z.coerce.number().transform(v => floor1(v)).prefault(1),
    时段: z.enum(['黎明', '上午', '中午', '下午', '傍晚', '夜晚', '深夜']).prefault('上午'),
    $代写模式: z.coerce.boolean().prefault(false),
    $已初始化: z.coerce.boolean().prefault(false),
  }),

  // ═══════════════════════════════════════
  // 反派林天状态（注意：不是"主角状态"，与initvar路径一致）
  // ═══════════════════════════════════════
  反派状态: z.object({
    姓名: z.string().prefault('林天'),
    财富等级: z.enum(['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15']).prefault('A9'),
    财富值: z.coerce.number().transform(v => floor0(v)).prefault(500000000),
    绑定名额总数: z.coerce.number().transform(v => clamp(v, 0, 10)).prefault(10),
    已绑定数: z.coerce.number().transform(v => clamp(v, 0, 10)).prefault(8),
    剩余名额: z.coerce.number().transform(v => clamp(v, 0, 10)).prefault(2),
    系统状态: z.enum(['活跃', '警告', '解绑']).prefault('活跃'),
    评价值: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(100),
    评价趋势: z.enum(['上升', '稳定', '下降', '崩坏']).prefault('稳定'),
    良知值: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(50),
    系统警告: z.string().prefault('无'),
    当前阶段: z.string().prefault('满分巅峰'),
    当前位置: z.string().prefault('林天私人会所'),
    心情: z.string().prefault('玩味'),
    时停剩余: z.coerce.number().transform(v => clamp(v, 0, 99)).prefault(1),
    短剧剩余: z.coerce.number().transform(v => clamp(v, 0, 99)).prefault(3),
    预判剩余: z.coerce.number().transform(v => clamp(v, 0, 99)).prefault(3),
    绝对掌控剩余: z.coerce.number().transform(v => clamp(v, 0, 99)).prefault(3),
    系统救场剩余: z.coerce.number().transform(v => clamp(v, 0, 99)).prefault(1),
    系统积分: z.coerce.number().transform(v => floor0(v)).prefault(500),
    道具库存: z.string().prefault(''),
    强制洗白可用: z.coerce.boolean().prefault(true),
    系统暴走次数: z.coerce.number().transform(v => clamp(v, 0, 3)).prefault(0),
    四墙剩余: z.coerce.number().transform(v => clamp(v, 0, 3)).prefault(3),
  }),

  // ═══════════════════════════════════════
  // user受害者状态
  // ═══════════════════════════════════════
  user状态: z.object({
    姓名: z.string().prefault('你'),
    财富等级: z.enum(['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10']).prefault('A8'),
    财富值: z.coerce.number().transform(v => floor0(v)).prefault(80000000),
    婚姻状态: z.enum(['完好', '裂痕', '疏远', '敌对', '断裂']).prefault('完好'),
    反抗力: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(30),
    觉醒度: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(0),
    理智值: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(85),
    心理状态: z.enum(['震惊', '愤怒', '绝望', '隐忍', '反抗', '崩溃']).prefault('震惊'),
    怀疑度: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(20),
    证据数量: z.coerce.number().transform(v => floor0(v)).prefault(0),
    当前位置: z.string().prefault('家中'),
    与妻子关系: z.enum(['亲密', '疏远', '敌对', '断裂']).prefault('疏远'),
  }),

  // ═══════════════════════════════════════
  // 交涉系统
  // ═══════════════════════════════════════
  交涉状态: z.object({
    交涉进行中: z.coerce.boolean().prefault(false),
    交涉对象: z.string().prefault(''),
    交涉回合: z.coerce.number().transform(v => floor0(v)).prefault(0),
    交涉幕次: z.enum(['寒暄', '辞锋', '共识', '结束']).prefault('结束'),
    user交涉策略: z.string().prefault(''),
    对手交涉策略: z.string().prefault(''),
    user气势: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(50),
    user口才: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(50),
    user情报: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(30),
    user地位: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(60),
    对手气势: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(60),
    对手口才: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(60),
    对手情报: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(70),
    对手地位: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(70),
    上轮user骰: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(0),
    上轮对手骰: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(0),
    上轮判定: z.string().prefault(''),
    user共识分: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(0),
    对手共识分: z.coerce.number().transform(v => clamp(v, 0, 100)).prefault(0),
    交涉历史: z.array(z.string()).prefault([]),
  }),

  // ═══════════════════════════════════════
  // 角色属性表（12个角色，4维属性 0-100）
  // ═══════════════════════════════════════
  角色属性: z.object({
    林天: attrObj({ 气势: 100, 口才: 95, 情报: 100, 地位: 100 }),
    user: attrObj({ 气势: 30, 口才: 30, 情报: 15, 地位: 40 }),
    苏婉: attrObj({ 气势: 40, 口才: 55, 情报: 30, 地位: 75 }),
    陈雪华: attrObj({ 气势: 15, 口才: 25, 情报: 10, 地位: 5 }),
    林雅芝: attrObj({ 气势: 20, 口才: 40, 情报: 20, 地位: 10 }),
    王秀兰: attrObj({ 气势: 25, 口才: 35, 情报: 15, 地位: 8 }),
    赵敏: attrObj({ 气势: 55, 口才: 60, 情报: 45, 地位: 70 }),
    孙莉: attrObj({ 气势: 40, 口才: 50, 情报: 35, 地位: 45 }),
    周慧敏: attrObj({ 气势: 70, 口才: 65, 情报: 60, 地位: 85 }),
    吴琼: attrObj({ 气势: 80, 口才: 75, 情报: 70, 地位: 82 }),
    郑秀: attrObj({ 气势: 45, 口才: 55, 情报: 40, 地位: 75 }),
    沈梦瑶: attrObj({ 气势: 75, 口才: 80, 情报: 85, 地位: 80 }),
  }),

  // ═══════════════════════════════════════
  // 角色技能表（每个角色3个技能槽，字段：名称/类型/说明/已使用）
  // ═══════════════════════════════════════
  角色技能: z.object({
    林天: charSkillsObj([
      { 名: '系统洞察', 类型: '被动', 说明: '每轮交涉开始时情报+25，自动获知user策略类型' },
      { 名: '短剧套路', 类型: '主动', 说明: '每场限3次，强制重骰本轮骰子（取保候审/越狱/证据不认账）' },
      { 名: '财富压制', 类型: '触发', 说明: '地位高于对手20+时气势自动+30' },
      { 名: '系统预判', 类型: '触发', 说明: '每轮40%概率预判user策略，预判成功时user策略效果减半' },
      { 名: '穿越第四面墙', 类型: '触发', 说明: '评价值≥90时每周1次，可操控评论倾向/屏蔽user觉醒度+1~3' },
      { 名: '金手指升级', 类型: '被动', 说明: '每3章自动获得1次系统奖励' },
      { 名: '绝对掌控', 类型: '触发', 说明: '绑定女性清醒瞬间强制压制（每章3次，绑定深度≥50时100%成功）' },
      { 名: '大势掌控', 类型: '被动', 说明: '交涉中user所有策略修正额外-5' },
      { 名: '时停一瞬', 类型: '主动', 说明: '每章1次，跳过user本轮的1个行动回合' },
    ]),
    user: charSkillsObj([
      { 名: '真相追寻', 类型: '被动', 说明: '发现罪证时情报+3；每收集2条罪证情报永久+1' },
      { 名: '绝地反击', 类型: '主动', 说明: '反抗力<5时可触发，本轮骰子+6；每场限1次' },
      { 名: '觉醒之眼', 类型: '触发', 说明: '觉醒度>85解锁，可看穿林天短剧套路；>95时情报永久+5' },
    ]),
    苏婉: charSkillsObj([
      { 名: '青梅记忆', 类型: '触发', 说明: '与user交涉时共识分起点+20（20年感情残留）' },
      { 名: '贵妇涵养', 类型: '被动', 说明: '口才+10，交涉中免疫首轮威胁策略' }
    ]),
    陈雪华: charSkillsObj([{ 名: '求生本能', 类型: '触发', 说明: '生命受威胁时气势+15；向林天求助时口才+10' }
    ]),
    林雅芝: charSkillsObj([{ 名: '母性坚韧', 类型: '触发', 说明: '提及小宝时理智+10、气势+10；为保护小宝可触发额外骰子+10' }
    ]),
    王秀兰: charSkillsObj([{ 名: '隐忍积势', 类型: '被动', 说明: '首轮共识分-10，但后续每轮+5（生活磨砺的耐心）' }
    ]),
    赵敏: charSkillsObj([{ 名: '千金骄纵', 类型: '触发', 说明: '地位高于对手时气势+10' },
      { 名: '订婚誓言', 类型: '触发', 说明: '提及王昊时理智-5但反抗力+5' }
    ]),
    孙莉: charSkillsObj([{ 名: '表演天赋', 类型: '主动', 说明: '每场限1次，可伪装情绪让对手下轮骰子-10' }
    ]),
    周慧敏: charSkillsObj([{ 名: '豪门手腕', 类型: '被动', 说明: '交涉时口才+15' },
      { 名: '隐忍积势', 类型: '被动', 说明: '首轮共识分-10，但后续每轮+5（比王秀兰更强）' }
    ]),
    吴琼: charSkillsObj([{ 名: '铁娘子', 类型: '被动', 说明: '气势+20' },
      { 名: '商战老手', 类型: '被动', 说明: '情报+15' }
    ]),
    郑秀: charSkillsObj([{ 名: '家族庇护', 类型: '触发', 说明: '提及郑家时地位+15，但林天评价值-3（OOC风险）' }
    ]),
    沈梦瑶: charSkillsObj([{ 名: '创投眼光', 类型: '被动', 说明: '情报+20' },
      { 名: '冷静分析', 类型: '被动', 说明: '首轮免疫威胁策略；每轮结束可看穿对手1个策略' }
    ]),
  }),

  // ═══════════════════════════════════════
  // 绑定女性花名册（陈雪华~沈梦瑶，注意是"苏婉"不是"苏婉"）
  // ═══════════════════════════════════════
  绑定花名册: z.object({
    陈雪华: womanObj({ 姓名: '陈雪华', 类型: 'A6时期', 绑定等级: 'A6', 绑定顺序: 1, 状态: '已绑定', 绑定深度: 85, 清醒频率: 30, 解绑代价: '失忆' }),
    林雅芝: womanObj({ 姓名: '林雅芝', 类型: 'A5时期', 绑定等级: 'A5', 绑定顺序: 2, 状态: '已绑定', 绑定深度: 70, 清醒频率: 45, 解绑代价: '发疯' }),
    王秀兰: womanObj({ 姓名: '王秀兰', 类型: 'A4时期', 绑定等级: 'A4', 绑定顺序: 3, 状态: '已绑定', 绑定深度: 75, 清醒频率: 35, 解绑代价: '失忆' }),
    赵敏: womanObj({ 姓名: '赵敏', 类型: 'A7时期', 绑定等级: 'A7', 绑定顺序: 4, 状态: '已绑定', 绑定深度: 60, 清醒频率: 70, 解绑代价: '发疯' }),
    孙莉: womanObj({ 姓名: '孙莉', 类型: 'A5时期', 绑定等级: 'A5', 绑定顺序: 5, 状态: '已绑定', 绑定深度: 80, 清醒频率: 25, 解绑代价: '失忆' }),
    周慧敏: womanObj({ 姓名: '周慧敏', 类型: 'A8时期', 绑定等级: 'A8', 绑定顺序: 6, 状态: '已绑定', 绑定深度: 90, 清醒频率: 15, 解绑代价: '发疯' }),
    吴琼: womanObj({ 姓名: '吴琼', 类型: 'A4时期', 绑定等级: 'A4', 绑定顺序: 7, 状态: '已绑定', 绑定深度: 65, 清醒频率: 50, 解绑代价: '死亡' }),
    郑秀: womanObj({ 姓名: '郑秀', 类型: 'A7时期', 绑定等级: 'A7', 绑定顺序: 8, 状态: '已绑定', 绑定深度: 78, 清醒频率: 40, 解绑代价: '发疯' }),
    苏婉: womanObj({ 姓名: '苏婉', 类型: 'A9时期', 绑定等级: 'A9', 绑定顺序: 9, 状态: '绑定中', 绑定深度: 15, 清醒频率: 80, 解绑代价: '失忆' }),
    沈梦瑶: womanObj({ 姓名: '', 类型: 'A10时期', 绑定等级: 'A10', 绑定顺序: 10, 状态: '待绑定', 绑定深度: 0, 清醒频率: 0, 解绑代价: '' }),
  }),

  // ═══════════════════════════════════════
  // 小说评论系统
  // ═══════════════════════════════════════
  评论系统: z.object({
    本轮评论: z.array(z.string()).prefault([]),
    累计点赞: z.coerce.number().transform(v => floor0(v)).prefault(0),
    累计吐槽: z.coerce.number().transform(v => floor0(v)).prefault(0),
    热门评论: z.string().prefault(''),
    评论倾向: z.enum(['叫好', '中性', '吐槽', '弃书']).prefault('中性'),
  }),

  // ═══════════════════════════════════════
  // 最近记忆 & 思维链历史
  // ═══════════════════════════════════════
  最近记忆: z.array(z.string()).prefault([]),
  思维链历史: z.array(z.string()).prefault([]),
});

// 直接调用注册，不要用 $(() => {...}) 包裹（会导致初始化失败）
registerMvuSchema(Schema);
