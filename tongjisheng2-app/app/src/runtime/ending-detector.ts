/**
 * 结局检测器(纯函数)
 *
 * 职责:
 *  - 从 stat_data 判定当前是否处于结局状态,以及结局类型/ID/标题
 *  - 判定规则对齐 schema.ts 字段与「结局分支矩阵.txt」:
 *    - 隐藏结局:樱子死讯 flag → sakurako_hidden
 *    - 死结局:临时.死结局标识 或 kernel 死结局条件(饥饿/口渴/心情/违法/嫉妒)
 *    - 结局阶段:时间.天数>=17 或 章节='结局' 或 当前日期='01-07'
 *      - 关系阶段=攻略完成 → true_end
 *      - 好感度>=60 → good_end
 *      - 否则 → normal_end
 *
 * 不做:
 *  - 不写入任何状态(周目记录由 achievement-engine.endPlaythrough 负责)
 *  - 不做 88 结局细分矩阵(保持 schema 可判定范围内的近似)
 */

import type { PlaythroughRecord } from './achievement-engine';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export interface EndingDetection {
  /** 结局 ID(对齐成就系统引用,如 true_end_misuzu) */
  endingId: string;
  /** 结局标题 */
  endingTitle: string;
  /** 结局类型 */
  endingType: PlaythroughRecord['endingType'];
  /** 关联女角名(可选) */
  heroineName?: string;
}

/** 女角姓名 → 拼音 slug(用于 endingId,对齐成就数据/行为案例) */
const HEROINE_SLUG: Record<string, string> = {
  鸣泽美佐子: 'misuzu',
  鸣泽亚柚: 'yuzu',
  水野樱子: 'sakurako',
  美纪: 'miki',
  筱原泉美: 'izumi',
  田中美沙: 'misha',
  南川洋子: 'yoko',
  都筑梢江: 'kozue',
  水野友美: 'tomomi',
  安田爱美: 'manami',
  片桐美铃: 'misuzu',
  野野村美里: 'misato',
  永岛久美子: 'kumiko',
  永岛佐知子: 'sachiko',
  齐藤澪: 'mio',
  齐藤澪奈: 'reina',
  铃木美穗: 'miho',
  仁科: 'nishina',
  正树夏子: 'natsuko',
  杉本樱子: 'sakurako',
  舞岛可怜: 'karen',
};

function slugOf(name: string): string {
  if (!name || name === '无' || name === '未知') return 'unknown';
  return HEROINE_SLUG[name] ?? name;
}

function asNum(v: unknown): number {
  return typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) || 0 : 0);
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function asObj(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object') ? v as Record<string, unknown> : {};
}

/** 死结局阈值(与 kernel.ts 保持一致) */
const DEATH_HUNGER = 100;
const DEATH_THIRST = 100;
const DEATH_MOOD = 0;
const DEATH_CRIME = 3;
const DEATH_JEALOUSY = 100;

// ───────────────────────────────────────────────────────────
//  判定函数
// ───────────────────────────────────────────────────────────

/**
 * 检测当前 stat_data 是否处于结局状态
 * @returns 命中返回结局信息,否则 null
 */
export function detectEnding(statData: Record<string, unknown>): EndingDetection | null {
  const hidden = asObj(statData.隐藏);
  const protagonist = asObj(statData.主角);
  const time = asObj(statData.时间);
  const currentHeroine = asObj(statData.当前女角);
  const tmp = asObj(statData.临时);

  // ── 1. 隐藏结局:樱子死讯 ──
  if (hidden.樱子死讯 === true || hidden.樱子死讯 === 1) {
    return {
      endingId: 'sakurako_hidden',
      endingTitle: '隐藏结局 · 樱子的最后一封信',
      endingType: 'hidden',
      heroineName: '水野樱子',
    };
  }

  // ── 2. 死结局 ──
  const deathId = asStr(tmp.死结局标识);
  if (deathId && deathId !== '') {
    return {
      endingId: 'bad_end_any',
      endingTitle: `BAD END · ${deathId}`,
      endingType: 'bad_end',
    };
  }
  const hunger = asNum(protagonist.饥饿);
  const thirst = asNum(protagonist.口渴);
  const mood = asNum(protagonist.心情);
  const crime = asNum(protagonist.违法计数);
  const jealousy = asNum(currentHeroine.嫉妒值);
  if (hunger >= DEATH_HUNGER || thirst >= DEATH_THIRST || mood <= DEATH_MOOD ||
      crime >= DEATH_CRIME || jealousy >= DEATH_JEALOUSY) {
    return {
      endingId: 'bad_end_any',
      endingTitle: 'BAD END',
      endingType: 'bad_end',
    };
  }

  // ── 3. 结局阶段判定 ──
  const day = asNum(time.天数);
  const chapter = asStr(time.章节);
  const date = asStr(time.当前日期);
  const inEndingPhase = day >= 17 || chapter === '结局' || date === '01-07';
  if (!inEndingPhase) return null;

  const heroineName = asStr(currentHeroine.姓名);
  const relationStage = asStr(currentHeroine.关系阶段);
  const favor = asNum(currentHeroine.好感度);
  const slug = slugOf(heroineName);

  if (relationStage === '攻略完成') {
    return {
      endingId: `true_end_${slug}`,
      endingTitle: `True End · ${heroineName}篇`,
      endingType: 'true_end',
      heroineName,
    };
  }
  if (favor >= 60) {
    return {
      endingId: `good_end_${slug}`,
      endingTitle: `Good End · ${heroineName}篇`,
      endingType: 'good_end',
      heroineName,
    };
  }
  return {
    endingId: `normal_end_${slug}`,
    endingTitle: 'Normal End · 平淡的寒假',
    endingType: 'normal_end',
    heroineName,
  };
}

/**
 * 从 stat_data 提取主角六维属性(用于 NG+ 继承)
 */
export function extractPlayerStats(statData: Record<string, unknown> | undefined): Record<string, number> {
  const p = asObj(statData?.主角);
  const keys = ['魅力', '学业', '体力', '社交', '敏感', '声誉'] as const;
  const result: Record<string, number> = {};
  for (const k of keys) {
    const v = asNum(p[k]);
    if (v > 0) result[k] = v;
  }
  return result;
}
