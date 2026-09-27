/**
 * DebugPanel · 调试工具三件套(阶段4)
 *
 * 职责:
 *  - Trace 查看器:按回合展示运行时 trace(aiCall/getwiLoad/variableUpdate/worldbookHit/presetApply/gatewayLatency/promptAsm/kernel/npc)
 *  - 变量监视器:树形展示 stat_data,支持搜索/变更高亮
 *  - Prompt 检查器:展示最近回合的 Prompt 组装结果(messages/token/trace)
 *
 * 数据源:
 *  - traceBus(运行时 Trace 总线)
 *  - 外部传入的 mvu 运行时(读 stat_data)
 *  - 外部传入的 promptAssembler(读最近组装结果)
 *
 * 集成点:
 *  - App.tsx gamePanel === 'debug' 时渲染
 *  - GameView 快捷按钮「🧪 调试」打开本面板
 */

import { useEffect, useMemo, useState } from 'react';
import { THEME_VARS } from './types';
import { traceBus, type TurnTrace, type RuntimeTraceCategory } from '../runtime/trace-bus';
import type { MvuRuntime } from '../runtime/mvu-runtime';
import { parallelPerfVerifier, type PerfTestResult } from '../runtime/parallel-perf-verifier';
import { indexedDBPerfBenchmark, type BenchResult } from '../db/perf-benchmark';
import { ejsCacheVerifier, type EjsCacheTestResult } from '../runtime/ejs-cache-verifier';

// ───────────────────────────────────────────────────────────
//  样式
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
  maxWidth: 1100,
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 12,
  borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: THEME_VARS.fontDisplay,
  fontSize: 18,
  color: THEME_VARS.primary,
  letterSpacing: 1.5,
};

const statsStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME_VARS.textMuted,
  marginTop: 4,
  fontFamily: THEME_VARS.fontMono,
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 16,
  background: THEME_VARS.bg,
  padding: 4,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  background: active
    ? 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)'
    : 'transparent',
  color: active ? '#fff' : THEME_VARS.textMuted,
  border: 'none',
  borderRadius: 7,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  transition: 'all 0.2s ease',
  fontFamily: THEME_VARS.fontBody,
});

const btnSmallStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: THEME_VARS.overlay,
  color: THEME_VARS.textMuted,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: THEME_VARS.fontMono,
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
};

const cardStyle: React.CSSProperties = {
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
};

const turnCardStyle = (done: boolean, ok: boolean | undefined): React.CSSProperties => ({
  ...cardStyle,
  borderLeft: `3px solid ${ok === undefined ? THEME_VARS.warning : ok ? THEME_VARS.success : THEME_VARS.danger}`,
  opacity: done ? 1 : 0.85,
});

const entryStyle = (category: RuntimeTraceCategory): React.CSSProperties => ({
  padding: '6px 10px',
  margin: '4px 0',
  background: THEME_VARS.bg,
  borderRadius: 6,
  borderLeft: `2px solid ${categoryColor(category)}`,
  fontFamily: THEME_VARS.fontMono,
  fontSize: 11,
  lineHeight: 1.6,
  color: THEME_VARS.text,
});

const categoryColor = (c: RuntimeTraceCategory): string => {
  switch (c) {
    case 'aiCall': return THEME_VARS.primary;
    case 'getwiLoad': return THEME_VARS.accent;
    case 'variableUpdate': return THEME_VARS.success;
    case 'worldbookHit': return THEME_VARS.info;
    case 'presetApply': return THEME_VARS.warning;
    case 'gatewayLatency': return '#ff8c42';
    case 'promptAsm': return '#9b59b6';
    case 'kernel': return '#3498db';
    case 'npc': return '#e91e63';
  }
};

const categoryLabel: Record<RuntimeTraceCategory, string> = {
  aiCall: 'AI 调用',
  getwiLoad: 'getwi 加载',
  variableUpdate: '变量更新',
  worldbookHit: '世界书命中',
  presetApply: '预设应用',
  gatewayLatency: '网关延迟',
  promptAsm: 'Prompt 组装',
  kernel: 'Kernel',
  npc: 'NPC',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 32,
  color: THEME_VARS.textMuted,
  fontSize: 13,
};

const searchInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  borderRadius: 6,
  color: THEME_VARS.text,
  fontSize: 12,
  fontFamily: THEME_VARS.fontMono,
  width: '100%',
  boxSizing: 'border-box',
};

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface DebugPanelProps {
  /** MvuRuntime 实例(读 stat_data) */
  mvu?: MvuRuntime | null;
  /** 关闭回调 */
  onClose?: () => void;
}

type TabId = 'trace' | 'variables' | 'prompt' | 'perf';

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function DebugPanel({ mvu, onClose }: DebugPanelProps) {
  const [tab, setTab] = useState<TabId>('trace');
  const [, forceUpdate] = useState(0);

  // 订阅 traceBus 变更
  useEffect(() => {
    const unsub = traceBus.subscribe(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  const stats = useMemo(() => traceBus.stats(), []);
  void stats; // 仅触发 useMemo 重算

  return (
    <div className="panel-container" style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>🧪 调试工具 · 调试三件套</h2>
          <div style={statsStyle}>
            阶段4 · Trace 查看器 + 变量监视器 + Prompt 检查器 ·
            {' '}回合 {traceBus.allTurns().length} ·
            {' '}已完成 {traceBus.stats().completedTurns} ·
            {' '}平均 {traceBus.stats().avgTurnMs}ms ·
            {' '}最长 {traceBus.stats().maxTurnMs}ms ·
            {' '}{traceBus.isPaused() ? '⏸ 已暂停' : '▶ 收集中'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {traceBus.isPaused() ? (
            <button style={btnSmallStyle} onClick={() => { traceBus.resume(); forceUpdate((n) => n + 1); }}>
              ▶ 恢复
            </button>
          ) : (
            <button style={btnSmallStyle} onClick={() => { traceBus.pause(); forceUpdate((n) => n + 1); }}>
              ⏸ 暂停
            </button>
          )}
          <button style={btnSmallStyle} onClick={() => { traceBus.clear(); forceUpdate((n) => n + 1); }}>
            🗑 清空
          </button>
          <button
            style={btnSmallStyle}
            onClick={() => {
              const blob = new Blob([traceBus.exportJSON()], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `trace-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            ⬇ 导出
          </button>
          {onClose && (
            <button style={btnSmallStyle} onClick={onClose}>✕ 关闭</button>
          )}
        </div>
      </div>

      {/* Tab 栏 */}
      <div className="panel-tab-bar" style={tabBarStyle}>
        <button style={tabBtnStyle(tab === 'trace')} onClick={() => setTab('trace')}>
          📊 Trace 查看器
        </button>
        <button style={tabBtnStyle(tab === 'variables')} onClick={() => setTab('variables')}>
          📈 变量监视器
        </button>
        <button style={tabBtnStyle(tab === 'prompt')} onClick={() => setTab('prompt')}>
          🔍 Prompt 检查器
        </button>
        <button style={tabBtnStyle(tab === 'perf')} onClick={() => setTab('perf')}>
          ⚡ 8AI 性能验证
        </button>
      </div>

      {/* Tab 内容 */}
      {tab === 'trace' && <TraceViewer />}
      {tab === 'variables' && <VariableMonitor mvu={mvu} />}
      {tab === 'prompt' && <PromptInspector />}
      {tab === 'perf' && <PerfVerifierPanel mvu={mvu} />}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  Tab 1: Trace 查看器
// ───────────────────────────────────────────────────────────

function TraceViewer() {
  const [expandedTurn, setExpandedTurn] = useState<string | null>(null);
  const [filter, setFilter] = useState<RuntimeTraceCategory | 'all'>('all');

  const turns = traceBus.recentTurns(20);
  const stats = traceBus.stats();

  const filteredTurns = useMemo(() => {
    if (filter === 'all') return turns;
    return turns.map((t) => ({
      ...t,
      entries: t.entries.filter((e) => e.category === filter),
    })).filter((t) => t.entries.length > 0);
  }, [turns, filter]);

  return (
    <div>
      {/* 统计面板 */}
      <div style={{ ...cardStyle, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: THEME_VARS.textMuted }}>总回合:</div>
        <div style={{ fontFamily: THEME_VARS.fontMono }}>{stats.totalTurns}</div>
        <div style={{ fontSize: 12, color: THEME_VARS.textMuted }}>已完成:</div>
        <div style={{ fontFamily: THEME_VARS.fontMono }}>{stats.completedTurns}</div>
        <div style={{ fontSize: 12, color: THEME_VARS.textMuted }}>平均耗时:</div>
        <div style={{ fontFamily: THEME_VARS.fontMono }}>{stats.avgTurnMs}ms</div>
        <div style={{ fontSize: 12, color: THEME_VARS.textMuted }}>最长耗时:</div>
        <div style={{ fontFamily: THEME_VARS.fontMono, color: stats.maxTurnMs > 15000 ? THEME_VARS.danger : THEME_VARS.text }}>
          {stats.maxTurnMs}ms
        </div>
      </div>

      {/* 类别过滤 */}
      <div style={{ ...cardStyle, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>过滤类别:</span>
        <button
          style={{ ...btnSmallStyle, background: filter === 'all' ? THEME_VARS.primary : THEME_VARS.overlay, color: filter === 'all' ? '#fff' : THEME_VARS.textMuted }}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        {(Object.keys(categoryLabel) as RuntimeTraceCategory[]).map((c) => (
          <button
            key={c}
            style={{
              ...btnSmallStyle,
              background: filter === c ? categoryColor(c) : THEME_VARS.overlay,
              color: filter === c ? '#fff' : THEME_VARS.textMuted,
              borderLeft: `2px solid ${categoryColor(c)}`,
            }}
            onClick={() => setFilter(c)}
          >
            {categoryLabel[c]} ({stats.categoryCounts[c]})
          </button>
        ))}
      </div>

      {/* 回合列表 */}
      {filteredTurns.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          暂无 Trace 数据。<br />
          玩家输入动作后会自动收集 Trace。
        </div>
      ) : (
        <div>
          {filteredTurns.map((turn) => {
            const expanded = expandedTurn === turn.turnId;
            return (
              <div key={turn.turnId} style={turnCardStyle(turn.done, turn.ok)}>
                <div
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setExpandedTurn(expanded ? null : turn.turnId)}
                >
                  <div>
                    <span style={{ fontFamily: THEME_VARS.fontMono, color: THEME_VARS.textMuted }}>
                      {new Date(turn.startedAt).toLocaleTimeString()}
                    </span>
                    {' '}
                    <span style={{ color: THEME_VARS.text }}>
                      {turn.context.userAction.slice(0, 50)}
                      {turn.context.userAction.length > 50 ? '…' : ''}
                    </span>
                    {turn.context.dayCount && (
                      <span style={{ marginLeft: 8, color: THEME_VARS.textMuted, fontSize: 11 }}>
                        Day{turn.context.dayCount} {turn.context.timeSlot ?? ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
                      {turn.entries.length} 条 trace
                    </span>
                    {turn.done && (
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 8,
                        background: (turn.ok ? THEME_VARS.success : THEME_VARS.danger) + '22',
                        color: turn.ok ? THEME_VARS.success : THEME_VARS.danger,
                      }}>
                        {turn.ok ? '✓ 成功' : '✗ 失败'} · {turn.elapsedMs}ms
                      </span>
                    )}
                    <span style={{ color: THEME_VARS.textMuted }}>{expanded ? '▼' : '▶'}</span>
                  </div>
                </div>

                {expanded && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${THEME_VARS.borderSoft}` }}>
                    {turn.entries.length === 0 ? (
                      <div style={{ fontSize: 11, color: THEME_VARS.textMuted, padding: 8 }}>无 trace 条目</div>
                    ) : (
                      turn.entries.map((entry, idx) => (
                        <div key={idx} style={entryStyle(entry.category)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span>
                              <span style={{ color: categoryColor(entry.category), fontWeight: 600 }}>
                                [{categoryLabel[entry.category]}]
                              </span>
                              {' '}
                              <span style={{ color: THEME_VARS.primary }}>{entry.step}</span>
                            </span>
                            <span style={{ color: THEME_VARS.textMuted, fontSize: 10 }}>
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ color: THEME_VARS.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {entry.detail}
                          </div>
                          {entry.data !== undefined && (
                            <details style={{ marginTop: 4, fontSize: 10 }}>
                              <summary style={{ cursor: 'pointer', color: THEME_VARS.textMuted }}>展开数据</summary>
                              <pre style={{ margin: '4px 0 0', padding: 8, background: THEME_VARS.bg, borderRadius: 4, overflowX: 'auto' }}>
                                {JSON.stringify(entry.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  Tab 2: 变量监视器
// ───────────────────────────────────────────────────────────

function VariableMonitor({ mvu }: { mvu?: MvuRuntime | null }) {
  const [search, setSearch] = useState('');
  const [, forceUpdate] = useState(0);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());

  // 定时刷新(变量可能持续变更)
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const statData = mvu?.snapshot?.() ?? {};

  const toggleCollapse = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderValue = (path: string, value: unknown, depth: number): React.ReactNode => {
    if (value === null) return <span style={{ color: THEME_VARS.textMuted }}>null</span>;
    if (value === undefined) return <span style={{ color: THEME_VARS.textMuted }}>undefined</span>;
    if (typeof value === 'boolean') return <span style={{ color: THEME_VARS.info }}>{String(value)}</span>;
    if (typeof value === 'number') return <span style={{ color: THEME_VARS.warning }}>{value}</span>;
    if (typeof value === 'string') {
      const display = value.length > 80 ? value.slice(0, 80) + '…' : value;
      return <span style={{ color: THEME_VARS.success }}>"{display}"</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span style={{ color: THEME_VARS.textMuted }}>[]</span>;
      const collapsed = collapsedPaths.has(path);
      return (
        <div>
          <span
            style={{ cursor: 'pointer', color: THEME_VARS.textMuted, userSelect: 'none' }}
            onClick={() => toggleCollapse(path)}
          >
            {collapsed ? '▶' : '▼'} Array({value.length})
          </span>
          {!collapsed && (
            <div style={{ marginLeft: depth * 16 + 12 }}>
              {value.map((v, i) => (
                <div key={i} style={{ padding: '1px 0' }}>
                  <span style={{ color: THEME_VARS.textMuted, fontFamily: THEME_VARS.fontMono }}>[{i}]: </span>
                  {renderValue(`${path}[${i}]`, v, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length === 0) return <span style={{ color: THEME_VARS.textMuted }}>{'{}'}</span>;
      const collapsed = collapsedPaths.has(path);
      const filteredKeys = search
        ? keys.filter((k) => k.toLowerCase().includes(search.toLowerCase()) || path.toLowerCase().includes(search.toLowerCase()))
        : keys;
      if (filteredKeys.length === 0 && search) return null;
      return (
        <div>
          <span
            style={{ cursor: 'pointer', color: THEME_VARS.textMuted, userSelect: 'none' }}
            onClick={() => toggleCollapse(path)}
          >
            {collapsed ? '▶' : '▼'} {'{'}{keys.length} 键{'}'}
          </span>
          {!collapsed && (
            <div style={{ marginLeft: depth * 16 + 12 }}>
              {filteredKeys.map((k) => {
                const childPath = path ? `${path}.${k}` : k;
                const childValue = (value as Record<string, unknown>)[k];
                return (
                  <div key={k} style={{ padding: '1px 0' }}>
                    <span style={{ color: THEME_VARS.primary, fontFamily: THEME_VARS.fontMono }}>{k}</span>
                    <span style={{ color: THEME_VARS.textMuted }}>: </span>
                    {renderValue(childPath, childValue, depth + 1)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  const keyCount = statData ? Object.keys(statData).length : 0;

  return (
    <div>
      <div style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: THEME_VARS.textMuted }}>stat_data:</span>
        <span style={{ fontFamily: THEME_VARS.fontMono }}>{keyCount} 顶层键</span>
        <input
          style={{ ...searchInputStyle, maxWidth: 300 }}
          placeholder="🔍 搜索变量路径或键名…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={btnSmallStyle} onClick={() => forceUpdate((n) => n + 1)}>🔄 刷新</button>
      </div>

      {!mvu ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔌</div>
          MvuRuntime 未注入。<br />
          请在游戏中触发至少一回合后,通过 Kernel.getMvuRuntime() 注入。
        </div>
      ) : keyCount === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          stat_data 为空。
        </div>
      ) : (
        <div style={{ ...cardStyle, fontFamily: THEME_VARS.fontMono, fontSize: 12, lineHeight: 1.6 }}>
          {Object.keys(statData)
            .filter((k) => !search || k.toLowerCase().includes(search.toLowerCase()))
            .map((k) => (
              <div key={k} style={{ padding: '2px 0' }}>
                <span style={{ color: THEME_VARS.primary, fontWeight: 600 }}>{k}</span>
                <span style={{ color: THEME_VARS.textMuted }}>: </span>
                {renderValue(k, (statData as Record<string, unknown>)[k], 1)}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  Tab 3: Prompt 检查器
// ───────────────────────────────────────────────────────────

function PromptInspector() {
  const [expandedTurn, setExpandedTurn] = useState<string | null>(null);

  // 从 traceBus 提取 promptAsm 类别的 trace
  const promptTraces = traceBus.byCategory('promptAsm', 50);
  const promptTurns = traceBus.recentTurns(20)
    .map((t) => ({
      ...t,
      promptEntries: t.entries.filter((e) => e.category === 'promptAsm'),
    }))
    .filter((t) => t.promptEntries.length > 0);

  return (
    <div>
      <div style={{ ...cardStyle, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: THEME_VARS.textMuted }}>Prompt 组装记录:</div>
        <div style={{ fontFamily: THEME_VARS.fontMono }}>{promptTraces.length} 条</div>
        <div style={{ fontSize: 12, color: THEME_VARS.textMuted }}>含组装 trace 的回合:</div>
        <div style={{ fontFamily: THEME_VARS.fontMono }}>{promptTurns.length}</div>
      </div>

      {promptTurns.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          暂无 Prompt 组装记录。<br />
          玩家输入动作触发 2AI 调用后,组装结果会自动收集。
        </div>
      ) : (
        <div>
          {promptTurns.map((turn) => {
            const expanded = expandedTurn === turn.turnId;
            return (
              <div key={turn.turnId} style={turnCardStyle(turn.done, turn.ok)}>
                <div
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setExpandedTurn(expanded ? null : turn.turnId)}
                >
                  <div>
                    <span style={{ fontFamily: THEME_VARS.fontMono, color: THEME_VARS.textMuted }}>
                      {new Date(turn.startedAt).toLocaleTimeString()}
                    </span>
                    {' '}
                    <span style={{ color: THEME_VARS.text }}>
                      {turn.context.userAction.slice(0, 50)}
                      {turn.context.userAction.length > 50 ? '…' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
                      {turn.promptEntries.length} 条组装记录
                    </span>
                    <span style={{ color: THEME_VARS.textMuted }}>{expanded ? '▼' : '▶'}</span>
                  </div>
                </div>

                {expanded && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${THEME_VARS.borderSoft}` }}>
                    {turn.promptEntries.map((entry, idx) => (
                      <div key={idx} style={entryStyle('promptAsm')}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ color: THEME_VARS.primary, fontWeight: 600 }}>{entry.step}</span>
                        </div>
                        <div style={{ color: THEME_VARS.text, whiteSpace: 'pre-wrap' }}>{entry.detail}</div>
                        {entry.data !== undefined && (
                          <details style={{ marginTop: 4, fontSize: 10 }}>
                            <summary style={{ cursor: 'pointer', color: THEME_VARS.textMuted }}>
                              展开 Prompt(messages[])
                            </summary>
                            <pre style={{ margin: '4px 0 0', padding: 8, background: THEME_VARS.bg, borderRadius: 4, overflowX: 'auto', maxHeight: 400 }}>
                              {(() => {
                                const data = entry.data as
                                  | { messages?: Array<{ role: string; content: string }>; estimatedTokens?: number }
                                  | undefined;
                                if (!data) return JSON.stringify(entry.data, null, 2);
                                const out: string[] = [];
                                if (data.estimatedTokens !== undefined) out.push(`# 估算 tokens: ${data.estimatedTokens}`);
                                if (data.messages) {
                                  out.push(`# messages (${data.messages.length} 条):`);
                                  for (const m of data.messages) {
                                    out.push(`\n--- [${m.role}] ---`);
                                    out.push(m.content);
                                  }
                                }
                                return out.join('\n');
                              })()}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DebugPanel;

// ───────────────────────────────────────────────────────────
//  PerfVerifierPanel · 8AI 并行延迟优化验证(阶段4)
// ───────────────────────────────────────────────────────────

function PerfVerifierPanel({ mvu }: { mvu?: MvuRuntime | null }) {
  const [results, setResults] = useState<PerfTestResult[]>([]);
  const [benchResults, setBenchResults] = useState<BenchResult[]>([]);
  const [ejsResults, setEjsResults] = useState<EjsCacheTestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [runningBench, setRunningBench] = useState(false);
  const [runningEjs, setRunningEjs] = useState(false);
  const [report, setReport] = useState('');
  const [benchReport, setBenchReport] = useState('');
  const [ejsReport, setEjsReport] = useState('');

  const handleRunSuite = async () => {
    setRunning(true);
    try {
      const r = await parallelPerfVerifier.runStandardSuite();
      setResults(r);
      setReport(parallelPerfVerifier.generateReport(r));
    } catch (e) {
      setReport(`运行失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  const handleRunBench = async () => {
    setRunningBench(true);
    try {
      const r = await indexedDBPerfBenchmark.runFullSuite();
      setBenchResults(r);
      setBenchReport(indexedDBPerfBenchmark.generateReport(r));
    } catch (e) {
      setBenchReport(`运行失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunningBench(false);
    }
  };

  const handleRunEjs = async () => {
    if (!mvu) {
      setEjsReport('运行失败: MvuRuntime 未初始化');
      return;
    }
    setRunningEjs(true);
    try {
      const r = await ejsCacheVerifier.runFullSuite(mvu);
      setEjsResults(r);
      setEjsReport(ejsCacheVerifier.generateReport(r));
    } catch (e) {
      setEjsReport(`运行失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunningEjs(false);
    }
  };

  const allPassed = results.length > 0 && results.every((r) => r.passed);
  const maxTotal = results.length > 0 ? Math.max(...results.map((r) => r.metrics.totalElapsedMs)) : 0;
  const benchAllPassed = benchResults.length > 0 && benchResults.every((r) => r.passed);
  const benchMaxQuery = benchResults.length > 0
    ? Math.max(...benchResults.filter((r) => r.thresholdMs === 200).map((r) => r.elapsedMs))
    : 0;

  return (
    <div>
      {/* 8AI 并行性能验证 */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${THEME_VARS.borderSoft}` }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: THEME_VARS.primary }}>⚡ 8AI 并行延迟优化验证</h3>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            style={{
              ...btnSmallStyle,
              background: running ? THEME_VARS.borderSoft : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)',
              color: running ? THEME_VARS.textMuted : '#fff',
              border: 'none',
              padding: '8px 16px',
            }}
            onClick={handleRunSuite}
            disabled={running}
          >
            {running ? '⏳ 运行中…' : '▶ 运行 8AI 套件(6 场景)'}
          </button>
          {results.length > 0 && (
            <span style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              background: allPassed ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: allPassed ? '#4caf50' : '#f44336',
            }}>
              {allPassed ? '✓ 全部通过' : '✗ 存在失败'} · 最大耗时 {maxTotal}ms
            </span>
          )}
        </div>

        {results.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
            {results.map((r, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${r.passed ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                  background: r.passed ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8, color: r.passed ? '#4caf50' : '#f44336' }}>
                  {r.passed ? '✓' : '✗'} {r.scenarioName}
                </div>
                <div style={{ color: THEME_VARS.textMuted, marginBottom: 6, fontSize: 11 }}>
                  并发={r.config.maxConcurrency} · 预算={r.config.totalBudgetMs}ms · AI数={r.config.aiCount}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: THEME_VARS.fontMono, fontSize: 11 }}>
                  <span>总耗时:</span><span style={{ color: r.metrics.totalElapsedMs < 15000 ? '#4caf50' : '#f44336', fontWeight: 600 }}>{r.metrics.totalElapsedMs}ms</span>
                  <span>p50:</span><span>{r.metrics.p50Ms}ms</span>
                  <span>p95:</span><span>{r.metrics.p95Ms}ms</span>
                  <span>max:</span><span>{r.metrics.maxMs}ms</span>
                  <span>成功:</span><span>{r.metrics.succeeded}/{r.metrics.totalRequests}</span>
                  <span>超时:</span><span style={{ color: r.metrics.timedOut > 0 ? '#f44336' : 'inherit' }}>{r.metrics.timedOut}</span>
                  <span>预算内:</span><span style={{ color: r.metrics.withinBudget ? '#4caf50' : '#f44336' }}>{r.metrics.withinBudget ? '是' : '否'}</span>
                </div>
                {r.failureReason && (
                  <div style={{ marginTop: 6, color: '#f44336', fontSize: 11 }}>原因: {r.failureReason}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {report && (
          <details>
            <summary style={{ cursor: 'pointer', color: THEME_VARS.primary, fontSize: 12 }}>📄 8AI 文本报告</summary>
            <pre style={{
              background: THEME_VARS.bg,
              padding: 12,
              borderRadius: 8,
              fontSize: 11,
              fontFamily: THEME_VARS.fontMono,
              color: THEME_VARS.text,
              overflow: 'auto',
              border: `1px solid ${THEME_VARS.borderSoft}`,
              whiteSpace: 'pre-wrap',
            }}>
              {report}
            </pre>
          </details>
        )}

        {results.length === 0 && !running && (
          <div style={{ padding: 16, textAlign: 'center', color: THEME_VARS.textMuted, fontSize: 12 }}>
            点击上方按钮运行 8AI 并行性能验证套件(6 场景:基线/限流/保守/极限/6AI/4AI)
          </div>
        )}
      </div>

      {/* IndexedDB 性能基准 */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: THEME_VARS.primary }}>💾 IndexedDB 性能基准(查询 &lt; 200ms)</h3>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            style={{
              ...btnSmallStyle,
              background: runningBench ? THEME_VARS.borderSoft : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)',
              color: runningBench ? THEME_VARS.textMuted : '#fff',
              border: 'none',
              padding: '8px 16px',
            }}
            onClick={handleRunBench}
            disabled={runningBench}
          >
            {runningBench ? '⏳ 运行中…' : '▶ 运行 IndexedDB 基准(7 场景)'}
          </button>
          {benchResults.length > 0 && (
            <span style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              background: benchAllPassed ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: benchAllPassed ? '#4caf50' : '#f44336',
            }}>
              {benchAllPassed ? '✓ 全部通过' : '✗ 存在失败'} · 查询最大 {benchMaxQuery}ms
            </span>
          )}
        </div>

        {benchResults.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
            {benchResults.map((r, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${r.passed ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                  background: r.passed ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6, color: r.passed ? '#4caf50' : '#f44336' }}>
                  {r.passed ? '✓' : '✗'} {r.scenarioName}
                </div>
                <div style={{ color: THEME_VARS.textMuted, marginBottom: 4, fontSize: 11 }}>{r.operation}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: THEME_VARS.fontMono, fontSize: 11 }}>
                  <span>耗时:</span><span style={{ color: r.elapsedMs < r.thresholdMs ? '#4caf50' : '#f44336', fontWeight: 600 }}>{r.elapsedMs}ms</span>
                  <span>阈值:</span><span>{r.thresholdMs}ms</span>
                  <span>记录数:</span><span>{r.recordCount}</span>
                </div>
                {r.note && (
                  <div style={{ marginTop: 4, color: THEME_VARS.textMuted, fontSize: 11 }}>{r.note}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {benchReport && (
          <details>
            <summary style={{ cursor: 'pointer', color: THEME_VARS.primary, fontSize: 12 }}>📄 IndexedDB 文本报告</summary>
            <pre style={{
              background: THEME_VARS.bg,
              padding: 12,
              borderRadius: 8,
              fontSize: 11,
              fontFamily: THEME_VARS.fontMono,
              color: THEME_VARS.text,
              overflow: 'auto',
              border: `1px solid ${THEME_VARS.borderSoft}`,
              whiteSpace: 'pre-wrap',
            }}>
              {benchReport}
            </pre>
          </details>
        )}

        {benchResults.length === 0 && !runningBench && (
          <div style={{ padding: 16, textAlign: 'center', color: THEME_VARS.textMuted, fontSize: 12 }}>
            点击上方按钮运行 IndexedDB 性能基准测试(7 场景:批量写/逐行写/KV批写/索引查询/前缀查询/链式回溯/scope查询)
          </div>
        )}
      </div>
    </div>
  );
}
