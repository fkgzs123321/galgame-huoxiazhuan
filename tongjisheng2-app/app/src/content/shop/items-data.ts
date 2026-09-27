/**
 * 商城商品库（阶段3 步骤8）
 *
 * 90 年代末背景·商品价格以日元计
 * 分类:
 *  - 食品(饥饿/口渴恢复)
 *  - 礼物(送女角加好感)
 *  - 药品(恢复体力/疲劳/治疗)
 *  - 书(智力/技能经验)
 *  - 电子(电池/磁带/游戏卡)
 *  - 杂货(清洁/日常)
 *
 * 每个商品都有使用效果(effect),由 shop-engine 应用到 stat_data
 */

export type ItemCategory = '食品' | '礼物' | '药品' | '书' | '电子' | '杂货';
export type ShopId = '便利店' | '书店' | '药妆店' | '电器街' | '百货公司' | '网上商城';

/** 商品效果:操作符 + 路径 + 数值 */
export interface ItemEffect {
  /** 操作类型 */
  type: 'add' | 'replace' | 'set_flag';
  /** stat_data 路径,如 "主角.饥饿" / "主角.现金" / "隐藏.日记1" */
  path: string;
  /** 增减值(add 时)或目标值(replace/set_flag 时) */
  value: number | string | boolean;
  /** 描述(用于 UI 展示) */
  description?: string;
}

/** 商品定义 */
export interface ShopItem {
  /** 商品ID(唯一) */
  id: string;
  /** 商品名 */
  name: string;
  /** 分类 */
  category: ItemCategory;
  /** 单价(日元) */
  price: number;
  /** 出售店铺列表 */
  availableAt: ShopId[];
  /** 描述 */
  description: string;
  /** 90年代背景说明 */
  eraNote?: string;
  /** 使用效果 */
  effects: ItemEffect[];
  /** 是否消耗品(true=使用后数量-1,false=装备/永久) */
  consumable: boolean;
  /** 是否礼物(可送给女角) */
  isGift?: boolean;
  /** 礼物偏好女角(逗号分隔,送给这些女角好感加倍) */
  preferredBy?: string;
  /** 是否一次性商品(如日记/关键道具) */
  oneShot?: boolean;
  /** 解锁条件(隐藏flag) */
  requiredFlag?: string;
}

// ═══════════════════════════════════════════════════════════
//  商品库(48 件)
// ═══════════════════════════════════════════════════════════

export const SHOP_ITEMS: ShopItem[] = [
  // ─── 食品(8 件) ───
  {
    id: 'food_onigiri',
    name: '鲑鱼饭团',
    category: '食品',
    price: 120,
    availableAt: ['便利店'],
    description: '便利店的经典饭团,温热且便宜',
    eraNote: '1999 年便利店饭团约 100~130 日元',
    effects: [
      { type: 'add', path: '主角.饥饿', value: -25, description: '饥饿 -25' },
      { type: 'add', path: '主角.心情', value: 3, description: '心情 +3' },
    ],
    consumable: true,
  },
  {
    id: 'food_bento',
    name: '幕之内便当',
    category: '食品',
    price: 480,
    availableAt: ['便利店', '百货公司'],
    description: '便利店的中档便当,几种小菜配饭',
    effects: [
      { type: 'add', path: '主角.饥饿', value: -50, description: '饥饿 -50' },
      { type: 'add', path: '主角.心情', value: 8, description: '心情 +8' },
    ],
    consumable: true,
  },
  {
    id: 'food_cup_noodle',
    name: '杯面',
    category: '食品',
    price: 180,
    availableAt: ['便利店'],
    description: '日清杯面,需热水冲泡3分钟',
    eraNote: '1999 年杯面约 150~200 日元',
    effects: [
      { type: 'add', path: '主角.饥饿', value: -35, description: '饥饿 -35' },
      { type: 'add', path: '主角.口渴', value: 15, description: '口渴 +15(咸)' },
    ],
    consumable: true,
  },
  {
    id: 'food_juice',
    name: '果汁汽水',
    category: '食品',
    price: 120,
    availableAt: ['便利店'],
    description: '罐装果汁汽水,解渴',
    effects: [
      { type: 'add', path: '主角.口渴', value: -30, description: '口渴 -30' },
      { type: 'add', path: '主角.心情', value: 2, description: '心情 +2' },
    ],
    consumable: true,
  },
  {
    id: 'food_coffee',
    name: '罐装咖啡',
    category: '食品',
    price: 110,
    availableAt: ['便利店'],
    description: 'Boss 咖啡,微苦提神',
    eraNote: '1999 年罐装咖啡约 100~120 日元,自动贩卖机常备',
    effects: [
      { type: 'add', path: '主角.口渴', value: -15, description: '口渴 -15' },
      { type: 'add', path: '主角.疲劳', value: -10, description: '疲劳 -10' },
      { type: 'add', path: '主角.心情', value: 4, description: '心情 +4' },
    ],
    consumable: true,
  },
  {
    id: 'food_chocolate',
    name: '巧克力板',
    category: '食品',
    price: 200,
    availableAt: ['便利店', '百货公司'],
    description: '明治巧克力板,补充糖分',
    effects: [
      { type: 'add', path: '主角.饥饿', value: -10, description: '饥饿 -10' },
      { type: 'add', path: '主角.心情', value: 10, description: '心情 +10' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽唯,鸣泽美佐子,友美',
  },
  {
    id: 'food_curry',
    name: '牛肉咖喱饭',
    category: '食品',
    price: 650,
    availableAt: ['百货公司'],
    description: '百货公司地下食品层的现做咖喱',
    effects: [
      { type: 'add', path: '主角.饥饿', value: -70, description: '饥饿 -70' },
      { type: 'add', path: '主角.心情', value: 15, description: '心情 +15' },
    ],
    consumable: true,
  },
  {
    id: 'food_pocky',
    name: 'Pocky 巧克力棒',
    category: '食品',
    price: 150,
    availableAt: ['便利店'],
    description: '格力高 Pocky,经典零食',
    effects: [
      { type: 'add', path: '主角.饥饿', value: -8, description: '饥饿 -8' },
      { type: 'add', path: '主角.心情', value: 5, description: '心情 +5' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽唯',
  },

  // ─── 礼物(8 件) ───
  {
    id: 'gift_flower',
    name: '玫瑰花束',
    category: '礼物',
    price: 2500,
    availableAt: ['百货公司'],
    description: '一束红玫瑰,送给心爱的人',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 15, description: '好感度 +15' },
      { type: 'add', path: '当前女角.心动值', value: 10, description: '心动值 +10' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽美佐子,洋子',
  },
  {
    id: 'gift_necklace',
    name: '银项链',
    category: '礼物',
    price: 8000,
    availableAt: ['百货公司'],
    description: '银质心形项链,精致包装',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 30, description: '好感度 +30' },
      { type: 'add', path: '当前女角.心动值', value: 25, description: '心动值 +25' },
      { type: 'add', path: '当前女角.信任度', value: 10, description: '信任度 +10' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽美佐子',
  },
  {
    id: 'gift_teddy',
    name: '泰迪熊玩偶',
    category: '礼物',
    price: 3500,
    availableAt: ['百货公司'],
    description: '毛绒泰迪熊,送给可爱女孩',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 18, description: '好感度 +18' },
      { type: 'add', path: '当前女角.心动值', value: 12, description: '心动值 +12' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽唯',
  },
  {
    id: 'gift_cassette',
    name: '流行音乐磁带',
    category: '礼物',
    price: 2800,
    availableAt: ['电器街'],
    description: '当前流行的偶像专辑磁带',
    eraNote: '1999 年 CD 已普及,但磁带仍便宜且流行',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 12, description: '好感度 +12' },
      { type: 'add', path: '当前女角.心动值', value: 8, description: '心动值 +8' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽唯,友美',
  },
  {
    id: 'gift_perfume',
    name: '香水',
    category: '礼物',
    price: 5500,
    availableAt: ['百货公司'],
    description: '法国进口淡香水',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 20, description: '好感度 +20' },
      { type: 'add', path: '当前女角.心动值', value: 18, description: '心动值 +18' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽美佐子,洋子',
  },
  {
    id: 'gift_handkerchief',
    name: '手帕',
    category: '礼物',
    price: 800,
    availableAt: ['百货公司'],
    description: '棉质绣花手帕,低调的心意',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 8, description: '好感度 +8' },
      { type: 'add', path: '当前女角.信任度', value: 5, description: '信任度 +5' },
    ],
    consumable: true,
    isGift: true,
  },
  {
    id: 'gift_chocolate_lux',
    name: '高级巧克力礼盒',
    category: '礼物',
    price: 3000,
    availableAt: ['百货公司'],
    description: '比利时进口巧克力礼盒',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 22, description: '好感度 +22' },
      { type: 'add', path: '当前女角.心动值', value: 15, description: '心动值 +15' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '鸣泽唯,鸣泽美佐子',
  },
  {
    id: 'gift_book_love',
    name: '恋爱小说',
    category: '礼物',
    price: 1200,
    availableAt: ['书店'],
    description: '流行恋爱小说,适合文艺女角',
    effects: [
      { type: 'add', path: '当前女角.好感度', value: 10, description: '好感度 +10' },
      { type: 'add', path: '当前女角.心动值', value: 5, description: '心动值 +5' },
    ],
    consumable: true,
    isGift: true,
    preferredBy: '永岛久美子,樱子',
  },

  // ─── 药品(6 件) ───
  {
    id: 'med_bandage',
    name: '创可贴',
    category: '药品',
    price: 200,
    availableAt: ['药妆店', '便利店'],
    description: '治疗小伤口',
    effects: [
      { type: 'add', path: '主角.体力', value: 5, description: '体力 +5' },
    ],
    consumable: true,
  },
  {
    id: 'med_painkiller',
    name: '止痛药',
    category: '药品',
    price: 500,
    availableAt: ['药妆店'],
    description: '缓解头痛/肌肉痛',
    effects: [
      { type: 'add', path: '主角.疲劳', value: -15, description: '疲劳 -15' },
      { type: 'add', path: '主角.体力', value: 8, description: '体力 +8' },
    ],
    consumable: true,
  },
  {
    id: 'med_vitamin',
    name: '维生素片',
    category: '药品',
    price: 800,
    availableAt: ['药妆店'],
    description: '复合维生素,补充精力',
    effects: [
      { type: 'add', path: '主角.疲劳', value: -20, description: '疲劳 -20' },
      { type: 'add', path: '主角.体力', value: 12, description: '体力 +12' },
      { type: 'add', path: '主角.心情', value: 3, description: '心情 +3' },
    ],
    consumable: true,
  },
  {
    id: 'med_cold',
    name: '感冒药',
    category: '药品',
    price: 700,
    availableAt: ['药妆店'],
    description: '治疗感冒症状',
    effects: [
      { type: 'add', path: '主角.疲劳', value: -25, description: '疲劳 -25' },
      { type: 'add', path: '主角.体力', value: 15, description: '体力 +15' },
      { type: 'add', path: '主角.睡眠质量', value: 10, description: '睡眠质量 +10' },
    ],
    consumable: true,
  },
  {
    id: 'med_energy_drink',
    name: '能量饮料',
    category: '药品',
    price: 250,
    availableAt: ['便利店', '药妆店'],
    description: '力保健·提神醒脑',
    eraNote: '1999 年力保健已流行,500 日元以下',
    effects: [
      { type: 'add', path: '主角.疲劳', value: -18, description: '疲劳 -18' },
      { type: 'add', path: '主角.心情', value: 5, description: '心情 +5' },
    ],
    consumable: true,
  },
  {
    id: 'med_first_aid',
    name: '急救包',
    category: '药品',
    price: 1500,
    availableAt: ['药妆店'],
    description: '综合急救用品,严重伤势必备',
    effects: [
      { type: 'add', path: '主角.体力', value: 30, description: '体力 +30' },
      { type: 'add', path: '主角.疲劳', value: -15, description: '疲劳 -15' },
    ],
    consumable: true,
  },

  // ─── 书(8 件·提升技能) ───
  {
    id: 'book_study',
    name: '参考书',
    category: '书',
    price: 1800,
    availableAt: ['书店'],
    description: '高考参考书,提升学业',
    effects: [
      { type: 'add', path: '主角.学业', value: 5, description: '学业 +5' },
      { type: 'add', path: '技能.智力', value: 3, description: '智力 +3' },
    ],
    consumable: true,
  },
  {
    id: 'book_cooking',
    name: '料理入门',
    category: '书',
    price: 1500,
    availableAt: ['书店'],
    description: '基础料理食谱',
    effects: [
      { type: 'add', path: '技能.烹饪', value: 8, description: '烹饪 +8' },
    ],
    consumable: true,
  },
  {
    id: 'book_martial_arts',
    name: '格斗技杂志',
    category: '书',
    price: 600,
    availableAt: ['书店', '便利店'],
    description: '格斗技月刊,学习格斗技巧',
    effects: [
      { type: 'add', path: '技能.格斗', value: 5, description: '格斗 +5' },
    ],
    consumable: true,
  },
  {
    id: 'book_detective',
    name: '推理小说',
    category: '书',
    price: 800,
    availableAt: ['书店'],
    description: '经典推理小说,锻炼观察力',
    effects: [
      { type: 'add', path: '技能.观察', value: 5, description: '观察 +5' },
      { type: 'add', path: '技能.智力', value: 2, description: '智力 +2' },
    ],
    consumable: true,
  },
  {
    id: 'book_medical',
    name: '家庭医学手册',
    category: '书',
    price: 2500,
    availableAt: ['书店'],
    description: '家庭常用医学知识',
    effects: [
      { type: 'add', path: '技能.医学', value: 10, description: '医学 +10' },
    ],
    consumable: true,
  },
  {
    id: 'book_romance',
    name: '恋爱攻略本',
    category: '书',
    price: 980,
    availableAt: ['书店', '便利店'],
    description: '流行恋爱攻略,了解女角心思',
    effects: [
      { type: 'add', path: '技能.恋爱', value: 6, description: '恋爱 +6' },
    ],
    consumable: true,
  },
  {
    id: 'book_art',
    name: '画集',
    category: '书',
    price: 3200,
    availableAt: ['书店', '百货公司'],
    description: '精美画集,提升艺术鉴赏',
    effects: [
      { type: 'add', path: '技能.艺术', value: 8, description: '艺术 +8' },
    ],
    consumable: true,
  },
  {
    id: 'book_diary_1',
    name: '美佐子的日记①',
    category: '书',
    price: 0,
    availableAt: [],
    description: '在美佐子房间发现的旧日记,关键道具',
    effects: [
      { type: 'set_flag', path: '隐藏.日记1', value: true, description: '日记1 收集' },
    ],
    consumable: false,
    oneShot: true,
    requiredFlag: '美佐子房间进入',
  },

  // ─── 电子(8 件) ───
  {
    id: 'elec_battery',
    name: '5号电池(4节)',
    category: '电子',
    price: 380,
    availableAt: ['电器街', '便利店'],
    description: '随身听/收音机用电池',
    effects: [
      { type: 'add', path: '主角.心情', value: 3, description: '心情 +3(可听音乐)' },
    ],
    consumable: true,
  },
  {
    id: 'elec_cassette_music',
    name: '流行音乐磁带',
    category: '电子',
    price: 2800,
    availableAt: ['电器街'],
    description: '偶像新专辑磁带',
    eraNote: '1999 年 CD 为主流,但磁带仍便宜',
    effects: [
      { type: 'add', path: '主角.心情', value: 12, description: '心情 +12' },
      { type: 'add', path: '主角.疲劳', value: -8, description: '疲劳 -8' },
    ],
    consumable: false,
  },
  {
    id: 'elec_game_cartridge',
    name: 'GB 游戏卡带',
    category: '电子',
    price: 3800,
    availableAt: ['电器街'],
    description: 'Game Boy 游戏卡带,贪吃蛇大战',
    eraNote: '1999 年 GB Color 已发售,卡带约 3800 日元',
    effects: [
      { type: 'add', path: '主角.心情', value: 20, description: '心情 +20' },
      { type: 'add', path: '主角.疲劳', value: 5, description: '疲劳 +5(熬夜)' },
    ],
    consumable: false,
  },
  {
    id: 'elec_film_camera',
    name: '胶卷相机',
    category: '电子',
    price: 6500,
    availableAt: ['电器街', '百货公司'],
    description: '佳能傻瓜相机,记录回忆',
    effects: [
      { type: 'add', path: '主角.心情', value: 15, description: '心情 +15' },
      { type: 'set_flag', path: '隐藏.相机入手', value: true, description: '可拍摄 CG' },
    ],
    consumable: false,
  },
  {
    id: 'elec_film_roll',
    name: '胶卷(36张)',
    category: '电子',
    price: 800,
    availableAt: ['电器街', '便利店'],
    description: '富士彩色胶卷',
    effects: [],
    consumable: true,
  },
  {
    id: 'elec_walkman',
    name: '随身听',
    category: '电子',
    price: 9800,
    availableAt: ['电器街'],
    description: '索尼随身听,磁带播放器',
    eraNote: '1999 年 MD 已发售,但随身听仍主流',
    effects: [
      { type: 'add', path: '主角.心情', value: 25, description: '心情 +25' },
    ],
    consumable: false,
  },
  {
    id: 'elec_headphones',
    name: '耳机',
    category: '电子',
    price: 1500,
    availableAt: ['电器街'],
    description: '入耳式耳机',
    effects: [
      { type: 'add', path: '主角.心情', value: 8, description: '心情 +8' },
    ],
    consumable: false,
  },
  {
    id: 'elec_calculator',
    name: '电子计算器',
    category: '电子',
    price: 1200,
    availableAt: ['电器街'],
    description: '夏普电子计算器',
    effects: [
      { type: 'add', path: '主角.学业', value: 3, description: '学业 +3' },
    ],
    consumable: false,
  },

  // ─── 杂货(10 件) ───
  {
    id: 'misc_soap',
    name: '香皂',
    category: '杂货',
    price: 250,
    availableAt: ['药妆店', '便利店'],
    description: '药用香皂,清洁用',
    effects: [
      { type: 'add', path: '主角.清洁', value: 30, description: '清洁 +30' },
    ],
    consumable: true,
  },
  {
    id: 'misc_shampoo',
    name: '洗发水',
    category: '杂货',
    price: 800,
    availableAt: ['药妆店'],
    description: '去屑洗发水',
    effects: [
      { type: 'add', path: '主角.清洁', value: 40, description: '清洁 +40' },
      { type: 'add', path: '主角.心情', value: 3, description: '心情 +3' },
    ],
    consumable: true,
  },
  {
    id: 'misc_tissue',
    name: '纸巾(5盒)',
    category: '杂货',
    price: 380,
    availableAt: ['便利店'],
    description: '面巾纸,日常必备',
    effects: [],
    consumable: true,
  },
  {
    id: 'misc_umbrella',
    name: '雨伞',
    category: '杂货',
    price: 1000,
    availableAt: ['便利店', '百货公司'],
    description: '折叠雨伞,雨季必备',
    effects: [
      { type: 'add', path: '主角.心情', value: 5, description: '心情 +5(不再淋雨)' },
    ],
    consumable: false,
  },
  {
    id: 'misc_condom',
    name: '安全套(10个)',
    category: '杂货',
    price: 1200,
    availableAt: ['药妆店', '便利店'],
    description: '避孕套,H 场景必备',
    effects: [],
    consumable: true,
  },
  {
    id: 'misc_lip_balm',
    name: '润唇膏',
    category: '杂货',
    price: 380,
    availableAt: ['药妆店', '便利店'],
    description: '防止嘴唇干裂',
    effects: [
      { type: 'add', path: '主角.魅力', value: 2, description: '魅力 +2' },
    ],
    consumable: true,
  },
  {
    id: 'misc_deodorant',
    name: '止汗剂',
    category: '杂货',
    price: 600,
    availableAt: ['药妆店'],
    description: '防止出汗异味',
    effects: [
      { type: 'add', path: '主角.清洁', value: 15, description: '清洁 +15' },
      { type: 'add', path: '主角.魅力', value: 3, description: '魅力 +3' },
    ],
    consumable: true,
  },
  {
    id: 'misc_cigarettes',
    name: '香烟',
    category: '杂货',
    price: 300,
    availableAt: ['便利店'],
    description: '一包香烟,未成年人禁止购买',
    eraNote: '1999 年日本未成年人购烟违法但执行不严',
    effects: [
      { type: 'add', path: '主角.心情', value: 8, description: '心情 +8' },
      { type: 'add', path: '主角.体力', value: -3, description: '体力 -3(健康损害)' },
      { type: 'add', path: '主角.违法计数', value: 1, description: '违法 +1' },
    ],
    consumable: true,
  },
  {
    id: 'misc_alcohol',
    name: '罐装啤酒',
    category: '杂货',
    price: 280,
    availableAt: ['便利店'],
    description: '罐装啤酒,未成年人禁止购买',
    effects: [
      { type: 'add', path: '主角.心情', value: 12, description: '心情 +12' },
      { type: 'add', path: '主角.疲劳', value: -10, description: '疲劳 -10' },
      { type: 'add', path: '主角.违法计数', value: 1, description: '违法 +1' },
    ],
    consumable: true,
  },
  {
    id: 'misc_newspaper',
    name: '报纸',
    category: '杂货',
    price: 150,
    availableAt: ['便利店'],
    description: '当日新闻报纸',
    effects: [
      { type: 'add', path: '技能.观察', value: 1, description: '观察 +1' },
      { type: 'add', path: '主角.学业', value: 1, description: '学业 +1' },
    ],
    consumable: true,
  },
];

// ═══════════════════════════════════════════════════════════
//  店铺定义
// ═══════════════════════════════════════════════════════════

export interface ShopDef {
  id: ShopId;
  name: string;
  description: string;
  /** 店铺地点(场景.当前地点需匹配任一) */
  locations: string[];
  /** 营业时段 */
  openHours: string;
  /** 90年代背景说明 */
  eraNote?: string;
}

export const SHOP_DEFS: ShopDef[] = [
  {
    id: '便利店',
    name: '7-Eleven 便利店',
    description: '24 小时营业的便利店,日常用品齐全',
    locations: ['88町商业区', '商业区', '便利店', '自宅周边'],
    openHours: '24 小时',
    eraNote: '1999 年日本便利店密度已极高,7-Eleven/Lawson/FamilyMart 三足鼎立',
  },
  {
    id: '书店',
    name: '八十八书店',
    description: '本地老牌书店,书籍种类丰富',
    locations: ['88町商业区', '商业区', '书店'],
    openHours: '10:00-21:00',
  },
  {
    id: '药妆店',
    name: '松本清药妆店',
    description: '药妆连锁店,药品/化妆品/日常用品',
    locations: ['88町商业区', '商业区', '药妆店'],
    openHours: '10:00-22:00',
    eraNote: '1999 年松本清已是大型药妆连锁',
  },
  {
    id: '电器街',
    name: '秋叶原电器街',
    description: '电子产品圣地,需要乘电车前往',
    locations: ['秋叶原', '电器街'],
    openHours: '10:00-20:00',
    eraNote: '1999 年秋叶原已是电器购物圣地',
  },
  {
    id: '百货公司',
    name: '西武百货',
    description: '高档百货公司,礼物/服饰/食品',
    locations: ['88町商业区', '商业区', '百货公司', '池袋'],
    openHours: '10:00-20:00',
  },
  {
    id: '网上商城',
    name: '网上购物',
    description: '通过电脑上网购买,需拨号上网',
    locations: ['自宅', '玩家房间'],
    openHours: '24 小时(需电脑)',
    eraNote: '1999 年亚马逊日本已上线,乐天市场成立',
  },
];

/** 通过 ID 查找商品 */
export function findItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

/** 查找店铺定义 */
export function findShop(id: ShopId): ShopDef | undefined {
  return SHOP_DEFS.find((s) => s.id === id);
}

/** 列出指定店铺的所有商品 */
export function listShopItems(shopId: ShopId): ShopItem[] {
  return SHOP_ITEMS.filter((i) => i.availableAt.includes(shopId));
}
