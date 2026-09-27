// ============================================================
// 营地技能系统 v1 — 露营/扎营时使用英雄的营地技能
// 所有显示文字均为中文
// ============================================================

import type { HeroInstance, HeroData, MonsterData } from '@/types';
import { getCampSkillName } from '@/data/ddLoader';

// ---- 营地技能类型 ----

export interface CampEffect {
  type:
    | 'heal'
    | 'stress_heal'
    | 'buff'
    | 'scout'
    | 'prevent_ambush'
    | 'remove_bleed'
    | 'remove_blight'
    | 'remove_disease'
    | 'increase_torch'
    | 'reduce_ambush'
    | 'decrease_stress_all'
    | 'buff_all';
  amount?: number;
  target?: string;
  stat?: string;
  duration?: number;
}

export interface CampSkill {
  id: string;
  name: string;
  description: string;
  target: 'self' | 'ally' | 'all';
  effects: CampEffect[];
  isClassSpecific?: boolean;
  classes?: string[];
  usesPerCamp?: number;
}

// ---- 营地技能数据库 ----

export const CAMP_SKILLS: Record<string, CampSkill> = {
  // 通用/共享技能
  wound_care: {
    id: 'wound_care',
    name: '包扎伤口',
    description: '治疗目标 75% 的最大生命值',
    target: 'ally',
    effects: [{ type: 'heal', amount: 0.75 }],
    classes: ['plague_doctor', 'crusader'],
  },
  bandage: {
    id: 'bandage',
    name: '包扎绷带',
    description: '治疗目标 50% 的生命值并止血',
    target: 'ally',
    effects: [{ type: 'heal', amount: 0.5 }, { type: 'remove_bleed', amount: 1 }],
    classes: ['plague_doctor', 'vestal', 'highwayman', 'arbalest'],
  },
  whetstone: {
    id: 'whetstone',
    name: '磨刀石',
    description: '队伍伤害 +15%，持续到战斗结束',
    target: 'all',
    effects: [{ type: 'buff_all', stat: 'dmg', amount: 0.15, duration: 999 }],
    classes: ['highwayman'],
  },
  scout: {
    id: 'scout',
    name: '侦察',
    description: '探明前方道路，降低遭遇战几率',
    target: 'self',
    effects: [{ type: 'scout', amount: 1 }],
    classes: ['highwayman', 'grave_robber', 'houndmaster'],
  },
  meditate: {
    id: 'meditate',
    name: '冥想',
    description: '降低自身 25 点压力',
    target: 'self',
    effects: [{ type: 'stress_heal', amount: 25 }],
    classes: ['vestal', 'occultist', 'leper'],
  },
  pray: {
    id: 'pray',
    name: '祈祷',
    description: '全队压力 -10',
    target: 'all',
    effects: [{ type: 'decrease_stress_all', amount: 10 }],
    classes: ['vestal', 'crusader'],
  },
  vigil: {
    id: 'vigil',
    name: '守夜',
    description: '防止营地被伏击',
    target: 'self',
    effects: [{ type: 'prevent_ambush', amount: 1 }],
    classes: ['flagellant', 'houndmaster', 'man_at_arms'],
  },
  stall: {
    id: 'stall',
    name: '拖延',
    description: '降低伏击几率至 5%',
    target: 'self',
    effects: [{ type: 'reduce_ambush', amount: 1 }],
    classes: ['jester', 'bounty_hunter'],
  },
  encourage: {
    id: 'encourage',
    name: '鼓舞',
    description: '目标压力 -15',
    target: 'ally',
    effects: [{ type: 'stress_heal', amount: 15 }],
    classes: ['crusader'],
  },
  terrify: {
    id: 'terrify',
    name: '威慑',
    description: '降低伏击几率至 5%',
    target: 'self',
    effects: [{ type: 'reduce_ambush', amount: 1 }],
    classes: ['bounty_hunter', 'abomination'],
  },
  drum: {
    id: 'drum',
    name: '战鼓',
    description: '队伍暴击 +10%',
    target: 'all',
    effects: [{ type: 'buff_all', stat: 'crit', amount: 0.1, duration: 999 }],
    classes: ['man_at_arms', 'flagellant'],
  },
  mock: {
    id: 'mock',
    name: '嘲弄',
    description: '降低目标压力，鼓舞士气',
    target: 'ally',
    effects: [{ type: 'stress_heal', amount: 20 }],
    classes: ['jester'],
  },
  inspire: {
    id: 'inspire',
    name: '激励',
    description: '全队压力 -10',
    target: 'all',
    effects: [{ type: 'decrease_stress_all', amount: 10 }],
    classes: ['man_at_arms', 'crusader'],
  },
  protect: {
    id: 'protect',
    name: '守护',
    description: '为队伍立起防御，全队防护 +10%',
    target: 'all',
    effects: [{ type: 'buff_all', stat: 'prot', amount: 0.1, duration: 999 }],
    classes: ['man_at_arms', 'crusader'],
  },
  treat: {
    id: 'treat',
    name: '治疗',
    description: '治疗目标 40% 的生命值',
    target: 'ally',
    effects: [{ type: 'heal', amount: 0.4 }],
    classes: ['vestal', 'plague_doctor', 'arbalest'],
  },
  massage: {
    id: 'massage',
    name: '按摩',
    description: '目标压力 -20',
    target: 'ally',
    effects: [{ type: 'stress_heal', amount: 20 }],
    classes: ['grave_robber', 'jester'],
  },
  sharpening: {
    id: 'sharpening',
    name: '磨砺武器',
    description: '目标伤害 +10%',
    target: 'ally',
    effects: [{ type: 'buff', stat: 'dmg', amount: 0.1, duration: 999 }],
    classes: ['highwayman', 'leper'],
  },
  rest: {
    id: 'rest',
    name: '休整',
    description: '治疗自身 30% 的生命值并降低压力',
    target: 'self',
    effects: [{ type: 'heal', amount: 0.3 }, { type: 'stress_heal', amount: 10 }],
    classes: ['leper', 'hellion'],
  },
  plan: {
    id: 'plan',
    name: '制定计划',
    description: '探明前方道路，降低遭遇战几率',
    target: 'self',
    effects: [{ type: 'scout', amount: 1 }],
    classes: ['antiquarian', 'occultist'],
  },
  // 职业专属其它技能
  self_reflection: {
    id: 'self_reflection',
    name: '自我反思',
    description: '自身压力 -20，防御 +10%',
    target: 'self',
    effects: [{ type: 'stress_heal', amount: 20 }, { type: 'buff', stat: 'prot', amount: 0.1, duration: 999 }],
    classes: ['leper'],
  },
  whip: {
    id: 'whip',
    name: '鞭挞',
    description: '自身压力 -30，获得增益',
    target: 'self',
    effects: [{ type: 'stress_heal', amount: 30 }, { type: 'buff', stat: 'dmg', amount: 0.1, duration: 999 }],
    classes: ['flagellant'],
  },
  hound_training: {
    id: 'hound_training',
    name: '猎犬训练',
    description: '队伍伤害 +10%',
    target: 'all',
    effects: [{ type: 'buff_all', stat: 'dmg', amount: 0.1, duration: 999 }],
    classes: ['houndmaster'],
  },
  dark_ritual: {
    id: 'dark_ritual',
    name: '黑暗仪式',
    description: '全队获得强大增益（压力可控）',
    target: 'all',
    effects: [{ type: 'buff_all', stat: 'dmg', amount: 0.15, duration: 999 }],
    classes: ['occultist'],
  },
  perform: {
    id: 'perform',
    name: '演奏',
    description: '队伍压力 -10',
    target: 'all',
    effects: [{ type: 'decrease_stress_all', amount: 10 }],
    classes: ['jester'],
  },
  dig: {
    id: 'dig',
    name: '挖掘',
    description: '探明前方道路，可能会发现补给',
    target: 'self',
    effects: [{ type: 'scout', amount: 1 }],
    classes: ['grave_robber'],
  },
  bandit_sense: {
    id: 'bandit_sense',
    name: '强盗直觉',
    description: '探明前方道路，降低遭遇战几率',
    target: 'self',
    effects: [{ type: 'scout', amount: 1 }],
    classes: ['highwayman'],
  },
  prayer: {
    id: 'prayer',
    name: '虔诚祷告',
    description: '全队压力 -10',
    target: 'all',
    effects: [{ type: 'decrease_stress_all', amount: 10 }],
    classes: ['vestal'],
  },
  share_knowledge: {
    id: 'share_knowledge',
    name: '分享知识',
    description: '队伍暴击 +10%',
    target: 'all',
    effects: [{ type: 'buff_all', stat: 'crit', amount: 0.1, duration: 999 }],
    classes: ['vestal'],
  },
  experimental_vapours: {
    id: 'experimental_vapours',
    name: '实验蒸汽',
    description: '目标获得随机增益',
    target: 'ally',
    effects: [{ type: 'buff', stat: 'dmg', amount: 0.1, duration: 999 }],
    classes: ['plague_doctor'],
  },
  leeches: {
    id: 'leeches',
    name: '水蛭疗法',
    description: '治疗疾病并恢复生命',
    target: 'ally',
    effects: [{ type: 'remove_disease', amount: 1 }, { type: 'heal', amount: 0.3 }],
    classes: ['plague_doctor'],
  },
  clean_guns: {
    id: 'clean_guns',
    name: '清洁武器',
    description: '目标伤害 +10%',
    target: 'ally',
    effects: [{ type: 'buff', stat: 'dmg', amount: 0.1, duration: 999 }],
    classes: ['highwayman'],
  },
  pep_talk: {
    id: 'pep_talk',
    name: '打气',
    description: '目标压力 -15',
    target: 'ally',
    effects: [{ type: 'stress_heal', amount: 15 }],
    classes: ['crusader'],
  },
  treat_injury: {
    id: 'treat_injury',
    name: '处理伤势',
    description: '治疗目标 50% 的生命值',
    target: 'ally',
    effects: [{ type: 'heal', amount: 0.5 }],
    classes: ['crusader'],
  },
};

// 技能别名 — 将数据源中的技能 id 映射到标准定义 id
const SKILL_ALIASES: Record<string, string> = {
  // 若 heroes.json 使用了不同 id，可在此映射
};

// ---- 获取英雄可用营地技能 ----

export function getCampSkillsForHero(hero: HeroInstance, heroData?: HeroData): CampSkill[] {
  // 优先使用英雄实例上的 campingSkills
  let ids: string[] = [];
  if (hero.campingSkills && hero.campingSkills.length > 0) {
    ids = hero.campingSkills;
  } else if (heroData && heroData.camping_skills) {
    ids = heroData.camping_skills.map((s) => s.id);
  }

  // 去重并解析
  const seen = new Set<string>();
  const result: CampSkill[] = [];
  for (const rawId of ids) {
    const id = SKILL_ALIASES[rawId] || rawId;
    if (seen.has(id)) continue;
    seen.add(id);
    const skill = CAMP_SKILLS[id];
    if (!skill) continue;
    // 若技能定义了职业限定，校验英雄职业
    if (skill.classes && skill.classes.length > 0 && !skill.classes.includes(hero.classId)) {
      continue;
    }
    result.push(skill);
  }
  return result;
}

// 目标文案
export function getSkillTargetLabel(target: CampSkill['target']): string {
  switch (target) {
    case 'self':
      return '自身';
    case 'ally':
      return '队友';
    case 'all':
      return '全队';
    default:
      return '未知';
  }
}

// ---- 营地效果应用 ----

export interface CampActionResult {
  log: string[];
  usedTorch?: number;
  changes: { heroUid: string; hpDelta: number; stressDelta: number }[];
}

export function applyCampEffect(
  hero: HeroInstance,
  allies: HeroInstance[],
  skill: CampSkill,
  targetUid?: string
): CampActionResult {
  const log: string[] = [];
  const changes: { heroUid: string; hpDelta: number; stressDelta: number }[] = [];
  const skillName = skill.name || getCampSkillName(skill.id);

  // 确定受影响的英雄
  let targets: HeroInstance[] = [];
  if (skill.target === 'self') {
    targets = [hero];
  } else if (skill.target === 'all') {
    targets = allies;
  } else if (skill.target === 'ally') {
    const t = allies.find((a) => a.uid === targetUid) || hero;
    targets = [t];
  }

  const mutTargets = targets.map((t) => ({ ...t }));

  for (const effect of skill.effects) {
    switch (effect.type) {
      case 'heal': {
        const pct = effect.amount ?? 0.5;
        for (const t of mutTargets) {
          const heal = Math.floor(t.maxHp * pct);
          const actual = Math.min(t.maxHp - t.currentHp, heal);
          t.currentHp += actual;
          changes.push({ heroUid: t.uid, hpDelta: actual, stressDelta: 0 });
          log.push(`${t.name} 恢复了 ${actual} 点生命值`);
        }
        break;
      }
      case 'stress_heal': {
        const amt = effect.amount ?? 10;
        for (const t of mutTargets) {
          const actual = Math.min(t.stress, amt);
          t.stress = Math.max(0, t.stress - amt);
          changes.push({ heroUid: t.uid, hpDelta: 0, stressDelta: -actual });
          log.push(`${t.name} 压力降低了 ${amt} 点`);
        }
        break;
      }
      case 'decrease_stress_all': {
        const amt = effect.amount ?? 10;
        for (const t of mutTargets) {
          const actual = Math.min(t.stress, amt);
          t.stress = Math.max(0, t.stress - amt);
          changes.push({ heroUid: t.uid, hpDelta: 0, stressDelta: -actual });
        }
        log.push(`全队压力降低了 ${amt} 点`);
        break;
      }
      case 'remove_disease':
        for (const t of mutTargets) {
          if (t.diseases && t.diseases.length > 0) {
            t.diseases = [];
            log.push(`${t.name} 的疾病被治愈了`);
          }
        }
        break;
      case 'remove_bleed':
        log.push(`流血状态已被清除`);
        break;
      case 'remove_blight':
        log.push(`中毒状态已被清除`);
        break;
      case 'buff':
      case 'buff_all': {
        const stat = effect.stat || 'dmg';
        const amt = effect.amount ?? 0.1;
        const statName = statNameMap[stat] || stat;
        log.push(`队伍「${statName}」提升 ${Math.round(amt * 100)}%`);
        break;
      }
      case 'scout':
        log.push(`前方道路已被探明，遭遇战几率降低`);
        break;
      case 'prevent_ambush':
        log.push(`营地戒备森严，伏击已被阻止`);
        break;
      case 'reduce_ambush':
        log.push(`伏击几率大幅降低`);
        break;
      case 'increase_torch': {
        const amt = effect.amount ?? 25;
        log.push(`火把亮度增加 ${amt} 点`);
        break;
      }
      default:
        break;
    }
  }

  return { log, changes, usedTorch: 0 };
}

const statNameMap: Record<string, string> = {
  dmg: '伤害',
  prot: '防护',
  crit: '暴击',
  dodge: '闪避',
  spd: '速度',
  atk: '命中',
};

// ---- 营地伏击机制 ----

export function calculateAmbushChance(
  hasVigil: boolean,
  hasStall: boolean,
  torch: number
): number {
  if (hasVigil) return 0;
  let chance = hasStall ? 5 : 15;
  if (torch < 25) chance += 10;
  return chance;
}

export function pickAmbushMonsters(monsterPool: MonsterData[]): MonsterData[] {
  const pool = monsterPool.filter((m) => m.maxHp > 0 && m.maxHp < 100);
  const source = pool.length > 0 ? pool : monsterPool;
  if (source.length === 0) return [];
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const count = 2 + Math.floor(Math.random() * 2); // 2~3 个
  return shuffled.slice(0, Math.min(count, source.length));
}