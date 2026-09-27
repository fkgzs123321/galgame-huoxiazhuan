// ============================================================
// 血腥诅咒系统（Crimson Court DLC）
//
// 机制：
//  - 感染源：庭院怪物攻击 / 庭院战斗胜利 / 庭院探索事件
//  - 4 阶段演化（每周推进一阶）：
//      dormant 潜伏  → 无效果
//      craving 渴血  → 每周无血液饮用则压力 +10
//      thirst  嗜血  → 战斗伤害 +15%，无血压力 +15，压力获取 +20%
//      ravenous 狂暴 → 战斗伤害 +25%，无血压力 +25，压力获取 +40%
//  - The Blood（血液）：庭院战斗掉落、疫医帐篷出售；饮用可压制一阶并少量减压
//  - 治愈：疫医帐篷花费金币彻底根除
// ============================================================

import type { CrimsonCurseStage, HeroInstance, ProvisionItem } from '@/types';

// ---- The Blood 物品定义 ----

export const THE_BLOOD_ID = 'the_blood';

export const THE_BLOOD_ITEM: Omit<ProvisionItem, 'count'> = {
  id: THE_BLOOD_ID,
  name: '血液',
  type: 'blood',
  description: '深红色的粘稠液体，盛放在青铜小瓶中。饥渴者视之为救赎，凡人视之为诅咒。',
  price: 2500,
};

// ---- 阶段信息 ----

export interface CurseStageInfo {
  id: CrimsonCurseStage;
  name: string;
  description: string;
  dmgMod: number;         // 战斗伤害修正（+%）
  stressGainMod: number;  // 战斗压力获取修正（+%）
  weeklyStress: number;   // 周结算未供血的压力惩罚
  tone: 'gold' | 'blood' | 'darkred';
}

export const CURSE_STAGES: Record<CrimsonCurseStage, CurseStageInfo> = {
  dormant: {
    id: 'dormant',
    name: '潜伏',
    description: '诅咒沉眠于血脉之中，尚未显现。',
    dmgMod: 0,
    stressGainMod: 0,
    weeklyStress: 0,
    tone: 'gold',
  },
  craving: {
    id: 'craving',
    name: '渴血',
    description: '血液在耳畔低语。若不饮下鲜血，心智将被侵蚀。',
    dmgMod: 0,
    stressGainMod: 0,
    weeklyStress: 10,
    tone: 'gold',
  },
  thirst: {
    id: 'thirst',
    name: '嗜血',
    description: '目光泛起血色。力量在涌动，代价是理智。',
    dmgMod: 0.15,
    stressGainMod: 0.2,
    weeklyStress: 15,
    tone: 'blood',
  },
  ravenous: {
    id: 'ravenous',
    name: '狂暴',
    description: '理智所剩无几。鲜血的饥渴驱使着每一寸肌肉。',
    dmgMod: 0.25,
    stressGainMod: 0.4,
    weeklyStress: 25,
    tone: 'darkred',
  },
};

export const CURSE_STAGE_ORDER: CrimsonCurseStage[] = ['dormant', 'craving', 'thirst', 'ravenous'];

// ---- 查询 ----

export function getCurseStage(hero: HeroInstance): CrimsonCurseStage | null {
  return hero.crimsonCurse?.stage ?? null;
}

export function isCursed(hero: HeroInstance): boolean {
  return !!hero.crimsonCurse;
}

// ---- 感染 / 演化 ----

// 施加感染（若已感染则升级一阶）
export function applyInfection(hero: HeroInstance, week: number): HeroInstance {
  const current = hero.crimsonCurse;
  if (!current) {
    return { ...hero, crimsonCurse: { stage: 'dormant', sinceWeek: week } };
  }
  const idx = CURSE_STAGE_ORDER.indexOf(current.stage);
  const next = CURSE_STAGE_ORDER[Math.min(idx + 1, CURSE_STAGE_ORDER.length - 1)];
  return { ...hero, crimsonCurse: { ...current, stage: next } };
}

// 周结算推进：阶段升一阶（狂暴封顶）
export function advanceCurseStage(hero: HeroInstance, week: number): HeroInstance {
  const current = hero.crimsonCurse;
  if (!current) return hero;
  const idx = CURSE_STAGE_ORDER.indexOf(current.stage);
  const next = CURSE_STAGE_ORDER[Math.min(idx + 1, CURSE_STAGE_ORDER.length - 1)];
  return { ...hero, crimsonCurse: { ...current, stage: next, sinceWeek: current.sinceWeek } };
}

// ---- 供血 / 治愈 ----

// 饮用 The Blood：狂暴→嗜血→渴血→潜伏（压一阶），压力 -15
export function drinkBlood(hero: HeroInstance): HeroInstance {
  const current = hero.crimsonCurse;
  if (!current) return hero;
  const idx = CURSE_STAGE_ORDER.indexOf(current.stage);
  const prev = CURSE_STAGE_ORDER[Math.max(idx - 1, 0)];
  return {
    ...hero,
    crimsonCurse: { ...current, stage: prev },
    stress: Math.max(0, hero.stress - 15),
  };
}

// 彻底根除诅咒
export function cureCurse(hero: HeroInstance): HeroInstance {
  const { crimsonCurse: _omit, ...rest } = hero;
  return rest as HeroInstance;
}

// ---- 战斗效果 ----

export interface CurseCombatMods {
  dmgMod: number;
  stressGainMod: number;
}

export function getCurseCombatMods(hero: HeroInstance): CurseCombatMods {
  const stage = getCurseStage(hero);
  if (!stage) return { dmgMod: 0, stressGainMod: 0 };
  const info = CURSE_STAGES[stage];
  return { dmgMod: info.dmgMod, stressGainMod: info.stressGainMod };
}

// ---- 周结算 ----

export interface CurseWeekResult {
  heroes: HeroInstance[];        // 结算后的英雄列表
  notes: string[];               // 日志（无血惩罚 / 阶段演化）
}

// 对所有被诅咒英雄执行周结算：阶段推进 + 无血压力惩罚
export function settleCurses(roster: HeroInstance[], week: number, hasBlood: () => boolean): CurseWeekResult {
  const notes: string[] = [];
  const heroes = roster.map((hero) => {
    if (!isCursed(hero)) return hero;

    const stage = getCurseStage(hero)!;
    const info = CURSE_STAGES[stage];
    const hungry = stage !== 'dormant';

    // 渴血及以后：若库存无血液，压力惩罚
    if (hungry && info.weeklyStress > 0 && !hasBlood()) {
      notes.push(`「${hero.name}」因饥渴无人供奉血液，压力 +${info.weeklyStress}`);
      return {
        ...hero,
        stress: Math.min(200, hero.stress + info.weeklyStress),
      };
    }

    // 若已供血（库存有血），阶段自然推进
    const advanced = advanceCurseStage(hero, week);
    if (advanced.crimsonCurse!.stage !== stage) {
      const nextInfo = CURSE_STAGES[advanced.crimsonCurse!.stage];
      notes.push(`「${hero.name}」的血腥诅咒加深为「${nextInfo.name}」`);
    }
    return advanced;
  });
  return { heroes, notes };
}

// ---- 庭院怪物判定 ----

export function isCrimsonMonster(monsterId: string): boolean {
  return /^(crimson|bloodsucker|mosquito|bloodtick|courtier)/.test(monsterId);
}
