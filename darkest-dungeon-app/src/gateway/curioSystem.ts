// ============================================================
// 好奇物系统 — 定义地牢中的可交互物件
// ============================================================

import type { LootEntry, CurioResult } from '@/types';

export interface CurioInteraction {
  provision?: string;       // 需要使用的补给品ID
  successRate: number;      // 成功率 0~1
  rewards: LootEntry[];     // 成功奖励
  resultText: string;       // 成功描述
  penaltyText?: string;     // 失败/无补给描述
}

export interface CurioDefinition {
  id: string;
  name: string;
  description: string;
  interactions: CurioInteraction[];
  defaultResult: {          // 不使用补给品时的默认结果
    text: string;
    stressChange?: number;  // 压力变化（正=增加压力，负=减少）
    hpChange?: number;      // 生命变化（正=伤害，负=治疗）
    loot?: LootEntry[];
  };
}

// 常见好奇物定义
export const commonCurios: Record<string, CurioDefinition> = {
  chest: {
    id: 'chest',
    name: '宝箱',
    description: '一个布满灰尘的古老宝箱，锁孔似乎还能使用。',
    interactions: [
      {
        provision: 'skeleton_key',
        successRate: 1.0,
        rewards: [
          { type: 'gold', amount: 1500 },
          { type: 'heirloom', amount: 1, heirloomType: 'crest' },
        ],
        resultText: '钥匙完美地插入了锁孔，宝箱应声而开，里面满是财宝！',
        penaltyText: '钥匙断在了锁孔里…但宝箱还是被撬开了。',
      },
    ],
    defaultResult: {
      text: '你试图徒手打开宝箱，锁太紧了。一阵不详的寒气从中渗出。',
      stressChange: 5,
    },
  },

  urn: {
    id: 'urn',
    name: '骨灰瓮',
    description: '一个古老的骨灰瓮，上面刻着晦涩的符文。',
    interactions: [
      {
        provision: 'holy_water',
        successRate: 0.9,
        rewards: [
          { type: 'gold', amount: 1000 },
          { type: 'trinket', amount: 1 },
        ],
        resultText: '圣水净化了瓮中的怨灵，遗物从中显现！',
        penaltyText: '圣水似乎起了作用，但瓮中只飘出了几枚硬币。',
      },
    ],
    defaultResult: {
      text: '你触碰了骨灰瓮，一股阴冷的怨气直冲你的心灵！',
      stressChange: 15,
    },
  },

  cabinet: {
    id: 'cabinet',
    name: '腐朽的柜子',
    description: '一个摇摇欲坠的木柜，门缝中似乎有什么东西。',
    interactions: [
      {
        provision: 'skeleton_key',
        successRate: 0.95,
        rewards: [
          { type: 'gold', amount: 800 },
          { type: 'provision', amount: 2, itemId: 'food' },
        ],
        resultText: '柜子被打开了，里面还有一些完好的补给品！',
      },
      {
        provision: 'shovel',
        successRate: 0.8,
        rewards: [
          { type: 'gold', amount: 500 },
        ],
        resultText: '你用铲子撬开了柜门，里面的东西散落一地。',
        penaltyText: '铲子把柜子砸碎了，只找到了几枚硬币。',
      },
    ],
    defaultResult: {
      text: '你翻找了柜子，但里面只有腐烂的布料和灰尘。',
      stressChange: 3,
    },
  },

  sack: {
    id: 'sack',
    name: '破旧的麻袋',
    description: '一个被丢弃的麻袋，沉甸甸的，里面似乎装着什么。',
    interactions: [
      {
        provision: 'bandage',
        successRate: 0.9,
        rewards: [
          { type: 'gold', amount: 600 },
          { type: 'heirloom', amount: 1, heirloomType: 'portrait' },
        ],
        resultText: '你用绷带小心地包裹双手后打开麻袋，里面有值钱的物件！',
      },
    ],
    defaultResult: {
      text: '你徒手伸入麻袋，被里面的尖刺扎伤了！',
      hpChange: 3,
      stressChange: 2,
    },
  },

  altar: {
    id: 'altar',
    name: '黑暗祭坛',
    description: '一座散发着不祥气息的祭坛，上面残留着干涸的血迹。',
    interactions: [
      {
        provision: 'holy_water',
        successRate: 0.85,
        rewards: [],
        resultText: '圣水净化了祭坛的邪恶力量，你的心灵得到了慰藉。',
        penaltyText: '圣水蒸发了，但邪恶的力量依旧盘踞。',
      },
    ],
    defaultResult: {
      text: '你凝视着祭坛，黑暗的低语在你耳边回荡，侵蚀着你的理智。',
      stressChange: 20,
    },
  },

  bookshelf: {
    id: 'bookshelf',
    name: '发霉的书架',
    description: '一个塞满古旧书籍的书架，书页已经泛黄发脆。',
    interactions: [
      {
        provision: 'medicinal_herbs',
        successRate: 0.8,
        rewards: [
          { type: 'gold', amount: 400 },
          { type: 'heirloom', amount: 1, heirloomType: 'bust' },
        ],
        resultText: '草药清除了书架上的霉菌，你发现了一本有价值的古籍！',
      },
    ],
    defaultResult: {
      text: '你翻阅了书籍，其中记载的禁忌知识让你心神不宁。',
      stressChange: 10,
      loot: [{ type: 'gold', amount: 100 }],
    },
  },

  iron_maiden: {
    id: 'iron_maiden',
    name: '铁处女',
    description: '一个令人毛骨悚然的刑具，门微微敞开。',
    interactions: [
      {
        provision: 'bandage',
        successRate: 0.7,
        rewards: [
          { type: 'gold', amount: 1200 },
          { type: 'trinket', amount: 1 },
        ],
        resultText: '你用绷带包裹双手后搜查了铁处女，找到了隐藏的财宝！',
        penaltyText: '你的手被铁刺划伤，但还是找到了一些东西。',
      },
      {
        provision: 'holy_water',
        successRate: 0.6,
        rewards: [
          { type: 'gold', amount: 800 },
        ],
        resultText: '圣水驱散了铁处女中的怨灵，露出了里面的财宝。',
      },
    ],
    defaultResult: {
      text: '你伸手探入铁处女，尖刺刺穿了你的手指！',
      hpChange: 5,
      stressChange: 8,
    },
  },

  locked_box: {
    id: 'locked_box',
    name: '上锁的箱子',
    description: '一个坚固的小铁箱，锁孔锈迹斑斑。',
    interactions: [
      {
        provision: 'skeleton_key',
        successRate: 0.95,
        rewards: [
          { type: 'gold', amount: 2000 },
          { type: 'heirloom', amount: 2, heirloomType: 'deed' },
        ],
        resultText: '钥匙转动，锁咔哒一声打开，箱中金光闪闪！',
      },
      {
        provision: 'shovel',
        successRate: 0.5,
        rewards: [
          { type: 'gold', amount: 800 },
        ],
        resultText: '你用铲子暴力破开了箱子，里面的东西散落出来。',
        penaltyText: '铲子砸坏了箱子，大部分东西都损坏了。',
      },
    ],
    defaultResult: {
      text: '箱子纹丝不动，你的努力只是徒劳。',
      stressChange: 3,
    },
  },

  bramble: {
    id: 'bramble',
    name: '荆棘丛',
    description: '一团纠缠的荆棘挡住了去路，上面长满了带刺的藤蔓。',
    interactions: [
      {
        provision: 'shovel',
        successRate: 1.0,
        rewards: [
          { type: 'gold', amount: 300 },
          { type: 'heirloom', amount: 1, heirloomType: 'crest' },
        ],
        resultText: '铲子轻松清除了荆棘，下面藏着一些遗物！',
      },
      {
        provision: 'medicinal_herbs',
        successRate: 0.9,
        rewards: [
          { type: 'gold', amount: 200 },
        ],
        resultText: '草药使荆棘枯萎凋零，露出了下面的东西。',
      },
    ],
    defaultResult: {
      text: '你试图徒手拨开荆棘，被刺得满手是血。',
      hpChange: 4,
      stressChange: 2,
    },
  },

  fountain: {
    id: 'fountain',
    name: '干涸的喷泉',
    description: '一座古老的喷泉，水池早已干涸，底部隐约有光泽。',
    interactions: [
      {
        provision: 'medicinal_herbs',
        successRate: 0.85,
        rewards: [
          { type: 'gold', amount: 900 },
          { type: 'heirloom', amount: 1, heirloomType: 'portrait' },
        ],
        resultText: '草药净化了喷泉底部的淤泥，露出了闪亮的财宝！',
      },
    ],
    defaultResult: {
      text: '你在污浊的淤泥中摸索，只摸到了一把黏滑的泥。',
      stressChange: 5,
    },
  },
};

// 好奇物ID列表（用于随机选择）
export const curioIds: string[] = Object.keys(commonCurios);

// 随机获取一个好奇物ID
export function getRandomCurioId(): string {
  return curioIds[Math.floor(Math.random() * curioIds.length)];
}

// 获取好奇物定义
export function getCurioDefinition(id: string): CurioDefinition | undefined {
  return commonCurios[id];
}

// 执行好奇物调查
export function investigateCurio(
  curioId: string,
  provisionUsed?: string
): CurioResult {
  const curio = commonCurios[curioId];
  if (!curio) {
    return {
      success: false,
      rewards: [],
      rewardText: '未知的好奇物，什么也没发生。',
    };
  }

  // 寻找匹配的交互
  const interaction = provisionUsed
    ? curio.interactions.find((i) => i.provision === provisionUsed)
    : undefined;

  if (interaction) {
    // 使用了正确的补给品
    const success = Math.random() < interaction.successRate;
    if (success) {
      return {
        success: true,
        rewards: interaction.rewards,
        rewardText: interaction.resultText,
      };
    } else {
      // 失败了，给少量奖励或惩罚
      return {
        success: false,
        rewards: [{ type: 'gold', amount: 200 }],
        rewardText: interaction.penaltyText || interaction.resultText,
      };
    }
  }

  // 没有使用匹配的补给品，使用默认结果
  const def = curio.defaultResult;
  return {
    success: false,
    rewards: def.loot || [],
    rewardText: def.text,
    penaltyText: def.stressChange || def.hpChange
      ? `${def.hpChange ? `生命${def.hpChange > 0 ? '-' : '+'}${Math.abs(def.hpChange)} ` : ''}${def.stressChange ? `压力+${def.stressChange}` : ''}`
      : undefined,
  };
}

// 补给品名称映射
export const provisionNameMap: Record<string, string> = {
  food: '食物',
  skeleton_key: '钥匙',
  shovel: '铲子',
  torch: '火把',
  medicinal_herbs: '草药',
  bandage: '绷带',
  antivenom: '解毒剂',
  holy_water: '圣水',
};
