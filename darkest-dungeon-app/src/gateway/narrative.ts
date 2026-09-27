// ============================================================
// 叙事层 — Prompt 组装 + 叙事请求
//
// 职责：
//  - 把程序化判定结果（事实清单）组装成叙事 Prompt
//  - 调用模型网关，流式/非流式获取叙事文本
//  - AI 只做叙事包装，绝不参与数值计算
// ============================================================

import type { AiConfig } from '@/stores/aiStore';
import { aiChat, type ChatMessage, type ChatRequestOptions } from '@/gateway/aiGateway';
import type { BattleState, CombatLogEntry, Combatant } from '@/gateway/combatEngine';
import { useWorldbookStore } from '@/stores/worldbookStore';
import { scheduleLore, formatLoreBlock } from '@/gateway/loreScheduler';

// ---------- 系统提示（世界基调 + 叙事铁律） ----------

export const NARRATIVE_SYSTEM_PROMPT = `你是《暗黑地牢》(Darkest Dungeon) 同人文字游戏的旁白叙事者。程序会给你一份战斗或探索的「事实清单」，请你用简体中文把它描写成符合暗黑地牢基调的叙事片段。

文风要求：
- 哥特恐怖、压抑、绝望的氛围，黑暗中的微光与低语，宿命感与威严感
- 措辞克制、凝练、有画面感，避免形容词堆砌
- 战斗描写要短促有力，像铁器交击；探索描写要阴森绵长，像烛火在长廊里摇曳

铁律：
1. 只描写事实清单中出现的内容，严禁编造未给出的数值、效果、掉落、行为或对话
2. 不替任何角色做决定，不替玩家选择
3. 不要使用列表、编号、标题或括号注释，输出必须是连贯的叙事文字
4. 除非事实清单明确说明，不要描写角色的具体对话内容
5. 长度：战斗单次行动 30-90 字；探索/事件 50-120 字`;

// ---------- 战斗叙事 ----------

const POSITION_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function combatantLine(c: Combatant): string {
  const pos = POSITION_ROMAN[c.position - 1] ?? String(c.position);
  const hp = c.isDead ? '阵亡' : `HP ${c.currentHp}/${c.maxHp}`;
  const state: string[] = [];
  if (c.onDeathDoor) state.push('死亡之门');
  if (c.isStunned) state.push('眩晕');
  if (c.side === 'hero') {
    if (c.affliction) state.push(`崩溃「${c.affliction}」`);
    if (c.virtue) state.push(`美德「${c.virtue}」`);
    state.push(`压力 ${c.stress}`);
  } else if (c.side === 'enemy') {
    state.push(`站位${pos}`);
  }
  const stateText = state.length > 0 ? `（${state.join('，')}）` : '';
  return `${c.name}${c.side === 'hero' ? `（${c.classId}）` : ''} 站位${pos} ${hp}${stateText}`;
}

function formatAction(entry: CombatLogEntry): string {
  const parts: string[] = [`${entry.actor} 使用 ${entry.action}`];
  if (entry.target) parts.push(`目标 ${entry.target}`);
  if (entry.miss) {
    parts.push('未命中');
  } else if (entry.isHeal && entry.damage !== undefined) {
    parts.push(`恢复 ${Math.abs(entry.damage)} 点生命`);
  } else if (entry.damage !== undefined && entry.damage > 0) {
    parts.push(entry.crit ? `命中（暴击！）造成 ${entry.damage} 点伤害` : `命中，造成 ${entry.damage} 点伤害`);
  }
  if (entry.result && entry.result !== entry.action) {
    parts.push(entry.result);
  }
  return parts.join('，') + '。';
}

export function buildCombatNarrativePrompt(
  battle: BattleState,
  entry: CombatLogEntry,
  recentLog: CombatLogEntry[]
): string {
  const lines: string[] = [];
  lines.push(`【战斗事实】回合：${battle.turn}`);
  lines.push('我方：' + battle.heroes.map(combatantLine).join('；'));
  lines.push('敌方：' + battle.enemies.map(combatantLine).join('；'));

  const recent = recentLog
    .filter((l) => l !== entry && l.action !== '')
    .slice(-3);
  if (recent.length > 0) {
    lines.push('【此前片刻】');
    for (const l of recent) {
      lines.push('- ' + formatAction(l));
    }
  }

  lines.push('【此刻发生的行动】');
  lines.push(formatAction(entry));
  lines.push('');
  lines.push('请用旁白描写这一个瞬间。');

  return lines.join('\n');
}

export function buildCombatStartPrompt(battle: BattleState): string {
  const lines: string[] = [];
  lines.push('【战斗事实】回合：1');
  lines.push('我方：' + battle.heroes.map(combatantLine).join('；'));
  lines.push('敌方：' + battle.enemies.map(combatantLine).join('；'));
  lines.push('【事件】战斗开始，双方列阵相对。');
  lines.push('');
  lines.push('请用旁白描写遭遇发生、双方对峙的第一个瞬间。');
  return lines.join('\n');
}

// ---------- 地牢叙事 ----------

export interface DungeonNarrativeEvent {
  kind: 'corridor_step' | 'room_arrival' | 'curio_result' | 'trap' | 'torch_low' | 'battle_start' | 'retreat' | 'camp';
  areaName: string;            // 区域中文名（如 遗迹）
  torch: number;               // 火把亮度 0-100
  eventText: string;           // 程序化事件描述（事实）
  party?: string[];            // 队伍简述（如 ["雷诺尔德(十字军) HP 24/33"]）
  extra?: string;              // 附加事实（如战利品）
}

export function buildDungeonNarrativePrompt(ev: DungeonNarrativeEvent): string {
  const torchDesc =
    ev.torch >= 76 ? `明亮（${ev.torch}）` :
    ev.torch >= 51 ? `正常（${ev.torch}）` :
    ev.torch >= 26 ? `幽暗（${ev.torch}）` :
    ev.torch >= 1 ? `黑暗（${ev.torch}）` : `漆黑（0）`;

  const lines: string[] = [];
  lines.push(`【地牢事实】区域：${ev.areaName}；火把：${torchDesc}`);
  if (ev.party && ev.party.length > 0) {
    lines.push('队伍：' + ev.party.join('；'));
  }
  lines.push(`【事件】${ev.eventText}`);
  if (ev.extra) {
    lines.push(`【结果】${ev.extra}`);
  }
  lines.push('');
  lines.push('请用旁白描写这一时刻的氛围与队伍的处境。');
  return lines.join('\n');
}

// ---------- 统一请求入口 ----------

export function requestNarrative(
  config: AiConfig,
  userPrompt: string,
  opts: ChatRequestOptions = {}
): Promise<string> {
  // 世界书注入：若 Lore Runtime 启用，把命中的世界书条目追加到事实之后
  const loreBlock = buildLoreInjection(userPrompt);
  const finalPrompt = loreBlock ? `${userPrompt}\n${loreBlock}` : userPrompt;
  const messages: ChatMessage[] = [
    { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
    { role: 'user', content: finalPrompt },
  ];
  return aiChat(config, messages, opts).then((r) => r.text.trim());
}

// 从世界书选择条目并格式化注入块（失败静默降级，不阻塞叙事）
function buildLoreInjection(text: string): string {
  try {
    if (!useWorldbookStore.getState().loreEnabled) return '';
    const hits = scheduleLore(text, { recordHits: true });
    return formatLoreBlock(hits);
  } catch {
    return '';
  }
}
