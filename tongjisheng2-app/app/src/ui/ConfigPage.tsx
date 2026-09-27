/**
 * 配置页(步骤7)
 *
 * 职责:
 *  - 玩家姓名输入(注入 {{user}} 宏)
 *  - 8AI 端点配置(阶段1只用 main-chat / var-update 2 个,其他 6 个 readonly)
 *  - API Key 本地存(IndexedDB kv:__app_config__,不上传)
 *  - 预设选择(内置 2 个 / 导入 ST 预设 JSON)
 *  - 8AI 预设绑定下拉(每个 profile 选一个预设)
 *  - Sampler 参数预览(展示当前选中预设的 sampler)
 *  - 保存到 IndexedDB
 *
 * 不做:
 *  - 真实 API 调用(由 MainChat 通过 ModelGateway 调用)
 *  - 预设编辑(由独立预设编辑器,阶段2)
 */

import { useEffect, useMemo, useState } from 'react';
import * as idb from '@db/indexeddb';
import {
  BUILTIN_PRESETS,
  builtinOriginalDefault,
} from '@content/presets/builtin-presets';
import {
  importPreset,
  listPresets,
  savePreset,
  deletePreset,
  type PresetProfile,
} from '@runtime/preset';
import { ALL_AI_PROFILES, STAGE1_PROFILES, STAGE3_PROFILES, TRIGGER_PROFILES } from '@ai/profiles';
import {
  APP_CONFIG_KV_KEY,
  DEFAULT_APP_CONFIG,
  THEME_VARS,
  type AiEndpointConfig,
  type AppConfig,
} from './types';

// ───────────────────────────────────────────────────────────
//  组件 Props
// ───────────────────────────────────────────────────────────

export interface ConfigPageProps {
  /** 当前配置(受控) */
  config: AppConfig;
  /** 配置变更回调(由父组件持久化) */
  onChange: (next: AppConfig) => void;
  /** 是否只读(步骤7 验证 UI 可禁用编辑) */
  readOnly?: boolean;
}

// ───────────────────────────────────────────────────────────
//  内部状态
// ───────────────────────────────────────────────────────────

interface PresetEntry {
  name: string;
  source: 'builtin' | 'imported';
  /** 完整 profile(内置预设直接持有;导入预设只在导入时短暂持有,列表刷新后置 null) */
  profile: PresetProfile | null;
  /** 已导入预设的 promptCount(元数据,内置预设从 profile.prompts.length 取) */
  promptCount?: number;
}

// ───────────────────────────────────────────────────────────
//  ConfigPage 组件
// ───────────────────────────────────────────────────────────

export function ConfigPage({ config, onChange, readOnly = false }: ConfigPageProps) {
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [importMessage, setImportMessage] = useState<{ type: 'ok' | 'fail'; text: string } | null>(
    null,
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

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
          // listPresets 只返回元数据(PresetIndexEntry),完整 profile 不在此加载
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
        // 刷新列表
        const exists = presets.some((p) => p.name === result.profile!.name);
        if (!exists) {
          setPresets((prev) => [
            ...prev,
            { name: result.profile!.name, source: 'imported', profile: result.profile! },
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

  // 端点字段更新
  const updateEndpoint = (profileId: string, patch: Partial<AiEndpointConfig>) => {
    const endpoints = config.endpoints.map((e) =>
      e.profileId === profileId ? { ...e, ...patch } : e,
    );
    onChange({ ...config, endpoints, updatedAt: Date.now() });
  };

  // 保存到 IndexedDB
  const handleSave = async () => {
    const next = { ...config, updatedAt: Date.now() };
    await idb.kvSet(APP_CONFIG_KV_KEY, next);
    onChange(next);
    setSavedAt(Date.now());
  };

  // 当前选中预设的 sampler 预览(仅内置预设可预览;已导入预设需打开查看)
  const selectedPresetForPreview = useMemo<PresetProfile>(() => {
    const mainEp = config.endpoints.find((e) => e.profileId === 'main-chat');
    const name = mainEp?.presetName || '原卡默认';
    const entry = presets.find((p) => p.name === name);
    if (entry?.profile) return entry.profile;
    // 已导入预设未持有完整 profile,回退到内置默认(显示提示)
    return builtinOriginalDefault;
  }, [config.endpoints, presets]);

  const selectedPresetIsImported = useMemo(() => {
    const mainEp = config.endpoints.find((e) => e.profileId === 'main-chat');
    const name = mainEp?.presetName || '原卡默认';
    return presets.find((p) => p.name === name)?.source === 'imported';
  }, [config.endpoints, presets]);

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
        <h2 style={{ margin: 0, fontSize: 18, color: THEME_VARS.text }}>配置页</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: THEME_VARS.textMuted }}>
          玩家姓名 + 8AI 端点 + 预设选择 + Sampler 预览 · 配置存 IndexedDB(不上传)
        </p>
      </header>

      {/* 玩家姓名 */}
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

      {/* 8AI 端点配置 */}
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
                  opacity: 1,
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
                  <input
                    type="text"
                    placeholder="model,如 deepseek-chat"
                    value={ep.model}
                    readOnly={readOnly}
                    onChange={(e) => updateEndpoint(profile.id, { model: e.target.value })}
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
                    {presets.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}({p.source === 'builtin' ? '内置' : '导入'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 预设导入 */}
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
      </section>

      {/* Sampler 预览 */}
      <section>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, color: THEME_VARS.text }}>
          Sampler 参数预览(主聊天AI 绑定的预设)
          {selectedPresetIsImported && (
            <span style={{ marginLeft: 8, fontSize: 11, color: THEME_VARS.warning }}>
              (已选导入预设,sampler 实际值需打开预设文件查看,此处展示内置默认回退)
            </span>
          )}
        </h3>
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
      </section>

      {/* 保存按钮 */}
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
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: THEME_VARS.overlay,
  border: `1px solid ${THEME_VARS.border}`,
  borderRadius: 3,
  color: THEME_VARS.text,
  fontSize: 12,
  boxSizing: 'border-box',
};

/** 从 IndexedDB 加载配置(供父组件使用) */
export async function loadAppConfig(): Promise<AppConfig> {
  const stored = await idb.kvGet<AppConfig>(APP_CONFIG_KV_KEY);
  if (stored && typeof stored === 'object' && Array.isArray(stored.endpoints)) {
    // 合并默认值(防止字段缺失)
    return { ...DEFAULT_APP_CONFIG, ...stored };
  }
  return { ...DEFAULT_APP_CONFIG };
}
