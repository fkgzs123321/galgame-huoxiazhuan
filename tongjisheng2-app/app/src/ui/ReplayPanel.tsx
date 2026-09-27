/**
 * 回放面板(阶段3 步骤6)
 *
 * 职责:
 *  - 时间线视图:按天分组展示所有历史 revision
 *  - 详情视图:点击节点查看完整 stat_data + 元数据
 *  - Diff 视图:对比选中 revision 与当前状态
 *  - 分支操作:从任意节点创建分支或切换到此存档
 *
 * 不做:
 *  - 实际 kernel 状态切换(由 App.tsx 调用 kernel.loadFromRevision 完成)
 *  - revision 写入(由 replayEngine.createBranch 完成)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_VARS } from './types';
import {
  replayEngine,
  type ReplayEntry,
  type ReplayDiff,
  type RevisionRow,
} from '../runtime/replay-engine';
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
//  常量
// ───────────────────────────────────────────────────────────

const SCOPE_COLOR: Record<RevisionRow['scope'], string> = {
  save: '#4caf50',
  chat: '#2196f3',
  auto: '#ff9800',
  branch: '#9c27b0',
};

const SCOPE_LABEL: Record<RevisionRow['scope'], string> = {
  save: '手动存档',
  chat: '回合存档',
  auto: '自动存档',
  branch: '分支',
};

const SCOPE_ICON: Record<RevisionRow['scope'], string> = {
  save: '💾',
  chat: '💬',
  auto: '⚙',
  branch: '🌿',
};

// ───────────────────────────────────────────────────────────
//  Props 与 Tab
// ───────────────────────────────────────────────────────────

export interface ReplayPanelProps {
  /** MVU 运行时(用于获取当前 stat_data 做 diff) */
  mvu?: MvuRuntime;
  /** 当前 revision hash(用于高亮当前位置) */
  currentHash?: string | null;
  /** 切换到指定 revision 的回调(由 App.tsx 调用 kernel.loadFromRevision) */
  onLoadRevision?: (hash: string) => Promise<void> | void;
  /** 是否只读 */
  readOnly?: boolean;
}

type PanelTab = 'timeline' | 'detail' | 'diff';

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function ReplayPanel({ mvu, currentHash, onLoadRevision, readOnly = false }: ReplayPanelProps) {
  const [tab, setTab] = useState<PanelTab>('timeline');
  const [entries, setEntries] = useState<ReplayEntry[]>([]);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<RevisionRow['scope'] | 'all'>('all');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await replayEngine.listEntries(scopeFilter, 200);
      setEntries(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [scopeFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => replayEngine.getStats(entries), [entries]);
  const grouped = useMemo(() => replayEngine.groupByDay(entries), [entries]);

  const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'timeline', label: '时间线', icon: '📅' },
    { key: 'detail', label: '节点详情', icon: '🔍' },
    { key: 'diff', label: '差异对比', icon: '⚖' },
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
          回放系统 · 阶段3 步骤6
        </h3>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
          Replay Panel · Timeline / Detail / Diff
        </div>
      </header>

      {/* 顶部统计 */}
      <div style={{
        padding: 10,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${THEME_VARS.primary}11 0%, transparent 100%)`,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        fontSize: 11,
      }}>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>总节点:</span>
          <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{stats.total}</strong>
        </span>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>覆盖天数:</span>
          <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{stats.byDay}</strong>
        </span>
        {(Object.keys(stats.byScope) as RevisionRow['scope'][]).map((s) => (
          <span key={s} style={{
            padding: '1px 6px',
            borderRadius: 6,
            background: SCOPE_COLOR[s] + '22',
            color: SCOPE_COLOR[s],
          }}>
            {SCOPE_ICON[s]} {SCOPE_LABEL[s]}: {stats.byScope[s]}
          </span>
        ))}
        {stats.earliestTs && stats.latestTs && (
          <span style={{ color: THEME_VARS.textMuted, fontSize: 10 }}>
            {new Date(stats.earliestTs).toLocaleDateString('zh-CN')}
            {' ~ '}
            {new Date(stats.latestTs).toLocaleDateString('zh-CN')}
          </span>
        )}
        {!readOnly && (
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              marginLeft: 'auto',
              padding: '2px 10px',
              background: loading ? THEME_VARS.textMuted : THEME_VARS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 10,
            }}
          >
            {loading ? '⏳ 刷新中...' : '🔄 刷新'}
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
            disabled={!selectedHash && t.key !== 'timeline'}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'timeline' && (
        <TimelineTab
          entries={entries}
          grouped={grouped}
          currentHash={currentHash}
          readOnly={readOnly}
          scopeFilter={scopeFilter}
          onScopeFilterChange={setScopeFilter}
          onSelect={(hash) => {
            setSelectedHash(hash);
            setTab('detail');
          }}
        />
      )}

      {tab === 'detail' && selectedHash && (
        <DetailTab
          hash={selectedHash}
          mvu={mvu}
          readOnly={readOnly}
          onSelectOther={setSelectedHash}
          onLoadRevision={onLoadRevision}
        />
      )}

      {tab === 'diff' && selectedHash && mvu && (
        <DiffTab
          hash={selectedHash}
          mvu={mvu}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  1. 时间线 Tab
// ═══════════════════════════════════════════════════════════

interface TimelineTabProps {
  entries: ReplayEntry[];
  grouped: Map<number, ReplayEntry[]>;
  currentHash?: string | null;
  readOnly: boolean;
  scopeFilter: RevisionRow['scope'] | 'all';
  onScopeFilterChange: (s: RevisionRow['scope'] | 'all') => void;
  onSelect: (hash: string) => void;
}

function TimelineTab({
  entries,
  grouped,
  currentHash,
  readOnly,
  scopeFilter,
  onScopeFilterChange,
  onSelect,
}: TimelineTabProps) {
  if (entries.length === 0) {
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>📅 历史时间线</h4>
        <div style={emptyStyle}>
          尚无历史记录(进行游戏并触发回合后会自动记录)
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📅 历史时间线</h4>

      {/* scope 筛选 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 12,
        flexWrap: 'wrap',
        fontSize: 10,
      }}>
        <span style={{ color: THEME_VARS.textMuted, alignSelf: 'center', marginRight: 2 }}>范围:</span>
        <FilterChip active={scopeFilter === 'all'} onClick={() => onScopeFilterChange('all')} label="全部" />
        {(Object.keys(SCOPE_LABEL) as RevisionRow['scope'][]).map((s) => (
          <FilterChip
            key={s}
            active={scopeFilter === s}
            onClick={() => onScopeFilterChange(s)}
            label={`${SCOPE_ICON[s]} ${SCOPE_LABEL[s]}`}
            color={SCOPE_COLOR[s]}
          />
        ))}
      </div>

      {/* 按天分组的时间线 */}
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {[...grouped.entries()].map(([day, dayEntries]) => (
          <div key={day} style={{ marginBottom: 16 }}>
            {/* 天数分隔标题 */}
            <div style={{
              position: 'sticky',
              top: 0,
              padding: '6px 10px',
              marginBottom: 8,
              background: THEME_VARS.primary + '22',
              color: THEME_VARS.primary,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1,
              border: `1px solid ${THEME_VARS.primary}33`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>🌸</span>
              <span>第 {day} 天</span>
              {dayEntries[0]?.meta.date && (
                <span style={{ color: THEME_VARS.textMuted, fontWeight: 400 }}>
                  · {dayEntries[0].meta.date}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: THEME_VARS.textMuted, fontWeight: 400 }}>
                {dayEntries.length} 个节点
              </span>
            </div>

            {/* 该天内的所有节点 */}
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{
                position: 'absolute',
                left: 8,
                top: 0,
                bottom: 0,
                width: 2,
                background: `linear-gradient(180deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.borderSoft} 100%)`,
              }} />
              {dayEntries.map((entry) => {
                const isCurrent = entry.hash === currentHash;
                const scopeColor = SCOPE_COLOR[entry.scope];
                return (
                  <div
                    key={entry.hash}
                    onClick={() => !readOnly && onSelect(entry.hash)}
                    style={{
                      position: 'relative',
                      marginBottom: 8,
                      paddingLeft: 16,
                      cursor: readOnly ? 'default' : 'pointer',
                    }}
                  >
                    {/* 时间线节点圆点 */}
                    <div style={{
                      position: 'absolute',
                      left: -19,
                      top: 8,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: isCurrent ? THEME_VARS.primary : scopeColor,
                      border: `2px solid ${isCurrent ? THEME_VARS.primary : scopeColor}55`,
                      boxShadow: isCurrent ? `0 0 8px ${THEME_VARS.primary}` : 'none',
                    }} />

                    <div style={{
                      padding: 10,
                      background: isCurrent
                        ? `linear-gradient(135deg, ${THEME_VARS.primary}22 0%, transparent 100%)`
                        : THEME_VARS.bg,
                      borderRadius: 8,
                      border: `1px solid ${isCurrent ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                      borderLeft: `3px solid ${scopeColor}`,
                      transition: 'all 0.2s ease',
                    }}>
                      {/* 第一行:scope + 时段 + 回合 */}
                      <div style={{
                        display: 'flex',
                        gap: 6,
                        alignItems: 'center',
                        marginBottom: 4,
                        flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: scopeColor + '22',
                          color: scopeColor,
                          fontWeight: 600,
                        }}>
                          {SCOPE_ICON[entry.scope]} {SCOPE_LABEL[entry.scope]}
                        </span>
                        <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
                          ⏰ {entry.meta.timeSlot}
                        </span>
                        <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
                          · 第 {entry.meta.turnCount} 回合
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: THEME_VARS.primary,
                            color: '#fff',
                            fontWeight: 600,
                          }}>
                            ● 当前
                          </span>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: THEME_VARS.textMuted }}>
                          {new Date(entry.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* 第二行:地点 + 女角 */}
                      <div style={{
                        fontSize: 11,
                        color: THEME_VARS.text,
                        marginBottom: 4,
                      }}>
                        📍 {entry.meta.location}
                        <span style={{ color: THEME_VARS.textMuted, margin: '0 6px' }}>·</span>
                        👤 {entry.meta.currentHeroine}
                      </div>

                      {/* 第三行:玩家行动(若有) */}
                      {entry.meta.action && (
                        <div style={{
                          fontSize: 10,
                          color: THEME_VARS.textMuted,
                          fontStyle: 'italic',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          🎬 {entry.meta.action}
                        </div>
                      )}

                      {/* 标签(若有) */}
                      {entry.label && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: THEME_VARS.overlay,
                            color: THEME_VARS.textMuted,
                            border: `1px solid ${THEME_VARS.borderSoft}`,
                          }}>
                            🏷 {entry.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
//  2. 节点详情 Tab
// ═══════════════════════════════════════════════════════════

interface DetailTabProps {
  hash: string;
  mvu?: MvuRuntime;
  readOnly: boolean;
  onSelectOther: (hash: string) => void;
  onLoadRevision?: (hash: string) => Promise<void> | void;
}

function DetailTab({ hash, mvu, readOnly, onSelectOther, onLoadRevision }: DetailTabProps) {
  const [entry, setEntry] = useState<ReplayEntry | null>(null);
  const [content, setContent] = useState<{ statData?: Record<string, unknown>; narrative?: string } | null>(null);
  const [chain, setChain] = useState<ReplayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [branching, setBranching] = useState(false);
  const [branchResult, setBranchResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBranchResult(null);
    (async () => {
      try {
        const detail = await replayEngine.getEntryDetail(hash);
        if (cancelled) return;
        setEntry(detail.entry);
        setContent(detail.content as { statData?: Record<string, unknown>; narrative?: string } | null);
        const c = await replayEngine.traceChain(hash);
        if (cancelled) return;
        setChain(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  const handleBranch = useCallback(async () => {
    if (readOnly || !entry) return;
    setBranching(true);
    setBranchResult(null);
    try {
      const label = `branch-${new Date().toLocaleString('zh-CN').replace(/[\/\s:]/g, '')}`;
      const result = await replayEngine.createBranch(entry.hash, label);
      setBranchResult(`✓ 分支已创建:hash=${result.hash.slice(0, 12)}... 标签=${result.label}`);
    } catch (e) {
      setBranchResult(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBranching(false);
    }
  }, [entry, readOnly]);

  const handleLoad = useCallback(async () => {
    if (readOnly || !entry || !onLoadRevision) return;
    if (!window.confirm(`确认切换到该节点?\n\n第 ${entry.meta.day} 天 ${entry.meta.timeSlot} · ${entry.meta.location}\n回合 ${entry.meta.turnCount}\n\n注意:当前未保存的进度会丢失。`)) return;
    await onLoadRevision(entry.hash);
  }, [entry, readOnly, onLoadRevision]);

  if (loading) {
    return <div style={emptyStyle}>加载中...</div>;
  }

  if (error) {
    return <div style={{ ...emptyStyle, color: '#c62828' }}>❌ {error}</div>;
  }

  if (!entry || !content) {
    return <div style={emptyStyle}>节点不存在</div>;
  }

  const statData = content.statData ?? {};
  const topKeys = Object.keys(statData).slice(0, 12);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🔍 节点详情</h4>

      {/* 元数据卡片 */}
      <div style={{
        padding: 12,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${SCOPE_COLOR[entry.scope]}22 0%, transparent 100%)`,
        borderRadius: 10,
        border: `1px solid ${SCOPE_COLOR[entry.scope]}55`,
        borderLeft: `4px solid ${SCOPE_COLOR[entry.scope]}`,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 6,
            background: SCOPE_COLOR[entry.scope] + '22',
            color: SCOPE_COLOR[entry.scope],
            fontWeight: 600,
          }}>
            {SCOPE_ICON[entry.scope]} {SCOPE_LABEL[entry.scope]}
          </span>
          {entry.label && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 6,
              background: THEME_VARS.overlay,
              color: THEME_VARS.textMuted,
            }}>
              🏷 {entry.label}
            </span>
          )}
          <span style={{ fontSize: 10, color: THEME_VARS.textMuted, marginLeft: 'auto' }}>
            {new Date(entry.ts).toLocaleString('zh-CN')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 11 }}>
          <MetaItem label="天数" value={entry.meta.day} />
          <MetaItem label="日期" value={entry.meta.date || '—'} />
          <MetaItem label="时段" value={entry.meta.timeSlot} />
          <MetaItem label="回合" value={entry.meta.turnCount} />
          <MetaItem label="地点" value={entry.meta.location} />
          <MetaItem label="当前女角" value={entry.meta.currentHeroine} />
          <MetaItem label="现金" value={`¥${entry.meta.money}`} />
          <MetaItem label="心情" value={entry.meta.mood} />
        </div>

        {entry.meta.action && (
          <div style={{
            marginTop: 8,
            padding: 6,
            background: THEME_VARS.bg,
            borderRadius: 6,
            fontSize: 10,
            color: THEME_VARS.textMuted,
            fontStyle: 'italic',
          }}>
            🎬 {entry.meta.action}
          </div>
        )}

        <div style={{
          marginTop: 8,
          fontSize: 9,
          color: THEME_VARS.textMuted,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}>
          🔑 hash: {entry.hash}
          <br />
          🔗 parent: {entry.parentHash ?? 'null'}
        </div>
      </div>

      {/* 操作按钮 */}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleBranch}
            disabled={branching}
            style={{
              padding: '6px 14px',
              background: branching ? THEME_VARS.textMuted : SCOPE_COLOR.branch,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: branching ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {branching ? '⏳ 创建中...' : '🌿 创建分支'}
          </button>
          {onLoadRevision && (
            <button
              onClick={handleLoad}
              style={{
                padding: '6px 14px',
                background: THEME_VARS.warning,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              ⏪ 切换到此存档
            </button>
          )}
        </div>
      )}

      {branchResult && (
        <div style={{
          padding: 8,
          marginBottom: 12,
          background: THEME_VARS.overlay,
          borderRadius: 6,
          fontSize: 10,
          color: branchResult.startsWith('✓') ? THEME_VARS.success : '#c62828',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}>
          {branchResult}
        </div>
      )}

      {/* 血脉路径 */}
      {chain.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: THEME_VARS.primary,
            marginBottom: 6,
          }}>
            🌳 血脉路径(共 {chain.length} 个节点)
          </div>
          <div style={{
            padding: 8,
            background: THEME_VARS.bg,
            borderRadius: 6,
            border: `1px solid ${THEME_VARS.borderSoft}`,
            maxHeight: 120,
            overflowY: 'auto',
          }}>
            {chain.map((c, idx) => (
              <div
                key={c.hash}
                onClick={() => onSelectOther(c.hash)}
                style={{
                  fontSize: 10,
                  padding: '3px 6px',
                  marginBottom: 2,
                  cursor: 'pointer',
                  borderRadius: 4,
                  background: c.hash === entry.hash ? THEME_VARS.primary + '22' : 'transparent',
                  color: c.hash === entry.hash ? THEME_VARS.primary : THEME_VARS.textMuted,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: THEME_VARS.textMuted }}>{chain.length - idx}.</span>
                <span>第{c.meta.day}天 {c.meta.timeSlot}</span>
                <span>· 回合{c.meta.turnCount}</span>
                <span style={{ marginLeft: 'auto' }}>{SCOPE_ICON[c.scope]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* stat_data 顶层字段 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME_VARS.primary,
          marginBottom: 6,
        }}>
          📦 stat_data 顶层字段(共 {Object.keys(statData).length} 个,展示前 {topKeys.length})
        </div>
        <div style={{
          padding: 8,
          background: THEME_VARS.bg,
          borderRadius: 6,
          border: `1px solid ${THEME_VARS.borderSoft}`,
          fontFamily: 'monospace',
          fontSize: 10,
          color: THEME_VARS.text,
        }}>
          {topKeys.map((k) => {
            const v = statData[k];
            const type = Array.isArray(v) ? `array(${v.length})` : v === null ? 'null' : typeof v;
            const preview = typeof v === 'object' ? '' : String(v).slice(0, 60);
            return (
              <div key={k} style={{ marginBottom: 2, display: 'flex', gap: 6 }}>
                <span style={{ color: THEME_VARS.primary, fontWeight: 600 }}>{k}:</span>
                <span style={{ color: THEME_VARS.textMuted, fontSize: 9 }}>[{type}]</span>
                {preview && <span style={{ color: THEME_VARS.text }}>{preview}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 叙事文本(若有) */}
      {content.narrative && (
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: THEME_VARS.primary,
            marginBottom: 6,
          }}>
            📜 叙事正文(预览)
          </div>
          <div style={{
            padding: 8,
            background: THEME_VARS.bg,
            borderRadius: 6,
            border: `1px solid ${THEME_VARS.borderSoft}`,
            fontSize: 10,
            color: THEME_VARS.text,
            lineHeight: 1.6,
            maxHeight: 200,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {content.narrative.slice(0, 1000)}
            {content.narrative.length > 1000 && (
              <span style={{ color: THEME_VARS.textMuted }}> ... (共 {content.narrative.length} 字)</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
      <span style={{ color: THEME_VARS.textMuted, fontSize: 10 }}>{label}:</span>
      <strong style={{ color: THEME_VARS.text, fontSize: 11 }}>{value}</strong>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  3. 差异对比 Tab
// ═══════════════════════════════════════════════════════════

interface DiffTabProps {
  hash: string;
  mvu: MvuRuntime;
}

function DiffTab({ hash, mvu }: DiffTabProps) {
  const [diff, setDiff] = useState<ReplayDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const currentSd = mvu.snapshot();
        const result = await replayEngine.diffFromCurrent(hash, currentSd);
        if (!cancelled) setDiff(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash, mvu]);

  if (loading) return <div style={emptyStyle}>计算差异中...</div>;
  if (error) return <div style={{ ...emptyStyle, color: '#c62828' }}>❌ {error}</div>;
  if (!diff) return <div style={emptyStyle}>无差异</div>;

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>⚖ 差异对比(当前状态 → 选中节点)</h4>

      {/* 总览 */}
      <div style={{
        padding: 10,
        marginBottom: 12,
        background: THEME_VARS.bg,
        borderRadius: 6,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        fontSize: 11,
      }}>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>总变化:</span>
          <strong style={{ color: THEME_VARS.text, marginLeft: 4, fontSize: 14 }}>{diff.totalChanges}</strong>
        </span>
        <span style={{ color: THEME_VARS.success }}>
          ➕ 新增: <strong>{diff.added.length}</strong>
        </span>
        <span style={{ color: '#e53935' }}>
          ➖ 删除: <strong>{diff.removed.length}</strong>
        </span>
        <span style={{ color: THEME_VARS.warning }}>
          ✏ 修改: <strong>{diff.changed.length}</strong>
        </span>
      </div>

      {/* 详细变化列表 */}
      <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {diff.totalChanges === 0 ? (
          <div style={emptyStyle}>无差异(完全一致)</div>
        ) : (
          <>
            {/* 修改的字段 */}
            {diff.changed.length > 0 && (
              <DiffSection
                title="✏ 修改的字段"
                color={THEME_VARS.warning}
                items={diff.changed.map((c) => ({
                  path: c.path,
                  detail: `${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`,
                }))}
              />
            )}

            {/* 新增的字段 */}
            {diff.added.length > 0 && (
              <DiffSection
                title="➕ 新增的字段"
                color={THEME_VARS.success}
                items={diff.added.map((c) => ({
                  path: c.path,
                  detail: `= ${JSON.stringify(c.value)}`,
                }))}
              />
            )}

            {/* 删除的字段 */}
            {diff.removed.length > 0 && (
              <DiffSection
                title="➖ 删除的字段"
                color="#e53935"
                items={diff.removed.map((c) => ({
                  path: c.path,
                  detail: `(原) ${JSON.stringify(c.oldValue)}`,
                }))}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function DiffSection({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: Array<{ path: string; detail: string }>;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        marginBottom: 6,
        padding: '4px 8px',
        background: color + '11',
        borderRadius: 6,
        border: `1px solid ${color}33`,
      }}>
        {title}({items.length})
      </div>
      <div style={{
        padding: 8,
        background: THEME_VARS.bg,
        borderRadius: 6,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        fontFamily: 'monospace',
        fontSize: 10,
      }}>
        {items.slice(0, 50).map((item, idx) => (
          <div key={idx} style={{
            marginBottom: 4,
            paddingBottom: 4,
            borderBottom: idx < items.length - 1 && idx < 49 ? `1px dashed ${THEME_VARS.borderSoft}` : 'none',
          }}>
            <div style={{ color: color, fontWeight: 600, wordBreak: 'break-all' }}>
              {item.path}
            </div>
            <div style={{ color: THEME_VARS.textMuted, marginLeft: 8, wordBreak: 'break-all' }}>
              {item.detail}
            </div>
          </div>
        ))}
        {items.length > 50 && (
          <div style={{ color: THEME_VARS.textMuted, fontStyle: 'italic' }}>
            ... 还有 {items.length - 50} 项未展示
          </div>
        )}
      </div>
    </div>
  );
}
