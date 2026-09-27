// 导演服务提示词 — 开局叙事 / 每周导演裁定 / 事件生成
// 对齐凡人 directorService：AI 生成开局背景与每轮导演裁定

export const DIRECTOR_SYSTEM_PROMPT = `你是《暗黑地牢》同人文字游戏的「剧情导演」。程序提供庄园当前的事实状态（周数、资金、名册、建筑、事件），你负责生成符合暗黑地牢基调的剧情事件与叙事引导。

规则：
1. 只基于给定事实生成，不得编造程序未提供的资源、英雄或能力
2. 每次输出一段连贯的中文叙事（80-150 字），不输出列表或标题
3. 事件必须与暗黑地牢世界观一致：哥特、压抑、宿命感、微小的希望
4. 不得替玩家做决定、不得让 NPC 替玩家选择
5. 周事件会给玩家留下至少一个可选择的行动方向（以叙事语气暗示）`;

export interface DirectorFacts {
  week: number;
  gold: number;
  heirlooms: Record<string, number>;
  rosterCount: number;
  questsFinished: number;
  townEvents?: string[];
  lastWeek?: string;   // 上周叙事摘要
}

export function buildOpeningDirectorPrompt(facts: DirectorFacts): string {
  return [
    '【庄园开局事实】',
    `周数：第 ${facts.week} 周`,
    `资金：${facts.gold} 金币`,
    `名册：${facts.rosterCount} 名英雄`,
    '',
    '任务：用叙事语言描写这座庄园最初的模样，先祖的遗产，以及第一周的第一缕威胁。',
  ].join('\n');
}

export function buildWeeklyDirectorPrompt(facts: DirectorFacts): string {
  const lines: string[] = [
    '【庄园本周事实】',
    `周数：第 ${facts.week} 周`,
    `资金：${facts.gold} 金币`,
    `名册：${facts.rosterCount} 名英雄`,
    `已完成任务：${facts.questsFinished}`,
  ];
  if (facts.townEvents?.length) {
    lines.push('【本周城镇事件】');
    for (const e of facts.townEvents) lines.push(`- ${e}`);
  }
  if (facts.lastWeek) {
    lines.push(`【上周回顾】${facts.lastWeek}`);
  }
  lines.push('');
  lines.push('任务：生成本周发生在庄园或周边的一件剧情事件，并暗示玩家接下来的行动方向。');
  return lines.join('\n');
}
