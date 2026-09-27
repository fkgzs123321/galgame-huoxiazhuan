// 斗技场 — 连续挑战模式（复用完整战斗 UI，standalone 模式）
// 对齐凡人 ArenaPage：胜利积累奖金，失败结算离场
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, StatBar } from '@/ui';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { loadMonsters } from '@/data/ddLoader';
import { getHeroName } from '@/data/ddLoader';
import type { HeroInstance, MonsterData } from '@/types';
import Combat from '@/components/Combat';
import { toast } from '@/ui/Extras';
import { logHub } from '@/stores/logStore';
import { useTimelineStore } from '@/stores/timelineStore';
import clsx from 'clsx';

export function ArenaPage({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate();
  const roster = useGameStore((s) => s.roster);
  const addGold = useGameStore((s) => s.addGold);
  const addHeirloom = useGameStore((s) => s.addHeirloom);
  const week = useGameStore((s) => s.week);
  const addChronicle = useTimelineStore((s) => s.add);

  const battle = useCombatStore((s) => s.battle);
  const isInitializing = useCombatStore((s) => s.isInitializing);
  const lastWinner = useCombatStore((s) => s.lastWinner);
  const standalone = useCombatStore((s) => s.standalone);
  const startBattle = useCombatStore((s) => s.startBattle);
  const setStandalone = useCombatStore((s) => s.setStandalone);
  const setReturnPhase = useCombatStore((s) => s.setReturnPhase);

  const [party, setParty] = useState<HeroInstance[]>([]);
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [round, setRound] = useState(0);          // 已获胜场次
  const [totalGold, setTotalGold] = useState(0);  // 累计奖金
  const [result, setResult] = useState<'none' | 'win' | 'lose' | 'fled'>('none');

  useEffect(() => {
    void loadMonsters().then((ms) => {
      // 竞技场怪物池：排除 boss/古神类
      const pool = ms.filter((m) =>
        m.maxHp > 0 && m.maxHp < 120 &&
        !m.id.includes('boss') && !m.id.includes('ancestor') && !m.id.includes('heart')
      );
      setMonsters(pool);
    });
    // 进入页面时确保清理战斗状态
    useCombatStore.getState().reset();
    setStandalone(true);
    setReturnPhase('town');
  }, [setStandalone, setReturnPhase]);

  // 战斗结束（battle 从有到无）→ 结算
  useEffect(() => {
    if (!standalone) return;
    if (battle === null && !isInitializing && result === 'none' && lastWinner !== null) {
      if (lastWinner === 'hero') {
        const prize = 150 + round * 50;
        addGold(prize);
        addHeirloom('crest', 1 + round);
        setTotalGold((g) => g + prize);
        setRound((r) => r + 1);
        setResult('win');
        logHub.battle(`斗技场第 ${round + 1} 场胜利，奖金 ${prize} 金币`);
      } else {
        setResult('lose');
        logHub.battle(`斗技场第 ${round + 1} 场溃败，累计 ${totalGold} 金币`);
      }
    }
  }, [battle, isInitializing, standalone, lastWinner, result, round, totalGold, addGold, addHeirloom]);

  const toggleHero = (h: HeroInstance) => {
    setParty((p) =>
      p.some((x) => x.uid === h.uid)
        ? p.filter((x) => x.uid !== h.uid)
        : p.length < 4 ? [...p, h] : p
    );
  };

  const startMatch = () => {
    if (party.length === 0) { toast('请先选择队伍', 'error'); return; }
    setResult('none');
    setStandalone(true);
    void startBattle(party, monsters);
  };

  const nextMatch = () => {
    setResult('none');
    // 重新读取名册状态（压力/HP 已由 endBattle 同步）
    const fresh = useGameStore.getState().roster.filter((h) => party.some((p) => p.uid === h.uid));
    setParty(fresh);
    void startBattle(fresh, monsters);
  };

  const leave = () => {
    useCombatStore.getState().reset();
    if (round > 0) {
      addChronicle({ week, category: 'event', title: `斗技场征程结束：${round} 连胜，赢得 ${totalGold} 金币` });
    }
    onBack?.();
    navigate('/');
  };

  const inBattle = battle !== null || isInitializing;

  // 战斗中 → 直接渲染战斗 UI
  if (inBattle) {
    return <Combat />;
  }

  // 结算视图
  if (result === 'win') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="dd-panel p-8 text-center max-w-md w-full">
          <div className="dd-title text-3xl text-dd-gold mb-2">胜利！</div>
          <p className="text-dd-textMuted text-sm mb-4">斗技场第 {round} 场获胜</p>
          <div className="text-dd-gold font-mono text-lg mb-4">+{(150 + (round - 1) * 50).toLocaleString()} 金币</div>
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={nextMatch}>继续挑战（第 {round + 1} 场）</Button>
            <Button variant="ghost" onClick={leave}>带着奖金离开</Button>
          </div>
        </div>
      </div>
    );
  }

  if (result === 'lose' || result === 'fled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="dd-panel p-8 text-center max-w-md w-full">
          <div className="dd-title text-3xl dd-text-blood mb-2">溃败…</div>
          <p className="text-dd-textMuted text-sm mb-4">
            {result === 'lose' ? `队伍在第 ${round + 1} 场倒下` : '队伍撤离了斗技场'}
          </p>
          <div className="text-dd-text mb-4">
            战绩：<span className="text-dd-gold font-mono">{round} 连胜</span> · 奖金{' '}
            <span className="text-dd-gold font-mono">{totalGold.toLocaleString()}</span> 金币
          </div>
          <Button variant="primary" onClick={leave}>返回庄园</Button>
        </div>
      </div>
    );
  }

  // 备战视图
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>斗技场</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 规则" extra="屠夫马戏团 · 单机 PvE" />
        <div className="p-4 text-xs text-dd-textMuted leading-relaxed space-y-1">
          <p>· 从名册中挑选最多 4 名英雄，连续迎战竞技场怪物。</p>
          <p>· 每胜一场奖金递增（首场 150g，之后每场 +50g），并掉落纹章。</p>
          <p>· 战斗之间的伤势与压力保留 —— 队伍会越来越疲惫，见好就收。</p>
          <p>· 中途撤退或战败即结算离场。</p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 选择队伍" extra={`${party.length}/4 · 战绩 ${round} 连胜`} />
        <div className="p-4">
          {roster.length === 0 ? (
            <EmptyState text="名册为空，先到驿站招募英雄" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {roster.map((h) => {
                const selected = party.some((x) => x.uid === h.uid);
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
                    <div className="text-[10px] text-dd-textMuted">{h.name}</div>
                    <div className="mt-1">
                      <StatBar value={h.currentHp} max={h.maxHp} height={4} color="#7cc27c" />
                      <StatBar value={100 - h.stress} max={100} height={4} color="#c8a038" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={startMatch} disabled={party.length === 0}>
              ⚔ 进入斗技场（{party.length} 人）
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
