import React, { useState } from 'react';
import { Tabs } from '@ui/base';
import { AiEndpointSettings } from './AiEndpointSettings';
import { PlayerSettings } from './PlayerSettings';
import { PresetSettings } from './PresetSettings';
import { SaveConfigSettings } from './SaveConfigSettings';
import { IdentitySelect } from '@ui/index';
import type { AppConfig, IdentityOption } from '@ui/types';
import { THEME_VARS } from '@ui/types';

/**
 * SettingsPage · 设置页(聚合设置模块)
 * 对齐 fanren-remake 的 settings 层:45 个独立设置模块 + Tabs 聚合。
 * 当前聚合:玩家姓名 / AI 端点 / 预设管理 / 保存。
 */

export interface SettingsPageProps {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  readOnly?: boolean;
  /** 身份选择区(可选,由调用方决定是否展示) */
  identity?: {
    selected: string;
    onConfirm: (opt: IdentityOption) => void;
  };
}

type SettingsTab = 'player' | 'endpoints' | 'presets' | 'save';

export function SettingsPage({ config, onChange, readOnly = false, identity }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>('endpoints');

  const tabs = [
    { key: 'player' as const, label: '👤 玩家' },
    { key: 'endpoints' as const, label: '🔌 AI 端点' },
    { key: 'presets' as const, label: '📦 预设' },
    { key: 'save' as const, label: '💾 保存' },
  ];

  return (
    <div
      style={{
        background: THEME_VARS.overlay,
        border: `1px solid ${THEME_VARS.border}`,
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <header style={{ borderBottom: `1px solid ${THEME_VARS.border}`, paddingBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: THEME_VARS.text }}>设置</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: THEME_VARS.textMuted }}>
          玩家姓名 + 8AI 端点 + 预设选择 + Sampler 预览 · 配置存 IndexedDB(不上传)
        </p>
      </header>

      <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as SettingsTab)} />

      <div style={{ paddingTop: 4 }}>
        {tab === 'player' && <PlayerSettings config={config} onChange={onChange} readOnly={readOnly} />}
        {tab === 'endpoints' && <AiEndpointSettings config={config} onChange={onChange} readOnly={readOnly} />}
        {tab === 'presets' && <PresetSettings config={config} onChange={onChange} readOnly={readOnly} />}
        {tab === 'save' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SaveConfigSettings config={config} onChange={onChange} readOnly={readOnly} />
            {identity && (
              <div
                style={{
                  padding: 14,
                  background: THEME_VARS.bg,
                  border: `1px solid ${THEME_VARS.border}`,
                  borderRadius: 6,
                }}
              >
                <h4 style={{ margin: '0 0 8px', fontSize: 13, color: THEME_VARS.text }}>
                  玩家身份选择
                </h4>
                <IdentitySelectInline
                  selected={identity.selected}
                  onConfirm={identity.onConfirm}
                  readOnly={readOnly}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 内联身份选择(轻量版,避免与 PanelPage 的 IdentitySelect 重复引入依赖)
function IdentitySelectInline({
  selected,
  onConfirm,
  readOnly,
}: {
  selected: string;
  onConfirm: (opt: IdentityOption) => void;
  readOnly?: boolean;
}) {
  return <IdentitySelect selected={selected} onConfirm={onConfirm} readOnly={readOnly ?? false} />;
}
