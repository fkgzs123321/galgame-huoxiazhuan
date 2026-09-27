// AI 叙事层配置存储
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AiProvider = 'openai' | 'anthropic';

export interface AiConfig {
  enabled: boolean;            // 主开关：关闭时游戏完全程序化运行
  provider: AiProvider;        // 当前使用的供应商适配器
  openaiBaseUrl: string;       // OpenAI 兼容端点（OpenAI/DeepSeek/Ollama/NewAPI 等）
  openaiApiKey: string;
  openaiModel: string;
  anthropicBaseUrl: string;    // Anthropic Messages 端点
  anthropicApiKey: string;
  anthropicModel: string;
  temperature: number;         // 叙事采样温度
  maxTokens: number;           // 单次叙事最大输出 token
  timeoutMs: number;           // 请求超时（毫秒）
  stream: boolean;             // 是否使用流式输出（部分端点不支持流式）
}

export interface AiTestResult {
  ok: boolean;
  message: string;
}

interface AiStore {
  config: AiConfig;
  testing: boolean;
  setConfig: (patch: Partial<AiConfig>) => void;
  resetConfig: () => void;
  testConnection: () => Promise<AiTestResult>;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  provider: 'openai',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  anthropicBaseUrl: 'https://api.anthropic.com/v1',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-haiku-latest',
  temperature: 0.9,
  maxTokens: 300,
  timeoutMs: 30000,
  stream: true,
};

export const useAiStore = create<AiStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_AI_CONFIG,
      testing: false,

      setConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),

      resetConfig: () => set({ config: DEFAULT_AI_CONFIG }),

      testConnection: async () => {
        const { config } = get();
        set({ testing: true });
        try {
          // 动态导入网关，避免循环依赖
          const { testAiConnection } = await import('@/gateway/aiGateway');
          return await testAiConnection(config);
        } catch (err) {
          return {
            ok: false,
            message: err instanceof Error ? err.message : String(err),
          };
        } finally {
          set({ testing: false });
        }
      },
    }),
    {
      name: 'dd-ai-config',
      version: 1,
    }
  )
);
