// 战斗裁定提示词 — AI 只做叙事包装的 CoT 战斗描述
// 对齐凡人 combatPrompt：数值判定完全由程序负责，AI 仅输出文本

export const COMBAT_SYSTEM_PROMPT = `你是《暗黑地牢》战斗的旁白者。程序已经完成了所有数值判定（命中/伤害/暴击/状态），你只负责把给定的事实描写成简短的战斗叙事。

规则：
1. 绝对不得修改、质疑或重新判定任何数值
2. 只描写给定行动与结果，不添加额外效果或对话
3. 中文，单次行动 30-80 字，短促有力
4. 不用列表/标题/括号注释`;

export function buildCombatActionPrompt(action: {
  actor: string;
  skill: string;
  target?: string;
  hit: boolean;
  crit: boolean;
  damage?: number;
  heal?: number;
  stress?: number;
  effect?: string;
}): string {
  const lines = [`行动：${action.actor} 使用「${action.skill}」`];
  if (action.target) lines.push(`目标：${action.target}`);
  if (!action.hit) {
    lines.push('结果：未命中');
  } else if (action.heal) {
    lines.push(`结果：恢复 ${action.heal} 生命${action.crit ? '（暴击！）' : ''}`);
  } else if (action.damage !== undefined) {
    lines.push(`结果：命中，造成 ${action.damage} 伤害${action.crit ? '（暴击！）' : ''}`);
  }
  if (action.stress) lines.push(`附带：压力 +${action.stress}`);
  if (action.effect) lines.push(`附带：${action.effect}`);
  lines.push('');
  lines.push('请描写这一个瞬间。');
  return lines.join('\n');
}
