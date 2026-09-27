/**
 * 回放引擎(阶段3 步骤6)
 *
 * 职责:
 *  - 列出所有历史 revision(save/chat/auto/branch)
 *  - 提取每个 revision 的元数据(天数/时段/回合/地点/当前女角 等)
 *  - 沿父哈希链构建时间线树
 *  - 计算两个 revision 之间的 stat_data diff
 *  - 从任意 revision 创建分支(scope='branch')
 *  - 预览 revision 内容(只读,不修改 kernel 状态)
 *
 * 不做:
 *  - 实际切换 kernel 状态(由 kernel.loadFromRevision 处理)
 *  - UI 渲染(由 ReplayPanel 处理)
 */

import {
  listRevisions,
  getRevision,
  traceRevisionChain,
  createRevision,
  type RevisionRow,
} from '../db/indexeddb';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

/** revision 内容载荷(kernel commit 时写入) */
interface RevisionContent {
  statData?: Record<string, unknown>;
  narrative?: string;
  userAction?: string;
  actionsToday?: number;
  lastActionDay?: number;
  turnCount?: number;
}

/** 从 revision 提取的回放条目 */
export interface ReplayEntry {
  hash: string;
  parentHash: string | null;
  ts: number;
  scope: RevisionRow['scope'];
  label?: string;
  /** 从 stat_data 提取的元数据 */
  meta: ReplayMeta;
  /** 原始 revision 引用(用于详情查看) */
  raw: RevisionRow;
}

/** 从 stat_data 提取的关键元数据(用于时间线展示) */
export interface ReplayMeta {
  day: number;
  date: string;
  timeSlot: string;
  turnCount: number;
  location: string;
  currentHeroine: string;
  money: number;
  mood: number;
  chapter: string;
  /** 玩家行动(简短描述) */
  action: string;
}

/** 两个 revision 之间的 diff */
export interface ReplayDiff {
  /** 新增的字段路径 */
  added: Array<{ path: string; value: unknown }>;
  /** 删除的字段路径 */
  removed: Array<{ path: string; oldValue: unknown }>;
  /** 修改的字段路径 */
  changed: Array<{ path: string; oldValue: unknown; newValue: unknown }>;
  /** 总变化数 */
  totalChanges: number;
}

/** 分支创建结果 */
export interface BranchResult {
  /** 新分支的 revision hash */
  hash: string;
  /** 源 revision hash */
  sourceHash: string;
  /** 创建时间戳 */
  ts: number;
  /** 分支标签 */
  label: string;
}

// ───────────────────────────────────────────────────────────
//  元数据提取辅助
// ───────────────────────────────────────────────────────────

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asNum(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

function asStr(v: unknown, def = ''): string {
  return typeof v === 'string' ? v : def;
}

/** 从 stat_data 提取关键元数据 */
function extractMeta(content: RevisionContent): ReplayMeta {
  const sd = asObj(content.statData);
  const time = asObj(sd.时间);
  const scene = asObj(sd.场景);
  const player = asObj(sd.主角);
  const current = asObj(sd.当前女角);

  return {
    day: asNum(time.天数),
    date: asStr(time.当前日期),
    timeSlot: asStr(time.时段, '早'),
    turnCount: asNum(content.turnCount),
    location: asStr(scene.当前地点, '未知'),
    currentHeroine: asStr(current.姓名, asStr(scene.当前女角名, '无')),
    money: asNum(player.现金),
    mood: asNum(player.心情),
    chapter: asStr(scene.章节, asStr(time.当前日期, '序章')),
    action: asStr(content.userAction, '').slice(0, 80),
  };
}

// ───────────────────────────────────────────────────────────
//  Diff 计算
// ───────────────────────────────────────────────────────────

/** 递归计算两个对象的 diff */
function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  prefix: string,
  acc: ReplayDiff,
): void {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (!(key in oldObj)) {
      acc.added.push({ path, value: newVal });
    } else if (!(key in newObj)) {
      acc.removed.push({ path, oldValue: oldVal });
    } else if (oldVal === newVal) {
      continue;
    } else if (
      oldVal &&
      newVal &&
      typeof oldVal === 'object' &&
      typeof newVal === 'object' &&
      !Array.isArray(oldVal) &&
      !Array.isArray(newVal)
    ) {
      diffObjects(
        oldVal as Record<string, unknown>,
        newVal as Record<string, unknown>,
        path,
        acc,
      );
    } else if (
      Array.isArray(oldVal) &&
      Array.isArray(newVal) &&
      JSON.stringify(oldVal) !== JSON.stringify(newVal)
    ) {
      acc.changed.push({ path, oldValue: oldVal, newValue: newVal });
    } else if (
      typeof oldVal !== 'object' &&
      typeof newVal !== 'object' &&
      oldVal !== newVal
    ) {
      acc.changed.push({ path, oldValue: oldVal, newValue: newVal });
    }
  }
}

// ───────────────────────────────────────────────────────────
//  ReplayEngine 主体
// ───────────────────────────────────────────────────────────

class ReplayEngine {
  /**
   * 列出所有可回放的 revision(按 ts 降序)
   *  - 默认包含所有 scope,可按 scope 过滤
   *  - 提取每个 revision 的元数据
   */
  async listEntries(
    scopeFilter?: RevisionRow['scope'] | 'all',
    limit = 200,
  ): Promise<ReplayEntry[]> {
    const revisions = await listRevisions(
      scopeFilter === 'all' || !scopeFilter ? undefined : scopeFilter,
      limit,
    );

    return revisions.map((rev) => {
      const content = (rev.content ?? {}) as RevisionContent;
      return {
        hash: rev.hash,
        parentHash: rev.parentHash,
        ts: rev.ts,
        scope: rev.scope,
        label: rev.label,
        meta: extractMeta(content),
        raw: rev,
      };
    });
  }

  /**
   * 获取单个 revision 详情(包含完整 stat_data)
   */
  async getEntryDetail(hash: string): Promise<{
    entry: ReplayEntry | null;
    content: RevisionContent | null;
  }> {
    const rev = await getRevision(hash);
    if (!rev) return { entry: null, content: null };
    const content = (rev.content ?? {}) as RevisionContent;
    return {
      entry: {
        hash: rev.hash,
        parentHash: rev.parentHash,
        ts: rev.ts,
        scope: rev.scope,
        label: rev.label,
        meta: extractMeta(content),
        raw: rev,
      },
      content,
    };
  }

  /**
   * 沿父哈希链回溯(从指定 hash 到根)
   *  - 用于展示"血脉"路径
   */
  async traceChain(hash: string): Promise<ReplayEntry[]> {
    const chain = await traceRevisionChain(hash);
    return chain.map((rev) => {
      const content = (rev.content ?? {}) as RevisionContent;
      return {
        hash: rev.hash,
        parentHash: rev.parentHash,
        ts: rev.ts,
        scope: rev.scope,
        label: rev.label,
        meta: extractMeta(content),
        raw: rev,
      };
    });
  }

  /**
   * 计算两个 revision 之间的 stat_data diff
   */
  async diff(
    fromHash: string,
    toHash: string,
  ): Promise<ReplayDiff> {
    const [fromRev, toRev] = await Promise.all([
      getRevision(fromHash),
      getRevision(toHash),
    ]);

    const result: ReplayDiff = {
      added: [],
      removed: [],
      changed: [],
      totalChanges: 0,
    };

    if (!fromRev || !toRev) return result;

    const fromContent = (fromRev.content ?? {}) as RevisionContent;
    const toContent = (toRev.content ?? {}) as RevisionContent;
    const fromSd = asObj(fromContent.statData);
    const toSd = asObj(toContent.statData);

    diffObjects(fromSd, toSd, '', result);
    result.totalChanges = result.added.length + result.removed.length + result.changed.length;
    return result;
  }

  /**
   * 计算指定 revision 与当前 stat_data 的 diff
   *  - 用于"切换到此存档"前预览变化
   */
  async diffFromCurrent(
    targetHash: string,
    currentStatData: Record<string, unknown>,
  ): Promise<ReplayDiff> {
    const targetRev = await getRevision(targetHash);
    if (!targetRev) {
      return { added: [], removed: [], changed: [], totalChanges: 0 };
    }
    const targetContent = (targetRev.content ?? {}) as RevisionContent;
    const targetSd = asObj(targetContent.statData);

    const result: ReplayDiff = {
      added: [],
      removed: [],
      changed: [],
      totalChanges: 0,
    };
    diffObjects(currentStatData, targetSd, '', result);
    result.totalChanges = result.added.length + result.removed.length + result.changed.length;
    return result;
  }

  /**
   * 从指定 revision 创建分支
   *  - 复制源 revision 的内容
   *  - 设置 parentHash=源 hash,scope='branch'
   *  - 返回新分支的 hash
   *  - 注意:不会自动切换到新分支,由调用方决定是否 kernel.loadFromRevision
   */
  async createBranch(
    sourceHash: string,
    label: string,
  ): Promise<BranchResult> {
    const source = await getRevision(sourceHash);
    if (!source) {
      throw new Error(`源 revision 不存在: ${sourceHash}`);
    }

    const branchRev = await createRevision({
      content: source.content,
      parentHash: sourceHash,
      scope: 'branch',
      label,
    });

    return {
      hash: branchRev.hash,
      sourceHash,
      ts: branchRev.ts,
      label,
    };
  }

  /**
   * 按天分组(用于时间线展示)
   *  - 返回 Map<day, ReplayEntry[]>(每天内的 revision 按 ts 升序)
   */
  groupByDay(entries: ReplayEntry[]): Map<number, ReplayEntry[]> {
    const map = new Map<number, ReplayEntry[]>();
    for (const entry of entries) {
      const day = entry.meta.day || 0;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(entry);
    }
    // 每天内部按 ts 升序(时间顺序)
    for (const list of map.values()) {
      list.sort((a, b) => a.ts - b.ts);
    }
    // 按天降序(最近的天在前)
    return new Map(
      [...map.entries()].sort((a, b) => b[0] - a[0]),
    );
  }

  /**
   * 统计信息(用于面板顶部展示)
   */
  getStats(entries: ReplayEntry[]): {
    total: number;
    byScope: Record<RevisionRow['scope'], number>;
    byDay: number;
    earliestTs: number | null;
    latestTs: number | null;
  } {
    const byScope: Record<RevisionRow['scope'], number> = {
      save: 0,
      chat: 0,
      auto: 0,
      branch: 0,
    };
    const days = new Set<number>();
    let earliestTs: number | null = null;
    let latestTs: number | null = null;

    for (const entry of entries) {
      byScope[entry.scope]++;
      if (entry.meta.day > 0) days.add(entry.meta.day);
      if (earliestTs === null || entry.ts < earliestTs) earliestTs = entry.ts;
      if (latestTs === null || entry.ts > latestTs) latestTs = entry.ts;
    }

    return {
      total: entries.length,
      byScope,
      byDay: days.size,
      earliestTs,
      latestTs,
    };
  }
}

/** 单例 */
export const replayEngine = new ReplayEngine();

/** 重新导出类型 */
export type { RevisionRow };
