import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, EmptyState, Modal } from '@ui/base';
import { DAY_TO_DATE, HEROINE_GUIDES } from '@content/guides/index';
import { plotTrigger, type PlotNode, type PlotStage } from '@runtime/npc/plot-trigger';
import { HEROINE_LIST } from '@content/npc/schedule-data';
import { useSaveStore } from '@stores/index';

/**
 * PlotTimelinePage · 剧情时间线页(路由级)
 * 对齐 fanren-remake 的 PlotEvolutionPage + TimelinePage:
 *  - 17 天剧情时间线(攻略事件 + 引擎节点合并)
 *  - 按天展示各女角剧情(已触发/今日可触发/未来)
 *  - 条件精准展示(好感度阈值/时段/地点)
 *  - 阶段筛选(寒假前奏/核心/尾声/结局)
 */

const STAGE_ORDER: PlotStage[] = ['寒假前奏', '寒假核心', '寒假尾声', '结局阶段'];

const STAGE_COLORS: Record<PlotStage, string> = {
  寒假前奏: '#64b5f6',
  寒假核心: '#e91e63',
  寒假尾声: '#ba68c8',
  结局阶段: '#ad1457',
};

export function PlotTimelinePage() {
  const navigate = useNavigate();
  const kernelRef = useSaveStore((s) => s.kernelRef);
  const [stageFilter, setStageFilter] = useState<PlotStage | 'all'>('all');
  const [heroineFilter, setHeroineFilter] = useState<number | 'all'>('all');
  const [detail, setDetail] = useState<{ node: PlotNode; heroineName: string } | null>(null);

  const mvu = kernelRef.current?.getMvuRuntime();
  const statData = useMemo(() => mvu?.snapshot() ?? {}, [mvu]);
  const time = (statData.时间 ?? {}) as { 天数?: number };
  const dayCount = Number(time.天数 ?? 1);

  // 已触发 flags
  const triggeredFlags = useMemo(() => {
    const flags = new Set<string>();
    const plot = (statData.剧情已触发事件 ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(plot)) flags.add(k);
    return flags;
  }, [statData]);

  // 女角好感度快照(用于条件判定)
  const favorById = useMemo(() => {
    const map = new Map<number, number>();
    const current = (statData.当前女角 ?? {}) as Record<string, unknown>;
    const heroines = (statData.女角 ?? {}) as Record<string, Record<string, unknown>>;
    if (current.姓名 && current.姓名 !== '无') {
      const id = HEROINE_LIST.find((h) => h.name === current.姓名)?.id;
      if (id) map.set(id, Number(current.好感度 ?? 0));
    }
    for (const [name, m] of Object.entries(heroines)) {
      const id = HEROINE_LIST.find((h) => h.name === name)?.id;
      if (id) map.set(id, Number(m.好感度 ?? 0));
    }
    return map;
  }, [statData]);

  // 合并:引擎节点 + 攻略事件
  const timeline = useMemo(() => {
    const items: Array<{
      day: number;
      heroineId: number;
      heroineName: string;
      title: string;
      desc: string;
      time?: string;
      location?: string;
      condition?: string;
      stage: PlotStage;
      favor?: number;
      alreadyTriggered: boolean;
      isToday: boolean;
      isEngine: boolean;
      favorSatisfied: boolean;
    }> = [];

    // 引擎节点
    for (const h of HEROINE_LIST) {
      const nodes = plotTrigger.getHeroinePlotNodes(h.id);
      for (const n of nodes) {
        const days = Array.isArray(n.dayCount) ? n.dayCount : [n.dayCount];
        for (const d of days) {
          const already = n.flags?.some((f) => triggeredFlags.has(f)) ?? false;
          items.push({
            day: d,
            heroineId: h.id,
            heroineName: h.name,
            title: n.event,
            desc: n.description,
            time: n.timeSlot ? (Array.isArray(n.timeSlot) ? n.timeSlot.join('/') : n.timeSlot) : undefined,
            location: n.location ? (Array.isArray(n.location) ? n.location.join('/') : n.location) : undefined,
            condition: n.condition,
            stage: n.stage,
            alreadyTriggered: already,
            isToday: d === dayCount,
            isEngine: true,
            favorSatisfied: favorSatisfiedOf(n.condition, favorById.get(h.id) ?? 0),
          });
        }
      }
    }

    // 攻略事件(补充引擎未覆盖的)
    for (const g of HEROINE_GUIDES) {
      for (const e of g.events) {
        const engineHas = items.some(
          (i) => i.day === e.day && i.heroineId === g.id && (i.time ?? '').includes(e.time.slice(0, 5)),
        );
        if (engineHas) continue;
        items.push({
          day: e.day,
          heroineId: g.id,
          heroineName: g.name,
          title: e.event,
          desc: e.event,
          time: e.time,
          location: e.location,
          condition: e.favor != null ? `好感度≥${e.favor}` : undefined,
          stage: stageOfDay(e.day),
          favor: e.favor,
          alreadyTriggered: false,
          isToday: e.day === dayCount,
          isEngine: false,
          favorSatisfied: e.favor == null ? true : (favorById.get(g.id) ?? 0) >= e.favor,
        });
      }
    }

    return items.sort((a, b) => a.day - b.day);
  }, [triggeredFlags, favorById, dayCount]);

  const filtered = useMemo(() => {
    return timeline.filter((t) => {
      if (stageFilter !== 'all' && t.stage !== stageFilter) return false;
      if (heroineFilter !== 'all' && t.heroineId !== heroineFilter) return false;
      return true;
    });
  }, [timeline, stageFilter, heroineFilter]);

  // 按天分组
  const byDay = useMemo(() => {
    const map = new Map<number, typeof filtered>();
    for (const t of filtered) {
      const list = map.get(t.day) ?? [];
      list.push(t);
      map.set(t.day, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const todayCount = timeline.filter((t) => t.isToday).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            🎬 剧情时间线
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            17 天剧情总览 · 当前第 {dayCount} 天 · 今日 {todayCount} 个节点
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← 返回
        </Button>
      </div>

      {/* 筛选 */}
      <Card>
        <div style={{ padding: '12px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <FilterChip active={stageFilter === 'all'} onClick={() => setStageFilter('all')}>
              全部阶段
            </FilterChip>
            {STAGE_ORDER.map((s) => (
              <FilterChip key={s} active={stageFilter === s} onClick={() => setStageFilter(s)} color={STAGE_COLORS[s]}>
                {s}
              </FilterChip>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <FilterChip active={heroineFilter === 'all'} onClick={() => setHeroineFilter('all')}>
              全部角色
            </FilterChip>
            {HEROINE_LIST.map((h) => (
              <FilterChip key={h.id} active={heroineFilter === h.id} onClick={() => setHeroineFilter(h.id)}>
                {h.name}
              </FilterChip>
            ))}
          </div>
        </div>
      </Card>

      {/* 时间线 */}
      {byDay.length === 0 ? (
        <EmptyState icon="🎬" title="暂无剧情节点" description="调整筛选条件或等待后续天数解锁" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {byDay.map(([day, items]) => (
            <Card key={day}>
              <div
                style={{
                  padding: '10px 18px',
                  borderBottom: '1px solid var(--c-border-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 15 }}>📅</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: day === dayCount ? 'var(--c-primary)' : 'var(--c-text)' }}>
                  第 {day} 天({DAY_TO_DATE[day]})
                </span>
                {day === dayCount && <Badge variant="success" style={{ fontSize: 9 }}>今日</Badge>}
                {day < dayCount && <Badge variant="muted" style={{ fontSize: 9 }}>已过</Badge>}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--c-text-muted)' }}>{items.length} 个节点</span>
              </div>
              <div style={{ padding: '10px 18px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((t, i) => (
                  <div
                    key={`${t.day}-${t.heroineId}-${i}`}
                    onClick={() => setDetail({ node: {
                      heroineId: t.heroineId,
                      heroineName: t.heroineName,
                      dayCount: t.day,
                      timeSlot: t.time as never,
                      location: t.location as never,
                      event: t.title,
                      description: t.desc,
                      condition: t.condition,
                      isReversible: true,
                      requiresPlayerPresence: true,
                      stage: t.stage,
                    }, heroineName: t.heroineName })}
                    style={{
                      padding: '8px 12px',
                      background: t.isToday ? 'var(--c-primary-glow)' : 'var(--c-bg)',
                      border: `1px solid ${t.isToday ? 'var(--c-primary-soft)' : 'var(--c-border-soft)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: STAGE_COLORS[t.stage], fontWeight: 600, minWidth: 40 }}>{t.heroineName}</span>
                    {t.time && <Badge variant="muted" style={{ fontSize: 9 }}>{t.time}</Badge>}
                    {t.location && <Badge variant="muted" style={{ fontSize: 9 }}>📍{t.location}</Badge>}
                    <span style={{ color: 'var(--c-text)', flex: 1, minWidth: 140 }}>{t.title}</span>
                    {t.alreadyTriggered && <Badge variant="success" style={{ fontSize: 9 }}>✓ 已触发</Badge>}
                    {!t.alreadyTriggered && t.condition && (
                      <Badge variant={t.favorSatisfied ? 'warning' : 'danger'} style={{ fontSize: 9 }}>
                        {t.condition}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 详情对话框 */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.heroineName} · ${detail.node.event}` : ''}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            关闭
          </Button>
        }
      >
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="info">第 {detail.node.dayCount} 天</Badge>
              {detail.node.timeSlot && <Badge variant="muted">{detail.node.timeSlot}</Badge>}
              {detail.node.location && <Badge variant="muted">📍{detail.node.location}</Badge>}
              <Badge variant="warning" style={{ background: STAGE_COLORS[detail.node.stage] + '22', color: STAGE_COLORS[detail.node.stage] }}>
                {detail.node.stage}
              </Badge>
            </div>
            <div style={{ padding: 10, background: 'var(--c-bg)', borderRadius: 8, lineHeight: 1.7, color: 'var(--c-text)' }}>
              {detail.node.description}
            </div>
            {detail.node.condition && (
              <div style={{ padding: 8, background: 'var(--c-primary-glow)', borderRadius: 8, color: 'var(--c-primary)' }}>
                ⚡ 触发条件:{detail.node.condition}
              </div>
            )}
            {detail.node.flags?.length ? (
              <div style={{ fontSize: 10, color: 'var(--c-text-soft)' }}>
                标记:{detail.node.flags.join(', ')}
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

function stageOfDay(day: number): PlotStage {
  if (day <= 9) return '寒假前奏';
  if (day <= 13) return '寒假核心';
  if (day <= 16) return '寒假尾声';
  return '结局阶段';
}

function favorSatisfiedOf(condition: string | undefined, favor: number): boolean {
  if (!condition) return true;
  const m = condition.match(/好感度\s*[≥>]\s*(\d+)/);
  if (!m) return true;
  return favor >= Number(m[1]);
}

function FilterChip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        fontSize: 11,
        borderRadius: 14,
        border: `1px solid ${active ? (color ?? 'var(--c-primary)') : 'var(--c-border)'}`,
        background: active ? (color ? color + '22' : 'var(--c-primary-glow)') : 'transparent',
        color: active ? (color ?? 'var(--c-primary)') : 'var(--c-text-muted)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
