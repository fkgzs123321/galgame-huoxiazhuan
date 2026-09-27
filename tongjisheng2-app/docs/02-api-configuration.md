# 同级生2 独立前端卡 · API 配置指南

> 版本:v1.0 · 适用人群:玩家 / 部署者
> 本文详解 8 个 AI Profile 的端点配置、Sampler 参数、预设绑定与故障排查。

---

## 1. 总览:8AI 细粒度分工

应用采用 8AI 细粒度分工架构,每个 AI 职责单一,可绑定不同的模型/Key/Sampler。

| Profile ID | 名称 | 角色 | 阶段1启用 | 流式 | 输出 | 默认 maxContext | 默认 maxTokens | 默认 timeoutMs | 重试 |
|---|---|---|---|---|---|---|---|---|---|
| `main-chat` | 主聊天 AI | main-chat | ✓ | ✓ | 叙事正文 + `<StatusPlaceHolderImpl/>` | 32000 | 1500 | 60s | 3 |
| `var-update` | 变量 AI | var-update | ✓ | ✗ | `<UpdateVariable>` + `<UpdateTable>` | 32000 | 2000 | 90s | 3 |
| `opening` | 开局 AI | trigger | ✗ | ✓ | 开场叙事 + 占位符 | 32000 | 1500 | 60s | 3 |
| `plot-evolution` | 剧情演化 AI | trigger | ✗ | ✓ | 剧情推进叙事 + 占位符 | 32000 | 2000 | 60s | 3 |
| `npc-natural-action` | NPC 自然行动 AI | trigger | ✗ | ✗ | `<UpdateVariable>`(NPC 行动) + `<UpdateTable>` | 16000 | 1000 | 60s | 2 |
| `combat-settlement` | 战斗结算 AI | trigger | ✗ | ✗ | 战斗结算页 + `<UpdateVariable>` | 32000 | 2000 | 60s | 3 |
| `h-scene-settlement` | H 场景结算 AI | trigger | ✗ | ✗ | H 结算页 + `<UpdateVariable>` + `<UpdateTable>` | 32000 | 2500 | 90s | 3 |
| `worldview` | 世界观 AI | trigger | ✗ | ✗ | 世界观一致性审查报告 | 16000 | 1000 | 60s | 2 |

定义文件:[profiles.ts](../app/src/ai/profiles.ts)

---

## 2. 端点配置

### 2.1 字段说明

每个 AI Profile 包含以下端点字段:

```typescript
interface AiEndpoint {
  baseURL: string;    // OpenAI 兼容 baseURL,如 https://api.deepseek.com/v1
  apiKey: string;     // API Key(本地存 IndexedDB,不上传)
  model: string;      // 模型名,如 deepseek-chat
  presetId?: string;  // 绑定的预设 id(从已导入/内置预设中选择)
  preset?: PresetProfile; // 运行时解析
}
```

### 2.2 OpenAI 兼容端点列表(参考)

以下端点已通过验证,均可使用:

| 服务商 | baseURL | 示例 model |
|---|---|---|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` / `deepseek-reasoner` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` / `qwen-max` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` / `moonshot-v1-32k` |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` / `glm-4-flash` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` / `gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |
| 火山方舟 | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` |

> **协议要求**:端点必须支持 `POST /chat/completions`(OpenAI ChatCompletion 协议)。流式需支持 SSE `data:` 行格式。

### 2.3 推荐配置策略

#### 阶段1(最小可玩):2 个 AI 同端点

```yaml
main-chat:
  baseURL: https://api.deepseek.com/v1
  apiKey: sk-xxxxxxxx
  model: deepseek-chat
  presetId: builtin-romance-sim   # 内置恋爱模拟预设

var-update:
  baseURL: https://api.deepseek.com/v1   # 同端点
  apiKey: sk-xxxxxxxx                    # 同 Key
  model: deepseek-chat                   # 同模型
  presetId: builtin-original-default     # 内置原作默认预设
```

#### 阶段3(完整体验):8 个 AI 分层配置

```yaml
# 主聊天:强叙事能力
main-chat:        { provider: deepseek, model: deepseek-chat,        presetId: builtin-romance-sim }
# 变量更新:强指令遵循
var-update:       { provider: qwen,     model: qwen-plus,            presetId: builtin-original-default }

# 开局:同主聊天
opening:          { provider: deepseek, model: deepseek-chat,        presetId: builtin-romance-sim }
# 剧情演化:长上下文 + 推理
plot-evolution:   { provider: moonshot, model: moonshot-v1-32k,      presetId: builtin-romance-sim }

# NPC 自然行动:轻量 + 快速
npc-natural-action: { provider: zhipu,  model: glm-4-flash,          presetId: builtin-original-default }
# 战斗结算:指令遵循
combat-settlement:  { provider: qwen,   model: qwen-plus,            presetId: builtin-original-default }
# H 场景结算:长输出 + 风格化
h-scene-settlement: { provider: deepseek, model: deepseek-chat,      presetId: builtin-romance-sim }
# 世界观审查:轻量
worldview:         { provider: zhipu,   model: glm-4-flash,          presetId: builtin-original-default }
```

---

## 3. 预设系统

### 3.1 内置预设

应用内置 2 套预设(位于 `src/content/presets/builtin-presets.ts`):

| 预设 ID | 名称 | 用途 |
|---|---|---|
| `builtin-original-default` | 原作默认 | 忠实保留 ST 原卡 Sampler + Prompt 顺序 |
| `builtin-romance-sim` | 恋爱模拟 | 增强叙事风格 + 第一人称 + 口语化 |

### 3.2 导入 ST 预设

支持导入 SillyTavern 导出的预设 JSON:

1. 配置页 → "预设" → "导入"
2. 选择 ST 预设 JSON 文件
3. 导入器自动映射:
   - `prompts[]` → Prompt 条目
   - `prompt_order` → 注入顺序
   - `sampler` → Sampler 参数(temperature/top_p/top_k/max_tokens 等)
   - `context` → 上下文设置
   - `instruct` → 指令模式设置

### 3.3 预设编辑器(阶段3)

- 配置页 → "预设编辑器" → 实时编辑 Prompt 顺序与 Sampler
- 支持拖拽排序
- 实时预览组装后的 Prompt
- 导出为 JSON(可分享)

### 3.4 预设快捷切换

- 右侧"快捷切换"按钮 → 弹出预设列表
- 切换后立即生效,无需重启

### 3.5 Sampler 参数

```typescript
interface PresetSampler {
  temperature: number;    // 0.0 ~ 2.0,默认 0.8
  top_p: number;          // 0.0 ~ 1.0,默认 0.95
  top_k: number;          // 0 ~ 100,默认 40
  max_tokens: number;     // 输出上限
  presence_penalty: number; // -2.0 ~ 2.0
  frequency_penalty: number; // -2.0 ~ 2.0
  stop: string[];         // 停止序列
  seed?: number;          // 种子(可复现)
}
```

**推荐值**:

| Profile | temperature | top_p | max_tokens |
|---|---|---|---|
| main-chat | 0.85 | 0.95 | 1500 |
| var-update | 0.3 | 0.9 | 2000 |
| opening | 0.9 | 0.95 | 1500 |
| plot-evolution | 0.8 | 0.95 | 2000 |
| npc-natural-action | 0.5 | 0.9 | 1000 |
| combat-settlement | 0.4 | 0.9 | 2000 |
| h-scene-settlement | 0.85 | 0.95 | 2500 |
| worldview | 0.2 | 0.85 | 1000 |

---

## 4. 上下文预算

### 4.1 单次调用预算

每个 AI Profile 有默认预算(可被预设覆盖):

- `maxContext`:总上下文 token 上限(包含输入 + 输出)
- `maxTokens`:输出 token 上限

### 4.2 8AI 全并行预算(阶段4)

回合级总预算默认 **15s**:

```typescript
await modelGateway.invokeManyWithBudget(
  requests,
  {
    maxConcurrency: 4,        // 最大并发(避免端点 429)
    totalBudgetMs: 15000,     // 回合总预算
    shouldAbort: (completed, total) => {
      // 主聊天 AI 失败则早退
      return !!completed['main-chat'] && !completed['main-chat'].ok;
    },
  },
);
```

性能指标(可验证):

- `p50Ms` / `p95Ms` / `maxMs` / `totalElapsedMs`
- `succeeded` / `failed` / `timedOut` / `aborted`
- `withinBudget`:是否在 15s 内

---

## 5. Prompt 组装策略

每个 AI Profile 通过 `PromptAssemblyStrategy` 控制组装:

```typescript
interface PromptAssemblyStrategy {
  includeD0Controller: boolean;       // D0 系统控制器输出
  includeWorldbookBefore: boolean;    // 世界书前置(constant)
  includeWorldbookAfter: boolean;     // 世界书后置(at_depth)
  includeCharProfile: boolean;        // 角色档案
  includeChatHistory: boolean;        // 聊天历史
  includeMemorySummary: boolean;      // Memory 摘要
  includeVariableOutputFormat: boolean; // 变量输出格式说明
  includeStatDataSnapshot: boolean;   // 当前 stat_data 快照
  worldbookPrefixFilter: 'mvu_plot' | 'mvu_update' | 'both' | 'none';
}
```

### 5.1 双 AI 路由规则

| 前缀 | 路由 | 说明 |
|---|---|---|
| `[mvu_plot]` | 只发 main-chat | 剧情相关条目 |
| `[mvu_update]` | 只发 var-update | 变量更新规则条目 |
| 无前缀 | 双发 | 通用条目 |

变量 AI 必须先接收当前 `stat_data` 真实结构(包在 `<status_current_variables>` 标签内),再读取 `[mvu_update]` 规则。

### 5.2 Prompt 顺序(典型 main-chat)

```
1. [System] 系统指令(身份 / 风格 / 输出格式)
2. [Worldbook Before] constant 蓝灯条目(核心铁律 / 防口胡 / D0 控制器输出)
3. [Char Profile] 当前场景角色档案(由 getwi 按时段拉取)
4. [Memory Summary] 历史摘要(压缩长程记忆)
5. [Chat History] 最近 N 轮对话
6. [User] 玩家当前输入
```

---

## 6. 模型网关行为

### 6.1 调用流程

文件:[model-gateway.ts](../app/src/runtime/model-gateway.ts)

```
1. invoke(req) 入口
2. 端点校验(baseURL/apiKey/model 必填)
3. 合并 sampler(预设 + samplerOverride)
4. 重试循环(attempt 0..maxRetries):
   - 流式: invokeStream(SSE 解析)
   - 非流式: invokeNonStream(完整 JSON)
   - 失败: 指数退避(1s/2s/4s)
5. 推送 trace 到 traceBus
6. 返回 GatewayResult
```

### 6.2 重试策略

- 默认重试 3 次
- 指数退避:`1000 * 2^attempt` ms
- 最后一次失败返回错误,不阻塞其他 AI

### 6.3 超时处理

- 单次调用超时:`profile.timeoutMs`
- 回合总预算超时:`totalBudgetMs`(默认 15s)
- 超时后未完成请求走降级结果(标记 `timedOut`)

### 6.4 错误分类

| 错误 | 处理 |
|---|---|
| 网络错误 | 重试 |
| 401 Unauthorized | 不重试,提示用户检查 Key |
| 429 Too Many Requests | 指数退避重试 |
| 5xx | 重试 |
| 解析错误 | 不重试,标记失败 |
| 超时 | 不重试,降级返回 |

---

## 7. 真实模型边界验证

应用内置"真实模型边界"测试套件(开发者模式 → E2E 验证 → 真实模型边界 tab):

| 用例 ID | 名称 | 验证内容 |
|---|---|---|
| r1 | 连通性 | POST /chat/completions 基本可达 |
| r2 | 流式 | SSE `data:` 行可解析 |
| r3 | 非流式 | 完整 JSON 返回 |
| r4 | 并行 2 路 | 主聊天 + 变量 AI 并行 |
| r5 | 并行 8 路 | 8AI 全并行(可选,需勾选) |
| r6 | 超时 | AbortController 在 timeoutMs 内中止 |
| r7 | 重试 | 模拟 5xx → 自动重试 |

**使用方法**:

1. 进入 E2E 验证面板 → 真实模型边界 tab
2. 填入 baseURL / apiKey / model(本地输入,不上传)
3. 选择是否测试 8 路并行
4. 点击"运行全部"或单用例运行
5. 查看断言详情与浏览器环境支持矩阵

---

## 8. 故障排查

### 8.1 端点配置错误

**症状**:配置页提示"AI 端点未配置(需要 baseURL/apiKey/model)"

**排查**:

- 检查 baseURL 是否包含 `/v1` 后缀(部分端点需手动加)
- 检查 apiKey 是否以正确前缀开头(如 `sk-`)
- 检查 model 拼写

### 8.2 CORS 错误

**症状**:浏览器控制台报 CORS 错误

**排查**:

- 确认端点服务支持 CORS(允许浏览器跨域调用)
- DeepSeek/Qwen/Moonshot 等主流端点默认支持 CORS
- 自托管端点需配置 `Access-Control-Allow-Origin`

### 8.3 429 速率限制

**症状**:并发调用返回 429

**排查**:

- 降低 `maxConcurrency`(默认 4,可调到 2)
- 升级端点配额
- 切换到限制更宽松的端点

### 8.4 流式不显示

**症状**:主聊天 AI 不流式输出,等很久才一次出现

**排查**:

- 检查 `profile.outputProtocol.stream` 是否为 `true`
- 检查端点是否支持 `stream: true` 参数
- 检查浏览器是否支持 ReadableStream(E2E 验证面板浏览器环境条)

### 8.5 变量 AI 不更新状态

**症状**:叙事正常但状态栏不变化

**排查**:

- 检查变量 AI 端点是否配置
- 检查输出是否包含 `<UpdateVariable>` 标签
- 检查 JSONPatch 操作符是否为 `add`/`replace`/`remove`(禁用 `delta`/`insert`)
- 检查变量路径是否使用角色真名(不加 `/stat_data` 前缀)
- 查看变量监视器(开发者模式 → 步骤8)

### 8.6 8AI 全并行超时

**症状**:回合超过 15s,部分 AI 标记为 `timedOut`

**排查**:

- 查看 E2E 验证 → 真实模型边界 → r5 并行 8 路测试结果
- 降低 `maxConcurrency`
- 切换到响应更快的端点(如 glm-4-flash)
- 提高 `totalBudgetMs`(配置页 → 高级)

---

## 9. 安全注意事项

- **API Key 仅存浏览器 IndexedDB**,不上传任何服务器
- 应用无后端,所有调用由浏览器直接发起
- Service Worker **不缓存跨域 API 响应**(参见 `NEVER_CACHE` 列表)
- 不要在公共电脑上保存 Key;用完清除浏览器数据
- 推荐为每个 AI 创建独立 Key,按需设置用量上限

---

## 10. 相关文档

- [用户手册](./01-user-manual.md):完整功能介绍
- [MOD 开发指南](./03-mod-development.md):自定义内容包
- 8AI Profile 定义:[profiles.ts](../app/src/ai/profiles.ts)
- 模型网关实现:[model-gateway.ts](../app/src/runtime/model-gateway.ts)
- 真实模型验证器:[real-model-verifier.ts](../app/src/runtime/real-model-verifier.ts)
