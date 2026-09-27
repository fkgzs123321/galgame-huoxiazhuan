import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Modal } from '@ui/base';
import { ALL_REGIONS, type Region, type TimeSlot } from '@content/npc/schedule-data';
import { scheduleEngine } from '@runtime/npc/schedule-engine';
import { HEROINE_LIST } from '@content/npc/schedule-data';
import { HEROINE_GUIDES } from '@content/guides/index';
import type { MvuRuntime } from '@runtime/mvu-runtime';
import { useSaveStore } from '@stores/index';
import { notificationService } from '@gateway/index';

/**
 * WorldMapPage · 世界地图页(路由级)
 * 对齐 fanren-remake 的 WorldMapPage + MapEditorDialog:
 *  - 8 区域地图布局(町地图)
 *  - 每区域显示当前时段人物分布(schedule-engine 精准调用)
 *  - 地点详情对话框(人物/剧情/攻略)
 *  - 「前往」操作:写 stat_data.场景.当前位置(变量对齐)
 */

const TIME_SLOTS: TimeSlot[] = ['早', '上午', '下午', '晚', '深夜'];

/** 区域在地图上的网格位置(3 列布局) */
const REGION_LAYOUT: Array<{ region: Region; x: number; y: number; w: number; h: number; icon: string; desc: string }> = [
  { region: '自宅周边', x: 0, y: 0, w: 2, h: 1, icon: '🏠', desc: '住所周边,日常起居与家庭互动' },
  { region: '八十八学园', x: 2, y: 0, w: 1, h: 2, icon: '🏫', desc: '学校,学业与同学互动主场所' },
  { region: '八十八町商业区', x: 0, y: 1, w: 1, h: 1, icon: '🏬', desc: '商业街,购物/打工/约会热点' },
  { region: '八十八海岸', x: 0, y: 2, w: 1, h: 1, icon: '🌊', desc: '海岸线,浪漫约会与散心之地' },
  { region: '88市民医院', x: 1, y: 2, w: 1, h: 1, icon: '🏥', desc: '市民医院,樱子的病房在这里' },
  { region: '温泉乡', x: 2, y: 2, w: 1, h: 1, icon: '♨', desc: '温泉度假区,亲密事件高发区' },
  { region: '保育园', x: 1, y: 1, w: 1, h: 1, icon: '🧸', desc: '保育园,爱美与天道的事件地' },
];

export function WorldMapPage() {
  const navigate = useNavigate();
  const kernelRef = useSaveStore((s) => s.kernelRef);
  const mvu: MvuRuntime | undefined = kernelRef.current?.getMvuRuntime();
  const statData = useMemo(() => mvu?.snapshot() ?? {}, [mvu]);

  const time = (statData.时间 ?? {}) as { 天数?: number; 时段?: string };
  const dayCount = Number(time.天数 ?? 1);
  const timeSlot = (time.时段 as TimeSlot) ?? '早';
  const scene = (statData.场景 ?? {}) as { 当前位置?: string; 当前女角名?: string };
  const currentLocation = scene.当前位置 ?? '自宅周边';

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [moving, setMoving] = useState(false);

  // 每区域当前时段人物(schedule-engine 精准调用)
  const heroinesByRegion = useMemo(() => {
    const map = new Map<Region, string[]>();
    try {
      for (const region of ALL_REGIONS) {
        const entries = scheduleEngine.getAvailableHeroines({ dayCount, timeSlot, region });
        map.set(region, entries.map((e) => e.heroineName));
      }
    } catch {
      // 引擎未就绪
    }
    return map;
  }, [dayCount, timeSlot]);

  // 玩家当前所在区域
  const currentRegion = useMemo<Region | null>(() => {
    for (const r of ALL_REGIONS) {
      if (currentLocation.includes(r) || r.includes(currentLocation)) return r;
    }
    return null;
  }, [currentLocation]);

  // 前往:写 stat_data.场景.当前位置(与 schema 变量路径对齐)
  const handleMove = async (region: Region) => {
    const mvuRuntime = kernelRef.current?.getMvuRuntime();
    if (!mvuRuntime) {
      notificationService.error('游戏引擎未就绪,无法移动');
      return;
    }
    setMoving(true);
    try {
      mvuRuntime.setvar('场景.当前位置', region);
      notificationService.success(`已前往 ${region}`);
      setSelectedRegion(null);
      // 通知 App 刷新 stat_data
      window.dispatchEvent(new CustomEvent('app:stat-data-changed'));
    } catch (e) {
      notificationService.error(e instanceof Error ? e.message : String(e));
    } finally {
      setMoving(false);
    }
  };

  const selectedLayout = REGION_LAYOUT.find((r) => r.region === selectedRegion);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            🗺 世界地图
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            八十八町 · 第 {dayCount} 天 · {timeSlot} · 点击地点查看人物并前往
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← 返回
        </Button>
      </div>

      {/* 当前位置条 */}
      <div style={{ padding: '10px 14px', background: 'var(--c-primary-glow)', borderRadius: 10, border: '1px solid var(--c-primary-soft)', fontSize: 12 }}>
        📍 当前位置:<strong style={{ color: 'var(--c-primary)', marginLeft: 6 }}>{currentLocation}</strong>
        {currentRegion && <span style={{ color: 'var(--c-text-muted)', marginLeft: 8 }}>({currentRegion})</span>}
        {scene.当前女角名 && scene.当前女角名 !== '无' && (
          <span style={{ color: 'var(--c-primary)', marginLeft: 12 }}>♥ {scene.当前女角名}</span>
        )}
        <span style={{ color: 'var(--c-text-soft)', marginLeft: 12, fontSize: 11 }}>
          (移动会写入游戏变量,状态栏/角色图鉴同步更新)
        </span>
      </div>

      {/* 地图网格 */}
      <Card>
        <div style={{ padding: 14 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridAutoRows: 'minmax(110px, auto)',
              gap: 10,
            }}
          >
            {REGION_LAYOUT.map((r) => {
              const isCurrent = currentRegion === r.region;
              const heroines = heroinesByRegion.get(r.region) ?? [];
              return (
                <div
                  key={r.region}
                  onClick={() => setSelectedRegion(r.region)}
                  style={{
                    gridColumn: `span ${r.w}`,
                    gridRow: `span ${r.h}`,
                    padding: 12,
                    background: isCurrent ? 'var(--c-primary-glow)' : 'var(--c-bg)',
                    border: `1px solid ${isCurrent ? 'var(--c-primary)' : 'var(--c-border-soft)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isCurrent ? 'var(--c-primary)' : 'var(--c-border-soft)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{r.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{r.region}</span>
                    {isCurrent && <Badge variant="success" style={{ fontSize: 9 }}>当前</Badge>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--c-text-soft)', lineHeight: 1.5 }}>{r.desc}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {heroines.length === 0 ? (
                      <span style={{ fontSize: 10, color: 'var(--c-text-soft)' }}>此时无人</span>
                    ) : (
                      heroines.slice(0, 6).map((name) => (
                        <span
                          key={name}
                          style={{
                            fontSize: 10,
                            padding: '2px 7px',
                            background: 'var(--c-overlay)',
                            borderRadius: 10,
                            border: '1px solid var(--c-border-soft)',
                            color: name === scene.当前女角名 ? 'var(--c-primary)' : 'var(--c-text-muted)',
                          }}
                        >
                          {name}
                        </span>
                      ))
                    )}
                    {heroines.length > 6 && (
                      <span style={{ fontSize: 10, color: 'var(--c-text-soft)' }}>+{heroines.length - 6}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 时段切换提示 */}
      <div style={{ fontSize: 11, color: 'var(--c-text-soft)', textAlign: 'center' }}>
        当前时段:{TIME_SLOTS.map((s) => (
          <span key={s} style={{ margin: '0 6px', color: s === timeSlot ? 'var(--c-primary)' : 'inherit', fontWeight: s === timeSlot ? 600 : 400 }}>
            {s}
          </span>
        ))}
        · 不同时段人物分布不同,可通过游戏内行动推进时间
      </div>

      {/* 地点详情对话框 */}
      <Modal
        open={!!selectedRegion}
        onClose={() => setSelectedRegion(null)}
        title={`${selectedLayout?.icon ?? ''} ${selectedRegion ?? ''}`}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" onClick={() => selectedRegion && void handleMove(selectedRegion)} disabled={moving || currentRegion === selectedRegion}>
              {moving ? '移动中…' : currentRegion === selectedRegion ? '📍 已在此地' : '🚶 前往此地'}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedRegion(null)}>
              关闭
            </Button>
          </div>
        }
      >
        {selectedRegion && <RegionDetail region={selectedRegion} heroines={heroinesByRegion.get(selectedRegion) ?? []} dayCount={dayCount} timeSlot={timeSlot} />}
      </Modal>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  地点详情
// ───────────────────────────────────────────────────────────

function RegionDetail({
  region,
  heroines,
  dayCount,
  timeSlot,
}: {
  region: Region;
  heroines: string[];
  dayCount: number;
  timeSlot: TimeSlot;
}) {
  // 该区域女角的攻略事件
  const relatedEvents = useMemo(() => {
    const list: Array<{ name: string; event: string; day: number; time: string }> = [];
    for (const g of HEROINE_GUIDES) {
      for (const e of g.events) {
        const locMatch = e.location.includes(region.slice(0, 4)) || region.includes(e.location.slice(0, 4));
        if (locMatch) {
          list.push({ name: g.name, event: e.event, day: e.day, time: e.time });
        }
      }
    }
    return list.sort((a, b) => a.day - b.day);
  }, [region]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 6 }}>
          此时人物(第 {dayCount} 天 {timeSlot})
        </div>
        {heroines.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>此时无人出没</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {heroines.map((name) => {
              const h = HEROINE_LIST.find((x) => x.name === name);
              const guide = HEROINE_GUIDES.find((g) => g.id === h?.id);
              return (
                <div
                  key={name}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--c-bg)',
                    borderRadius: 8,
                    border: '1px solid var(--c-border-soft)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--c-text)', fontWeight: 500 }}>{name}</span>
                  {guide?.pursuable && <span style={{ color: 'var(--c-primary)', fontSize: 10, marginLeft: 4 }}>可攻略</span>}
                  {h?.hidden && <span style={{ color: 'var(--c-text-soft)', fontSize: 10, marginLeft: 4 }}>隐藏</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 6 }}>
          此地的剧情事件({relatedEvents.length})
        </div>
        {relatedEvents.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>暂无记录在案的剧情事件</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
            {relatedEvents.map((ev, i) => (
              <div key={i} style={{ padding: '7px 10px', background: 'var(--c-bg)', borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge variant="info" style={{ fontSize: 9 }}>D{ev.day}</Badge>
                  <Badge variant="muted" style={{ fontSize: 9 }}>{ev.time}</Badge>
                  <span style={{ color: 'var(--c-primary)', fontWeight: 500 }}>{ev.name}</span>
                </div>
                <div style={{ color: 'var(--c-text-muted)', marginTop: 2, lineHeight: 1.5 }}>{ev.event}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
