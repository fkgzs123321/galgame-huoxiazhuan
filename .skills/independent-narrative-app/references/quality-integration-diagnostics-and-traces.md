# 集成诊断与 Trace

## 导航

- [作用与输入](#作用)
- [分层、关联与关键链路](#方法)
- [强制覆盖矩阵](#4-建立强制覆盖矩阵)
- [Trace、复现与交接](#5-领域-trace)

## 作用

证明 Prompt、Lore、模型、Decode、Kernel、Save、Memory 和 UI 的交接端到端成立，并在“没生效”“状态不同步”“偶发重复”时把失败定位到唯一 owner。

## 读取条件

实现跨域垂直切片、阶段验收，或排查世界书/提示词未注入、变量未提交、UI 显示旧状态、流式重复、存档错乱和性能问题时读取。

## 前置输入

- 相关运行时契约、`Behavior Evidence Package`。
- 真实实现、可控夹具、日志/Trace 钩子和目标环境。
- 期望命令链、base/next revision、Profile/Output Contract 版本。

## 方法

### 1. 分层但不割裂

| 层级 | 证明什么 |
|---|---|
| 静态/结构 | 路由、链接、依赖方向和禁止调用仍存在 |
| 单元 | 纯规则、解析、选择、迁移等局部函数 |
| 契约 | Port 双方对 Schema、错误和版本理解一致 |
| 集成 | 多组件完成一次真实交接和失败传播 |
| E2E | 用户入口到可见结果、保存重开或发布包 |

每层结论只覆盖它实际运行的范围。结构脚本不能证明真实世界书注入或浏览器交互。

### 2. 使用关联 Trace

每次命令至少关联：`commandId`、`attemptId`、用户/界面来源、base revision、Prompt/Profile/Output Contract 版本、Lore/Memory 来源 revision、模型终态、Candidate 摘要、规则裁定、Save CAS/ACK 和 next revision。

正文可脱敏，但来源 ID、顺序、指纹、裁剪和错误原因必须足以定位。

### 3. 检查关键链路

```text
UI Command
→ Kernel admission / fixed snapshot
→ Prompt + Lore Trace
→ Gateway lifecycle / RawModelResponse
→ Decode / CandidateChangeSet
→ Rules / CommitRecord
→ Save CAS + durable ACK
→ Projection / History / Memory
```

每一跳验证生产者、输入版本、输出 Schema、失败语义和禁止越权。不能只看最终 UI“似乎对了”。

### 4. 建立强制覆盖矩阵

第一切片逐项登记以下场景；不能用一句“七类失败已覆盖”代替逐项证据：

| 场景 | 最少断言 |
|---|---|
| 正常回合 | 只提交一次，next revision、Trace、Projection 和 Save 一致 |
| 取消 | 按发送前/流式中/完整响应后/提交中区分，未提交时 revision 不变 |
| 模型失败 | 草稿和原始响应不进入正式状态，错误可重试性明确 |
| 解析失败 | Candidate 不成立，正式状态与存档不变 |
| 规则拒绝 | 非法正文/变化不提交，拒绝原因可定位 |
| revision conflict | 不静默 rebase 或覆盖，不重复调用模型 |
| 重复 commandId | 已提交返回原收据；in-flight 共享终态；不同 payload 为协议冲突 |
| 持久化失败 | 不发布 next revision，不重调模型 |
| CAS 结果未知 | 冻结并按原 commandId 对账，不猜测成功/失败 |
| durable 后取消 | 返回 alreadyCommitted/tooLate，不回滚或重新生成 |
| 保存、退出、重开 | 正文、事实、revision、收据和 Trace 恢复一致 |
| 损坏与恢复 | 保留损坏原件，验证备份/恢复预览；无安全来源时停止写入 |

每项状态只使用 `通过 / 失败 / 仅 Mock / 未验证 / 不适用`。`不适用`写明产品依据；`未验证`登记影响、延期条件、owner 和再验证入口。缺少场景、状态或证据时，Integration Evidence Package 不能建议“完整通过”。

在所有未提交失败中，断言 StreamDraft、RawModelResponse 和 CandidateChangeSet 均未进入正式 Projection、History、Memory 或导出存档。保存证据按 Save Contract 的实际等级报告，不把原子读回、数据库 ACK 或开发环境重开互相冒充。

### 5. 领域 Trace

- Prompt Trace：模块来源、role、Marker、顺序、预算和裁剪。
- Lore Trace：候选、命中、递归、排除、去重、预算和最终注入。
- State Trace：候选 diff、规则拒绝、CommitRecord 和 revision。
- Save Trace：CAS、ACK、对账、迁移和恢复。
- UI Trace：Command、overlay、错误反馈和 Projection revision。

### 6. 非确定与性能

对模型和随机选择保存输入、版本、种子/决策和多次运行分布。性能分解组装、首 token、流式、Decode、Save、Projection 和资源加载，不用单一总耗时猜原因。

### 7. 形成最小复现

从失败 Trace 提取最小快照、命令、相关配置和预期断言。去除无关内容但保留版本/权限/模式；修复后先跑最小复现，再跑受影响回归和真实入口。

## 唯一产物

`Integration Evidence Package`：测试层级矩阵、关联 Trace、强制覆盖矩阵、最小复现、根因定位、性能分解和证据等级。

## 轻量路径与升级

- 单切片：一条正常端到端 Trace、一个关键失败和保存重开。
- 跨系统、偶发、流式、并发、长会话或性能问题时增加完整关联、可控故障注入和多次运行。

## 交接与验证

- 根因回到唯一 owner 分册；修复证据交给 Stage/Release。
- 复核 Trace 关联完整、敏感信息已处理、失败可稳定复现、修复没有只掩盖 UI 症状。

## 不负责

不创作 RP 内容，不自行修改 Gate State，不把日志数量当正确性，也不以 Mock/静态结果冒充真实模型或真机验证。
