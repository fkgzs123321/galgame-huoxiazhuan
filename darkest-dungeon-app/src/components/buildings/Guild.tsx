// ============================================================
// 公会 — 升级战斗技能
// ============================================================
import { useState } from 'react';
import { useTownStore, getSkillUpgradeCost } from '@/stores/townStore';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName, getSkillName } from '@/data/ddLoader';
import { HeroSelect, LevelDots } from './shared';
import clsx from 'clsx';

const MAX_LEVEL = 5;

export default function Guild() {
  const upgradeSkill = useTownStore((s) => s.upgradeSkill);
  const roster = useGameStore((s) => s.roster);
  const gold = useGameStore((s) => s.gold);
  const crests = useGameStore((s) => s.heirlooms.crest);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const selectedHero = roster.find((h) => h.uid === selectedUid);

  function handleUpgrade(skillId: string) {
    if (!selectedUid || !selectedHero) return;
    const currentLevel = selectedHero.skillLevels?.[skillId] ?? 0;
    if (currentLevel >= 4) {
      setFeedback('该技能已达最高等级');
      return;
    }
    const cost = getSkillUpgradeCost(currentLevel);
    if (gold < cost.gold) {
      setFeedback('金币不足！');
      return;
    }
    if (crests < cost.crests) {
      setFeedback('纹章不足！');
      return;
    }
    const ok = upgradeSkill(selectedUid, skillId);
    setFeedback(ok ? `${getSkillName(skillId)} 升级成功！` : '升级失败');
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dd-textMuted">
        在公会升级英雄的战斗技能。每次升级需要消耗金币和纹章。
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

        {/* 右侧：技能列表 */}
        <div className="dd-panel p-3 space-y-3">
          <div className="text-xs text-dd-textMuted uppercase tracking-wide">战斗技能</div>

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

              {/* 技能列表 */}
              <div className="space-y-2">
                {selectedHero.skills.map((skillId) => {
                  const skillLevel = selectedHero.skillLevels?.[skillId] ?? 0;
                  const maxed = skillLevel >= 4;
                  const cost = getSkillUpgradeCost(skillLevel);
                  const goldOk = gold >= cost.gold;
                  const crestOk = crests >= cost.crests;
                  return (
                    <div
                      key={skillId}
                      className="border border-dd-border rounded-sm bg-dd-bg p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-dd text-sm text-dd-textBright">
                          {getSkillName(skillId)}
                        </span>
                        <LevelDots current={skillLevel + 1} max={MAX_LEVEL} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-dd-textMuted">
                          等级 {skillLevel}{!maxed && ` → ${skillLevel + 1}`}
                        </span>
                        {maxed ? (
                          <span className="text-xs text-dd-gold">已满级</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={clsx('text-xs font-mono', goldOk ? 'text-dd-gold' : 'text-dd-redBright')}>
                              {cost.gold.toLocaleString()}g
                            </span>
                            <span className={clsx('text-xs font-mono', crestOk ? 'text-dd-text' : 'text-dd-redBright')}>
                              {cost.crests}纹章
                            </span>
                            <button
                              onClick={() => handleUpgrade(skillId)}
                              disabled={!goldOk || !crestOk}
                              className="dd-btn text-xs !px-3 !py-1"
                            >
                              升级
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
