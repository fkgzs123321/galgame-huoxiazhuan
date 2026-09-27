import { useEffect, useState, useRef } from 'react';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { getHeroName, getSkillName, loadMonsters } from '@/data/ddLoader';
import {
  loadManifest,
  getSkillIconPath,
  getEquipIconPath,
  getMonsterSpritePath,
} from '@/data/assetLoader';
import type { Combatant, CombatSkill, CombatLogEntry } from '@/gateway/combatEngine';
import type { MonsterData } from '@/types';
import { getAfflictionById, getVirtueById } from '@/gateway/stressSystem';
import { useAiStore } from '@/stores/aiStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import clsx from 'clsx';

// ============================================================
// 工具：罗马数字
// ============================================================

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
function toRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

// ============================================================
// SVG 图标组件（代替 emoji）
// ============================================================

function IconGold({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="5" strokeOpacity="0.6" />
      <path d="M12 7v10M9 9h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" strokeLinecap="square" />
    </svg>
  );
}

function IconScroll({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4h12a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
      <path d="M5 4a2 2 0 00-2 2v2h2M19 18a2 2 0 002-2v-2h-2" />
      <path d="M8 8h7M8 11h7M8 14h5" strokeOpacity="0.7" />
    </svg>
  );
}

function IconCrest({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l3 3v5l-3 4-3-4V5l3-3z" />
      <path d="M12 14v6M9 20h6M10 8h4" strokeOpacity="0.7" />
    </svg>
  );
}

function IconTrinket({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3h12l-1 6a5 5 0 01-10 0L6 3z" />
      <path d="M9 3v-1h6v1M12 14v4M8 21h8M9 18h6" strokeOpacity="0.7" />
    </svg>
  );
}

function IconHeartbreak({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21s-7-4.5-9-9a4.5 4.5 0 018-3 4.5 4.5 0 018 3c-2 4.5-7 9-7 9z" />
      <path d="M12 11l-2-2 2-2 2 2-2 2M12 11v6" strokeOpacity="0.8" />
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

function IconTorch({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2c1 2 3 3 3 6a3 3 0 01-6 0c0-2 1-3 1-5 1 1 1 2 2 3 0-2 0-3 0-4z" />
      <path d="M10 11h4l-1 10h-2l-1-10z" strokeOpacity="0.8" />
    </svg>
  );
}

function IconSword({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 3l7 7-3 1-1 3-7-7 1-3 3-1z" />
      <path d="M3 21l9-9M5 19l-2 2M14 3l-1 1M17 6l1 1" strokeOpacity="0.7" />
    </svg>
  );
}

function IconArrow({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="square" />
    </svg>
  );
}

// ============================================================
// 带文字 fallback 的图标组件
// ============================================================

function SkillIcon({ heroClass, skillId, alt }: { heroClass: string; skillId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = getSkillIconPath(heroClass, skillId);
    setSrc(path);
    setFailed(false);
  }, [heroClass, skillId]);

  if (!src || failed) {
    return (
      <div className="flex items-center justify-center w-9 h-9 bg-dd-void border border-dd-border text-dd-textMuted text-xs font-dd">
        {alt.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-9 h-9 object-cover border border-dd-border"
      onError={() => setFailed(true)}
    />
  );
}

function HeroAvatar({ classId }: { classId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = getEquipIconPath(classId, 'weapon', 0);
    setSrc(path);
    setFailed(false);
  }, [classId]);

  if (!src || failed) {
    return (
      <div className="flex items-center justify-center w-11 h-11 bg-dd-void border border-dd-borderLight text-dd-gold font-dd text-base">
        {getHeroName(classId).slice(0, 1)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={getHeroName(classId)}
      className="w-11 h-11 object-cover border border-dd-borderLight"
      onError={() => setFailed(true)}
    />
  );
}

function MonsterSprite({ monsterId }: { monsterId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = getMonsterSpritePath(monsterId);
    setSrc(path);
    setFailed(false);
  }, [monsterId]);

  if (!src || failed) {
    return (
      <div className="flex items-center justify-center w-11 h-11 bg-dd-void border border-dd-red text-dd-redBright font-dd text-base">
        ☠
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={monsterId}
      className="w-11 h-11 object-cover border border-dd-red"
      onError={() => setFailed(true)}
    />
  );
}

// ============================================================
// 战斗者卡片
// ============================================================

interface CombatantCardProps {
  combatant: Combatant;
  isCurrent: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  onClick?: () => void;
  animClass?: string;
}

function CombatantCard({ combatant, isCurrent, isSelectable, isSelected, onClick, animClass }: CombatantCardProps) {
  const hpPercent = combatant.maxHp > 0 ? (combatant.currentHp / combatant.maxHp) * 100 : 0;
  const hpColorClass = hpPercent > 50 ? 'dd-hp-high' : hpPercent > 25 ? 'dd-hp-mid' : 'dd-hp-low';

  const displayName = combatant.side === 'hero'
    ? getHeroName(combatant.classId)
    : combatant.name.replace(/_/g, ' ');

  const isHero = combatant.side === 'hero';

  return (
    <button
      onClick={onClick}
      disabled={!isSelectable || combatant.isDead}
      className={clsx(
        'relative w-full p-2.5 border text-left transition-all duration-200',
        'bg-gradient-to-b from-dd-surface2 to-dd-surface',
        combatant.isDead && 'opacity-40 grayscale',
        // 锐角边框，暗石色
        !isCurrent && !isSelected && 'border-dd-border',
        // 当前行动者脉冲
        isCurrent && 'dd-anim-turn border-dd-gold bg-dd-surface2',
        // 选中目标
        !isCurrent && isSelected && 'border-dd-redBright bg-dd-surface2',
        isSelectable && !combatant.isDead && 'cursor-pointer hover:border-dd-gold hover:bg-dd-surface2 hover:shadow-dd-gold',
        !isSelectable && 'cursor-default',
        animClass,
      )}
      style={{ borderRadius: '2px' }}
    >
      {/* 位置标记 — 左上角小字 */}
      <div className="absolute top-0.5 left-1.5 font-mono text-[10px] text-dd-textDim leading-none pointer-events-none">
        {toRoman(combatant.position)}
      </div>

      {/* 死亡标记 — 红色大X */}
      {combatant.isDead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dd-void/70 pointer-events-none">
          <span className="dd-text-blood text-4xl leading-none text-dd-redBright">✕</span>
          <span className="font-dd text-xs text-dd-redBright tracking-widest mt-1">已死亡</span>
        </div>
      )}

      {/* 死亡之门标记 — 红色脉冲 */}
      {combatant.onDeathDoor && !combatant.isDead && (
        <div className="absolute top-0 right-0">
          <span
            className="dd-tag-negative text-[10px] px-1.5 py-0.5 font-dd shadow-dd-blood"
            style={{ animation: 'dd-torch-flicker 1.5s ease-in-out infinite' }}
          >
            死亡之门
          </span>
        </div>
      )}

      {/* 头像 / 精灵图区域 */}
      <div className="flex justify-center mb-2 mt-3">
        <div
          className={clsx(
            'p-1 bg-dd-void border',
            isHero ? 'border-dd-borderLight' : 'border-dd-red/60'
          )}
          style={{ borderRadius: '2px' }}
        >
          {isHero ? (
            <HeroAvatar classId={combatant.classId} />
          ) : (
            <MonsterSprite monsterId={combatant.classId} />
          )}
        </div>
      </div>

      {/* 名称 */}
      <div
        className={clsx(
          'font-dd text-sm mb-1.5 text-center truncate',
          isHero ? `class-${combatant.classId}` : 'text-dd-redBright'
        )}
      >
        {displayName}
      </div>

      {/* HP 条 + 压力条 + 状态效果 */}
      {!combatant.isDead && (
        <div className="space-y-1.5">
          {/* HP 条 */}
          <div>
            <div className="flex justify-between text-[10px] text-dd-textMuted mb-0.5 font-mono">
              <span className="tracking-wider">生命</span>
              <span className="font-mono text-dd-textBright">{combatant.currentHp}/{combatant.maxHp}</span>
            </div>
            <div className="dd-bar">
              <div
                className={clsx('dd-bar-fill', hpColorClass)}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* 压力条（仅英雄） */}
          {isHero && (
            <div>
              <div className="flex justify-between text-[10px] text-dd-textMuted mb-0.5 font-mono">
                <span className="tracking-wider">压力</span>
                <span>{combatant.stress}</span>
              </div>
              <div
                className="dd-bar"
                style={{
                  height: '6px',
                  ...(combatant.stress > 100
                    ? { animation: 'dd-torch-flicker 1s ease-in-out infinite', borderColor: '#c83030' }
                    : {}),
                }}
              >
                <div
                  className="dd-bar-fill dd-stress-fill"
                  style={{
                    width: `${Math.min(100, combatant.stress)}%`,
                    ...(combatant.stress > 100 ? { boxShadow: '0 0 8px rgba(168,40,40,0.6)' } : {}),
                  }}
                />
              </div>
            </div>
          )}

          {/* 状态效果 */}
          <div className="flex flex-wrap gap-1 pt-0.5 justify-center">
            {isHero && combatant.affliction && (
              <span className="dd-tag dd-tag-negative text-[10px] px-1 py-0">
                崩溃·{getAfflictionById(combatant.affliction)?.name ?? combatant.affliction}
              </span>
            )}
            {isHero && combatant.virtue && (
              <span className="dd-tag dd-tag-positive text-[10px] px-1 py-0">
                美德·{getVirtueById(combatant.virtue)?.name ?? combatant.virtue}
              </span>
            )}
            {combatant.isStunned && (
              <span className="dd-tag dd-tag-negative text-[10px] px-1 py-0">眩晕</span>
            )}
            {combatant.dots.map((dot, i) => (
              <span
                key={i}
                className={clsx(
                  'dd-tag text-[10px] px-1 py-0',
                  dot.type === 'bleed' && 'dd-tag-negative',
                  dot.type === 'blight' && 'dd-tag-positive',
                )}
              >
                {dot.type === 'bleed' ? '流血' : dot.type === 'blight' ? '中毒' : '异常'} {dot.damagePerTurn}/{dot.turnsRemaining}
              </span>
            ))}
            {combatant.buffs.map((buff, i) => (
              <span key={i} className="dd-tag text-[10px] px-1 py-0">
                {buff.stat}{buff.amount > 0 ? '+' : ''}{buff.amount} ({buff.duration})
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}

// ============================================================
// 技能按钮
// ============================================================

interface SkillButtonProps {
  skill: CombatSkill;
  heroClass: string;
  isAvailable: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const SKILL_TYPE_LABEL: Record<CombatSkill['type'], string> = {
  melee: '近战',
  ranged: '远程',
  heal: '治疗',
  buff: '辅助',
  move: '移动',
};

function SkillButton({ skill, heroClass, isAvailable, isSelected, onClick }: SkillButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!isAvailable}
      className={clsx(
        'flex flex-col items-center gap-1 p-2 border transition-all duration-150',
        isSelected
          ? 'border-dd-gold bg-dd-surface2 shadow-dd-gold'
          : isAvailable
            ? 'border-dd-border bg-dd-surface hover:border-dd-gold hover:bg-dd-surface2 hover:shadow-dd-gold cursor-pointer'
            : 'border-dd-border bg-dd-void opacity-40 grayscale cursor-not-allowed'
      )}
      style={{ borderRadius: '2px' }}
    >
      <SkillIcon heroClass={heroClass} skillId={skill.id} alt={getSkillName(skill.id)} />
      <div className="font-dd text-[11px] text-dd-text text-center leading-tight">
        {getSkillName(skill.id)}
      </div>
      <div className="text-xs text-dd-textMuted">
        {SKILL_TYPE_LABEL[skill.type]}
      </div>
      {!isAvailable && (
        <div className="text-[9px] text-dd-red/80">位置不符</div>
      )}
    </button>
  );
}

// ============================================================
// 战斗日志条目
// ============================================================

function LogEntry({ entry }: { entry: CombatLogEntry }) {
  // 旁白（AI 叙事）条目
  if (entry.actor === '旁白') {
    return (
      <div className="leading-relaxed text-xs text-dd-gold/75 italic">
        <span className="text-dd-textDim font-mono">[第{entry.turn}回合]</span>{' '}
        <span className="text-dd-textMuted">✦ 旁白</span>{' '}
        <span className="text-dd-textBright/90">{entry.result}</span>
      </div>
    );
  }

  const isHeal = entry.isHeal || (entry.damage !== undefined && entry.damage < 0);
  const isDamage = !isHeal && entry.damage !== undefined && entry.damage > 0;
  const isMiss = entry.miss;
  const isCrit = entry.crit;

  return (
    <div className={clsx(
      'leading-relaxed text-xs',
      isMiss && 'text-dd-textMuted',
      isCrit && 'text-dd-gold font-bold',
      isDamage && !isCrit && !isMiss && 'text-dd-redBright',
      isHeal && 'text-dd-greenBright',
      !isHeal && !isDamage && !isMiss && !isCrit && 'text-dd-text',
    )}>
      <span className="text-dd-textDim font-mono">[第{entry.turn}回合]</span>{' '}
      <span className="text-dd-gold">{entry.actor}</span>{' '}
      <span className="text-dd-text">{entry.action}</span>{' '}
      {entry.target && <span className="text-dd-textMuted">→</span>}{' '}
      <span className="text-dd-textBright">{entry.target}</span>{' '}
      {entry.result && <span className="text-dd-textMuted text-[11px]">{entry.result}</span>}
    </div>
  );
}

// ============================================================
// 奖励展示
// ============================================================

function RewardDisplay({ isVictory }: { isVictory: boolean }) {
  const rewards = isVictory
    ? [
        { Icon: IconGold, label: '金币', amount: 250, color: 'text-dd-gold' },
        { Icon: IconScroll, label: '经验值', amount: 120, color: 'text-dd-blueBright' },
        { Icon: IconCrest, label: '纹章', amount: 3, color: 'text-dd-text' },
        { Icon: IconTrinket, label: '饰品', amount: 1, color: 'text-dd-purpleBright' },
      ]
    : [
        { Icon: IconHeartbreak, label: '士气损失', amount: 10, color: 'text-dd-stressBright' },
        { Icon: IconScroll, label: '经验值', amount: 30, color: 'text-dd-blueBright' },
      ];

  return (
    <div className="grid grid-cols-2 gap-2 mb-6">
      {rewards.map((r, i) => (
        <div
          key={i}
          className="dd-anim-reward bg-dd-surface border border-dd-border p-2.5 flex items-center gap-2.5"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-dd-void border border-dd-border text-dd-gold" style={{ borderRadius: '2px' }}>
            <r.Icon className="w-5 h-5" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-[11px] text-dd-textMuted tracking-wide">{r.label}</div>
            <div className={clsx('font-mono text-sm font-bold', r.color)}>
              {r.amount > 0 ? '+' : ''}{r.amount}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 主战斗组件
// ============================================================

export default function Combat() {
  const roster = useGameStore((s) => s.roster);
  const setPhase = useGameStore((s) => s.setPhase);
  const updateHero = useGameStore((s) => s.updateHero);
  const addGold = useGameStore((s) => s.addGold);
  const addHeirloom = useGameStore((s) => s.addHeirloom);

  const battle = useCombatStore((s) => s.battle);
  const isInitializing = useCombatStore((s) => s.isInitializing);
  const selectedSkill = useCombatStore((s) => s.selectedSkill);
  const selectedTargetUid = useCombatStore((s) => s.selectedTargetUid);
  const combatLog = useCombatStore((s) => s.combatLog);
  const startBattle = useCombatStore((s) => s.startBattle);
  const selectSkill = useCombatStore((s) => s.selectSkill);
  const selectTarget = useCombatStore((s) => s.selectTarget);
  const executeAction = useCombatStore((s) => s.executeAction);
  const endBattle = useCombatStore((s) => s.endBattle);
  const returnPhase = useCombatStore((s) => s.returnPhase);

  // AI 叙事状态
  const aiEnabled = useAiStore((s) => s.config.enabled);
  const narrSlot = useNarrativeStore((s) => s.combat);
  const skipNarrative = useNarrativeStore((s) => s.skipNarrative);

  const [monsterPool, setMonsterPool] = useState<MonsterData[]>([]);
  const [manifestLoaded, setManifestLoaded] = useState(false);

  // 动画追踪状态
  const [animState, setAnimState] = useState<{
    actorUid: string | null;
    targetUid: string | null;
    isHeal: boolean;
  }>({ actorUid: null, targetUid: null, isHeal: false });

  const lastLogLenRef = useRef(0);

  // 预加载资产清单
  useEffect(() => {
    loadManifest().then(() => {
      setManifestLoaded(true);
      console.log('[DD] 战斗资产清单已加载');
    });
  }, []);

  // 加载怪物数据
  useEffect(() => {
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

  // 自动开始战斗（兼容从城镇直接进入的情况；standalone 模式由独立页接管）
  useEffect(() => {
    const standalone = useCombatStore.getState().standalone;
    if (!battle && !isInitializing && monsterPool.length > 0 && roster.length > 0 && returnPhase === 'town' && !standalone) {
      const party = roster.slice(0, Math.min(4, roster.length));
      startBattle(party, monsterPool);
    }
  }, [battle, isInitializing, monsterPool, roster, startBattle, returnPhase]);

  // 监听战斗日志变化，触发动画
  useEffect(() => {
    if (!combatLog || combatLog.length === 0) {
      lastLogLenRef.current = 0;
      return;
    }

    if (combatLog.length <= lastLogLenRef.current) {
      lastLogLenRef.current = combatLog.length;
      return;
    }

    const lastEntry = combatLog[combatLog.length - 1];
    lastLogLenRef.current = combatLog.length;

    // 跳过系统/回合开始日志
    if (lastEntry.actor === '系统' || !lastEntry.targetUid) {
      return;
    }

    const isHeal = lastEntry.isHeal || (lastEntry.damage !== undefined && lastEntry.damage < 0);
    setAnimState({
      actorUid: lastEntry.actorUid ?? null,
      targetUid: lastEntry.targetUid ?? null,
      isHeal,
    });

    // 动画结束后清除
    const timer = setTimeout(() => {
      setAnimState({ actorUid: null, targetUid: null, isHeal: false });
    }, 700);

    return () => clearTimeout(timer);
  }, [combatLog]);

  // 获取战斗者的动画 class
  const getAnimClass = (uid: string): string | undefined => {
    if (animState.actorUid === uid) {
      return 'dd-anim-shake';
    }
    if (animState.targetUid === uid) {
      return animState.isHeal ? 'dd-anim-heal' : 'dd-anim-hit';
    }
    return undefined;
  };

  // 加载中
  if (isInitializing || (!battle && monsterPool.length > 0 && returnPhase === 'town')) {
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

  // 无英雄
  if (!battle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dd-bg">
        <div className="dd-panel p-8 text-center max-w-md">
          <IconSkull className="w-10 h-10 text-dd-redBright mx-auto mb-3" />
          <div className="text-dd-textMuted mb-4">需要至少1名英雄才能进入战斗</div>
          <button onClick={() => setPhase('town')} className="dd-btn">
            返回城镇
          </button>
        </div>
      </div>
    );
  }

  // 战斗结束
  if (battle.isFinished) {
    const isVictory = battle.winner === 'hero';
    const isDungeonBattle = returnPhase === 'dungeon';
    const standalone = useCombatStore.getState().standalone;
    const returnLabel = standalone ? '返回' : isDungeonBattle ? '返回地牢' : '返回城镇';

    return (
      <div className="min-h-screen flex items-center justify-center bg-dd-bg p-4">
        <div className="dd-panel dd-anim-victory p-8 text-center max-w-md w-full">
          {/* 装饰性分隔线 */}
          <div className="dd-divider mb-4" />

          <h2 className={clsx(
            'dd-title text-3xl mb-2 dd-anim-victory',
            isVictory ? 'text-dd-gold' : 'dd-text-blood'
          )}>
            {isVictory ? '胜利！' : '溃败...'}
          </h2>

          {/* 装饰图标 */}
          <div className="flex justify-center mb-3">
            {isVictory
              ? <IconSword className="w-8 h-8 text-dd-gold" />
              : <IconHeartbreak className="w-8 h-8 text-dd-red" />
            }
          </div>

          <p className="text-dd-textMuted text-sm mb-6">
            {isVictory ? '你的队伍取得了战斗的胜利。' : '你的队伍遭遇了挫折，但存活了下来。'}
          </p>

          {/* 奖励展示区域（仅城镇快速战斗） */}
          {!isDungeonBattle && (
            <div className="mb-2">
              <div className="text-center mb-3">
                <span className="font-dd text-sm text-dd-gold tracking-widest uppercase">战利品</span>
                <div className="dd-divider mt-2" />
              </div>
              <RewardDisplay isVictory={isVictory} />
            </div>
          )}

          <div className="dd-divider mb-4" />

          <button
            onClick={() => {
              // 将战斗结果同步到游戏状态
              for (const hero of battle.heroes) {
                updateHero(hero.uid, {
                  currentHp: Math.max(1, hero.currentHp),
                  stress: hero.stress,
                });
              }
              // 发放奖励（仅城镇快速战斗；standalone 模式奖励由独立页结算）
              if (isVictory && !isDungeonBattle && !standalone) {
                addGold(250);
                addHeirloom('crest', 3);
              }
              endBattle();
              if (!standalone) setPhase(returnPhase);
            }}
            className="dd-btn-primary w-full"
          >
            {returnLabel}
          </button>
        </div>
      </div>
    );
  }

  const currentUid = battle.turnOrder[battle.currentActorIndex];
  const currentActor = [...battle.heroes, ...battle.enemies].find(c => c.uid === currentUid);
  const isPlayerTurn = currentActor?.side === 'hero';

  // 获取当前可用技能
  const availableSkills = isPlayerTurn && currentActor
    ? currentActor.skills.filter(s => s.launchPositions.includes(currentActor.position))
    : [];

  // 获取可选中目标
  const getValidTargets = (skill: CombatSkill | undefined) => {
    if (!skill || !currentActor) return [];
    const targetSide = skill.targetSide === 'ally' || skill.targetSide === 'self'
      ? battle.heroes
      : battle.enemies;
    return targetSide.filter(t => !t.isDead && skill.targetPositions.includes(t.position));
  };

  const selectedSkillObj = availableSkills.find(s => s.id === selectedSkill);
  const validTargets = getValidTargets(selectedSkillObj);

  return (
    <div className="min-h-screen bg-dd-bg p-3 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* 战斗标题区域 — 装饰性增强 */}
        <header className="mb-4 text-center relative">
          {/* 上方装饰分隔线 */}
          <div className="dd-divider mb-3" />

          {/* 火把装饰 */}
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="dd-anim-flicker">
              <IconTorch className="w-5 h-5 text-dd-torch/80" />
            </div>
            <h1 className="dd-title text-2xl text-dd-gold">
              战斗 · 第 {battle.turn} 回合
            </h1>
            <div className="dd-anim-flicker" style={{ animationDelay: '0.5s' }}>
              <IconTorch className="w-5 h-5 text-dd-torch/80" />
            </div>
          </div>

          {/* 当前阶段提示 — 不同颜色 */}
          <p className={clsx(
            'text-sm font-dd tracking-widest',
            isPlayerTurn ? 'text-dd-textMuted' : 'text-dd-redBright dd-anim-flicker'
          )}>
            {isPlayerTurn ? '◆ 你的回合 — 选择技能与目标 ◆' : '◆ 敌方回合 ◆'}
          </p>

          <div className="dd-divider mt-3" />
        </header>

        {/* 敌方阵容 */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 px-1">
            <IconSkull className="w-4 h-4 text-dd-redBright" />
            <span className="font-dd text-xs text-dd-redBright tracking-widest uppercase">
              敌方阵容
            </span>
            <div className="flex-1 h-px bg-dd-border" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {battle.enemies.map((enemy) => (
              <CombatantCard
                key={enemy.uid}
                combatant={enemy}
                isCurrent={enemy.uid === currentUid}
                isSelectable={isPlayerTurn && validTargets.some(t => t.uid === enemy.uid)}
                isSelected={enemy.uid === selectedTargetUid}
                onClick={() => selectTarget(enemy.uid)}
                animClass={getAnimClass(enemy.uid)}
              />
            ))}
            {Array.from({ length: Math.max(0, 4 - battle.enemies.length) }).map((_, i) => (
              <div
                key={`empty_enemy_${i}`}
                className="p-3 border border-dashed border-dd-border/60 bg-dd-void/60 flex flex-col items-center justify-center min-h-[140px]"
                style={{ borderRadius: '2px' }}
              >
                <span className="font-dd text-xs text-dd-textDim tracking-widest">空位</span>
              </div>
            ))}
          </div>
        </div>

        {/* 中间分隔 + 战斗日志 */}
        <div className="mb-3 dd-panel">
          <div className="dd-panel-header">
            <span>战斗日志</span>
            <span className="text-dd-textMuted text-[10px] normal-case font-sans">
              最近 {Math.min(8, combatLog.length)} 条
            </span>
          </div>
          <div
            className="p-3 max-h-32 overflow-y-auto space-y-1"
            style={{ scrollbarGutter: 'stable' }}
          >
            {combatLog.length === 0 ? (
              <div className="text-dd-textDim text-xs italic text-center py-2">
                战斗即将开始...
              </div>
            ) : (
              combatLog.slice(-8).map((entry, i) => (
                <LogEntry key={i} entry={entry} />
              ))
            )}
          </div>
        </div>

        {/* AI 旁白叙事面板 */}
        {aiEnabled && (narrSlot.generating || narrSlot.text || narrSlot.error) && (
          <div className="mb-3 dd-panel" style={{ borderColor: 'rgba(200,160,48,0.25)' }}>
            <div className="dd-panel-header">
              <span className="flex items-center gap-2">
                <span className="dd-anim-flicker text-dd-torch">✦</span>
                <span className="text-dd-gold">旁白</span>
              </span>
              <div className="flex items-center gap-2">
                {narrSlot.generating && (
                  <span className="text-dd-textMuted text-[10px] normal-case font-sans">
                    讲述中...
                  </span>
                )}
                <button
                  onClick={() => skipNarrative('combat')}
                  className="dd-btn !py-0.5 !px-2 text-[10px]"
                >
                  跳过
                </button>
              </div>
            </div>
            <div className="p-3 text-xs leading-relaxed">
              {narrSlot.text ? (
                <span className="text-dd-textBright/90 italic font-light">
                  {narrSlot.text}
                  {narrSlot.generating && (
                    <span className="dd-anim-flicker text-dd-gold ml-0.5">▌</span>
                  )}
                </span>
              ) : (
                narrSlot.generating && (
                  <span className="text-dd-textMuted italic dd-anim-flicker">
                    先祖的低语正在聚拢…
                  </span>
                )
              )}
              {narrSlot.error && !narrSlot.generating && (
                <div className="text-dd-redBright/80 text-[11px] mt-1">
                  叙事中断：{narrSlot.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 我方阵容 */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 px-1">
            <IconSword className="w-4 h-4 text-dd-gold" />
            <span className="font-dd text-xs text-dd-gold tracking-widest uppercase">
              我方阵容
            </span>
            <div className="flex-1 h-px bg-dd-border" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {battle.heroes.map((hero) => (
              <CombatantCard
                key={hero.uid}
                combatant={hero}
                isCurrent={hero.uid === currentUid}
                isSelectable={isPlayerTurn && selectedSkillObj?.targetSide === 'ally' && validTargets.some(t => t.uid === hero.uid)}
                isSelected={hero.uid === selectedTargetUid}
                onClick={() => selectTarget(hero.uid)}
                animClass={getAnimClass(hero.uid)}
              />
            ))}
            {Array.from({ length: Math.max(0, 4 - battle.heroes.length) }).map((_, i) => (
              <div
                key={`empty_hero_${i}`}
                className="p-3 border border-dashed border-dd-border/60 bg-dd-void/60 flex flex-col items-center justify-center min-h-[140px]"
                style={{ borderRadius: '2px' }}
              >
                <span className="font-dd text-xs text-dd-textDim tracking-widest">空位</span>
              </div>
            ))}
          </div>
        </div>

        {/* 技能选择栏 */}
        {isPlayerTurn && currentActor && (
          <div className="dd-panel">
            <div className="dd-panel-header flex items-center justify-between">
              <span>
                {getHeroName(currentActor.classId)} 的回合 — 选择行动
              </span>
              <span className="text-dd-textMuted text-[10px] normal-case font-sans flex items-center gap-1">
                站位
                <span className="font-dd text-dd-gold text-sm">{toRoman(currentActor.position)}</span>
              </span>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                {currentActor.skills.map((skill) => (
                  <SkillButton
                    key={skill.id}
                    skill={skill}
                    heroClass={currentActor.classId}
                    isAvailable={availableSkills.some(s => s.id === skill.id)}
                    isSelected={selectedSkill === skill.id}
                    onClick={() => selectSkill(skill.id === selectedSkill ? null : skill.id)}
                  />
                ))}
              </div>

              {/* 行动按钮 */}
              <div className="flex gap-2 justify-end items-center">
                {selectedSkill && selectedTargetUid && (
                  <button
                    onClick={executeAction}
                    className="dd-btn-primary"
                  >
                    确认行动
                    <IconArrow className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    selectSkill(null);
                    selectTarget(null);
                    useCombatStore.getState().endTurn();
                  }}
                  className="dd-btn"
                >
                  跳过回合
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 敌方回合提示 */}
        {!isPlayerTurn && !battle.isFinished && (
          <div className="dd-panel p-4 text-center">
            <div className="dd-anim-flicker text-dd-redBright font-dd text-sm tracking-widest">
              ◆ 敌方正在行动... ◆
            </div>
          </div>
        )}

        {/* 撤退按钮 */}
        {!battle.isFinished && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                endBattle();
                const standalone = useCombatStore.getState().standalone;
                if (!standalone) setPhase(returnPhase);
              }}
              className="dd-btn-danger text-[11px]"
            >
              撤离战斗
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
