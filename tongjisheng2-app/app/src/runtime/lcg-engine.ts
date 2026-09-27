/**
 * LCG 确定性骰子引擎（阶段2）
 *
 * 对齐原卡《LCG骰子/引擎.txt》：
 *  - 种子 = 天数×5 + 时段序号 + 女角ID×7919 + 章节序号×13
 *  - 迭代 = (_s * 1664525 + 1013904223) | 0
 *  - 输出 = (_s >>> 0) / 4294967296
 *
 * 同种子 + 同盐 = 同序列。战斗/冲突等随机判定必须走本引擎，
 * 不再使用 Math.random，保证存档可复现、同输入同结果。
 */

/** 时段中文 → 序号（与源卡一致） */
const TIME_SLOT_INDEX: Record<string, number> = {
  早: 0,
  上午: 1,
  下午: 2,
  晚: 3,
  深夜: 4,
};

/** 章节中文 → 序号（与源卡一致） */
const CHAPTER_INDEX: Record<string, number> = {
  寒假前奏: 0,
  寒假核心: 1,
  寒假尾声: 2,
  结局: 3,
};

/** 种子输入 */
export interface LcgSeed {
  /** 寒假天数 1-17 */
  day: number;
  /** 时段中文或 0-4 序号 */
  timeSlot?: string | number;
  /** 女角 ID（0=无对话女角） */
  heroineId?: number;
  /** 章节中文或 0-3 序号 */
  chapter?: string | number;
  /** 盐：让同一回合的不同用途使用不同序列 */
  salt?: string | number;
}

/** 从 stat_data 提取种子 */
export function seedFromStatData(
  statData: Record<string, unknown>,
  extra?: { heroineId?: number; salt?: string | number },
): LcgSeed {
  const time = (statData.时间 ?? {}) as Record<string, unknown>;
  const scene = (statData.场景 ?? {}) as Record<string, unknown>;
  const current = (statData.当前女角 ?? {}) as Record<string, unknown>;

  const heroineRaw = scene.当前女角id ?? current.heroine_id ?? current.id ?? 0;
  const heroineId = extra?.heroineId ?? (Number(heroineRaw) || 0);

  return {
    day: Number(time.天数) || 1,
    timeSlot: (time.时段 as string | number | undefined) ?? '早',
    heroineId,
    chapter: (time.章节 as string | number | undefined) ?? '寒假前奏',
    salt: extra?.salt,
  };
}

/** 把种子折叠成起始整数 */
export function seedToInt(seed: LcgSeed): number {
  const day = Number(seed.day) || 0;
  const slotIdx =
    typeof seed.timeSlot === 'number'
      ? seed.timeSlot
      : TIME_SLOT_INDEX[String(seed.timeSlot)] ?? 0;
  const chapterIdx =
    typeof seed.chapter === 'number'
      ? seed.chapter
      : CHAPTER_INDEX[String(seed.chapter)] ?? 0;
  const heroineId = Number(seed.heroineId) || 0;
  let s = day * 5 + slotIdx + heroineId * 7919 + chapterIdx * 13;
  if (seed.salt !== undefined) {
    const saltText = String(seed.salt);
    let saltHash = 0;
    for (let i = 0; i < saltText.length; i++) {
      saltHash = (saltHash * 31 + saltText.charCodeAt(i)) | 0;
    }
    s = (s * 33 + saltHash) | 0;
  }
  return s;
}

/** 确定性 LCG 实例 */
export class Lcg {
  private state: number;

  constructor(seed: LcgSeed) {
    this.state = seedToInt(seed);
  }

  /** 下一个 [0,1) 单位随机数 */
  nextUnit(): number {
    this.state = (this.state * 1664525 + 1013904223) | 0;
    return (this.state >>> 0) / 4294967296;
  }

  /** 1d100，返回 1-100 */
  rollD100(): number {
    return Math.floor(this.nextUnit() * 100) + 1;
  }

  /** 闭区间整数随机 [min,max] */
  roll(min: number, max: number): number {
    return min + Math.floor(this.nextUnit() * (max - min + 1));
  }

  /** 概率判定，rate 为 0-1 */
  chance(rate: number): boolean {
    return this.nextUnit() < rate;
  }

  /** 从数组取一项 */
  pick<T>(items: T[]): T {
    if (items.length === 0) throw new Error('Lcg.pick: 空数组');
    return items[Math.floor(this.nextUnit() * items.length)];
  }
}

/** 便捷工厂 */
export function createLcg(seed: LcgSeed): Lcg {
  return new Lcg(seed);
}

/** 从 stat_data 直接掷 1d100 */
export function rollD100FromStatData(
  statData: Record<string, unknown>,
  salt: string | number,
  heroineId?: number,
): number {
  return createLcg(seedFromStatData(statData, { heroineId, salt })).rollD100();
}
