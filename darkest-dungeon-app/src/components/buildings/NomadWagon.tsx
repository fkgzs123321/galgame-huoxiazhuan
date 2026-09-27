// ============================================================
// 游商 — 购买饰品和补给
// ============================================================
import { useState } from 'react';
import { useTownStore, getTrinketRarityName } from '@/stores/townStore';
import { useGameStore } from '@/stores/gameStore';
import type { TrinketEntry, ProvisionItem } from '@/types';
import clsx from 'clsx';

// 安全获取饰品额外字段
function getTrinketName(t: TrinketEntry): string {
  return (t.name as string) || t.id;
}
function getTrinketDesc(t: TrinketEntry): string {
  return (t.desc as string) || '';
}

// 稀有度颜色（dd 色板）
function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'dd-rarity-common';
    case 'uncommon': return 'dd-rarity-uncommon';
    case 'rare': return 'dd-rarity-rare';
    case 'very_rare': return 'dd-rarity-very_rare';
    case 'ancestral': return 'dd-rarity-ancestral';
    default: return 'dd-rarity-common';
  }
}

// 供给品字符图标（纯文字，禁 emoji）
function provisionIcon(type: string): string {
  const map: Record<string, string> = {
    food: '食',
    shovel: '铲',
    key: '钥',
    torch: '焰',
    bandage: '绷',
    antivenom: '解',
    holy_water: '圣',
    medicinal_herbs: '草',
    herbs: '草',
  };
  return map[type] || '货';
}

export default function NomadWagon() {
  const trinkets = useTownStore((s) => s.nomadWagonTrinkets);
  const provisions = useTownStore((s) => s.nomadWagonProvisions);
  const refreshNomadWagon = useTownStore((s) => s.refreshNomadWagon);
  const buyTrinket = useTownStore((s) => s.buyTrinket);
  const buyProvision = useTownStore((s) => s.buyProvision);
  const gold = useGameStore((s) => s.gold);
  const [feedback, setFeedback] = useState<string>('');

  function handleBuyTrinket(t: TrinketEntry) {
    if (gold < t.price) {
      setFeedback('金币不足！');
      return;
    }
    const ok = buyTrinket(t.id);
    setFeedback(ok ? `已购买 ${getTrinketName(t)}` : '购买失败');
  }

  function handleBuyProvision(item: ProvisionItem, count: number) {
    const totalCost = item.price * Math.min(count, item.count);
    if (gold < totalCost) {
      setFeedback('金币不足！');
      return;
    }
    const ok = buyProvision(item.id, count);
    setFeedback(ok ? `已购买 ${item.name} x${Math.min(count, item.count)}` : '购买失败');
  }

  function handleRefresh() {
    refreshNomadWagon();
    setFeedback('游商已刷新商品');
  }

  return (
    <div className="space-y-4">
      {/* 顶部操作 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-dd-textMuted">
          游商出售各种饰品和冒险补给品，每周刷新库存。
        </p>
        <button onClick={handleRefresh} className="dd-btn text-xs">
          刷新商品
        </button>
      </div>

      {feedback && (
        <div className="text-sm text-dd-gold bg-dd-surface2 px-3 py-2 rounded-sm border border-dd-border">
          {feedback}
        </div>
      )}

      {/* 饰品区域 */}
      <div>
        <div className="dd-panel-header mb-2">饰品</div>
        {trinkets.length === 0 ? (
          <div className="text-center py-6 text-dd-textMuted text-sm">
            饰品已售罄，点击「刷新商品」补充库存
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trinkets.map((t) => {
              const canAfford = gold >= t.price;
              return (
                <div key={t.id} className="dd-panel p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-dd text-sm text-dd-textBright">{getTrinketName(t)}</span>
                    <span className={clsx('dd-tag text-[10px]', rarityColor(t.rarity))}>
                      {getTrinketRarityName(t.rarity)}
                    </span>
                  </div>
                  <p className="text-xs text-dd-textMuted">{getTrinketDesc(t)}</p>
                  <button
                    onClick={() => handleBuyTrinket(t)}
                    disabled={!canAfford}
                    className={clsx(
                      'w-full',
                      canAfford
                        ? 'dd-btn-primary'
                        : 'dd-btn opacity-40 cursor-not-allowed'
                    )}
                  >
                    购买 ({t.price.toLocaleString()}g)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 补给品区域 */}
      <div>
        <div className="dd-panel-header mb-2">补给品</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {provisions.map((item) => {
            const canAfford1 = gold >= item.price;
            const canAfford5 = gold >= item.price * 5 && item.count >= 5;
            const soldOut = item.count <= 0;
            return (
              <div key={item.id} className="dd-panel p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg text-dd-gold font-dd" style={{ fontFamily: 'serif' }}>
                    {provisionIcon(item.type)}
                  </span>
                  <span className="text-xs text-dd-textMuted">库存 {item.count}</span>
                </div>
                <div className="font-dd text-sm text-dd-textBright">{item.name}</div>
                <p className="text-[10px] text-dd-textMuted leading-tight">{item.description}</p>
                <div className="text-xs text-dd-gold font-mono">{item.price}g/个</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleBuyProvision(item, 1)}
                    disabled={!canAfford1 || soldOut}
                    className="dd-btn !px-1 !py-1 text-[10px] flex-1"
                  >
                    买1
                  </button>
                  <button
                    onClick={() => handleBuyProvision(item, 5)}
                    disabled={!canAfford5 || soldOut}
                    className="dd-btn !px-1 !py-1 text-[10px] flex-1"
                  >
                    买5
                  </button>
                </div>
                {soldOut && (
                  <div className="text-center text-[10px] text-dd-redBright">已售罄</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
