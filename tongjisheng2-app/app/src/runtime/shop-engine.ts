/**
 * Shop Engine · 商城运行时引擎（阶段3 步骤8）
 *
 * 职责:
 *  - 检查店铺是否可访问(地点/时段匹配)
 *  - 购买商品(扣现金,加库存,应用消耗品效果)
 *  - 使用物品(应用效果到 stat_data)
 *  - 出售物品(回收现金,减库存)
 *  - 礼物赠送(对女角应用好感/心动加成)
 *  - 库存查询
 *
 * 集成:
 *  - ui/ShopPanel 调用本引擎
 *  - 生成 stateOps,合并到 CandidateChangeSet
 */

import {
  SHOP_DEFS,
  SHOP_ITEMS,
  findItem,
  findShop,
  listShopItems,
  type ItemCategory,
  type ItemEffect,
  type ShopDef,
  type ShopId,
  type ShopItem,
} from '../content/shop/items-data';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** 库存条目 */
export interface InventoryEntry {
  商品ID: string;
  商品名: string;
  分类: string;
  单价: number;
  数量: number;
  购入时间: string;
  来源: string;
}

/** 商城命名空间 */
export interface ShopNamespace {
  解锁店铺: string;
  信誉度: number;
  累计消费: number;
  累计购入: number;
  累计售出: number;
  库存: Record<string, InventoryEntry>;
}

/** 购买结果 */
export interface BuyResult {
  ok: boolean;
  reason?: string;
  /** 实际花费 */
  cost: number;
  /** 购买数量 */
  quantity: number;
  /** 库存条目(更新后) */
  entry?: InventoryEntry;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 使用物品结果 */
export interface UseItemResult {
  ok: boolean;
  reason?: string;
  /** 应用的效果 */
  appliedEffects: ItemEffect[];
  /** 应用后的剩余数量 */
  remaining: number;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 出售结果 */
export interface SellResult {
  ok: boolean;
  reason?: string;
  /** 回收金额(原价的 50%) */
  gain: number;
  /** 出售后剩余数量 */
  remaining: number;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 赠送礼物结果 */
export interface GiftResult {
  ok: boolean;
  reason?: string;
  /** 是否偏好女角(好感加倍) */
  isPreferred: boolean;
  /** 实际好感加成 */
  affectionDelta: number;
  /** 实际心动加成 */
  heartbeatDelta: number;
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

/** 可访问店铺 */
export interface AccessibleShop {
  shop: ShopDef;
  isAccessible: boolean;
  reasons: string[];
}

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

function now(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ───────────────────────────────────────────────────────────
//  ShopEngine
// ───────────────────────────────────────────────────────────

class ShopEngine {
  /**
   * 读取商城命名空间
   */
  read(statData: Record<string, unknown>): ShopNamespace {
    const s = asObj(statData.商城);
    return {
      解锁店铺: asStr(s.解锁店铺, '便利店'),
      信誉度: asNum(s.信誉度),
      累计消费: asNum(s.累计消费),
      累计购入: asNum(s.累计购入),
      累计售出: asNum(s.累计售出),
      库存: (s.库存 ?? {}) as Record<string, InventoryEntry>,
    };
  }

  /**
   * 列出所有店铺(标注可访问状态)
   */
  listShops(statData: Record<string, unknown>): AccessibleShop[] {
    const shop = this.read(statData);
    const unlockedShops = shop.解锁店铺.split(',').map((s) => s.trim()).filter(Boolean);
    const scene = asObj(statData.场景);
    const location = asStr(scene.当前地点);
    const time = asObj(statData.时间);
    const timeSlot = asStr(time.时段);

    return SHOP_DEFS.map((s) => {
      const reasons: string[] = [];
      let isAccessible = true;

      // 检查店铺是否解锁
      if (!unlockedShops.includes(s.id)) {
        isAccessible = false;
        reasons.push('店铺未解锁');
      }

      // 检查地点匹配
      if (s.id !== '网上商城') {
        const locationMatch = s.locations.some(
          (l) => location.includes(l) || l.includes(location),
        );
        if (!locationMatch) {
          isAccessible = false;
          reasons.push(`需到达:${s.locations.join('/')}`);
        }
      } else {
        // 网上商城需要电脑
        const hasComputer = asNum(asObj(statData.电脑).拥有电脑) === 1;
        if (!hasComputer) {
          isAccessible = false;
          reasons.push('需拥有电脑');
        }
      }

      // 检查时段(深夜大部分店铺关门,便利店除外)
      if (s.id !== '便利店' && s.id !== '网上商城') {
        if (timeSlot === '深夜') {
          isAccessible = false;
          reasons.push('深夜已关门');
        }
      }

      return { shop: s, isAccessible, reasons };
    });
  }

  /**
   * 列出指定店铺的商品
   */
  listItems(shopId: ShopId): ShopItem[] {
    return listShopItems(shopId);
  }

  /**
   * 获取商品详情
   */
  getItem(itemId: string): ShopItem | undefined {
    return findItem(itemId);
  }

  /**
   * 购买商品
   */
  buy(
    statData: Record<string, unknown>,
    itemId: string,
    quantity: number,
  ): BuyResult {
    if (quantity <= 0) {
      return { ok: false, reason: '数量必须大于 0', cost: 0, quantity: 0, stateOps: [] };
    }

    const item = findItem(itemId);
    if (!item) {
      return { ok: false, reason: `商品不存在: ${itemId}`, cost: 0, quantity: 0, stateOps: [] };
    }

    const shop = this.read(statData);
    const player = asObj(statData.主角);
    const cash = asNum(player.现金);

    const totalCost = item.price * quantity;
    if (cash < totalCost) {
      return {
        ok: false,
        reason: `现金不足(需 ${totalCost} 日元,余额 ${cash} 日元)`,
        cost: 0,
        quantity: 0,
        stateOps: [],
      };
    }

    // 检查一次性商品
    if (item.oneShot && shop.库存[itemId]) {
      return {
        ok: false,
        reason: '该商品为一次性,已购买过',
        cost: 0,
        quantity: 0,
        stateOps: [],
      };
    }

    // 检查解锁条件
    if (item.requiredFlag) {
      const hidden = asObj(statData.隐藏);
      if (!asBool(hidden[item.requiredFlag])) {
        return {
          ok: false,
          reason: `解锁条件未满足: ${item.requiredFlag}`,
          cost: 0,
          quantity: 0,
          stateOps: [],
        };
      }
    }

    // 更新库存
    const existing = shop.库存[itemId];
    const newQuantity = (existing?.数量 ?? 0) + quantity;
    const entry: InventoryEntry = {
      商品ID: itemId,
      商品名: item.name,
      分类: item.category,
      单价: item.price,
      数量: newQuantity,
      购入时间: now(),
      来源: item.availableAt[0] ?? '未知',
    };

    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'replace', path: `商城.库存.${itemId}`, value: entry },
      { op: 'replace', path: '主角.现金', value: cash - totalCost },
      { op: 'replace', path: '商城.累计消费', value: shop.累计消费 + totalCost },
      { op: 'replace', path: '商城.累计购入', value: shop.累计购入 + quantity },
      // 今日消费统计
      { op: 'replace', path: '主角.今日总消费', value: asNum(player.今日总消费) + totalCost },
    ];

    // 礼物类增加今日礼费
    if (item.isGift) {
      stateOps.push({
        op: 'replace',
        path: '主角.今日礼费',
        value: asNum(player.今日礼费) + totalCost,
      });
    } else if (item.category === '食品') {
      stateOps.push({
        op: 'replace',
        path: '主角.今日餐费',
        value: asNum(player.今日餐费) + totalCost,
      });
    }

    return {
      ok: true,
      cost: totalCost,
      quantity,
      entry,
      stateOps,
    };
  }

  /**
   * 使用物品(应用效果)
   */
  useItem(statData: Record<string, unknown>, itemId: string): UseItemResult {
    const shop = this.read(statData);
    const entry = shop.库存[itemId];
    if (!entry || entry.数量 <= 0) {
      return {
        ok: false,
        reason: '库存中没有该物品',
        appliedEffects: [],
        remaining: 0,
        stateOps: [],
      };
    }

    const item = findItem(itemId);
    if (!item) {
      return {
        ok: false,
        reason: '商品定义不存在',
        appliedEffects: [],
        remaining: entry.数量,
        stateOps: [],
      };
    }

    // 应用效果
    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];
    for (const eff of item.effects) {
      const currentVal = this.readPath(statData, eff.path);
      if (eff.type === 'add' && typeof eff.value === 'number') {
        if (typeof currentVal === 'number') {
          stateOps.push({
            op: 'replace',
            path: eff.path,
            value: currentVal + eff.value,
          });
        }
      } else if (eff.type === 'replace' || eff.type === 'set_flag') {
        stateOps.push({
          op: 'replace',
          path: eff.path,
          value: eff.value,
        });
      }
    }

    // 消耗品:数量 -1
    const remaining = entry.数量 - 1;
    if (item.consumable) {
      if (remaining <= 0) {
        stateOps.push({ op: 'remove', path: `商城.库存.${itemId}` });
      } else {
        stateOps.push({
          op: 'replace',
          path: `商城.库存.${itemId}.数量`,
          value: remaining,
        });
      }
    }

    return {
      ok: true,
      appliedEffects: item.effects,
      remaining,
      stateOps,
    };
  }

  /**
   * 出售物品(原价 50% 回收)
   */
  sellItem(statData: Record<string, unknown>, itemId: string, quantity: number): SellResult {
    if (quantity <= 0) {
      return { ok: false, reason: '数量必须大于 0', gain: 0, remaining: 0, stateOps: [] };
    }

    const shop = this.read(statData);
    const entry = shop.库存[itemId];
    if (!entry || entry.数量 < quantity) {
      return {
        ok: false,
        reason: '库存不足',
        gain: 0,
        remaining: entry?.数量 ?? 0,
        stateOps: [],
      };
    }

    const gain = Math.floor(entry.单价 * 0.5 * quantity);
    const remaining = entry.数量 - quantity;
    const player = asObj(statData.主角);
    const cash = asNum(player.现金);

    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'replace', path: '主角.现金', value: cash + gain },
      { op: 'replace', path: '商城.累计售出', value: shop.累计售出 + quantity },
    ];

    if (remaining <= 0) {
      stateOps.push({ op: 'remove', path: `商城.库存.${itemId}` });
    } else {
      stateOps.push({
        op: 'replace',
        path: `商城.库存.${itemId}.数量`,
        value: remaining,
      });
    }

    return {
      ok: true,
      gain,
      remaining,
      stateOps,
    };
  }

  /**
   * 赠送礼物给当前女角
   */
  giftToHeroine(statData: Record<string, unknown>, itemId: string): GiftResult {
    const shop = this.read(statData);
    const entry = shop.库存[itemId];
    if (!entry || entry.数量 <= 0) {
      return {
        ok: false,
        reason: '库存中没有该物品',
        isPreferred: false,
        affectionDelta: 0,
        heartbeatDelta: 0,
        stateOps: [],
      };
    }

    const item = findItem(itemId);
    if (!item || !item.isGift) {
      return {
        ok: false,
        reason: '该物品不是礼物',
        isPreferred: false,
        affectionDelta: 0,
        heartbeatDelta: 0,
        stateOps: [],
      };
    }

    // 检查当前女角
    const currentHeroine = asObj(statData.当前女角);
    const heroineName = asStr(currentHeroine.姓名);
    if (!heroineName || heroineName === '无') {
      return {
        ok: false,
        reason: '当前没有可赠送的女角',
        isPreferred: false,
        affectionDelta: 0,
        heartbeatDelta: 0,
        stateOps: [],
      };
    }

    // 检查偏好
    const preferredByList = (item.preferredBy ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const isPreferred = preferredByList.includes(heroineName);

    // 计算加成
    let affectionDelta = 0;
    let heartbeatDelta = 0;
    let trustDelta = 0;

    for (const eff of item.effects) {
      if (eff.path === '当前女角.好感度' && typeof eff.value === 'number') {
        affectionDelta = isPreferred ? eff.value * 2 : eff.value;
      } else if (eff.path === '当前女角.心动值' && typeof eff.value === 'number') {
        heartbeatDelta = isPreferred ? eff.value * 2 : eff.value;
      } else if (eff.path === '当前女角.信任度' && typeof eff.value === 'number') {
        trustDelta = eff.value;
      }
    }

    const currentAff = asNum(currentHeroine.好感度);
    const currentHea = asNum(currentHeroine.心动值);
    const currentTru = asNum(currentHeroine.信任度);

    const stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [
      { op: 'replace', path: '当前女角.好感度', value: currentAff + affectionDelta },
      { op: 'replace', path: '当前女角.心动值', value: currentHea + heartbeatDelta },
    ];

    if (trustDelta !== 0) {
      stateOps.push({ op: 'replace', path: '当前女角.信任度', value: currentTru + trustDelta });
    }

    // 消耗礼物
    const remaining = entry.数量 - 1;
    if (remaining <= 0) {
      stateOps.push({ op: 'remove', path: `商城.库存.${itemId}` });
    } else {
      stateOps.push({ op: 'replace', path: `商城.库存.${itemId}.数量`, value: remaining });
    }

    return {
      ok: true,
      isPreferred,
      affectionDelta,
      heartbeatDelta,
      stateOps,
    };
  }

  /**
   * 列出库存(按分类分组)
   */
  listInventory(statData: Record<string, unknown>, category?: ItemCategory): InventoryEntry[] {
    const shop = this.read(statData);
    const entries = Object.values(shop.库存).filter((e) => e.数量 > 0);
    if (category) {
      return entries.filter((e) => e.分类 === category);
    }
    return entries;
  }

  /**
   * 列出可送礼物的物品
   */
  listGiftItems(statData: Record<string, unknown>): Array<{ entry: InventoryEntry; item: ShopItem }> {
    const shop = this.read(statData);
    const result: Array<{ entry: InventoryEntry; item: ShopItem }> = [];
    for (const entry of Object.values(shop.库存)) {
      if (entry.数量 <= 0) continue;
      const item = findItem(entry.商品ID);
      if (item && item.isGift) {
        result.push({ entry, item });
      }
    }
    return result;
  }

  /**
   * 解锁店铺
   */
  unlockShop(statData: Record<string, unknown>, shopId: ShopId): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const shop = this.read(statData);
    const list = shop.解锁店铺.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes(shopId)) return [];
    list.push(shopId);
    return [
      { op: 'replace', path: '商城.解锁店铺', value: list.join(',') },
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

export const shopEngine = new ShopEngine();

// 导出商品库以便 UI 使用
export { SHOP_ITEMS, SHOP_DEFS, findItem, findShop, listShopItems };
export type { ItemCategory, ItemEffect, ShopDef, ShopId, ShopItem };
