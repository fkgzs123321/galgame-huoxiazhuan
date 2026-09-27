/**
 * UI 共享类型(步骤7)
 *
 * 提供给 ConfigPage / IdentitySelect / MainChat / StatusBar 使用的共享类型与常量。
 * 不依赖 React,纯类型/数据。
 */

import type { AiProfile, AiProfileId } from '@ai/profiles';
import type { PresetProfile } from '@runtime/preset/types';

// ───────────────────────────────────────────────────────────
//  主题(CSS 变量,与 index.css 对齐)
// ───────────────────────────────────────────────────────────

export const THEME_VARS = {
  bg: 'var(--c-bg)',
  bgGradient: 'var(--c-bg-gradient)',
  overlay: 'var(--c-overlay)',
  overlaySoft: 'var(--c-overlay-soft)',
  border: 'var(--c-border)',
  borderSoft: 'var(--c-border-soft)',
  text: 'var(--c-text)',
  textMuted: 'var(--c-text-muted)',
  textSoft: 'var(--c-text-soft)',
  primary: 'var(--c-primary)',
  primarySoft: 'var(--c-primary-soft)',
  primaryGlow: 'var(--c-primary-glow)',
  accent: 'var(--c-accent)',
  accentSoft: 'var(--c-accent-soft)',
  success: 'var(--c-success)',
  warning: 'var(--c-warning)',
  danger: 'var(--c-danger)',
  info: 'var(--c-info)',
  shadowSm: 'var(--shadow-sm)',
  shadowMd: 'var(--shadow-md)',
  shadowLg: 'var(--shadow-lg)',
  shadowGlow: 'var(--shadow-glow)',
  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',
  fontMono: 'var(--font-mono)',
} as const;

/** 可选主题 */
export type ThemeName = 'sakura' | 'night' | 'moon' | 'sunset' | 'snow';

export const THEME_OPTIONS: Array<{ id: ThemeName; label: string; icon: string }> = [
  { id: 'sakura', label: '樱花粉', icon: '🌸' },
  { id: 'night', label: '夜樱', icon: '🌙' },
  { id: 'moon', label: '月光紫', icon: '💫' },
  { id: 'sunset', label: '夕阳橙', icon: '🌅' },
  { id: 'snow', label: '雪景蓝', icon: '❄️' },
];

/** 应用主题到 document.documentElement */
export function applyTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'sakura') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  root.style.setProperty('--current-theme', theme);
}

/** 从 localStorage 读取已保存的主题(默认 sakura) */
export function loadSavedTheme(): ThemeName {
  if (typeof localStorage === 'undefined') return 'sakura';
  const saved = localStorage.getItem('__app_theme__') as ThemeName | null;
  return saved ?? 'sakura';
}

/** 持久化主题到 localStorage */
export function saveTheme(theme: ThemeName): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('__app_theme__', theme);
}

// ───────────────────────────────────────────────────────────
//  配置(ConfigPage 持久化)
// ───────────────────────────────────────────────────────────

/** 单个 AI 端点配置(用户在 ConfigPage 编辑) */
export interface AiEndpointConfig {
  profileId: AiProfileId;
  /** OpenAI 兼容 baseURL,如 https://api.deepseek.com/v1 */
  baseURL: string;
  /** API Key(本地存 IndexedDB,不上传) */
  apiKey: string;
  /** 模型名,如 deepseek-chat */
  model: string;
  /** 绑定的预设名(从已导入/内置预设中选择;空=使用内置"原卡默认") */
  presetName: string;
}

/** 玩家全局配置(整体存 IndexedDB kv:__app_config__) */
export interface AppConfig {
  /** 玩家姓名(注入 {{user}} 宏) */
  playerName: string;
  /** 8AI 端点配置 */
  endpoints: AiEndpointConfig[];
  /** 最近选择的预设名(用于 App.tsx 步骤7 默认展示) */
  lastPresetName: string;
  /** 是否已完成身份选择(用于路由判断) */
  identitySelected: boolean;
  /** 已选择的玩家身份(P1-P6 名称) */
  selectedIdentity: string;
  /** 配置更新时间戳 */
  updatedAt: number;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  playerName: '',
  endpoints: [
    { profileId: 'main-chat', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
    { profileId: 'var-update', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
    { profileId: 'opening', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
    { profileId: 'plot-evolution', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
    { profileId: 'npc-natural-action', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
    { profileId: 'combat-settlement', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
    { profileId: 'h-scene-settlement', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
    { profileId: 'worldview', baseURL: '', apiKey: '', model: '', presetName: '原卡默认' },
  ],
  lastPresetName: '原卡默认',
  identitySelected: false,
  selectedIdentity: '',
  updatedAt: 0,
};

/** IndexedDB kv 中存配置的 key */
export const APP_CONFIG_KV_KEY = '__app_config__';

// ───────────────────────────────────────────────────────────
//  身份选择(IdentitySelect)
// ───────────────────────────────────────────────────────────

/** 6 个可选玩家身份(P1-P6) */
export interface IdentityOption {
  id: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
  /** 原作主角名(显示用) */
  name: string;
  /** 简介 */
  description: string;
  /** 6 维属性初始值(身份感知) */
  attributes: {
    魅力: number;
    学业: number;
    体力: number;
    社交: number;
    敏感: number;
    声誉: number;
  };
  /** 初始现金 */
  cash: number;
  /** 初始住所 */
  residence: string;
  /** 详细背景故事(开局叙事注入) */
  background: string;
  /** 初始人际关系(与哪些女角有初始联系) */
  initialRelations: string[];
  /** 身份特性(被动加成/限制) */
  traits: Array<{ name: string; effect: string }>;
  /** 难度(1-5) */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** 专属剧情线提示 */
  exclusivePlot?: string;
  /** 二周目解锁条件(undefined=开局可用) */
  unlockCondition?: string;
}

export const IDENTITY_OPTIONS: IdentityOption[] = [
  {
    id: 'P1',
    name: '原作主角(鸣泽唯)',
    description: '原作默认主角,鸣泽家养子,与美佐子/唯同居。属性均衡,适合初次游玩。',
    attributes: { 魅力: 50, 学业: 60, 体力: 55, 社交: 55, 敏感: 50, 声誉: 55 },
    cash: 5000,
    residence: '鸣泽家',
    background:
      '十年前被鸣泽家收养,与义妹唯、义母美佐子共同生活。在八十八町是个小有名气的麻烦人物——打架厉害、嘴上不饶人,但町里的人都知道他心地不坏。寒假第一天,他躺在床上想着:这个寒假,会发生什么?',
    initialRelations: [
      '鸣泽唯:义妹,同居,关系亲密但微妙',
      '鸣泽美佐子:义母,咖啡店《憩》店主,日常照料者',
      '舞岛可怜:同班偶像,认识但不算熟',
    ],
    traits: [
      { name: '家庭支柱', effect: '与唯/美佐子的互动好感提升 +10%' },
      { name: '町内名人', effect: '商店购物 9 折,打工时薪 +20%' },
      { name: '打架好手', effect: '战斗攻击 +2' },
    ],
    difficulty: 1,
    exclusivePlot: '鸣泽家的家庭羁绊线(唯/美佐子双线可同时推进)',
  },
  {
    id: 'P2',
    name: '川尻信良',
    description: '柔道部主将,体力卓越但学业薄弱,家境普通。',
    attributes: { 魅力: 45, 学业: 35, 体力: 85, 社交: 60, 敏感: 30, 声誉: 65 },
    cash: 3000,
    residence: '川尻家',
    background:
      '八十八学园柔道部主将,全国大赛选手。家里开着一家小小的日用品店,父母忙于生计。寒假回来帮家里看店,顺便琢磨着怎么在恋爱上"抱得美人归"——毕竟柔道场上他从不认输。',
    initialRelations: [
      '舞岛可怜:同校,曾帮她赶走跟踪狂',
      '南川洋子:机车圈的朋友',
    ],
    traits: [
      { name: '柔道主将', effect: '战斗攻击 +5,体力上限 +20' },
      { name: '家境普通', effect: '零花钱较少,打工收益 +30%' },
      { name: '肌肉魅力', effect: '运动系女角初始好感 +5' },
    ],
    difficulty: 2,
    exclusivePlot: '与可怜/洋子的运动系竞争线',
  },
  {
    id: 'P3',
    name: '长冈芳树',
    description: '文化部成员,学业优秀但体力偏弱,家境富裕。',
    attributes: { 魅力: 55, 学业: 85, 体力: 35, 社交: 50, 敏感: 60, 声誉: 70 },
    cash: 12000,
    residence: '长冈家(公寓)',
    background:
      '八十八学园摄影部部长,家里在东京经营连锁书店,是个标准的富二代。喜欢用相机记录八十八町的日常,尤其是那些美丽的女孩子们。寒假想拍一组"寒假恋爱物语"写真——女主角,当然是现找。',
    initialRelations: [
      '加藤美纪:同班,曾给她拍过照',
      '野野村美里:书店常客,认识',
      '片桐美铃:美术老师,借过器材',
    ],
    traits: [
      { name: '富家少爷', effect: '初始现金高,礼物效果 +15%' },
      { name: '摄影之眼', effect: 'CG 收集率 +10%,约会场景描写更细腻' },
      { name: '体力偏弱', effect: '体力行动消耗 +20%' },
    ],
    difficulty: 2,
    exclusivePlot: '用相机攻略艺术系女角(美铃/美里)的专属线',
  },
  {
    id: 'P4',
    name: '西御寺有友',
    description: '现充代表,社交达人,属性偏社交向。',
    attributes: { 魅力: 75, 学业: 50, 体力: 60, 社交: 90, 敏感: 55, 声誉: 80 },
    cash: 8000,
    residence: '西御寺家',
    background:
      '八十八町公认的现充之王。家里经营町内最大的西御寺不动产,从小就是风云人物。女孩子们对他的评价两极分化:有人觉得他风流潇洒,有人觉得他轻浮。只有他自己知道,真正让他心动的那个人,一直没出现。',
    initialRelations: [
      '鸣泽唯:一直想接近的对象(原作线冲突位)',
      '舞岛可怜:演艺圈熟人',
      '田中美沙:网球场对手',
    ],
    traits: [
      { name: '社交大师', effect: '陌生女角初始好感 +10,社交事件收益 +20%' },
      { name: '风流名声', effect: '部分纯情系女角初始好感 -10' },
      { name: '财大气粗', effect: '约会消费减半' },
    ],
    difficulty: 3,
    unlockCondition: '首次游玩其他身份后解锁',
    exclusivePlot: '与唯/西御寺家冲突的宿敌线',
  },
  {
    id: 'P5',
    name: '天道新干线',
    description: '转校生神秘身份,属性极端偏科,适合二周目挑战。',
    attributes: { 魅力: 70, 学业: 70, 体力: 70, 社交: 30, 敏感: 80, 声誉: 40 },
    cash: 15000,
    residence: '天道家(旅馆)',
    background:
      '没有人知道他的真名,"天道新干线"只是他来八十八町时随口报的名字。他带着一个行李箱和一台旧相机,说自己"在旅行"。町里的人议论纷纷,女孩子们却被他身上那种说不清的神秘感吸引。他到底是谁?来八十八町做什么?',
    initialRelations: [
      '安田爱美:保育园偶遇,有奇怪的缘分',
      '杉本樱子:医院走廊擦肩而过(隐藏线入口)',
    ],
    traits: [
      { name: '神秘旅客', effect: '隐藏女角(樱子)解锁条件 -50%' },
      { name: '社交生疏', effect: '社交事件收益 -30%,但独处事件 +20%' },
      { name: '谜团体质', effect: '触发隐藏剧情的概率 +15%' },
    ],
    difficulty: 5,
    unlockCondition: '通关任意结局后解锁',
    exclusivePlot: '杉本樱子隐藏线 + 身份之谜主线',
  },
  {
    id: 'P6',
    name: '自定义',
    description: '玩家自定义 6 维属性(总和上限 360),住所/现金自选。',
    attributes: { 魅力: 50, 学业: 50, 体力: 50, 社交: 50, 敏感: 50, 声誉: 50 },
    cash: 5000,
    residence: '自定住所',
    background: '由玩家自行设定的原创身份,属性自由分配,剧情走向完全由玩家书写。',
    initialRelations: [],
    traits: [
      { name: '自由定制', effect: '属性/现金/住所完全自定义' },
      { name: '无身份加成', effect: '无任何专属特性,完全靠操作' },
    ],
    difficulty: 3,
  },
];

/** P6 自定义属性总和上限(6×60=360,与原卡 P1-P5 平均相当) */
export const P6_ATTRIBUTE_SUM_MAX = 360;

// ───────────────────────────────────────────────────────────
//  主聊天(MainChat)
// ───────────────────────────────────────────────────────────

/** 单条聊天消息 */
export interface ChatMessage {
  id: string;
  /** 消息角色(user=玩家输入,assistant=AI 叙事) */
  role: 'user' | 'assistant';
  /** 文本内容(已剥离 <StatusPlaceHolderImpl/> 等占位符) */
  content: string;
  /** 原始文本(含占位符,用于调试) */
  rawContent?: string;
  /** 时间戳 */
  timestamp: number;
  /** 是否正在流式输出 */
  streaming?: boolean;
  /** 是否出错 */
  error?: string;
  /** 该回合的变量变更摘要(可选,UI 显示用) */
  variableChanges?: Array<{ path: string; op: string; before?: unknown; after?: unknown }>;
}

/** MainChat 组件的状态 */
export type MainChatStatus =
  | 'idle'        // 空闲,等待玩家输入
  | 'streaming'   // 流式输出中
  | 'committed'   // 已提交(变量已更新)
  | 'error';      // 出错

// ───────────────────────────────────────────────────────────
//  状态栏(StatusBar)
// ───────────────────────────────────────────────────────────

/** 状态栏分类(schema.ts 顶层 10 个分类,合并展示为 9 个,临时+隐藏合并为"系统") */
export interface StatusCategory {
  /** 分类 key(对应 schema.ts 顶层字段名) */
  key: string;
  /** 显示名 */
  label: string;
  /** 图标(emoji 或字符) */
  icon: string;
  /** 该分类的字段路径列表(用于点击展开详情) */
  paths: string[];
}

/** 单个字段的渲染项(统一 renderRecordItem) */
export interface StatusFieldItem {
  /** 完整路径,如 '主角.魅力' */
  path: string;
  /** 字段名(最后一段) */
  name: string;
  /** 当前值(已格式化) */
  value: unknown;
  /** 字段类型 */
  type: 'number' | 'string' | 'enum' | 'boolean' | 'object' | 'record' | 'unknown';
  /** enum 取值 */
  enumValues?: string[];
  /** 数值范围 */
  min?: number;
  max?: number;
  /** 是否四舍五入(仅 type='number' 时) */
  round?: boolean;
  /** 默认值 */
  prefault?: unknown;
  /** 是否 AI 可写 */
  writable?: boolean;
}

/** StatusBar 选中字段的详情(模态框展示) */
export interface StatusFieldDetail extends StatusFieldItem {
  /** 父分类 key */
  category: string;
  /** 父分类显示名 */
  categoryLabel: string;
}

// ───────────────────────────────────────────────────────────
//  事件(MainChat ↔ StatusBar 通信)
// ───────────────────────────────────────────────────────────

/**
 * 变量更新事件(mag_variable_update_ended 的本地映射)
 * Kernel.commit 成功后,通过 onVariableUpdate 回调推给 StatusBar
 */
export interface VariableUpdateEvent {
  /** 回合 id */
  turnId: string;
  /** 提交前的 stat_data 快照 */
  before: Record<string, unknown>;
  /** 提交后的 stat_data 快照 */
  after: Record<string, unknown>;
  /** 变更字段列表(JSONPatch ops) */
  changes: Array<{
    op: 'add' | 'replace' | 'remove';
    path: string;
    before?: unknown;
    after?: unknown;
  }>;
  /** 新 revision hash */
  revisionHash: string;
  /** 提交时间戳 */
  timestamp: number;
}

// ───────────────────────────────────────────────────────────
//  辅助函数
// ───────────────────────────────────────────────────────────

/** 把任意值格式化为 UI 展示字符串 */
export function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v === '' ? '—' : v;
  if (Array.isArray(v)) return v.length === 0 ? '空' : `[${v.length} 项]`;
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    return keys.length === 0 ? '空' : `{${keys.length} 字段}`;
  }
  return String(v);
}

/** 从 schema 顶层字段名推导 9 个状态栏分类 */
export function deriveStatusCategories(topLevelKeys: string[]): StatusCategory[] {
  const iconMap: Record<string, string> = {
    时间: '🕐',
    场景: '📍',
    主角: '🧑',
    当前女角: '👤',
    技能: '🎯',
    临时: '⚙️',
    经济: '💰',
    性格: '💛',
    隐藏: '🔒',
    女角: '👥',
  };
  return topLevelKeys.map((k) => ({
    key: k,
    label: k,
    icon: iconMap[k] ?? '📄',
    paths: [],
  }));
}
