// 周导演联动 — 周结算时自动生成剧情事件（AI 或程序化），写入编年史
import { useAiStore } from '@/stores/aiStore';
import { runDirector } from '@/gateway/directorService';
import { useTimelineStore } from '@/stores/timelineStore';
import { logHub } from '@/stores/logStore';
import { toast } from '@/ui/Extras';
import { announce } from '@/gateway/ttsService';

// 程序化降级事件：从城镇事件池随机抽取
let townEventsCache: { id: string; tone?: string }[] | null = null;

async function getTownEvents(): Promise<{ id: string; tone?: string }[]> {
  if (townEventsCache) return townEventsCache;
  try {
    const data = await import('@/data/dd-db/town_events.json');
    townEventsCache = (data.default as { events: { id: string; tone?: string }[] }).events;
  } catch {
    townEventsCache = [];
  }
  return townEventsCache;
}

// 程序化降级事件：从城镇事件池随机抽取（带 tone 描述），无池时用固定文案
const TONE_DESC: Record<string, string> = {
  negative: '不祥的阴云笼罩庄园。',
  positive: '久违的好消息在镇上流传。',
  neutral: '庄园与往常一样沉默。',
};

function proceduralEvent(week: number): string {
  const events = townEventsCache ?? [];
  const pool = events.filter((e) => !e.id.startsWith('arena') && !e.id.startsWith('circus'));
  if (pool.length > 0) {
    const e = pool[Math.floor(Math.random() * pool.length)];
    const tone = TONE_DESC[e.tone ?? ''] ?? '镇上传来窃窃私语。';
    return `第 ${week} 周，${tone} 传闻「${e.id.replace(/_/g, ' ')}」在庄园周边发生，英雄们在火炉旁低声交谈。`;
  }
  const tone = ['一缕不祥的预感笼罩庄园。', '镇上传来窃窃私语。', '夜里，庄园的灯火比往常更暗。', '马厩里的马匹一夜未眠。'];
  return `第 ${week} 周，${tone[week % tone.length]} 英雄们在火炉旁低声交谈，等待新的任务。`;
}

// 周结算时调用：写程序化周记录 + 异步 AI 导演事件（不阻塞结算）
export async function triggerWeeklyDirector(week: number): Promise<void> {
  const gs = useTimelineStore.getState();
  const gold = useGameStoreGold();
  const rosterCount = useGameStoreRoster();

  // 预载城镇事件池（程序化降级用）
  await getTownEvents();

  // 1. 程序化周记录（始终写入）
  gs.add({
    week,
    category: 'week',
    title: `第 ${week} 周结束`,
    detail: `金币 ${gold.toLocaleString()} · 名册 ${rosterCount} 人`,
  });

  // 2. AI 导演事件（仅启用时，异步不阻塞）
  const aiEnabled = useAiStore.getState().config.enabled;
  const eventText = aiEnabled
    ? await runWeeklyAi(week)
    : proceduralEvent(week);

  gs.add({
    week,
    category: 'event',
    title: aiEnabled ? '庄园轶事（导演）' : '庄园轶事',
    detail: eventText.slice(0, 180),
  });

  logHub.narrative(`第 ${week} 周剧情事件已记录`);
}

async function runWeeklyAi(week: number): Promise<string> {
  const config = useAiStore.getState().config;
  const result = await runDirector(config, 'weekly', {
    week,
    gold: useGameStoreGold(),
    heirlooms: useGameStoreHeirlooms(),
    rosterCount: useGameStoreRoster(),
    questsFinished: useGameStoreQuests(),
  });
  if (result.ok) {
    announce(result.text.slice(0, 80));
    toast('本周剧情事件已生成', 'success');
  }
  return result.text;
}

// 轻量读取（避免循环依赖）
import { useGameStore } from '@/stores/gameStore';
function useGameStoreGold() { return useGameStore.getState().gold; }
function useGameStoreRoster() { return useGameStore.getState().roster.length; }
function useGameStoreQuests() { return useGameStore.getState().questsFinished; }
function useGameStoreHeirlooms() { return useGameStore.getState().heirlooms; }
