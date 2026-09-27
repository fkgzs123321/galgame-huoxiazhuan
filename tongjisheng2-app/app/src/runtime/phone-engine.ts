/**
 * Phone Engine · 90 年代 PHS 手机运行时引擎（阶段3 步骤8）
 *
 * 职责:
 *  - 检查玩家是否拥有手机(剧情第3天左右获得)
 *  - 短信收发(发短信扣话费,收短信从 SMS_TEMPLATES 触发)
 *  - 通话记录(拨出/接入/未接)
 *  - 通讯录解锁(基于隐藏flag)
 *  - 贪吃蛇小游戏(玩家得分影响话费奖励)
 *
 * 集成:
 *  - ui/PhonePanel 调用本引擎
 *  - 生成 stateOps,合并到 CandidateChangeSet
 */

import {
  PHONE_CONTACTS,
  SMS_TEMPLATES,
  SNAKE_GAME_CONFIG,
  calcSnakeBonus,
  type PhoneContact,
  type SmsTemplate,
} from '../content/phone/phone-data';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** stat_data 中的手机命名空间结构 */
export interface PhoneNamespace {
  拥有手机: number;
  机型: string;
  话费余额: number;
  短信总数: number;
  通话总数: number;
  贪吃蛇最高分: number;
  通讯录解锁: string;
  短信记录: Record<string, PhoneSmsRecord>;
  通话记录: Record<string, PhoneCallRecord>;
}

export interface PhoneSmsRecord {
  发送者: string;
  接收者: string;
  内容: string;
  时间: string;
  已读: number;
}

export interface PhoneCallRecord {
  对方: string;
  方向: '拨出' | '接入' | '未接';
  时长秒: number;
  时间: string;
}

/** 短信发送请求 */
export interface SendSmsRequest {
  to: string;
  content: string;
}

/** 短信发送结果 */
export interface SendSmsResult {
  ok: boolean;
  reason?: string;
  cost: number;
  record?: PhoneSmsRecord;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 通话结果 */
export interface CallResult {
  ok: boolean;
  reason?: string;
  cost: number;
  durationSec: number;
  record?: PhoneCallRecord;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 贪吃蛇得分结算 */
export interface SnakeScoreResult {
  ok: boolean;
  score: number;
  isHighScore: boolean;
  bonus: number;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 解锁的联系人(过滤后) */
export interface UnlockedContact extends PhoneContact {
  isUnlocked: boolean;
}

// ───────────────────────────────────────────────────────────
//  话费/通话费率
// ───────────────────────────────────────────────────────────

export const PHONE_RATES = {
  /** 短信每条费用 */
  smsCost: 10,
  /** 通话每秒费用 */
  callPerSec: 0.5,
  /** 通话最低消费(拨号接入费) */
  callMinCost: 30,
  /** 初始话费(剧情获得手机时) */
  initialBalance: 3000,
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
  // 变数屋访问次数_10 表示 >=10
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
//  PhoneEngine
// ───────────────────────────────────────────────────────────

class PhoneEngine {
  /**
   * 读取手机命名空间
   */
  read(statData: Record<string, unknown>): PhoneNamespace {
    const p = asObj(statData.手机);
    return {
      拥有手机: asNum(p.拥有手机),
      机型: asStr(p.机型, '京瓷 K系列'),
      话费余额: asNum(p.话费余额),
      短信总数: asNum(p.短信总数),
      通话总数: asNum(p.通话总数),
      贪吃蛇最高分: asNum(p.贪吃蛇最高分),
      通讯录解锁: asStr(p.通讯录解锁),
      短信记录: (p.短信记录 ?? {}) as Record<string, PhoneSmsRecord>,
      通话记录: (p.通话记录 ?? {}) as Record<string, PhoneCallRecord>,
    };
  }

  /**
   * 玩家是否拥有手机
   */
  hasPhone(statData: Record<string, unknown>): boolean {
    return asNum(asObj(statData.手机).拥有手机) === 1;
  }

  /**
   * 列出所有联系人(标注解锁状态)
   */
  listContacts(statData: Record<string, unknown>): UnlockedContact[] {
    const unlockedList = asStr(asObj(statData.手机).通讯录解锁)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const unlockedSet = new Set(unlockedList);

    return PHONE_CONTACTS.map((c) => {
      // 已经在通讯录解锁列表中
      if (unlockedSet.has(c.name)) {
        return { ...c, isUnlocked: true };
      }
      // 检查 flag
      if (!c.unlockFlag) {
        return { ...c, isUnlocked: true };
      }
      const isUnlocked = getFlag(statData, c.unlockFlag);
      return { ...c, isUnlocked };
    });
  }

  /**
   * 列出已解锁联系人
   */
  listUnlockedContacts(statData: Record<string, unknown>): PhoneContact[] {
    return this.listContacts(statData)
      .filter((c) => c.isUnlocked)
      .map(({ isUnlocked: _isUnlocked, ...rest }) => rest);
  }

  /**
   * 触发剧情短信(根据当前天数/时段/flag)
   *  - 返回新收到的短信列表
   *  - 调用方应将 stateOps 合并到 stat_data
   */
  checkIncomingSms(statData: Record<string, unknown>): {
    newMessages: Array<{ id: string; record: PhoneSmsRecord; template: SmsTemplate }>;
    stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  } {
    if (!this.hasPhone(statData)) {
      return { newMessages: [], stateOps: [] };
    }

    const phone = this.read(statData);
    const time = asObj(statData.时间);
    const day = asNum(time.天数);
    const timeSlot = asStr(time.时段);

    const existingIds = new Set(Object.keys(phone.短信记录));
    const newMessages: Array<{ id: string; record: PhoneSmsRecord; template: SmsTemplate }> = [];
    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];

    for (const tpl of SMS_TEMPLATES) {
      // 已存在则跳过
      if (existingIds.has(tpl.id)) continue;

      // 检查触发条件
      if (tpl.trigger.day !== undefined && tpl.trigger.day !== day) continue;
      if (tpl.trigger.timeSlot && tpl.trigger.timeSlot !== timeSlot) continue;
      if (tpl.trigger.requiredFlag && !getFlag(statData, tpl.trigger.requiredFlag)) continue;
      if (tpl.trigger.excludedFlag && getFlag(statData, tpl.trigger.excludedFlag)) continue;

      const playerName = asStr(asObj(statData.主角).玩家姓名, '玩家');
      const content = tpl.content.replace(/\{\{玩家姓名\}\}/g, playerName);

      const record: PhoneSmsRecord = {
        发送者: tpl.from,
        接收者: playerName,
        内容: content,
        时间: now(),
        已读: 0,
      };

      newMessages.push({ id: tpl.id, record, template: tpl });
      stateOps.push({ op: 'add', path: `手机.短信记录.${tpl.id}`, value: record });
    }

    if (newMessages.length > 0) {
      stateOps.push({
        op: 'replace',
        path: '手机.短信总数',
        value: phone.短信总数 + newMessages.length,
      });
    }

    return { newMessages, stateOps };
  }

  /**
   * 发送短信
   */
  sendSms(statData: Record<string, unknown>, req: SendSmsRequest): SendSmsResult {
    if (!this.hasPhone(statData)) {
      return { ok: false, reason: '尚未拥有手机', cost: 0, stateOps: [] };
    }

    const phone = this.read(statData);

    if (phone.话费余额 < PHONE_RATES.smsCost) {
      return { ok: false, reason: `话费不足(需 ${PHONE_RATES.smsCost} 日元,余额 ${phone.话费余额} 日元)`, cost: 0, stateOps: [] };
    }

    if (!req.to.trim()) {
      return { ok: false, reason: '收件人不能为空', cost: 0, stateOps: [] };
    }

    if (!req.content.trim()) {
      return { ok: false, reason: '短信内容不能为空', cost: 0, stateOps: [] };
    }

    // PHS 短信长度限制(全角 70 字符)
    if (req.content.length > 70) {
      return { ok: false, reason: '短信内容过长(PHS 上限 70 字符)', cost: 0, stateOps: [] };
    }

    const id = genId('sms_out');
    const playerName = asStr(asObj(statData.主角).玩家姓名, '玩家');
    const record: PhoneSmsRecord = {
      发送者: playerName,
      接收者: req.to,
      内容: req.content,
      时间: now(),
      已读: 1,
    };

    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'add', path: `手机.短信记录.${id}`, value: record },
      { op: 'replace', path: '手机.话费余额', value: phone.话费余额 - PHONE_RATES.smsCost },
      { op: 'replace', path: '手机.短信总数', value: phone.短信总数 + 1 },
      // 今日消费统计
      { op: 'replace', path: '主角.今日总消费', value: asNum(asObj(statData.主角).今日总消费) + PHONE_RATES.smsCost },
    ];

    return {
      ok: true,
      cost: PHONE_RATES.smsCost,
      record,
      stateOps,
    };
  }

  /**
   * 拨打电话
   *  - 自动模拟通话时长(15-120 秒)
   */
  call(statData: Record<string, unknown>, target: string): CallResult {
    if (!this.hasPhone(statData)) {
      return { ok: false, reason: '尚未拥有手机', cost: 0, durationSec: 0, stateOps: [] };
    }

    const phone = this.read(statData);

    if (phone.话费余额 < PHONE_RATES.callMinCost) {
      return { ok: false, reason: `话费不足(最低需 ${PHONE_RATES.callMinCost} 日元)`, cost: 0, durationSec: 0, stateOps: [] };
    }

    if (!target.trim()) {
      return { ok: false, reason: '对方号码不能为空', cost: 0, durationSec: 0, stateOps: [] };
    }

    // 模拟通话时长
    const durationSec = Math.floor(15 + Math.random() * 105);
    const cost = Math.max(PHONE_RATES.callMinCost, Math.ceil(durationSec * PHONE_RATES.callPerSec));

    if (phone.话费余额 < cost) {
      // 通话中途欠费
      return { ok: false, reason: `通话中途欠费(需 ${cost} 日元,余额 ${phone.话费余额} 日元)`, cost: 0, durationSec: 0, stateOps: [] };
    }

    const id = genId('call');
    const record: PhoneCallRecord = {
      对方: target,
      方向: '拨出',
      时长秒: durationSec,
      时间: now(),
    };

    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'add', path: `手机.通话记录.${id}`, value: record },
      { op: 'replace', path: '手机.话费余额', value: phone.话费余额 - cost },
      { op: 'replace', path: '手机.通话总数', value: phone.通话总数 + 1 },
      { op: 'replace', path: '主角.今日总消费', value: asNum(asObj(statData.主角).今日总消费) + cost },
    ];

    return {
      ok: true,
      cost,
      durationSec,
      record,
      stateOps,
    };
  }

  /**
   * 标记短信已读
   */
  markSmsRead(statData: Record<string, unknown>, smsId: string): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const phone = this.read(statData);
    const record = phone.短信记录[smsId];
    if (!record || record.已读 === 1) return [];
    return [
      {
        op: 'replace',
        path: `手机.短信记录.${smsId}.已读`,
        value: 1,
      },
    ];
  }

  /**
   * 贪吃蛇得分结算
   */
  submitSnakeScore(statData: Record<string, unknown>, score: number): SnakeScoreResult {
    if (!this.hasPhone(statData)) {
      return { ok: false, score, isHighScore: false, bonus: 0, stateOps: [] };
    }

    const phone = this.read(statData);
    const isHighScore = score > phone.贪吃蛇最高分;
    const bonus = calcSnakeBonus(score);

    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];

    if (isHighScore) {
      stateOps.push({ op: 'replace', path: '手机.贪吃蛇最高分', value: score });
    }

    if (bonus > 0) {
      stateOps.push({
        op: 'replace',
        path: '手机.话费余额',
        value: phone.话费余额 + bonus,
      });
    }

    return {
      ok: true,
      score,
      isHighScore,
      bonus,
      stateOps,
    };
  }

  /**
   * 充值话费(剧情/事件触发)
   */
  recharge(statData: Record<string, unknown>, amount: number): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const phone = this.read(statData);
    return [
      { op: 'replace', path: '手机.话费余额', value: phone.话费余额 + amount },
    ];
  }

  /**
   * 剧情获得手机(第3天左右触发)
   */
  acquirePhone(statData: Record<string, unknown>, model = '京瓷 K系列'): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    return [
      { op: 'replace', path: '手机.拥有手机', value: 1 },
      { op: 'replace', path: '手机.机型', value: model },
      { op: 'replace', path: '手机.话费余额', value: PHONE_RATES.initialBalance },
    ];
  }

  /**
   * 贪吃蛇游戏配置(供 UI 使用)
   */
  getSnakeConfig() {
    return SNAKE_GAME_CONFIG;
  }
}

export const phoneEngine = new PhoneEngine();
