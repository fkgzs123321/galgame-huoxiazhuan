// ============================================================
// 铁匠 — 升级武器 / 护甲
// ============================================================
import { useState } from 'react';
import { useTownStore, getWeaponUpgradeCost, getArmorUpgradeCost } from '@/stores/townStore';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName } from '@/data/ddLoader';
import { HeroSelect, LevelDots } from './shared';
import clsx from 'clsx';

const MAX_LEVEL = 5; // 0~4，共5级

export default function Blacksmith() {
  const upgradeWeapon = useTownStore((s) => s.upgradeWeapon);
  const upgradeArmor = useTownStore((s) => s.upgradeArmor);
  const roster = useGameStore((s) => s.roster);
  const gold = useGameStore((s) => s.gold);
  const crests = useGameStore((s) => s.heirlooms.crest);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const selectedHero = roster.find((h) => h.uid === selectedUid);

  function handleUpgradeWeapon() {
    if (!selectedUid || !selectedHero) return;
    if (selectedHero.weaponLevel >= 4) {
      setFeedback('武器已达最高等级');
      return;
    }
    const cost = getWeaponUpgradeCost(selectedHero.weaponLevel);
    if (gold < cost.gold) {
      setFeedback('金币不足！');
      return;
    }
    if (crests < cost.crests) {
      setFeedback('纹章不足！');
      return;
    }
    const ok = upgradeWeapon(selectedUid);
    setFeedback(ok ? '武器升级成功！' : '升级失败');
  }

  function handleUpgradeArmor() {
    if (!selectedUid || !selectedHero) return;
    if (selectedHero.armorLevel >= 4) {
      setFeedback('护甲已达最高等级');
      return;
    }
    const cost = getArmorUpgradeCost(selectedHero.armorLevel);
    if (gold < cost.gold) {
      setFeedback('金币不足！');
      return;
    }
    if (crests < cost.crests) {
      setFeedback('纹章不足！');
      return;
    }
    const ok = upgradeArmor(selectedUid);
    setFeedback(ok ? '护甲升级成功！' : '升级失败');
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dd-textMuted">
        在铁匠铺升级英雄的武器和护甲。每次升级需要消耗金币和纹章。
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

        {/* 右侧：升级面板 */}
        <div className="dd-panel p-3 space-y-3">
          <div className="text-xs text-dd-textMuted uppercase tracking-wide">装备升级</div>

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
                <div className="text-xs text-dd-textMuted mt-1">
                  生命 <span className="text-dd-text font-mono">{selectedHero.currentHp}/{selectedHero.maxHp}</span>
                </div>
              </div>

              {/* 武器升级 */}
              <div className="border border-dd-border rounded-sm bg-dd-bg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-dd text-sm text-dd-text">
                    <span className="text-dd-gold mr-1" style={{ fontFamily: 'serif' }}>⚔</span> 武器
                  </span>
                  <LevelDots current={selectedHero.weaponLevel + 1} max={MAX_LEVEL} />
                </div>
                <div className="text-xs text-dd-textMuted">
                  当前等级: +{selectedHero.weaponLevel}
                  {selectedHero.weaponLevel < 4 && (
                    <> → 升级后: +{selectedHero.weaponLevel + 1}</>
                  )}
                </div>
                {selectedHero.weaponLevel >= 4 ? (
                  <div className="text-xs text-dd-gold py-1">已达最高等级</div>
                ) : (
                  <>
                    <UpgradeCostDisplay
                      cost={getWeaponUpgradeCost(selectedHero.weaponLevel)}
                      gold={gold}
                      crests={crests}
                    />
                    <button
                      onClick={handleUpgradeWeapon}
                      className="dd-btn-primary w-full"
                    >
                      升级武器
                    </button>
                  </>
                )}
              </div>

              {/* 护甲升级 */}
              <div className="border border-dd-border rounded-sm bg-dd-bg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-dd text-sm text-dd-text">
                    <span className="text-dd-gold mr-1" style={{ fontFamily: 'serif' }}>✠</span> 护甲
                  </span>
                  <LevelDots current={selectedHero.armorLevel + 1} max={MAX_LEVEL} />
                </div>
                <div className="text-xs text-dd-textMuted">
                  当前等级: +{selectedHero.armorLevel}
                  {selectedHero.armorLevel < 4 && (
                    <> → 升级后: +{selectedHero.armorLevel + 1}</>
                  )}
                </div>
                {selectedHero.armorLevel >= 4 ? (
                  <div className="text-xs text-dd-gold py-1">已达最高等级</div>
                ) : (
                  <>
                    <UpgradeCostDisplay
                      cost={getArmorUpgradeCost(selectedHero.armorLevel)}
                      gold={gold}
                      crests={crests}
                    />
                    <button
                      onClick={handleUpgradeArmor}
                      className="dd-btn-primary w-full"
                    >
                      升级护甲
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 升级费用显示
function UpgradeCostDisplay({
  cost,
  gold,
  crests,
}: {
  cost: { gold: number; crests: number };
  gold: number;
  crests: number;
}) {
  const goldOk = gold >= cost.gold;
  const crestOk = crests >= cost.crests;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={clsx('font-mono', goldOk ? 'text-dd-gold' : 'text-dd-redBright')}>
        {cost.gold.toLocaleString()}g
      </span>
      <span className={clsx('font-mono', crestOk ? 'text-dd-text' : 'text-dd-redBright')}>
        {cost.crests} 纹章
      </span>
    </div>
  );
}
