import React, { useEffect, useState } from 'react';
import { ALL_AI_PROFILES, STAGE1_PROFILES, TRIGGER_PROFILES } from '@ai/profiles';
import { listPresets } from '@runtime/preset';
import { BUILTIN_PRESETS } from '@content/presets/builtin-presets';
import { FULL_PRESETS, findPresetForProfile } from '@content/presets/preset-library';
import type { AppConfig, AiEndpointConfig } from '@ui/types';
import { THEME_VARS } from '@ui/types';
import { ModelSelect } from './ModelSelect';

/**
 * AiEndpointSettings · AI 端点设置模块
 * 对齐 fanren-remake 的 settings 层:每个功能一个设置面板。
 * 职责:8AI 端点配置(核心 2 + 触发 6),存 IndexedDB(由父级持久化)。
 */

export interface AiEndpointSettingsProps {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  readOnly?: boolean;
}

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 3,
  color: THEME_VARS.text,
  fontSize: 12,
  boxSizing: 'border-box',
};

export function AiEndpointSettings({ config, onChange, readOnly = false }: AiEndpointSettingsProps) {
  const [presetNames, setPresetNames] = useState<Array<{ name: string; source: 'builtin' | 'imported' }>>([]);

  // 加载预设列表(完整预设库 + IndexedDB 已导入)供端点绑定下拉
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const builtin = FULL_PRESETS.map((p) => ({ name: p.name, source: 'builtin' as const }));
      // 去重(保留完整库,旧内置名合并)
      const names = new Set(builtin.map((b) => b.name));
      const extraLegacy = BUILTIN_PRESETS.filter((b) => !names.has(b.name)).map((p) => ({
        name: p.name,
        source: 'builtin' as const,
      }));
      try {
        const importedMetas = await listPresets();
        const imported = importedMetas
          .filter((m) => !names.has(m.name) && !extraLegacy.some((e) => e.name === m.name))
          .map((m) => ({ name: m.name, source: 'imported' as const }));
        if (!cancelled) setPresetNames([...builtin, ...extraLegacy, ...imported]);
      } catch {
        if (!cancelled) setPresetNames([...builtin, ...extraLegacy]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 每个 profile 的推荐预设(完整库)
  const recommendedFor = (profileId: string): string | undefined => {
    const p = findPresetForProfile(profileId);
    return p?.name;
  };

  const updateEndpoint = (profileId: string, patch: Partial<AiEndpointConfig>) => {
    const endpoints = config.endpoints.map((e) =>
      e.profileId === profileId ? { ...e, ...patch } : e,
    );
    onChange({ ...config, endpoints, updatedAt: Date.now() });
  };

  return (
    <section>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, color: THEME_VARS.text }}>
        8AI 端点配置(阶段3 全部启用 · 核心 {STAGE1_PROFILES.length} + 触发 {TRIGGER_PROFILES.length})
      </h3>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: THEME_VARS.textMuted }}>
        核心 AI(主聊天+变量)必填;触发型 AI 未配置时按规则降级(开局/剧情演化/战斗/H结算→主聊天AI兼并;世界观→跳过;NPC自然行动→规则生成)。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ALL_AI_PROFILES.map((profile) => {
          const ep = config.endpoints.find((e) => e.profileId === profile.id) ?? {
            profileId: profile.id,
            baseURL: '',
            apiKey: '',
            model: '',
            presetName: '原卡默认',
          };
          const isCore = profile.role === 'main-chat' || profile.role === 'var-update';
          const isTrigger = profile.role === 'trigger';
          const configured = !!ep.baseURL && !!ep.apiKey && !!ep.model;
          return (
            <div
              key={profile.id}
              style={{
                padding: 10,
                background: THEME_VARS.bg,
                border: `1px solid ${isTrigger ? THEME_VARS.border : THEME_VARS.primary}55`,
                borderLeft: `3px solid ${isCore ? THEME_VARS.primary : isTrigger ? THEME_VARS.accent : THEME_VARS.border}`,
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <strong style={{ fontSize: 13, color: THEME_VARS.text }}>
                  {profile.name}
                  <span style={{ marginLeft: 8, fontSize: 11, color: THEME_VARS.textMuted }}>
                    ({profile.id})
                  </span>
                </strong>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: isCore ? THEME_VARS.primary : isTrigger ? THEME_VARS.accent : THEME_VARS.border,
                    color: isCore ? '#fff' : isTrigger ? '#fff' : THEME_VARS.textMuted,
                  }}
                >
                  {isCore ? '核心 AI' : isTrigger ? (configured ? '触发·已配置' : '触发·降级') : '阶段1'}
                </span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: THEME_VARS.textMuted, lineHeight: 1.5 }}>
                {profile.description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input
                  type="text"
                  placeholder="baseURL,如 https://api.deepseek.com/v1"
                  value={ep.baseURL}
                  readOnly={readOnly}
                  onChange={(e) => updateEndpoint(profile.id, { baseURL: e.target.value })}
                  style={inputStyle}
                />
                <ModelSelect
                  value={ep.model}
                  disabled={readOnly}
                  onChange={(v) => updateEndpoint(profile.id, { model: v })}
                  style={inputStyle}
                />
                <input
                  type="password"
                  placeholder="API Key(本地存,不上传)"
                  value={ep.apiKey}
                  readOnly={readOnly}
                  onChange={(e) => updateEndpoint(profile.id, { apiKey: e.target.value })}
                  style={inputStyle}
                />
                <select
                  value={ep.presetName}
                  disabled={readOnly}
                  onChange={(e) => updateEndpoint(profile.id, { presetName: e.target.value })}
                  style={inputStyle}
                >
                  {presetNames.map((p) => {
                    const rec = recommendedFor(profile.id);
                    const isRec = p.name === rec;
                    return (
                      <option key={p.name} value={p.name}>
                        {p.name}({p.source === 'builtin' ? '内置' : '导入'}){isRec ? ' ★推荐' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
