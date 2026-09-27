import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, EmptyState, Select, Modal } from '@ui/base';
import { traceBus, type RuntimeTraceCategory, type RuntimeTraceEntry, type TurnTrace } from '@runtime/trace-bus';

/**
 * LogCenterPage · 日志中心页(路由级)
 * 对齐 fanren-remake 的 LogCenterPage + LLMDebugPage:
 *  - 回合 Trace 汇总(按时间倒序)
 *  - 类别过滤 / 搜索 / 展开详情
 *  - 复制 / 导出日志
 */

const CATEGORY_LABELS: Record<RuntimeTraceCategory, string> = {
  aiCall: '🤖 AI 调用',
  getwiLoad: '📥 getwi 加载',
  variableUpdate: '🔧 变量变更',
  worldbookHit: '📚 世界书命中',
  presetApply: '📦 预设应用',
  gatewayLatency: '⏱ 网关延迟',
  promptAsm: '🧩 Prompt 组装',
  kernel: '⚙️ Kernel',
  npc: '👥 NPC',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as RuntimeTraceCategory[];

export function LogCenterPage() {
  const navigate = useNavigate();
  const [turns, setTurns] = useState<TurnTrace[]>([]);
  const [category, setCategory] = useState<RuntimeTraceCategory | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [detailTurn, setDetailTurn] = useState<TurnTrace | null>(null);

  useEffect(() => {
    setTurns(traceBus.recentTurns(50));
    // 订阅实时更新
    const unsub = traceBus.subscribe(() => {
      setTurns(traceBus.recentTurns(50));
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return turns.filter((t) => {
      if (category !== 'all' && !t.entries.some((e) => e.category === category)) return false;
      if (kw) {
        const text = [t.turnId, t.context.userAction, ...t.entries.map((e) => `${e.step} ${e.detail}`)]
          .join(' ')
          .toLowerCase();
        if (!text.includes(kw)) return false;
      }
      return true;
    });
  }, [turns, category, keyword]);

  const handleCopy = async (t: TurnTrace) => {
    const text = formatTurn(t);
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制回合日志到剪贴板');
    } catch {
      // 剪贴板不可用时降级
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleExportAll = () => {
    const text = filtered.map(formatTurn).join('\n\n' + '═'.repeat(50) + '\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dosokyosei2-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            📋 日志中心
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            Runtime Trace 汇总 · 最近 {turns.length} 个回合
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleExportAll} disabled={filtered.length === 0}>
            📤 导出日志
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ← 返回
          </Button>
        </div>
      </div>

      {/* 过滤 */}
      <Card>
        <div style={{ padding: '12px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180, flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 4 }}>类别</div>
            <Select
              value={category}
              options={[
                { value: 'all', label: '全部类别' },
                ...CATEGORY_KEYS.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
              ]}
              onChange={(e) => setCategory(e.target.value as RuntimeTraceCategory | 'all')}
            />
          </div>
          <div style={{ minWidth: 200, flex: 2 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 4 }}>搜索</div>
            <input
              className="th-input"
              placeholder="回合 ID / 玩家动作 / 步骤 / 详情…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Button variant="ghost" onClick={() => setTurns(traceBus.recentTurns(50))}>
            ↻ 刷新
          </Button>
        </div>
      </Card>

      {/* 回合列表 */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>回合日志({filtered.length})</h3>
        </div>
        <div style={{ padding: '8px 18px 14px' }}>
          {filtered.length === 0 ? (
            <EmptyState icon="📭" title="暂无日志" description="开始游戏并触发回合后,这里会显示运行时的 Trace 记录" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto' }}>
              {filtered.map((t) => {
                const entryCount = t.entries.length;
                const cats = new Set(t.entries.map((e) => e.category));
                return (
                  <div
                    key={t.turnId}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--c-bg)',
                      border: '1px solid var(--c-border-soft)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => setDetailTurn(t)}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--c-border-soft)')}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--c-primary)' }}>
                        {t.turnId.slice(0, 16)}
                      </span>
                      <Badge variant={t.ok === false ? 'danger' : t.done ? 'success' : 'warning'}>
                        {t.ok === false ? '失败' : t.done ? `完成 ${t.elapsedMs ?? 0}ms` : '进行中'}
                      </Badge>
                      <Badge variant="muted">{entryCount} 条</Badge>
                      {t.context.dayCount != null && (
                        <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
                          第 {t.context.dayCount} 天 {t.context.timeSlot ?? ''}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--c-text-soft)', marginLeft: 'auto' }}>
                        {new Date(t.startedAt).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                    {t.context.userAction && (
                      <div style={{ fontSize: 12, color: 'var(--c-text)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🎮 {t.context.userAction}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                      {CATEGORY_KEYS.filter((c) => cats.has(c)).slice(0, 6).map((c) => (
                        <Badge key={c} variant="info" style={{ fontSize: 10, padding: '1px 6px' }}>
                          {CATEGORY_LABELS[c]}
                        </Badge>
                      ))}
                      {cats.size > 6 && <Badge variant="muted" style={{ fontSize: 10, padding: '1px 6px' }}>+{cats.size - 6}</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 回合详情对话框 */}
      <TurnDetailDialog
        open={!!detailTurn}
        turn={detailTurn}
        onClose={() => setDetailTurn(null)}
        onCopy={handleCopy}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  详情对话框
// ───────────────────────────────────────────────────────────

function TurnDetailDialog({
  open,
  turn,
  onClose,
  onCopy,
}: {
  open: boolean;
  turn: TurnTrace | null;
  onClose: () => void;
  onCopy: (t: TurnTrace) => void;
}) {
  if (!turn) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`回合 ${turn.turnId.slice(0, 20)}`}
      size="xl"
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => onCopy(turn)}>
            📋 复制
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
          开始 {new Date(turn.startedAt).toLocaleString('zh-CN')}
          {turn.endedAt ? ` · 结束 ${new Date(turn.endedAt).toLocaleString('zh-CN')}` : ''}
          {turn.elapsedMs != null ? ` · 耗时 ${turn.elapsedMs}ms` : ''}
        </div>
        {turn.context.userAction && (
          <div style={{ fontSize: 12, color: 'var(--c-text)', padding: '6px 10px', background: 'var(--c-bg)', borderRadius: 6 }}>
            🎮 {turn.context.userAction}
          </div>
        )}
        {turn.entries.length === 0 ? (
          <EmptyState icon="📭" title="本回合无 Trace" />
        ) : (
          turn.entries.map((e, i) => (
            <TraceRow key={i} entry={e} />
          ))
        )}
      </div>
    </Modal>
  );
}

function TraceRow({ entry }: { entry: RuntimeTraceEntry }) {
  return (
    <div style={{ padding: '7px 10px', background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)', borderRadius: 6, fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge variant="info" style={{ fontSize: 10, padding: '1px 6px' }}>
          {CATEGORY_LABELS[entry.category] ?? entry.category}
        </Badge>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--c-primary)' }}>{entry.step}</span>
        <span style={{ fontSize: 10, color: 'var(--c-text-soft)', marginLeft: 'auto' }}>
          {new Date(entry.timestamp).toLocaleTimeString('zh-CN')}
        </span>
      </div>
      <div style={{ color: 'var(--c-text)', marginTop: 3, lineHeight: 1.6, wordBreak: 'break-all' }}>{entry.detail}</div>
    </div>
  );
}

function formatTurn(t: TurnTrace): string {
  const lines = [
    `回合:${t.turnId}`,
    `时间:${new Date(t.startedAt).toLocaleString('zh-CN')}`,
    `状态:${t.ok === false ? '失败' : t.done ? '完成' : '进行中'}`,
    t.context.dayCount != null ? `天数:第 ${t.context.dayCount} 天 ${t.context.timeSlot ?? ''}` : '',
    t.context.userAction ? `玩家动作:${t.context.userAction}` : '',
    ...t.entries.map((e) => `  [${e.category}] ${e.step} @${new Date(e.timestamp).toLocaleTimeString('zh-CN')}\n    ${e.detail}`),
  ];
  return lines.filter(Boolean).join('\n');
}
