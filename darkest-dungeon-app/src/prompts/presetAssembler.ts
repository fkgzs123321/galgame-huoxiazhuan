// 预设组装器 — 模块化 Prompt Assembly Plan（对齐凡人 presetAssembler）
// 支持：模块/role/marker/预算裁剪/Trace

export interface PromptModule {
  id: string;
  role: 'system' | 'user' | 'context';
  marker: string;            // 模块标记（Trace 与调试用）
  content: string;
  budget: number;            // 估算 token（-1 = 自动按字符估算）
  enabled: boolean;
}

export interface AssemblyPlan {
  modules: PromptModule[];
  totalBudget: number;
  usedBudget: number;
  dropped: string[];         // 被预算裁剪掉的模块 id
  text: string;
}

const estimate = (content: string) => Math.ceil(content.length / 2);

// 组装：按给定顺序拼接；预算超限时按模块顺序裁剪（除非 essential）
export function assemblePlan(
  modules: PromptModule[],
  budgetLimit = 4000,
  opts: { essential?: string[] } = {}
): AssemblyPlan {
  const essential = new Set(opts.essential ?? []);
  const dropped: string[] = [];
  let used = 0;
  const kept: PromptModule[] = [];

  for (const m of modules) {
    if (!m.enabled) {
      dropped.push(`${m.id}（disabled）`);
      continue;
    }
    const cost = m.budget > 0 ? m.budget : estimate(m.content);
    if (used + cost > budgetLimit && !essential.has(m.id) && kept.length > 0) {
      dropped.push(m.id);
      continue;
    }
    used += cost;
    kept.push(m);
  }

  const parts: string[] = [];
  let curRole = '';
  for (const m of kept) {
    if (m.role !== curRole) {
      if (curRole !== '') parts.push('');
      curRole = m.role;
    }
    parts.push(m.content);
  }

  return {
    modules: kept,
    totalBudget: budgetLimit,
    usedBudget: used,
    dropped,
    text: parts.join('\n'),
  };
}

// 快速模块构造
export function mod(id: string, role: PromptModule['role'], marker: string, content: string, budget = -1): PromptModule {
  return { id, role, marker, content, budget, enabled: true };
}

// 组装结果的可读摘要（LLM 调试台用）
export function planSummary(plan: AssemblyPlan): string {
  const lines = [
    `预算 ${plan.usedBudget}/${plan.totalBudget}`,
    `模块 ${plan.modules.length} 个：${plan.modules.map((m) => m.id).join('、')}`,
  ];
  if (plan.dropped.length) lines.push(`裁剪：${plan.dropped.join('、')}`);
  return lines.join('\n');
}
