// ============================================================
// 建筑共享 UI 组件
// 英雄选择器、费用显示、压力条等通用组件
// ============================================================
import { useGameStore } from '@/stores/gameStore';
import { getHeroName } from '@/data/ddLoader';
import { getQuirkName, isPositiveQuirk } from '@/stores/townStore';
import type { HeroInstance } from '@/types';
import clsx from 'clsx';

// ---- 英雄选择器 ----

interface HeroSelectProps {
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  filter?: (hero: HeroInstance) => boolean;
  emptyText?: string;
}

export function HeroSelect({ selectedUid, onSelect, filter, emptyText = '无名册英雄' }: HeroSelectProps) {
  const roster = useGameStore((s) => s.roster);
  const heroes = filter ? roster.filter(filter) : roster;

  return (
    <div>
      <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-wide">选择英雄</div>
      {heroes.length === 0 ? (
        <div className="text-center py-4 text-dd-textMuted text-sm">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
          {heroes.map((hero) => {
            const isSelected = hero.uid === selectedUid;
            const hpPercent = (hero.currentHp / hero.maxHp) * 100;
            const hpColor = hpPercent > 50 ? 'dd-hp-high' : hpPercent > 25 ? 'dd-hp-mid' : 'dd-hp-low';
            return (
              <button
                key={hero.uid}
                onClick={() => onSelect(hero.uid)}
                className={clsx(
                  'text-left p-2.5 border rounded-sm transition-all duration-150 bg-dd-surface',
                  isSelected
                    ? 'border-dd-gold bg-dd-surface2 shadow-dd-gold'
                    : 'border-dd-border hover:border-dd-borderLight hover:bg-dd-surface2'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={clsx('font-dd font-bold text-sm', `class-${hero.classId}`)}>
                    {getHeroName(hero.classId)}
                  </span>
                  <span className="dd-tag text-[10px] text-dd-textMuted leading-none">Lv.{hero.resolveLevel}</span>
                </div>
                <div className="text-dd-textBright text-xs mb-1.5 truncate">{hero.name}</div>
                {/* HP + 压力迷你条 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] text-dd-textMuted mb-0.5">
                      HP <span className="font-mono text-dd-text">{hero.currentHp}/{hero.maxHp}</span>
                    </div>
                    <div className="dd-bar" style={{ height: '4px' }}>
                      <div className={clsx('dd-bar-fill', hpColor)} style={{ width: `${hpPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-dd-textMuted mb-0.5">
                      压力 <span className="font-mono text-dd-text">{hero.stress}</span>
                    </div>
                    <div className="dd-bar" style={{ height: '4px' }}>
                      <div className="dd-bar-fill dd-stress-fill" style={{ width: `${Math.min(100, hero.stress)}%` }} />
                    </div>
                  </div>
                </div>
                {/* 状态标记 */}
                {(hero.activityLocked || hero.missingUntilWeek) && (
                  <div className="mt-1.5 flex gap-1">
                    {hero.activityLocked && (
                      <span className="dd-tag dd-tag-locked text-[9px]">已锁定</span>
                    )}
                    {hero.missingUntilWeek && (
                      <span className="dd-tag dd-tag-negative text-[9px]">失踪</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- 费用显示 ----

interface CostBadgeProps {
  gold?: number;
  crests?: number;
  affordable?: boolean;
}

export function CostBadge({ gold, crests, affordable = true }: CostBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {gold !== undefined && gold > 0 && (
        <span className={clsx('font-mono', affordable ? 'text-dd-gold' : 'text-dd-redBright')}>
          {gold.toLocaleString()}g
        </span>
      )}
      {crests !== undefined && crests > 0 && (
        <span className={clsx('font-mono', affordable ? 'text-dd-text' : 'text-dd-redBright')}>
          {crests} 纹章
        </span>
      )}
      {gold === 0 && crests === 0 && (
        <span className="text-dd-textMuted">免费</span>
      )}
    </div>
  );
}

// ---- 怪癖标签 ----

export function QuirkTag({ quirkId, locked }: { quirkId: string; locked?: boolean }) {
  // 通过中文名是否能查到判断该怪癖是否可识别正负
  const known = getQuirkName(quirkId) !== quirkId;
  const positive = known && isPositiveQuirk(quirkId);
  return (
    <span
      className={clsx(
        'dd-tag',
        locked
          ? 'dd-tag-locked'
          : positive
            ? 'dd-tag-positive'
            : known
              ? 'dd-tag-negative'
              : 'dd-tag'
      )}
    >
      {getQuirkName(quirkId)}
      {locked && <span className="ml-1 text-dd-gold">✠</span>}
    </span>
  );
}

// ---- 空状态 ----

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-dd-textMuted text-sm">
      {message}
    </div>
  );
}

// ---- 升级等级条（0~4） ----

export function LevelDots({ current, max = 5 }: { current: number; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'w-2 h-2 rounded-[1px] border',
            i < current
              ? 'bg-dd-gold border-dd-borderLight'
              : 'bg-dd-bg border-dd-border'
          )}
        />
      ))}
    </div>
  );
}
