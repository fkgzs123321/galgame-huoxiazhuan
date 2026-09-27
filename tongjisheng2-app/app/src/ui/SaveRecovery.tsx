/**
 * Save-Recovery 面板(步骤8 UI)
 *
 * 职责:
 *  - 显示当前 Kernel 状态(当前 revision hash/scope/turnCount/天/地点)
 *  - 手动存档(标签输入 + 创建按钮)
 *  - 存档列表(加载/删除/导出)
 *  - 导入存档(文件选择)
 *  - 重开恢复(显示最新 revision + 一键恢复)
 *  - 一致性校验(显示 KV 指针/Kernel-Revision 对齐/命名空间/chatSheets/孤儿)
 *  - 失败恢复(显示 StreamDraft 保留状态 + 重试/回滚按钮,由父组件注入)
 *
 * 不做:
 *  - 实际 Kernel 状态变更(通过回调通知父组件,父组件调用 kernel/saveCas/recovery)
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { saveCas, type SaveSlot } from '@db/save-cas';
import {
  recovery,
  type RecoveryReport,
  type ConsistencyCheck,
  type HistorySnapshot,
  type FailureReport,
} from '@runtime/recovery';
import { THEME_VARS } from './types';

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface SaveRecoveryProps {
  /** 当前 Kernel 句柄(由 App 持有,传入便于面板调用) */
  kernelRef: React.MutableRefObject<{
    getCurrentRevisionHash: () => string | null;
    getStatData: () => Record<string, unknown>;
    getTurnCount: () => number;
    getActionsToday: () => number;
    getLastActionDay: () => number;
    getCurrentRevisionInfo: () => Promise<
      | {
          hash: string;
          parentHash: string | null;
          ts: number;
          scope: 'save' | 'chat' | 'auto' | 'branch';
          label?: string;
          turnCount: number;
          actionsToday: number;
          lastActionDay: number;
          statDataKeys: string[];
        }
      | null
    >;
  } | null>;
  /** 创建存档(由父组件调用 saveCas.save) */
  onSave: (label: string) => Promise<void>;
  /** 加载存档(由父组件调用 saveCas.load) */
  onLoad: (hash: string) => Promise<void>;
  /** 删除存档(由父组件调用 saveCas.delete) */
  onDelete: (hash: string) => Promise<void>;
  /** 导出存档(由父组件调用 saveCas.exportSave + 下载) */
  onExport: (hash: string) => Promise<void>;
  /** 导入存档(由父组件调用 saveCas.importSave) */
  onImport: (file: File) => Promise<void>;
  /** 重开恢复(由父组件调用 recovery.recoverFromLatest) */
  onRecover: () => Promise<void>;
  /** 失败恢复:重试 */
  onRetry?: () => Promise<void>;
  /** 失败恢复:回滚 */
  onRollback?: () => Promise<void>;
  /** 当前失败报告(若有) */
  failureReport?: FailureReport | null;
  /** 是否只读(验证 UI 用) */
  readOnly?: boolean;
}

// ───────────────────────────────────────────────────────────
//  组件
// ───────────────────────────────────────────────────────────

export function SaveRecovery({
  kernelRef,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImport,
  onRecover,
  onRetry,
  onRollback,
  failureReport,
  readOnly = false,
}: SaveRecoveryProps) {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [recoveryReport, setRecoveryReport] = useState<RecoveryReport | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyCheck | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'fail' | 'info'; text: string } | null>(null);
  const [currentInfo, setCurrentInfo] = useState<
    Awaited<ReturnType<NonNullable<SaveRecoveryProps['kernelRef']['current']>['getCurrentRevisionInfo']>>
  | null>(null);

  // 刷新存档列表 + 历史 + 当前 revision 信息
  const refresh = async () => {
    setBusy(true);
    try {
      const [slots, hist, info] = await Promise.all([
        saveCas.list(),
        recovery.getRecentHistory(30),
        kernelRef.current?.getCurrentRevisionInfo() ?? null,
      ]);
      setSaveSlots(slots);
      setHistory(hist);
      setCurrentInfo(info);
      setMessage(null);
    } catch (e) {
      setMessage({ type: 'fail', text: `刷新失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // 一致性校验
  const runConsistency = async () => {
    if (!kernelRef.current) return;
    setBusy(true);
    try {
      // 父组件需要暴露 kernel 实例给 recovery.verifyConsistency;此处通过 ref 的简化接口无法调用
      // 这里只调用 recovery 的一部分(不依赖 kernel 实例的方法)
      // 真正完整的 verifyConsistency 由父组件触发,这里展示如何手动调用
      setMessage({ type: 'info', text: '一致性校验需父组件触发(因 recovery.verifyConsistency 需 kernel 实例)' });
    } finally {
      setBusy(false);
    }
  };

  // 触发重开恢复
  const handleRecover = async () => {
    setBusy(true);
    try {
      await onRecover();
      const report = await recovery.recoverFromLatest(
        // 父组件已通过 onRecover 完成 kernel.loadFromRevision,这里再次调用是无害的幂等操作
        // 但为避免重复,这里改用 onRecover 后由父组件传入 recoveryReport
        kernelRef.current as never,
      );
      setRecoveryReport(report);
      await refresh();
      setMessage({ type: 'ok', text: '重开恢复完成' });
    } catch (e) {
      setMessage({ type: 'fail', text: `恢复失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  // 创建存档
  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(label);
      setLabel('');
      await refresh();
      setMessage({ type: 'ok', text: '存档已创建' });
    } catch (e) {
      setMessage({ type: 'fail', text: `存档失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  // 加载存档
  const handleLoad = async (hash: string) => {
    setBusy(true);
    try {
      await onLoad(hash);
      await refresh();
      setMessage({ type: 'ok', text: '存档已加载' });
    } catch (e) {
      setMessage({ type: 'fail', text: `加载失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  // 删除存档
  const handleDelete = async (hash: string) => {
    if (!confirm(`确认删除存档 ${hash.slice(0, 8)}?`)) return;
    setBusy(true);
    try {
      await onDelete(hash);
      await refresh();
      setMessage({ type: 'ok', text: '存档已删除' });
    } catch (e) {
      setMessage({ type: 'fail', text: `删除失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  // 导出存档
  const handleExport = async (hash: string) => {
    setBusy(true);
    try {
      await onExport(hash);
      setMessage({ type: 'ok', text: `存档 ${hash.slice(0, 8)} 已导出(下载)` });
    } catch (e) {
      setMessage({ type: 'fail', text: `导出失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  // 导入存档
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onImport(file);
      await refresh();
      setMessage({ type: 'ok', text: `存档 ${file.name} 已导入` });
    } catch (err) {
      setMessage({ type: 'fail', text: `导入失败: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setBusy(false);
      e.target.value = ''; // 允许重新选同一文件
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0, color: THEME_VARS.text, fontSize: 18 }}>存档 / 恢复</h2>
        <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
          CAS + revision 链 + 重开一致性 · scope: save / chat / auto / branch
        </span>
      </header>

      {/* 当前状态 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>当前 Kernel 状态</h3>
        {currentInfo ? (
          <div style={gridStyle}>
            <InfoChip label="hash" value={currentInfo.hash.slice(0, 12) + '...'} mono />
            <InfoChip label="scope" value={currentInfo.scope} />
            <InfoChip label="turn" value={String(currentInfo.turnCount)} />
            <InfoChip label="行动日" value={String(currentInfo.lastActionDay)} />
            <InfoChip label="今日行动" value={String(currentInfo.actionsToday)} />
            <InfoChip label="顶层键" value={`${currentInfo.statDataKeys.length} 个`} />
            <InfoChip label="label" value={currentInfo.label ?? '-'} />
            <InfoChip label="时间" value={new Date(currentInfo.ts).toLocaleString('zh-CN')} />
          </div>
        ) : (
          <div style={emptyStyle}>无当前 revision(新档/已重置)</div>
        )}
        <button onClick={refresh} disabled={busy} style={btnStyle}>
          刷新
        </button>
      </section>

      {/* 创建存档 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>创建存档</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="存档标签(空则用时间戳)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={readOnly || busy}
            style={inputStyle}
          />
          <button
            onClick={handleSave}
            disabled={readOnly || busy || !kernelRef.current}
            style={btnPrimaryStyle}
          >
            创建
          </button>
        </div>
      </section>

      {/* 存档列表 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>存档列表 ({saveSlots.length})</h3>
        {saveSlots.length === 0 ? (
          <div style={emptyStyle}>暂无存档</div>
        ) : (
          <div style={tableStyle}>
            {saveSlots.map((slot) => (
              <div
                key={slot.hash}
                style={{
                  ...rowStyle,
                  borderColor: slot.isCurrent ? THEME_VARS.success : THEME_VARS.border,
                  background: slot.isCurrent ? 'var(--c-success-bg, rgba(34,197,94,0.08))' : THEME_VARS.overlay,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong style={{ color: THEME_VARS.text }}>
                      {slot.label || '(未命名)'}
                    </strong>
                    {slot.isCurrent && (
                      <span style={badgeStyle(THEME_VARS.success)}>当前</span>
                    )}
                    {slot.hasChildren && (
                      <span style={badgeStyle(THEME_VARS.warning)}>有子节点</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 4 }}>
                    hash={slot.hash.slice(0, 12)}... ·
                    D{slot.dayInGame} ·
                    turn={slot.turnCount} ·
                    {slot.identityName} ·
                    {slot.currentLocation || '-'} ·
                    {new Date(slot.ts).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleLoad(slot.hash)}
                    disabled={busy || slot.isCurrent || readOnly}
                    style={btnSmallStyle}
                    title="加载"
                  >
                    加载
                  </button>
                  <button
                    onClick={() => handleExport(slot.hash)}
                    disabled={busy}
                    style={btnSmallStyle}
                    title="导出"
                  >
                    导出
                  </button>
                  <button
                    onClick={() => handleDelete(slot.hash)}
                    disabled={busy || readOnly}
                    style={btnDangerSmallStyle}
                    title="删除"
                  >
                    删
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 导入 */}
        <div style={{ marginTop: 8 }}>
          <label style={btnStyle}>
            导入存档 JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              disabled={busy || readOnly}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </section>

      {/* 重开恢复 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>重开恢复</h3>
        <p style={{ fontSize: 12, color: THEME_VARS.textMuted, margin: '4px 0 8px' }}>
          优先恢复 KV 指针(__current_revision__);指针失效时降级到最新 chat/save revision
        </p>
        <button
          onClick={handleRecover}
          disabled={busy || readOnly}
          style={btnPrimaryStyle}
        >
          从最新 revision 恢复
        </button>
        {recoveryReport && (
          <div style={{ ...reportStyle, marginTop: 8 }}>
            <div>
              <strong>恢复结果:</strong>{recoveryReport.ok ? '✓' : '✗'} ·
              来源={recoveryReport.source} ·
              hash={(recoveryReport.restoredHash ?? '').slice(0, 12) || '-'} ·
              turn={recoveryReport.turnCount} ·
              历史={recoveryReport.historyCount} ·
              chatSheets={recoveryReport.chatSheetsCount} ·
              NPC={recoveryReport.npcStateCount}
            </div>
            {recoveryReport.warnings.length > 0 && (
              <div style={{ color: THEME_VARS.warning, marginTop: 4 }}>
                ⚠ {recoveryReport.warnings.join('; ')}
              </div>
            )}
            {recoveryReport.errors.length > 0 && (
              <div style={{ color: THEME_VARS.danger, marginTop: 4 }}>
                ✗ {recoveryReport.errors.join('; ')}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 一致性校验 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>一致性校验</h3>
        <p style={{ fontSize: 12, color: THEME_VARS.textMuted, margin: '4px 0 8px' }}>
          检查 KV 指针 / Kernel-Revision 对齐 / 顶层命名空间 / chatSheets 脏数据 / 孤儿 revision
        </p>
        <button onClick={runConsistency} disabled={busy} style={btnStyle}>
          运行校验
        </button>
        {consistency && (
          <div style={{ ...reportStyle, marginTop: 8 }}>
            <strong>整体: {consistency.ok ? '✓ 通过' : '✗ 有问题'}</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              {consistency.checks.map((c, i) => (
                <li key={i} style={{ color: c.ok ? THEME_VARS.text : THEME_VARS.danger, fontSize: 12 }}>
                  {c.ok ? '✓' : '✗'} {c.name}
                  {c.detail && <span style={{ color: THEME_VARS.textMuted }}> · {c.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 历史快照 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>历史快照 (最近 {history.length})</h3>
        <div style={{ ...tableStyle, maxHeight: 320, overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div style={emptyStyle}>暂无历史</div>
          ) : (
            history.map((h) => (
              <div
                key={h.hash}
                style={{
                  ...rowStyle,
                  borderColor: h.isCurrent ? THEME_VARS.success : THEME_VARS.border,
                  padding: '6px 8px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                    <span
                      style={{
                        ...badgeStyle(
                          h.scope === 'save'
                            ? THEME_VARS.primary
                            : h.scope === 'chat'
                              ? THEME_VARS.success
                              : THEME_VARS.textMuted,
                        ),
                        fontSize: 10,
                      }}
                    >
                      {h.scope}
                    </span>
                    <span style={{ color: THEME_VARS.textMuted }}>
                      {new Date(h.ts).toLocaleString('zh-CN')}
                    </span>
                    {h.isCurrent && (
                      <span style={badgeStyle(THEME_VARS.danger)}>当前</span>
                    )}
                    {h.label && (
                      <span style={{ color: THEME_VARS.text }}>· {h.label}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: THEME_VARS.textMuted, marginTop: 2 }}>
                    {h.hash.slice(0, 12)}... ·
                    turn={h.turnCount ?? '-'} ·
                    {(h.userAction ?? '').slice(0, 60) || '(无动作)'}
                  </div>
                  {h.narrativePreview && (
                    <div style={{ fontSize: 11, color: THEME_VARS.text, marginTop: 2, opacity: 0.7 }}>
                      {h.narrativePreview}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 失败恢复 */}
      {failureReport && (
        <section style={{ ...sectionStyle, borderColor: THEME_VARS.danger }}>
          <h3 style={{ ...sectionTitleStyle, color: THEME_VARS.danger }}>
            失败恢复 · {failureReport.type}
          </h3>
          <div style={{ fontSize: 12, color: THEME_VARS.text, marginBottom: 8 }}>
            <strong>错误:</strong> {failureReport.error}
          </div>
          <div style={{ fontSize: 12, color: THEME_VARS.textMuted, marginBottom: 8 }}>
            <strong>推荐:</strong> {failureReport.recommendation} ·
            <strong>可重试:</strong> {failureReport.canRetry ? '是' : '否'}
          </div>
          {failureReport.details.length > 0 && (
            <ul style={{ margin: '0 0 8px 16px', padding: 0, fontSize: 11, color: THEME_VARS.textMuted }}>
              {failureReport.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {failureReport.canRetry && onRetry && (
              <button onClick={onRetry} style={btnPrimaryStyle}>重试</button>
            )}
            {onRollback && (
              <button onClick={onRollback} style={btnDangerSmallStyle}>回滚到 base</button>
            )}
          </div>
        </section>
      )}

      {/* 消息 */}
      {message && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            background: THEME_VARS.overlay,
            border: `1px solid ${
              message.type === 'ok'
                ? THEME_VARS.success
                : message.type === 'fail'
                  ? THEME_VARS.danger
                  : THEME_VARS.border
            }`,
            borderRadius: 4,
            fontSize: 12,
            color: THEME_VARS.text,
          }}
        >
          {message.type === 'ok' ? '✓ ' : message.type === 'fail' ? '✗ ' : 'ℹ '}
          {message.text}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件:信息芯片
// ───────────────────────────────────────────────────────────

function InfoChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        padding: '4px 8px',
        background: THEME_VARS.overlay,
        border: `1px solid ${THEME_VARS.border}`,
        borderRadius: 4,
        fontSize: 11,
      }}
    >
      <span style={{ color: THEME_VARS.textMuted }}>{label}: </span>
      <span
        style={{
          color: THEME_VARS.text,
          fontFamily: mono ? 'ui-monospace, monospace' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  样式
// ───────────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 8,
  color: THEME_VARS.text,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  borderBottom: `1px solid ${THEME_VARS.border}`,
  paddingBottom: 8,
};

const sectionStyle: CSSProperties = {
  padding: 10,
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 6,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: THEME_VARS.text,
  fontWeight: 600,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 6,
  margin: '8px 0',
};

const tableStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: 8,
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  alignItems: 'center',
};

const emptyStyle: CSSProperties = {
  padding: 12,
  textAlign: 'center',
  color: THEME_VARS.textMuted,
  fontSize: 12,
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  color: THEME_VARS.text,
  fontSize: 13,
};

const btnStyle: CSSProperties = {
  padding: '6px 12px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  color: THEME_VARS.text,
  cursor: 'pointer',
  fontSize: 12,
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  background: THEME_VARS.primary,
  borderColor: THEME_VARS.primary,
  color: '#fff',
};

const btnSmallStyle: CSSProperties = {
  padding: '3px 8px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 3,
  color: THEME_VARS.text,
  cursor: 'pointer',
  fontSize: 11,
};

const btnDangerSmallStyle: CSSProperties = {
  ...btnSmallStyle,
  borderColor: THEME_VARS.danger,
  color: THEME_VARS.danger,
};

const reportStyle: CSSProperties = {
  padding: 8,
  background: THEME_VARS.bg,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 4,
  fontSize: 12,
  color: THEME_VARS.text,
};

function badgeStyle(color: string): CSSProperties {
  return {
    display: 'inline-block',
    padding: '1px 6px',
    background: color,
    color: '#fff',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
  };
}
