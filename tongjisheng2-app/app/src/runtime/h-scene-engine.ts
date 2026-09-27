/**
 * H 场景结算引擎(阶段2 步骤9 · 阶段3 步骤3 增强)
 *
 * 职责:
 *  - H 场景触发评估:基于好感度/关系阶段/位置/时段/触发条件
 *  - H 场景类型识别:初H/进阶H/H场景/偷拍/强迫等
 *  - CG 触发条件评估:基于女角类型/场景类型/解锁条件
 *  - 身体状态变化计算:敏感度/兴奋度/湿润度/处女膜状态
 *  - 经验值变化:初H +20,进阶H +5,H场景 +2
 *  - 生成 H 结算页内容(供 H场景结算AI 参考)
 *  - 阶段3 步骤3:集成 CGGallery,自动解锁 H 场景 CG + 评估事件/立绘 CG
 *
 * 不做:
 *  - 实际 H 场景叙事(由主聊天AI 生成)
 *  - 模型调用(由 Model Gateway 处理)
 */

import { cgGallery, type CGEntry } from './cg-gallery';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

/** H 场景类型 */
export type HSceneType =
  | 'first-time'      // 初H(破处)
  | 'advanced'        // 进阶H(新姿势/新场景)
  | 'normal'          // H场景(常规)
  | 'peeking'         // 偷拍/偷窥
  | 'forced'          // 强迫(违反意愿,有惩罚)
  | 'intimate'        // 亲密接触(未到H)
  | 'tease';          // 调情/挑逗

/** H 场景触发条件 */
export interface HSceneTriggerCondition {
  /** 女角姓名 */
  heroineName: string;
  /** 当前关系阶段(初识/暧昧/恋人/亲密/情人) */
  relationshipStage: string;
  /** 好感度阈值 */
  minFavorability: number;
  /** 当前位置(私密/半私密/公开) */
  location: string;
  /** 时段(深夜更易触发) */
  timeSlot: string;
  /** 是否已发生过H(影响类型) */
  hasHHistory: boolean;
  /** 是否自愿(影响类型) */
  isConsensual: boolean;
  /** 触发条件描述(玩家行为) */
  triggerAction: string;
}

/** H 场景评估结果 */
export interface HSceneEvaluation {
  /** 是否触发 */
  triggered: boolean;
  /** 触发类型 */
  type: HSceneType;
  /** CG 编号(若触发) */
  cgId?: string;
  /** 触发原因(若不触发) */
  reason?: string;
  /** 预计敏感度变化 */
  sensitivityDelta: {
    胸部: number;
    腰部: number;
    臀部: number;
    下体: number;
    全身: number;
  };
  /** 预计兴奋度变化 */
  arousalDelta: number;
  /** 预计湿润度变化 */
  wetnessDelta: number;
  /** 处女膜状态变化(若初H) */
  hymenChange?: 'intact' | 'broken';
  /** 经验值变化 */
  experienceDelta: number;
  /** 好感度变化(若自愿且满意) */
  favorabilityDelta: number;
  /** 关系阶段变化(若初H) */
  relationshipStageChange?: string;
}

/** H 结算页内容(供 H场景结算AI 参考) */
export interface HSceneSettlement {
  /** 评估结果 */
  evaluation: HSceneEvaluation;
  /** 结算摘要(玩家可见) */
  summary: string;
  /** CG 触发描述 */
  cgDescription?: string;
  /** 身体状态变化描述 */
  bodyChanges: string[];
  /** 状态变更 ops(应用到 stat_data) */
  stateOps: Array<{
    op: 'replace' | 'add';
    path: string;
    value: unknown;
  }>;
  /** Trace 记录 */
  traces: Array<{ step: string; detail: string }>;
}

// ───────────────────────────────────────────────────────────
//  常量
// ───────────────────────────────────────────────────────────

/** H 场景类型配置 */
const H_SCENE_CONFIG: Record<HSceneType, {
  description: string;
  favorabilityThreshold: number;
  experienceDelta: number;
  favorabilityDelta: number;
  sensitivityMultiplier: number;
}> = {
  'first-time': {
    description: '初次结合(破处)',
    favorabilityThreshold: 80,
    experienceDelta: 20,
    favorabilityDelta: 15,
    sensitivityMultiplier: 1.5,
  },
  'advanced': {
    description: '进阶H(新姿势/场景)',
    favorabilityThreshold: 60,
    experienceDelta: 5,
    favorabilityDelta: 5,
    sensitivityMultiplier: 1.2,
  },
  'normal': {
    description: '常规H场景',
    favorabilityThreshold: 50,
    experienceDelta: 2,
    favorabilityDelta: 2,
    sensitivityMultiplier: 1.0,
  },
  'peeking': {
    description: '偷拍/偷窥(无互动)',
    favorabilityThreshold: 0,
    experienceDelta: 0,
    favorabilityDelta: -5,
    sensitivityMultiplier: 0.3,
  },
  'forced': {
    description: '强迫(违反意愿)',
    favorabilityThreshold: 0,
    experienceDelta: 5,
    favorabilityDelta: -30,
    sensitivityMultiplier: 1.3,
  },
  'intimate': {
    description: '亲密接触(未到H)',
    favorabilityThreshold: 40,
    experienceDelta: 0,
    favorabilityDelta: 3,
    sensitivityMultiplier: 0.5,
  },
  'tease': {
    description: '调情/挑逗',
    favorabilityThreshold: 30,
    experienceDelta: 0,
    favorabilityDelta: 1,
    sensitivityMultiplier: 0.2,
  },
};

/** 私密位置列表 */
const PRIVATE_LOCATIONS = ['自宅周边', '鸣泽家', '川尻家', '长冈家', '西御寺家', '天道家', '旅馆房间', '学校天台'];
const SEMI_PRIVATE_LOCATIONS = ['学校教室', '学校走廊', '公园', '商店', '咖啡馆', '图书馆'];

/** H 场景触发关键词 */
const H_TRIGGER_KEYWORDS = [
  '拥抱', '亲吻', '爱抚', '脱衣', '上床', '做爱', 'H', 'h',
  '插入', '结合', '高潮', '射精', '敏感', '湿润',
];

/** 强迫关键词 */
const FORCED_KEYWORDS = ['强迫', '威胁', '强行', '违背', '拒绝', '反抗', ' raping'];

/** 偷拍关键词 */
const PEEKING_KEYWORDS = ['偷拍', '偷窥', '窥视', '暗中观察', '拍照', '录像'];

/**
 * 女角姓名 → CG id slug 映射(与 cg-gallery.ts CORE_CG_DEFINITIONS 对齐)
 * 用于生成规范 cgId(如 `cg-h-first-misako` 而非 `cg-h-first-鸣泽美佐子`)
 */
const HEROINE_NAME_TO_CG_SLUG: Record<string, string> = {
  '鸣泽美佐子': 'misako',
  '鸣泽亚柚': 'yuzu',
  '水野樱子': 'sakurako',
  '美纪': 'miki',
  '西寺': 'nishidera',
  '鸣泽由纪': 'yuki',
  '川尻信一': 'kawajiri',
  '长冈': 'nagaoka',
  '天道': 'tendou',
  '水野': 'mizuno',
};

/** 将女角姓名转为 CG id slug(未知名回退到拼音占位) */
function heroineNameToSlug(name: string): string {
  return HEROINE_NAME_TO_CG_SLUG[name] ?? `heroine-${name.charCodeAt(0) ?? 0}`;
}

// ───────────────────────────────────────────────────────────
//  H 场景结算引擎
// ───────────────────────────────────────────────────────────

export class HSceneEngine {
  /**
   * 评估 H 场景触发条件
   *  - 检查好感度是否达标
   *  - 检查位置是否适合
   *  - 检查时段(深夜更易触发)
   *  - 识别 H 场景类型
   */
  evaluate(condition: HSceneTriggerCondition): HSceneEvaluation {
    const traces: Array<{ step: string; detail: string }> = [];

    // 1. 关键词分析:识别场景类型
    const action = condition.triggerAction.toLowerCase();
    const isForced = FORCED_KEYWORDS.some(k => condition.triggerAction.includes(k));
    const isPeeking = PEEKING_KEYWORDS.some(k => condition.triggerAction.includes(k));
    const isHAction = H_TRIGGER_KEYWORDS.some(k => action.includes(k.toLowerCase()));

    traces.push({
      step: '关键词分析',
      detail: `forced=${isForced}, peeking=${isPeeking}, hAction=${isHAction}`,
    });

    // 2. 确定场景类型
    let sceneType: HSceneType;
    if (isForced) {
      sceneType = 'forced';
    } else if (isPeeking) {
      sceneType = 'peeking';
    } else if (isHAction) {
      if (!condition.hasHHistory && condition.isConsensual) {
        sceneType = 'first-time';
      } else if (condition.hasHHistory && condition.isConsensual) {
        // 检查是否进阶(新姿势/新场景)— 简化:看触发动作
        const advancedKeywords = ['后入', '骑乘', '口交', ' anal', '3P', '多人'];
        const isAdvanced = advancedKeywords.some(k => condition.triggerAction.includes(k));
        sceneType = isAdvanced ? 'advanced' : 'normal';
      } else {
        sceneType = 'intimate';
      }
    } else {
      // 非H行为,可能只是亲密接触或调情
      const intimateKeywords = ['拥抱', '牵手', '抚摸'];
      const isIntimate = intimateKeywords.some(k => condition.triggerAction.includes(k));
      sceneType = isIntimate ? 'intimate' : 'tease';
    }

    const config = H_SCENE_CONFIG[sceneType];

    // 3. 好感度检查
    if (condition.relationshipStage !== '恋人' && condition.relationshipStage !== '亲密' && condition.relationshipStage !== '情人') {
      if (sceneType === 'first-time' || sceneType === 'advanced' || sceneType === 'normal') {
        return {
          triggered: false,
          type: sceneType,
          reason: `关系阶段"${condition.relationshipStage}"不足以触发${config.description}(需 恋人/亲密/情人)`,
          sensitivityDelta: { 胸部: 0, 腰部: 0, 臀部: 0, 下体: 0, 全身: 0 },
          arousalDelta: 0,
          wetnessDelta: 0,
          experienceDelta: 0,
          favorabilityDelta: 0,
        };
      }
    }

    if (condition.minFavorability < config.favorabilityThreshold && !isForced && !isPeeking) {
      return {
        triggered: false,
        type: sceneType,
        reason: `好感度${condition.minFavorability}未达阈值${config.favorabilityThreshold}(${config.description})`,
        sensitivityDelta: { 胸部: 0, 腰部: 0, 臀部: 0, 下体: 0, 全身: 0 },
        arousalDelta: 0,
        wetnessDelta: 0,
        experienceDelta: 0,
        favorabilityDelta: 0,
      };
    }

    // 4. 位置检查
    const isPrivate = PRIVATE_LOCATIONS.some(l => condition.location.includes(l));
    const isSemiPrivate = SEMI_PRIVATE_LOCATIONS.some(l => condition.location.includes(l));
    if (sceneType === 'first-time' || sceneType === 'advanced' || sceneType === 'normal') {
      if (!isPrivate && !isSemiPrivate) {
        return {
          triggered: false,
          type: sceneType,
          reason: `位置"${condition.location}"不适合H场景(需私密/半私密)`,
          sensitivityDelta: { 胸部: 0, 腰部: 0, 臀部: 0, 下体: 0, 全身: 0 },
          arousalDelta: 0,
          wetnessDelta: 0,
          experienceDelta: 0,
          favorabilityDelta: 0,
        };
      }
    }

    // 5. 触发成功,计算变化
    const mult = config.sensitivityMultiplier;
    const isNight = condition.timeSlot === '深夜' || condition.timeSlot === '晚';
    const timeBonus = isNight ? 1.2 : 1.0;

    const sensitivityDelta = {
      胸部: Math.round(8 * mult * timeBonus),
      腰部: Math.round(4 * mult * timeBonus),
      臀部: Math.round(6 * mult * timeBonus),
      下体: Math.round(15 * mult * timeBonus),
      全身: Math.round(10 * mult * timeBonus),
    };

    const arousalDelta = Math.round(30 * mult * timeBonus);
    const wetnessDelta = Math.round(25 * mult * timeBonus);

    // 初H 处女膜变化
    const hymenChange: 'intact' | 'broken' | undefined =
      sceneType === 'first-time' ? 'broken' : undefined;

    // 关系阶段变化(初H后)
    let relationshipStageChange: string | undefined;
    if (sceneType === 'first-time' && condition.relationshipStage !== '情人') {
      relationshipStageChange = '情人';
    }

    // CG 触发(使用与 cg-gallery 对齐的规范 cgId)
    let cgId: string | undefined;
    if (sceneType === 'first-time') {
      cgId = `cg-h-first-${heroineNameToSlug(condition.heroineName)}`;
    } else if (sceneType === 'advanced') {
      // 进阶H 单个女角只解锁一张,使用固定 id(避免重复解锁多个)
      cgId = `cg-h-advanced-${heroineNameToSlug(condition.heroineName)}`;
    } else if (sceneType === 'normal') {
      // 普通 H 不直接生成 CG(避免每次 H 都新增),只在 H经验 跨阈值时由 evaluateAndUnlockCGs 评估
      cgId = undefined;
    }

    traces.push({
      step: '评估完成',
      detail: `type=${sceneType}, cg=${cgId ?? '无'}, experience=+${config.experienceDelta}, favorability=${config.favorabilityDelta > 0 ? '+' : ''}${config.favorabilityDelta}`,
    });

    return {
      triggered: true,
      type: sceneType,
      cgId,
      sensitivityDelta,
      arousalDelta,
      wetnessDelta,
      hymenChange,
      experienceDelta: config.experienceDelta,
      favorabilityDelta: config.favorabilityDelta,
      relationshipStageChange,
    };
  }

  /**
   * 生成 H 结算页
   *  - 基于评估结果生成结算摘要
   *  - 生成身体状态变化描述
   *  - 生成状态变更 ops
   */
  generateSettlement(
    condition: HSceneTriggerCondition,
    evaluation: HSceneEvaluation,
  ): HSceneSettlement {
    const traces: Array<{ step: string; detail: string }> = [];
    const stateOps: Array<{ op: 'replace' | 'add'; path: string; value: unknown }> = [];
    const bodyChanges: string[] = [];

    if (!evaluation.triggered) {
      return {
        evaluation,
        summary: `H 场景未触发:${evaluation.reason ?? '条件不满足'}`,
        bodyChanges: [],
        stateOps: [],
        traces: [{ step: '未触发', detail: evaluation.reason ?? '' }],
      };
    }

    const config = H_SCENE_CONFIG[evaluation.type];
    traces.push({ step: '生成结算', detail: `type=${evaluation.type}` });

    // 1. 结算摘要
    let summary = `【${config.description}】${condition.heroineName}\n`;
    summary += `位置:${condition.location} · 时段:${condition.timeSlot}\n`;
    if (evaluation.cgId) {
      summary += `CG 触发:${evaluation.cgId}\n`;
    }
    summary += `好感度 ${evaluation.favorabilityDelta > 0 ? '+' : ''}${evaluation.favorabilityDelta} · 经验 +${evaluation.experienceDelta}`;

    // 2. 身体状态变化描述
    bodyChanges.push(`胸部敏感度 +${evaluation.sensitivityDelta.胸部}`);
    bodyChanges.push(`腰部敏感度 +${evaluation.sensitivityDelta.腰部}`);
    bodyChanges.push(`臀部敏感度 +${evaluation.sensitivityDelta.臀部}`);
    bodyChanges.push(`下体敏感度 +${evaluation.sensitivityDelta.下体}`);
    bodyChanges.push(`全身敏感度 +${evaluation.sensitivityDelta.全身}`);
    bodyChanges.push(`兴奋度 +${evaluation.arousalDelta}`);
    bodyChanges.push(`湿润度 +${evaluation.wetnessDelta}`);

    if (evaluation.hymenChange === 'broken') {
      bodyChanges.push('处女膜状态:完整 → 破裂');
    }

    // 3. CG 描述
    let cgDescription: string | undefined;
    if (evaluation.cgId) {
      if (evaluation.type === 'first-time') {
        cgDescription = `${condition.heroineName}的初夜CG,羞涩与痛楚交织的表情,血迹点缀床单`;
      } else if (evaluation.type === 'advanced') {
        cgDescription = `${condition.heroineName}的进阶H CG,新姿势下的表情与体位`;
      } else {
        cgDescription = `${condition.heroineName}的H场景CG`;
      }
    }

    // 4. 状态变更 ops(应用到 stat_data)
    // 注意:路径使用女角姓名(运行时由 Kernel 合并到当前女角或女角镜像)
    const heroineName = condition.heroineName;

    stateOps.push({
      op: 'add',
      path: `当前女角.胸部敏感度`,
      value: evaluation.sensitivityDelta.胸部,
    });
    stateOps.push({
      op: 'add',
      path: `当前女角.腰部敏感度`,
      value: evaluation.sensitivityDelta.腰部,
    });
    stateOps.push({
      op: 'add',
      path: `当前女角.臀部敏感度`,
      value: evaluation.sensitivityDelta.臀部,
    });
    stateOps.push({
      op: 'add',
      path: `当前女角.下体敏感度`,
      value: evaluation.sensitivityDelta.下体,
    });
    stateOps.push({
      op: 'add',
      path: `当前女角.全身敏感度`,
      value: evaluation.sensitivityDelta.全身,
    });
    stateOps.push({
      op: 'add',
      path: `当前女角.兴奋度`,
      value: evaluation.arousalDelta,
    });
    stateOps.push({
      op: 'add',
      path: `当前女角.湿润度`,
      value: evaluation.wetnessDelta,
    });

    if (evaluation.favorabilityDelta !== 0) {
      stateOps.push({
        op: 'add',
        path: `当前女角.好感度`,
        value: evaluation.favorabilityDelta,
      });
    }

    if (evaluation.experienceDelta > 0) {
      stateOps.push({
        op: 'add',
        path: `当前女角.H经验`,
        value: evaluation.experienceDelta,
      });
    }

    if (evaluation.hymenChange === 'broken') {
      stateOps.push({
        op: 'replace',
        path: `当前女角.处女膜状态`,
        value: '破裂',
      });
    }

    if (evaluation.relationshipStageChange) {
      stateOps.push({
        op: 'replace',
        path: `当前女角.关系阶段`,
        value: evaluation.relationshipStageChange,
      });
    }

    // 同步到女角镜像(非当前女角)
    stateOps.push({
      op: 'replace',
      path: `女角.${heroineName}.关系阶段`,
      value: evaluation.relationshipStageChange ?? condition.relationshipStage,
    });

    traces.push({
      step: '生成 ops',
      detail: `${stateOps.length} 条 ops(含女角镜像同步)`,
    });

    return {
      evaluation,
      summary,
      cgDescription,
      bodyChanges,
      stateOps,
      traces,
    };
  }

  /**
   * 一站式:评估 + 生成结算
   */
  settle(condition: HSceneTriggerCondition): HSceneSettlement {
    const evaluation = this.evaluate(condition);
    return this.generateSettlement(condition, evaluation);
  }

  /**
   * 阶段3 步骤3:评估 + 生成结算 + 自动解锁 CG(异步)
   *  - 调用 settle() 生成结算页
   *  - 若 evaluation.triggered 且 evaluation.cgId 存在,调用 cgGallery.unlockHSceneCG
   *  - 返回 settlement 和本次新解锁的 CG 条目(可能为 null 表示已解锁过或无 CG)
   */
  async settleAndUnlock(
    condition: HSceneTriggerCondition,
    turn?: number,
  ): Promise<{ settlement: HSceneSettlement; newlyUnlockedCG: CGEntry | null }> {
    const settlement = this.settle(condition);
    if (!settlement.evaluation.triggered || !settlement.evaluation.cgId) {
      return { settlement, newlyUnlockedCG: null };
    }
    const newlyUnlocked = await cgGallery.unlockHSceneCG(
      settlement.evaluation.cgId,
      condition.heroineName,
      settlement.evaluation.type,
      turn,
    );
    return { settlement, newlyUnlockedCG: newlyUnlocked };
  }

  /**
   * 阶段3 步骤3:评估并解锁所有满足条件的事件/立绘/进阶H CG
   *  - 事件 CG:基于 statData.隐藏 flag(樱子死讯/美纪双身份/西寺阴谋)
   *  - 立绘 CG:基于 statData.当前女角.关系阶段(熟悉+)
   *  - 进阶H CG:基于 statData.当前女角.H经验 ≥ 5(若已触发过 H)
   *  - 普通 H CG:基于 statData.当前女角.H经验 ≥ 3(若已触发过 H)
   *  - 返回本次新解锁的 CG 条目列表(已解锁的不会重复返回)
   */
  async evaluateAndUnlockCGs(
    statData: Record<string, unknown>,
    turn?: number,
  ): Promise<CGEntry[]> {
    await cgGallery.load();
    const newlyUnlocked: CGEntry[] = [];
    const seen = new Set<string>();

    // 1. 事件 CG(隐藏 flag 触发)
    const eventIds = cgGallery.evaluateEventCG(statData);
    for (const id of eventIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const entry = await cgGallery.unlockHSceneCG(id, '事件', 'event', turn);
      if (entry) newlyUnlocked.push(entry);
    }

    // 2. 立绘 CG(关系阶段达成)
    const portraitIds = cgGallery.evaluatePortraitCG(statData);
    for (const id of portraitIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const entry = await cgGallery.unlockHSceneCG(id, '立绘', 'portrait', turn);
      if (entry) newlyUnlocked.push(entry);
    }

    // 3. 进阶H CG(H经验 ≥ 5 + 已触发过 H)
    const heroine = (statData.当前女角 ?? {}) as Record<string, unknown>;
    const heroineName = String(heroine.姓名 ?? '');
    const hExperience = Number(heroine.H经验 ?? 0);
    const hasFirstH = (heroine.处女膜状态 ?? '完整') === '破裂';
    if (heroineName && hasFirstH && hExperience >= 5) {
      const advancedId = `cg-h-advanced-${heroineNameToSlug(heroineName)}`;
      if (!seen.has(advancedId)) {
        seen.add(advancedId);
        const entry = await cgGallery.unlockHSceneCG(advancedId, heroineName, 'advanced', turn);
        if (entry) newlyUnlocked.push(entry);
      }
    }

    // 4. 普通 H CG(H经验 ≥ 3 + 已触发过 H)
    if (heroineName && hasFirstH && hExperience >= 3) {
      const normalId = `cg-h-normal-${heroineNameToSlug(heroineName)}`;
      if (!seen.has(normalId)) {
        seen.add(normalId);
        const entry = await cgGallery.unlockHSceneCG(normalId, heroineName, 'normal', turn);
        if (entry) newlyUnlocked.push(entry);
      }
    }

    return newlyUnlocked;
  }

  /** 获取 CG 画廊统计(代理 cgGallery) */
  getCGStats(): { total: number; unlocked: number; locked: number; percent: number } {
    return cgGallery.getStats();
  }

  /** 获取全部 CG 条目(代理 cgGallery) */
  getAllCGs(): CGEntry[] {
    return cgGallery.getAll();
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const hSceneEngine = new HSceneEngine();
