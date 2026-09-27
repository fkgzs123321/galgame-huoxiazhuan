// ============================================================
// 周结算引擎 — 生成每周结算数据
// 负责：城镇英雄恢复、每周收入支出、随机周事件、新任务生成
// ============================================================

import type { HeroInstance, Quest } from '@/types';
import { generateQuests } from '@/gateway/questGenerator';

// ---- 类型定义 ----

export type HeroWeeklyStatus = 'ok' | 'afflicted' | 'virtuous' | 'heartattack' | 'dead';

export interface HeroWeeklyChange {
  heroUid: string;
  heroName: string;
  classId: string;
  stressChange: number;       // 压力变化（通常-5）
  stressBefore: number;
  stressAfter: number;
  hpChange: number;           // 生命恢复
  hpBefore: number;
  hpAfter: number;
  status: HeroWeeklyStatus;
  statusText: string;
}

export interface WeeklyEvent {
  type: 'provision' | 'disease' | 'quirk' | 'event' | 'gold';
  icon: string;
  text: string;
  positive: boolean;
}

export interface WeekSummary {
  week: number;                          // 新周数
  heroChanges: HeroWeeklyChange[];       // 每个英雄的变化
  heirloomChanges: Record<string, number>; // 纹章变化
  goldChange: number;                    // 金币变化
  newQuests: Quest[];                    // 新生成的任务
  events: WeeklyEvent[];                 // 周事件
  recap: string[];                       // 结算摘要文字
}

// ---- 每周支出配置 ----

export const WEEKLY_WAGE = 300;          // 每英雄每周消耗金币（工资/补给）
export const STRESS_RECOVERY = 5;        // 每周城镇压力恢复
export const STRESS_PENALTY = 10;        // 金币不足时压力惩罚
export const HP_RECOVERY_RATIO = 0.2;    // 城镇每周恢复最大生命的比例

// ---- 先祖独白库 ----

const ANCESTOR_MONOLOGUES = [
  '黑暗觊觎着每一个灵魂。你的英雄们，在烛光下舔舐伤口。',
  '黎明带来新的痛苦，也带来新的希望。地牢永不停歇地召唤。',
  '你听见先祖的低语：\'这一切都值得，只要你能坚持到最后。\'',
  '堡垒在叹息，英雄们在喘息。新的一周，新的试炼。',
  '金钱如流水般逝去，但荣耀永恒。继续前行，指挥官。',
  '在黑暗的阴影中，你的英雄们找到了片刻的安宁。',
  '每一次呼吸都是对抗深渊的胜利。让火焰继续燃烧。',
  '希望是脆弱的东西，却也是我们唯一的盾牌。',
  '地牢的黑暗不会因你的迟疑而退却。准备迎接下一场试炼。',
  '勇气与愚蠢往往难以分辨，但唯有前行才能知晓。',
];

// ---- 工具函数 ----

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- 状态计算 ----

export function getHeroStatus(stress: number): { status: HeroWeeklyStatus; statusText: string } {
  if (stress >= 100) return { status: 'heartattack', statusText: '心脏病发作' };
  if (stress >= 90) return { status: 'afflicted', statusText: '崩溃' };
  return { status: 'ok', statusText: '正常' };
}

// ---- 周事件生成 ----

const GOOD_EVENTS_GOLD = [
  { icon: '◈', text: '游商带来了意外的商机，你从中获益。', gold: 150 },
  { icon: '❂', text: '一位富有的贵族慷慨捐赠了一笔金币。', gold: 200 },
  { icon: '✦', text: '老仆从地窖中找到了一袋被遗忘的积蓄。', gold: 100 },
];

const GOOD_EVENTS_HEIRLOOM = [
  { icon: '♌', text: '工匠修缮旧宅时发现了一尊珍藏雕像。', heirloom: 'bust', amount: 1 },
  { icon: '◈', text: '一幅传世画像被从废弃的房间中寻回。', heirloom: 'portrait', amount: 1 },
  { icon: '▤', text: '一份被遗忘的契约重新回到了你的手中。', heirloom: 'deed', amount: 1 },
  { icon: '✦', text: '家族纹章在一次整理中被重新发现。', heirloom: 'crest', amount: 1 },
];

const BAD_EVENTS = [
  { icon: '☠', text: '瘟疫在城镇边缘蔓延，人心惶惶。', stressPenalty: 3 },
  { icon: '☄', text: '一场大火烧毁了仓库，损失惨重。', goldPenalty: 150 },
  { icon: 'Ω', text: '盗贼在夜色中洗劫了你的金库。', goldPenalty: 120 },
  { icon: '☩', text: '教堂的钟声日夜不停，扰乱了英雄的安宁。', stressPenalty: 3 },
];

const QUIRK_EVENT_POOL = [
  { id: 'nervous', name: '神经质', positive: false },
  { id: 'clumsy', name: '笨拙', positive: false },
  { id: 'fragile', name: '脆弱体质', positive: false },
  { id: 'greedy', name: '贪婪', positive: false },
  { id: 'cowardly', name: '胆怯', positive: false },
  { id: 'night_blind', name: '夜盲', positive: false },
];

const GOOD_QUIRK_POOL = [
  { id: 'clotter', name: '凝血体质', positive: true },
  { id: 'hard_skinned', name: '坚韧皮肤', positive: true },
  { id: 'unyielding', name: '不屈意志', positive: true },
  { id: 'warrior_of_light', name: '光明战士', positive: true },
];

const DISEASE_POOL = [
  { id: 'syphilis', name: '梅毒' },
  { id: 'plague', name: '瘟疫' },
  { id: 'cough', name: '咳嗽' },
  { id: 'fever', name: '发热' },
  { id: 'tetanus', name: '破伤风' },
];

// 内部事件数据：附带资源变化用于结算
interface InternalWeeklyEvent extends WeeklyEvent {
  goldDelta?: number;
  heirloomDelta?: { key: string; amount: number };
}

// 生成随机周事件（附带资源结算数据）
function generateWeeklyEventsInternal(): InternalWeeklyEvent[] {
  const events: InternalWeeklyEvent[] = [];
  const eventCount = randInt(0, 2);

  for (let i = 0; i < eventCount; i++) {
    const roll = Math.random();
    if (roll < 0.35) {
      // 好运 — 金币
      const e = pick(GOOD_EVENTS_GOLD);
      events.push({ type: 'gold', icon: e.icon, text: e.text, positive: true, goldDelta: e.gold });
    } else if (roll < 0.6) {
      // 好运 — 纹章
      const e = pick(GOOD_EVENTS_HEIRLOOM);
      events.push({
        type: 'event',
        icon: e.icon,
        text: e.text,
        positive: true,
        heirloomDelta: { key: e.heirloom, amount: e.amount },
      });
    } else if (roll < 0.8) {
      // 坏事 — 压力/损失
      const e = pick(BAD_EVENTS);
      events.push({
        type: 'event',
        icon: e.icon,
        text: e.text,
        positive: false,
        goldDelta: e.goldPenalty ? -e.goldPenalty : 0,
      });
    } else if (roll < 0.9) {
      // 怪癖获得
      const quirk = Math.random() < 0.5 ? pick(QUIRK_EVENT_POOL) : pick(GOOD_QUIRK_POOL);
      events.push({
        type: 'quirk',
        icon: quirk.positive ? '✦' : '☠',
        text: quirk.positive
          ? `一位英雄在闲暇中磨砺了心性，获得怪癖「${quirk.name}」。`
          : `可怕的经历在一位英雄身上留下了烙印，获得怪癖「${quirk.name}」。`,
        positive: quirk.positive,
      });
    } else {
      // 疾病来袭
      const disease = pick(DISEASE_POOL);
      events.push({
        type: 'disease',
        icon: '✚',
        text: `一种「${disease.name}」在城镇中蔓延开来，有人感染了。`,
        positive: false,
      });
    }
  }

  return events;
}

// 生成周事件（独立调用，供测试/外部使用；不含资源结算数据）
export function generateWeeklyEvents(): WeeklyEvent[] {
  return generateWeeklyEventsInternal().map(({ goldDelta, heirloomDelta, ...rest }) => rest);
}

// ---- 生成周结算数据 ----

export function generateWeekSummary(
  currentWeek: number,
  roster: HeroInstance[],
  gold: number,
  heirlooms: Record<string, number>,
  questsFinished: number,
  highestDungeonLevel: number
): WeekSummary {
  const newWeek = currentWeek + 1;

  // 1. 计算每周工资支出
  const wageCost = roster.length * WEEKLY_WAGE;
  const goldEnough = gold >= wageCost;
  const goldDeduction = goldEnough ? wageCost : gold;

  // 2. 英雄变化（压力恢复 / 生命恢复 / 金币不足惩罚）
  const heroChanges: HeroWeeklyChange[] = roster.map((hero) => {
    const stressBefore = hero.stress;
    const stressChange = goldEnough ? -STRESS_RECOVERY : STRESS_PENALTY;
    const stressAfter = Math.max(0, stressBefore + stressChange);

    const hpBefore = hero.currentHp;
    const healAmount = Math.round(hero.maxHp * HP_RECOVERY_RATIO);
    const hpAfter = Math.min(hero.maxHp, hpBefore + healAmount);
    const hpChange = hpAfter - hpBefore;

    const { status, statusText } = getHeroStatus(stressAfter);

    return {
      heroUid: hero.uid,
      heroName: hero.name,
      classId: hero.classId,
      stressChange,
      stressBefore,
      stressAfter,
      hpChange,
      hpBefore,
      hpAfter,
      status,
      statusText,
    };
  });

  // 3. 生成周事件
  const events = generateWeeklyEventsInternal();

  // 4. 汇总资源变化（事件带来的金币/纹章变化）
  let goldChange = -goldDeduction;
  const heirloomChanges: Record<string, number> = {
    bust: 0,
    portrait: 0,
    deed: 0,
    crest: 0,
  };

  for (const event of events) {
    if (event.goldDelta) {
      goldChange += event.goldDelta;
    }
    if (event.heirloomDelta) {
      const key = event.heirloomDelta.key;
      heirloomChanges[key] = (heirloomChanges[key] || 0) + event.heirloomDelta.amount;
    }
  }

  // 5. 生成新任务
  const newQuests = generateQuests(newWeek, highestDungeonLevel, questsFinished);

  // 6. 结算摘要文字
  const recap: string[] = [];
  recap.push(pick(ANCESTOR_MONOLOGUES));
  if (!goldEnough && roster.length > 0) {
    recap.push('国库空虚，无法供养你的英雄们。他们因缺乏补给而承受了额外的压力。');
  } else if (roster.length > 0) {
    recap.push(`你的英雄们消耗了 ${wageCost} 金币作为每周的工资与补给。`);
  }
  if (newQuests.length > 0) {
    recap.push(`新的契约已抵达公告板，等待你的抉择。`);
  }
  if (events.length === 0) {
    recap.push('这一周平静得近乎可疑，仿佛大地在屏息等待。');
  }

  return {
    week: newWeek,
    heroChanges,
    heirloomChanges,
    goldChange,
    newQuests,
    events,
    recap,
  };
}