/**
 * 剧情冲突面板(阶段3 步骤7)
 *
 * 三 tab 设计:
 *  - 可触发场景:列出当前 stat_data 下可触发的冲突场景
 *  - 场景库:展示所有场景(供查阅)
 *  - 解决结果:展示最近一次冲突解决的结果(骰子+影响+叙事)
 *
 * 集成:
 *  - GameView 添加「⚔ 冲突」按钮
 *  - App.tsx 管理 gamePanel='conflict' 状态
 *  - 玩家选择场景和路径后,调用 conflictEngine.resolve()
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_VARS } from './types';
import {
  conflictEngine,
  type ConflictContext,
  type TriggerableScenario,
  type ConflictResolution,
} from '../runtime/conflict-engine';
import type { ConflictScenario, ConflictType, ConflictSeverity, ResolutionPath } from '../content/conflicts/conflict-scenarios';
import type { MvuRuntime } from '../runtime/mvu-runtime';

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
  background: `linear-gradient(135deg, ${THEME_VARS.warning} 0%, ${THEME_VARS.primary} 100%)`,
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
//  常量
// ───────────────────────────────────────────────────────────

const TYPE_COLOR: Record<ConflictType, string> = {
  解救: '#e91e63',
  对峙: '#f44336',
  制止: '#9c27b0',
  骚扰: '#ff9800',
  调停: '#00bcd4',
  威胁: '#673ab7',
  隐藏: '#607d8b',
};

const TYPE_ICON: Record<ConflictType, string> = {
  解救: '🛡',
  对峙: '⚔',
  制止: '✋',
  骚扰: '⚠',
  调停: '🕊',
  威胁: '🗡',
  隐藏: '🌙',
};

const SEVERITY_COLOR: Record<ConflictSeverity, string> = {
  轻微: '#8bc34a',
  中等: '#ff9800',
  严重: '#ff5722',
  致命: '#b71c1c',
};

const SEVERITY_LABEL: Record<ConflictSeverity, string> = {
  轻微: '轻微',
  中等: '中等',
  严重: '严重',
  致命: '致命',
};

const PATH_ICON: Record<ResolutionPath, string> = {
  力量: '💪',
  敏捷: '🏃',
  智力: '🧠',
  意志: '🎯',
  潜行: '🌑',
  口才: '💬',
  格斗: '👊',
};

// ───────────────────────────────────────────────────────────
//  Props 与 Tab
// ───────────────────────────────────────────────────────────

export interface ConflictPanelProps {
  /** MVU 运行时 */
  mvu?: MvuRuntime;
  /** 是否只读 */
  readOnly?: boolean;
}

type PanelTab = 'triggerable' | 'library' | 'result';

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function ConflictPanel({ mvu, readOnly = false }: ConflictPanelProps) {
  const [tab, setTab] = useState<PanelTab>('triggerable');
  const [triggerable, setTriggerable] = useState<TriggerableScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ConflictScenario | null>(null);
  const [selectedPath, setSelectedPath] = useState<ResolutionPath | null>(null);
  const [resolution, setResolution] = useState<ConflictResolution | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => conflictEngine.getStats(), []);

  const refreshTriggerable = useCallback(async () => {
    if (!mvu) {
      setTriggerable([]);
      return;
    }
    try {
      const sd = mvu.snapshot();
      const ctx: ConflictContext = { statData: sd };
      const list = conflictEngine.findTriggerable(ctx);
      setTriggerable(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [mvu]);

  useEffect(() => {
    refreshTriggerable();
  }, [refreshTriggerable]);

  const handleResolve = useCallback(async () => {
    if (!mvu || !selectedScenario || !selectedPath) return;
    setResolving(true);
    setError(null);
    try {
      const sd = mvu.snapshot();
      const ctx: ConflictContext = { statData: sd };
      const result = conflictEngine.resolve(selectedScenario.id, selectedPath, ctx);
      setResolution(result);
      setTab('result');
      // 刷新可触发场景列表(刚解决的场景应该不再触发)
      await refreshTriggerable();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(false);
    }
  }, [mvu, selectedScenario, selectedPath, refreshTriggerable]);

  const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'triggerable', label: '可触发场景', icon: '⚡' },
    { key: 'library', label: '场景库', icon: '📚' },
    { key: 'result', label: '解决结果', icon: '📜' },
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
          color: THEME_VARS.warning,
          letterSpacing: 1.2,
        }}>
          ⚔ 剧情冲突系统
        </h3>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
          Conflict Panel · 恋爱游戏中的剧情驱动型冲突解决
        </div>
      </header>

      {/* 顶部统计 */}
      <div style={{
        padding: 10,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${THEME_VARS.warning}11 0%, transparent 100%)`,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        fontSize: 11,
      }}>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>总场景:</span>
          <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{stats.total}</strong>
        </span>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>可触发:</span>
          <strong style={{ color: THEME_VARS.warning, marginLeft: 4 }}>{triggerable.length}</strong>
        </span>
        {(Object.keys(stats.byType) as ConflictType[]).map((t) => (
          <span key={t} style={{
            padding: '1px 6px',
            borderRadius: 6,
            background: TYPE_COLOR[t] + '22',
            color: TYPE_COLOR[t],
          }}>
            {TYPE_ICON[t]} {t}: {stats.byType[t]}
          </span>
        ))}
        {!readOnly && (
          <button
            onClick={refreshTriggerable}
            style={{
              marginLeft: 'auto',
              padding: '2px 10px',
              background: THEME_VARS.warning,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            🔄 刷新
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: 8,
          marginBottom: 12,
          background: '#ffebee',
          color: '#c62828',
          borderRadius: 6,
          fontSize: 11,
        }}>
          ❌ {error}
        </div>
      )}

      <div style={tabBarStyle}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? tabBtnActiveStyle : tabBtnStyle}
            disabled={t.key === 'result' && !resolution}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
            {t.key === 'triggerable' && triggerable.length > 0 && (
              <span style={{
                marginLeft: 4,
                padding: '0 4px',
                background: THEME_VARS.warning,
                color: '#fff',
                borderRadius: 8,
                fontSize: 9,
              }}>
                {triggerable.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'triggerable' && (
        <TriggerableTab
          triggerable={triggerable}
          readOnly={readOnly}
          onSelect={(scenario) => {
            setSelectedScenario(scenario);
            setSelectedPath(null);
            setTab('library');
          }}
        />
      )}

      {tab === 'library' && selectedScenario && (
        <ScenarioDetailTab
          scenario={selectedScenario}
          selectedPath={selectedPath}
          onPathSelect={setSelectedPath}
          onResolve={handleResolve}
          resolving={resolving}
          readOnly={readOnly}
          mvu={mvu}
        />
      )}

      {tab === 'library' && !selectedScenario && (
        <LibraryTab
          onSelect={(scenario) => {
            setSelectedScenario(scenario);
            setSelectedPath(null);
          }}
        />
      )}

      {tab === 'result' && resolution && (
        <ResultTab resolution={resolution} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  1. 可触发场景 Tab
// ═══════════════════════════════════════════════════════════

interface TriggerableTabProps {
  triggerable: TriggerableScenario[];
  readOnly: boolean;
  onSelect: (scenario: ConflictScenario) => void;
}

function TriggerableTab({ triggerable, readOnly, onSelect }: TriggerableTabProps) {
  if (triggerable.length === 0) {
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>⚡ 当前可触发的冲突场景</h4>
        <div style={emptyStyle}>
          当前状态下没有可触发的冲突场景
          <br />
          (需要满足特定地点/天数/时段/前置flag/女角好感等条件)
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>⚡ 当前可触发的冲突场景({triggerable.length})</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {triggerable.map(({ scenario, matchReason, relatedHeroine }) => {
          const typeColor = TYPE_COLOR[scenario.type];
          const sevColor = SEVERITY_COLOR[scenario.severity];
          return (
            <div
              key={scenario.id}
              style={{
                padding: 12,
                background: `linear-gradient(135deg, ${typeColor}11 0%, transparent 100%)`,
                borderRadius: 10,
                border: `1px solid ${typeColor}55`,
                borderLeft: `4px solid ${typeColor}`,
              }}
            >
              {/* 标题行 */}
              <div style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                marginBottom: 8,
                flexWrap: 'wrap',
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: THEME_VARS.text,
                }}>
                  {TYPE_ICON[scenario.type]} {scenario.name}
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: typeColor + '22',
                  color: typeColor,
                  fontWeight: 600,
                }}>
                  {scenario.type}
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: sevColor + '22',
                  color: sevColor,
                  fontWeight: 600,
                }}>
                  {SEVERITY_LABEL[scenario.severity]}
                </span>
                {relatedHeroine && (
                  <span style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: THEME_VARS.primary + '22',
                    color: THEME_VARS.primary,
                  }}>
                    👤 {relatedHeroine}
                  </span>
                )}
              </div>

              {/* 描述 */}
              <div style={{
                fontSize: 11,
                color: THEME_VARS.text,
                marginBottom: 8,
                lineHeight: 1.6,
              }}>
                {scenario.description.slice(0, 150)}
                {scenario.description.length > 150 && '...'}
              </div>

              {/* 匹配原因 */}
              <div style={{
                fontSize: 9,
                color: THEME_VARS.textMuted,
                marginBottom: 8,
                fontStyle: 'italic',
              }}>
                ✓ 匹配: {matchReason}
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{
                  fontSize: 10,
                  color: THEME_VARS.textMuted,
                  alignSelf: 'center',
                }}>
                  对手: {scenario.opponentName} (HP {scenario.opponentHp})
                </span>
                {!readOnly && (
                  <button
                    onClick={() => onSelect(scenario)}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 12px',
                      background: typeColor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    ⚔ 进入冲突
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  2. 场景库 Tab(列表)
// ═══════════════════════════════════════════════════════════

interface LibraryTabProps {
  onSelect: (scenario: ConflictScenario) => void;
}

function LibraryTab({ onSelect }: LibraryTabProps) {
  const [typeFilter, setTypeFilter] = useState<ConflictType | 'all'>('all');
  const allScenarios = useMemo(() => conflictEngine.getAllScenarios(), []);

  const filtered = useMemo(() => {
    return typeFilter === 'all' ? allScenarios : allScenarios.filter((s) => s.type === typeFilter);
  }, [allScenarios, typeFilter]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📚 场景库(共 {allScenarios.length} 个场景)</h4>

      {/* 类型筛选 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 12,
        flexWrap: 'wrap',
        fontSize: 10,
      }}>
        <span style={{ color: THEME_VARS.textMuted, alignSelf: 'center', marginRight: 2 }}>类型:</span>
        <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} label="全部" />
        {(Object.keys(TYPE_COLOR) as ConflictType[]).map((t) => (
          <FilterChip
            key={t}
            active={typeFilter === t}
            onClick={() => setTypeFilter(t)}
            label={`${TYPE_ICON[t]} ${t}`}
            color={TYPE_COLOR[t]}
          />
        ))}
      </div>

      {/* 场景列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
        {filtered.map((scenario) => {
          const typeColor = TYPE_COLOR[scenario.type];
          return (
            <div
              key={scenario.id}
              onClick={() => onSelect(scenario)}
              style={{
                padding: 10,
                background: THEME_VARS.bg,
                borderRadius: 8,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                borderLeft: `3px solid ${typeColor}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                marginBottom: 4,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: THEME_VARS.text }}>
                  {TYPE_ICON[scenario.type]} {scenario.name}
                </span>
                <span style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: typeColor + '22',
                  color: typeColor,
                }}>
                  {scenario.type}
                </span>
                <span style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: SEVERITY_COLOR[scenario.severity] + '22',
                  color: SEVERITY_COLOR[scenario.severity],
                }}>
                  {SEVERITY_LABEL[scenario.severity]}
                </span>
                {scenario.oneShot && (
                  <span style={{ fontSize: 9, color: THEME_VARS.textMuted }}>
                    · 一次性
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 10,
                color: THEME_VARS.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {scenario.description.slice(0, 80)}...
              </div>
            </div>
          );
        })}
      </div>
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
//  2.5. 场景详情 + 路径选择
// ═══════════════════════════════════════════════════════════

interface ScenarioDetailTabProps {
  scenario: ConflictScenario;
  selectedPath: ResolutionPath | null;
  onPathSelect: (path: ResolutionPath) => void;
  onResolve: () => void;
  resolving: boolean;
  readOnly: boolean;
  mvu?: MvuRuntime;
}

function ScenarioDetailTab({
  scenario,
  selectedPath,
  onPathSelect,
  onResolve,
  resolving,
  readOnly,
  mvu,
}: ScenarioDetailTabProps) {
  const typeColor = TYPE_COLOR[scenario.type];
  const sevColor = SEVERITY_COLOR[scenario.severity];

  // 读取玩家技能值(用于显示成功率预估)
  const playerSkills = useMemo(() => {
    if (!mvu) return null;
    try {
      const sd = mvu.snapshot();
      const skills = (sd.技能 ?? {}) as Record<string, unknown>;
      return {
        力量: Number(skills.力量 ?? 0),
        敏捷: Number(skills.敏捷 ?? 0),
        智力: Number(skills.智力 ?? 0),
        意志: Number(skills.意志 ?? 0),
        潜行: Number(skills.潜行 ?? 0),
        口才: Number(skills.口才 ?? 0),
        格斗: Number(skills.格斗 ?? 0),
      };
    } catch {
      return null;
    }
  }, [mvu]);

  /** 计算成功率预估(技能值+50 平均 vs 阈值) */
  function estimateSuccessRate(skillValue: number, threshold: number): number {
    // 简化:假设骰子期望 50,总值 = 技能值+50
    // 成功率 = P(技能值+骰子 ≥ 阈值) = P(骰子 ≥ 阈值-技能值)
    // 骰子 1-100 均匀分布
    const required = threshold - skillValue;
    if (required <= 1) return 99;
    if (required > 100) return 1;
    return Math.round((101 - required) / 100 * 100);
  }

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>⚔ {scenario.name}</h4>

      {/* 场景信息卡 */}
      <div style={{
        padding: 12,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${typeColor}22 0%, transparent 100%)`,
        borderRadius: 10,
        border: `1px solid ${typeColor}55`,
        borderLeft: `4px solid ${typeColor}`,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 6,
            background: typeColor + '22',
            color: typeColor,
            fontWeight: 600,
          }}>
            {TYPE_ICON[scenario.type]} {scenario.type}
          </span>
          <span style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 6,
            background: sevColor + '22',
            color: sevColor,
          }}>
            {SEVERITY_LABEL[scenario.severity]}
          </span>
          {scenario.oneShot && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 6,
              background: THEME_VARS.overlay,
              color: THEME_VARS.textMuted,
            }}>
              一次性场景
            </span>
          )}
          {scenario.failureBadEnd && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 6,
              background: '#ffebee',
              color: '#c62828',
              fontWeight: 600,
            }}>
              ⚠ 失败触发 {scenario.failureBadEnd}
            </span>
          )}
        </div>

        {/* 场景描述 */}
        <div style={{
          fontSize: 11,
          color: THEME_VARS.text,
          marginBottom: 10,
          lineHeight: 1.7,
          fontStyle: 'italic',
        }}>
          {scenario.description}
        </div>

        {/* 对手信息 */}
        <div style={{
          padding: 8,
          background: THEME_VARS.bg,
          borderRadius: 6,
          fontSize: 10,
          color: THEME_VARS.textMuted,
        }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: THEME_VARS.text, fontWeight: 600 }}>对手:</span> {scenario.opponentName}
            <span style={{ marginLeft: 8 }}>HP: {scenario.opponentHp}</span>
          </div>
          <div>{scenario.opponentDescription}</div>
        </div>
      </div>

      {/* 解决路径选择 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: THEME_VARS.text,
          marginBottom: 8,
        }}>
          🎯 选择解决路径(共 {scenario.resolutionPaths.length} 种)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scenario.resolutionPaths.map((path) => {
            const isSelected = selectedPath === path.path;
            const skillVal = playerSkills?.[path.path] ?? 0;
            const successRate = estimateSuccessRate(skillVal, path.threshold);
            const pathColor = path.isIllegal ? '#e53935' : THEME_VARS.primary;
            return (
              <div
                key={path.path}
                onClick={() => !readOnly && onPathSelect(path.path)}
                style={{
                  padding: 10,
                  background: isSelected
                    ? `linear-gradient(135deg, ${pathColor}22 0%, transparent 100%)`
                    : THEME_VARS.bg,
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? pathColor + '55' : THEME_VARS.borderSoft}`,
                  borderLeft: `3px solid ${pathColor}`,
                  cursor: readOnly ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  marginBottom: 4,
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 14 }}>
                    {PATH_ICON[path.path]}
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: THEME_VARS.text,
                  }}>
                    {path.name}
                  </span>
                  <span style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: pathColor + '22',
                    color: pathColor,
                  }}>
                    {path.path}
                  </span>
                  {path.isIllegal && (
                    <span style={{
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: '#ffebee',
                      color: '#c62828',
                    }}>
                      ⚠ 违法
                    </span>
                  )}
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    color: THEME_VARS.textMuted,
                  }}>
                    阈值: {path.threshold}
                  </span>
                </div>

                <div style={{
                  fontSize: 10,
                  color: THEME_VARS.textMuted,
                  marginBottom: 6,
                }}>
                  {path.description}
                </div>

                {/* 成功率预估 */}
                {playerSkills && (
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 10,
                  }}>
                    <span style={{ color: THEME_VARS.textMuted }}>
                      技能值: <strong style={{ color: THEME_VARS.text }}>{skillVal}</strong>
                    </span>
                    <span style={{ color: THEME_VARS.textMuted }}>·</span>
                    <span style={{ color: THEME_VARS.textMuted }}>
                      成功率预估: 
                      <strong style={{
                        color: successRate >= 70 ? THEME_VARS.success : successRate >= 40 ? THEME_VARS.warning : '#e53935',
                        marginLeft: 4,
                      }}>
                        {successRate}%
                      </strong>
                    </span>
                    {path.criticalSuccessBonus && (
                      <span style={{ color: THEME_VARS.success, fontSize: 9 }}>
                        ★ 大成功有加成
                      </span>
                    )}
                    {path.criticalFailurePenalty && (
                      <span style={{ color: '#e53935', fontSize: 9 }}>
                        ✗ 大失败有惩罚
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 操作按钮 */}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onResolve}
            disabled={!selectedPath || resolving}
            style={{
              padding: '8px 20px',
              background: !selectedPath || resolving ? THEME_VARS.textMuted : typeColor,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: !selectedPath || resolving ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {resolving ? '⏳ 判定中...' : selectedPath ? `🎲 投骰判定(${PATH_ICON[selectedPath]})` : '请先选择路径'}
          </button>
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  3. 解决结果 Tab
// ═══════════════════════════════════════════════════════════

interface ResultTabProps {
  resolution: ConflictResolution;
}

function ResultTab({ resolution }: ResultTabProps) {
  const { roll, success, appliedImpacts, narrative, triggeredFlags, triggeredBadEnd, isIllegal } = resolution;
  const { criticalSuccess, criticalFailure } = roll;

  const resultColor = success ? THEME_VARS.success : triggeredBadEnd ? '#b71c1c' : THEME_VARS.warning;
  const resultIcon = success ? '★' : triggeredBadEnd ? '✗' : '＝';
  const resultText = success ? '成功' : triggeredBadEnd ? '失败(BAD END)' : '失败';

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📜 解决结果</h4>

      {/* 结果总览 */}
      <div style={{
        padding: 12,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${resultColor}22 0%, transparent 100%)`,
        borderRadius: 10,
        border: `1px solid ${resultColor}55`,
        borderLeft: `4px solid ${resultColor}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>
          {resultIcon}
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: resultColor,
          marginBottom: 4,
        }}>
          {resultText}
        </div>
        <div style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
          {resolution.scenarioName} · {resolution.pathDef.name}
        </div>
      </div>

      {/* 骰子判定详情 */}
      <div style={{
        padding: 10,
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
          🎲 骰子判定
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
          fontSize: 11,
        }}>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>技能:</span>
            <strong style={{ marginLeft: 4 }}>{PATH_ICON[roll.skill]} {roll.skill}</strong>
          </div>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>技能值:</span>
            <strong style={{ marginLeft: 4 }}>{roll.skillValue}</strong>
          </div>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>骰子(1d100):</span>
            <strong style={{
              marginLeft: 4,
              color: criticalSuccess ? THEME_VARS.success : criticalFailure ? '#e53935' : THEME_VARS.text,
            }}>
              {roll.dice}
              {criticalSuccess && ' ★'}
              {criticalFailure && ' ✗'}
            </strong>
          </div>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>总值:</span>
            <strong style={{ marginLeft: 4 }}>{roll.total}</strong>
            <span style={{ color: THEME_VARS.textMuted }}> / 阈值 {roll.threshold}</span>
          </div>
        </div>
      </div>

      {/* 关系影响 */}
      {appliedImpacts.length > 0 && (
        <div style={{
          padding: 10,
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
            💕 关系影响({appliedImpacts.length} 位女角)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appliedImpacts.map((ap, idx) => {
              const affCh = ap.after.affection - ap.before.affection;
              const trustCh = ap.after.trust - ap.before.trust;
              const jealousyCh = ap.after.jealousy - ap.before.jealousy;
              const heartbeatCh = ap.after.heartbeat - ap.before.heartbeat;
              return (
                <div key={idx} style={{
                  padding: 8,
                  background: THEME_VARS.overlay,
                  borderRadius: 6,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: THEME_VARS.text,
                    marginBottom: 4,
                  }}>
                    👤 {ap.heroineName}
                    {ap.stageAdvanced && (
                      <span style={{
                        marginLeft: 6,
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: THEME_VARS.success + '22',
                        color: THEME_VARS.success,
                      }}>
                        ★ 关系阶段推进
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 4,
                    fontSize: 10,
                  }}>
                    <ImpactItem label="好感度" before={ap.before.affection} after={ap.after.affection} delta={affCh} />
                    <ImpactItem label="信任度" before={ap.before.trust} after={ap.after.trust} delta={trustCh} />
                    <ImpactItem label="嫉妒值" before={ap.before.jealousy} after={ap.after.jealousy} delta={jealousyCh} reverseColor />
                    <ImpactItem label="心跳" before={ap.before.heartbeat} after={ap.after.heartbeat} delta={heartbeatCh} />
                  </div>
                  {ap.stageAdvanced && (
                    <div style={{
                      marginTop: 4,
                      fontSize: 10,
                      color: THEME_VARS.success,
                    }}>
                      关系阶段: {ap.before.relationshipStage} → {ap.after.relationshipStage}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 触发的 flag */}
      {triggeredFlags.length > 0 && (
        <div style={{
          padding: 10,
          marginBottom: 12,
          background: THEME_VARS.bg,
          borderRadius: 8,
          border: `1px solid ${THEME_VARS.borderSoft}`,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: THEME_VARS.primary,
            marginBottom: 6,
          }}>
            🏴 触发的剧情 flag({triggeredFlags.length})
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {triggeredFlags.map((f) => (
              <span key={f} style={{
                fontSize: 10,
                padding: '2px 8px',
                background: THEME_VARS.success + '22',
                color: THEME_VARS.success,
                borderRadius: 10,
                border: `1px solid ${THEME_VARS.success}33`,
              }}>
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* BAD_END 警告 */}
      {triggeredBadEnd && (
        <div style={{
          padding: 10,
          marginBottom: 12,
          background: '#ffebee',
          color: '#b71c1c',
          borderRadius: 8,
          border: `1px solid #b71c1c55`,
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          ⚠ {triggeredBadEnd} 触发!
        </div>
      )}

      {/* 违法警告 */}
      {isIllegal && (
        <div style={{
          padding: 8,
          marginBottom: 12,
          background: '#fff3e0',
          color: '#e65100',
          borderRadius: 6,
          border: `1px solid #e6510033`,
          fontSize: 10,
        }}>
          ⚠ 此行为属于违法行为,违法计数+1(累计3次触发 BAD_END_7)
        </div>
      )}

      {/* 叙事文本 */}
      <div style={{
        padding: 12,
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
          📜 叙事文本(将注入主聊天AI上下文)
        </div>
        <pre style={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: 10,
          color: THEME_VARS.text,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {narrative}
        </pre>
      </div>
    </section>
  );
}

function ImpactItem({
  label,
  before,
  after,
  delta,
  reverseColor,
}: {
  label: string;
  before: number;
  after: number;
  delta: number;
  reverseColor?: boolean;
}) {
  let color: string = THEME_VARS.textMuted;
  if (delta > 0) color = reverseColor ? '#e53935' : THEME_VARS.success;
  if (delta < 0) color = reverseColor ? THEME_VARS.success : '#e53935';
  return (
    <div>
      <span style={{ color: THEME_VARS.textMuted }}>{label}:</span>
      <span style={{ color: THEME_VARS.text, marginLeft: 4 }}>{before} → {after}</span>
      {delta !== 0 && (
        <span style={{ color, marginLeft: 4 }}>
          ({delta > 0 ? '+' : ''}{delta})
        </span>
      )}
    </div>
  );
}
