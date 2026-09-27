// ============================================================
// 酒馆 — 降压力 / 解雇
// ============================================================
import { useState } from 'react';
import { useTownStore } from '@/stores/townStore';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName } from '@/data/ddLoader';
import { HeroSelect } from './shared';
import clsx from 'clsx';

const TREATMENTS = [
  {
    id: 'drink' as const,
    name: '喝酒',
    icon: '☠',
    cost: 1250,
    desc: '在酒馆痛饮，降低 15 点压力',
  },
  {
    id: 'gamble' as const,
    name: '赌博',
    icon: '⚂',
    cost: 750,
    desc: '在酒馆赌一把，降低 15 点压力',
  },
];

export default function Tavern() {
  const tavernTreatHero = useTownStore((s) => s.tavernTreatHero);
  const dismissHero = useTownStore((s) => s.dismissHero);
  const roster = useGameStore((s) => s.roster);
  const gold = useGameStore((s) => s.gold);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const selectedHero = roster.find((h) => h.uid === selectedUid);

  function handleTreat(treatment: 'drink' | 'gamble') {
    if (!selectedUid) return;
    const t = TREATMENTS.find(x => x.id === treatment)!;
    if (!selectedHero) return;
    if (selectedHero.activityLocked) {
      setFeedback(`${selectedHero.name} 本周已参与活动，无法再次接待`);
      return;
    }
    if (gold < t.cost) {
      setFeedback('金币不足！');
      return;
    }
    const ok = tavernTreatHero(selectedUid, treatment);
    setFeedback(ok
      ? `${selectedHero.name} 进行了${t.name}，压力降低了 15 点`
      : '操作失败，英雄可能已锁定或金币不足'
    );
  }

  function handleDismiss() {
    if (!selectedUid || !selectedHero) return;
    if (confirm(`确定要解雇 ${getHeroName(selectedHero.classId)} ${selectedHero.name} 吗？此操作不可撤销。`)) {
      dismissHero(selectedUid);
      setSelectedUid(null);
      setFeedback(`${selectedHero.name} 已被解雇`);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dd-textMuted">
        在酒馆中让英雄放松身心，降低压力值。每个英雄每周只能参与一次活动。
      </p>

      {feedback && (
        <div className="text-sm text-dd-gold bg-dd-surface2 px-3 py-2 rounded-sm border border-dd-border">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左侧：英雄选择 */}
        <div className="dd-panel p-3">
          <HeroSelect
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
            emptyText="名册中没有可用的英雄"
          />
        </div>

        {/* 右侧：活动选项 */}
        <div className="dd-panel p-3 space-y-3">
          <div className="text-xs text-dd-textMuted uppercase tracking-wide">活动选项</div>

          {!selectedHero ? (
            <div className="text-center py-8 text-dd-textMuted text-sm">
              请先从左侧选择一位英雄
            </div>
          ) : (
            <>
              {/* 英雄信息 */}
              <div className="bg-dd-bg border border-dd-border rounded-sm p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={clsx('font-dd text-sm', `class-${selectedHero.classId}`)}>
                    {getHeroName(selectedHero.classId)}
                  </span>
                  <span className="dd-tag text-[10px] text-dd-textMuted leading-none">Lv.{selectedHero.resolveLevel}</span>
                </div>
                <div className="text-dd-textBright text-sm">{selectedHero.name}</div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-dd-textMuted">
                    生命 <span className="text-dd-text font-mono">{selectedHero.currentHp}/{selectedHero.maxHp}</span>
                  </span>
                  <span className="text-dd-textMuted">
                    压力 <span className={clsx('font-mono', selectedHero.stress >= 75 ? 'text-dd-redBright' : 'text-dd-text')}>
                      {selectedHero.stress}
                    </span>
                  </span>
                </div>
                {selectedHero.activityLocked && (
                  <div className="text-xs text-dd-redBright mt-1">该英雄本周已参与活动</div>
                )}
              </div>

              {/* 活动按钮 */}
              {TREATMENTS.map((t) => {
                const canAfford = gold >= t.cost;
                const locked = selectedHero.activityLocked;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTreat(t.id)}
                    disabled={!canAfford || locked}
                    className={clsx(
                      'w-full text-left p-3 rounded-sm border transition-all',
                      canAfford && !locked
                        ? 'border-dd-border bg-dd-surface hover:border-dd-gold hover:shadow-dd-gold'
                        : 'border-dd-border bg-dd-bg opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-dd text-sm text-dd-text">
                        <span className="text-dd-gold mr-1" style={{ fontFamily: 'serif' }}>{t.icon}</span> {t.name}
                      </span>
                      <span className={clsx('text-xs font-mono', canAfford ? 'text-dd-gold' : 'text-dd-redBright')}>
                        {t.cost.toLocaleString()}g
                      </span>
                    </div>
                    <p className="text-xs text-dd-textMuted">{t.desc}</p>
                  </button>
                );
              })}

              {/* 解雇按钮 */}
              <div className="pt-3 border-t border-dd-border">
                <button
                  onClick={handleDismiss}
                  className="dd-btn-danger w-full"
                >
                  解雇该英雄
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
