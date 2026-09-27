// 剧情导演服务 — 开局叙事 / 每周导演裁定（AI 生成，程序裁定）
// 对齐凡人 directorService

import { aiChat } from '@/gateway/aiGateway';
import type { AiConfig } from '@/stores/aiStore';
import { DIRECTOR_SYSTEM_PROMPT, buildOpeningDirectorPrompt, buildWeeklyDirectorPrompt, type DirectorFacts } from '@/prompts/directorPrompt';
import { traceHub } from '@/utils/trace';
import { logHub } from '@/stores/logStore';
import { useConfigStore } from '@/stores/configStore';
import { contentModeDirective } from '@/prompts/contentMode';

export type DirectorKind = 'opening' | 'weekly';

export interface DirectorResult {
  ok: boolean;
  text: string;
  kind: DirectorKind;
  durationMs: number;
  error?: string;
}

// 调用导演：生成开局叙事或每周事件；失败返回降级文本
export async function runDirector(
  config: AiConfig,
  kind: DirectorKind,
  facts: DirectorFacts
): Promise<DirectorResult> {
  const started = Date.now();
  const base = kind === 'opening' ? buildOpeningDirectorPrompt(facts) : buildWeeklyDirectorPrompt(facts);
  const mode = useConfigStore.getState().settings.contentMode;
  const prompt = `${base}\n\n${contentModeDirective(mode, 'director')}`;
  const trace = traceHub.prompt(`导演（${kind}）`, prompt, { meta: { week: facts.week, mode } });

  if (!config.enabled) {
    const fallback = kind === 'opening'
      ? '庄园矗立在晨雾与暮色之间。先祖的遗产尚在，但地牢深处的低语已经响起——这个周，你将决定谁踏入黑暗。'
      : `第 ${facts.week} 周，庄园在风雨中沉默。英雄们在火炉边低声交谈，等待新的任务。`;
    traceHub.response(`导演降级（AI 关闭）`, fallback, { durationMs: Date.now() - started });
    return { ok: true, text: fallback, kind, durationMs: Date.now() - started };
  }

  try {
    const res = await aiChat(config, [
      { role: 'system', content: DIRECTOR_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);
    const text = res.text.trim();
    traceHub.response(`导演响应`, text, { durationMs: Date.now() - started });
    logHub.narrative(`导演（${kind}）生成完成：${text.slice(0, 40)}…`);
    return { ok: true, text, kind, durationMs: Date.now() - started };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    traceHub.error(`导演请求失败`, msg);
    logHub.error(`导演失败：${msg}`);
    return {
      ok: false,
      text: '（导演沉默了一瞬，庄园的钟声替它作答。）',
      kind,
      durationMs: Date.now() - started,
      error: msg,
    };
  }
}
