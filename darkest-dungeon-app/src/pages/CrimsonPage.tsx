// 猩红庭院 — 诅咒状态/血酒库存/庭院派遣（基于 crimsonSystem）
// 对齐凡人 CrimsonPage：庭院 DLC 深度玩法
import { useEffect, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, StatBar, Badge } from '@/ui';
import { useGameStore } from '@/stores/gameStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { getHeroName } from '@/data/ddLoader';
import { crimsonMonsters } from '@/data/crimsonMonsters';
import {
  THE_BLOOD_ID, CURSE_STAGES, CURSE_STAGE_ORDER, isCursed,
  getCurseStage, getCurseCombatMods, drinkBlood, cureCurse,
} from '@/gateway/crimsonSystem';
import { useCombatStore } from '@/stores/combatStore';
import { useTimelineStore } from '@/stores/timelineStore';
import Combat from '@/components/Combat';
import { toast } from '@/ui/Extras';
import { logHub } from '@/stores/logStore';
import type { CrimsonCurseStage, HeroInstance } from '@/types';
import clsx from 'clsx';

const STAGE_LABEL: Record<CrimsonCurseStage, string> = {
  dormant: '潜伏', craving: '渴求', thirst: '饥渴', ravenous: '暴虐',
};

export function CrimsonPage({ onBack }: { onBack?: () => void }) {
  const roster = useGameStore((s) => s.roster);
  const updateHero = useGameStore((s) => s.updateHero);
  const blood = useInventoryStore((s) => s.provisionInventory.find((p) => p.id === THE_BLOOD_ID)?.count ?? 0);
  const useProvision = useInventoryStore((s) => s.useProvision);
  const addProvision = useInventoryStore((s) => s.addProvision);
  const week = useGameStore((s) => s.week);
  const addChronicle = useTimelineStore((s) => s.add);

  // 庭院派遣战斗状态
  const battle = useCombatStore((s) => s.battle);
  const isInitializing = useCombatStore((s) => s.isInitializing);
  const lastWinner = useCombatStore((s) => s.lastWinner);
  const standalone = useCombatStore((s) => s.standalone);
  const startBattle = useCombatStore((s) => s.startBattle);
  const setStandalone = useCombatStore((s) => s.setStandalone);
  const setReturnPhase = useCombatStore((s) => s.setReturnPhase);
  const [party, setParty] = useState<HeroInstance[]>([]);
  const [raidResult, setRaidResult] = useState<'none' | 'win' | 'lose'>('none');

  useEffect(() => {
    useCombatStore.getState().reset();
    setStandalone(true);
    setReturnPhase('town');
  }, [setStandalone, setReturnPhase]);

  // 庭院战斗结束 → 结算
  useEffect(() => {
    if (!standalone || battle !== null || isInitializing || raidResult !== 'none' || lastWinner === null) return;
    if (lastWinner === 'hero') {
      addProvision({ id: THE_BLOOD_ID, name: '血酒', type: 'blood', description: '猩红庭院的诅咒饮品，可缓解渴血', price: 75, count: 1 });
      addChronicle({ week, category: 'battle', title: `庭院远征胜利：带回一瓶血酒，${party.length} 名英雄可能沾染诅咒` });
      setRaidResult('win');
      logHub.battle('庭院远征胜利，获得血酒');
    } else {
      addChronicle({ week, category: 'battle', title: `庭院远征溃败：队伍在第 ${week} 周被血裔击退` });
      setRaidResult('lose');
      logHub.battle('庭院远征溃败');
    }
  }, [battle, isInitializing, standalone, lastWinner, raidResult, week, party.length, addProvision, addChronicle]);

  const toggleHero = (h: HeroInstance) => {
    setParty((p) =>
      p.some((x) => x.uid === h.uid)
        ? p.filter((x) => x.uid !== h.uid)
        : p.length < 4 ? [...p, h] : p
    );
  };

  const startRaid = () => {
    if (party.length === 0) { toast('请先选择队伍', 'error'); return; }
    setRaidResult('none');
    setStandalone(true);
    void startBattle(party, crimsonMonsters);
  };

  const finishRaid = () => {
    setRaidResult('none');
    useCombatStore.getState().reset();
    setStandalone(true);
    setParty([]);
  };

  const inBattle = battle !== null || isInitializing;
  if (inBattle) return <Combat />;

  const cursed = roster.filter(isCursed);
  const stageCounts = Object.fromEntries(
    CURSE_STAGE_ORDER.map((s) => [s, cursed.filter((h) => getCurseStage(h) === s).length])
  );

  const feedBlood = (heroUid: string) => {
    if (blood <= 0) {
      toast('血酒库存不足！', 'error');
      return;
    }
    const hero = roster.find((h) => h.uid === heroUid);
    if (!hero) return;
    const updated = drinkBlood(hero);
    useProvision(THE_BLOOD_ID);
    updateHero(heroUid, updated);
    toast(`${getHeroName(hero.classId)} ${hero.name} 饮下血酒`, 'success');
    logHub.info(`血酒使用：${hero.name}`);
  };

  const treatCurse = (heroUid: string) => {
    const hero = roster.find((h) => h.uid === heroUid);
    if (!hero) return;
    const updated = cureCurse(hero);
    updateHero(heroUid, updated);
    toast(`${hero.name} 接受了净化仪式`, 'success');
    logHub.info(`诅咒净化：${hero.name}`);
  };

  const buyBlood = () => {
    addProvision({ id: THE_BLOOD_ID, name: '血酒', type: 'blood', description: '猩红庭院的诅咒饮品，可缓解渴血', price: 75, count: 1 });
    toast('购得一瓶血酒（75g）');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>猩红庭院</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 庭院疫情" extra={`第 ${week} 周`} />
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-black/20 border border-dd-gold/10 rounded-sm p-3 text-center">
              <div className="text-dd-gold font-mono text-xl">{cursed.length}</div>
              <div className="text-[10px] text-dd-textDim">被诅咒英雄</div>
            </div>
            {CURSE_STAGE_ORDER.map((s) => (
              <div key={s} className="bg-black/20 border border-dd-gold/10 rounded-sm p-3 text-center">
                <div className={clsx('font-mono text-xl', s === 'ravenous' ? 'text-red-400' : 'text-dd-gold')}>
                  {stageCounts[s] ?? 0}
                </div>
                <div className="text-[10px] text-dd-textDim">{STAGE_LABEL[s]}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-dd-textMuted">
              血酒库存：<span className={blood > 0 ? 'text-red-300 font-mono' : 'text-dd-textDim font-mono'}>{blood} 瓶</span>
            </span>
            <Button size="sm" onClick={buyBlood}>购买血酒（75g）</Button>
          </div>
          <p className="text-[10px] text-dd-textDim mt-2 leading-relaxed">
            猩红诅咒逐周恶化：潜伏 → 渴求 → 饥渴 → 暴虐。渴求以上阶段每周会渴血，无血可饮将受重创；
            暴虐阶段战力大幅下降。饮用血酒可缓解，疗养院可净化。
          </p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 被诅咒的英雄" extra={cursed.length > 0 ? `${cursed.length} 人` : '无人'} />
        <div className="max-h-[55vh] overflow-y-auto">
          {cursed.length === 0 ? (
            <EmptyState text="暂无英雄被猩红诅咒感染 —— 庭院的低语还在远处" />
          ) : (
            cursed.map((h) => {
              const stage = getCurseStage(h)!;
              const stageInfo = CURSE_STAGES[stage];
              const mods = getCurseCombatMods(h);
              return (
                <div key={h.uid} className="px-3 py-2.5 border-b border-dd-gold/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('text-xs font-bold', `class-${h.classId}`)}>{getHeroName(h.classId)}</span>
                    <span className="text-[10px] text-dd-textMuted">{h.name}</span>
                    <Badge tone={stage === 'ravenous' ? 'red' : stage === 'thirst' ? 'gold' : 'gray'}>
                      {STAGE_LABEL[stage]}
                    </Badge>
                    {stageInfo.description && <span className="text-[10px] text-dd-textDim">{stageInfo.description}</span>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    <div className="w-40">
                      <StatBar value={h.currentHp} max={h.maxHp} height={4} color="#7cc27c" dangerBelow={25} />
                    </div>
                    {mods.dmgMod !== 1 && (
                      <span className="text-[10px] text-red-300">伤害修正 {mods.dmgMod >= 0 ? '+' : ''}{mods.dmgMod}%</span>
                    )}
                    {mods.stressGainMod !== 1 && (
                      <span className="text-[10px] text-red-300">压力获取 {mods.stressGainMod >= 0 ? '+' : ''}{mods.stressGainMod}%</span>
                    )}
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" onClick={() => feedBlood(h.uid)} disabled={blood <= 0}>
                        饮血酒
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => treatCurse(h.uid)}>
                        净化（疗养院）
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 庭院区域" extra="伯爵的盛宴仍在继续" />
        <div className="p-4 text-xs text-dd-textMuted leading-relaxed">
          <p>
            庭院深处，伯爵与他的血裔仍在举行永恒的宴会。深入庭院的英雄将面对吸血鬼、
            鳄鱼怪与扭曲的贵族——并带回能治愈诅咒的「血酒」。战胜者还将获得一份「血酒」战利品。
          </p>
          <p className="text-[10px] text-dd-textDim mt-2">
            （庭院主线战役：击败伯爵/子爵/男爵/维斯库斯四个血裔首领，彻底终结血色瘟疫。）
          </p>
        </div>
      </Panel>

      {/* 庭院派遣战斗 */}
      <Panel>
        <PanelHeader title="◆ 庭院远征" extra={`${party.length}/4 人 · 血酒 ${blood} 瓶`} />
        <div className="p-4">
          {raidResult === 'win' && (
            <div className="mb-3 text-xs text-emerald-300 bg-emerald-400/5 border border-emerald-400/20 rounded-sm px-3 py-2">
              ✓ 远征胜利！获得 1 瓶血酒。英雄们可能已沾染猩红诅咒——留意「被诅咒的英雄」列表。
            </div>
          )}
          {raidResult === 'lose' && (
            <div className="mb-3 text-xs text-red-400 bg-red-400/5 border border-red-400/20 rounded-sm px-3 py-2">
              ✗ 远征溃败。英雄们带着创伤返回，下次携带更多血酒与圣水再来。
            </div>
          )}

          {roster.length === 0 ? (
            <EmptyState text="名册为空，先到驿站招募英雄" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {roster.map((h) => {
                const selected = party.some((x) => x.uid === h.uid);
                const cursedHero = getCurseStage(h);
                return (
                  <button
                    key={h.uid}
                    onClick={() => toggleHero(h)}
                    className={clsx(
                      'text-left p-2 border rounded-sm transition-colors',
                      selected
                        ? 'border-dd-gold bg-dd-gold/10'
                        : 'border-dd-gold/20 hover:border-dd-gold/50'
                    )}
                  >
                    <div className="text-xs text-dd-gold">{getHeroName(h.classId)}</div>
                    <div className="text-[10px] text-dd-textMuted">
                      {h.name}
                      {cursedHero && <span className="text-red-300"> · {STAGE_LABEL[cursedHero]}</span>}
                    </div>
                    <div className="mt-1">
                      <StatBar value={h.currentHp} max={h.maxHp} height={4} color="#7cc27c" dangerBelow={25} />
                      <StatBar value={100 - h.stress} max={100} height={4} color="#c8a038" dangerBelow={40} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={startRaid} disabled={party.length === 0}>
              🩸 进入庭院（{party.length} 人）
            </Button>
            {(raidResult === 'win' || raidResult === 'lose') && (
              <Button variant="ghost" onClick={finishRaid}>关闭战报</Button>
            )}
          </div>
          <p className="text-[10px] text-dd-textDim mt-2">
            庭院敌人为血裔怪物；战斗胜利后按规则有感染猩红诅咒的风险（若配置了庭院 DLC）。
          </p>
        </div>
      </Panel>
    </div>
  );
}
