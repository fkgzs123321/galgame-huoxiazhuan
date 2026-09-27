/**
 * Save CAS(步骤8:存档管理)
 *
 * 职责:
 *  - 手动存档(scope='save'):基于当前 Kernel 状态创建 revision 快照
 *  - 加载存档:把 Kernel 状态恢复到指定 revision
 *  - 列出/删除存档
 *  - 导出存档为 JSON / 导入存档 JSON
 *  - 分支存档(多周目,阶段3 启用):从任意 revision 拉出新分支
 *
 * 设计要点:
 *  - 存档本质上是 scope='save' 的 revision,hash 由 content+parentHash+scope 决定
 *  - 同状态多次存档会得到同 hash(去重),通过 label 区分语义
 *  - 加载存档不删除 chat revision 链,只是在链上移动"当前指针"
 *  - 删除存档需检查是否有子 revision 引用(避免链断裂)
 *
 * 不做:
 *  - 自动存档(由 Kernel.commit 在每个回合创建 scope='chat' revision)
 *  - 一致性校验(由 recovery.ts 负责)
 *  - UI 渲染(由 SaveRecovery.tsx 负责)
 */

import * as idb from './indexeddb';
import type { Kernel } from '@runtime/kernel';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** 存档槽位元数据(UI 展示用,从 revision 派生) */
export interface SaveSlot {
  /** revision hash */
  hash: string;
  /** 父 revision hash */
  parentHash: string | null;
  /** 创建时间戳 */
  ts: number;
  /** 用户给的存档标签(默认为时间戳字符串) */
  label: string;
  /** 当时的回合数 */
  turnCount: number;
  /** 当时的游戏内天数 */
  dayInGame: number;
  /** 当时的玩家姓名 */
  playerName: string;
  /** 当时的玩家身份 */
  identityName: string;
  /** 当时的场景地点 */
  currentLocation: string;
  /** 是否为当前指针指向的 revision */
  isCurrent: boolean;
  /** 是否有子 revision(影响删除可行性) */
  hasChildren: boolean;
}

/** 存档创建选项 */
export interface SaveOptions {
  /** 用户给存档起的名字;空则用时间戳 */
  label?: string;
}

/** 存档操作结果 */
export interface SaveResult {
  ok: boolean;
  hash?: string;
  slot?: SaveSlot;
  error?: string;
}

/** 加载结果 */
export interface LoadResult {
  ok: boolean;
  hash?: string;
  statData?: Record<string, unknown>;
  turnCount?: number;
  dayInGame?: number;
  error?: string;
}

/** 删除结果 */
export interface DeleteResult {
  ok: boolean;
  reason?: string;
}

/** 导出包格式(版本化) */
export interface SaveExportPackage {
  /** 格式版本 */
  version: 1;
  /** 导出时间戳 */
  exportedAt: number;
  /** 应用版本(从 package.json 读取,留空) */
  appVersion?: string;
  /** 存档 revision 行 */
  revision: idb.RevisionRow;
  /** 父链(从根到本存档的所有祖先 revision,用于离线恢复) */
  ancestors: idb.RevisionRow[];
}

// ───────────────────────────────────────────────────────────
//  SaveCas 类
// ───────────────────────────────────────────────────────────

const SAVES_KV_INDEX_KEY = '__save_hashes__'; // 维护一个 save hash 列表(便于快速列出)

class SaveCas {
  // ─────────────────────────────────────────────────────────
  //  创建存档
  // ─────────────────────────────────────────────────────────

  /**
   * 创建手动存档
   *  - 以 Kernel 当前状态为内容,创建 scope='save' 的 revision
   *  - parentHash = 当前 currentRevisionHash(继承链)
   *  - 同状态同 parent 重复存档会得到同 hash,只更新 label
   *  - 不改变 Kernel 的 currentRevisionHash(存档后继续游戏,后续 commit 会以存档为父)
   *    → 这意味着存档相当于在链上"打了一个标记",后续 chat revision 自然以存档为父
   *    → 若希望存档后继续从存档点出发,可调用 loadSave(hash) 显式切回
   */
  async save(kernel: Kernel, options?: SaveOptions): Promise<SaveResult> {
    const statData = kernel.getStatData();
    const parentHash = kernel.getCurrentRevisionHash();
    const turnCount = kernel.getTurnCount();
    const actionsToday = kernel.getActionsToday();
    const lastActionDay = kernel.getLastActionDay();

    // 提取元数据(用于 SaveSlot 展示)
    const playerName = String(
      (statData.主角 as { 玩家姓名?: string } | undefined)?.玩家姓名 ?? '',
    );
    const identityName = String(
      (statData.主角 as { 玩家身份?: string } | undefined)?.玩家身份 ?? '未选择',
    );
    const dayInGame =
      typeof (statData.时间 as { 天数?: number } | undefined)?.天数 === 'number'
        ? (statData.时间 as { 天数: number }).天数
        : 1;
    const currentLocation = String(
      (statData.场景 as { 当前地点?: string } | undefined)?.当前地点 ?? '未选择',
    );

    const label = options?.label?.trim() || `存档 ${new Date().toLocaleString('zh-CN')}`;

    const content = {
      statData,
      narrative: '',
      userAction: `__save_${label}__`,
      actionsToday,
      lastActionDay,
      turnCount,
      // 存档元数据(便于 list 时不展开 content)
      __saveMeta__: {
        label,
        playerName,
        identityName,
        dayInGame,
        currentLocation,
      },
    };

    try {
      const rev = await idb.createRevision({
        content,
        parentHash,
        scope: 'save',
        label,
      });

      // 维护 save hash 列表
      await this.appendSaveHash(rev.hash);

      const slot = await this.buildSaveSlot(rev, true);
      return { ok: true, hash: rev.hash, slot };
    } catch (e) {
      return {
        ok: false,
        error: `存档创建失败: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  //  加载存档
  // ─────────────────────────────────────────────────────────

  /**
   * 加载存档:把 Kernel 状态切换到指定 save revision
   *  - 调用 Kernel.loadFromRevision 替换状态
   *  - 后续 commit 会以本存档为父(形成新分支)
   */
  async load(kernel: Kernel, hash: string): Promise<LoadResult> {
    const rev = await idb.getRevision(hash);
    if (!rev) {
      return { ok: false, error: `存档不存在: ${hash}` };
    }
    if (rev.scope !== 'save') {
      return { ok: false, error: `目标 revision 不是存档(scope=${rev.scope})` };
    }
    const ok = await kernel.loadFromRevision(hash);
    if (!ok) {
      return { ok: false, error: `Kernel 恢复失败: content 无效` };
    }
    const content = (rev.content ?? {}) as {
      statData?: Record<string, unknown>;
      turnCount?: number;
    };
    const sd = content.statData ?? {};
    const dayInGame =
      typeof (sd.时间 as { 天数?: number } | undefined)?.天数 === 'number'
        ? (sd.时间 as { 天数: number }).天数
        : 1;
    return {
      ok: true,
      hash,
      statData: sd,
      turnCount: content.turnCount,
      dayInGame,
    };
  }

  // ─────────────────────────────────────────────────────────
  //  列出存档
  // ─────────────────────────────────────────────────────────

  /** 列出所有手动存档(按 ts 降序) */
  async list(): Promise<SaveSlot[]> {
    const saves = await idb.listRevisions('save', 200);
    // 当前指针
    const currentHash = await idb.kvGet<string>(idbCurrentRevKey());
    // 子 revision 检查(批量)
    const childMap = await this.buildChildCountMap(saves.map((s) => s.hash));

    const slots: SaveSlot[] = [];
    for (const rev of saves) {
      const slot = await this.buildSaveSlot(rev, rev.hash === currentHash, childMap.get(rev.hash) ?? 0);
      slots.push(slot);
    }
    slots.sort((a, b) => b.ts - a.ts);
    return slots;
  }

  // ─────────────────────────────────────────────────────────
  //  删除存档
  // ─────────────────────────────────────────────────────────

  /**
   * 删除存档
   *  - 若该 revision 有子 revision(chat 或 save),拒绝删除(避免链断裂)
   *  - 若该 revision 是当前指针,拒绝删除(需先 load 到其他点)
   *  - 否则从 revisions 表与 save hash 列表中移除
   */
  async delete(hash: string): Promise<DeleteResult> {
    const rev = await idb.getRevision(hash);
    if (!rev) {
      return { ok: false, reason: '存档不存在' };
    }
    if (rev.scope !== 'save') {
      return { ok: false, reason: '非存档 revision,拒绝删除' };
    }
    const currentHash = await idb.kvGet<string>(idbCurrentRevKey());
    if (hash === currentHash) {
      return { ok: false, reason: '该存档为当前指针,无法删除(请先加载其他存档)' };
    }
    // 检查子 revision
    const childCount = await this.countChildren(hash);
    if (childCount > 0) {
      return {
        ok: false,
        reason: `该存档有 ${childCount} 个子 revision,删除会断裂链;如需清理,请先删除子节点`,
      };
    }
    // 删除
    try {
      const db = await idb.openDB();
      const tx = db.transaction(idb.STORE.REVISIONS, 'readwrite');
      tx.objectStore(idb.STORE.REVISIONS).delete(hash);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('事务被中止'));
      });
      await this.removeSaveHash(hash);
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        reason: `删除失败: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  //  导出 / 导入
  // ─────────────────────────────────────────────────────────

  /**
   * 导出存档为 JSON 字符串
   *  - 包含目标 revision + 全部祖先链(便于离线/跨设备恢复)
   *  - 调用方负责把字符串转为文件下载
   */
  async exportSave(hash: string): Promise<string> {
    const rev = await idb.getRevision(hash);
    if (!rev) {
      throw new Error(`存档不存在: ${hash}`);
    }
    const ancestors = await idb.traceRevisionChain(hash);
    // 第一个就是 rev 自己,其余是祖先
    const ancestorsOnly = ancestors.slice(1).reverse(); // 根 → 父
    const pkg: SaveExportPackage = {
      version: 1,
      exportedAt: Date.now(),
      revision: rev,
      ancestors: ancestorsOnly,
    };
    return JSON.stringify(pkg, null, 2);
  }

  /**
   * 导入存档 JSON
   *  - 解析包,逐个写入祖先 revision + 目标 revision
   *  - 已存在的 hash 跳过(去重)
   *  - 不改变当前指针(导入后用户需手动 load(hash))
   *  - 返回目标 revision hash
   */
  async importSave(json: string): Promise<{ ok: boolean; hash?: string; error?: string }> {
    let pkg: SaveExportPackage;
    try {
      pkg = JSON.parse(json) as SaveExportPackage;
    } catch (e) {
      return { ok: false, error: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}` };
    }
    if (!pkg || pkg.version !== 1 || !pkg.revision) {
      return { ok: false, error: '包格式无效(version!=1 或 revision 缺失)' };
    }
    try {
      // 先写祖先(从根到父),再写目标
      for (const anc of pkg.ancestors) {
        await this.putRevisionIfAbsent(anc);
      }
      await this.putRevisionIfAbsent(pkg.revision);
      // 若是 save scope,加入 save 列表
      if (pkg.revision.scope === 'save') {
        await this.appendSaveHash(pkg.revision.hash);
      }
      return { ok: true, hash: pkg.revision.hash };
    } catch (e) {
      return {
        ok: false,
        error: `导入写入失败: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  //  分支存档(阶段3 多周目)
  // ─────────────────────────────────────────────────────────

  /**
   * 从任意 revision 创建分支存档
   *  - 把目标 revision 的内容拷贝为新的 scope='save' revision(parentHash=源 hash)
   *  - 用于多周目继承:从上一周目的关键节点拉出新分支
   *  - 阶段1 只提供基础实现,继承规则(道具/属性/flag 衰减)在阶段3 实现
   */
  async branch(
    kernel: Kernel,
    fromHash: string,
    label: string,
  ): Promise<SaveResult> {
    const src = await idb.getRevision(fromHash);
    if (!src) {
      return { ok: false, error: `源 revision 不存在: ${fromHash}` };
    }
    // 拷贝内容,但 userAction 改为 __branch__
    const content = (src.content ?? {}) as Record<string, unknown>;
    const newContent = {
      ...content,
      userAction: `__branch_${label}__`,
      __saveMeta__: {
        label,
        playerName: (content.__saveMeta__ as { playerName?: string } | undefined)?.playerName ?? '',
        identityName:
          (content.__saveMeta__ as { identityName?: string } | undefined)?.identityName ?? '分支',
        dayInGame: (content.__saveMeta__ as { dayInGame?: number } | undefined)?.dayInGame ?? 1,
        currentLocation:
          (content.__saveMeta__ as { currentLocation?: string } | undefined)?.currentLocation ?? '',
      },
    };
    try {
      const rev = await idb.createRevision({
        content: newContent,
        parentHash: fromHash,
        scope: 'save',
        label,
      });
      await this.appendSaveHash(rev.hash);
      const slot = await this.buildSaveSlot(rev, false);
      return { ok: true, hash: rev.hash, slot };
    } catch (e) {
      return {
        ok: false,
        error: `分支创建失败: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  //  内部辅助
  // ─────────────────────────────────────────────────────────

  /** 从 revision 构建 SaveSlot */
  private async buildSaveSlot(
    rev: idb.RevisionRow,
    isCurrent: boolean,
    childCount?: number,
  ): Promise<SaveSlot> {
    const content = (rev.content ?? {}) as {
      statData?: Record<string, unknown>;
      turnCount?: number;
      __saveMeta__?: {
        label?: string;
        playerName?: string;
        identityName?: string;
        dayInGame?: number;
        currentLocation?: string;
      };
    };
    const meta = content.__saveMeta__ ?? {};
    const sd = content.statData ?? {};
    const dayInGame =
      typeof meta.dayInGame === 'number'
        ? meta.dayInGame
        : typeof (sd.时间 as { 天数?: number } | undefined)?.天数 === 'number'
          ? (sd.时间 as { 天数: number }).天数
          : 1;
    const hasChildren =
      childCount !== undefined ? childCount > 0 : (await this.countChildren(rev.hash)) > 0;
    return {
      hash: rev.hash,
      parentHash: rev.parentHash,
      ts: rev.ts,
      label: rev.label ?? meta.label ?? `存档 ${new Date(rev.ts).toLocaleString('zh-CN')}`,
      turnCount: typeof content.turnCount === 'number' ? content.turnCount : 0,
      dayInGame,
      playerName: meta.playerName ?? '',
      identityName: meta.identityName ?? '未选择',
      currentLocation: meta.currentLocation ?? '',
      isCurrent,
      hasChildren,
    };
  }

  /** 统计指定 hash 的子 revision 数量(parent_hash 索引扫描) */
  private async countChildren(hash: string): Promise<number> {
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.REVISIONS, 'readonly');
    const idx = tx.objectStore(idb.STORE.REVISIONS).index('parent_hash');
    return new Promise<number>((resolve, reject) => {
      const req = idx.count(hash);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** 批量构建 hash → 子 revision 数量 的映射 */
  private async buildChildCountMap(hashes: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (hashes.length === 0) return map;
    // 简化:遍历全部 revisions 一次,统计 parent_hash 出现次数
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.REVISIONS, 'readonly');
    const all = await new Promise<idb.RevisionRow[]>((resolve, reject) => {
      const req = tx.objectStore(idb.STORE.REVISIONS).getAll();
      req.onsuccess = () => resolve(req.result as idb.RevisionRow[]);
      req.onerror = () => reject(req.error);
    });
    for (const h of hashes) map.set(h, 0);
    for (const r of all) {
      if (r.parentHash && map.has(r.parentHash)) {
        map.set(r.parentHash, (map.get(r.parentHash) ?? 0) + 1);
      }
    }
    return map;
  }

  /** 维护 save hash 列表 */
  private async appendSaveHash(hash: string): Promise<void> {
    const list = (await idb.kvGet<string[]>(SAVES_KV_INDEX_KEY)) ?? [];
    if (!list.includes(hash)) {
      list.push(hash);
      await idb.kvSet(SAVES_KV_INDEX_KEY, list);
    }
  }

  private async removeSaveHash(hash: string): Promise<void> {
    const list = (await idb.kvGet<string[]>(SAVES_KV_INDEX_KEY)) ?? [];
    const next = list.filter((h) => h !== hash);
    await idb.kvSet(SAVES_KV_INDEX_KEY, next);
  }

  /** putRevisionIfAbsent:导入用,已存在则跳过 */
  private async putRevisionIfAbsent(rev: idb.RevisionRow): Promise<void> {
    const existing = await idb.getRevision(rev.hash);
    if (existing) return;
    const db = await idb.openDB();
    const tx = db.transaction(idb.STORE.REVISIONS, 'readwrite');
    tx.objectStore(idb.STORE.REVISIONS).put(rev);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('事务被中止'));
    });
  }
}

// ───────────────────────────────────────────────────────────
//  辅助:读取 current revision key(避免循环依赖)
// ───────────────────────────────────────────────────────────

/** 复用 kernel.ts 中的常量值(避免循环 import) */
function idbCurrentRevKey(): string {
  return '__current_revision__';
}

// ───────────────────────────────────────────────────────────
//  单例导出
// ───────────────────────────────────────────────────────────

export const saveCas = new SaveCas();
