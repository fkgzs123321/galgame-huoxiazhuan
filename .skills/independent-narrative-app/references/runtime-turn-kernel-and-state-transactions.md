# 回合 Kernel 与状态事务

## 作用

建立 Command、候选事实、规则裁定、revision、幂等、原子提交和正式发布的唯一权威链。正式状态只能由 Kernel 协调并在 Save 耐久确认后发布。

## 读取条件

存在回合推进、正式状态、确定性规则、跨系统提交、重试或并发时读取。纯文字项目使用同一语义的轻量实现。

## 前置输入

- `Host Foundation Contract`、`Narrative Contract`、`Gameplay-Narrative Contract`。
- Command 需求、状态字段、规则、Save 能力和 UI 反馈要求。

## 方法

### 1. 定义四态

| 状态 | 含义 | 禁止事项 |
|---|---|---|
| `StreamDraft` | 流式显示层 | 不进入规则、Memory、Projection 或正式 Save |
| `RawModelResponse` | 完整但不可信的模型响应 | 不是世界事实，不直接提交 |
| `CandidateChangeSet` | 经 Output Contract 解码的正文与候选变化 | 未裁定、未耐久前不得成为当前状态 |
| `CommittedTurn/CommittedFacts` | Save ACK 或对账确认后的正式结果 | History、Memory、Projection 的唯一来源 |

### 2. 命令契约

每个 Command 携带：稳定 `commandId`、类型、规范化 payload、`expectedRevision`、actor、来源、权限和时间/顺序信息。相同 ID + 相同 payload 返回同一 in-flight/终态；相同 ID + 不同 payload 是协议冲突。

命令接纳必须按以下顺序执行：

```text
规范化 commandId 与 payload 并计算 fingerprint
→ 查询已提交 Command Receipt 与 in-flight 记录
  → 相同 ID + 相同 fingerprint：返回原收据或等待同一终态
  → 相同 ID + 不同 fingerprint：PROTOCOL_CONFLICT
→ 只有未见过的 commandId 才校验 expectedRevision、权限和确定性前置规则
→ 固定快照并进入 Prompt/Model/Candidate 链
```

不得让已提交命令仅因携带旧 `expectedRevision` 被误判为全新 revision conflict。并发到达的相同命令只能共享一次模型调用与提交；不能先并发生成两次，再依靠 Save conflict 收尾。

Command Receipt 至少关联 fingerprint、base/next revision、终态、CommitRecord/ACK 引用和可安全返回的结果摘要。状态后来继续前进时，幂等重放返回该命令自己的收据，不能用当前 `lastTrace` 或最新 Projection 冒充原结果。

### 3. 权威链

```text
Command admission
→ 已提交/in-flight 幂等查询
→ 新命令的 revision/权限/确定性前置规则
→ 固定 CommittedSnapshot@expectedRevision
→ Prompt Assembly → Model Gateway
→ Decode/Validate → CandidateChangeSet
→ Kernel 业务裁定 → CommitRecord
→ Save(commandId, expectedRevision) CAS
→ durable ACK/reconciliation
→ Kernel 发布 nextRevision
→ Projection/History/Memory 消费
```

Kernel 不装配 Prompt、不调用模型、不解释 Output Contract、不实现数据库。它拥有接纳、裁定、提交协调和正式发布。

### 4. 原子与副作用

一个回合的正式正文、状态 diff、事件、资源结算和生成记录必须作为同一 CommitRecord 成功或失败。外部不可回滚副作用使用 outbox/已提交事件驱动，不在 ACK 前执行。

### 5. 失败语义

- 取消、模型失败、解析失败、规则拒绝：未提交时 revision 不变；终态后重新生成使用新 commandId。
- revision conflict：不自动 rebase 候选；读取新快照后以新 commandId 重新装配和生成。
- 持久化确认失败：只重试同一 CommitRecord 和 commandId，不重调模型。
- CAS 已发出但结果未知：冻结该命令，按原 commandId 对账；确认落盘后发布，确认未落盘后才允许处理后续策略。
- durable 后取消：返回 `alreadyCommitted/tooLate`，不得回滚或重复生成。
- ACK 丢失或进程重启：先按 saveId + commandId 恢复原收据；不得把旧 revision 重试自动改写成新 commandId。
- 部分接受只有在产品明确允许时才构造新 candidate 并完整重验，禁止静默丢弃非法项。

## 唯一产物

`Turn-State Transaction Contract`：Command、状态 Schema 权限、四态、规则裁定、CommitRecord、revision/CAS、幂等、失败、提交事件和发布协议。

## 轻量路径与升级

- 单线程本地项目仍使用 commandId、expectedRevision 和一次原子写入。
- 跨系统事务、并发入口、后台任务、分支/重投或外部副作用时升级 outbox、reconciliation 和冲突策略。

## 交接与验证

- UI 只发 Command/读 Projection；Save 只耐久提交；Memory 只读 committed event。
- 覆盖正常、取消、模型失败、解析失败、规则拒绝、revision conflict、重复 ID（已提交/in-flight/不同 payload）、持久化失败、ACK 丢失、结果未知对账和 durable 后取消。

## 不负责

不定义角色/剧情内容、Prompt/模型实现、UI 呈现、Output Decode 或数据库供应商。
