/**
 * 创意工坊面板(阶段4 · MOD 导入导出系统)
 *
 * 职责:
 *  - MOD 列表展示(已安装/启用/禁用状态)
 *  - MOD 导入(从文件上传 JSON)
 *  - MOD 导出(下载为 JSON 文件)
 *  - MOD 启用/禁用切换
 *  - MOD 卸载
 *  - MOD 加载顺序调整
 *  - 创建示例 MOD
 *  - MOD 详情查看(内容条目/覆盖路径)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { THEME_VARS } from './types';
import type { InstalledMod, ModImportResult } from '../runtime/mod';
import {
  listInstalledMods,
  importModFromFile,
  exportModAndDownload,
  enableMod,
  disableMod,
  removeMod,
  moveUp,
  moveDown,
  createSampleMod,
  getStats,
} from '../runtime/mod';

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
  maxWidth: 900,
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 12,
  borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: THEME_VARS.fontDisplay,
  fontSize: 18,
  fontWeight: 500,
  color: THEME_VARS.primary,
  letterSpacing: 1.2,
};

const statsStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME_VARS.textMuted,
  fontFamily: THEME_VARS.fontMono,
};

const actionBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 16,
  flexWrap: 'wrap',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: `linear-gradient(135deg, ${THEME_VARS.primary} 0%, ${THEME_VARS.primarySoft} 100%)`,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  boxShadow: THEME_VARS.shadowSm,
  transition: 'all 0.2s ease',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: THEME_VARS.overlay,
  color: THEME_VARS.text,
  border: `1px solid ${THEME_VARS.border}`,
};

const btnDangerStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  color: THEME_VARS.danger,
  border: `1px solid ${THEME_VARS.danger}44`,
  padding: '4px 10px',
  fontSize: 11,
};

const btnSmallStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: THEME_VARS.overlay,
  color: THEME_VARS.text,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 11,
};

const modCardStyle: React.CSSProperties = {
  padding: 14,
  background: THEME_VARS.overlay,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  marginBottom: 10,
  transition: 'all 0.2s ease',
};

const modCardDisabledStyle: React.CSSProperties = {
  ...modCardStyle,
  opacity: 0.6,
};

const modHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 8,
};

const modNameStyle: React.CSSProperties = {
  fontFamily: THEME_VARS.fontDisplay,
  fontSize: 15,
  color: THEME_VARS.primary,
  fontWeight: 500,
};

const modMetaStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME_VARS.textMuted,
  marginTop: 2,
};

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  background: THEME_VARS.primary + '22',
  color: THEME_VARS.primary,
  borderRadius: 10,
  fontSize: 10,
  marginRight: 4,
  marginBottom: 4,
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: THEME_VARS.textMuted,
  fontSize: 13,
};

// ───────────────────────────────────────────────────────────
//  组件
// ───────────────────────────────────────────────────────────

export interface WorkshopPanelProps {
  onClose?: () => void;
}

export function WorkshopPanel({ onClose }: WorkshopPanelProps) {
  const [mods, setMods] = useState<InstalledMod[]>([]);
  const [stats, setStats] = useState({ total: 0, enabled: 0, disabled: 0, totalContents: 0 });
  const [message, setMessage] = useState<{ type: 'ok' | 'fail' | 'info'; text: string } | null>(null);
  const [expandedMod, setExpandedMod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    console.log('[WorkshopPanel] refresh start');
    const [list, s] = await Promise.all([listInstalledMods(), getStats()]);
    list.sort((a, b) => a.loadOrder - b.loadOrder);
    console.log('[WorkshopPanel] refresh loaded', { count: list.length, stats: s, ids: list.map((m) => m.manifest.id) });
    setMods(list);
    setStats(s);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showMessage = (type: 'ok' | 'fail' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // 导入 MOD
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const result: ModImportResult = await importModFromFile(file);
      if (result.ok) {
        showMessage('ok', `MOD 导入成功: ${result.modId} (${result.contentCount} 个内容条目, ${result.overrideCount ?? 0} 个覆盖)`);
        await refresh();
      } else {
        showMessage('fail', `MOD 导入失败: ${result.error}`);
      }
    } catch (e) {
      showMessage('fail', `导入异常: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 创建示例 MOD
  const handleCreateSample = async () => {
    console.log('[WorkshopPanel] handleCreateSample clicked');
    setLoading(true);
    try {
      const result = await createSampleMod();
      console.log('[WorkshopPanel] createSampleMod result', result);
      if (result.ok) {
        showMessage('ok', `示例 MOD 创建成功: ${result.modId} (${result.contentCount} 个内容条目)`);
        await refresh();
        console.log('[WorkshopPanel] refresh after create done');
      } else {
        showMessage('fail', `示例 MOD 创建失败: ${result.error}`);
      }
    } catch (e) {
      console.error('[WorkshopPanel] handleCreateSample error', e);
      showMessage('fail', `创建异常: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // 启用/禁用
  const handleToggleEnabled = async (modId: string, currentEnabled: boolean) => {
    try {
      if (currentEnabled) {
        await disableMod(modId);
      } else {
        await enableMod(modId);
      }
      await refresh();
    } catch (e) {
      showMessage('fail', `切换失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // 导出
  const handleExport = async (modId: string) => {
    try {
      const result = await exportModAndDownload(modId);
      if (result.ok) {
        showMessage('ok', 'MOD 导出成功,文件已开始下载');
      } else {
        showMessage('fail', `导出失败: ${result.error}`);
      }
    } catch (e) {
      showMessage('fail', `导出异常: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // 卸载
  const handleUninstall = async (modId: string, modName: string) => {
    if (!window.confirm(`确定卸载 MOD "${modName}" 吗?此操作不可撤销。`)) return;
    try {
      await removeMod(modId);
      showMessage('info', `已卸载: ${modName}`);
      await refresh();
    } catch (e) {
      showMessage('fail', `卸载失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // 加载顺序
  const handleMoveUp = async (modId: string) => {
    await moveUp(modId);
    await refresh();
  };

  const handleMoveDown = async (modId: string) => {
    await moveDown(modId);
    await refresh();
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>🛠 创意工坊 · MOD 管理</h2>
          <div style={statsStyle}>
            阶段4 · 已安装 {stats.total} · 启用 {stats.enabled} · 禁用 {stats.disabled} · 内容条目 {stats.totalContents}
          </div>
        </div>
        {onClose && (
          <button style={btnSmallStyle} onClick={onClose}>✕ 关闭</button>
        )}
      </div>

      {/* 操作栏 */}
      <div style={actionBarStyle}>
        <button style={btnStyle} onClick={handleImportClick} disabled={loading}>
          📥 导入 MOD
        </button>
        <button style={btnSecondaryStyle} onClick={handleCreateSample} disabled={loading}>
          ✨ 创建示例 MOD
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {/* 消息提示 */}
      {message && (
        <div style={{
          padding: '10px 14px',
          marginBottom: 12,
          borderRadius: 8,
          fontSize: 12,
          background: message.type === 'ok' ? THEME_VARS.success + '22'
            : message.type === 'fail' ? THEME_VARS.danger + '22'
            : THEME_VARS.info + '22',
          color: message.type === 'ok' ? THEME_VARS.success
            : message.type === 'fail' ? THEME_VARS.danger
            : THEME_VARS.info,
          border: `1px solid ${message.type === 'ok' ? THEME_VARS.success : message.type === 'fail' ? THEME_VARS.danger : THEME_VARS.info}44`,
        }}>
          {message.text}
        </div>
      )}

      {/* MOD 列表 */}
      {mods.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ marginBottom: 8, fontSize: 14, color: THEME_VARS.text }}>
            创意工坊暂无已安装的 MOD
          </div>
          <div style={{ fontSize: 12 }}>
            点击「导入 MOD」上传 MOD JSON 文件,或点击「创建示例 MOD」体验功能。
          </div>
        </div>
      ) : (
        <div>
          {mods.map((mod, idx) => {
            const isExpanded = expandedMod === mod.manifest.id;
            return (
              <div
                key={mod.manifest.id}
                style={mod.enabled ? modCardStyle : modCardDisabledStyle}
              >
                {/* MOD 头部 */}
                <div style={modHeaderStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={modNameStyle}>
                      {mod.enabled ? '🟢' : '⚫'} {mod.manifest.name}
                    </div>
                    <div style={modMetaStyle}>
                      v{mod.manifest.version} · by {mod.manifest.author} · {mod.manifest.type}
                      {' · '}加载顺序 #{mod.loadOrder}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {mod.manifest.tags?.map((tag) => (
                        <span key={tag} style={tagStyle}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button
                      style={btnSmallStyle}
                      onClick={() => handleToggleEnabled(mod.manifest.id, mod.enabled)}
                    >
                      {mod.enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      style={btnSmallStyle}
                      onClick={() => handleExport(mod.manifest.id)}
                    >
                      导出
                    </button>
                    <button
                      style={btnSmallStyle}
                      onClick={() => setExpandedMod(isExpanded ? null : mod.manifest.id)}
                    >
                      {isExpanded ? '收起' : '详情'}
                    </button>
                  </div>
                </div>

                {/* MOD 描述 */}
                <div style={{
                  fontSize: 12,
                  color: THEME_VARS.textSoft,
                  lineHeight: 1.6,
                  marginBottom: 8,
                }}>
                  {mod.manifest.description}
                </div>

                {/* MOD 详情 */}
                {isExpanded && (
                  <div style={{
                    marginTop: 8,
                    padding: 10,
                    background: THEME_VARS.bg,
                    borderRadius: 8,
                    border: `1px solid ${THEME_VARS.borderSoft}`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                      内容条目 ({mod.manifest.contents.length})
                    </div>
                    {mod.manifest.contents.map((entry) => (
                      <div
                        key={entry.entryId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 0',
                          borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
                          fontSize: 11,
                        }}
                      >
                        <div>
                          <span style={{ color: THEME_VARS.primary }}>
                            {entry.override ? '🔄' : '➕'} {entry.name}
                          </span>
                          <span style={{ color: THEME_VARS.textMuted, marginLeft: 8 }}>
                            [{entry.contentType}]
                          </span>
                        </div>
                        <div style={{ color: THEME_VARS.textMuted }}>
                          {entry.override && entry.overridePath
                            ? `覆盖: ${entry.overridePath}`
                            : '追加内容'}
                        </div>
                      </div>
                    ))}

                    {/* 依赖信息 */}
                    {mod.manifest.dependencies && mod.manifest.dependencies.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 11, color: THEME_VARS.textMuted }}>
                        依赖: {mod.manifest.dependencies.join(', ')}
                      </div>
                    )}

                    {/* 加载顺序控制 */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      <button
                        style={btnSmallStyle}
                        onClick={() => handleMoveUp(mod.manifest.id)}
                        disabled={idx === 0}
                      >
                        ↑ 上移
                      </button>
                      <button
                        style={btnSmallStyle}
                        onClick={() => handleMoveDown(mod.manifest.id)}
                        disabled={idx === mods.length - 1}
                      >
                        ↓ 下移
                      </button>
                      <button
                        style={btnDangerStyle}
                        onClick={() => handleUninstall(mod.manifest.id, mod.manifest.name)}
                      >
                        🗑 卸载
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
