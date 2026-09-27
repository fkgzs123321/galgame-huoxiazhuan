import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, EmptyState, Select, Modal } from '@ui/base';
import { HEROINE_LIST } from '@content/npc/schedule-data';
import { HEROINE_GUIDES, DAY_TO_DATE, type HeroineGuide, type GuideEvent } from '@content/guides/index';
import { scheduleEngine } from '@runtime/npc/schedule-engine';
import { plotTrigger, type PlotNode } from '@runtime/npc/plot-trigger';
import { getHeroineMemories } from '@runtime/npc/memory';
import type { MvuRuntime } from '@runtime/mvu-runtime';
import { useSaveStore } from '@stores/index';

/**
 * CharacterCodexPage · 角色图鉴页(路由级)
 * 对齐 fanren-remake 的 CharacterPage(511KB 深度人物页):
 *  - 20 女角档案:基础信息 + 攻略要点 + 关键事件链
 *  - 实时状态:好感度/关系阶段/当前位置/今日行程(与 stat_data 变量对齐)
 *  - 剧情进度:剧情节点已触发/可触发/条件未满足
 *  - 关系网:冲突关系 + 攻略关系
 *  - 信息互通:点击女角 → 详情对话框(行程/剧情/记忆)
 */

const STAGE_ORDER = ['初识', '熟悉', '暧昧', '心动', '亲密', '攻略完成'] as const;

interface LiveState {
  favorability: number;
  stage: string;
  location: string;
  isCurrent: boolean;
}

export function CharacterCodexPage() {
  const navigate = useNavigate();
  const kernelRef = useSaveStore((s) => s.kernelRef);
  const [filter, setFilter] = useState<'all' | 'pursuable' | 'unlocked'>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [memoryCounts, setMemoryCounts] = useState<Record<number, number>>({});

  const mvu: MvuRuntime | undefined = kernelRef.current?.getMvuRuntime();
  const statData = useMemo(() => mvu?.snapshot() ?? {}, [mvu]);

  // 实时状态
  const liveStates = useMemo(() => {
    const map = new Map<number, LiveState>();
    const sd = statData;
    const current = (sd.当前女角 ?? {}) as Record<string, unknown>;
    const heroines = (sd.女角 ?? {}) as Record<string, Record<string, unknown>>;
    if (current.姓名 && current.姓名 !== '无') {
      const id = HEROINE_LIST.find((h) => h.name === current.姓名)?.id;
      if (id) {
        map.set(id, {
          favorability: Number(current.好感度 ?? 0),
          stage: String(current.关系阶段 ?? '初识'),
          location: String(current.当前位置 ?? '未知'),
          isCurrent: true,
        });
      }
    }
    for (const [name, m] of Object.entries(heroines)) {
      const id = HEROINE_LIST.find((h) => h.name === name)?.id;
      if (id && !map.has(id)) {
        map.set(id, {
          favorability: Number(m.好感度 ?? 0),
          stage: String(m.关系阶段 ?? '初识'),
          location: String(m.当前位置 ?? '未知'),
          isCurrent: false,
        });
      }
    }
    return map;
  }, [statData]);

  // 已触发剧情 flag(从 stat_data 读取,与剧情引擎对齐)
  const triggeredFlags = useMemo(() => {
    const flags = new Set<string>();
    const plot = (statData.剧情已触发事件 ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(plot)) flags.add(k);
    return flags;
  }, [statData]);

  // 记忆计数
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const counts: Record<number, number> = {};
      for (const h of HEROINE_LIST) {
        try {
          const mems = await getHeroineMemories(h.id);
          counts[h.id] = mems.length;
        } catch {
          counts[h.id] = 0;
        }
      }
      if (!cancelled) setMemoryCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [statData]);

  const visible = useMemo(() => {
    return HEROINE_LIST.filter((h) => {
      if (filter === 'pursuable') return HEROINE_GUIDES.find((g) => g.id === h.id)?.pursuable;
      if (filter === 'unlocked') return liveStates.has(h.id) || !h.hidden;
      return true;
    });
  }, [filter, liveStates]);

  const guidesById = useMemo(() => {
    const map = new Map<number, HeroineGuide>();
    for (const g of HEROINE_GUIDES) map.set(g.id, g);
    return map;
  }, []);

  const selected = selectedId != null ? HEROINE_LIST.find((h) => h.id === selectedId) ?? null : null;
  const selectedLive = selectedId != null ? liveStates.get(selectedId) : undefined;
  const selectedGuide = selectedId != null ? guidesById.get(selectedId) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            📖 角色图鉴
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            20 位女角档案 · 攻略要点 · 实时状态 · 剧情进度 · 关系网
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select
            value={filter}
            options={[
              { value: 'all', label: '全部女角' },
              { value: 'pursuable', label: '可追求' },
              { value: 'unlocked', label: '已登场' },
            ]}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            style={{ minWidth: 110 }}
          />
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ← 返回
          </Button>
        </div>
      </div>

      {/* 角色卡片网格 */}
      {visible.length === 0 ? (
        <EmptyState icon="📖" title="暂无角色" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {visible.map((h) => {
            const live = liveStates.get(h.id);
            const guide = guidesById.get(h.id);
            const stageColor = stageColorOf(live?.stage);
            return (
              <div
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                style={{
                  padding: 12,
                  background: 'var(--c-overlay)',
                  border: `1px solid ${live ? stageColor + '66' : 'var(--c-border)'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{h.name}</span>
                  {live?.isCurrent && <Badge variant="success" style={{ fontSize: 9 }}>在场</Badge>}
                  {!live && h.hidden && <Badge variant="muted" style={{ fontSize: 9 }}>未解锁</Badge>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {live ? (
                    <>
                      <Badge variant="info" style={{ fontSize: 9 }}>
                        ♥ {live.favorability}
                      </Badge>
                      <Badge variant="warning" style={{ fontSize: 9 }}>{live.stage}</Badge>
                    </>
                  ) : (
                    <Badge variant="muted" style={{ fontSize: 9 }}>
                      {guide?.pursuable ? '可攻略' : '配角'}
                    </Badge>
                  )}
                </div>
                {live && (
                  <div style={{ fontSize: 10, color: 'var(--c-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📍 {live.location}
                  </div>
                )}
                {guide && guide.events.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--c-text-soft)', marginTop: 2 }}>
                    📅 剧情节点 {guide.events.length} 个
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--c-text-soft)', marginTop: 2 }}>
                  🧠 记忆 {memoryCounts[h.id] ?? 0} 条
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 女角详情对话框 */}
      <HeroineDetailModal
        open={!!selected}
        heroine={selected}
        live={selectedLive}
        guide={selectedGuide}
        triggeredFlags={triggeredFlags}
        memoryCount={selectedId != null ? memoryCounts[selectedId] ?? 0 : 0}
        onClose={() => setSelectedId(null)}
        onViewRelations={() => {
          setSelectedId(null);
          navigate('/relations');
        }}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  女角详情对话框(信息互通核心)
// ───────────────────────────────────────────────────────────

function stageColorOf(stage?: string): string {
  const colors: Record<string, string> = {
    初识: '#90caf9', 熟悉: '#64b5f6', 暧昧: '#ba68c8', 心动: '#e91e63', 亲密: '#d81b60', 攻略完成: '#ad1457',
  };
  return colors[stage ?? ''] ?? '#bdbdbd';
}

function HeroineDetailModal({
  open,
  heroine,
  live,
  guide,
  triggeredFlags,
  memoryCount,
  onClose,
  onViewRelations,
}: {
  open: boolean;
  heroine: typeof HEROINE_LIST[number] | null;
  live?: LiveState;
  guide?: HeroineGuide;
  triggeredFlags: Set<string>;
  memoryCount: number;
  onClose: () => void;
  onViewRelations: () => void;
}) {
  const [tab, setTab] = useState<'guide' | 'schedule' | 'plot'>('guide');

  useEffect(() => {
    if (open) setTab('guide');
  }, [open]);

  if (!heroine) return null;

  // 今日行程(全部时段)
  const daySchedule = useDaySchedule(heroine.id);
  // 剧情节点状态
  const plotNodes = usePlotNodes(heroine.id, live?.favorability ?? 0, triggeredFlags);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${heroine.name} · 档案`}
      size="xl"
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onViewRelations}>
            🕸 查看关系网
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      {/* 头部状态 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {live ? (
          <>
            <Badge variant="success">♥ 好感 {live.favorability}</Badge>
            <Badge variant="warning">阶段:{live.stage}</Badge>
            <Badge variant="info">📍 {live.location}</Badge>
            {live.isCurrent && <Badge variant="success">★ 当前在场</Badge>}
          </>
        ) : (
          <Badge variant="muted">{guide?.pursuable ? '可攻略(未登场或未见面)' : '配角'}</Badge>
        )}
        <Badge variant="muted">🧠 记忆 {memoryCount} 条</Badge>
        <Badge variant="info">登场:{guide?.appearCondition ?? '开局可见'}</Badge>
      </div>

      {/* Tabs */}
      <div className="th-tabs" style={{ marginBottom: 12 }}>
        {([['guide', '📝 攻略'], ['schedule', '🗓 今日行程'], ['plot', '🎬 剧情节点']] as const).map(([k, label]) => (
          <button
            key={k}
            className={`th-tabs__item ${tab === k ? 'th-tabs__item--active' : ''}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'guide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto' }}>
          {guide?.confessionCondition && (
            <div style={{ padding: 10, background: 'var(--c-primary-glow)', borderRadius: 8, fontSize: 12, color: 'var(--c-primary)' }}>
              💘 告白条件:{guide.confessionCondition}
            </div>
          )}
          {guide?.keyPoints.length ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 6 }}>攻略要点</div>
              {guide.keyPoints.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--c-text-muted)', lineHeight: 1.7, padding: '4px 0', borderBottom: '1px dashed var(--c-border-soft)' }}>
                  {i + 1}. {p}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📝" title="暂无攻略资料" />
          )}
          {guide?.conflicts.length ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 6 }}>角色冲突</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {guide.conflicts.map((c, i) => (
                  <Badge key={i} variant="danger" style={{ fontSize: 10 }}>⚠ {c}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          <div style={{ fontSize: 11, color: 'var(--c-text-soft)' }}>
            📅 关键事件 {guide?.events.length ?? 0} 个(见「剧情节点」标签页)
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {daySchedule.length === 0 ? (
            <EmptyState icon="🗓" title="今日无行程" description="该女角今日可能休假或未登场" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {daySchedule.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', background: 'var(--c-bg)', borderRadius: 6, fontSize: 12 }}>
                  <Badge variant="info" style={{ minWidth: 44, justifyContent: 'center' }}>{s.timeSlot}</Badge>
                  <span style={{ color: 'var(--c-text)' }}>{s.region}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--c-text-soft)', marginTop: 4 }}>
                按日程引擎查询(受日期覆盖/周间休假/关系覆盖影响),前往对应地点即可相遇
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'plot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '55vh', overflowY: 'auto' }}>
          {plotNodes.length === 0 && !guide?.events.length ? (
            <EmptyState icon="🎬" title="暂无剧情节点" description="该角色暂无独立剧情线" />
          ) : (
            <>
              {/* 引擎剧情节点 */}
              {plotNodes.map((n, i) => (
                <PlotNodeRow key={`engine-${i}`} node={n.node} status={{ dayMatch: n.dayMatch, alreadyTriggered: n.alreadyTriggered, favorOk: n.favorOk, locationMatch: n.locationMatch }} />
              ))}
              {/* 攻略事件(非引擎节点,作为攻略参考) */}
              {guide?.events.map((e, i) => {
                const isInEngine = plotNodes.some(
                  (n) => n.node.dayCount === e.day && (!n.node.location || String(n.node.location).includes(e.location.slice(0, 4)) || e.location.includes(String(n.node.location).slice(0, 4))),
                );
                if (isInEngine) return null;
                return <GuideEventRow key={`guide-${i}`} ev={e} />;
              })}
            </>
          )}
          {guide?.events.length ? (
            <div style={{ fontSize: 11, color: 'var(--c-text-soft)', marginTop: 6 }}>
              好感度阈值参考:14 可告白 / 15 完全攻略(唯·友美·泉美自行告白)
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件:今日行程 / 剧情节点行
// ───────────────────────────────────────────────────────────

function useDaySchedule(heroineId: number) {
  const kernelRef = useSaveStore((s) => s.kernelRef);
  const mvu = kernelRef.current?.getMvuRuntime();
  const statData = mvu?.snapshot() ?? {};
  const time = (statData.时间 ?? {}) as { 天数?: number; 时段?: string };
  const dayCount = Number(time.天数 ?? 1);
  return useMemo(() => {
    try {
      return scheduleEngine.getHeroineDaySchedule(heroineId, dayCount);
    } catch {
      return [];
    }
  }, [heroineId, dayCount]);
}

function usePlotNodes(heroineId: number, favorability: number, triggeredFlags: Set<string>) {
  const kernelRef = useSaveStore((s) => s.kernelRef);
  const mvu = kernelRef.current?.getMvuRuntime();
  const statData = mvu?.snapshot() ?? {};
  const time = (statData.时间 ?? {}) as { 天数?: number; 时段?: string };
  const dayCount = Number(time.天数 ?? 1);
  const scene = (statData.场景 ?? {}) as { 当前位置?: string };

  return useMemo(() => {
    const nodes = plotTrigger.getHeroinePlotNodes(heroineId);
    // 计算每个节点的可触发状态
    return nodes.map((n) => {
      const dayMatch = Array.isArray(n.dayCount) ? n.dayCount.includes(dayCount) : n.dayCount === dayCount;
      const alreadyTriggered = n.flags?.some((f) => triggeredFlags.has(f)) ?? false;
      const favorOk = !n.condition || extractFavorThreshold(n.condition) == null || favorability >= (extractFavorThreshold(n.condition) ?? 0);
      const locationMatch = !n.location || (Array.isArray(n.location) ? n.location : [n.location]).includes(scene.当前位置 as never);
      return { node: n, dayMatch, alreadyTriggered, favorOk, locationMatch };
    });
  }, [heroineId, dayCount, favorability, triggeredFlags, scene.当前位置]);
}

function extractFavorThreshold(condition: string): number | null {
  const m = condition.match(/好感度\s*[≥>]\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function PlotNodeRow({ node, status }: { node: PlotNode; status?: { dayMatch: boolean; alreadyTriggered: boolean; favorOk: boolean; locationMatch: boolean } }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)', borderRadius: 6, fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge variant="info" style={{ fontSize: 10 }}>
          D{Array.isArray(node.dayCount) ? node.dayCount.join('/') : node.dayCount}
        </Badge>
        {node.timeSlot && (
          <Badge variant="muted" style={{ fontSize: 10 }}>
            {Array.isArray(node.timeSlot) ? node.timeSlot.join('/') : node.timeSlot}
          </Badge>
        )}
        {node.location && (
          <Badge variant="muted" style={{ fontSize: 10 }}>
            📍{Array.isArray(node.location) ? node.location.join('/') : node.location}
          </Badge>
        )}
        {node.condition && <Badge variant="warning" style={{ fontSize: 10 }}>条件:{node.condition}</Badge>}
        {status?.alreadyTriggered && <Badge variant="success" style={{ fontSize: 10 }}>✓ 已触发</Badge>}
        {!status?.alreadyTriggered && status && !status.favorOk && (
          <Badge variant="danger" style={{ fontSize: 10 }}>条件未满足</Badge>
        )}
      </div>
      <div style={{ color: 'var(--c-text)', fontWeight: 500, marginTop: 4 }}>{node.event}</div>
      <div style={{ color: 'var(--c-text-muted)', marginTop: 2, lineHeight: 1.5 }}>{node.description}</div>
      {node.flags?.length ? (
        <div style={{ fontSize: 10, color: 'var(--c-text-soft)', marginTop: 3 }}>
          flag:{node.flags.join(', ')}
        </div>
      ) : null}
    </div>
  );
}

function GuideEventRow({ ev }: { ev: GuideEvent }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--c-overlay)', border: '1px dashed var(--c-border)', borderRadius: 6, fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge variant="info" style={{ fontSize: 10 }}>{DAY_TO_DATE[ev.day] ?? `D${ev.day}`}</Badge>
        <Badge variant="muted" style={{ fontSize: 10 }}>{ev.time}</Badge>
        <Badge variant="muted" style={{ fontSize: 10 }}>📍{ev.location}</Badge>
        {ev.favor != null && <Badge variant="success" style={{ fontSize: 10 }}>好感+{ev.favor}</Badge>}
      </div>
      <div style={{ color: 'var(--c-text-muted)', marginTop: 3, lineHeight: 1.5 }}>{ev.event}</div>
    </div>
  );
}
