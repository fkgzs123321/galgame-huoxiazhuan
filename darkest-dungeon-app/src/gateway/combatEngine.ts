// ============================================================
// 暗黑地牢战斗引擎 v1
// 核心：伤害计算、技能解析、站位系统、状态效果
// ============================================================

import type { HeroInstance, MonsterInstance, HeroData, MonsterData, HeroSkillEntry, MonsterSkill } from '@/types';
import { calculateHeroBuffs } from '@/gateway/trinketSystem';
import { getCurseCombatMods } from '@/gateway/crimsonSystem';
import { monsterZh } from '@/data/zhNames';
import {
  checkStressState,
  heartAttack as resolveHeartAttack,
  getAfflictionById,
  getVirtueById,
} from '@/gateway/stressSystem';

// ---- 战斗实体（运行时战斗状态） ----

export interface Combatant {
  uid: string;
  side: 'hero' | 'enemy';
  classId: string;
  name: string;
  position: number;        // 1~4
  currentHp: number;
  maxHp: number;
  stress: number;
  prot: number;            // 防护值（减伤百分比 0~1）
  dodge: number;           // 闪避率 0~1
  speed: number;           // 速度（决定行动顺序）
  crit: number;            // 暴击率 0~1
  atkMod: number;          // 攻击修正 0~1（来自武器/buff）
  dmgMin: number;          // 武器基础伤害下限
  dmgMax: number;          // 武器基础伤害上限
  stunResist: number;
  bleedResist: number;
  poisonResist: number;
  moveResist: number;
  debuffResist: number;
  isStunned: boolean;
  isDead: boolean;
  onDeathDoor: boolean;    // 死亡之门
  marks: string[];         // 标记（被标记的目标）
  buffs: Buff[];
  dots: DoT[];             // 持续伤害效果
  skills: CombatSkill[];
  size: number;            // 体型（1=普通，2=大型）
  affliction?: string | null;   // 崩溃状态ID（英雄）
  virtue?: string | null;       // 美德状态ID（英雄）
  resolveLevel?: number;        // 决心等级（英雄）
}

export interface Buff {
  id: string;
  stat: string;            // 'dmg' | 'prot' | 'dodge' | 'crit' | 'spd' | 'atk' | 'stress_resist'
  amount: number;          // 正=增益, 负=减益
  duration: number;        // 回合数
  source: string;          // 来源
}

export interface DoT {
  type: 'bleed' | 'blight' | 'stun';
  damagePerTurn: number;
  turnsRemaining: number;
  source: string;
}

export interface CombatSkill {
  id: string;
  name: string;
  type: 'melee' | 'ranged' | 'heal' | 'buff' | 'move';
  atk: number;             // 命中率 0~1
  dmgMod: number;          // 伤害修正 -1~1（如 -0.5 = 减50%）
  crit: number;            // 暴击率 0~1
  launchPositions: number[];  // 发动位置数组
  targetPositions: number[];  // 可选目标位置数组
  targetSide: 'enemy' | 'ally' | 'self';
  effects: string[];
  isStun: boolean;
  isHeal: boolean;
  healMin?: number;
  healMax?: number;
  movePositions?: number[];   // 移动技能的位移
  perBattleLimit?: number;
  perBattleUsed?: number;
}

// ---- 战斗日志 ----

export interface CombatLogEntry {
  turn: number;
  actor: string;
  action: string;
  target: string;
  result: string;
  damage?: number;
  crit?: boolean;
  miss?: boolean;
  actorUid?: string;
  targetUid?: string;
  isHeal?: boolean;
}

export interface BattleState {
  heroes: Combatant[];
  enemies: Combatant[];
  turn: number;
  turnOrder: string[];     // uid 顺序
  currentActorIndex: number;
  log: CombatLogEntry[];
  isFinished: boolean;
  winner: 'hero' | 'enemy' | null;
}

// ============================================================
// 工具函数
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rand(): number {
  return Math.random();
}

// 将位置编码字符串（如 "1234", "~12", "@1234"）解析为位置数组
export function parsePositionCode(code: string): { positions: number[]; isAll: boolean; isAllies: boolean } {
  if (!code) return { positions: [], isAll: false, isAllies: false };
  
  const isAllies = code.startsWith('@');
  const cleanCode = code.replace(/[@~]/g, '');
  const positions: number[] = [];
  
  for (const ch of cleanCode) {
    const pos = parseInt(ch);
    if (pos >= 1 && pos <= 4) {
      positions.push(pos);
    }
  }
  
  return { positions, isAll: false, isAllies };
}

// 将 launch 编码（如 1234 = 位置1,2,3,4 均可发动）解析为位置数组
export function parseLaunchCode(code: string | number): number[] {
  const str = String(code);
  const positions: number[] = [];
  for (const ch of str) {
    const pos = parseInt(ch);
    if (pos >= 1 && pos <= 4) {
      positions.push(pos);
    }
  }
  return positions;
}

// ============================================================
// 英雄实例 → 战斗实体 转换
// ============================================================

export function heroToCombatant(
  hero: HeroInstance,
  heroData: HeroData | undefined
): Combatant {
  const armorLevel = clamp(hero.armorLevel, 0, 4);
  const weaponLevel = clamp(hero.weaponLevel, 0, 4);
  
  const armor = heroData?.armour?.[armorLevel];
  const weapon = heroData?.weapons?.[weaponLevel];
  
  const maxHp = hero.maxHp;
  let dodge = armor?.def ?? 0.05;
  let prot = armor?.prot ?? 0;
  let spd = (weapon?.spd ?? 0) + (armor?.spd ?? 0);
  let crit = weapon?.crit ?? 0;
  let dmgMin = weapon?.dmg_min ?? 5;
  let dmgMax = weapon?.dmg_max ?? 10;
  let atkMod = weapon?.atk ?? 0;
  let hpBonus = 0;

  // 血腥诅咒战斗修正（Crimson Court DLC）：嗜血/狂暴期伤害提升
  const curseMods = getCurseCombatMods(hero);
  if (curseMods.dmgMod > 0) {
    dmgMin = Math.max(1, Math.round(dmgMin * (1 + curseMods.dmgMod)));
    dmgMax = Math.max(1, Math.round(dmgMax * (1 + curseMods.dmgMod)));
  }
  
  const resistances = heroData?.resistances ?? {};
  let stunResist = resistances.stun ?? 0.4;
  let bleedResist = resistances.bleed ?? 0.2;
  let poisonResist = resistances.poison ?? 0.2;
  let moveResist = resistances.move ?? 0.2;
  let debuffResist = resistances.debuff ?? 0.2;

  // 应用饰品加成（如果饰品数据库已加载）
  const trinketBuffs = calculateHeroBuffs(hero.trinket1, hero.trinket2);
  for (const buff of trinketBuffs) {
    const amount = buff.isPercentage ? buff.amount / 100 : buff.amount;
    switch (buff.stat) {
      case 'dmg':
        dmgMin = Math.max(1, Math.round(dmgMin * (1 + amount)));
        dmgMax = Math.max(1, Math.round(dmgMax * (1 + amount)));
        break;
      case 'prot':
        prot = clamp(prot + amount, 0, 0.8);
        break;
      case 'dodge':
        dodge = clamp(dodge + amount, 0, 0.75);
        break;
      case 'crit':
        crit = clamp(crit + amount, 0, 0.5);
        break;
      case 'spd':
        spd += amount;
        break;
      case 'max_hp':
        hpBonus += Math.round(amount);
        break;
      case 'atk':
        atkMod = clamp(atkMod + amount, -0.5, 0.5);
        break;
      case 'stress_resist':
        break; // 压力抗性在战斗外处理
      case 'stun_resist':
        stunResist = clamp(stunResist + amount, 0, 0.95);
        break;
      case 'bleed_resist':
        bleedResist = clamp(bleedResist + amount, 0, 0.95);
        break;
      case 'poison_resist':
        poisonResist = clamp(poisonResist + amount, 0, 0.95);
        break;
      case 'move_resist':
        moveResist = clamp(moveResist + amount, 0, 0.95);
        break;
      case 'debuff_resist':
        debuffResist = clamp(debuffResist + amount, 0, 0.95);
        break;
    }
  }

  const finalMaxHp = maxHp + hpBonus;
  
  // 构建战斗技能列表
  const skills: CombatSkill[] = [];
  const uniqueSkillIds = new Set(hero.skills);
  
  for (const skillId of uniqueSkillIds) {
    if (!heroData) continue;
    const skillEntries = heroData.skills.filter(s => s.id === skillId && !s.is_move);
    if (skillEntries.length === 0) continue;
    
    // 使用最高等级的技能数据
    const bestSkill = skillEntries.reduce((max, s) => (s.level > max.level ? s : max));
    const skill = skillToCombatSkill(bestSkill);
    if (skill) skills.push(skill);
  }
  
  // 添加移动技能
  skills.push({
    id: 'move',
    name: '移动',
    type: 'move',
    atk: 1,
    dmgMod: 0,
    crit: 0,
    launchPositions: [1, 2, 3, 4],
    targetPositions: [1, 2, 3, 4],
    targetSide: 'self',
    effects: [],
    isStun: false,
    isHeal: false,
  });
  
  return {
    uid: hero.uid,
    side: 'hero',
    classId: hero.classId,
    name: hero.name,
    position: 1,  // 默认位置，后续由编队设置
    currentHp: hero.currentHp,
    maxHp: finalMaxHp,
    stress: hero.stress,
    prot,
    dodge,
    speed: spd + Math.floor(rand() * 8),  // DD 的先攻掷骰
    crit,
    atkMod,
    dmgMin,
    dmgMax,
    stunResist,
    bleedResist,
    poisonResist,
    moveResist,
    debuffResist,
    isStunned: false,
    isDead: false,
    onDeathDoor: hero.isDeathsDoor ?? false,
    marks: [],
    buffs: [],
    dots: [],
    skills,
    size: 1,
    affliction: hero.affliction ?? null,
    virtue: hero.virtue ?? null,
    resolveLevel: hero.resolveLevel,
  };
}

// ============================================================
// 怪物实例 → 战斗实体 转换
// ============================================================

export function monsterToCombatant(
  monster: MonsterData,
  position: number,
  uid: string
): Combatant {
  const skills: CombatSkill[] = [];
  const seenSkills = new Set<string>();
  
  for (const skill of monster.skills) {
    if (seenSkills.has(skill.id)) continue;
    seenSkills.add(skill.id);
    const cs = monsterSkillToCombatSkill(skill);
    if (cs) skills.push(cs);
  }
  
  return {
    uid,
    side: 'enemy',
    classId: monster.id,
    name: monsterZh(monster.id),
    position,
    currentHp: monster.maxHp,
    maxHp: monster.maxHp,
    stress: 0,
    prot: monster.prot ?? 0,
    dodge: monster.dodge ?? 0,
    speed: monster.spd + Math.floor(rand() * 8),
    crit: 0,
    atkMod: 0,
    dmgMin: monster.skills[0]?.dmg_min ?? 3,
    dmgMax: monster.skills[0]?.dmg_max ?? 6,
    stunResist: monster.resistances?.stun ?? 0.5,
    bleedResist: monster.resistances?.bleed ?? 0.2,
    poisonResist: monster.resistances?.poison ?? 0.2,
    moveResist: monster.resistances?.move ?? 0.75,
    debuffResist: monster.resistances?.debuff ?? 0.15,
    isStunned: false,
    isDead: false,
    onDeathDoor: false,
    marks: [],
    buffs: [],
    dots: [],
    skills,
    size: monster.size ?? 1,
  };
}

// ============================================================
// 技能转换
// ============================================================

function skillToCombatSkill(skill: HeroSkillEntry): CombatSkill | null {
  if (skill.is_move || skill.id === 'move') return null;
  
  const launchRaw = skill.launch_raw ?? String(skill.launch ?? '');
  const targetRaw = skill.target_raw ?? skill.target ?? '';
  
  const launchPositions = parseLaunchCode(launchRaw);
  const targetParsed = parsePositionCode(targetRaw);
  
  const isHeal = skill.heal !== undefined || skill.id === 'battle_heal' || skill.id === 'divine_grace' || skill.id === 'divine_comfort' || skill.id === 'battle_bandage' || skill.id === 'inspiring_cry';
  const isStun = skill.effects?.some(e => e.toLowerCase().includes('stun')) ?? false;
  
  let healMin: number | undefined;
  let healMax: number | undefined;
  if (skill.heal && typeof skill.heal === 'string') {
    const parts = (skill.heal as string).split(/\s+/);
    healMin = parseInt(parts[0]);
    healMax = parseInt(parts[1]) || healMin;
  }
  
  const targetSide: 'enemy' | 'ally' | 'self' = targetParsed.isAllies ? 'ally' : 'enemy';
  
  return {
    id: skill.id,
    name: skill.id.replace(/_/g, ' '),
    type: (skill.type as 'melee' | 'ranged') ?? 'melee',
    atk: skill.atk ?? 0.85,
    dmgMod: (skill.dmg as number | undefined) ?? 0,
    crit: skill.crit ?? 0,
    launchPositions,
    targetPositions: targetParsed.positions.length > 0 ? targetParsed.positions : [1, 2, 3, 4],
    targetSide: isHeal ? 'ally' : targetSide,
    effects: skill.effects ?? [],
    isStun,
    isHeal,
    healMin,
    healMax,
    perBattleLimit: skill.per_battle_limit,
    perBattleUsed: 0,
  };
}

function monsterSkillToCombatSkill(skill: MonsterSkill): CombatSkill | null {
  const launchRaw = skill.launch_raw ?? '';
  const targetRaw = skill.target_raw ?? '';
  
  const launchPositions = parseLaunchCode(launchRaw);
  const targetParsed = parsePositionCode(targetRaw);
  
  const isStun = skill.effects?.some(e => e.toLowerCase().includes('stun')) ?? false;
  
  return {
    id: skill.id,
    name: skill.id.replace(/_/g, ' '),
    type: (skill.type as 'melee' | 'ranged') ?? 'melee',
    atk: skill.atk ?? 0.85,
    dmgMod: (skill.dmg as number | undefined) ?? 0,
    crit: skill.crit ?? 0,
    launchPositions,
    targetPositions: targetParsed.positions.length > 0 ? targetParsed.positions : [1, 2, 3, 4],
    targetSide: 'enemy',
    effects: skill.effects ?? [],
    isStun,
    isHeal: false,
  };
}

// ============================================================
// 伤害计算核心
// ============================================================

export interface DamageResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  killed: boolean;
  deathDoor: boolean;
  effectsApplied: string[];
  log: string;
}

export function calculateDamage(
  attacker: Combatant,
  target: Combatant,
  skill: CombatSkill
): DamageResult {
  const result: DamageResult = {
    hit: false,
    crit: false,
    damage: 0,
    killed: false,
    deathDoor: false,
    effectsApplied: [],
    log: '',
  };
  
  // 检查发动位置
  if (!skill.launchPositions.includes(attacker.position)) {
    result.log = `${attacker.name} 无法从位置 ${attacker.position} 发动 ${skill.name}`;
    return result;
  }
  
  // 检查目标位置
  if (!skill.targetPositions.includes(target.position)) {
    result.log = `${target.name} 不在 ${skill.name} 的有效目标范围内`;
    return result;
  }
  
  // 命中判定
  const baseHit = skill.atk + attacker.atkMod;
  const finalHit = clamp(baseHit - target.dodge, 0.05, 0.95);
  
  if (rand() > finalHit) {
    result.hit = false;
    result.log = `${attacker.name} 对 ${target.name} 使用 ${skill.name} — 未命中!`;
    return result;
  }
  result.hit = true;
  
  // 暴击判定
  const critChance = skill.crit + attacker.crit;
  result.crit = rand() < critChance;
  
  // 基础伤害（从武器/怪物伤害范围随机）
  const baseDamage = attacker.dmgMin + Math.floor(rand() * (attacker.dmgMax - attacker.dmgMin + 1));
  let damage = baseDamage * (1 + skill.dmgMod);
  
  // 暴击加成 (1.5x)
  if (result.crit) {
    damage *= 1.5;
  }
  
  // 减伤（prot）
  damage *= (1 - target.prot);
  
  // 取整
  damage = Math.max(1, Math.floor(damage));
  result.damage = damage;
  
  // 应用伤害
  target.currentHp -= damage;
  result.log = `${attacker.name} 对 ${target.name} 使用 ${skill.name} — 造成 ${damage} 点伤害${result.crit ? ' (暴击!)' : ''}`;
  
  // 死亡判定
  if (target.currentHp <= 0) {
    if (target.onDeathDoor) {
      // 死亡之门 -> 死亡
      target.isDead = true;
      target.currentHp = 0;
      result.killed = true;
      result.log += ` — ${target.name} 已死亡!`;
    } else {
      // 进入死亡之门
      target.onDeathDoor = true;
      target.currentHp = 0;
      result.deathDoor = true;
      result.log += ` — ${target.name} 进入死亡之门!`;
    }
  }
  
  // 应用效果
  if (skill.isStun && !target.isDead) {
    const stunChance = 1 - target.stunResist;
    if (rand() < stunChance) {
      target.isStunned = true;
      result.effectsApplied.push('stun');
      result.log += ` (眩晕)`;
    }
  }
  
  // DoT 效果
  for (const effect of skill.effects) {
    const bleedMatch = effect.match(/Bleed\s*(\d+)/i);
    if (bleedMatch) {
      const dotDamage = parseInt(bleedMatch[1]);
      if (rand() > target.bleedResist) {
        target.dots.push({
          type: 'bleed',
          damagePerTurn: dotDamage,
          turnsRemaining: 3,
          source: skill.id,
        });
        result.effectsApplied.push('bleed');
      }
    }
    
    const blightMatch = effect.match(/Blight\s*(\d+)/i);
    if (blightMatch) {
      const dotDamage = parseInt(blightMatch[1]);
      if (rand() > target.poisonResist) {
        target.dots.push({
          type: 'blight',
          damagePerTurn: dotDamage,
          turnsRemaining: 3,
          source: skill.id,
        });
        result.effectsApplied.push('blight');
      }
    }
  }
  
  return result;
}

// ============================================================
// 治疗计算
// ============================================================

export function calculateHeal(
  attacker: Combatant,
  target: Combatant,
  skill: CombatSkill
): DamageResult {
  const result: DamageResult = {
    hit: true,
    crit: false,
    damage: 0,
    killed: false,
    deathDoor: false,
    effectsApplied: [],
    log: '',
  };
  
  const healMin = skill.healMin ?? 1;
  const healMax = skill.healMax ?? healMin;
  const healAmount = healMin + Math.floor(rand() * (healMax - healMin + 1));
  
  const actualHeal = Math.min(healAmount, target.maxHp - target.currentHp);
  target.currentHp += actualHeal;
  result.damage = -actualHeal;  // 负值表示治疗
  
  result.log = `${attacker.name} 对 ${target.name} 使用 ${skill.name} — 恢复 ${actualHeal} 点生命值`;
  
  return result;
}

// ============================================================
// 回合处理
// ============================================================

export function processDoTs(combatant: Combatant): string[] {
  const logs: string[] = [];
  
  for (const dot of combatant.dots) {
    if (dot.turnsRemaining <= 0) continue;
    
    combatant.currentHp -= dot.damagePerTurn;
    dot.turnsRemaining--;
    
    const dotName = dot.type === 'bleed' ? '流血' : dot.type === 'blight' ? '中毒' : '眩晕';
    logs.push(`${combatant.name} 受到 ${dot.damagePerTurn} 点${dotName}伤害 (剩余${dot.turnsRemaining}回合)`);
    
    if (combatant.currentHp <= 0) {
      if (combatant.onDeathDoor) {
        combatant.isDead = true;
        combatant.currentHp = 0;
        logs.push(`${combatant.name} 因${dotName}死亡!`);
      } else {
        combatant.onDeathDoor = true;
        combatant.currentHp = 0;
        logs.push(`${combatant.name} 进入死亡之门!`);
      }
    }
  }
  
  // 移除过期的 DoT
  combatant.dots = combatant.dots.filter(d => d.turnsRemaining > 0);
  
  return logs;
}

export function decrementBuffs(combatant: Combatant): void {
  for (const buff of combatant.buffs) {
    buff.duration--;
  }
  combatant.buffs = combatant.buffs.filter(b => b.duration > 0);
}

export function clearStun(combatant: Combatant): void {
  if (combatant.isStunned) {
    combatant.isStunned = false;
  }
}

// 计算先攻顺序
export function calculateTurnOrder(allCombatants: Combatant[]): string[] {
  const alive = allCombatants.filter(c => !c.isDead);
  // 按速度降序排列
  alive.sort((a, b) => b.speed - a.speed);
  return alive.map(c => c.uid);
}

// 检查战斗是否结束
export function checkBattleEnd(state: BattleState): boolean {
  const heroesAlive = state.heroes.some(h => !h.isDead);
  const enemiesAlive = state.enemies.some(e => !e.isDead);
  
  if (!heroesAlive) {
    state.isFinished = true;
    state.winner = 'enemy';
    return true;
  }
  if (!enemiesAlive) {
    state.isFinished = true;
    state.winner = 'hero';
    return true;
  }
  return false;
}

// 创建初始战斗状态
export function createBattle(
  heroes: Combatant[],
  enemies: Combatant[]
): BattleState {
  // 设置英雄位置（按数组顺序 1~4）
  heroes.forEach((h, i) => {
    h.position = i + 1;
  });
  enemies.forEach((e, i) => {
    e.position = i + 1;
  });
  
  const allCombatants = [...heroes, ...enemies];
  const turnOrder = calculateTurnOrder(allCombatants);
  
  return {
    heroes,
    enemies,
    turn: 1,
    turnOrder,
    currentActorIndex: 0,
    log: [{
      turn: 0,
      actor: '系统',
      action: '战斗开始',
      target: '',
      result: `先攻顺序: ${turnOrder.join(' → ')}`,
    }],
    isFinished: false,
    winner: null,
  };
}

// ============================================================
// 战斗中的压力判定（崩溃 / 美德 / 心脏病）
// ============================================================

export interface CombatStressOutcome {
  heartAttack: boolean;
  dead: boolean;
  messages: string[];
}

// 应用崩溃/美德带来的战斗 buff/debuff
function applyStateBuffs(combatant: Combatant, afflictionId?: string | null, virtueId?: string | null): void {
  // 先清除旧状态 buff
  combatant.buffs = combatant.buffs.filter((b) => b.source !== '__affliction' && b.source !== '__virtue');

  if (afflictionId) {
    const aff = getAfflictionById(afflictionId);
    if (aff) {
      switch (aff.id) {
        case 'paranoia':
          combatant.buffs.push({ id: 'aff_paranoia', stat: 'atk', amount: -0.1, duration: 999, source: '__affliction' });
          break;
        case 'abusive':
          combatant.buffs.push({ id: 'aff_abusive', stat: 'atk', amount: 0.1, duration: 999, source: '__affliction' });
          break;
        case 'fearful':
          combatant.buffs.push({ id: 'aff_fearful', stat: 'dodge', amount: -0.1, duration: 999, source: '__affliction' });
          break;
        case 'irrational':
          combatant.buffs.push({ id: 'aff_irrational', stat: 'atk', amount: -0.15, duration: 999, source: '__affliction' });
          break;
        default:
          break;
      }
    }
  }

  if (virtueId) {
    const virt = getVirtueById(virtueId);
    if (virt) {
      switch (virt.id) {
        case 'courageous':
          combatant.buffs.push({ id: 'virt_courageous', stat: 'atk', amount: 0.15, duration: 999, source: '__virtue' });
          break;
        case 'steadfast':
          combatant.buffs.push({ id: 'virt_steadfast', stat: 'dodge', amount: 0.1, duration: 999, source: '__virtue' });
          break;
        case 'stalwart':
          combatant.buffs.push({ id: 'virt_stalwart', stat: 'prot', amount: 0.2, duration: 999, source: '__virtue' });
          break;
        case 'focused':
          combatant.buffs.push({ id: 'virt_focused', stat: 'atk', amount: 0.15, duration: 999, source: '__virtue' });
          combatant.buffs.push({ id: 'virt_focused_c', stat: 'crit', amount: 0.05, duration: 999, source: '__virtue' });
          break;
        case 'powerful':
          combatant.buffs.push({ id: 'virt_powerful', stat: 'dmg', amount: 0.2, duration: 999, source: '__virtue' });
          break;
        default:
          break;
      }
    }
  }
}

// 处理战斗中的压力判定。返回是否心脏病发作及是否死亡。
export function resolveCombatStress(combatant: Combatant): CombatStressOutcome {
  const outcome: CombatStressOutcome = { heartAttack: false, dead: false, messages: [] };

  // 压力 >= 200：心脏病发作
  if (combatant.stress >= 200) {
    const { dead, stressReset } = resolveHeartAttack(combatant);
    outcome.heartAttack = true;
    if (dead) {
      combatant.isDead = true;
      combatant.currentHp = 0;
      outcome.dead = true;
    } else {
      combatant.stress = stressReset;
      combatant.affliction = null;
      combatant.virtue = null;
      combatant.buffs = combatant.buffs.filter((b) => b.source !== '__affliction' && b.source !== '__virtue');
    }
    outcome.messages.push(dead ? `${combatant.name} 心脏病发作，当场死亡！` : `${combatant.name} 挺过了心脏病发作，压力回落到 ${stressReset}`);
    return outcome;
  }

  // 压力 >= 100 且无状态：判定
  if (combatant.stress >= 100 && !combatant.affliction && !combatant.virtue) {
    const { state, result } = checkStressState(
      combatant.stress,
      resolveLevelOf(combatant),
      false,
      false
    );

    if (result?.isVirtue && result.virtue) {
      combatant.virtue = result.virtue.id;
      combatant.affliction = null;
      applyStateBuffs(combatant, null, result.virtue.id);
      outcome.messages.push(`${combatant.name} 在压力中展现了美德「${result.virtue.name}」！`);
    } else if (result?.isAffliction && result.affliction) {
      combatant.affliction = result.affliction.id;
      combatant.virtue = null;
      applyStateBuffs(combatant, result.affliction.id, null);
      outcome.messages.push(`${combatant.name} 的精神崩溃了，陷入「${result.affliction.name}」！`);
    }
  }

  return outcome;
}

// 从战斗者估算决心等级（英雄才有，默认0）
function resolveLevelOf(combatant: Combatant): number {
  return combatant.resolveLevel ?? 0;
}
