import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, EmptyState, Input, Select, useToast, Modal } from '@ui/base';
import {
  getHeroineMemories,
  getMemoriesByType,
  clearHeroineMemories,
  clearAllMemories,
  computeAttitudeModifier,
  type MemoryType,
  type NpcMemoryEntry,
} from '@runtime/npc/memory';
import { HEROINE_LIST } from '@content/npc/schedule-data';

/**
 * MemoryPage · 叙事记忆页(路由级)
 * 对齐 fanren-remake 的 VectorPage + NarrativeMemorySettings:
 *  - 按女角/类型筛选 + 关键词搜索
 *  - 态度修正预览(记忆 → 女角对玩家态度)
 *  - 记忆导出/清除
 */

const TYPE_LABELS: Record<MemoryType, string> = {
  player_interaction: '💬 与玩家互动',
  npc_interaction: '👥 NPC 互动',
  plot_event: '📖 剧情事件',
  relationship_change: '💗 关系变化',
  jealousy_event: '🔥 嫉妒事件',
  rejection: '💔 被拒绝',
  kindness: '🎁 受到善意',
};

const TYPE_KEYS = Object.keys(TYPE_LABELS) as MemoryType[];

export function MemoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [heroineId, setHeroineId] = useState<number | 'all'>('all');
  const [type, setType] = useState<MemoryType | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [memories, setMemories] = useState<NpcMemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<NpcMemoryEntry | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let list: NpcMemoryEntry[] = [];
      if (heroineId === 'all') {
        // 全部女角:逐个读
        const perHeroine = await Promise.all(
          HEROINE_LIST.filter((h) => !h.hidden).map((h) => getHeroineMemories(h.id)),
        );
        list = perHeroine.flat();
      } else if (type === 'all') {
        list = await getHeroineMemories(heroineId);
      } else {
        list = await getMemoriesByType(heroineId, type);
      }
      list.sort((a, b) => b.timestamp - a.timestamp);
      setMemories(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroineId, type]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return memories;
    const kw = keyword.trim().toLowerCase();
    return memories.filter(
      (m) =>
        m.content.toLowerCase().includes(kw) ||
        (m.impact ?? '').toLowerCase().includes(kw) ||
        (m.relatedHeroineId != null
          ? HEROINE_LIST.find((h) => h.id === m.relatedHeroineId)?.name.toLowerCase().includes(kw)
          : false),
    );
  }, [memories, keyword]);

  const attitudeModifier = useMemo(() => {
    if (heroineId === 'all') return null;
    return computeAttitudeModifier(memories);
  }, [heroineId, memories]);

  const handleClearHeroine = async () => {
    if (heroineId === 'all') return;
    const name = HEROINE_LIST.find((h) => h.id === heroineId)?.name ?? String(heroineId);
    if (!window.confirm(`确认清除 ${name} 的全部叙事记忆吗?此操作不可撤销。`)) return;
    await clearHeroineMemories(heroineId);
    toast.success(`已清除 ${name} 的记忆`);
    void load();
  };

  const handleClearAll = async () => {
    if (!window.confirm('确认清除全部女角的叙事记忆吗?此操作不可撤销。')) return;
    await clearAllMemories();
    toast.success('已清除全部记忆');
    void load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            🧠 叙事记忆
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            NPC 记忆库:互动/事件/关系变化,影响女角对玩家的态度
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← 返回
        </Button>
      </div>

      {/* 筛选区 */}
      <Card>
        <div style={{ padding: '12px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 150, flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 4 }}>女角</div>
            <Select
              value={String(heroineId)}
              options={[
                { value: 'all', label: '全部女角' },
                ...HEROINE_LIST.filter((h) => !h.hidden).map((h) => ({
                  value: String(h.id),
                  label: h.name,
                })),
              ]}
              onChange={(e) => setHeroineId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            />
          </div>
          <div style={{ minWidth: 160, flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 4 }}>类型</div>
            <Select
              value={type}
              options={[
                { value: 'all', label: '全部类型' },
                ...TYPE_KEYS.map((t) => ({ value: t, label: TYPE_LABELS[t] })),
              ]}
              onChange={(e) => setType(e.target.value as MemoryType | 'all')}
            />
          </div>
          <div style={{ minWidth: 180, flex: 2 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 4 }}>关键词</div>
            <Input placeholder="搜索记忆内容…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <Button variant="ghost" onClick={() => void load()}>
            ↻ 刷新
          </Button>
        </div>
      </Card>

      {/* 态度修正预览 */}
      {attitudeModifier !== null && (
        <Card>
          <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--c-text)' }}>
              {HEROINE_LIST.find((h) => h.id === heroineId)?.name} 对玩家态度修正:
            </span>
            <Badge variant={attitudeModifier >= 0 ? 'success' : 'danger'}>
              {attitudeModifier >= 0 ? '+' : ''}{attitudeModifier}
            </Badge>
            <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
              基于 {memories.length} 条记忆计算(善意↑/拒绝↓/嫉妒↓)
            </span>
          </div>
        </Card>
      )}

      {/* 记忆列表 */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>
            记忆列表({filtered.length})
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={handleClearHeroine} disabled={heroineId === 'all'}>
              清除当前女角
            </Button>
            <Button variant="danger" size="sm" onClick={handleClearAll}>
              清除全部
            </Button>
          </div>
        </div>
        <div style={{ padding: '8px 18px 14px' }}>
          {loading ? (
            <EmptyState icon="⏳" title="加载中…" />
          ) : filtered.length === 0 ? (
            <EmptyState icon="🧠" title="暂无记忆" description="女角与玩家的互动会自动记录为叙事记忆" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setDetail(m)}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--c-bg)',
                    border: '1px solid var(--c-border-soft)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--c-border-soft)')}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <Badge variant="info">{TYPE_LABELS[m.type]}</Badge>
                    <span style={{ fontSize: 12, color: 'var(--c-text)' }}>
                      {HEROINE_LIST.find((h) => h.id === m.heroineId)?.name ?? `#${m.heroineId}`}
                    </span>
                    {m.relatedHeroineId != null && (
                      <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
                        ↔ {HEROINE_LIST.find((h) => h.id === m.relatedHeroineId)?.name ?? `#${m.relatedHeroineId}`}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--c-text-soft)', marginLeft: 'auto' }}>
                      第 {m.dayCount} 天 · {new Date(m.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6 }}>{m.content}</div>
                  {m.impact && <div style={{ fontSize: 11, color: 'var(--c-primary)', marginTop: 3 }}>⚡ {m.impact}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 记忆详情对话框 */}
      <MemoryDetailDialog open={!!detail} entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  记忆详情
// ───────────────────────────────────────────────────────────

function MemoryDetailDialog({
  open,
  entry,
  onClose,
}: {
  open: boolean;
  entry: NpcMemoryEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="记忆详情"
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge variant="info">{TYPE_LABELS[entry.type]}</Badge>
          <Badge>权重 {entry.weight ?? 0}</Badge>
          {entry.relatedHeroineId != null && <Badge variant="muted">关联 #{entry.relatedHeroineId}</Badge>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: 1.8, padding: 10, background: 'var(--c-bg)', borderRadius: 8 }}>
          {entry.content}
        </div>
        {entry.impact && (
          <div style={{ fontSize: 12, color: 'var(--c-primary)', padding: 8, background: 'var(--c-primary-glow)', borderRadius: 8 }}>
            ⚡ 影响:{entry.impact}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--c-text-soft)' }}>
          第 {entry.dayCount} 天 · 记录于 {new Date(entry.timestamp).toLocaleString('zh-CN')} · ID {entry.id.slice(0, 12)}…
        </div>
      </div>
    </Modal>
  );
}
