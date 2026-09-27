// ============================================================
// 区域系统 — DLC 扩展区域（绯红庭院 / 农场 / 疯狂色域 / 冥河）
// 定义区域类型、解锁条件、怪物池与地牢名映射
// ============================================================

import type { MonsterData } from '@/types';

// ---- 区域类型（DLC 区域 + 基础区域） ----

export type RegionId =
  | 'ruins'
  | 'warrens'
  | 'weald'
  | 'cove'
  | 'crimson_court'
  | 'farmstead'
  | 'stygian'
  | 'color_of_madness';

// ---- 区域定义 ----

export interface Region {
  id: RegionId;
  name: string;
  description: string;
  dlc?: string;              // 所属 DLC（crimson_court / farmstead / color_of_madness / stygian）
  requiredQuest: number;     // 需要完成的任务数才能解锁
  levelRange: [number, number]; // 地牢等级范围
  ambient: string;           // 氛围描述
  monsterPrefixes: string[]; // 怪物 ID 前缀
  dungeonNames: string[];    // 区域地牢名
  bossId?: string;           // 区域 BOSS
  unlocked: boolean;         // 是否解锁
}

// ---- DLC 名称映射 ----

export const DLC_NAMES: Record<string, string> = {
  crimson_court: '绯红庭院',
  farmstead: '农场',
  color_of_madness: '疯狂色域',
  stygian: '冥河',
};

// ---- 区域配置 ----

export const REGIONS: Record<RegionId, Region> = {
  ruins: {
    id: 'ruins',
    name: '荒废遗迹',
    description: '古老而腐朽的遗迹，遍布白骨与亡者的低语',
    requiredQuest: 0,
    levelRange: [1, 5],
    ambient: '尘封的墓穴气息弥漫在空气中，石板下传来亡灵的呜咽。',
    monsterPrefixes: ['skeleton', 'bone', 'cultist'],
    dungeonNames: ['荒废遗迹', '古老地窖', '废弃陵寝'],
    bossId: 'necromancer',
    unlocked: true,
  },
  warrens: {
    id: 'warrens',
    name: '兽穴',
    description: '肮脏的地下巢穴，腐肉与粪便的气味令人窒息',
    requiredQuest: 0,
    levelRange: [1, 5],
    ambient: '肮脏的泥浆没过头颅，猪猡的嘶吼在黑暗中回荡。',
    monsterPrefixes: ['swine', 'pig', 'goblin'],
    dungeonNames: ['兽穴', '肮脏巢穴', '血腥屠场'],
    bossId: 'swine_prince',
    unlocked: true,
  },
  weald: {
    id: 'weald',
    name: '林地',
    description: '被瘟疫侵蚀的森林，藤蔓缠绕着扭曲的古树',
    requiredQuest: 0,
    levelRange: [1, 5],
    ambient: '腐叶与瘴气交织，林间弥漫着挥之不去的腐臭。',
    monsterPrefixes: ['hag', 'crone', 'spider', 'fungal', 'virago'],
    dungeonNames: ['林地', '腐化树海', '瘟疫森林'],
    bossId: 'hag',
    unlocked: true,
  },
  cove: {
    id: 'cove',
    name: '海湾',
    description: '被诅咒的海岸洞穴，潮汐带着死亡的咸腥',
    requiredQuest: 0,
    levelRange: [1, 5],
    ambient: '咸湿的海风钻进岩缝，潮水之下潜伏着半鱼半人的怪物。',
    monsterPrefixes: ['fishman', 'crab', 'piranha', 'drowned', 'jellyfish', 'octotank'],
    dungeonNames: ['海湾', '沉船湾', '潮汐洞穴'],
    bossId: 'siren',
    unlocked: true,
  },
  crimson_court: {
    id: 'crimson_court',
    name: '绯红庭院',
    description: '被鲜血诅咒的贵族庭院，藤蔓缠绕着褪色的华服',
    dlc: 'crimson_court',
    requiredQuest: 5,
    levelRange: [3, 5],
    ambient: '血红的薄雾笼罩着庭院，空气中弥漫着甜腻的铁锈味。',
    monsterPrefixes: ['crimson', 'bloodsucker', 'vampire'],
    dungeonNames: ['绯红庭院', '血色殿堂', '饮血花厅'],
    bossId: 'viscount',
    unlocked: false,
  },
  farmstead: {
    id: 'farmstead',
    name: '农场',
    description: '被时间侵蚀的农场，无尽的黑潮在谷仓中翻涌',
    dlc: 'farmstead',
    requiredQuest: 8,
    levelRange: [3, 5],
    ambient: '荒芜的麦田在风中沙沙作响，远处的磨坊缓缓转动。',
    monsterPrefixes: ['farm', 'miller', 'husk'],
    dungeonNames: ['农场', '磨坊', '无尽谷仓'],
    bossId: 'miller',
    unlocked: false,
  },
  color_of_madness: {
    id: 'color_of_madness',
    name: '疯狂色域',
    description: '来自异界的色彩，扭曲着现实与理智的边界',
    dlc: 'color_of_madness',
    requiredQuest: 10,
    levelRange: [4, 5],
    ambient: '妖异的流光在空气中游离，目光所及之处都在缓缓溶解。',
    monsterPrefixes: ['color', 'shard', 'crystal', 'thing'],
    dungeonNames: ['疯狂色域', '异界裂隙', '晶光深渊'],
    bossId: 'thing_from_stars',
    unlocked: false,
  },
  stygian: {
    id: 'stygian',
    name: '冥河',
    description: '禁忌的黑暗区域，唯有最精锐的队伍方能触碰',
    dlc: 'stygian',
    requiredQuest: 12,
    levelRange: [5, 5],
    ambient: '幽暗的河面上浮动着磷火，亡灵在雾中悄声低语。',
    monsterPrefixes: ['shambler', 'paddock', 'abom'],
    dungeonNames: ['冥河', '终极试炼', '黄昏渡口'],
    bossId: 'shambler',
    unlocked: false,
  },
};

// ---- 有序区域列表（用于 UI 展示） ----

export const REGION_ORDER: RegionId[] = [
  'ruins',
  'warrens',
  'weald',
  'cove',
  'crimson_court',
  'farmstead',
  'color_of_madness',
  'stygian',
];

// ---- 获取解锁的区域 ----

export function getUnlockedRegions(questsFinished: number): Region[] {
  return REGION_ORDER.map((id) => {
    const region = REGIONS[id];
    return {
      ...region,
      unlocked: questsFinished >= region.requiredQuest,
    };
  });
}

// ---- 获取区域内怪物池 ----
// 若区域前缀无对应怪物（如 DLC 怪物数据缺失），回退到基础怪物池

export function filterMonstersByRegion(
  pool: MonsterData[],
  region: Region
): MonsterData[] {
  // 先按区域前缀过滤
  const matched = pool.filter((m) =>
    region.monsterPrefixes.some((prefix) => m.id.startsWith(prefix))
  );

  // 若匹配到怪物，直接返回
  if (matched.length > 0) return matched;

  // 回退：返回基础普通怪物（排除特殊怪），保证区域可探索
  const fallback = pool.filter(
    (m) =>
      !m.id.includes('boss') &&
      !m.id.includes('ancestor') &&
      !m.id.includes('narrator') &&
      !m.id.includes('prop') &&
      m.maxHp > 0 &&
      m.skills.length > 0
  );
  return fallback;
}

// ---- 区域特效标签（用于 UI 提示） ----

export interface RegionEffect {
  id: string;
  label: string;
  description: string;
  tone: 'blood' | 'gold' | 'purple' | 'darkred';
}

export function getRegionEffects(region: Region): RegionEffect[] {
  switch (region.id) {
    case 'crimson_court':
      return [
        {
          id: 'bleed',
          label: '嗜血',
          description: '怪物有更高几率施加流血效果，火把消耗翻倍',
          tone: 'blood',
        },
      ];
    case 'farmstead':
      return [
        {
          id: 'endless',
          label: '无尽',
          description: '敌人一波接一波，数量递增，连续击杀获得更多奖励',
          tone: 'gold',
        },
      ];
    case 'color_of_madness':
      return [
        {
          id: 'madness',
          label: '疯狂',
          description: '怪物带有疯狂效果，英雄压力增加更多',
          tone: 'purple',
        },
      ];
    case 'stygian':
      return [
        {
          id: 'brutal',
          label: '冥河',
          description: '极难模式，怪物全属性提高 25%，英雄死亡无法复活',
          tone: 'darkred',
        },
      ];
    default:
      return [];
  }
}

// ---- 区域标记样式（dd-* 哥特风格） ----
// 返回用于 UI 的标记类（无圆角 / 无 emoji / 暗色调）

export interface RegionToneClasses {
  border: string;
  text: string;
  tag: string;
  glow: string;
}

export function getRegionTone(region: Region): RegionToneClasses {
  switch (region.id) {
    case 'crimson_court':
      return {
        border: 'border-dd-red',
        text: 'text-dd-redBright',
        tag: 'dd-tag-negative',
        glow: 'shadow-dd-blood',
      };
    case 'farmstead':
      return {
        border: 'border-dd-borderGold',
        text: 'text-dd-gold',
        tag: 'dd-tag',
        glow: 'shadow-dd-gold',
      };
    case 'color_of_madness':
      return {
        border: 'border-dd-purple',
        text: 'text-dd-purpleBright',
        tag: 'dd-tag',
        glow: 'shadow-dd-gold',
      };
    case 'stygian':
      return {
        border: 'border-dd-red',
        text: 'text-dd-redBright',
        tag: 'dd-tag-negative',
        glow: 'shadow-dd-blood',
      };
    default:
      return {
        border: 'border-dd-border',
        text: 'text-dd-textMuted',
        tag: 'dd-tag',
        glow: '',
      };
  }
}