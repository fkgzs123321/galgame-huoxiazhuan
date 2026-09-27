// AI 叙事设置弹窗 — 配置模型网关（OpenAI 兼容 / Anthropic）
import { useState } from 'react';
import { useAiStore, type AiProvider } from '@/stores/aiStore';
import clsx from 'clsx';

interface Props {
  onClose: () => void;
}

const PROVIDER_META: Record<AiProvider, { name: string; desc: string }> = {
  openai: {
    name: 'OpenAI 兼容',
    desc: '适用于 OpenAI / DeepSeek / Kimi / Ollama / NewAPI 等任何兼容 /v1/chat/completions 的服务',
  },
  anthropic: {
    name: 'Anthropic',
    desc: '适用于 Claude 官方 Messages API',
  },
};

const PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: 'OpenAI 官方', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'Kimi (月之暗面)', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: 'Ollama 本地', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
];

export default function AiSettingsModal({ onClose }: Props) {
  const config = useAiStore((s) => s.config);
  const setConfig = useAiStore((s) => s.setConfig);
  const resetConfig = useAiStore((s) => s.resetConfig);
  const testing = useAiStore((s) => s.testing);
  const testConnection = useAiStore((s) => s.testConnection);

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTestResult(null);
    const result = await testConnection();
    setTestResult(result);
  };

  const isOpenAI = config.provider === 'openai';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,3,2,0.75)' }}
      onClick={onClose}
    >
      <div
        className="dd-panel w-full max-w-lg max-h-[88vh] overflow-y-auto dd-anim-victory"
        style={{ borderColor: 'rgba(200,160,48,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dd-panel-header flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-dd-gold">✦</span> AI 旁白叙事设置
          </span>
          <button onClick={onClose} className="dd-btn !py-0.5 !px-2 text-[10px]">
            关闭
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <p className="text-dd-textMuted text-xs leading-relaxed">
            开启后，战斗与地牢探索中会由 AI 生成哥特风格的旁白叙事。所有数值判定仍由程序计算，
            AI 只负责描写；叙事失败或未配置时，游戏完全可正常游玩。
          </p>

          {/* 主开关 */}
          <label className="flex items-center justify-between gap-3 dd-panel !p-3" style={{ cursor: 'pointer' }}>
            <span className="font-dd text-dd-gold tracking-widest text-xs">启用 AI 叙事</span>
            <span className="relative inline-block w-10 h-5 align-middle">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ enabled: e.target.checked })}
                className="opacity-0 w-0 h-0 absolute"
              />
              <span
                className={clsx(
                  'absolute inset-0 transition-colors',
                  config.enabled ? 'bg-dd-gold/60' : 'bg-dd-void border border-dd-border'
                )}
                style={{ borderRadius: '2px' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 bg-dd-gold transition-all"
                  style={{
                    left: config.enabled ? 'calc(100% - 1.125rem)' : '0.125rem',
                    borderRadius: '1px',
                  }}
                />
              </span>
            </span>
          </label>

          {/* 供应商选择 */}
          <div>
            <div className="text-xs text-dd-textMuted mb-2 tracking-wide">供应商</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PROVIDER_META) as AiProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setConfig({ provider: p })}
                  className={clsx(
                    'dd-panel !p-3 text-left transition-colors',
                    config.provider === p && 'border-dd-gold shadow-dd-gold'
                  )}
                >
                  <div className="font-dd text-xs text-dd-gold tracking-widest">
                    {PROVIDER_META[p].name}
                  </div>
                  <div className="text-[10px] text-dd-textMuted mt-1 leading-relaxed">
                    {PROVIDER_META[p].desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 预设快捷选择（OpenAI 兼容） */}
          {isOpenAI && (
            <div>
              <div className="text-xs text-dd-textMuted mb-2 tracking-wide">快捷预设</div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setConfig({ openaiBaseUrl: p.baseUrl, openaiModel: p.model })}
                    className="dd-btn !py-0.5 !px-2 text-[10px]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 配置表单 */}
          {isOpenAI ? (
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-xs text-dd-textMuted">API 地址 (Base URL)</span>
                <input
                  className="dd-input mt-1"
                  value={config.openaiBaseUrl}
                  onChange={(e) => setConfig({ openaiBaseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-dd-textMuted">API Key</span>
                <input
                  className="dd-input mt-1"
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) => setConfig({ openaiApiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </label>
              <label className="block">
                <span className="text-xs text-dd-textMuted">模型</span>
                <input
                  className="dd-input mt-1"
                  value={config.openaiModel}
                  onChange={(e) => setConfig({ openaiModel: e.target.value })}
                  placeholder="gpt-4o-mini"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-xs text-dd-textMuted">API 地址 (Base URL)</span>
                <input
                  className="dd-input mt-1"
                  value={config.anthropicBaseUrl}
                  onChange={(e) => setConfig({ anthropicBaseUrl: e.target.value })}
                  placeholder="https://api.anthropic.com/v1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-dd-textMuted">API Key</span>
                <input
                  className="dd-input mt-1"
                  type="password"
                  value={config.anthropicApiKey}
                  onChange={(e) => setConfig({ anthropicApiKey: e.target.value })}
                  placeholder="sk-ant-..."
                />
              </label>
              <label className="block">
                <span className="text-xs text-dd-textMuted">模型</span>
                <input
                  className="dd-input mt-1"
                  value={config.anthropicModel}
                  onChange={(e) => setConfig({ anthropicModel: e.target.value })}
                  placeholder="claude-3-5-haiku-latest"
                />
              </label>
            </div>
          )}

          {/* 高级参数 */}
          <label className="block">
            <span className="text-xs text-dd-textMuted">
              叙事温度（越高越有创意）: <span className="text-dd-gold">{config.temperature.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0.3}
              max={1.2}
              step={0.1}
              value={config.temperature}
              onChange={(e) => setConfig({ temperature: parseFloat(e.target.value) })}
              className="mt-2 w-full accent-[#c8a030]"
            />
          </label>

          {/* 测试连接 */}
          <div className="pt-1">
            <button
              onClick={handleTest}
              disabled={testing}
              className="dd-btn-primary w-full"
            >
              {testing ? '正在测试连接…' : '测试连接'}
            </button>
            {testResult && (
              <div
                className={clsx(
                  'mt-2 text-xs p-2.5 dd-panel',
                  testResult.ok ? 'text-dd-greenBright' : 'text-dd-redBright'
                )}
              >
                {testResult.ok ? '✓ ' : '✗ '}
                {testResult.message}
              </div>
            )}
          </div>

          <p className="text-dd-textDim text-[10px] leading-relaxed">
            密钥仅保存在浏览器本地（localStorage），不会上传到任何除你所填 API 地址之外的地方。
            切换存档、更换浏览器或清缓存后需重新配置。
          </p>

          <div className="flex justify-between pt-1">
            <button
              onClick={() => {
                resetConfig();
                setTestResult(null);
              }}
              className="dd-btn-danger !py-1 !px-3 text-[11px]"
            >
              恢复默认
            </button>
            <button onClick={onClose} className="dd-btn-primary !py-1 !px-4 text-[11px]">
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
