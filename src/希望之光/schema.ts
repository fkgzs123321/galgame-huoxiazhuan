const GaugeSchema = z
  .object({
    当前值: z.coerce.number().prefault(90),
    最大值: z.coerce.number().prefault(100),
  })
  .transform(data => {
    const max = Math.max(1, data.最大值);
    return {
      当前值: _.clamp(data.当前值, 0, max),
      最大值: max,
    };
  })
  .prefault({ 当前值: 90, 最大值: 100 });

const AttrValueSchema = z.coerce
  .number()
  .transform(v => _.clamp(v, 1, 30))
  .prefault(10);

const TaskLiteSchema = z
  .object({
    任务ID: z.string().prefault('TASK-UNKNOWN'),
    名称: z.string().prefault('未命名任务'),
    类型: z.enum(['主线', '阶段', '支线', '应急']).prefault('支线'),
    阶段标签: z.string().prefault('通用'),
    难度: z.enum(['低', '中', '高']).prefault('中'),
    预计耗时分钟: z.coerce
      .number()
      .transform(v => Math.max(5, v))
      .prefault(30),
    奖励: z.string().prefault('无'),
  })
  .prefault({});

const TaskProgressSchema = z
  .object({
    任务ID: z.string().prefault('TASK-UNKNOWN'),
    名称: z.string().prefault('未命名任务'),
    类型: z.enum(['主线', '阶段', '支线', '应急']).prefault('支线'),
    阶段标签: z.string().prefault('通用'),
    当前目标: z.string().prefault('待分配'),
    进度: z.string().prefault('0/1'),
  })
  .prefault({});

const TaskDoneSchema = z
  .object({
    任务ID: z.string().prefault('TASK-UNKNOWN'),
    名称: z.string().prefault('未命名任务'),
    类型: z.enum(['主线', '阶段', '支线', '应急']).prefault('支线'),
    阶段标签: z.string().prefault('通用'),
    评价: z.string().prefault('已完成'),
  })
  .prefault({});

const NsfwStateSchema = z
  .object({
    开关: z.enum(['关', '开']).prefault('关'),
    当前阶段: z.string().prefault('未开启'),
    敏感度: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 100))
      .prefault(0),
    耐受度: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 100))
      .prefault(0),
    欲望张力: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 100))
      .prefault(0),
    风险标记: z.enum(['低', '中', '高']).prefault('低'),
    冷却到分钟戳: z.coerce
      .number()
      .transform(v => Math.max(0, v))
      .prefault(0),
    冷却剩余分钟: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 999))
      .prefault(0),
    最近事件: z.string().prefault(''),
  })
  .prefault({});

const SkillBranchSchema = z
  .object({
    经验: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 999))
      .prefault(0),
    等级: z.coerce
      .number()
      .transform(v => _.clamp(v, 1, 10))
      .prefault(1),
  })
  .prefault({});

const RelationValueSchema = z
  .object({
    好感: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 100))
      .prefault(50),
    信任: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 100))
      .prefault(50),
    配合度: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 100))
      .prefault(50),
    核心病症: z.string().prefault(''),
    熟练度等级: z.coerce
      .number()
      .transform(v => _.clamp(v, 0, 10))
      .prefault(0),
  })
  .prefault({});

export const Schema = z.object({
  世界: z
    .object({
      当前时间: z.string().prefault('2026/01/01 07:00'),
      当前班次: z.enum(['早班', '中班', '夜班']).prefault('早班'),
      天气: z.string().prefault('晴'),
      日序号: z.coerce
        .number()
        .transform(v => Math.max(1, v))
        .prefault(1),
    })
    .prefault({}),

  主角: z
    .object({
      姓名: z.string().prefault('未命名'),
      所在地: z.string().prefault('入口大厅'),
      力量: AttrValueSchema,
      敏捷: AttrValueSchema,
      体质: AttrValueSchema,
      智力: AttrValueSchema,
      感知: AttrValueSchema,
      魅力: AttrValueSchema,
      体力值: GaugeSchema,
      精神值: GaugeSchema,
      资金: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(500),
      声望: z.coerce
        .number()
        .transform(v => _.clamp(v, 0, 100))
        .prefault(10),
      等级: z.coerce
        .number()
        .transform(v => _.clamp(v, 1, 50))
        .prefault(1),
      经验值: z.coerce
        .number()
        .transform(v => _.clamp(v, 0, 999))
        .prefault(0),
      技能点: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
      任务日志: z
        .object({
          可接任务数量: z.coerce
            .number()
            .transform(v => Math.max(0, v))
            .prefault(0),
          进行中任务数量: z.coerce
            .number()
            .transform(v => Math.max(0, v))
            .prefault(0),
          已完成任务数量: z.coerce
            .number()
            .transform(v => Math.max(0, v))
            .prefault(0),
        })
        .prefault({}),
      NSFW状态: NsfwStateSchema,
    })
    .prefault({}),

  任务日志: z
    .object({
      可接任务: z.array(TaskLiteSchema).prefault([]),
      进行中: z.array(TaskProgressSchema).prefault([]),
      已完成: z.array(TaskDoneSchema).prefault([]),
    })
    .prefault({}),

  事件标记: z
    .object({
      主线阶段: z.string().prefault('序章'),
      任务派发备注: z.string().prefault(''),
      轮次心跳: z.string().prefault(''),
      最近动作: z.string().prefault(''),
      动作序列号: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
      最近动作日志: z.array(z.string()).prefault([]),
      最近动作键: z.string().prefault(''),
      最近动作分钟戳: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
    })
    .prefault({}),

  判定状态: z
    .object({
      骰点模式: z.enum(['strict_d20', 'advantage', 'disadvantage']).prefault('strict_d20'),
      最近骰点: z.coerce
        .number()
        .transform(v => _.clamp(v, 0, 20))
        .prefault(0),
      最近判定总值: z.coerce.number().prefault(0),
      最近DC: z.coerce.number().prefault(10),
      最近判定结果: z.string().prefault('未判定'),
      优势状态: z.enum(['无', '优势', '劣势']).prefault('无'),
      风险评分: z
        .object({
          R1病情波动强度: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 3))
            .prefault(0),
          R2操作负荷强度: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 3))
            .prefault(0),
          R3协作复杂度: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 3))
            .prefault(0),
          R4证据完整度风险: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 3))
            .prefault(0),
          R5时间窗口压力: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 3))
            .prefault(0),
          R6环境资源约束: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 3))
            .prefault(0),
          RiskScore: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 18))
            .prefault(0),
          风险分级: z.enum(['G0', 'G1', 'G2', 'G3', 'G4']).prefault('G0'),
          分级DC修正: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 4))
            .prefault(0),
        })
        .prefault({}),
      有效属性: z
        .object({
          力量: AttrValueSchema,
          敏捷: AttrValueSchema,
          体质: AttrValueSchema,
          智力: AttrValueSchema,
          感知: AttrValueSchema,
          魅力: AttrValueSchema,
        })
        .prefault({}),
    })
    .prefault({}),

  系统设置: z
    .object({
      模型能力档位: z.enum(['lite', 'standard', 'pro']).prefault('standard'),
      NSFW内容档位: z.enum(['safe', 'suggestive', 'explicit']).prefault('suggestive'),
      NSFW自动降级: z.enum(['开', '关']).prefault('开'),
      难度档位: z.enum(['新手', '标准', '困难', '专家']).prefault('标准'),
      任务视图筛选: z.enum(['全部', '阶段', '通用', '应急']).prefault('全部'),
      输出模式: z.enum(['发布', '开发']).prefault('发布'),
    })
    .prefault({}),

  // ── 以下为阶段一补全的 11 个根级对象 ──

  经济账本: z
    .object({
      累计收入: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
      累计支出: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
      当班净额: z.coerce.number().prefault(0),
      罚款合计: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
      补贴合计: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
    })
    .prefault({}),

  关系网络: z
    .object({
      护理组关系: z.record(z.string(), RelationValueSchema).prefault({}),
    })
    .prefault({}),

  技能成长: z
    .object({
      护理基础: SkillBranchSchema,
      沟通安抚: SkillBranchSchema,
      风险识别: SkillBranchSchema,
      行政协同: SkillBranchSchema,
      法律应对: SkillBranchSchema,
      后勤管理: SkillBranchSchema,
    })
    .prefault({}),

  合规状态: z
    .object({
      复核完成: z.boolean().prefault(false),
      证据质量: z.enum(['传闻', '初核', '证实']).prefault('传闻'),
      最近违规次数: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
      程序合法性: z.enum(['低', '中', '高']).prefault('低'),
      授权状态: z.boolean().prefault(false),
    })
    .prefault({}),

  主线状态: z
    .object({
      当前阶段: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
      阶段描述: z.string().prefault('序章'),
    })
    .prefault({}),

  叙事控制: z
    .object({
      MVU模式: z.enum(['严格', '兼容', '调试']).prefault('严格'),
      地图模式: z.enum(['简版', '详细', '剧情']).prefault('简版'),
    })
    .prefault({}),

  模板引擎: z
    .object({
      生成状态: z.record(z.string(), z.string()).prefault({}),
      入库状态: z.record(z.string(), z.string()).prefault({}),
    })
    .prefault({}),

  外部系统: z
    .object({
      舆情监管: z
        .object({
          舆情热度: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 100))
            .prefault(0),
          媒体关注: z.enum(['低', '中', '高']).prefault('低'),
          复盘完成: z.boolean().prefault(false),
        })
        .prefault({}),
      治理生态: z
        .object({
          监管关注度: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 100))
            .prefault(0),
        })
        .prefault({}),
      法律风险: z
        .object({
          当前案件数: z.coerce
            .number()
            .transform(v => Math.max(0, v))
            .prefault(0),
          累计罚款: z.coerce
            .number()
            .transform(v => Math.max(0, v))
            .prefault(0),
        })
        .prefault({}),
    })
    .prefault({}),

  DLC状态: z
    .object({
      可用: z.boolean().prefault(false),
      当前章节: z.string().prefault(''),
      当前小节: z.string().prefault(''),
      最近存档点: z.string().prefault(''),
      失败回退次数: z.coerce
        .number()
        .transform(v => Math.max(0, v))
        .prefault(0),
    })
    .prefault({}),

  老人关系列表: z.record(z.string(), RelationValueSchema).prefault({}),

  病症映射: z
    .record(
      z.string(),
      z
        .object({
          关联老人: z.array(z.string()).prefault([]),
        })
        .prefault({}),
    )
    .prefault({}),
});

export type Schema = z.output<typeof Schema>;
