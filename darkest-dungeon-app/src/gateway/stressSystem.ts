// ============================================================
// 暗黑地牢 压力系统核心引擎 v1
// 崩溃 / 美德 / 心脏病发作 判定
// ============================================================

// 压力状态
export type StressState = 'calm' | 'stressed' | 'afflicted' | 'virtuous' | 'heartattack';

// 崩溃状态（负面）— 参考 DD 原版
export interface Affliction {
  id: string;
  name: string;
  description: string;
  effects: string[];
}

// 美德状态（正面）
export interface Virtue {
  id: string;
  name: string;
  description: string;
  effects: string[];
}

// 崩溃判定结果
export interface StressCheckResult {
  rolled: number;         // 骰子结果 (0~1)
  virtueChance: number;   // 美德几率
  isVirtue: boolean;
  isAffliction: boolean;
  affliction?: Affliction;
  virtue?: Virtue;
  heartAttack: boolean;   // 是否心脏病发作
}

// 崩溃的 7 种负面状态
export const AFFLICTIONS: Affliction[] = [
  {
    id: 'paranoia',
    name: '偏执',
    description: '怀疑一切，包括自己的队友',
    effects: ['每回合+1压力给全队', '命中-10%'],
  },
  {
    id: 'masochistic',
    name: '受虐',
    description: '在痛苦中寻求慰藉',
    effects: ['自我治疗10%生命', '但感到灵视的痛苦'],
  },
  {
    id: 'selfish',
    name: '自私',
    description: '只顾自己，背弃同伴',
    effects: ['拒绝治疗他人', '治疗技能失效'],
  },
  {
    id: 'abusive',
    name: '暴躁',
    description: '怒火中烧，攻击同伴',
    effects: ['可能攻击全队随机目标', '命中+10%'],
  },
  {
    id: 'fearful',
    name: '恐惧',
    description: '被黑暗的恐惧所支配',
    effects: ['攻击时可能逃跑', '闪避-10%'],
  },
  {
    id: 'hopeless',
    name: '绝望',
    description: '失去了所有希望',
    effects: ['压力持续上升', '无法被治疗'],
  },
  {
    id: 'irrational',
    name: '非理性',
    description: '理智已崩塌',
    effects: ['随机行动', '命中-15%'],
  },
];

// 美德的 6 种正面状态
export const VIRTUES: Virtue[] = [
  {
    id: 'courageous',
    name: '勇敢',
    description: '无所畏惧，鼓舞众人',
    effects: ['攻击+15%', '压力抗性+20%'],
  },
  {
    id: 'steadfast',
    name: '坚定',
    description: '意志坚如磐石',
    effects: ['免疫恐惧', '闪避+10%'],
  },
  {
    id: 'stalwart',
    name: '坚韧',
    description: '身体与意志皆不可摧',
    effects: ['减伤+20%'],
  },
  {
    id: 'vigorous',
    name: '活力',
    description: '生命之泉涌动而出',
    effects: ['每回合恢复2点生命'],
  },
  {
    id: 'focused',
    name: '专注',
    description: '心无旁骛，全神贯注',
    effects: ['命中+15%', '暴击+5%'],
  },
  {
    id: 'powerful',
    name: '强大',
    description: '力量充盈全身',
    effects: ['伤害+20%'],
  },
];

// 按 id 查找
export function getAfflictionById(id: string | null | undefined): Affliction | undefined {
  if (!id) return undefined;
  return AFFLICTIONS.find((a) => a.id === id);
}

export function getVirtueById(id: string | null | undefined): Virtue | undefined {
  if (!id) return undefined;
  return VIRTUES.find((v) => v.id === id);
}

// 美德几率上限（决心1~5）
const VIRTUE_BASE = 0.25;        // 基础 25%
const VIRTUE_RESOLVE_PENALTY = 0.025; // 每级决心 -2.5%

// 检查压力状态变化（英雄压力 >=100 时触发）
export function checkStressState(
  stress: number,
  resolveLevel: number,
  hasAffliction: boolean,
  hasVirtue: boolean
): { state: StressState; result?: StressCheckResult } {
  // 压力 >= 200：必然心脏病发作
  if (stress >= 200) {
    return {
      state: 'heartattack',
      result: {
        rolled: 1,
        virtueChance: 0,
        isVirtue: false,
        isAffliction: false,
        heartAttack: true,
      },
    };
  }

  // 压力 < 100：冷静 / 有状态则保留
  if (stress < 100) {
    if (hasAffliction) return { state: 'afflicted' };
    if (hasVirtue) return { state: 'virtuous' };
    return { state: stress >= 75 ? 'stressed' : 'calm' };
  }

  // 压力在 100~199 之间：若已有状态则保留现有状态
  if (hasAffliction) return { state: 'afflicted' };
  if (hasVirtue) return { state: 'virtuous' };

  // 否则进行判定
  const virtueChance = clamp(VIRTUE_BASE - resolveLevel * VIRTUE_RESOLVE_PENALTY, 0, 0.25);
  const rolled = Math.random();

  if (rolled < virtueChance) {
    // 美德
    const virtue = VIRTUES[Math.floor(Math.random() * VIRTUES.length)];
    return {
      state: 'virtuous',
      result: {
        rolled,
        virtueChance,
        isVirtue: true,
        isAffliction: false,
        virtue,
        heartAttack: false,
      },
    };
  }

  // 崩溃
  const affliction = AFFLICTIONS[Math.floor(Math.random() * AFFLICTIONS.length)];
  return {
    state: 'afflicted',
    result: {
      rolled,
      virtueChance,
      isVirtue: false,
      isAffliction: true,
      affliction,
      heartAttack: false,
    },
  };
}

// 心脏病发作
// 返回死亡与否。若存活，压力回落到 100，并建议施加"心脏病"debuff
export function heartAttack(hero: {
  uid: string;
  name: string;
  deathsDoorCount?: number;
}): { dead: boolean; stressReset: number } {
  // 死亡抗性：67% 概率死亡
  const dead = Math.random() < 0.67;
  return {
    dead,
    stressReset: 100, // 若存活，压力回落到 100
  };
}

// 获取压力状态中文描述
export function getStressStateName(state: StressState): string {
  switch (state) {
    case 'calm':
      return '冷静';
    case 'stressed':
      return '紧张';
    case 'afflicted':
      return '崩溃';
    case 'virtuous':
      return '美德';
    case 'heartattack':
      return '心脏病发作';
    default:
      return '未知';
  }
}

// 由崩溃/美德 id 获取名称（用于 UI 标签）
export function getStateLabelById(id: string | null | undefined): string {
  const affliction = getAfflictionById(id);
  if (affliction) return affliction.name;
  const virtue = getVirtueById(id);
  if (virtue) return virtue.name;
  return '';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}