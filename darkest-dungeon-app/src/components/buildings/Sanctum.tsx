// ============================================================
// 疫医帐篷（Sanctum）— 血腥诅咒（Crimson Court DLC）管理
//  - 诊断与展示被诅咒英雄的状态
//  - 消耗 The Blood 压制诅咒阶段
//  - 花费金币彻底根除诅咒
//  - 购买/查看血液库存
// ============================================================
import { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { getHeroName } from '@/data/ddLoader';
import {
  CURSE_STAGES,
  THE_BLOOD_ITEM,
  isCursed,
  getCurseStage,
  drinkBlood,
  cureCurse,
} from '@/gateway/crimsonSystem';
import clsx from 'clsx';

const CURE_COST = 2000;

export default function Sanctum() {
  const roster = useGameStore((s) => s.roster);
  const gold = useGameStore((s) => s.gold);
  const updateHero = useGameStore((s) => s.updateHero);
  const addGold = useGameStore((s) => s.addGold);
  const bloodCount =
    useInventoryStore((s) => s.provisionInventory.find((p) => p.id === THE_BLOOD_ITEM.id)?.count ?? 0);
  const addProvision = useInventoryStore((s) => s.addProvision);
  const useProvision = useInventoryStore((s) => s.useProvision);

  const [feedback, setFeedback] = useState('');

  const cursed = roster.filter((h) => isCursed(h));

  function handleDrink(uid: string) {
    const hero = roster.find((h) => h.uid === uid);
    if (!hero) return;
    if (bloodCount <= 0) {
      setFeedback('帐篷中没有库存的血液可供饮下。');
      return;
    }
    const stage = getCurseStage(hero)!;
    if (stage === 'dormant') {
      setFeedback('这位英雄尚在潜伏期，无需饮血。');
      return;
    }
    useProvision(THE_BLOOD_ITEM.id);
    const updated = drinkBlood(hero);
    updateHero(uid, { crimsonCurse: updated.crimsonCurse, stress: updated.stress });
    setFeedback(`「${hero.name}」饮下了血液，饥渴暂时退去，压力 −15。`);
  }

  function handleCure(uid: string) {
    const hero = roster.find((h) => h.uid === uid);
    if (!hero) return;
    if (gold < CURE_COST) {
      setFeedback('金币不足！');
      return;
    }
    addGold(-CURE_COST);
    const updated = cureCurse(hero);
    updateHero(uid, { crimsonCurse: updated.crimsonCurse ?? undefined });
    setFeedback(`「${hero.name}」体内的血腥诅咒已被彻底根除。`);
  }

  function handleBuyBlood() {
    if (gold < THE_BLOOD_ITEM.price) {
      setFeedback('金币不足！');
      return;
    }
    addGold(-THE_BLOOD_ITEM.price);
    addProvision({ ...THE_BLOOD_ITEM, count: 1 });
    setFeedback(`购入一瓶血液（${THE_BLOOD_ITEM.price.toLocaleString()} 金币）。`);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dd-textMuted">
        疫医的帐篷里弥漫着草药与铁锈的气息。这里管理着那源于绯红庭院的诅咒——血腥诅咒。
        饮下血液可暂时压制饥渴，彻底根除需花费 {CURE_COST.toLocaleString()} 金币。
      </p>

      {/* 血液库存 */}
      <div className="dd-panel p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-dd-redBright text-xl">❥</span>
          <div>
            <div className="text-sm text-dd-textBright">血液库存：{bloodCount} 瓶</div>
            <div className="text-[11px] text-dd-textMuted mt-0.5">{THE_BLOOD_ITEM.description}</div>
          </div>
        </div>
        <button onClick={handleBuyBlood} className="dd-btn-primary !py-1 !px-3 text-[11px]">
          购入一瓶（{THE_BLOOD_ITEM.price.toLocaleString()}）
        </button>
      </div>

      {feedback && (
        <div className="text-sm text-dd-gold bg-dd-surface2 px-3 py-2 rounded-sm border border-dd-border">
          {feedback}
        </div>
      )}

      {/* 被诅咒英雄列表 */}
      <div className="dd-panel p-3">
        <div className="dd-panel-header">被诅咒的英雄（{cursed.length}）</div>
        {cursed.length === 0 ? (
          <div className="text-center py-8 text-dd-textMuted text-sm">
            名册中没有被血腥诅咒侵蚀的英雄。
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {cursed.map((hero) => {
              const stage = getCurseStage(hero)!;
              const info = CURSE_STAGES[stage];
              return (
                <div
                  key={hero.uid}
                  className="p-3 bg-dd-surface2 border border-dd-border flex flex-col sm:flex-row sm:items-center gap-3"
                  style={{ borderRadius: '2px' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={clsx('font-dd text-xs tracking-wide', `class-${hero.classId}`)}>
                        {getHeroName(hero.classId)}
                      </span>
                      <span className="text-dd-textMuted text-xs">{hero.name}</span>
                    </div>
                    <div
                      className={clsx(
                        'text-xs mt-1',
                        info.tone === 'blood' && 'text-dd-redBright',
                        info.tone === 'darkred' && 'text-dd-redBright',
                        info.tone === 'gold' && 'text-dd-gold'
                      )}
                    >
                      <span className="font-bold">{info.name}</span>
                      <span className="text-dd-textMuted"> — {info.description}</span>
                    </div>
                    <div className="text-[11px] text-dd-textMuted mt-0.5">
                      第 {hero.crimsonCurse!.sinceWeek} 周感染 · 压力 {hero.stress}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDrink(hero.uid)}
                      disabled={bloodCount <= 0}
                      className="dd-btn !py-1 !px-3 text-[11px]"
                      title="消耗一瓶血液，压制一阶并减压"
                    >
                      饮血
                    </button>
                    <button
                      onClick={() => handleCure(hero.uid)}
                      className="dd-btn-danger !py-1 !px-3 text-[11px]"
                      title={`花费 ${CURE_COST.toLocaleString()} 金币根除诅咒`}
                    >
                      根除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
