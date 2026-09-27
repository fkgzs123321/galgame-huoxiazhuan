/**
 * 商城面板（阶段3 步骤8）
 *
 * 三 tab 设计:
 *  - 商店:列出所有店铺,显示可访问状态,进入后浏览商品
 *  - 库存:玩家拥有的物品,可使用/出售/赠送
 *  - 交易记录:展示最近交易/操作结果
 *
 * 集成:
 *  - GameView 添加「🛍 商城」按钮
 *  - App.tsx 管理 gamePanel='shop' 状态
 *  - 调用 shopEngine.buy/sell/useItem/giftToHeroine
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_VARS } from './types';
import {
  shopEngine,
  type AccessibleShop,
  type BuyResult,
  type GiftResult,
  type InventoryEntry,
  type SellResult,
  type ShopId,
  type ShopItem,
  type UseItemResult,
} from '../runtime/shop-engine';
import { SHOP_DEFS, findItem } from '../content/shop/items-data';
import type { ItemCategory } from '../content/shop/items-data';
import type { MvuRuntime } from '../runtime/mvu-runtime';

// ───────────────────────────────────────────────────────────
//  样式
// ───────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: 20,
  background: THEME_VARS.overlaySoft,
  borderRadius: 16,
  border: `1px solid ${THEME_VARS.border}`,
  boxShadow: THEME_VARS.shadowMd,
  fontSize: 13,
  color: THEME_VARS.text,
  backdropFilter: 'blur(8px)',
  animation: 'soft-fade-in 0.4s ease',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginTop: 8,
  marginBottom: 16,
  padding: 4,
  background: THEME_VARS.bg,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  flexWrap: 'wrap',
};

const tabBtnStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 100,
  padding: '8px 10px',
  background: 'transparent',
  color: THEME_VARS.textMuted,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0.5,
  transition: 'all 0.25s ease',
};

const tabBtnActiveStyle: React.CSSProperties = {
  ...tabBtnStyle,
  background: `linear-gradient(135deg, ${THEME_VARS.success} 0%, ${THEME_VARS.primary} 100%)`,
  color: '#fff',
  boxShadow: THEME_VARS.shadowSm,
};

const sectionStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  background: THEME_VARS.overlay,
  borderRadius: 12,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  boxShadow: THEME_VARS.shadowSm,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 12,
  fontFamily: THEME_VARS.fontDisplay,
  fontSize: 14,
  fontWeight: 500,
  color: THEME_VARS.text,
  letterSpacing: 0.8,
  paddingBottom: 8,
  borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
};

const emptyStyle: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: THEME_VARS.textMuted,
  fontSize: 11,
  fontStyle: 'italic',
};

// ───────────────────────────────────────────────────────────
//  常量
// ───────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<ItemCategory, string> = {
  食品: '#ff9800',
  礼物: '#e91e63',
  药品: '#4caf50',
  书: '#2196f3',
  电子: '#9c27b0',
  杂货: '#607d8b',
};

const CATEGORY_ICON: Record<ItemCategory, string> = {
  食品: '🍔',
  礼物: '🎁',
  药品: '💊',
  书: '📚',
  电子: '📱',
  杂货: '🧴',
};

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface ShopPanelProps {
  /** MVU 运行时 */
  mvu?: MvuRuntime;
  /** 是否只读 */
  readOnly?: boolean;
}

type PanelTab = 'shops' | 'inventory' | 'history';

interface HistoryEntry {
  ts: number;
  type: string;
  itemName: string;
  detail: string;
  success: boolean;
}

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function ShopPanel({ mvu, readOnly = false }: ShopPanelProps) {
  const [tab, setTab] = useState<PanelTab>('shops');
  const [selectedShopId, setSelectedShopId] = useState<ShopId | null>(null);
  const [filterCategory, setFilterCategory] = useState<ItemCategory | 'all'>('all');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const sd = useMemo(() => {
    if (!mvu) return {} as Record<string, unknown>;
    return mvu.snapshot();
  }, [mvu, refreshKey]);

  const accessibleShops = useMemo<AccessibleShop[]>(() => {
    if (!mvu) return [];
    return shopEngine.listShops(sd);
  }, [sd, mvu]);

  const inventory = useMemo<InventoryEntry[]>(() => {
    if (!mvu) return [];
    return shopEngine.listInventory(sd, filterCategory === 'all' ? undefined : filterCategory);
  }, [sd, filterCategory, mvu]);

  const cash = useMemo(() => {
    const player = (sd.主角 ?? {}) as Record<string, unknown>;
    return Number(player.现金 ?? 0);
  }, [sd]);

  // 显示 toast
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 应用 stateOps 到 MVU
  const applyStateOps = useCallback(
    (stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>) => {
      if (!mvu || stateOps.length === 0) return;
      try {
        // 通过 MVU runtime 提供的 patch 接口应用
        // 这里直接调用 applyPatch,如果不存在则降级到 set
        const runtime = mvu as unknown as {
          applyPatch?: (ops: Array<{ op: string; path: string; value?: unknown }>) => void;
          set?: (path: string, value: unknown) => void;
        };
        if (runtime.applyPatch) {
          runtime.applyPatch(stateOps);
        } else if (runtime.set) {
          for (const op of stateOps) {
            if (op.op === 'remove') {
              runtime.set(op.path, null);
            } else {
              runtime.set(op.path, op.value);
            }
          }
        }
        setRefreshKey((k) => k + 1);
      } catch (e) {
        showToast('error', `应用变更失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [mvu, showToast],
  );

  // 购买商品
  const handleBuy = useCallback(
    (item: ShopItem, quantity: number) => {
      if (!mvu) return;
      const result = shopEngine.buy(sd, item.id, quantity);
      if (result.ok) {
        applyStateOps(result.stateOps);
        setHistory((h) => [
          {
            ts: Date.now(),
            type: 'buy' as const,
            itemName: item.name,
            detail: `×${quantity} -${result.cost} 日元`,
            success: true,
          },
          ...h,
        ].slice(0, 50));
        showToast('success', `购买成功:${item.name} ×${quantity},消费 ${result.cost} 日元`);
      } else {
        setHistory((h) => [
          {
            ts: Date.now(),
            type: 'buy',
            itemName: item.name,
            detail: result.reason ?? '失败',
            success: false,
          },
          ...h,
        ].slice(0, 50));
        showToast('error', result.reason ?? '购买失败');
      }
    },
    [sd, mvu, applyStateOps, showToast],
  );

  // 使用物品
  const handleUse = useCallback(
    (entry: InventoryEntry) => {
      if (!mvu) return;
      const result = shopEngine.useItem(sd, entry.商品ID);
      if (result.ok) {
        applyStateOps(result.stateOps);
        const effects = result.appliedEffects.map((e) => e.description).filter(Boolean).join(', ');
        setHistory((h) => [
          {
            ts: Date.now(),
            type: 'use' as const,
            itemName: entry.商品名,
            detail: effects || '使用成功',
            success: true,
          },
          ...h,
        ].slice(0, 50));
        showToast('success', `使用了 ${entry.商品名}${effects ? '(' + effects + ')' : ''}`);
      } else {
        showToast('error', result.reason ?? '使用失败');
      }
    },
    [sd, mvu, applyStateOps, showToast],
  );

  // 出售物品
  const handleSell = useCallback(
    (entry: InventoryEntry, quantity: number) => {
      if (!mvu) return;
      const result = shopEngine.sellItem(sd, entry.商品ID, quantity);
      if (result.ok) {
        applyStateOps(result.stateOps);
        setHistory((h) => [
          {
            ts: Date.now(),
            type: 'sell',
            itemName: entry.商品名,
            detail: `×${quantity} +${result.gain} 日元`,
            success: true,
          },
          ...h,
        ].slice(0, 50));
        showToast('success', `出售成功:${entry.商品名} ×${quantity},回收 ${result.gain} 日元`);
      } else {
        showToast('error', result.reason ?? '出售失败');
      }
    },
    [sd, mvu, applyStateOps, showToast],
  );

  // 赠送礼物
  const handleGift = useCallback(
    (entry: InventoryEntry) => {
      if (!mvu) return;
      const result = shopEngine.giftToHeroine(sd, entry.商品ID);
      if (result.ok) {
        applyStateOps(result.stateOps);
        setHistory((h) => [
          {
            ts: Date.now(),
            type: 'gift' as const,
            itemName: entry.商品名,
            detail: `好感 ${result.affectionDelta >= 0 ? '+' : ''}${result.affectionDelta} 心动 ${result.heartbeatDelta >= 0 ? '+' : ''}${result.heartbeatDelta}${result.isPreferred ? ' ★偏好' : ''}`,
            success: true,
          },
          ...h,
        ].slice(0, 50));
        showToast(
          'success',
          `赠送 ${entry.商品名}${result.isPreferred ? '(偏好女角 ×2)' : ''},好感 ${result.affectionDelta >= 0 ? '+' : ''}${result.affectionDelta} 心动 ${result.heartbeatDelta >= 0 ? '+' : ''}${result.heartbeatDelta}`,
        );
      } else {
        showToast('error', result.reason ?? '赠送失败');
      }
    },
    [sd, mvu, applyStateOps, showToast],
  );

  const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'shops', label: '商店', icon: '🏬' },
    { key: 'inventory', label: '库存', icon: '🎒' },
    { key: 'history', label: '交易记录', icon: '📜' },
  ];

  return (
    <div style={containerStyle}>
      <header style={{
        paddingBottom: 10,
        marginBottom: 10,
        borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{
            margin: 0,
            fontFamily: THEME_VARS.fontDisplay,
            fontSize: 16,
            fontWeight: 500,
            color: THEME_VARS.success,
            letterSpacing: 1,
          }}>🛍 商城系统</h3>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.4 }}>
            Shop Panel · 90 年代日本·实体店 + 网上购物
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          background: THEME_VARS.primaryGlow,
          borderRadius: 8,
          fontSize: 12,
          color: THEME_VARS.primary,
          fontWeight: 600,
        }}>
          💰 现金 {cash.toLocaleString()} 日元
        </div>
      </header>

      {/* Toast 提示 */}
      {toast && (
        <div style={{
          padding: '8px 14px',
          marginBottom: 10,
          background: toast.type === 'success' ? '#e8f5e9' : toast.type === 'error' ? '#ffebee' : '#e3f2fd',
          color: toast.type === 'success' ? '#2e7d32' : toast.type === 'error' ? '#c62828' : '#1565c0',
          borderRadius: 6,
          fontSize: 11,
          border: `1px solid ${toast.type === 'success' ? '#4caf50' : toast.type === 'error' ? '#e53935' : '#2196f3'}55`,
        }}>
          {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ '}
          {toast.message}
        </div>
      )}

      <div style={tabBarStyle}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? tabBtnActiveStyle : tabBtnStyle}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
            {t.key === 'inventory' && inventory.length > 0 && (
              <span style={{
                marginLeft: 4,
                padding: '0 4px',
                background: THEME_VARS.success,
                color: '#fff',
                borderRadius: 8,
                fontSize: 9,
              }}>
                {inventory.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'shops' && (
        <ShopsTab
          accessibleShops={accessibleShops}
          selectedShopId={selectedShopId}
          onSelectShop={setSelectedShopId}
          sd={sd}
          readOnly={readOnly}
          onBuy={handleBuy}
        />
      )}

      {tab === 'inventory' && (
        <InventoryTab
          inventory={inventory}
          filterCategory={filterCategory}
          onFilterChange={setFilterCategory}
          readOnly={readOnly}
          onUse={handleUse}
          onSell={handleSell}
          onGift={handleGift}
        />
      )}

      {tab === 'history' && (
        <HistoryTab history={history} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  1. 商店 Tab
// ═══════════════════════════════════════════════════════════

interface ShopsTabProps {
  accessibleShops: AccessibleShop[];
  selectedShopId: ShopId | null;
  onSelectShop: (id: ShopId | null) => void;
  sd: Record<string, unknown>;
  readOnly: boolean;
  onBuy: (item: ShopItem, quantity: number) => void;
}

function ShopsTab({ accessibleShops, selectedShopId, onSelectShop, sd, readOnly, onBuy }: ShopsTabProps) {
  const selectedShop = useMemo(
    () => accessibleShops.find((s) => s.shop.id === selectedShopId) ?? null,
    [accessibleShops, selectedShopId],
  );

  const items = useMemo(() => {
    if (!selectedShopId) return [];
    return shopEngine.listItems(selectedShopId);
  }, [selectedShopId]);

  if (!selectedShopId) {
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>🏬 选择店铺</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accessibleShops.map(({ shop, isAccessible, reasons }) => (
            <button
              key={shop.id}
              onClick={() => isAccessible && onSelectShop(shop.id)}
              disabled={!isAccessible || readOnly}
              style={{
                padding: 12,
                background: isAccessible
                  ? `linear-gradient(135deg, ${THEME_VARS.success}11 0%, transparent 100%)`
                  : THEME_VARS.bg,
                color: isAccessible ? THEME_VARS.text : THEME_VARS.textMuted,
                border: `1px solid ${isAccessible ? THEME_VARS.success + '55' : THEME_VARS.borderSoft}`,
                borderLeft: `4px solid ${isAccessible ? THEME_VARS.success : THEME_VARS.borderSoft}`,
                borderRadius: 10,
                cursor: isAccessible && !readOnly ? 'pointer' : 'not-allowed',
                opacity: isAccessible ? 1 : 0.6,
                textAlign: 'left',
                fontSize: 13,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{shop.name}</div>
              <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 4 }}>{shop.description}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 10, flexWrap: 'wrap' }}>
                <span>🕒 {shop.openHours}</span>
                <span>📍 {shop.locations.join(' / ')}</span>
                {shop.eraNote && (
                  <span style={{ color: THEME_VARS.accent }}>🎬 {shop.eraNote}</span>
                )}
                {!isAccessible && reasons.length > 0 && (
                  <span style={{ color: THEME_VARS.danger }}>⚠ {reasons.join(', ')}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ ...sectionTitleStyle, marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          🏬 {selectedShop?.shop.name}
        </h4>
        <button
          onClick={() => onSelectShop(null)}
          style={{
            padding: '4px 10px',
            background: THEME_VARS.bg,
            color: THEME_VARS.textMuted,
            border: `1px solid ${THEME_VARS.borderSoft}`,
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ← 返回店铺列表
        </button>
      </div>
      <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 12 }}>
        {selectedShop?.shop.description} · {selectedShop?.shop.openHours}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {items.map((item) => {
          const color = CATEGORY_COLOR[item.category];
          const canBuy = !readOnly && (sd.主角 as { 现金?: number } | undefined)?.现金 !== undefined &&
            ((sd.主角 as { 现金?: number }).现金 ?? 0) >= item.price;
          return (
            <ItemCard
              key={item.id}
              item={item}
              color={color}
              canBuy={canBuy}
              readOnly={readOnly}
              onBuy={(qty) => onBuy(item, qty)}
            />
          );
        })}
      </div>
    </section>
  );
}

// 商品卡片
function ItemCard({
  item,
  color,
  canBuy,
  readOnly,
  onBuy,
}: {
  item: ShopItem;
  color: string;
  canBuy: boolean;
  readOnly: boolean;
  onBuy: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);

  return (
    <div style={{
      padding: 10,
      background: `linear-gradient(135deg, ${color}11 0%, transparent 100%)`,
      borderRadius: 8,
      border: `1px solid ${color}55`,
      borderLeft: `3px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME_VARS.text }}>
          {CATEGORY_ICON[item.category]} {item.name}
        </span>
        <span style={{
          fontSize: 10,
          padding: '1px 6px',
          borderRadius: 4,
          background: color + '22',
          color,
          fontWeight: 600,
        }}>
          {item.category}
        </span>
      </div>
      <div style={{ fontSize: 10, color: THEME_VARS.textMuted, lineHeight: 1.5 }}>
        {item.description}
      </div>
      {item.eraNote && (
        <div style={{ fontSize: 10, color: THEME_VARS.accent, fontStyle: 'italic' }}>
          🎬 {item.eraNote}
        </div>
      )}
      {item.effects.length > 0 && (
        <div style={{ fontSize: 10, color: THEME_VARS.success, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {item.effects.slice(0, 3).map((e, i) => (
            <span key={i}>· {e.description ?? `${e.path} ${e.value}`}</span>
          ))}
          {item.effects.length > 3 && (
            <span style={{ color: THEME_VARS.textMuted }}>… +{item.effects.length - 3}</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: THEME_VARS.primary }}>
          ¥ {item.price.toLocaleString()}
        </span>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              max={99}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              style={{
                width: 36,
                padding: '2px 4px',
                background: THEME_VARS.bg,
                color: THEME_VARS.text,
                border: `1px solid ${THEME_VARS.border}`,
                borderRadius: 4,
                fontSize: 10,
                textAlign: 'center',
              }}
            />
            <button
              onClick={() => onBuy(qty)}
              disabled={!canBuy}
              style={{
                padding: '3px 8px',
                background: canBuy ? THEME_VARS.success : THEME_VARS.textSoft,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: canBuy ? 'pointer' : 'not-allowed',
                fontSize: 10,
                opacity: canBuy ? 1 : 0.6,
              }}
            >
              购买
            </button>
          </div>
        )}
      </div>
      {item.isGift && item.preferredBy && (
        <div style={{ fontSize: 9, color: THEME_VARS.danger }}>
          ♥ 偏好:{item.preferredBy}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  2. 库存 Tab
// ═══════════════════════════════════════════════════════════

interface InventoryTabProps {
  inventory: InventoryEntry[];
  filterCategory: ItemCategory | 'all';
  onFilterChange: (c: ItemCategory | 'all') => void;
  readOnly: boolean;
  onUse: (entry: InventoryEntry) => void;
  onSell: (entry: InventoryEntry, quantity: number) => void;
  onGift: (entry: InventoryEntry) => void;
}

function InventoryTab({ inventory, filterCategory, onFilterChange, readOnly, onUse, onSell, onGift }: InventoryTabProps) {
  const categories: Array<ItemCategory | 'all'> = ['all', '食品', '礼物', '药品', '书', '电子', '杂货'];

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🎒 玩家库存 ({inventory.length})</h4>

      {/* 分类筛选 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => onFilterChange(c)}
            style={{
              padding: '3px 10px',
              background: filterCategory === c ? THEME_VARS.primary : THEME_VARS.bg,
              color: filterCategory === c ? '#fff' : THEME_VARS.textMuted,
              border: `1px solid ${filterCategory === c ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {c === 'all' ? '全部' : `${CATEGORY_ICON[c]} ${c}`}
          </button>
        ))}
      </div>

      {inventory.length === 0 ? (
        <div style={emptyStyle}>
          库存为空
          <br />
          (前往「商店」tab 购买物品)
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {inventory.map((entry) => {
            const item = findItem(entry.商品ID);
            const color = item ? CATEGORY_COLOR[item.category] : '#999';
            return (
              <div
                key={entry.商品ID}
                style={{
                  padding: 10,
                  background: `linear-gradient(135deg, ${color}11 0%, transparent 100%)`,
                  borderRadius: 8,
                  border: `1px solid ${color}55`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {item ? `${CATEGORY_ICON[item.category]} ` : ''}{entry.商品名}
                  </span>
                  <span style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: color + '22',
                    color,
                    fontWeight: 600,
                  }}>
                    ×{entry.数量}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                  原价 ¥{entry.单价.toLocaleString()} · {entry.来源}
                </div>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {item && item.effects.length > 0 && (
                      <button
                        onClick={() => onUse(entry)}
                        style={{
                          padding: '2px 8px',
                          background: THEME_VARS.success,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 10,
                        }}
                      >
                        使用
                      </button>
                    )}
                    {item?.isGift && (
                      <button
                        onClick={() => onGift(entry)}
                        style={{
                          padding: '2px 8px',
                          background: THEME_VARS.danger,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 10,
                        }}
                      >
                        赠送
                      </button>
                    )}
                    <button
                      onClick={() => onSell(entry, 1)}
                      style={{
                        padding: '2px 8px',
                        background: THEME_VARS.warning,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 10,
                      }}
                    >
                      出售
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  3. 交易记录 Tab
// ═══════════════════════════════════════════════════════════

function HistoryTab({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>📜 交易记录</h4>
        <div style={emptyStyle}>
          暂无交易记录
          <br />
          (购买/出售/使用物品后将在此显示)
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📜 交易记录 ({history.length})</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {history.map((h, i) => {
          const typeColor = h.type === 'buy' ? THEME_VARS.warning : h.type === 'sell' ? THEME_VARS.success : h.type === 'use' ? THEME_VARS.info : THEME_VARS.danger;
          const typeIcon = h.type === 'buy' ? '🛒' : h.type === 'sell' ? '💰' : h.type === 'use' ? '✨' : '💝';
          return (
            <div
              key={i}
              style={{
                padding: 8,
                background: h.success ? `${typeColor}11` : '#ffebee',
                borderRadius: 6,
                border: `1px solid ${h.success ? typeColor + '44' : '#ffcdd2'}`,
                fontSize: 11,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ marginRight: 6 }}>{typeIcon}</span>
                <strong style={{ color: THEME_VARS.text }}>{h.itemName}</strong>
                <span style={{ marginLeft: 6, color: THEME_VARS.textMuted }}>{h.detail}</span>
              </div>
              <span style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                {new Date(h.ts).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
