// AI 设置面板 — 模型接口/预设/模型列表/流式/超时（对接 aiStore）
import { useState } from 'react';
import { useAiStore } from '@/stores/aiStore';
import { SettingsSection, SettingRow } from './SettingsPanelBase';
import { Button, TextInput, SelectInput, NumberInput, Toggle, Badge } from '@/ui';
import { listOpenAiModels } from '@/gateway/aiGateway';

// 常用供应商预设（一键填充）
const PROVIDER_PRESETS: { name: string; baseUrl: string; model: string }[] = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'NewAPI / OneAPI', baseUrl: 'https://你的域名/v1', model: 'gpt-4o-mini' },
  { name: 'Ollama（本地）', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5' },
  { name: 'Moonshot Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
];

export function AiSettings() {
  const { config, setConfig, resetConfig, testing, testConnection } = useAiStore();
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelMsg, setModelMsg] = useState('');
  const [testResult, setTestResult] = useState<string>('');

  const applyPreset = (name: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.name === name);
    if (!preset) return;
    setConfig({
      provider: 'openai',
      openaiBaseUrl: preset.baseUrl,
      openaiModel: preset.model,
    });
    setModels([]);
    setModelMsg(`已填入 ${preset.name} 预设，请补充 API Key`);
  };

  const fetchModels = async () => {
    if (!config.openaiApiKey.trim()) {
      setModelMsg('请先填写 API Key');
      return;
    }
    setLoadingModels(true);
    setModelMsg('');
    try {
      const list = await listOpenAiModels(config);
      setModels(list);
      setModelMsg(list.length > 0 ? `获取到 ${list.length} 个模型` : '该服务未返回模型列表（部分端点不支持 /models）');
    } catch (err) {
      setModelMsg(err instanceof Error ? `获取失败：${err.message}` : String(err));
    }
    setLoadingModels(false);
  };

  const runTest = async () => {
    setTestResult('测试中…');
    const r = await testConnection();
    setTestResult(r.ok ? `✓ ${r.message}` : `✗ ${r.message}`);
  };

  return (
    <SettingsSection
      title="◆ AI 叙事接口"
      extra={
        <span className="flex items-center gap-2">
          {config.enabled ? <Badge tone="green">已启用</Badge> : <Badge tone="gray">程序化模式</Badge>}
          {config.stream ? <Badge>流式</Badge> : <Badge tone="gold">非流式</Badge>}
        </span>
      }
    >
      <SettingRow label="启用 AI 叙事" hint="关闭后游戏完全程序化运行">
        <Toggle checked={config.enabled} onChange={(v) => setConfig({ enabled: v })} />
      </SettingRow>

      <SettingRow label="接口供应商">
        <SelectInput
          value={config.provider}
          onChange={(v) => setConfig({ provider: v as 'openai' | 'anthropic' })}
          options={[
            { value: 'openai', label: 'OpenAI 兼容（DeepSeek/Ollama/NewAPI…）' },
            { value: 'anthropic', label: 'Anthropic Messages' },
          ]}
        />
      </SettingRow>

      {config.provider === 'openai' ? (
        <>
          <SettingRow label="供应商预设" hint="一键填充 Base URL 与模型">
            <SelectInput
              value=""
              onChange={applyPreset}
              options={[{ value: '', label: '选择预设…' }, ...PROVIDER_PRESETS.map((p) => ({ value: p.name, label: p.name }))]}
            />
          </SettingRow>
          <SettingRow label="Base URL" hint="OpenAI 兼容端点，如 https://api.deepseek.com/v1">
            <TextInput className="w-72" value={config.openaiBaseUrl} onChange={(v) => setConfig({ openaiBaseUrl: v })} />
          </SettingRow>
          <SettingRow label="API Key">
            <TextInput className="w-72" type="password" value={config.openaiApiKey} onChange={(v) => setConfig({ openaiApiKey: v })} />
          </SettingRow>
          <SettingRow label="模型" hint={modelMsg || '可手动填写，或点「获取模型列表」自动拉取'}>
            <div className="flex gap-2">
              <TextInput className="w-56" value={config.openaiModel} onChange={(v) => setConfig({ openaiModel: v })} />
              <Button size="sm" variant="ghost" onClick={() => void fetchModels()} disabled={loadingModels}>
                {loadingModels ? '获取中…' : '获取模型列表'}
              </Button>
            </div>
          </SettingRow>
          {models.length > 0 && (
            <div className="flex flex-wrap gap-1 px-4 pb-1 -mt-1">
              {models.slice(0, 20).map((m) => (
                <button
                  key={m}
                  onClick={() => setConfig({ openaiModel: m })}
                  className={`text-[10px] px-1.5 py-0.5 border rounded-sm transition-colors ${
                    m === config.openaiModel
                      ? 'border-dd-gold text-dd-gold'
                      : 'border-dd-gold/20 text-dd-textMuted hover:border-dd-gold/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <SettingRow label="Base URL">
            <TextInput className="w-72" value={config.anthropicBaseUrl} onChange={(v) => setConfig({ anthropicBaseUrl: v })} />
          </SettingRow>
          <SettingRow label="API Key">
            <TextInput className="w-72" type="password" value={config.anthropicApiKey} onChange={(v) => setConfig({ anthropicApiKey: v })} />
          </SettingRow>
          <SettingRow label="模型">
            <TextInput className="w-72" value={config.anthropicModel} onChange={(v) => setConfig({ anthropicModel: v })} />
          </SettingRow>
        </>
      )}

      <SettingRow label="流式输出" hint="关闭后使用非流式请求（兼容不支持 SSE 的端点）">
        <Toggle checked={config.stream} onChange={(v) => setConfig({ stream: v })} />
      </SettingRow>
      <SettingRow label="采样温度">
        <NumberInput min={0} max={2} step={0.1} value={config.temperature} onChange={(v) => setConfig({ temperature: v })} />
      </SettingRow>
      <SettingRow label="最大输出 token">
        <NumberInput min={50} max={4000} step={50} value={config.maxTokens} onChange={(v) => setConfig({ maxTokens: v })} />
      </SettingRow>
      <SettingRow label="请求超时（毫秒）">
        <NumberInput min={5000} max={180000} step={1000} value={config.timeoutMs} onChange={(v) => setConfig({ timeoutMs: v })} />
      </SettingRow>

      <div className="flex gap-2 pt-2 items-center">
        <Button variant="primary" disabled={testing} onClick={() => void runTest()}>
          {testing ? '测试中…' : '测试连接'}
        </Button>
        <Button variant="ghost" onClick={resetConfig}>恢复默认</Button>
        {testResult && (
          <span className={`text-xs whitespace-pre-wrap ${testResult.startsWith('✓') ? 'text-emerald-300' : 'text-red-300'}`}>
            {testResult}
          </span>
        )}
      </div>

      <div className="pt-1 text-[10px] text-dd-textDim leading-relaxed">
        提示：若提示「无法连接」——先确认 Base URL 带 /v1 且可访问；本地 Ollama 需将地址设为 http://localhost:11434/v1；
        若返回「400 参数错误」——部分端点不支持流式，请在下方关闭「流式输出」重试。
      </div>
    </SettingsSection>
  );
}
