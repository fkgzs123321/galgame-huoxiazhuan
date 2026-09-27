# Prompt 组装与上下文预算

## 作用

把 `Prompt Policy Package`、正式状态、历史、记忆和世界书选择计划装配成一次可追踪的模型输入。这里决定消息 role、Marker、顺序、来源版本、预算和裁剪，不创作行为政策正文。

## 读取条件

完整应用需要调用生成模型，或需要排查提示词顺序、世界书未注入、上下文超限、规则被裁掉和多 Profile 串扰时读取。

## 前置输入

- `Prompt Policy Package`、`Host Foundation Contract`。
- `CommittedSnapshot@baseRevision`、`Memory-History Contract`、`Lore Runtime Contract`。
- 目标 `Executable Profile Contract` 的能力和上下文上限；若它尚未形成，先记录假设并交由 Profile 分册确认。

## 方法

### 1. 固定一次 Assembly 输入

每次组装先固定 `commandId`、`attemptId`、`baseRevision`、内容包版本、Profile 版本、消息窗口、Memory 版本和 Lore 选择结果。组装期间不得读取更新于 base revision 的正式状态，也不得因流式输出重新选择 Lore。

### 2. 建立 Assembly Plan

每个块至少记录：稳定 ID、来源 owner、消息 role、Marker/位置意图、作用域、优先级、是否允许裁剪、估算 token 和内容指纹。推荐基础顺序是：

```text
宿主与安全边界
→ AI 职责及玩家主权
→ 世界/角色核心与内容模式
→ 当前正式状态和确定性规则
→ 世界书注入块
→ 历史与记忆
→ 当前用户命令
→ 输出协议与最终检查
```

这只是基线。项目可以调整，但必须把政策优先级映射到 role、Marker 和位置，并用冲突案例验证，而不是只相信“越靠前越强”。

### 3. 区分消息 role 与语义 Marker

`system`、`developer`、`user`、`assistant` 等 role 由目标模型 API 能力决定；角色卡字段、World Info、历史、状态、示例和 Prefill 使用稳定 Marker 标明语义来源。不要把模型供应商的 role 名称当作作品内部权威层级。

### 4. 分配上下文预算

先保留不能破坏的不变量，再分配可变内容：

- 必保留：安全/授权边界、玩家主权、输出协议、当前命令和关键正式状态。
- 高优先：当前场景相关角色、世界规则、命中的关键 Lore。
- 可压缩：较远历史、重复人物说明、低相关 Lore、冗长示例。
- 可移除：诊断注释、重复政策、与当前命令无关的高级模块。

预算至少预留输出空间和供应商格式开销。不得用字符数冒充精确 token；未知 tokenizer 时采用保守估算并记录误差来源。

### 5. 使用确定性裁剪

按完整语义块裁剪，优先去重和摘要，再缩短窗口。关键规则不可半截截断；任何被删除、压缩或降级的块都进入 Prompt Trace。预算不足以保留不变量时应停止或切换 Profile，而不是静默发送残缺 Prompt。

### 6. 规定宏和模板求值阶段

先完成来源选择和权限过滤，再按 `Macro Compatibility Contract` 在明确作用域中求值，最后计算实际预算并装配消息。未知宏保留原文并报告；不能为了节省 token 自动删除未知表达式。

### 7. 生成 Prompt Trace

Trace 至少包含：输入版本、最终消息链、每块来源/顺序/role/Marker、宏求值结果摘要、预算前后 token 估算、裁剪原因和输出契约版本。敏感正文应可脱敏或只记录指纹。

缓存只能复用内容指纹、权限、模式、Profile 和来源 revision 均相符的块；缓存命中不得绕过当前模式或认知边界。

## 唯一产物

`Prompt Assembly Contract`：Assembly Plan Schema、消息 role/Marker 映射、固定顺序、来源版本、预算/裁剪策略、宏求值阶段、缓存边界和 Prompt Trace Schema。

## 轻量路径与升级

- 单模型小项目：固定顺序、最近历史窗口、常驻/关键词 Lore、基础预算和一份 Trace。
- 多 Profile、复杂 Marker、多认知作用域、长会话、缓存或频繁超限时升级为分块预算、确定性摘要和版本化组装测试。

## 交接与验证

- 最终 Assembly 交给 Executable Profile 和 Model Gateway；Trace 交给 Integration Diagnostics。
- 验证 role/顺序、正反 Lore 命中、秘密隔离、预算边界、裁剪稳定性、重复模块和 base revision 一致性。

## 不负责

不创作 Prompt 政策、人物设定和世界书正文，不解释模型响应，不提交状态，也不实现供应商网络请求。
