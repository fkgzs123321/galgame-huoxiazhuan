// ════════════════════════════════════════════════════════════
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
  世界: z.object({
    底座: z.string().catch('yingxiong').describe('世界.底座'),
    阶段: z.string().catch('初入江湖').describe('世界.阶段'),
  }).prefault({}).describe('世界'),
  她: z.object({
    人设: z.string().catch('').describe('她.人设'),
    情绪: z.string().catch('好奇').describe('她.情绪'),
    目的进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('她.目的进度'),
    已拿到: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('她.已拿到'),
    熟练度: z.string().catch('新手').describe('她.熟练度'),
    反抗值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe('她.反抗值'),
    已用手段: z.array(z.string()).prefault([]).describe('她.已用手段'),
    世界的裂缝: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('她.世界的裂缝'),
  }).prefault({}).describe('她'),
  局面: z.object({
    当前选项: z.record(z.string(), z.any()).prefault({}).describe('局面.当前选项'),
    她的倾向: z.string().catch('').describe('局面.她的倾向'),
    玩家拒绝: z.string().catch('').describe('局面.玩家拒绝'),
    判定结果: z.record(z.string(), z.any()).prefault({}).describe('局面.判定结果'),
    战斗结果: z.record(z.string(), z.any()).prefault({}).describe('局面.战斗结果'),
    骰子种子: z.coerce.number().transform(v => Math.round(v)).prefault(20260916).describe('局面.骰子种子'),
  }).prefault({}).describe('局面'),
  时间: z.object({
    体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe('时间.体力'),
    行动点: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(3).describe('时间.行动点'),
    记忆点上限: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('时间.记忆点上限'),
    岁数: z.coerce.number().transform(v => _.clamp(Math.round(v), 14, 60)).prefault(14).describe('时间.岁数'),
    月: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 12)).prefault(1).describe('时间.月'),
    日进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 29)).prefault(0).describe('时间.日进度'),
    耐心: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 24)).prefault(24).describe('时间.耐心'),
  }).prefault({}).describe('时间'),
  场景: z.object({
    当前地点: z.string().catch('平安镇').describe('场景.当前地点'),
    当前门派: z.string().catch('无').describe('场景.当前门派'),
    已叛门派: z.array(z.string()).prefault([]).describe('场景.已叛门派'),
    当前女角: z.string().catch('').describe('场景.当前女角'),
  }).prefault({}).describe('场景'),
  天赋: z.object({
    膂力: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('天赋.膂力'),
    敏捷: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('天赋.敏捷'),
    根骨: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('天赋.根骨'),
    悟性: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('天赋.悟性'),
    先天: z.object({
      膂力: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('先天.膂力'),
      敏捷: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('先天.敏捷'),
      根骨: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('先天.根骨'),
      悟性: z.coerce.number().transform(v => _.clamp(Math.round(v), 10, 255)).prefault(20).describe('先天.悟性'),
    }).prefault({}).describe('天赋.先天'),
  }).prefault({}).describe('天赋'),
  技能: z.object({
    基本: z.object({
      基本内功: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本内功'),
      基本轻功: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本轻功'),
      基本拳脚: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本拳脚'),
      基本剑术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本剑术'),
      基本刀法: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本刀法'),
      基本杖法: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本杖法'),
      基本鞭法: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本鞭法'),
      基本法术: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本法术'),
      基本招架: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.基本招架'),
      读书写字: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基本.读书写字'),
    }).prefault({}).describe('技能.基本'),
    门派: z.record(
      z.string().describe('技能名'),
      z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 255))
    ).prefault({}).describe('技能.门派'),
    逍遥: z.record(
      z.string().describe('技能名'),
      z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 255))
    ).prefault({}).describe('技能.逍遥'),
  }).prefault({}).describe('技能'),
  资源: z.object({
    潜能: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 65535)).prefault(100).describe('资源.潜能'),
    经验: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 200000)).prefault(0).describe('资源.经验'),
    金钱: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 99999999)).prefault(100).describe('资源.金钱'),
    食物: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe('资源.食物'),
    饮水: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe('资源.饮水'),
  }).prefault({}).describe('资源'),
  背包: z.array(z.string()).prefault([]).describe('背包'),
  强化: z.object({
    装备: z.record(z.string(), z.any()).prefault({}).describe('强化.装备'),
    技能: z.record(z.string(), z.any()).prefault({}).describe('强化.技能'),
  }).prefault({}).describe('强化'),
  任务: z.record(z.string(), z.any()).prefault({}).describe('任务'),
  关系网: z.record(z.string(), z.any()).prefault({}).describe('关系网'),
  关系主体: z.record(z.string(), z.any()).prefault({}).describe('关系主体'),
  关系别名表: z.record(z.string(), z.any()).prefault({}).describe('关系别名表'),
  主角: z.object({
    名: z.string().catch('').describe('主角.名'),
    对她的了解: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('主角.对她的了解'),
    心性: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50).describe('主角.心性'),
    状态: z.string().catch('在线').describe('主角.状态'),
    $骰子种子: z.coerce.number().transform(v => Math.round(v)).prefault(20260915).describe('主角.$骰子种子'),
  }).prefault({}).describe('主角'),
  炼丹: z.object({
    在炼什么: z.string().catch('').describe('炼丹.在炼什么'),
    炉温: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('炼丹.炉温'),
    品质: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('炼丹.品质'),
    完成度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('炼丹.完成度'),
    投入药材: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('炼丹.投入药材'),
    本周炼过: z.coerce.boolean().prefault(false).describe('炼丹.本周炼过'),
    上次产出: z.string().catch('').describe('炼丹.上次产出'),
  }).prefault({}).describe('炼丹'),
  身体: z.object({
    生命当前: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe('身体.生命当前'),
    生命有效: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe('身体.生命有效'),
    内力蓄存: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('身体.内力蓄存'),
    内力强度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 9999)).prefault(0).describe('身体.内力强度'),
    法力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('身体.法力'),
    容貌: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 10)).prefault(5).describe('身体.容貌'),
    福缘: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50).describe('身体.福缘'),
  }).prefault({}).describe('身体'),
  关系: z.record(
      z.string().describe('女角名'),
      z.object({
        好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), -100, 100)).prefault(0),
        关系阶段: z.string().catch('陌生'),
        已学自她: z.array(z.string()).prefault([]),
      }).prefault({})
    ).prefault({}).describe('关系'),
  战斗临时: z.object({
    加力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('战斗临时.加力'),
    呆若木鸡: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 5)).prefault(0).describe('战斗临时.呆若木鸡'),
    临时增益: z.array(z.string()).prefault([]).describe('战斗临时.临时增益'),
  }).prefault({}).describe('战斗临时'),
  NSFW: z.object({
    兴奋度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('NSFW.兴奋度'),
    穿着: z.object({
      外衫: z.string().catch('').describe('穿着.外衫'),
      下裳: z.string().catch('').describe('穿着.下裳'),
      里衣: z.string().catch('').describe('穿着.里衣'),
      布袜: z.string().catch('').describe('穿着.布袜'),
      鞋履: z.string().catch('').describe('穿着.鞋履'),
      佩饰: z.string().catch('').describe('穿着.佩饰'),
    }).prefault({}).describe('NSFW.穿着'),
    身体: z.object({
      基线: z.object({
        身高体重: z.string().catch('').describe('基线.身高体重'),
        体态: z.string().catch('').describe('基线.体态'),
        常年特征: z.string().catch('').describe('基线.常年特征'),
        性情倾向: z.string().catch('').describe('基线.性情倾向'),
        经验: z.string().catch('').describe('基线.经验'),
        下体状态: z.string().catch('').describe('基线.下体状态'),
        后庭状态: z.string().catch('').describe('基线.后庭状态'),
        泌乳与体液: z.string().catch('').describe('基线.泌乳与体液'),
        淫语风格: z.string().catch('').describe('基线.淫语风格'),
        羞耻点: z.string().catch('').describe('基线.羞耻点'),
        调教值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基线.调教值'),
        性爱次数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('基线.性爱次数'),
        最近性行为: z.string().catch('').describe('基线.最近性行为'),
        对主角的称呼: z.string().catch('').describe('基线.对主角的称呼'),
      }).prefault({}).describe('身体.基线'),
      即时: z.object({
        胸前: z.string().catch('').describe('即时.胸前'),
        下身: z.string().catch('').describe('即时.下身'),
        口: z.string().catch('').describe('即时.口'),
        后庭: z.string().catch('').describe('即时.后庭'),
        四肢与痕迹: z.string().catch('').describe('即时.四肢与痕迹'),
      }).prefault({}).describe('身体.即时'),
    }).prefault({}).describe('NSFW.身体'),
    周期: z.record(z.string(), z.any()).prefault({}).describe('NSFW.周期'),
  }).prefault({}).describe('NSFW'),
}).prefault({});

export type Schema = z.output<typeof Schema>;
