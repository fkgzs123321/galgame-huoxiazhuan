import { useGameStore } from '@/stores/gameStore';
import { getHeroName } from '@/data/ddLoader';
import type { HeroInstance } from '@/types';
import { getStateLabelById } from '@/gateway/stressSystem';
import { CURSE_STAGES } from '@/gateway/crimsonSystem';
import clsx from 'clsx';

// 决心等级转罗马数字
function resolveToRoman(level: number): string {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  return romans[level] ?? 'I';
}

interface HeroCardProps {
  hero: HeroInstance;
  selected: boolean;
  onClick: () => void;
}

function HeroCard({ hero, selected, onClick }: HeroCardProps) {
  const hpPercent = (hero.currentHp / hero.maxHp) * 100;
  const stressPercent = Math.min(100, hero.stress);
  const hpClass = hpPercent > 50 ? 'dd-hp-high' : hpPercent > 25 ? 'dd-hp-mid' : 'dd-hp-low';

  // 压力状态
  const isAfflicted = !!hero.affliction;
  const isVirtuous = !!hero.virtue;
  const stressOver100 = hero.stress >= 100;
  const stressWarn = hero.stress > 25;

  const stateLabel = isAfflicted || isVirtuous ? getStateLabelById(isAfflicted ? hero.affliction : hero.virtue) : '';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-full text-left p-3 border rounded-[2px] transition-all duration-150 overflow-hidden',
        selected
          ? 'border-dd-gold bg-dd-surface2 shadow-dd-gold'
          : 'border-dd-border bg-dd-surface hover:border-dd-borderLight hover:bg-dd-surface2',
        isAfflicted && 'border-dd-red',
      )}
    >
      {/* 选中角标 — 金色L形标记 */}
      {selected && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-dd-gold pointer-events-none" />
      )}

      {/* 头部：职业 + 决心等级 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={clsx('font-dd font-bold text-sm uppercase tracking-wide', `class-${hero.classId}`)}>
          {getHeroName(hero.classId)}
        </span>
        <span className="dd-tag font-dd text-xs dd-text-gold leading-none">
          {resolveToRoman(hero.resolveLevel)}
        </span>
      </div>

      {/* 名字 — 压力>100 变红 */}
      <div className={clsx('font-dd text-xs mb-2 truncate', isAfflicted ? 'dd-text-blood' : 'text-dd-textBright')}>
        {hero.name}
        {stressWarn && !isAfflicted && !isVirtuous && (
          <span className="ml-1.5 text-dd-textMuted" title="压力警告">▲</span>
        )}
      </div>

      {/* 状态标签 */}
      {stateLabel && (
        <div className="mb-2 flex gap-1">
          <span className={clsx('dd-tag text-[9px]', isAfflicted ? 'dd-tag-negative' : 'dd-tag-positive')}>
            {isAfflicted ? '崩溃' : '美德'} · {stateLabel}
          </span>
        </div>
      )}

      {/* 血腥诅咒标记 */}
      {hero.crimsonCurse && (
        <div className="mb-2">
          <span className="dd-tag text-[9px] border-dd-red text-dd-redBright">
            ❥ 诅咒 · {CURSE_STAGES[hero.crimsonCurse.stage].name}
          </span>
        </div>
      )}

      {/* HP 条 */}
      <div className="mb-1.5">
        <div className="flex justify-between text-[10px] text-dd-textMuted mb-0.5">
          <span className="uppercase tracking-wide">生命</span>
          <span className="font-mono text-dd-text">{hero.currentHp}/{hero.maxHp}</span>
        </div>
        <div className="dd-bar">
          <div className={clsx('dd-bar-fill', hpClass)} style={{ width: `${hpPercent}%` }} />
        </div>
      </div>

      {/* 压力条 — 压力>100 红色脉冲 */}
      <div>
        <div className="flex justify-between text-[10px] text-dd-textMuted mb-0.5">
          <span className="uppercase tracking-wide">压力</span>
          <span className={clsx('font-mono', stressOver100 ? 'dd-text-blood' : 'text-dd-text')}>
            {hero.stress}/200
          </span>
        </div>
        <div
          className="dd-bar"
          style={stressOver100 ? { animation: 'dd-torch-flicker 1s ease-in-out infinite', borderColor: '#c83030' } : {}}
        >
          <div
            className={clsx('dd-bar-fill dd-stress-fill', stressOver100 && 'dd-stress-overflow')}
            style={{ width: `${stressPercent}%` }}
          />
        </div>
      </div>

      {/* 状态标记 */}
      {(hero.missingUntilWeek || hero.activityLocked) && (
        <div className="mt-2 flex gap-1">
          {hero.missingUntilWeek && (
            <span className="dd-tag dd-tag-negative text-[9px]">失踪</span>
          )}
          {hero.activityLocked && (
            <span className="dd-tag dd-tag-locked text-[9px]">锁定</span>
          )}
        </div>
      )}

      {/* 底部装饰渐变阴影 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4))' }}
      />
    </button>
  );
}

export default function HeroRoster() {
  const roster = useGameStore((s) => s.roster);
  const selectedUid = useGameStore((s) => s.selectedHeroUid);
  const selectHero = useGameStore((s) => s.selectHero);

  return (
    <div className="dd-panel">
      <div className="dd-panel-header">
        <span>英雄名册</span>
        <span className="font-mono text-dd-gold text-xs normal-case tracking-normal">
          {roster.length} / 9
        </span>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto">
        {roster.map((hero) => (
          <HeroCard
            key={hero.uid}
            hero={hero}
            selected={hero.uid === selectedUid}
            onClick={() => selectHero(hero.uid)}
          />
        ))}
        {roster.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="font-dd text-dd-textDim text-sm uppercase tracking-widest">
              名册空空如也
            </p>
            <p className="text-dd-textDim text-xs mt-1">
              前往驿站招募英雄
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
