# 完整设计方案 — 暗黑地牢独立前端 RP 应用

## 1. 方案状态

- 项目/版本：Darkest Dungeon 同人独立前端 RP 应用 / v0.1 设计草案
- 设计范围：核心系统架构设计（地图/战斗/技能/压力/火把/城镇/数据提取/古物/补给品/死亡之门/扎营/DLC/走廊事件）
- 状态：草案
- Task Envelope：darkest-dungeon-app/docs/project-profile-and-draft.md
- 最近更新：2026-08-04

## 2. 目标与非目标

- 作品目标：高度复刻还原 Darkest Dungeon 的完整 RP 体验
- 首版成功体验：玩家作为庄园主招募英雄→进入地牢探索→经历站位战斗→回城治疗→再次出发
- 独立应用边界：Web 浏览器应用，AI 驱动叙事与战斗判定，不依赖 SillyTavern
- 明确非目标：不复制 DD 游戏引擎/图形渲染；不做实时多人；不做商业化
- 关键假设及证据：
  - 假设1：DD `.darkest` 文件可被解析为 JSON 数据 → 证据：已读取 crusader/highwayman/brigand 数据，格式清晰
  - 假设2：AI 可按 DD 数值规则执行 CoT 战斗判定 → 证据：MoRanJiangHu 已验证 CoT 战斗协议可行
  - 假设3：地牢地图可程序化生成 → 证据：DD mash 文件定义了遭遇表+概率，可转为生成规则

## 3. 核心系统实现方案

### 3.1 数据提取层：DD `.darkest` → JSON 数据库

这是整个项目的基础设施——把 DD 原始数据文件转为应用可用的结构化 JSON。

**数据源路径**：`E:\SteamLibrary\steamapps\common\DarkestDungeon\`

**提取方案**：

```
DD .darkest 文件 → Node.js 解析器 → 分类 JSON 文件 → 前端数据层
```

| 数据类型 | 源文件 | 提取产物 | 数据量 |
|---|---|---|---|
| 英雄属性 | `heroes/{name}/{name}.info.darkest` | `heroes.json`（15个英雄×5级武器/护甲×7技能×5级） | ~1500条技能数据 |
| 怪物属性 | `monsters/{name}_{variant}/{name}_{variant}.info.darkest` | `monsters.json`（A/B/C/D/E 变体） | ~500+怪物变体 |
| 遭遇表 | `dungeons/{area}/{area}.{level}.mash.darkest` | `encounters.json`（hall/room/boss/stall） | 5区域×5级 |
| 好奇物 | `curios/curio_type_library.csv` + `curio_props.darkest` | `curios.json`（互动结果表） | ~30种好奇物 |
| 效果定义 | `effects/base.effects.darkest` + `mode.effects.darkest` | `effects.json`（BUFF/DEBUFF/Push/Pull/Stun/Bleed/Blight等） | ~200+效果 |
| 地牢道具 | `dungeons/{area}/{area}.props.darkest` | `dungeon_props.json`（好奇物/陷阱/障碍概率） | 5区域 |
| 本地化 | `localization/schinese.loc2` | `strings.json`（中文文本） | 全部中文文本 |

**解析器示例**（Node.js 脚本，运行在开发阶段，非运行时）：

```javascript
// parse-darkest.js — 解析 DD .darkest 文件为 JSON
const fs = require('fs');
const path = require('path');

// 英雄解析：提取属性、武器、护甲、技能、抗性
function parseHero(heroName, dataDir) {
  const content = fs.readFileSync(
    path.join(dataDir, 'heroes', heroName, `${heroName}.info.darkest`), 'utf8'
  );
  const hero = {
    id: heroName,
    resistances: {},
    weapons: [],      // 5级武器数值
    armours: [],      // 5级护甲数值
    combatSkills: [], // 7个技能×5级
    campingSkills: [],
    tags: [],
    deathsDoor: {}
  };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('resistances:')) {
      // .stun 40% .poison 30% ...
      const matches = trimmed.matchAll(/\.(\w+)\s+(\d+%)/g);
      for (const m of matches) hero.resistances[m[1]] = m[2];
    }
    if (trimmed.startsWith('weapon:')) {
      // .name "crusader_weapon_0" .atk 0% .dmg 6 12 .crit 3% .spd 1
      const weapon = parseDarkestLine(trimmed);
      hero.weapons.push(weapon);
    }
    if (trimmed.startsWith('armour:')) {
      const armour = parseDarkestLine(trimmed);
      hero.armours.push(armour);
    }
    if (trimmed.startsWith('combat_skill:')) {
      const skill = parseDarkestLine(trimmed);
      hero.combatSkills.push(skill);
    }
    // ... 其他类型
  }
  return hero;
}

// 通用解析：.key value .key2 value2 格式 → {key: value, key2: value2}
function parseDarkestLine(line) {
  const obj = {};
  const regex = /\.(\w+)\s+/g;
  // 按属性分割解析
  // ...具体实现
  return obj;
}
```

### 3.2 地图系统：地牢生成与探索

**DD 原始数据结构**（已从 `crypts.1.mash.darkest` 读取验证）：

```
hall:   .chance 2 .types skeleton_common_A skeleton_common_A skeleton_common_A    ← 走廊遭遇
room:   .chance 2 .types skeleton_common_A skeleton_militia_A skeleton_arbalist_A  ← 房间遭遇
boss:   .chance 1 .types necromancer_A                                              ← Boss遭遇
stall:  .chance 2 .types cultist_brawler_A cultist_witch_A                          ← 拖延惩罚遭遇
named:  .name summon_mash_shambler .chance 1 .types shambler_A                       ← 命名特殊遭遇
```

```
hall_curios: .chance 10 .types discarded_pack    ← 走廊好奇物
room_curios: .chance 2 .types suit_of_armor       ← 房间好奇物
room_treasures: .chance 3 .types locked_strongbox ← 房间宝箱
traps: .chance 1 .types spikes                     ← 陷阱
obstacles: .chance 1 .types rubble                 ← 障碍
```

**实现方案**：

地牢地图在 RP 应用中不是实时渲染的 2D 网格，而是**程序化生成的地图节点图 + AI 叙事驱动的探索体验**。

```
1. 地图生成（程序化，非AI）
   → 读取区域 mash 文件（如 crypts.1.mash.darkest）
   → 按概率表生成房间-走廊-房间-走廊...的节点链
   → 每个节点分配遭遇（从hall/room表中按chance权重抽取）
   → 每个走廊/房间分配好奇物（从props文件按chance权重抽取）
   → 生成结果：一张有 N 个房间、M 条走廊的地图，每处都有预设遭遇和物品

2. 探索（AI叙事 + 状态管理）
   → 玩家选择前进方向 → AI 描述走廊/房间环境氛围
   → 遇到遭遇 → 触发战斗系统
   → 遇到好奇物 → 玩家选择互动方式 → 程序按 curio_type_library.csv 概率判定结果
   → 火把逐渐消耗 → 光照梯度变化 → 影响遭遇概率和战斗增益

3. 地图数据结构
   {
     dungeonId: "crypts_1",
     region: "crypts",           // Ruins区域
     level: 1,                   // Apprentice难度
     rooms: [
       { id: 0, type: "entrance", connections: [1] },
       { id: 1, type: "room", encounter: {...}, curios: [...], connections: [0, 2, 3] },
       ...
     ],
     corridors: [
       { id: 0, from: 0, to: 1, length: 3, curios: [...], trap: {...}, obstacle: {...} },
       ...
     ],
     torchLevel: 100,            // 火把光照 0-100
     exploredRooms: [0],         // 已探索房间
     currentRoom: 0
   }
```

**关键设计决策**：
- 地图生成是**程序化的**，不是 AI 生成的——保证数值精确（遭遇概率、好奇物概率严格按 DD 原始数据）
- 探索过程是 **AI 叙事驱动的**——AI 负责描写环境氛围、英雄反应、事件叙事
- 战斗和好奇物结果是**规则判定的**——按 DD 数值表计算，不是 AI 自由发挥

### 3.3 战斗系统：CoT 判定 + DD 数值

这是最核心的系统。参考 MoRanJiangHu 的 8 阶段 CoT 协议，但数值规则完全使用 DD 原作。

**DD 战斗核心规则**（从 `.info.darkest` 文件提取）：

| 规则 | 来源数据 | 示例 |
|---|---|---|
| 站位 | `.launch` 和 `.target` | Crusader Smite: launch=21（可在2/1位）, target=12（打1/2位） |
| 命中率 | `.atk` | Smite Level 0: 85% 命中 |
| 伤害 | `.dmg` + 武器 `.dmg` | 武器dmg 6-12 × 技能dmg修正 0% = 6-12伤害 |
| 暴击 | `.crit` + 武器 `.crit` | 武器crit 3% + 技能crit 0% = 3%暴击 |
| 速度 | `.spd`（武器提供） | Crusader 武器 spd 1-3，决定出手顺序 |
| 护甲 | `.prot` + `.def` | Cutthroat prot 0.15（15%减伤）, def 2.5%（闪避） |
| 抗性 | `.stun_resist` 等 | Cutthroat stun_resist 25%（眩晕抗性） |
| 死亡之门 | `deaths_door` | HP归零后触发死亡之门前检定，death_blow 67%概率 |
| 效果 | `.effect` | "Stun 1"→眩晕, "Bleed 1"→流血, "Push 1A"→击退1格 |

**CoT 战斗协议（8阶段，适配 DD）**：

```
Step 0: 战斗初始化
  → 读取英雄站位 [1,2,3,4] 和怪物站位 [1,2,3,4]
  → 按速度(SPD)排序生成行动序列
  → 加载双方完整属性数据

Step 1: 行动者选择技能与目标
  → AI 根据站位、技能可用性、当前战况选择最优技能
  → 检查 launch（技能可用站位）和 target（技能可打站位）
  → 检查资源限制（per_battle_limit 等）

Step 2: 命中判定
  → 基础命中率 = 技能.atk（如 85%）
  → 实际命中率 = 基础 + 英雄BUFF - 目标闪避(def) - 目标抗性
  → 投骰判定命中/未命中

Step 3: 暴击判定
  → 暴击率 = 武器.crit + 技能.crit + BUFF修正
  → 投骰判定暴击
  → 暴击伤害 = 1.5倍（DD原作规则）

Step 4: 伤害计算
  → 基础伤害 = 随机(武器.dmg_low, 武器.dmg_high) × (1 + 技能.dmg百分比)
  → 暴击伤害 = 基础 × 1.5
  → 实际伤害 = 伤害 × (1 - 目标.prot)  ← 护甲减伤
  → DD 伤害公式：finalDmg = max(1, baseDmg * (1 - prot))

Step 5: 效果应用
  → 按 .effect 引用效果定义（如 "Stun 1", "Bleed 1", "Push 1A"）
  → 每个效果有 chance（触发概率）、target（作用于谁）、duration（持续回合）
  → 抗性检定：效果概率 × (1 - 目标对应抗性)
  → 应用 BUFF/DEBUFF/DOT/位移/眩晕等

Step 6: 死亡之门前检定
  → 如果目标 HP ≤ 0 且未死亡 → 进入死亡之门状态
  → 死亡之门前检定：death_blow_resist（默认67%）
  → 通过则存活在1HP，失败则死亡
  → 心脏骤停：压力达到200时触发

Step 7: 状态更新与摘要
  → 更新双方HP/压力/BUFF/站位
  → 生成战斗日志摘要
  → 检查战斗结束条件（一方全灭）

Step 8: 叙事输出
  → AI 基于 Step 1-7 的规则判定结果，生成战斗叙事
  → 叙事包括：技能描写、命中/未命中反馈、伤害数字、效果应用、英雄/怪物反应
```

**关键设计决策**：
- **数值判定是程序化的**：命中率、暴击、伤害、抗性全部按 DD 原始数据计算，AI 不参与数值计算
- **叙事是 AI 驱动的**：AI 接收程序计算的结果，生成有沉浸感的战斗描写
- **技能数据来自 JSON 数据库**：每个技能的 launch/target/atk/dmg/crit/effect 全部从 `.darkest` 提取

### 3.4 技能系统

**DD 技能数据结构**（从 crusader.info.darkest 提取的真实示例）：

```
技能ID: smite（重击）
类型: melee
5级数据:
  Level 0: atk 85%, dmg +0%, crit +0%, launch 21, target 12, effect "Unholy Killer 1"
  Level 1: atk 90%, dmg +0%, crit +1%, launch 21, target 12, effect "Unholy Killer 2"
  Level 2: atk 95%, dmg +0%, crit +2%, launch 21, target 12, effect "Unholy Killer 3"
  Level 3: atk 100%, dmg +0%, crit +3%, launch 21, target 12, effect "Unholy Killer 4"
  Level 4: atk 105%, dmg +0%, crit +4%, launch 21, target 12, effect "Unholy Killer 5"
```

**launch 和 target 编码**：

```
launch "21"  → 英雄可在位置2和位置1使用此技能
target "12"  → 可攻击敌人位置1和位置2
target "~12" → 可攻击敌人位置1和位置2（AE/穿透）
target "@1234" → 可作用于友方位置1-4（治疗类）
launch "4321" → 英雄在任何位置都可用
```

**实现方案**：

```typescript
// 技能数据结构
interface CombatSkill {
  id: string;              // "smite"
  type: 'melee' | 'ranged';
  levels: SkillLevel[];    // 5级数据
  
  // 每级包含
  // level: 0-4
  // atk: number          命中率
  // dmg: number          伤害修正百分比
  // crit: number         暴击修正
  // launch: number[]     可用站位 [2,1]
  // target: number[]     可打目标位 [1,2]
  // effects: string[]    引用效果定义
  // per_battle_limit?: number  每场战斗使用次数限制
  // move?: [number, number]     位移效果 [前进, 后退]
  // heal?: [number, number]     治疗量范围
}

// 效果定义
interface Effect {
  name: string;            // "Push 1A"
  target: 'target' | 'performer' | 'performer_group_other';
  chance: number;          // 100% / 110% / 120%...
  push?: number;           // 击退格数
  pull?: number;           // 拉拽格数
  stun?: boolean;          // 眩晕
  bleed?: [number, number, number]; // [伤害, 持续回合, 每回合伤害]
  blight?: [number, number, number]; // 同上，毒
  buff?: BuffType;         // 属性增减
  duration?: number;       // 持续回合
  on_hit: boolean;
  on_miss: boolean;
}
```

### 3.5 压力系统

DD 标志性机制。压力值 0-200，影响英雄状态。

```
压力阈值:
  0-99:  正常
  100:   压力检定 → 75%概率 Affliction（疯狂）, 25%概率 Virtue（美德）
  100-199: Affliction/Virtue 状态
  200:   心脏骤断 → HP直接归零，进入死亡之门
  
Affliction 类型:
  - Hopeless（绝望）
  - Masochistic（受虐）
  - Abusive（虐待）
  - Irrational（非理性）
  - Paranoid（偏执）
  - Fearful（恐惧）
  - Selfish（自私）
  - Irrelevant（漠然）
  
Virtue 类型:
  - Courageous（勇气）
  - Powerful（力量）
  - Stalwart（坚定）
  - Focused（专注）
  - Vigorous（活力）
  
压力来源（DD原作数值）:
  - 受到攻击: +2~5
  - 暴击受击: +5~10
  - 队友死亡: +20
  - 火把熄灭: +15
  - 走廊陷阱: +10
  - 好奇物负面效果: +10~25
  - 饥饿: +15
  
压力缓解:
  - 暴击: -2 (全队)
  - 击杀敌人: -1 (全队)
  - 好奇物正面效果: -5~15
  - 城镇治疗: -50~100
```

### 3.6 火把系统

```
火把光照梯度 (0-100):
  100-76 (Radiant):    我方暴击+1%, 侦察概率提升, 怪物惊吓概率提升
  75-51 (Dim):         正常状态
  50-26 (Shadowy):    怪物暴击+1%, 我方压力获取+10%
  25-1  (Dark):        怪物暴击+2%, 我方压力获取+20%, 怪物先手概率提升
  0     (Blackout):    怪物暴击+3%, 我方压力获取+30%, 怪物100%先手

火把消耗:
  - 每走一步: -1
  - 走廊遭遇: -2
  - 房间遭遇: -4
  - 火把物品使用: +25/40/75（不同品质）
```

### 3.7 城镇系统

```
城镇建筑（DD原作）:
  - 黑smith（铁匠铺）: 武器/护甲升级
  - Guild（公会）: 技能升级
  - Sanitarium（疗养院）: 治疗疾病/锁定特质
  - Abbey（修道院）: 压力缓解（祈祷/冥想）
  - Tavern（酒馆）: 压力缓解（饮酒/赌博）
  - Stage Coach（驿站）: 招募新英雄
  - Nomad Wagon（流浪商队）: 购买饰品
  - Survivalist（生存家）: 野外露营技能升级
  - Graveyard（墓地）: 查看死亡英雄
  
建筑升级:
  - 每个建筑 0-3 级
  - 升级消耗传家宝（Heirloom）资源
  - 高等级建筑解锁更高等级服务
```

### 3.8 英雄系统

```
英雄完整数据:
  - 基础属性: HP, 速度, 闪避(def), 护甲(prot), 暴击
  - 武器等级 0-4: 每级提升 dmg/crit/spd
  - 护甲等级 0-4: 每级提升 def/hp
  - 战斗技能: 7个可选，每场选7个装备
  - 露营技能: 3-4个
  - 抗性: 眩晕/中毒/流血/疾病/位移/减益/死亡之门前
  - 特质(Quirks): 正面/负面，随机获取，可锁定/治疗
  - 疾病: 负面效果，可治疗
  - 压力值: 0-200
  - 等级: 0-5 (Resolve Level)
  - 标签: heavy/light, religious/non-religious 等

英雄Roster管理:
  - 最多招募数量（受驿站等级影响）
  - 英雄是消耗品——死了就是死了
  - 招募时随机生成姓名、特质
```

### 3.9 古物交互系统

古物（Curio）是地牢探索中玩家可交互的物件——宝箱、祭坛、书架、棺椁等。这是 DD 最具策略深度的系统之一，因为正确的补给品搭配能将"陷阱"变为"宝库"。

**数据来源**：`curios/curio_type_library.csv` + `curios/curio_props.csv`

**提取的 60+ 种古物**，按区域分布：

| 区域 | 代表古物 | 数量 |
|---|---|---|
| Ruins（遗迹） | 上锁箱、灵柩、告解室、圣泉、盔甲架、炼金台 | ~20 |
| Warrens（兽窟） | 骨堆、牺牲石、月酒桶、刀架、餐车 | ~12 |
| Weald（荒野） | 古棺、老树、兽尸、原始泉、行李箱 | ~10 |
| Cove（海湾） | 藤壶箱、潮池、鱼神像、巨蚌、珊瑚 | ~8 |
| Darkest Dungeon | 先祖背包、致谢箱 | ~3 |
| ALL（通用） | 遗弃包、火把架、木箱、麻袋、暗影祭坛 | ~7 |

**古物交互核心架构**：

```typescript
// 古物数据结构
interface Curio {
  id: string;                    // "locked_strongbox"
  name: string;                  // "Locked Strongbox"
  region: 'Ruins' | 'Warrens' | 'Weald' | 'Cove' | 'Darkest Dungeon' | 'ALL';
  classification: 'Good' | 'Mixed' | 'Bad';  // 基础风险等级
  isFullCurio: boolean;          // 是否占满房间（阻止房间战斗）
  tags: string[];                // ['Treasure', 'Haunted', 'Knowledge', ...]

  // 无物品交互时的基础结果表
  baseInteractions: CurioInteractionTable;

  // 使用特定补给品时的交互表
  itemInteractions: Map<SupplyItemId, CurioInteractionTable>;
}

interface CurioInteractionTable {
  // 结果类型及其权重
  entries: CurioResultEntry[];
}

interface CurioResultEntry {
  resultType: CurioResultType;
  weight: number;                // 权重值
  // resultType 对应的具体结果
  results: CurioResult[];
}

type CurioResultType =
  | 'Nothing'      // 无结果
  | 'Loot'         // 战利品（引用 loot 表）
  | 'Quirk'        // 获得特质（正面/负面）
  | 'Effect'       // 效果（Blight/Bleed/Stress/Buff）
  | 'Purge'        // 净化（移除负面特质）
  | 'Scouting'     // 侦查（揭示地图）
  | 'Disease'     // 获得疾病
  | 'Teleport'     // 传送
  | 'Summon';      // 召唤（如暗影祭坛召唤 Shambler）

interface CurioResult {
  type: string;                  // "Blight 1", "Stress 3", "positive", "negative"
  weight: number;                // 子结果权重
  lootTableId?: string;         // 引用的战利品表（A/B/C/CH/CT/GT/H/P/S 等）
  buffId?: string;               // 引用的 buff 定义
  quirkCategory?: 'positive' | 'negative' | 'random';
  diseaseId?: string;
}
```

**结果类型与权重计算**：

```
每个古物有若干 resultType，每个有 weight 值
实际概率 = weight / Σ(所有 weight)

示例：Locked Strongbox（上锁箱）
  Loot:     weight=1  (50%)
  Effect:   weight=1  (50%) → Blight 1(50%) / Bleed 1(50%)

使用 Skeleton Key 后：
  Loot:     weight=3  (100%) → 直接引用 loot 表 A，抽取 3 次
  （Effect 被完全替换）

使用 Shovel 后：
  Loot:     weight=2  (66.7%) → Nothing(50%) + loot A(50%)
  Nothing:  weight=1  (33.3%)
  （有风险但可获取战利品）
```

**补给品-古物交互矩阵**（关键设计）：

| 补给品 | 最佳交互古物 | 效果 |
|---|---|---|
| Skeleton Key | 上锁箱、展示柜、石棺、行李箱 | 将陷阱变为纯战利品 |
| Holy Water | 灵柩、圣泉、告解室、鱼神像、祭坛 | 净化负面特质/获得强力Buff |
| Medicinal Herbs | 月酒桶、餐车、兽尸、珊瑚、炼金台 | 消除毒素/获得战利品 |
| Antivenom | 老树、行李箱、潮池 | 消除毒素/获得战利品 |
| Bandage | 刀架、蛛网、兽尸 | 防止流血/获得战利品 |
| Shovel | 浅墓、藤壶箱、巨蚌、石棺 | 挖掘获取战利品 |
| Torch | 书堆、卷轴、炼金台、暗影祭坛 | 烧毁/制造光源/召唤Shambler |
| Laudanum | — | 用于恐惧类效果抵抗 |

**程序化判定流程**：

```
1. 玩家遇到古物 → 读取古物定义
2. 玩家选择：直接交互 / 使用物品 / 离开
3a. 直接交互 → 查 baseInteractions → 加权随机选取 resultType
3b. 使用物品 → 查 itemInteractions[itemId] → 加权随机选取 resultType
4. 在选定的 resultType 内 → 加权随机选取具体 result
5. 执行结果：
   - Loot → 引用 loot 表，按规则抽取物品
   - Quirk → 按特质池规则获取正面/负面特质
   - Effect → 应用 Blight/Bleed/Stress/Buff
   - Purge → 移除一个负面特质
   - Scouting → 揭示前方 N 个房间
   - Disease → 按疾病池规则获取疾病
   - Summon → 触发特殊战斗
6. AI 叙事 → 描述交互过程和结果
7. 状态更新 → 英雄 HP/压力/特质/Buff → 存档
```

**区域差异化设计**：

```
Ruins 古物特征：多上锁容器 + 宗教场所
  → Key + Holy Water 是核心补给
  → 高概率获得 Heirloom（家纹）

Warrens 古物特征：多腐败食物 + 污秽场所
  → Medicinal Herbs + Bandage 是核心
  → 高概率获得 Provision（食物）

Weald 古物特征：多自然物 + 兽尸
  → Antivenom + Bandage 是核心
  → 高概率获得 Bust（雕像）

Cove 古物特征：多海洋生物 + 珊瑚
  → Medicinal Herbs + Shovel 是核心
  → 高概率获得 Deed（契约）
```

### 3.10 补给品系统

补给品是地牢探索的基础资源管理维度——玩家在出发前用金币购买，在地牢中消耗。

**数据来源**：`campaign/provision/provision.json`

**补给品种类与用途**：

```typescript
interface SupplyItem {
  id: SupplyItemId;
  name: string;
  description: string;
  baseCost: number;              // 基础价格（金币）
  category: 'tool' | 'consumable';
  // 主要用途
  curioInteractions: string[];   // 可交互的古物ID列表
  combatUses?: string[];        // 战斗中使用的效果
  hallwayUses?: string[];       // 走廊中使用的效果
}

type SupplyItemId =
  | 'shovel'           // 铲子：清除障碍物
  | 'antivenom'        // 抗毒剂：解除 Blight
  | 'bandage'          // 绷带：解除 Bleed
  | 'medicinal_herbs'  // 草药：解除疾病/Blight，古物交互
  | 'skeleton_key'     // 骷髅钥匙：开锁
  | 'holy_water'       // 圣水：净化/Buff
  | 'laudanum'         // 鸦片酊：抵抗恐惧
  | 'torch'            // 火把：光源
  | 'firewood'         // 木柴：扎营（长地牢）
  | 'dog_treats'       // 猎犬零食（Houndmaster 专属）
  | 'food';            // 食物：恢复 HP/防止饥饿
```

**补给品商店定价表**（按地牢等级递增）：

| 地牢等级 | 食物 | 铲子 | 抗毒 | 绷带 | 草药 | 钥匙 | 圣水 | 鸦片酊 | 火把 |
|---|---|---|---|---|---|---|---|---|---|
| Lv1 (短) | 18 | 4 | 6 | 6 | 6 | 6 | 6 | 6 | 18 |
| Lv2 (中) | 24 | 6 | 9 | 9 | 9 | 9 | 9 | 9 | 24 |
| Lv3 (长) | 36 | 8 | 12 | 12 | 12 | 12 | 12 | 9 | 36 |
| Lv4 (XL) | 42 | 10 | 15 | 15 | 15 | 15 | 15 | 15 | 42 |
| Lv5 (DD) | 36 | 8 | 12 | 12 | 12 | 12 | 12 | 9 | 36 |

**英雄职业初始补给**（免费）：

| 职业 | 初始物品 | 数量 |
|---|---|---|
| Crusader | Holy Water | 1 |
| Plague Doctor | Antivenom | 1 |
| Grave Robber | Shovel | 1 |
| Arbalest/Musketeer | Bandage | 1 |
| Houndmaster | Dog Treats | 2 |
| Antiquarian | Skeleton Key | 1 |
| Leper | Medicinal Herbs | 1 |
| Jester | Medicinal Herbs | 1 |

**最低食物建议**（按地牢等级）：

| 地牢等级 | 最低食物 |
|---|---|
| Lv0 (教程) | 0 |
| Lv1 (短) | 8 |
| Lv2 (中) | 8 |
| Lv3 (长) | 12 |
| Lv4 (XL) | 12 |
| Lv5 (DD) | 12 |

**火把消耗机制**：

```
火把光度 0-100
  - 每走一步消耗（tile_light_loss）
    clear (>75):  -1/步
    dim (50-75):  -6/步
    dark (0-50):  -6/步
  - 战斗中每回合消耗 1
  - 火把光度影响（darkness 表，见 3.6 火把系统）
  - 玩家可主动使用火把物品补充 +25 光度
  - Shambler's Altar 使用火把 → 召唤 Shambler（黑暗事件）
```

**饥饿系统**（走廊随机事件）：

```
触发条件：走廊行走时按概率触发（base_chance: 7.5%）
  - 光度影响：暗度越高，饥饿概率略增
  - 触发后：
    有食物 → 消耗食物，恢复 HP（5%最大生命）
    无食物 → 全队受到 HP 伤害（20%最大生命）+ 压力伤害
  - 每场地牢最多触发 3-4 次
```

### 3.11 死亡之门系统

当英雄 HP 降至 0 时进入"死亡之门"（Death's Door）状态——这是 DD 标志性的机制，英雄并非直接死亡，而是在生死边缘挣扎。

**数据来源**：`shared/rules.json` + `shared/buffs/base.buffs.json`

**死亡之门触发流程**：

```
1. 英雄受到伤害 → HP 降至 0
2. 进入死亡之门状态
   → 全队受到压力伤害：
     - 自身: 100%概率受到 8 点压力
     - 队友: 25%概率受到 4 点压力
3. 死亡之门期间：
   → 伤害大幅降低（damage_low × 0.5, damage_high × 0.5）
   → 暴击率提升（+9%~14%，受饰品影响）
   → 闪避归零
   → 无法被治疗至超过 1 HP（除非离开死亡之门）
4. 受到任何后续伤害 → 死亡之门检定
   → 100%概率受到 4 点压力（自身）
   → 25%概率队友受到 2 点压力
   → 死亡之门抗性检定：
     基础抗性 + Buff修正 vs 伤害值
     成功 → HP 维持在 0（仍在死亡之门）
     失败 → 英雄死亡（Heart Attack / 心脏病发作）
5. 被治疗至 >0 HP → 离开死亡之门
   → 死亡之门Debuff移除
```

**心脏病发作（Heart Attack）**：

```
当英雄压力达到 200 时触发：
  → 英雄立即受到 100 点 HP 伤害
  → 如果已在死亡之门 → 直接死亡
  → 如果不在死亡之门 → 进入死亡之门
  → 压力重置为 170
```

**死亡之门抗性计算**：

```typescript
interface DeathDoorCheck {
  // 基础抗性（英雄属性）
  baseResist: number;            // 通常 67-87%（受Resolve Level影响）

  // 修正项
  buffModifiers: number[];       // 饰品/Buff提供的抗性加成

  // 最终抗性
  finalResist: number;           // clamp(baseResist + Σ(modifiers), 0, 1)

  // 检定
  roll: number;                  // Math.random()
  success: boolean;              // roll < finalResist → 存活
}
```

**死亡之门Buff系统**：

```typescript
// 死亡之门激活时应用的Buff
const DEATHS_DOOR_BUFFS = {
  damage_low_multiply: 0.5,      // 伤害下限×0.5
  damage_high_multiply: 0.5,     // 伤害上限×0.5
  crit_chance_add: 0.09,         // 暴击+9%（基础）
  // 饰品可修改这些值
};

// 死亡之门饰品修正示例
const TRINKET_MODIFIERS = {
  'TRINKET_at_deaths_door_CRIT_B1': { crit_chance: +0.09 },
  'TRINKET_at_deaths_door_CRIT_B2': { crit_chance: +0.12 },
  'TRINKET_at_deaths_door_CRIT_B3': { crit_chance: +0.14 },
  'TRINKET_at_deaths_door_DMGL_B1': { damage_low: ×0.5 },
  'TRINKET_at_deaths_door_DMGL_B2': { damage_low: ×0.6 },
};
```

**程序化判定流程**：

```
英雄受击 → 程序计算伤害
  → HP <= 0 ?
    → 是 → 触发死亡之门
      → 应用死亡之门Debuff
      → 全队压力结算
      → AI 叙事：英雄倒下，生死一线
    → 否 → 正常伤害结算

死亡之门期间受击 → 程序计算伤害
  → 死亡之门检定
    → roll = Math.random()
    → resist = baseResist + Σ(buffModifiers)
    → roll < resist ?
      → 是 → 存活，HP 维持 0
      → 否 → 英雄死亡
        → AI 叙事：英雄陨落
        → Roster 更新：移除英雄
        → 遗物掉落
```

### 3.12 扎营系统

扎营是长地牢（Medium/Long/XL）中的核心机制——消耗 Firewood 在地牢中休息，使用 Camping Skill 恢复队伍状态，但有被伏击的风险。

**数据来源**：`raid/camping/default.camping_skills.json`

**扎营流程**：

```
1. 玩家在走廊安全区域使用 Firewood
   → 消耗 1 个 Firewood
   → 进入扎营界面
2. 分配 Camping Skill 点数（每场有限）
   → 通用技能池 + 职业专属技能
   → 每个技能有 cost（点数消耗）和 use_limit（使用次数限制）
3. 执行 Camping Skills
   → 按顺序应用效果（治疗/压力恢复/Buff/侦查等）
4. 伏击检定（Ambush Check）
   → 如果未使用防伏击技能 → 按概率被伏击
   → 被伏击：全队被打乱站位 + 惊讶状态
5. 扎营结束 → 返回地牢探索
```

**Camping Skill 数据结构**：

```typescript
interface CampingSkill {
  id: string;                     // "encourage", "first_aid", "pray"
  level: number;                  // 技能等级 0-2
  cost: number;                   // 点数消耗（通常 2-3）
  useLimit: number;               // 每场使用次数限制（通常 1-3）
  effects: CampingEffect[];
  heroClasses: string[];          // 可使用的职业列表（空=全职业）
  upgradeRequirements: UpgradeReq[];
}

interface CampingEffect {
  selection: 'self' | 'individual' | 'party';
  requirements: string[];
  chance: { code: string; amount: number };  // 触发概率
  type: CampingEffectType;
  amount: number;
}

type CampingEffectType =
  | 'stress_heal_amount'              // 压力恢复（固定值）
  | 'health_heal_max_health_percent'  // HP恢复（最大HP百分比）
  | 'remove_bleeding'                 // 移除流血
  | 'remove_poison'                   // 移除中毒
  | 'buff'                            // 附加Buff
  | 'scouting'                        // 侦查地图
  | 'prevent_ambush'                  // 防止伏击
  | 'reduce_torch'                    // 降低火把（特殊技能）
  | 'summon';                         // 召唤（如 Release the Hound）
```

**通用扎营技能一览**（全职业可用）：

| 技能 | 消耗 | 效果 | 说明 |
|---|---|---|---|
| Encourage | 2 | 单体压力恢复 15 | 基础压力恢复 |
| Pep Talk | 2 | 单体压力抗性 Buff -15% | 预防压力 |
| Hobby | 2 | 自身压力恢复 12 | 自我调节 |

**职业专属扎营技能示例**：

| 职业 | 技能 | 消耗 | 效果 |
|---|---|---|---|
| Crusader | Pray | 3 | 全队压力恢复 10 + 防伏击 |
| Crusader | Zealous Vigil | 3 | 自身压力恢复 25 + 夜间Buff |
| Vestal | Sanctuary | 3 | 全队压力恢复 15 |
| Highwayman | Bandit's Sense | 2 | 侦查前方区域 |
| Plague Doctor | Experimental Vapours | 2 | 全队解毒/解流血 |
| Houndmaster | Hounds Watch | 2 | 防止伏击 |
| Hellion | Battle Trance | 2 | 全队伤害Buff |

**扎营点数计算**：

```
基础点数 = 12（Medium地牢） / 16（Long地牢） / 20（XL地牢）
  + 技能等级修正（Camping Trainer 升级后增加）
  + 饰品修正

可分配点数 = 基础点数 + Σ(修正)
每个技能消耗 cost 点 → useLimit 次使用
策略：玩家需在治疗/Buff/防伏击/侦查之间做取舍
```

### 3.13 DLC 专属系统

DD 的 4 个官方 DLC 各自引入了独特的机制系统，必须精准复刻。

**3.13.1 血腥庭院（Crimson Court）**

```
核心机制：血腥诅咒（Crimson Curse）
  - 被感染英雄获得"渴血"状态
  - 分4个阶段：
    1. 潜伏期：无明显效果
    2. 渴血期：需要消耗 The Blood 道具，否则获得负面Buff
    3. 嗜血期：攻击力提升，但压力增加更快
    4. 狂暴期：大幅增益但失控风险

  - The Blood：特殊掉落物，在庭院地牢中获取
  - 治疗方式：庭院BOSS战（伯爵）后获得解药

新增区域：血腥庭院（Crimson Court）
  - 独特的走廊/房间遭遇表
  - 蚊子/血蜱/守卫 等新怪物
  - 专属古物和补给品

新增建筑：疫医帐篷
  - 管理血腥诅咒状态
  - 提供 The Blood 储存
```

**3.13.2 盾击者（Shieldbreaker）**

```
核心机制：噩梦之夜（Nightmare）
  - 在扎营时按概率触发噩梦事件
  - 出现 Shieldbreaker 专属的蛇形敌人
  - 连续 7 个噩梦事件，每个都有独特奖励

新增英雄：Shieldbreaker
  - 独特的站位技能（前排/后排切换）
  - 盾牌格挡机制
  - 专属扎营技能和噩梦事件链

新增道具：Ambrosia（仙馔）
  - 移除正面特质锁定的特殊道具
```

**3.13.3 疯狂之色（Color of Madness）**

```
核心机制：无尽波次（Endless Mode）
  - Farmstead（农场）地牢的无尽战斗模式
  - 每波击败后获得 Crystal（水晶）碎片
  - 水晶可用于购买独特饰品

新增区域：Farmstead（农场/磨坊）
  - 独特的"时间暂停"主题
  - 宇宙尘埃/发光水晶 等新怪物
  - 不使用传统地牢地图，而是波次推进

新增机制：
  - Comet Shard（彗星碎片）：可装备的特殊道具
  - 心理压力替代：在无尽模式中压力机制有变体
  - 波次奖励：每 5 波获得额外补给
```

**3.13.4 屠夫马戏团（Butcher's Circus）**

```
核心机制：PvP 对战
  - 玩家组建队伍与其他玩家的队伍对战
  - 独立的 PvP 角色系统（不影响主游戏角色）
  - 独特的 PvP 技能平衡

新增区域：屠夫马戏团（竞技场）
  - 专属的 PvP 地图和规则
  - 排行榜系统
  - 专属饰品奖励

注意：PvP 模式在独立前端应用中的实现需要特殊设计
  → 可选方案：AI 模拟对手（使用预设队伍）
  → 或：跳过 PvP，聚焦 PvE 内容
```

### 3.14 走廊事件系统

走廊事件是地牢探索中随机触发的非战斗事件。

**数据来源**：`shared/rules.json` → `corridor_return_content`

**事件类型与概率**：

```typescript
interface CorridorEvent {
  type: 'battle' | 'hunger' | 'trap';
  baseChance: number;             // 基础触发概率
  darknessModifier: RangeTable;   // 光度影响修正表
}

// 从 rules.json 提取的走廊事件
const CORRIDOR_EVENTS = {
  battle: {
    baseChance: 0.05,             // 5%基础概率
    // 光度越低，概率越高
    darknessMod: [
      { range: [75, Infinity], value: 0.0 },
      { range: [50, 75],      value: 0.0 },
      { range: [25, 50],      value: 0.025 },
      { range: [0, 25],       value: 0.025 },
      { range: [-Inf, 0],     value: 0.05 },
    ]
  },
  hunger: {
    baseChance: 0.075,            // 7.5%基础概率
    darknessMod: [同上],
    // 每场最多 3-4 次
  },
  trap: {
    baseChance: 0.05,             // 5%基础概率
    darknessMod: [同上],
    // 可被 Scouting 提前发现并绕过
  }
};
```

**陷阱机制**：

```
陷阱触发 →
  陷阱类型（DD数据定义）：
    - HP伤害陷阱
    - 压力伤害陷阱
    - 疾病陷阱
    - 特质陷阱（获得负面特质）

  检定方式：
    英雄的 trap_disarm 抗性 vs 陷阱基础概率
    成功 → 避免陷阱效果
    失败 → 承受陷阱效果

  Scouting 可提前发现陷阱：
    → 玩家可选择绕过或主动解除
```

**回退惩罚**（backing up）：

```
当玩家在走廊中折返（非前进方向）：
  - 每步受到更多压力伤害
  - hallway_per_tile_stress_damage_backing_up: 5.0
  - hallway_per_tile_stress_damage_chance_backing_up: 0.55
  → 正向行走：2.0压力/30%概率
  → 折返行走：5.0压力/55%概率
  → 设计目的：防止玩家反复刷走廊
```

## 4. 系统联动结构

```
[玩家在庄园界面操作]
  → 选择建筑 → 执行建筑功能（升级/招募/治疗/购物）
  → 购买补给品 → 按地牢等级定价表消耗金币
  → 选择地牢任务 → 组队 → 出发（携带补给品）

[玩家在地牢探索]
  → 移动 → 程序化判定火把消耗 → AI 叙事环境
  → 走廊事件 → 程序化判定（饥饿/陷阱/遭遇）→ AI 叙事
  → 遭遇 → 触发战斗系统
  → 古物 → 玩家选择交互方式 → 程序化判定结果 → AI 叙事
  → 扎营 → 消耗Firewood → 分配技能点 → 执行效果 → 伏击检定

[战斗中]
  → AI 按 CoT 8阶段判定（程序计算+AI叙事）
  → 程序计算: 命中/暴击/伤害/效果/死亡门前
  → 死亡之门: HP=0时触发 → Buff应用 → 后续伤害检定
  → AI 叙事: 战斗描写、角色反应
  → 状态更新: HP/压力/BUFF/站位/死亡之门 → 保存

[战斗结束]
  → 战利品生成（程序化，按 DD loot 表）
  → 压力结算
  → 英雄状态更新（特质/疾病可能变化）
  → 死亡英雄 → Roster移除 → 遗物处理
  → 回到庄园 或 继续探索
```

## 5. 权威执行链

```
玩家输入
  → Command 入口（UI 操作）
  → 程序化规则判定（数值计算，非AI）
  → AI 叙事生成（基于判定结果）
  → 候选变化（状态变更候选）
  → 冲突/权限校验（规则验证）
  → 原子提交（状态更新+存档）
  → Projection 展示（UI 刷新）
  → History/Memory 消费（历史记录）
```

**关键原则**：
- 正式状态只能由程序化规则判定改变，AI 不能直接修改数值
- AI 负责叙事包装，不参与数值计算
- 存档在任何状态变更后立即保存（IndexedDB）

## 6. 数据流架构

```
┌─────────────────────────────────────────┐
│           DD 原始数据文件               │
│  (.darkest / .csv / .loc2)             │
└──────────────┬──────────────────────────┘
               │ 开发阶段：Node.js 解析脚本
               ▼
┌─────────────────────────────────────────┐
│           JSON 数据库                    │
│  heroes.json / monsters.json /          │
│  encounters.json / effects.json /       │
│  curios.json / dungeons.json /          │
│  strings.json                           │
└──────────────┬──────────────────────────┘
               │ 打包进应用
               ▼
┌─────────────────────────────────────────┐
│        前端数据层 (Zustand Store)        │
│  ┌──────────┐ ┌──────────┐             │
│  │ 游戏状态  │ │ DD数据库 │             │
│  │ (可变)   │ │ (只读)   │             │
│  └────┬─────┘ └────┬─────┘             │
│       │            │                    │
│  ┌────▼────────────▼─────┐              │
│  │   规则引擎            │              │
│  │   (战斗判定/地图生成/  │              │
│  │    好奇物/压力/火把)   │              │
│  └────────────┬─────────┘              │
│               │                        │
│  ┌────────────▼─────────┐              │
│  │   AI 叙事层           │              │
│  │   (Prompt→模型→流式)  │              │
│  └────────────┬─────────┘              │
│               │                        │
│  ┌────────────▼─────────┐              │
│  │   UI 渲染层          │              │
│  │   (React + shadcn)   │              │
│  └──────────────────────┘              │
└─────────────────────────────────────────┘
```

## 7. 风险与可行性

| 风险/未知 | 影响 | 当前证据 | 缓解或验证 | owner |
|---|---|---|---|---|
| .darkest 解析器开发量 | 中 | 已验证文件格式清晰 | 首版只解析核心字段，逐步完善 | 数据层 |
| AI 叙事与数值判定的配合 | 高 | MoRanJiangHu 已验证 CoT 可行 | 首版先跑通单场战斗 Probe | 战斗系统 |
| 数据量导致包体积过大 | 中 | 15英雄×5级×7技能 ≈ 500KB JSON | 按区域分包懒加载 | 平台层 |
| 多模式(SFW/NSFW)隔离复杂度 | 中 | skill 规定必须全面隔离 | 首版只做 SFW，NSFW 后续迭代 | 内容模式 |

## 8. 验证设计

- 代表性行为案例：
  1. Crusader 在位置1对位置1的 Brigand Cutthroat 使用 Smite → 验证命中/伤害/暴击计算
  2. 走廊探索遇到好奇物"Locked Strongbox"使用 Skeleton Key → 验证好奇物结果表
  3. 英雄压力达到100 → 验证压力检定（Affliction/Virtue）
  4. 地牢地图生成 → 验证遭遇表概率分布
  5. 英雄死亡 → 验证死亡之门检定 + Roster 更新
  6. 上锁箱使用 Skeleton Key → 验证古物交互权重计算
  7. 英雄 HP 降至 0 → 验证死亡之门触发 + Buff应用 + 后续检定
  8. 长地牢扎营 → 验证Camping Skill点数分配 + 伏击检定
  9. 走廊饥饿触发 → 验证食物消耗 + HP恢复/伤害
  10. 血腥庭院地牢 → 验证血腥诅咒阶段切换 + The Blood消耗

## 9. 设计门结论

- 通过项：数据源已验证、DD数值格式清晰、CoT战斗协议有先例、技术栈成熟
- 退回项：无
- 未验证项：.darkest 完整解析器尚未编写（需首版 Probe）
- 建议：进入阶段路线图，首版 Probe = 数据提取脚本 + 单场战斗判定验证

---

## 10. 城镇活动系统（酒馆/修道院/疗养院）

城镇活动系统是英雄压力管理和怪癖/疾病治疗的核心循环，复刻 DD 原版的建筑活动机制。

### 10.1 数据结构

```typescript
// 城镇建筑定义
interface TownBuilding {
  id: string;                         // "tavern" | "abbey" | "sanitarium" | "blacksmith" | "guild" | ...
  name: string;                       // 本地化名称
  unlockRequirements: {
    questsFinished: number;           // 解锁所需完成任务数
    highestDungeonLevel: number;      // 解锁所需最高地牢等级
  };
  activities: TownActivity[];         // 可用活动列表
  upgradeTrees: UpgradeTree[];        // 建筑升级树
  onStartTownVisitPriority: number;   // 周访问优先级（0=最先）
}

// 城镇活动（压力释放/治疗等）
interface TownActivity {
  id: string;                         // "bar" | "meditation" | "prayer" | "treatment" | ...
  name: string;
  category: 'stress_relief' | 'quirk_treatment' | 'disease_treatment' | 'equipment' | 'skill_upgrade';

  // 费用（按建筑升级等级递减）
  costUpgrades: CostUpgrade[];

  // 压力释放值（仅 stress_relief 类别）
  stressUpgrades?: StressHealUpgrade[];

  // 槽位升级（同时可容纳的英雄数）
  slotUpgrades?: SlotUpgrade[];

  // 副作用（压力释放活动独有）
  sideEffects?: {
    chance: number;                   // 触发概率（如 0.375 = 37.5%）
    results: SideEffect[];
  };

  // 参与条件
  requirements?: ActivityRequirement[];

  // 治疗成功率
  treatmentChance?: number;           // 1.0 = 100% 成功
}

// 副作用类型
type SideEffectType =
  | 'activity_lock'       // 活动锁定（英雄本周无法再参加任何城镇活动）
  | 'go_missing'           // 失踪（1-2周后回归）
  | 'add_quirk'            // 获得怪癖
  | 'apply_buff'           // 应用 BUFF/DEBUFF
  | 'remove_currency'      // 损失金币
  | 'add_trinket'          // 获得饰品（稀有度池）
  | 'remove_trinket';      // 失去饰品（稀有度池）

interface SideEffect {
  type: SideEffectType;
  chance: number;                     // 相对权重（非百分比）
  data: SideEffectData;               // 类型特定数据
}

// 升级层级
interface CostUpgrade {
  cost: { type: 'gold'; amount: number };
  upgradeRequirementCode?: string;     // 'a'-'e'，需要对应升级树已解锁
}

interface StressHealUpgrade {
  healLow: number;
  healHigh: number;
  upgradeRequirementCode?: string;
}

interface SlotUpgrade {
  numberOfSlots: number;
  upgradeRequirementCode?: string;
}
```

### 10.2 酒馆（Tavern）— 压力释放

酒馆提供三种压力释放活动，解锁条件：完成 2 个任务。

| 活动 | 基础费用 | 基础压力恢复 | 槽位上限 | 副作用概率 |
|---|---|---|---|---|
| 酒吧 (bar) | 1000g | 45 | 3 | 37.5% |
| 赌博 (gambling) | 750g | 35 | 3 | 37.5% |
| 妓院 (brothel) | 1500g | 60 | 3 | 37.5% |

**酒吧副作用表**（chance 为相对权重，总概率 37.5% 内按权重分配）：

| 副作用 | 相对权重 | 效果 |
|---|---|---|
| activity_lock | 1.0 | 英雄本周锁定，无法再参加城镇活动 |
| go_missing | 2.0 | 75% 失踪 1 周，25% 失踪 2 周 |
| add_quirk (alcoholism) | 1.0 | 获得负面怪癖：酗酒 |
| add_quirk (resolution) | 1.0 | 获得正面怪癖：决心 |
| apply_buff (hungover) | 3.0 | 33% 宿醉（ACC/DEF 降），67% 饮酒增益（HP+） |
| remove_currency | 0.5 | 损失 500g |
| remove_trinket | 1.0 | 按稀有度池失去饰品（高稀有优先） |

**参与条件**：英雄不能已拥有以下怪癖：`resolution`, `gambler`, `love_interest`, `enlightened`, `god_fearing`, `flagellant`。

**升级树**：
- cost: 基础 1000g → 850g (b级) → 700g (e级)
- stress: 45 → 56 (a级) → 70 (d级)
- slots: 1 → 2 (c级) → 3 (f级)

### 10.3 修道院（Abbey）— 压力释放

修道院提供三种压力释放活动，解锁条件：完成 2 个任务。

| 活动 | 基础费用 | 基础压力恢复 | 槽位上限 | 副作用概率 |
|---|---|---|---|---|
| 冥想 (meditation) | 1000g | 45 | 3 | 37.5% |
| 祈祷 (prayer) | 1250g | 55 | 3 | 37.5% |
| 苦修 (flagellation) | 1500g | 70 | 3 | 37.5% |

**冥想副作用表**：

| 副作用 | 相对权重 | 效果 |
|---|---|---|
| activity_lock | 1.0 | 本周活动锁定 |
| go_missing | 2.0 | 75% 失踪 1 周，25% 失踪 2 周 |
| add_quirk (enlightened) | 2.0 | 获得正面怪癖：顿悟 |
| add_quirk (improved_balance) | 1.0 | 获得正面怪癖：平衡感 |
| add_quirk (meditator) | 1.0 | 获得正面怪癖：冥想者 |
| add_quirk (calm) | 1.0 | 获得正面怪癖：平静 |
| add_quirk (unquiet_mind) | 2.0 | 获得负面怪癖：心神不宁 |

**参与条件**：不能已拥有 `unquiet_mind`, `alcoholism`, `gambler`, `love_interest`, `god_fearing`, `flagellant`。

**祈祷副作用表**（额外包含 BUFF 和金币损失）：

| 副作用 | 相对权重 | 效果 |
|---|---|---|
| activity_lock | 2.0 | 本周活动锁定 |
| go_missing | 1.0 | 失踪 1-2 周 |
| add_quirk (god_fearing) | 2.0 | 获得怪癖：敬畏神明 |
| add_quirk (witness) | 2.0 | 获得怪癖：见证者 |
| apply_buff (townPrayerDestressBuff) | 2.0 | 下次地牢中额外压力抗性 |
| remove_currency | 1.0 | 损失 1000g |
| add_trinket | 1.0 | 获得随机饰品 |

### 10.4 疗养院（Sanitarium）— 怪癖与疾病治疗

疗养院提供两种治疗活动，解锁条件：完成 4 个任务。

**怪癖治疗 (treatment)**：

| 操作 | 基础费用 | 最终费用 (e级) | 说明 |
|---|---|---|---|
| 移除正面怪癖 | 7500g | 3750g | 主动移除不需要的正面怪癖 |
| 移除负面怪癖 | 1500g | 750g | 移除有害负面怪癖 |
| 移除永久负面怪癖 | 5000g | 2500g | 移除锁定的永久负面怪癖 |

- 治疗成功率：100%（怪癖治疗总是成功）
- 槽位升级：1 → 2 (b级) → 3 (d级)
- 每个槽位每周处理一个怪癖

**疾病治疗 (disease_treatment)**：

| 项目 | 基础值 | 升级后 | 说明 |
|---|---|---|---|
| 治疗费用 | 750g | 450g (e级) | 每次治疗费用 |
| 治愈一个疾病概率 | 33% | 100% (d级) | b级=67%, d级=100% |
| 槽位数 | 1 | 3 (c级) | a级=2, c级=3 |

- 参与条件：英雄必须患病 (`is_diseased`)
- 治疗失败不退款，但英雄仍在疗养院消耗一周

### 10.5 建筑升级系统

所有城镇建筑共享统一的升级树机制：

```typescript
// 升级树定义
interface UpgradeTree {
  id: string;                         // "tavern.cost" | "sanitarium.slots" | ...
  code: string;                      // 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'
  cost: {
    currency: CurrencyCost[];         // 金币 + 传家宝
  };
  prerequisites: string[];            // 前置升级 code
}

// 传家宝类型
type HeirloomType = 'bust' | 'portrait' | 'deed' | 'crest';

// 升级费用示例（传家宝兑换比例）
// bust (雕像)      → 修道院/疗养院升级
// portrait (画像)  → 铁匠铺/公会升级
// deed (契约)      → 驿站/游商升级
// crest (纹章)     → 通用升级货币
```

**建筑解锁时间线**：

| 建筑 | 解锁条件 | 主要功能 |
|---|---|---|
| 驿站马车 (stage_coach) | 0 任务 | 招募英雄 |
| 游商马车 (nomad_wagon) | 0 任务 | 购买饰品 |
| 扎营训练师 (camping_trainer) | 地牢等级 2 | 学习扎营技能 |
| 酒馆 (tavern) | 2 任务 | 压力释放 |
| 修道院 (abbey) | 2 任务 | 压力释放 |
| 铁匠铺 (blacksmith) | 3 任务 | 武器/护甲升级 |
| 公会 (guild) | 3 任务 | 战斗技能升级 |
| 疗养院 (sanitarium) | 4 任务 | 怪癖/疾病治疗 |

### 10.6 副作用判定流程

```typescript
function resolveSideEffect(activity: TownActivity, hero: Hero): SideEffectResult {
  // 1. 判定是否触发副作用（基础概率 37.5%）
  if (Math.random() > activity.sideEffects.chance) {
    return { triggered: false };
  }

  // 2. 按相对权重选择副作用
  const weightedPool = activity.sideEffects.results;
  const totalWeight = weightedPool.reduce((sum, r) => sum + r.chance, 0);
  let roll = Math.random() * totalWeight;

  for (const effect of weightedPool) {
    roll -= effect.chance;
    if (roll <= 0) {
      // 3. 执行副作用
      return executeSideEffect(effect, hero);
    }
  }

  return { triggered: false };
}

// 4. add_quirk 副作用需要检查怪癖上限
function executeAddQuirk(quirkName: string, hero: Hero): SideEffectResult {
  // DD 规则：正面怪癖上限 8，负面怪癖上限 8
  const positiveQuirks = hero.quirks.filter(q => q.isPositive);
  const negativeQuirks = hero.quirks.filter(q => !q.isPositive);

  const quirk = getQuirkFromLibrary(quirkName);
  const targetPool = quirk.isPositive ? positiveQuirks : negativeQuirks;

  if (targetPool.length >= 8) {
    // 满了则随机替换一个同类怪癖
    const replaced = targetPool[Math.floor(Math.random() * targetPool.length)];
    hero.quirks = hero.quirks.filter(q => q.id !== replaced.id);
  }

  hero.quirks.push(quirk);
  return { triggered: true, type: 'add_quirk', quirk: quirkName, replaced: replaced?.id };
}
```

---

## 11. 任务/委托系统

任务系统是游戏主循环的核心驱动力，程序化生成不同类型、难度、长度的地牢探索任务。

### 11.1 数据结构

```typescript
// 任务定义
interface Quest {
  id: string;                         // 生成的唯一ID
  type: QuestType;                    // 任务类型
  dungeon: DungeonId;                // 目标地牢
  resolveLevel: number;              // 难度等级 0-6
  difficulty: number;                 // 难度系数 1/3/5
  length: QuestLength;               // 任务长度
  goalId: string;                     // 目标ID
  goalData: QuestGoalData;            // 目标参数
  startingItems: QuestItem[];         // 任务起始道具
  rewards: QuestRewards;              // 奖励
  ignoreFogOfWar: boolean;            // 是否忽略战争迷雾
  showAsQuest: boolean;               // 是否在任务列表显示
  isPlot: boolean;                    // 是否主线任务
}

type QuestType =
  | 'kill_boss'              // 击杀Boss
  | 'explore'                // 探索90%房间
  | 'cleanse'                // 清除所有房间敌人
  | 'gather'                 // 收集任务物品
  | 'activate'               // 激活古物
  | 'inventory_activate';    // 使用物品激活古物

type QuestLength = 1 | 2 | 3;          // 短/中/长
type DungeonId = 'crypts' | 'weald' | 'warrens' | 'cove' | 'darkest_dungeon';

// 任务目标
interface QuestGoalData {
  // kill_boss
  monsterClassIds?: string[];
  amount?: number;

  // explore / cleanse
  percentage?: number;                // 需探索/清除的比例
  roomAmount?: number;

  // gather
  curioName?: string;                // 需交互的古物
  item?: { type: string; id: string; amount: number };

  // activate
  curioName?: string;
  amount?: number;
}
```

### 11.2 任务类型详解

基于 `quest.types.json` 数据：

| 类型 | 目标 | 区域特定 | 说明 |
|---|---|---|---|
| kill_boss | 击杀指定Boss | 全区域 | Boss按A/B/C三级，D级为Darkest Dungeon |
| explore | 探索90%房间 | 通用 | 需探索至少90%的房间 |
| cleanse | 战斗所有房间 | 通用 | 清除100%房间的敌人 |
| gather | 收集任务物品 | 区域特定 | 从指定古物收集3个任务物品 |
| activate | 激活指定古物 | 通用/区域 | 激活铁处女/传送器等 |
| inventory_activate | 使用任务物品激活古物 | 区域特定 | 需携带特定任务物品 |

**区域特定 gather 任务**：

| 地牢 | 古物 | 收集物品 | 数量 |
|---|---|---|---|
| Ruins (crypts) | reliquary (圣物箱) | holy_relic (圣物) | 3 |
| Warrens (warrens) | foodstuff_crate (食物箱) | grain_sack (粮袋) | 3 |
| Weald (weald) | chirurgeons_satchel (外科医包) | medicines (药品) | 3 |
| Cove (cove) | shipment_crates (货物箱) | ancestors_crate (先祖箱) | 3 |

**区域特定 inventory_activate 任务**：

| 地牢 | 古物 | 所需物品 | 数量 |
|---|---|---|---|
| Ruins | corrupted_altar (腐化祭坛) | holy_water (圣水) | 3 |
| Warrens | animalistic_shrine (兽性神龛) | pickaxe (镐) | 3 |
| Weald | infected_corpse (感染尸体) | antivenom (解毒剂) | 3 |
| Cove | protective_ward (防护结界) | eldritch_lantern (异界提灯) | 3 |
| Cove (特殊) | beacon (信标) | beacon_light (信标灯) | 3 |

### 11.3 任务生成规则

基于 `quest.generation.json`：

```typescript
// 地牢解锁时间线
const dungeonUnlockSchedule = [
  { dungeon: 'crypts',  requiredQuests: 1 },
  { dungeon: 'weald',   requiredQuests: 3 },
  { dungeon: 'warrens', requiredQuests: 4 },
  { dungeon: 'cove',    requiredQuests: 4 },
];

// 难度映射（resolve level → difficulty）
const resolveToDifficulty = [
  { resolveLevels: [0, 1, 2], difficulty: 1 },
  { resolveLevels: [2, 3, 4], difficulty: 3 },
  { resolveLevels: [4, 5, 6], difficulty: 5 },
];

// 每个地牢有8个难度等级的生成表（对应 resolve level 0-7）
// 每个难度等级的生成表包含可选任务类型×长度组合
interface QuestGenerationEntry {
  type: QuestType;
  chance: number;                     // 选中概率（均为1，等概率）
  length: QuestLength;
}

// 生成流程
function generateQuestsForWeek(
  week: number,
  questsFinished: number,
  unlockedDungeons: DungeonId[]
): Quest[] {
  const quests: Quest[] = [];
  const maxQuests = 4;  // 每周最多生成4个任务

  for (const dungeon of unlockedDungeons) {
    const questTable = getQuestTable(dungeon, week);
    // 从对应难度等级的生成表中随机选择
    const difficultyIndex = Math.min(week, 7);  // 0-7
    const availableEntries = questTable[difficultyIndex];

    // 每个地牢贡献1-2个任务
    const numQuests = Math.min(2, maxQuests - quests.length);
    for (let i = 0; i < numQuests; i++) {
      const entry = weightedRandom(availableEntries);
      const quest = assembleQuest(entry, dungeon, difficultyIndex);
      quests.push(quest);
    }
  }

  return quests.slice(0, maxQuests);
}
```

**任务生成表示例（Ruins/Crypts 难度等级 0-1）**：

| 难度 | 可选任务类型 | 长度 |
|---|---|---|
| 等级0 | cleanse | 1（短） |
| 等级1 | explore / cleanse | 1或2 |
| 等级2 | explore / cleanse / inventory_activate / gather | 1或2 |
| 等级3+ | 同上 + 更高长度 | 1/2/3 |

### 11.4 任务奖励系统

基于 `quest.generation.json` 的奖励表：

```typescript
// 奖励计算
interface QuestRewards {
  gold: number;                       // 金币奖励
  resolveXp: number;                 // 决心经验（升级用）
  heirlooms: HeirloomReward[];       // 传家宝奖励
  trinketRewards: TrinketReward[];   // 饰品奖励（概率性）
}

// 金币奖励表（难度 × 长度）
// 注：原表使用 [难度1, 难度2, 难度3, 难度4, 难度5, 难度6] × [短, 中, 长]
const goldRewardTable = [
  // 难度1
  { difficulty: 1, lengths: { S: 0,     M: 3000,  L: 4500  } },
  // 难度3
  { difficulty: 3, lengths: { S: 0,     M: 4500,  L: 6750  } },
  // 难度5
  { difficulty: 5, lengths: { S: 0,     M: 6000,  L: 9000  } },
  // 难度6
  { difficulty: 6, lengths: { S: 0,     M: 9000,  L: 13500 } },
];

// 决心经验表（行=难度，列=任务长度）
const resolveXpTable = [
  // diff 1: [0, 2, 3, 4, 4, 4]  (长度1-6)
  // diff 3: [0, 4, 6, 8, 8, 8]
  // diff 5: [0, 8, 12, 16, 16, 16]
];

// 传家宝奖励表（类型 × 难度 × 长度）
// 每个地牢产出4种传家宝，数量随难度和长度递增
// 示例：bust 在难度3/长度M → [0, 2, 2, 4] 中随机
```

**传家宝区域分配**：

| 地牢 | 主要传家宝 | 次要传家宝 | 说明 |
|---|---|---|---|
| Ruins | bust (雕像), portrait (画像) | deed, crest | 雕像画像多 |
| Warrens | bust, portrait | deed, crest | 同上 |
| Weald | deed (契约) | crest | 契约多 |
| Cove | deed | crest | 同上 |

### 11.5 任务退出惩罚

基于 `quest.exit_penalty.json`：

| 退出方式 | 压力伤害 | 说明 |
|---|---|---|
| 失败 (fail) | 20 | 任务目标未完成直接退出 |
| 撤退 (regroup) | 0 | 主动撤退，无额外压力惩罚 |

**撤退机制**：
- 玩家可在地牢中任何时候选择撤退
- 撤退保留已收集的战利品和任务物品
- 撤退的英雄状态保留（HP/压力/怪癖变化）
- 失败则任务标记为失败，英雄获得 20 点压力伤害

### 11.6 Boss 任务链

基于 `quest.types.json` 中的 kill_monster 目标：

| 区域 | Boss名 | 等级A | 等级B | 等级C | 等级D |
|---|---|---|---|---|---|
| Ruins | 死灵法师 (Necromancer) | ✓ | ✓ | ✓ | - |
| Warrens | 猪王子 (Swine Prince) | ✓ | ✓ | ✓ | - |
| Weald | 女巫 (Hag) | ✓ | ✓ | ✓ | - |
| Cove | 海妖 (Siren) / 溺水船员 (Drowned Crew) | ✓ | ✓ | ✓ | - |
| DD | 无形之肉 (Formless Flesh) | ✓ | ✓ | ✓ | - |
| DD | 铁甲炮 (Brigand Cannon) | ✓ | ✓ | ✓ | - |
| DD | 洗牌者 (Shuffler) | - | - | - | D |
| DD | 先祖之心 (Ancestor Heart) | - | - | - | D |
| DD | 强盗工兵 (Brigand Sapper) | - | - | - | D |
| 特殊 | 乌鸦 (Crow) | ✓ | ✓ | ✓ | 忽略战争迷雾 |

---

## 12. 饰品系统

饰品系统复刻 DD 原版的完整饰品数据，包括 14 种稀有度分类和游商马车商店。

### 12.1 数据结构

```typescript
// 饰品定义
interface Trinket {
  id: string;                         // "ancestors_coat"
  name: string;                      // 本地化名称
  description: string;               // 效果描述
  buffs: string[];                   // BUFF ID列表，引用 effects.json
  heroClassRequirements: string[];   // 空数组=通用，非空=限定职业
  rarity: TrinketRarity;
  price: number;                     // 购买价格
  sellValue: number;                 // 出售价格（price × 0.85）
  limit: number;                     // 0=无限，>0=限制持有数量
  originDungeon: string;             // ""=通用，指定=仅该地牢掉落
}

// 饰品稀有度（14种分类）
type TrinketRarity =
  // 通用稀有度（5级）
  | 'very_common'      // 非常常见
  | 'common'           // 常见
  | 'uncommon'         // 不常见
  | 'rare'             // 稀有
  | 'very_rare'        // 非常稀有
  // 特殊稀有度
  | 'ancestral'        // 先祖饰品（universal类别）
  | 'darkest_dungeon'  // 暗黑地牢专属（dd类别）
  | 'trophy'           // 奖杯饰品（Boss掉落，trophy类别）
  | 'ancestral_shambler' // 舒布拉掉落（battle类别）
  | 'crow'             // 乌鸦任务奖励（quest类别）
  | 'courtier'        // 朝臣饰品（battle类别）
  | 'collector'       // 收藏家饰品（battle类别）
  | 'madman'          // 疯子饰品（battle类别）
  | 'kickstarter';    // Kickstarter 限定

// 稀有度分类
interface RarityCategory {
  id: TrinketRarity;
  awardCategory: 'universal' | 'dd' | 'trophy' | 'battle' | 'quest' | 'kickstarter';
}
```

### 12.2 饰品 BUFF 关联

饰品通过 `buffs` 数组引用 `effects.json` 中定义的 BUFF：

```typescript
// 示例：先祖之外套 (ancestor's_coat)
const trinket: Trinket = {
  id: "ancestors_coat",
  buffs: [
    "TRINKET_DEF_B4",           // DEF +15
    "TRINKET_ANCESTOR_STRESSDMG" // 压力伤害 -10%
  ],
  heroClassRequirements: [],    // 通用，无职业限制
  rarity: "ancestral",
  price: 12500,
  sellValue: 10625,             // 12500 × 0.85
  limit: 0,
  originDungeon: ""
};

// 示例：乌鸦翅羽 (crow_wingfeather)
const crowTrinket: Trinket = {
  id: "crow_wingfeather",
  buffs: [
    "TRINKET_CROW_WINGFEATHER_BUFF",     // DODGE +8
    "TRINKET_CROW_DISEASERESIST_BUFF",   // 疾病抗性 +20%
    "TRINKET_CROW_WINGFEATHER_BUFF2",    // SPD +1
    "TRINKET_CROW_STRESS_DEBUFF"         // 压力 +10%（负面）
  ],
  rarity: "crow",
  price: 1,                    // 特殊价格（任务奖励）
  limit: 0,
  originDungeon: ""
};
```

### 12.3 游商马车（Nomad Wagon）

游商马车是城镇中购买饰品的商店，每周刷新库存。

```typescript
// 游商马车状态
interface NomadWagonState {
  trinketInventory: Trinket[];         // 当前可购饰品
  maxTrinkets: number;                 // 库存上限（升级树提升）
  costDiscount: number;               // 费用折扣（0.0-0.5）
  sellValueMultiplier: number;         // 出售折扣（固定0.85）
}

// 游商马车升级
const nomadWagonUpgrades = {
  // 库存上限升级
  numItems: [
    { amount: 2 },                    // 基础
    { amount: 4,  code: 'a' },        // 每级+2
    { amount: 6,  code: 'b' },
    { amount: 8,  code: 'c' },
    { amount: 12, code: 'd' },        // 最终12个
  ],
  // 费用折扣升级（每级10%）
  cost: [
    { discount: 0.10, code: 'a' },
    { discount: 0.10, code: 'b' },
    { discount: 0.10, code: 'c' },
    { discount: 0.10, code: 'd' },
    { discount: 0.10, code: 'e' },     // 最终50%折扣
  ],
};

// 每周库存生成
function generateWagonInventory(maxItems: number): Trinket[] {
  const rarityTable = [
    { rarity: 'very_common', chance: 6.0 },
    { rarity: 'common',      chance: 5.0 },
    { rarity: 'uncommon',    chance: 4.0 },
    { rarity: 'rare',        chance: 2.0 },
    { rarity: 'very_rare',   chance: 1.0 },
  ];

  const inventory: Trinket[] = [];
  for (let i = 0; i < maxItems; i++) {
    // 1. 按权重选择稀有度
    const rarity = weightedRandom(rarityTable);
    // 2. 从该稀有度池中随机选择饰品
    const pool = trinketDatabase.filter(t => t.rarity === rarity && !inventory.includes(t));
    if (pool.length > 0) {
      inventory.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }
  return inventory;
}
```

### 12.4 饰品掉落机制

饰品在地牢中通过以下途径获取：

| 来源 | 稀有度池 | 说明 |
|---|---|---|
| 任务完成奖励 | 按难度×长度概率表 | 见任务奖励表 |
| 古物交互 | 按古物定义 | 特定古物掉落特定稀有度 |
| Boss击杀 | trophy 稀有度 | Boss掉落专属奖杯饰品 |
| 舒布拉击杀 | ancestral_shambler | 异界掉落 |
| 收藏家击杀 | collector | 稀有遭遇怪掉落 |
| 乌鸦任务 | crow | 特殊任务奖励 |
| 游商马车购买 | 按稀有度生成表 | 每周随机刷新 |
| 城镇活动副作用 | 按稀有度池 | 妓院/祈祷等可能获得/失去 |

**任务完成饰品概率表**（难度 × 长度）：

| 稀有度 | 难度1/长度M | 难度3/长度M | 难度5/长度M | 难度6/长度L |
|---|---|---|---|---|
| common | 1 (概率) | 0 | 0 | 0 |
| uncommon | 0 | 1 | 0 | 0 |
| rare | 0 | 0 | 1 | 0 |
| very_rare | 0 | 0 | 0 | 1 |
| ancestral | 0 | 0 | 0 | 0 |

### 12.5 饰品装备规则

```typescript
// 英雄饰品装备
interface HeroTrinketSlots {
  trinket1: string | null;             // 饰品槽1
  trinket2: string | null;             // 饰品槽2
}

// 装备限制
function canEquipTrinket(hero: Hero, trinket: Trinket): boolean {
  // 1. 职业限制检查
  if (trinket.heroClassRequirements.length > 0) {
    if (!trinket.heroClassRequirements.includes(hero.class)) {
      return false;
    }
  }

  // 2. 持有上限检查
  if (trinket.limit > 0) {
    const ownedCount = countTrinketInInventory(hero, trinket.id);
    if (ownedCount >= trinket.limit) {
      return false;
    }
  }

  // 3. 空槽位检查
  if (hero.trinket1 !== null && hero.trinket2 !== null) {
    return false;
  }

  return true;
}
```

---

## 13. 周/时间推进系统

周推进系统是 DD 的核心时间机制，每周结束时处理所有城镇活动结算、英雄状态更新和资源刷新。

### 13.1 周循环定义

```typescript
// 周状态
interface WeekState {
  currentWeek: number;                 // 当前周数
  phase: TownPhase;                   // 当前城镇阶段
  questsAvailable: Quest[];           // 可用任务列表
  townEvents: TownEvent[];           // 当前周城镇事件
  heroActivities: HeroActivity[];     // 进行中的英雄活动
  recruits: Hero[];                   // 驿站马车待招募英雄
  wagonInventory: Trinket[];          // 游商马车库存
}

type TownPhase = 'embark' | 'town' | 'week_transition';

// 周推进事件
interface WeekTransitionResult {
  week: number;
  completedActivities: ActivityResult[];    // 已完成的活动
  arrivedRecruits: Hero[];                  // 新到的招募者
  newQuests: Quest[];                       // 新生成的任务
  newWagonInventory: Trinket[];             // 游商马车新库存
  triggeredEvents: TownEvent[];             // 触发的城镇事件
  missingHeroesReturned: string[];          // 失踪英雄回归
  bankInterest?: number;                    // 银行利息（若有区域建筑）
  stressReliefBuffsExpired: string[];       // 压力释放BUFF过期
}
```

### 13.2 周推进流程

```typescript
function advanceWeek(currentState: GameState): WeekTransitionResult {
  const result: WeekTransitionResult = {
    week: currentState.week + 1,
    completedActivities: [],
    arrivedRecruits: [],
    newQuests: [],
    newWagonInventory: [],
    triggeredEvents: [],
    missingHeroesReturned: [],
  };

  // 1. 结算进行中的英雄活动（压力释放/治疗）
  for (const activity of currentState.heroActivities) {
    const activityResult = resolveHeroActivity(activity);
    result.completedActivities.push(activityResult);

    // 处理副作用
    if (activityResult.sideEffect?.type === 'go_missing') {
      // 英雄失踪，设置回归周数
      const hero = findHero(activity.heroId);
      hero.missingUntilWeek = currentState.week + activityResult.sideEffect.duration;
    }
  }

  // 2. 检查失踪英雄回归
  for (const hero of currentState.roster) {
    if (hero.missingUntilWeek && hero.missingUntilWeek <= result.week) {
      hero.missingUntilWeek = null;
      result.missingHeroesReturned.push(hero.id);
    }
  }

  // 3. 清空英雄活动槽位（活动完成后释放）
  currentState.heroActivities = [];

  // 4. 驿站马车刷新招募者
  const stageCoachLevel = getBuildingUpgradeLevel('stage_coach');
  const maxRecruits = getStageCoachRecruitCount(stageCoachLevel);
  result.arrivedRecruits = generateRecruits(maxRecruits, currentState);

  // 5. 生成新任务（替换上周未接受的任务）
  const unlockedDungeons = getUnlockedDungeons(currentState.questsFinished);
  result.newQuests = generateQuestsForWeek(
    result.week,
    currentState.questsFinished,
    unlockedDungeons
  );

  // 6. 游商马车刷新库存
  const wagonLevel = getBuildingUpgradeLevel('nomad_wagon');
  const maxItems = getNomadWagonMaxItems(wagonLevel);
  result.newWagonInventory = generateWagonInventory(maxItems);

  // 7. 检查城镇事件触发
  result.triggeredEvents = checkTownEvents(currentState, result.week);

  // 8. 银行利息（若有该区域建筑）
  const bank = currentState.districts.find(d => d.name === 'bank');
  if (bank && bank.built) {
    result.bankInterest = Math.floor(currentState.gold * 0.05);
  }

  // 9. 压力释放BUFF过期
  for (const hero of currentState.roster) {
    hero.buffs = hero.buffs.filter(buff => {
      if (buff.source === 'town_activity' && buff.durationWeeks > 0) {
        buff.durationWeeks--;
        return buff.durationWeeks > 0;
      }
      return true;
    });
  }

  // 10. 更新全局状态
  currentState.week = result.week;
  currentState.questsAvailable = result.newQuests;
  currentState.recruits = result.arrivedRecruits;
  currentState.wagonInventory = result.newWagonInventory;

  return result;
}
```

### 13.3 驿站马车招募系统

基于 `stage_coach.building.json`：

```typescript
// 招募者生成
function generateRecruits(maxRecruits: number, state: GameState): Hero[] {
  const recruits: Hero[] = [];

  // 首次招募固定职业
  if (state.week === 0 && state.roster.length === 0) {
    recruits.push(createHero('plague_doctor', resolveLevel: 0));
    recruits.push(createHero('vestal', resolveLevel: 0));
    return recruits;
  }

  // 常规招募
  for (let i = 0; i < maxRecruits; i++) {
    // 1. 随机职业（从已解锁的英雄池中）
    const heroClass = randomHeroClass(state.unlockedHeroClasses);

    // 2. 决定 Resolve Level
    const upgradedRecruitsLevel = getUpgradedRecruitsLevel(state);
    let resolveLevel = 0;
    if (upgradedRecruitsLevel > 0 && Math.random() < getUpgradedRecruitsChance(upgradedRecruitsLevel)) {
      resolveLevel = upgradedRecruitsLevel;
    }

    // 3. 创建英雄
    const hero = createHero(heroClass, resolveLevel);

    // 4. 初始怪癖
    const numPositiveQuirks = getExtraPositiveQuirks(upgradedRecruitsLevel);
    const numNegativeQuirks = getExtraNegativeQuirks(upgradedRecruitsLevel);
    assignRandomQuirks(hero, numPositiveQuirks, numNegativeQuirks);

    // 5. 初始技能
    const numCombatSkills = 3 + getExtraCombatSkills(upgradedRecruitsLevel);
    const numCampingSkills = 1 + getExtraCampingSkills(upgradedRecruitsLevel);
    assignRandomSkills(hero, numCombatSkills, numCampingSkills);

    recruits.push(hero);
  }

  return recruits;
}

// 驿站马车升级数据
const stageCoachUpgrades = {
  // 招募数量
  numRecruits: [2, 3, 4, 5, 6, 7],  // 基础→e级
  // Roster 上限
  rosterSize: [9, 12, 16, 20, 24, 28],
  // 升级招募者
  upgradedRecruits: [
    // a级：1级英雄，18.75%概率，1个额外扎营技能
    { level: 1, chance: 0.1875, extraPosQuirks: 0, extraNegQuirks: 0, extraCombatSkills: 0, extraCampingSkills: 1 },
    // b级：2级英雄，12.5%概率，1正面1负面怪癖，1战斗1扎营技能
    { level: 2, chance: 0.125, extraPosQuirks: 1, extraNegQuirks: 1, extraCombatSkills: 1, extraCampingSkills: 1 },
    // c级：3级英雄，6.25%概率，2正面2负面怪癖，2战斗2扎营技能
    { level: 3, chance: 0.0625, extraPosQuirks: 2, extraNegQuirks: 2, extraCombatSkills: 2, extraCampingSkills: 2 },
  ],
};
```

### 13.4 英雄活动结算

```typescript
function resolveHeroActivity(activity: HeroActivity): ActivityResult {
  const hero = findHero(activity.heroId);
  const building = findBuilding(activity.buildingId);
  const activityDef = building.activities.find(a => a.id === activity.activityId);

  const result: ActivityResult = {
    heroId: hero.id,
    activityId: activity.activityId,
    success: false,
    effects: [],
  };

  switch (activityDef.category) {
    case 'stress_relief': {
      // 压力释放
      const stressHeal = getStressHealAmount(activityDef, building.upgradeLevel);
      hero.stress = Math.max(0, hero.stress - stressHeal);

      // 副作用判定
      const sideEffect = resolveSideEffect(activityDef, hero);
      if (sideEffect.triggered) {
        result.effects.push(sideEffect);
      }
      result.success = true;
      break;
    }

    case 'quirk_treatment': {
      // 怪癖治疗
      const successChance = activityDef.treatmentChance || 1.0;
      if (Math.random() < successChance) {
        // 移除指定怪癖
        hero.quirks = hero.quirks.filter(q => q.id !== activity.targetQuirkId);
        result.success = true;
      }
      break;
    }

    case 'disease_treatment': {
      // 疾病治疗
      const cureAllChance = getDiseaseCureChance(building.upgradeLevel);
      if (Math.random() < cureAllChance) {
        // 治愈所有疾病
        hero.diseases = [];
        result.success = true;
      } else {
        // 治愈一个随机疾病
        if (hero.diseases.length > 0) {
          const idx = Math.floor(Math.random() * hero.diseases.length);
          hero.diseases.splice(idx, 1);
          result.success = true;
        }
      }
      break;
    }
  }

  return result;
}
```

### 13.5 城镇事件系统

```typescript
// 埨镇事件
interface TownEvent {
  id: string;
  name: string;
  description: string;
  type: TownEventType;
  duration: number;                    // 持续周数
  effects: TownEventEffect[];
  triggerCondition?: TownEventCondition;
}

type TownEventType =
  | 'free_activity'           // 免费活动（酒馆/修道院/疗养院）
  | 'bonus_recruit'            // 额外招募者
  | 'embark_buff'              // 出发增益
  | 'dungeon_buff'             // 地牢增益
  | 'special_recruit'          // 特殊招募（特定职业）
  | 'idle_resolve_level';      // 闲置英雄升级

// 事件触发检查
function checkTownEvents(state: GameState, week: number): TownEvent[] {
  const triggered: TownEvent[] = [];

  for (const eventDef of townEventLibrary) {
    if (eventDef.triggerCondition && !evaluateCondition(eventDef.triggerCondition, state)) {
      continue;
    }

    // 按概率触发
    if (Math.random() < eventDef.triggerChance) {
      triggered.push({
        ...eventDef,
        duration: eventDef.baseDuration,
      });
    }
  }

  return triggered;
}
```

---

## 14. DLC建筑系统（区域建筑）

DLC区域建筑系统复刻 DD 原版的 Districts 机制，为玩家提供全局被动增益。

### 14.1 数据结构

```typescript
// 区域建筑定义
interface DistrictBuilding {
  name: string;                        // 建筑ID
  displayName: string;               // 显示名称
  dlc: 'crimson_court' | 'color_of_madness';
  currencyCost: DistrictCurrency[];   // 建造成本
  buffList: DistrictBuff[];            // 建成后的被动增益
  built: boolean;                      // 是否已建造
  townPriority: number;                // 城镇渲染优先级
}

// 建造成本
interface DistrictCurrency {
  type: 'gold' | 'crest' | 'portrait' | 'deed' | 'bust' | 'blueprint' | 'shard' | 'memory';
  amount: number;
}

// 区域建筑增益类型
type DistrictBuffType =
  | 'DistrictPrestigeBuffData'              // 威望
  | 'DistrictEstateBuffData'                 // 庄园（银行利息）
  | 'DistrictLightBuffData'                  // 光照修正
  | 'DistrictDisableBuffData'                // 禁用机制（如饥饿）
  | 'DistrictStackingBuffData'               // 堆叠上限提升
  | 'DistrictReplacementInventoryEffectBuffData'; // 物品效果替换

// 增益定义
interface DistrictBuff {
  type: DistrictBuffType;
  name: string;

  // DistrictEstateBuffData
  weeklyGoldInterest?: number;         // 每周金币利息率（如 0.05 = 5%）

  // DistrictLightBuffData
  darkness?: {
    rangeTable: LightRangeBuff[];     // 光照范围修正表
  };

  // DistrictDisableBuffData
  disabledType?: string;              // 禁用的机制类型（如 'hunger'）

  // DistrictStackingBuffData
  extraStackLimitId?: string;         // 额外堆叠上限ID

  // DistrictReplacementInventoryEffectBuffData
  itemType?: string;
  itemId?: string;
  effect?: string;                   // 替换后的效果ID
}
```

### 14.2 血腥庭院区域建筑（Crimson Court DLC）

| 建筑 | 成本 | 增益 | 效果说明 |
|---|---|---|---|
| 希望之塔 (spire_of_hope) | 50000g + 750 crest + 1 blueprint | 威望 | 全局增益效果增强 |
| 银行 (bank) | 15000g + 50 portrait + 1 blueprint | 庄园 | 每周获得当前金币 5% 利息 |
| 插画师公会 (illuminators_guild) | 5000g + 300 crest + 1 blueprint | 光照修正 | 高光照下额外暴击/防御/侦查 |
| 军械库 (armory) | 成本待定 | 装备 | 饰品容量提升 |
| 训练场 (training_grounds) | 成本待定 | 技能 | 战斗技能初始等级提升 |
| 治疗所 (treatment_facility) | 成本待定 | 治疗 | 疗养院效率提升 |
| 先祖雕像 (ancestral_statue) | 成本待定 | 经验 | 决心经验获取提升 |
| 守望塔 (watchtower) | 成本待定 | 侦查 | 地牢侦查概率提升 |

### 14.3 疯狂之色区域建筑（Color of Madness DLC）

| 建筑 | 成本 | 增益 | 效果说明 |
|---|---|---|---|
| 磨坊 (the_mill) | 10 memory | 禁用饥饿 | 地牢中不再触发饥饿事件 |
| 地质学舍 (geologic_studyhall) | 125 shard | 堆叠提升 | 宝石类物品堆叠上限提升 |
| 污染之井 (tainted_well) | 99 shard | 圣水替换 | 圣水/鸦片效果替换为增强版 |
| 瘴气果园 (miasmal_orchard) | 99 shard | 草药替换 | 草药/解毒剂效果替换为增强版 |

### 14.4 光照修正增益详解

**插画师公会** 的光照修正按光照范围分段提供增益：

```typescript
// 光照范围修正表
interface LightRangeBuff {
  range: { lower: number; upper: number };
  value: {
    stressChanceIncrease?: number;       // 压力触发概率修正
    stressDamageIncrease?: number;       // 压力伤害修正
    monsterAttackIncrease?: number;     // 怪物攻击修正
    monsterDamageIncrease?: number;      // 怪物伤害修正
    monsterCritIncrease?: number;        // 怪物暴击修正
    lootIncreaseGold?: number;           // 金币掉落修正
    lootIncreaseTreasureDraws?: number;  // 宝物抽取修正
    playerCritIncrease?: number;         // 玩家暴击修正
    playerDefIncrease?: number;          // 玩家防御修正
    playerScoutingIncrease?: number;     // 侦查修正
    monstersSurprisedIncrease?: number;  // 怪物被突袭概率修正
    heroesSurprisedIncrease?: number;   // 英雄被突袭概率修正
  };
}

// 示例：高光照(75-100)下的插画师公会增益
const illuminatorsGuildHighLightBuff = {
  range: { lower: 75, upper: Infinity },
  value: {
    playerCritIncrease: 1.0,            // 暴击 +1%
    playerDefIncrease: 7.5,              // 防御 +7.5
    playerScoutingIncrease: 17.5,        // 侦查 +17.5%
    monstersSurprisedIncrease: 30.0,     // 怪物被突袭 +30%
    heroesSurprisedIncrease: -5.0,       // 英雄被突袭 -5%
    lootIncreaseGold: 1,                 // 金币掉落 +1
    lootIncreaseTreasureDraws: 1,        // 宝物抽取 +1
  }
};
```

### 14.5 蓝图与货币系统

```typescript
// DLC 专属货币
interface DLCCurrency {
  type: 'blueprint' | 'shard' | 'memory';
  amount: number;
}

// 蓝图获取（Crimson Court）
// - 血腥庭院地牢中的特定古物掉落
// - 每周有概率通过城镇事件获得
// - 总量有限，需要谨慎选择建造顺序

// 记忆碎片获取（Color of Madness）
// - 无尽模式（Endless Harvest）中击杀怪物的战利品
// - 农场区域古物交互获得

// 水晶碎片获取（Color of Madness）
// - 无尽模式中的通用货币
// - 用于建造 CoM 区域建筑和购买专属饰品
```

### 14.6 马戏团建筑（Circus DLC）

```typescript
// 马戏团建筑（特殊活动建筑）
interface CircusBuilding {
  id: 'circus';
  type: 'special_event';
  availableDuringEvent: string;       // 仅在特定城镇事件期间可用
  activities: CircusActivity[];
}

// 马戏团活动（赌博/表演等特殊活动）
// 注：马戏团是限时活动建筑，非永久可用
// 数据来源：circus.building.json
```

---

## 15. 系统联动更新

### 15.1 完整系统架构图（更新）

```
┌──────────────────────────────────────────────────────┐
│                    玩家入口                           │
│  A) 庄园主/指挥官  B) 叙事者  C) 英雄/自定义角色      │
└───────────────────────┬──────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌──────────────┐ ┌────────────┐ ┌──────────────┐
│  城镇阶段    │ │  地牢阶段   │ │  周推进阶段  │
│              │ │            │ │              │
│ ┌──────────┐ │ │ ┌────────┐ │ │ ┌──────────┐ │
│ │驿站马车  │ │ │ │地图生成│ │ │ │活动结算  │ │
│ │(招募英雄)│ │ │ │(走廊/  │ │ │ │(压力释放/│ │
│ └──────────┘ │ │ │ 房间)  │ │ │ │ 治疗/失踪)│ │
│ ┌──────────┐ │ │ └────────┘ │ │ └──────────┘ │
│ │游商马车  │ │ │ ┌────────┐ │ │ ┌──────────┐ │
│ │(购买饰品)│ │ │ │战斗系统│ │ │ │任务刷新  │ │
│ └──────────┘ │ │ │(站位/ │ │ │ │(生成4个) │ │
│ ┌──────────┐ │ │ │ 技能) │ │ │ └──────────┘ │
│ │酒馆/修道 │ │ │ └────────┘ │ │ ┌──────────┐ │
│ │院(压力)  │ │ │ ┌────────┐ │ │ │游商刷新  │ │
│ └──────────┘ │ │ │古物交互│ │ │ └──────────┘ │
│ ┌──────────┐ │ │ │(补给品)│ │ │ ┌──────────┐ │
│ │疗养院    │ │ │ └────────┘ │ │ │驿站刷新  │ │
│ │(怪癖/疾病│ │ │ ┌────────┐ │ │ │(新招募者)│ │
│ │  治疗)   │ │ │ │死亡之门│ │ │ └──────────┘ │
│ └──────────┘ │ │ │(抗性)  │ │ │ ┌──────────┐ │
│ ┌──────────┐ │ │ └────────┘ │ │ │城镇事件  │ │
│ │铁匠/公会 │ │ │ ┌────────┐ │ │ │(随机触发)│ │
│ │(装备升级)│ │ │ │扎营系统│ │ │ └──────────┘ │
│ └──────────┘ │ │ │(技能)  │ │ │ ┌──────────┐ │
│ ┌──────────┐ │ │ └────────┘ │ │ │区域建筑  │ │
│ │区域建筑  │ │ │ ┌────────┐ │ │ │(被动增益)│ │
│ │(DLC增益) │ │ │ │走廊事件│ │ │ └──────────┘ │
│ └──────────┘ │ │ │(饥饿/  │ │ │ ┌──────────┐ │
│ ┌──────────┐ │ │ │ 伏击)  │ │ │ │银行利息  │ │
│ │任务选择  │ │ │ └────────┘ │ │ │(区域建筑)│ │
│ │(委托生成)│ │ │ ┌────────┐ │ │ └──────────┘ │
│ └──────────┘ │ │ │撤退/   │ │ │ ┌──────────┐ │
│              │ │ │失败惩罚│ │ │ │蓝/记忆/  │ │
│              │ │ └────────┘ │ │ │水晶获取  │ │
│              │ │            │ │ └──────────┘ │
└──────────────┘ └────────────┘ └──────────────┘
         │              │              │
         └──────────────┼──────────────┘
                        ▼
┌──────────────────────────────────────────────────────┐
│              AI 叙事与判定层                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ CoT 战斗 │  │ RAG 检索 │  │ 加权随机池       │   │
│  │ 判定协议 │  │(向量+重排)│  │(怪癖/疾病/掉落) │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 15.2 验证用例更新

在原有 10 个验证用例基础上追加：

| # | 场景 | 验证目标 | 数据来源 |
|---|---|---|---|
| 11 | 英雄在酒馆酒吧释放压力 | 副作用权重计算 + 怪癖上限替换 | tavern.building.json |
| 12 | 疗养院移除负面怪癖 | 费用计算（升级折扣） + 槽位占用 | sanitarium.building.json |
| 13 | 接受短难度1Ruins任务 | 任务生成 + 奖励计算（3000g） | quest.generation.json |
| 14 | 任务失败退出 | 20点压力伤害应用 | quest.exit_penalty.json |
| 15 | 周推进结算 | 活动完成 + 招募者刷新 + 任务刷新 | stage_coach.building.json |
| 16 | 游商马车购买稀有饰品 | 稀有度生成权重 + 折扣计算 | nomad_wagon.building.json |
| 17 | 建造银行区域建筑 | 蓝图消耗 + 每周5%利息计算 | districts_districts.json |
| 18 | 驿站马车升级招募者 | 概率判定 + 额外怪癖/技能分配 | stage_coach.building.json |
| 19 | 英雄在修道院失踪 | 失踪周数设置 + 回归判定 | abbey.building.json |
| 20 | 疾病治疗概率检定 | 33%/67%/100% 三级概率 | sanitarium.building.json |
| 21 | 长地牢完成后饰品掉落 | 难度×长度概率表查询 | quest.generation.json |
| 22 | 建造磨坊禁用饥饿 | 区域建筑被动效果应用 | color_of_madness.districts.json |

### 15.3 系统依赖关系更新

```
任务系统 ─┬─→ 地牢地图生成（任务类型决定地图结构）
          ├─→ 遭遇表加载（难度决定怪物池）
          ├─→ 奖励计算（难度×长度→金币/经验/传家宝/饰品）
          └─→ 解锁进度（完成任务数→解锁新地牢/建筑）

城镇活动 ─┬─→ 压力系统（压力释放值）
          ├─→ 怪癖系统（副作用→获得/替换怪癖）
          ├─→ 疾病系统（疗养院→治疗疾病）
          └─→ BUFF系统（活动→临时BUFF）

周推进 ───┬─→ 城镇活动结算
          ├─→ 任务刷新
          ├─→ 驿站马车刷新
          ├─→ 游商马车刷新
          ├─→ 城镇事件触发
          ├─→ 失踪英雄回归
          └─→ 区域建筑被动效果（银行利息等）

饰品系统 ─┬─→ 游商马车（购买）
          ├─→ 任务奖励（完成掉落）
          ├─→ 古物交互（特定掉落）
          ├─→ Boss击杀（奖杯饰品）
          └─→ 城镇活动副作用（获得/失去）

DLC建筑 ──┬─→ 蓝图/水晶/记忆货币消耗
          ├─→ 光照系统修正（插画师公会）
          ├─→ 金币利息（银行）
          ├─→ 饥饿禁用（磨坊）
          └─→ 物品效果替换（污染之井/瘴气果园）
```

---

## 16. 设计门结论（更新）

- 通过项：全部核心系统数据已从 DD 源文件提取并验证，包括城镇活动、任务生成、饰品、周推进、DLC区域建筑
- 退回项：无
- 未验证项：
  - .darkest 完整解析器尚未编写（需首版 Probe）
  - DLC区域建筑的完整Buff效果需在运行时验证
  - 马戏团建筑数据需进一步提取（circus.building.json 仅基础结构）
- 建议：所有核心系统设计已完成，进入阶段路线图
  - Phase 1: 数据提取脚本 + JSON 数据库生成
  - Phase 2: 核心规则引擎（战斗/地图/古物/压力）
  - Phase 3: 城镇 UI + 周推进系统
  - Phase 4: AI 叙事层集成
  - Phase 5: DLC 内容适配 + Mod 支持
