// 农场无尽模式 — 波次生存（复用完整战斗 UI，standalone 模式）
// 对齐凡人 FarmsteadPage / Color of Madness：压力与伤势逐波累积，分数结算
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, StatBar, ProgressRing } from '@/ui';
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

const MAX_WAVE = 99;

export function FarmsteadPage({ onBack }: { onBack?: () => void }) {
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
  const [wave, setWave] = useState(0);            // 当前波次（0=未开始）
  const [survived, setSurvived] = useState(0);    // 已存活波次
  const [score, setScore] = useState(0);          // 碎片分
  const [result, setResult] = useState<'none' | 'victory' | 'fall' | 'retreat'>('none');

  useEffect(() => {
    void loadMonsters().then((ms) => {
      const pool = ms.filter((m) =>
        m.maxHp > 0 && m.maxHp < 120 &&
        !m.id.includes('boss') && !m.id.includes('ancestor') && !m.id.includes('heart')
      );
      setMonsters(pool);
    });
    useCombatStore.getState().reset();
    setStandalone(true);
    setReturnPhase('town');
  }, [setStandalone, setReturnPhase]);

  // 战斗结束 → 结算
  useEffect(() => {
    if (!standalone || battle !== null || isInitializing || result !== 'none' || lastWinner === null) return;
    if (lastWinner === 'hero') {
      const shards = 2 + wave; // 每波碎片递增
      addGold(100 + wave * 25);
      if (wave % 3 === 0) addHeirloom('portrait', 1);
      setScore((s) => s + shards);
      setSurvived(wave);
      setResult('victory');
      logHub.battle(`农场第 ${wave} 波击退，碎片 +${shards}`);
    } else {
      setSurvived(wave);
      setResult('fall');
      logHub.battle(`农场第 ${wave + 1} 波倒下，存活 ${wave} 波`);
    }
  }, [battle, isInitializing, standalone, lastWinner, result, wave, addGold, addHeirloom]);

  const toggleHero = (h: HeroInstance) => {
    setParty((p) =>
      p.some((x) => x.uid === h.uid)
        ? p.filter((x) => x.uid !== h.uid)
        : p.length < 4 ? [...p, h] : p
    );
  };

  // 生成当前波次的敌人（难度随波次提升）
  const pickEnemies = (w: number): MonsterData[] => {
    const pool = monsters.filter((m) => {
      const hpCap = Math.min(30 + w * 6, 115);
      return m.maxHp >= 8 + w * 1.5 && m.maxHp <= hpCap;
    });
    const source = pool.length >= 3 ? pool : monsters;
    const count = Math.min(2 + Math.floor(w / 2), 4);
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const startRaid = () => {
    if (party.length === 0) { toast('请先选择队伍', 'error'); return; }
    setWave(1);
    setResult('none');
    setStandalone(true);
    void startBattle(party, monsters, pickEnemies(1));
  };

  const nextWave = () => {
    const w = wave + 1;
    setWave(w);
    setResult('none');
    const fresh = useGameStore.getState().roster.filter((h) => party.some((p) => p.uid === h.uid));
    setParty(fresh);
    if (fresh.length === 0) {
      setResult('fall');
      return;
    }
    void startBattle(fresh, monsters, pickEnemies(w));
  };

  const leave = () => {
    useCombatStore.getState().reset();
    if (survived > 0) {
      addChronicle({
        week,
        category: 'event',
        title: `磨坊农场无尽试炼：存活 ${survived} 波，收集 ${score} 碎片`,
      });
    }
    onBack?.();
    navigate('/');
  };

  const inBattle = battle !== null || isInitializing;
  if (inBattle) return <Combat />;

  // 波次胜利
  if (result === 'victory') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="dd-panel p-8 text-center max-w-md w-full">
          <div className="dd-title text-3xl text-dd-gold mb-2">第 {wave} 波击退！</div>
          <p className="text-dd-textMuted text-sm mb-3">疯狂之色的低语仍在逼近…</p>
          <div className="flex justify-center mb-4">
            <ProgressRing value={wave} max={MAX_WAVE} size={56} label={`${wave}波`} />
          </div>
          <div className="text-dd-text text-xs mb-4">
            碎片 <span className="text-dd-gold font-mono">{score}</span> · 存活{' '}
            <span className="text-dd-gold font-mono">{survived}</span> 波
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={nextWave}>
              迎接第 {wave + 1} 波（敌人更强）
            </Button>
            <Button variant="ghost" onClick={leave}>撤离农场</Button>
          </div>
        </div>
      </div>
    );
  }

  // 战败/撤离结算
  if (result === 'fall' || result === 'retreat') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="dd-panel p-8 text-center max-w-md w-full">
          <div className="dd-title text-3xl dd-text-blood mb-2">
            {result === 'fall' ? '疯狂吞噬了队伍…' : '队伍撤离了农场'}
          </div>
          <div className="text-dd-text text-sm mt-3 mb-4 space-y-1">
            <p>
              存活 <span className="text-dd-gold font-mono">{survived}</span> 波
            </p>
            <p>
              碎片 <span className="text-dd-gold font-mono">{score}</span>
            </p>
            {result === 'fall' && (
              <p className="text-[10px] text-dd-textDim">幸存的英雄带着创伤返回庄园，压力与伤势保留。</p>
            )}
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
        <SectionTitle>磨坊农场 · 无尽试炼</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 规则" extra="疯狂之色（CoM）" />
        <div className="p-4 text-xs text-dd-textMuted leading-relaxed space-y-1">
          <p>· 无尽波次生存：每波敌人更强、更多，最多 4 名英雄。</p>
          <p>· 战斗之间的伤势与压力保留 —— 队伍会逐渐崩溃，这是意志的试炼。</p>
          <p>· 每波奖励碎片与金币，每 3 波额外掉落肖像纹章。</p>
          <p>· 随时可撤离；队伍全灭则试炼结束。</p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="◆ 选择队伍"
          extra={`${party.length}/4${survived > 0 ? ` · 历史最好 ${survived} 波` : ''}`}
        />
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

          <div className="mt-4 flex items-center gap-3">
            <Button variant="primary" onClick={startRaid} disabled={party.length === 0}>
              🌾 进入农场（{party.length} 人）
            </Button>
            {survived > 0 && (
              <span className="text-[10px] text-dd-textDim">
                上轮战绩：{survived} 波 / {score} 碎片
              </span>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
