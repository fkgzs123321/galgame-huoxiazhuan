/**
 * 活侠传 · 前置与错过运行时
 *
 * ★ 职责：把设计里的「数据驱动的条件系统」真正跑起来。
 *   引擎层（脚本/引擎.js）只管通用算法，本文件负责本卡的具体语义：
 *     - 读 MVU 变量 → 求值条件 → 得出「现在能做什么」
 *     - 过期窗关闭时把单元写进 `前置.已错过`（对应原作 `_modifyFlagsWhenFalse`）
 *     - 对外只吐「结果清单」，绝不吐条件明细（AI 不该知道它错过了什么）
 *
 * ★ 三条硬约束（照搬原作逆向所得）：
 *   ① 不满足前置 = 选项根本不出现。不给 AI 看被隐藏的项
 *   ② 绝大多数错过是静默的。663 次判定里只有 3 处写给玩家看
 *   ③ 错过不可逆。已写进 `已错过` 的，永不复活
 */

import { 前置表, 单元表, 行动表, 门派阶段门槛 } from './契约';

// ══════════════════════════════════════════════════════════════
// 一、取值：从 MVU 变量里按路径取数
// ══════════════════════════════════════════════════════════════

/**
 * 按 `世界.年` / `关系.唐布衣.好感` 这样的路径取值。
 * 取不到返回 undefined —— 由调用方决定怎么处理，不在这里兜底成 0。
 */
export function 取值(变: Record<string, unknown>, 路径: string): unknown {
  const 段 = 路径.split('.');
  let 当前: unknown = 变;
  for (const k of 段) {
    if (当前 === null || 当前 === undefined || typeof 当前 !== 'object') return undefined;
    当前 = (当前 as Record<string, unknown>)[k];
  }
  return 当前;
}

/** 比较运算 —— 对应原作 `StatCompareType` 六种 */
export function 比较(左: unknown, 符: string, 右: unknown): boolean {
  const l = Number(左);
  const r = Number(右);

  // 非数值：只支持相等 / 不等
  if (Number.isNaN(l) || Number.isNaN(r)) {
    if (符 === '==' || 符 === '=') return 左 === 右;
    if (符 === '!=' || 符 === '<>') return 左 !== 右;
    return false;
  }

  switch (符) {
    case '==':
    case '=':
      return l === r;
    case '!=':
    case '<>':
      return l !== r;
    case '<':
      return l < r;
    case '<=':
      return l <= r;
    case '>':
      return l > r;
    case '>=':
      return l >= r;
    default:
      return false;
  }
}

// ══════════════════════════════════════════════════════════════
// 二、条件求值：支持 所有 / 任一 嵌套（对应原作 AND/OR 组合树）
// ══════════════════════════════════════════════════════════════

export type 条件 =
  | { 目标: string; 比较: string; 值: unknown }
  | { 所有: 条件[] }
  | { 任一: 条件[] };

/** 求值一个条件树 */
export function 求值(条件: 条件, 变: Record<string, unknown>): boolean {
  if ('所有' in 条件) {
    return 条件.所有.every(c => 求值(c, 变));
  }
  if ('任一' in 条件) {
    return 条件.任一.some(c => 求值(c, 变));
  }
  return 比较(取值(变, 条件.目标), 条件.比较, 条件.值);
}

/** 按 id 查前置表并求值 */
export function 判前置(id: string, 变: Record<string, unknown>): boolean {
  const 项 = 前置表.find(p => p.id === id);
  if (!项) {
    console.warn('[活侠传] 前置未定义:', id);
    return false;
  }
  return 求值(项.条件 as 条件, 变);
}

/** 一组前置全通过才算通过 */
export function 判一组(ids: string[] | undefined, 变: Record<string, unknown>): boolean {
  if (!ids || !ids.length) return true;
  return ids.every(id => 判前置(id, 变));
}

// ══════════════════════════════════════════════════════════════
// 三、时间窗：对应原作 `_timeCheckType`（特定 / 区间 / 周期）
// ══════════════════════════════════════════════════════════════

/** 时间三元组 → 可比较的序数。★ 原作 `ConvertToRounds() = (Y-1)*12*3 + (M-1)*3 + S` */
export function 时序(年: number, 月: number, 旬: string): number {
  const s = 旬 === '上旬' ? 1 : 旬 === '中旬' ? 2 : 3;
  return (年 - 1) * 36 + (月 - 1) * 3 + (s - 1);
}

/** 从变量里取当前时序 */
export function 当前时序(变: Record<string, unknown>): number {
  const 世界 = (变.世界 ?? {}) as Record<string, unknown>;
  return 时序(Number(世界.年) || 1, Number(世界.月) || 1, String(世界.旬 || '上旬'));
}

export type 窗口 =
  | { 类型: '无' }
  | { 类型: '特定'; 值: [number, number, number] }
  | { 类型: '区间'; 从: [number, number, number]; 到: [number, number, number] }
  | { 类型: '周期'; 每: number };

/** 窗口是否当前开启 */
export function 窗口开启(窗: 窗口 | undefined, 变: Record<string, unknown>): boolean {
  if (!窗 || 窗.类型 === '无') return true;
  const now = 当前时序(变);

  if (窗.类型 === '特定') {
    return now === 时序(...窗.值);
  }
  if (窗.类型 === '区间') {
    return now >= 时序(...窗.从) && now <= 时序(...窗.到);
  }
  if (窗.类型 === '周期') {
    return now % Math.max(1, 窗.每) === 0;
  }
  return true;
}

/** 窗口是否已过期（过去了，且当前不在窗口内）—— 用于写「错过」 */
export function 窗口已过期(窗: 窗口 | undefined, 变: Record<string, unknown>): boolean {
  if (!窗 || 窗.类型 === '无') return false;
  const now = 当前时序(变);

  if (窗.类型 === '特定') return now > 时序(...窗.值);
  if (窗.类型 === '区间') return now > 时序(...窗.到);
  return false; // 周期型不算过期
}

// ══════════════════════════════════════════════════════════════
// 四、对外接口
// ══════════════════════════════════════════════════════════════

export interface 可选项 {
  id: string;
  名: string;
  地点?: string;
  耗行动: number;
  /**
   * 来源标记 —— 界面据此区分三类可做的事：
   *   （未标）= 契约层手写的行动表（基础日常）
   *   '事件'  = 原作 story-branch-timeline 的事件（到了这旬就该发生）
   *   '养成'  = 原作 training 表的养成指令（按权重抽，随心相分档）
   */
  来源?: '事件' | '养成';
  /** 原作事件的类别（主线/支线/定期/随机/闲聊） */
  类别?: string;
  /** 养成指令的心相档位（低落/平常/高昂） */
  档?: string;
  /** 养成指令在该档位下的实际效果（给界面显示） */
  效果?: Record<string, number>;
}

/**
 * ★ 核心接口：算出「这一旬现在能做什么」。
 *
 * 返回的只有**能做的事**。条件不满足的、窗口过期的，一律不出现 ——
 * 这是原作 `~x` 哨兵的设计，玩家（和 AI）都不知道它存在过。
 *
 * @param 变 MVU 变量
 * @param 地点 可选：只列出某地点的行动
 */
export function 能做什么(变: Record<string, unknown>, 地点?: string): 可选项[] {
  const 行动点 = Number(取值(变, '世界.行动次数')) || 0;
  const 出: 可选项[] = [];

  // ① 地点行动表
  for (const a of 行动表) {
    if (地点 && a.地点 !== 地点) continue;
    if (a.耗行动 > 行动点) continue; // 行动点不够，不显示
    if (!判一组((a as { 前置?: string[] }).前置, 变)) continue; // 前置不满足，不显示
    if (!窗口开启((a as { 窗口?: 窗口 }).窗口, 变)) continue;
    出.push({ id: a.id, 名: a.名, 地点: a.地点, 耗行动: a.耗行动 });
  }

  // ② 单元表
  for (const u of 单元表) {
    if (地点) continue; // 单元不绑定地点，单独列
    if (u.行动点 > 行动点) continue;
    if (!判一组(u.前置, 变)) continue;
    if (!窗口开启(u.窗口 as 窗口, 变)) continue;
    出.push({ id: u.id, 名: u.名, 耗行动: u.行动点 });
  }

  return 出;
}

/**
 * ★ 过期扫描：把窗口关闭的单元记进「已错过」。
 *
 * 对应原作 `MissionCheckData._modifyFlagsWhenFalse` ——
 * **检查时无论成败都会记账**，这是「错过也被记录」的实现。
 *
 * 返回需要追加到 `前置.已错过` 的 id 列表（已去重）。
 */
export function 扫过期(变: Record<string, unknown>): string[] {
  const 现有 = String(取值(变, '前置.已错过') || '')
    .split('、')
    .filter(Boolean);
  const 集合 = new Set(现有);
  const 新错过: string[] = [];

  for (const u of 单元表) {
    const 窗 = u.窗口 as 窗口;
    if (!窗口已过期(窗, 变)) continue;
    if (集合.has(u.id)) continue; // 已记过，不重复
    // 前置从没满足过 → 那不算「错过」，是本来就没资格
    if (!判一组(u.前置, 变)) continue;
    集合.add(u.id);
    新错过.push(u.id);
  }
  return 新错过;
}

/**
 * 已解锁的条件名（玩家在「见闻」里看得见的那部分）
 */
export function 已解锁名(变: Record<string, unknown>): string[] {
  return 前置表.filter(p => 求值(p.条件 as 条件, 变)).map(p => p.名);
}

/**
 * ★ 玩家可见的条件提示。
 * 原作 663 次判定里只有 3 处会给提示 —— 本卡保持这个稀有度：
 * 只有 `提示` 字段非空的才返回，且只返回**当前未满足**的（还在门槛外的）。
 */
export function 可见提示(变: Record<string, unknown>): string[] {
  return 前置表
    .filter(p => p.提示 && !求值(p.条件 as 条件, 变))
    .map(p => p.提示 as string);
}

/**
 * ★ 只因引擎使用的「错过账本」。
 * 绝不可交给 AI —— 明细会剧透。
 */
export function 错过账本(变: Record<string, unknown>): { 数: number; 明细: string[] } {
  const 明细 = String(取值(变, '前置.已错过') || '')
    .split('、')
    .filter(Boolean);
  return { 数: 明细.length, 明细 };
}

// ══════════════════════════════════════════════════════════════
// 五、门派阶段推进
// ══════════════════════════════════════════════════════════════

/**
 * 按门槛算出当前应有的门派阶段。
 * ★ 只升不降 —— 原作是「起死回生」的叙事，回落没有意义。
 */
export function 算门派阶段(变: Record<string, unknown>): number {
  const 门人 = Number(取值(变, '世界.门人')) || 0;
  const 向心 = Number(取值(变, '世界.向心')) || 0;
  const 贡献 = Number(取值(变, '世界.贡献度')) || 0;

  let 达 = 1;
  for (const 阶 of 门派阶段门槛) {
    if (门人 >= 阶.门人 && 向心 >= 阶.向心 && 贡献 >= 阶.贡献度) {
      达 = Math.max(达, 阶.阶段);
    }
  }
  return 达;
}
