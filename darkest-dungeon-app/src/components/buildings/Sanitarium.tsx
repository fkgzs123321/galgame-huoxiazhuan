// ============================================================
// 疗养院 — 治疗疾病 / 锁定怪癖
// ============================================================
import { useState } from 'react';
import {
  useTownStore,
  getDiseaseName,
  getQuirkName,
  isPositiveQuirk,
} from '@/stores/townStore';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName } from '@/data/ddLoader';
import { HeroSelect, QuirkTag, EmptyState } from './shared';
import clsx from 'clsx';

const CURE_COST = 1500;
const LOCK_COST = 1500;

export default function Sanitarium() {
  const cureDisease = useTownStore((s) => s.sanitariumCureDisease);
  const lockQuirk = useTownStore((s) => s.sanitariumLockQuirk);
  const roster = useGameStore((s) => s.roster);
  const gold = useGameStore((s) => s.gold);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const selectedHero = roster.find((h) => h.uid === selectedUid);

  function handleCure(diseaseId: string) {
    if (!selectedUid || !selectedHero) return;
    if (gold < CURE_COST) {
      setFeedback('金币不足！');
      return;
    }
    const ok = cureDisease(selectedUid, diseaseId);
    setFeedback(ok ? `已治愈 ${getDiseaseName(diseaseId)}` : '治疗失败');
  }

  function handleLock(quirkId: string) {
    if (!selectedUid || !selectedHero) return;
    if (gold < LOCK_COST) {
      setFeedback('金币不足！');
      return;
    }
    const ok = lockQuirk(selectedUid, quirkId);
    setFeedback(ok ? `已锁定怪癖 ${getQuirkName(quirkId)}` : '锁定失败');
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dd-textMuted">
        在疗养院中治疗英雄的疾病，或锁定有价值的怪癖使其不被覆盖。每次操作需花费 {CURE_COST.toLocaleString()} 金币。
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

        {/* 右侧：治疗面板 */}
        <div className="dd-panel p-3 space-y-4">
          <div className="text-xs text-dd-textMuted uppercase tracking-wide">医疗处理</div>

          {!selectedHero ? (
            <div className="text-center py-8 text-dd-textMuted text-sm">
              请先从左侧选择一位英雄
            </div>
          ) : (
            <>
              {/* 英雄信息 */}
              <div className="bg-dd-bg border border-dd-border rounded-sm p-3">
                <div className="flex items-center justify-between">
                  <span className={clsx('font-dd text-sm', `class-${selectedHero.classId}`)}>
                    {getHeroName(selectedHero.classId)}
                  </span>
                  <span className="dd-tag text-[10px] text-dd-textMuted leading-none">Lv.{selectedHero.resolveLevel}</span>
                </div>
                <div className="text-dd-textBright text-sm">{selectedHero.name}</div>
              </div>

              {/* 疾病治疗 */}
              <div>
                <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-wide">
                  疾病 ({selectedHero.diseases.length})
                </div>
                {selectedHero.diseases.length === 0 ? (
                  <div className="text-xs text-dd-greenBright">该英雄没有疾病</div>
                ) : (
                  <div className="space-y-2">
                    {selectedHero.diseases.map((diseaseId) => {
                      const canAfford = gold >= CURE_COST;
                      return (
                        <div
                          key={diseaseId}
                          className="flex items-center justify-between p-2 border border-dd-border rounded-sm bg-dd-bg"
                        >
                          <div>
                            <span className="text-sm text-dd-redBright">{getDiseaseName(diseaseId)}</span>
                            <span className="text-xs text-dd-textMuted ml-2">{diseaseId}</span>
                          </div>
                          <button
                            onClick={() => handleCure(diseaseId)}
                            disabled={!canAfford}
                            className="dd-btn text-xs !px-3 !py-1"
                          >
                            治愈 ({CURE_COST.toLocaleString()}g)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 怪癖锁定 */}
              <div>
                <div className="text-xs text-dd-textMuted mb-2 uppercase tracking-wide">
                  怪癖 ({selectedHero.quirks.length})
                </div>
                {selectedHero.quirks.length === 0 ? (
                  <div className="text-xs text-dd-textMuted">该英雄没有怪癖</div>
                ) : (
                  <div className="space-y-2">
                    {selectedHero.quirks.map((quirkId) => {
                      const isLocked = selectedHero.lockedQuirks?.includes(quirkId) ?? false;
                      const canAfford = gold >= LOCK_COST;
                      const positive = isPositiveQuirk(quirkId);
                      return (
                        <div
                          key={quirkId}
                          className={clsx(
                            'flex items-center justify-between p-2 border rounded-sm bg-dd-bg',
                            isLocked ? 'border-dd-gold' : 'border-dd-border'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <QuirkTag quirkId={quirkId} locked={isLocked} />
                            {positive && !isLocked && (
                              <span className="text-[10px] text-dd-textMuted">建议锁定</span>
                            )}
                          </div>
                          {isLocked ? (
                            <span className="text-xs text-dd-gold">已锁定</span>
                          ) : (
                            <button
                              onClick={() => handleLock(quirkId)}
                              disabled={!canAfford}
                              className="dd-btn text-xs !px-3 !py-1"
                            >
                              锁定 ({LOCK_COST.toLocaleString()}g)
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 空状态提示 */}
              {selectedHero.diseases.length === 0 && selectedHero.quirks.length === 0 && (
                <EmptyState message="该英雄状态良好，无需治疗" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
