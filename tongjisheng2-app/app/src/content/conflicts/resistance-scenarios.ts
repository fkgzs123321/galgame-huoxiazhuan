/**
 * 强迫抵抗场景库(阶段3 步骤7 增强)
 *
 * 设计理念:
 *  - 涉及强迫的场景必须有战斗介入机制,玩家可选择抵抗
 *  - 抵抗成功:阻止强迫行为,写入 flag,影响女角好感
 *  - 抵抗失败:被强迫发生,触发 BAD_END 或严重后果
 *  - 不抵抗:被动接受,影响心情/声誉,可能触发其他结局
 *
 * 场景类型:
 *  1. 女角被强迫(玩家解救):解救鸣泽唯/安田爱美等
 *  2. 玩家被强迫(抵抗):被反派威胁/胁迫时的抵抗
 *  3. 女角强迫玩家:如嫉妒杀戮失控的美佐子
 *  4. 第三方强迫:如88公园歹徒、西御寺手下
 *
 * 与 ConflictScenario 的区别:
 *  - ConflictScenario 侧重剧情冲突解决(多路径)
 *  - ResistanceScenario 侧重强迫/抵抗的二元判定(抵抗 vs 不抵抗)
 *  - 抵抗失败后果更严重(可能触发 BAD_END)
 */

import type { CombatSkillType } from '../../runtime/combat-engine';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

/** 强迫场景类型 */
export type ResistanceType =
  | '解救女角' // 女角被第三方强迫,玩家解救
  | '抵抗胁迫' // 玩家被反派胁迫,抵抗
  | '抵抗失控' // 女角失控(如嫉妒杀戮),玩家抵抗
  | '抵抗袭击' // 玩家被袭击,抵抗
  | '解救NPC'; // 解救非女角 NPC

/** 强迫严重程度 */
export type ResistanceSeverity = '轻度' | '中度' | '重度' | '极重';

/** 抵抗路径 */
export interface ResistancePath {
  /** 路径ID */
  id: string;
  /** 路径名称 */
  name: string;
  /** 路径描述 */
  description: string;
  /** 使用的技能 */
  skill: CombatSkillType;
  /** 难度阈值(0-100) */
  threshold: number;
  /** 抵抗成功描述 */
  successDescription: string;
  /** 抵抗失败描述 */
  failureDescription: string;
  /** 不抵抗描述 */
  noResistanceDescription: string;
  /** 成功时的关系影响 */
  successImpacts: Array<{
    heroineName: string;
    affectionDelta: number;
    trustDelta: number;
    jealousyDelta: number;
    heartbeatDelta: number;
    relationshipStageAdvance?: boolean;
  }>;
  /** 失败时的关系影响 */
  failureImpacts: Array<{
    heroineName: string;
    affectionDelta: number;
    trustDelta: number;
    jealousyDelta: number;
    heartbeatDelta: number;
  }>;
  /** 不抵抗时的影响 */
  noResistanceImpacts: Array<{
    heroineName: string;
    affectionDelta: number;
    trustDelta: number;
    jealousyDelta: number;
    heartbeatDelta: number;
  }>;
  /** 成功写入的 flag */
  successFlags?: string[];
  /** 失败写入的 flag */
  failureFlags?: string[];
  /** 不抵抗写入的 flag */
  noResistanceFlags?: string[];
  /** 失败触发的 BAD_END */
  failureBadEnd?: string;
  /** 是否违法行为(抵抗暴力时) */
  isIllegal?: boolean;
}

/** 强迫抵抗场景 */
export interface ResistanceScenario {
  /** 场景ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 场景类型 */
  type: ResistanceType;
  /** 严重程度 */
  severity: ResistanceSeverity;
  /** 场景描述(强迫情境) */
  description: string;
  /** 触发条件 */
  triggerCondition: {
    locations: string[];
    dayRange: [number, number];
    timeSlots: string[];
    requiredFlags?: string[];
    excludedFlags?: string[];
    relatedHeroine?: string;
    heroineAffectionMin?: number;
  };
  /** 强迫者名称 */
  aggressorName: string;
  /** 强迫者描述 */
  aggressorDescription: string;
  /** 强迫者 HP */
  aggressorHp: number;
  /** 被强迫对象(若是女角) */
  victimName?: string;
  /** 可选抵抗路径 */
  resistancePaths: ResistancePath[];
  /** 默认路径 */
  defaultPath: string;
  /** 是否一次性 */
  oneShot: boolean;
}

// ───────────────────────────────────────────────────────────
//  场景库
// ───────────────────────────────────────────────────────────

export const RESISTANCE_SCENARIOS: ResistanceScenario[] = [
  // ═════════════════════════════════════════════════════════
  //  1. 88公园解救唯(重度·歹徒强迫)
  // ═════════════════════════════════════════════════════════
  {
    id: 'resist_park_yui',
    name: '88公园解救唯',
    type: '解救女角',
    severity: '极重',
    description:
      '深夜的88公园角落,三个陌生男人将唯按倒在地,撕扯她的衣服。唯拼命挣扎,哭喊着"不要!放开我!"她的眼神逐渐绝望,看见你时爆发出最后的希望:"哥哥!救我!"三个男人转头看你,其中一个咧嘴笑:"又来一个送死的?识相的赶紧滚,别多管闲事。"',
    triggerCondition: {
      locations: ['88公园', '八十八公园', '公园'],
      dayRange: [7, 12],
      timeSlots: ['晚', '深夜'],
      requiredFlags: ['阴谋偷听'],
      excludedFlags: ['唯获救'],
      relatedHeroine: '鸣泽唯',
      heroineAffectionMin: 30,
    },
    aggressorName: '三名歹徒',
    aggressorDescription: '三个醉醺醺的男人,眼神淫邪,已经失去了理智',
    aggressorHp: 150,
    victimName: '鸣泽唯',
    resistancePaths: [
      {
        id: 'fight',
        name: '拼死搏斗',
        description: '以一敌三,与歹徒殊死搏斗,解救唯',
        skill: '格斗',
        threshold: 70,
        successDescription:
          '你红着眼冲上去,拳脚如风。一番血战后,三名歹徒倒地不起。你转身抱住瘫软的唯,她浑身发抖,眼泪打湿你的衣襟:"哥哥……我以为……再也见不到你了……"她紧紧抓住你的衣角,像是抓住了救命稻草。',
        failureDescription:
          '寡不敌众,你被打倒在地。歹徒们狞笑着继续侵犯唯,你拼尽最后一丝力气大喊:"快跑!"唯含泪逃走,但你被打成重伤住院。唯每天守在你病床前,以泪洗面,自责不已。',
        noResistanceDescription:
          '你转身离开,假装没看见。唯的尖叫声在你身后逐渐微弱,最终消失。第二天,你在医院看见满身伤痕的唯,她见到你时眼神空洞,像是丢了魂。她再也没和你说一句话。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 30, trustDelta: 35, jealousyDelta: 0, heartbeatDelta: 45, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 15, trustDelta: 20, jealousyDelta: 0, heartbeatDelta: 25 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -50, trustDelta: -80, jealousyDelta: 0, heartbeatDelta: -30 },
        ],
        successFlags: ['唯获救', '英雄救美'],
        failureFlags: ['唯受伤'],
        noResistanceFlags: ['唯受害', '主角懦弱'],
        failureBadEnd: 'BAD_END_6_西御寺阴谋',
        isIllegal: true,
      },
      {
        id: 'threaten',
        name: '虚张声势',
        description: '假装报警并大声呼救,吓退歹徒',
        skill: '口才',
        threshold: 50,
        successDescription:
          '你掏出手机大声喊:"我已经报警了!警察三分钟就到!你们现在走还来得及!"又朝远处挥手:"这边!他们在这边!"歹徒们面面相觑,骂骂咧咧地逃走了。唯扑进你怀里,泣不成声:"哥哥……我好怕……"',
        failureDescription:
          '你的虚张声势被识破,歹徒们大笑:"小鬼,吓唬谁呢?"他们放下唯,朝你围过来。局面反而更加危急,你被迫硬拼。',
        noResistanceDescription:
          '你犹豫不决,最终选择悄悄离开。唯的哭喊声在你耳边回荡,你捂住耳朵奔跑,却怎么也跑不出那片黑暗。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 22, trustDelta: 28, jealousyDelta: 0, heartbeatDelta: 32, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -5, trustDelta: -10, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -60, trustDelta: -90, jealousyDelta: 0, heartbeatDelta: -40 },
        ],
        successFlags: ['唯获救'],
        failureFlags: ['唯受伤'],
        noResistanceFlags: ['唯受害', '主角懦弱'],
        failureBadEnd: 'BAD_END_6_西御寺阴谋',
        isIllegal: false,
      },
      {
        id: 'rescue_smart',
        name: '智取诱敌',
        description: '用计策将歹徒引开,再救走唯',
        skill: '智力',
        threshold: 60,
        successDescription:
          '你假装是巡逻警察,用手电筒和哨声制造动静,又故意制造远处警笛声。歹徒们慌忙逃窜,你趁机拉着唯躲进暗巷。唯紧紧抓着你的手,心跳如鼓:"哥哥,你好聪明……"',
        failureDescription:
          '你的计策不够逼真,歹徒们只是短暂迟疑后继续侵犯唯。你被迫正面应对,局面更加危急。',
        noResistanceDescription:
          '你躲在一旁观察,想着"总会有人救她的"。但夜深人静,公园无人经过。最终你离开,假装什么都没发生。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 18, trustDelta: 22, jealousyDelta: 0, heartbeatDelta: 25 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 0, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -70, trustDelta: -100, jealousyDelta: 0, heartbeatDelta: -50 },
        ],
        successFlags: ['唯获救'],
        failureFlags: ['唯受伤'],
        noResistanceFlags: ['唯受害', '主角懦弱'],
        failureBadEnd: 'BAD_END_6_西御寺阴谋',
        isIllegal: false,
      },
    ],
    defaultPath: 'fight',
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  2. 天道爱美救赎(重度·胁迫未成年)
  // ═════════════════════════════════════════════════════════
  {
    id: 'resist_amami',
    name: '天道爱美救赎',
    type: '解救女角',
    severity: '极重',
    description:
      '保育园后院,你撞见天道新干线正强行拉扯爱美:"你母亲欠的债,该用你来还了。"爱美瑟缩在墙角,衣服已经被撕破一角,看见你时眼中闪过惊喜:"大哥哥……救命……"天道新干线转头看你,冷笑:"又一个多管闲事的。识相的滚远点。"',
    triggerCondition: {
      locations: ['保育园', '保育园后院', '八十八保育园'],
      dayRange: [9, 13],
      timeSlots: ['下午', '晚'],
      excludedFlags: ['爱美获救'],
      relatedHeroine: '安田爱美',
      heroineAffectionMin: 20,
    },
    aggressorName: '天道新干线',
    aggressorDescription: '身材魁梧的中年男人,眼神阴鸷,已经失去耐心',
    aggressorHp: 100,
    victimName: '安田爱美',
    resistancePaths: [
      {
        id: 'fight',
        name: '正面格斗',
        description: '与天道新干线正面对抗,解救爱美',
        skill: '格斗',
        threshold: 60,
        successDescription:
          '你冲上去与天道新干线搏斗。一番激战后,他狼狈倒地。爱美扑过来抱住你的腰,泣不成声:"大哥哥,谢谢你……我以为再也见不到你了……"天道新干线爬起来逃走,临走撂下狠话:"这事没完!"',
        failureDescription:
          '天道新干线身手不凡,你被打倒。爱美尖叫着挡在你身前:"不要打大哥哥!"天道新干线冷哼一声,带人离开,但爱美的心灵已经受到重创。',
        noResistanceDescription:
          '你假装没看见,转身离开。爱美的哭喊声在你身后逐渐消失。第二天,你听说爱美被天道新干线带走了,从此再也没人见过她。',
        successImpacts: [
          { heroineName: '安田爱美', affectionDelta: 25, trustDelta: 30, jealousyDelta: 0, heartbeatDelta: 35, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '安田爱美', affectionDelta: 10, trustDelta: 15, jealousyDelta: 0, heartbeatDelta: 15 },
        ],
        noResistanceImpacts: [
          { heroineName: '安田爱美', affectionDelta: -80, trustDelta: -100, jealousyDelta: 0, heartbeatDelta: -50 },
        ],
        successFlags: ['爱美获救', '英雄救美'],
        failureFlags: ['爱美受伤'],
        noResistanceFlags: ['爱美受害', '主角懦弱'],
        isIllegal: true,
      },
      {
        id: 'intimidate',
        name: '义正言辞',
        description: '用法律和舆论威胁天道新干线,迫使他放弃',
        skill: '口才',
        threshold: 55,
        successDescription:
          '你冷冷地说:"天道先生,胁迫未成年人可是重罪。我已经通知了警方和媒体,您现在走还来得及。"天道新干线脸色一变,咬牙离去。爱美望着你,眼里闪着光:"大哥哥好厉害……"',
        failureDescription:
          '天道新干线嗤笑:"就凭你?"他不为所动,继续拉扯爱美。你被迫正面应对。',
        noResistanceDescription:
          '你站在一旁犹豫,想着"这是别家的家事"。最终你转身离开,装作什么都没发生。',
        successImpacts: [
          { heroineName: '安田爱美', affectionDelta: 22, trustDelta: 25, jealousyDelta: 0, heartbeatDelta: 28, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '安田爱美', affectionDelta: -2, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '安田爱美', affectionDelta: -90, trustDelta: -100, jealousyDelta: 0, heartbeatDelta: -60 },
        ],
        successFlags: ['爱美获救'],
        failureFlags: ['爱美受伤'],
        noResistanceFlags: ['爱美受害', '主角懦弱'],
        isIllegal: false,
      },
      {
        id: 'shield',
        name: '死守不退',
        description: '挡在爱美身前,任凭威胁也不退缩',
        skill: '意志',
        threshold: 50,
        successDescription:
          '你张开双臂挡在爱美身前,任凭天道新干线如何威胁也不退半步。你的坚持让他烦躁不已,最终愤然离去:"下次别让我看见你!"爱美从你身后探出头,紧紧抓住你的衣角:"大哥哥……我好怕……"',
        failureDescription:
          '你的意志动摇了,天道新干线看穿你的软弱,冷笑着逼近。局面更加危急,爱美吓得尖叫。',
        noResistanceDescription:
          '你后退一步,又一步,最终转身逃跑。爱美的哭声在你身后响起,你不敢回头。',
        successImpacts: [
          { heroineName: '安田爱美', affectionDelta: 20, trustDelta: 25, jealousyDelta: 0, heartbeatDelta: 22, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '安田爱美', affectionDelta: -5, trustDelta: -10, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '安田爱美', affectionDelta: -100, trustDelta: -100, jealousyDelta: 0, heartbeatDelta: -70 },
        ],
        successFlags: ['爱美获救'],
        failureFlags: ['爱美受伤'],
        noResistanceFlags: ['爱美受害', '主角懦弱'],
        isIllegal: false,
      },
    ],
    defaultPath: 'fight',
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  3. 西御寺胁迫(重度·玩家被胁迫)
  // ═════════════════════════════════════════════════════════
  {
    id: 'resist_west_temple',
    name: '西御寺胁迫抵抗',
    type: '抵抗胁迫',
    severity: '重度',
    description:
      '深夜,西御寺一郎带着两名手下堵住你。他冷笑着说:"小子,识相点,离鸣泽唯远点。否则……"他示意手下,两人缓缓逼近,拳头捏得咯咯作响。西御寺接着说:"当然,你也可以选择乖乖听话,我可以给你一笔钱,让你消失。"',
    triggerCondition: {
      locations: ['鸣泽家', '鸣泽家门前', '八十八町住宅区', '街道'],
      dayRange: [8, 13],
      timeSlots: ['晚', '深夜'],
      requiredFlags: ['阴谋偷听'],
      excludedFlags: ['西寺对峙'],
      relatedHeroine: '鸣泽唯',
      heroineAffectionMin: 40,
    },
    aggressorName: '西御寺一郎',
    aggressorDescription: '西装革履的中年男子,眼神阴鸷,身后跟着两名打手',
    aggressorHp: 120,
    victimName: '玩家',
    resistancePaths: [
      {
        id: 'fight',
        name: '武力抵抗',
        description: '与西御寺及其手下正面对抗',
        skill: '格斗',
        threshold: 65,
        successDescription:
          '你一拳击倒一名手下,又一脚踹开另一名。西御寺见状脸色大变,踉跄后退:"你……你敢动手!"他狼狈逃窜,临走撂下狠话:"这事没完!"唯冲出门扑进你怀里,浑身发抖:"哥哥……"她第一次主动抱住你。',
        failureDescription:
          '寡不敌众,你被两名手下按倒在地。西御寺蹲下身,拍了拍你的脸:"不自量力。"他留下一句威胁后带人离开。唯从门缝看见这一切,捂住嘴不敢出声。',
        noResistanceDescription:
          '你低下头,接受了西御寺的钱,答应离开唯。第二天,唯在门口等你,等了一整天。她最终红着眼眶转身回屋,再也没有出来。西御寺的阴谋得逞了。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 20, trustDelta: 25, jealousyDelta: 0, heartbeatDelta: 30, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -5, trustDelta: -10, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -40, trustDelta: -60, jealousyDelta: 0, heartbeatDelta: -20 },
        ],
        successFlags: ['西寺对峙', '唯获救'],
        failureFlags: ['西寺警告'],
        noResistanceFlags: ['主角懦弱', '西寺得逞'],
        failureBadEnd: 'BAD_END_6_西御寺阴谋',
        isIllegal: true,
      },
      {
        id: 'refuse',
        name: '严词拒绝',
        description: '严词拒绝西御寺的威胁和收买',
        skill: '意志',
        threshold: 55,
        successDescription:
          '你直视西御寺的眼睛:"我不会离开唯。你的钱收回,你的威胁对我没用。"西御寺脸色一变,示意手下动手,但你毫不退缩。他咬牙带人离开:"走着瞧。"唯打开门,眼眶湿润:"哥哥……你都说了什么?"',
        failureDescription:
          '你的意志动摇了,西御寺看穿你的犹豫,冷笑着逼近:"看来你还需要一些教训。"局面陷入僵持。',
        noResistanceDescription:
          '你沉默地接过西御寺的钱,低声说"我知道了"。第二天,你悄悄离开了鸣泽家,没和唯告别。唯在门口等了你三天,最终接受你离开的事实。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 15, trustDelta: 20, jealousyDelta: 0, heartbeatDelta: 22 },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -8, trustDelta: -12, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -50, trustDelta: -80, jealousyDelta: 0, heartbeatDelta: -30 },
        ],
        successFlags: ['西寺对峙'],
        failureFlags: ['西寺警告'],
        noResistanceFlags: ['主角懦弱', '西寺得逞'],
        failureBadEnd: 'BAD_END_6_西御寺阴谋',
        isIllegal: false,
      },
      {
        id: 'expose',
        name: '威胁曝光',
        description: '用证据反威胁西御寺,迫使他退却',
        skill: '口才',
        threshold: 60,
        successDescription:
          '你掏出录音笔:"西御寺先生,您刚才的话我都录下来了。如果这事传到警方或媒体,您的仕途可就完了。"西御寺脸色铁青,咬牙切齿:"你……算你狠!"他挥手带人离开。唯打开门,望着你的背影,眼眶湿润。',
        failureDescription:
          '你的反威胁未能奏效,西御寺嗤笑:"就凭你?你以为这点东西能扳倒我?"他示意手下动手,你被迫正面应对。',
        noResistanceDescription:
          '你接受了西御寺的钱,答应离开唯。但你心里清楚,这只是暂时的妥协。唯不知情,依然每天等你。',
        successImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: 18, trustDelta: 22, jealousyDelta: 0, heartbeatDelta: 25, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -3, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽唯', affectionDelta: -30, trustDelta: -50, jealousyDelta: 0, heartbeatDelta: -10 },
        ],
        successFlags: ['西寺对峙', '西寺债务陷阱'],
        failureFlags: ['西寺警告'],
        noResistanceFlags: ['主角妥协'],
        isIllegal: false,
      },
    ],
    defaultPath: 'refuse',
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  4. 嫉妒杀戮抵抗(极重·女角失控)
  // ═════════════════════════════════════════════════════════
  {
    id: 'resist_jealousy_kill',
    name: '嫉妒杀戮抵抗',
    type: '抵抗失控',
    severity: '极重',
    description:
      '深夜的鸣泽家厨房,美佐子握着菜刀,眼神空洞地喃喃自语:"为什么……为什么你要这样对我……"她的嫉妒已经爆发,菜刀在月光下闪着寒光。她转身看见你,眼中闪过一丝疯狂:"你……你是来阻止我的吗?那就来啊!"她举刀向你冲来。',
    triggerCondition: {
      locations: ['鸣泽家', '鸣泽家厨房', '主角自宅'],
      dayRange: [10, 16],
      timeSlots: ['深夜'],
      excludedFlags: ['嫉妒杀戮制止'],
      relatedHeroine: '鸣泽美佐子',
      heroineAffectionMin: 50,
    },
    aggressorName: '美佐子(失控状态)',
    aggressorDescription: '美佐子双眼通红,握着菜刀的手在颤抖,已经失去了理智',
    aggressorHp: 80,
    victimName: '玩家/唯',
    resistancePaths: [
      {
        id: 'persuade',
        name: '温柔劝说',
        description: '用温柔的话语安抚美佐子的情绪,让她放下菜刀',
        skill: '口才',
        threshold: 65,
        successDescription:
          '你缓缓靠近美佐子,轻声说:"美佐子阿姨,是我。你看看我,深呼吸。"你的声音像是有魔力,美佐子的眼神逐渐清明。菜刀从她手中滑落,她瘫软在你怀里,痛哭失声:"对不起……对不起……我差点……"',
        failureDescription:
          '你的劝说未能奏效,美佐子情绪更加激动。她挥刀向你冲来,你被迫后退躲避,局面一度失控。',
        noResistanceDescription:
          '你转身逃跑,美佐子在身后疯狂追赶。她的哭喊声划破夜空,最终她追上你,一刀刺入你的后背。你倒下时,看见她惊恐的眼神和满手的血。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 25, trustDelta: 30, jealousyDelta: -40, heartbeatDelta: 20, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -10, trustDelta: -15, jealousyDelta: 15, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -30, trustDelta: -50, jealousyDelta: 30, heartbeatDelta: -20 },
        ],
        successFlags: ['嫉妒杀戮制止'],
        failureFlags: ['美佐子失控'],
        noResistanceFlags: ['主角受伤', '美佐子犯罪'],
        failureBadEnd: 'BAD_END_5_嫉妒杀戮',
        isIllegal: false,
      },
      {
        id: 'disarm',
        name: '夺刀制止',
        description: '不顾危险,夺下美佐子手中的菜刀',
        skill: '格斗',
        threshold: 60,
        successDescription:
          '你抓住美佐子握刀的手腕,用力一拧,菜刀掉落在地。她挣扎了几下,最终瘫软在你怀里,痛哭失声:"对不起……对不起……我不想伤害任何人……"你紧紧抱住她,感受她剧烈的心跳。',
        failureDescription:
          '你试图夺刀,但美佐子挣扎得厉害。菜刀划伤了你的手臂,鲜血滴落。她趁机后退,继续挥舞菜刀,局面更加危险。',
        noResistanceDescription:
          '你后退躲避,美佐子紧追不舍。她最终在客厅被地毯绊倒,菜刀脱手飞出。但她已经伤害了自己,鲜血染红了她的衣服。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 30, trustDelta: 35, jealousyDelta: -50, heartbeatDelta: 25, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -5, trustDelta: -10, jealousyDelta: 10, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -20, trustDelta: -30, jealousyDelta: 25, heartbeatDelta: -10 },
        ],
        successFlags: ['嫉妒杀戮制止', '夺刀成功'],
        failureFlags: ['美佐子失控', '主角受伤'],
        noResistanceFlags: ['美佐子自伤'],
        failureBadEnd: 'BAD_END_5_嫉妒杀戮',
        isIllegal: false,
      },
      {
        id: 'hug',
        name: '坚定拥抱',
        description: '不顾危险紧紧抱住美佐子,用体温和心跳传递安心',
        skill: '意志',
        threshold: 55,
        successDescription:
          '你一把抱住美佐子,不顾菜刀的危险。你的体温和心跳传递给她,美佐子浑身一震,菜刀掉落在地。她埋在你怀里痛哭:"对不起……对不起……"她的身体逐渐放松,最终沉沉睡去。',
        failureDescription:
          '你试图拥抱,但美佐子挣扎得更厉害。菜刀划伤了你的手臂,鲜血滴落。她的疯狂没有平息,局面一度失控。',
        noResistanceDescription:
          '你后退躲避,美佐子紧追不舍。她最终在客厅停下来,举刀对准了自己的胸口:"既然你不要我了,那就让我死吧!"你必须立刻做出选择。',
        successImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: 35, trustDelta: 40, jealousyDelta: -60, heartbeatDelta: 30, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -8, trustDelta: -12, jealousyDelta: 8, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '鸣泽美佐子', affectionDelta: -40, trustDelta: -60, jealousyDelta: 40, heartbeatDelta: -30 },
        ],
        successFlags: ['嫉妒杀戮制止'],
        failureFlags: ['美佐子失控', '主角受伤'],
        noResistanceFlags: ['美佐子自伤'],
        failureBadEnd: 'BAD_END_5_嫉妒杀戮',
        isIllegal: false,
      },
    ],
    defaultPath: 'persuade',
    oneShot: true,
  },

  // ═════════════════════════════════════════════════════════
  //  5. 深夜袭击抵抗(中度·玩家被袭击)
  // ═════════════════════════════════════════════════════════
  {
    id: 'resist_night_attack',
    name: '深夜袭击抵抗',
    type: '抵抗袭击',
    severity: '中度',
    description:
      '深夜的街道上,一个黑影突然从暗巷冲出,挡住你的去路。他戴着口罩,手持棒球棍,眼神凶狠:"小子,把钱交出来,否则我打断你的腿!"他的声音沙哑,显然是有备而来。',
    triggerCondition: {
      locations: ['八十八町街道', '商业区', '车站前', '暗巷'],
      dayRange: [1, 17],
      timeSlots: ['深夜'],
      excludedFlags: [],
    },
    aggressorName: '蒙面劫匪',
    aggressorDescription: '戴口罩的男子,手持棒球棍,眼神凶狠',
    aggressorHp: 70,
    victimName: '玩家',
    resistancePaths: [
      {
        id: 'fight',
        name: '反击劫匪',
        description: '与劫匪正面对抗,夺下棒球棍',
        skill: '格斗',
        threshold: 50,
        successDescription:
          '你侧身躲过棒球棍,一拳击中劫匪的面门。他应声倒地,你夺下棒球棍,报警。劫匪被警方带走,你成功保卫了自己。',
        failureDescription:
          '你试图反击,但被棒球棍击中手臂,剧痛传来。劫匪趁机抢走你的钱包,逃之夭夭。你捂着受伤的手臂,狼狈回家。',
        noResistanceDescription:
          '你乖乖交出钱包,劫匪拿钱后扬长而去。你身无分文,只能步行回家。这一夜你失眠了,心里充满了屈辱。',
        successImpacts: [],
        failureImpacts: [],
        noResistanceImpacts: [],
        successFlags: ['反击成功'],
        failureFlags: ['被抢劫'],
        noResistanceFlags: ['主动交钱'],
        isIllegal: true,
      },
      {
        id: 'flee',
        name: '敏捷逃跑',
        description: '利用敏捷身手,甩掉劫匪',
        skill: '敏捷',
        threshold: 55,
        successDescription:
          '你转身就跑,利用对地形的熟悉,在巷子里七拐八拐,成功甩掉了劫匪。你气喘吁吁地回到家,虽然损失了一些体力,但保住了钱财。',
        failureDescription:
          '你试图逃跑,但被劫匪追上。他一棍子打在你腿上,你摔倒在地。他抢走你的钱包,扬长而去。',
        noResistanceDescription:
          '你交出钱包,劫匪离开。你站在原地,心情沉重。这种被威胁的感觉让你很不舒服。',
        successImpacts: [],
        failureImpacts: [],
        noResistanceImpacts: [],
        successFlags: ['逃跑成功'],
        failureFlags: ['被抢劫'],
        noResistanceFlags: ['主动交钱'],
        isIllegal: false,
      },
      {
        id: 'intimidate',
        name: '反威胁',
        description: '用气势和语言反威胁劫匪',
        skill: '口才',
        threshold: 45,
        successDescription:
          '你冷冷地看着劫匪:"你知道我是谁吗?我认识八十八町所有的黑道。你今天动我一根手指,明天就别想在这片地方混了。"劫匪犹豫了一下,骂骂咧咧地离开了。',
        failureDescription:
          '你的反威胁被劫匪嗤笑:"少跟我装!"他挥舞棒球棍逼近,你被迫硬拼。',
        noResistanceDescription:
          '你交出钱包,劫匪离开。你心里很不甘,但至少保住了安全。',
        successImpacts: [],
        failureImpacts: [],
        noResistanceImpacts: [],
        successFlags: ['反威胁成功'],
        failureFlags: ['被抢劫'],
        noResistanceFlags: ['主动交钱'],
        isIllegal: false,
      },
    ],
    defaultPath: 'flee',
    oneShot: false,
  },

  // ═════════════════════════════════════════════════════════
  //  6. 美纪被威胁(重度·双身份暴露)
  // ═════════════════════════════════════════════════════════
  {
    id: 'resist_miki_threat',
    name: '美纪威胁抵抗',
    type: '解救女角',
    severity: '重度',
    description:
      '商业区后巷,你撞见加藤美纪被一个黑衣男人按在墙上威胁:"你双身份的事,要是被曝光,你的偶像生涯就完了。识相点,今晚跟我走,否则……"他的手不老实地摸向美纪的脸。美纪咬着唇,眼中满是屈辱和恐惧,看见你时闪过惊慌:"你……你怎么在这里?"',
    triggerCondition: {
      locations: ['商业区', '商业区后巷', '八十八町商业区'],
      dayRange: [8, 14],
      timeSlots: ['下午', '晚'],
      requiredFlags: ['美纪双身份揭示'],
      excludedFlags: ['美纪威胁事件'],
      relatedHeroine: '加藤美纪',
      heroineAffectionMin: 30,
    },
    aggressorName: '黑衣威胁者',
    aggressorDescription: '戴着墨镜的黑衣男人,身材高大,神情阴鸷',
    aggressorHp: 90,
    victimName: '加藤美纪',
    resistancePaths: [
      {
        id: 'fight',
        name: '击退威胁者',
        description: '用武力击退黑衣男人,解救美纪',
        skill: '格斗',
        threshold: 55,
        successDescription:
          '你冲上去与黑衣男人搏斗,一番激战后将他击退。美纪望着你,眼中闪着复杂的光:"你……为什么帮我?"她整理好凌乱的衣服,第一次主动靠近你。',
        failureDescription:
          '黑衣男人身手不凡,你被打倒。美纪尖叫着挡在你身前,黑衣男人冷笑着离开,临走撂下狠话:"下次你们两个都别想跑。"',
        noResistanceDescription:
          '你假装没看见,转身离开。美纪被黑衣男人带走,从此她的双身份被曝光,偶像生涯终结。她再也没有出现在八十八町。',
        successImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 20, trustDelta: 25, jealousyDelta: 0, heartbeatDelta: 22, relationshipStageAdvance: true },
        ],
        failureImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 5, trustDelta: 10, jealousyDelta: 0, heartbeatDelta: 12 },
        ],
        noResistanceImpacts: [
          { heroineName: '加藤美纪', affectionDelta: -70, trustDelta: -90, jealousyDelta: 0, heartbeatDelta: -40 },
        ],
        successFlags: ['美纪威胁事件', '美纪秘密保守', '英雄救美'],
        failureFlags: ['美纪受伤'],
        noResistanceFlags: ['美纪受害', '主角懦弱'],
        isIllegal: true,
      },
      {
        id: 'record',
        name: '暗中记录',
        description: '悄悄录下威胁证据,事后反击',
        skill: '潜行',
        threshold: 50,
        successDescription:
          '你假装路过,实则用手机录下了黑衣男人的话。事后你把证据交给美纪,她望着你,眼中闪着光:"你……一直在保护我?"她第一次露出脆弱的神情。',
        failureDescription:
          '你的偷录被发现,黑衣男人抢走了手机并警告你。局面陷入僵持,美纪依然处于危险中。',
        noResistanceDescription:
          '你悄悄离开,装作什么都没发生。美纪被黑衣男人带走,你心里清楚她将面临什么,但你选择了无视。',
        successImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 15, trustDelta: 20, jealousyDelta: 0, heartbeatDelta: 18 },
        ],
        failureImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 0, trustDelta: -5, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '加藤美纪', affectionDelta: -80, trustDelta: -100, jealousyDelta: 0, heartbeatDelta: -50 },
        ],
        successFlags: ['美纪威胁事件', '美纪秘密保守'],
        failureFlags: ['美纪受伤'],
        noResistanceFlags: ['美纪受害', '主角懦弱'],
        isIllegal: false,
      },
      {
        id: 'counter_threat',
        name: '反威胁',
        description: '用证据反威胁黑衣男人',
        skill: '口才',
        threshold: 60,
        successDescription:
          '你冷冷地说:"我已经录下了你的话。如果你敢动美纪一根手指,我就把你交给警方。你的老板会怎么处理你?"黑衣男人脸色一变,咬牙离去。美纪望着你,第一次露出脆弱的神情:"谢谢你……"',
        failureDescription:
          '你的反威胁未能奏效,黑衣男人嗤笑离开,临走撂下狠话。美纪依然处于危险中,你必须想其他办法。',
        noResistanceDescription:
          '你转身离开,美纪被黑衣男人带走。你心里清楚她将面临什么,但你选择了逃避。',
        successImpacts: [
          { heroineName: '加藤美纪', affectionDelta: 18, trustDelta: 22, jealousyDelta: 0, heartbeatDelta: 20 },
        ],
        failureImpacts: [
          { heroineName: '加藤美纪', affectionDelta: -5, trustDelta: -8, jealousyDelta: 0, heartbeatDelta: 0 },
        ],
        noResistanceImpacts: [
          { heroineName: '加藤美纪', affectionDelta: -85, trustDelta: -100, jealousyDelta: 0, heartbeatDelta: -55 },
        ],
        successFlags: ['美纪威胁事件', '美纪秘密保守'],
        failureFlags: ['美纪受伤'],
        noResistanceFlags: ['美纪受害', '主角懦弱'],
        isIllegal: false,
      },
    ],
    defaultPath: 'counter_threat',
    oneShot: true,
  },
];

// ───────────────────────────────────────────────────────────
//  辅助函数
// ───────────────────────────────────────────────────────────

export function findResistanceScenarioById(id: string): ResistanceScenario | undefined {
  return RESISTANCE_SCENARIOS.find((s) => s.id === id);
}

export function getResistanceStats(): {
  total: number;
  byType: Record<ResistanceType, number>;
  bySeverity: Record<ResistanceSeverity, number>;
} {
  const byType: Record<ResistanceType, number> = {
    解救女角: 0, 抵抗胁迫: 0, 抵抗失控: 0, 抵抗袭击: 0, 解救NPC: 0,
  };
  const bySeverity: Record<ResistanceSeverity, number> = {
    轻度: 0, 中度: 0, 重度: 0, 极重: 0,
  };
  for (const s of RESISTANCE_SCENARIOS) {
    byType[s.type]++;
    bySeverity[s.severity]++;
  }
  return { total: RESISTANCE_SCENARIOS.length, byType, bySeverity };
}
