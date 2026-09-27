# 模型网关与流式生命周期

## 作用

用统一 Port 接入远程 API、本地模型或多任务模型，负责请求、流式、取消、超时、重试、错误归一和能力路由。Gateway 只交付原始/标准化响应，不提交剧情或状态。

## 读取条件

项目接入任一生成模型时读取；多供应商、多模型、第二 API、复杂流式、离线和降级按需展开。

## 前置输入

- `Executable Profile Contract`、`Prompt Assembly Contract`。
- `Trust-Dataflow Contract`、`Platform-Asset Port Contract`。
- 任务类型、延迟/费用边界、取消体验和供应商真实能力证据。

## 方法

### 1. 定义 Gateway Port

请求至少携带 `commandId`、`attemptId`、Profile/Output Contract 版本、已装配消息、任务类型、超时、流式/非流式选择和取消信号。响应统一为生命周期事件、用量、完成原因、原始正文和供应商诊断元数据。

供应商适配器负责协议差异；上层不直接依赖供应商字段、SDK 异常类型或浏览器全局对象。

### 2. 管理流式状态

```text
queued → connecting → streaming → completed
                  ↘ cancelled / timed_out / failed
```

chunk 只形成 `StreamDraft`。收到明确完成信号并通过完整性检查后，才生成 `RawModelResponse` 交给 Decode。取消、超时或失败后的迟到 chunk/response 只能进入诊断记录，不能更新 UI 正式投影或继续提交。

### 3. 取消和超时

取消必须贯穿 UI → Gateway → 供应商适配器，并区分“请求尚未发送、传输中、响应已完成、已经耐久提交”。Gateway 只能取消模型工作；是否已经提交由 Kernel 返回。连接、首 token、总时长和空闲流可使用不同超时。

### 4. 重试与幂等

- 连接失败、限流和可重试服务错误使用有界退避与抖动。
- 已收到不确定数量 token 后默认不自动重试生成，除非新 attempt 明确替换草稿。
- 解析失败不是 Gateway 网络重试理由。
- 持久化失败绝不能重调模型，应重试原 CommitRecord。
- 每次供应商调用使用唯一 attemptId，方便识别迟到响应和费用。

### 5. 错误归一

至少区分：鉴权、权限/政策、限流、连接、超时、取消、上游服务、能力不支持、上下文超限、响应截断和未知错误。保留安全的供应商细节供诊断，给 UI 提供稳定错误码、可重试性和建议动作。

### 6. 任务与模型路由

按正文生成、摘要、检索辅助、图像或其他任务声明能力需求和降级链。选择依据必须来自配置和能力探测，不用模型名称猜测。第二 API 与主剧情任务要有独立 Profile、预算、权限和 Trace。

### 7. 可观察性

记录供应商/模型别名、attemptId、延迟阶段、token/费用、完成原因、重试、取消、错误码和响应指纹。日志不得保存明文密钥；敏感 Prompt/响应正文遵守 Trust Contract。

## 唯一产物

`Model Gateway Contract`：Gateway Port、供应商适配器边界、任务路由、能力探测、流式生命周期、取消/超时/重试、错误模型、降级和观测字段。

## 轻量路径与升级

- 单供应商：一个适配器、请求/取消、完整响应、基础流式和稳定错误码。
- 多供应商、多任务、第二 API、本地离线或复杂降级时增加能力矩阵、路由策略和成本守卫。

## 交接与验证

- `StreamDraft` 交给 UI overlay；完整 `RawModelResponse` 交给 Output Decode；错误交给 UI/Trace。
- 使用可控假服务覆盖正常、慢首 token、流中断、取消、迟到 chunk、限流、超时、截断和重试上限；断言只产生一次终态。

## 不负责

不创作 Prompt，不解释业务字段，不裁定候选事实，不写数据库，也不在 Gateway 内保存平台密钥 UI 状态。
