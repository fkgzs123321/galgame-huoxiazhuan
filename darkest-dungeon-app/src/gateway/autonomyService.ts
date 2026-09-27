// AI 自主性框架 — 自主事件提案（AI 提议，玩家确认，程序执行数值）
// AI 的小部分自主性：AI 可以主动提议庄园里发生的事（商人来访、英雄互动、怪癖变化…），
// 玩家确认/拒绝后，由程序执行具体数值（扣金币、加饰品、改压力），AI 不直接改状态。

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '@/utils/id';
import { aiChat } from '@/gateway/aiGateway';
import { useAiStore } from '@/stores/aiStore';
import { useGameStore } from '@/stores/gameStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useConfigStore } from '@/stores/configStore';
import { useWorldbookStore } from '@/stores/worldbookStore';
import { scheduleLore, formatLoreBlock } from '@/gateway/loreScheduler';
import { contentModeDirective } from '@/prompts/contentMode';
import { traceHub } from '@/utils/trace';
import { logHub } from '@/stores/logStore';
import { getHeroName } from '@/data/ddLoader';
import { fmtGameDate } from '@/utils/time';

export type ProposalKind = 'merchant' | 'hero_event' | 'estate' | 'quest_hint' | 'quirk';

export interface AutonomyProposal {
  id: string;
  kind: ProposalKind;
  week: number;
  title: string;
  desc: string;            // 叙事描述
  // 程序执行参数（AI 只提议，数值由程序校验执行）
  costGold?: number;
  rewardGold?: number;
  rewardTrinket?: string;  // 饰品 id（若有）
  heroUid?: string;
  stressChange?: number;   // 对指定英雄的压力变化
  quirkId?: string;        // 提议获得的怪癖
  choices?: { label: string; costGold?: number; rewardGold?: number }[];
  source: 'ai' | 'procedural';
}

interface AutonomyStore {
  pending: AutonomyProposal[];
  resolved: AutonomyProposal[];
  maxPending: number;
  propose: (p: Omit<AutonomyProposal, 'id'>) => void;
  resolve: (id: string, accepted: boolean) => boolean;  // 返回是否成功执行
  clearResolved: () => void;
}

export const useAutonomyStore = create<AutonomyStore>()(
  persist(
    (set, get) => ({
      pending: [],
      resolved: [],
      maxPending: 3,

      propose: (p) => {
        const item: AutonomyProposal = { ...p, id: genId('prop') };
        const pending = [...get().pending, item];
        if (pending.length > get().maxPending) pending.shift();
        set({ pending });
        logHub.info(`[自主性] 新提案：${item.title}`);
      },

      resolve: (id, accepted) => {
        const item = get().pending.find((p) => p.id === id);
        if (!item) return false;
        set((s) => ({
          pending: s.pending.filter((p) => p.id !== id),
          resolved: [item, ...s.resolved].slice(0, 50),
        }));
        if (accepted) {
          executeProposal(item);
          logHub.info(`[自主性] 已接受提案：${item.title}`);
        } else {
          logHub.info(`[自主性] 已拒绝提案：${item.title}`);
        }
        return true;
      },

      clearResolved: () => set({ resolved: [] }),
    }),
    { name: 'dd-autonomy', version: 1 }
  )
);

// 程序执行提案（数值全部走程序，AI 不直接改状态）
function executeProposal(p: AutonomyProposal): void {
  const gs = useGameStore.getState();
  const inv = useInventoryStore.getState();

  if (p.costGold) {
    if (gs.gold < p.costGold) {
      logHub.warn(`[自主性] 提案 ${p.title} 因金币不足未生效`);
      return;
    }
    gs.addGold(-p.costGold);
  }
  if (p.rewardGold) gs.addGold(p.rewardGold);

  if (p.rewardTrinket) {
    inv.addTrinket({ id: p.rewardTrinket, buffs: [], heroClassRequirements: [], rarity: 'common', price: 0, limit: 0, originDungeon: 'autonomy' });
  }

  if (p.heroUid) {
    const hero = gs.roster.find((h) => h.uid === p.heroUid);
    if (hero) {
      if (p.stressChange) {
        gs.updateHero(p.heroUid, { stress: Math.max(0, Math.min(200, hero.stress + p.stressChange)) });
      }
      if (p.quirkId && !hero.quirks.includes(p.quirkId)) {
        gs.updateHero(p.heroUid, { quirks: [...hero.quirks, p.quirkId].slice(0, 6) });
      }
    }
  }
}

// AI 自主提案生成（周结算/随机触发；AI 关闭时程序化提案）
const PROPOSAL_SYSTEM = `你是《暗黑地牢》庄园的「自主事件设计者」。根据庄园事实，生成 1 条本周发生在庄园里的自主事件提案。

输出必须是一个合法 JSON 对象，不得包含其他文字：
{
  "kind": "merchant|hero_event|estate|quest_hint|quirk",
  "title": "事件标题（8-20字）",
  "desc": "事件叙事描述（60-120字，符合暗黑地牢基调）",
  "costGold": 数字或null,
  "rewardGold": 数字或null,
  "heroUid": "建议使用null（玩家确认时选择英雄）",
  "stressChange": 数字或null,
  "quirkId": null,
  "choices": null
}

规则：
1. costGold 必须小于庄园当前金币的一半（程序会再次校验）
2. 奖励与代价要对等，体现暗黑地牢的交易感
3. 只建议程序可执行的数值变更，不编造程序外的能力`;

function parseProposalJson(raw: string): Omit<AutonomyProposal, 'id'> | null {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<AutonomyProposal>;
    if (!parsed.title || !parsed.desc) return null;
    if (!['merchant', 'hero_event', 'estate', 'quest_hint', 'quirk'].includes(parsed.kind ?? '')) return null;
    return {
      kind: parsed.kind as ProposalKind,
      week: useGameStore.getState().week,
      title: parsed.title,
      desc: parsed.desc,
      costGold: typeof parsed.costGold === 'number' ? parsed.costGold : undefined,
      rewardGold: typeof parsed.rewardGold === 'number' ? parsed.rewardGold : undefined,
      stressChange: typeof parsed.stressChange === 'number' ? parsed.stressChange : undefined,
      source: 'ai',
    };
  } catch {
    return null;
  }
}

// 生成提案（返回是否成功）
export async function generateProposal(): Promise<boolean> {
  const { propose } = useAutonomyStore.getState();
  const gs = useGameStore.getState();
  const aiConfig = useAiStore.getState().config;
  const mode = useConfigStore.getState().settings.contentMode;
  const loreEnabled = useWorldbookStore.getState().loreEnabled;

  const facts = [
    `周数：${fmtGameDate(gs.week)}`,
    `金币：${gs.gold.toLocaleString()}`,
    `名册：${gs.roster.slice(0, 3).map((h) => `${getHeroName(h.classId)} ${h.name}`).join('、')}`,
    `已完成任务：${gs.questsFinished}`,
  ].join('\n');

  if (!aiConfig.enabled) {
    // 程序化提案
    const heroes = gs.roster;
    const target = heroes.length ? heroes[Math.floor(Math.random() * heroes.length)] : null;
    propose({
      kind: 'estate',
      week: gs.week,
      title: '旅商人的请求',
      desc: `一位旅商人路过庄园，想借 150 金币周转，承诺下周归还并奉上利息。${target ? `他多看了几眼${getHeroName(target.classId)} ${target.name}。` : ''}`,
      costGold: 150,
      rewardGold: 190,
      source: 'procedural',
    });
    return true;
  }

  try {
    let loreBlock = '';
    if (loreEnabled) {
      const hits = scheduleLore(`庄园 ${gs.week} 周 自主事件`, { recordHits: true });
      loreBlock = formatLoreBlock(hits);
    }
    const res = await aiChat(aiConfig, [
      { role: 'system', content: PROPOSAL_SYSTEM },
      { role: 'user', content: `【庄园事实】\n${facts}\n\n${contentModeDirective(mode, 'director')}\n${loreBlock}\n\n请生成本周自主事件提案。` },
    ]);
    const parsed = parseProposalJson(res.text);
    if (!parsed) {
      traceHub.error('自主提案解析失败', res.text.slice(0, 200));
      return false;
    }
    // 程序校验：金币消耗不能超过一半
    if (parsed.costGold && parsed.costGold > gs.gold / 2) {
      parsed.costGold = Math.max(0, Math.floor(gs.gold / 2));
    }
    propose(parsed);
    traceHub.prompt('自主提案生成', res.text, { meta: { mode } });
    return true;
  } catch (err) {
    logHub.error(`自主提案生成失败：${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
