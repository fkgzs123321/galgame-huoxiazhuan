// ============================================================
// 暗黑地牢独立前端 — 类型定义 v2
// 匹配从 .darkest 文件提取的 JSON 数据结构
// ============================================================

// ---- 英雄数据（从 .info.darkest 提取） ----

export interface HeroSkillEntry {
  id: string;
  level: number;
  type?: string;        // "melee" | "ranged" | "move"
  atk?: number;         // 攻击率 0~1
  dmg?: number;         // 伤害修正 0~1（-0.5 = -50%）
  crit?: number;        // 暴击率 0~1
  heal?: string;        // 治疗值
  launch?: number;      // 发动位置（如 21 = 位置2,1）
  target?: string;      // 目标位置
  target_raw?: string;  // 原始目标字符串
  launch_raw?: string;  // 原始发动字符串
  effects?: string[];
  is_move?: boolean;
  is_stall_invalidating?: string | boolean;
  per_battle_limit?: number;
  per_turn_limit?: number;
  [key: string]: unknown;
}

export interface HeroWeapon {
  name: string;
  atk: number;          // 攻击修正
  dmg_min: number;
  dmg_max: number;
  crit: number;         // 暴击率 0~1
  spd: number;          // 速度修正
  upgradeRequirementCode?: number;
}

export interface HeroArmour {
  name: string;
  def: number;          // 闪避率 0~1
  prot: number;         // 防护值
  hp: number;            // 最大生命值
  spd: number;           // 速度修正
  upgradeRequirementCode?: number;
}

export interface HeroData {
  id: string;
  name: string;
  resistances: Record<string, number>;
  skills: HeroSkillEntry[];
  weapons: HeroWeapon[];
  armour: HeroArmour[];
  tags: string[];
  maxHp: number[];       // 从 armour 提取
  dodge: number[];       // 从 armour.def 提取
  crit: number[];        // 从 weapon.crit 提取
  dmg: { min: number; max: number }[];
  spd: number[];         // 从 weapon.spd 提取
  skill_selection?: Record<string, unknown>;
  generation?: Record<string, unknown>;
  deaths_door?: Record<string, unknown>;
  camping_skills: { id: string }[];
}

// ---- 怪物数据（从 .info.darkest 提取） ----

export interface MonsterSkill {
  id: string;
  type?: string;
  atk?: number;
  dmg_min?: number;
  dmg_max?: number;
  crit?: number;
  launch_raw?: string;
  target_raw?: string;
  effects?: string[];
  [key: string]: unknown;
}

export interface MonsterData {
  id: string;
  name: string;
  monsterClass: string;
  maxHp: number;
  dodge: number;
  prot: number;
  spd: number;
  resistances: Record<string, number>;
  skills: MonsterSkill[];
  size: number;
  enemyType: string | null;
  deathClass?: Record<string, unknown>;
  battleModifiers?: Record<string, unknown>;
}

// ---- 饰品数据 ----

export interface TrinketEntry {
  id: string;
  buffs: string[];
  heroClassRequirements: string[];
  rarity: string;
  price: number;
  limit: number;
  originDungeon: string;
  [key: string]: unknown;
}

export interface TrinketRarity {
  id: string;
  awardCategory: string;
  [key: string]: unknown;
}

export interface TrinketData {
  entries: TrinketEntry[];
  rarities: TrinketRarity[];
}

// ---- 城镇建筑 ----

export interface TownBuildingData {
  id: string;
  [key: string]: unknown;
}

// 建筑ID
export type BuildingId =
  | 'stagecoach'
  | 'nomad_wagon'
  | 'tavern'
  | 'abbey'
  | 'blacksmith'
  | 'guild'
  | 'sanitarium'
  | 'mod_manager'
  | 'sanctum'
  | 'sanctum';

// 建筑运行时状态
export interface BuildingState {
  unlocked: boolean;
  refreshWeek: number;
}

// 供给品（地牢探险用消耗品）
export interface ProvisionItem {
  id: string;
  name: string;
  type: 'food' | 'key' | 'shovel' | 'torch' | 'herbs' | 'bandage' | 'antivenom' | 'holy_water' | 'medicinal_herbs' | 'blood';
  description: string;
  price: number;
  count: number;
}

// ---- 任务相关 ----

// 地牢运行时任务目标（由地牢生成器产生，记录探索进度）
export interface DungeonQuestGoal {
  id: string;
  type: string;
  description?: string;
  target?: number;
  progress?: number;
  [key: string]: unknown;
}

// 保留旧别名以兼容现有代码（指向 DungeonQuestGoal）
export type QuestGoal = DungeonQuestGoal;

// 任务类型
export type QuestType = 'explore' | 'exterminate' | 'purge' | 'collect' | 'boss' | 'escape';

// 任务难度
export type QuestDifficulty = 'novice' | 'veteran' | 'champion';

// 任务目标（任务公告板使用）
export interface QuestObjective {
  type: QuestType;
  description: string;
  targetCount: number;      // 需要完成的目标数量
  currentCount: number;     // 当前完成进度
  roomIds?: string[];       // 需要探索的房间ID（explore类型）
  monsterIds?: string[];    // 需要击杀的怪物ID（exterminate类型）
  itemId?: string;          // 需要收集的物品ID（collect类型）
  bossId?: string;          // BOSS ID（boss类型）
}

// 任务（公告板上可接取的任务）
export interface Quest {
  id: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  dungeonLevel: number;       // 地牢等级 1-5
  goal: QuestObjective;
  rewardGold: number;
  rewardHeirlooms: { type: string; amount: number }[];
  rewardTrinket?: string;     // 奖励饰品ID
  provisionLimit: number;      // 补给品上限
  description: string;
  isCompleted: boolean;
  isFailed: boolean;
  week: number;               // 生成时的周数
}

// 当前可用任务列表
export interface AvailableQuests {
  quests: Quest[];
  week: number;
}

export interface QuestData {
  types: unknown;
  generation: unknown;
  exitPenalty: unknown;
}

// ---- 区域建筑（DLC） ----

export interface DistrictBuilding {
  name: string;
  dlc: string;
  currencyCost: { type: string; amount: number }[];
  currency_cost?: { type: string; amount: number }[];
  buffList: unknown[];
  built: boolean;
  [key: string]: unknown;
}

// ---- 游戏状态 ----

export type GamePhase = 'town' | 'dungeon' | 'dungeon_dispatch' | 'week_transition' | 'battle' | 'battle_setup' | 'quest_board';

// ---- Mod 系统 ----

// Mod 元数据（来自 mod.json）
export interface ModInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  path: string;             // 相对 public/mods 的路径，如 'my-hero-mod'
}

// Mod 覆盖/扩展的数据（各 JSON 文件可选）
export interface ModData {
  heroes?: Record<string, unknown>[];
  monsters?: Record<string, unknown>[];
  trinkets?: { entries: unknown[]; rarities: unknown[] };
  provisions?: ProvisionItem[];
  curios?: Record<string, unknown>[];
  regions?: Record<string, unknown>[];
  quests?: Record<string, unknown>[];
  skills?: Record<string, unknown>[];
}

export interface GameState {
  week: number;
  phase: GamePhase;
  gold: number;
  heirlooms: {
    bust: number;
    portrait: number;
    deed: number;
    crest: number;
  };
  questsFinished: number;
  highestDungeonLevel: number;
}

// ---- 英雄实例（运行时） ----

// 血腥诅咒阶段（Crimson Court DLC）
export type CrimsonCurseStage = 'dormant' | 'craving' | 'thirst' | 'ravenous';

// 血腥诅咒状态
export interface CrimsonCurseState {
  stage: CrimsonCurseStage;
  sinceWeek: number;   // 感染发生时的周数
}

export interface HeroInstance {
  uid: string;
  classId: string;
  name: string;
  resolveLevel: number;       // 0~5
  currentHp: number;
  maxHp: number;
  stress: number;             // 0~200 (100 = 心脏病发作)
  quirks: string[];
  diseases: string[];
  trinket1: string | null;
  trinket2: string | null;
  skills: string[];           // 已选战斗技能（最多7）
  skillLevels?: Record<string, number>;  // 技能升级等级 0~4（可选）
  campingSkills: string[];
  weaponLevel: number;         // 0~4
  armorLevel: number;          // 0~4
  missingUntilWeek: number | null;
  activityLocked: boolean;
  lockedQuirks?: string[];     // 锁定的怪癖ID列表（可选）

  // ---- 压力系统字段（由 stressSystem 管理） ----
  affliction?: string | null;    // 当前崩溃状态ID
  virtue?: string | null;        // 当前美德状态ID
  isDeathsDoor?: boolean;        // 是否在死亡之门
  deathsDoorCount?: number;      // 死亡之门触发次数
  stressState?: 'calm' | 'stressed' | 'afflicted' | 'virtuous' | 'heartattack';  // 当前压力状态
  crimsonCurse?: CrimsonCurseState;  // 血腥诅咒状态（Crimson Court DLC）
}

// ---- 怪物实例（运行时） ----

export interface MonsterInstance {  uid: string;
  classId: string;
  name: string;
  position: number;            // 1~4
  currentHp: number;
  maxHp: number;
  stress: number;
  isStunned: boolean;
  isBleeding: boolean;
  isPoisoned: boolean;
  buffs: string[];
}

// ============================================================
// 地牢探索系统类型
// ============================================================

// 地牢房间类型
export type RoomType = 'battle' | 'treasure' | 'curio' | 'camp' | 'boss' | 'entrance' | 'exit' | 'empty';

// 房间状态
export type RoomState = 'unexplored' | 'explored' | 'cleared' | 'current';

// 走廊遭遇类型
export type CorridorEncounterType = 'battle' | 'curio' | 'trap' | 'nothing';

// 走廊遭遇
export interface CorridorEncounter {
  type: CorridorEncounterType;
  data?: unknown;
  resolved?: boolean;       // 是否已处理
  monsterIds?: string[];    // 战斗遭遇的怪物ID
  curioId?: string;         // 好奇物ID
  trapDamage?: number;      // 陷阱伤害
  trapStress?: number;      // 陷阱压力伤害
}

// 走廊
export interface Corridor {
  id: string;
  fromRoom: string;
  toRoom: string;
  length: number;           // 走廊长度（1-3）
  state: RoomState;
  encounters: CorridorEncounter[];
  curios: string[];         // 好奇物ID列表
}

// 战利品条目
export interface LootEntry {
  type: 'gold' | 'heirloom' | 'trinket' | 'provision';
  amount: number;
  itemId?: string;
  heirloomType?: 'bust' | 'portrait' | 'deed' | 'crest';
}

// 房间遭遇
export interface RoomEncounter {
  type: 'battle' | 'treasure' | 'curio' | 'camp' | 'boss';
  monsters?: string[];      // 怪物ID列表
  loot?: LootEntry[];
  curioIds?: string[];      // 好奇物ID列表
}

// 房间
export interface DungeonRoom {
  id: string;
  x: number;                // 网格X坐标
  y: number;                // 网格Y坐标
  type: RoomType;
  state: RoomState;
  corridors: string[];      // 相连走廊ID
  encounter?: RoomEncounter;
  curios: string[];         // 好奇物ID列表
}

// 地牢
export interface Dungeon {
  id: string;
  name: string;
  level: number;            // 地牢等级 1-5
  region?: string;          // 区域ID（叙事/氛围用，如 'ruins'）
  rooms: DungeonRoom[];
  corridors: Corridor[];
  currentRoomId: string;
  currentCorridorId: string | null;
  corridorPosition: number; // 在走廊中的位置（0=起点）
  torch: number;            // 火把亮度 0-100
  steps: number;            // 已走步数
  questGoal: QuestGoal;
}

// 火把效果等级
export type TorchLevel = 'radiant' | 'lit' | 'dimming' | 'dark';

// 火把效果
export interface TorchEffect {
  level: TorchLevel;
  minValue: number;
  maxValue: number;
  name: string;
  playerBuffs: string;
  monsterBuffs: string;
}

// 地牢日志条目
export interface DungeonLogEntry {
  step: number;
  text: string;
  type: 'info' | 'battle' | 'treasure' | 'curio' | 'trap' | 'warning' | 'narrative';
}

// 待处理的战斗
export interface PendingBattle {
  monsterIds: string[];
  source: 'room' | 'corridor';
  sourceId: string;
}

// ---- 世界观/人物志（world_lore.json / hero_profiles.json） ----

export interface WorldRegion {
  id: string;
  name: string;
  alias?: string;
  tone?: string;
  description: string;
  enemies: string[];
  bosses: string[];
  lootTheme: string;
}

export interface WorldFaction {
  id: string;
  name: string;
  description: string;
}

export interface WorldLore {
  regions: WorldRegion[];
  factions: WorldFaction[];
  eldritch: { name: string; description: string; worshipers: string[]; artifacts: string[] };
  ancestor: { name: string; description: string; quotes: string[] };
  gameplayCore: Record<string, string>;
}

export interface HeroProfile {
  id: string;
  name: string;
  title: string;
  archetype: string;
  backstory: string;
  tags: string[];
  signatureSkill: string;
  flavor: string;
}

// ---- 模组索引（mod_index.json） ----

export interface ModEntry {
  name: string;
  source?: 'mods' | 'dlc';
  heroCount: number;
  monsterCount: number;
  heroClasses?: string[];
  fileCount?: number;
  nsfw: boolean;
}

export interface ModIndex {
  source: string;
  total: number;
  mods: ModEntry[];
}

// 好奇物调查结果
export interface CurioResult {
  success: boolean;
  rewards: LootEntry[];
  penaltyText?: string;
  rewardText: string;
}
