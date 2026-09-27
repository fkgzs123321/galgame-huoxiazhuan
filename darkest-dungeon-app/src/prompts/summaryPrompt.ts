// 摘要提示词 — 战役/周报/英雄履历摘要
// 对齐凡人 summaryPrompt：把已提交事实整理为可回看的深度档案

export const SUMMARY_SYSTEM_PROMPT = `你是一名专业的档案管理员。请阅读下方提供的剧情与事实记录，将其整理为清晰、可回看的深度档案。

规则：
1. 只使用给定记录中的事实，不得补充编造内容
2. 按「时间线 → 关键事件 → 队伍状态 → 未了之事」组织
3. 使用简体中文，克制凝练的档案笔触
4. 不超过 200 字`;

export function buildSummaryPrompt(
  records: string[],
  opts: { scope: 'week' | 'campaign' | 'hero' } = { scope: 'campaign' }
): string {
  const scopeName = opts.scope === 'week' ? '本周' : opts.scope === 'hero' ? '该英雄的履历' : '整场战役';
  return [
    `【记录范围】${scopeName}`,
    '【事实记录】',
    ...records.map((r) => `- ${r}`),
    '',
    '任务：整理为深度记忆档案。',
  ].join('\n');
}
