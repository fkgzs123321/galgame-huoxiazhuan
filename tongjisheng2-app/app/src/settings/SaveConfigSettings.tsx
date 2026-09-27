import React, { useState } from 'react';
import * as idb from '@db/indexeddb';
import { APP_CONFIG_KV_KEY } from '@stores/index';
import type { AppConfig } from '@ui/types';
import { THEME_VARS } from '@ui/types';

/**
 * SaveConfigSettings · 配置保存模块
 * 职责:把当前配置持久化到 IndexedDB。
 */

export interface SaveConfigSettingsProps {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  readOnly?: boolean;
}

export function SaveConfigSettings({ config, onChange, readOnly = false }: SaveConfigSettingsProps) {
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleSave = async () => {
    const next = { ...config, updatedAt: Date.now() };
    await idb.kvSet(APP_CONFIG_KV_KEY, next);
    onChange(next);
    setSavedAt(Date.now());
  };

  return (
    <section>
      <button
        type="button"
        onClick={handleSave}
        disabled={readOnly}
        style={{
          padding: '10px 20px',
          background: readOnly ? THEME_VARS.border : THEME_VARS.primary,
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 14,
          cursor: readOnly ? 'not-allowed' : 'pointer',
        }}
      >
        保存配置到 IndexedDB
      </button>
      {savedAt && (
        <span
          style={{
            marginLeft: 12,
            fontSize: 12,
            color: THEME_VARS.success,
          }}
        >
          ✓ 已保存({new Date(savedAt).toLocaleTimeString()})
        </span>
      )}
    </section>
  );
}
