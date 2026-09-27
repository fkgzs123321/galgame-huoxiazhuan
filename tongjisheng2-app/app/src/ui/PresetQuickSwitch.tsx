/**
 * 预设快捷切换器(阶段3 步骤9)
 *
 * 用于游戏中快速切换各 AI 端点绑定的预设,无需返回配置页:
 *  - 列出所有已配置的 AI 端点(主聊天/变量/开局/...)
 *  - 每个端点显示当前预设名 + 关键 sampler 参数
 *  - 下拉切换到其他预设(内置 + 已导入)
 *  - 切换后立即应用到 AppConfig.endpoints[i].presetName
 *
 * 集成:
 *  - GameView 添加「🔀 预设切换」按钮
 *  - App.tsx 管理 gamePanel='presetSwitch' 状态
 *  - 传入 config + onChange 回调
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { THEME_VARS, type AppConfig, type AiEndpointConfig } from './types';
import { BUILTIN_PRESETS } from '../content/presets/builtin-presets';
import { listPresets, loadPreset } from '../runtime/preset/store';
import { ALL_AI_PROFILES, findProfile } from '../ai/profiles';
import type { AiProfileId } from '../ai/profiles';
import type { PresetProfile } from '../runtime/preset/types';

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

const sectionStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 14,
  background: THEME_VARS.overlay,
  borderRadius: 10,
  border: `1px solid ${THEME_VARS.borderSoft}`,
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: THEME_VARS.bg,
  color: THEME_VARS.text,
  border: `1px solid ${THEME_VARS.borderSoft}`,
  borderRadius: 6,
  fontSize: 12,
  fontFamily: THEME_VARS.fontMono,
  outline: 'none',
  cursor: 'pointer',
  minWidth: 180,
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 500,
};

// ───────────────────────────────────────────────────────────
//  Props
// ───────────────────────────────────────────────────────────

export interface PresetQuickSwitchProps {
  /** 应用配置 */
  config: AppConfig;
  /** 配置变更回调 */
  onChange: (next: AppConfig) => void;
}

interface AvailablePreset {
  id: string;
  name: string;
  source: 'builtin' | 'imported';
  profile: PresetProfile | null;
  temperature: number;
  promptCount: number;
}

// ───────────────────────────────────────────────────────────
//  主组件
// ───────────────────────────────────────────────────────────

export function PresetQuickSwitch({ config, onChange }: PresetQuickSwitchProps) {
  const [availablePresets, setAvailablePresets] = useState<AvailablePreset[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // 加载可用预设
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const builtinList: AvailablePreset[] = BUILTIN_PRESETS.map((p) => ({
        id: `builtin:${p.name}`,
        name: p.name,
        source: 'builtin' as const,
        profile: p,
        temperature: p.sampler.temperature,
        promptCount: p.prompts.length,
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
            temperature: profile?.sampler.temperature ?? 0,
            promptCount: profile?.prompts.length ?? 0,
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

  const showToast = useCallback((type: 'success' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // 切换端点的预设
  const handleSwitch = useCallback(
    (profileId: AiProfileId, presetName: string) => {
      const nextEndpoints = config.endpoints.map((ep) =>
        ep.profileId === profileId ? { ...ep, presetName } : ep,
      );
      onChange({ ...config, endpoints: nextEndpoints });
      const profile = findProfile(profileId);
      showToast('success', `${profile?.name ?? profileId} 已切换到「${presetName}」`);
    },
    [config, onChange, showToast],
  );

  // 一键应用到所有端点
  const handleApplyToAll = useCallback(
    (presetName: string) => {
      const nextEndpoints = config.endpoints.map((ep) => ({ ...ep, presetName }));
      onChange({ ...config, endpoints: nextEndpoints });
      showToast('success', `所有 AI 端点已切换到「${presetName}」`);
    },
    [config, onChange, showToast],
  );

  // 统计:各预设被多少端点使用
  const presetUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const ep of config.endpoints) {
      const count = usage.get(ep.presetName) ?? 0;
      usage.set(ep.presetName, count + 1);
    }
    return usage;
  }, [config.endpoints]);

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
          marginBottom: 12,
          borderBottom: `1px solid ${THEME_VARS.borderSoft}`,
        }}
      >
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
          🔀 预设快捷切换
        </h3>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, marginTop: 2, letterSpacing: 0.4 }}>
          Preset Quick Switch · 游戏中即时切换各 AI 端点的预设绑定
        </div>
      </header>

      {toast && (
        <div
          style={{
            padding: 8,
            marginBottom: 10,
            background: toast.type === 'success' ? '#e8f5e9' : '#e3f2fd',
            color: toast.type === 'success' ? '#2e7d32' : '#1565c0',
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          {toast.type === 'success' ? '✓ ' : 'ℹ '}
          {toast.message}
        </div>
      )}

      {/* ─── 端点列表 ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {config.endpoints.map((ep) => (
          <EndpointRow
            key={ep.profileId}
            endpoint={ep}
            availablePresets={availablePresets}
            onSwitch={handleSwitch}
          />
        ))}
      </div>

      {/* ─── 一键应用 ─── */}
      <div style={sectionStyle}>
        <div
          style={{
            fontSize: 11,
            color: THEME_VARS.textMuted,
            marginBottom: 8,
            letterSpacing: 0.4,
          }}
        >
          ⚡ 一键应用到所有端点:
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {availablePresets.map((p) => (
            <button
              key={p.id}
              onClick={() => handleApplyToAll(p.name)}
              style={{
                padding: '5px 10px',
                background: THEME_VARS.primaryGlow,
                color: THEME_VARS.primary,
                border: `1px solid ${THEME_VARS.borderSoft}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              title={`把所有 ${config.endpoints.length} 个端点都切换到「${p.name}」`}
            >
              {p.source === 'builtin' ? '★ ' : '📥 '}
              {p.name}
              <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>
                (T={p.temperature}, {p.promptCount}条)
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 预设使用统计 ─── */}
      <div style={sectionStyle}>
        <div
          style={{
            fontSize: 11,
            color: THEME_VARS.textMuted,
            marginBottom: 8,
            letterSpacing: 0.4,
          }}
        >
          📊 预设使用统计:
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
          {Array.from(presetUsage.entries()).map(([name, count]) => (
            <span
              key={name}
              style={{
                padding: '2px 8px',
                background: THEME_VARS.bg,
                color: THEME_VARS.text,
                borderRadius: 4,
                border: `1px solid ${THEME_VARS.borderSoft}`,
              }}
            >
              {name}{' '}
              <span
                style={{
                  ...badgeStyle,
                  background: count === config.endpoints.length ? THEME_VARS.success + '22' : THEME_VARS.primaryGlow,
                  color: count === config.endpoints.length ? THEME_VARS.success : THEME_VARS.primary,
                }}
              >
                ×{count}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  端点行
// ───────────────────────────────────────────────────────────

interface EndpointRowProps {
  endpoint: AiEndpointConfig;
  availablePresets: AvailablePreset[];
  onSwitch: (profileId: AiProfileId, presetName: string) => void;
}

function EndpointRow({ endpoint, availablePresets, onSwitch }: EndpointRowProps) {
  const profile = findProfile(endpoint.profileId as AiProfileId);
  const currentPreset = availablePresets.find((p) => p.name === endpoint.presetName);
  const isConfigured = Boolean(endpoint.apiKey && endpoint.model);

  return (
    <div
      style={{
        padding: 10,
        background: THEME_VARS.overlay,
        borderRadius: 8,
        border: `1px solid ${THEME_VARS.borderSoft}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 120, flex: '0 0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: THEME_VARS.text }}>
          {profile?.name ?? endpoint.profileId}
        </div>
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted }}>
          {profile?.role ?? '—'}
        </div>
      </div>

      <span
        style={{
          ...badgeStyle,
          background: isConfigured ? THEME_VARS.success + '22' : THEME_VARS.warning + '22',
          color: isConfigured ? THEME_VARS.success : THEME_VARS.warning,
        }}
      >
        {isConfigured ? '● 已配置' : '○ 未配置'}
      </span>

      <select
        style={selectStyle}
        value={endpoint.presetName}
        onChange={(e) => onSwitch(endpoint.profileId as AiProfileId, e.target.value)}
      >
        {availablePresets.map((p) => (
          <option key={p.id} value={p.name}>
            {p.source === 'builtin' ? '★ ' : '📥 '}
            {p.name} (T={p.temperature}, {p.promptCount}条)
          </option>
        ))}
      </select>

      {currentPreset?.profile && (
        <div style={{ fontSize: 10, color: THEME_VARS.textMuted, fontFamily: THEME_VARS.fontMono }}>
          top_p={currentPreset.profile.sampler.topP} · rep={currentPreset.profile.sampler.repetitionPenalty} ·{' '}
          ctx={currentPreset.profile.context.maxContext}
        </div>
      )}
    </div>
  );
}
