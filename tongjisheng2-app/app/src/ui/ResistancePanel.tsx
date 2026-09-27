/**
 * 强迫抵抗面板(阶段3 步骤7 增强)
 *
 * 设计理念:
 *  - 涉及强迫的场景必须有战斗介入机制,玩家可选择抵抗
 *  - 抵抗:执行骰子判定,成功则阻止强迫,失败则被强迫发生
 *  - 不抵抗:跳过骰子,接受强迫,触发严重后果
 *
 * 三 tab 设计:
 *  - 可触发:列出当前 stat_data 下可触发的强迫抵抗场景
 *  - 场景库:展示所有场景(供查阅)
 *  - 解决结果:展示最近一次抵抗判定的结果
 *
 * 集成:
 *  - ConflictPanel 添加「🛡 强迫抵抗」tab 后渲染本组件
 *  - 玩家选择场景和路径后,调用 combatEngine.settleResistance()
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_VARS } from './types';
import { combatEngine, type ResistanceContext, type ResistanceResolution } from '../runtime/combat-engine';
import {
  RESISTANCE_SCENARIOS,
  getResistanceStats,
  type ResistanceScenario,
  type ResistanceType,
  type ResistanceSeverity,
} from '../content/conflicts/resistance-scenarios';
import type { MvuRuntime } from '../runtime/mvu-runtime';

// ───────────────────────────────────────────────────────────
//  通用样式
// ───────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: 16,
  background: THEME_VARS.overlaySoft,
  borderRadius: 14,
  border: `1px solid ${THEME_VARS.border}`,
  boxShadow: THEME_VARS.shadowSm,
  fontSize: 13,
  color: THEME_VARS.text,
  backdropFilter: 'blur(6px)',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginTop: 8,
  marginBottom: 14,
  padding: 4,
  background: THEME_VARS.bg,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  flexWrap: 'wrap',
};

const tabBtnStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 90,
  padding: '7px 10px',
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
  background: `linear-gradient(135deg, ${THEME_VARS.danger} 0%, ${THEME_VARS.warning} 100%)`,
  color: '#fff',
  boxShadow: THEME_VARS.shadowSm,
};

const sectionStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 14,
  background: THEME_VARS.overlay,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 10,
  fontFamily: THEME_VARS.fontDisplay,
  fontSize: 13,
  fontWeight: 500,
  color: THEME_VARS.text,
  letterSpacing: 0.6,
  paddingBottom: 6,
  borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
};

const emptyStyle: React.CSSProperties = {
  padding: 28,
  textAlign: 'center',
  color: THEME_VARS.textMuted,
  fontSize: 11,
  fontStyle: 'italic',
};

// ───────────────────────────────────────────────────────────
//  常量
// ───────────────────────────────────────────────────────────

const TYPE_COLOR: Record<ResistanceType, string> = {
  解救女角: '#e91e63',
  抵抗胁迫: '#f44336',
  抵抗失控: '#9c27b0',
  抵抗袭击: '#ff5722',
  解救NPC: '#00bcd4',
};

const TYPE_ICON: Record<ResistanceType, string> = {
  解救女角: '🛡',
  抵抗胁迫: '⚔',
  抵抗失控: '🧯',
  抵抗袭击: '👊',
  解救NPC: '🤝',
};

const SEVERITY_COLOR: Record<ResistanceSeverity, string> = {
  轻度: '#8bc34a',
  中度: '#ff9800',
  重度: '#ff5722',
  极重: '#b71c1c',
};

const SEVERITY_LABEL: Record<ResistanceSeverity, string> = {
  轻度: '轻度',
  中度: '中度',
  重度: '重度',
  极重: '极重',
};

const SKILL_ICON: Record<string, string> = {
  力量: '💪',
  敏捷: '🏃',
  智力: '🧠',
  意志: '🎯',
  潜行: '🌑',
  口才: '💬',
  格斗: '👊',
};

// ───────────────────────────────────────────────────────────
//  辅助:stat_data 读取
// ───────────────────────────────────────────────────────────

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asNum(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

function asStr(v: unknown, def = ''): string {
  return typeof v === 'string' ? v : def;
}

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return false;
}

function getFlag(statData: Record<string, unknown>, flagName: string): boolean {
  const hidden = asObj(statData.隐藏);
  return asBool(hidden[flagName]);
}

function getHeroineAffection(statData: Record<string, unknown>, heroineName: string): number {
  const heroines = asObj(statData.女角);
  const heroine = asObj(heroines[heroineName]);
  if (heroine.好感度 !== undefined) return asNum(heroine.好感度);
  const currentHeroine = asObj(statData.当前女角);
  if (asStr(currentHeroine.姓名) === heroineName) {
    return asNum(currentHeroine.好感度);
  }
  return 0;
}

/** 检查场景是否可触发 */
function checkTriggerable(
  scenario: ResistanceScenario,
  statData: Record<string, unknown>,
): { triggerable: boolean; reasons: string[] } {
  const scene = asObj(statData.场景);
  const time = asObj(statData.时间);
  const location = asStr(scene.当前地点);
  const day = asNum(time.天数);
  const timeSlot = asStr(time.时段);
  const cond = scenario.triggerCondition;
  const reasons: string[] = [];

  // 地点匹配(任一)
  if (!cond.locations.some((l) => location.includes(l) || l.includes(location))) {
    return { triggerable: false, reasons: [] };
  }
  reasons.push(`地点匹配(${location})`);

  // 天数范围
  if (day < cond.dayRange[0] || day > cond.dayRange[1]) {
    return { triggerable: false, reasons: [] };
  }
  reasons.push(`天数${day}∈[${cond.dayRange[0]},${cond.dayRange[1]}]`);

  // 时段
  if (!cond.timeSlots.includes(timeSlot)) {
    return { triggerable: false, reasons: [] };
  }
  reasons.push(`时段${timeSlot}`);

  // 前置 flag
  if (cond.requiredFlags) {
    for (const f of cond.requiredFlags) {
      if (!getFlag(statData, f)) {
        return { triggerable: false, reasons: [] };
      }
    }
    reasons.push(`前置flag满足`);
  }

  // 排除 flag
  if (cond.excludedFlags) {
    for (const f of cond.excludedFlags) {
      if (getFlag(statData, f)) {
        return { triggerable: false, reasons: [] };
      }
    }
    reasons.push(`排除flag未触发`);
  }

  // 关联女角好感度
  if (cond.relatedHeroine && cond.heroineAffectionMin !== undefined) {
    const aff = getHeroineAffection(statData, cond.relatedHeroine);
    if (aff < cond.heroineAffectionMin) {
      return { triggerable: false, reasons: [] };
    }
    reasons.push(`${cond.relatedHeroine}好感${aff}≥${cond.heroineAffectionMin}`);
  }

  return { triggerable: true, reasons };
}

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface ResistancePanelProps {
  /** MVU 运行时 */
  mvu?: MvuRuntime;
  /** 是否只读 */
  readOnly?: boolean;
}

type PanelTab = 'triggerable' | 'library' | 'result';

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function ResistancePanel({ mvu, readOnly = false }: ResistancePanelProps) {
  const [tab, setTab] = useState<PanelTab>('triggerable');
  const [triggerable, setTriggerable] = useState<Array<{ scenario: ResistanceScenario; matchReason: string }>>([]);
  const [selectedScenario, setSelectedScenario] = useState<ResistanceScenario | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | 'no_resistance' | null>(null);
  const [resolution, setResolution] = useState<ResistanceResolution | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => getResistanceStats(), []);

  const refreshTriggerable = useCallback(() => {
    if (!mvu) {
      setTriggerable([]);
      return;
    }
    try {
      const sd = mvu.snapshot();
      const list: Array<{ scenario: ResistanceScenario; matchReason: string }> = [];
      for (const scenario of RESISTANCE_SCENARIOS) {
        const { triggerable, reasons } = checkTriggerable(scenario, sd);
        if (triggerable) {
          list.push({ scenario, matchReason: reasons.join(', ') });
        }
      }
      setTriggerable(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [mvu]);

  useEffect(() => {
    refreshTriggerable();
  }, [refreshTriggerable]);

  const handleResolve = useCallback(async () => {
    if (!mvu || !selectedScenario || !selectedPathId) return;
    setResolving(true);
    setError(null);
    try {
      const sd = mvu.snapshot();
      const ctx: ResistanceContext = {
        statData: sd,
        pathId: selectedPathId,
      };
      const result = combatEngine.settleResistance(selectedScenario, ctx);
      setResolution(result);
      setTab('result');
      // 刷新可触发列表
      refreshTriggerable();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(false);
    }
  }, [mvu, selectedScenario, selectedPathId, refreshTriggerable]);

  const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'triggerable', label: '可触发', icon: '⚡' },
    { key: 'library', label: '场景库', icon: '📚' },
    { key: 'result', label: '解决结果', icon: '📜' },
  ];

  return (
    <div style={containerStyle}>
      <header style={{
        paddingBottom: 10,
        marginBottom: 10,
        borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
      }}>
        <h3 style={{
          margin: 0,
          fontFamily: THEME_VARS.fontDisplay,
          fontSize: 16,
          fontWeight: 500,
          color: THEME_VARS.danger,
          letterSpacing: 1,
        }}>
          🛡 强迫抵抗系统
        </h3>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.4 }}>
          Resistance Panel · 二元判定(抵抗 vs 不抵抗) · 严重后果
        </div>
      </header>

      {/* 顶部统计 */}
      <div style={{
        padding: 8,
        marginBottom: 10,
        background: `linear-gradient(135deg, ${THEME_VARS.danger}11 0%, transparent 100%)`,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        fontSize: 10,
      }}>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>总场景:</span>
          <strong style={{ color: THEME_VARS.text, marginLeft: 3 }}>{stats.total}</strong>
        </span>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>可触发:</span>
          <strong style={{ color: THEME_VARS.danger, marginLeft: 3 }}>{triggerable.length}</strong>
        </span>
        {(Object.keys(stats.byType) as ResistanceType[]).map((t) => (
          <span key={t} style={{
            padding: '1px 5px',
            borderRadius: 5,
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
              padding: '2px 8px',
              background: THEME_VARS.danger,
              color: '#fff',
              border: 'none',
              borderRadius: 5,
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
          padding: 6,
          marginBottom: 10,
          background: '#ffebee',
          color: '#c62828',
          borderRadius: 5,
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
            <span style={{ marginRight: 3 }}>{t.icon}</span>
            {t.label}
            {t.key === 'triggerable' && triggerable.length > 0 && (
              <span style={{
                marginLeft: 3,
                padding: '0 4px',
                background: THEME_VARS.danger,
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
            setSelectedPathId(null);
            setTab('library');
          }}
        />
      )}

      {tab === 'library' && selectedScenario && (
        <ScenarioDetailTab
          scenario={selectedScenario}
          selectedPathId={selectedPathId}
          onPathSelect={setSelectedPathId}
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
            setSelectedPathId(null);
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
  triggerable: Array<{ scenario: ResistanceScenario; matchReason: string }>;
  readOnly: boolean;
  onSelect: (scenario: ResistanceScenario) => void;
}

function TriggerableTab({ triggerable, readOnly, onSelect }: TriggerableTabProps) {
  if (triggerable.length === 0) {
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>⚡ 当前可触发的强迫抵抗场景</h4>
        <div style={emptyStyle}>
          当前状态下没有可触发的强迫抵抗场景
          <br />
          (需要满足特定地点/天数/时段/前置flag/女角好感等条件)
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>⚡ 当前可触发的强迫抵抗场景({triggerable.length})</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {triggerable.map(({ scenario, matchReason }) => {
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
              <div style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                marginBottom: 8,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: THEME_VARS.text }}>
                  {TYPE_ICON[scenario.type]} {scenario.name}
                </span>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: typeColor + '22', color: typeColor, fontWeight: 600,
                }}>
                  {scenario.type}
                </span>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: sevColor + '22', color: sevColor, fontWeight: 600,
                }}>
                  {SEVERITY_LABEL[scenario.severity]}
                </span>
                {scenario.victimName && (
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                    background: THEME_VARS.primary + '22', color: THEME_VARS.primary,
                  }}>
                    🎯 {scenario.victimName}
                  </span>
                )}
              </div>

              <div style={{
                fontSize: 11, color: THEME_VARS.text,
                marginBottom: 8, lineHeight: 1.6,
              }}>
                {scenario.description.slice(0, 180)}
                {scenario.description.length > 180 && '...'}
              </div>

              <div style={{
                fontSize: 9, color: THEME_VARS.textMuted,
                marginBottom: 8, fontStyle: 'italic',
              }}>
                ✓ 匹配: {matchReason}
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                  强迫者: {scenario.aggressorName} (HP {scenario.aggressorHp})
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
                    🛡 进入抵抗
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
  onSelect: (scenario: ResistanceScenario) => void;
}

function LibraryTab({ onSelect }: LibraryTabProps) {
  const [typeFilter, setTypeFilter] = useState<ResistanceType | 'all'>('all');

  const filtered = useMemo(() => {
    return typeFilter === 'all'
      ? RESISTANCE_SCENARIOS
      : RESISTANCE_SCENARIOS.filter((s) => s.type === typeFilter);
  }, [typeFilter]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📚 场景库(共 {RESISTANCE_SCENARIOS.length} 个场景)</h4>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap', fontSize: 10,
      }}>
        <span style={{ color: THEME_VARS.textMuted, alignSelf: 'center', marginRight: 2 }}>类型:</span>
        <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} label="全部" />
        {(Object.keys(TYPE_COLOR) as ResistanceType[]).map((t) => (
          <FilterChip
            key={t}
            active={typeFilter === t}
            onClick={() => setTypeFilter(t)}
            label={`${TYPE_ICON[t]} ${t}`}
            color={TYPE_COLOR[t]}
          />
        ))}
      </div>

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
                display: 'flex', gap: 6, alignItems: 'center',
                marginBottom: 4, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: THEME_VARS.text }}>
                  {TYPE_ICON[scenario.type]} {scenario.name}
                </span>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 4,
                  background: typeColor + '22', color: typeColor,
                }}>
                  {scenario.type}
                </span>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 4,
                  background: SEVERITY_COLOR[scenario.severity] + '22',
                  color: SEVERITY_COLOR[scenario.severity],
                }}>
                  {SEVERITY_LABEL[scenario.severity]}
                </span>
              </div>
              <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
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
        padding: '2px 8px',
        background: active ? (color ?? THEME_VARS.primary) : 'transparent',
        color: active ? '#fff' : (color ?? THEME_VARS.textMuted),
        border: `1px solid ${active ? (color ?? THEME_VARS.primary) : THEME_VARS.borderSoft}`,
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
//  3. 场景详情 Tab(路径选择)
// ═══════════════════════════════════════════════════════════

interface ScenarioDetailTabProps {
  scenario: ResistanceScenario;
  selectedPathId: string | 'no_resistance' | null;
  onPathSelect: (id: string | 'no_resistance') => void;
  onResolve: () => void;
  resolving: boolean;
  readOnly: boolean;
  mvu?: MvuRuntime;
}

function ScenarioDetailTab({
  scenario,
  selectedPathId,
  onPathSelect,
  onResolve,
  resolving,
  readOnly,
  mvu,
}: ScenarioDetailTabProps) {
  const typeColor = TYPE_COLOR[scenario.type];
  const sevColor = SEVERITY_COLOR[scenario.severity];

  // 读取玩家技能值用于成功率预估
  const skillValues = useMemo(() => {
    if (!mvu) return {} as Record<string, number>;
    const sd = mvu.snapshot();
    const skills = asObj(sd.技能);
    const result: Record<string, number> = {};
    for (const p of scenario.resistancePaths) {
      result[p.skill] = asNum(skills[p.skill]);
    }
    return result;
  }, [mvu, scenario]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>
        📋 场景详情
        <button
          onClick={() => onPathSelect('no_resistance')}
          style={{
            marginLeft: 8,
            padding: '2px 8px',
            background: selectedPathId === 'no_resistance' ? THEME_VARS.danger : 'transparent',
            color: selectedPathId === 'no_resistance' ? '#fff' : THEME_VARS.danger,
            border: `1px solid ${THEME_VARS.danger}`,
            borderRadius: 6,
            cursor: readOnly ? 'not-allowed' : 'pointer',
            fontSize: 10,
            fontWeight: 500,
          }}
        >
          🚫 不抵抗
        </button>
      </h4>

      {/* 场景信息 */}
      <div style={{
        padding: 12,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${typeColor}11 0%, transparent 100%)`,
        borderRadius: 10,
        border: `1px solid ${typeColor}55`,
        borderLeft: `4px solid ${typeColor}`,
      }}>
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center',
          marginBottom: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: THEME_VARS.text }}>
            {TYPE_ICON[scenario.type]} {scenario.name}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: typeColor + '22', color: typeColor, fontWeight: 600,
          }}>
            {scenario.type}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: sevColor + '22', color: sevColor, fontWeight: 600,
          }}>
            {SEVERITY_LABEL[scenario.severity]}
          </span>
        </div>

        <div style={{ fontSize: 11, color: THEME_VARS.text, marginBottom: 8, lineHeight: 1.7 }}>
          {scenario.description}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 6, fontSize: 10,
        }}>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>强迫者:</span>
            <strong style={{ color: THEME_VARS.danger, marginLeft: 4 }}>{scenario.aggressorName}</strong>
          </div>
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>强迫者 HP:</span>
            <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{scenario.aggressorHp}</strong>
          </div>
          {scenario.victimName && (
            <div>
              <span style={{ color: THEME_VARS.textMuted }}>被强迫者:</span>
              <strong style={{ color: THEME_VARS.primary, marginLeft: 4 }}>{scenario.victimName}</strong>
            </div>
          )}
          <div>
            <span style={{ color: THEME_VARS.textMuted }}>一次性:</span>
            <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{scenario.oneShot ? '是' : '否'}</strong>
          </div>
        </div>

        <div style={{
          marginTop: 6, fontSize: 10, color: THEME_VARS.textMuted,
          fontStyle: 'italic',
        }}>
          {scenario.aggressorDescription}
        </div>
      </div>

      {/* 抵抗路径选择 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: THEME_VARS.warning, marginBottom: 8,
        }}>
          ⚔ 选择抵抗路径(或不抵抗)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scenario.resistancePaths.map((path) => {
            const isSelected = selectedPathId === path.id;
            const skillVal = skillValues[path.skill] ?? 0;
            // 成功率预估:(skillVal + 50) / (threshold + 50) * 100, clamp 5~95
            const successRate = Math.max(5, Math.min(95, Math.round(((skillVal + 50) / (path.threshold + 50)) * 100)));
            return (
              <div
                key={path.id}
                onClick={() => !readOnly && onPathSelect(path.id)}
                style={{
                  padding: 10,
                  background: isSelected ? THEME_VARS.primaryGlow : THEME_VARS.bg,
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
                  borderLeft: `3px solid ${isSelected ? THEME_VARS.primary : path.isIllegal ? THEME_VARS.danger : THEME_VARS.borderSoft}`,
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  display: 'flex', gap: 6, alignItems: 'center',
                  marginBottom: 4, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: THEME_VARS.text }}>
                    {SKILL_ICON[path.skill] ?? '🎯'} {path.name}
                  </span>
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 4,
                    background: THEME_VARS.primary + '22', color: THEME_VARS.primary,
                  }}>
                    {path.skill} · 阈值 {path.threshold}
                  </span>
                  {path.isIllegal && (
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4,
                      background: THEME_VARS.danger + '22', color: THEME_VARS.danger,
                    }}>
                      ⚠ 违法
                    </span>
                  )}
                  {path.failureBadEnd && (
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4,
                      background: '#b71c1c22', color: '#b71c1c',
                    }}>
                      ⚠ 失败触发 BAD_END
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 10 }}>
                    <span style={{ color: THEME_VARS.textMuted }}>成功率:</span>
                    <strong style={{
                      marginLeft: 3,
                      color: successRate >= 70 ? THEME_VARS.success : successRate >= 40 ? THEME_VARS.warning : '#e53935',
                    }}>
                      {successRate}%
                    </strong>
                    <span style={{ color: THEME_VARS.textMuted, marginLeft: 4 }}>
                      (技能 {skillVal})
                    </span>
                  </span>
                </div>
                <div style={{ fontSize: 10, color: THEME_VARS.textMuted, lineHeight: 1.5 }}>
                  {path.description}
                </div>
              </div>
            );
          })}

          {/* 不抵抗选项 */}
          <div
            onClick={() => !readOnly && onPathSelect('no_resistance')}
            style={{
              padding: 10,
              background: selectedPathId === 'no_resistance' ? '#ffebee' : THEME_VARS.bg,
              borderRadius: 8,
              border: `1px solid ${selectedPathId === 'no_resistance' ? THEME_VARS.danger : THEME_VARS.borderSoft}`,
              borderLeft: `3px solid ${THEME_VARS.danger}`,
              cursor: readOnly ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME_VARS.danger }}>
                🚫 不抵抗
              </span>
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 4,
                background: THEME_VARS.danger + '22', color: THEME_VARS.danger,
              }}>
                严重后果
              </span>
            </div>
            <div style={{ fontSize: 10, color: THEME_VARS.textMuted, lineHeight: 1.5 }}>
              放弃抵抗,接受强迫发生。将触发严重的关系损失和负面 flag,可能导致 BAD_END。
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onResolve}
            disabled={!selectedPathId || resolving}
            style={{
              padding: '8px 20px',
              background: !selectedPathId || resolving
                ? THEME_VARS.textMuted
                : selectedPathId === 'no_resistance'
                  ? THEME_VARS.danger
                  : typeColor,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: !selectedPathId || resolving ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {resolving
              ? '⏳ 判定中...'
              : selectedPathId === 'no_resistance'
                ? '🚫 确认不抵抗'
                : selectedPathId
                  ? `🎲 投骰判定(${SKILL_ICON[scenario.resistancePaths.find(p => p.id === selectedPathId)?.skill ?? ''] ?? '🎯'})`
                  : '请先选择路径'}
          </button>
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  4. 解决结果 Tab
// ═══════════════════════════════════════════════════════════

interface ResultTabProps {
  resolution: ResistanceResolution;
}

function ResultTab({ resolution }: ResultTabProps) {
  const {
    outcome,
    roll,
    criticalSuccess,
    criticalFailure,
    narrative,
    appliedImpacts,
    triggeredFlags,
    triggeredBadEnd,
    isIllegal,
    scenarioName,
    chosenPath,
    combatLog,
    settlementPage,
  } = resolution;

  const resultColor = outcome === 'resisted'
    ? THEME_VARS.success
    : outcome === 'no_resistance'
      ? THEME_VARS.danger
      : triggeredBadEnd
        ? '#b71c1c'
        : THEME_VARS.warning;

  const resultIcon = outcome === 'resisted' ? '★' : outcome === 'no_resistance' ? '🚫' : triggeredBadEnd ? '✗' : '＝';
  const resultText = outcome === 'resisted'
    ? '抵抗成功'
    : outcome === 'no_resistance'
      ? '不抵抗'
      : triggeredBadEnd
        ? '抵抗失败(BAD END)'
        : '抵抗失败';

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📜 解决结果</h4>

      {/* 结果总览 */}
      <div style={{
        padding: 14,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${resultColor}22 0%, transparent 100%)`,
        borderRadius: 10,
        border: `1px solid ${resultColor}55`,
        borderLeft: `4px solid ${resultColor}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>
          {resultIcon}
        </div>
        <div style={{
          fontSize: 18, fontWeight: 600,
          color: resultColor, marginBottom: 4,
        }}>
          {resultText}
        </div>
        <div style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
          {scenarioName} · {chosenPath.name}
        </div>
      </div>

      {/* 骰子判定详情 */}
      {roll && (
        <div style={{
          padding: 10,
          marginBottom: 12,
          background: THEME_VARS.bg,
          borderRadius: 8,
          border: `1px solid ${THEME_VARS.borderSoft}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: THEME_VARS.primary, marginBottom: 8,
          }}>
            🎲 骰子判定
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 6, fontSize: 11,
          }}>
            <div>
              <span style={{ color: THEME_VARS.textMuted }}>技能:</span>
              <strong style={{ marginLeft: 4 }}>
                {SKILL_ICON[roll.skill] ?? '🎯'} {roll.skill}
              </strong>
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
      )}

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
            fontSize: 11, fontWeight: 600,
            color: THEME_VARS.primary, marginBottom: 8,
          }}>
            💕 关系影响({appliedImpacts.length} 位女角)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appliedImpacts.map((ap, idx) => {
              return (
                <div key={idx} style={{
                  padding: 8,
                  background: THEME_VARS.overlay,
                  borderRadius: 6,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: THEME_VARS.text, marginBottom: 4,
                  }}>
                    👤 {ap.heroineName}
                    {ap.relationshipStageAdvance && (
                      <span style={{
                        marginLeft: 6, fontSize: 9,
                        padding: '1px 5px', borderRadius: 4,
                        background: THEME_VARS.success + '22',
                        color: THEME_VARS.success,
                      }}>
                        ★ 关系阶段推进
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 4, fontSize: 10,
                  }}>
                    <ImpactItem label="好感度" before={ap.before.affection} after={ap.after.affection} delta={ap.affectionDelta} />
                    <ImpactItem label="信任度" before={ap.before.trust} after={ap.after.trust} delta={ap.trustDelta} />
                    <ImpactItem label="嫉妒值" before={ap.before.jealousy} after={ap.after.jealousy} delta={ap.jealousyDelta} reverseColor />
                    <ImpactItem label="心动值" before={ap.before.heartbeat} after={ap.after.heartbeat} delta={ap.heartbeatDelta} />
                  </div>
                  {ap.relationshipStageAdvance && (
                    <div style={{ marginTop: 4, fontSize: 10, color: THEME_VARS.success }}>
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
            fontSize: 11, fontWeight: 600,
            color: THEME_VARS.primary, marginBottom: 6,
          }}>
            🏴 触发的剧情 flag({triggeredFlags.length})
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {triggeredFlags.map((f) => (
              <span key={f} style={{
                fontSize: 10, padding: '2px 8px',
                background: outcome === 'resisted'
                  ? THEME_VARS.success + '22'
                  : THEME_VARS.danger + '22',
                color: outcome === 'resisted' ? THEME_VARS.success : THEME_VARS.danger,
                borderRadius: 10,
                border: `1px solid ${outcome === 'resisted' ? THEME_VARS.success : THEME_VARS.danger}33`,
              }}>
                {outcome === 'resisted' ? '✓' : '✗'} {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* BAD_END 警告 */}
      {triggeredBadEnd && (
        <div style={{
          padding: 12,
          marginBottom: 12,
          background: '#ffebee',
          color: '#b71c1c',
          borderRadius: 8,
          border: `1px solid #b71c1c55`,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          ⚠ {triggeredBadEnd} 触发!
        </div>
      )}

      {/* 违法警告 */}
      {isIllegal && outcome !== 'no_resistance' && (
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
        marginBottom: 12,
        background: THEME_VARS.bg,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: THEME_VARS.primary, marginBottom: 8,
        }}>
          📜 叙事文本(将注入主聊天AI上下文)
        </div>
        <pre style={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: 10,
          color: THEME_VARS.text,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {narrative}
        </pre>
      </div>

      {/* 战斗记录 */}
      <div style={{
        padding: 10,
        marginBottom: 12,
        background: THEME_VARS.bg,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: THEME_VARS.textMuted, marginBottom: 6,
        }}>
          📋 战斗记录
        </div>
        <pre style={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: 10,
          color: THEME_VARS.textMuted,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {combatLog.join('\n')}
        </pre>
      </div>

      {/* 完整结算页 */}
      <div style={{
        padding: 10,
        background: THEME_VARS.overlay,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: THEME_VARS.warning, marginBottom: 6,
        }}>
          📄 完整结算页(注入主聊天AI)
        </div>
        <pre style={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: 10,
          color: THEME_VARS.text,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 320,
          overflowY: 'auto',
        }}>
          {settlementPage}
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
