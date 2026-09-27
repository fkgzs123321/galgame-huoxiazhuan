// 世界书条目格式契约提示词 — AI 生成条目的 Output Contract
// 对齐凡人 worldbookPrompt / itemPromptContract

export const WORLDBOOK_OUTPUT_CONTRACT = `输出必须是一个合法的 JSON 对象，不得包含任何其他文字：
{
  "title": "条目标题（简短，6-20 字）",
  "content": "条目正文（80-200 字，与暗黑地牢官方设定一致，不得编造）",
  "keywords": ["触发关键词1", "触发关键词2", "触发关键词3"]
}`;

// 组装条目生成请求
export function buildWorldbookGenPrompt(topic: string): string {
  return `主题：${topic}\n\n请为《暗黑地牢》世界书生成一条符合官方设定的知识条目。\n${WORLDBOOK_OUTPUT_CONTRACT}`;
}

// 解析 AI 返回的条目 JSON（失败返回 null）
export function parseWorldbookJson(raw: string): { title: string; content: string; keywords: string[] } | null {
  try {
    const cleaned = raw
      .replace(/```json\s*/g, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<{ title: string; content: string; keywords: unknown }>;
    if (!parsed.title || !parsed.content) return null;
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String).slice(0, 8)
      : [];
    return { title: parsed.title, content: parsed.content, keywords };
  } catch {
    return null;
  }
}
