/**
 * getwi 调度树(Lore Runtime 步骤3)
 *
 * 职责:
 *  - 描述原卡 D0 系统控制器的 getwi 调度链路
 *  - 提供调度树查询接口(用于 Trace 验证 + 防双重加载)
 *  - 与 worldbookSelector 协同:关灯条目由 getwi 加载,选择器跳过
 *
 * 调度树结构(基于原卡 D0系统控制器.txt 的 getwi 调用分析):
 *
 *   D0系统控制器(根)
 *   ├─ EJS预处理/全局规则总表            (必载·规则单一来源)
 *   ├─ EJS预处理/固定物品效果表          (必载·SKU 单一来源)
 *   ├─ EJS预处理/属性技能骰子联动        (必载·calcFinalResult 等)
 *   ├─ EJS预处理/LCG骰子/引擎            (必载·骰子核心)
 *   ├─ EJS预处理/全局规则-NSFW身体规则   (条件·scene_mode=约会/事件)
 *   ├─ EJS预处理/全局规则-技能系统       (条件·scene_mode=上学/打工/事件)
 *   ├─ EJS预处理/寒假日程调度器/_公共时段 (必载)
 *   ├─ EJS预处理/寒假日程调度器/dayXX_MMDD (条件·按 day_count 切换)
 *   ├─ 阶段指导/寒假前奏|寒假核心|寒假尾声|结局阶段 (条件·按 chapter_idx 切换)
 *   ├─ 事件/结局分支矩阵                 (条件·scene_mode=告白 或 day≥17 或 BAD_END)
 *   ├─ 事件/破产结局机制                 (条件·同上)
 *   ├─ EJS预处理/主动事件触发器          (必载·女角主动行动)
 *   └─ D0指令/{上学,打工,约会,事件,休息}模式 (条件·按 scene_mode 切换)
 *
 * 关键原则:
 *  - 关灯条目(enabled=false)只能由 getwi 调度树加载,不被世界书选择器注入
 *  - 同一回合内同一关灯条目只加载一次(由 getwiLoader 缓存保证)
 *  - 调度树路径与原卡 EJS 内 getwi('...') 调用路径完全对齐
 */

import { worldbookSelector } from './worldbook-selector';

// ───────────────────────────────────────────────────────────
//  调度树类型
// ───────────────────────────────────────────────────────────

/** 调度节点类型 */
export type ScheduleNodeType =
  | 'root' // 根节点(D0系统控制器)
  | 'always' // 必载节点(每轮加载)
  | 'conditional' // 条件节点(按 scene_mode/day_count/chapter 触发)
  | 'scene-mode' // 场景模式切换(5 种 D0 指令)
  | 'chapter' // 章节切换(4 种阶段指导)
  | 'schedule' // 寒假日程(17 天)
  | 'event'; // 事件触发(结局矩阵等)

/** 调度节点触发条件 */
export interface ScheduleCondition {
  /** scene_mode(场景模式) */
  sceneMode?: string | string[];
  /** day_count(天数,1-17) */
  dayCount?: number | number[];
  /** chapter_idx(章节,1-4) */
  chapterIdx?: number | number[];
  /** BAD_END 触发 */
  badEndTriggered?: boolean;
  /** 自定义条件描述 */
  custom?: string;
}

/** 调度树节点 */
export interface ScheduleNode {
  /** 节点 ID */
  id: string;
  /** 节点类型 */
  type: ScheduleNodeType;
  /** 显示名(中文) */
  label: string;
  /** getwi 路径(原卡 EJS 内调用路径) */
  getwiPath: string;
  /** 对应的 WorldbookEntry entryKey */
  entryKey: string;
  /** 触发条件(条件节点) */
  condition?: ScheduleCondition;
  /** 子节点(递归) */
  children?: ScheduleNode[];
  /** 是否已加载(运行时状态) */
  loaded?: boolean;
}

/** 调度结果 */
export interface ScheduleResult {
  /** 本轮需要加载的节点列表(按加载顺序) */
  nodes: ScheduleNode[];
  /** 加载追踪(用于 Trace) */
  trace: ScheduleTrace[];
  /** 缺失的条目(未在 worldbookSelector 中找到) */
  missing: string[];
}

/** 调度追踪记录 */
export interface ScheduleTrace {
  nodeId: string;
  label: string;
  getwiPath: string;
  entryKey: string;
  type: ScheduleNodeType;
  conditionMet: boolean;
  reason: string;
}

// ───────────────────────────────────────────────────────────
//  调度树构建(基于原卡 D0系统控制器.txt)
// ───────────────────────────────────────────────────────────

/** D0 调度场景上下文 */
export interface ScheduleContext {
  /** 当前场景模式(上学/打工/约会/事件/休息/告白) */
  sceneMode?: string;
  /** 当前天数(1-17) */
  dayCount?: number;
  /** 当前章节(1-4,自动从 dayCount 推断) */
  chapterIdx?: number;
  /** 是否触发 BAD_END */
  badEndTriggered?: boolean;
  /** 是否需要结局矩阵(scene_mode=告白 或 day≥17 或 BAD_END) */
  needEndingMatrix?: boolean;
}

/** 构建 D0 调度树(静态结构,与原卡 D0系统控制器.txt 对齐) */
function buildScheduleTree(): ScheduleNode {
  const root: ScheduleNode = {
    id: 'd0-root',
    type: 'root',
    label: 'D0系统控制器',
    getwiPath: 'EJS预处理/D0系统控制器',
    entryKey: 'D0系统控制器',
    children: [
      // 1. 必载:全局规则
      {
        id: 'global-rules',
        type: 'always',
        label: '全局规则总表',
        getwiPath: 'EJS预处理/全局规则总表',
        entryKey: '全局规则总表',
      },
      // 2. 必载:固定物品效果表
      {
        id: 'item-effects',
        type: 'always',
        label: '固定物品效果表',
        getwiPath: 'EJS预处理/固定物品效果表',
        entryKey: '固定物品效果表',
      },
      // 2.5 必载:属性技能骰子联动
      {
        id: 'attr-skill-dice',
        type: 'always',
        label: '属性技能骰子联动',
        getwiPath: 'EJS预处理/属性技能骰子联动',
        entryKey: '属性技能骰子联动',
      },
      // 3. 必载:LCG骰子引擎
      {
        id: 'lcg-engine',
        type: 'always',
        label: 'LCG骰子引擎',
        getwiPath: 'EJS预处理/LCG骰子/引擎',
        entryKey: '引擎',
      },
      // 6.5 条件:NSFW身体规则(约会/事件)
      {
        id: 'nsfw-body-rules',
        type: 'conditional',
        label: '全局规则-NSFW身体规则',
        getwiPath: 'EJS预处理/全局规则-NSFW身体规则',
        entryKey: '全局规则-NSFW身体规则',
        condition: { sceneMode: ['约会', '事件'] },
      },
      // 6.5 条件:技能系统(上学/打工/事件)
      {
        id: 'skill-rules',
        type: 'conditional',
        label: '全局规则-技能系统',
        getwiPath: 'EJS预处理/全局规则-技能系统',
        entryKey: '全局规则-技能系统',
        condition: { sceneMode: ['上学', '打工', '事件'] },
      },
      // 11. 必载:寒假日程调度器公共时段
      {
        id: 'schedule-common',
        type: 'always',
        label: '寒假日程调度器/_公共时段',
        getwiPath: 'EJS预处理/寒假日程调度器/_公共时段',
        entryKey: '_公共时段',
      },
      // 11. 条件:寒假日程(按 day_count 切换)
      {
        id: 'schedule-day',
        type: 'schedule',
        label: '寒假日程(按 day_count)',
        getwiPath: 'EJS预处理/寒假日程调度器/day{day}',
        entryKey: 'day{day}',
        condition: { dayCount: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
      },
      // 11.5 条件:阶段指导(按 chapter_idx 切换)
      {
        id: 'chapter-guide',
        type: 'chapter',
        label: '阶段指导(按 chapter_idx)',
        getwiPath: '阶段指导/{chapter}',
        entryKey: '{chapter}',
        condition: { chapterIdx: [1, 2, 3, 4] },
      },
      // 11.6 条件:结局分支矩阵
      {
        id: 'ending-matrix',
        type: 'event',
        label: '事件/结局分支矩阵',
        getwiPath: '事件/结局分支矩阵',
        entryKey: '结局分支矩阵',
        condition: { custom: 'scene_mode=告白 或 day≥17 或 BAD_END' },
      },
      // 11.6 条件:破产结局机制
      {
        id: 'bankruptcy',
        type: 'event',
        label: '事件/破产结局机制',
        getwiPath: '事件/破产结局机制',
        entryKey: '破产结局机制',
        condition: { custom: 'scene_mode=告白 或 day≥17 或 BAD_END' },
      },
      // 11.12 必载:主动事件触发器
      {
        id: 'proactive-events',
        type: 'always',
        label: '主动事件触发器',
        getwiPath: 'EJS预处理/主动事件触发器',
        entryKey: '主动事件触发器',
      },
      // 12. 条件:D0指令(按 scene_mode 切换)
      {
        id: 'd0-instruction',
        type: 'scene-mode',
        label: 'D0指令(按 scene_mode)',
        getwiPath: 'D0指令/{mode}',
        entryKey: '{mode}模式',
        condition: { sceneMode: ['上学', '打工', '约会', '事件', '休息'] },
      },
    ],
  };
  return root;
}

// ───────────────────────────────────────────────────────────
//  GetwiScheduler
// ───────────────────────────────────────────────────────────

/**
 * getwi 调度树管理器
 *  - 维护静态调度树结构
 *  - 按上下文解析需要加载的节点
 *  - 验证关灯条目可被 getwi 加载器找到
 *  - 提供 Trace 用于排错
 */
export class GetwiScheduler {
  /** 静态调度树 */
  private tree: ScheduleNode;
  /** entryKey → ScheduleNode 索引 */
  private nodeIndex = new Map<string, ScheduleNode>();

  constructor() {
    this.tree = buildScheduleTree();
    this.indexTree(this.tree);
  }

  /** 递归构建 entryKey → ScheduleNode 索引 */
  private indexTree(node: ScheduleNode): void {
    // 模板 entryKey(如 day{day}/{chapter}/{mode})不入索引
    if (!node.entryKey.includes('{')) {
      this.nodeIndex.set(node.entryKey, node);
    }
    if (node.children) {
      for (const child of node.children) {
        this.indexTree(child);
      }
    }
  }

  /** 获取调度树(用于 UI 可视化) */
  getTree(): ScheduleNode {
    return this.tree;
  }

  /** 按 entryKey 获取调度节点 */
  getByEntryKey(entryKey: string): ScheduleNode | null {
    return this.nodeIndex.get(entryKey) ?? null;
  }

  /**
   * 按上下文调度需要加载的节点
   *  - 解析条件节点(scene_mode/day_count/chapter)
   *  - 模板 entryKey(day{day}/{chapter}/{mode})按上下文展开为具体路径
   *  - 返回需要加载的节点列表(按 D0 执行顺序)
   */
  schedule(ctx: ScheduleContext): ScheduleResult {
    const nodes: ScheduleNode[] = [];
    const trace: ScheduleTrace[] = [];
    const missing: string[] = [];

    // 推断 chapter_idx(若未指定)
    const dayCount = ctx.dayCount ?? 1;
    const chapterIdx = ctx.chapterIdx ?? this.inferChapter(dayCount);
    const sceneMode = ctx.sceneMode ?? '休息';
    const needEnding = ctx.needEndingMatrix ?? (sceneMode === '告白' || dayCount >= 17 || Boolean(ctx.badEndTriggered));

    // 遍历根节点的子节点
    const children = this.tree.children ?? [];
    for (const node of children) {
      const evalResult = this.evaluateNode(node, {
        sceneMode,
        dayCount,
        chapterIdx,
        needEnding,
        badEndTriggered: Boolean(ctx.badEndTriggered),
      });

      if (evalResult.shouldLoad) {
        // 展开模板 entryKey
        const expanded = this.expandTemplate(node, { dayCount, chapterIdx, sceneMode });
        nodes.push(expanded);

        // 验证对应 WorldbookEntry 是否存在
        const entry = worldbookSelector.getByEntryKey(expanded.entryKey);
        if (!entry && !expanded.entryKey.includes('{')) {
          missing.push(expanded.entryKey);
        }

        trace.push({
          nodeId: expanded.id,
          label: expanded.label,
          getwiPath: expanded.getwiPath,
          entryKey: expanded.entryKey,
          type: expanded.type,
          conditionMet: true,
          reason: evalResult.reason,
        });
      } else {
        trace.push({
          nodeId: node.id,
          label: node.label,
          getwiPath: node.getwiPath,
          entryKey: node.entryKey,
          type: node.type,
          conditionMet: false,
          reason: evalResult.reason,
        });
      }
    }

    return { nodes, trace, missing };
  }

  /** 评估节点是否应加载 */
  private evaluateNode(
    node: ScheduleNode,
    ctx: { sceneMode: string; dayCount: number; chapterIdx: number; needEnding: boolean; badEndTriggered: boolean },
  ): { shouldLoad: boolean; reason: string } {
    switch (node.type) {
      case 'root':
      case 'always':
        return { shouldLoad: true, reason: 'always-load' };

      case 'conditional': {
        if (!node.condition) return { shouldLoad: true, reason: 'no-condition' };
        if (node.condition.sceneMode) {
          const modes = Array.isArray(node.condition.sceneMode)
            ? node.condition.sceneMode
            : [node.condition.sceneMode];
          if (modes.includes(ctx.sceneMode)) {
            return { shouldLoad: true, reason: `scene-mode-match:${ctx.sceneMode}` };
          }
          return { shouldLoad: false, reason: `scene-mode-mismatch:${ctx.sceneMode}` };
        }
        return { shouldLoad: true, reason: 'conditional-default' };
      }

      case 'schedule': {
        // 寒假日程:始终加载(按 day_count 展开)
        return { shouldLoad: true, reason: `schedule-day:${ctx.dayCount}` };
      }

      case 'chapter': {
        // 阶段指导:始终加载(按 chapter_idx 展开)
        return { shouldLoad: true, reason: `chapter:${ctx.chapterIdx}` };
      }

      case 'event': {
        // 事件:结局矩阵/破产机制
        if (ctx.needEnding) {
          return { shouldLoad: true, reason: 'ending-matrix-needed' };
        }
        return { shouldLoad: false, reason: 'ending-matrix-not-needed' };
      }

      case 'scene-mode': {
        // D0 指令:始终加载(按 scene_mode 展开)
        return { shouldLoad: true, reason: `d0-instruction:${ctx.sceneMode}` };
      }

      default:
        return { shouldLoad: false, reason: 'unknown-type' };
    }
  }

  /** 展开模板 entryKey(如 day{day} → day01_1222) */
  private expandTemplate(
    node: ScheduleNode,
    ctx: { dayCount: number; chapterIdx: number; sceneMode: string },
  ): ScheduleNode {
    if (!node.entryKey.includes('{')) {
      return { ...node, loaded: false };
    }

    // 寒假日程:day{day} → day01_1222
    if (node.id === 'schedule-day') {
      const dayKey = this.dayCountToKey(ctx.dayCount);
      return {
        ...node,
        entryKey: dayKey,
        getwiPath: `EJS预处理/寒假日程调度器/${dayKey}`,
        label: `寒假日程/${dayKey}`,
        loaded: false,
      };
    }

    // 阶段指导:{chapter} → 寒假前奏|寒假核心|寒假尾声|结局阶段
    if (node.id === 'chapter-guide') {
      const chapterName = this.chapterIdxToName(ctx.chapterIdx);
      return {
        ...node,
        entryKey: chapterName,
        getwiPath: `阶段指导/${chapterName}`,
        label: `阶段指导/${chapterName}`,
        loaded: false,
      };
    }

    // D0指令:{mode} → 上学模式|打工模式|约会模式|事件模式|休息模式
    if (node.id === 'd0-instruction') {
      const modeName = `${ctx.sceneMode}模式`;
      return {
        ...node,
        entryKey: modeName,
        getwiPath: `D0指令/${modeName}`,
        label: `D0指令/${modeName}`,
        loaded: false,
      };
    }

    return { ...node, loaded: false };
  }

  /** day_count → dayXX_MMDD(原卡寒假日程文件名) */
  private dayCountToKey(dayCount: number): string {
    const map: Record<number, string> = {
      1: 'day01_1222',
      2: 'day02_1223',
      3: 'day03_1224',
      4: 'day04_1225',
      5: 'day05_1226',
      6: 'day06_1227',
      7: 'day07_1228',
      8: 'day08_1229',
      9: 'day09_1230',
      10: 'day10_1231',
      11: 'day11_0101',
      12: 'day12_0102',
      13: 'day13_0103',
      14: 'day14_0104',
      15: 'day15_0105',
      16: 'day16_0106',
      17: 'day17_0107',
    };
    return map[dayCount] || 'day01_1222';
  }

  /** chapter_idx → 章节名 */
  private chapterIdxToName(chapterIdx: number): string {
    const map: Record<number, string> = {
      1: '寒假前奏',
      2: '寒假核心',
      3: '寒假尾声',
      4: '结局阶段',
    };
    return map[chapterIdx] || '寒假前奏';
  }

  /** day_count → chapter_idx(与原卡 D0 控制器逻辑对齐) */
  private inferChapter(dayCount: number): number {
    if (dayCount <= 5) return 1;
    if (dayCount <= 12) return 2;
    if (dayCount <= 16) return 3;
    return 4;
  }

  /**
   * 验证调度树所有节点对应的关灯条目可被 getwi 加载器找到
   *  - 用于启动时自检
   *  - 返回缺失条目列表
   */
  validateOffLightEntries(): { ok: boolean; missing: string[]; total: number } {
    const all = this.flattenTree(this.tree);
    const missing: string[] = [];
    let count = 0;
    for (const node of all) {
      if (node.entryKey.includes('{')) continue; // 跳过模板
      count++;
      const entry = worldbookSelector.getByEntryKey(node.entryKey);
      if (!entry) {
        missing.push(`${node.entryKey} (${node.getwiPath})`);
      }
    }
    return { ok: missing.length === 0, missing, total: count };
  }

  /** 扁平化调度树 */
  private flattenTree(node: ScheduleNode): ScheduleNode[] {
    const result: ScheduleNode[] = [node];
    if (node.children) {
      for (const child of node.children) {
        result.push(...this.flattenTree(child));
      }
    }
    return result;
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const getwiScheduler = new GetwiScheduler();
