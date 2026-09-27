/**
 * 多视图面板(阶段3 步骤4)
 *
 * 职责:
 *  - 统一容器:6 个 tab 切换(地图/相册/物品栏/雷达图/关系图/时间线)
 *  - 地图视图:7 区域网格 + 当前位置高亮 + 区域内女角提示
 *  - 相册视图:复用 CGGallery(紧凑网格)
 *  - 物品栏视图:从 statData.物品栏 / 背包读取,分类列表 + 详情
 *  - 雷达图视图:Canvas 绘制 6 维属性(主角/当前女角切换)
 *  - 关系图视图:SVG 节点+边,玩家中心 + 女角环绕,边色按关系阶段
 *  - 时间线视图:从 statData.近期事件 / 事件日志 读取,按时间轴展示
 *
 * 不做:
 *  - 实际导航/物品使用(由 AI 回合处理,此处只读展示)
 *  - CG 解锁操作(由 HScenePanel 负责,此处只读浏览)
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { THEME_VARS } from './types';
import { CgViewerDialog, ItemDetailDialog } from '@dialogs/index';
import { cgGallery, type CGEntry, type CGType } from '../runtime/cg-gallery';
import { getCgArt } from '../runtime/cg-art';
import { ALL_REGIONS, type Region } from '../content/npc/schedule-data';
import { scheduleEngine } from '../runtime/npc/schedule-engine';
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
  minWidth: 80,
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
  marginTop: 0,
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
//  CG 类型标签
// ───────────────────────────────────────────────────────────

const CG_TYPE_LABELS: Record<CGType, string> = {
  'h-first': '初H',
  'h-advanced': '进阶H',
  'h-normal': '常规H',
  'event': '事件',
  'portrait': '立绘',
};

// ───────────────────────────────────────────────────────────
//  区域中文名 + 图标
// ───────────────────────────────────────────────────────────

const REGION_META: Record<Region, { icon: string; desc: string }> = {
  '自宅周边': { icon: '🏠', desc: '住所周边,日常起居与家庭互动' },
  '八十八学园': { icon: '🏫', desc: '学校,学业与同学互动主场所' },
  '八十八町商业区': { icon: '🏬', desc: '商业街,购物/打工/约会热点' },
  '八十八海岸': { icon: '🌊', desc: '海岸线,浪漫约会与散心之地' },
  '温泉乡': { icon: '♨', desc: '温泉度假区,亲密事件高发区' },
  '88市民医院': { icon: '🏥', desc: '医院,樱子线主要场景' },
  '保育园': { icon: '🧸', desc: '保育园,特定女角打工点' },
};

// ───────────────────────────────────────────────────────────
//  关系阶段 → 边色
// ───────────────────────────────────────────────────────────

const RELATION_EDGE_COLOR: Record<string, string> = {
  '决裂': '#9e9e9e',
  '仇视': '#e53935',
  '厌恶': '#ef5350',
  '冷漠': '#9e9e9e',
  '疏离': '#bdbdbd',
  '初识': '#90caf9',
  '熟悉': '#64b5f6',
  '暧昧': '#ba68c8',
  '心动': '#e91e63',
  '亲密': '#d81b60',
  '攻略完成': '#ad1457',
  '失恋': '#757575',
};

function edgeColorForStage(stage: string): string {
  return RELATION_EDGE_COLOR[stage] ?? THEME_VARS.border;
}

// ───────────────────────────────────────────────────────────
//  组件 Props
// ───────────────────────────────────────────────────────────

export interface MultiViewPanelProps {
  /** MVU 运行时(读取 stat_data) */
  mvu?: MvuRuntime;
  /** 当前游戏内天数 */
  dayCount?: number;
  /** 当前时段 */
  timeSlot?: string;
  /** 是否只读 */
  readOnly?: boolean;
}

type ViewTab = 'map' | 'album' | 'inventory' | 'radar' | 'relation' | 'timeline';

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function MultiViewPanel({ mvu, dayCount = 1, timeSlot = '早', readOnly = false }: MultiViewPanelProps) {
  const [tab, setTab] = useState<ViewTab>('map');

  const tabs: Array<{ key: ViewTab; label: string; icon: string }> = [
    { key: 'map', label: '地图', icon: '🗺' },
    { key: 'album', label: '相册', icon: '🖼' },
    { key: 'inventory', label: '物品栏', icon: '🎒' },
    { key: 'radar', label: '雷达图', icon: '📊' },
    { key: 'relation', label: '关系图', icon: '🕸' },
    { key: 'timeline', label: '时间线', icon: '📅' },
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
          多视图面板 · 阶段3 步骤4
        </h3>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
          Multi-View Panel · Map / Album / Inventory / Radar / Relation / Timeline
        </div>
      </header>

      {/* Tab 切换 */}
      <div style={tabBarStyle}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? tabBtnActiveStyle : tabBtnStyle}
            disabled={readOnly}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* 视图内容 */}
      {tab === 'map' && <MapView mvu={mvu} dayCount={dayCount} timeSlot={timeSlot} />}
      {tab === 'album' && <AlbumView readOnly={readOnly} />}
      {tab === 'inventory' && <InventoryView mvu={mvu} />}
      {tab === 'radar' && <RadarView mvu={mvu} />}
      {tab === 'relation' && <RelationView mvu={mvu} />}
      {tab === 'timeline' && <TimelineView mvu={mvu} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  1. 地图视图
// ═══════════════════════════════════════════════════════════

interface MapViewProps {
  mvu?: MvuRuntime;
  dayCount: number;
  timeSlot: string;
}

function MapView({ mvu, dayCount, timeSlot }: MapViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  const statData = useMemo(() => mvu?.snapshot() ?? {}, [mvu]);
  const scene = (statData.场景 ?? {}) as { 当前地点?: string; 当前女角名?: string };
  const currentLocation = scene.当前地点 ?? '未选择';

  // 查询每个区域当前时段的女角
  const heroinesByRegion = useMemo(() => {
    const map: Record<Region, string[]> = {
      '自宅周边': [],
      '八十八学园': [],
      '八十八町商业区': [],
      '八十八海岸': [],
      '温泉乡': [],
      '88市民医院': [],
      '保育园': [],
    };
    try {
      for (const region of ALL_REGIONS) {
        const entries = scheduleEngine.getAvailableHeroines({
          dayCount,
          timeSlot: timeSlot as never,
          region,
        });
        map[region] = entries.map((e) => e.heroineName);
      }
    } catch {
      // schedule-engine 未就绪
    }
    return map;
  }, [dayCount, timeSlot]);

  // 判断当前位置所属区域
  const currentRegion = useMemo<Region | null>(() => {
    for (const r of ALL_REGIONS) {
      if (currentLocation.includes(r) || r.includes(currentLocation)) return r;
    }
    return null;
  }, [currentLocation]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🗺 区域地图</h4>

      {/* 当前位置条 */}
      <div style={{
        padding: 10,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${THEME_VARS.primary}22 0%, transparent 100%)`,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        fontSize: 12,
      }}>
        <span style={{ color: THEME_VARS.textMuted }}>当前位置:</span>
        <strong style={{ color: THEME_VARS.primary, marginLeft: 6 }}>{currentLocation}</strong>
        {currentRegion && (
          <span style={{ color: THEME_VARS.textMuted, marginLeft: 8 }}>
            ({currentRegion})
          </span>
        )}
        <span style={{ color: THEME_VARS.textMuted, marginLeft: 12 }}>·</span>
        <span style={{ color: THEME_VARS.textMuted, marginLeft: 6 }}>
          第 {dayCount} 天 · {timeSlot}
        </span>
        {scene.当前女角名 && scene.当前女角名 !== '无' && (
          <>
            <span style={{ color: THEME_VARS.textMuted, marginLeft: 12 }}>·</span>
            <span style={{ color: THEME_VARS.primary, marginLeft: 6 }}>♥ {scene.当前女角名}</span>
          </>
        )}
      </div>

      {/* 区域网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
      }}>
        {ALL_REGIONS.map((region) => {
          const meta = REGION_META[region];
          const isCurrent = region === currentRegion;
          const heroines = heroinesByRegion[region] ?? [];
          const isSelected = selectedRegion === region;
          return (
            <div
              key={region}
              onClick={() => setSelectedRegion(isSelected ? null : region)}
              style={{
                padding: 12,
                background: isCurrent
                  ? `linear-gradient(135deg, ${THEME_VARS.primary}33 0%, transparent 100%)`
                  : THEME_VARS.bg,
                borderRadius: 10,
                border: `1px solid ${isCurrent ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
                borderLeft: `3px solid ${isCurrent ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isSelected ? 1 : 0.92,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{meta.icon}</span>
                <strong style={{
                  fontSize: 12,
                  color: isCurrent ? THEME_VARS.primary : THEME_VARS.text,
                }}>
                  {region}
                </strong>
                {isCurrent && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: THEME_VARS.primary + '22',
                    color: THEME_VARS.primary,
                  }}>
                    当前
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 6, lineHeight: 1.4 }}>
                {meta.desc}
              </div>
              {heroines.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {heroines.slice(0, 4).map((name) => (
                    <span key={name} style={{
                      fontSize: 9,
                      padding: '1px 6px',
                      background: THEME_VARS.overlay,
                      borderRadius: 8,
                      color: THEME_VARS.text,
                      border: `1px solid ${THEME_VARS.borderSoft}`,
                    }}>
                      {name}
                    </span>
                  ))}
                  {heroines.length > 4 && (
                    <span style={{ fontSize: 9, color: THEME_VARS.textMuted }}>
                      +{heroines.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 区域详情 */}
      {selectedRegion && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: THEME_VARS.bg,
          borderRadius: 10,
          border: `1px solid ${THEME_VARS.borderSoft}`,
        }}>
          <strong style={{ fontSize: 12, color: THEME_VARS.primary, display: 'block', marginBottom: 6 }}>
            {REGION_META[selectedRegion].icon} {selectedRegion}
          </strong>
          <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 8 }}>
            {REGION_META[selectedRegion].desc}
          </div>
          <div style={{ fontSize: 11, color: THEME_VARS.text }}>
            当前时段({timeSlot})在此区域的女角:
            <strong style={{ marginLeft: 6, color: THEME_VARS.primary }}>
              {heroinesByRegion[selectedRegion]?.length ?? 0} 人
            </strong>
          </div>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(heroinesByRegion[selectedRegion] ?? []).map((name) => (
              <span key={name} style={{
                fontSize: 10,
                padding: '2px 8px',
                background: THEME_VARS.primary + '22',
                color: THEME_VARS.primary,
                borderRadius: 10,
              }}>
                {name}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 8, fontStyle: 'italic' }}>
            提示:实际移动需在主聊天输入行动(如"前往{selectedRegion}")
          </div>
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  2. 相册视图(复用 CGGallery,只读浏览)
// ═══════════════════════════════════════════════════════════

interface AlbumViewProps {
  readOnly?: boolean;
}

function AlbumView({ readOnly = false }: AlbumViewProps) {
  const [cgList, setCgList] = useState<CGEntry[]>([]);
  const [filterType, setFilterType] = useState<'all' | CGType>('all');
  const [selectedCG, setSelectedCG] = useState<CGEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await cgGallery.load();
      if (!cancelled) setCgList(cgGallery.getAll());
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return cgList.filter((c) => filterType === 'all' || c.type === filterType);
  }, [cgList, filterType]);

  const stats = useMemo(() => {
    const unlocked = cgList.filter((c) => c.unlocked).length;
    return { total: cgList.length, unlocked, percent: cgList.length > 0 ? (unlocked / cgList.length) * 100 : 0 };
  }, [cgList]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🖼 CG 相册</h4>

      {/* 统计 */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 12,
        padding: 10,
        background: THEME_VARS.bg,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        fontSize: 11,
        alignItems: 'center',
      }}>
        <span style={{ color: THEME_VARS.primary, fontWeight: 600 }}>
          {stats.unlocked} / {stats.total}
        </span>
        <span style={{ color: THEME_VARS.textMuted }}>已解锁</span>
        <div style={{
          flex: 1,
          height: 6,
          background: THEME_VARS.borderSoft,
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${stats.percent}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.primarySoft} 100%)`,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ color: THEME_VARS.success, fontWeight: 600 }}>
          {stats.percent.toFixed(1)}%
        </span>
      </div>

      {/* 类型筛选 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {[{ v: 'all' as const, l: '全部' }, ...Object.entries(CG_TYPE_LABELS).map(([v, l]) => ({ v: v as CGType, l }))].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilterType(f.v)}
            style={{
              padding: '3px 10px',
              background: filterType === f.v ? THEME_VARS.primary + '22' : 'transparent',
              color: filterType === f.v ? THEME_VARS.primary : THEME_VARS.textMuted,
              border: `1px solid ${filterType === f.v ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
              borderRadius: 12,
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* CG 网格 */}
      {filtered.length === 0 ? (
        <div style={emptyStyle}>暂无 CG</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}>
          {filtered.map((cg) => (
            <div
              key={cg.id}
              onClick={() => cg.unlocked && setSelectedCG(cg)}
              style={{
                borderRadius: 8,
                overflow: 'hidden',
                border: `1px solid ${THEME_VARS.borderSoft}`,
                background: THEME_VARS.bg,
                cursor: cg.unlocked ? 'pointer' : 'default',
                opacity: cg.unlocked ? 1 : 0.6,
              }}
            >
              <div style={{
                height: 90,
                background: cg.unlocked
                  ? cg.placeholderGradient
                  : `repeating-linear-gradient(45deg, ${THEME_VARS.bg}, ${THEME_VARS.bg} 6px, ${THEME_VARS.borderSoft} 6px, ${THEME_VARS.borderSoft} 12px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {cg.unlocked && getCgArt(cg) ? (
                  <img
                    src={getCgArt(cg) ?? undefined}
                    alt={cg.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span style={{ fontSize: 22 }}>
                    {cg.unlocked ? (cg.type === 'h-first' ? '💕' : cg.type === 'event' ? '✨' : cg.type === 'portrait' ? '🌸' : '♡') : '?'}
                  </span>
                )}
              </div>
              <div style={{ padding: 6 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: cg.unlocked ? THEME_VARS.text : THEME_VARS.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {cg.unlocked ? cg.title : '???'}
                </div>
                <div style={{ fontSize: 9, color: THEME_VARS.textMuted }}>
                  {CG_TYPE_LABELS[cg.type]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CG 详情弹窗(对话框层) */}
      {selectedCG && (
        <CgViewerDialog
          open
          data={{
            title: selectedCG.title,
            type: selectedCG.type,
            typeLabel: CG_TYPE_LABELS[selectedCG.type],
            heroineName: selectedCG.heroineName,
            description: selectedCG.description,
            unlockCondition: selectedCG.unlockCondition,
            unlockedAtTurn: selectedCG.unlockedAtTurn,
            placeholderGradient: selectedCG.placeholderGradient,
            artUrl: getCgArt(selectedCG) ?? undefined,
          }}
          onClose={() => setSelectedCG(null)}
        />
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  雷达图视图(六维属性/技能)
// ═══════════════════════════════════════════════════════════

interface RadarDim {
  key: string;
  label: string;
  color: string;
}

const RADAR_ATTR_DIMS: RadarDim[] = [
  { key: '魅力', label: '魅力', color: '#e91e63' },
  { key: '学业', label: '学业', color: '#2196f3' },
  { key: '体力', label: '体力', color: '#4caf50' },
  { key: '社交', label: '社交', color: '#ff9800' },
  { key: '敏感', label: '敏感', color: '#9c27b0' },
  { key: '声誉', label: '声誉', color: '#00bcd4' },
];

const RADAR_SKILL_DIMS: RadarDim[] = [
  { key: '力量', label: '力量', color: '#f44336' },
  { key: '敏捷', label: '敏捷', color: '#ff9800' },
  { key: '智力', label: '智力', color: '#2196f3' },
  { key: '口才', label: '口才', color: '#4caf50' },
  { key: '观察', label: '观察', color: '#9c27b0' },
  { key: '恋爱技能', label: '恋爱', color: '#e91e63' },
];

interface RadarViewProps {
  mvu?: MvuRuntime | null;
}

function RadarView({ mvu }: RadarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [target, setTarget] = useState<'player' | 'heroine'>('player');
  const [dimMode, setDimMode] = useState<'attr' | 'skill'>('attr');

  const radarData = useMemo(() => {
    if (!mvu) return null;
    const sd = mvu.snapshot();
    if (target === 'player') {
      const protagonist = (sd.主角 ?? {}) as Record<string, unknown>;
      const dims = dimMode === 'attr' ? RADAR_ATTR_DIMS : [];
      const effective = dims.length > 0 ? dims : RADAR_ATTR_DIMS;
      return {
        name: String((sd.主角 as { 玩家姓名?: string } | undefined)?.玩家姓名 ?? '玩家'),
        values: effective.map((k) => Number(protagonist[k.key] ?? 0)),
        dims: effective,
      };
    }
    const heroine = (sd.当前女角 ?? {}) as Record<string, unknown>;
    const dims = dimMode === 'attr' ? RADAR_ATTR_DIMS : RADAR_SKILL_DIMS;
    return {
      name: String(heroine.姓名 ?? '当前女角'),
      values: dims.map((v) => Number(heroine[v.key] ?? 0)),
      dims,
    };
  }, [mvu, target, dimMode]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 50;
    ctx.clearRect(0, 0, w, h);
    const dims = radarData?.dims ?? RADAR_ATTR_DIMS;
    const values = radarData?.values ?? dims.map(() => 0);
    const n = dims.length;
    const MAX = 100;
    // 网格(5 层)
    ctx.strokeStyle = THEME_VARS.borderSoft;
    ctx.fillStyle = THEME_VARS.overlay + '55';
    for (let ring = 1; ring <= 5; ring++) {
      const radius = (R * ring) / 5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      if (ring === 5) ctx.fill();
    }
    // 射线
    ctx.strokeStyle = THEME_VARS.borderSoft;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
      ctx.stroke();
    }
    // 数据多边形
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const v = Math.max(0, Math.min(MAX, values[i]));
      const radius = (R * v) / MAX;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = THEME_VARS.primary + '44';
    ctx.fill();
    ctx.strokeStyle = THEME_VARS.primary;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 数据点
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const v = Math.max(0, Math.min(MAX, values[i]));
      const radius = (R * v) / MAX;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dims[i].color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // 维度标签
    ctx.fillStyle = THEME_VARS.text;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const radius = R + 24;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.fillStyle = dims[i].color;
      ctx.fillText(dims[i].label, x, y);
      ctx.fillStyle = THEME_VARS.textMuted;
      ctx.font = '10px sans-serif';
      ctx.fillText(String(values[i]), x, y + 14);
      ctx.font = '12px sans-serif';
    }
  }, [radarData]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📊 雷达图</h4>
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 12,
        padding: 10,
        background: THEME_VARS.bg,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 10, color: THEME_VARS.textMuted, marginRight: 4, alignSelf: 'center' }}>对象:</span>
          {([{ v: 'player', l: '主角' }, { v: 'heroine', l: '当前女角' }] as const).map((p) => (
            <button
              key={p.v}
              onClick={() => setTarget(p.v)}
              style={{
                padding: '3px 10px',
                background: target === p.v ? THEME_VARS.primary + '22' : 'transparent',
                color: target === p.v ? THEME_VARS.primary : THEME_VARS.textMuted,
                border: `1px solid ${target === p.v ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                borderRadius: 12,
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {p.l}
            </button>
          ))}
        </div>
        {target === 'heroine' && (
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 10, color: THEME_VARS.textMuted, marginRight: 4, alignSelf: 'center' }}>维度:</span>
            {([{ v: 'attr', l: '6维属性' }, { v: 'skill', l: '6项技能' }] as const).map((p) => (
              <button
                key={p.v}
                onClick={() => setDimMode(p.v)}
                style={{
                  padding: '3px 10px',
                  background: dimMode === p.v ? THEME_VARS.primary + '22' : 'transparent',
                  color: dimMode === p.v ? THEME_VARS.primary : THEME_VARS.textMuted,
                  border: `1px solid ${dimMode === p.v ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                  borderRadius: 12,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {p.l}
              </button>
            ))}
          </div>
        )}
        {radarData && (
          <span style={{ fontSize: 11, color: THEME_VARS.primary, marginLeft: 'auto', fontWeight: 600 }}>
            {radarData.name}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          style={{
            background: THEME_VARS.overlay,
            borderRadius: 10,
            border: `1px solid ${THEME_VARS.borderSoft}`,
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>
      {!radarData && (
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, textAlign: 'center', marginTop: 8 }}>
          需要初始化 Kernel 才能读取属性数据
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  关系图视图(力导向圆环布局)
// ═══════════════════════════════════════════════════════════

const RELATION_STAGE_COLORS: Record<string, string> = {
  决裂: '#9e9e9e',
  仇视: '#e53935',
  厌恶: '#ef5350',
  冷漠: '#9e9e9e',
  疏离: '#bdbdbd',
  初识: '#90caf9',
  熟悉: '#64b5f6',
  暧昧: '#ba68c8',
  心动: '#e91e63',
  亲密: '#d81b60',
  攻略完成: '#ad1457',
  失恋: '#757575',
};

function relationStageColor(stage: string): string {
  return RELATION_STAGE_COLORS[stage] ?? THEME_VARS.border;
}

interface RelationNode {
  name: string;
  favorability: number;
  stage: string;
  isCurrent: boolean;
  isHeroine: boolean;
}

interface RelationViewProps {
  mvu?: MvuRuntime | null;
}

function RelationView({ mvu }: RelationViewProps) {
  const statData = useMemo(() => mvu?.snapshot() ?? {}, [mvu]);

  const nodes = useMemo<RelationNode[]>(() => {
    const list: RelationNode[] = [];
    const current = (statData.当前女角 ?? {}) as Record<string, unknown>;
    if (current.姓名 && current.姓名 !== '无') {
      list.push({
        name: String(current.姓名),
        favorability: Number(current.好感度 ?? 0),
        stage: String(current.关系阶段 ?? '初识'),
        isCurrent: true,
        isHeroine: true,
      });
    }
    const heroines = (statData.女角 ?? {}) as Record<string, Record<string, unknown>>;
    for (const [name, m] of Object.entries(heroines)) {
      if (list.find((h) => h.name === name)) continue;
      list.push({
        name,
        favorability: Number(m.好感度 ?? 0),
        stage: String(m.关系阶段 ?? '初识'),
        isCurrent: false,
        isHeroine: true,
      });
    }
    return list;
  }, [statData]);

  const playerName = String((statData.主角 as { 玩家姓名?: string } | undefined)?.玩家姓名 ?? '玩家');

  const layout = useMemo(() => {
    const positions = nodes.map((node, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(nodes.length, 1) - Math.PI / 2;
      return {
        name: node.name,
        x: 240 + 130 * Math.cos(angle),
        y: 190 + 130 * Math.sin(angle),
        node,
      };
    });
    return { W: 480, H: 380, cx: 240, cy: 190, positions };
  }, [nodes]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🕸 关系图</h4>
      {nodes.length === 0 ? (
        <div style={emptyStyle}>暂无女角关系数据</div>
      ) : (
        <>
          <div style={{
            fontSize: 11,
            color: THEME_VARS.textMuted,
            marginBottom: 12,
            padding: 8,
            background: THEME_VARS.bg,
            borderRadius: 6,
          }}>
            玩家 <strong style={{ color: THEME_VARS.primary }}>{playerName}</strong> 与 {nodes.length} 位女角的关系网络
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg
              width={layout.W}
              height={layout.H}
              style={{
                background: THEME_VARS.overlay,
                borderRadius: 10,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                maxWidth: '100%',
                height: 'auto',
              }}
            >
              {layout.positions.map((c) => {
                const color = relationStageColor(c.node.stage);
                const strong = c.node.favorability > 30 || c.node.stage === '亲密' || c.node.stage === '攻略完成';
                return (
                  <line
                    key={`edge-${c.name}`}
                    x1={layout.cx}
                    y1={layout.cy}
                    x2={c.x}
                    y2={c.y}
                    stroke={color}
                    strokeWidth={strong ? 2.5 : 1.2}
                    strokeOpacity={0.7}
                  />
                );
              })}
              <circle cx={layout.cx} cy={layout.cy} r={26} fill={THEME_VARS.primary} stroke="#fff" strokeWidth={2} />
              <text
                x={layout.cx}
                y={layout.cy + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize={11}
                fontWeight={600}
              >
                {playerName.slice(0, 4)}
              </text>
              {layout.positions.map((c) => {
                const color = relationStageColor(c.node.stage);
                const r = c.node.isCurrent ? 20 : 16;
                return (
                  <g key={`node-${c.name}`}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={r}
                      fill={color}
                      stroke={c.node.isCurrent ? THEME_VARS.primary : '#fff'}
                      strokeWidth={c.node.isCurrent ? 3 : 1.5}
                      opacity={0.9}
                    />
                    <text
                      x={c.x}
                      y={c.y + r + 12}
                      textAnchor="middle"
                      fill={THEME_VARS.text}
                      fontSize={10}
                      fontWeight={c.node.isCurrent ? 600 : 400}
                    >
                      {c.node.name.slice(0, 5)}
                    </text>
                    <text
                      x={c.x}
                      y={c.y + r + 24}
                      textAnchor="middle"
                      fill={THEME_VARS.textMuted}
                      fontSize={9}
                    >
                      {c.node.stage} · {c.node.favorability > 0 ? '+' : ''}
                      {c.node.favorability}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{
            marginTop: 12,
            padding: 10,
            background: THEME_VARS.bg,
            borderRadius: 8,
            border: `1px solid ${THEME_VARS.borderSoft}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 10,
          }}>
            <span style={{ color: THEME_VARS.textMuted }}>关系阶段图例:</span>
            {Object.entries(RELATION_STAGE_COLORS).map(([stage, color]) => (
              <span key={stage} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
                {stage}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  3. 物品栏视图
// ═══════════════════════════════════════════════════════════

interface InventoryViewProps {
  mvu?: MvuRuntime;
}

interface ItemEntry {
  name: string;
  count: number;
  category?: string;
  desc?: string;
}

function InventoryView({ mvu }: InventoryViewProps) {
  const [selectedItem, setSelectedItem] = useState<ItemEntry | null>(null);

  const items = useMemo<ItemEntry[]>(() => {
    if (!mvu) return [];
    const sd = mvu.snapshot();
    // 尝试多个可能字段:物品栏 / 背包 / 道具
    const bag = (sd.物品栏 ?? sd.背包 ?? sd.道具 ?? {}) as Record<string, unknown>;
    const entries: ItemEntry[] = [];
    for (const [key, val] of Object.entries(bag)) {
      if (typeof val === 'number') {
        entries.push({ name: key, count: val });
      } else if (val && typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        entries.push({
          name: key,
          count: Number(obj.数量 ?? obj.count ?? 1),
          category: String(obj.分类 ?? obj.category ?? ''),
          desc: String(obj.描述 ?? obj.description ?? ''),
        });
      } else if (typeof val === 'string') {
        entries.push({ name: key, count: 1, desc: val });
      }
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }, [mvu]);

  // 按分类分组
  const grouped = useMemo(() => {
    const map: Record<string, ItemEntry[]> = {};
    for (const it of items) {
      const cat = it.category || '未分类';
      if (!map[cat]) map[cat] = [];
      map[cat].push(it);
    }
    return map;
  }, [items]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🎒 物品栏</h4>

      {items.length === 0 ? (
        <div style={emptyStyle}>
          背包空空如也(物品由 AI 在回合中发放,存于 stat_data.物品栏)
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 11,
            color: THEME_VARS.textMuted,
            marginBottom: 12,
            padding: 8,
            background: THEME_VARS.bg,
            borderRadius: 6,
          }}>
            共 {items.length} 件物品 · {Object.keys(grouped).length} 个分类
          </div>

          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: THEME_VARS.primary,
                marginBottom: 6,
                paddingBottom: 4,
                borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
              }}>
                {cat}({list.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 6,
              }}>
                {list.map((it) => (
                  <div
                    key={it.name}
                    onClick={() => setSelectedItem(it)}
                    style={{
                      padding: 8,
                      background: THEME_VARS.bg,
                      borderRadius: 8,
                      border: `1px solid ${THEME_VARS.borderSoft}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: THEME_VARS.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {it.name}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: it.count > 1 ? THEME_VARS.primary : THEME_VARS.textMuted,
                      marginTop: 2,
                    }}>
                      × {it.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 物品详情(对话框层) */}
          {selectedItem && (
            <ItemDetailDialog
              open
              data={{
                name: selectedItem.name,
                category: selectedItem.category,
                count: selectedItem.count,
                desc: selectedItem.desc,
              }}
              onClose={() => setSelectedItem(null)}
            />
          )}
        </>
      )}
    </section>
  );
}

// ───────────────────────────────────────────────────────────
//  时间线视图
// ───────────────────────────────────────────────────────────

interface TimelineEvent {
  day?: number;
  time?: string;
  title: string;
  desc?: string;
  type?: string;
}

interface TimelineViewProps {
  mvu?: MvuRuntime | null;
}

function TimelineView({ mvu }: TimelineViewProps) {
  const events = useMemo<TimelineEvent[]>(() => {
    if (!mvu) return [];
    const sd = mvu.snapshot();
    const raw = (sd.近期事件 ?? sd.事件日志 ?? sd.历史 ?? []) as unknown;
    const list: TimelineEvent[] = [];
    if (Array.isArray(raw)) {
      for (const u of raw) {
        if (typeof u === 'string') {
          list.push({ title: u });
        } else if (u && typeof u === 'object') {
          const p = u as Record<string, unknown>;
          list.push({
            day: Number(p.天数 ?? p.day ?? 0) || undefined,
            time: String(p.时段 ?? p.time ?? ''),
            title: String(p.标题 ?? p.title ?? p.事件 ?? '事件'),
            desc: String(p.描述 ?? p.description ?? p.内容 ?? ''),
            type: String(p.类型 ?? p.type ?? ''),
          });
        }
      }
    } else if (raw && typeof raw === 'object') {
      for (const [u, p] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof p === 'string') {
          list.push({ title: u, desc: p });
        } else if (p && typeof p === 'object') {
          const f = p as Record<string, unknown>;
          list.push({
            day: Number(f.天数 ?? 0) || undefined,
            time: String(f.时段 ?? ''),
            title: String(f.标题 ?? u),
            desc: String(f.描述 ?? f.内容 ?? ''),
            type: String(f.类型 ?? ''),
          });
        }
      }
    }
    const order = ['早', '上午', '下午', '晚', '深夜'];
    return list.sort((a, b) => {
      const da = a.day ?? 0;
      const db = b.day ?? 0;
      return da !== db ? da - db : order.indexOf(a.time ?? '') - order.indexOf(b.time ?? '');
    });
  }, [mvu]);

  const currentDay = useMemo(() => {
    if (!mvu) return 0;
    const sd = mvu.snapshot();
    return Number((sd.时间 as Record<string, unknown> | undefined)?.天数 ?? 0);
  }, [mvu]);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📅 时间线</h4>
      {events.length === 0 ? (
        <div style={emptyStyle}>
          暂无事件记录(事件由 AI 在回合中追加到 stat_data.近期事件)
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 11,
            color: THEME_VARS.textMuted,
            marginBottom: 16,
            padding: 8,
            background: THEME_VARS.bg,
            borderRadius: 6,
          }}>
            共 {events.length} 条记录
            {currentDay > 0 ? ` · 当前第 ${currentDay} 天` : ''}
          </div>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              width: 2,
              background: `linear-gradient(180deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.borderSoft} 100%)`,
            }} />
            {events.map((e, idx) => {
              const isToday = e.day === currentDay;
              return (
                <div key={idx} style={{ position: 'relative', marginBottom: 14, paddingLeft: 16 }}>
                  <div style={{
                    position: 'absolute',
                    left: -19,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: isToday ? THEME_VARS.primary : THEME_VARS.overlay,
                    border: `2px solid ${isToday ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
                  }} />
                  <div style={{
                    padding: 10,
                    background: isToday ? `linear-gradient(135deg, ${THEME_VARS.primary}22 0%, transparent 100%)` : THEME_VARS.bg,
                    borderRadius: 8,
                    border: `1px solid ${isToday ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      {(e.day != null || e.time) && (
                        <span style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 6,
                          background: isToday ? THEME_VARS.primary + '22' : THEME_VARS.overlay,
                          color: isToday ? THEME_VARS.primary : THEME_VARS.textMuted,
                          fontWeight: 600,
                        }}>
                          {e.day != null && `D${e.day}`}
                          {e.day != null && e.time ? ' · ' : ''}
                          {e.time}
                        </span>
                      )}
                      {e.type && (
                        <span style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 6,
                          background: THEME_VARS.info + '22',
                          color: THEME_VARS.info,
                        }}>
                          {e.type}
                        </span>
                      )}
                      <strong style={{
                        fontSize: 12,
                        color: THEME_VARS.text,
                        flex: 1,
                      }}>
                        {e.title}
                      </strong>
                    </div>
                    {e.desc && (
                      <div style={{
                        fontSize: 11,
                        color: THEME_VARS.textMuted,
                        lineHeight: 1.5,
                      }}>
                        {e.desc}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
