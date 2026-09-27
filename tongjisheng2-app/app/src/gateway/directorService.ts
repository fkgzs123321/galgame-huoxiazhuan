import { modelGateway, type GatewayRequest, type GatewayResult } from '@runtime/model-gateway';
import { PromptAssembler } from '@runtime/prompt-assembly';
import { findProfile } from '@ai/profiles';
import type { PresetProfile } from '@runtime/preset/types';
import type { MvuRuntime } from '@runtime/mvu-runtime';

/**
 * directorService · 剧情导演服务(网关层)
 * 对齐 fanren-remake 的 directorService:
 *  - 开局背景生成(创建新周目时调用)
 *  - 每轮导演裁定(回合开始前,结构化输出:场景/事件/女角状态)
 *
 * 注意:本服务依赖已配置的端点;端点未配置时返回降级结果。
 */

export interface OpeningBackgroundInput {
  playerName: string;
  identityName: string;
  residence: string;
  extra?: string;
}

export interface OpeningBackgroundResult {
  ok: boolean;
  content?: string;
  error?: string;
}

export interface DirectorVerdictInput {
  turnCount: number;
  day: number;
  timeSlot: string;
  location: string;
  currentHeroine?: string;
  recentEvents: string[];
  playerAction: string;
}

export interface DirectorVerdict {
  ok: boolean;
  /** 导演裁定文本(注入叙事) */
  narration?: string;
  /** 建议的当前女角(名字,可为空) */
  suggestedHeroine?: string;
  error?: string;
}

const VERDICT_SYSTEM_PROMPT = `你是《同级生2》剧情导演。你负责在每轮回合开始前,基于当前状态给出导演裁定:
1. 判断本回合应聚焦的剧情方向(日常/事件/冲突/恋爱推进)
2. 指出当前女角的行动意图(若在场)
3. 给出 2-3 句本回合的叙事基调提示
输出保持简洁,不超过 150 字,直接输出裁定文本,不要使用 Markdown 标题。`;

/**
 * 生成开局背景(异步,非流式)
 * 使用 opening profile;未配置端点时返回降级模板。
 */
export async function generateOpeningBackground(
  mvu: MvuRuntime,
  input: OpeningBackgroundInput,
): Promise<OpeningBackgroundResult> {
  const profile = findProfile('opening');
  if (!profile) return { ok: false, error: 'opening profile 未注册' };

  const preset = await resolvePreset(profile.endpoint.preset?.name ?? '');
  const assembler = new PromptAssembler(mvu);
  const assembly = await assembler.assemble(profile, preset, {
    userName: input.playerName,
    charName: '',
    userAction: `以${input.identityName}的身份开始新的寒假生活(住所:${input.residence})`,
    chatHistory: [],
    turnId: `opening-${Date.now()}`,
    profileId: 'opening',
  });

  const req: GatewayRequest = {
    profile,
    preset,
    messages: assembly.messages,
    requestId: `opening-${Date.now()}`,
  };

  const res: GatewayResult = await modelGateway.invoke(req);
  if (!res.ok) return { ok: false, error: res.error ?? '调用失败' };
  return { ok: true, content: res.text };
}

/**
 * 导演裁定(回合开始前)
 * 使用 plot-evolution profile;未配置端点时返回降级裁定。
 */
export async function directTurn(
  mvu: MvuRuntime,
  input: DirectorVerdictInput,
): Promise<DirectorVerdict> {
  const profile = findProfile('plot-evolution');
  if (!profile) return { ok: false, error: 'plot-evolution profile 未注册' };

  const preset = await resolvePreset(profile.endpoint.preset?.name ?? '');
  const contextLines = [
    `回合:第 ${input.turnCount} 回合`,
    `时间:第 ${input.day} 天 · ${input.timeSlot}`,
    `地点:${input.location}`,
    input.currentHeroine ? `当前女角:${input.currentHeroine}` : '',
    `近期事件:${input.recentEvents.join('; ') || '无'}`,
    `玩家行动:${input.playerAction}`,
  ].filter(Boolean);

  const assembler = new PromptAssembler(mvu);
  const assembly = await assembler.assemble(profile, preset, {
    userName: '玩家',
    charName: input.currentHeroine ?? '',
    userAction: input.playerAction,
    chatHistory: [],
    turnId: `direct-${Date.now()}`,
    profileId: 'plot-evolution',
  });

  const req: GatewayRequest = {
    profile,
    preset,
    messages: [
      ...assembly.messages.slice(0, -1),
      { role: 'system', content: VERDICT_SYSTEM_PROMPT },
      { role: 'user', content: contextLines.join('\n') },
    ],
    requestId: `direct-${Date.now()}`,
  };

  const res: GatewayResult = await modelGateway.invoke(req);
  if (!res.ok) return { ok: false, error: res.error ?? '调用失败' };
  return { ok: true, narration: res.text };
}

async function resolvePreset(presetName: string): Promise<PresetProfile> {
  const { BUILTIN_PRESETS } = await import('@content/presets/builtin-presets');
  return BUILTIN_PRESETS.find((p) => p.name === presetName) ?? BUILTIN_PRESETS[0];
}
