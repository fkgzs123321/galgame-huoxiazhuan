// 世界书调度服务 — 关键词命中/注入预算/Trace
// 对齐凡人 loreScheduler：世界书条目选择管线

import { useWorldbookStore, type WorldbookEntry } from '@/stores/worldbookStore';
import { traceHub } from '@/utils/trace';
import { logHub } from '@/stores/logStore';

export interface LoreHit {
  entry: WorldbookEntry;
  score: number;
  keywords: string[];
  injected: boolean;
}

// 从正文提取关键词（简单分词：中文按 2-4 字滑窗 + 英文按空白/标点）
export function extractKeywords(text: string, windowSize = 3): string[] {
  const out = new Set<string>();
  // 英文/数字词
  for (const w of text.toLowerCase().match(/[a-z0-9_]{2,}/g) ?? []) out.add(w);
  // 中文 2-4 字滑窗
  const zh = text.replace(/[^\u4e00-\u9fa5]/g, '');
  for (let len = windowSize; len >= 2; len--) {
    for (let i = 0; i + len <= zh.length; i++) {
      out.add(zh.slice(i, i + len));
    }
  }
  return [...out];
}

// 调度：给定正文，选择应注入的世界书条目（返回命中与注入结果）
export function scheduleLore(text: string, opts: { budget?: number; recordHits?: boolean } = {}): LoreHit[] {
  const keywords = extractKeywords(text);
  const selected = useWorldbookStore.getState().selectEntries(keywords, opts.budget);
  const hits: LoreHit[] = selected.map((entry) => {
    const matched = entry.keywords.filter((k) => keywords.includes(k.toLowerCase()));
    const hit: LoreHit = {
      entry,
      score: matched.length || (entry.constant ? 1 : 0),
      keywords: matched,
      injected: true,
    };
    if (opts.recordHits !== false) {
      useWorldbookStore.getState().recordHit(entry.id);
    }
    return hit;
  });

  traceHub.push('lore', `世界书命中 ${hits.length} 条`, {
    meta: {
      keywords: keywords.length,
      entries: hits.map((h) => h.entry.title),
      budget: opts.budget,
    },
  });
  return hits;
}

// 把命中条目格式化为注入文本块
export function formatLoreBlock(hits: LoreHit[]): string {
  if (hits.length === 0) return '';
  const parts = hits.map((h) => {
    const kw = h.keywords.length ? `（触发：${h.keywords.join('、')}）` : '';
    return `【${h.entry.title}${kw}】\n${h.entry.content}`;
  });
  return `\n[世界书条目]\n${parts.join('\n\n')}\n`;
}

// 初始化内置世界书条目（首次运行时播种）
export function seedBuiltinLore(): void {
  const { entries } = useWorldbookStore.getState();
  if (entries.some((e) => e.source === 'builtin')) return;

  const add = useWorldbookStore.getState().addEntry;
  add({
    title: '庄园的由来',
    source: 'builtin',
    triggerType: 'keyword',
    keywords: ['庄园', '先祖', '遗产', '爵位', '庄园主'],
    constant: true,
    content:
      '你的先祖以荣耀与秩序之名建立这座庄园。然而遗产之下埋藏着不可言说的亵渎——地牢中的古神低语、先祖的罪行、以及那扇不该被开启的门。你是这座庄园最后的主人，也是最后的守夜人。',
  });
  add({
    title: '暗黑地牢世界观',
    source: 'builtin',
    triggerType: 'keyword',
    keywords: ['地牢', '黑暗', '古神', '诅咒', '遗迹'],
    constant: false,
    content:
      '地牢深处的存在早已苏醒。它们以恐惧为食、以疯狂为乐。每一位英雄踏入地牢，都要面对自己的恐惧：压力、疾病、怪癖、崩溃——以及死亡之门的凝视。',
  });
  add({
    title: '英雄与压力',
    source: 'builtin',
    triggerType: 'keyword',
    keywords: ['压力', '崩溃', '美德', '英雄', '恐惧'],
    constant: false,
    content:
      '英雄并非无畏，而是在恐惧中前行。压力累积到极限时，英雄可能崩溃（被折磨）或觉醒（美德）。崩溃中的英雄会失去控制，美德中的英雄将超越自我。',
  });
  logHub.info('已播种内置世界书条目');
}
