// ============================================================
// 周结算界面 — 推进到新一周时的过渡画面
// 哥特风格：标题、英雄状态卡片网格、周事件、资源变化、结算独白
// ============================================================

import { useGameStore } from '@/stores/gameStore';
import { useWeekStore } from '@/stores/weekStore';
import { useQuestStore } from '@/stores/questStore';
import { getHeroName } from '@/data/ddLoader';
import type { HeroWeeklyChange } from '@/gateway/weekSystem';
import clsx from 'clsx';

// 纹章中文名
const HEIRLOOM_NAMES: Record<string, string> = {
  bust: '雕像',
  portrait: '画像',
  deed: '契约',
  crest: '纹章',
};

// 状态标签样式
function statusTagClass(status: string): string {
  switch (status) {
    case 'afflicted':
    case 'heartattack':
    case 'dead':
      return 'dd-tag-negative';
    case 'virtuous':
      return 'dd-tag-positive';
    default:
      return 'dd-tag';
  }
}

// 单张英雄状态卡片
function HeroChangeCard({ change }: { change: HeroWeeklyChange }) {
  const stressPositive = change.stressChange > 0; // 压力增加 = 坏事
  const hpPositive = change.hpChange > 0;         // 生命恢复 = 好事
  const isBad = change.status === 'afflicted' || change.status === 'heartattack' || change.status === 'dead';

  return (
    <div className="dd-panel p-3 flex flex-col gap-2">
      {/* 英雄名 + 职业 */}
      <div className="flex items-center justify-between">
        <span className={clsx('font-dd font-bold text-sm uppercase tracking-wide', `class-${change.classId}`)}>
          {getHeroName(change.classId)}
        </span>
        <span className="font-dd text-xs text-dd-textBright truncate ml-2">
          {change.heroName}
        </span>
      </div>

      {/* 压力变化 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-dd-textMuted uppercase tracking-wide">压力</span>
        <span className="font-mono flex items-center gap-1">
          <span className="text-dd-textDim">{change.stressBefore} → {change.stressAfter}</span>
          <span className={clsx('font-mono', stressPositive ? 'text-dd-redBright' : 'text-dd-greenBright')}>
            {stressPositive ? `+${change.stressChange}` : change.stressChange}
          </span>
        </span>
      </div>

      {/* 生命变化 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-dd-textMuted uppercase tracking-wide">生命</span>
        <span className="font-mono flex items-center gap-1">
          <span className="text-dd-textDim">{change.hpBefore} → {change.hpAfter}</span>
          <span className={clsx('font-mono', hpPositive ? 'text-dd-greenBright' : 'text-dd-textDim')}>
            {hpPositive ? `+${change.hpChange}` : change.hpChange}
          </span>
        </span>
      </div>

      {/* 状态标签 */}
      <div className="mt-auto pt-1">
        <span className={clsx('dd-tag text-[10px]', statusTagClass(change.status), isBad && 'dd-tag-negative')}>
          {change.statusText}
        </span>
      </div>
    </div>
  );
}

// 资源变化行
function ResourceLine({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  if (value === 0) return null;
  const isPositive = positive ?? value > 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-dd-textMuted">{label}</span>
      <span className={clsx('font-mono', isPositive ? 'text-dd-gold' : 'text-dd-redBright')}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

export default function WeekTransition() {
  const weekSummary = useWeekStore((s) => s.weekSummary);
  const completeWeekTransition = useWeekStore((s) => s.completeWeekTransition);
  const cancelWeekTransition = useWeekStore((s) => s.cancelWeekTransition);
  const availableQuests = useQuestStore((s) => s.availableQuests);
  const week = useGameStore((s) => s.week);

  if (!weekSummary) {
    return null;
  }

  const heirloomEntries = Object.entries(weekSummary.heirloomChanges).filter(
    ([, amount]) => amount !== 0
  );

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        {/* 标题 */}
        <header className="text-center mb-6">
          <h1 className="dd-title text-4xl text-dd-gold dd-text-gold dd-anim-flicker">
            第 {weekSummary.week} 周
          </h1>
          <div className="dd-divider w-64 mx-auto my-3" />
          <p className="text-dd-textMuted text-sm italic tracking-widest">
            岁月流转，深渊凝视
          </p>
        </header>

        {/* 结算独白（先祖风格） */}
        {weekSummary.recap.length > 0 && (
          <div className="dd-panel p-4 mb-5">
            <div className="dd-panel-header">
              <span>先祖的低语</span>
            </div>
            <div className="p-4 space-y-2">
              {weekSummary.recap.map((line, idx) => (
                <p
                  key={idx}
                  className={clsx(
                    'text-sm leading-relaxed',
                    idx === 0 ? 'dd-text-gold font-dd' : 'text-dd-textMuted'
                  )}
                >
                  「{line}」
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 英雄状态卡片网格 */}
        <div className="mb-5">
          <div className="dd-panel-header mb-2">
            <span>英雄状况</span>
            <span className="text-[10px] normal-case tracking-normal text-dd-textMuted">
              {weekSummary.heroChanges.length} 名英雄
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {weekSummary.heroChanges.map((change) => (
              <HeroChangeCard key={change.heroUid} change={change} />
            ))}
            {weekSummary.heroChanges.length === 0 && (
              <div className="col-span-full text-center py-8 text-dd-textDim font-dd uppercase tracking-widest">
                名册空空如也
              </div>
            )}
          </div>
        </div>

        {/* 周事件列表 */}
        <div className="dd-panel p-4 mb-5">
          <div className="dd-panel-header">
            <span>本周事件</span>
          </div>
          <div className="p-3 space-y-2">
            {weekSummary.events.length === 0 ? (
              <p className="text-dd-textDim text-sm text-center py-2">
                这一周平静如常，没有特别的事件发生。
              </p>
            ) : (
              weekSummary.events.map((event, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'flex items-start gap-3 text-sm',
                    event.positive ? 'text-dd-gold' : 'text-dd-redBright'
                  )}
                >
                  <span className="font-serif text-base leading-none mt-0.5">{event.icon}</span>
                  <span className="leading-relaxed">{event.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 资源变化 */}
        <div className="dd-panel p-4 mb-5">
          <div className="dd-panel-header">
            <span>资源结算</span>
          </div>
          <div className="p-4 space-y-2">
            <ResourceLine label="金币" value={weekSummary.goldChange} />
            {heirloomEntries.map(([key, amount]) => (
              <ResourceLine
                key={key}
                label={HEIRLOOM_NAMES[key] || key}
                value={amount}
              />
            ))}
            {availableQuests.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-dd-textMuted">新任务</span>
                <span className="dd-text-gold font-mono">
                  发现 {availableQuests.length} 个新任务
                </span>
              </div>
            )}
            {weekSummary.goldChange === 0 && heirloomEntries.length === 0 && (
              <p className="text-dd-textDim text-sm text-center py-2">
                本周没有重大的资源变动。
              </p>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={completeWeekTransition}
            className="dd-btn-primary text-base px-10 py-3"
          >
            回到城镇
          </button>
          <button
            onClick={cancelWeekTransition}
            className="dd-btn"
          >
            暂不结算
          </button>
        </div>

        <div className="text-center mt-4 text-dd-textDim text-xs tracking-widest">
          当前周数：{week}
        </div>
      </div>
    </div>
  );
}