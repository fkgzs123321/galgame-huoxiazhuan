/**
 * 电脑面板(阶段3 步骤8 · 90 年代 Windows 98 + 拨号上网)
 *
 * 四 tab 设计:
 *  - 拨号上网:模拟拨号过程,选择上网时长,消耗话费
 *  - BBS:浏览板块/帖子/回帖(获得技能加成)
 *  - 邮件:收件箱/发件/已读管理/发送邮件
 *  - 收藏夹:管理收藏的网址
 *
 * 集成:
 *  - GameView 添加「💻 电脑」按钮
 *  - App.tsx 管理 gamePanel='computer' 状态
 *  - 调用 computerEngine.dialup/replyPost/sendEmail/checkIncomingEmails
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { THEME_VARS } from './types';
import {
  computerEngine,
  INTERNET_RATES,
  type ComputerEmail,
  type BbsHistoryEntry,
  type DialupResult,
  type BbsReplyResult,
  type SendEmailResult,
} from '../runtime/computer-engine';
import {
  BBS_BOARDS,
  type BbsBoard,
  type BbsPost,
} from '../content/computer/bbs-data';
import type { MvuRuntime } from '../runtime/mvu-runtime';

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
  minWidth: 100,
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
  background: `linear-gradient(135deg, ${THEME_VARS.info} 0%, ${THEME_VARS.primary} 100%)`,
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
  margin: 0,
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
//  常量
// ───────────────────────────────────────────────────────────

const BOARD_CATEGORY_COLOR: Record<BbsBoard['category'], string> = {
  校园: '#2196f3',
  恋爱: '#e91e63',
  游戏: '#9c27b0',
  八卦: '#ff9800',
  技术: '#00bcd4',
  本地: '#4caf50',
};

const BOARD_CATEGORY_ICON: Record<BbsBoard['category'], string> = {
  校园: '🎓',
  恋爱: '💕',
  游戏: '🎮',
  八卦: '👂',
  技术: '⚙️',
  本地: '🏘️',
};

const ONLINE_DURATION_OPTIONS = [
  { minutes: 5, label: '5 分钟(快速浏览)', cost: INTERNET_RATES.dialupCost + 5 * INTERNET_RATES.perMinuteCost },
  { minutes: 15, label: '15 分钟(常规)', cost: INTERNET_RATES.dialupCost + 15 * INTERNET_RATES.perMinuteCost },
  { minutes: 30, label: '30 分钟(深度)', cost: INTERNET_RATES.dialupCost + 30 * INTERNET_RATES.perMinuteCost },
  { minutes: 60, label: '60 分钟(沉浸)', cost: INTERNET_RATES.dialupCost + 60 * INTERNET_RATES.perMinuteCost },
];

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asNum(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

function asStr(v: unknown, def = ''): string {
  return typeof v === 'string' ? v : def;
}

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface ComputerPanelProps {
  /** MVU 运行时 */
  mvu?: MvuRuntime;
  /** 是否只读 */
  readOnly?: boolean;
}

type PanelTab = 'dialup' | 'bbs' | 'mail' | 'favorites';

interface HistoryEntry {
  ts: number;
  type: 'dialup' | 'reply' | 'email_send' | 'email_read' | 'favorite';
  detail: string;
  success: boolean;
}

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function ComputerPanel({ mvu, readOnly = false }: ComputerPanelProps) {
  const [tab, setTab] = useState<PanelTab>('dialup');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const sd = useMemo(() => {
    if (!mvu) return {} as Record<string, unknown>;
    return mvu.snapshot();
  }, [mvu, refreshKey]);

  const hasComputer = useMemo(() => computerEngine.hasComputer(sd), [sd]);
  const computer = useMemo(() => computerEngine.read(sd), [sd]);
  const phoneBalance = useMemo(() => asNum(asObj(sd.手机).话费余额), [sd]);

  // 显示 toast
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 应用 stateOps 到 MVU
  const applyStateOps = useCallback(
    (stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>) => {
      if (!mvu || stateOps.length === 0) return;
      try {
        const runtime = mvu as unknown as {
          applyPatch?: (ops: Array<{ op: string; path: string; value?: unknown }>) => void;
          set?: (path: string, value: unknown) => void;
        };
        if (runtime.applyPatch) {
          runtime.applyPatch(stateOps);
        } else if (runtime.set) {
          for (const op of stateOps) {
            if (op.op === 'remove') {
              runtime.set(op.path, null);
            } else {
              runtime.set(op.path, op.value);
            }
          }
        }
        setRefreshKey((k) => k + 1);
      } catch (e) {
        showToast('error', `应用变更失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [mvu, showToast],
  );

  // 添加历史
  const addHistory = useCallback((type: HistoryEntry['type'], detail: string, success: boolean) => {
    setHistory((h) => [
      { ts: Date.now(), type, detail, success },
      ...h,
    ].slice(0, 50));
  }, []);

  const tabs: Array<{ key: PanelTab; label: string; icon: string; badge?: number }> = [
    { key: 'dialup', label: '拨号上网', icon: '📡' },
    { key: 'bbs', label: 'BBS', icon: '💬' },
    { key: 'mail', label: '邮件', icon: '📧', badge: computer.邮件未读数 > 0 ? computer.邮件未读数 : undefined },
    { key: 'favorites', label: '收藏夹', icon: '⭐' },
  ];

  return (
    <div style={containerStyle}>
      <header style={{
        paddingBottom: 10,
        marginBottom: 10,
        borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{
            margin: 0,
            fontFamily: THEME_VARS.fontDisplay,
            fontSize: 16,
            fontWeight: 500,
            color: THEME_VARS.info,
            letterSpacing: 1,
          }}>💻 电脑</h3>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.4 }}>
            {computer.系统版本 || 'Windows 98'} · 90 年代拨号上网 · 上网时长 {computer.上网总时长} 分钟
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          background: THEME_VARS.primaryGlow,
          borderRadius: 8,
          fontSize: 12,
          color: THEME_VARS.primary,
          fontWeight: 600,
        }}>
          ¥ 话费 {phoneBalance.toLocaleString()}
        </div>
      </header>

      {/* 未拥有电脑提示 */}
      {!hasComputer && (
        <div style={{
          padding: 16,
          marginBottom: 12,
          background: '#fff3e0',
          color: '#e65100',
          borderRadius: 8,
          border: `1px solid #e6510033`,
          fontSize: 12,
          textAlign: 'center',
        }}>
          🚫 尚未拥有电脑(需通过剧情或购买获得)
        </div>
      )}

      {/* toast 提示 */}
      {toast && (
        <div style={{
          padding: 10,
          marginBottom: 12,
          background: toast.type === 'success' ? '#e8f5e9' : toast.type === 'error' ? '#ffebee' : '#e3f2fd',
          color: toast.type === 'success' ? '#2e7d32' : toast.type === 'error' ? '#c62828' : '#1565c0',
          borderRadius: 8,
          fontSize: 12,
          border: `1px solid ${toast.type === 'success' ? '#2e7d3233' : toast.type === 'error' ? '#c6282833' : '#1565c033'}`,
        }}>
          {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ '}
          {toast.message}
        </div>
      )}

      <div style={tabBarStyle}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? tabBtnActiveStyle : tabBtnStyle}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
            {t.badge !== undefined && (
              <span style={{
                marginLeft: 4,
                padding: '0 5px',
                background: THEME_VARS.danger,
                color: '#fff',
                borderRadius: 8,
                fontSize: 9,
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'dialup' && (
        <DialupTab
          hasComputer={hasComputer}
          phoneBalance={phoneBalance}
          totalOnlineMinutes={computer.上网总时长}
          readOnly={readOnly}
          onDialup={(minutes) => {
            const result = computerEngine.dialup(sd, minutes);
            if (result.ok) {
              applyStateOps(result.stateOps);
              addHistory('dialup', `拨号上网 ${minutes} 分钟,消耗 ${result.cost} 日元(拨号 ${result.dialDurationSec}s)`, true);
              showToast('success', `拨号成功!在线 ${minutes} 分钟,消耗 ${result.cost} 日元`);
            } else {
              addHistory('dialup', result.reason ?? '拨号失败', false);
              showToast('error', result.reason ?? '拨号失败');
            }
          }}
        />
      )}

      {tab === 'bbs' && (
        <BbsTab
          sd={sd}
          hasComputer={hasComputer}
          readOnly={readOnly}
          onBrowse={(postId) => {
            const result = computerEngine.browsePost(sd, postId);
            if (result.post) {
              applyStateOps(result.stateOps);
            }
          }}
          onReply={(postId, content) => {
            const result = computerEngine.replyPost(sd, postId, content);
            if (result.ok) {
              applyStateOps(result.stateOps);
              const effects = result.appliedEffects.map((e) => e.description).filter(Boolean).join(', ');
              addHistory('reply', `回帖成功${effects ? '(' + effects + ')' : ''}`, true);
              showToast('success', `回帖成功${effects ? ' · ' + effects : ''}`);
            } else {
              addHistory('reply', result.reason ?? '回帖失败', false);
              showToast('error', result.reason ?? '回帖失败');
            }
          }}
        />
      )}

      {tab === 'mail' && (
        <MailTab
          sd={sd}
          hasComputer={hasComputer}
          readOnly={readOnly}
          onCheckEmails={() => {
            const result = computerEngine.checkIncomingEmails(sd);
            if (result.newEmails.length > 0) {
              applyStateOps(result.stateOps);
              addHistory('email_read', `收到 ${result.newEmails.length} 封新邮件`, true);
              showToast('success', `收到 ${result.newEmails.length} 封新邮件`);
            } else {
              showToast('info', '暂无新邮件');
            }
          }}
          onMarkRead={(emailId) => {
            const ops = computerEngine.markEmailRead(sd, emailId);
            if (ops.length > 0) {
              applyStateOps(ops);
              addHistory('email_read', '标记邮件已读', true);
            }
          }}
          onSend={(to, subject, body) => {
            const result = computerEngine.sendEmail(sd, to, subject, body);
            if (result.ok) {
              applyStateOps(result.stateOps);
              addHistory('email_send', `发送邮件至 ${to}:${subject}`, true);
              showToast('success', '邮件发送成功');
            } else {
              addHistory('email_send', result.reason ?? '发送失败', false);
              showToast('error', result.reason ?? '发送失败');
            }
          }}
        />
      )}

      {tab === 'favorites' && (
        <FavoritesTab
          favorites={computer.收藏夹}
          readOnly={readOnly}
          onAdd={(url) => {
            const ops = computerEngine.addFavorite(sd, url);
            if (ops.length > 0) {
              applyStateOps(ops);
              addHistory('favorite', `收藏 ${url}`, true);
              showToast('success', `已收藏: ${url}`);
            } else {
              showToast('info', '该网址已在收藏夹');
            }
          }}
        />
      )}

      {/* 历史记录 */}
      {history.length > 0 && (
        <section style={sectionStyle}>
          <h4 style={sectionTitleStyle}>📋 操作记录</h4>
          <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 10 }}>
            {history.map((h, idx) => (
              <div key={idx} style={{
                padding: '4px 0',
                borderBottom: idx < history.length - 1 ? `1px solid ${THEME_VARS.borderSoft}` : 'none',
                color: h.success ? THEME_VARS.text : THEME_VARS.danger,
              }}>
                <span style={{ color: THEME_VARS.textMuted, marginRight: 6 }}>
                  {new Date(h.ts).toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
                <span style={{ marginRight: 4 }}>
                  {h.type === 'dialup' ? '📡' : h.type === 'reply' ? '💬' : h.type === 'email_send' ? '📧' : h.type === 'email_read' ? '📨' : '⭐'}
                </span>
                {h.detail}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  1. 拨号上网 Tab
// ═══════════════════════════════════════════════════════════

interface DialupTabProps {
  hasComputer: boolean;
  phoneBalance: number;
  totalOnlineMinutes: number;
  readOnly: boolean;
  onDialup: (minutes: number) => void;
}

function DialupTab({ hasComputer, phoneBalance, totalOnlineMinutes, readOnly, onDialup }: DialupTabProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [dialing, setDialing] = useState(false);
  const [dialProgress, setDialProgress] = useState(0);

  // 模拟拨号动画
  useEffect(() => {
    if (!dialing) return;
    setDialProgress(0);
    const timer = setInterval(() => {
      setDialProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setDialing(false);
          return 100;
        }
        return p + 5;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [dialing]);

  const handleDialup = () => {
    if (!hasComputer || readOnly) return;
    setDialing(true);
    // 动画结束后触发实际拨号
    setTimeout(() => {
      onDialup(selectedMinutes);
    }, 2100);
  };

  const selectedOption = ONLINE_DURATION_OPTIONS.find((o) => o.minutes === selectedMinutes);
  const canAfford = phoneBalance >= (selectedOption?.cost ?? 0);

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📡 拨号上网 · Biglobe 拨号服务</h4>

      <div style={{
        padding: 12,
        marginBottom: 12,
        background: `linear-gradient(135deg, ${THEME_VARS.info}11 0%, transparent 100%)`,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.info}33`,
      }}>
        <div style={{ fontSize: 11, lineHeight: 1.7, color: THEME_VARS.text }}>
          <div style={{ marginBottom: 4 }}>
            <strong style={{ color: THEME_VARS.info }}>📡 接入服务:</strong> Biglobe 拨号上网(56K Modem)
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong style={{ color: THEME_VARS.info }}>💰 费率:</strong>
            接入费 {INTERNET_RATES.dialupCost} 日元 + 每分钟 {INTERNET_RATES.perMinuteCost} 日元(从话费扣除)
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong style={{ color: THEME_VARS.info }}>⏱ 拨号时长:</strong>
            {INTERNET_RATES.dialDurationMin}~{INTERNET_RATES.dialDurationMax} 秒(模拟)
          </div>
          <div>
            <strong style={{ color: THEME_VARS.info }}>📊 累计上网:</strong>
            {totalOnlineMinutes} 分钟
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: THEME_VARS.text, marginBottom: 8,
        }}>
          ⏱ 选择上网时长
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ONLINE_DURATION_OPTIONS.map((opt) => {
            const isSelected = selectedMinutes === opt.minutes;
            const affordable = phoneBalance >= opt.cost;
            return (
              <div
                key={opt.minutes}
                onClick={() => !readOnly && affordable && setSelectedMinutes(opt.minutes)}
                style={{
                  padding: 10,
                  background: isSelected ? THEME_VARS.primaryGlow : THEME_VARS.bg,
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
                  borderLeft: `3px solid ${isSelected ? THEME_VARS.primary : affordable ? THEME_VARS.borderSoft : THEME_VARS.danger}`,
                  cursor: readOnly || !affordable ? 'not-allowed' : 'pointer',
                  opacity: affordable ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: THEME_VARS.text }}>
                    {opt.label}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: affordable ? THEME_VARS.text : THEME_VARS.danger,
                    fontWeight: 600,
                  }}>
                    {opt.cost} 日元
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 拨号动画 */}
      {dialing && (
        <div style={{
          padding: 16,
          marginBottom: 12,
          background: '#000',
          color: '#0f0',
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 11,
          textAlign: 'center',
        }}>
          <div style={{ marginBottom: 8 }}>
            {dialProgress < 30 && '🔊 滴... 滴... 滴...'}
            {dialProgress >= 30 && dialProgress < 60 && '📡 滋滋... 滋滋... 嘟——'}
            {dialProgress >= 60 && dialProgress < 90 && '🤝 握手中... 请稍候...'}
            {dialProgress >= 90 && '✓ 连接成功!'}
          </div>
          <div style={{
            height: 6,
            background: '#333',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${dialProgress}%`,
              background: 'linear-gradient(90deg, #0f0 0%, #0a0 100%)',
              transition: 'width 0.1s linear',
            }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 10 }}>
            {dialProgress}%
          </div>
        </div>
      )}

      <button
        onClick={handleDialup}
        disabled={!hasComputer || readOnly || dialing || !canAfford}
        style={{
          width: '100%',
          padding: '10px 20px',
          background: !hasComputer || readOnly || dialing || !canAfford
            ? THEME_VARS.textMuted
            : `linear-gradient(135deg, ${THEME_VARS.info} 0%, ${THEME_VARS.primary} 100%)`,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: !hasComputer || readOnly || dialing || !canAfford ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.8,
        }}
      >
        {dialing
          ? '⏳ 拨号中...'
          : !canAfford
            ? `💰 话费不足(需 ${selectedOption?.cost ?? 0} 日元)`
            : `📡 开始拨号(${selectedMinutes} 分钟 / ${selectedOption?.cost ?? 0} 日元)`}
      </button>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  2. BBS Tab
// ═══════════════════════════════════════════════════════════

interface BbsTabProps {
  sd: Record<string, unknown>;
  hasComputer: boolean;
  readOnly: boolean;
  onBrowse: (postId: string) => void;
  onReply: (postId: string, content: string) => void;
}

function BbsTab({ sd, hasComputer, readOnly, onBrowse, onReply }: BbsTabProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const posts = useMemo(() => {
    if (!selectedBoardId) return [];
    return computerEngine.listPosts(selectedBoardId, sd);
  }, [selectedBoardId, sd]);

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null;
    return computerEngine.getPost(selectedPostId, sd);
  }, [selectedPostId, sd]);

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    onBrowse(postId);
  };

  const handleReply = () => {
    if (!selectedPostId || !replyContent.trim()) return;
    onReply(selectedPostId, replyContent.trim());
    setReplyContent('');
  };

  if (!hasComputer) {
    return <section style={sectionStyle}><div style={emptyStyle}>需拥有电脑才能访问 BBS</div></section>;
  }

  // 帖子详情视图
  if (selectedPost) {
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          📄 帖子详情
          <button
            onClick={() => setSelectedPostId(null)}
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: 'transparent',
              color: THEME_VARS.primary,
              border: `1px solid ${THEME_VARS.primary}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              float: 'right',
            }}
          >
            ← 返回列表
          </button>
        </h4>

        <div style={{
          padding: 12,
          marginBottom: 12,
          background: THEME_VARS.bg,
          borderRadius: 8,
          border: `1px solid ${THEME_VARS.borderSoft}`,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: THEME_VARS.text, marginBottom: 6,
          }}>
            {selectedPost.title}
          </div>
          <div style={{
            fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 8,
          }}>
            楼主: {selectedPost.authorId} · {selectedPost.postTime}
          </div>
          <div style={{
            fontSize: 11, color: THEME_VARS.text, lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}>
            {selectedPost.content}
          </div>
        </div>

        {/* 楼层回复 */}
        {selectedPost.replies.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: THEME_VARS.primary, marginBottom: 6,
            }}>
              💬 回复({selectedPost.replies.length} 楼)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedPost.replies.map((reply) => (
                <div key={reply.floor} style={{
                  padding: 8,
                  background: THEME_VARS.bg,
                  borderRadius: 6,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  fontSize: 11,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: 4, fontSize: 10,
                  }}>
                    <span style={{ color: THEME_VARS.primary, fontWeight: 500 }}>
                      {reply.floor}楼 · {reply.authorId}
                    </span>
                    <span style={{ color: THEME_VARS.textMuted }}>
                      {reply.replyTime}
                    </span>
                  </div>
                  <div style={{ color: THEME_VARS.text, lineHeight: 1.6 }}>
                    {reply.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 回帖效果提示 */}
        {selectedPost.effects && selectedPost.effects.length > 0 && (
          <div style={{
            padding: 8,
            marginBottom: 12,
            background: THEME_VARS.success + '11',
            borderRadius: 6,
            border: `1px solid ${THEME_VARS.success}33`,
            fontSize: 10,
            color: THEME_VARS.success,
          }}>
            ✨ 回帖奖励: {selectedPost.effects.map((e) => e.description).filter(Boolean).join(', ')}
          </div>
        )}

        {/* 回帖输入 */}
        {!readOnly && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: THEME_VARS.warning, marginBottom: 6,
            }}>
              ✏ 回帖(200 字以内)
            </div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value.slice(0, 200))}
              placeholder="输入回复内容..."
              style={{
                width: '100%',
                minHeight: 60,
                padding: 8,
                background: THEME_VARS.bg,
                color: THEME_VARS.text,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginTop: 6,
            }}>
              <span style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                {replyContent.length}/200
              </span>
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                style={{
                  padding: '6px 16px',
                  background: !replyContent.trim() ? THEME_VARS.textMuted : THEME_VARS.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !replyContent.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                发表回复
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // 板块帖子列表
  if (selectedBoardId) {
    const board = BBS_BOARDS.find((b) => b.id === selectedBoardId);
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          {BOARD_CATEGORY_ICON[board!.category]} {board!.name}
          <button
            onClick={() => { setSelectedBoardId(null); setSelectedPostId(null); }}
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: 'transparent',
              color: THEME_VARS.primary,
              border: `1px solid ${THEME_VARS.primary}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              float: 'right',
            }}
          >
            ← 返回板块
          </button>
        </h4>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 10 }}>
          {board!.description}
        </div>

        {posts.length === 0 ? (
          <div style={emptyStyle}>该板块暂无可浏览的帖子</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => handleSelectPost(post.id)}
                style={{
                  padding: 10,
                  background: THEME_VARS.bg,
                  borderRadius: 8,
                  border: `1px solid ${THEME_VARS.borderSoft}`,
                  borderLeft: `3px solid ${BOARD_CATEGORY_COLOR[board!.category]}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: THEME_VARS.text, marginBottom: 4,
                }}>
                  {post.title}
                </div>
                <div style={{
                  display: 'flex', gap: 8, fontSize: 10, color: THEME_VARS.textMuted,
                }}>
                  <span>楼主: {post.authorId}</span>
                  <span>·</span>
                  <span>{post.postTime}</span>
                  <span>·</span>
                  <span>回复 {post.replies.length}</span>
                  {post.effects && post.effects.length > 0 && (
                    <>
                      <span>·</span>
                      <span style={{ color: THEME_VARS.success }}>✨ 有奖励</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // 板块列表
  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>💬 BBS 板块(2ch 风格)</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BBS_BOARDS.map((board) => {
          const postCount = computerEngine.listPosts(board.id, sd).length;
          return (
            <div
              key={board.id}
              onClick={() => setSelectedBoardId(board.id)}
              style={{
                padding: 12,
                background: `linear-gradient(135deg, ${BOARD_CATEGORY_COLOR[board.category]}11 0%, transparent 100%)`,
                borderRadius: 8,
                border: `1px solid ${BOARD_CATEGORY_COLOR[board.category]}33`,
                borderLeft: `4px solid ${BOARD_CATEGORY_COLOR[board.category]}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: THEME_VARS.text }}>
                    {BOARD_CATEGORY_ICON[board.category]} {board.name}
                  </span>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
                    {board.description}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 8px',
                  background: BOARD_CATEGORY_COLOR[board.category] + '22',
                  color: BOARD_CATEGORY_COLOR[board.category],
                  borderRadius: 10,
                  fontWeight: 600,
                }}>
                  {postCount} 帖
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  3. 邮件 Tab
// ═══════════════════════════════════════════════════════════

interface MailTabProps {
  sd: Record<string, unknown>;
  hasComputer: boolean;
  readOnly: boolean;
  onCheckEmails: () => void;
  onMarkRead: (emailId: string) => void;
  onSend: (to: string, subject: string, body: string) => void;
}

function MailTab({ sd, hasComputer, readOnly, onCheckEmails, onMarkRead, onSend }: MailTabProps) {
  const [mailTab, setMailTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const computer = useMemo(() => computerEngine.read(sd), [sd]);

  const inboxEmails = useMemo(() => {
    return Object.entries(computer.邮件记录)
      .filter(([, r]) => r.类型 === '收件')
      .map(([id, r]) => ({ id, record: r }))
      .sort((a, b) => b.record.时间.localeCompare(a.record.时间));
  }, [computer]);

  const sentEmails = useMemo(() => {
    return Object.entries(computer.邮件记录)
      .filter(([, r]) => r.类型 === '发件')
      .map(([id, r]) => ({ id, record: r }))
      .sort((a, b) => b.record.时间.localeCompare(a.record.时间));
  }, [computer]);

  const selectedEmail = selectedEmailId ? computer.邮件记录[selectedEmailId] : null;

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
    const record = computer.邮件记录[emailId];
    if (record && record.已读 === 0) {
      onMarkRead(emailId);
    }
  };

  const handleSend = () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return;
    onSend(composeTo.trim(), composeSubject.trim(), composeBody.trim());
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setMailTab('sent');
  };

  if (!hasComputer) {
    return <section style={sectionStyle}><div style={emptyStyle}>需拥有电脑才能收发邮件</div></section>;
  }

  // 邮件详情视图
  if (selectedEmail) {
    return (
      <section style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          📨 邮件详情
          <button
            onClick={() => setSelectedEmailId(null)}
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: 'transparent',
              color: THEME_VARS.primary,
              border: `1px solid ${THEME_VARS.primary}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              float: 'right',
            }}
          >
            ← 返回列表
          </button>
        </h4>

        <div style={{
          padding: 12,
          background: THEME_VARS.bg,
          borderRadius: 8,
          border: `1px solid ${THEME_VARS.borderSoft}`,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: THEME_VARS.text, marginBottom: 8,
          }}>
            {selectedEmail.主题}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 4, fontSize: 10, color: THEME_VARS.textMuted, marginBottom: 12,
          }}>
            <div>
              <span>发件人:</span>
              <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{selectedEmail.发件人}</strong>
            </div>
            <div>
              <span>收件人:</span>
              <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{selectedEmail.收件人}</strong>
            </div>
            <div>
              <span>时间:</span>
              <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{selectedEmail.时间}</strong>
            </div>
            <div>
              <span>类型:</span>
              <strong style={{ color: THEME_VARS.text, marginLeft: 4 }}>{selectedEmail.类型}</strong>
            </div>
          </div>
          <div style={{
            padding: 10,
            background: THEME_VARS.overlay,
            borderRadius: 6,
            fontSize: 11,
            color: THEME_VARS.text,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}>
            {selectedEmail.正文}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>📧 邮件系统(Outlook Express 风格)</h4>

      {/* 邮件统计 + 检查新邮件 */}
      <div style={{
        padding: 8,
        marginBottom: 12,
        background: THEME_VARS.bg,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        fontSize: 11,
      }}>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>收件:</span>
          <strong style={{ color: THEME_VARS.text, marginLeft: 3 }}>{inboxEmails.length}</strong>
        </span>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>未读:</span>
          <strong style={{ color: THEME_VARS.danger, marginLeft: 3 }}>{computer.邮件未读数}</strong>
        </span>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>发件:</span>
          <strong style={{ color: THEME_VARS.text, marginLeft: 3 }}>{sentEmails.length}</strong>
        </span>
        {!readOnly && (
          <button
            onClick={onCheckEmails}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              background: THEME_VARS.info,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            🔄 检查新邮件
          </button>
        )}
      </div>

      {/* 子 tab */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 10,
      }}>
        {([
          { key: 'inbox', label: '收件箱', icon: '📥' },
          { key: 'sent', label: '已发送', icon: '📤' },
          { key: 'compose', label: '写邮件', icon: '✏' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setMailTab(t.key)}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: mailTab === t.key ? THEME_VARS.primary : 'transparent',
              color: mailTab === t.key ? '#fff' : THEME_VARS.textMuted,
              border: `1px solid ${mailTab === t.key ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 收件箱 */}
      {mailTab === 'inbox' && (
        <div>
          {inboxEmails.length === 0 ? (
            <div style={emptyStyle}>收件箱为空(拨号上网时自动检查新邮件)</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inboxEmails.map(({ id, record }) => (
                <div
                  key={id}
                  onClick={() => handleSelectEmail(id)}
                  style={{
                    padding: 10,
                    background: record.已读 === 0 ? THEME_VARS.primaryGlow : THEME_VARS.bg,
                    borderRadius: 6,
                    border: `1px solid ${record.已读 === 0 ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                    borderLeft: `3px solid ${record.已读 === 0 ? THEME_VARS.primary : THEME_VARS.borderSoft}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 4,
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: record.已读 === 0 ? 600 : 500,
                      color: THEME_VARS.text,
                    }}>
                      {record.已读 === 0 && '🔵 '}
                      {record.主题}
                    </span>
                    <span style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                      {record.时间}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                    来自: {record.发件人}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 已发送 */}
      {mailTab === 'sent' && (
        <div>
          {sentEmails.length === 0 ? (
            <div style={emptyStyle}>尚未发送任何邮件</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sentEmails.map(({ id, record }) => (
                <div
                  key={id}
                  onClick={() => handleSelectEmail(id)}
                  style={{
                    padding: 10,
                    background: THEME_VARS.bg,
                    borderRadius: 6,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                    borderLeft: `3px solid ${THEME_VARS.success}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: THEME_VARS.text }}>
                      {record.主题}
                    </span>
                    <span style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                      {record.时间}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                    发送至: {record.收件人}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 写邮件 */}
      {mailTab === 'compose' && (
        <div>
          {!readOnly ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: THEME_VARS.textMuted, display: 'block', marginBottom: 4 }}>
                  收件人
                </label>
                <input
                  type="text"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="example@biglobe.ne.jp"
                  style={{
                    width: '100%',
                    padding: 8,
                    background: THEME_VARS.bg,
                    color: THEME_VARS.text,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: THEME_VARS.textMuted, display: 'block', marginBottom: 4 }}>
                  主题
                </label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="邮件主题"
                  style={{
                    width: '100%',
                    padding: 8,
                    background: THEME_VARS.bg,
                    color: THEME_VARS.text,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: THEME_VARS.textMuted, display: 'block', marginBottom: 4 }}>
                  正文
                </label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="邮件正文..."
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: 8,
                    background: THEME_VARS.bg,
                    color: THEME_VARS.text,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                style={{
                  padding: '8px 20px',
                  background: !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()
                    ? THEME_VARS.textMuted
                    : THEME_VARS.success,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !composeTo.trim() || !composeSubject.trim() || !composeBody.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  alignSelf: 'flex-end',
                }}
              >
                📤 发送邮件
              </button>
            </div>
          ) : (
            <div style={emptyStyle}>只读模式</div>
          )}
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  4. 收藏夹 Tab
// ═══════════════════════════════════════════════════════════

interface FavoritesTabProps {
  favorites: string;
  readOnly: boolean;
  onAdd: (url: string) => void;
}

function FavoritesTab({ favorites, readOnly, onAdd }: FavoritesTabProps) {
  const [newUrl, setNewUrl] = useState('');

  const favoriteList = useMemo(() => {
    return favorites.split(',').map((s) => s.trim()).filter(Boolean);
  }, [favorites]);

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    onAdd(newUrl.trim());
    setNewUrl('');
  };

  return (
    <section style={sectionStyle}>
      <h4 style={sectionTitleStyle}>⭐ 收藏夹(浏览器书签)</h4>

      {!readOnly && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 12,
        }}>
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="http://www.example.com"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            style={{
              flex: 1,
              padding: 8,
              background: THEME_VARS.bg,
              color: THEME_VARS.text,
              border: `1px solid ${THEME_VARS.borderSoft}`,
              borderRadius: 6,
              fontSize: 11,
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!newUrl.trim()}
            style={{
              padding: '8px 16px',
              background: !newUrl.trim() ? THEME_VARS.textMuted : THEME_VARS.warning,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: !newUrl.trim() ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            ⭐ 收藏
          </button>
        </div>
      )}

      {favoriteList.length === 0 ? (
        <div style={emptyStyle}>收藏夹为空</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {favoriteList.map((url, idx) => (
            <div
              key={idx}
              style={{
                padding: 10,
                background: THEME_VARS.bg,
                borderRadius: 6,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                borderLeft: `3px solid ${THEME_VARS.warning}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{
                fontSize: 11,
                color: THEME_VARS.primary,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}>
                {url}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
