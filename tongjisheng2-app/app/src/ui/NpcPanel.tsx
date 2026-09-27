/**
 * NPC 调试视图(阶段2 步骤7 · 恋爱游戏美化版)
 *
 * 职责:
 *  - NPC 日程可视化:20 女角 × 5 时段 × 7 区域热力图
 *  - NPC 关系网可视化:关系图边列表 + 关系类型色彩
 *  - NPC 行动日志:每轮 NPC 行动摘要 + 剧情触发记录
 *  - NPC 记忆查看:按女角查询记忆 + 态度修正
 */

import { useState, useEffect, useMemo } from 'react';
import { THEME_VARS } from './types';
import { scheduleEngine } from '../runtime/npc/schedule-engine';
import { relationshipGraph } from '../runtime/npc/relationship-graph';
import { plotTrigger } from '../runtime/npc/plot-trigger';
import { getHeroineMemories, computeAttitudeModifier } from '../runtime/npc/memory';
import type { NpcActionResult } from '../runtime/npc/action-runner';
import {
  HEROINE_LIST,
  ALL_TIME_SLOTS,
  ALL_REGIONS,
  type TimeSlot,
  type Region,
} from '../content/npc/schedule-data';

// ───────────────────────────────────────────────────────────
//  样式(恋爱游戏卡片风)
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

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 12,
  borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: THEME_VARS.fontDisplay,
  fontSize: 18,
  fontWeight: 500,
  color: THEME_VARS.primary,
  letterSpacing: 1.2,
};

const metaStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME_VARS.textMuted,
  fontFamily: THEME_VARS.fontMono,
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
  marginBottom: 16,
  padding: 4,
  background: THEME_VARS.bg,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: 'transparent',
  color: THEME_VARS.textMuted,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: THEME_VARS.fontBody,
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
  animation: 'soft-fade-in 0.3s ease',
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

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 11,
  borderRadius: 8,
  overflow: 'hidden',
};

const cellStyle: React.CSSProperties = {
  padding: '4px 6px',
  textAlign: 'center',
  borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
  borderRight: `1px solid ${THEME_VARS.borderSoft}`,
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  background: `linear-gradient(135deg, ${THEME_VARS.primarySoft} 0%, ${THEME_VARS.primary}33 100%)`,
  fontWeight: 600,
  fontSize: 10,
  color: THEME_VARS.text,
  letterSpacing: 0.5,
};

const btnStyle: React.CSSProperties = {
  padding: '6px 16px',
  background: `linear-gradient(135deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.primarySoft} 100%)`,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0.5,
  boxShadow: THEME_VARS.shadowSm,
};

const btnOffStyle: React.CSSProperties = {
  ...btnStyle,
  background: THEME_VARS.overlay,
  color: THEME_VARS.text,
  border: `1px solid ${THEME_VARS.border}`,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME_VARS.textMuted,
  marginRight: 8,
  fontFamily: THEME_VARS.fontBody,
};

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 6,
  border: `1px solid ${THEME_VARS.border}`,
  background: THEME_VARS.overlay,
  color: THEME_VARS.text,
  cursor: 'pointer',
  outline: 'none',
};

const statBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  background: THEME_VARS.primarySoft,
  color: THEME_VARS.primary,
};

const emptyHintStyle: React.CSSProperties = {
  color: THEME_VARS.textMuted,
  fontSize: 11,
  fontStyle: 'italic',
  padding: 12,
  textAlign: 'center',
};

// ───────────────────────────────────────────────────────────
//  关系类型颜色映射
// ───────────────────────────────────────────────────────────

const RELATION_COLORS: Record<string, string> = {
  '情敌': THEME_VARS.danger,
  '母女': THEME_VARS.warning,
  '姐妹': THEME_VARS.accent,
  '朋友': THEME_VARS.success,
  '同班': THEME_VARS.info,
  '邻居': THEME_VARS.textMuted,
  '前辈': THEME_VARS.primary,
  '后辈': THEME_VARS.textSoft,
};

const PLOT_TYPE_COLORS: Record<string, string> = {
  encounter: THEME_VARS.success,
  miss: THEME_VARS.warning,
  independent: THEME_VARS.primary,
};

// ───────────────────────────────────────────────────────────
//  组件
// ───────────────────────────────────────────────────────────

export interface NpcPanelProps {
  /** 当前游戏内天数 */
  dayCount: number;
  /** 当前时段 */
  timeSlot: TimeSlot;
  /** 最近一次 NPC 行动结果(来自 Kernel.commit) */
  lastNpcAction?: NpcActionResult;
  /** 是否只读 */
  readOnly?: boolean;
}

export function NpcPanel({ dayCount, timeSlot, lastNpcAction, readOnly = false }: NpcPanelProps) {
  const [tab, setTab] = useState<'schedule' | 'relations' | 'actions' | 'memory'>('schedule');
  const [selectedHeroineId, setSelectedHeroineId] = useState<number>(1);
  const [memories, setMemories] = useState<Array<{
    id: string;
    heroineId: number;
    type: string;
    content: string;
    dayCount: number;
    impact?: string;
    weight?: number;
    timestamp: number;
  }>>([]);
  const [attitudeMod, setAttitudeMod] = useState(0);

  // 加载选中女角的记忆
  useEffect(() => {
    if (tab !== 'memory') return;
    getHeroineMemories(selectedHeroineId).then((mems) => {
      setMemories(mems as typeof memories);
      setAttitudeMod(computeAttitudeModifier(mems));
    });
  }, [tab, selectedHeroineId]);

  // 当日可遇女角
  const dayHeroines = useMemo(() => {
    return scheduleEngine.getDayHeroines(dayCount);
  }, [dayCount]);

  // 日程热力图数据:heroineId × timeSlot → Region[]
  const scheduleMap = useMemo(() => {
    const map = new Map<number, Record<TimeSlot, Region[]>>();
    for (const h of HEROINE_LIST) {
      const schedule = scheduleEngine.getHeroineDaySchedule(h.id, dayCount);
      const bySlot = {} as Record<TimeSlot, Region[]>;
      for (const slot of ALL_TIME_SLOTS) {
        bySlot[slot] = schedule
          .filter((s) => s.timeSlot === slot)
          .map((s) => s.region);
      }
      map.set(h.id, bySlot);
    }
    return map;
  }, [dayCount]);

  // 关系边
  const relationEdges = useMemo(() => relationshipGraph.getAllEdges(), []);

  // 选中女角的关系
  const selectedRelations = useMemo(() => {
    return relationshipGraph.getRelations(selectedHeroineId);
  }, [selectedHeroineId]);

  // 选中女角的剧情节点
  const plotNodes = useMemo(() => {
    return plotTrigger.getHeroinePlotNodes(selectedHeroineId);
  }, [selectedHeroineId]);

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h3 style={titleStyle}> npc 自然行动系统</h3>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
            阶段2 · NPC Behavior Engine
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={metaStyle}>
            <span style={{ color: THEME_VARS.primary }}>♥</span> Day {dayCount} · {timeSlot}
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={statBadgeStyle}>
              当日可遇 {dayHeroines.length} 人
            </span>
          </div>
        </div>
      </header>

      {/* Tab 切换 */}
      <div style={tabBarStyle}>
        {([
          ['schedule', '日程热力图', '📅'],
          ['relations', '关系网', '💗'],
          ['actions', '行动日志', '✨'],
          ['memory', 'NPC 记忆', '🌸'],
        ] as const).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={tab === key ? tabBtnActiveStyle : tabBtnStyle}
            disabled={readOnly}
          >
            <span style={{ marginRight: 4 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {tab === 'schedule' && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}> 20 女角 × 5 时段日程热力图</h4>
          <div style={{ overflowX: 'auto', borderRadius: 8 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, textAlign: 'left', padding: '6px 10px' }}>女角</th>
                  {ALL_TIME_SLOTS.map((slot) => (
                    <th key={slot} style={headerCellStyle}>{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEROINE_LIST.map((h, idx) => {
                  const schedule = scheduleMap.get(h.id);
                  const isAvailable = dayHeroines.some((d) => d.heroineId === h.id);
                  return (
                    <tr
                      key={h.id}
                      style={{
                        opacity: isAvailable ? 1 : 0.45,
                        background: idx % 2 === 0 ? 'transparent' : THEME_VARS.borderSoft + '33',
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      <td style={{
                        ...cellStyle,
                        textAlign: 'left',
                        padding: '6px 10px',
                        fontWeight: 500,
                        color: isAvailable ? THEME_VARS.primary : THEME_VARS.text,
                      }}>
                        <span style={{ color: THEME_VARS.textMuted, fontSize: 9, marginRight: 4 }}>
                          {String(h.id).padStart(2, '0')}
                        </span>
                        {h.name}
                        {h.hidden && <span style={{ marginLeft: 4 }}></span>}
                      </td>
                      {ALL_TIME_SLOTS.map((slot) => {
                        const regions = schedule?.[slot] ?? [];
                        const hasRegion = regions.length > 0;
                        return (
                          <td
                            key={slot}
                            style={{
                              ...cellStyle,
                              background: hasRegion
                                ? `linear-gradient(135deg, ${THEME_VARS.primarySoft}44 0%, ${THEME_VARS.primary}22 100%)`
                                : 'transparent',
                              fontSize: 9,
                              color: hasRegion ? THEME_VARS.primary : THEME_VARS.textMuted,
                              fontWeight: hasRegion ? 600 : 400,
                            }}
                          >
                            {hasRegion
                              ? regions.map((r) => r.replace('八十八', '').replace('周边', '')).join('/')
                              : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{
            fontSize: 10,
            color: THEME_VARS.textMuted,
            marginTop: 10,
            padding: '8px 12px',
            background: THEME_VARS.bg,
            borderRadius: 6,
            borderLeft: `3px solid ${THEME_VARS.primary}`,
          }}>
            <span style={{ color: THEME_VARS.primary }}>提示:</span>
            透明 = 当日不可遇 · 高亮 = 该时段有出现位置 ·  = 隐藏女角(需解锁)
          </div>
        </section>
      )}

      {tab === 'relations' && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}> NPC 关系网</h4>
          {/* 女角选择器 */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>选择女角:</label>
            <select
              value={selectedHeroineId}
              onChange={(e) => setSelectedHeroineId(Number(e.target.value))}
              style={selectStyle}
            >
              {HEROINE_LIST.map((h) => (
                <option key={h.id} value={h.id}>
                  {String(h.id).padStart(2, '0')}. {h.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
              ({selectedRelations.length} 条直接关系)
            </span>
          </div>

          {/* 选中女角的关系 */}
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: `linear-gradient(135deg, ${THEME_VARS.primarySoft}22 0%, transparent 100%)`,
            borderRadius: 10,
            border: `1px solid ${THEME_VARS.borderSoft}`,
          }}>
            <strong style={{
              display: 'block',
              marginBottom: 8,
              color: THEME_VARS.primary,
              fontFamily: THEME_VARS.fontDisplay,
              fontSize: 13,
            }}>
              {HEROINE_LIST.find((h) => h.id === selectedHeroineId)?.name} 的直接关系
            </strong>
            {selectedRelations.length === 0 ? (
              <div style={emptyHintStyle}>无直接关系</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 11 }}>
                {selectedRelations.map((r, i) => {
                  const relColor = RELATION_COLORS[r.type] ?? THEME_VARS.text;
                  return (
                    <li key={i} style={{
                      padding: '6px 8px',
                      marginBottom: 4,
                      background: THEME_VARS.overlay,
                      borderRadius: 6,
                      borderLeft: `3px solid ${relColor}`,
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 8px',
                        background: relColor + '22',
                        color: relColor,
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 600,
                        marginRight: 8,
                      }}>
                        {r.type}
                      </span>
                      <strong>{HEROINE_LIST.find((h) => h.id === r.otherId)?.name ?? r.otherId}</strong>
                      <span style={{ color: THEME_VARS.textMuted, marginLeft: 8 }}>
                        强度 {r.strength}
                      </span>
                      {r.note && (
                        <div style={{ color: THEME_VARS.textMuted, marginTop: 2, fontSize: 10 }}>
                          {r.note}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 全图关系边 */}
          <div style={{ marginBottom: 16 }}>
            <strong style={{
              display: 'block',
              marginBottom: 8,
              color: THEME_VARS.text,
              fontSize: 12,
            }}>
              全图关系边({relationEdges.length} 条)
            </strong>
            <div style={{ maxHeight: 280, overflowY: 'auto', borderRadius: 8, border: `1px solid ${THEME_VARS.borderSoft}` }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>女角A</th>
                    <th style={headerCellStyle}>女角B</th>
                    <th style={headerCellStyle}>关系</th>
                    <th style={headerCellStyle}>强度</th>
                  </tr>
                </thead>
                <tbody>
                  {relationEdges.map((e, i) => {
                    const relColor = RELATION_COLORS[e.type] ?? THEME_VARS.text;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : THEME_VARS.borderSoft + '33' }}>
                        <td style={cellStyle}>{HEROINE_LIST.find((h) => h.id === e.a)?.name ?? e.a}</td>
                        <td style={cellStyle}>{HEROINE_LIST.find((h) => h.id === e.b)?.name ?? e.b}</td>
                        <td style={{ ...cellStyle, color: relColor, fontWeight: 600 }}>{e.type}</td>
                        <td style={cellStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            background: relColor + '22',
                            borderRadius: 6,
                            fontSize: 10,
                          }}>
                            {e.strength}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 剧情节点 */}
          <div>
            <strong style={{
              display: 'block',
              marginBottom: 8,
              color: THEME_VARS.text,
              fontSize: 12,
            }}>
              剧情节点({plotNodes.length} 个)
            </strong>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 11 }}>
              {plotNodes.map((n, i) => (
                <li key={i} style={{
                  padding: '8px 12px',
                  marginBottom: 4,
                  background: THEME_VARS.bg,
                  borderRadius: 8,
                  borderLeft: `3px solid ${n.requiresPlayerPresence ? THEME_VARS.warning : THEME_VARS.primary}`,
                }}>
                  <div>
                    <span style={{ color: THEME_VARS.textMuted }}>Day</span>{' '}
                    <strong>{Array.isArray(n.dayCount) ? n.dayCount.join('/') : n.dayCount}</strong>
                    {' · '}
                    <span style={{ color: THEME_VARS.primary, fontWeight: 500 }}>{n.event}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: 6,
                      background: (n.requiresPlayerPresence ? THEME_VARS.warning : THEME_VARS.primary) + '22',
                      color: n.requiresPlayerPresence ? THEME_VARS.warning : THEME_VARS.primary,
                    }}>
                      {n.requiresPlayerPresence ? '需玩家在场' : 'NPC独立'}
                    </span>
                    {n.condition && (
                      <span style={{ marginLeft: 8, color: THEME_VARS.warning }}>
                        ({n.condition})
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'actions' && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}> NPC 行动日志</h4>
          {!lastNpcAction ? (
            <div style={{
              ...emptyHintStyle,
              padding: 32,
              fontSize: 13,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}> </div>
              尚未运行 NPC 自然行动
              <div style={{ fontSize: 10, marginTop: 6 }}>
                点击上方"运行 NPC 自然行动"按钮开始
              </div>
            </div>
          ) : (
            <>
              {/* 行动摘要 */}
              <div style={{
                marginBottom: 16,
                padding: 12,
                background: `linear-gradient(135deg, ${THEME_VARS.primarySoft}33 0%, transparent 100%)`,
                borderRadius: 10,
                border: `1px solid ${THEME_VARS.borderSoft}`,
              }}>
                <strong style={{
                  display: 'block',
                  marginBottom: 6,
                  color: THEME_VARS.primary,
                  fontSize: 12,
                  fontFamily: THEME_VARS.fontDisplay,
                }}>
                   行动摘要
                </strong>
                <div style={{
                  fontSize: 11,
                  color: THEME_VARS.text,
                  lineHeight: 1.6,
                  padding: 8,
                  background: THEME_VARS.overlay,
                  borderRadius: 6,
                }}>
                  {lastNpcAction.actionSummary || '(无场外行动)'}
                </div>
              </div>

              {/* 统计卡片 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}>
                <div style={{
                  padding: 12,
                  background: THEME_VARS.overlay,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: THEME_VARS.primary }}>
                    {lastNpcAction.offScreenActions.length}
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                    场外行动
                  </div>
                </div>
                <div style={{
                  padding: 12,
                  background: THEME_VARS.overlay,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: THEME_VARS.success }}>
                    {lastNpcAction.plotTriggers.length}
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                    剧情触发
                  </div>
                </div>
                <div style={{
                  padding: 12,
                  background: THEME_VARS.overlay,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: THEME_VARS.info }}>
                    {lastNpcAction.stateOps.length}
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                    状态变更
                  </div>
                </div>
              </div>

              {/* 场外行动列表 */}
              <div style={{ marginBottom: 16 }}>
                <strong style={{
                  display: 'block',
                  marginBottom: 8,
                  color: THEME_VARS.text,
                  fontSize: 12,
                }}>
                  场外女角行动
                </strong>
                {lastNpcAction.offScreenActions.length === 0 ? (
                  <div style={emptyHintStyle}>无</div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 8 }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={headerCellStyle}>女角</th>
                          <th style={headerCellStyle}>位置</th>
                          <th style={{ ...headerCellStyle, textAlign: 'left' }}>行动</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastNpcAction.offScreenActions.map((a, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : THEME_VARS.borderSoft + '33' }}>
                            <td style={{ ...cellStyle, fontWeight: 500, color: THEME_VARS.primary }}>
                              {a.heroineName}
                            </td>
                            <td style={cellStyle}>{a.location}</td>
                            <td style={{ ...cellStyle, textAlign: 'left', fontSize: 10 }}>
                              {a.action}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 剧情触发 */}
              <div style={{ marginBottom: 16 }}>
                <strong style={{
                  display: 'block',
                  marginBottom: 8,
                  color: THEME_VARS.text,
                  fontSize: 12,
                }}>
                   剧情触发({lastNpcAction.plotTriggers.length} 个)
                </strong>
                {lastNpcAction.plotTriggers.length === 0 ? (
                  <div style={emptyHintStyle}>无</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 11 }}>
                    {lastNpcAction.plotTriggers.map((t, i) => {
                      const typeColor = PLOT_TYPE_COLORS[t.type] ?? THEME_VARS.text;
                      return (
                        <li key={i} style={{
                          padding: '8px 12px',
                          marginBottom: 4,
                          background: THEME_VARS.overlay,
                          borderRadius: 8,
                          borderLeft: `3px solid ${typeColor}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              padding: '1px 8px',
                              background: typeColor + '22',
                              color: typeColor,
                              borderRadius: 8,
                              fontSize: 10,
                              fontWeight: 600,
                            }}>
                              {t.type}
                            </span>
                            <strong style={{ color: THEME_VARS.text }}>
                              {t.node.heroineName}
                            </strong>
                            <span style={{ color: THEME_VARS.textMuted }}>—</span>
                            <span style={{ color: THEME_VARS.primary }}>{t.node.event}</span>
                          </div>
                          {t.reason && (
                            <div style={{ color: THEME_VARS.textMuted, marginTop: 4, fontSize: 10 }}>
                              {t.reason}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* 状态变更 ops */}
              <div style={{ marginBottom: 16 }}>
                <strong style={{
                  display: 'block',
                  marginBottom: 8,
                  color: THEME_VARS.text,
                  fontSize: 12,
                }}>
                   状态变更 ops({lastNpcAction.stateOps.length} 条)
                </strong>
                {lastNpcAction.stateOps.length === 0 ? (
                  <div style={emptyHintStyle}>无</div>
                ) : (
                  <div style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    fontSize: 10,
                    fontFamily: THEME_VARS.fontMono,
                    background: THEME_VARS.bg,
                    borderRadius: 8,
                    padding: 8,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                  }}>
                    {lastNpcAction.stateOps.map((op, i) => (
                      <div key={i} style={{
                        padding: '3px 6px',
                        marginBottom: 2,
                        background: THEME_VARS.overlay,
                        borderRadius: 4,
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 5px',
                          background: THEME_VARS.primary + '22',
                          color: THEME_VARS.primary,
                          borderRadius: 3,
                          fontSize: 9,
                          fontWeight: 600,
                          marginRight: 6,
                        }}>
                          {op.op}
                        </span>
                        <span style={{ color: THEME_VARS.text }}>{op.path}</span>
                        <span style={{ color: THEME_VARS.textMuted }}> = </span>
                        <span style={{ color: THEME_VARS.info }}>
                          {JSON.stringify(op.value).slice(0, 60)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trace */}
              <div>
                <strong style={{
                  display: 'block',
                  marginBottom: 8,
                  color: THEME_VARS.text,
                  fontSize: 12,
                }}>
                   Trace({lastNpcAction.traces.length} 条)
                </strong>
                <div style={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  fontSize: 10,
                  fontFamily: THEME_VARS.fontMono,
                  background: THEME_VARS.bg,
                  borderRadius: 8,
                  padding: 8,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                }}>
                  {lastNpcAction.traces.map((t, i) => (
                    <div key={i} style={{ padding: '2px 6px', marginBottom: 1 }}>
                      <span style={{ color: THEME_VARS.textMuted }}>[{t.step}]</span>{' '}
                      <span style={{ color: THEME_VARS.text }}>{t.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'memory' && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}>  NPC 记忆</h4>
          {/* 女角选择器 */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>选择女角:</label>
            <select
              value={selectedHeroineId}
              onChange={(e) => setSelectedHeroineId(Number(e.target.value))}
              style={selectStyle}
            >
              {HEROINE_LIST.map((h) => (
                <option key={h.id} value={h.id}>
                  {String(h.id).padStart(2, '0')}. {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* 态度修正 */}
          <div style={{
            padding: 14,
            background: `linear-gradient(135deg, ${
              attitudeMod > 0 ? THEME_VARS.success
              : attitudeMod < 0 ? THEME_VARS.danger
              : THEME_VARS.textMuted
            }22 0%, transparent 100%)`,
            borderRadius: 12,
            marginBottom: 12,
            border: `1px solid ${THEME_VARS.borderSoft}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontSize: 11,
                color: THEME_VARS.textMuted,
                marginBottom: 4,
                letterSpacing: 0.5,
              }}>
                态度修正值
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 600,
                fontFamily: THEME_VARS.fontDisplay,
                color: attitudeMod > 0 ? THEME_VARS.success
                  : attitudeMod < 0 ? THEME_VARS.danger
                  : THEME_VARS.textMuted,
              }}>
                {attitudeMod > 0 ? '+' : ''}{attitudeMod}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10, color: THEME_VARS.textMuted }}>
              {attitudeMod > 0 ? '♥ 接近玩家' : attitudeMod < 0 ? '♡ 回避玩家' : '○ 中立'}
            </div>
          </div>

          {/* 记忆列表 */}
          <div>
            <strong style={{
              display: 'block',
              marginBottom: 8,
              color: THEME_VARS.text,
              fontSize: 12,
            }}>
               记忆列表({memories.length} 条)
            </strong>
            {memories.length === 0 ? (
              <div style={{
                ...emptyHintStyle,
                padding: 32,
                fontSize: 13,
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}> </div>
                暂无记忆
                <div style={{ fontSize: 10, marginTop: 6 }}>
                  与该女角互动后,记忆将自动记录
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {memories.map((m) => (
                  <div key={m.id} style={{
                    padding: 10,
                    marginBottom: 8,
                    background: THEME_VARS.overlay,
                    borderRadius: 10,
                    fontSize: 11,
                    borderLeft: `3px solid ${THEME_VARS.primary}`,
                    boxShadow: THEME_VARS.shadowSm,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>
                        <strong style={{
                          display: 'inline-block',
                          padding: '1px 8px',
                          background: THEME_VARS.primary + '22',
                          color: THEME_VARS.primary,
                          borderRadius: 8,
                          fontSize: 10,
                          marginRight: 6,
                        }}>
                          {m.type}
                        </strong>
                        <span style={{ color: THEME_VARS.textMuted }}>Day {m.dayCount}</span>
                        {m.weight && (
                          <span style={{ color: THEME_VARS.textMuted, marginLeft: 8 }}>
                            · 权重 {m.weight}
                          </span>
                        )}
                      </span>
                      <span style={{ color: THEME_VARS.textMuted, fontSize: 10 }}>
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, color: THEME_VARS.text, lineHeight: 1.5 }}>
                      {m.content}
                    </div>
                    {m.impact && (
                      <div style={{
                        color: THEME_VARS.textMuted,
                        marginTop: 4,
                        fontSize: 10,
                        padding: '2px 6px',
                        background: THEME_VARS.bg,
                        borderRadius: 4,
                        display: 'inline-block',
                      }}>
                        影响: {m.impact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
