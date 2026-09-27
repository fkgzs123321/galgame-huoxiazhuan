// ============================================================
// 饰品背包 — 显示所有未装备的饰品，支持筛选、装备、出售
// ============================================================
import { useState, useMemo } from 'react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName } from '@/data/ddLoader';
import type { TrinketEntry, HeroInstance } from '@/types';
import { buffIdZh } from '@/data/zhNames';
import {
  parseTrinketBuffs,
  getTrinketName,
  getRarityName,
  getSellPrice,
  getTrinketClassRequirements,
  getTrinketEntryById,
  formatBuff,
  type TrinketBuff,
} from '@/gateway/trinketSystem';
import clsx from 'clsx';

// ---- 稀有度 CSS 类映射 ----

function getRarityClassName(rarity: string): string {
  const map: Record<string, string> = {
    common: 'dd-rarity-common',
    uncommon: 'dd-rarity-uncommon',
    rare: 'dd-rarity-rare',
    very_rare: 'dd-rarity-very_rare',
    ancestral: 'dd-rarity-ancestral',
    civic: 'dd-rarity-civic',
  };
  return map[rarity] || 'dd-rarity-common';
}

// ---- 稀有度筛选选项 ----

interface RarityFilter {
  value: string; // '' = 全部
  label: string;
}

const RARITY_FILTERS: RarityFilter[] = [
  { value: '', label: '全部' },
  { value: 'common', label: '普通' },
  { value: 'uncommon', label: '罕见' },
  { value: 'rare', label: '稀有' },
  { value: 'very_rare', label: '非常稀有' },
  { value: 'ancestral', label: '先祖' },
  { value: 'other', label: '其他' },
];

// ---- 获取饰品的完整数据（从缓存补全 buffs） ----

function getFullTrinketEntry(trinket: TrinketEntry): TrinketEntry {
  const cached = getTrinketEntryById(trinket.id);
  return cached ?? trinket;
}

// ---- 单个饰品卡片 ----

interface TrinketCardProps {
  trinket: TrinketEntry;
  onEquip: (trinket: TrinketEntry) => void;
  onSell: (trinket: TrinketEntry) => void;
}

function TrinketCard({ trinket, onEquip, onSell }: TrinketCardProps) {
  const fullEntry = getFullTrinketEntry(trinket);
  const buffs: TrinketBuff[] = useMemo(
    () => parseTrinketBuffs(Array.isArray(fullEntry.buffs) ? fullEntry.buffs : []),
    [fullEntry]
  );
  const classReqs = getTrinketClassRequirements(fullEntry);
  const sellPrice = getSellPrice(fullEntry);
  const rarityCls = getRarityClassName(fullEntry.rarity);

  return (
    <div
      className={clsx(
        'border-2 bg-dd-surface p-3 flex flex-col gap-2 transition-all duration-150',
        'hover:bg-dd-surface2 cursor-pointer',
        rarityCls
      )}
      style={{ borderRadius: '2px' }}
      onClick={() => onEquip(fullEntry)}
    >
      {/* 名称 + 稀有度标签 */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="font-dd text-sm leading-tight"
          style={{ fontFamily: "'Cinzel', 'Noto Serif SC', serif" }}
        >
          {getTrinketName(fullEntry.id)}
        </span>
        <span className={clsx('text-[10px] px-1.5 py-0.5 border whitespace-nowrap', rarityCls)}>
          {getRarityName(fullEntry.rarity)}
        </span>
      </div>

      {/* Buff 列表 */}
      <div className="space-y-0.5 min-h-[2rem]">
        {buffs.length > 0 ? (
          buffs.map((buff, i) => {
            const isPositive = buff.amount >= 0;
            return (
              <div
                key={i}
                className={clsx('text-[11px] font-mono', isPositive ? 'text-dd-greenBright' : 'text-dd-redBright')}
              >
                {formatBuff(buff)}
              </div>
            );
          })
        ) : (
          <div className="text-[11px] text-dd-textMuted italic">
            {(Array.isArray(fullEntry.buffs) ? fullEntry.buffs : []).map((b, i) => (
              <div key={i} className="font-mono">{buffIdZh(String(b))}</div>
            ))}
            {(Array.isArray(fullEntry.buffs) ? fullEntry.buffs : []).length === 0 && '无可用效果'}
          </div>
        )}
      </div>

      {/* 职业限制 */}
      {classReqs.length > 0 && (
        <div className="text-[10px] text-dd-textMuted">
          限定: {classReqs.map((c) => getHeroName(c)).join(' / ')}
        </div>
      )}

      {/* 出售按钮 */}
      <button
        className={clsx(
          'mt-auto py-1 text-[11px] border transition-all',
          'border-dd-border bg-dd-bg text-dd-gold',
          'hover:border-dd-gold hover:bg-dd-surface2'
        )}
        style={{ borderRadius: '2px' }}
        onClick={(e) => {
          e.stopPropagation();
          onSell(fullEntry);
        }}
      >
        出售 {sellPrice.toLocaleString()}g
      </button>
    </div>
  );
}

// ---- 装备弹窗 ----

interface EquipModalProps {
  trinket: TrinketEntry;
  onClose: () => void;
}

function EquipModal({ trinket, onClose }: EquipModalProps) {
  const roster = useGameStore((s) => s.roster);
  const selectedHeroUid = useGameStore((s) => s.selectedHeroUid);
  const selectHero = useGameStore((s) => s.selectHero);
  const equipTrinket = useInventoryStore((s) => s.equipTrinket);
  const [heroUid, setHeroUid] = useState<string | null>(selectedHeroUid);
  const [feedback, setFeedback] = useState<string>('');

  const hero = roster.find((h) => h.uid === heroUid);
  const classReqs = getTrinketClassRequirements(trinket);
  const rarityCls = getRarityClassName(trinket.rarity);
  const buffs: TrinketBuff[] = useMemo(
    () => parseTrinketBuffs(Array.isArray(trinket.buffs) ? trinket.buffs : []),
    [trinket]
  );

  function handleEquip(slot: 1 | 2) {
    if (!heroUid) {
      setFeedback('请先选择英雄');
      return;
    }
    const result = equipTrinket(heroUid, trinket.id, slot);
    if (result.success) {
      onClose();
    } else {
      setFeedback(result.reason || '装备失败');
    }
  }

  function handleSelectHero(h: HeroInstance) {
    setHeroUid(h.uid);
    selectHero(h.uid);
    setFeedback('');
  }

  // 检查职业限制
  function canEquipToHero(h: HeroInstance): boolean {
    if (classReqs.length === 0) return true;
    return classReqs.includes(h.classId);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="dd-panel max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dd-panel-header flex items-center justify-between">
          <span>装备饰品</span>
          <button onClick={onClose} className="dd-btn text-xs px-2 py-1">
            × 关闭
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 饰品信息 */}
          <div className={clsx('border-2 p-3', rarityCls)} style={{ borderRadius: '2px' }}>
            <div className="flex items-center justify-between mb-2">
              <span
                className="font-dd text-base"
                style={{ fontFamily: "'Cinzel', 'Noto Serif SC', serif" }}
              >
                {getTrinketName(trinket.id)}
              </span>
              <span className={clsx('text-xs px-2 py-0.5 border', rarityCls)}>
                {getRarityName(trinket.rarity)}
              </span>
            </div>
            <div className="space-y-0.5">
              {buffs.map((buff, i) => {
                const isPositive = buff.amount >= 0;
                return (
                  <div
                    key={i}
                    className={clsx('text-xs font-mono', isPositive ? 'text-dd-greenBright' : 'text-dd-redBright')}
                  >
                    {formatBuff(buff)}
                  </div>
                );
              })}
            </div>
            {classReqs.length > 0 && (
              <div className="text-xs text-dd-textMuted mt-2">
                限定职业: {classReqs.map((c) => getHeroName(c)).join(' / ')}
              </div>
            )}
          </div>

          {/* 英雄选择 */}
          <div>
            <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-wide">
              选择装备英雄
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {roster.map((h) => {
                const isSelected = h.uid === heroUid;
                const canEquip = canEquipToHero(h);
                return (
                  <button
                    key={h.uid}
                    onClick={() => handleSelectHero(h)}
                    disabled={!canEquip}
                    className={clsx(
                      'text-left p-2 border transition-all',
                      isSelected
                        ? 'border-dd-gold bg-dd-surface2'
                        : canEquip
                          ? 'border-dd-border bg-dd-surface hover:border-dd-textMuted'
                          : 'border-dd-border bg-dd-bg opacity-40 cursor-not-allowed'
                    )}
                    style={{ borderRadius: '2px' }}
                  >
                    <div className={clsx('font-dd text-sm', `class-${h.classId}`)}>
                      {getHeroName(h.classId)}
                    </div>
                    <div className="text-xs text-dd-textMuted">{h.name}</div>
                    {!canEquip && (
                      <div className="text-[10px] text-dd-redBright">职业不符</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 槽位选择 */}
          {hero && (
            <div>
              <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-wide">
                选择装备槽位
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((slot) => {
                  const currentTrinketId = slot === 1 ? hero.trinket1 : hero.trinket2;
                  const currentName = currentTrinketId ? getTrinketName(currentTrinketId) : null;
                  return (
                    <button
                      key={slot}
                      onClick={() => handleEquip(slot as 1 | 2)}
                      className={clsx(
                        'p-3 border-2 transition-all text-center',
                        'border-dd-border bg-dd-surface hover:border-dd-gold hover:bg-dd-surface2'
                      )}
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="text-xs text-dd-textMuted mb-1">槽位 {slot}</div>
                      {currentName ? (
                        <div className="text-xs text-dd-text">
                          当前: {currentName}
                        </div>
                      ) : (
                        <div className="text-xs text-dd-textMuted">— 空 —</div>
                      )}
                      <div className="text-xs text-dd-gold mt-2">装备到此槽位</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 反馈 */}
          {feedback && (
            <div className="text-sm text-dd-redBright text-center border border-dd-border bg-dd-bg p-2" style={{ borderRadius: '2px' }}>
              {feedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- 主组件 ----

interface TrinketInventoryProps {
  onClose?: () => void;
}

export default function TrinketInventory({ onClose }: TrinketInventoryProps) {
  const trinketInventory = useInventoryStore((s) => s.trinketInventory);
  const sellTrinket = useInventoryStore((s) => s.sellTrinket);
  const gold = useGameStore((s) => s.gold);
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [equipTarget, setEquipTarget] = useState<TrinketEntry | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  // 按稀有度筛选
  const filteredTrinkets = useMemo(() => {
    if (rarityFilter === '') return trinketInventory;
    if (rarityFilter === 'other') {
      const knownRarities = ['common', 'uncommon', 'rare', 'very_rare', 'ancestral', 'civic'];
      return trinketInventory.filter((t) => !knownRarities.includes(t.rarity));
    }
    return trinketInventory.filter((t) => t.rarity === rarityFilter);
  }, [trinketInventory, rarityFilter]);

  // 按稀有度排序（稀有度高的在前）
  const sortedTrinkets = useMemo(() => {
    const rarityOrder: Record<string, number> = {
      ancestral: 0,
      very_rare: 1,
      rare: 2,
      uncommon: 3,
      common: 4,
      civic: 5,
      very_common: 6,
    };
    return [...filteredTrinkets].sort((a, b) => {
      const oa = rarityOrder[a.rarity] ?? 99;
      const ob = rarityOrder[b.rarity] ?? 99;
      return oa - ob;
    });
  }, [filteredTrinkets]);

  // 各稀有度数量
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of trinketInventory) {
      counts[t.rarity] = (counts[t.rarity] || 0) + 1;
    }
    return counts;
  }, [trinketInventory]);

  function handleSell(trinket: TrinketEntry) {
    const price = getSellPrice(trinket);
    const ok = sellTrinket(trinket.id);
    if (ok) {
      setFeedback(`已出售 ${getTrinketName(trinket.id)}，获得 ${price.toLocaleString()}g`);
      setTimeout(() => setFeedback(''), 2500);
    } else {
      setFeedback('出售失败');
      setTimeout(() => setFeedback(''), 2500);
    }
  }

  function handleEquip(trinket: TrinketEntry) {
    setEquipTarget(trinket);
  }

  return (
    <div className="dd-panel">
      {/* 头部 */}
      <div className="dd-panel-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>饰品背包</span>
          <span className="text-dd-textMuted text-xs normal-case">
            ({trinketInventory.length} 件)
          </span>
        </div>
        <div className="flex items-center gap-3 normal-case">
          <span className="text-xs text-dd-textMuted">
            金币 <span className="font-mono text-dd-gold">{gold.toLocaleString()}g</span>
          </span>
          {onClose && (
            <button onClick={onClose} className="dd-btn text-xs px-2 py-1">
              × 关闭
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 稀有度筛选 */}
        <div className="flex flex-wrap gap-1">
          {RARITY_FILTERS.map((filter) => {
            const count =
              filter.value === ''
                ? trinketInventory.length
                : filter.value === 'other'
                  ? trinketInventory.filter((t) => !['common', 'uncommon', 'rare', 'very_rare', 'ancestral', 'civic'].includes(t.rarity)).length
                  : rarityCounts[filter.value] || 0;
            const isActive = rarityFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setRarityFilter(filter.value)}
                className={clsx(
                  'px-3 py-1 text-xs border transition-all',
                  isActive
                    ? 'border-dd-gold bg-dd-surface2 text-dd-gold'
                    : 'border-dd-border bg-dd-surface text-dd-textMuted hover:border-dd-textMuted hover:text-dd-text'
                )}
                style={{ borderRadius: '2px' }}
              >
                {filter.label}
                <span className="ml-1 opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 反馈消息 */}
        {feedback && (
          <div className="text-sm text-dd-gold border border-dd-border bg-dd-surface2 px-3 py-2" style={{ borderRadius: '2px' }}>
            {feedback}
          </div>
        )}

        {/* 饰品网格 */}
        {sortedTrinkets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-dd-textMuted text-sm mb-2">
              {trinketInventory.length === 0
                ? '背包为空 — 在游商购买或在地牢中获取饰品'
                : '该稀有度下无饰品'}
            </div>
            {trinketInventory.length === 0 && (
              <div className="text-xs text-dd-textMuted">
                提示: 前往「游商」购买饰品，或在地牢探险中拾取
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sortedTrinkets.map((trinket) => (
              <TrinketCard
                key={trinket.id}
                trinket={trinket}
                onEquip={handleEquip}
                onSell={handleSell}
              />
            ))}
          </div>
        )}
      </div>

      {/* 装备弹窗 */}
      {equipTarget && (
        <EquipModal trinket={equipTarget} onClose={() => setEquipTarget(null)} />
      )}
    </div>
  );
}
