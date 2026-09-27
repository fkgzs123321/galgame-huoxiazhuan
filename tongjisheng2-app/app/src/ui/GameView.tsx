/**
 * GameView · 视觉小说风格游戏主界面
 *
 * 设计理念:
 *  - 真正的恋爱游戏视觉:角色立绘框 + 底部对话框 + 侧边状态卡片
 *  - 樱花飘落动画 + 心形好感度 + 优雅衬线字体
 *  - 不破坏现有 MainChat/StatusBar 逻辑,只重新组织视觉呈现
 *
 * 布局:
 *  ┌────────────────────────────────────────────────────────┐
 *  │  顶部场景信息条(日期/时段/地点/天气 + 主题切换)          │
 *  ├──────────┬─────────────────────────────┬───────────────┤
 *  │          │                             │               │
 *  │ 角色立绘  │      对话消息流             │  状态卡片     │
 *  │ 占位框   │  (视觉小说风格气泡)          │  (精简版)     │
 *  │          │                             │               │
 *  │ 好感度    │                             │  快捷操作     │
 *  │ 心形条    ├─────────────────────────────┤  按钮         │
 *  │          │      输入框 + 发送           │               │
 *  └──────────┴─────────────────────────────┴───────────────┘
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  THEME_VARS,
  THEME_OPTIONS,
  formatValue,
  type ChatMessage,
  type MainChatStatus,
  type VariableUpdateEvent,
  type ThemeName,
} from './types';

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface GameViewProps {
  /** 聊天消息列表 */
  messages: ChatMessage[];
  /** 当前状态 */
  status: MainChatStatus;
  /** 错误信息 */
  error?: string;
  /** 玩家姓名 */
  playerName?: string;
  /** 当前角色名 */
  charName?: string;
  /** 是否允许输入 */
  canInput: boolean;
  /** 当前 stat_data 快照 */
  statData: Record<string, unknown>;
  /** 最近一次变量更新事件 */
  lastUpdate?: VariableUpdateEvent;
  /** 当前主题 */
  currentTheme: ThemeName;
  /** 主题切换回调 */
  onThemeChange: (t: ThemeName) => void;
  /** 玩家发送动作 */
  onSend: (action: string) => void;
  /** 停止流式 */
  onStop?: () => void;
  /** 重试 */
  onRetry?: () => void;
  /** 占位符触发 */
  onPlaceholderEncountered?: (messageId: string) => void;
  /** 打开完整状态栏(开发者模式) */
  onOpenStatusBar?: () => void;
  /** 打开 NPC 面板 */
  onOpenNpcPanel?: () => void;
  /** 打开 H 场景面板 */
  onOpenHScenePanel?: () => void;
  /** 打开战斗结算面板 */
  onOpenCombatPanel?: () => void;
  /** 打开多视图面板(阶段3 步骤4) */
  onOpenMultiViewPanel?: () => void;
  /** 打开成就面板(阶段3 步骤5) */
  onOpenAchievementPanel?: () => void;
  /** 打开回放面板(阶段3 步骤6) */
  onOpenReplayPanel?: () => void;
  /** 打开剧情冲突面板(阶段3 步骤7) */
  onOpenConflictPanel?: () => void;
  /** 打开强迫抵抗面板(阶段3 步骤7 增强) */
  onOpenResistancePanel?: () => void;
  /** 打开 90 年代手机面板(阶段3 步骤8) */
  onOpenPhonePanel?: () => void;
  /** 打开商城系统面板(阶段3 步骤8) */
  onOpenShopPanel?: () => void;
  /** 打开 90 年代电脑面板(阶段3 步骤8) */
  onOpenComputerPanel?: () => void;
  /** 打开预设编辑器面板(阶段3 步骤9) */
  onOpenPresetEditorPanel?: () => void;
  /** 打开预设快捷切换面板(阶段3 步骤9) */
  onOpenPresetSwitchPanel?: () => void;
  /** 打开 RPG 养成面板(阶段3 步骤7) */
  onOpenRpgPanel?: () => void;
  /** 打开创意工坊面板(阶段4 MOD 管理) */
  onOpenWorkshopPanel?: () => void;
  /** 打开调试三件套面板(阶段4 Trace/变量/Prompt) */
  onOpenDebugPanel?: () => void;
  /** 打开存档面板 */
  onOpenSavePanel?: () => void;
  /** 打开配置/身份选择 */
  onOpenConfig?: () => void;
  /** 打开存档管理页(路由级) */
  onOpenArchivePage?: () => void;
  /** 打开关系图谱页(路由级) */
  onOpenRelationsPage?: () => void;
  /** 打开叙事记忆页(路由级) */
  onOpenMemoryPage?: () => void;
  /** 打开日志中心页(路由级) */
  onOpenLogsPage?: () => void;
  /** 打开人生快照页(路由级) */
  onOpenLifePage?: () => void;
  /** 打开 LLM 调试台页(路由级) */
  onOpenLlmPage?: () => void;
  /** 打开角色图鉴页(路由级) */
  onOpenCodexPage?: () => void;
  /** 打开世界地图页(路由级) */
  onOpenMapPage?: () => void;
  /** 打开剧情时间线页(路由级) */
  onOpenPlotPage?: () => void;
}

// ───────────────────────────────────────────────────────────
//  GameView 主组件
// ───────────────────────────────────────────────────────────

export function GameView(props: GameViewProps) {
  const {
    messages,
    status,
    error,
    playerName = '玩家',
    charName = '鸣泽美佐子',
    canInput,
    statData,
    lastUpdate,
    currentTheme,
    onThemeChange,
    onSend,
    onStop,
    onRetry,
    onPlaceholderEncountered,
    onOpenStatusBar,
    onOpenNpcPanel,
    onOpenHScenePanel,
    onOpenCombatPanel,
    onOpenMultiViewPanel,
    onOpenAchievementPanel,
    onOpenReplayPanel,
    onOpenConflictPanel,
    onOpenResistancePanel,
    onOpenPhonePanel,
    onOpenShopPanel,
    onOpenComputerPanel,
    onOpenPresetEditorPanel,
    onOpenPresetSwitchPanel,
    onOpenRpgPanel,
    onOpenWorkshopPanel,
    onOpenDebugPanel,
    onOpenSavePanel,
    onOpenConfig,
    onOpenArchivePage,
    onOpenRelationsPage,
    onOpenMemoryPage,
    onOpenLogsPage,
    onOpenLifePage,
    onOpenLlmPage,
    onOpenCodexPage,
    onOpenMapPage,
    onOpenPlotPage,
  } = props;

  const [input, setInput] = useState('');
  const [showFullStatus, setShowFullStatus] = useState(false);
  // 移动端面板切换:'main'(对话) / 'left'(角色立绘) / 'right'(状态)
  const [mobilePanel, setMobilePanel] = useState<'main' | 'left' | 'right'>('main');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 占位符检测
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && !last.streaming && last.rawContent?.includes('<StatusPlaceHolderImpl')) {
      onPlaceholderEncountered?.(last.id);
    }
  }, [messages, onPlaceholderEncountered]);

  const handleSend = () => {
    if (!input.trim() || status === 'streaming' || !canInput) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 从 stat_data 提取关键状态
  const sceneInfo = useMemo(() => extractSceneInfo(statData, charName), [statData, charName]);
  const heroineInfo = useMemo(() => extractHeroineInfo(statData), [statData]);
  const playerInfo = useMemo(() => extractPlayerInfo(statData), [statData]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'idle': return { text: '等待输入', color: THEME_VARS.textMuted, dot: '●' };
      case 'streaming': return { text: '叙事中…', color: THEME_VARS.primary, dot: '◉' };
      case 'committed': return { text: '回合已提交', color: THEME_VARS.success, dot: '●' };
      case 'error': return { text: '出错', color: THEME_VARS.danger, dot: '●' };
    }
  }, [status]);

  return (
    <div
      className="gv-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 48px)',
        minHeight: 600,
        gap: 12,
      }}
    >
      {/* ═══ 顶部场景信息条 ═══ */}
      <header
        className="gv-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          background: 'var(--c-overlay-soft)',
          borderRadius: 14,
          border: '1px solid var(--c-border)',
          boxShadow: 'var(--shadow-sm)',
          backdropFilter: 'blur(10px)',
          flexShrink: 0,
        }}
      >
        <div className="gv-header-row" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="gv-title" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            color: 'var(--c-primary)',
            letterSpacing: 1.5,
            textShadow: '0 0 12px var(--c-primary-glow)',
          }}>
            <span style={{ marginRight: 6 }}>🌸</span>同级生2
          </div>
          <div className="gv-scene-chips" style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--c-text-muted)' }}>
            <SceneChip icon="📅" label={sceneInfo.date} />
            <SceneChip icon="🕐" label={sceneInfo.time} />
            <SceneChip icon="📍" label={sceneInfo.location} />
            <SceneChip icon="🌤" label={sceneInfo.weather} />
            <SceneChip icon="📖" label={sceneInfo.chapter} />
          </div>
        </div>
        <div className="gv-header-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="gv-status-pill" style={{
            fontSize: 11,
            padding: '3px 10px',
            background: statusLabel.color + '22',
            color: statusLabel.color,
            borderRadius: 10,
            fontFamily: 'var(--font-mono)',
          }}>
            {statusLabel.dot} {statusLabel.text}
          </span>
          {/* 主题切换 */}
          <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--c-bg)', borderRadius: 10, border: '1px solid var(--c-border-soft)' }}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onThemeChange(opt.id)}
                title={opt.label}
                style={{
                  padding: '3px 7px',
                  background: currentTheme === opt.id
                    ? 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)'
                    : 'transparent',
                  color: currentTheme === opt.id ? '#fff' : 'var(--c-text-muted)',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'all 0.2s ease',
                }}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ═══ 移动端面板切换条(仅 ≤768px 显示) ═══ */}
      <div
        className="gv-mobile-tabs"
        style={{
          display: 'none',
          gap: 4,
          padding: 4,
          background: 'var(--c-bg)',
          borderRadius: 10,
          border: '1px solid var(--c-border-soft)',
          flexShrink: 0,
        }}
      >
        {([
          { id: 'left', icon: '♥', label: '角色' },
          { id: 'main', icon: '💬', label: '对话' },
          { id: 'right', icon: '📊', label: '状态' },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMobilePanel(t.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: mobilePanel === t.id
                ? 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)'
                : 'transparent',
              color: mobilePanel === t.id ? '#fff' : 'var(--c-text-muted)',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ 主区域:三栏布局 ═══ */}
      <div
        className="gv-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 240px',
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ─── 左栏:角色立绘 + 好感度 ─── */}
        <aside
          className={`gv-left${mobilePanel === 'left' ? ' is-active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
          }}
        >
          {/* 角色立绘占位框 */}
          <div
            className="gv-portrait"
            style={{
              flex: 1,
              background: 'linear-gradient(180deg, var(--c-primary-glow) 0%, var(--c-overlay-soft) 60%, var(--c-overlay) 100%)',
              borderRadius: 14,
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: 16,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 280,
            }}
          >
            {/* 樱花飘落装饰 */}
            <PetalDecor />
            {/* 立绘占位(轮廓女性剪影) */}
            <div
              style={{
                position: 'absolute',
                top: '12%',
                width: '70%',
                height: '60%',
                opacity: 0.25,
                background: 'radial-gradient(ellipse 40% 30% at 50% 18%, var(--c-primary) 0%, transparent 60%), radial-gradient(ellipse 35% 25% at 50% 55%, var(--c-primary-soft) 0%, transparent 60%), radial-gradient(ellipse 45% 20% at 50% 85%, var(--c-accent-soft) 0%, transparent 60%)',
                borderRadius: '50% 50% 30% 30%',
              }}
            />
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
              <div
                className="gv-portrait-name"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  color: 'var(--c-primary)',
                  letterSpacing: 2,
                  textShadow: '0 0 16px var(--c-primary-glow)',
                  marginBottom: 4,
                }}
              >
                {charName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--c-text-muted)',
                  letterSpacing: 0.8,
                  marginBottom: 12,
                }}
              >
                {heroineInfo.relationStage} · {heroineInfo.location}
              </div>
              {/* 好感度心形条 */}
              <HeartMeter value={heroineInfo.favorability} label="好感度" />
              <div style={{ marginTop: 8 }}>
                <HeartMeter value={heroineInfo.trust} label="信任度" color="var(--c-accent)" />
              </div>
              <div style={{ marginTop: 8 }}>
                <HeartMeter value={heroineInfo.heart} label="心动值" color="#ff4b8a" />
              </div>
            </div>
          </div>

          {/* 女角快捷信息 */}
          <div
            style={{
              padding: 10,
              background: 'var(--c-overlay)',
              borderRadius: 10,
              border: '1px solid var(--c-border-soft)',
              fontSize: 11,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <InfoRow label="关系阶段" value={heroineInfo.relationStage} />
            <InfoRow label="H 经验" value={`${heroineInfo.hExp} 次`} />
            <InfoRow label="当前衣着" value={heroineInfo.outfit} />
            <InfoRow label="心情" value={`${heroineInfo.mood}`} />
          </div>
        </aside>

        {/* ─── 中栏:对话区 + 输入框 ─── */}
        <main
          className={`gv-main${mobilePanel !== 'main' ? ' is-hidden' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
          }}
        >
          {/* 对话消息流 */}
          <div
            ref={scrollRef}
            className="gv-message-stream"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: 16,
              background: 'var(--c-overlay-soft)',
              borderRadius: 14,
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-md)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  color: 'var(--c-text-muted)',
                }}
              >
                <div style={{ fontSize: 48, opacity: 0.6 }}>🌸</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--c-primary)', letterSpacing: 2 }}>
                  {canInput ? '故事,从你的一句行动开始' : '请先完成配置与身份选择'}
                </div>
                <div style={{ fontSize: 12, maxWidth: 320, textAlign: 'center', lineHeight: 1.7 }}>
                  {canInput
                    ? '输入你的行动,例如:起床去客厅找美佐子。叙事将以第一人称视角展开。'
                    : '点击右下角「配置」按钮,设置玩家姓名并选择 P1-P6 身份后即可开始。'}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <NovelMessageBubble
                key={m.id}
                message={m}
                playerName={playerName}
                charName={charName}
              />
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <div
              style={{
                padding: '8px 14px',
                background: 'var(--c-danger) 11',
                border: '1px solid var(--c-danger)',
                borderRadius: 8,
                color: 'var(--c-danger)',
                fontSize: 12,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* 输入栏(视觉小说风格) */}
          <div
            className="gv-input-bar"
            style={{
              padding: 12,
              background: 'var(--c-overlay)',
              borderRadius: 14,
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <input
              type="text"
              value={input}
              placeholder={canInput ? '输入你的行动…  (Enter 发送 / Shift+Enter 换行)' : '请先完成配置 + 身份选择'}
              disabled={!canInput || status === 'streaming'}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'var(--c-bg)',
                border: '1px solid var(--c-border)',
                borderRadius: 10,
                color: 'var(--c-text)',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {status === 'streaming' ? (
              <button
                type="button"
                onClick={onStop}
                style={btnStyle('var(--c-warning)')}
              >
                ⏸ 停止
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canInput || !input.trim()}
                style={btnStyle(canInput && input.trim() ? 'var(--c-primary)' : 'var(--c-text-soft)', !(canInput && input.trim()))}
              >
                发送 →
              </button>
            )}
            {status === 'error' && onRetry && (
              <button type="button" onClick={onRetry} style={btnStyle('var(--c-danger)')}>
                重试
              </button>
            )}
          </div>
        </main>

        {/* ─── 右栏:状态卡片 + 快捷操作 ─── */}
        <aside
          className={`gv-right${mobilePanel === 'right' ? ' is-active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
          }}
        >
          {/* 主角状态卡 */}
          <div
            style={{
              padding: 12,
              background: 'var(--c-overlay)',
              borderRadius: 12,
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              color: 'var(--c-primary)',
              marginBottom: 8,
              letterSpacing: 1,
            }}>
              {playerName} · 主角
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StatBar label="魅力" value={playerInfo.charm} />
              <StatBar label="体力" value={playerInfo.stamina} />
              <StatBar label="心情" value={playerInfo.mood} />
              <StatBar label="疲劳" value={playerInfo.fatigue} color="var(--c-warning)" />
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--c-border)', fontSize: 11, color: 'var(--c-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>现金 {playerInfo.cash}</span>
              <span>第 {sceneInfo.day} 天</span>
            </div>
          </div>

          {/* 生存状态卡 */}
          <div
            style={{
              padding: 12,
              background: 'var(--c-overlay)',
              borderRadius: 12,
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 6, letterSpacing: 1 }}>生存状态</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <StatBar label="饥饿" value={playerInfo.hunger} color="var(--c-warning)" compact />
              <StatBar label="口渴" value={playerInfo.thirst} color="var(--c-warning)" compact />
              <StatBar label="清洁" value={playerInfo.clean} color="var(--c-info)" compact />
            </div>
          </div>

          {/* 最近变更 */}
          {lastUpdate && lastUpdate.changes.length > 0 && (
            <div
              style={{
                padding: 10,
                background: 'var(--c-primary-glow)',
                borderRadius: 12,
                border: '1px solid var(--c-primary-soft)',
                fontSize: 11,
              }}
            >
              <div style={{ color: 'var(--c-primary)', fontWeight: 600, marginBottom: 6 }}>
                ♥ 本回合变化 ({lastUpdate.changes.length})
              </div>
              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {lastUpdate.changes.slice(0, 8).map((c, i) => (
                  <div key={i} style={{ color: 'var(--c-text)', fontSize: 10 }}>
                    <span style={{ color: 'var(--c-text-muted)' }}>{c.op}:</span>{' '}
                    <code style={{ color: 'var(--c-primary)' }}>{c.path}</code>
                    <div style={{ marginLeft: 8, color: 'var(--c-text-muted)' }}>
                      {formatValue(c.before)} → {formatValue(c.after)}
                    </div>
                  </div>
                ))}
                {lastUpdate.changes.length > 8 && (
                  <div style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>… 其余 {lastUpdate.changes.length - 8} 项</div>
                )}
              </div>
            </div>
          )}

          {/* 快捷操作按钮 */}
          <div
            className="gv-quick-actions"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <QuickBtn icon="📊" label="状态栏" onClick={onOpenStatusBar} />
            <QuickBtn icon="👥" label="NPC" onClick={onOpenNpcPanel} />
            <QuickBtn icon="💕" label="H 场景" onClick={onOpenHScenePanel} />
            <QuickBtn icon="⚔" label="战斗" onClick={onOpenCombatPanel} />
            <QuickBtn icon="🗺" label="多视图" onClick={onOpenMultiViewPanel} />
            <QuickBtn icon="🏆" label="成就" onClick={onOpenAchievementPanel} />
            <QuickBtn icon="📅" label="回放" onClick={onOpenReplayPanel} />
            <QuickBtn icon="⚔" label="冲突" onClick={onOpenConflictPanel} />
            <QuickBtn icon="🛡" label="强迫抵抗" onClick={onOpenResistancePanel} />
            <QuickBtn icon="📱" label="手机" onClick={onOpenPhonePanel} />
            <QuickBtn icon="🛍" label="商城" onClick={onOpenShopPanel} />
            <QuickBtn icon="💻" label="电脑" onClick={onOpenComputerPanel} />
            <QuickBtn icon="⚙" label="预设编辑" onClick={onOpenPresetEditorPanel} />
            <QuickBtn icon="🔀" label="预设切换" onClick={onOpenPresetSwitchPanel} />
            <QuickBtn icon="🎯" label="RPG 养成" onClick={onOpenRpgPanel} />
            <QuickBtn icon="🛠" label="创意工坊" onClick={onOpenWorkshopPanel} />
            <QuickBtn icon="🧪" label="调试" onClick={onOpenDebugPanel} />
            <QuickBtn icon="💾" label="存档" onClick={onOpenSavePanel} />
            <QuickBtn icon="⚙️" label="配置" onClick={onOpenConfig} />
            <QuickBtn icon="📋" label="完整状态" onClick={() => setShowFullStatus((v) => !v)} active={showFullStatus} />
            {/* 路由级扩展页(P1) */}
            <QuickBtn icon="🗄" label="存档管理" onClick={onOpenArchivePage} />
            <QuickBtn icon="🕸" label="关系图谱" onClick={onOpenRelationsPage} />
            <QuickBtn icon="🧠" label="叙事记忆" onClick={onOpenMemoryPage} />
            <QuickBtn icon="📋" label="日志中心" onClick={onOpenLogsPage} />
            <QuickBtn icon="📸" label="人生快照" onClick={onOpenLifePage} />
            <QuickBtn icon="🧪" label="LLM 调试" onClick={onOpenLlmPage} />
            <QuickBtn icon="📖" label="角色图鉴" onClick={onOpenCodexPage} />
            <QuickBtn icon="🗺" label="世界地图" onClick={onOpenMapPage} />
            <QuickBtn icon="🎬" label="剧情时间线" onClick={onOpenPlotPage} />
          </div>

          {/* 完整状态栏(可折叠) */}
          {showFullStatus && (
            <div
              className="gv-full-status"
              style={{
                flex: 1,
                minHeight: 200,
                overflowY: 'auto',
                padding: 10,
                background: 'var(--c-overlay)',
                borderRadius: 12,
                border: '1px solid var(--c-border)',
                fontSize: 11,
              }}
            >
              <FullStatusGrid statData={statData} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件
// ───────────────────────────────────────────────────────────

function SceneChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ color: 'var(--c-text)', fontWeight: 500 }}>{label}</span>
    </span>
  );
}

function HeartMeter({
  value,
  label,
  color = 'var(--c-primary)',
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const v = Math.max(-100, Math.min(100, value));
  const pct = (v + 100) / 2; // -100~100 → 0~100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--c-text-muted)' }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{v > 0 ? `+${v}` : v}</span>
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--c-border-soft)',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
            borderRadius: 3,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}

function StatBar({
  label,
  value,
  color = 'var(--c-primary)',
  compact = false,
}: {
  label: string;
  value: number;
  color?: string;
  compact?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: compact ? 10 : 11, color: 'var(--c-text-muted)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--c-text)', fontWeight: 600 }}>{Math.round(v)}</span>
      </div>
      <div style={{ height: compact ? 4 : 5, background: 'var(--c-border-soft)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${v}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--c-text)' }}>
      <span style={{ color: 'var(--c-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function QuickBtn({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="gv-quick-btn"
      style={{
        padding: '8px 4px',
        background: active
          ? 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)'
          : 'var(--c-overlay)',
        color: active ? '#fff' : 'var(--c-text)',
        border: '1px solid ' + (active ? 'var(--c-primary)' : 'var(--c-border)'),
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 11,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        transition: 'all 0.2s ease',
        boxShadow: active ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
      }}
    >
      <span className="gv-quick-icon" style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: '10px 18px',
    background: disabled ? 'var(--c-text-soft)' : `linear-gradient(135deg, ${bg} 0%, ${bg}cc 100%)`,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : 'var(--shadow-sm)',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
  };
}

// 视觉小说风格消息气泡
function NovelMessageBubble({
  message,
  playerName,
  charName,
}: {
  message: ChatMessage;
  playerName: string;
  charName: string;
}) {
  const isUser = message.role === 'user';
  const author = isUser ? playerName : charName;
  const hasPlaceholder = message.rawContent?.includes('<StatusPlaceHolderImpl');
  const hasChanges = message.variableChanges && message.variableChanges.length > 0;

  if (isUser) {
    // 玩家行动:右对齐,小标签
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--c-text-muted)', padding: '0 8px' }}>
          {author} · {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        <div
          className="gv-message-bubble"
          style={{
            maxWidth: '75%',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-soft) 100%)',
            color: '#fff',
            borderRadius: '14px 14px 2px 14px',
            boxShadow: 'var(--shadow-sm)',
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <span style={{ opacity: 0.8, fontSize: 10, marginRight: 6 }}>▶ 行动</span>
          {message.content}
        </div>
      </div>
    );
  }

  // AI 叙事:全宽对话框(视觉小说风格)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
        <span
          style={{
            fontSize: 10,
            color: 'var(--c-primary)',
            fontWeight: 600,
            padding: '2px 8px',
            background: 'var(--c-primary-glow)',
            borderRadius: 8,
          }}
        >
          {charName}
        </span>
        <span style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>
          {new Date(message.timestamp).toLocaleTimeString()}
          {message.streaming && ' · 叙事中…'}
        </span>
      </div>
      <div
        className="gv-message-bubble"
        style={{
          padding: '14px 18px',
          background: 'var(--c-overlay)',
          color: 'var(--c-text)',
          borderRadius: '12px',
          border: '1px solid var(--c-border)',
          borderLeft: '3px solid var(--c-primary)',
          fontSize: 14,
          lineHeight: 1.85,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'var(--font-body)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {message.content}
        {message.streaming && (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 14,
              background: 'var(--c-primary)',
              marginLeft: 2,
              animation: 'heart-pulse 0.8s infinite',
              verticalAlign: 'middle',
            }}
          />
        )}
        {hasPlaceholder && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px dashed var(--c-border)',
              fontSize: 10,
              color: 'var(--c-text-muted)',
            }}
          >
            ⚙ 状态栏已同步更新
          </div>
        )}
        {hasChanges && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px dashed var(--c-border)',
              fontSize: 11,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <strong style={{ color: 'var(--c-primary)' }}>♥ 状态变化 ({message.variableChanges!.length})</strong>
            {message.variableChanges!.slice(0, 4).map((c, i) => (
              <div key={i} style={{ color: 'var(--c-text-muted)' }}>
                · <code style={{ color: 'var(--c-primary)' }}>{c.path}</code>:{' '}
                {formatValue(c.before)} → {formatValue(c.after)}
              </div>
            ))}
            {message.variableChanges!.length > 4 && (
              <div style={{ color: 'var(--c-text-soft)' }}>… 其余 {message.variableChanges!.length - 4} 项</div>
            )}
          </div>
        )}
        {message.error && (
          <div style={{ marginTop: 8, color: 'var(--c-danger)', fontSize: 11 }}>⚠ {message.error}</div>
        )}
      </div>
    </div>
  );
}

// 樱花飘落装饰
function PetalDecor() {
  const petals = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 8 + Math.random() * 6,
        size: 8 + Math.random() * 6,
      })),
    [],
  );
  return (
    <>
      {petals.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle, var(--c-primary-soft) 0%, var(--c-primary) 70%)',
            borderRadius: '50% 0 50% 50%',
            opacity: 0.6,
            animation: `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

// 完整状态网格(折叠展开)
function FullStatusGrid({ statData }: { statData: Record<string, unknown> }) {
  const keys = Object.keys(statData);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {keys.map((k) => {
        const v = statData[k];
        if (!v || typeof v !== 'object') return null;
        const entries = Object.entries(v as object);
        return (
          <div key={k}>
            <div style={{ color: 'var(--c-primary)', fontWeight: 600, marginBottom: 4 }}>{k}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {entries.slice(0, 12).map(([fk, fv]) => (
                <div key={fk} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{ color: 'var(--c-text-muted)' }}>{fk}</span>
                  <span style={{ color: 'var(--c-text)' }}>{formatValue(fv)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  辅助:从 stat_data 提取关键信息
// ───────────────────────────────────────────────────────────

function extractSceneInfo(statData: Record<string, unknown>, charName: string) {
  const t = (statData.时间 ?? {}) as Record<string, unknown>;
  const s = (statData.场景 ?? {}) as Record<string, unknown>;
  return {
    date: `${t.当前日期 ?? '12-22'} ${t.星期 ?? '周五'}`,
    time: `${t.当前时间 ?? '08:00'} (${t.时段 ?? '早'})`,
    location: String(s.当前地点 ?? '未选择'),
    weather: String(t.天气 ?? '晴'),
    chapter: String(t.章节 ?? '寒假前奏'),
    day: Number(t.天数 ?? 1),
  };
}

function extractHeroineInfo(statData: Record<string, unknown>) {
  const h = (statData.当前女角 ?? {}) as Record<string, unknown>;
  return {
    favorability: Number(h.好感度 ?? 0),
    trust: Number(h.信任度 ?? 0),
    heart: Number(h.心动值 ?? 0),
    relationStage: String(h.关系阶段 ?? '初识'),
    hExp: Number(h.H经验次数 ?? 0),
    outfit: String(h.当前衣着 ?? '日常'),
    location: String(h.当前位置 ?? ''),
    mood: Number(h.心情 ?? 50),
  };
}

function extractPlayerInfo(statData: Record<string, unknown>) {
  const p = (statData.主角 ?? {}) as Record<string, unknown>;
  return {
    charm: Number(p.魅力 ?? 0),
    stamina: Number(p.体力 ?? 0),
    mood: Number(p.心情 ?? 70),
    fatigue: Number(p.疲劳 ?? 0),
    hunger: Number(p.饥饿 ?? 30),
    thirst: Number(p.口渴 ?? 20),
    clean: Number(p.清洁 ?? 80),
    cash: Number(p.现金 ?? 0),
  };
}
