// 故事会话服务 — 玩家自由行动 → AI 叙事回应（文字冒险核心端口）
// 组装庄园事实 + 世界书注入 + 内容模式指令，调用 aiChat；AI 关闭时程序化回应

import { aiChat } from '@/gateway/aiGateway';
import { useAiStore } from '@/stores/aiStore';
import { useGameStore } from '@/stores/gameStore';
import { useConfigStore } from '@/stores/configStore';
import { useWorldbookStore } from '@/stores/worldbookStore';
import { scheduleLore, formatLoreBlock } from '@/gateway/loreScheduler';
import { getHeroName } from '@/data/ddLoader';
import { contentModeDirective } from '@/prompts/contentMode';
import { traceHub } from '@/utils/trace';
import { logHub } from '@/stores/logStore';
import { fmtGameDate } from '@/utils/time';

export const STORY_SYSTEM_PROMPT = `你是《暗黑地牢》(Darkest Dungeon) 同人文字冒险游戏的「主持人」。玩家扮演庄园最后的主人，通过自由指令在庄园中行动。

世界：哥特恐怖、压抑绝望。庄园、驿站、教堂、酒馆、疗养院、地牢入口——你负责描写场景、角色反应与后果。

规则：
1. 只使用程序提供的庄园事实（周数/金币/名册/建筑），不得编造玩家没有的资源或英雄
2. 玩家的自由指令可能指向庄园内的任何行动——回应必须符合暗黑地牢基调
3. 重要决定需要回到游戏界面执行（招募去驿站、任务去公告板），你的回应应提示这些入口
4. 战斗与任务的具体数值判定由程序完成，你只描写氛围与角色反应
5. 每次回应 60-150 字，连贯叙事，不用列表标题
6. 回应开头用一段话描写场景，结尾给玩家 1-2 个可继续的行动方向（用「你可以…」句式）`;

export interface StoryMessage {
  id: string;
  role: 'player' | 'narrator';
  text: string;
  time: number;
  meta?: { mode?: string; loreHits?: number; week?: number };
}

// 庄园事实快照（供提示词使用）
export function buildEstateFacts(): string {
  const gs = useGameStore.getState();
  const lines = [
    `周数：${fmtGameDate(gs.week)}`,
    `金币：${gs.gold.toLocaleString()}`,
    `名册：${gs.roster.length} 名英雄（${gs.roster.slice(0, 4).map((h) => `${getHeroName(h.classId)} ${h.name}`).join('、')}${gs.roster.length > 4 ? '…' : ''}）`,
    `已完成任务：${gs.questsFinished}`,
    `纹章：${Object.entries(gs.heirlooms).map(([k, v]) => `${k}×${v}`).join(' ')}`,
    `本周任务板：${useGameStore.getState().questsFinished >= 0 ? '可前往任务公告板查看' : ''}`,
  ];
  return lines.join('\n');
}

// 玩家自由行动 → AI 叙事回应
export async function requestStoryReply(input: string): Promise<{ text: string; mode: string; loreHits: number }> {
  const aiConfig = useAiStore.getState().config;
  const { settings } = useConfigStore.getState();
  const mode = settings.contentMode;

  // 世界书注入
  let loreHits = 0;
  let loreBlock = '';
  try {
    if (useWorldbookStore.getState().loreEnabled) {
      const hits = scheduleLore(input, { recordHits: true });
      loreHits = hits.length;
      loreBlock = formatLoreBlock(hits);
    }
  } catch { /* 忽略 */ }

  const modeDirective = contentModeDirective(mode, 'story');
  const prompt = [
    '【庄园事实】',
    buildEstateFacts(),
    '',
    '【玩家的行动】',
    input,
    '',
    modeDirective,
    '',
    '请以庄园主人的视角回应这次行动。',
  ].join('\n');

  const trace = traceHub.prompt(`故事行动「${input.slice(0, 20)}」`, prompt, { meta: { mode, loreHits } });

  if (!aiConfig.enabled) {
    // 程序化降级回应
    const text = proceduralReply(input);
    traceHub.response('故事回应（程序化降级）', text, { durationMs: 1 });
    return { text, mode, loreHits };
  }

  try {
    const res = await aiChat(aiConfig, [
      { role: 'system', content: STORY_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);
    const text = res.text.trim();
    traceHub.response(`故事回应`, text, { durationMs: Date.now() - trace.time });
    logHub.narrative(`故事行动回应完成（${input.slice(0, 20)}…）`);
    return { text, mode, loreHits };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    traceHub.error('故事回应失败', msg);
    logHub.error(`故事回应失败：${msg}`);
    return { text: `（旁白的声音被黑暗吞没——${msg}）`, mode, loreHits };
  }
}

// AI 关闭时的程序化回应（基于关键词的庄园旁白）
function proceduralReply(input: string): string {
  const gs = useGameStore.getState();
  const kw = input.toLowerCase();
  if (/酒馆|喝酒|喝酒吧/.test(kw)) {
    return '酒馆的炉火噼啪作响。老板擦拭着酒杯：「庄园主大人，英雄们今晚都在——有些人喝了太多，说了太多。」你可以和某个英雄聊聊，或者打听镇上的传闻。';
  }
  if (/招募|雇佣|招人/.test(kw)) {
    return '驿站传来车轮声。马夫扬声道：「庄园主大人，本周有新人到了驿站，要不要去看看？」（前往「驿站」建筑即可招募）';
  }
  if (/任务|公告|委托/.test(kw)) {
    return '公告板上钉着新的委托。守卫低声说：「本周的任务……比上周凶险。」（前往「任务公告板」接取任务）';
  }
  if (/训练|练|修行/.test(kw)) {
    return '训练场里，武器交击声沉闷有力。教头看向你：「想磨炼哪个英雄？」（在名册中选择英雄，前往公会/铁匠铺强化）';
  }
  if (/休息|睡觉|回房/.test(kw)) {
    return `你回到庄园主卧。窗外是第 ${gs.week} 周的夜色——月光照在荒废的庭院上。一夜无梦。第二天，庄园照常运转。`;
  }
  return `你站在庄园的廊柱下，${fmtGameDate(gs.week)}的风穿过庭院。仆人们低头行礼，等待你的吩咐。要前往驿站、公告板、或是巡视庄园？（提示：在「设置 → AI 接口」启用模型后，你将获得真正自由的文字冒险体验）`;
}
