// DD 资产加载器 — 动态加载 manifest.json 并提供资产路径查询
interface AssetManifest {
  basePath: string;
  heroes: Record<string, {
    abilities: { name: string; path: string }[];
    portraits: string[];
    equipIcons: string[];
  }>;
  monsters: Record<string, string[]>;
  trinkets: string[];
  provisions: string[];
  buildings: string[];
}

let manifestCache: AssetManifest | null = null;

// 技能槽位编号映射
const slotNames = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];

// 英雄技能顺序（DD 游戏中的固定顺序）
const heroSkillOrder: Record<string, string[]> = {
  crusader: ['smite', 'stunning_blow', 'holy_lance', 'battle_heal', 'bulwark_of_faith', 'inspiring_cry', 'zealous_accusation'],
  highwayman: ['wicked_slice', 'pistol_shot', 'point_blank_shot', 'open_vein', 'grape_shot_blast', 'dueling_advance', 'tracking_shot'],
  vestal: ['mace_bash', 'judgment', 'divine_grace', 'divine_comfort', 'dazzling_light', 'illumination', 'hand_of_light'],
  plague_doctor: ['noxious_blast', 'plague_grenade', 'blinding_gas', 'battle_bandage', 'disorienting_blast', 'emboldening_vapours', 'incision'],
  hellion: ['wicked_hack', 'barbaric_yarp', 'if_it_bleeds', 'iron_swan', 'yell', 'adrenaline_rush', 'bleed_out'],
  leper: ['chop', 'hew', 'stand_fast', 'solemnity', 'vengeance', 'purge', 'intimidate'],
  bounty_hunter: ['collect_bounty', 'come_hither', 'flashbang', 'point_blank_shot', 'finish_him', 'mark_for_death', 'uppercut'],
  occultist: ['hands_from_abyss', 'daggers_from_abyss', 'weakening_curse', 'sacrificial_stab', 'wyrd_reconstruction', 'vulnerability_hex', 'ancestral_curse'],
  grave_robber: ['pick_to_the_face', 'throwing_dagger', 'hidden_pocket', 'poison_dart', 'blight_dart', 'absinthe', 'lunge'],
  jester: ['knife_fade', 'harvest', 'battle_ballad', 'finale', 'inspiring_tune', 'slice_off', 'battle_drum'],
  arbalest: ['crossbow', 'sniper_shot', 'blindfire', 'bola', 'rallying_flare', 'suppressing_fire', 'healing_field'],
  antiquarian: ['kris_stab', 'invigorating_vapours', 'protect_me', 'festering_vapours', 'nervous_saw', 'nervous_stab', 'get_down'],
  abomination: ['transform', 'rakish_claw', 'rage', 'sub_plague', 'beast_bite', 'human_stun', 'abscess'],
  flagellant: ['punish', 'rain_of_sorrow', 'reclaim', 'revel', 'suffer', 'flagellate', 'endure'],
  houndmaster: ['hounds_harry', 'hounds_rush', 'cry_havoc', 'guard_dog', 'black_mark', 'targets_bark', 'lick_wounds'],
  shieldbreaker: ['puncture', 'captivate', 'snake_bite', 'panic_saw', 'impale', 'piercing_saw', 'adders_kiss'],
  man_at_arms: ['crush', 'bumpkin_command', 'defend', 'retribution', 'riposte', 'command', 'repel'],
};

export async function loadManifest(): Promise<AssetManifest> {
  if (manifestCache) return manifestCache;

  try {
    const res = await fetch('/dd-assets/manifest.json');
    if (!res.ok) throw new Error('manifest.json not found');
    manifestCache = (await res.json()) as AssetManifest;
    return manifestCache;
  } catch {
    console.warn('[DD] 资产清单未找到，请运行 npm run copy-assets');
    manifestCache = { basePath: '', heroes: {}, monsters: {}, trinkets: [], provisions: [], buildings: [] };
    return manifestCache;
  }
}

// 获取英雄技能图标路径
export function getSkillIconPath(heroClass: string, skillId: string): string | null {
  if (!manifestCache) return null;

  const hero = manifestCache.heroes[heroClass];
  if (!hero) return null;

  // 获取技能在英雄技能列表中的位置
  const skillOrder = heroSkillOrder[heroClass];
  if (!skillOrder) return null;

  const slotIndex = skillOrder.indexOf(skillId);
  if (slotIndex < 0 || slotIndex >= 7) return null;

  const slotName = slotNames[slotIndex];
  const ability = hero.abilities.find(a => a.name === slotName);
  return ability?.path ?? null;
}

// 获取英雄装备图标路径
export function getEquipIconPath(heroClass: string, type: 'weapon' | 'armour', level: number): string | null {
  if (!manifestCache) return null;

  const hero = manifestCache.heroes[heroClass];
  if (!hero) return null;

  const prefix = type === 'weapon' ? 'eqp_weapon' : 'eqp_armour';
  const iconPath = hero.equipIcons.find(p => p.includes(`${prefix}_${level}`));
  return iconPath ?? null;
}

// 获取怪物精灵图路径（优先本地提取资产，回退 manifest）
export function getMonsterSpritePath(monsterId: string): string | null {
  // 本地提取的怪物贴图（tint 剪影，72 张）
  const local = `/assets/dd/monsters/${monsterId}.png`;
  // 同步无法探测文件存在性，直接返回本地路径（onError 由组件兜底为 ☠）
  if (monsterId && /^[a-z0-9_]+$/.test(monsterId)) return local;
  if (!manifestCache) return null;
  const sprites = manifestCache.monsters[monsterId];
  return sprites && sprites.length > 0 ? sprites[0] : null;
}

// 预加载所有资产
export async function preloadAssets(): Promise<void> {
  await loadManifest();
}
