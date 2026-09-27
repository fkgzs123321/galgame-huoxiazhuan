/**
 * BBS 帖子库 + 邮件模板（阶段3 步骤8）
 *
 * 90 年代背景:
 *  - 2ch(1999 年成立)匿名 BBS
 *  - 个人主页(Biglobe/InfoWeb 等ISP提供)
 *  - 邮件以 webmail 或 Outlook Express 为主
 */

// ═══════════════════════════════════════════════════════════
//  BBS 板块 + 帖子
// ═══════════════════════════════════════════════════════════

export interface BbsBoard {
  id: string;
  name: string;
  description: string;
  /** 板块主题 */
  category: '校园' | '恋爱' | '游戏' | '八卦' | '技术' | '本地';
}

export const BBS_BOARDS: BbsBoard[] = [
  { id: 'board_school', name: '八十八学园板', description: '本校学生交流', category: '校园' },
  { id: 'board_love', name: '恋爱相談板', description: '恋爱烦恼咨询', category: '恋爱' },
  { id: 'board_game', name: '游戏讨论板', description: '最新游戏情报', category: '游戏' },
  { id: 'board_gossip', name: '八十八八卦板', description: '本地八卦汇总', category: '八卦' },
  { id: 'board_tech', name: 'PC/Modem板', description: '电脑技术讨论', category: '技术' },
  { id: 'board_local', name: '88町生活板', description: '本地生活信息', category: '本地' },
];

/** BBS 帖子 */
export interface BbsPost {
  id: string;
  /** 所属板块ID */
  boardId: string;
  /** 标题 */
  title: string;
  /** 楼主匿名 ID */
  authorId: string;
  /** 发帖时间(虚构) */
  postTime: string;
  /** 正文 */
  content: string;
  /** 楼层回复 */
  replies: BbsReply[];
  /** 触发效果(玩家回帖后) */
  effects?: Array<{ path: string; value: number | string | boolean; description?: string }>;
  /** 浏览要求(隐藏flag,空表示无需) */
  requiredFlag?: string;
  /** 是否仅特定天数可见 */
  visibleDay?: number;
}

export interface BbsReply {
  /** 楼层 */
  floor: number;
  /** 回复者 ID */
  authorId: string;
  /** 回复时间 */
  replyTime: string;
  /** 内容 */
  content: string;
}

// ═══════════════════════════════════════════════════════════
//  帖子库(20 帖)
// ═══════════════════════════════════════════════════════════

export const BBS_POSTS: BbsPost[] = [
  // ─── 校园板块(4 帖) ───
  {
    id: 'post_school_1',
    boardId: 'board_school',
    title: '【期末考试】今年期末考范围已公布',
    authorId: '名无し@88学园',
    postTime: '12-22 18:34',
    content: '听说今年数学期末考范围扩展到第7章,各位加油!',
    replies: [
      { floor: 2, authorId: '数学苦手', replyTime: '12-22 18:50', content: '第7章好难啊……有人能借笔记吗?' },
      { floor: 3, authorId: '优等生', replyTime: '12-22 19:12', content: '我可以扫描后传上来,稍等。' },
    ],
    effects: [
      { path: '技能.智力', value: 2, description: '智力 +2(看了笔记)' },
      { path: '主角.学业', value: 3, description: '学业 +3' },
    ],
  },
  {
    id: 'post_school_2',
    boardId: 'board_school',
    title: '【寒假活动】学生会征求志愿者',
    authorId: '学生会副会長',
    postTime: '12-23 10:00',
    content: '寒假期间学校将组织社区志愿活动,有兴趣者请到学生处报名。',
    replies: [
      { floor: 2, authorId: '名无し', replyTime: '12-23 10:30', content: '参加!' },
    ],
    effects: [
      { path: '主角.声誉', value: 5, description: '声誉 +5(参加志愿者)' },
    ],
  },
  {
    id: 'post_school_3',
    boardId: 'board_school',
    title: '【传闻】最近有校外人士在校门口徘徊',
    authorId: '88生徒',
    postTime: '12-25 22:18',
    content: '看到几个陌生人在校门口鬼鬼祟祟地打听学生情况,大家注意安全。',
    replies: [
      { floor: 2, authorId: '名无し', replyTime: '12-25 22:30', content: '我也看到了,好像是西御寺家的人' },
    ],
    requiredFlag: '阴谋偷听',
  },
  {
    id: 'post_school_4',
    boardId: 'board_school',
    title: '【毕业】距毕业还有几个月,大家有什么打算?',
    authorId: '三年生',
    postTime: '12-26 12:00',
    content: '高三的各位,毕业后是就业还是升学?',
    replies: [],
  },

  // ─── 恋爱板块(4 帖) ───
  {
    id: 'post_love_1',
    boardId: 'board_love',
    title: '【相談】喜欢上了邻居的女孩,该怎么办?',
    authorId: '迷之中年',
    postTime: '12-22 23:45',
    content: '搬到新家后,认识了隔壁的女孩。每天见面都很心动,但不知道该怎么开口。',
    replies: [
      { floor: 2, authorId: '恋愛博士', replyTime: '12-23 00:15', content: '先从打招呼开始吧,慢慢积累好感。' },
      { floor: 3, authorId: '名無し', replyTime: '12-23 07:30', content: '送点小礼物吧,巧克力就不错。' },
    ],
    effects: [
      { path: '技能.恋爱', value: 3, description: '恋爱 +3(看了攻略)' },
    ],
  },
  {
    id: 'post_love_2',
    boardId: 'board_love',
    title: '【相談】女朋友说她妹妹好像也喜欢我',
    authorId: '三角中',
    postTime: '12-24 21:00',
    content: '和女友交往一段时间后,她说她妹妹最近对我态度很奇怪,似乎在吃醋。',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-24 21:30', content: '这种局面要小心处理,别脚踏两条船。' },
    ],
    effects: [
      { path: '技能.恋爱', value: 2, description: '恋爱 +2' },
    ],
  },
  {
    id: 'post_love_3',
    boardId: 'board_love',
    title: '【攻略】送礼物时的注意事项',
    authorId: 'プレゼント研究家',
    postTime: '12-26 15:00',
    content: '送礼不是越贵越好,关键是要符合对方的喜好。要根据女角的性格选择。',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-26 15:30', content: '同感,送文艺女角的书比送花更好' },
    ],
    effects: [
      { path: '技能.观察', value: 2, description: '观察 +2' },
      { path: '技能.恋爱', value: 2, description: '恋爱 +2' },
    ],
  },
  {
    id: 'post_love_4',
    boardId: 'board_love',
    title: '【相談】女友住院了,该怎么做才好?',
    authorId: '病室の彼',
    postTime: '12-28 20:00',
    content: '女友住院,情况不太好。我应该每天去看她吗?会不会让她感到压力?',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-28 20:15', content: '陪着她就是最好的支持,别想太多。' },
    ],
    requiredFlag: '樱子死讯',
  },

  // ─── 游戏板块(3 帖) ───
  {
    id: 'post_game_1',
    boardId: 'board_game',
    title: '【新作】勇者斗恶龙VIII发售日确定',
    authorId: 'DQ廃人',
    postTime: '12-22 09:00',
    content: '传闻 DQ8 将于明年发售,期待!',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-22 09:30', content: '终于等到了!' },
    ],
    effects: [
      { path: '主角.心情', value: 5, description: '心情 +5' },
    ],
  },
  {
    id: 'post_game_2',
    boardId: 'board_game',
    title: '【攻略】贪吃蛇最高分技巧',
    authorId: 'スネーク好き',
    postTime: '12-23 13:00',
    content: '贪吃蛇关键是控制速度,不要贪快。后期可以利用墙壁绕S形。',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-23 13:30', content: '我试了试,确实有效' },
    ],
    effects: [
      { path: '主角.贪吃蛇最高分', value: 50, description: '贪吃蛇技巧 +50' },
    ],
  },
  {
    id: 'post_game_3',
    boardId: 'board_game',
    title: '【硬件】Game Boy Color 新色发售',
    authorId: 'GB愛好家',
    postTime: '12-25 11:00',
    content: 'GBC 新色「 Berry 」已经上架,有人买了么?',
    replies: [],
  },

  // ─── 八卦板块(3 帖) ───
  {
    id: 'post_gossip_1',
    boardId: 'board_gossip',
    title: '【传闻】西御寺家的丑闻',
    authorId: '匿名希望',
    postTime: '12-24 23:00',
    content: '听说西御寺家最近卷入了一些不光彩的事情,涉及债务和高利贷。',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-24 23:15', content: '我也听说了,据说还在调查中' },
    ],
    requiredFlag: '阴谋偷听',
    effects: [
      { path: '技能.观察', value: 3, description: '观察 +3' },
    ],
  },
  {
    id: 'post_gossip_2',
    boardId: 'board_gossip',
    title: '【本地】88公园夜间不安全',
    authorId: '88住人',
    postTime: '12-25 18:00',
    content: '最近88公园夜间常有流氓聚集,女性不要单独走那里。',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-25 18:30', content: '我也听到过呼救声,要小心' },
    ],
  },
  {
    id: 'post_gossip_3',
    boardId: 'board_gossip',
    title: '【神秘】变数屋到底是什么地方?',
    authorId: '好奇心旺盛',
    postTime: '12-27 14:00',
    content: '听说88町有一家叫"变数屋"的神秘商店,里面似乎什么都卖。',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-27 14:30', content: '只是传说吧' },
    ],
    requiredFlag: '变数屋访问次数',
  },

  // ─── 技术板块(3 帖) ───
  {
    id: 'post_tech_1',
    boardId: 'board_tech',
    title: '【Modem】56K Modem 优化技巧',
    authorId: 'ダイヤルアップ難民',
    postTime: '12-22 14:00',
    content: '通过修改注册表可以稍微提升 56K Modem 的速度,有人想要方法吗?',
    replies: [
      { floor: 2, authorId: '名無し', replyTime: '12-22 14:30', content: '求方法!' },
    ],
    effects: [
      { path: '技能.智力', value: 2, description: '智力 +2(学到了)' },
    ],
  },
  {
    id: 'post_tech_2',
    boardId: 'board_tech',
    title: '【OS】Windows 2000 即将发售',
    authorId: 'MS信者',
    postTime: '12-23 09:00',
    content: '微软宣布 Windows 2000 将于明年2月发售,基于 NT 内核,据说比 98 稳定很多。',
    replies: [],
  },
  {
    id: 'post_tech_3',
    boardId: 'board_tech',
    title: '【网络】Yahoo! Japan 上线新服务',
    authorId: 'ネット廃人',
    postTime: '12-26 11:00',
    content: 'Yahoo! Japan 上线了新的拍卖服务,听说很方便。',
    replies: [],
  },

  // ─── 本地板块(3 帖) ───
  {
    id: 'post_local_1',
    boardId: 'board_local',
    title: '【活动】88町年末感恩大促',
    authorId: '88商店会',
    postTime: '12-25 09:00',
    content: '88町商业区将于12-28~12-31 举办年末大促,各店铺折扣丰富。',
    replies: [],
  },
  {
    id: 'post_local_2',
    boardId: 'board_local',
    title: '【求助】寻物:88公园遗失钱包',
    authorId: '落とし主',
    postTime: '12-26 16:00',
    content: '昨日在88公园附近遗失棕色钱包,内有证件,拾到者请联系。',
    replies: [],
  },
  {
    id: 'post_local_3',
    boardId: 'board_local',
    title: '【餐饮】便利店新便当上架',
    authorId: '饭团好き',
    postTime: '12-27 12:00',
    content: '7-Eleven 新出了"豪华鲑鱼饭团",值得一试。',
    replies: [],
  },
];

/** 列出指定板块的帖子 */
export function listBoardPosts(boardId: string): BbsPost[] {
  return BBS_POSTS.filter((p) => p.boardId === boardId);
}

// ═══════════════════════════════════════════════════════════
//  邮件模板
// ═══════════════════════════════════════════════════════════

export interface EmailTemplate {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  /** 收到时间(虚构) */
  receivedAt: string;
  /** 触发条件 */
  trigger: {
    day?: number;
    requiredFlag?: string;
  };
  /** 是否重要邮件 */
  important?: boolean;
  /** 附件效果 */
  effects?: Array<{ path: string; value: number | string | boolean; description?: string }>;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'email_welcome',
    from: 'Biglobe 客服',
    fromEmail: 'support@biglobe.ne.jp',
    subject: '欢迎加入 Biglobe 拨号上网服务',
    body: '感谢您选择 Biglobe。您的账号已激活,初始密码为 ***。如有疑问请致电客服。',
    receivedAt: '12-22 09:15',
    trigger: { day: 1, requiredFlag: '拥有电脑' },
  },
  {
    id: 'email_school_notice',
    from: '八十八学园',
    fromEmail: 'office@school88.ne.jp',
    subject: '【通知】寒假期间注意事项',
    body: '各位同学:寒假期间请遵守校规,不要在校内逗留至深夜。下学期开学时间为1月8日。',
    receivedAt: '12-23 10:00',
    trigger: { day: 2 },
    important: true,
  },
  {
    id: 'email_yui',
    from: '鸣泽美佐子',
    fromEmail: 'yui-hime@biglobe.ne.jp',
    subject: '今天的回家路上',
    body: '{{玩家姓名}},今天谢谢你陪我回家。其实有件事想跟你说……算了,改天再说吧。',
    receivedAt: '12-23 17:30',
    trigger: { day: 2, requiredFlag: '美佐子邻居' },
    important: true,
  },
  {
    id: 'email_spam_1',
    from: '不明发件人',
    fromEmail: 'rich@quick-rich.ne.jp',
    subject: '【赚钱机会】月入百万不是梦',
    body: '尊敬的客户,您被选中参与我们的高收益投资计划,只需汇款1万日元即可获得10倍回报……',
    receivedAt: '12-24 22:00',
    trigger: { day: 3 },
  },
  {
    id: 'email_warning',
    from: '匿名',
    fromEmail: 'anon@remailer.ne.jp',
    subject: '【警告】别再调查西御寺家',
    body: '我知道你在调查什么。停止你正在做的事情,否则后果自负。',
    receivedAt: '12-26 03:00',
    trigger: { day: 5, requiredFlag: '阴谋偷听' },
    important: true,
  },
  {
    id: 'email_shop_receipt',
    from: '7-Eleven 网上商城',
    fromEmail: 'no-reply@7eleven.ne.jp',
    subject: '【订单确认】您的订单已收到',
    body: '感谢您的购买。您的订单将在3-5个工作日内送达。',
    receivedAt: '12-25 14:00',
    trigger: { day: 4 },
  },
  {
    id: 'email_sakura',
    from: '樱子',
    fromEmail: 'sakura-ch@hospital.ne.jp',
    subject: '想见你',
    body: '{{玩家姓名}},我最近情况不太好。如果可以的话,希望能再见你一面。',
    receivedAt: '12-28 11:00',
    trigger: { day: 7, requiredFlag: '樱子线解锁' },
    important: true,
  },
];
