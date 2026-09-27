/**
 * Recovery(步骤8:重开一致性 + 失败恢复)
 *
 * 职责:
 *  - 重开恢复:从最新 revision 恢复 Kernel 状态(stat_data + 历史指针 + 元数据)
 *  - 一致性校验:检查 stat_data/历史/chatSheets/NPC 状态是否对齐
 *  - 失败恢复报告:模型失败/解析失败时,生成可重试的报告
 *  - 历史快照:列出最近 chat revision(用于时间线 UI 与 trace)
 *  - 孤儿清理:清理无 parent 且非根的脏 revision
 *
 * 设计要点:
 *  - 重开优先恢复"当前指针"指向的 revision;若指针丢失,回退到最新 chat/save revision
 *  - 一致性校验只读不写,只产出报告
 *  - 失败恢复不修改 Kernel 状态(由 Kernel.rollback 处理)
 *
 * 不做:
 *  - 自动存档(由 Kernel.commit 完成)
 *  - UI 渲染(由 SaveRecovery.tsx)
 */

import * as idb from '@db/indexeddb';
import type { Kernel, StreamDraft } from './kernel';
import { schemaRegistry } from './schema-loader';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** 重开恢复报告 */
export interface RecoveryReport {
  /** 是否恢复成功 */
  ok: boolean;
  /** 恢复到的 revision hash(null 表示无可恢复) */
  restoredHash: string | null;
  /** 恢复的 stat_data */
  statData: Record<string, unknown>;
  /** 恢复的回合计数 */
  turnCount: number;
  /** 今日行动次数 */
  actionsToday: number;
  /** 最近行动日 */
  lastActionDay: number;
  /** 历史消息数(chat revision 链长度) */
  historyCount: number;
  /** chatSheets 行数 */
  chatSheetsCount: number;
  /** NPC 状态缓存数 */
  npcStateCount: number;
  /** 警告(不阻塞) */
  warnings: string[];
  /** 错误(阻塞) */
  errors: string[];
  /** 恢复来源(指针有效=ptr / 指针失效降级=fallback / 无存档=empty) */
  source: 'ptr' | 'fallback' | 'empty';
}

/** 一致性校验结果 */
export interface ConsistencyCheck {
  /** 是否全部通过 */
  ok: boolean;
  /** 各项检查 */
  checks: Array<{
    /** 检查名 */
    name: string;
    /** 是否通过 */
    ok: boolean;
    /** 详情/原因 */
    detail?: string;
  }>;
}

/** 失败恢复报告 */
export interface FailureReport {
  /** 错误类型 */
  type: 'model-fail' | 'parse-fail' | 'zod-fail' | 'idb-fail' | 'unknown';
  /** 错误信息 */
  error: string;
  /** 保留的 StreamDraft(用于 UI 显示未完成的回合) */
  draft: StreamDraft | null;
  /** 是否可重试 */
  canRetry: boolean;
  /** 推荐处理 */
  recommendation: 'retry' | 'fallback-model' | 'rollback' | 'abort';
  /** 详细 trace */
  details: string[];
}

/** 历史快照项 */
export interface HistorySnapshot {
  /** revision hash */
  hash: string;
  /** 父 revision hash */
  parentHash: string | null;
  /** 创建时间戳 */
  ts: number;
  /** scope */
  scope: 'save' | 'chat' | 'auto' | 'branch';
  /** 标签 */
  label?: string;
  /** 玩家动作(预览) */
  userAction?: string;
  /** 叙事正文(预览,截断) */
  narrativePreview?: string;
  /** 回合数 */
  turnCount?: number;
  /** 是否为当前指针 */
  isCurrent: boolean;
}

// ───────────────────────────────────────────────────────────
//  Recovery 类
// ───────────────────────────────────────────────────────────

const CURRENT_REVISION_KEY = '__current_revision__';

class Recovery {
  // ─────────────────────────────────────────────────────────
  //  重开恢复
  // ─────────────────────────────────────────────────────────

  /**
   * 重开时从最新 revision 恢复
   *  - 优先读取 KV 指针(__current_revision__)
   *  - 若指针失效,降级到最新 chat/save revision
   *  - 若全空,返回 empty 来源
   *  - 调用 Kernel.loadFromRevision 替换状态
   */
  async recoverFromLatest(kernel: Kernel): Promise<RecoveryReport> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let restoredHash: string | null = null;
    let statData: Record<string, unknown> = {};
    let turnCount = 0;
    let actionsToday = 0;
    let lastActionDay = 1;
    let historyCount = 0;
    let chatSheetsCount = 0;
    let npcStateCount = 0;
    let source: RecoveryReport['source'] = 'empty';

    try {
      // 1. 读取指针
      const ptr = await idb.kvGet<string>(CURRENT_REVISION_KEY);
      if (ptr) {
        const ok = await kernel.loadFromRevision(ptr);
        if (ok) {
          restoredHash = ptr;
          source = 'ptr';
        } else {
          warnings.push(`指针 revision(${ptr.slice(0, 8)})失效,降级到最新 revision`);
        }
      }
      // 2. 指针失效降级:找最新的 chat 或 save revision
      if (!restoredHash) {
        const recent = await idb.listRevisions(undefined, 50);
        // 优先 chat,其次 save
        const fallback =
          recent.find((r) => r.scope === 'chat') ??
          recent.find((r) => r.scope === 'save');
        if (fallback) {
          const ok = await kernel.loadFromRevision(fallback.hash);
          if (ok) {
            restoredHash = fallback.hash;
            source = 'fallback';
            warnings.push(`已降级恢复到 ${fallback.scope} revision(${fallback.hash.slice(0, 8)})`);
          }
        }
      }
      // 3. 恢复后读取 Kernel 状态
      if (restoredHash) {
        statData = kernel.getStatData();
        turnCount = kernel.getTurnCount();
        actionsToday = kernel.getActionsToday();
        lastActionDay = kernel.getLastActionDay();
      }
      // 4. 统计
      historyCount = await this.countRevisionsByScope('chat');
      chatSheetsCount = await this.countChatSheetRows();
      npcStateCount = await this.countNpcStateRows();
    } catch (e) {
      errors.push(`恢复过程异常: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
      ok: errors.length === 0,
      restoredHash,
      statData,
      turnCount,
      actionsToday,
      lastActionDay,
      historyCount,
      chatSheetsCount,
      npcStateCount,
      warnings,
      errors,
      source,
    };
  }

  /**
   * 从指定 hash 恢复(用于加载存档/分支切换的底层入口)
   *  - 与 SaveCas.load 互补:SaveCas.load 校验 scope=save 后调用本方法
   *  - 本方法不校验 scope,任何 revision 都可恢复
   */
  async recoverFromHash(kernel: Kernel, hash: string): Promise<RecoveryReport> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let statData: Record<string, unknown> = {};
    let turnCount = 0;
    let actionsToday = 0;
    let lastActionDay = 1;
    let historyCount = 0;
    let chatSheetsCount = 0;
    let npcStateCount = 0;

    try {
      const ok = await kernel.loadFromRevision(hash);
      if (!ok) {
        errors.push(`revision ${hash} 不存在或内容无效`);
      } else {
        statData = kernel.getStatData();
        turnCount = kernel.getTurnCount();
        actionsToday = kernel.getActionsToday();
        lastActionDay = kernel.getLastActionDay();
      }
      historyCount = await this.countRevisionsByScope('chat');
      chatSheetsCount = await this.countChatSheetRows();
      npcStateCount = await this.countNpcStateRows();
    } catch (e) {
      errors.push(`恢复过程异常: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
      ok: errors.length === 0,
      restoredHash: ok_insecure(hash),
      statData,
      turnCount,
      actionsToday,
      lastActionDay,
      historyCount,
      chatSheetsCount,
      npcStateCount,
      warnings,
      errors,
      source: 'ptr',
    };
  }

  // ─────────────────────────────────────────────────────────
  //  一致性校验
  // ─────────────────────────────────────────────────────────

  /**
   * 一致性校验
   *  - 检查 KV 指针指向的 revision 是否存在
   *  - 检查 Kernel 内存状态与 revision content 是否对齐
   *  - 检查 stat_data 顶层命名空间是否完整(对照 schema)
   *  - 检查 chatSheets 表是否有脏数据(table_name 为空)
   *  - 检查是否有孤儿 revision(parent_hash 指向不存在的 revision)
   */
  async verifyConsistency(kernel: Kernel): Promise<ConsistencyCheck> {
    const checks: ConsistencyCheck['checks'] = [];

    // 1. 指针有效性
    const ptr = await idb.kvGet<string>(CURRENT_REVISION_KEY);
    let ptrRev: idb.RevisionRow | null = null;
    if (ptr) {
      ptrRev = await idb.getRevision(ptr);
      checks.push({
        name: 'KV 指针有效性',
        ok: !!ptrRev,
        detail: ptrRev
          ? `指针 → ${ptr.slice(0, 8)} ✓`
          : `指针 ${ptr.slice(0, 8)} 失效(revision 不存在)`,
      });
    } else {
      checks.push({
        name: 'KV 指针有效性',
        ok: true,
        detail: '无指针(新档/已重置)',
      });
    }

    // 2. Kernel 内存与指针 revision 对齐
    if (ptrRev) {
      const content = (ptrRev.content ?? {}) as { statData?: Record<string, unknown> };
      const kernelStatData = kernel.getStatData();
      const kernelHash = kernel.getCurrentRevisionHash();
      const hashAligned = kernelHash === ptr;
      const statKeysAligned =
        JSON.stringify(Object.keys(content.statData ?? {}).sort()) ===
        JSON.stringify(Object.keys(kernelStatData).sort());
      checks.push({
        name: 'Kernel-Revision 状态对齐',
        ok: hashAligned && statKeysAligned,
        detail: `hash:${hashAligned ? '✓' : '✗'} 顶层键:${statKeysAligned ? '✓' : '✗'}`,
      });
    } else {
      checks.push({
        name: 'Kernel-Revision 状态对齐',
        ok: true,
        detail: '无 revision,跳过',
      });
    }

    // 3. stat_data 顶层命名空间完整性
    const sd = kernel.getStatData();
    const expectedNamespaces = schemaRegistry.getTopLevelKeys();
    const actualNamespaces = Object.keys(sd);
    const missing = expectedNamespaces.filter((k) => !actualNamespaces.includes(k));
    checks.push({
      name: 'stat_data 顶层命名空间完整',
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? `${actualNamespaces.length} 个命名空间 ✓`
          : `缺失 ${missing.length} 个: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`,
    });

    // 4. chatSheets 脏数据
    const allSheets = await this.getAllChatSheetsUnsafe();
    const dirtySheets = allSheets.filter(
      (r) => !r.table_name || r.row_id === undefined || r.row_id === null,
    );
    checks.push({
      name: 'chatSheets 脏数据',
      ok: dirtySheets.length === 0,
      detail:
        dirtySheets.length === 0
          ? `${allSheets.length} 行 ✓`
          : `${dirtySheets.length} 行脏数据(table_name/row_id 缺失)`,
    });

    // 5. 孤儿 revision
    const allRev = await this.getAllRevisionsUnsafe();
    const hashSet = new Set(allRev.map((r) => r.hash));
    const orphans = allRev.filter(
      (r) => r.parentHash && !hashSet.has(r.parentHash),
    );
    checks.push({
      name: '孤儿 revision',
      ok: orphans.length === 0,
      detail:
        orphans.length === 0
          ? `${allRev.length} 个 revision 链完整 ✓`
          : `${orphans.length} 个孤儿(parent 失效)`,
    });

    return {
      ok: checks.every((c) => c.ok),
      checks,
    };
  }

  // ─────────────────────────────────────────────────────────
  //  失败恢复报告
  // ─────────────────────────────────────────────────────────

  /**
   * 生成失败恢复报告
   *  - 模型失败:可重试,推荐 retry/fallback-model
   *  - 解析失败:不污染状态,推荐 rollback
   *  - Zod 失败:部分提交已发生,推荐 abort(由用户决定是否回滚)
   *  - IDB 失败:内存缓存保留,推荐 retry
   */
  buildFailureReport(
    type: FailureReport['type'],
    error: string,
    draft: StreamDraft | null,
    details?: string[],
  ): FailureReport {
    const canRetry = type === 'model-fail' || type === 'idb-fail';
    let recommendation: FailureReport['recommendation'] = 'abort';
    switch (type) {
      case 'model-fail':
        recommendation = 'retry';
        break;
      case 'parse-fail':
        recommendation = 'rollback';
        break;
      case 'zod-fail':
        recommendation = 'abort';
        break;
      case 'idb-fail':
        recommendation = 'retry';
        break;
      case 'unknown':
        recommendation = 'abort';
        break;
    }
    return {
      type,
      error,
      draft,
      canRetry,
      recommendation,
      details: details ?? [],
    };
  }

  // ─────────────────────────────────────────────────────────
  //  历史快照
  // ─────────────────────────────────────────────────────────

  /** 获取最近的 revision 历史(用于时间线/trace UI) */
  async getRecentHistory(limit = 50): Promise<HistorySnapshot[]> {
    const recent = await idb.listRevisions(undefined, limit);
    const currentHash = await idb.kvGet<string>(CURRENT_REVISION_KEY);
    return recent.map((rev) => {
      const content = (rev.content ?? {}) as {
        userAction?: string;
        narrative?: string;
        turnCount?: number;
      };
      const narrativePreview =
        typeof content.narrative === 'string' && content.narrative.length > 0
          ? content.narrative.slice(0, 80) + (content.narrative.length > 80 ? '...' : '')
          : undefined;
      return {
        hash: rev.hash,
        parentHash: rev.parentHash,
        ts: rev.ts,
        scope: rev.scope,
        label: rev.label,
        userAction: content.userAction,
        narrativePreview,
        turnCount: content.turnCount,
        isCurrent: rev.hash === currentHash,
      };
    });
  }

  // ─────────────────────────────────────────────────────────
  //  孤儿清理
  // ─────────────────────────────────────────────────────────

  /**
   * 清理孤儿 revision
   *  - 孤儿:parent_hash 指向不存在的 revision,且自身非根(parent_hash != null)
   *  - 清理策略:把孤儿 revision 的 parentHash 改为 null(变成根),或直接删除
   *  - 默认改为 null(保留数据,只断链),由用户决定是否手动删除
   *  - 返回清理数量与剩余孤儿数
   */
  async cleanOrphans(): Promise<{ cleaned: number; remaining: number }> {
    const allRev = await this.getAllRevisionsUnsafe();
    const hashSet = new Set(allRev.map((r) => r.hash));
    const orphans = allRev.filter(
      (r) => r.parentHash && !hashSet.has(r.parentHash),
    );
    if (orphans.length === 0) {
      return { cleaned: 0, remaining: 0 };
    }
    // 把孤儿的 parentHash 改为 null(变成根 revision)
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.REVISIONS, 'readwrite');
    for (const orphan of orphans) {
      const fixed: idb.RevisionRow = { ...orphan, parentHash: null };
      tx.objectStore(idb.STORE.REVISIONS).put(fixed);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('事务被中止'));
    });
    // 重新检查
    const after = await this.getAllRevisionsUnsafe();
    const afterSet = new Set(after.map((r) => r.hash));
    const remaining = after.filter(
      (r) => r.parentHash && !afterSet.has(r.parentHash),
    ).length;
    return { cleaned: orphans.length, remaining };
  }

  // ─────────────────────────────────────────────────────────
  //  内部辅助
  // ─────────────────────────────────────────────────────────

  /** 统计指定 scope 的 revision 数量 */
  private async countRevisionsByScope(scope: 'chat' | 'save' | 'auto' | 'branch'): Promise<number> {
    const list = await idb.listRevisions(scope, 10000);
    return list.length;
  }

  /** 统计 chatSheets 行数 */
  private async countChatSheetRows(): Promise<number> {
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.CHAT_SHEETS, 'readonly');
    return new Promise<number>((resolve, reject) => {
      const req = tx.objectStore(idb.STORE.CHAT_SHEETS).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** 统计 NPC 状态行数 */
  private async countNpcStateRows(): Promise<number> {
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.NPC_STATE, 'readonly');
    return new Promise<number>((resolve, reject) => {
      const req = tx.objectStore(idb.STORE.NPC_STATE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** 获取全部 chatSheets(脏数据检查用,不排序) */
  private async getAllChatSheetsUnsafe(): Promise<idb.ChatSheetRow[]> {
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.CHAT_SHEETS, 'readonly');
    return new Promise<idb.ChatSheetRow[]>((resolve, reject) => {
      const req = tx.objectStore(idb.STORE.CHAT_SHEETS).getAll();
      req.onsuccess = () => resolve(req.result as idb.ChatSheetRow[]);
      req.onerror = () => reject(req.error);
    });
  }

  /** 获取全部 revisions(孤儿检查用) */
  private async getAllRevisionsUnsafe(): Promise<idb.RevisionRow[]> {
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.REVISIONS, 'readonly');
    return new Promise<idb.RevisionRow[]>((resolve, reject) => {
      const req = tx.objectStore(idb.STORE.REVISIONS).getAll();
      req.onsuccess = () => resolve(req.result as idb.RevisionRow[]);
      req.onerror = () => reject(req.error);
    });
  }
}

/** 内部辅助:把 hash 当作"已恢复"返回(避免 unused 警告) */
function ok_insecure(hash: string): string {
  return hash;
}

// ───────────────────────────────────────────────────────────
//  单例导出
// ───────────────────────────────────────────────────────────

export const recovery = new Recovery();
