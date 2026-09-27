/**
 * 预设编辑器面板(阶段3 步骤9)
 *
 * 四 tab 设计:
 *  - Prompts:列表 + 增删改 + 启用/禁用 + 排序 + 编辑内容
 *  - Sampler:temperature/top_p/top_k/repetition_penalty 等数值编辑
 *  - Context/Session:上下文预算 + 会话控制
 *  - Preview:导出 JSON 实时预览 + 校验结果
 *
 * 集成:
 *  - GameView 添加「⚙ 预设编辑」按钮
 *  - App.tsx 管理 gamePanel='presetEditor' 状态
 *  - 调用 exporter.clonePresetForEdit/downloadPreset/serializePreset/validateEditedPreset
 *  - 调用 preset/savePreset 持久化编辑后的预设
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_VARS } from './types';
import type { PresetProfile, PresetPromptEntry, PresetSampler, PresetContextBudget, PresetSession } from '../runtime/preset/types';
import {
  clonePresetForEdit,
  downloadPreset,
  serializePreset,
  validateEditedPreset,
} from '../runtime/preset/exporter';
import { savePreset } from '../runtime/preset/store';
import { BUILTIN_PRESETS } from '../content/presets/builtin-presets';
import { listPresets, loadPreset } from '../runtime/preset/store';

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
  minWidth: 90,
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  background: THEME_VARS.bg,
  color: THEME_VARS.text,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  borderRadius: 6,
  fontSize: 12,
  fontFamily: THEME_VARS.fontMono,
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: 'vertical' as const,
  fontFamily: THEME_VARS.fontMono,
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: THEME_VARS.textMuted,
  marginBottom: 4,
  letterSpacing: 0.4,
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: THEME_VARS.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  transition: 'all 0.2s ease',
};

const btnDangerStyle: React.CSSProperties = {
  ...btnStyle,
  background: THEME_VARS.danger,
};

const btnGhostStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  color: THEME_VARS.textMuted,
  border: `1px solid ${THEME_VARS.borderSoft}`,
};

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface PresetEditorPanelProps {
  /** 初始预设名(可选,从配置页传入) */
  initialPresetName?: string;
  /** 编辑完成回调 */
  onSaved?: (profile: PresetProfile) => void;
  /** 是否只读 */
  readOnly?: boolean;
}

type PanelTab = 'prompts' | 'sampler' | 'context' | 'preview';

interface AvailablePreset {
  id: string;
  name: string;
  source: 'builtin' | 'imported';
  profile: PresetProfile | null;
}

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function PresetEditorPanel({ initialPresetName, onSaved, readOnly = false }: PresetEditorPanelProps) {
  const [tab, setTab] = useState<PanelTab>('prompts');
  const [availablePresets, setAvailablePresets] = useState<AvailablePreset[]>([]);
  const [selectedPresetName, setSelectedPresetName] = useState<string>(initialPresetName ?? '原卡默认');
  const [draft, setDraft] = useState<PresetProfile | null>(null);
  const [editingPromptIdx, setEditingPromptIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [validation, setValidation] = useState<{ ok: boolean; errors: string[]; warnings: string[] } | null>(null);

  // 加载可用预设列表(内置 + 已导入)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const builtinList: AvailablePreset[] = BUILTIN_PRESETS.map((p) => ({
        id: `builtin:${p.name}`,
        name: p.name,
        source: 'builtin' as const,
        profile: p,
      }));
      try {
        const importedMetas = await listPresets();
        const importedList: AvailablePreset[] = [];
        for (const m of importedMetas) {
          const profile = await loadPreset(m.id);
          importedList.push({
            id: m.id,
            name: m.name,
            source: 'imported' as const,
            profile,
          });
        }
        if (!cancelled) setAvailablePresets([...builtinList, ...importedList]);
      } catch {
        if (!cancelled) setAvailablePresets(builtinList);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 选中预设时,克隆为 draft(不修改原版)
  useEffect(() => {
    const target = availablePresets.find((p) => p.name === selectedPresetName);
    if (target?.profile) {
      setDraft(clonePresetForEdit(target.profile));
      setEditingPromptIdx(null);
      setValidation(null);
    } else {
      setDraft(null);
    }
  }, [selectedPresetName, availablePresets]);

  // 实时校验
  useEffect(() => {
    if (!draft) {
      setValidation(null);
      return;
    }
    setValidation(validateEditedPreset(draft));
  }, [draft]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── 编辑操作 ───

  const updateDraft = useCallback((updater: (d: PresetProfile) => PresetProfile) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
  }, []);

  const updatePrompt = useCallback(
    (idx: number, patch: Partial<PresetPromptEntry>) => {
      updateDraft((d) => ({
        ...d,
        prompts: d.prompts.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
      }));
    },
    [updateDraft],
  );

  const addPrompt = useCallback(() => {
    updateDraft((d) => {
      const newPrompt: PresetPromptEntry = {
        identifier: `custom_${Date.now()}`,
        name: '新条目',
        enabled: true,
        role: 'system',
        content: '',
        injectionPosition: 0,
        injectionDepth: 0,
        injectionOrder: d.prompts.length + 1,
        isSystemPrompt: false,
        isMarker: false,
        forbidOverrides: false,
        isBuiltin: false,
      };
      return { ...d, prompts: [...d.prompts, newPrompt] };
    });
  }, [updateDraft]);

  const deletePrompt = useCallback(
    (idx: number) => {
      updateDraft((d) => ({
        ...d,
        prompts: d.prompts.filter((_, i) => i !== idx),
      }));
      setEditingPromptIdx(null);
    },
    [updateDraft],
  );

  const movePrompt = useCallback(
    (idx: number, direction: 'up' | 'down') => {
      updateDraft((d) => {
        const newPrompts = [...d.prompts];
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= newPrompts.length) return d;
        [newPrompts[idx], newPrompts[target]] = [newPrompts[target], newPrompts[idx]];
        return { ...d, prompts: newPrompts };
      });
    },
    [updateDraft],
  );

  const duplicatePrompt = useCallback(
    (idx: number) => {
      updateDraft((d) => {
        const orig = d.prompts[idx];
        const copy: PresetPromptEntry = {
          ...orig,
          identifier: `${orig.identifier}_copy_${Date.now()}`,
          name: `${orig.name} (副本)`,
          isBuiltin: false,
          builtinSlot: undefined,
        };
        const newPrompts = [...d.prompts];
        newPrompts.splice(idx + 1, 0, copy);
        return { ...d, prompts: newPrompts };
      });
    },
    [updateDraft],
  );

  const updateSampler = useCallback(
    (patch: Partial<PresetSampler>) => {
      updateDraft((d) => ({ ...d, sampler: { ...d.sampler, ...patch } }));
    },
    [updateDraft],
  );

  const updateContext = useCallback(
    (patch: Partial<PresetContextBudget>) => {
      updateDraft((d) => ({ ...d, context: { ...d.context, ...patch } }));
    },
    [updateDraft],
  );

  const updateSession = useCallback(
    (patch: Partial<PresetSession>) => {
      updateDraft((d) => ({ ...d, session: { ...d.session, ...patch } }));
    },
    [updateDraft],
  );

  const renameDraft = useCallback(
    (name: string) => {
      updateDraft((d) => ({ ...d, name }));
    },
    [updateDraft],
  );

  // ─── 保存 + 导出 ───

  const handleSave = useCallback(async () => {
    if (!draft) return;
    const v = validateEditedPreset(draft);
    if (!v.ok) {
      showToast('error', `校验失败:${v.errors.join('; ')}`);
      return;
    }
    try {
      const id = await savePreset(draft);
      showToast('success', `预设已保存(ID: ${id.slice(-8)})`);
      onSaved?.(draft);
    } catch (e) {
      showToast('error', `保存失败:${e instanceof Error ? e.message : String(e)}`);
    }
  }, [draft, showToast, onSaved]);

  const handleExport = useCallback(() => {
    if (!draft) return;
    try {
      downloadPreset(draft);
      showToast('success', `已导出 ${draft.name}.json`);
    } catch (e) {
      showToast('error', `导出失败:${e instanceof Error ? e.message : String(e)}`);
    }
  }, [draft, showToast]);

  const handleReset = useCallback(() => {
    const target = availablePresets.find((p) => p.name === selectedPresetName);
    if (target?.profile) {
      setDraft(clonePresetForEdit(target.profile));
      showToast('info', '已重置为原版');
    }
  }, [availablePresets, selectedPresetName, showToast]);

  const tabs: Array<{ key: PanelTab; label: string; icon: string }> = [
    { key: 'prompts', label: 'Prompts', icon: '📝' },
    { key: 'sampler', label: 'Sampler', icon: '🎛' },
    { key: 'context', label: 'Context', icon: '⚙' },
    { key: 'preview', label: 'Preview', icon: '👁' },
  ];

  if (availablePresets.length === 0) {
    return (
      <div style={containerStyle}>
        <p style={{ color: THEME_VARS.textMuted, textAlign: 'center' }}>加载预设中...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header
        style={{
          paddingBottom: 10,
          marginBottom: 10,
          borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontFamily: THEME_VARS.fontDisplay,
              fontSize: 16,
              fontWeight: 500,
              color: THEME_VARS.primary,
              letterSpacing: 1,
            }}
          >
            ⚙ 预设编辑器
          </h3>
          <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.4 }}>
            Preset Editor · 编辑 prompts/sampler/context/session · 导出 ST 兼容 JSON
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={selectedPresetName}
            onChange={(e) => setSelectedPresetName(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
            disabled={readOnly}
          >
            {availablePresets.map((p) => (
              <option key={p.id} value={p.name}>
                {p.source === 'builtin' ? '★ ' : '📥 '}
                {p.name}
              </option>
            ))}
          </select>
          {!readOnly && (
            <>
              <button style={btnStyle} onClick={handleSave} title="保存到 IndexedDB">
                💾 保存
              </button>
              <button style={btnGhostStyle} onClick={handleExport} title="下载为 ST 预设 JSON">
                ⬇ 导出
              </button>
              <button style={btnGhostStyle} onClick={handleReset} title="重置为原版">
                ↺ 重置
              </button>
            </>
          )}
        </div>
      </header>

      {/* toast */}
      {toast && (
        <div
          style={{
            padding: 10,
            marginBottom: 12,
            background: toast.type === 'success' ? '#e8f5e9' : toast.type === 'error' ? '#ffebee' : '#e3f2fd',
            color: toast.type === 'success' ? '#2e7d32' : toast.type === 'error' ? '#c62828' : '#1565c0',
            borderRadius: 8,
            fontSize: 12,
            border: `1px solid ${toast.type === 'success' ? '#2e7d3233' : toast.type === 'error' ? '#c6282833' : '#1565c033'}`,
          }}
        >
          {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ '}
          {toast.message}
        </div>
      )}

      {/* 校验状态条 */}
      {validation && (
        <div
          style={{
            padding: 8,
            marginBottom: 12,
            background: validation.ok ? '#e8f5e922' : '#ffebee22',
            borderRadius: 8,
            border: `1px solid ${validation.ok ? THEME_VARS.success + '33' : THEME_VARS.danger + '33'}`,
            fontSize: 11,
          }}
        >
          <span style={{ color: validation.ok ? THEME_VARS.success : THEME_VARS.danger, fontWeight: 600 }}>
            {validation.ok ? '✓ 校验通过' : '✗ 校验失败'}
          </span>
          {validation.errors.length > 0 && (
            <div style={{ color: THEME_VARS.danger, marginTop: 4 }}>
              {validation.errors.map((e, i) => (
                <div key={i}>· {e}</div>
              ))}
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div style={{ color: THEME_VARS.warning, marginTop: 4 }}>
              {validation.warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {!draft ? (
        <p style={{ color: THEME_VARS.textMuted, textAlign: 'center' }}>请选择一个预设进行编辑</p>
      ) : (
        <>
          {/* 预设名编辑 */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: THEME_VARS.textMuted, minWidth: 60 }}>预设名:</label>
            <input
              style={inputStyle}
              value={draft.name}
              onChange={(e) => renameDraft(e.target.value)}
              disabled={readOnly}
            />
            <span style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
              {draft.prompts.length} 条 prompt
            </span>
          </div>

          <div style={tabBarStyle}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={tab === t.key ? tabBtnActiveStyle : tabBtnStyle}
              >
                <span style={{ marginRight: 4 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── Prompts Tab ─── */}
          {tab === 'prompts' && draft && (
            <PromptsTab
              draft={draft}
              editingPromptIdx={editingPromptIdx}
              readOnly={readOnly}
              onSetEditing={setEditingPromptIdx}
              onUpdatePrompt={updatePrompt}
              onAddPrompt={addPrompt}
              onDeletePrompt={deletePrompt}
              onMovePrompt={movePrompt}
              onDuplicatePrompt={duplicatePrompt}
            />
          )}

          {/* ─── Sampler Tab ─── */}
          {tab === 'sampler' && draft && (
            <SamplerTab draft={draft} readOnly={readOnly} onUpdate={updateSampler} />
          )}

          {/* ─── Context/Session Tab ─── */}
          {tab === 'context' && draft && (
            <ContextSessionTab
              draft={draft}
              readOnly={readOnly}
              onUpdateContext={updateContext}
              onUpdateSession={updateSession}
            />
          )}

          {/* ─── Preview Tab ─── */}
          {tab === 'preview' && draft && <PreviewTab draft={draft} />}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Prompts Tab
// ═══════════════════════════════════════════════════════════

interface PromptsTabProps {
  draft: PresetProfile;
  editingPromptIdx: number | null;
  readOnly: boolean;
  onSetEditing: (idx: number | null) => void;
  onUpdatePrompt: (idx: number, patch: Partial<PresetPromptEntry>) => void;
  onAddPrompt: () => void;
  onDeletePrompt: (idx: number) => void;
  onMovePrompt: (idx: number, dir: 'up' | 'down') => void;
  onDuplicatePrompt: (idx: number) => void;
}

function PromptsTab({
  draft,
  editingPromptIdx,
  readOnly,
  onSetEditing,
  onUpdatePrompt,
  onAddPrompt,
  onDeletePrompt,
  onMovePrompt,
  onDuplicatePrompt,
}: PromptsTabProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: THEME_VARS.textMuted }}>
          共 {draft.prompts.length} 条 · 启用 {draft.prompts.filter((p) => p.enabled).length} 条
        </span>
        {!readOnly && (
          <button style={btnStyle} onClick={onAddPrompt}>
            + 新增 prompt
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {draft.prompts.map((p, idx) => (
          <div
            key={`${p.identifier}_${idx}`}
            style={{
              padding: 10,
              background: THEME_VARS.overlay,
              borderRadius: 8,
              border: `1px solid ${THEME_VARS.borderSoft}`,
              opacity: p.enabled ? 1 : 0.55,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: THEME_VARS.textMuted, minWidth: 28 }}>#{idx + 1}</span>
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => onUpdatePrompt(idx, { enabled: e.target.checked })}
                disabled={readOnly}
                style={{ cursor: 'pointer' }}
              />
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: p.isBuiltin ? THEME_VARS.primary + '22' : THEME_VARS.accent + '22',
                  color: p.isBuiltin ? THEME_VARS.primary : THEME_VARS.accent,
                }}
              >
                {p.isBuiltin ? '内置' : '自定义'}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: THEME_VARS.bg,
                  color: THEME_VARS.textMuted,
                }}
              >
                {p.role}
              </span>
              {p.isMarker && (
                <span style={{ fontSize: 10, color: THEME_VARS.warning }}>📌 marker</span>
              )}
              {p.isSystemPrompt && (
                <span style={{ fontSize: 10, color: THEME_VARS.info }}>🔧 system</span>
              )}
              <strong style={{ flex: 1, fontSize: 12, color: THEME_VARS.text }}>{p.name}</strong>
              <span style={{ fontSize: 10, color: THEME_VARS.textMuted, fontFamily: THEME_VARS.fontMono }}>
                {p.identifier}
              </span>
              <div style={{ display: 'flex', gap: 3 }}>
                <button
                  style={{ ...btnGhostStyle, padding: '3px 6px', fontSize: 10 }}
                  onClick={() => onSetEditing(editingPromptIdx === idx ? null : idx)}
                  title="编辑"
                >
                  {editingPromptIdx === idx ? '▼' : '▶'}
                </button>
                {!readOnly && (
                  <>
                    <button
                      style={{ ...btnGhostStyle, padding: '3px 6px', fontSize: 10 }}
                      onClick={() => onMovePrompt(idx, 'up')}
                      disabled={idx === 0}
                      title="上移"
                    >
                      ↑
                    </button>
                    <button
                      style={{ ...btnGhostStyle, padding: '3px 6px', fontSize: 10 }}
                      onClick={() => onMovePrompt(idx, 'down')}
                      disabled={idx === draft.prompts.length - 1}
                      title="下移"
                    >
                      ↓
                    </button>
                    <button
                      style={{ ...btnGhostStyle, padding: '3px 6px', fontSize: 10 }}
                      onClick={() => onDuplicatePrompt(idx)}
                      title="复制"
                    >
                      ⧉
                    </button>
                    <button
                      style={{ ...btnDangerStyle, padding: '3px 6px', fontSize: 10 }}
                      onClick={() => onDeletePrompt(idx)}
                      title="删除"
                    >
                      ✗
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingPromptIdx === idx && (
              <div style={{ marginTop: 10, padding: 10, background: THEME_VARS.bg, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>identifier</label>
                    <input
                      style={inputStyle}
                      value={p.identifier}
                      onChange={(e) => onUpdatePrompt(idx, { identifier: e.target.value })}
                      disabled={readOnly || p.isBuiltin}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>name</label>
                    <input
                      style={inputStyle}
                      value={p.name}
                      onChange={(e) => onUpdatePrompt(idx, { name: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>role</label>
                    <select
                      style={inputStyle}
                      value={p.role}
                      onChange={(e) => onUpdatePrompt(idx, { role: e.target.value as PresetPromptEntry['role'] })}
                      disabled={readOnly}
                    >
                      <option value="system">system</option>
                      <option value="user">user</option>
                      <option value="assistant">assistant</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>injection_position</label>
                    <select
                      style={inputStyle}
                      value={p.injectionPosition}
                      onChange={(e) => onUpdatePrompt(idx, { injectionPosition: Number(e.target.value) })}
                      disabled={readOnly}
                    >
                      <option value={0}>0 (相对当前位置)</option>
                      <option value={1}>1 (聊天末尾)</option>
                      <option value={2}>2 (绝对深度)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>injection_depth</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={p.injectionDepth}
                      onChange={(e) => onUpdatePrompt(idx, { injectionDepth: Number(e.target.value) })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>injection_order</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={p.injectionOrder}
                      onChange={(e) => onUpdatePrompt(idx, { injectionOrder: Number(e.target.value) })}
                      disabled={readOnly}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={p.isSystemPrompt}
                      onChange={(e) => onUpdatePrompt(idx, { isSystemPrompt: e.target.checked })}
                      disabled={readOnly}
                    />
                    system_prompt
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={p.isMarker}
                      onChange={(e) => onUpdatePrompt(idx, { isMarker: e.target.checked })}
                      disabled={readOnly}
                    />
                    marker
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={p.forbidOverrides}
                      onChange={(e) => onUpdatePrompt(idx, { forbidOverrides: e.target.checked })}
                      disabled={readOnly}
                    />
                    forbid_overrides
                  </label>
                </div>
                <div>
                  <label style={labelStyle}>content(支持宏 {'{{user}}'}/{'{{char}}'}/{'{{getvar::xxx}}'})</label>
                  <textarea
                    style={textareaStyle}
                    value={p.content}
                    onChange={(e) => onUpdatePrompt(idx, { content: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Sampler Tab
// ═══════════════════════════════════════════════════════════

interface SamplerTabProps {
  draft: PresetProfile;
  readOnly: boolean;
  onUpdate: (patch: Partial<PresetSampler>) => void;
}

function SamplerTab({ draft, readOnly, onUpdate }: SamplerTabProps) {
  const s = draft.sampler;
  const fields: Array<{
    key: keyof PresetSampler;
    label: string;
    min: number;
    max: number;
    step: number;
    desc: string;
  }> = [
    { key: 'temperature', label: 'temperature', min: 0, max: 2, step: 0.05, desc: '温度(越高越发散)' },
    { key: 'topP', label: 'top_p', min: 0, max: 1, step: 0.01, desc: '核采样概率阈值' },
    { key: 'topK', label: 'top_k', min: 0, max: 100, step: 1, desc: 'Top-K 采样(0=禁用)' },
    { key: 'topA', label: 'top_a', min: 0, max: 1, step: 0.01, desc: 'Top-A 采样' },
    { key: 'minP', label: 'min_p', min: 0, max: 1, step: 0.01, desc: 'Min-P 采样' },
    { key: 'repetitionPenalty', label: 'repetition_penalty', min: 0.5, max: 2, step: 0.01, desc: '重复惩罚' },
    { key: 'frequencyPenalty', label: 'frequency_penalty', min: -2, max: 2, step: 0.05, desc: '频率惩罚' },
    { key: 'presencePenalty', label: 'presence_penalty', min: -2, max: 2, step: 0.05, desc: '存在惩罚' },
  ];

  return (
    <div style={sectionStyle}>
      <h4 style={sectionTitleStyle}>🎛 Sampler 参数</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>
              {f.label}{' '}
              <span style={{ color: THEME_VARS.textMuted, fontSize: 10 }}>({f.desc})</span>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={s[f.key] as number}
                onChange={(e) => onUpdate({ [f.key]: Number(e.target.value) } as Partial<PresetSampler>)}
                disabled={readOnly}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                style={{ ...inputStyle, width: 80 }}
                value={s[f.key] as number}
                min={f.min}
                max={f.max}
                step={f.step}
                onChange={(e) => onUpdate({ [f.key]: Number(e.target.value) } as Partial<PresetSampler>)}
                disabled={readOnly}
              />
            </div>
          </div>
        ))}
        <div>
          <label style={labelStyle}>seed (可选,留空=随机)</label>
          <input
            type="number"
            style={inputStyle}
            value={s.seed ?? ''}
            onChange={(e) => onUpdate({ seed: e.target.value === '' ? undefined : Number(e.target.value) })}
            disabled={readOnly}
          />
        </div>
        <div>
          <label style={labelStyle}>reasoning_effort (可选)</label>
          <select
            style={inputStyle}
            value={s.reasoningEffort ?? ''}
            onChange={(e) =>
              onUpdate({
                reasoningEffort: e.target.value === '' ? undefined : (e.target.value as 'low' | 'medium' | 'high'),
              })
            }
            disabled={readOnly}
          >
            <option value="">(不指定)</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Context + Session Tab
// ═══════════════════════════════════════════════════════════

interface ContextSessionTabProps {
  draft: PresetProfile;
  readOnly: boolean;
  onUpdateContext: (patch: Partial<PresetContextBudget>) => void;
  onUpdateSession: (patch: Partial<PresetSession>) => void;
}

function ContextSessionTab({ draft, readOnly, onUpdateContext, onUpdateSession }: ContextSessionTabProps) {
  const c = draft.context;
  const sess = draft.session;

  return (
    <>
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>📊 上下文预算</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div>
            <label style={labelStyle}>openai_max_context(上下文窗口)</label>
            <input
              type="number"
              style={inputStyle}
              value={c.maxContext}
              min={1000}
              step={1000}
              onChange={(e) => onUpdateContext({ maxContext: Number(e.target.value) })}
              disabled={readOnly}
            />
          </div>
          <div>
            <label style={labelStyle}>openai_max_tokens(回复最大 token)</label>
            <input
              type="number"
              style={inputStyle}
              value={c.maxTokens}
              min={100}
              step={100}
              onChange={(e) => onUpdateContext({ maxTokens: Number(e.target.value) })}
              disabled={readOnly}
            />
          </div>
          <div>
            <label style={labelStyle}>max_context_unlocked(解锁更大上下文)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={c.maxContextUnlocked}
                onChange={(e) => onUpdateContext({ maxContextUnlocked: e.target.checked })}
                disabled={readOnly}
              />
              <span style={{ fontSize: 11 }}>{c.maxContextUnlocked ? '已解锁' : '未解锁'}</span>
            </label>
          </div>
          <div
            style={{
              padding: 10,
              background: THEME_VARS.primaryGlow,
              borderRadius: 6,
              fontSize: 11,
              color: THEME_VARS.primary,
            }}
          >
            💡 可用上下文 = {c.maxContext - c.maxTokens} token
            <br />
            <span style={{ fontSize: 10 }}>
              ({c.maxTokens >= c.maxContext ? '⚠ 回复挤占全部上下文' : '正常'})
            </span>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>💬 会话控制</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div>
            <label style={labelStyle}>stream_openai(流式输出)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sess.stream}
                onChange={(e) => onUpdateSession({ stream: e.target.checked })}
                disabled={readOnly}
              />
              <span style={{ fontSize: 11 }}>{sess.stream ? '流式' : '非流式'}</span>
            </label>
          </div>
          <div>
            <label style={labelStyle}>use_sysprompt(使用系统提示)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sess.useSystemPrompt}
                onChange={(e) => onUpdateSession({ useSystemPrompt: e.target.checked })}
                disabled={readOnly}
              />
              <span style={{ fontSize: 11 }}>{sess.useSystemPrompt ? '启用' : '禁用'}</span>
            </label>
          </div>
          <div>
            <label style={labelStyle}>squash_system_messages(合并系统消息)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sess.squashSystemMessages}
                onChange={(e) => onUpdateSession({ squashSystemMessages: e.target.checked })}
                disabled={readOnly}
              />
              <span style={{ fontSize: 11 }}>{sess.squashSystemMessages ? '合并' : '不合并'}</span>
            </label>
          </div>
          <div>
            <label style={labelStyle}>names_behavior(名字行为 -1/0/1/2)</label>
            <select
              style={inputStyle}
              value={sess.namesBehavior}
              onChange={(e) => onUpdateSession({ namesBehavior: Number(e.target.value) })}
              disabled={readOnly}
            >
              <option value={-1}>-1 (默认)</option>
              <option value={0}>0 (不发送)</option>
              <option value={1}>1 (发送)</option>
              <option value={2}>2 (强制发送)</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / 3' }}>
            <label style={labelStyle}>assistant_prefill(AI 回复前缀)</label>
            <input
              style={inputStyle}
              value={sess.assistantPrefill}
              onChange={(e) => onUpdateSession({ assistantPrefill: e.target.value })}
              disabled={readOnly}
            />
          </div>
          <div style={{ gridColumn: '1 / 3' }}>
            <label style={labelStyle}>send_if_empty(空输入时发送)</label>
            <input
              style={inputStyle}
              value={sess.sendIfEmpty}
              onChange={(e) => onUpdateSession({ sendIfEmpty: e.target.value })}
              disabled={readOnly}
            />
          </div>
          <div style={{ gridColumn: '1 / 3' }}>
            <label style={labelStyle}>wi_format(世界书注入格式)</label>
            <input
              style={inputStyle}
              value={sess.wiFormat}
              onChange={(e) => onUpdateSession({ wiFormat: e.target.value })}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  Preview Tab
// ═══════════════════════════════════════════════════════════

interface PreviewTabProps {
  draft: PresetProfile;
}

function PreviewTab({ draft }: PreviewTabProps) {
  const json = useMemo(() => {
    try {
      return serializePreset(draft);
    } catch (e) {
      return `/* 序列化失败: ${e instanceof Error ? e.message : String(e)} */`;
    }
  }, [draft]);

  const stats = useMemo(() => {
    const sizeBytes = new Blob([json]).size;
    const lines = json.split('\n').length;
    return {
      sizeKB: (sizeBytes / 1024).toFixed(2),
      lines,
      promptCount: draft.prompts.length,
      enabledCount: draft.prompts.filter((p) => p.enabled).length,
    };
  }, [json, draft.prompts]);

  return (
    <div style={sectionStyle}>
      <h4 style={sectionTitleStyle}>👁 导出 JSON 预览</h4>
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 10,
          fontSize: 11,
          flexWrap: 'wrap',
        }}
      >
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>大小:</span>{' '}
          <strong style={{ color: THEME_VARS.primary }}>{stats.sizeKB} KB</strong>
        </span>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>行数:</span>{' '}
          <strong style={{ color: THEME_VARS.text }}>{stats.lines}</strong>
        </span>
        <span>
          <span style={{ color: THEME_VARS.textMuted }}>prompts:</span>{' '}
          <strong style={{ color: THEME_VARS.text }}>
            {stats.enabledCount}/{stats.promptCount}
          </strong>{' '}
          启用
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          background: THEME_VARS.bg,
          color: THEME_VARS.text,
          borderRadius: 8,
          border: `1px solid ${THEME_VARS.borderSoft}`,
          fontSize: 10,
          fontFamily: THEME_VARS.fontMono,
          lineHeight: 1.5,
          maxHeight: 500,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {json}
      </pre>
    </div>
  );
}
