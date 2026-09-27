/**
 * 成就面板(阶段3 步骤5)
 *
 * 职责:
 *  - 3 个 tab:成就列表 / 周目历史 / NG+ 继承
 *  - 成就列表:按类型分组 + 稀有度筛选 + 解锁/未解锁状态
 *  - 周目历史:列出所有已完成周目 + 结局详情
 *  - NG+ 继承:展示继承点数/解锁标记/继承属性,提供"开始 NG+"按钮
 *
 * 不做:
 *  - 成就解锁逻辑(由 achievement-engine.evaluateAll 处理)
 *  - NG+ 初始数据生成(由 engine.generateNgPlusInitialStatData 处理)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_VARS } from './types';
import { AchievementDetailDialog } from '@dialogs/index';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  ACHIEVEMENTS_BY_TYPE,
  RARITY_COLOR,
  RARITY_LABEL,
  TYPE_LABEL,
  TYPE_ICON,
  type Achievement,
  type AchievementType,
  type AchievementRarity,
} from '../content/achievements/achievement-data';
import {
  achievementEngine,
  type AchievementUnlockRecord,
  type PlaythroughRecord,
  type NgPlusState,
} from '../runtime/achievement-engine';
import type { MvuRuntime } from '../runtime/mvu-runtime';
import { extractPlayerStats } from '../runtime/ending-detector';

// ───────────────────────────────────────────────────────────
//  通用样式
// ───────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: 20,
  background: THEME_VARS.overlaySoft,
  borderRadius: 16,
  border: `1px solid ${THEME_VARS.border}`,
  boxShadow: THEME_VARS.shadowMd,
  fontSize: 13,
  color: THEME_VARS.text,
  backdropFilter: 'blur(8px)',
  animation: 'soft-fade-in 0.4s ease',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginTop: 8,
  marginBottom: 16,
  padding: 4,
  background: THEME_VARS.bg,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  flexWrap: 'wrap',
};

const tabBtnStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 100,
  padding: '8px 10px',
  background: 'transparent',
  color: THEME_VARS.textMuted,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0.5,
  transition: 'all 0.25s ease',
};

const tabBtnActiveStyle: React.CSSProperties = {
  ...tabBtnStyle,
  background: `linear-gradient(135deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.primarySoft} 100%)`,
  color: '#fff',
  boxShadow: THEME_VARS.shadowSm,
};

const sectionStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  background: THEME_VARS.overlay,
  borderRadius: 12,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  boxShadow: THEME_VARS.shadowSm,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 12,
  fontFamily: THEME_VARS.fontDisplay,
  fontSize: 14,
  fontWeight: 500,
  color: THEME_VARS.text,
  letterSpacing: 0.8,
  paddingBottom: 8,
  borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
};

const emptyStyle: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: THEME_VARS.textMuted,
  fontSize: 11,
  fontStyle: 'italic',
};

// ───────────────────────────────────────────────────────────
//  Props 与 Tab 类型
// ───────────────────────────────────────────────────────────

export interface AchievementPanelProps {
  /** MVU 运行时(用于手动评估) */
  mvu?: MvuRuntime;
  /** 是否只读 */
  readOnly?: boolean;
}

type PanelTab = 'list' | 'history' | 'ngplus';

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function AchievementPanel({ mvu, readOnly = false }: AchievementPanelProps) {
  const [tab, setTab] = useState<PanelTab>('list');
  const [unlocks, setUnlocks] = useState<Record<string, AchievementUnlockRecord>>({});
  const [playthroughs, setPlaythroughs] = useState<PlaythroughRecord[]>([]);
  const [ngPlus, setNgPlus] = useState<NgPlusState | null>(null);
  const [lastEval, setLastEval] = useState<AchievementUnlockRecord[] | null>(null);

  const refresh = useCallback(async () => {
    await achievementEngine.load();
    setUnlocks({ ...achievementEngine.getState().unlocks });
    setPlaythroughs(achievementEngine.getPlaythroughs());
    setNgPlus(achievementEngine.getNgPlusState());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEvaluate = useCallback(async () => {
    if (!mvu) return;
    const newly = await achievementEngine.evaluateFromMvu(mvu);
    setLastEval(newly);
    await refresh();
  }, [mvu, refresh]);

  const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'list', label: '成就列表', icon: '🏆' },
    { key: 'history', label: '周目历史', icon: '📜' },
    { key: 'ngplus', label: 'NG+ 继承', icon: '🔄' },
  ];

  return (
    <div style={containerStyle}>
      <header style={{
        paddingBottom: 12,
        marginBottom: 12,
        borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
      }}>
        <h3 style={{
          margin: 0,
          fontFamily: THEME_VARS.fontDisplay,
          fontSize: 18,
          fontWeight: 500,
          color: THEME_VARS.primary,
          letterSpacing: 1.2,
        }}>
          成就系统 · 阶段3 步骤5
        </h3>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
          Achievement Panel · List / History / New Game+
        </div>
      </header>

      <div style={tabBarStyle}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? tabBtnActiveStyle : tabBtnStyle}
            disabled={readOnly}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <AchievementList
          unlocks={unlocks}
          mvu={mvu}
          readOnly={readOnly}
          onEvaluate={handleEvaluate}
          lastEval={lastEval}
        />
      )}
      {tab === 'history' && <PlaythroughHistory playthroughs={playthroughs} />}
      {tab === 'ngplus' && (
        <NgPlusPanel
          ngPlus={ngPlus}
          playthroughs={playthroughs}
          mvu={mvu}
          readOnly={readOnly}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  1. 成就列表
// ═══════════════════════════════════════════════════════════

interface AchievementListProps {
  unlocks: Record<string, AchievementUnlockRecord>;
  mvu?: MvuRuntime;
  readOnly?: boolean;
  onEvaluate: () => void;
  lastEval: AchievementUnlockRecord[] | null;
}

function AchievementList({ unlocks, mvu, readOnly, onEvaluate, lastEval }: AchievementListProps) {
  const [filterType, setFilterType] = useState<AchievementType | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<AchievementRarity | 'all'>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [selected, setSelected] = useState<Achievement | null>(null);

  const filtered = useMemo(() => {
    return ACHIEVEMENTS.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (filterRarity !== 'all' && a.rarity !== filterRarity) return false;
      if (showUnlockedOnly && !unlocks[a.id]) return false;
      return true;
    });
  }, [filterType, filterRarity, showUnlockedOnly, unlocks]);

  const stats = useMemo(() => {
    const total = ACHIEVEMENTS.length;
    const unlocked = Object.keys(unlocks).length;
    return { total, unlocked, percent: total > 0 ? (unlocked / total) * 100 : 0 };
  }, [unlocks]);

  const statsByType = useMemo(() => achievementEngine.getStatsByType(), [unlocks]);
  const statsByRarity = useMemo(() => achievementEngine.getStatsByRarity(), [unlocks]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🏆 成就列表</h4>

      {/* 总览 */}
      <div style={{
        padding: 12,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${THEME_VARS.primary}22 0%, transparent 100%)`,
        borderRadius: 10,
        border: `1px solid ${THEME_VARS.borderSoft}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: THEME_VARS.primary }}>
            {stats.unlocked} / {stats.total}
          </span>
          <span style={{ color: THEME_VARS.textMuted, fontSize: 11 }}>已解锁</span>
          <div style={{
            flex: 1,
            height: 8,
            background: THEME_VARS.borderSoft,
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${stats.percent}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.primarySoft} 100%)`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ color: THEME_VARS.success, fontWeight: 600, fontSize: 12 }}>
            {stats.percent.toFixed(1)}%
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: THEME_VARS.textMuted }}>
          {Object.entries(statsByType).map(([t, s]) => (
            <span key={t}>
              {TYPE_ICON[t as AchievementType]} {TYPE_LABEL[t as AchievementType]}:
              <strong style={{ color: THEME_VARS.text, marginLeft: 3 }}>{s.unlocked}/{s.total}</strong>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10, marginTop: 6 }}>
          {Object.entries(statsByRarity).map(([r, s]) => (
            <span key={r} style={{
              padding: '1px 6px',
              borderRadius: 6,
              background: RARITY_COLOR[r as AchievementRarity] + '22',
              color: RARITY_COLOR[r as AchievementRarity],
            }}>
              {RARITY_LABEL[r as AchievementRarity]}: {s.unlocked}/{s.total}
            </span>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      {!readOnly && mvu && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={onEvaluate}
            style={{
              padding: '6px 14px',
              background: THEME_VARS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            ▶ 评估当前状态
          </button>
          {lastEval && lastEval.length > 0 && (
            <span style={{
              padding: '6px 12px',
              background: THEME_VARS.success + '22',
              color: THEME_VARS.success,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              alignSelf: 'center',
            }}>
              ✓ 新解锁 {lastEval.length} 项
            </span>
          )}
          {lastEval && lastEval.length === 0 && (
            <span style={{
              padding: '6px 12px',
              background: THEME_VARS.overlay,
              color: THEME_VARS.textMuted,
              borderRadius: 6,
              fontSize: 11,
              alignSelf: 'center',
            }}>
              无新解锁
            </span>
          )}
        </div>
      )}

      {/* 筛选器 */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
        fontSize: 10,
      }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <span style={{ color: THEME_VARS.textMuted, alignSelf: 'center', marginRight: 2 }}>类型:</span>
          <FilterChip active={filterType === 'all'} onClick={() => setFilterType('all')} label="全部" />
          {(Object.keys(ACHIEVEMENTS_BY_TYPE) as AchievementType[]).map((t) => (
            <FilterChip
              key={t}
              active={filterType === t}
              onClick={() => setFilterType(t)}
              label={`${TYPE_ICON[t]} ${TYPE_LABEL[t]}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <span style={{ color: THEME_VARS.textMuted, alignSelf: 'center', marginRight: 2 }}>稀有度:</span>
          <FilterChip active={filterRarity === 'all'} onClick={() => setFilterRarity('all')} label="全部" />
          {(Object.keys(RARITY_LABEL) as AchievementRarity[]).map((r) => (
            <FilterChip
              key={r}
              active={filterRarity === r}
              onClick={() => setFilterRarity(r)}
              label={RARITY_LABEL[r]}
              color={RARITY_COLOR[r]}
            />
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: THEME_VARS.textMuted }}>
          <input
            type="checkbox"
            checked={showUnlockedOnly}
            onChange={(e) => setShowUnlockedOnly(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          仅显示已解锁
        </label>
      </div>

      {/* 成就网格 */}
      {filtered.length === 0 ? (
        <div style={emptyStyle}>无符合条件的成就</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 8,
        }}>
          {filtered.map((ach) => {
            const rec = unlocks[ach.id];
            const isUnlocked = !!rec;
            const rarityColor = RARITY_COLOR[ach.rarity];
            return (
              <div
                key={ach.id}
                onClick={() => setSelected(ach)}
                style={{
                  padding: 10,
                  background: isUnlocked
                    ? `linear-gradient(135deg, ${rarityColor}22 0%, transparent 100%)`
                    : THEME_VARS.bg,
                  borderRadius: 8,
                  border: `1px solid ${isUnlocked ? rarityColor + '55' : THEME_VARS.borderSoft}`,
                  borderLeft: `3px solid ${isUnlocked ? rarityColor : THEME_VARS.borderSoft}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isUnlocked ? 1 : 0.75,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                    {isUnlocked ? ach.icon : '🔒'}
                  </span>
                  <strong style={{
                    fontSize: 11,
                    color: isUnlocked ? THEME_VARS.text : THEME_VARS.textMuted,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {isUnlocked ? ach.title : '???'}
                  </strong>
                  <span style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: rarityColor + '22',
                    color: rarityColor,
                  }}>
                    {RARITY_LABEL[ach.rarity]}
                  </span>
                </div>
                <div style={{
                  fontSize: 10,
                  color: THEME_VARS.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {isUnlocked ? ach.description : ach.unlockCondition}
                </div>
                {isUnlocked && rec && (
                  <div style={{
                    fontSize: 9,
                    color: THEME_VARS.textMuted,
                    marginTop: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span>{TYPE_ICON[ach.type]} {TYPE_LABEL[ach.type]}</span>
                    {ach.reward.inheritPoints && (
                      <span style={{ color: THEME_VARS.primary, fontWeight: 600 }}>
                        +{ach.reward.inheritPoints} 继承点
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 成就详情弹窗(对话框层) */}
      {selected && (
        <AchievementDetailDialog
          open
          data={{
            title: selected.title,
            icon: selected.icon,
            rarity: selected.rarity,
            rarityLabel: RARITY_LABEL[selected.rarity],
            rarityColor: RARITY_COLOR[selected.rarity],
            type: selected.type,
            typeLabel: TYPE_LABEL[selected.type],
            typeIcon: TYPE_ICON[selected.type],
            description: selected.description,
            unlockCondition: selected.unlockCondition,
            reward: selected.reward,
            unlocked: !!unlocks[selected.id],
            unlockRecord: unlocks[selected.id],
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        background: active ? (color ?? THEME_VARS.primary) + '22' : 'transparent',
        color: active ? (color ?? THEME_VARS.primary) : THEME_VARS.textMuted,
        border: `1px solid ${active ? (color ?? THEME_VARS.primary) + '55' : THEME_VARS.borderSoft}`,
        borderRadius: 10,
        fontSize: 10,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}


// ═══════════════════════════════════════════════════════════
//  2. 周目历史
// ═══════════════════════════════════════════════════════════

function PlaythroughHistory({ playthroughs }: { playthroughs: PlaythroughRecord[] }) {
  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📜 周目历史</h4>

      {playthroughs.length === 0 ? (
        <div style={emptyStyle}>
          尚无周目记录(完成一周目并触发结局后会出现在此)
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 11,
            color: THEME_VARS.textMuted,
            marginBottom: 12,
            padding: 8,
            background: THEME_VARS.bg,
            borderRadius: 6,
          }}>
            累计 {playthroughs.length} 个周目 · 总获得继承点数:
            <strong style={{ color: THEME_VARS.primary, marginLeft: 4 }}>
              {playthroughs.reduce((s, p) => s + p.earnedInheritPoints, 0)}
            </strong>
          </div>

          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              width: 2,
              background: `linear-gradient(180deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.borderSoft} 100%)`,
            }} />
            {playthroughs.slice().reverse().map((p) => (
              <div key={p.index} style={{
                position: 'relative',
                marginBottom: 14,
                paddingLeft: 16,
              }}>
                <div style={{
                  position: 'absolute',
                  left: -19,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: THEME_VARS.primary,
                  border: `2px solid ${THEME_VARS.primary}`,
                }} />
                <div style={{
                  padding: 12,
                  background: THEME_VARS.bg,
                  borderRadius: 8,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                }}>
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 6,
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: THEME_VARS.primary + '22',
                      color: THEME_VARS.primary,
                      fontWeight: 600,
                    }}>
                      周目 #{p.index}
                    </span>
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 6,
                      background: ENDING_TYPE_COLOR[p.endingType] + '22',
                      color: ENDING_TYPE_COLOR[p.endingType],
                    }}>
                      {ENDING_TYPE_LABEL[p.endingType]}
                    </span>
                    <strong style={{ fontSize: 12, color: THEME_VARS.text, flex: 1 }}>
                      {p.endingTitle}
                    </strong>
                  </div>
                  <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 6 }}>
                    主角:<strong style={{ color: THEME_VARS.text }}>{p.playerName}</strong>
                    <span style={{ margin: '0 6px' }}>·</span>
                    身份:{p.identityName}
                    <span style={{ margin: '0 6px' }}>·</span>
                    天数:{p.dayInGame}
                    <span style={{ margin: '0 6px' }}>·</span>
                    回合:{p.turnCount}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: THEME_VARS.textMuted,
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    <span>
                      🏆 成就 × {p.unlockedAchievements.length}
                    </span>
                    <span style={{ color: THEME_VARS.primary, fontWeight: 600 }}>
                      +{p.earnedInheritPoints} 继承点
                    </span>
                    <span>
                      {new Date(p.endedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

//  辅助:从 stat_data 提取主角六维属性(用于 NG+ 继承)
// ───────────────────────────────────────────────────────────

const ENDING_TYPE_COLOR: Record<PlaythroughRecord['endingType'], string> = {
  true_end: '#ff9800',
  good_end: '#4caf50',
  normal_end: '#2196f3',
  bad_end: '#e53935',
  hidden: '#9c27b0',
};

const ENDING_TYPE_LABEL: Record<PlaythroughRecord['endingType'], string> = {
  true_end: 'True End',
  good_end: 'Good End',
  normal_end: 'Normal End',
  bad_end: 'Bad End',
  hidden: '隐藏结局',
};

// ═══════════════════════════════════════════════════════════
//  3. NG+ 继承面板
// ═══════════════════════════════════════════════════════════

function NgPlusPanel({
  ngPlus,
  playthroughs,
  mvu,
  readOnly,
  onRefresh,
}: {
  ngPlus: NgPlusState | null;
  playthroughs: PlaythroughRecord[];
  mvu?: MvuRuntime;
  readOnly: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [starting, setStarting] = useState(false);
  const [inheritStats, setInheritStats] = useState<{
    魅力: boolean;
    学业: boolean;
    体力: boolean;
    社交: boolean;
    敏感: boolean;
    声誉: boolean;
  }>({
    魅力: true,
    学业: true,
    体力: true,
    社交: false,
    敏感: false,
    声誉: false,
  });

  const handleStartNgPlus = useCallback(async () => {
    if (readOnly) return;
    setStarting(true);
    try {
      const selectedStats: Record<string, number> = {};
      // 真实继承值:优先取最近周目结束时保存的 finalStats,兜底读当前 stat_data.主角 六维
      const source = playthroughs[playthroughs.length - 1]?.finalStats
        ?? extractPlayerStats(mvu?.snapshot());
      for (const [k, v] of Object.entries(inheritStats)) {
        if (v) selectedStats[k] = typeof source?.[k] === 'number' ? source[k] : 50;
      }
      await achievementEngine.startNewGamePlus({
        inheritStats: selectedStats as NgPlusState['inheritedStats'],
        inheritItems: [],
        pointsToSpend: 0,
      });
      await onRefresh();
    } finally {
      setStarting(false);
    }
  }, [inheritStats, playthroughs, mvu, readOnly, onRefresh]);

  if (!ngPlus) {
    return <div style={emptyStyle}>加载中...</div>;
  }

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🔄 New Game+ 继承</h4>

      {/* NG+ 状态总览 */}
      <div style={{
        padding: 12,
        marginBottom: 12,
        background: ngPlus.activated
          ? `linear-gradient(135deg, ${THEME_VARS.primary}22 0%, transparent 100%)`
          : THEME_VARS.bg,
        borderRadius: 10,
        border: `1px solid ${ngPlus.activated ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            fontSize: 28,
            filter: ngPlus.activated ? 'none' : 'grayscale(1)',
          }}>
            {ngPlus.activated ? '✨' : '🔒'}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME_VARS.text }}>
              {ngPlus.activated ? `NG+ 已激活 · 第 ${ngPlus.currentPlaythrough} 周目` : 'NG+ 未激活'}
            </div>
            <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
              {ngPlus.activated
                ? `来源周目 #${ngPlus.sourcePlaythrough}`
                : '完成一周目后可开启 NG+'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>可用继承点数:</span>
            <strong style={{ color: THEME_VARS.primary, marginLeft: 4, fontSize: 14 }}>
              {ngPlus.availablePoints}
            </strong>
          </div>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>解锁标记:</span>
            <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>
              {ngPlus.unlockedFlags.length}
            </strong>
          </div>
        </div>
      </div>

      {/* 解锁标记 */}
      {ngPlus.unlockedFlags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: THEME_VARS.primary,
            marginBottom: 6,
          }}>
            🔓 已解锁标记
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {ngPlus.unlockedFlags.map((f) => (
              <span key={f} style={{
                fontSize: 10,
                padding: '2px 8px',
                background: THEME_VARS.success + '22',
                color: THEME_VARS.success,
                borderRadius: 10,
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 继承属性选择 */}
      {playthroughs.length > 0 && !readOnly && (
        <div style={{
          padding: 12,
          marginBottom: 12,
          background: THEME_VARS.bg,
          borderRadius: 8,
          border: `1px solid ${THEME_VARS.borderSoft}`,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: THEME_VARS.primary,
            marginBottom: 8,
          }}>
            ⚙ NG+ 属性继承(50% 衰减)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {(Object.keys(inheritStats) as Array<keyof typeof inheritStats>).map((k) => (
              <label key={k} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                cursor: 'pointer',
                padding: '4px 8px',
                background: inheritStats[k] ? THEME_VARS.primary + '11' : 'transparent',
                borderRadius: 6,
                border: `1px solid ${inheritStats[k] ? THEME_VARS.primary + '33' : THEME_VARS.borderSoft}`,
              }}>
                <input
                  type="checkbox"
                  checked={inheritStats[k]}
                  onChange={(e) => setInheritStats((s) => ({ ...s, [k]: e.target.checked }))}
                  style={{ cursor: 'pointer' }}
                />
                {k}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 6 }}>
            注:继承值取自上一周目结束时的主角属性,默认选择前 3 项;开始 NG+ 后按 50% 衰减注入
          </div>
        </div>
      )}

      {/* 开始 NG+ 按钮 */}
      {!readOnly && playthroughs.length > 0 && (
        <button
          onClick={handleStartNgPlus}
          disabled={starting}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: starting
              ? THEME_VARS.textMuted
              : `linear-gradient(135deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.primarySoft} 100%)`,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: starting ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          {starting ? '⏳ 正在开启 NG+...' : '🔄 开始 New Game+'}
        </button>
      )}

      {playthroughs.length === 0 && (
        <div style={{
          padding: 16,
          textAlign: 'center',
          color: THEME_VARS.textMuted,
          fontSize: 11,
          fontStyle: 'italic',
        }}>
          需先完成至少一周目(触发结局)才能开启 NG+
        </div>
      )}

      {/* 继承历史 */}
      {ngPlus.inheritedStats && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: THEME_VARS.primary,
            marginBottom: 6,
          }}>
            📦 当前继承属性
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Object.entries(ngPlus.inheritedStats).map(([k, v]) => (
              <span key={k} style={{
                fontSize: 10,
                padding: '2px 8px',
                background: THEME_VARS.overlay,
                color: THEME_VARS.text,
                borderRadius: 10,
                border: `1px solid ${THEME_VARS.borderSoft}`,
              }}>
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
