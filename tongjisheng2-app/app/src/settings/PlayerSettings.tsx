import React from 'react';
import type { AppConfig } from '@ui/types';
import { THEME_VARS } from '@ui/types';

/**
 * PlayerSettings · 玩家姓名设置模块
 */
export interface PlayerSettingsProps {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  readOnly?: boolean;
}

export function PlayerSettings({ config, onChange, readOnly = false }: PlayerSettingsProps) {
  return (
    <section>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          color: THEME_VARS.textMuted,
          marginBottom: 6,
        }}
      >
        玩家姓名(注入 {'{{user}}'} 宏)
      </label>
      <input
        type="text"
        value={config.playerName}
        placeholder="如:玩家 / 我"
        readOnly={readOnly}
        onChange={(e) => onChange({ ...config, playerName: e.target.value, updatedAt: Date.now() })}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: THEME_VARS.bg,
          border: `1px solid ${THEME_VARS.border}`,
          borderRadius: 4,
          color: THEME_VARS.text,
          fontSize: 14,
          boxSizing: 'border-box',
        }}
      />
    </section>
  );
}
