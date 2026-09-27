/**
 * 多女角管理器(阶段2 步骤9)
 *
 * 职责:
 *  - 女角切换:当前女角 ↔ 女角镜像(整体迁移)
 *  - 女角列表管理:已登场/已攻略/可攻略女角
 *  - 女角状态查询:按姓名/ID 查询状态
 *  - 女角关系联动:切换女角时同步嫉妒值/关系网
 *  - 多女角同时在场:支持主角与多个女角互动
 *
 * 数据模型:
 *  - 当前女角字段(schema.ts 当前女角.*):运行时主角正在互动的女角
 *  - 女角镜像(schema.ts 女角.${姓名}.*):非当前女角的完整状态镜像
 *  - 切换时:当前女角整体迁移到镜像,新女角从镜像加载到当前
 */

import type { MvuRuntime } from './mvu-runtime';
import { HEROINE_LIST, HEROINE_NAME_TO_ID } from '../content/npc/schedule-data';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

/** 女角状态摘要 */
export interface HeroineSummary {
  /** 姓名 */
  name: string;
  /** NPC ID */
  id: number;
  /** 好感度 */
  favorability: number;
  /** 关系阶段 */
  relationshipStage: string;
  /** 是否为当前女角 */
  isCurrent: boolean;
  /** 是否已登场(在 女角.* 镜像中) */
  hasAppeared: boolean;
  /** 是否隐藏女角 */
  isHidden: boolean;
  /** H 经验次数 */
  hExperienceCount: number;
  /** 是否已初H */
  hasFirstH: boolean;
  /** 位置 */
  location: string;
}

/** 女角切换结果 */
export interface HeroineSwitchResult {
  /** 是否切换成功 */
  ok: boolean;
  /** 切换前女角名(若无则为 null) */
  fromHeroine: string | null;
  /** 切换后女角名 */
  toHeroine: string;
  /** 状态变更 ops(应用到 stat_data) */
  stateOps: Array<{ op: 'replace' | 'add'; path: string; value: unknown }>;
  /** Trace */
  traces: Array<{ step: string; detail: string }>;
  /** 失败原因(若 ok=false) */
  error?: string;
}

/** 多女角在场状态 */
export interface MultiHeroineState {
  /** 当前女角名 */
  currentHeroine: string;
  /** 在场女角列表(含当前) */
  presentHeroines: string[];
  /** 各女角对当前场景的态度(0=中立,正=配合,负=反对) */
  attitudes: Record<string, number>;
}

// ───────────────────────────────────────────────────────────
//  当前女角字段列表(用于切换时整体迁移)
//  与 schema.ts 当前女角 对齐
// ───────────────────────────────────────────────────────────

const CURRENT_HEROINE_FIELDS = [
  // 基础关系(10个)
  '姓名', '好感度', '心动值', '嫉妒值', '信任度', '关系阶段',
  '阶段锁定', '是否在攻略中', '攻略路线锁定', '互斥组名', '互斥伙伴姓名',
  // H 状态(4个)
  'H经验次数', '初吻', '初H', '进阶H',
  // 6维属性(6个)
  '魅力', '学业', '体力', '社交', '敏感', '声誉',
  // 13项技能(13个)
  '力量', '敏捷', '智力', '意志技能', '潜行', '口才', '医学',
  '烹饪', '艺术', '驾驶', '格斗', '观察', '恋爱技能',
  // 身体测量(27个)
  '罩杯', '胸围', '腰围', '臀围', '身高', '体重',
  '乳头大小', '乳头颜色', '乳晕大小', '胸型', '胸部敏感度', '泌乳',
  '腰型', '腰部敏感度', '手部描述', '美甲风格',
  '臀型', '臀部敏感度',
  '下体形状', '下体颜色', '下体毛发', '下体气味', '下体敏感度',
  '处女膜状态', '全身敏感度', '敏感带', '兴奋触发点',
  // NSFW 实时状态(5个)
  '当前衣着', '暴露程度', '湿润度', '兴奋度', '精液残留',
  // 元数据(1个)
  '最后更新',
] as const;

// ───────────────────────────────────────────────────────────
//  多女角管理器
// ───────────────────────────────────────────────────────────

export class HeroineManager {
  /**
   * 切换当前女角
   *  - 保存当前女角状态到 女角.${currentName}.* 镜像
   *  - 从 女角.${newName}.* 镜像加载到 当前女角.*
   *  - 若新女角无镜像,初始化为默认值
   *  - 更新 当前女角名
   *  - 触发嫉妒值联动(若在场其他女角有情敌关系)
   */
  switchHeroine(mvu: MvuRuntime, newHeroineName: string): HeroineSwitchResult {
    const traces: Array<{ step: string; detail: string }> = [];
    const stateOps: Array<{ op: 'replace' | 'add'; path: string; value: unknown }> = [];
    const sd = mvu.snapshot();

    const currentHeroineName = (sd.当前女角名 as string) ?? '无';
    traces.push({
      step: '切换开始',
      detail: `from=${currentHeroineName}, to=${newHeroineName}`,
    });

    // 1. 验证新女角存在
    const newHeroineId = HEROINE_NAME_TO_ID[newHeroineName];
    if (!newHeroineId) {
      return {
        ok: false,
        fromHeroine: currentHeroineName,
        toHeroine: newHeroineName,
        stateOps: [],
        traces,
        error: `女角"${newHeroineName}"不在 20 女角列表中`,
      };
    }

    // 2. 保存当前女角到镜像(若有当前女角)
    if (currentHeroineName !== '无' && currentHeroineName !== newHeroineName) {
      const currentHeroineData = (sd.当前女角 as Record<string, unknown>) ?? {};
      for (const field of CURRENT_HEROINE_FIELDS) {
        const value = currentHeroineData[field];
        if (value !== undefined) {
          stateOps.push({
            op: 'replace',
            path: `女角.${currentHeroineName}.${field}`,
            value,
          });
        }
      }
      traces.push({
        step: '保存当前女角到镜像',
        detail: `${currentHeroineName} → 女角.${currentHeroineName}.* (${CURRENT_HEROINE_FIELDS.length} 字段)`,
      });
    }

    // 3. 从镜像加载新女角到当前女角
    const heroines = (sd.女角 as Record<string, Record<string, unknown>>) ?? {};
    const newHeroineData = heroines[newHeroineName];

    if (newHeroineData) {
      // 已有镜像,加载
      for (const field of CURRENT_HEROINE_FIELDS) {
        const value = newHeroineData[field];
        if (value !== undefined) {
          stateOps.push({
            op: 'replace',
            path: `当前女角.${field}`,
            value,
          });
        }
      }
      traces.push({
        step: '从镜像加载新女角',
        detail: `女角.${newHeroineName}.* → 当前女角.* (${CURRENT_HEROINE_FIELDS.length} 字段)`,
      });
    } else {
      // 无镜像,初始化为默认值(空对象,schema prefault 会填充)
      stateOps.push({
        op: 'replace',
        path: `当前女角`,
        value: { 姓名: newHeroineName },
      });
      traces.push({
        step: '初始化新女角',
        detail: `${newHeroineName} 无镜像,初始化为默认值`,
      });
    }

    // 4. 更新当前女角名
    stateOps.push({
      op: 'replace',
      path: '当前女角名',
      value: newHeroineName,
    });

    // 5. 嫉妒值联动(简化:若切换频繁,小幅提升其他在场女角嫉妒值)
    // 实际嫉妒计算由 relationshipGraph 处理,这里只做基础联动
    traces.push({
      step: '切换完成',
      detail: `${stateOps.length} 条 ops,嫉妒值联动由 NPC 系统处理`,
    });

    return {
      ok: true,
      fromHeroine: currentHeroineName,
      toHeroine: newHeroineName,
      stateOps,
      traces,
    };
  }

  /**
   * 获取所有女角摘要(用于 UI 展示)
   */
  getAllHeroineSummaries(mvu: MvuRuntime): HeroineSummary[] {
    const sd = mvu.snapshot();
    const currentHeroineName = (sd.当前女角名 as string) ?? '无';
    const heroines = (sd.女角 as Record<string, Record<string, unknown>>) ?? {};
    const currentHeroine = (sd.当前女角 as Record<string, unknown>) ?? {};

    return HEROINE_LIST.map((h) => {
      const mirror = heroines[h.name];
      const isCurrent = currentHeroineName === h.name;
      const source = isCurrent ? currentHeroine : mirror;

      return {
        name: h.name,
        id: h.id,
        favorability: typeof source?.好感度 === 'number' ? source.好感度 : 0,
        relationshipStage: typeof source?.关系阶段 === 'string' ? source.关系阶段 : '初识',
        isCurrent,
        hasAppeared: !!mirror,
        isHidden: !!h.hidden,
        hExperienceCount: typeof source?.H经验次数 === 'number' ? source.H经验次数 : 0,
        hasFirstH: source?.初H === 1,
        location: typeof source?.当前位置 === 'string' ? source.当前位置 : '未知',
      };
    });
  }

  /**
   * 获取可攻略女角列表(好感度 > 0 或已登场)
   */
  getAttackableHeroines(mvu: MvuRuntime): HeroineSummary[] {
    return this.getAllHeroineSummaries(mvu).filter(
      (h) => !h.isHidden && (h.hasAppeared || h.favorability > 0),
    );
  }

  /**
   * 获取当前女角名
   */
  getCurrentHeroineName(mvu: MvuRuntime): string {
    const sd = mvu.snapshot();
    return (sd.当前女角名 as string) ?? '无';
  }

  /**
   * 多女角同时在场处理
   *  - 计算各女角态度(基于关系网 + 好感度 + 当前场景)
   *  - 返回多女角状态供主聊天AI 参考
   */
  computeMultiHeroineState(
    mvu: MvuRuntime,
    presentHeroineNames: string[],
  ): MultiHeroineState {
    const sd = mvu.snapshot();
    const currentHeroineName = (sd.当前女角名 as string) ?? '无';
    const heroines = (sd.女角 as Record<string, Record<string, unknown>>) ?? {};

    const attitudes: Record<string, number> = {};
    for (const name of presentHeroineNames) {
      if (name === currentHeroineName) {
        attitudes[name] = 0; // 当前女角中立
        continue;
      }
      const mirror = heroines[name];
      const favorability = typeof mirror?.好感度 === 'number' ? mirror.好感度 : 0;
      const jealousy = typeof mirror?.嫉妒值 === 'number' ? mirror.嫉妒值 : 0;
      // 态度 = 好感度 - 嫉妒值/2
      attitudes[name] = favorability - Math.floor(jealousy / 2);
    }

    return {
      currentHeroine: currentHeroineName,
      presentHeroines: presentHeroineNames,
      attitudes,
    };
  }

  /**
   * 同步当前女角到镜像(每轮结束时调用)
   *  - 把 当前女角.* 复制到 女角.${当前女角名}.*
   *  - 用于保持镜像与当前女角一致
   */
  syncCurrentToMirror(mvu: MvuRuntime): Array<{ op: 'replace'; path: string; value: unknown }> {
    const sd = mvu.snapshot();
    const currentHeroineName = (sd.当前女角名 as string) ?? '无';
    if (currentHeroineName === '无') return [];

    const currentHeroine = (sd.当前女角 as Record<string, unknown>) ?? {};
    const ops: Array<{ op: 'replace'; path: string; value: unknown }> = [];

    for (const field of CURRENT_HEROINE_FIELDS) {
      const value = currentHeroine[field];
      if (value !== undefined) {
        ops.push({
          op: 'replace',
          path: `女角.${currentHeroineName}.${field}`,
          value,
        });
      }
    }

    return ops;
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const heroineManager = new HeroineManager();
