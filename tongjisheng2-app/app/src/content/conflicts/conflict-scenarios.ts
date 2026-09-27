/**
 * 剧情冲突场景库(阶段3 步骤7 增强)
 *
 * 设计理念:
 *  - 恋爱游戏中的"打斗"不是随机遭遇,而是剧情关键点的冲突解决
 *  - 每个场景绑定具体剧情线/女角/flag
 *  - 多种解决路径:格斗/口才/智力/潜行/意志
 *  - 战斗结果影响女角好感/信任/嫉妒/关系阶段
 *  - 关键战斗写入 flag(西寺对峙/唯获救/爱美获救等)
 *  - 违法行为有代价(违法计数 → BAD_END_7)
 *
 * 场景来源(对齐原作):
 *  1. 西御寺对峙(唯线 BAD_END_6 前置)
 *  2. 88公园解救唯(唯获救 flag)
 *  3. 天道爱美救赎(爱美获救 flag)
 *  4. 嫉妒杀戮制止(BAD_END_5 前置)
 *  5. 深夜变态骚扰(街道/公园夜晚)
 *  6. 妒意对峙(女角间冲突调停)
 *  7. 美纪威胁事件(美纪线)
 *  8. 变数屋遭遇(隐藏线)
 */

import type { CombatSkillType } from '../../runtime/combat-engine';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

/** 解决路径类型 */
export type ResolutionPath = CombatSkillType;

/** 冲突场景类型 */
export type ConflictType =
  | '解救' // 解救女角(唯/爱美)
  | '对峙' // 与反派正面对峙(西寺/天道)
  | '制止' // 制止女角失控(嫉妒杀戮)
  | '骚扰' // 应对路人骚扰
  | '调停' // 调停女角间冲突
  | '威胁' // 应对威胁(美纪线)
  | '隐藏'; // 隐藏线(变数屋)

/** 冲突严重程度 */
export type ConflictSeverity = '轻微' | '中等' | '严重' | '致命';

/** 关系影响(对当前女角或指定女角) */
export interface RelationshipImpact {
  /** 女角姓名(空字符串表示当前女角) */
  heroineName: string;
  /** 好感度变化(可正可负) */
  affectionDelta: number;
  /** 信任度变化 */
  trustDelta: number;
  /** 嫉妒值变化(通常为负,表示安抚) */
  jealousyDelta: number;
  /** 心跳值变化(英雄救美时大幅正) */
  heartbeatDelta: number;
  /** 关系阶段是否推进 */
  relationshipStageAdvance?: boolean;
}

/** 解决路径定义 */
export interface ResolutionPathDef {
  /** 路径类型 */
  path: ResolutionPath;
  /** 路径名称 */
  name: string;
  /** 路径描述 */
  description: string;
  /** 该路径的难度阈值(0-100,越高越难) */
  threshold: number;
  /** 该路径的成功描述 */
  successDescription: string;
  /** 该路径的失败描述 */
  failureDescription: string;
  /** 成功时的关系影响 */
  successImpacts: RelationshipImpact[];
  /** 失败时的关系影响 */
  failureImpacts: RelationshipImpact[];
  /** 成功时写入的 flag */
  successFlags?: string[];
  /** 失败时写入的 flag */
  failureFlags?: string[];
  /** 是否违法行为(影响违法计数) */
  isIllegal?: boolean;
  /** 大成功(骰子≤5)额外效果 */
  criticalSuccessBonus?: {
    affectionMultiplier: number;
    description: string;
  };
  /** 大失败(骰子≥96)额外效果 */
  criticalFailurePenalty?: {
    affectionDelta: number;
    description: string;
  };
}

/** 冲突场景定义 */
export interface ConflictScenario {
  /** 场景ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 场景类型 */
  type: ConflictType;
  /** 严重程度 */
  severity: ConflictSeverity;
  /** 场景描述(开场白) */
  description: string;
  /** 触发条件 */
  triggerCondition: {
    /** 触发地点(任一匹配) */
    locations: string[];
    /** 触发天数范围 */
    dayRange: [number, number];
    /** 触发时段 */
    timeSlots: string[];
    /** 前置 flag(全部为 true) */
    requiredFlags?: string[];
    /** 排除 flag(任一为 true 则不触发) */
    excludedFlags?: string[];
    /** 关联女角名(用于女角状态检查) */
    relatedHeroine?: string;
    /** 关联女角好感度下限 */
    heroineAffectionMin?: number;
  };
  /** 涉及的反派/NPC 名称 */
  opponentName: string;
  /** 对手描述 */
  opponentDescription: string;
  /** 对手 HP(严重程度递增) */
  opponentHp: number;
  /** 可选解决路径(至少 3 种) */
  resolutionPaths: ResolutionPathDef[];
  /** 默认路径(若玩家未选择) */
  defaultPath: ResolutionPath;
  /** 该场景胜利时写入的剧情 flag */
  victoryFlags?: string[];
  /** 该场景失败时触发的 BAD_END(若有) */
  failureBadEnd?: string;
  /** 是否一次性场景(触发后不再出现) */
  oneShot: boolean;
}

// ───────────────────────────────────────────────────────────
//  场景库
// ───────────────────────────────────────────────────────────

export const CONFLICT_SCENARIOS: ConflictScenario[] = [
  // ═════════════════════════════════════════════════════════
  //  1. 西御寺对峙(唯线关键战斗)
  // ═════════════════════════════════════════════════════════
  {
    id: 'west_temple_confrontation',
    name: '西御寺阴谋对峙',
    type: '对峙',
    severity: '严重',
    description:
      '深夜的鸣泽家门前,西御寺一郎带着两名手下出现。他冷笑着挡住你的去路:"听说你最近和鸣泽唯走得很近?我劝你识相点,她可是我的猎物。"手下缓缓逼近,气氛剑拔弩张。唯在屋内屏息听着,你能感觉到她恐惧的目光透过门缝望向你。',
    triggerCondition: {
      locations: ['鸣泽家', '鸣泽家门前', '八十八町住宅区'],
      dayRange: [8, 13],
      timeSlots: ['晚', '深夜'],
      requiredFlags: ['阴谋偷听'],
      excludedFlags: ['西寺对峙'],
      relatedHeroine: '鸣泽唯',
      heroineAffectionMin: 40,
    },
    opponentName: '西御寺一郎',
    opponentDescription: '西装革履的中年男子,眼神阴鸷,身后跟着两名打手',
    opponentHp: 120,
    resolutionPaths: [
      {
        path: '格斗',
        name: '正面格斗',
        description: '与西御寺及其手下正面对抗,用拳头解决',
        threshold: 65,
        successDescription:
          '你一拳击倒一名手下,又一脚踹开另一名。西御寺见状脸色大变,踉跄后退:"你……你敢动手!"他狼狈逃窜,临走撂下狠话:"这事没完!"唯冲出门扑进你怀里,浑身发抖:"哥哥……"',
        failureDescription:
          '寡不敌众,你被两名手下按倒在地。西御寺蹲下身,拍了拍你的脸:"不自量力。"他留下一句威胁后带人离开。唯从门缝看见这一切,捂住嘴不敢出声。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 15, trustDelta: 20, jealousyDelta: 0, heartbeatDelta: 25, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -5, trustDelta: -10, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['西寺对峙', '唯获救'],
        isIllegal: true,
        criticalSuccessBonus: {
          affectionMultiplier: 1.5,
          description: '★ 你以一敌三,将西御寺一行打得落花流水。唯含泪望着你,眼里的光比星辰更亮。',
        },
        criticalFailurePenalty: {
          affectionDelta: -15,
          description: '✗ 你被重击倒地,肋骨剧痛。西御寺踩着你冷笑,唯的尖叫声从屋内传来。',
        },
      },
      {
        path: '口才',
        name: '威胁曝光',
        description: '用证据威胁西御寺,迫使其退却',
        threshold: 55,
        successDescription:
          '你掏出录音笔:"西御寺先生,您刚才的话我都录下来了。如果这事传到警方或媒体,您的仕途可就完了。"西御寺脸色铁青,咬牙切齿:"你……算你狠!"他挥手带人离开,临走瞪了你一眼。唯打开门,望着你的背影,眼眶湿润。',
        failureDescription:
          '你试图用证据威胁,但西御寺嗤笑:"就凭你?你以为这点东西能扳倒我?"他示意手下动手,你被迫撤退。唯在屋内听见外面的骚动,心急如焚。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 12, trustDelta: 18, jealousyDelta: 0, heartbeatDelta: 18, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -3, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['西寺对峙'],
        isIllegal: false,
        criticalSuccessBonus: {
          affectionMultiplier: 1.4,
          description: '★ 你的口才让西御寺哑口无言,他狼狈不堪地离去。唯望着你,第一次主动握住你的手。',
        },
      },
      {
        path: '智力',
        name: '设局反制',
        description: '事先设下圈套,让西御寺自投罗网',
        threshold: 70,
        successDescription:
          '你早已预料到西御寺会来,提前联系了警察并布置了监控。当西御寺动手时,警笛骤响,他大惊失色被当场抓获。唯冲出门,紧紧抱住你:"哥哥,你早就准备好了对不对?"',
        failureDescription:
          '你的设局被西御寺识破,他冷笑着反将一军:"雕虫小技。"局面陷入僵持,你被迫正面应对。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 20, trustDelta: 25, jealousyDelta: 0, heartbeatDelta: 30, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -8, trustDelta: -12, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['西寺对峙', '唯获救', '西寺债务陷阱'],
        isIllegal: false,
        criticalSuccessBonus: {
          affectionMultiplier: 1.6,
          description: '★ 你的智谋让西御寺彻底栽了跟头,被警方带走时还在怒骂。唯望着你的眼神,像是望着英雄。',
        },
      },
      {
        path: '潜行',
        name: '暗中跟踪',
        description: '悄悄跟踪西御寺,收集更多证据',
        threshold: 60,
        successDescription:
          '你假装退让,实则暗中跟踪西御寺到他的老巢,拍下了他与黑道交易的证据。这些证据足以让他永世不得翻身。唯得知后,眼中闪烁着崇拜的光芒。',
        failureDescription:
          '你的跟踪被西御寺察觉,他冷笑着派人追打你。你狼狈逃回鸣泽家,唯看见你满身尘土,心疼不已。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 10, trustDelta: 15, jealousyDelta: 0, heartbeatDelta: 15 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 2, trustDelta: -3, jealousyDelta: 0, heartbeatDelta: 5 },
        ],
        successFlags: ['西寺对峙', '西寺债务陷阱'],
        isIllegal: false,
      },
    ],
    defaultPath: '口才',
    victoryFlags: ['西寺对峙'],
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  2. 88公园解救唯(唯获救 flag)
  // ═════════════════════════════════════════════════════════
  {
    id: 'yui_rescue_park',
    name: '88公园解救唯',
    type: '解救',
    severity: '致命',
    description:
      '88公园的深夜,你听见角落传来压抑的哭声。循声望去,唯被三个陌生男人围住,他们嬉笑着拉扯她的衣服。唯看见你,眼中闪过一丝希望:"哥哥……!"三个男人转头看向你,其中一个咧嘴笑:"又来一个送死的?"',
    triggerCondition: {
      locations: ['88公园', '八十八公园', '公园'],
      dayRange: [7, 12],
      timeSlots: ['晚', '深夜'],
      requiredFlags: ['阴谋偷听'],
      excludedFlags: ['唯获救'],
      relatedHeroine: '鸣泽唯',
      heroineAffectionMin: 30,
    },
    opponentName: '三名歹徒',
    opponentDescription: '三个醉醺醺的男人,眼神不怀好意',
    opponentHp: 150,
    resolutionPaths: [
      {
        path: '格斗',
        name: '拼死搏斗',
        description: '以一敌三,与歹徒殊死搏斗',
        threshold: 70,
        successDescription:
          '你红着眼冲上去,拳脚如风。一番血战后,三名歹徒倒地不起。你转身抱住瘫软的唯,她浑身发抖,眼泪打湿你的衣襟:"哥哥……我以为……我以为再也见不到你了……"',
        failureDescription:
          '寡不敌众,你被打倒在地。歹徒们狞笑着逼近唯,你拼尽最后一丝力气大喊:"快跑!"唯含泪逃走,但你被打成重伤住院。唯每天守在你病床前,以泪洗面。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 25, trustDelta: 30, jealousyDelta: 0, heartbeatDelta: 40, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 10, trustDelta: 15, jealousyDelta: 0, heartbeatDelta: 20 },
        ],
        successFlags: ['唯获救'],
        isIllegal: true,
        criticalSuccessBonus: {
          affectionMultiplier: 1.8,
          description: '★ 你以一敌三,毫发无损地将歹徒全部击倒。唯望着你的眼神,像是在仰望神明。这一夜她主动吻了你。',
        },
        criticalFailurePenalty: {
          affectionDelta: -20,
          description: '✗ 你被歹徒重创,昏迷不醒。唯的尖叫声划破夜空,她跪在你身边,以为你死了。',
        },
      },
      {
        path: '口才',
        name: '虚张声势',
        description: '假装报警并大声呼救,吓退歹徒',
        threshold: 50,
        successDescription:
          '你掏出手机大声喊:"我已经报警了!警察三分钟就到!你们现在走还来得及!"又朝远处挥手:"这边!他们在这边!"歹徒们面面相觑,骂骂咧咧地逃走了。唯扑进你怀里,泣不成声。',
        failureDescription:
          '你的虚张声势被识破,歹徒们大笑:"小鬼,吓唬谁呢?"局面反而更加危急,你被迫硬拼。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 18, trustDelta: 22, jealousyDelta: 0, heartbeatDelta: 28, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -5, trustDelta: -8, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['唯获救'],
        isIllegal: false,
      },
      {
        path: '智力',
        name: '智取诱敌',
        description: '用计策将歹徒引开,再救走唯',
        threshold: 60,
        successDescription:
          '你假装是巡逻警察,用手电筒和哨声制造动静,又故意制造远处警笛声。歹徒们慌忙逃窜,你趁机拉着唯躲进暗巷。唯紧紧抓着你的手,心跳如鼓。',
        failureDescription:
          '你的计策不够逼真,歹徒们只是短暂迟疑后继续逼近。你被迫正面应对。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 15, trustDelta: 18, jealousyDelta: 0, heartbeatDelta: 22 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 0, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['唯获救'],
        isIllegal: false,
      },
    ],
    defaultPath: '格斗',
    victoryFlags: ['唯获救'],
    failureBadEnd: 'BAD_END_6_西御寺阴谋',
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  3. 天道爱美救赎(爱美获救 flag)
  // ═════════════════════════════════════════════════════════
  {
    id: 'amami_rescue',
    name: '天道爱美救赎',
    type: '解救',
    severity: '严重',
    description:
      '保育园后院,你撞见天道新干线正胁迫爱美:"你母亲欠的债,该用你来还了。"爱美瑟缩在墙角,看见你时眼中闪过惊喜:"大哥哥……"天道新干线转头看你,冷笑:"又一个多管闲事的。"',
    triggerCondition: {
      locations: ['保育园', '保育园后院', '八十八保育园'],
      dayRange: [9, 13],
      timeSlots: ['下午', '晚'],
      excludedFlags: ['爱美获救'],
      relatedHeroine: '安田爱美',
      heroineAffectionMin: 20,
    },
    opponentName: '天道新干线',
    opponentDescription: '身材魁梧的中年男人,眼神阴鸷,嘴角挂着冷笑',
    opponentHp: 100,
    resolutionPaths: [
      {
        path: '格斗',
        name: '正面格斗',
        description: '与天道新干线正面对抗',
        threshold: 60,
        successDescription:
          '你冲上去与天道新干线搏斗。一番激战后,他狼狈倒地。爱美扑过来抱住你的腰:"大哥哥,谢谢你……"天道新干线爬起来逃走,临走撂下狠话:"这事没完!"',
        failureDescription:
          '天道新干线身手不凡,你被打倒。爱美尖叫着挡在你身前:"不要打大哥哥!"天道新干线冷哼一声带人离开,留下一句"下次再来"。',
        successImpacts: [
          { heroineName: '安田爱美', affectionDelta: 20, trustDelta: 25, jealousyDelta: 0, heartbeatDelta: 30, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '安田爱美', affectionDelta: 8, trustDelta: 10, jealousyDelta: 0, heartbeatDelta: 12 },
        ],
        successFlags: ['爱美获救'],
        isIllegal: true,
      },
      {
        path: '口才',
        name: '义正言辞',
        description: '用法律和舆论威胁天道新干线',
        threshold: 55,
        successDescription:
          '你冷冷地说:"天道先生,胁迫未成年人可是重罪。我已经通知了警方和媒体,您现在走还来得及。"天道新干线脸色一变,咬牙离去。爱美望着你,眼里闪着光:"大哥哥好厉害……"',
        failureDescription:
          '天道新干线嗤笑:"就凭你?"他不为所动,局面陷入僵持。',
        successImpacts: [
          { heroineName: '安田爱美', affectionDelta: 18, trustDelta: 22, jealousyDelta: 0, heartbeatDelta: 25, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '安田爱美', affectionDelta: -2, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['爱美获救'],
        isIllegal: false,
      },
      {
        path: '意志',
        name: '死守不退',
        description: '挡在爱美身前,任凭威胁也不退缩',
        threshold: 50,
        successDescription:
          '你张开双臂挡在爱美身前,任凭天道新干线如何威胁也不退半步。你的坚持让他烦躁不已,最终愤然离去:"下次别让我看见你!"爱美从你身后探出头,紧紧抓住你的衣角:"大哥哥……我好怕……"',
        failureDescription:
          '你的意志动摇了,天道新干线看穿你的软弱,冷笑着逼近。局面更加危急。',
        successImpacts: [
          { heroineName: '安田爱美', affectionDelta: 15, trustDelta: 20, jealousyDelta: 0, heartbeatDelta: 18, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '安田爱美', affectionDelta: -5, trustDelta: -10, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['爱美获救'],
        isIllegal: false,
      },
    ],
    defaultPath: '口才',
    victoryFlags: ['爱美获救'],
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  4. 嫉妒杀戮制止(BAD_END_5 前置)
  // ═════════════════════════════════════════════════════════
  {
    id: 'jealousy_stop',
    name: '嫉妒杀戮制止',
    type: '制止',
    severity: '致命',
    description:
      '深夜的鸣泽家厨房,你看见美佐子握着菜刀,眼神空洞地喃喃自语:"为什么……为什么你要这样对我……"她的嫉妒已经到了爆发的边缘。你必须立刻制止她,否则后果不堪设想。',
    triggerCondition: {
      locations: ['鸣泽家', '鸣泽家厨房', '主角自宅'],
      dayRange: [10, 16],
      timeSlots: ['深夜'],
      excludedFlags: ['嫉妒杀戮制止'],
      relatedHeroine: '鸣泽美佐子',
      heroineAffectionMin: 50,
    },
    opponentName: '美佐子(失控状态)',
    opponentDescription: '美佐子双眼通红,握着菜刀的手在颤抖,像是随时会失控',
    opponentHp: 80,
    resolutionPaths: [
      {
        path: '口才',
        name: '温柔劝说',
        description: '用温柔的话语安抚美佐子的情绪',
        threshold: 65,
        successDescription:
          '你缓缓靠近美佐子,轻声说:"美佐子阿姨,是我。你看看我,深呼吸。"你的声音像是有魔力,美佐子的眼神逐渐清明。菜刀从她手中滑落,她瘫软在你怀里,痛哭失声:"对不起……对不起……我差点……"',
        failureDescription:
          '你的劝说未能奏效,美佐子情绪更加激动。你被迫后退,局面一度失控。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 18, trustDelta: 22, jealousyDelta: -30, heartbeatDelta: 15 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -8, trustDelta: -10, jealousyDelta: 10, heartbeatDelta: 0 },
        ],
        successFlags: ['嫉妒杀戮制止'],
        isIllegal: false,
        criticalSuccessBonus: {
          affectionMultiplier: 1.5,
          description: '★ 你的温柔彻底融化了美佐子的嫉妒。她紧紧抱住你,发誓再也不会这样。这一夜她主动靠近你。',
        },
      },
      {
        path: '意志',
        name: '坚定拥抱',
        description: '不顾危险紧紧抱住美佐子,用体温传递安心',
        threshold: 55,
        successDescription:
          '你一把抱住美佐子,不顾菜刀的危险。你的体温和心跳传递给她,美佐子浑身一震,菜刀掉落在地。她埋在你怀里痛哭:"对不起……对不起……"',
        failureDescription:
          '你试图拥抱,但美佐子挣扎得更厉害。菜刀划伤了你的手臂,鲜血滴落。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 22, trustDelta: 25, jealousyDelta: -35, heartbeatDelta: 20, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -5, trustDelta: -8, jealousyDelta: 5, heartbeatDelta: 0 },
        ],
        successFlags: ['嫉妒杀戮制止'],
        isIllegal: false,
      },
      {
        path: '智力',
        name: '转移注意',
        description: '用唯的名字或回忆转移美佐子的注意力',
        threshold: 60,
        successDescription:
          '你大喊:"美佐子阿姨!想想唯!她不能没有妈妈!"美佐子浑身一震,眼神逐渐清明。菜刀从她手中滑落,她跪倒在地,捂着脸痛哭:"唯……对不起……妈妈差点做了傻事……"',
        failureDescription:
          '你的转移注意力策略未能奏效,美佐子陷入自己的世界无法自拔。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 12, trustDelta: 15, jealousyDelta: -20, heartbeatDelta: 10 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -3, trustDelta: -5, jealousyDelta: 8, heartbeatDelta: 0 },
        ],
        successFlags: ['嫉妒杀戮制止'],
        isIllegal: false,
      },
    ],
    defaultPath: '口才',
    victoryFlags: ['嫉妒杀戮制止'],
    failureBadEnd: 'BAD_END_5_嫉妒杀戮',
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  5. 深夜变态骚扰(随机遭遇,可重复)
  // ═════════════════════════════════════════════════════════
  {
    id: 'night_harasser',
    name: '深夜变态骚扰',
    type: '骚扰',
    severity: '轻微',
    description:
      '深夜的街道上,一个醉醺醺的男人拦住你的去路,嬉皮笑脸地说:"小弟弟,一个人走夜路不安全哦~要不要哥哥陪你?"他的眼神让你浑身不自在。',
    triggerCondition: {
      locations: ['八十八町街道', '商业区', '车站前'],
      dayRange: [1, 17],
      timeSlots: ['深夜'],
      excludedFlags: [],
    },
    opponentName: '醉酒变态',
    opponentDescription: '醉醺醺的中年男人,浑身酒气,眼神飘忽',
    opponentHp: 50,
    resolutionPaths: [
      {
        path: '格斗',
        name: '一拳解决',
        description: '一拳打倒变态,迅速离开',
        threshold: 40,
        successDescription: '你一拳击中变态的面门,他应声倒地。你迅速离开现场,回头看了他一眼,骂了一句"活该"。',
        failureDescription: '你的拳头落空,变态反而嬉笑着追上来。你被迫奔跑逃离。',
        successImpacts: [],
        failureImpacts: [],
        isIllegal: true,
      },
      {
        path: '口才',
        name: '冷言拒绝',
        description: '用冷漠的态度拒绝并离开',
        threshold: 35,
        successDescription: '你冷冷地看了他一眼:"滚开。"你的气场让他一愣,随即讪讪离开。',
        failureDescription: '你的拒绝被他当作欲擒故纵,反而更来劲。你被迫加快脚步离开。',
        successImpacts: [],
        failureImpacts: [],
        isIllegal: false,
      },
      {
        path: '潜行',
        name: '绕路避开',
        description: '悄悄绕路避开变态',
        threshold: 45,
        successDescription: '你拐进一条小巷,成功甩掉了变态。深夜的街道重归宁静。',
        failureDescription: '你的绕路被变态发现,他嬉笑着追上来。你被迫奔跑逃离。',
        successImpacts: [],
        failureImpacts: [],
        isIllegal: false,
      },
    ],
    defaultPath: '潜行',
    oneShot: false,
  },

  // ═════════════════════════════════════════════════════════
  //  6. 妒意对峙(女角间冲突调停)
  // ═════════════════════════════════════════════════════════
  {
    id: 'jealousy_confrontation',
    name: '妒意对峙',
    type: '调停',
    severity: '中等',
    description:
      '咖啡店《憩》里,美佐子和唯面对面坐着,气氛剑拔弩张。唯冷冷地说:"妈妈,你是不是对哥哥做了什么?"美佐子脸色一变:"唯,你这是在和妈妈说话吗?"两人的目光在你身上交汇,你必须做出选择。',
    triggerCondition: {
      locations: ['咖啡店憩', '咖啡店', '鸣泽家客厅'],
      dayRange: [10, 15],
      timeSlots: ['下午', '晚'],
      requiredFlags: ['美佐子初H完成'],
      excludedFlags: ['唯和解'],
      relatedHeroine: '鸣泽美佐子',
      heroineAffectionMin: 40,
    },
    opponentName: '美佐子与唯(对峙)',
    opponentDescription: '母女二人怒目相视,空气中弥漫着火药味',
    opponentHp: 60,
    resolutionPaths: [
      {
        path: '口才',
        name: '调解圆场',
        description: '用圆滑的话语调解母女矛盾',
        threshold: 60,
        successDescription:
          '你站在两人中间,诚恳地说:"阿姨,唯,你们都是我最在意的人。这件事是我不好,请不要因为我而伤害母女情分。"两人沉默片刻,最终相视而泣,紧紧拥抱。',
        failureDescription:
          '你的调解未能奏效,母女矛盾反而升级。两人不欢而散,你被夹在中间左右为难。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 10, trustDelta: 12, jealousyDelta: -15, heartbeatDelta: 5 },
          { heroineName: '鸣泽唯', affectionDelta: 10, trustDelta: 12, jealousyDelta: -15, heartbeatDelta: 5 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -5, trustDelta: -8, jealousyDelta: 10, heartbeatDelta: 0 },
          { heroineName: '鸣泽唯', affectionDelta: -5, trustDelta: -8, jealousyDelta: 10, heartbeatDelta: 0 },
        ],
        successFlags: ['唯和解'],
        isIllegal: false,
      },
      {
        path: '意志',
        name: '承担过错',
        description: '主动承担所有责任,平息母女怒火',
        threshold: 50,
        successDescription:
          '你跪在两人面前:"阿姨,唯,都是我的错。是我主动的,请不要责怪对方。"两人愣住了,随即都被你的诚意打动。美佐子红了眼眶,唯也转过身擦眼泪。',
        failureDescription:
          '你的承担被视为软弱,母女二人都对你失望。局面更加僵持。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 15, trustDelta: 18, jealousyDelta: -20, heartbeatDelta: 10, relationshipStageAdvance: true },
          { heroineName: '鸣泽唯', affectionDelta: 12, trustDelta: 15, jealousyDelta: -18, heartbeatDelta: 8 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -8, trustDelta: -10, jealousyDelta: 5, heartbeatDelta: 0 },
          { heroineName: '鸣泽唯', affectionDelta: -8, trustDelta: -10, jealousyDelta: 5, heartbeatDelta: 0 },
        ],
        successFlags: ['唯和解'],
        isIllegal: false,
      },
      {
        path: '智力',
        name: '巧妙转移',
        description: '用话题转移化解尴尬气氛',
        threshold: 55,
        successDescription:
          '你故意提起一个让两人都关心的话题:"对了,唯的学校最近怎么样?阿姨,您听说了吗?"两人被转移了注意力,开始聊起唯的学业。气氛逐渐缓和。',
        failureDescription:
          '你的转移话题被识破,母女二人都对你不满。局面更加尴尬。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 5, trustDelta: 8, jealousyDelta: -10, heartbeatDelta: 3 },
          { heroineName: '鸣泽唯', affectionDelta: 5, trustDelta: 8, jealousyDelta: -10, heartbeatDelta: 3 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -3, trustDelta: -5, jealousyDelta: 8, heartbeatDelta: 0 },
          { heroineName: '鸣泽唯', affectionDelta: -3, trustDelta: -5, jealousyDelta: 8, heartbeatDelta: 0 },
        ],
        isIllegal: false,
      },
    ],
    defaultPath: '口才',
    victoryFlags: ['唯和解'],
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  7. 美纪威胁事件(美纪线)
  // ═════════════════════════════════════════════════════════
  {
    id: 'miki_threat',
    name: '美纪威胁事件',
    type: '威胁',
    severity: '严重',
    description:
      '商业区后巷,你撞见加藤美纪被一个黑衣男人威胁:"你双身份的事,要是被曝光,你的偶像生涯就完了。识相点就乖乖听话。"美纪咬着唇,看见你时眼中闪过惊慌:"你……你怎么在这里?"',
    triggerCondition: {
      locations: ['商业区', '商业区后巷', '八十八町商业区'],
      dayRange: [8, 14],
      timeSlots: ['下午', '晚'],
      requiredFlags: ['美纪双身份揭示'],
      excludedFlags: ['美纪威胁事件'],
      relatedHeroine: '加藤美纪',
      heroineAffectionMin: 30,
    },
    opponentName: '黑衣威胁者',
    opponentDescription: '戴着墨镜的黑衣男人,身材高大,神情阴鸷',
    opponentHp: 90,
    resolutionPaths: [
      {
        path: '格斗',
        name: '击退威胁者',
        description: '用武力击退黑衣男人',
        threshold: 55,
        successDescription:
          '你冲上去与黑衣男人搏斗,一番激战后将他击退。美纪望着你,眼中闪着复杂的光:"你……为什么帮我?"',
        failureDescription:
          '黑衣男人身手不凡,你被打倒。美纪尖叫着挡在你身前,黑衣男人冷笑着离开。',
        successImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 15, trustDelta: 20, jealousyDelta: 0, heartbeatDelta: 18, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 5, trustDelta: 8, jealousyDelta: 0, heartbeatDelta: 10 },
        ],
        successFlags: ['美纪威胁事件', '美纪秘密保守'],
        isIllegal: true,
      },
      {
        path: '口才',
        name: '反威胁',
        description: '用证据反威胁黑衣男人',
        threshold: 60,
        successDescription:
          '你冷冷地说:"我已经录下了你的话。如果你敢曝光美纪的事,我就把你交给警方。"黑衣男人脸色一变,咬牙离去。美纪望着你,第一次露出脆弱的神情:"谢谢你……"',
        failureDescription:
          '你的反威胁未能奏效,黑衣男人嗤笑离开,临走撂下狠话。',
        successImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 12, trustDelta: 18, jealousyDelta: 0, heartbeatDelta: 15 },
        ],
        failureImpacts: [
          { heroineName: '加藤美纪', affectionDelta: -5, trustDelta: -8, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['美纪威胁事件', '美纪秘密保守'],
        isIllegal: false,
      },
      {
        path: '潜行',
        name: '暗中记录',
        description: '悄悄录下威胁证据,事后反击',
        threshold: 50,
        successDescription:
          '你假装路过,实则用手机录下了黑衣男人的话。事后你把证据交给美纪,她望着你,眼中闪着光:"你……一直在保护我?"',
        failureDescription:
          '你的偷录被发现,黑衣男人抢走了手机并警告你。局面陷入僵持。',
        successImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 10, trustDelta: 15, jealousyDelta: 0, heartbeatDelta: 12 },
        ],
        failureImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 0, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        successFlags: ['美纪威胁事件'],
        isIllegal: false,
      },
    ],
    defaultPath: '口才',
    victoryFlags: ['美纪威胁事件'],
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  8. 变数屋遭遇(隐藏线)
  // ═════════════════════════════════════════════════════════
  {
    id: 'variable_shop_encounter',
    name: '变数屋遭遇',
    type: '隐藏',
    severity: '中等',
    description:
      '深夜,你再次来到变数屋。这次店主没有戴面具,而是背对着你站在柜台后。他缓缓转身,露出一张与你极为相似的脸:"终于见面了,另一个我。"他的眼神深邃,仿佛看穿了你的一切。',
    triggerCondition: {
      locations: ['变数屋', '主角自宅上方', '变数屋内部'],
      dayRange: [10, 16],
      timeSlots: ['深夜'],
      requiredFlags: ['变数屋访问次数_10'], // 实际判断时用 >=10
      excludedFlags: ['变数屋遭遇'],
    },
    opponentName: '变数屋店主(神秘人)',
    opponentDescription: '面容与你相似的神秘男子,眼神深邃',
    opponentHp: 100,
    resolutionPaths: [
      {
        path: '智力',
        name: '追问真相',
        description: '追问店主的真正身份和目的',
        threshold: 70,
        successDescription:
          '你冷静地问:"你是谁?为什么和我长得一样?"店主微微一笑:"好问题。我是你可能成为的另一种样子。我来这里,是为了告诉你——这个寒假的选择,将决定你成为谁。"',
        failureDescription:
          '你的追问未能得到答案,店主只是神秘地微笑:"时机未到。"',
        successImpacts: [],
        failureImpacts: [],
        successFlags: ['变数屋遭遇', '变数屋全解锁'],
        isIllegal: false,
        criticalSuccessBonus: {
          affectionMultiplier: 1.0,
          description: '★ 店主点头认可你的智慧,赠予你一枚神秘的怀表:"这会指引你找到真正的答案。"',
        },
      },
      {
        path: '意志',
        name: '坚持自我',
        description: '表明不会被神秘人所动摇',
        threshold: 60,
        successDescription:
          '你直视店主的眼睛:"不管你是谁,我就是我。我的选择由我自己决定。"店主点头赞许:"很好。这种意志,才是真正的你。"',
        failureDescription:
          '你的意志动摇了,店主的话在你心中激起涟漪。',
        successImpacts: [],
        failureImpacts: [],
        successFlags: ['变数屋遭遇'],
        isIllegal: false,
      },
      {
        path: '口才',
        name: '套取信息',
        description: '用巧妙的话术套取店主的秘密',
        threshold: 65,
        successDescription:
          '你绕着圈子问东问西,店主最终失笑:"你这小鬼,倒是机灵。"他透露了一些关于樱子的关键信息,让你心头一震。',
        failureDescription:
          '你的套话被店主识破,他只是神秘微笑。',
        successImpacts: [],
        failureImpacts: [],
        successFlags: ['变数屋遭遇'],
        isIllegal: false,
      },
    ],
    defaultPath: '智力',
    victoryFlags: ['变数屋遭遇'],
    oneShot: true,
  },
];

// ───────────────────────────────────────────────────────────
//  辅助函数
// ───────────────────────────────────────────────────────────

/** 根据 ID 查找场景 */
export function findScenarioById(id: string): ConflictScenario | undefined {
  return CONFLICT_SCENARIOS.find((s) => s.id === id);
}

/** 按类型筛选场景 */
export function filterScenariosByType(type: ConflictType): ConflictScenario[] {
  return CONFLICT_SCENARIOS.filter((s) => s.type === type);
}

/** 获取所有场景 ID */
export function getAllScenarioIds(): string[] {
  return CONFLICT_SCENARIOS.map((s) => s.id);
}

/** 获取场景总数与按类型分组 */
export function getScenarioStats(): {
  total: number;
  byType: Record<ConflictType, number>;
  bySeverity: Record<ConflictSeverity, number>;
} {
  const byType: Record<ConflictType, number> = {
    解救: 0, 对峙: 0, 制止: 0, 骚扰: 0, 调停: 0, 威胁: 0, 隐藏: 0,
  };
  const bySeverity: Record<ConflictSeverity, number> = {
    轻微: 0, 中等: 0, 严重: 0, 致命: 0,
  };
  for (const s of CONFLICT_SCENARIOS) {
    byType[s.type]++;
    bySeverity[s.severity]++;
  }
  return { total: CONFLICT_SCENARIOS.length, byType, bySeverity };
}
