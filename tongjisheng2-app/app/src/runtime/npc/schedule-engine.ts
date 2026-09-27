/**
 * NPC 日程引擎(阶段2 步骤2)
 *
 * 职责:
 *  - 查询当日某时段某区域的可遇女角 ID 列表
 *  - 应用日期覆盖(locked/newUnlock)
 *  - 应用周间休假(WEEKDAY_OFFS)
 *  - 应用关系覆盖(玩家攻略完成后女角常驻玩家附近)
 *  - 提供当日可遇女角全集
 *
 * 设计:
 *  - 纯查询,不修改状态
 *  - 不依赖 getvar/EJS,参数全部由调用方传入
 *  - 关系覆盖由调用方传入 relationshipOverrides(如 {2: '自宅周边'} 表示美佐子常驻自宅)
 */

import {
  DEFAULT_SCHEDULE,
  DATE_OVERRIDES,
  WEEKDAY_OFFS,
  DAY_TO_WEEKDAY,
  HEROINE_ID_MAP,
  HEROINE_NAME_TO_ID,
  HEROINE_LIST,
  type TimeSlot,
  type Region,
  type DateOverride,
} from '../../content/npc/schedule-data';

// ───────────────────────────────────────────────────────────
//  查询参数与结果
// ───────────────────────────────────────────────────────────

export interface ScheduleQuery {
  /** 游戏内天数(1-17) */
  dayCount: number;
  /** 时段 */
  timeSlot: TimeSlot;
  /** 区域 */
  region: Region;
  /** 星期(可选,默认由 dayCount 推导) */
  weekday?: string;
  /** 关系覆盖(女角ID → 常驻区域,如攻略完成后) */
  relationshipOverrides?: Record<number, Region>;
  /** 已解锁的隐藏女角 ID(如杉本樱子) */
  unlockedHiddenIds?: number[];
}

export interface ScheduleEntry {
  /** 女角 ID */
  heroineId: number;
  /** 女角姓名 */
  heroineName: string;
  /** 是否因日期覆盖解锁 */
  newlyUnlocked: boolean;
  /** 是否因关系覆盖常驻 */
  relationshipOverride: boolean;
}

// ───────────────────────────────────────────────────────────
//  日程引擎
// ───────────────────────────────────────────────────────────

export class ScheduleEngine {
  /**
   * 查询当日某时段某区域的可遇女角列表
   *
   * 步骤:
   *  1. 从 DEFAULT_SCHEDULE 取基础列表
   *  2. 应用 DATE_OVERRIDES.locked(过滤锁定女角)
   *  3. 应用 WEEKDAY_OFFS(过滤周间休假)
   *  4. 应用关系覆盖(追加常驻女角)
   *  5. 过滤隐藏女角(未解锁的不出现)
   */
  getAvailableHeroines(query: ScheduleQuery): ScheduleEntry[] {
    const { dayCount, timeSlot, region } = query;

    // 1. 基础列表
    const base = DEFAULT_SCHEDULE[timeSlot]?.[region] ?? [];
    const baseSet = new Set(base);

    // 2. 日期覆盖:过滤锁定女角
    const dateOverride = DATE_OVERRIDES[dayCount];
    const lockedSet = new Set(dateOverride?.locked ?? []);

    // 3. 周间休假
    const weekday = query.weekday ?? DAY_TO_WEEKDAY[dayCount] ?? '周六';
    const offSet = new Set(WEEKDAY_OFFS[weekday] ?? []);

    // 4. 关系覆盖:追加常驻女角
    const relOverride = query.relationshipOverrides ?? {};
    const unlockedHidden = new Set(query.unlockedHiddenIds ?? []);

    // 5. 合并:基础列表 + 关系覆盖中指定本区域的女角
    const resultIds = new Set<number>();
    for (const id of baseSet) {
      if (lockedSet.has(id)) continue;
      if (offSet.has(id)) continue;
      // 隐藏女角过滤
      const h = HEROINE_LIST.find((x) => x.id === id);
      if (h?.hidden && !unlockedHidden.has(id)) continue;
      resultIds.add(id);
    }
    // 关系覆盖:如果女角常驻本区域,且未被日期锁定
    for (const [idStr, overrideRegion] of Object.entries(relOverride)) {
      const id = Number(idStr);
      if (overrideRegion !== region) continue;
      if (lockedSet.has(id)) continue;
      const h = HEROINE_LIST.find((x) => x.id === id);
      if (h?.hidden && !unlockedHidden.has(id)) continue;
      resultIds.add(id);
    }

    // 构造结果
    return Array.from(resultIds).sort((a, b) => a - b).map((id) => ({
      heroineId: id,
      heroineName: HEROINE_ID_MAP[id] ?? `未知女角${id}`,
      newlyUnlocked: dateOverride?.newUnlock?.includes(id) ?? false,
      relationshipOverride: relOverride[id] === region,
    }));
  }

  /**
   * 获取当日可遇女角全集(所有时段所有区域合并)
   */
  getDayHeroines(
    dayCount: number,
    options?: {
      weekday?: string;
      relationshipOverrides?: Record<number, Region>;
      unlockedHiddenIds?: number[];
    },
  ): ScheduleEntry[] {
    const all = new Map<number, ScheduleEntry>();
    const slots: TimeSlot[] = ['早', '上午', '下午', '晚', '深夜'];
    const regions: Region[] = [
      '自宅周边',
      '八十八学园',
      '八十八町商业区',
      '八十八海岸',
      '温泉乡',
      '88市民医院',
      '保育园',
    ];

    for (const slot of slots) {
      for (const region of regions) {
        const entries = this.getAvailableHeroines({
          dayCount,
          timeSlot: slot,
          region,
          weekday: options?.weekday,
          relationshipOverrides: options?.relationshipOverrides,
          unlockedHiddenIds: options?.unlockedHiddenIds,
        });
        for (const e of entries) {
          if (!all.has(e.heroineId)) {
            all.set(e.heroineId, e);
          }
        }
      }
    }
    return Array.from(all.values()).sort((a, b) => a.heroineId - b.heroineId);
  }

  /**
   * 获取某女角在某日的所有出现位置
   *  - 返回 [{ timeSlot, region }] 列表
   *  - 用于 NPC 自然行动:确定女角当日行程
   */
  getHeroineDaySchedule(
    heroineId: number,
    dayCount: number,
    options?: {
      weekday?: string;
      relationshipOverrides?: Record<number, Region>;
      unlockedHiddenIds?: number[];
    },
  ): Array<{ timeSlot: TimeSlot; region: Region }> {
    const result: Array<{ timeSlot: TimeSlot; region: Region }> = [];
    const slots: TimeSlot[] = ['早', '上午', '下午', '晚', '深夜'];
    const regions: Region[] = [
      '自宅周边',
      '八十八学园',
      '八十八町商业区',
      '八十八海岸',
      '温泉乡',
      '88市民医院',
      '保育园',
    ];

    for (const slot of slots) {
      for (const region of regions) {
        const entries = this.getAvailableHeroines({
          dayCount,
          timeSlot: slot,
          region,
          weekday: options?.weekday,
          relationshipOverrides: options?.relationshipOverrides,
          unlockedHiddenIds: options?.unlockedHiddenIds,
        });
        if (entries.some((e) => e.heroineId === heroineId)) {
          result.push({ timeSlot: slot, region });
        }
      }
    }
    return result;
  }

  /**
   * 获取日期覆盖信息
   */
  getDateOverride(dayCount: number): DateOverride | undefined {
    return DATE_OVERRIDES[dayCount];
  }

  /**
   * 女角 ID → 姓名
   */
  idToName(id: number): string {
    return HEROINE_ID_MAP[id] ?? `未知女角${id}`;
  }

  /**
   * 姓名 → 女角 ID
   */
  nameToId(name: string): number | undefined {
    return HEROINE_NAME_TO_ID[name];
  }
}

// 单例
export const scheduleEngine = new ScheduleEngine();
