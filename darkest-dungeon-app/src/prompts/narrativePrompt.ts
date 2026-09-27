// 叙事主提示词 — 世界基调/事实清单/世界书注入的组装（对齐凡人 narrativePrompt）
// 现有 narrative.ts 负责战斗/地牢叙事，本模块提供通用叙事组装（含世界书注入）

import { formatLoreBlock } from '@/gateway/loreScheduler';
import type { LoreHit } from '@/gateway/loreScheduler';
import { assemblePlan, mod, type AssemblyPlan } from './presetAssembler';
import { traceHub } from '@/utils/trace';

export const NARRATIVE_BASE_SYSTEM = `你是《暗黑地牢》(Darkest Dungeon) 同人文字游戏的旁白叙事者。程序会给你一份「事实清单」，请你用简体中文把它描写成符合暗黑地牢基调的叙事片段。

文风要求：
- 哥特恐怖、压抑、绝望的氛围，黑暗中的微光与低语，宿命感与威严感
- 措辞克制、凝练、有画面感

铁律：
1. 只描写事实清单中出现的内容，严禁编造数值、效果、掉落、行为或对话
2. 不替任何角色做决定，不替玩家选择
3. 不要使用列表、编号、标题或括号注释，输出必须是连贯的叙事文字
4. 长度：战斗单次行动 30-90 字；探索/事件 50-120 字`;

export interface NarrativeContext {
  kind: string;               // '战斗' | '地牢探索' | '周事件' | ...
  facts: string;              // 程序化事实清单
  lore?: LoreHit[];           // 世界书命中（可选）
  instruction?: string;       // 自定义输出指令
  budget?: number;
}

export interface NarrativeAssembled {
  plan: AssemblyPlan;
  systemPrompt: string;
  userPrompt: string;
}

// 组装叙事请求（带世界书注入 + Trace）
export function assembleNarrative(ctx: NarrativeContext): NarrativeAssembled {
  const plan = assemblePlan(
    [
      mod('system', 'system', '世界观基调', NARRATIVE_BASE_SYSTEM, 260),
      mod('facts', 'user', '事实清单', `【${ctx.kind}事实】\n${ctx.facts}`, -1),
      mod(
        'lore',
        'context',
        '世界书条目',
        ctx.lore && ctx.lore.length ? formatLoreBlock(ctx.lore) : '（无）',
        ctx.lore?.reduce((s, h) => s + Math.ceil(h.entry.content.length / 2), 0) ?? 0
      ),
      mod('instruction', 'user', '输出指令', ctx.instruction ?? `请用旁白描写这一时刻的氛围与队伍的处境。`, 30),
    ],
    ctx.budget ?? 3000,
    { essential: ['system', 'facts'] }
  );

  traceHub.prompt(`叙事组装（${ctx.kind}）`, planSummaryText(plan), {
    meta: { dropped: plan.dropped, used: plan.usedBudget },
  });

  return {
    plan,
    systemPrompt: NARRATIVE_BASE_SYSTEM,
    userPrompt: plan.text,
  };
}

function planSummaryText(plan: AssemblyPlan): string {
  return `预算 ${plan.usedBudget}/${plan.totalBudget} · 模块 ${plan.modules.map((m) => m.id).join('、')}${plan.dropped.length ? ` · 裁剪 ${plan.dropped.join('、')}` : ''}`;
}
