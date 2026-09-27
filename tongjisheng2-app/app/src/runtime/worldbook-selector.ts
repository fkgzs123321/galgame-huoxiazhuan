/**
 * 世界书选择器(Lore Runtime 步骤3)
 *
 * 职责:
 *  - 解析原卡 index.yaml 提取全部世界书条目元数据(190 条目)
 *  - 按 constant(蓝灯+enabled=true)/selective(关键词触发)/at_depth(指定深度)策略筛选
 *  - 识别"关灯"条目(enabled=false + @@generate_before):由 getwi 加载器精准调用,不被选择器注入
 *  - 提供按 position/depth/role 分组的查询接口
 *  - 递归纪律:selective 触发的条目不再被 getwi 重复拉取(避免双重加载)
 *
 * 数据来源:
 *  - app/src/content/card/index.yaml(原卡 manifest,包含 条目/激活策略/插入位置/递归 等字段)
 *  - 配合 contentLoader 加载条目实际内容
 *
 * 原卡策略映射:
 *  - 蓝灯 + enabled=true  → constant(每轮注入)
 *  - 蓝灯 + enabled=false → "关灯"条目(由 D0 控制器 getwi 加载,不参与选择器注入)
 *  - 关键词 + enabled=true → selective(关键词触发,递归扫描)
 *  - 指定深度 → at_depth(按 depth 注入,角色/顺序由 position 指定)
 *  - 注:原卡 index.yaml 中所有条目策略均为"蓝灯",但通过 enabled=false 实现"关灯"语义
 *      独立应用保留此语义,并扩展支持 selective/at_depth 策略(供未来扩展或 MOD 使用)
 */

import YAML from 'yaml';
import { contentLoader } from '@content/content-loader';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

/** 激活策略类型 */
export type StrategyType = 'constant' | 'selective' | 'vectorized' | 'constant_selective';

/** 插入位置类型 */
export type PositionType =
  | 'before_character_definition'
  | 'after_character_definition'
  | 'before_example_messages'
  | 'after_example_messages'
  | 'before_author_note'
  | 'after_author_note'
  | 'at_depth';

/** 消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant';

/** 关键词匹配逻辑 */
export type KeyLogic = 'and_all' | 'and_any' | 'not_all' | 'not_any';

/** 次要关键词组 */
export interface SecondaryKeys {
  logic: KeyLogic;
  keys: string[];
}

/** 激活策略 */
export interface WorldbookStrategy {
  type: StrategyType;
  /** 主关键词(selective 模式触发词) */
  keys?: string[];
  /** 次要关键词(主匹配后的二次过滤) */
  keys_secondary?: SecondaryKeys;
  /** 扫描深度(默认 same_as_global) */
  scan_depth?: 'same_as_global' | number;
}

/** 插入位置 */
export interface WorldbookPosition {
  type: PositionType;
  role?: MessageRole;
  depth?: number;
  /** 排序权重,数字越小越先注入 */
  order: number;
}

/** 递归控制 */
export interface WorldbookRecursion {
  prevent_incoming: boolean;
  prevent_outgoing: boolean;
  delay_until?: number | null;
}

/** 时间效果 */
export interface WorldbookEffect {
  sticky?: number;
  cooldown?: number;
  delay?: number;
}

/** 组交互 */
export interface WorldbookGroup {
  labels: string[];
  use_priority?: boolean;
  weight?: number;
  use_scoring?: boolean;
}

/** 世界书条目(运行时视图) */
export interface WorldbookEntry {
  /** 条目名 */
  name: string;
  /** 文件路径(原卡相对路径,如 "世界书/EJS预处理/全局规则总表") */
  file: string;
  /** entryKey(用于 contentLoader 查询,如 "全局规则总表") */
  entryKey: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否为"关灯"条目(enabled=false + 由 getwi 加载) */
  isOffLight: boolean;
  /** 激活策略 */
  strategy: WorldbookStrategy;
  /** 插入位置 */
  position: WorldbookPosition;
  /** 递归控制 */
  recursion: WorldbookRecursion;
  /** 时间效果(可选) */
  effect?: WorldbookEffect;
  /** 组交互(可选) */
  group?: WorldbookGroup;
  /** 激活概率(0-100,默认 100) */
  probability?: number;
  /** 所属文件夹(原卡分类,如 "EJS预处理"/"扮演准则"/"变量" 等) */
  folder: string;
  /** 加载的内容(懒加载,调用 getContent 后填充) */
  content?: string;
}

/** 选择上下文 */
export interface SelectionContext {
  /** 当前聊天历史(用于 selective 关键词扫描) */
  chatHistory?: string[];
  /** 关键词扫描深度(默认 0 = 全部历史) */
  scanDepth?: number;
  /** 当前注入深度(用于 at_depth 匹配) */
  currentDepth?: number;
  /** 已激活条目集合(用于递归纪律,避免重复激活) */
  activatedSet?: Set<string>;
}

/** 选择结果 */
export interface SelectionResult {
  /** 命中的条目(before_char + at_depth 分别排序) */
  beforeChar: WorldbookEntry[];
  afterChar: WorldbookEntry[];
  atDepth: WorldbookEntry[];
  /** 关灯条目(供 getwi 加载器使用) */
  offLight: WorldbookEntry[];
  /** 选择追踪(用于 Trace 验证) */
  trace: SelectionTrace[];
}

/** 选择追踪记录 */
export interface SelectionTrace {
  entryName: string;
  folder: string;
  strategy: StrategyType;
  position: PositionType;
  order: number;
  depth?: number;
  reason: 'constant' | 'selective-hit' | 'at-depth-match' | 'off-light' | 'probability-fail' | 'recursion-blocked' | 'disabled';
  keywordsHit?: string[];
}

// ───────────────────────────────────────────────────────────
//  YAML 解析(从 index.yaml 提取条目元数据)
// ───────────────────────────────────────────────────────────

/** index.yaml 原始结构(部分字段) */
interface RawIndexYaml {
  条目?: Array<{
    文件夹: string;
    条目: Array<{
      名称: string;
      启用: boolean;
      激活策略?: {
        类型: string; // "蓝灯" / "选择性" / "关键词" 等
        关键词?: string[];
        次要关键词?: { logic: string; keys: string[] };
        扫描深度?: number | string;
      };
      插入位置: {
        类型: string; // "角色定义之前" / "角色定义之后" / "指定深度"
        角色?: string; // "系统" / "用户" / "助手"
        深度?: number;
        顺序: number;
      };
      递归?: {
        不可被其他条目激活: boolean;
        不可激活其他条目: boolean;
        延迟到第n级?: number | null;
      };
      效果?: {
        持续n条?: number;
        冷却n条?: number;
        延迟n条?: number;
      };
      组?: {
        标签: string[];
        使用优先级?: boolean;
        权重?: number;
        使用评分?: boolean;
      };
      概率?: number;
      文件: string;
    }>;
  }>;
}

/** 从 contentLoader 加载 index.yaml 原文 */
function loadIndexYamlRaw(): string {
  return contentLoader.getRaw('card/index.yaml');
}

/** 解析 strategy.type 中文 → 标准 enum */
function parseStrategyType(raw: string | undefined): StrategyType {
  if (!raw) return 'constant';
  switch (raw) {
    case '蓝灯':
    case '常驻':
    case 'constant':
      return 'constant';
    case '选择性':
    case '关键词':
    case 'selective':
      return 'selective';
    case '向量化':
    case 'vectorized':
      return 'vectorized';
    case '常驻_选择性':
    case 'constant_selective':
      return 'constant_selective';
    default:
      return 'constant';
  }
}

/** 解析 position.type 中文 → 标准 enum */
function parsePositionType(raw: string): PositionType {
  switch (raw) {
    case '角色定义之前':
      return 'before_character_definition';
    case '角色定义之后':
      return 'after_character_definition';
    case '示例对话之前':
      return 'before_example_messages';
    case '示例对话之后':
      return 'after_example_messages';
    case '作者备注之前':
      return 'before_author_note';
    case '作者备注之后':
      return 'after_author_note';
    case '指定深度':
      return 'at_depth';
    default:
      return 'before_character_definition';
  }
}

/** 解析 role 中文 → 标准 enum */
function parseRole(raw: string | undefined): MessageRole {
  switch (raw) {
    case '系统':
    case 'system':
      return 'system';
    case '用户':
    case 'user':
      return 'user';
    case '助手':
    case 'assistant':
      return 'assistant';
    default:
      return 'system';
  }
}

/** 解析关键词逻辑中文 → 标准 enum */
function parseKeyLogic(raw: string | undefined): KeyLogic {
  switch (raw) {
    case '全部出现':
    case 'and_all':
      return 'and_all';
    case '任一出现':
    case 'and_any':
      return 'and_any';
    case '全部不出现':
    case 'not_all':
      return 'not_all';
    case '任一不出现':
    case 'not_any':
      return 'not_any';
    default:
      return 'and_any';
  }
}

/** 从原卡文件路径推断 entryKey */
function inferEntryKey(file: string): string {
  // "世界书/EJS预处理/全局规则总表" → "全局规则总表"
  // "世界书/扮演准则/防口胡" → "防口胡"
  // "世界书/变量/变量列表" → "变量列表"
  const segs = file.split('/').filter(Boolean);
  return segs[segs.length - 1] || file;
}

// ───────────────────────────────────────────────────────────
//  WorldbookSelector
// ───────────────────────────────────────────────────────────

/**
 * 世界书选择器
 *  - 单例,模块加载时解析 index.yaml 一次
 *  - 提供 select() 方法按上下文筛选条目
 *  - 提供 getEnabled/getOffLight/getByEntryKey 等便捷查询
 */
export class WorldbookSelector {
  /** 全部条目(解析后) */
  private entries: WorldbookEntry[] = [];
  /** entryKey → WorldbookEntry 索引 */
  private byEntryKey = new Map<string, WorldbookEntry>();
  /** 是否已初始化 */
  private initialized = false;
  /** 解析错误(若有) */
  private initError: string | null = null;

  /** 初始化(解析 index.yaml) */
  private ensureInit(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const raw = loadIndexYamlRaw();
      const parsed = YAML.parse(raw) as RawIndexYaml;
      if (!parsed || !Array.isArray(parsed.条目)) {
        this.initError = 'index.yaml 缺少 条目 字段或格式错误';
        return;
      }
      for (const folder of parsed.条目) {
        if (!folder || !Array.isArray(folder.条目)) continue;
        for (const item of folder.条目) {
          const entry = this.normalizeEntry(item, folder.文件夹);
          this.entries.push(entry);
          this.byEntryKey.set(entry.entryKey, entry);
        }
      }
    } catch (e) {
      this.initError = e instanceof Error ? e.message : String(e);
    }
  }

  /** 把原始 YAML 条目规范化为 WorldbookEntry */
  private normalizeEntry(
    item: NonNullable<NonNullable<RawIndexYaml['条目']>[number]['条目']>[number],
    folderName: string,
  ): WorldbookEntry {
    const enabled = Boolean(item.启用);
    const strategyType = parseStrategyType(item.激活策略?.类型);
    const positionType = parsePositionType(item.插入位置?.类型);
    const role = item.插入位置?.角色 ? parseRole(item.插入位置.角色) : undefined;
    const depth = typeof item.插入位置?.深度 === 'number' ? item.插入位置.深度 : undefined;
    const order = Number(item.插入位置?.顺序) || 0;

    // 关灯识别:enabled=false 且策略为蓝灯(原卡约定)
    // 原卡 EJS 预处理条目均通过 enabled=false + @@generate_before 实现"关灯",由 getwi 加载
    const isOffLight = !enabled && strategyType === 'constant';

    // entryKey 推断(优先用文件末段)
    const entryKey = inferEntryKey(item.文件 || item.名称);

    return {
      name: item.名称,
      file: item.文件 || item.名称,
      entryKey,
      enabled,
      isOffLight,
      strategy: {
        type: strategyType,
        keys: item.激活策略?.关键词,
        keys_secondary: item.激活策略?.次要关键词
          ? {
              logic: parseKeyLogic(item.激活策略.次要关键词.logic),
              keys: item.激活策略.次要关键词.keys || [],
            }
          : undefined,
        scan_depth:
          typeof item.激活策略?.扫描深度 === 'number'
            ? item.激活策略.扫描深度
            : 'same_as_global',
      },
      position: {
        type: positionType,
        role,
        depth,
        order,
      },
      recursion: {
        prevent_incoming: Boolean(item.递归?.不可被其他条目激活),
        prevent_outgoing: Boolean(item.递归?.不可激活其他条目),
        delay_until: item.递归?.延迟到第n级 ?? null,
      },
      effect: item.效果
        ? {
            sticky: item.效果.持续n条,
            cooldown: item.效果.冷却n条,
            delay: item.效果.延迟n条,
          }
        : undefined,
      group: item.组
        ? {
            labels: item.组.标签 || [],
            use_priority: item.组.使用优先级,
            weight: item.组.权重,
            use_scoring: item.组.使用评分,
          }
        : undefined,
      probability: typeof item.概率 === 'number' ? item.概率 : 100,
      folder: folderName,
    };
  }

  /** 全部条目 */
  getAll(): WorldbookEntry[] {
    this.ensureInit();
    return [...this.entries];
  }

  /** 按 entryKey 获取 */
  getByEntryKey(entryKey: string): WorldbookEntry | null {
    this.ensureInit();
    return this.byEntryKey.get(entryKey) ?? null;
  }

  /** 全部启用条目(enabled=true) */
  getEnabled(): WorldbookEntry[] {
    this.ensureInit();
    return this.entries.filter((e) => e.enabled);
  }

  /** 全部关灯条目(enabled=false + constant,由 getwi 加载) */
  getOffLight(): WorldbookEntry[] {
    this.ensureInit();
    return this.entries.filter((e) => e.isOffLight);
  }

  /** 按 folder 获取 */
  getByFolder(folder: string): WorldbookEntry[] {
    this.ensureInit();
    return this.entries.filter((e) => e.folder === folder);
  }

  /** 按 position.type 获取 */
  getByPosition(positionType: PositionType): WorldbookEntry[] {
    this.ensureInit();
    return this.entries
      .filter((e) => e.enabled && e.position.type === positionType)
      .sort((a, b) => a.position.order - b.position.order);
  }

  /** 获取指定深度的条目 */
  getAtDepth(depth: number): WorldbookEntry[] {
    this.ensureInit();
    return this.entries
      .filter(
        (e) =>
          e.enabled &&
          e.position.type === 'at_depth' &&
          e.position.depth === depth,
      )
      .sort((a, b) => a.position.order - b.position.order);
  }

  /** 初始化错误(若有) */
  getInitError(): string | null {
    this.ensureInit();
    return this.initError;
  }

  /** 条目总数 */
  get totalEntries(): number {
    this.ensureInit();
    return this.entries.length;
  }

  /** 启用条目数 */
  get enabledCount(): number {
    this.ensureInit();
    return this.entries.filter((e) => e.enabled).length;
  }

  /** 关灯条目数 */
  get offLightCount(): number {
    this.ensureInit();
    return this.entries.filter((e) => e.isOffLight).length;
  }

  // ─────────────────────────────────────────────────────────
  //  选择方法
  // ─────────────────────────────────────────────────────────

  /**
   * 按上下文选择条目
   *  - constant + enabled=true:始终注入(before_char / after_char / at_depth 分组)
   *  - selective + enabled=true:关键词命中时注入(扫描 chatHistory)
   *  - 关灯条目(enabled=false):不入选择结果,由 getwi 加载器单独调用
   *  - 递归纪律:已激活条目集合阻止重复激活
   *  - 概率:probability < 100 时按概率决定是否注入
   */
  select(ctx: SelectionContext = {}): SelectionResult {
    this.ensureInit();
    const trace: SelectionTrace[] = [];
    const beforeChar: WorldbookEntry[] = [];
    const afterChar: WorldbookEntry[] = [];
    const atDepth: WorldbookEntry[] = [];
    const offLight: WorldbookEntry[] = [];
    const activated = ctx.activatedSet ?? new Set<string>();
    const scanText = (ctx.chatHistory ?? []).join('\n');

    for (const entry of this.entries) {
      // 关灯条目:不入选择结果,单独归类
      if (entry.isOffLight) {
        offLight.push(entry);
        trace.push({
          entryName: entry.name,
          folder: entry.folder,
          strategy: entry.strategy.type,
          position: entry.position.type,
          order: entry.position.order,
          depth: entry.position.depth,
          reason: 'off-light',
        });
        continue;
      }

      // 禁用条目(非关灯):跳过
      if (!entry.enabled) {
        trace.push({
          entryName: entry.name,
          folder: entry.folder,
          strategy: entry.strategy.type,
          position: entry.position.type,
          order: entry.position.order,
          depth: entry.position.depth,
          reason: 'disabled',
        });
        continue;
      }

      // 递归纪律:已被激活过则跳过
      if (activated.has(entry.entryKey)) {
        trace.push({
          entryName: entry.name,
          folder: entry.folder,
          strategy: entry.strategy.type,
          position: entry.position.type,
          order: entry.position.order,
          depth: entry.position.depth,
          reason: 'recursion-blocked',
        });
        continue;
      }

      // 策略判定
      let shouldActivate = false;
      let keywordsHit: string[] | undefined;

      if (entry.strategy.type === 'constant' || entry.strategy.type === 'constant_selective') {
        shouldActivate = true;
      } else if (entry.strategy.type === 'selective') {
        const hitResult = this.matchKeywords(entry, scanText);
        shouldActivate = hitResult.hit;
        keywordsHit = hitResult.hits;
      } else if (entry.strategy.type === 'vectorized') {
        // 向量化策略需要嵌入模型,本应用暂不支持,降级为 constant
        shouldActivate = true;
      }

      if (!shouldActivate) {
        trace.push({
          entryName: entry.name,
          folder: entry.folder,
          strategy: entry.strategy.type,
          position: entry.position.type,
          order: entry.position.order,
          depth: entry.position.depth,
          reason: 'selective-hit',
          keywordsHit,
        });
        continue;
      }

      // 概率检查
      const prob = entry.probability ?? 100;
      if (prob < 100 && Math.random() * 100 > prob) {
        trace.push({
          entryName: entry.name,
          folder: entry.folder,
          strategy: entry.strategy.type,
          position: entry.position.type,
          order: entry.position.order,
          depth: entry.position.depth,
          reason: 'probability-fail',
        });
        continue;
      }

      // 分组归类
      switch (entry.position.type) {
        case 'before_character_definition':
          beforeChar.push(entry);
          break;
        case 'after_character_definition':
          afterChar.push(entry);
          break;
        case 'at_depth':
          atDepth.push(entry);
          break;
        default:
          beforeChar.push(entry);
      }

      activated.add(entry.entryKey);
      trace.push({
        entryName: entry.name,
        folder: entry.folder,
        strategy: entry.strategy.type,
        position: entry.position.type,
        order: entry.position.order,
        depth: entry.position.depth,
        reason: entry.strategy.type === 'selective' ? 'selective-hit' : 'constant',
        keywordsHit,
      });
    }

    // 排序:order 升序
    beforeChar.sort((a, b) => a.position.order - b.position.order);
    afterChar.sort((a, b) => a.position.order - b.position.order);
    atDepth.sort((a, b) => a.position.order - b.position.order);

    return { beforeChar, afterChar, atDepth, offLight, trace };
  }

  /**
   * 关键词匹配(selective 策略)
   *  - 主关键词:任一命中即触发
   *  - 次要关键词:按 logic(and_all/and_any/not_all/not_any)过滤
   *  - 扫描深度:若指定 scan_depth,只扫描最近 N 条消息
   */
  private matchKeywords(entry: WorldbookEntry, scanText: string): { hit: boolean; hits: string[] } {
    const primaryKeys = entry.strategy.keys ?? [];
    if (primaryKeys.length === 0) {
      return { hit: false, hits: [] };
    }

    const hits: string[] = [];
    let primaryHit = false;
    for (const k of primaryKeys) {
      if (scanText.includes(k)) {
        primaryHit = true;
        hits.push(k);
      }
    }
    if (!primaryHit) {
      return { hit: false, hits: [] };
    }

    // 次要关键词过滤
    const sec = entry.strategy.keys_secondary;
    if (!sec || sec.keys.length === 0) {
      return { hit: true, hits };
    }

    const secHits = sec.keys.filter((k) => scanText.includes(k));
    let secondaryPass = false;
    switch (sec.logic) {
      case 'and_all':
        secondaryPass = sec.keys.every((k) => scanText.includes(k));
        break;
      case 'and_any':
        secondaryPass = secHits.length > 0;
        break;
      case 'not_all':
        secondaryPass = secHits.length === 0;
        break;
      case 'not_any':
        secondaryPass = !sec.keys.some((k) => scanText.includes(k));
        break;
    }
    return { hit: secondaryPass, hits: hits.concat(secHits) };
  }

  /**
   * 按条目名加载内容(供 getwi 调度树使用)
   *  - 从 contentLoader 取条目,返回 ContentEntry.content
   *  - 失败时返回 null
   */
  loadContent(entryKey: string): string | null {
    const entry = this.getByEntryKey(entryKey);
    if (!entry) return null;
    // 先用 entryKey 查,再用 name 兜底
    const content = contentLoader.getByEntryKey(entryKey) ?? contentLoader.getByName(entry.name);
    return content?.content ?? null;
  }

  /** 统计信息(用于 UI 显示) */
  stats(): {
    total: number;
    enabled: number;
    offLight: number;
    byFolder: Record<string, number>;
    byPosition: Record<string, number>;
  } {
    this.ensureInit();
    const byFolder: Record<string, number> = {};
    const byPosition: Record<string, number> = {};
    for (const e of this.entries) {
      byFolder[e.folder] = (byFolder[e.folder] || 0) + 1;
      byPosition[e.position.type] = (byPosition[e.position.type] || 0) + 1;
    }
    return {
      total: this.entries.length,
      enabled: this.enabledCount,
      offLight: this.offLightCount,
      byFolder,
      byPosition,
    };
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const worldbookSelector = new WorldbookSelector();
