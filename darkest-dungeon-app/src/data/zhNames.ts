// 中文翻译层 — 怪物/饰品/技能/怪癖 id → 中文（词根字典 + 兜底）
// 数据源为英文 id（如 brigand_cutthroat_A），通过词根拼接生成可读中文名

// ---------- 怪物词根 ----------
const MONSTER_ROOTS: Record<string, string> = {
  // 亡灵
  skeleton: '骷髅', bone: '骨', militia: '民兵', arbalist: '弩手', sword: '剑士',
  shield: '盾卫', spear: '矛兵', courtier: '朝臣', ghoul: '食尸鬼', corpse: '尸骸',
  bloated: '肿胀', carrion: '腐尸', eater: '食者', dead: '亡者',
  // 邪教
  cultist: '邪教徒', brawler: '斗士', witch: '女巫', acolyte: '侍僧', priest: '祭司',
  zealot: '狂热者', rabble: '暴徒', supplicant: '祈求者',
  // 匪徒
  brigand: '匪徒', cutthroat: '割喉者', fuseman: '引信手', fusilier: '火枪手',
  raider: '劫掠者', sapper: '工兵', cannon: '加农炮', barrel: '火药桶', blood: '血奴',
  hunter: '猎手', dog: '恶犬', hound: '猎犬',
  // 猪人
  swine: '猪人', skiver: '剥皮者', wretch: '贱民', drummer: '鼓手', slayer: '屠夫',
  chopper: '剁肉者', retcher: '呕秽者', wretch_puppet: '傀儡',
  // 旷野/兽
  giant: '巨人', wolf: '狼', spider: '蜘蛛', webber: '织网者', crone: '老妪',
  hag: '林中老妪', cauldron: '大锅', rabid: '狂犬', 
  // 海湾鱼人
  pelagic: '远洋者', fishman: '鱼人', grouper: '石斑鱼人', guardian: '守护者',
  shaman: '萨满', crab: '巨蟹', crusher: '粉碎者', squeezer: '钳击者',
  // 庭院血裔
  bloodsucker: '吸血鬼', mosquito: '血蚊', sycophant: '谄媚者',
  crocodilian: '鳄鱼怪', noble: '贵族', thrall: '奴仆',
  // 收集者/特殊
  collector: '收集者', shambler: '蹒跚者', prophet: '预言者', summon: '召唤',
  // 先祖/古神
  ancestor: '先祖', heart: '之心', pod: '之荚', small: '幼体', flawed: '残缺',
  perfect: '完美', nebula: '星云', big: '巨型', flesh: '血肉', tentacle: '触手',
  eye: '眼', stalker: '潜行者', drowned: '溺亡者', choir: '唱诗班', madman: '疯人',
  // 通用修饰
  champion: '冠军', elite: '精英', guard: '守卫', bandit: '匪盗', brig: '匪',
  caretaker: '看守', graverobber: '盗墓者', body: '躯体', servant: '仆从',
  // 怪物类名
  eldritch: '异能', human: '人类', beast: '野兽', unholy: '不洁', cosmic: '星外',
  formless: '无形', slug: '黏液怪', octopus: '章鱼', jelly: '水母', eel: '鳗',
  thing: '之物', ooze: '软泥', mushroom: '蘑菇', fungal: '真菌', spore: '孢子',
  cobra: '眼镜蛇', snake: '蛇',
  drudge: '苦工', fanatic: '狂热者', mendicant: '托钵僧',
};

// 忽略的词（变体标记等）
const IGNORE_WORDS = new Set(['a', 'b', 'c', 'd', 'e', 'elite', 'stall', 'solo']);

// 怪物 id → 中文名（brigand_cutthroat_A → 匪徒割喉者）
function zhLookup(word: string, roots: Record<string, string>): string {
  const w = word.toLowerCase();
  if (roots[w]) return roots[w];
  // 复数兜底：去尾 's' / 'es' 再查
  if (w.endsWith('es') && roots[w.slice(0, -2)]) return roots[w.slice(0, -2)];
  if (w.endsWith('s') && roots[w.slice(0, -1)]) return roots[w.slice(0, -1)];
  return '';
}

export function monsterZh(id: string): string {
  const parts = id.split('_').filter((p) => !IGNORE_WORDS.has(p.toLowerCase()));
  const zhParts = parts
    .map((p) => zhLookup(p, MONSTER_ROOTS))
    .filter(Boolean);
  if (zhParts.length > 0) return zhParts.join('');
  // 兜底：美化原 id
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- 饰品词根 ----------
const TRINKET_ROOTS: Record<string, string> = {
  sun: '太阳', moon: '月亮', star: '星辰', torch: '火把', light: '光明', dark: '黑暗',
  crow: '乌鸦', raven: '渡鸦', blood: '血', death: '死亡', life: '生命', soul: '灵魂',
  bone: '骨', gold: '金', silver: '银', iron: '铁', bronze: '青铜', crystal: '水晶',
  ruby: '红宝石', emerald: '祖母绿', sapphire: '蓝宝石', amethyst: '紫水晶',
  jade: '玉', pearl: '珍珠', diamond: '钻石', garnet: '石榴石', opal: '蛋白石',
  feather: '羽毛', skull: '头骨', claw: '爪', fang: '獠牙', horn: '角', hide: '皮',
  talon: '利爪', wing: '翼', heart: '心', ring: '指环', amulet: '护符', charm: '符咒',
  idol: '偶像', icon: '圣像', scroll: '卷轴', tome: '典籍', flask: '药瓶', vial: '小瓶',
  bottle: '瓶', powder: '粉末', herb: '草药', root: '根', berry: '浆果',
  mushroom: '蘑菇', ward: '守护', signet: '印戒', crest: '纹章', banner: '旗帜',
  medallion: '勋章', coin: '钱币', key: '钥匙', eye: '眼', mask: '面具', crown: '王冠',
  gauntlet: '手套', boot: '靴', cloak: '斗篷', shard: '碎片', trophy: '战利品',
  mark: '印记', seal: '封印', censer: '香炉', lantern: '提灯', candle: '烛台',
  mirror: '镜', watch: '怀表', locket: '怀坠', pendant: '吊坠', brooch: '胸针',
  arrow: '箭', bow: '弓', blade: '刀刃', dagger: '匕首', sword: '剑', axe: '斧',
  hammer: '锤', whip: '鞭', chain: '锁链', shackle: '镣铐', collar: '项圈',
  bone_whistle: '骨哨', prayer: '祷词', bead: '念珠', holy: '圣', blessed: '祝福',
  cursed: '诅咒', ancient: '古老', legendary: '传说', family: '家族', heirloom: '传家宝',
  butcher: '屠夫', circus: '马戏', pack: '行囊', martyr: '殉道',
  penance: '苦修', tribute: '贡品', offering: '祭品', signature: '签名',
  // 常用词
  of: '', the: '', and: '', '': '',
};

// 饰品 id → 中文名
export function trinketZh(id: string): string {
  const parts = id.split('_').filter(Boolean);
  const zhParts = parts
    .map((p) => zhLookup(p, TRINKET_ROOTS))
    .filter(Boolean);
  if (zhParts.length > 0) return zhParts.join('');
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- 技能词根（补充 ddLoader.skillNameMap 未覆盖的） ----------
const SKILL_ROOTS: Record<string, string> = {
  iron: '铁', swan: '天鹅', yawp: '咆哮', bloodlust: '嗜血', howling: '嚎叫',
  end: '终结', breakthrough: '突破', hew: '斩击', purge: '净化', revenge: '复仇',
  withstand: '坚守', battle: '战斗', heal: '治疗', retribution: '报应', bolster: '鼓舞',
  defender: '防御者', guard: '守护', riposte: '反击', command: '号令', bellow: '战吼',
  rampart: '壁垒', crush: '粉碎', stamp: '践踏', uppercut: '上勾拳', haymaker: '重拳',
  getaway: '脱身', flash: '闪光', bomb: '炸弹', knife: '飞刀', throw: '投掷',
  dart: '飞镖', puncture: '穿刺', lunge: '突刺', finale: '终曲', slice: '斩',
  dice: '骰子', jester: '小丑', solo: '独奏', battle_ballad: '战歌', inspiring: '鼓舞',
  tune: '小调', harvest: '收割', cut: '切割', bleed: '流血', blight: '腐蚀',
  poison: '毒', stun: '眩晕', mark: '标记', move: '位移', retreat: '撤退',
  advance: '前进', pistol: '手枪', shot: '射击', grape: '葡萄弹',
  blast: '轰击', open: '开', vein: '静脉', dueling: '决斗', tracking: '追踪',
  point: '点', blank: '空白', wicked: '邪恶', holy: '圣', lance: '长枪',
  smite: '重击', zealous: '狂热', accusation: '控诉', bulwark: '壁垒', faith: '信仰',
  cry: '呐喊', mace: '钉锤', bash: '猛击', judgment: '审判',
  divine: '神圣', grace: '恩典', comfort: '抚慰', dazzling: '耀眼', illumination: '照明',
  hand: '手', light: '光', noxious: '毒气', plague: '瘟疫', grenade: '手雷',
  blinding: '致盲', gas: '毒气', bandage: '绷带', disorienting: '混乱', vapours: '蒸汽',
  emboldening: '鼓舞', incision: '切割', abscess: '脓肿',
  // 疾病
  syphilis: '梅毒', cough: '咳嗽', fever: '发热',
  rabies: '狂犬病', tetanus: '破伤风', leprosy: '麻风病', consumption: '肺痨',
  worms: '寄生虫', dysentery: '痢疾', infection: '感染', gangrene: '坏疽',
  lockjaw: '牙关紧闭', quinsy: '扁桃脓肿', typhus: '斑疹伤寒', cholera: '霍乱',
  // 怪癖常见
  tough: '坚韧', fragile: '脆弱', quick: '敏捷', slow: '迟缓', brave: '勇敢',
  cowardly: '怯懦', greedy: '贪婪', generous: '慷慨', cursed: '受诅咒', blessed: '受祝福',
  heroic: '英勇', fearful: '恐惧', paranoid: '多疑', abusive: '暴躁', irrational: '偏执',
  virtuous: '美德的', afflicted: '被折磨的',
};

// 效果词根（战斗效果/怪物技能效果）
const EFFECT_ROOTS: Record<string, string> = {
  unholy: '不洁', killer: '杀手', holy: '神圣', smite: '重击',
  bleed: '流血', blight: '腐蚀', poison: '剧毒', stun: '眩晕',
  mark: '标记', riposte: '反击', guard: '守护', heal: '治疗',
  stress: '压力', damage: '伤害', burn: '灼烧', curse: '诅咒',
  weak: '虚弱', weaken: '削弱', vulnerable: '易伤', armor: '护甲',
  pierce: '破甲', pull: '拉拽', push: '击退', shuffle: '乱序',
  summon: '召唤', buff: '增益', debuff: '减益', target: '目标',
  death: '死亡', door: '之门', trap: '陷阱', scout: '侦察',
  torch: '火把', light: '光明', dark: '黑暗', ancestor: '先祖',
  fuse: '引信', two: '二', one: '一', three: '三', four: '四',
  five: '五', attack: '攻击', self: '自身', ally: '友军', enemy: '敌人',
  random: '随机', all: '全体', corpse: '尸骸', clear: '清除',
  prot: '防护', dodge: '闪避', speed: '速度', crit: '暴击', acc: '命中',
  disease: '疾病', resist: '抗性', removal: '移除',
};

// 战斗效果名 → 中文（'Unholy Killer 1' → '不洁杀手 1'）
export function effectZh(name: string): string {
  const m = name.trim().match(/^(.+?)([\d.]+)?$/);
  const core = (m?.[1] ?? name).trim();
  const num = m?.[2] ?? '';
  const parts = core.split(/[\s_]+/).filter(Boolean);
  const zh = parts.map((p) => EFFECT_ROOTS[p.toLowerCase()] ?? p).join('');
  return zh + (num ? ` ${num}` : '');
}

// 饰品 Buff ID（TRINKET_CROW_WINGFEATHER_BUFF）→ 中文描述
export function buffIdZh(id: string): string {
  let s = id.replace(/^TRINKET_/i, '').replace(/_BUFF\d*$/i, '').replace(/_BUFF$/i, '');
  const parts = s.split('_').filter(Boolean);
  const zh = parts.map((p) => EFFECT_ROOTS[p.toLowerCase()] ?? TRINKET_ROOTS[p.toLowerCase()] ?? p).filter(Boolean);
  return zh.length ? zh.join('') : id;
}

// 技能/怪癖 id → 中文（先查映射表，再词根拼接）
export function wordZh(id: string, extra?: Record<string, string>): string {
  if (extra?.[id]) return extra[id];
  const parts = id.split('_').filter(Boolean);
  const zhParts = parts
    .map((p) => SKILL_ROOTS[p] ?? SKILL_ROOTS[p.toLowerCase()] ?? '')
    .filter(Boolean);
  if (zhParts.length > 0) return zhParts.join('');
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
