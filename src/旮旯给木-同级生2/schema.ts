// ════════════════════════════════════════════════════════════
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
  时间: z.object({
    当前日期: z.string().prefault('12-22').describe('时间.当前日期'),
    天数: z.coerce.number().transform(v => _.clamp(Math.round(v), 1, 17)).prefault(1).describe('时间.天数'),
    时段: z.string().prefault('早').describe('时间.时段'),
    章节: z.string().prefault('寒假前奏').describe('时间.章节'),
    天气: z.string().prefault('晴').describe('时间.天气'),
  }).prefault({}).describe('时间'),
  场景: z.object({
    当前地点: z.string().prefault('自宅').describe('场景.当前地点'),
    当前女角: z.string().prefault('').describe('场景.当前女角'),
    场景模式: z.string().prefault('休息').describe('场景.场景模式'),
  }).prefault({}).describe('场景'),
  主角: z.object({
    $骰子种子: z.coerce.number().transform(v => Math.round(v)).prefault(20260915).describe('主角.$骰子种子'),
    身体状态: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(80).describe('主角.身体状态'),
    心情: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(70).describe('主角.心情'),
    说话: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40).describe('主角.说话'),
    做事: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40).describe('主角.做事'),
    懂东西: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(40).describe('主角.懂东西'),
    不可逆损伤: z.record(z.string().describe('不可逆损伤的键'), z.any()).prefault({}).describe('主角.不可逆损伤'),
    技能: z.object({
      打工: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('技能.打工'),
      学业: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('技能.学业'),
      机车: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('技能.机车'),
    }).prefault({}).describe('主角.技能'),
    反抗值: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(50).describe('主角.反抗值'),
    体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(100).describe('主角.体力'),
    状态: z.string().prefault('在线').describe('主角.状态'),
    对她的了解: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('主角.对她的了解'),
    痕迹: z.record(z.string().describe('痕迹的键'), z.any()).prefault({}).describe('主角.痕迹'),
    已知软肋: z.record(z.string().describe('已知软肋的键'), z.any()).prefault({}).describe('主角.已知软肋'),
    已封死的路: z.record(z.string().describe('已封死的路的键'), z.any()).prefault({}).describe('主角.已封死的路'),
    身上: z.record(z.string().describe('身上的键'), z.any()).prefault({}).describe('主角.身上'),
    已知线索: z.record(z.string().describe('已知线索的键'), z.any()).prefault({}).describe('主角.已知线索'),
  }).prefault({}).describe('主角'),
  当前女角状态: z.object({
    当前衣着: z.string().prefault('').describe('当前女角状态.当前衣着'),
    暴露程度: z.string().prefault('').describe('当前女角状态.暴露程度'),
    湿润度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('当前女角状态.湿润度'),
    兴奋度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('当前女角状态.兴奋度'),
    精液残留: z.string().prefault('').describe('当前女角状态.精液残留'),
  }).prefault({}).describe('当前女角状态'),
  经济: z.object({
    现金: z.coerce.number().transform(v => Math.round(v)).prefault(5000).describe('经济.现金'),
    累计储蓄: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('经济.累计储蓄'),
    当日盈亏: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('经济.当日盈亏'),
  }).prefault({}).describe('经济'),
  过程: z.object({
    时段楼层数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('过程.时段楼层数'),
    当前难度: z.string().prefault('普通').describe('过程.当前难度'),
    死结局标识: z.string().prefault('').describe('过程.死结局标识'),
    连续无收入天数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('过程.连续无收入天数'),
    超自然妄想计数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 3)).prefault(0).describe('过程.超自然妄想计数'),
    世界的裂缝: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('过程.世界的裂缝'),
    她用过的手段: z.record(z.string().describe('她用过的手段的键'), z.any()).prefault({}).describe('过程.她用过的手段'),
  }).prefault({}).describe('过程'),
  剧情: z.object({
    日记收集数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 5)).prefault(0).describe('剧情.日记收集数'),
    美纪线进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 5)).prefault(0).describe('剧情.美纪线进度'),
    樱子线解锁: z.coerce.boolean().prefault(false).describe('剧情.樱子线解锁'),
    樱子死讯: z.coerce.boolean().prefault(false).describe('剧情.樱子死讯'),
    医院访问次数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('剧情.医院访问次数'),
    变数屋访问次数: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('剧情.变数屋访问次数'),
    变数屋全解锁: z.coerce.boolean().prefault(false).describe('剧情.变数屋全解锁'),
    阴谋偷听: z.coerce.boolean().prefault(false).describe('剧情.阴谋偷听'),
    西寺解决进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 2)).prefault(0).describe('剧情.西寺解决进度'),
    西寺债务陷阱: z.coerce.boolean().prefault(false).describe('剧情.西寺债务陷阱'),
    泉美H完成: z.coerce.boolean().prefault(false).describe('剧情.泉美H完成'),
    友美误会解决: z.coerce.boolean().prefault(false).describe('剧情.友美误会解决'),
    毕业生外传完成: z.coerce.boolean().prefault(false).describe('剧情.毕业生外传完成'),
    洋子短发完成: z.coerce.boolean().prefault(false).describe('剧情.洋子短发完成'),
    互斥触发: z.object({
      友美泉: z.coerce.boolean().prefault(false).describe('互斥触发.友美泉'),
      鸣泽母女: z.coerce.boolean().prefault(false).describe('互斥触发.鸣泽母女'),
      永岛母女: z.coerce.boolean().prefault(false).describe('互斥触发.永岛母女'),
    }).prefault({}).describe('剧情.互斥触发'),
  }).prefault({}).describe('剧情'),
  女角: z.object({
    鸣泽唯: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('鸣泽唯.好感度'),
      关系阶段: z.string().prefault('熟悉').describe('鸣泽唯.关系阶段'),
      状态: z.string().prefault('').describe('鸣泽唯.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('鸣泽唯.开发度'),
      身体记忆: z.string().prefault('').describe('鸣泽唯.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('鸣泽唯.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('鸣泽唯.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('鸣泽唯.后穴'),
    }).prefault({}).describe('女角.鸣泽唯'),
    水野友美: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('水野友美.好感度'),
      关系阶段: z.string().prefault('熟悉').describe('水野友美.关系阶段'),
      状态: z.string().prefault('').describe('水野友美.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('水野友美.开发度'),
      身体记忆: z.string().prefault('').describe('水野友美.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('水野友美.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('水野友美.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('水野友美.后穴'),
    }).prefault({}).describe('女角.水野友美'),
    筱原泉美: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('筱原泉美.好感度'),
      关系阶段: z.string().prefault('熟悉').describe('筱原泉美.关系阶段'),
      状态: z.string().prefault('').describe('筱原泉美.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('筱原泉美.开发度'),
      身体记忆: z.string().prefault('').describe('筱原泉美.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('筱原泉美.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('筱原泉美.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('筱原泉美.后穴'),
    }).prefault({}).describe('女角.筱原泉美'),
    南川洋子: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('南川洋子.好感度'),
      关系阶段: z.string().prefault('熟悉').describe('南川洋子.关系阶段'),
      状态: z.string().prefault('').describe('南川洋子.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('南川洋子.开发度'),
      身体记忆: z.string().prefault('').describe('南川洋子.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('南川洋子.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('南川洋子.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('南川洋子.后穴'),
    }).prefault({}).describe('女角.南川洋子'),
    加藤美纪: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('加藤美纪.好感度'),
      关系阶段: z.string().prefault('初识').describe('加藤美纪.关系阶段'),
      状态: z.string().prefault('').describe('加藤美纪.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('加藤美纪.开发度'),
      身体记忆: z.string().prefault('').describe('加藤美纪.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('加藤美纪.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('加藤美纪.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('加藤美纪.后穴'),
    }).prefault({}).describe('女角.加藤美纪'),
    舞岛可怜: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('舞岛可怜.好感度'),
      关系阶段: z.string().prefault('初识').describe('舞岛可怜.关系阶段'),
      状态: z.string().prefault('').describe('舞岛可怜.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('舞岛可怜.开发度'),
      身体记忆: z.string().prefault('').describe('舞岛可怜.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('舞岛可怜.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('舞岛可怜.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('舞岛可怜.后穴'),
    }).prefault({}).describe('女角.舞岛可怜'),
    杉本樱子: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('杉本樱子.好感度'),
      关系阶段: z.string().prefault('初识').describe('杉本樱子.关系阶段'),
      状态: z.string().prefault('').describe('杉本樱子.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('杉本樱子.开发度'),
      身体记忆: z.string().prefault('').describe('杉本樱子.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('杉本樱子.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('杉本樱子.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('杉本樱子.后穴'),
    }).prefault({}).describe('女角.杉本樱子'),
    都筑梢江: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('都筑梢江.好感度'),
      关系阶段: z.string().prefault('初识').describe('都筑梢江.关系阶段'),
      状态: z.string().prefault('').describe('都筑梢江.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('都筑梢江.开发度'),
      身体记忆: z.string().prefault('').describe('都筑梢江.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('都筑梢江.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('都筑梢江.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('都筑梢江.后穴'),
    }).prefault({}).describe('女角.都筑梢江'),
    野野村美里: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('野野村美里.好感度'),
      关系阶段: z.string().prefault('初识').describe('野野村美里.关系阶段'),
      状态: z.string().prefault('').describe('野野村美里.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('野野村美里.开发度'),
      身体记忆: z.string().prefault('').describe('野野村美里.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('野野村美里.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('野野村美里.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('野野村美里.后穴'),
    }).prefault({}).describe('女角.野野村美里'),
    安田爱美: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('安田爱美.好感度'),
      关系阶段: z.string().prefault('初识').describe('安田爱美.关系阶段'),
      状态: z.string().prefault('').describe('安田爱美.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('安田爱美.开发度'),
      身体记忆: z.string().prefault('').describe('安田爱美.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('安田爱美.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('安田爱美.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('安田爱美.后穴'),
    }).prefault({}).describe('女角.安田爱美'),
    田中美沙: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('田中美沙.好感度'),
      关系阶段: z.string().prefault('初识').describe('田中美沙.关系阶段'),
      状态: z.string().prefault('').describe('田中美沙.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('田中美沙.开发度'),
      身体记忆: z.string().prefault('').describe('田中美沙.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('田中美沙.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('田中美沙.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('田中美沙.后穴'),
    }).prefault({}).describe('女角.田中美沙'),
    片桐美铃: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('片桐美铃.好感度'),
      关系阶段: z.string().prefault('初识').describe('片桐美铃.关系阶段'),
      状态: z.string().prefault('').describe('片桐美铃.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('片桐美铃.开发度'),
      身体记忆: z.string().prefault('').describe('片桐美铃.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('片桐美铃.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('片桐美铃.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('片桐美铃.后穴'),
    }).prefault({}).describe('女角.片桐美铃'),
    鸣泽美佐子: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('鸣泽美佐子.好感度'),
      关系阶段: z.string().prefault('熟悉').describe('鸣泽美佐子.关系阶段'),
      状态: z.string().prefault('').describe('鸣泽美佐子.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('鸣泽美佐子.开发度'),
      身体记忆: z.string().prefault('').describe('鸣泽美佐子.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('鸣泽美佐子.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('鸣泽美佐子.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('鸣泽美佐子.后穴'),
    }).prefault({}).describe('女角.鸣泽美佐子'),
    永岛佐知子: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('永岛佐知子.好感度'),
      关系阶段: z.string().prefault('初识').describe('永岛佐知子.关系阶段'),
      状态: z.string().prefault('').describe('永岛佐知子.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('永岛佐知子.开发度'),
      身体记忆: z.string().prefault('').describe('永岛佐知子.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('永岛佐知子.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('永岛佐知子.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('永岛佐知子.后穴'),
    }).prefault({}).describe('女角.永岛佐知子'),
    永岛久美子: z.object({
      好感度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('永岛久美子.好感度'),
      关系阶段: z.string().prefault('初识').describe('永岛久美子.关系阶段'),
      状态: z.string().prefault('').describe('永岛久美子.状态'),
      开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('永岛久美子.开发度'),
      身体记忆: z.string().prefault('').describe('永岛久美子.身体记忆'),
      胸: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('胸.开发度'),
        现状: z.string().prefault('').describe('胸.现状'),
      }).prefault({}).describe('永岛久美子.胸'),
      阴部: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('阴部.开发度'),
        现状: z.string().prefault('').describe('阴部.现状'),
        破瓜: z.coerce.boolean().prefault(false).describe('阴部.破瓜'),
      }).prefault({}).describe('永岛久美子.阴部'),
      后穴: z.object({
        开发度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('后穴.开发度'),
        现状: z.string().prefault('').describe('后穴.现状'),
      }).prefault({}).describe('永岛久美子.后穴'),
    }).prefault({}).describe('女角.永岛久美子'),
  }).prefault({}).describe('女角'),
  世界: z.object({
    底座: z.string().prefault('nanpa2').describe('世界.底座'),
    游戏进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('世界.游戏进度'),
    关系封闭: z.record(z.string().describe('关系封闭的键'), z.any()).prefault({}).describe('世界.关系封闭'),
  }).prefault({}).describe('世界'),
  她: z.object({
    人设: z.string().prefault('').describe('她.人设'),
    目的进度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('她.目的进度'),
    已拿到: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('她.已拿到'),
    熟练度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(1).describe('她.熟练度'),
    此刻: z.string().prefault('').describe('她.此刻'),
    兴奋度: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('她.兴奋度'),
    情绪: z.string().prefault('好奇').describe('她.情绪'),
  }).prefault({}).describe('她'),
  局面: z.object({
    当前选项: z.record(z.string().describe('当前选项的键'), z.any()).prefault({}).describe('局面.当前选项'),
    她的倾向: z.string().prefault('').describe('局面.她的倾向'),
    玩家拒绝: z.string().prefault('').describe('局面.玩家拒绝'),
    判定结果: z.record(z.string().describe('判定结果的键'), z.any()).prefault({}).describe('局面.判定结果'),
    今日指令: z.string().prefault('').describe('局面.今日指令'),
    误点: z.coerce.boolean().prefault(false).describe('局面.误点'),
    她已选: z.string().prefault('').describe('局面.她已选'),
    她打的字: z.string().prefault('').describe('局面.她打的字'),
    场面: z.object({
      地点: z.string().prefault('自宅').describe('场面.地点'),
      体位: z.string().prefault('').describe('场面.体位'),
      节奏: z.string().prefault('').describe('场面.节奏'),
      参与: z.record(z.string().describe('参与的键'), z.any()).prefault({}).describe('场面.参与'),
      留痕: z.string().prefault('').describe('场面.留痕'),
      她看到的: z.string().prefault('').describe('场面.她看到的'),
    }).prefault({}).describe('局面.场面'),
  }).prefault({}).describe('局面'),
  终局: z.object({
    已触发: z.coerce.boolean().prefault(false).describe('终局.已触发'),
    剩余体力: z.coerce.number().transform(v => _.clamp(Math.round(v), 0, 100)).prefault(0).describe('终局.剩余体力'),
    选择: z.string().prefault('').describe('终局.选择'),
  }).prefault({}).describe('终局'),
}).prefault({});

export type Schema = z.output<typeof Schema>;
