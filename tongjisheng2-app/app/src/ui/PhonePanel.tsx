/**
 * 手机面板（阶段3 步骤8）
 *
 * 三 tab 设计:
 *  - 通讯录:联系人列表,可拨打电话/发短信
 *  - 短信:收件箱(可读可回),发件箱
 *  - 通话记录:拨出/接入/未接
 *  - 贪吃蛇:90 年代经典单色游戏,得分换话费
 *
 * 视觉风格:90 年代 PHS 黑白屏·绿色单色像素风
 *
 * 集成:
 *  - GameView 添加「📱 手机」按钮
 *  - App.tsx 管理 gamePanel='phone' 状态
 *  - 调用 phoneEngine.sendSms/call/checkIncomingSms/submitSnakeScore
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { THEME_VARS } from './types';
import {
  phoneEngine,
  PHONE_RATES,
  type PhoneCallRecord,
  type PhoneSmsRecord,
  type SendSmsResult,
  type CallResult,
  type UnlockedContact,
} from '../runtime/phone-engine';
import { SNAKE_GAME_CONFIG } from '../content/phone/phone-data';
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
  background: `linear-gradient(135deg, ${THEME_VARS.info} 0%, ${THEME_VARS.primary} 100%)`,
  color: '#fff',
  boxShadow: THEME_VARS.shadowSm,
};

// 90 年代 PHS 屏幕风格(绿底黑字)
const phsScreenStyle: React.CSSProperties = {
  background: '#9bbc0f',
  color: '#0f380f',
  fontFamily: 'var(--font-mono), monospace',
  padding: 12,
  borderRadius: 8,
  border: '2px solid #0f380f',
  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)',
  fontSize: 11,
};

const sectionStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  background: THEME_VARS.overlay,
  borderRadius: 12,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  boxShadow: THEME_VARS.shadowSm,
};

const emptyStyle: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: THEME_VARS.textMuted,
  fontSize: 11,
  fontStyle: 'italic',
};

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface PhonePanelProps {
  mvu?: MvuRuntime;
  readOnly?: boolean;
}

type PanelTab = 'contacts' | 'sms' | 'calls' | 'snake';

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function PhonePanel({ mvu, readOnly = false }: PhonePanelProps) {
  const [tab, setTab] = useState<PanelTab>('contacts');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const sd = useMemo(() => {
    if (!mvu) return {} as Record<string, unknown>;
    return mvu.snapshot();
  }, [mvu, refreshKey]);

  const hasPhone = useMemo(() => phoneEngine.hasPhone(sd), [sd]);
  const balance = useMemo(() => {
    const phone = (sd.手机 ?? {}) as { 话费余额?: number };
    return Number(phone.话费余额 ?? 0);
  }, [sd]);

  const contacts = useMemo<UnlockedContact[]>(() => {
    if (!mvu) return [];
    return phoneEngine.listContacts(sd);
  }, [sd, mvu]);

  const smsRecords = useMemo<Array<{ id: string; record: PhoneSmsRecord }>>(() => {
    const phone = (sd.手机 ?? {}) as { 短信记录?: Record<string, PhoneSmsRecord> };
    const records = phone.短信记录 ?? {};
    return Object.entries(records)
      .map(([id, record]) => ({ id, record }))
      .sort((a, b) => b.record.时间.localeCompare(a.record.时间));
  }, [sd]);

  const callRecords = useMemo<Array<{ id: string; record: PhoneCallRecord }>>(() => {
    const phone = (sd.手机 ?? {}) as { 通话记录?: Record<string, PhoneCallRecord> };
    const records = phone.通话记录 ?? {};
    return Object.entries(records)
      .map(([id, record]) => ({ id, record }))
      .sort((a, b) => b.record.时间.localeCompare(a.record.时间));
  }, [sd]);

  const unreadSmsCount = useMemo(
    () => smsRecords.filter((s) => s.record.已读 === 0 && s.record.接收者 !== '').length,
    [smsRecords],
  );

  // 显示 toast
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 应用 stateOps
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

  // 检查新短信
  useEffect(() => {
    if (!mvu || !hasPhone) return;
    const check = phoneEngine.checkIncomingSms(sd);
    if (check.newMessages.length > 0) {
      applyStateOps(check.stateOps);
      showToast('info', `收到 ${check.newMessages.length} 条新短信`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mvu, hasPhone]);

  // 发短信
  const handleSendSms = useCallback(
    (to: string, content: string) => {
      if (!mvu) return;
      const result = phoneEngine.sendSms(sd, { to, content });
      if (result.ok) {
        applyStateOps(result.stateOps);
        showToast('success', `短信已发送给 ${to},扣费 ${result.cost} 日元`);
      } else {
        showToast('error', result.reason ?? '发送失败');
      }
    },
    [sd, mvu, applyStateOps, showToast],
  );

  // 拨打电话
  const handleCall = useCallback(
    (target: string) => {
      if (!mvu) return;
      const result = phoneEngine.call(sd, target);
      if (result.ok) {
        applyStateOps(result.stateOps);
        showToast('success', `通话结束 · ${result.durationSec} 秒 · 扣费 ${result.cost} 日元`);
      } else {
        showToast('error', result.reason ?? '通话失败');
      }
    },
    [sd, mvu, applyStateOps, showToast],
  );

  // 标记短信已读
  const handleMarkRead = useCallback(
    (smsId: string) => {
      if (!mvu) return;
      const ops = phoneEngine.markSmsRead(sd, smsId);
      applyStateOps(ops);
    },
    [sd, mvu, applyStateOps],
  );

  // 贪吃蛇得分结算
  const handleSnakeScore = useCallback(
    (score: number) => {
      if (!mvu) return;
      const result = phoneEngine.submitSnakeScore(sd, score);
      if (result.ok) {
        applyStateOps(result.stateOps);
        if (result.bonus > 0) {
          showToast('success', `得分 ${score}${result.isHighScore ? ' ★新纪录' : ''},奖励话费 ${result.bonus} 日元`);
        } else if (result.isHighScore) {
          showToast('success', `得分 ${score} · 新纪录!`);
        }
      }
    },
    [sd, mvu, applyStateOps, showToast],
  );

  // 未拥有手机时显示
  if (!hasPhone) {
    return (
      <div style={containerStyle}>
        <header style={{
          paddingBottom: 10,
          marginBottom: 10,
          borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
        }}>
          <h3 style={{
            margin: 0,
            fontFamily: THEME_VARS.fontDisplay,
            fontSize: 16,
            fontWeight: 500,
            color: THEME_VARS.info,
            letterSpacing: 1,
          }}>📱 手机</h3>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
            Phone Panel · 90 年代 PHS 简单功能机
          </div>
        </header>
        <div style={emptyStyle}>
          📵 尚未拥有手机
          <br />
          <br />
          剧情第 3 天左右,玩家将获得一部 PHS 手机
          <br />
          (与女角互动后由剧情触发,或前往电器街购买)
        </div>
      </div>
    );
  }

  const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'contacts', label: '通讯录', icon: '👥' },
    { key: 'sms', label: '短信', icon: '💬' },
    { key: 'calls', label: '通话', icon: '📞' },
    { key: 'snake', label: '贪吃蛇', icon: '🐍' },
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
          }}>📱 手机</h3>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2 }}>
            {((sd.手机 ?? {}) as { 机型?: string }).机型 || '京瓷 K系列'} · 90 年代 PHS
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
          ¥ 话费 {balance.toLocaleString()}
        </div>
      </header>

      {toast && (
        <div style={{
          padding: '8px 14px',
          marginBottom: 10,
          background: toast.type === 'success' ? '#e8f5e9' : toast.type === 'error' ? '#ffebee' : '#e3f2fd',
          color: toast.type === 'success' ? '#2e7d32' : toast.type === 'error' ? '#c62828' : '#1565c0',
          borderRadius: 6,
          fontSize: 11,
          border: `1px solid ${toast.type === 'success' ? '#4caf50' : toast.type === 'error' ? '#e53935' : '#2196f3'}55`,
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
            {t.key === 'sms' && unreadSmsCount > 0 && (
              <span style={{
                marginLeft: 4,
                padding: '0 4px',
                background: THEME_VARS.danger,
                color: '#fff',
                borderRadius: 8,
                fontSize: 9,
              }}>
                {unreadSmsCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'contacts' && (
        <ContactsTab
          contacts={contacts}
          readOnly={readOnly}
          onCall={handleCall}
          onSendSms={handleSendSms}
          balance={balance}
        />
      )}

      {tab === 'sms' && (
        <SmsTab
          smsRecords={smsRecords}
          readOnly={readOnly}
          onMarkRead={handleMarkRead}
          onSendSms={handleSendSms}
          balance={balance}
        />
      )}

      {tab === 'calls' && (
        <CallsTab callRecords={callRecords} readOnly={readOnly} onCall={handleCall} balance={balance} />
      )}

      {tab === 'snake' && (
        <SnakeTab
          highScore={Number(((sd.手机 ?? {}) as { 贪吃蛇最高分?: number }).贪吃蛇最高分 ?? 0)}
          readOnly={readOnly}
          onSubmitScore={handleSnakeScore}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  1. 通讯录 Tab
// ═══════════════════════════════════════════════════════════

interface ContactsTabProps {
  contacts: UnlockedContact[];
  readOnly: boolean;
  onCall: (target: string) => void;
  onSendSms: (to: string, content: string) => void;
  balance: number;
}

function ContactsTab({ contacts, readOnly, onCall, onSendSms, balance }: ContactsTabProps) {
  const [selectedContact, setSelectedContact] = useState<UnlockedContact | null>(null);
  const [smsContent, setSmsContent] = useState('');
  const unlockedContacts = contacts.filter((c) => c.isUnlocked);

  if (selectedContact) {
    return (
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ ...{ margin: 0, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text } }}>
            {selectedContact.avatar} {selectedContact.name}
          </h4>
          <button
            onClick={() => setSelectedContact(null)}
            style={{
              padding: '4px 10px',
              background: THEME_VARS.bg,
              color: THEME_VARS.textMuted,
              border: `1px solid ${THEME_VARS.borderSoft}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ← 返回
          </button>
        </div>

        <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 8 }}>
          📞 {selectedContact.phone} · {selectedContact.relation}
        </div>

        {/* PHS 屏幕风格显示 */}
        <div style={{ ...phsScreenStyle, marginBottom: 12 }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>PHONE BOOK</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedContact.name}</div>
          <div style={{ fontSize: 11 }}>{selectedContact.phone}</div>
        </div>

        {/* 拨打电话 */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => onCall(selectedContact.phone)}
            disabled={readOnly || balance < PHONE_RATES.callMinCost}
            style={{
              padding: '8px 16px',
              background: readOnly || balance < PHONE_RATES.callMinCost ? THEME_VARS.textSoft : THEME_VARS.success,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: readOnly || balance < PHONE_RATES.callMinCost ? 'not-allowed' : 'pointer',
              fontSize: 12,
              opacity: readOnly || balance < PHONE_RATES.callMinCost ? 0.6 : 1,
            }}
          >
            📞 拨打 (最低 {PHONE_RATES.callMinCost} 日元)
          </button>
        </div>

        {/* 发送短信 */}
        <div>
          <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 4 }}>
            发送短信 (每条 {PHONE_RATES.smsCost} 日元,上限 70 字符)
          </div>
          <textarea
            value={smsContent}
            onChange={(e) => setSmsContent(e.target.value.slice(0, 70))}
            placeholder={`给 ${selectedContact.name} 发短信…`}
            disabled={readOnly}
            style={{
              width: '100%',
              minHeight: 60,
              padding: 8,
              background: THEME_VARS.bg,
              color: THEME_VARS.text,
              border: `1px solid ${THEME_VARS.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontFamily: THEME_VARS.fontBody,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontSize: 10, color: smsContent.length >= 60 ? THEME_VARS.warning : THEME_VARS.textMuted }}>
              {smsContent.length}/70 字符
            </span>
            <button
              onClick={() => {
                onSendSms(selectedContact.phone, smsContent);
                setSmsContent('');
                setSelectedContact(null);
              }}
              disabled={readOnly || !smsContent.trim() || balance < PHONE_RATES.smsCost}
              style={{
                padding: '6px 14px',
                background: readOnly || !smsContent.trim() || balance < PHONE_RATES.smsCost
                  ? THEME_VARS.textSoft
                  : THEME_VARS.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: readOnly || !smsContent.trim() || balance < PHONE_RATES.smsCost ? 'not-allowed' : 'pointer',
                fontSize: 11,
                opacity: readOnly || !smsContent.trim() || balance < PHONE_RATES.smsCost ? 0.6 : 1,
              }}
            >
              发送
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={{ margin: 0, marginBottom: 12, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text, paddingBottom: 8, borderBottom: `1px solid ${THEME_VARS.borderSoft}` }}>
        👥 通讯录 ({unlockedContacts.length}/{contacts.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {contacts.map((c) => (
          <button
            key={`${c.name}-${c.phone}`}
            onClick={() => c.isUnlocked && setSelectedContact(c)}
            disabled={!c.isUnlocked || readOnly}
            style={{
              padding: 10,
              background: c.isUnlocked
                ? `linear-gradient(135deg, ${THEME_VARS.info}11 0%, transparent 100%)`
                : THEME_VARS.bg,
              color: c.isUnlocked ? THEME_VARS.text : THEME_VARS.textMuted,
              border: `1px solid ${c.isUnlocked ? THEME_VARS.info + '55' : THEME_VARS.borderSoft}`,
              borderLeft: `3px solid ${c.isUnlocked ? THEME_VARS.info : THEME_VARS.borderSoft}`,
              borderRadius: 8,
              cursor: c.isUnlocked && !readOnly ? 'pointer' : 'not-allowed',
              opacity: c.isUnlocked ? 1 : 0.5,
              textAlign: 'left',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>{c.avatar}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {c.isUnlocked ? c.name : '???'}
                {!c.isUnlocked && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: THEME_VARS.warning }}>
                    🔒 {c.unlockFlag || '未解锁'}
                  </span>
                )}
              </div>
              {c.isUnlocked && (
                <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                  {c.phone} · {c.relation}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  2. 短信 Tab
// ═══════════════════════════════════════════════════════════

interface SmsTabProps {
  smsRecords: Array<{ id: string; record: PhoneSmsRecord }>;
  readOnly: boolean;
  onMarkRead: (smsId: string) => void;
  onSendSms: (to: string, content: string) => void;
  balance: number;
}

function SmsTab({ smsRecords, readOnly, onMarkRead, onSendSms, balance }: SmsTabProps) {
  const [selectedSms, setSelectedSms] = useState<{ id: string; record: PhoneSmsRecord } | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 选中短信时标记已读
  useEffect(() => {
    if (selectedSms && selectedSms.record.已读 === 0) {
      onMarkRead(selectedSms.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSms]);

  if (smsRecords.length === 0) {
    return (
      <section style={sectionStyle}>
        <h4 style={{ margin: 0, marginBottom: 12, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text, paddingBottom: 8, borderBottom: `1px solid ${THEME_VARS.borderSoft}` }}>
          💬 短信收件箱 (0)
        </h4>
        <div style={emptyStyle}>
          收件箱为空
          <br />
          (剧情触发后会自动收到短信)
        </div>
      </section>
    );
  }

  if (selectedSms) {
    const isReceived = selectedSms.record.接收者 !== '' && selectedSms.record.接收者 !== selectedSms.record.发送者;
    return (
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text }}>
            {isReceived ? '📥 收件' : '📤 发件'}
          </h4>
          <button
            onClick={() => {
              setSelectedSms(null);
              setReplyContent('');
            }}
            style={{
              padding: '4px 10px',
              background: THEME_VARS.bg,
              color: THEME_VARS.textMuted,
              border: `1px solid ${THEME_VARS.borderSoft}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ← 返回
          </button>
        </div>

        {/* PHS 屏幕风格显示短信 */}
        <div style={{ ...phsScreenStyle, marginBottom: 12, minHeight: 80 }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
            FROM: {selectedSms.record.发送者}
          </div>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 8 }}>
            TIME: {selectedSms.record.时间}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {selectedSms.record.内容}
          </div>
        </div>

        {/* 回复(仅收件箱可回复) */}
        {isReceived && !readOnly && (
          <div>
            <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginBottom: 4 }}>
              回复 {selectedSms.record.发送者} (每条 {PHONE_RATES.smsCost} 日元)
            </div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value.slice(0, 70))}
              placeholder="回复内容…"
              style={{
                width: '100%',
                minHeight: 50,
                padding: 8,
                background: THEME_VARS.bg,
                color: THEME_VARS.text,
                border: `1px solid ${THEME_VARS.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: THEME_VARS.fontBody,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                {replyContent.length}/70
              </span>
              <button
                onClick={() => {
                  onSendSms(selectedSms.record.发送者, replyContent);
                  setReplyContent('');
                  setSelectedSms(null);
                }}
                disabled={!replyContent.trim() || balance < PHONE_RATES.smsCost}
                style={{
                  padding: '6px 14px',
                  background: !replyContent.trim() || balance < PHONE_RATES.smsCost ? THEME_VARS.textSoft : THEME_VARS.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !replyContent.trim() || balance < PHONE_RATES.smsCost ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  opacity: !replyContent.trim() || balance < PHONE_RATES.smsCost ? 0.6 : 1,
                }}
              >
                回复
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={{ margin: 0, marginBottom: 12, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text, paddingBottom: 8, borderBottom: `1px solid ${THEME_VARS.borderSoft}` }}>
        💬 短信收件箱 ({smsRecords.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {smsRecords.map(({ id, record }) => {
          const isReceived = record.接收者 !== '' && record.接收者 !== record.发送者;
          const isUnread = record.已读 === 0 && isReceived;
          return (
            <button
              key={id}
              onClick={() => setSelectedSms({ id, record })}
              style={{
                padding: 8,
                background: isUnread ? `${THEME_VARS.primary}11` : THEME_VARS.overlay,
                color: THEME_VARS.text,
                border: `1px solid ${isUnread ? THEME_VARS.primary + '55' : THEME_VARS.borderSoft}`,
                borderLeft: `3px solid ${isUnread ? THEME_VARS.primary : isReceived ? THEME_VARS.info : THEME_VARS.textSoft}`,
                borderRadius: 6,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 11,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontWeight: isUnread ? 700 : 500 }}>
                  {isReceived ? '📥' : '📤'} {isReceived ? record.发送者 : record.接收者}
                  {isUnread && <span style={{ marginLeft: 6, color: THEME_VARS.danger, fontSize: 9 }}>●未读</span>}
                </span>
                <span style={{ fontSize: 9, color: THEME_VARS.textMuted }}>{record.时间}</span>
              </div>
              <div style={{
                color: THEME_VARS.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {record.内容}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  3. 通话记录 Tab
// ═══════════════════════════════════════════════════════════

function CallsTab({
  callRecords,
  readOnly,
  onCall,
  balance,
}: {
  callRecords: Array<{ id: string; record: PhoneCallRecord }>;
  readOnly: boolean;
  onCall: (target: string) => void;
  balance: number;
}) {
  if (callRecords.length === 0) {
    return (
      <section style={sectionStyle}>
        <h4 style={{ margin: 0, marginBottom: 12, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text, paddingBottom: 8, borderBottom: `1px solid ${THEME_VARS.borderSoft}` }}>
          📞 通话记录 (0)
        </h4>
        <div style={emptyStyle}>
          暂无通话记录
          <br />
          (前往「通讯录」拨打电话)
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h4 style={{ margin: 0, marginBottom: 12, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text, paddingBottom: 8, borderBottom: `1px solid ${THEME_VARS.borderSoft}` }}>
        📞 通话记录 ({callRecords.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {callRecords.map(({ id, record }) => {
          const dirIcon = record.方向 === '拨出' ? '📤' : record.方向 === '接入' ? '📥' : '📵';
          const dirColor = record.方向 === '拨出' ? THEME_VARS.info : record.方向 === '接入' ? THEME_VARS.success : THEME_VARS.danger;
          const minutes = Math.floor(record.时长秒 / 60);
          const seconds = record.时长秒 % 60;
          return (
            <div
              key={id}
              style={{
                padding: 8,
                background: THEME_VARS.overlay,
                borderRadius: 6,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                borderLeft: `3px solid ${dirColor}`,
                fontSize: 11,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>
                  {dirIcon} {record.对方}
                  <span style={{ marginLeft: 6, fontSize: 10, color: dirColor }}>{record.方向}</span>
                </div>
                <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
                  {record.时间} · {minutes > 0 ? `${minutes}分` : ''}{seconds}秒
                </div>
              </div>
              {!readOnly && (
                <button
                  onClick={() => onCall(record.对方)}
                  disabled={balance < PHONE_RATES.callMinCost}
                  style={{
                    padding: '4px 10px',
                    background: balance < PHONE_RATES.callMinCost ? THEME_VARS.textSoft : THEME_VARS.success,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: balance < PHONE_RATES.callMinCost ? 'not-allowed' : 'pointer',
                    fontSize: 10,
                    opacity: balance < PHONE_RATES.callMinCost ? 0.6 : 1,
                  }}
                >
                  回拨
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  4. 贪吃蛇游戏 Tab
// ═══════════════════════════════════════════════════════════

interface SnakeTabProps {
  highScore: number;
  readOnly: boolean;
  onSubmitScore: (score: number) => void;
}

type SnakeGameState = 'idle' | 'playing' | 'gameover';

interface SnakePos {
  x: number;
  y: number;
}

function SnakeTab({ highScore, readOnly, onSubmitScore }: SnakeTabProps) {
  const config = SNAKE_GAME_CONFIG;
  const [gameState, setGameState] = useState<SnakeGameState>('idle');
  const [snake, setSnake] = useState<SnakePos[]>([{ x: 8, y: 8 }]);
  const [food, setFood] = useState<SnakePos>({ x: 12, y: 8 });
  const [direction, setDirection] = useState<SnakePos>({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(config.initialSpeed);
  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const gameLoopRef = useRef<number | null>(null);

  // 同步 ref
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);
  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);
  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  // 生成食物
  const generateFood = useCallback((snakeBody: SnakePos[]): SnakePos => {
    let newFood: SnakePos;
    do {
      newFood = {
        x: Math.floor(Math.random() * config.width),
        y: Math.floor(Math.random() * config.height),
      };
    } while (snakeBody.some((s) => s.x === newFood.x && s.y === newFood.y));
    return newFood;
  }, [config.width, config.height]);

  // 游戏循环
  const gameStep = useCallback(() => {
    const dir = directionRef.current;
    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;

    const head = currentSnake[0];
    const newHead: SnakePos = { x: head.x + dir.x, y: head.y + dir.y };

    // 撞墙检测
    if (newHead.x < 0 || newHead.x >= config.width || newHead.y < 0 || newHead.y >= config.height) {
      setGameState('gameover');
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    // 撞自己检测
    if (currentSnake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      setGameState('gameover');
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const newSnake = [newHead, ...currentSnake];

    // 吃食物
    if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
      setScore((s) => s + config.scorePerFood);
      setSpeed((sp) => Math.max(config.minSpeed, sp - config.speedDecrement));
      setFood(generateFood(newSnake));
      // 重启循环(加速)
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = window.setInterval(gameStep, Math.max(config.minSpeed, speed - config.speedDecrement));
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [config.width, config.height, config.scorePerFood, config.minSpeed, config.speedDecrement, generateFood, speed]);

  // 开始游戏
  const startGame = useCallback(() => {
    setSnake([{ x: 8, y: 8 }]);
    setFood({ x: 12, y: 8 });
    setDirection({ x: 1, y: 0 });
    directionRef.current = { x: 1, y: 0 };
    setScore(0);
    setSpeed(config.initialSpeed);
    setGameState('playing');

    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    gameLoopRef.current = window.setInterval(gameStep, config.initialSpeed);
  }, [config.initialSpeed, gameStep]);

  // 提交得分
  const handleSubmitScore = useCallback(() => {
    onSubmitScore(score);
    setGameState('idle');
  }, [score, onSubmitScore]);

  // 键盘控制
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleKey = (e: KeyboardEvent) => {
      const dir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x === 0) setDirection({ x: 1, y: 0 });
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  // 清理
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);

  // 渲染棋盘
  const cellSize = 14;
  const boardWidth = config.width * cellSize;
  const boardHeight = config.height * cellSize;

  return (
    <section style={sectionStyle}>
      <h4 style={{ margin: 0, marginBottom: 12, fontFamily: THEME_VARS.fontDisplay, fontSize: 14, fontWeight: 500, color: THEME_VARS.text, paddingBottom: 8, borderBottom: `1px solid ${THEME_VARS.borderSoft}` }}>
        🐍 贪吃蛇 (90 年代经典)
      </h4>

      {/* PHS 屏幕风格的游戏画面 */}
      <div style={{
        ...phsScreenStyle,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
        }}>
          <span>SCORE: {String(score).padStart(4, '0')}</span>
          <span>HI: {String(highScore).padStart(4, '0')}</span>
        </div>

        {/* 棋盘 */}
        <div style={{
          width: boardWidth,
          height: boardHeight,
          background: '#9bbc0f',
          border: '2px solid #0f380f',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${config.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${config.height}, ${cellSize}px)`,
        }}>
          {/* 渲染蛇 */}
          {snake.map((s, i) => (
            <div
              key={`snake-${i}`}
              style={{
                gridColumn: s.x + 1,
                gridRow: s.y + 1,
                background: i === 0 ? '#0f380f' : '#306230',
                width: cellSize - 1,
                height: cellSize - 1,
              }}
            />
          ))}
          {/* 食物 */}
          {gameState === 'playing' && (
            <div
              style={{
                gridColumn: food.x + 1,
                gridRow: food.y + 1,
                background: '#0f380f',
                width: cellSize - 3,
                height: cellSize - 3,
                margin: 1,
                borderRadius: 2,
              }}
            />
          )}
          {/* 暂停/开始画面 */}
          {gameState !== 'playing' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f380f',
              fontSize: 14,
              fontWeight: 700,
              gap: 8,
            }}>
              {gameState === 'idle' && <div>PRESS START</div>}
              {gameState === 'gameover' && (
                <>
                  <div>GAME OVER</div>
                  <div style={{ fontSize: 11 }}>SCORE: {score}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {gameState === 'idle' && !readOnly && (
            <button
              onClick={startGame}
              style={{
                padding: '6px 16px',
                background: '#0f380f',
                color: '#9bbc0f',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ▶ START
            </button>
          )}
          {gameState === 'gameover' && !readOnly && (
            <>
              <button
                onClick={startGame}
                style={{
                  padding: '6px 16px',
                  background: '#0f380f',
                  color: '#9bbc0f',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ↻ RETRY
              </button>
              <button
                onClick={handleSubmitScore}
                style={{
                  padding: '6px 16px',
                  background: '#306230',
                  color: '#9bbc0f',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓ SAVE
              </button>
            </>
          )}
        </div>
      </div>

      {/* 操作说明 */}
      <div style={{
        marginTop: 12,
        padding: 10,
        background: THEME_VARS.bg,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        fontSize: 10,
        color: THEME_VARS.textMuted,
        lineHeight: 1.7,
      }}>
        <div style={{ fontWeight: 600, color: THEME_VARS.text, marginBottom: 4 }}>操作说明</div>
        ⌨ 方向键/WASD 控制蛇的方向
        <br />
        🍎 吃食物 +{config.scorePerFood} 分,蛇身变长,速度加快
        <br />
        💰 每 100 分奖励 10 日元话费
        <br />
        🚫 撞墙或撞自己 = 游戏结束
        <br />
        📺 模拟 90 年代 PHS 单色屏(任天堂 Game Boy 配色)
      </div>
    </section>
  );
}
