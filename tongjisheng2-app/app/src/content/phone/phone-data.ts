/**
 * 手机联系人 + 短信/通话模板（阶段3 步骤8）
 *
 * 90 年代 PHS 手机背景:
 *  - 短信按字符计费(约 5~10 日元/条)
 *  - 通话按秒计费(约 30 日元/分钟)
 *  - 通讯录容量有限(50 人左右)
 *
 * 联系人分类:
 *  - 主线女角(剧情解锁)
 *  - 配角(剧情解锁)
 *  - 玩家自定义(手动添加)
 */

/** 联系人定义 */
export interface PhoneContact {
  /** 姓名 */
  name: string;
  /** 电话号码(虚构) */
  phone: string;
  /** 关系(用于 UI 展示) */
  relation: string;
  /** 解锁条件(隐藏flag,空表示初始可用) */
  unlockFlag?: string;
  /** 解锁时的剧情天数(参考) */
  unlockDay?: number;
  /** 头像 emoji(简化) */
  avatar: string;
}

// ═══════════════════════════════════════════════════════════
//  联系人列表(20 人)
// ═══════════════════════════════════════════════════════════

export const PHONE_CONTACTS: PhoneContact[] = [
  // ─── 主线女角(15 人) ───
  {
    name: '鸣泽美佐子',
    phone: '090-1234-5001',
    relation: '邻居/主线女角',
    unlockFlag: '美佐子邻居',
    unlockDay: 1,
    avatar: '👩',
  },
  {
    name: '鸣泽唯',
    phone: '090-1234-5002',
    relation: '美佐子之妹',
    unlockFlag: '唯相遇',
    unlockDay: 2,
    avatar: '👧',
  },
  {
    name: '友美',
    phone: '090-1234-5003',
    relation: '同班同学',
    unlockFlag: '友美相识',
    unlockDay: 3,
    avatar: '👩‍🦰',
  },
  {
    name: '洋子',
    phone: '090-1234-5004',
    relation: '前辈',
    unlockFlag: '洋子相识',
    unlockDay: 4,
    avatar: '👱‍♀️',
  },
  {
    name: '永岛久美子',
    phone: '090-1234-5005',
    relation: '图书委员',
    unlockFlag: '久美子相识',
    unlockDay: 5,
    avatar: '👩‍📚',
  },
  {
    name: '樱子',
    phone: '090-1234-5006',
    relation: '医院相遇',
    unlockFlag: '樱子死讯',
    unlockDay: 7,
    avatar: '🌸',
  },
  {
    name: '泉美',
    phone: '090-1234-5007',
    relation: ' mysterious',
    unlockFlag: '美纪双身份揭示',
    unlockDay: 8,
    avatar: '💃',
  },
  {
    name: '佐知子',
    phone: '090-1234-5008',
    relation: '永岛家母亲',
    unlockFlag: '永岛佐知子分支',
    unlockDay: 9,
    avatar: '👩‍🦳',
  },
  // ─── 配角(7 人) ───
  {
    name: '川尻信良',
    phone: '090-1234-6001',
    relation: '同班同学/好友',
    unlockFlag: '川尻相识',
    unlockDay: 1,
    avatar: '👨',
  },
  {
    name: '长冈芳树',
    phone: '090-1234-6002',
    relation: '前辈/运动部',
    unlockFlag: '长冈相识',
    unlockDay: 2,
    avatar: '👨‍🦱',
  },
  {
    name: '西御寺有友',
    phone: '090-1234-6003',
    relation: '富家子弟/可疑',
    unlockFlag: '西御寺相识',
    unlockDay: 4,
    avatar: '🕴',
  },
  {
    name: '天道新干线',
    phone: '090-1234-6004',
    relation: '不良少年',
    unlockFlag: '天道相识',
    unlockDay: 5,
    avatar: '😤',
  },
  {
    name: '齐藤',
    phone: '090-1234-6005',
    relation: '老师',
    unlockFlag: '齐藤互斥触发',
    unlockDay: 6,
    avatar: '👨‍🏫',
  },
  {
    name: '田中',
    phone: '090-1234-6006',
    relation: '便利店店员',
    unlockFlag: '便利店访问',
    unlockDay: 3,
    avatar: '🧑‍🍳',
  },
  {
    name: '铃木',
    phone: '090-1234-6007',
    relation: '便利店店员',
    unlockFlag: '便利店访问',
    unlockDay: 3,
    avatar: '🧑‍🍳',
  },
  // ─── 特殊(2 人) ───
  {
    name: '变数屋老板',
    phone: '090-0000-0000',
    relation: '神秘人物',
    unlockFlag: '变数屋访问次数_10',
    unlockDay: 10,
    avatar: '🎩',
  },
  {
    name: '美佐子(住宅)',
    phone: '03-1234-5678',
    relation: '鸣泽家座机',
    unlockFlag: '美佐子邻居',
    unlockDay: 1,
    avatar: '🏠',
  },
  {
    name: '自家',
    phone: '03-8765-4321',
    relation: '玩家住宅座机',
    unlockFlag: '',
    unlockDay: 1,
    avatar: '🏠',
  },
  {
    name: '急救',
    phone: '119',
    relation: '紧急呼叫',
    unlockFlag: '',
    unlockDay: 1,
    avatar: '🚑',
  },
  {
    name: '警察',
    phone: '110',
    relation: '紧急呼叫',
    unlockFlag: '',
    unlockDay: 1,
    avatar: '🚓',
  },
];

// ═══════════════════════════════════════════════════════════
//  预定义短信模板
// ═══════════════════════════════════════════════════════════

/** 短信模板(根据剧情触发自动收到的短信) */
export interface SmsTemplate {
  /** 模板ID */
  id: string;
  /** 发送者姓名 */
  from: string;
  /** 内容(支持 EJS 风格占位 {{玩家姓名}}) */
  content: string;
  /** 触发条件 */
  trigger: {
    /** 剧情天数 */
    day?: number;
    /** 时段 */
    timeSlot?: string;
    /** 前置 flag */
    requiredFlag?: string;
    /** 排除 flag */
    excludedFlag?: string;
  };
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'sms_yui_day1_morning',
    from: '鸣泽美佐子',
    content: '早上好,{{玩家姓名}}。今天天气不错呢,要不要一起去学校?',
    trigger: { day: 1, timeSlot: '早', requiredFlag: '美佐子邻居' },
  },
  {
    id: 'sms_yui_day2_evening',
    from: '鸣泽唯',
    content: '姐姐说今天会晚回家,让我先吃饭。你能来陪我吗?',
    trigger: { day: 2, timeSlot: '晚', requiredFlag: '唯相遇' },
  },
  {
    id: 'sms_tomomi_day3_noon',
    from: '友美',
    content: '午休时一起去天台吗?有话想跟你说。',
    trigger: { day: 3, timeSlot: '上午', requiredFlag: '友美相识' },
  },
  {
    id: 'sms_yoko_day4_afternoon',
    from: '洋子',
    content: '前辈,今天社团活动取消了。要不要一起去咖啡店?',
    trigger: { day: 4, timeSlot: '下午', requiredFlag: '洋子相识' },
  },
  {
    id: 'sms_warning_day5',
    from: '不明号码',
    content: '别再调查西御寺的事情了。否则后果自负。',
    trigger: { day: 5, timeSlot: '深夜', requiredFlag: '阴谋偷听' },
  },
  {
    id: 'sms_sakura_day7_hospital',
    from: '樱子',
    content: '医生说我情况不太好……希望能再见你一面。',
    trigger: { day: 7, timeSlot: '下午', requiredFlag: '樱子线解锁' },
  },
  {
    id: 'sms_convenience_day3',
    from: '田中',
    content: '今天便利店里来了新便当,要不要留一份?',
    trigger: { day: 3, timeSlot: '上午', requiredFlag: '便利店访问' },
  },
];

// ═══════════════════════════════════════════════════════════
//  贪吃蛇游戏·基础配置
// ═══════════════════════════════════════════════════════════

export const SNAKE_GAME_CONFIG = {
  /** 棋盘宽度(格) */
  width: 16,
  /** 棋盘高度(格) */
  height: 16,
  /** 初始速度(毫秒/步) */
  initialSpeed: 300,
  /** 最小速度(快) */
  minSpeed: 100,
  /** 每吃一个食物加速 */
  speedDecrement: 5,
  /** 每个食物得分 */
  scorePerFood: 10,
  /** 话费奖励(每100分奖励10日元) */
  bonusPerScore: 0.1,
};

/** 计算贪吃蛇得分奖励(返回话费) */
export function calcSnakeBonus(score: number): number {
  return Math.floor(score * SNAKE_GAME_CONFIG.bonusPerScore);
}
