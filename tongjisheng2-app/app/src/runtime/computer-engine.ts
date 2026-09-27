/**
 * Computer Engine · 90 年代电脑运行时引擎（阶段3 步骤8）
 *
 * 职责:
 *  - 检查玩家是否拥有电脑(剧情/购买触发)
 *  - 拨号上网(模拟拨号过程,累计上网时长)
 *  - BBS 浏览/回帖(根据 flag 解锁帖子)
 *  - 邮件收发(根据天数/flag 触发新邮件)
 *  - 收藏夹管理
 *
 * 集成:
 *  - ui/ComputerPanel 调用本引擎
 *  - 生成 stateOps,合并到 CandidateChangeSet
 */

import {
  BBS_BOARDS,
  BBS_POSTS,
  EMAIL_TEMPLATES,
  listBoardPosts,
  type BbsBoard,
  type BbsPost,
  type EmailTemplate,
} from '../content/computer/bbs-data';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export interface ComputerNamespace {
  拥有电脑: number;
  系统版本: string;
  上网总时长: number;
  BBS发帖数: number;
  BBS回帖数: number;
  邮件未读数: number;
  邮件总数: number;
  收藏夹: string;
  邮件记录: Record<string, ComputerEmail>;
  BBS浏览历史: Record<string, BbsHistoryEntry>;
}

export interface ComputerEmail {
  发件人: string;
  收件人: string;
  主题: string;
  正文: string;
  时间: string;
  已读: number;
  类型: '收件' | '发件' | '草稿';
}

export interface BbsHistoryEntry {
  帖子ID: string;
  板块: string;
  标题: string;
  已回帖: number;
  浏览时间: string;
}

/** 拨号上网结果 */
export interface DialupResult {
  ok: boolean;
  reason?: string;
  /** 拨号时长(秒,模拟) */
  dialDurationSec: number;
  /** 上网时长(分钟) */
  onlineMinutes: number;
  /** 消耗话费 */
  cost: number;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** BBS 回帖结果 */
export interface BbsReplyResult {
  ok: boolean;
  reason?: string;
  /** 应用效果 */
  appliedEffects: Array<{ path: string; value: number | string | boolean; description?: string }>;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 发送邮件结果 */
export interface SendEmailResult {
  ok: boolean;
  reason?: string;
  record?: ComputerEmail;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

// ───────────────────────────────────────────────────────────
//  上网费率
// ───────────────────────────────────────────────────────────

export const INTERNET_RATES = {
  /** 拨号接入费用(每次) */
  dialupCost: 30,
  /** 上网每分钟费用(电话费) */
  perMinuteCost: 12,
  /** 拨号时长范围(秒) */
  dialDurationMin: 20,
  dialDurationMax: 60,
};

// ───────────────────────────────────────────────────────────
//  辅助
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

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return false;
}

function getFlag(statData: Record<string, unknown>, flag: string): boolean {
  if (!flag) return true;
  const hidden = asObj(statData.隐藏);
  if (flag.endsWith('_10')) {
    const key = flag.replace(/_10$/, '');
    return asNum(hidden[key]) >= 10;
  }
  return asBool(hidden[flag]);
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function now(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ───────────────────────────────────────────────────────────
//  ComputerEngine
// ───────────────────────────────────────────────────────────

class ComputerEngine {
  /**
   * 读取电脑命名空间
   */
  read(statData: Record<string, unknown>): ComputerNamespace {
    const c = asObj(statData.电脑);
    return {
      拥有电脑: asNum(c.拥有电脑),
      系统版本: asStr(c.系统版本, 'Windows 98'),
      上网总时长: asNum(c.上网总时长),
      BBS发帖数: asNum(c.BBS发帖数),
      BBS回帖数: asNum(c.BBS回帖数),
      邮件未读数: asNum(c.邮件未读数),
      邮件总数: asNum(c.邮件总数),
      收藏夹: asStr(c.收藏夹),
      邮件记录: (c.邮件记录 ?? {}) as Record<string, ComputerEmail>,
      BBS浏览历史: (c.BBS浏览历史 ?? {}) as Record<string, BbsHistoryEntry>,
    };
  }

  /**
   * 玩家是否拥有电脑
   */
  hasComputer(statData: Record<string, unknown>): boolean {
    return asNum(asObj(statData.电脑).拥有电脑) === 1;
  }

  /**
   * 列出所有 BBS 板块
   */
  listBoards(): BbsBoard[] {
    return BBS_BOARDS;
  }

  /**
   * 列出板块中可浏览的帖子(根据 flag 过滤)
   */
  listPosts(boardId: string, statData: Record<string, unknown>): BbsPost[] {
    const day = asNum(asObj(statData.时间).天数);
    return listBoardPosts(boardId).filter((p) => {
      if (p.requiredFlag && !getFlag(statData, p.requiredFlag)) return false;
      if (p.visibleDay !== undefined && p.visibleDay !== day) return false;
      return true;
    });
  }

  /**
   * 获取帖子详情
   */
  getPost(postId: string, statData: Record<string, unknown>): BbsPost | null {
    const post = BBS_POSTS.find((p) => p.id === postId);
    if (!post) return null;
    if (post.requiredFlag && !getFlag(statData, post.requiredFlag)) return null;
    return post;
  }

  /**
   * 浏览帖子(记录浏览历史)
   */
  browsePost(statData: Record<string, unknown>, postId: string): {
    post: BbsPost | null;
    stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  } {
    const post = this.getPost(postId, statData);
    if (!post) {
      return { post: null, stateOps: [] };
    }

    const computer = this.read(statData);
    const history = computer.BBS浏览历史[postId];

    const newEntry: BbsHistoryEntry = {
      帖子ID: postId,
      板块: post.boardId,
      标题: post.title,
      已回帖: history?.已回帖 ?? 0,
      浏览时间: now(),
    };

    return {
      post,
      stateOps: [
        { op: 'replace', path: `电脑.BBS浏览历史.${postId}`, value: newEntry },
      ],
    };
  }

  /**
   * 回复 BBS 帖子(获得效果)
   */
  replyPost(statData: Record<string, unknown>, postId: string, replyContent: string): BbsReplyResult {
    if (!this.hasComputer(statData)) {
      return { ok: false, reason: '尚未拥有电脑', appliedEffects: [], stateOps: [] };
    }

    if (!replyContent.trim()) {
      return { ok: false, reason: '回复内容不能为空', appliedEffects: [], stateOps: [] };
    }

    if (replyContent.length > 200) {
      return { ok: false, reason: '回复内容过长(上限 200 字符)', appliedEffects: [], stateOps: [] };
    }

    const post = this.getPost(postId, statData);
    if (!post) {
      return { ok: false, reason: '帖子不存在或不可见', appliedEffects: [], stateOps: [] };
    }

    const computer = this.read(statData);
    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'replace', path: '电脑.BBS回帖数', value: computer.BBS回帖数 + 1 },
      { op: 'replace', path: `电脑.BBS浏览历史.${postId}.已回帖`, value: 1 },
    ];

    // 应用效果(回帖后获得技能加成)
    const appliedEffects = post.effects ?? [];
    for (const eff of appliedEffects) {
      const currentVal = this.readPath(statData, eff.path);
      if (typeof eff.value === 'number' && typeof currentVal === 'number') {
        stateOps.push({
          op: 'replace',
          path: eff.path,
          value: currentVal + eff.value,
        });
      } else if (typeof eff.value === 'boolean') {
        stateOps.push({
          op: 'replace',
          path: eff.path,
          value: eff.value,
        });
      } else if (typeof eff.value === 'string') {
        stateOps.push({
          op: 'replace',
          path: eff.path,
          value: eff.value,
        });
      }
    }

    return {
      ok: true,
      appliedEffects,
      stateOps,
    };
  }

  /**
   * 检查新邮件(根据剧情触发)
   */
  checkIncomingEmails(statData: Record<string, unknown>): {
    newEmails: Array<{ id: string; record: ComputerEmail; template: EmailTemplate }>;
    stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  } {
    if (!this.hasComputer(statData)) {
      return { newEmails: [], stateOps: [] };
    }

    const computer = this.read(statData);
    const day = asNum(asObj(statData.时间).天数);
    const existingIds = new Set(Object.keys(computer.邮件记录));

    const newEmails: Array<{ id: string; record: ComputerEmail; template: EmailTemplate }> = [];
    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];

    const playerName = asStr(asObj(statData.主角).玩家姓名, '玩家');

    for (const tpl of EMAIL_TEMPLATES) {
      if (existingIds.has(tpl.id)) continue;

      if (tpl.trigger.day !== undefined && tpl.trigger.day !== day) continue;
      if (tpl.trigger.requiredFlag && !getFlag(statData, tpl.trigger.requiredFlag)) continue;

      const body = tpl.body.replace(/\{\{玩家姓名\}\}/g, playerName);
      const record: ComputerEmail = {
        发件人: tpl.from,
        收件人: playerName,
        主题: tpl.subject,
        正文: body,
        时间: tpl.receivedAt,
        已读: 0,
        类型: '收件',
      };

      newEmails.push({ id: tpl.id, record, template: tpl });
      stateOps.push({ op: 'add', path: `电脑.邮件记录.${tpl.id}`, value: record });
    }

    if (newEmails.length > 0) {
      stateOps.push({
        op: 'replace',
        path: '电脑.邮件总数',
        value: computer.邮件总数 + newEmails.length,
      });
      stateOps.push({
        op: 'replace',
        path: '电脑.邮件未读数',
        value: computer.邮件未读数 + newEmails.length,
      });
    }

    return { newEmails, stateOps };
  }

  /**
   * 标记邮件已读
   */
  markEmailRead(statData: Record<string, unknown>, emailId: string): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const computer = this.read(statData);
    const record = computer.邮件记录[emailId];
    if (!record || record.已读 === 1) return [];

    return [
      { op: 'replace', path: `电脑.邮件记录.${emailId}.已读`, value: 1 },
      { op: 'replace', path: '电脑.邮件未读数', value: Math.max(0, computer.邮件未读数 - 1) },
    ];
  }

  /**
   * 发送邮件
   */
  sendEmail(statData: Record<string, unknown>, to: string, subject: string, body: string): SendEmailResult {
    if (!this.hasComputer(statData)) {
      return { ok: false, reason: '尚未拥有电脑', stateOps: [] };
    }

    if (!to.trim() || !subject.trim() || !body.trim()) {
      return { ok: false, reason: '收件人/主题/正文不能为空', stateOps: [] };
    }

    const id = genId('email_out');
    const playerName = asStr(asObj(statData.主角).玩家姓名, '玩家');
    const record: ComputerEmail = {
      发件人: playerName,
      收件人: to,
      主题: subject,
      正文: body,
      时间: now(),
      已读: 1,
      类型: '发件',
    };

    const computer = this.read(statData);
    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'add', path: `电脑.邮件记录.${id}`, value: record },
      { op: 'replace', path: '电脑.邮件总数', value: computer.邮件总数 + 1 },
    ];

    return { ok: true, record, stateOps };
  }

  /**
   * 拨号上网
   *  - 模拟拨号过程(随机 20-60 秒)
   *  - 上网时长由玩家选择(5/15/30/60 分钟)
   */
  dialup(statData: Record<string, unknown>, onlineMinutes: number): DialupResult {
    if (!this.hasComputer(statData)) {
      return { ok: false, reason: '尚未拥有电脑', dialDurationSec: 0, onlineMinutes: 0, cost: 0, stateOps: [] };
    }

    const phone = asObj(statData.手机);
    const balance = asNum(phone.话费余额);
    const dialCost = INTERNET_RATES.dialupCost;
    const totalCost = dialCost + onlineMinutes * INTERNET_RATES.perMinuteCost;

    if (balance < totalCost) {
      return {
        ok: false,
        reason: `话费不足(需 ${totalCost} 日元,余额 ${balance} 日元)`,
        dialDurationSec: 0,
        onlineMinutes: 0,
        cost: 0,
        stateOps: [],
      };
    }

    const dialDurationSec = Math.floor(
      INTERNET_RATES.dialDurationMin + Math.random() * (INTERNET_RATES.dialDurationMax - INTERNET_RATES.dialDurationMin),
    );

    const computer = this.read(statData);
    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'replace', path: '手机.话费余额', value: balance - totalCost },
      { op: 'replace', path: '电脑.上网总时长', value: computer.上网总时长 + onlineMinutes },
      { op: 'replace', path: '主角.今日总消费', value: asNum(asObj(statData.主角).今日总消费) + totalCost },
    ];

    // 上网时触发新邮件检查
    const emailCheck = this.checkIncomingEmails(statData);
    stateOps.push(...emailCheck.stateOps);

    return {
      ok: true,
      dialDurationSec,
      onlineMinutes,
      cost: totalCost,
      stateOps,
    };
  }

  /**
   * 添加到收藏夹
   */
  addFavorite(statData: Record<string, unknown>, url: string): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const computer = this.read(statData);
    const favList = computer.收藏夹.split(',').map((s) => s.trim()).filter(Boolean);
    if (favList.includes(url)) return [];
    favList.push(url);
    return [
      { op: 'replace', path: '电脑.收藏夹', value: favList.join(',') },
    ];
  }

  /**
   * 剧情获得电脑
   */
  acquireComputer(statData: Record<string, unknown>, os = 'Windows 98'): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    return [
      { op: 'replace', path: '电脑.拥有电脑', value: 1 },
      { op: 'replace', path: '电脑.系统版本', value: os },
    ];
  }

  /**
   * 读取 stat_data 路径值
   */
  private readPath(statData: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let cur: unknown = statData;
    for (const p of parts) {
      if (cur && typeof cur === 'object') {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return 0;
      }
    }
    return cur ?? 0;
  }
}

export const computerEngine = new ComputerEngine();
