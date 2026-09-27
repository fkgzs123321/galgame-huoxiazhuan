/**
 * 阶段2 步骤9 面板:H 场景结算 + 多女角扩展(恋爱游戏美化版)
 * 阶段3 步骤3 增强:CG 画廊 + 自动解锁条件评估
 *
 * 职责:
 *  - H 场景结算调试:触发条件 + 评估结果 + 结算页
 *  - 多女角管理:女角列表 + 切换 + 在场状态
 *  - CG 画廊:统计/筛选/解锁条件展示 + 评估并解锁按钮
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { THEME_VARS } from './types';
import { hSceneEngine, type HSceneType, type HSceneSettlement } from '../runtime/h-scene-engine';
import { heroineManager, type HeroineSummary, type HeroineSwitchResult, type MultiHeroineState } from '../runtime/heroine-manager';
import { cgGallery, type CGEntry, type CGType } from '../runtime/cg-gallery';
import { getCgArt } from '../runtime/cg-art';
import type { MvuRuntime } from '../runtime/mvu-runtime';
import { HEROINE_LIST } from '../content/npc/schedule-data';

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

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: `1px solid ${THEME_VARS.border}`,
  background: THEME_VARS.overlay,
  color: THEME_VARS.text,
  fontSize: 12,
  outline: 'none',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 20px',
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

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME_VARS.textMuted,
  marginBottom: 4,
  display: 'block',
  letterSpacing: 0.3,
};

const H_SCENE_TYPE_LABELS: Record<HSceneType, string> = {
  'first-time': '初H(破处)',
  'advanced': '进阶H',
  'normal': '常规H',
  'peeking': '偷拍/偷窥',
  'forced': '强迫',
  'intimate': '亲密接触',
  'tease': '调情/挑逗',
};

const H_SCENE_TYPE_COLORS: Record<HSceneType, string> = {
  'first-time': THEME_VARS.danger,
  'advanced': THEME_VARS.primary,
  'normal': THEME_VARS.info,
  'peeking': THEME_VARS.textMuted,
  'forced': THEME_VARS.danger,
  'intimate': THEME_VARS.success,
  'tease': THEME_VARS.warning,
};

// ───────────────────────────────────────────────────────────
//  CG 画廊常量
// ───────────────────────────────────────────────────────────

const CG_TYPE_LABELS: Record<CGType, string> = {
  'h-first': '初H',
  'h-advanced': '进阶H',
  'h-normal': '常规H',
  'event': '事件',
  'portrait': '立绘',
};

const CG_TYPE_COLORS: Record<CGType, string> = {
  'h-first': THEME_VARS.danger,
  'h-advanced': THEME_VARS.primary,
  'h-normal': THEME_VARS.info,
  'event': THEME_VARS.warning,
  'portrait': THEME_VARS.success,
};

const CG_TYPE_FILTERS: Array<{ value: 'all' | CGType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'h-first', label: '初H' },
  { value: 'h-advanced', label: '进阶H' },
  { value: 'h-normal', label: '常规H' },
  { value: 'event', label: '事件' },
  { value: 'portrait', label: '立绘' },
];

// ───────────────────────────────────────────────────────────
//  组件
// ───────────────────────────────────────────────────────────

export interface Stage2Step9PanelProps {
  /** MVU 运行时(用于多女角管理) */
  mvu?: MvuRuntime;
  /** 是否只读 */
  readOnly?: boolean;
}

export function Stage2Step9Panel({ mvu, readOnly = false }: Stage2Step9PanelProps) {
  const [tab, setTab] = useState<'hscene' | 'heroines' | 'gallery'>('hscene');

  // H 场景表单状态
  const [hForm, setHForm] = useState({
    heroineName: '鸣泽美佐子',
    relationshipStage: '恋人',
    favorability: 85,
    location: '鸣泽家',
    timeSlot: '深夜',
    hasHHistory: false,
    isConsensual: true,
    triggerAction: '与美佐子拥抱亲吻,渐入佳境',
  });
  const [hSettlement, setHSettlement] = useState<HSceneSettlement | null>(null);
  // 阶段3 步骤3:settleAndUnlock 返回的 CG 解锁信息
  const [hNewlyUnlockedCG, setHNewlyUnlockedCG] = useState<CGEntry | null>(null);

  // 多女角状态
  const [heroineSummaries, setHeroineSummaries] = useState<HeroineSummary[]>([]);
  const [switchResult, setSwitchResult] = useState<HeroineSwitchResult | null>(null);
  const [multiState, setMultiState] = useState<MultiHeroineState | null>(null);
  const [presentHeroines, setPresentHeroines] = useState<string[]>([]);

  // ─── 阶段3 步骤3:CG 画廊状态 ───
  const [cgList, setCgList] = useState<CGEntry[]>([]);
  const [cgFilterType, setCgFilterType] = useState<'all' | CGType>('all');
  const [cgFilterStatus, setCgFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [cgNewlyUnlocked, setCgNewlyUnlocked] = useState<CGEntry[]>([]);
  const [cgMessage, setCgMessage] = useState<{ type: 'ok' | 'info' | 'fail'; text: string } | null>(null);
  const [cgLoading, setCgLoading] = useState(false);

  // 初始化:加载 CG 画廊
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await cgGallery.load();
        if (!cancelled) setCgList(cgGallery.getAll());
      } catch {
        // 忽略
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 刷新 CG 列表
  const refreshCGList = useCallback(() => {
    setCgList(cgGallery.getAll());
  }, []);

  // 评估并解锁 CG
  const handleEvaluateAndUnlockCGs = useCallback(async () => {
    if (!mvu || readOnly) return;
    setCgLoading(true);
    setCgMessage(null);
    try {
      const statData = mvu.snapshot();
      const newlyUnlocked = await hSceneEngine.evaluateAndUnlockCGs(statData);
      setCgNewlyUnlocked(newlyUnlocked);
      refreshCGList();
      if (newlyUnlocked.length > 0) {
        setCgMessage({
          type: 'ok',
          text: `新解锁 ${newlyUnlocked.length} 张 CG:${newlyUnlocked.map((c) => c.title).join('、')}`,
        });
      } else {
        setCgMessage({ type: 'info', text: '本次评估无新解锁的 CG(条件未达成或已全部解锁)' });
      }
    } catch (e) {
      setCgMessage({ type: 'fail', text: `评估失败:${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setCgLoading(false);
    }
  }, [mvu, readOnly, refreshCGList]);

  // 手动解锁某张 CG(调试用)
  const handleManualUnlock = useCallback(async (cgId: string) => {
    if (readOnly) return;
    setCgLoading(true);
    try {
      const ok = await cgGallery.unlock(cgId);
      refreshCGList();
      setCgMessage({
        type: ok ? 'ok' : 'info',
        text: ok ? `已手动解锁:${cgId}` : `CG 已解锁或不存在:${cgId}`,
      });
    } finally {
      setCgLoading(false);
    }
  }, [readOnly, refreshCGList]);

  // 筛选后的 CG 列表
  const filteredCGList = useMemo(() => {
    return cgList.filter((c) => {
      if (cgFilterType !== 'all' && c.type !== cgFilterType) return false;
      if (cgFilterStatus === 'unlocked' && !c.unlocked) return false;
      if (cgFilterStatus === 'locked' && c.unlocked) return false;
      return true;
    });
  }, [cgList, cgFilterType, cgFilterStatus]);

  // CG 统计
  const cgStats = useMemo(() => {
    const total = cgList.length;
    const unlocked = cgList.filter((c) => c.unlocked).length;
    return { total, unlocked, locked: total - unlocked, percent: total > 0 ? (unlocked / total) * 100 : 0 };
  }, [cgList]);

  // 按 CG 类型分组统计
  const cgStatsByType = useMemo(() => {
    const groups: Record<CGType, { total: number; unlocked: number }> = {
      'h-first': { total: 0, unlocked: 0 },
      'h-advanced': { total: 0, unlocked: 0 },
      'h-normal': { total: 0, unlocked: 0 },
      'event': { total: 0, unlocked: 0 },
      'portrait': { total: 0, unlocked: 0 },
    };
    for (const c of cgList) {
      groups[c.type].total++;
      if (c.unlocked) groups[c.type].unlocked++;
    }
    return groups;
  }, [cgList]);

  // H 场景结算(阶段3 步骤3:同时调用 CG 解锁)
  const handleSettleHScene = useCallback(async () => {
    const { settlement, newlyUnlockedCG } = await hSceneEngine.settleAndUnlock({
      heroineName: hForm.heroineName,
      relationshipStage: hForm.relationshipStage,
      minFavorability: hForm.favorability,
      location: hForm.location,
      timeSlot: hForm.timeSlot,
      hasHHistory: hForm.hasHHistory,
      isConsensual: hForm.isConsensual,
      triggerAction: hForm.triggerAction,
    });
    setHSettlement(settlement);
    setHNewlyUnlockedCG(newlyUnlockedCG);
    if (newlyUnlockedCG) refreshCGList();
  }, [hForm, refreshCGList]);

  // 加载女角列表
  const loadHeroineSummaries = useCallback(() => {
    if (!mvu) return;
    setHeroineSummaries(heroineManager.getAllHeroineSummaries(mvu));
  }, [mvu]);

  // 切换女角
  const handleSwitchHeroine = useCallback((targetName: string) => {
    if (!mvu) return;
    const result = heroineManager.switchHeroine(mvu, targetName);
    setSwitchResult(result);
    if (result.ok) {
      loadHeroineSummaries();
    }
  }, [mvu, loadHeroineSummaries]);

  // 计算多女角在场状态
  const handleComputeMultiState = useCallback(() => {
    if (!mvu || presentHeroines.length === 0) return;
    const result = heroineManager.computeMultiHeroineState(mvu, presentHeroines);
    setMultiState(result);
  }, [mvu, presentHeroines]);

  // 女角选择切换(在场)
  const togglePresentHeroine = useCallback((name: string) => {
    setPresentHeroines((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }
      return [...prev, name];
    });
  }, []);

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
           阶段2 步骤9 · H 场景结算 + 多女角扩展
        </h3>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
          Stage 2 Step 9 · H-Scene Settlement + Multi-Heroine
        </div>
      </header>

      {/* Tab 切换 */}
      <div style={tabBarStyle}>
        {([
          ['hscene', 'H 场景结算', '💕'],
          ['heroines', '多女角管理', '👯'],
          ['gallery', 'CG 画廊', '🖼'],
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

      {/* H 场景结算 Tab */}
      {tab === 'hscene' && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}> H 场景触发条件</h4>

          {/* 表单 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>女角姓名</label>
              <select
                value={hForm.heroineName}
                onChange={(e) => setHForm({ ...hForm, heroineName: e.target.value })}
                style={selectStyle}
                disabled={readOnly}
              >
                {HEROINE_LIST.filter((h) => !h.hidden).map((h) => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>关系阶段</label>
              <select
                value={hForm.relationshipStage}
                onChange={(e) => setHForm({ ...hForm, relationshipStage: e.target.value })}
                style={selectStyle}
                disabled={readOnly}
              >
                <option value="初识">初识</option>
                <option value="暧昧">暧昧</option>
                <option value="恋人">恋人</option>
                <option value="亲密">亲密</option>
                <option value="情人">情人</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>好感度({hForm.favorability})</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={hForm.favorability}
                onChange={(e) => setHForm({ ...hForm, favorability: Number(e.target.value) })}
                style={{ width: '100%' }}
                disabled={readOnly}
              />
            </div>
            <div>
              <label style={labelStyle}>位置</label>
              <input
                type="text"
                value={hForm.location}
                onChange={(e) => setHForm({ ...hForm, location: e.target.value })}
                style={inputStyle}
                disabled={readOnly}
              />
            </div>
            <div>
              <label style={labelStyle}>时段</label>
              <select
                value={hForm.timeSlot}
                onChange={(e) => setHForm({ ...hForm, timeSlot: e.target.value })}
                style={selectStyle}
                disabled={readOnly}
              >
                <option value="早">早</option>
                <option value="上午">上午</option>
                <option value="下午">下午</option>
                <option value="晚">晚</option>
                <option value="深夜">深夜</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={hForm.hasHHistory}
                  onChange={(e) => setHForm({ ...hForm, hasHHistory: e.target.checked })}
                  disabled={readOnly}
                />{' '}已有H经历
              </label>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={hForm.isConsensual}
                  onChange={(e) => setHForm({ ...hForm, isConsensual: e.target.checked })}
                  disabled={readOnly}
                />{' '}自愿
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>触发动作描述</label>
            <textarea
              value={hForm.triggerAction}
              onChange={(e) => setHForm({ ...hForm, triggerAction: e.target.value })}
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              disabled={readOnly}
            />
          </div>

          <button
            onClick={handleSettleHScene}
            style={btnStyle}
            disabled={readOnly}
          >
             评估 H 场景
          </button>

          {/* 结算结果 */}
          {hSettlement && (
            <div style={{ marginTop: 16 }}>
              {/* 触发状态 */}
              <div style={{
                padding: 12,
                borderRadius: 10,
                marginBottom: 12,
                background: hSettlement.evaluation.triggered
                  ? `linear-gradient(135deg, ${THEME_VARS.success}22 0%, transparent 100%)`
                  : `linear-gradient(135deg, ${THEME_VARS.warning}22 0%, transparent 100%)`,
                border: `1px solid ${THEME_VARS.borderSoft}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    background: hSettlement.evaluation.triggered
                      ? THEME_VARS.success + '22'
                      : THEME_VARS.warning + '22',
                    color: hSettlement.evaluation.triggered ? THEME_VARS.success : THEME_VARS.warning,
                  }}>
                    {hSettlement.evaluation.triggered ? '✓ 触发' : '✗ 未触发'}
                  </span>
                  {hSettlement.evaluation.triggered && (
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: (H_SCENE_TYPE_COLORS[hSettlement.evaluation.type] ?? THEME_VARS.text) + '22',
                      color: H_SCENE_TYPE_COLORS[hSettlement.evaluation.type] ?? THEME_VARS.text,
                    }}>
                      {H_SCENE_TYPE_LABELS[hSettlement.evaluation.type]}
                    </span>
                  )}
                  {hSettlement.evaluation.cgId && (
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: THEME_VARS.primary + '22',
                      color: THEME_VARS.primary,
                    }}>
                      CG: {hSettlement.evaluation.cgId.slice(0, 20)}...
                    </span>
                  )}
                </div>
                {hSettlement.evaluation.reason && (
                  <div style={{ color: THEME_VARS.textMuted, fontSize: 11 }}>
                    {hSettlement.evaluation.reason}
                  </div>
                )}
              </div>

              {/* 结算摘要 */}
              {hSettlement.evaluation.triggered && (
                <>
                  <div style={{
                    padding: 12,
                    background: THEME_VARS.bg,
                    borderRadius: 10,
                    marginBottom: 12,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                  }}>
                    <strong style={{
                      display: 'block',
                      marginBottom: 6,
                      color: THEME_VARS.primary,
                      fontFamily: THEME_VARS.fontDisplay,
                      fontSize: 12,
                    }}>
                       结算摘要
                    </strong>
                    <pre style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontSize: 11,
                      fontFamily: THEME_VARS.fontBody,
                      color: THEME_VARS.text,
                      lineHeight: 1.6,
                    }}>
                      {hSettlement.summary}
                    </pre>
                  </div>

                  {/* CG 描述 */}
                  {hSettlement.cgDescription && (
                    <div style={{
                      padding: 12,
                      background: `linear-gradient(135deg, ${THEME_VARS.primarySoft}22 0%, transparent 100%)`,
                      borderRadius: 10,
                      marginBottom: 12,
                      border: `1px solid ${THEME_VARS.borderSoft}`,
                    }}>
                      <strong style={{
                        display: 'block',
                        marginBottom: 6,
                        color: THEME_VARS.primary,
                        fontSize: 12,
                      }}>
                         CG 描述
                      </strong>
                      <div style={{ fontSize: 11, color: THEME_VARS.text, lineHeight: 1.6 }}>
                        {hSettlement.cgDescription}
                      </div>
                    </div>
                  )}

                  {/* 身体状态变化 */}
                  <div style={{
                    padding: 12,
                    background: THEME_VARS.overlay,
                    borderRadius: 10,
                    marginBottom: 12,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                  }}>
                    <strong style={{
                      display: 'block',
                      marginBottom: 8,
                      color: THEME_VARS.text,
                      fontSize: 12,
                    }}>
                       身体状态变化
                    </strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 4 }}>
                      {hSettlement.bodyChanges.map((c, i) => (
                        <div key={i} style={{
                          padding: '4px 8px',
                          background: THEME_VARS.bg,
                          borderRadius: 6,
                          fontSize: 10,
                          color: THEME_VARS.text,
                          borderLeft: `2px solid ${THEME_VARS.primary}`,
                        }}>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 状态变更 ops */}
                  <div style={{
                    padding: 12,
                    background: THEME_VARS.bg,
                    borderRadius: 10,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                  }}>
                    <strong style={{
                      display: 'block',
                      marginBottom: 8,
                      color: THEME_VARS.text,
                      fontSize: 12,
                    }}>
                       状态变更 ops({hSettlement.stateOps.length} 条)
                    </strong>
                    <div style={{
                      maxHeight: 200,
                      overflowY: 'auto',
                      fontSize: 10,
                      fontFamily: THEME_VARS.fontMono,
                    }}>
                      {hSettlement.stateOps.map((op, i) => (
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
                  </div>

                  {/* 阶段3 步骤3:CG 解锁提示 */}
                  {hNewlyUnlockedCG && (
                    <div style={{
                      padding: 12,
                      background: `linear-gradient(135deg, ${THEME_VARS.success}22 0%, transparent 100%)`,
                      borderRadius: 10,
                      border: `1px solid ${THEME_VARS.success}55`,
                    }}>
                      <strong style={{
                        display: 'block',
                        marginBottom: 6,
                        color: THEME_VARS.success,
                        fontSize: 12,
                      }}>
                         新解锁 CG
                      </strong>
                      <div style={{ fontSize: 11, color: THEME_VARS.text, lineHeight: 1.6 }}>
                        <strong>{hNewlyUnlockedCG.title}</strong>
                        {' '}({CG_TYPE_LABELS[hNewlyUnlockedCG.type]})
                        <div style={{ color: THEME_VARS.textMuted, marginTop: 4 }}>
                          {hNewlyUnlockedCG.description}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* 多女角管理 Tab */}
      {tab === 'heroines' && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}> 多女角管理</h4>

          {!mvu ? (
            <div style={{
              color: THEME_VARS.textMuted,
              fontSize: 11,
              fontStyle: 'italic',
              padding: 32,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}> </div>
              需要先初始化 Kernel(步骤8)
            </div>
          ) : (
            <>
              {/* 操作栏 */}
              <div style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                padding: 12,
                background: THEME_VARS.overlay,
                borderRadius: 10,
                border: `1px solid ${THEME_VARS.borderSoft}`,
              }}>
                <button onClick={loadHeroineSummaries} style={btnStyle}>
                   加载女角列表
                </button>
              </div>

              {/* 女角列表 */}
              {heroineSummaries.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{
                    display: 'block',
                    marginBottom: 8,
                    color: THEME_VARS.text,
                    fontSize: 12,
                  }}>
                   女角列表({heroineSummaries.length} 人)
                  </strong>
                  <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 8 }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                      fontSize: 11,
                    }}>
                      <thead>
                        <tr>
                          <th style={{
                            padding: '6px 8px',
                            background: `linear-gradient(135deg, ${THEME_VARS.primarySoft} 0%, ${THEME_VARS.primary}33 100%)`,
                            borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                            textAlign: 'left',
                            fontSize: 10,
                            fontWeight: 600,
                          }}>女角</th>
                          <th style={{
                            padding: '6px 8px',
                            background: `linear-gradient(135deg, ${THEME_VARS.primarySoft} 0%, ${THEME_VARS.primary}33 100%)`,
                            borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                            textAlign: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                          }}>好感</th>
                          <th style={{
                            padding: '6px 8px',
                            background: `linear-gradient(135deg, ${THEME_VARS.primarySoft} 0%, ${THEME_VARS.primary}33 100%)`,
                            borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                            textAlign: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                          }}>关系</th>
                          <th style={{
                            padding: '6px 8px',
                            background: `linear-gradient(135deg, ${THEME_VARS.primarySoft} 0%, ${THEME_VARS.primary}33 100%)`,
                            borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                            textAlign: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                          }}>H 经验</th>
                          <th style={{
                            padding: '6px 8px',
                            background: `linear-gradient(135deg, ${THEME_VARS.primarySoft} 0%, ${THEME_VARS.primary}33 100%)`,
                            borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                            textAlign: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                          }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heroineSummaries.map((h, i) => (
                          <tr key={h.id} style={{
                            background: h.isCurrent
                              ? THEME_VARS.primary + '11'
                              : i % 2 === 0 ? 'transparent' : THEME_VARS.borderSoft + '33',
                          }}>
                            <td style={{
                              padding: '6px 8px',
                              borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                              fontWeight: 500,
                              color: h.isCurrent ? THEME_VARS.primary : THEME_VARS.text,
                            }}>
                              {h.isCurrent && '♥ '}
                              {String(h.id).padStart(2, '0')}. {h.name}
                              {h.isHidden && ' '}
                              {!h.hasAppeared && !h.isCurrent && (
                                <span style={{ color: THEME_VARS.textMuted, fontSize: 9, marginLeft: 4 }}>
                                  (未登场)
                                </span>
                              )}
                            </td>
                            <td style={{
                              padding: '6px 8px',
                              borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                              textAlign: 'center',
                              color: h.favorability > 50 ? THEME_VARS.success
                                : h.favorability < 0 ? THEME_VARS.danger
                                : THEME_VARS.text,
                            }}>
                              {h.favorability}
                            </td>
                            <td style={{
                              padding: '6px 8px',
                              borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                              textAlign: 'center',
                              fontSize: 10,
                            }}>
                              {h.relationshipStage}
                            </td>
                            <td style={{
                              padding: '6px 8px',
                              borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                              textAlign: 'center',
                              color: h.hasFirstH ? THEME_VARS.danger : THEME_VARS.textMuted,
                            }}>
                              {h.hExperienceCount}
                              {h.hasFirstH && ' ✓'}
                            </td>
                            <td style={{
                              padding: '6px 8px',
                              borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                              textAlign: 'center',
                            }}>
                              {!h.isCurrent && (
                                <button
                                  onClick={() => handleSwitchHeroine(h.name)}
                                  disabled={readOnly}
                                  style={{
                                    padding: '2px 10px',
                                    background: THEME_VARS.primarySoft,
                                    color: THEME_VARS.primary,
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 10,
                                  }}
                                >
                                  切换
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 切换结果 */}
              {switchResult && (
                <div style={{
                  padding: 12,
                  marginBottom: 12,
                  background: switchResult.ok
                    ? `linear-gradient(135deg, ${THEME_VARS.success}22 0%, transparent 100%)`
                    : `linear-gradient(135deg, ${THEME_VARS.danger}22 0%, transparent 100%)`,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                }}>
                  <strong style={{
                    display: 'block',
                    marginBottom: 6,
                    color: switchResult.ok ? THEME_VARS.success : THEME_VARS.danger,
                    fontSize: 12,
                  }}>
                     切换{switchResult.ok ? '成功' : '失败'}
                  </strong>
                  <div style={{ fontSize: 11, color: THEME_VARS.text, marginBottom: 4 }}>
                    {switchResult.fromHeroine ?? '无'} → {switchResult.toHeroine}
                  </div>
                  {switchResult.error && (
                    <div style={{ color: THEME_VARS.danger, fontSize: 11 }}>
                      {switchResult.error}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 4 }}>
                    {switchResult.stateOps.length} 条 ops · {switchResult.traces.length} 条 trace
                  </div>
                </div>
              )}

              {/* 多女角在场 */}
              <div style={{
                padding: 12,
                background: THEME_VARS.overlay,
                borderRadius: 10,
                border: `1px solid ${THEME_VARS.borderSoft}`,
              }}>
                <strong style={{
                  display: 'block',
                  marginBottom: 8,
                  color: THEME_VARS.text,
                  fontSize: 12,
                }}>
                   多女角在场
                </strong>

                <div style={{ marginBottom: 8 }}>
                  <div style={labelStyle}>选择在场女角:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {HEROINE_LIST.filter((h) => !h.hidden).slice(0, 8).map((h) => (
                      <label key={h.id} style={{
                        padding: '2px 8px',
                        background: presentHeroines.includes(h.name)
                          ? THEME_VARS.primary + '22'
                          : THEME_VARS.bg,
                        borderRadius: 6,
                        fontSize: 10,
                        cursor: 'pointer',
                        border: `1px solid ${THEME_VARS.borderSoft}`,
                      }}>
                        <input
                          type="checkbox"
                          checked={presentHeroines.includes(h.name)}
                          onChange={() => togglePresentHeroine(h.name)}
                          style={{ marginRight: 4 }}
                          disabled={readOnly}
                        />
                        {h.name}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleComputeMultiState}
                  disabled={readOnly || presentHeroines.length === 0}
                  style={{
                    ...btnStyle,
                    opacity: presentHeroines.length === 0 ? 0.5 : 1,
                  }}
                >
                   计算态度
                </button>

                {multiState && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 6 }}>
                      当前女角: <strong style={{ color: THEME_VARS.primary }}>{multiState.currentHeroine}</strong>
                      {' · '}在场 {multiState.presentHeroines.length} 人
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                      {Object.entries(multiState.attitudes).map(([name, attitude]) => (
                        <div key={name} style={{
                          padding: '4px 8px',
                          background: THEME_VARS.bg,
                          borderRadius: 6,
                          fontSize: 10,
                          borderLeft: `3px solid ${
                            attitude > 0 ? THEME_VARS.success
                            : attitude < 0 ? THEME_VARS.danger
                            : THEME_VARS.textMuted
                          }`,
                        }}>
                          <div style={{ fontWeight: 500 }}>{name}</div>
                          <div style={{
                            color: attitude > 0 ? THEME_VARS.success
                            : attitude < 0 ? THEME_VARS.danger
                            : THEME_VARS.textMuted,
                          }}>
                            态度 {attitude > 0 ? '+' : ''}{attitude}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* CG 画廊 Tab(阶段3 步骤3) */}
      {tab === 'gallery' && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}> CG 画廊(阶段3 步骤3)</h4>

          {!mvu ? (
            <div style={{
              color: THEME_VARS.textMuted,
              fontSize: 11,
              fontStyle: 'italic',
              padding: 32,
              textAlign: 'center',
            }}>
              需要先初始化 Kernel(步骤8)以评估 CG 解锁条件
            </div>
          ) : (
            <>
              {/* 统计总览 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 8,
                marginBottom: 12,
              }}>
                <div style={{
                  padding: 12,
                  background: `linear-gradient(135deg, ${THEME_VARS.primary}22 0%, transparent 100%)`,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: THEME_VARS.primary, fontFamily: THEME_VARS.fontDisplay }}>
                    {cgStats.unlocked} / {cgStats.total}
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 4 }}>已解锁 / 总数</div>
                </div>
                <div style={{
                  padding: 12,
                  background: THEME_VARS.overlay,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: THEME_VARS.success, fontFamily: THEME_VARS.fontDisplay }}>
                    {cgStats.percent.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 4 }}>完成度</div>
                </div>
                <div style={{
                  padding: 12,
                  background: THEME_VARS.overlay,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: THEME_VARS.warning, fontFamily: THEME_VARS.fontDisplay }}>
                    {cgStats.locked}
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 4 }}>未解锁</div>
                </div>
              </div>

              {/* 按类型统计 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 4,
                marginBottom: 12,
              }}>
                {(Object.keys(CG_TYPE_LABELS) as CGType[]).map((t) => {
                  const s = cgStatsByType[t];
                  const color = CG_TYPE_COLORS[t];
                  return (
                    <div key={t} style={{
                      padding: '6px 4px',
                      background: THEME_VARS.overlay,
                      borderRadius: 6,
                      border: `1px solid ${THEME_VARS.borderSoft}`,
                      borderLeft: `3px solid ${color}`,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>{CG_TYPE_LABELS[t]}</div>
                      <div style={{ fontSize: 12, color: color, fontWeight: 600, marginTop: 2 }}>
                        {s.unlocked}/{s.total}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 操作栏 */}
              <div style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                padding: 12,
                background: THEME_VARS.overlay,
                borderRadius: 10,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <button
                  onClick={handleEvaluateAndUnlockCGs}
                  disabled={readOnly || cgLoading}
                  style={{
                    ...btnStyle,
                    opacity: cgLoading ? 0.6 : 1,
                  }}
                >
                  {cgLoading ? ' 评估中...' : ' 评估并解锁 CG'}
                </button>
                <button
                  onClick={refreshCGList}
                  disabled={readOnly}
                  style={{
                    ...btnStyle,
                    background: THEME_VARS.overlay,
                    color: THEME_VARS.text,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                  }}
                >
                  刷新
                </button>
                <span style={{ fontSize: 10, color: THEME_VARS.textMuted, flex: 1, minWidth: 200 }}>
                  点击「评估并解锁」基于当前 stat_data 自动评估事件/立绘/进阶H/普通H CG 解锁条件
                </span>
              </div>

              {/* 消息提示 */}
              {cgMessage && (
                <div style={{
                  padding: 10,
                  marginBottom: 12,
                  background: cgMessage.type === 'ok'
                    ? `linear-gradient(135deg, ${THEME_VARS.success}22 0%, transparent 100%)`
                    : cgMessage.type === 'fail'
                    ? `linear-gradient(135deg, ${THEME_VARS.danger}22 0%, transparent 100%)`
                    : `linear-gradient(135deg, ${THEME_VARS.info}22 0%, transparent 100%)`,
                  borderRadius: 8,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  fontSize: 11,
                  color: cgMessage.type === 'ok' ? THEME_VARS.success
                    : cgMessage.type === 'fail' ? THEME_VARS.danger
                    : THEME_VARS.info,
                }}>
                  {cgMessage.text}
                </div>
              )}

              {/* 筛选器 */}
              <div style={{
                display: 'flex',
                gap: 12,
                marginBottom: 12,
                padding: 10,
                background: THEME_VARS.overlay,
                borderRadius: 8,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: THEME_VARS.textMuted, marginRight: 4 }}>类型:</span>
                  {CG_TYPE_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setCgFilterType(f.value)}
                      style={{
                        padding: '3px 10px',
                        background: cgFilterType === f.value ? THEME_VARS.primary + '22' : 'transparent',
                        color: cgFilterType === f.value ? THEME_VARS.primary : THEME_VARS.textMuted,
                        border: `1px solid ${cgFilterType === f.value ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                        borderRadius: 12,
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: THEME_VARS.textMuted, marginRight: 4 }}>状态:</span>
                  {([
                    { value: 'all' as const, label: '全部' },
                    { value: 'unlocked' as const, label: '已解锁' },
                    { value: 'locked' as const, label: '未解锁' },
                  ]).map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setCgFilterStatus(f.value)}
                      style={{
                        padding: '3px 10px',
                        background: cgFilterStatus === f.value ? THEME_VARS.primary + '22' : 'transparent',
                        color: cgFilterStatus === f.value ? THEME_VARS.primary : THEME_VARS.textMuted,
                        border: `1px solid ${cgFilterStatus === f.value ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                        borderRadius: 12,
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 10, color: THEME_VARS.textMuted, marginLeft: 'auto' }}>
                  显示 {filteredCGList.length} / {cgList.length}
                </span>
              </div>

              {/* CG 卡片网格 */}
              {filteredCGList.length === 0 ? (
                <div style={{
                  padding: 24,
                  textAlign: 'center',
                  color: THEME_VARS.textMuted,
                  fontSize: 11,
                  fontStyle: 'italic',
                }}>
                  无匹配的 CG
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 10,
                }}>
                  {filteredCGList.map((cg) => (
                    <div key={cg.id} style={{
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: `1px solid ${THEME_VARS.borderSoft}`,
                      background: THEME_VARS.overlay,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: cg.unlocked ? 'default' : 'pointer',
                      opacity: cg.unlocked ? 1 : 0.75,
                    }}>
                      {/* CG 占位图 */}
                      <div style={{
                        height: 120,
                        background: cg.unlocked
                          ? cg.placeholderGradient
                          : `repeating-linear-gradient(45deg, ${THEME_VARS.bg}, ${THEME_VARS.bg} 8px, ${THEME_VARS.borderSoft} 8px, ${THEME_VARS.borderSoft} 16px)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}>
                        {cg.unlocked ? (
                          getCgArt(cg) ? (
                            <img
                              src={getCgArt(cg) ?? undefined}
                              alt={cg.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <span style={{
                              fontSize: 28,
                              color: 'rgba(255,255,255,0.85)',
                              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}>
                              {cg.type === 'h-first' ? '💕' : cg.type === 'h-advanced' ? '🔥' : cg.type === 'event' ? '✨' : cg.type === 'portrait' ? '🌸' : '♡'}
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: 28, color: THEME_VARS.textMuted }}>?</span>
                        )}
                        <span style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          padding: '2px 6px',
                          borderRadius: 8,
                          fontSize: 9,
                          fontWeight: 600,
                          background: (CG_TYPE_COLORS[cg.type] ?? THEME_VARS.text) + 'cc',
                          color: '#fff',
                        }}>
                          {CG_TYPE_LABELS[cg.type]}
                        </span>
                      </div>
                      {/* CG 信息 */}
                      <div style={{ padding: 8 }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: cg.unlocked ? THEME_VARS.text : THEME_VARS.textMuted,
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {cg.unlocked ? cg.title : '???'}
                        </div>
                        <div style={{ fontSize: 9, color: THEME_VARS.textMuted, marginBottom: 4 }}>
                          {cg.unlocked ? cg.heroineName : '未知女角'}
                        </div>
                        <div style={{
                          fontSize: 9,
                          color: THEME_VARS.textMuted,
                          lineHeight: 1.4,
                          marginBottom: 6,
                          minHeight: 24,
                        }}>
                          {cg.unlocked ? cg.description : `解锁条件:${cg.unlockCondition}`}
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{
                            fontSize: 9,
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: cg.unlocked ? THEME_VARS.success + '22' : THEME_VARS.warning + '22',
                            color: cg.unlocked ? THEME_VARS.success : THEME_VARS.warning,
                          }}>
                            {cg.unlocked ? '✓ 已解锁' : '✗ 未解锁'}
                          </span>
                          {!cg.unlocked && !readOnly && (
                            <button
                              onClick={() => handleManualUnlock(cg.id)}
                              disabled={cgLoading}
                              style={{
                                padding: '2px 8px',
                                background: THEME_VARS.overlay,
                                color: THEME_VARS.primary,
                                border: `1px solid ${THEME_VARS.primary}55`,
                                borderRadius: 6,
                                fontSize: 9,
                                cursor: 'pointer',
                              }}
                            >
                              手动解锁
                            </button>
                          )}
                          {cg.unlocked && cg.unlockedAtTurn != null && (
                            <span style={{ fontSize: 9, color: THEME_VARS.textMuted }}>
                              T{cg.unlockedAtTurn}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 本次新解锁的 CG */}
              {cgNewlyUnlocked.length > 0 && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: `linear-gradient(135deg, ${THEME_VARS.success}22 0%, transparent 100%)`,
                  borderRadius: 10,
                  border: `1px solid ${THEME_VARS.success}55`,
                }}>
                  <strong style={{
                    display: 'block',
                    marginBottom: 8,
                    color: THEME_VARS.success,
                    fontSize: 12,
                  }}>
                     本次评估新解锁({cgNewlyUnlocked.length} 张)
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cgNewlyUnlocked.map((cg) => (
                      <div key={cg.id} style={{
                        padding: '4px 8px',
                        background: THEME_VARS.bg,
                        borderRadius: 6,
                        fontSize: 11,
                      }}>
                        <strong style={{ color: THEME_VARS.text }}>{cg.title}</strong>
                        <span style={{ color: THEME_VARS.textMuted, marginLeft: 8 }}>
                          {CG_TYPE_LABELS[cg.type]} · {cg.heroineName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
