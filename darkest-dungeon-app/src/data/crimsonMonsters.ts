// ============================================================
// 绯红庭院怪物数据（Crimson Court DLC）
// 数据缺失时的手写补充——结构与提取的 dd-db/monsters.json 一致
// ============================================================

import type { MonsterData } from '@/types';

export const crimsonMonsters: MonsterData[] = [
  {
    id: 'crimson_mosquito',
    name: '血蚊群',
    monsterClass: 'bloodsucker',
    maxHp: 8,
    dodge: 0.12,
    prot: 0,
    spd: 8,
    resistances: { stun: 0.3, move: 0.5, bleed: 0.8, poison: 0.3, disease: 0.8, debuff: 0.4, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'blood_siphon', type: 'ranged', atk: 0.85, dmg_min: 1, dmg_max: 3, crit: 0.03, launch_raw: '1234', target_raw: '1234', effects: ['Bleed 1'] },
    ],
    size: 1,
    enemyType: 'bloodsucker',
  },
  {
    id: 'crimson_bloodtick',
    name: '血蜱',
    monsterClass: 'bloodsucker',
    maxHp: 14,
    dodge: 0.1,
    prot: 0.1,
    spd: 5,
    resistances: { stun: 0.3, move: 0.3, bleed: 0.8, poison: 0.4, disease: 0.8, debuff: 0.3, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'engorge', type: 'melee', atk: 0.85, dmg_min: 2, dmg_max: 5, crit: 0.02, launch_raw: '1234', target_raw: '12' },
    ],
    size: 1,
    enemyType: 'bloodsucker',
  },
  {
    id: 'crimson_courtier',
    name: '血色侍从',
    monsterClass: 'vampire',
    maxHp: 26,
    dodge: 0.15,
    prot: 0,
    spd: 7,
    resistances: { stun: 0.4, move: 0.4, bleed: 0.5, poison: 0.4, disease: 0.8, debuff: 0.4, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'goblet_toast', type: 'ranged', atk: 0.85, dmg_min: 3, dmg_max: 6, crit: 0.05, launch_raw: '234', target_raw: '1234', effects: ['Stress 4'] },
      { id: 'blood_lash', type: 'melee', atk: 0.9, dmg_min: 4, dmg_max: 7, crit: 0.08, launch_raw: '1234', target_raw: '12' },
    ],
    size: 1,
    enemyType: 'vampire',
  },
  {
    id: 'crimson_essence',
    name: '疫之精华',
    monsterClass: 'blight',
    maxHp: 30,
    dodge: 0.05,
    prot: 0.25,
    spd: 3,
    resistances: { stun: 0.5, move: 0.5, bleed: 0.5, poison: 0.9, disease: 0.9, debuff: 0.6, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'creeping_blight', type: 'ranged', atk: 0.8, dmg_min: 2, dmg_max: 5, crit: 0, launch_raw: '1234', target_raw: '1234', effects: ['Blight 2'] },
      { id: 'blood_vomit', type: 'ranged', atk: 0.8, dmg_min: 3, dmg_max: 6, crit: 0, launch_raw: '1234', target_raw: '1234' },
    ],
    size: 1,
    enemyType: 'blight',
  },
  {
    id: 'crimson_noble',
    name: '血裔贵族',
    monsterClass: 'vampire',
    maxHp: 44,
    dodge: 0.2,
    prot: 0.15,
    spd: 6,
    resistances: { stun: 0.5, move: 0.5, bleed: 0.5, poison: 0.5, disease: 0.9, debuff: 0.5, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'imperial_slash', type: 'melee', atk: 0.95, dmg_min: 6, dmg_max: 11, crit: 0.1, launch_raw: '12', target_raw: '12' },
      { id: 'commanding_scream', type: 'ranged', atk: 0.85, dmg_min: 0, dmg_max: 0, crit: 0, launch_raw: '1234', target_raw: '1234', effects: ['Stress 6', 'Debuff 1'] },
    ],
    size: 2,
    enemyType: 'vampire',
  },
];
