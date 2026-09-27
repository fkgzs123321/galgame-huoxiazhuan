/**
 * CG Gallery · CG 画廊系统(阶段3 步骤3)
 *
 * 职责:
 *  - CG 解锁条件评估(基于女角/场景类型/H经验/关系阶段)
 *  - CG 元数据管理(id/标题/描述/解锁条件/解锁时间)
 *  - CG 持久化到 IndexedDB(kv:__cg_gallery__)
 *  - CG 画廊查询(按女角/按类型/按解锁状态)
 *
 * CG 类型:
 *  - h-first: 初夜 CG(初H=0 → 1)
 *  - h-advanced: 进阶 H CG(进阶H=0 → 1,需 H经验≥5)
 *  - h-normal: 普通 H CG(H经验≥3)
 *  - event: 剧情事件 CG(关键 flag 触发)
 *  - portrait: 角色立绘 CG(关系阶段达成)
 *
 * 集成点:
 *  - HSceneEngine 生成 cgId 后调用 cgGallery.unlock()
 *  - App.tsx 游戏模式「相册」面板查询已解锁 CG
 */

import * as idb from '../db/indexeddb';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export type CGType = 'h-first' | 'h-advanced' | 'h-normal' | 'event' | 'portrait';

export interface CGEntry {
  /** CG id(唯一) */
  id: string;
  /** CG 类型 */
  type: CGType;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 关联女角名 */
  heroineName: string;
  /** 解锁条件描述 */
  unlockCondition: string;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 解锁时间戳(未解锁为 null) */
  unlockedAt: number | null;
  /** 解锁时所在的回合计数 */
  unlockedAtTurn?: number;
  /** 占位图 URL(阶段3 用渐变色占位,阶段4 接入真实 CG) */
  placeholderGradient: string;
  /** 真实 CG 图片 URL(可选,配置后优先于占位/插画渲染) */
  imageUrl?: string;
}

export interface CGGalleryState {
  /** 全部 CG 条目(按 id 索引) */
  entries: Record<string, CGEntry>;
  /** 已解锁数量 */
  unlockedCount: number;
  /** 总数量 */
  totalCount: number;
  /** 最后更新时间 */
  updatedAt: number;
}

// ───────────────────────────────────────────────────────────
//  CG 画廊预定义条目(20 女角 × 5 类型 = 100 CG,此处定义核心 CG)
// ───────────────────────────────────────────────────────────

/** 核心 CG 定义(按女角+类型) */
const CORE_CG_DEFINITIONS: Array<Omit<CGEntry, 'unlocked' | 'unlockedAt'>> = [
  // ── 鸣泽美佐子(主线女主角) ──
  {
    id: 'cg-portrait-misako',
    type: 'portrait',
    title: '美佐子的晨妆',
    description: '清晨阳光下,美佐子在梳妆台前的侧影,温柔而宁静',
    heroineName: '鸣泽美佐子',
    unlockCondition: '关系阶段达到 熟悉',
    placeholderGradient: 'linear-gradient(135deg, #ffdce6 0%, #f8bbd0 50%, #e91e63 100%)',
  },
  {
    id: 'cg-h-first-misako',
    type: 'h-first',
    title: '美佐子的初夜',
    description: '羞涩与痛楚交织的表情,血迹点缀床单,泪光中带着信任',
    heroineName: '鸣泽美佐子',
    unlockCondition: '关系阶段 亲密 + 好感度≥50 + 初H触发',
    placeholderGradient: 'linear-gradient(135deg, #fff5f7 0%, #ff6b9d 50%, #c2185b 100%)',
  },
  {
    id: 'cg-h-advanced-misako',
    type: 'h-advanced',
    title: '美佐子的觉醒',
    description: '新姿势下的表情与体位,从被动到主动的转变',
    heroineName: '鸣泽美佐子',
    unlockCondition: 'H经验≥5 + 进阶H触发',
    placeholderGradient: 'linear-gradient(135deg, #f8bbd0 0%, #e91e63 50%, #880e4f 100%)',
  },
  // ── 鸣泽亚柚(妹妹) ──
  {
    id: 'cg-portrait-yuzu',
    type: 'portrait',
    title: '亚柚的放学后',
    description: '穿着校服的亚柚在客厅看电视,腮帮鼓鼓地嚼着零食',
    heroineName: '鸣泽亚柚',
    unlockCondition: '关系阶段达到 熟悉',
    placeholderGradient: 'linear-gradient(135deg, #fff9c4 0%, #ffcc80 50%, #ff9800 100%)',
  },
  {
    id: 'cg-h-first-yuzu',
    type: 'h-first',
    title: '亚柚的秘密',
    description: '偷看哥哥时的害羞表情,小鹿乱撞的心跳',
    heroineName: '鸣泽亚柚',
    unlockCondition: '关系阶段 暧昧 + 好感度≥40 + 初H触发',
    placeholderGradient: 'linear-gradient(135deg, #fff9c4 0%, #ff7043 50%, #d84315 100%)',
  },
  // ── 水野樱子(病弱线) ──
  {
    id: 'cg-portrait-sakurako',
    type: 'portrait',
    title: '樱子的窗边',
    description: '医院病房窗边,苍白皮肤的樱子望向窗外樱花树',
    heroineName: '水野樱子',
    unlockCondition: '樱子线解锁 + 关系阶段 初识',
    placeholderGradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #64b5f6 100%)',
  },
  {
    id: 'cg-event-sakurako-death',
    type: 'event',
    title: '樱子的最后一封信',
    description: '樱花树下,手中握着樱子留下的最后一封信,泪水模糊字迹',
    heroineName: '水野樱子',
    unlockCondition: '樱子死讯 flag 触发',
    placeholderGradient: 'linear-gradient(135deg, #f5f5f5 0%, #9e9e9e 50%, #424242 100%)',
  },
  // ── 美纪(双身份) ──
  {
    id: 'cg-portrait-miki',
    type: 'portrait',
    title: '美纪的双面',
    description: '白天文静的学生会长,夜晚妖艳的夜店女王,两面重叠的构图',
    heroineName: '美纪',
    unlockCondition: '关系阶段达到 熟悉',
    placeholderGradient: 'linear-gradient(135deg, #f3e5f5 0%, #ab47bc 50%, #4a148c 100%)',
  },
  {
    id: 'cg-event-miki-reveal',
    type: 'event',
    title: '美纪的双身份揭示',
    description: '夜店里撞见学生会长的瞬间,震惊与恐惧交织的表情',
    heroineName: '美纪',
    unlockCondition: '美纪双身份揭示 flag 触发',
    placeholderGradient: 'linear-gradient(135deg, #4a148c 0%, #1a0e16 50%, #000 100%)',
  },
  // ── 西寺阴谋事件 CG ──
  {
    id: 'cg-event-conspiracy',
    type: 'event',
    title: '西寺的阴谋',
    description: '偷听到的密谋,阴影中三个人的窃窃私语',
    heroineName: '西寺',
    unlockCondition: '阴谋偷听 flag 触发',
    placeholderGradient: 'linear-gradient(135deg, #263238 0%, #1a0e16 50%, #000 100%)',
  },
];

// ───────────────────────────────────────────────────────────
//  CGGallery 类
// ───────────────────────────────────────────────────────────

export class CGGallery {
  private state: CGGalleryState;
  private loaded = false;

  constructor() {
    this.state = {
      entries: {},
      unlockedCount: 0,
      totalCount: 0,
      updatedAt: 0,
    };
    this.initializeEntries();
  }

  /** 初始化 CG 条目(全部未解锁) */
  private initializeEntries(): void {
    const entries: Record<string, CGEntry> = {};
    for (const def of CORE_CG_DEFINITIONS) {
      entries[def.id] = {
        ...def,
        unlocked: false,
        unlockedAt: null,
      };
    }
    this.state.entries = entries;
    this.state.totalCount = Object.keys(entries).length;
  }

  /** 从 IndexedDB 加载状态 */
  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const stored = await idb.kvGet<CGGalleryState>('__cg_gallery__');
      if (stored && typeof stored === 'object' && stored.entries) {
        // 合并:保留 IndexedDB 的解锁状态,但补充新增的 CG 定义
        const merged: Record<string, CGEntry> = {};
        for (const [id, entry] of Object.entries(this.state.entries)) {
          const storedEntry = stored.entries[id];
          merged[id] = storedEntry ? { ...entry, ...storedEntry } : entry;
        }
        this.state.entries = merged;
        this.state.unlockedCount = Object.values(merged).filter((e) => e.unlocked).length;
        this.state.totalCount = Object.keys(merged).length;
        this.state.updatedAt = stored.updatedAt ?? Date.now();
      }
    } catch {
      // IndexedDB 未就绪,使用默认状态
    }
    this.loaded = true;
  }

  /** 持久化到 IndexedDB */
  async save(): Promise<void> {
    this.state.updatedAt = Date.now();
    try {
      await idb.kvSet('__cg_gallery__', this.state);
    } catch {
      // 持久化失败,忽略
    }
  }

  /** 解锁 CG */
  async unlock(cgId: string, turn?: number): Promise<boolean> {
    await this.load();
    const entry = this.state.entries[cgId];
    if (!entry) {
      // 未知 CG,创建临时条目
      this.state.entries[cgId] = {
        id: cgId,
        type: 'event',
        title: `CG ${cgId}`,
        description: '动态触发的 CG',
        heroineName: '未知',
        unlockCondition: '触发型解锁',
        unlocked: true,
        unlockedAt: Date.now(),
        unlockedAtTurn: turn,
        placeholderGradient: 'linear-gradient(135deg, #fff5f7 0%, #e91e63 100%)',
      };
      this.state.totalCount++;
      this.state.unlockedCount++;
      await this.save();
      return true;
    }
    if (entry.unlocked) return false; // 已解锁,无变化
    entry.unlocked = true;
    entry.unlockedAt = Date.now();
    entry.unlockedAtTurn = turn;
    this.state.unlockedCount++;
    await this.save();
    return true;
  }

  /**
   * 评估并解锁 H 场景 CG
   *  - 根据 HSceneEngine 生成的 cgId 自动解锁
   *  - 返回解锁的 CG 条目(若已解锁返回 null)
   */
  async unlockHSceneCG(
    cgId: string,
    heroineName: string,
    sceneType: string,
    turn?: number,
  ): Promise<CGEntry | null> {
    await this.load();
    const isNewlyUnlocked = await this.unlock(cgId, turn);
    if (!isNewlyUnlocked) return null;
    return this.state.entries[cgId] ?? null;
  }

  /** 评估事件 CG 解锁条件 */
  evaluateEventCG(statData: Record<string, unknown>): string[] {
    const unlockedIds: string[] = [];
    const hidden = (statData.隐藏 ?? {}) as Record<string, unknown>;

    // 樱子死讯
    if (hidden.樱子死讯 === true || hidden.樱子死讯 === 1) {
      if (!this.state.entries['cg-event-sakurako-death']?.unlocked) {
        unlockedIds.push('cg-event-sakurako-death');
      }
    }
    // 美纪双身份揭示
    if (hidden.美纪双身份揭示 === 1 || hidden.美纪双身份揭示 === true) {
      if (!this.state.entries['cg-event-miki-reveal']?.unlocked) {
        unlockedIds.push('cg-event-miki-reveal');
      }
    }
    // 西寺阴谋偷听
    if (hidden.阴谋偷听 === true || hidden.阴谋偷听 === 1) {
      if (!this.state.entries['cg-event-conspiracy']?.unlocked) {
        unlockedIds.push('cg-event-conspiracy');
      }
    }
    return unlockedIds;
  }

  /** 评估立绘 CG 解锁条件(关系阶段) */
  evaluatePortraitCG(statData: Record<string, unknown>): string[] {
    const unlockedIds: string[] = [];
    const heroine = (statData.当前女角 ?? {}) as Record<string, unknown>;
    const stage = String(heroine.关系阶段 ?? '初识');
    const name = String(heroine.姓名 ?? '无');
    const allowedStages = ['熟悉', '暧昧', '心动', '亲密', '攻略完成'];
    if (!allowedStages.includes(stage)) return unlockedIds;

    // 检查所有立绘 CG
    for (const entry of Object.values(this.state.entries)) {
      if (entry.type !== 'portrait') continue;
      if (entry.heroineName !== name) continue;
      if (entry.unlocked) continue;
      unlockedIds.push(entry.id);
    }
    return unlockedIds;
  }

  /** 批量解锁并持久化 */
  async unlockBatch(cgIds: string[], turn?: number): Promise<CGEntry[]> {
    const newlyUnlocked: CGEntry[] = [];
    for (const id of cgIds) {
      const entry = await this.unlock(id, turn);
      if (entry) {
        newlyUnlocked.push(this.state.entries[id]);
      }
    }
    return newlyUnlocked;
  }

  /** 查询全部 CG */
  getAll(): CGEntry[] {
    return Object.values(this.state.entries);
  }

  /** 按女角查询 CG */
  getByHeroine(heroineName: string): CGEntry[] {
    return Object.values(this.state.entries).filter((e) => e.heroineName === heroineName);
  }

  /** 按类型查询 CG */
  getByType(type: CGType): CGEntry[] {
    return Object.values(this.state.entries).filter((e) => e.type === type);
  }

  /** 查询已解锁 CG */
  getUnlocked(): CGEntry[] {
    return Object.values(this.state.entries).filter((e) => e.unlocked);
  }

  /** 查询未解锁 CG */
  getLocked(): CGEntry[] {
    return Object.values(this.state.entries).filter((e) => !e.unlocked);
  }

  /** 获取统计 */
  getStats(): { total: number; unlocked: number; locked: number; percent: number } {
    return {
      total: this.state.totalCount,
      unlocked: this.state.unlockedCount,
      locked: this.state.totalCount - this.state.unlockedCount,
      percent: this.state.totalCount > 0 ? (this.state.unlockedCount / this.state.totalCount) * 100 : 0,
    };
  }

  /** 获取当前状态快照 */
  snapshot(): CGGalleryState {
    return { ...this.state, entries: { ...this.state.entries } };
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const cgGallery = new CGGallery();
