// ============================================================
// 驿站 — 招募英雄
// ============================================================
import { useState } from 'react';
import { useTownStore, getRecruitCost, getQuirkName, isPositiveQuirk } from '@/stores/townStore';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName } from '@/data/ddLoader';
import { RecruitDialog } from '@/dialogs/RecruitDialog';
import { toast } from '@/ui/Extras';
import type { HeroInstance } from '@/types';
import clsx from 'clsx';

export default function Stagecoach() {
  const stagecoachHeroes = useTownStore((s) => s.stagecoachHeroes);
  const refreshStagecoach = useTownStore((s) => s.refreshStagecoach);
  const recruitHero = useTownStore((s) => s.recruitHero);
  const gold = useGameStore((s) => s.gold);
  const rosterCount = useGameStore((s) => s.roster.length);
  const [feedback, setFeedback] = useState<string>('');
  const [pendingHero, setPendingHero] = useState<HeroInstance | null>(null);

  function handleRecruitClick(hero: HeroInstance) {
    const cost = getRecruitCost(hero.resolveLevel);
    if (gold < cost) {
      setFeedback('金币不足！');
      toast('金币不足，无法招募', 'error');
      return;
    }
    if (rosterCount >= 25) {
      setFeedback('名册已满（上限25人）！');
      toast('名册已满', 'error');
      return;
    }
    setPendingHero(hero);
  }

  function confirmRecruit() {
    if (!pendingHero) return;
    recruitHero(pendingHero);
    setFeedback(`${getHeroName(pendingHero.classId)} ${pendingHero.name} 已加入名册`);
    toast(`${getHeroName(pendingHero.classId)} ${pendingHero.name} 已加入名册`, 'success');
    setPendingHero(null);
  }

  function handleRefresh() {
    refreshStagecoach();
    setFeedback('驿站已刷新新英雄');
    toast('驿站已刷新新英雄');
  }

  return (
    <div className="space-y-4">
      {/* 顶部操作 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-dd-textMuted">
          每周刷新可招募的英雄。招募费用根据英雄等级而定。
        </p>
        <button onClick={handleRefresh} className="dd-btn text-xs">
          刷新英雄
        </button>
      </div>

      {feedback && (
        <div className="text-sm text-dd-gold bg-dd-surface2 px-3 py-2 rounded-sm border border-dd-border">
          {feedback}
        </div>
      )}

      {/* 英雄列表 */}
      {stagecoachHeroes.length === 0 ? (
        <div className="text-center py-8 text-dd-textMuted text-sm">
          当前没有可招募的英雄，点击「刷新英雄」获取新的候选者
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stagecoachHeroes.map((hero) => {
            const cost = getRecruitCost(hero.resolveLevel);
            const canAfford = gold >= cost;
            const rosterFull = rosterCount >= 25;
            return (
              <div
                key={hero.uid}
                className="dd-panel p-3 space-y-2"
              >
                {/* 头部 */}
                <div className="flex items-center gap-2">
                  <img src={`/assets/dd/heroes/${hero.classId}.png`} alt="" className="w-8 h-8 object-cover rounded-sm border border-dd-gold/30" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className={clsx('font-dd font-bold text-sm flex-1', `class-${hero.classId}`)}>
                    {getHeroName(hero.classId)}
                  </span>
                  <span className="dd-tag text-xs dd-text-gold leading-none">
                    Lv.{hero.resolveLevel}
                  </span>
                </div>

                {/* 名字 */}
                <div className="text-dd-textBright text-sm">{hero.name}</div>

                {/* 属性 */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-dd-bg border border-dd-border rounded-sm px-2 py-1">
                    <span className="text-dd-textMuted">生命 </span>
                    <span className="text-dd-text font-mono">{hero.currentHp}/{hero.maxHp}</span>
                  </div>
                  <div className="bg-dd-bg border border-dd-border rounded-sm px-2 py-1">
                    <span className="text-dd-textMuted">压力 </span>
                    <span className="text-dd-text font-mono">{hero.stress}</span>
                  </div>
                  <div className="bg-dd-bg border border-dd-border rounded-sm px-2 py-1">
                    <span className="text-dd-textMuted">武器 </span>
                    <span className="text-dd-text font-mono">+{hero.weaponLevel}</span>
                  </div>
                  <div className="bg-dd-bg border border-dd-border rounded-sm px-2 py-1">
                    <span className="text-dd-textMuted">护甲 </span>
                    <span className="text-dd-text font-mono">+{hero.armorLevel}</span>
                  </div>
                </div>

                {/* 怪癖预览 */}
                {hero.quirks.length > 0 && (
                  <div>
                    <div className="text-[10px] text-dd-textMuted mb-1">怪癖</div>
                    <div className="flex flex-wrap gap-1">
                      {hero.quirks.map((q) => (
                        <span
                          key={q}
                          className={clsx(
                            'dd-tag text-[10px]',
                            isPositiveQuirk(q) ? 'dd-tag-positive' : 'dd-tag-negative'
                          )}
                        >
                          {getQuirkName(q)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 疾病 */}
                {hero.diseases.length > 0 && (
                  <div className="text-[10px] text-dd-redBright">
                    患有疾病
                  </div>
                )}

                {/* 招募按钮 */}
                <button
                  onClick={() => handleRecruitClick(hero)}
                  disabled={!canAfford || rosterFull}
                  className={clsx(
                    'w-full',
                    canAfford && !rosterFull
                      ? 'dd-btn-primary'
                      : 'dd-btn opacity-40 cursor-not-allowed'
                  )}
                >
                  招募 ({cost.toLocaleString()}g)
                </button>
              </div>
            );
          })}
        </div>
      )}

      <RecruitDialog
        hero={pendingHero}
        cost={pendingHero ? getRecruitCost(pendingHero.resolveLevel) : 0}
        gold={gold}
        onConfirm={confirmRecruit}
        onCancel={() => setPendingHero(null)}
      />
    </div>
  );
}
