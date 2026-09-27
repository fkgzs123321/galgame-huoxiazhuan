import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, EmptyState, Progress, Modal } from '@ui/base';
import {
  getTokenStats,
  getTokenUsageRecords,
  clearTokenStats,
  getAiCallHistory,
  listModels,
  type TokenUsageRecord,
} from '@gateway/index';
import { useConfigStore } from '@stores/index';

/**
 * LLMDebugPage · LLM 调试台(路由级)
 * 对齐 fanren-remake 的 LLMDebugPage + EndpointLibrary:
 *  - token 统计面板(总调用/累计 token/费用估算/按 profile 分解)
 *  - 调用历史(来自 modelLibrary + traceBus)
 *  - 模型拉取测试(端点 → 模型列表)
 */

export function LLMDebugPage() {
  const navigate = useNavigate();
  const config = useConfigStore((s) => s.config);
  const [records, setRecords] = useState<TokenUsageRecord[]>([]);
  const [history, setHistory] = useState<Array<{ turnId: string; step: string; detail: string; ts: number }>>([]);
  const [modelProbe, setModelProbe] = useState<{ models: string[]; error?: string; loading?: boolean }>({ models: [] });
  const [detail, setDetail] = useState<TokenUsageRecord | null>(null);

  const refresh = () => {
    setRecords(getTokenUsageRecords());
    setHistory(getAiCallHistory(30));
  };

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => getTokenStats(), [records]);

  const mainEndpoint = config.endpoints.find((e) => e.profileId === 'main-chat');

  const handleProbeModels = async () => {
    if (!mainEndpoint?.baseURL || !mainEndpoint.apiKey) return;
    setModelProbe({ models: [], loading: true });
    const r = await listModels(mainEndpoint.baseURL, mainEndpoint.apiKey, true);
    setModelProbe({
      models: r.models.map((m) => m.id),
      error: r.error,
      loading: false,
    });
  };

  const fmt = (n: number) => n.toLocaleString('zh-CN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            🧪 LLM 调试台
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            Token 统计 · 费用估算 · 调用历史 · 模型探测
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={refresh}>
            ↻ 刷新
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              clearTokenStats();
              refresh();
            }}
          >
            🗑 清空统计
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ← 返回
          </Button>
        </div>
      </div>

      {/* Token 统计总览 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <StatCard label="总调用次数" value={String(stats.totalCalls)} icon="📞" />
        <StatCard label="累计 Prompt tokens" value={fmt(stats.totalPromptTokens)} icon="📤" />
        <StatCard label="累计 Completion tokens" value={fmt(stats.totalCompletionTokens)} icon="📥" />
        <StatCard label="估算 token(无 usage 时)" value={fmt(stats.totalEstimatedTokens)} icon="🔢" />
        <StatCard label="估算费用" value={`¥${stats.totalCostYuan.toFixed(4)}`} icon="💰" accent />
      </div>

      {/* 按 profile 分解 */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>按 AI 角色分解</h3>
        </div>
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.keys(stats.byProfile).length === 0 ? (
            <EmptyState icon="📭" title="暂无调用记录" description="完成一次 AI 回合后这里会显示 token 统计" />
          ) : (
            Object.entries(stats.byProfile).map(([profileId, p]) => (
              <div key={profileId} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Badge variant="info" style={{ minWidth: 110 }}>{profileId}</Badge>
                <span style={{ fontSize: 12, color: 'var(--c-text)' }}>{p.calls} 次</span>
                <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{fmt(p.tokens)} tokens</span>
                <span style={{ fontSize: 12, color: 'var(--c-accent)', fontWeight: 600 }}>¥{p.costYuan.toFixed(4)}</span>
                <Progress value={Math.min(100, (p.tokens / Math.max(1, Math.max(...Object.values(stats.byProfile).map((x) => x.tokens)))) * 100)} size="sm" style={{ flex: 1, minWidth: 80 }} />
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 模型探测 */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>模型探测(主聊天端点)</h3>
          <Button variant="secondary" size="sm" onClick={() => void handleProbeModels()} disabled={modelProbe.loading || !mainEndpoint?.baseURL}>
            {modelProbe.loading ? '探测中…' : '📡 拉取模型列表'}
          </Button>
        </div>
        <div style={{ padding: '12px 18px' }}>
          {modelProbe.loading ? (
            <EmptyState icon="⏳" title="正在拉取模型列表…" />
          ) : modelProbe.models.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {modelProbe.models.map((m) => (
                <Badge key={m} variant="info" style={{ fontSize: 11 }}>{m}</Badge>
              ))}
              <div style={{ width: '100%', fontSize: 11, color: 'var(--c-text-muted)', marginTop: 4 }}>
                共 {modelProbe.models.length} 个模型
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
              {modelProbe.error ?? '点击「拉取模型列表」查看端点可用模型(需已配置主聊天端点)'}
            </div>
          )}
        </div>
      </Card>

      {/* 最近调用 */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>Token 调用记录({records.length})</h3>
        </div>
        <div style={{ padding: '8px 18px 14px' }}>
          {records.length === 0 ? (
            <EmptyState icon="📭" title="暂无调用记录" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
              {records.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setDetail(r)}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--c-bg)',
                    border: '1px solid var(--c-border-soft)',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Badge variant={r.ok ? 'success' : 'danger'}>{r.ok ? '✓' : '✗'}</Badge>
                  <Badge variant="info">{r.profileId}</Badge>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--c-primary)' }}>{r.model}</span>
                  <span style={{ color: 'var(--c-text-muted)' }}>
                    {r.promptTokens != null ? `P${r.promptTokens}` : 'P?'} / {r.completionTokens != null ? `C${r.completionTokens}` : 'C?'}
                    {r.promptTokens == null && r.completionTokens == null ? `(估算 ${r.estimatedTokens})` : ''}
                  </span>
                  <span style={{ color: 'var(--c-text-soft)' }}>{r.elapsedMs}ms</span>
                  {r.costYuan != null && <span style={{ color: 'var(--c-accent)', fontWeight: 600 }}>¥{r.costYuan.toFixed(5)}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--c-text-soft)' }}>
                    {new Date(r.ts).toLocaleTimeString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* AI 调用历史(traceBus) */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>AI 调用历史(最近 {history.length})</h3>
        </div>
        <div style={{ padding: '8px 18px 14px' }}>
          {history.length === 0 ? (
            <EmptyState icon="📭" title="暂无历史" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {history.slice(0, 20).map((h, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)', borderRadius: 6, fontSize: 11 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-primary)' }}>{h.turnId.slice(0, 14)}</span>
                  <span style={{ color: 'var(--c-text-muted)', marginLeft: 8 }}>{h.step}</span>
                  <div style={{ color: 'var(--c-text-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 调用详情对话框 */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="调用详情"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            关闭
          </Button>
        }
      >
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant={detail.ok ? 'success' : 'danger'}>{detail.ok ? '成功' : '失败'}</Badge>
              <Badge variant="info">{detail.profileId}</Badge>
              <Badge>{detail.model}</Badge>
            </div>
            <Row label="Prompt tokens" value={detail.promptTokens != null ? fmt(detail.promptTokens) : '未返回(估算)'} />
            <Row label="Completion tokens" value={detail.completionTokens != null ? fmt(detail.completionTokens) : '未返回(估算)'} />
            <Row label="估算 token" value={fmt(detail.estimatedTokens)} />
            <Row label="耗时" value={`${detail.elapsedMs}ms`} />
            <Row label="估算费用" value={`¥${(detail.costYuan ?? 0).toFixed(5)}`} />
            <Row label="时间" value={new Date(detail.ts).toLocaleString('zh-CN')} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件
// ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <Card style={{ padding: '14px 18px' }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? 'var(--c-accent)' : 'var(--c-primary)', marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 2 }}>{label}</div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--c-bg)', borderRadius: 6 }}>
      <span style={{ color: 'var(--c-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--c-text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
