import React, { useEffect, useMemo, useState } from 'react';
import { BUILTIN_PRESETS, builtinOriginalDefault } from '@content/presets/builtin-presets';
import { importPreset, savePreset, deletePreset, listPresets, type PresetProfile } from '@runtime/preset';
import type { AppConfig } from '@ui/types';
import { THEME_VARS } from '@ui/types';

/**
 * PresetSettings · 预设管理设置模块
 * 职责:ST 预设 JSON 导入 / 已导入预设列表 / 删除。
 */

export interface PresetSettingsProps {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  readOnly?: boolean;
}

interface PresetEntry {
  name: string;
  source: 'builtin' | 'imported';
  profile: PresetProfile | null;
  promptCount: number;
}

export function PresetSettings({ config, onChange, readOnly = false }: PresetSettingsProps) {
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [importMessage, setImportMessage] = useState<{ type: 'ok' | 'fail'; text: string } | null>(null);

  // 加载预设列表(内置 + IndexedDB 已导入)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const builtinEntries: PresetEntry[] = BUILTIN_PRESETS.map((p) => ({
        name: p.name,
        source: 'builtin' as const,
        profile: p,
        promptCount: p.prompts.length,
      }));
      try {
        const importedMetas = await listPresets();
        const importedEntries: PresetEntry[] = [];
        for (const meta of importedMetas) {
          if (BUILTIN_PRESETS.some((b) => b.name === meta.name)) continue;
          importedEntries.push({
            name: meta.name,
            source: 'imported' as const,
            profile: null,
            promptCount: meta.promptCount,
          });
        }
        if (!cancelled) setPresets([...builtinEntries, ...importedEntries]);
      } catch {
        if (!cancelled) setPresets(builtinEntries);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 处理 ST 预设 JSON 导入
  const handleImportPreset = async (file: File) => {
    setImportMessage(null);
    try {
      const text = await file.text();
      const result = importPreset(text, file.name);
      if (result.ok && result.profile) {
        await savePreset(result.profile);
        const exists = presets.some((p) => p.name === result.profile!.name);
        if (!exists) {
          setPresets((prev) => [
            ...prev,
            {
              name: result.profile!.name,
              source: 'imported',
              profile: result.profile!,
              promptCount: result.profile!.prompts.length,
            },
          ]);
        }
        setImportMessage({
          type: 'ok',
          text: `导入成功:${result.profile.name}(prompts=${result.profile.prompts.length},temp=${result.profile.sampler.temperature})`,
        });
      } else {
        setImportMessage({
          type: 'fail',
          text: `导入失败:${result.errors.join('; ') || '未知错误'}`,
        });
      }
    } catch (e) {
      setImportMessage({
        type: 'fail',
        text: `读取文件失败:${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  const handleDeletePreset = async (name: string) => {
    if (presets.find((p) => p.name === name)?.source !== 'imported') return;
    await deletePreset(name);
    setPresets((prev) => prev.filter((p) => p.name !== name));
    setImportMessage({ type: 'ok', text: `已删除预设:${name}` });
  };

  // 当前选中预设的 sampler 预览
  const selectedPresetForPreview = useMemo<PresetProfile>(() => {
    const mainEp = config.endpoints.find((e) => e.profileId === 'main-chat');
    const name = mainEp?.presetName || '原卡默认';
    const entry = presets.find((p) => p.name === name);
    if (entry?.profile) return entry.profile;
    return builtinOriginalDefault;
  }, [config.endpoints, presets]);

  const selectedPresetIsImported = useMemo(() => {
    const mainEp = config.endpoints.find((e) => e.profileId === 'main-chat');
    const name = mainEp?.presetName || '原卡默认';
    return presets.find((p) => p.name === name)?.source === 'imported';
  }, [config.endpoints, presets]);

  return (
    <section>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, color: THEME_VARS.text }}>预设管理</h3>
      <div
        style={{
          padding: 10,
          background: THEME_VARS.bg,
          border: `1px dashed ${THEME_VARS.border}`,
          borderRadius: 4,
        }}
      >
        <input
          type="file"
          accept=".json,application/json"
          disabled={readOnly}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImportPreset(f);
            e.target.value = '';
          }}
          style={{ fontSize: 12 }}
        />
        <p style={{ margin: '6px 0 0', fontSize: 11, color: THEME_VARS.textMuted }}>
          导入 SillyTavern ChatCompletion 预设 JSON(如"三人逆行v11.0—PrismFox 正式版(数据库变量版).json")
        </p>
        {importMessage && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12,
              color: importMessage.type === 'ok' ? THEME_VARS.success : THEME_VARS.danger,
            }}
          >
            {importMessage.text}
          </p>
        )}
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {presets.map((p) => (
            <span
              key={p.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                background: THEME_VARS.overlay,
                border: `1px solid ${THEME_VARS.border}`,
                borderRadius: 12,
                fontSize: 11,
              }}
            >
              <span style={{ color: THEME_VARS.text }}>{p.name}</span>
              <span style={{ color: THEME_VARS.textMuted }}>
                [{p.source === 'builtin' ? '内置' : '导入'}]
              </span>
              {p.source === 'imported' && !readOnly && (
                <button
                  type="button"
                  onClick={() => handleDeletePreset(p.name)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: THEME_VARS.danger,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                  title="删除"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Sampler 预览(并入预设模块,因为依赖选中预设) */}
      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 13, color: THEME_VARS.text }}>
          Sampler 参数预览(主聊天AI 绑定的预设)
          {selectedPresetIsImported && (
            <span style={{ marginLeft: 8, fontSize: 11, color: THEME_VARS.warning }}>
              (已选导入预设,sampler 实际值需打开预设文件查看,此处展示内置默认回退)
            </span>
          )}
        </h4>
        <div
          style={{
            padding: 12,
            background: THEME_VARS.bg,
            border: `1px solid ${THEME_VARS.border}`,
            borderRadius: 4,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
          }}
        >
          {(
            [
              'temperature',
              'topP',
              'topK',
              'topA',
              'minP',
              'repetitionPenalty',
              'frequencyPenalty',
              'presencePenalty',
              'seed',
            ] as const
          ).map((k) => (
            <div
              key={k}
              style={{
                padding: '6px 8px',
                background: THEME_VARS.overlay,
                borderRadius: 3,
                fontSize: 12,
              }}
            >
              <span style={{ color: THEME_VARS.textMuted }}>{k}</span>
              <span style={{ float: 'right', color: THEME_VARS.text, fontWeight: 600 }}>
                {String(selectedPresetForPreview.sampler[k] ?? '—')}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: '6px 8px',
              background: THEME_VARS.overlay,
              borderRadius: 3,
              fontSize: 12,
              gridColumn: '1 / -1',
            }}
          >
            <span style={{ color: THEME_VARS.textMuted }}>context</span>
            <span style={{ float: 'right', color: THEME_VARS.text, fontWeight: 600 }}>
              maxContext={selectedPresetForPreview.context.maxContext} / maxTokens=
              {selectedPresetForPreview.context.maxTokens}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
