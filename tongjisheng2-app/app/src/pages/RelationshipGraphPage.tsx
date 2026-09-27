import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Modal, EmptyState } from '@ui/base';
import { relationshipGraph } from '@runtime/npc/relationship-graph';
import { HEROINE_LIST } from '@content/npc/schedule-data';
import type { RelationType } from '@content/npc/relationship-data';
import type { MvuRuntime } from '@runtime/mvu-runtime';
import { useSaveStore } from '@stores/index';

/**
 * RelationshipGraphPage · 关系图谱页(路由级)
 * 对齐 fanren-remake 的 RelationshipGraphDialog + FactionCodexDialog:
 *  - 女角关系网络(圆环布局,静态关系边 + 玩家-女角好感度动态边)
 *  - 点击女角 → 详情对话框(好感/关系阶段/与她的关系网/记忆摘要)
 *  - 关系类型图例
 */

const RELATION_TYPE_COLORS: Record<string, string> = {
  母女: '#e91e63',
  姐妹: '#ad1457',
  朋友: '#4caf50',
  同班: '#2196f3',
  同社团: '#009688',
  情敌: '#f44336',
  师生: '#ff9800',
  邻居: '#9e9e9e',
};

const RELATION_TYPE_LABELS: Record<string, string> = {
  母女: '母女',
  姐妹: '姐妹',
  朋友: '朋友',
  同班: '同班',
  同社团: '同社团',
  情敌: '情敌',
  师生: '师生',
  邻居: '邻居',
};

const STAGE_COLORS: Record<string, string> = {
  初识: '#90caf9',
  熟悉: '#64b5f6',
  暧昧: '#ba68c8',
  心动: '#e91e63',
  亲密: '#d81b60',
  攻略完成: '#ad1457',
  决裂: '#9e9e9e',
};

interface HeroineLiveState {
  id: number;
  name: string;
  favorability: number;
  stage: string;
  isCurrent: boolean;
}

export function RelationshipGraphPage() {
  const navigate = useNavigate();
  const kernelRef = useSaveStore((s) => s.kernelRef);
  const [selected, setSelected] = useState<HeroineLiveState | null>(null);

  const mvu: MvuRuntime | undefined = kernelRef.current?.getMvuRuntime();

  // 女角实时状态(好感度/关系阶段)
  const liveStates = useMemo<HeroineLiveState[]>(() => {
    const sd = mvu?.snapshot() ?? {};
    const current = (sd.当前女角 ?? {}) as Record<string, unknown>;
    const heroines = (sd.女角 ?? {}) as Record<string, Record<string, unknown>>;
    const list: HeroineLiveState[] = [];
    if (current.姓名 && current.姓名 !== '无') {
      list.push({
        id: HEROINE_LIST.find((h) => h.name === current.姓名)?.id ?? -1,
        name: String(current.姓名),
        favorability: Number(current.好感度 ?? 0),
        stage: String(current.关系阶段 ?? '初识'),
        isCurrent: true,
      });
    }
    for (const [name, m] of Object.entries(heroines)) {
      if (list.some((h) => h.name === name)) continue;
      list.push({
        id: HEROINE_LIST.find((h) => h.name === name)?.id ?? -1,
        name,
        favorability: Number(m.好感度 ?? 0),
        stage: String(m.关系阶段 ?? '初识'),
        isCurrent: false,
      });
    }
    return list;
  }, [mvu]);

  // 圆环布局:玩家中心 + 女角环绕
  const layout = useMemo(() => {
    const W = 720;
    const H = 560;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) / 2 - 90;
    const positions = HEROINE_LIST.map((h, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(HEROINE_LIST.length, 1) - Math.PI / 2;
      return {
        id: h.id,
        name: h.name,
        hidden: h.hidden,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
      };
    });
    return { W, H, cx, cy, positions };
  }, []);

  const liveById = useMemo(() => {
    const map = new Map<number, HeroineLiveState>();
    for (const s of liveStates) map.set(s.id, s);
    return map;
  }, [liveStates]);

  // 静态关系边(去重:同对只保留一条,取强度高者)
  const edges = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ a: number; b: number; type: RelationType; strength: number; note?: string }> = [];
    for (const edge of relationshipGraph.getAllEdges?.() ?? []) {
      const key = [edge.a, edge.b].sort((x, y) => x - y).join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(edge);
    }
    return result;
  }, []);

  const playerName = String((mvu?.snapshot()?.主角 as { 玩家姓名?: string } | undefined)?.玩家姓名 ?? '玩家');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            🕸 关系图谱
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            {playerName} 与 {HEROINE_LIST.length} 位女角的关系网络 · 静态关系边 + 动态好感度
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← 返回
        </Button>
      </div>

      {/* 图例 */}
      <Card>
        <div style={{ padding: '10px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: 'var(--c-text-muted)' }}>关系类型:</span>
          {Object.entries(RELATION_TYPE_LABELS).map(([t, label]) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: RELATION_TYPE_COLORS[t] }} />
              {label}
            </span>
          ))}
          <span style={{ color: 'var(--c-text-muted)', marginLeft: 8 }}>| 玩家边颜色=关系阶段:</span>
          {Object.entries(STAGE_COLORS).slice(0, 4).map(([t, c]) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c }} />
              {t}
            </span>
          ))}
        </div>
      </Card>

      {/* 图谱 SVG */}
      <Card>
        <div style={{ padding: 10, display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
          <svg
            width={layout.W}
            height={layout.H}
            style={{ background: 'var(--c-bg)', borderRadius: 12, border: '1px solid var(--c-border-soft)', maxWidth: '100%', height: 'auto' }}
          >
            {/* 静态关系边 */}
            {edges.map((e) => {
              const pa = layout.positions.find((p) => p.id === e.a);
              const pb = layout.positions.find((p) => p.id === e.b);
              if (!pa || !pb) return null;
              return (
                <g key={`${e.a}-${e.b}`}>
                  <line
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke={RELATION_TYPE_COLORS[e.type] ?? '#9e9e9e'}
                    strokeWidth={Math.max(1, e.strength / 40)}
                    strokeOpacity={0.55}
                  />
                  <title>{`${pa.name} ↔ ${pb.name}:${RELATION_TYPE_LABELS[e.type] ?? e.type}(${e.strength})${e.note ? '\n' + e.note : ''}`}</title>
                </g>
              );
            })}

            {/* 玩家-女角动态边 */}
            {liveStates
              .filter((s) => s.id > 0)
              .map((s) => {
                const pos = layout.positions.find((p) => p.id === s.id);
                if (!pos) return null;
                const color = STAGE_COLORS[s.stage] ?? '#90caf9';
                const strong = s.favorability > 30 || s.stage === '亲密' || s.stage === '攻略完成';
                return (
                  <line
                    key={`player-${s.id}`}
                    x1={layout.cx}
                    y1={layout.cy}
                    x2={pos.x}
                    y2={pos.y}
                    stroke={color}
                    strokeWidth={strong ? 2.5 : 1.2}
                    strokeOpacity={0.8}
                    strokeDasharray={s.isCurrent ? undefined : '4 3'}
                  />
                );
              })}

            {/* 玩家节点 */}
            <circle cx={layout.cx} cy={layout.cy} r={30} fill="var(--c-primary)" stroke="#fff" strokeWidth={2.5} />
            <text x={layout.cx} y={layout.cy + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>
              {playerName.slice(0, 4)}
            </text>

            {/* 女角节点 */}
            {layout.positions.map((p) => {
              const live = liveById.get(p.id);
              const color = live ? STAGE_COLORS[live.stage] ?? '#bdbdbd' : '#bdbdbd';
              const r = live?.isCurrent ? 22 : 17;
              return (
                <g
                  key={p.id}
                  onClick={() => live && setSelected(live)}
                  style={{ cursor: live ? 'pointer' : 'default' }}
                >
                  <circle cx={p.x} cy={p.y} r={r} fill={color} stroke={live?.isCurrent ? 'var(--c-primary)' : '#fff'} strokeWidth={live?.isCurrent ? 3 : 1.5} opacity={live ? 0.95 : 0.35} />
                  <text x={p.x} y={p.y + r + 12} textAnchor="middle" fill="var(--c-text)" fontSize={10} fontWeight={live?.isCurrent ? 600 : 400}>
                    {p.name.slice(0, 5)}
                  </text>
                  {live && (
                    <text x={p.x} y={p.y + r + 24} textAnchor="middle" fill="var(--c-text-muted)" fontSize={9}>
                      {live.stage} · {live.favorability > 0 ? '+' : ''}{live.favorability}
                    </text>
                  )}
                  {!live && (
                    <text x={p.x} y={p.y + r + 24} textAnchor="middle" fill="var(--c-text-soft)" fontSize={9}>
                      {p.hidden ? '未解锁' : '未见面'}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* 关系明细表 */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>静态关系明细({edges.length})</h3>
        </div>
        <div style={{ padding: '8px 18px 14px' }}>
          {edges.length === 0 ? (
            <EmptyState icon="🕸" title="暂无关系数据" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {edges.map((e) => {
                const na = HEROINE_LIST.find((h) => h.id === e.a)?.name ?? `#${e.a}`;
                const nb = HEROINE_LIST.find((h) => h.id === e.b)?.name ?? `#${e.b}`;
                return (
                  <div key={`${e.a}-${e.b}`} style={{ padding: 8, background: 'var(--c-overlay)', border: '1px solid var(--c-border-soft)', borderRadius: 8, fontSize: 11 }}>
                    <div style={{ color: 'var(--c-text)', fontWeight: 500 }}>
                      <Badge variant="info">{RELATION_TYPE_LABELS[e.type] ?? e.type}</Badge>{' '}
                      {na} ↔ {nb}
                    </div>
                    {e.note && <div style={{ color: 'var(--c-text-muted)', marginTop: 3, lineHeight: 1.5 }}>{e.note}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 女角详情对话框 */}
      <HeroineDetailDialog
        open={!!selected}
        data={selected}
        onClose={() => setSelected(null)}
        related={selected ? buildRelated(selected, edges) : []}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  女角详情对话框
// ───────────────────────────────────────────────────────────

interface RelatedInfo {
  name: string;
  type: string;
  note?: string;
}

function buildRelated(
  heroine: HeroineLiveState,
  edges: Array<{ a: number; b: number; type: RelationType; strength: number; note?: string }>,
): RelatedInfo[] {
  const list: RelatedInfo[] = [];
  for (const e of edges) {
    if (e.a === heroine.id) {
      list.push({ name: HEROINE_LIST.find((h) => h.id === e.b)?.name ?? `#${e.b}`, type: e.type, note: e.note });
    } else if (e.b === heroine.id) {
      list.push({ name: HEROINE_LIST.find((h) => h.id === e.a)?.name ?? `#${e.a}`, type: e.type, note: e.note });
    }
  }
  return list;
}

function HeroineDetailDialog({
  open,
  data,
  onClose,
  related,
}: {
  open: boolean;
  data: HeroineLiveState | null;
  onClose: () => void;
  related: RelatedInfo[];
}) {
  if (!data) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${data.name} · 女角档案`}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Badge variant={data.isCurrent ? 'success' : 'info'}>
            {data.isCurrent ? '★ 当前在场女角' : '未在场'}
          </Badge>
          <Badge>好感度 {data.favorability}</Badge>
          <Badge variant="info">关系阶段:{data.stage}</Badge>
        </div>

        <div>
          <h4 style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--c-text)' }}>关系网({related.length})</h4>
          {related.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>暂无静态关系记录</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {related.map((r, i) => (
                <div key={i} style={{ padding: 8, background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)', borderRadius: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--c-primary)' }}>{r.name}</span>
                  <Badge variant="info" >{RELATION_TYPE_LABELS[r.type] ?? r.type}</Badge>
                  {r.note && <div style={{ color: 'var(--c-text-muted)', fontSize: 11, marginTop: 2 }}>{r.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: 'var(--c-text-soft)' }}>
          提示:通过主聊天行动与她互动可提升好感;关系阶段影响可触发的事件与约会选项。
        </div>
      </div>
    </Modal>
  );
}
