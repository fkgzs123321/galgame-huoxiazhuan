import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Modal, useToast, Tabs } from '@ui/base';
import { useConfigStore } from '@stores/index';
import { DEFAULT_APP_CONFIG, IDENTITY_OPTIONS, type AppConfig, type AiEndpointConfig } from '@ui/types';
import { ALL_AI_PROFILES, type AiProfileId } from '@ai/profiles';
import { notificationService, listModelsWithFallback, testConnection, COMMON_MODELS, MANUAL_MODEL_MARK, type ModelInfo } from '@gateway/index';

/**
 * OnboardingWizard · 开局向导(路由级)
 * 对齐 fanren-remake 的 OnboardingWizard + WelcomeStep + EndpointStep:
 *  - 第 1 步:欢迎 + 向导说明
 *  - 第 2 步:添加 AI 接口(主聊天 + 变量,可测试连通)
 *  - 第 3 步:选择玩家身份(6 种开局)
 *  - 第 4 步:完成检查 + 开始游戏
 */

const STEPS = [
  { key: 'welcome', label: '欢迎', icon: '🌸' },
  { key: 'endpoint', label: 'AI 接口', icon: '🔌' },
  { key: 'identity', label: '身份', icon: '👤' },
  { key: 'finish', label: '完成', icon: '🚀' },
];

type StepKey = 'welcome' | 'endpoint' | 'identity' | 'finish';

export function OnboardingWizardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const config = useConfigStore((s) => s.config);
  const setConfig = useConfigStore((s) => s.setConfig);

  const [step, setStep] = useState<StepKey>('welcome');
  const [playerName, setPlayerName] = useState(config.playerName || '我');
  const [mainURL, setMainURL] = useState(getEndpoint(config, 'main-chat').baseURL);
  const [mainKey, setMainKey] = useState(getEndpoint(config, 'main-chat').apiKey);
  const [mainModel, setMainModel] = useState(getEndpoint(config, 'main-chat').model);
  const [varURL, setVarURL] = useState(getEndpoint(config, 'var-update').baseURL);
  const [varKey, setVarKey] = useState(getEndpoint(config, 'var-update').apiKey);
  const [varModel, setVarModel] = useState(getEndpoint(config, 'var-update').model);
  const [identityId, setIdentityId] = useState(config.selectedIdentity || 'P1');
  const [testing, setTesting] = useState(false);

  // 已完成向导(已有完整配置)直接跳过
  const alreadyOnboarded = config.identitySelected && config.endpoints.some((e) => e.baseURL && e.apiKey);

  useEffect(() => {
    if (alreadyOnboarded) {
      // 已配置:允许跳过向导
    }
  }, [alreadyOnboarded]);

  const updateEndpointConfig = (profileId: AiProfileId, patch: Partial<AiEndpointConfig>) => {
    const endpoints = config.endpoints.map((e) =>
      e.profileId === profileId ? { ...e, ...patch } : e,
    );
    // 若该 profile 不存在则追加
    if (!endpoints.some((e) => e.profileId === profileId)) {
      endpoints.push({
        profileId,
        baseURL: '',
        apiKey: '',
        model: '',
        presetName: '原卡默认',
        ...patch,
      });
    }
    return endpoints;
  };

  const applyEndpointInputs = (): AppConfig => {
    let endpoints = updateEndpointConfig('main-chat', {
      baseURL: mainURL.trim(),
      apiKey: mainKey.trim(),
      model: mainModel.trim(),
    });
    endpoints = endpoints.map((e) =>
      e.profileId === 'var-update'
        ? { ...e, baseURL: varURL.trim() || mainURL.trim(), apiKey: varKey.trim() || mainKey.trim(), model: varModel.trim() || mainModel.trim() }
        : e,
    );
    if (!endpoints.some((e) => e.profileId === 'var-update')) {
      endpoints.push({
        profileId: 'var-update',
        baseURL: mainURL.trim(),
        apiKey: mainKey.trim(),
        model: mainModel.trim(),
        presetName: '原卡默认',
      });
    }
    return { ...config, endpoints, playerName: playerName.trim() || '我', updatedAt: Date.now() };
  };

  const handleTest = async () => {
    if (!mainURL.trim() || !mainKey.trim() || !mainModel.trim()) {
      toast.warning('请先填写主聊天 AI 的 baseURL / API Key / model');
      return;
    }
    setTesting(true);
    const r = await testConnection(mainURL, mainKey);
    if (r.ok) {
      notificationService.success(r.detail ?? '接口连通成功');
    } else {
      notificationService.error(r.error ?? '连通失败');
    }
    setTesting(false);
  };

  const handleFinish = () => {
    const next: AppConfig = {
      ...applyEndpointInputs(),
      identitySelected: true,
      selectedIdentity: identityId,
      updatedAt: Date.now(),
    };
    setConfig(next);
    notificationService.success('开局配置完成,欢迎来到寒假!');
    navigate('/');
  };

  const identity = IDENTITY_OPTIONS.find((o) => o.id === identityId) ?? IDENTITY_OPTIONS[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Card style={{ width: 'min(680px, 96vw)' }}>
        {/* 步骤指示器 */}
        <div style={{ display: 'flex', padding: '14px 20px 0', gap: 4, overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const idx = STEPS.findIndex((x) => x.key === step);
            const done = i < idx;
            const active = i === idx;
            return (
              <div
                key={s.key}
                style={{
                  flex: 1,
                  minWidth: 90,
                  padding: '8px 6px',
                  textAlign: 'center',
                  borderRadius: 8,
                  fontSize: 12,
                  background: active ? 'var(--c-primary-glow)' : done ? 'var(--c-bg)' : 'transparent',
                  color: active ? 'var(--c-primary)' : done ? 'var(--c-success)' : 'var(--c-text-muted)',
                  fontWeight: active ? 600 : 400,
                  borderBottom: active ? '2px solid var(--c-primary)' : '2px solid transparent',
                }}
              >
                {s.icon} {s.label}
                {done && ' ✓'}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          {step === 'welcome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--c-primary)', letterSpacing: 1 }}>
                🌸 同级生2 · 独立前端卡
              </h2>
              <p style={{ fontSize: 13, color: 'var(--c-text-muted)', lineHeight: 1.8, margin: 0 }}>
                这是一个独立运行的恋爱模拟游戏,只需浏览器 + 一个 OpenAI 兼容的 LLM API 即可游玩。
                <br />
                向导将带你完成 3 步配置:添加 AI 接口 → 选择身份 → 开始游戏。
                <br />
                <span style={{ color: 'var(--c-text-soft)' }}>
                  提示:无需 SillyTavern,配置完全本地保存(IndexedDB),API Key 不上传。
                </span>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="primary" onClick={() => setStep('endpoint')}>
                  开始配置 →
                </Button>
                {alreadyOnboarded && (
                  <Button variant="secondary" onClick={() => navigate('/')}>
                    跳过(已配置过)
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'endpoint' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--c-text)' }}>🔌 添加 AI 接口</h3>
              <p style={{ fontSize: 12, color: 'var(--c-text-muted)', margin: 0 }}>
                主聊天 AI 必填(叙事生成)。变量 AI 留空则复用主聊天。支持 DeepSeek / Qwen / Moonshot / OpenAI 等兼容端点。
              </p>

              <EndpointFields
                title="主聊天 AI(必填)"
                url={mainURL}
                setUrl={setMainURL}
                keyVal={mainKey}
                setKey={setMainKey}
                model={mainModel}
                setModel={setMainModel}
              />
              <EndpointFields
                title="变量 AI(可选,默认复用主聊天)"
                url={varURL}
                setUrl={setVarURL}
                keyVal={varKey}
                setKey={setVarKey}
                model={varModel}
                setModel={setVarModel}
              />

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Button variant="secondary" onClick={() => void handleTest()} disabled={testing}>
                  {testing ? '测试中…' : '🔍 测试连通'}
                </Button>
                <span style={{ fontSize: 11, color: 'var(--c-text-soft)' }}>
                  部分服务不支持 /models 端点,测试失败不代表不可用,可直接继续
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Button variant="ghost" onClick={() => setStep('welcome')}>
                  ← 上一步
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setStep('identity')}
                  disabled={!mainURL.trim() || !mainKey.trim() || !mainModel.trim()}
                >
                  下一步 →
                </Button>
              </div>
            </div>
          )}

          {step === 'identity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--c-text)' }}>👤 选择玩家身份</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {IDENTITY_OPTIONS.map((opt) => {
                  const active = opt.id === identityId;
                  const locked = !!opt.unlockCondition;
                  const difficultyDots = '★'.repeat(opt.difficulty) + '☆'.repeat(5 - opt.difficulty);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => !locked && setIdentityId(opt.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: `1px solid ${active ? 'var(--c-primary)' : locked ? 'var(--c-border-soft)' : 'var(--c-border)'}`,
                        background: active ? 'var(--c-primary-glow)' : 'var(--c-bg)',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        opacity: locked && !active ? 0.6 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>
                          {opt.name}
                          {locked && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--c-text-soft)' }}>🔒 {opt.unlockCondition}</span>}
                        </span>
                        <span style={{ fontSize: 10, color: active ? 'var(--c-primary)' : 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>
                          难度 {difficultyDots}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 3, lineHeight: 1.6 }}>
                        {opt.description}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-soft)', marginTop: 4, lineHeight: 1.6 }}>
                        📖 {opt.background.slice(0, 90)}…
                      </div>
                      {opt.traits.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                          {opt.traits.map((t, i) => (
                            <span
                              key={i}
                              title={t.effect}
                              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--c-primary-glow)', color: 'var(--c-primary)', border: '1px solid var(--c-primary-soft)' }}
                            >
                              ✦ {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--c-text-soft)' }}>💴 {opt.cash} · 🏠 {opt.residence}</span>
                        {Object.entries(opt.attributes).map(([k, v]) => (
                          <span key={k} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--c-overlay)', color: 'var(--c-text-muted)' }}>
                            {k} {v}
                          </span>
                        ))}
                      </div>
                      {active && opt.exclusivePlot && (
                        <div style={{ fontSize: 10, color: 'var(--c-accent)', marginTop: 5 }}>
                          🎬 专属线:{opt.exclusivePlot}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Button variant="ghost" onClick={() => setStep('endpoint')}>
                  ← 上一步
                </Button>
                <Button variant="primary" onClick={() => setStep('finish')}>
                  下一步 →
                </Button>
              </div>
            </div>
          )}

          {step === 'finish' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--c-text)' }}>🚀 完成检查</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CheckRow label="玩家姓名" value={playerName.trim() || '我'} ok />
                <CheckRow
                  label="主聊天 AI"
                  value={mainURL ? `${mainModel || 'model'} @ ${mainURL.replace(/^https?:\/\//, '')}` : '未配置'}
                  ok={!!mainURL}
                />
                <CheckRow
                  label="玩家身份"
                  value={identity.name}
                  ok
                />
                <CheckRow
                  label="初始属性"
                  value={`魅力${identity.attributes.魅力} 学业${identity.attributes.学业} 体力${identity.attributes.体力} 社交${identity.attributes.社交}`}
                  ok
                />
                <CheckRow
                  label="初始现金"
                  value={`${identity.cash} 円 · 住所 ${identity.residence}`}
                  ok
                />
              </div>

              <div style={{ fontSize: 12, color: 'var(--c-text-muted)', padding: 10, background: 'var(--c-bg)', borderRadius: 8, lineHeight: 1.7 }}>
                开始游戏后,你将回到 12 月 22 日(周五)早晨的鸣泽家。
                使用自然语言行动(如"起床去找美佐子"),AI 会驱动剧情与变量更新。
                也可以在「设置」中随时修改接口与身份。
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Button variant="ghost" onClick={() => setStep('identity')}>
                  ← 上一步
                </Button>
                <Button variant="primary" onClick={handleFinish}>
                  🌸 开始游戏
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  子组件
// ───────────────────────────────────────────────────────────

function getEndpoint(config: AppConfig, profileId: AiProfileId): AiEndpointConfig {
  return config.endpoints.find((e) => e.profileId === profileId) ?? {
    profileId,
    baseURL: '',
    apiKey: '',
    model: '',
    presetName: '原卡默认',
  };
}

function EndpointFields({
  title,
  url,
  setUrl,
  keyVal,
  setKey,
  model,
  setModel,
}: {
  title: string;
  url: string;
  setUrl: (v: string) => void;
  keyVal: string;
  setKey: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
}) {
  const [modelList, setModelList] = useState<ModelInfo[] | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  // 模型选项:拉取结果(若有)+ 内置表 + 手动输入项(对齐凡人 EndpointLibrary)
  const modelOptions = useMemo(() => {
    const list = modelList && modelList.length > 0 ? modelList : COMMON_MODELS;
    const opts = list.map((m) => ({ value: m.id, label: m.id }));
    // 当前手填的模型不在列表里时,补一项
    if (model && !opts.some((o) => o.value === model)) {
      opts.unshift({ value: model, label: `${model}(手动)` });
    }
    opts.push({ value: MANUAL_MODEL_MARK, label: '✏️ 手动输入模型名…' });
    return opts;
  }, [modelList, model]);

  const handleFetchModels = async () => {
    if (!url.trim() || !keyVal.trim()) {
      setFetchError('请先填写完整的接口地址和 API Key');
      return;
    }
    setLoadingModels(true);
    setFetchError(null);
    const r = await listModelsWithFallback(url, keyVal);
    setModelList(r.models);
    if (r.error) {
      // 拉取失败:回退内置表,提示但不阻塞(对齐凡人:仍可手动输入)
      setFetchError(r.error);
      if (!model && r.models[0]) setModel(r.models[0].id);
    } else if (!model && r.models[0]) {
      setModel(r.models[0].id);
    }
    setLoadingModels(false);
  };

  const handleModelSelect = (v: string) => {
    if (v === MANUAL_MODEL_MARK) {
      setManualMode(true);
      return;
    }
    setManualMode(false);
    setModel(v);
  };

  return (
    <div style={{ padding: 12, background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)' }}>{title}</span>
        <button
          type="button"
          onClick={() => void handleFetchModels()}
          disabled={loadingModels || !url.trim() || !keyVal.trim()}
          style={{
            padding: '3px 10px',
            fontSize: 11,
            borderRadius: 6,
            border: '1px solid var(--c-border)',
            background: 'var(--c-overlay)',
            color: 'var(--c-text-muted)',
            cursor: 'pointer',
          }}
        >
          {loadingModels ? '拉取中…' : '📡 拉取模型列表'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <Input placeholder="baseURL,如 https://opencode.ai/zen/go/v1" value={url} onChange={(e) => setUrl(e.target.value)} />
        {manualMode ? (
          <Input
            placeholder="手动输入模型名"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            onBlur={() => model && setManualMode(false)}
            autoFocus
          />
        ) : (
          <Select value={model} options={modelOptions} onChange={(e) => handleModelSelect(e.target.value)} style={{ flex: 1 }} />
        )}
      </div>
      {fetchError && (
        <div style={{ fontSize: 10, color: 'var(--c-warning)', lineHeight: 1.5 }}>
          ⚠️ {fetchError}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--c-text-soft)' }}>
        {modelList && modelList.length > 0
          ? `已加载 ${modelList.length} 个模型(含内置参考表)`
          : `内置参考模型 ${COMMON_MODELS.length} 个;点击「拉取模型列表」获取端点真实模型`}
      </div>
      <Input type="password" placeholder="API Key(本地保存,不上传)" value={keyVal} onChange={(e) => setKey(e.target.value)} />
    </div>
  );
}

function CheckRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'var(--c-bg)', borderRadius: 8, fontSize: 12 }}>
      <span style={{ color: ok ? 'var(--c-success)' : 'var(--c-danger)' }}>{ok ? '✓' : '✗'}</span>
      <span style={{ color: 'var(--c-text-muted)', minWidth: 80 }}>{label}</span>
      <span style={{ color: 'var(--c-text)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
