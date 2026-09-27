// 内容模式指令 — SFW/Balanced/NSFW 的模式化提示词注入（只影响文本生成，不影响程序判定）
import type { ContentMode } from '@/stores/configStore';

export type DirectiveScope = 'story' | 'narrative' | 'director' | 'combat';

const DIRECTIVES: Record<ContentMode, Record<DirectiveScope, string>> = {
  sfw: {
    story: '【内容要求：全年龄】保持哥特恐怖氛围，不得出现任何性内容、露骨描写或成人向互动。',
    narrative: '【内容要求：全年龄】战斗与探索描写保持克制，不得出现露骨暴力或成人内容。',
    director: '【内容要求：全年龄】事件保持黑暗幻想风格，无成人向内容。',
    combat: '【内容要求：全年龄】战斗描写短促克制，无过度血腥。',
  },
  balanced: {
    story: '【内容要求：温和成人】允许黑暗、压抑与暗示性描写，但不允许露骨性内容；情感张力可以强烈。',
    narrative: '【内容要求：温和成人】允许紧张的心理张力与适度的血腥氛围，但不过度。',
    director: '【内容要求：温和成人】事件可以有沉重的道德张力与人性阴暗面。',
    combat: '【内容要求：温和成人】允许战斗的残酷感，但不过度渲染。',
  },
  nsfw: {
    story: '【内容要求：成人】允许露骨的成人向内容：性张力、亲密互动、粗粝的欲望描写，与黑暗哥特氛围融合；禁止涉及未成年角色，禁止强迫性内容（角色自愿且有权势平衡）。',
    narrative: '【内容要求：成人】允许在叙事中加入黑暗欲望、堕落、诱惑与亲密接触的露骨描写。',
    director: '【内容要求：成人】事件可以包含庄园的堕落气息、欲望与罪恶主题的成人向情节。',
    combat: '【内容要求：成人】允许战斗的残酷、血腥与绝望的极致渲染。',
  },
};

// 取当前模式的指令文本
export function contentModeDirective(mode: ContentMode, scope: DirectiveScope): string {
  return DIRECTIVES[mode]?.[scope] ?? DIRECTIVES.sfw[scope];
}

// 模式中文名
export const CONTENT_MODE_LABEL: Record<ContentMode, string> = {
  sfw: '全年龄',
  balanced: '温和成人',
  nsfw: '成人',
};

// 模式徽章色
export const CONTENT_MODE_TONE: Record<ContentMode, 'green' | 'gold' | 'red'> = {
  sfw: 'green',
  balanced: 'gold',
  nsfw: 'red',
};
