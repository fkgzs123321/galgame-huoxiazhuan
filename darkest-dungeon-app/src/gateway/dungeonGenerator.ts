// ============================================================
// 地牢地图生成引擎 — 生成房间网格、走廊、遭遇
// ============================================================

import type {
  Dungeon,
  DungeonRoom,
  Corridor,
  CorridorEncounter,
  RoomType,
  RoomEncounter,
  QuestGoal,
  ProvisionItem,
} from '@/types';
import type { MonsterData } from '@/types';
import { getRandomCurioId } from '@/gateway/curioSystem';
import {
  REGIONS,
  filterMonstersByRegion,
  type RegionId,
} from '@/gateway/regionSystem';

// ---- 工具函数 ----

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 地牢名称（保持原有等级映射，用于无 region 时的默认逻辑）
const dungeonNames: Record<number, string[]> = {
  1: ['荒废遗迹', '古老地窖', '废弃矿坑'],
  2: ['深渊回廊', '诅咒墓穴', '幽暗洞穴'],
  3: ['血色殿堂', '疯人地宫', '腐朽深处'],
  4: ['黑潮领域', '怨灵深渊', '绝望牢笼'],
  5: ['暗黑地牢', '终极试炼', '末日熔炉'],
};

// 根据区域与等级选择地牢名
function pickDungeonName(region: RegionId | undefined, level: number): string {
  if (region && REGIONS[region]) {
    const regionNames = REGIONS[region].dungeonNames;
    if (regionNames.length > 0) {
      return pick(regionNames);
    }
  }
  const names = dungeonNames[level] || dungeonNames[1];
  return pick(names);
}

// 过滤适合当前等级的怪物
function filterMonstersByLevel(pool: MonsterData[], level: number): MonsterData[] {
  // 排除 boss、祖先、叙事者等特殊怪物
  const regular = pool.filter(
    (m) =>
      !m.id.includes('boss') &&
      !m.id.includes('ancestor') &&
      !m.id.includes('narrator') &&
      !m.id.includes('prop') &&
      m.maxHp > 0 &&
      m.skills.length > 0
  );

  if (regular.length === 0) return [];

  // 按等级筛选 HP 范围
  const hpMin = level <= 2 ? 5 : level <= 4 ? 15 : 25;
  const hpMax = level <= 2 ? 50 : level <= 4 ? 80 : 120;
  const filtered = regular.filter((m) => m.maxHp >= hpMin && m.maxHp <= hpMax);

  // 如果筛选后太少，放宽限制
  if (filtered.length < 3) return regular;
  return filtered;
}

// 生成战斗怪物组（1-4个怪物）
function generateMonsterGroup(monsterPool: MonsterData[]): string[] {
  if (monsterPool.length === 0) {
    // 后备怪物ID
    const fallback = ['bandit', 'skeleton', 'spider', 'cultist'];
    const count = randInt(2, 3);
    return Array.from({ length: count }, () => pick(fallback));
  }
  const count = randInt(2, Math.min(4, monsterPool.length));
  const shuffled = shuffle(monsterPool);
  return shuffled.slice(0, count).map((m) => m.id);
}

// 生成走廊遭遇
function generateCorridorEncounters(
  length: number,
  monsterPool: MonsterData[]
): CorridorEncounter[] {
  const encounters: CorridorEncounter[] = [];
  for (let i = 0; i < length; i++) {
    const roll = Math.random();
    if (roll < 0.4) {
      // 无事发生
      encounters.push({ type: 'nothing', resolved: false });
    } else if (roll < 0.65) {
      // 战斗
      encounters.push({
        type: 'battle',
        resolved: false,
        monsterIds: generateMonsterGroup(monsterPool),
      });
    } else if (roll < 0.85) {
      // 好奇物
      const curioId = getRandomCurioId();
      encounters.push({
        type: 'curio',
        resolved: false,
        curioId,
      });
    } else {
      // 陷阱
      encounters.push({
        type: 'trap',
        resolved: false,
        trapDamage: randInt(2, 6),
        trapStress: randInt(5, 15),
      });
    }
  }
  // 确保至少第一个不是战斗（给玩家喘息）
  if (encounters[0]?.type === 'battle') {
    encounters[0] = { type: 'nothing', resolved: false };
  }
  return encounters;
}

// 生成房间遭遇
function generateRoomEncounter(
  type: RoomType,
  level: number,
  monsterPool: MonsterData[]
): RoomEncounter | undefined {
  switch (type) {
    case 'battle':
      return {
        type: 'battle',
        monsters: generateMonsterGroup(monsterPool),
      };
    case 'boss':
      return {
        type: 'boss',
        monsters: monsterPool.length > 0
          ? [pick(monsterPool.filter((m) => m.maxHp > 40))?.id || pick(monsterPool).id]
          : ['necromancer'],
      };
    case 'treasure': {
      const goldAmount = randInt(500, 2000) * level;
      const loot = [
        { type: 'gold' as const, amount: goldAmount },
        { type: 'heirloom' as const, amount: randInt(1, 3), heirloomType: pick(['bust', 'portrait', 'deed', 'crest']) as 'bust' | 'portrait' | 'deed' | 'crest' },
      ];
      return { type: 'treasure', loot };
    }
    case 'curio': {
      const curioCount = randInt(1, 2);
      const curioIds = Array.from({ length: curioCount }, () => getRandomCurioId());
      return { type: 'curio', curioIds };
    }
    case 'camp':
      return { type: 'camp' };
    default:
      return undefined;
  }
}

// 获取相邻房间坐标（上下左右）
function getNeighbors(x: number, y: number, gridW: number, gridH: number): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = [];
  if (x > 0) neighbors.push({ x: x - 1, y });
  if (x < gridW - 1) neighbors.push({ x: x + 1, y });
  if (y > 0) neighbors.push({ x, y: y - 1 });
  if (y < gridH - 1) neighbors.push({ x, y: y + 1 });
  return neighbors;
}

// 生成任务目标
function generateQuestGoal(questType: string, totalRooms: number, level: number): QuestGoal {
  switch (questType) {
    case 'explore':
      return {
        id: `explore_${level}`,
        type: 'explore',
        description: `探索 ${Math.ceil(totalRooms * 0.6)} 个房间`,
        target: Math.ceil(totalRooms * 0.6),
        progress: 0,
      };
    case 'kill_boss':
      return {
        id: `kill_boss_${level}`,
        type: 'kill_boss',
        description: '消灭地牢深处的BOSS',
        target: 1,
        progress: 0,
      };
    case 'purge':
      return {
        id: `purge_${level}`,
        type: 'purge',
        description: `清除 ${Math.ceil(totalRooms * 0.5)} 个房间中的敌人`,
        target: Math.ceil(totalRooms * 0.5),
        progress: 0,
      };
    case 'collect':
      return {
        id: `collect_${level}`,
        type: 'collect',
        description: `收集 ${3 + level} 件传家宝`,
        target: 3 + level,
        progress: 0,
      };
    default:
      return {
        id: `exit_${level}`,
        type: 'exit',
        description: '到达地牢出口',
        target: 1,
        progress: 0,
      };
  }
}

// ============================================================
// 主生成函数
// ============================================================

export function generateDungeon(
  level: number,
  questType: string,
  monsterPool: MonsterData[],
  region?: RegionId
): Dungeon {
  // 网格大小根据等级
  const gridW = level <= 2 ? 3 : 4;
  const gridH = level <= 2 ? 3 : level <= 4 ? 3 : 4;

  // ---- 区域逻辑 ----
  // 若指定 region，优先使用区域怪物池；否则使用原始怪物池
  const regionDef = region ? REGIONS[region] : undefined;
  const regionPool = regionDef
    ? filterMonstersByRegion(monsterPool, regionDef)
    : monsterPool;
  const levelMonsters = filterMonstersByLevel(regionPool, level);

  // 1. 生成房间网格
  const rooms: DungeonRoom[] = [];
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      rooms.push({
        id: `room_${x}_${y}`,
        x,
        y,
        type: 'empty',
        state: 'unexplored',
        corridors: [],
        curios: [],
      });
    }
  }

  const getRoom = (x: number, y: number) => rooms.find((r) => r.x === x && r.y === y)!;

  // 2. 选择入口和出口
  const entrance = getRoom(0, 0);
  const exit = getRoom(gridW - 1, gridH - 1);
  entrance.type = 'entrance';
  entrance.state = 'current';
  exit.type = questType === 'kill_boss' ? 'boss' : 'exit';

  // 3. 生成走廊（随机DFS生成生成树）
  const corridors: Corridor[] = [];
  const corridorKeySet = new Set<string>();
  const visited = new Set<string>();
  const stack: DungeonRoom[] = [entrance];
  visited.add(entrance.id);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getNeighbors(current.x, current.y, gridW, gridH)
      .map((n) => getRoom(n.x, n.y))
      .filter((r) => !visited.has(r.id));

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = pick(neighbors);
    visited.add(next.id);

    // 创建走廊
    const corridorId = `corridor_${corridors.length}`;
    const length = randInt(1, 3);
    const encounters = generateCorridorEncounters(length, levelMonsters);

    corridors.push({
      id: corridorId,
      fromRoom: current.id,
      toRoom: next.id,
      length,
      state: 'unexplored',
      encounters,
      curios: encounters
        .filter((e) => e.type === 'curio' && e.curioId)
        .map((e) => e.curioId!),
    });

    current.corridors.push(corridorId);
    next.corridors.push(corridorId);
    stack.push(next);
  }

  // 3b. 添加额外走廊（创建环路，使地图更有趣）
  const extraCorridorCount = Math.floor(rooms.length * 0.2);
  for (let i = 0; i < extraCorridorCount; i++) {
    const room = pick(rooms);
    const neighbors = getNeighbors(room.x, room.y, gridW, gridH)
      .map((n) => getRoom(n.x, n.y))
      .filter((r) => {
        const key = [room.id, r.id].sort().join('-');
        return !corridorKeySet.has(key);
      });

    if (neighbors.length === 0) continue;
    const next = pick(neighbors);
    const key = [room.id, next.id].sort().join('-');
    corridorKeySet.add(key);

    const corridorId = `corridor_extra_${i}`;
    const length = randInt(1, 2);
    const encounters = generateCorridorEncounters(length, levelMonsters);

    corridors.push({
      id: corridorId,
      fromRoom: room.id,
      toRoom: next.id,
      length,
      state: 'unexplored',
      encounters,
      curios: encounters
        .filter((e) => e.type === 'curio' && e.curioId)
        .map((e) => e.curioId!),
    });

    room.corridors.push(corridorId);
    next.corridors.push(corridorId);
  }

  // 记录已创建的走廊连接
  for (const c of corridors) {
    const key = [c.fromRoom, c.toRoom].sort().join('-');
    corridorKeySet.add(key);
  }

  // 4. 分配房间类型（入口和出口/Boss已设置）
  const otherRooms = rooms.filter(
    (r) => r.type !== 'entrance' && r.type !== 'exit' && r.type !== 'boss'
  );
  const shuffledRooms = shuffle(otherRooms);

  // 类型分配比例
  let campCount = level >= 3 ? 1 : Math.random() < 0.3 ? 1 : 0;
  let treasureCount = Math.max(1, Math.floor(shuffledRooms.length * 0.15));
  let curioRoomCount = Math.floor(shuffledRooms.length * 0.2);
  let battleRoomCount = Math.floor(shuffledRooms.length * 0.35);

  for (const room of shuffledRooms) {
    if (campCount > 0) {
      room.type = 'camp';
      room.encounter = generateRoomEncounter('camp', level, levelMonsters);
      campCount--;
    } else if (treasureCount > 0) {
      room.type = 'treasure';
      room.encounter = generateRoomEncounter('treasure', level, levelMonsters);
      treasureCount--;
    } else if (curioRoomCount > 0) {
      room.type = 'curio';
      room.encounter = generateRoomEncounter('curio', level, levelMonsters);
      room.curios = room.encounter?.curioIds || [];
      curioRoomCount--;
    } else if (battleRoomCount > 0) {
      room.type = 'battle';
      room.encounter = generateRoomEncounter('battle', level, levelMonsters);
      battleRoomCount--;
    } else {
      room.type = 'empty';
    }
  }

  // 5. 为Boss房间设置遭遇
  if (exit.type === 'boss') {
    exit.encounter = generateRoomEncounter('boss', level, levelMonsters);
  }

  // 6. 生成任务目标
  const questGoal = generateQuestGoal(questType, rooms.length, level);

  // 7. 选择地牢名称（支持区域专属名称）
  const name = pickDungeonName(region, level);

  // 8. 区域初始火把（绯红庭院火把消耗加倍：初始亮度降低）
  const regionOpts = getRegionDungeonOpts(regionDef);
  const initialTorch = regionOpts.torchMul < 1 ? Math.round(100 * regionOpts.torchMul) : 100;

  return {
    id: `dungeon_${level}_${Date.now()}`,
    name,
    level,
    rooms,
    corridors,
    currentRoomId: entrance.id,
    currentCorridorId: null,
    corridorPosition: 0,
    torch: initialTorch,
    steps: 0,
    questGoal,
  };
}

// ---- 区域地牢选项（DLC 特效） ----
interface RegionDungeonOpts {
  torchMul: number;      // 火把消耗倍率（<1 表示初始亮度降低）
  endless: boolean;      // 无尽模式（农场）
  madness: boolean;      // 疯狂效果（疯狂色域）
  brutal: boolean;       // 冥河极难模式
  bleed: boolean;        // 绯红庭院流血强化
}

function getRegionDungeonOpts(regionDef?: { id: RegionId }): RegionDungeonOpts {
  const opts: RegionDungeonOpts = {
    torchMul: 1,
    endless: false,
    madness: false,
    brutal: false,
    bleed: false,
  };
  if (!regionDef) return opts;
  switch (regionDef.id) {
    case 'crimson_court':
      opts.bleed = true;
      opts.torchMul = 0.5; // 火把消耗加倍 → 初始亮度减半
      break;
    case 'farmstead':
      opts.endless = true;
      break;
    case 'color_of_madness':
      opts.madness = true;
      break;
    case 'stygian':
      opts.brutal = true;
      break;
    default:
      break;
  }
  return opts;
}

// 导出区域地牢选项（供战斗/流程系统使用）
export function getDungeonRegionOpts(region?: RegionId): RegionDungeonOpts {
  return getRegionDungeonOpts(region ? REGIONS[region] : undefined);
}

// ============================================================
// 火把效果定义
// ============================================================

export const torchEffects: {
  level: 'radiant' | 'lit' | 'dimming' | 'dark';
  minValue: number;
  maxValue: number;
  name: string;
  playerBuffs: string;
  monsterBuffs: string;
}[] = [
  {
    level: 'radiant',
    minValue: 76,
    maxValue: 100,
    name: '辉煌',
    playerBuffs: '暴击+6%, 伤害+2%, 闪避+5%',
    monsterBuffs: '暴击-6%, 伤害-15%',
  },
  {
    level: 'lit',
    minValue: 51,
    maxValue: 75,
    name: '照明',
    playerBuffs: '暴击+3%, 伤害+1%',
    monsterBuffs: '暴击-3%, 伤害-8%',
  },
  {
    level: 'dimming',
    minValue: 26,
    maxValue: 50,
    name: '黯淡',
    playerBuffs: '暴击+1%',
    monsterBuffs: '暴击+1%, 伤害+1%',
  },
  {
    level: 'dark',
    minValue: 0,
    maxValue: 25,
    name: '黑暗',
    playerBuffs: '无增益',
    monsterBuffs: '暴击+5%, 伤害+3%, 闪避+5%',
  },
];

// 根据火把值获取火把效果
export function getTorchEffectByValue(torch: number) {
  return (
    torchEffects.find((t) => torch >= t.minValue && torch <= t.maxValue) ||
    torchEffects[3]
  );
}

// ============================================================
// 默认补给品定义
// ============================================================

export const defaultProvisions: { id: string; name: string; type: ProvisionItem['type']; description: string; price: number }[] = [
  { id: 'torch', name: '火把', type: 'torch', description: '恢复25点火把亮度', price: 75 },
  { id: 'food', name: '食物', type: 'food', description: '恢复生命值，防止饥饿', price: 75 },
  { id: 'skeleton_key', name: '钥匙', type: 'key', description: '开启宝箱和上锁的容器', price: 75 },
  { id: 'shovel', name: '铲子', type: 'shovel', description: '清除路障和荆棘', price: 75 },
  { id: 'holy_water', name: '圣水', type: 'holy_water', description: '净化邪恶的好奇物', price: 75 },
  { id: 'medicinal_herbs', name: '草药', type: 'medicinal_herbs', description: '处理植物类好奇物', price: 75 },
  { id: 'bandage', name: '绷带', type: 'bandage', description: '止血和处理受伤', price: 75 },
  { id: 'antivenom', name: '解毒剂', type: 'antivenom', description: '解除中毒状态', price: 75 },
];
