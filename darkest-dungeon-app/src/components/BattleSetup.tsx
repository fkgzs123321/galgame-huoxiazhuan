import { useEffect, useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useCombatStore, type BattleConfig } from '@/stores/combatStore';
import { getHeroName, loadHeroes, loadMonsters } from '@/data/ddLoader';
import { loadManifest, getEquipIconPath } from '@/data/assetLoader';
import type { HeroInstance, HeroData, MonsterData } from '@/types';
import clsx from 'clsx';

// ============================================================
// 工具：罗马数字
// ============================================================

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
function toRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

// ============================================================
// SVG 图标
// ============================================================

function IconSword({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 3l7 7-3 1-1 3-7-7 1-3 3-1z" />
      <path d="M3 21l9-9M5 19l-2 2M14 3l-1 1M17 6l1 1" strokeOpacity="0.7" />
    </svg>
  );
}

function IconArrowUp({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function IconArrowDown({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function IconArrowRight({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="square" />
    </svg>
  );
}

function IconSkull({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2C7 2 4 5 4 10c0 3 2 5 3 6v3a1 1 0 001 1h8a1 1 0 001-1v-3c1-1 3-3 3-6 0-5-3-8-8-8z" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" />
      <circle cx="15" cy="11" r="1.5" fill="currentColor" />
      <path d="M10 17h4" strokeOpacity="0.6" />
    </svg>
  );
}

function IconShield({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l8 3v6c0 5-3.5 8-8 11-4.5-3-8-6-8-11V5l8-3z" />
      <path d="M9 12l2 2 4-4" strokeOpacity="0.7" />
    </svg>
  );
}

function IconTorch({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2c1 2 3 3 3 6a3 3 0 01-6 0c0-2 1-3 1-5 1 1 1 2 2 3 0-2 0-3 0-4z" />
      <path d="M10 11h4l-1 10h-2l-1-10z" strokeOpacity="0.8" />
    </svg>
  );
}

type Difficulty = 'easy' | 'normal' | 'hard';

interface DifficultyOption {
  value: Difficulty;
  label: string;
  desc: string;
  enemyCount: number;
}

const difficultyOptions: DifficultyOption[] = [
  {
    value: 'easy',
    label: '简单',
    desc: '2 名弱小敌人，适合低等级队伍',
    enemyCount: 2,
  },
  {
    value: 'normal',
    label: '普通',
    desc: '3 名普通敌人，标准战斗强度',
    enemyCount: 3,
  },
  {
    value: 'hard',
    label: '困难',
    desc: '4 名精锐敌人，高风险高回报',
    enemyCount: 4,
  },
];

// 计算单个英雄的战斗力
function computeHeroPower(hero: HeroInstance, heroData: HeroData | undefined): number {
  const weaponLevel = Math.max(0, Math.min(4, hero.weaponLevel));
  const armorLevel = Math.max(0, Math.min(4, hero.armorLevel));
  const weapon = heroData?.weapons?.[weaponLevel];
  const armor = heroData?.armour?.[armorLevel];

  const avgDmg = weapon ? (weapon.dmg_min + weapon.dmg_max) / 2 : 7;
  const maxHp = hero.maxHp;
  const crit = weapon?.crit ?? 0;
  const spd = (weapon?.spd ?? 0) + (armor?.spd ?? 0);
  const resolveBonus = hero.resolveLevel * 10;

  // 简化战斗力公式
  return Math.round(avgDmg * 5 + maxHp * 0.5 + crit * 100 + spd * 3 + resolveBonus);
}

// 英雄头像图标
function HeroEquipIcon({ classId }: { classId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = getEquipIconPath(classId, 'weapon', 0);
    setSrc(path);
    setFailed(false);
  }, [classId]);

  if (!src || failed) {
    return (
      <div className="flex items-center justify-center w-12 h-12 bg-dd-void border border-dd-borderLight text-dd-gold font-dd text-lg" style={{ borderRadius: '2px' }}>
        {getHeroName(classId).slice(0, 1)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={getHeroName(classId)}
      className="w-12 h-12 object-cover border border-dd-borderLight"
      style={{ borderRadius: '2px' }}
      onError={() => setFailed(true)}
    />
  );
}

// 可拖拽的英雄站位卡片
function PartySlot({
  hero,
  position,
  heroData,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveUp,
  onMoveDown,
}: {
  hero: HeroInstance;
  position: number;
  heroData: HeroData | undefined;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const hpPercent = (hero.currentHp / hero.maxHp) * 100;
  const hpColorClass = hpPercent > 50 ? 'dd-hp-high' : hpPercent > 25 ? 'dd-hp-mid' : 'dd-hp-low';
  const power = computeHeroPower(hero, heroData);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={clsx(
        'relative p-3 border bg-dd-surface transition-all duration-150 cursor-move',
        'hover:border-dd-gold hover:bg-dd-surface2',
        isDragging && 'dd-dragging',
        isDragOver && 'dd-drag-over',
      )}
      style={{ borderRadius: '2px' }}
    >
      {/* 位置编号 — 大号罗马数字 */}
      <div
        className="absolute -top-1 -left-1 w-8 h-8 flex items-center justify-center font-dd text-lg font-bold border-2 bg-dd-surface3 border-dd-gold text-dd-gold"
        style={{ borderRadius: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
      >
        {toRoman(position)}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <HeroEquipIcon classId={hero.classId} />
        <div className="flex-1 min-w-0">
          <div className={clsx('font-dd text-sm truncate', `class-${hero.classId}`)}>
            {getHeroName(hero.classId)}
          </div>
          <div className="text-xs text-dd-textMuted truncate">{hero.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="dd-tag text-[10px] px-1 py-0">等级 {hero.resolveLevel}</span>
            <span className="text-xs text-dd-gold font-mono flex items-center gap-1">
              <IconSword className="w-3 h-3" />
              {power}
            </span>
          </div>
        </div>

        {/* 上下移动按钮 */}
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            disabled={position === 1}
            className="w-6 h-6 flex items-center justify-center bg-dd-surface2 border border-dd-border text-dd-textMuted hover:text-dd-gold hover:border-dd-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: '2px' }}
          >
            <IconArrowUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={position === 4}
            className="w-6 h-6 flex items-center justify-center bg-dd-surface2 border border-dd-border text-dd-textMuted hover:text-dd-gold hover:border-dd-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: '2px' }}
          >
            <IconArrowDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* HP 条 */}
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-dd-textMuted mb-0.5 font-mono">
          <span className="tracking-wider">生命</span>
          <span>{hero.currentHp}/{hero.maxHp}</span>
        </div>
        <div className="dd-bar">
          <div
            className={clsx('dd-bar-fill', hpColorClass)}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function BattleSetup() {
  const roster = useGameStore((s) => s.roster);
  const setPhase = useGameStore((s) => s.setPhase);
  const startBattle = useCombatStore((s) => s.startBattle);
  const setReturnPhase = useCombatStore((s) => s.setReturnPhase);
  const isInitializing = useCombatStore((s) => s.isInitializing);

  const [heroesData, setHeroesData] = useState<HeroData[]>([]);
  const [monsterPool, setMonsterPool] = useState<MonsterData[]>([]);
  const [party, setParty] = useState<HeroInstance[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 加载数据
  useEffect(() => {
    loadManifest().then(() => {
      console.log('[DD] 战斗配置资产清单已加载');
    });
    loadHeroes().then((data) => setHeroesData(data));
    loadMonsters().then((monsters) => {
      const regularMonsters = monsters.filter(m =>
        !m.id.includes('boss') &&
        !m.id.includes('ancestor') &&
        !m.id.includes('narrator') &&
        m.maxHp > 0 &&
        m.maxHp < 100
      );
      setMonsterPool(regularMonsters);
    });
  }, []);

  // 初始化队伍（取前4名英雄）
  useEffect(() => {
    setParty(roster.slice(0, Math.min(4, roster.length)));
  }, [roster]);

  // 计算队伍总战斗力
  const totalPower = useMemo(() => {
    return party.reduce((sum, hero) => {
      const hd = heroesData.find(d => d.id === hero.classId);
      return sum + computeHeroPower(hero, hd);
    }, 0);
  }, [party, heroesData]);

  // 交换队伍位置
  const swapPositions = (i: number, j: number) => {
    if (j < 0 || j >= party.length) return;
    const newParty = [...party];
    [newParty[i], newParty[j]] = [newParty[j], newParty[i]];
    setParty(newParty);
  };

  // 拖拽事件处理
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    swapPositions(dragIndex, index);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // 开始战斗
  const handleStartBattle = () => {
    if (party.length === 0 || monsterPool.length === 0) return;
    setReturnPhase('town');
    setPhase('battle');
    startBattle(party, monsterPool);
  };

  // 战斗力评级 — 不同评级不同颜色
  const powerRating = useMemo(() => {
    if (totalPower < 150) return { label: '弱小', color: 'text-dd-redBright', border: 'border-dd-red' };
    if (totalPower < 250) return { label: '一般', color: 'text-dd-torch', border: 'border-dd-torch' };
    if (totalPower < 350) return { label: '强力', color: 'text-dd-gold', border: 'border-dd-gold' };
    return { label: '精锐', color: 'text-dd-goldBright', border: 'border-dd-goldBright' };
  }, [totalPower]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dd-bg">
        <div className="text-center">
          <div className="flex justify-center mb-3 dd-anim-flicker">
            <IconTorch className="w-10 h-10 text-dd-torch" />
          </div>
          <div className="dd-title text-xl text-dd-gold mb-2 animate-pulse">
            正在部署战斗...
          </div>
          <div className="text-dd-textMuted text-sm tracking-wide">
            正在生成敌方阵容
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dd-bg p-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* 标题 — 装饰性增强 */}
        <header className="mb-6 text-center">
          <div className="dd-divider mb-3" />
          <div className="flex items-center justify-center gap-3 mb-1">
            <IconSword className="w-6 h-6 text-dd-gold" />
            <h1 className="dd-title text-2xl text-dd-gold">
              战斗配置
            </h1>
            <IconSword className="w-6 h-6 text-dd-gold" />
          </div>
          <p className="text-dd-textMuted text-sm tracking-wide">
            配置队伍站位，选择难度，然后开始战斗
          </p>
          <div className="dd-divider mt-3" />
        </header>

        {/* 队伍配置区域 */}
        <div className="dd-panel mb-4">
          <div className="dd-panel-header flex items-center justify-between">
            <span>队伍配置</span>
            <span className="text-dd-textMuted text-[10px] normal-case font-sans">
              拖拽卡片或使用箭头调整站位
            </span>
          </div>
          <div className="p-4">
            {party.length === 0 ? (
              <div className="text-center py-8 text-dd-textMuted text-sm">
                <IconSkull className="w-8 h-8 text-dd-textDim mx-auto mb-2" />
                无可用英雄，请先在城镇招募英雄
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {party.map((hero, index) => {
                  const hd = heroesData.find(d => d.id === hero.classId);
                  return (
                    <PartySlot
                      key={hero.uid}
                      hero={hero}
                      position={index + 1}
                      heroData={hd}
                      isDragging={dragIndex === index}
                      isDragOver={dragOverIndex === index}
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onMoveUp={() => swapPositions(index, index - 1)}
                      onMoveDown={() => swapPositions(index, index + 1)}
                    />
                  );
                })}
                {/* 填充空位 — 深色面板+虚线边框 */}
                {Array.from({ length: Math.max(0, 4 - party.length) }).map((_, i) => (
                  <div
                    key={`empty_${i}`}
                    className="p-3 border border-dashed border-dd-border/60 bg-dd-void/60 flex flex-col items-center justify-center min-h-[120px]"
                    style={{ borderRadius: '2px' }}
                  >
                    <div
                      className="w-8 h-8 flex items-center justify-center font-dd text-lg font-bold border-2 border-dd-border text-dd-textDim mb-2"
                      style={{ borderRadius: '2px' }}
                    >
                      {toRoman(party.length + i + 1)}
                    </div>
                    <span className="text-dd-textDim text-xs tracking-widest">— 空 —</span>
                  </div>
                ))}
              </div>
            )}

            {/* 队伍总战斗力 — 面板显示，不同评级不同颜色 */}
            {party.length > 0 && (
              <div className={clsx(
                'mt-4 p-3 border bg-dd-surface2',
                powerRating.border
              )} style={{ borderRadius: '2px' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* 总战斗力 */}
                    <div className="flex items-center gap-2">
                      <IconSword className="w-5 h-5 text-dd-gold" />
                      <div>
                        <div className="text-[10px] text-dd-textMuted uppercase tracking-widest">队伍总战斗力</div>
                        <div className="text-2xl font-dd text-dd-gold font-mono leading-tight">{totalPower}</div>
                      </div>
                    </div>

                    <div className="h-10 w-px bg-dd-border" />

                    {/* 评级 */}
                    <div>
                      <div className="text-[10px] text-dd-textMuted uppercase tracking-widest">评级</div>
                      <div className={clsx('text-lg font-dd', powerRating.color)}>
                        {powerRating.label}
                      </div>
                    </div>

                    <div className="h-10 w-px bg-dd-border" />

                    {/* 参战人数 */}
                    <div>
                      <div className="text-[10px] text-dd-textMuted uppercase tracking-widest">参战人数</div>
                      <div className="text-lg font-dd text-dd-text">{party.length} / 4</div>
                    </div>
                  </div>

                  {/* 难度对比提示 */}
                  <div className="flex items-center gap-2">
                    <IconShield className="w-4 h-4 text-dd-textMuted" />
                    <span className="text-xs text-dd-textMuted">
                      预期难度:
                    </span>
                    <span className={clsx(
                      'dd-tag text-[10px]',
                      difficulty === 'easy' && 'dd-tag-positive',
                      difficulty === 'normal' && 'border-dd-gold text-dd-gold',
                      difficulty === 'hard' && 'dd-tag-negative',
                    )}>
                      {difficultyOptions.find(o => o.value === difficulty)?.label}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 难度选择区域 */}
        <div className="dd-panel mb-4">
          <div className="dd-panel-header">
            选择敌人难度
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {difficultyOptions.map((opt) => {
                const isActive = difficulty === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={clsx(
                      'dd-btn w-full',
                      isActive && 'border-dd-gold text-dd-gold shadow-dd-gold',
                    )}
                    style={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      padding: '12px',
                      // dd-btn 的底色/边框由组件层 CSS 定义（优先级高于工具类），
                      // 故选中态的金色边框/文字/辉光用内联样式保证生效
                      ...(isActive
                        ? { borderColor: '#c8a030', color: '#e8c050', boxShadow: '0 0 12px rgba(200,160,48,0.35)' }
                        : {}),
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={clsx(
                        'w-7 h-7 flex items-center justify-center border bg-dd-void',
                        isActive ? 'text-dd-gold border-dd-gold' : 'text-dd-textMuted border-dd-border'
                      )} style={{ borderRadius: '2px' }}>
                        <IconSkull className="w-4 h-4" />
                      </div>
                      <span className="font-dd text-base tracking-widest">{opt.label}</span>
                      {isActive && (
                        <span className="ml-auto font-mono text-xs text-dd-gold">◆</span>
                      )}
                    </div>
                    <div className="text-xs text-dd-textMuted font-sans normal-case mt-1">{opt.desc}</div>
                    <div className="flex items-center gap-1 text-xs text-dd-textMuted font-sans normal-case mt-0.5">
                      <span className="tracking-wider">敌人数量</span>
                      <span className={clsx('font-mono font-bold', isActive ? 'text-dd-gold' : 'text-dd-text')}>
                        {opt.enemyCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setPhase('town')}
            className="dd-btn"
          >
            返回城镇
          </button>
          <button
            onClick={handleStartBattle}
            disabled={party.length === 0 || monsterPool.length === 0}
            className="dd-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            开始战斗
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>

        {monsterPool.length === 0 && (
          <div className="mt-3 text-center text-xs text-dd-textMuted">
            怪物数据加载中，请稍候...
          </div>
        )}
      </div>
    </div>
  );
}
