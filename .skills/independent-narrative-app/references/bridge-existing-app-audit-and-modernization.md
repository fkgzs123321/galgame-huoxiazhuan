# 已有独立应用审计与渐进改造

## 作用

在保留既有玩法与用户可见行为的前提下，审计状态权威、跨层飞线、持久化、AI 调用和 Legacy 依赖，并设计可回退的垂直迁移路线。

## 读取条件

接手、诊断、重构或继续建设已有独立 RP 应用时读取，尤其适用于“功能能跑但难维护”“UI 直接写库”“多个系统状态不同步”或准备脱离 Web 宿主的项目。

## 前置输入

- Task Envelope、真实仓库/构建产物、运行环境、可观察行为和已知限制。
- 用户明确要求保留/改变的玩法，以及允许动作和禁止范围。
- 现有测试、日志、存档样本、版本历史和部署证据。

## 方法

### 1. 先补行为证据

复现目标流程和故障，记录当前行为、输入、环境、输出和存档变化。现有 `scripts/*.mjs` 一类结构守卫只能证明代码形状，不能代替真实行为、集成或浏览器/真机证据。

把现状分为：确认要保持、确认要修、未知但高风险、明确不在范围。不要趁架构改造顺手改变玩法内容。

### 2. 画受影响依赖切片

从用户动作反向追踪 UI → workflow → Prompt/Lore → AI adapter → parser → state → database → Projection。标出：

- 谁能修改正式状态，是否存在多个权威。
- UI 是否直接访问 `dbService`、AI adapter 或内部 workflow。
- 流式草稿、候选变化和已提交事实是否混用。
- 保存成功点、revision、幂等、reroll 和恢复语义。
- 世界书、Prompt、Memory 和玩法系统之间的输入输出。
- Legacy 入口、feature flag 和兼容层的真实消费者。

### 3. 建立目标接口接缝

先定义全异步 Kernel/Port Contract 和临时 Legacy Adapter，统一入口但不立即重写核心逻辑。契约必须能被 in-process、Worker、Tauri 或 Cloud Host 调用，不能泄漏 UI/数据库私有类型。

### 4. 选择首个原生垂直切片

优先迁移一次 AdvanceTurn：AI 流式输出 → 完整响应 → Decode → 候选变化 → Kernel 裁定 → Save CAS/ACK → Projection。用它验证 revision conflict、取消、解析失败、原子提交和恢复，而不是先横向迁完所有模块。

### 5. 收回状态与持久化权

正式状态只由 Kernel 在耐久确认后发布；UI 改为 Command + Projection。引入 commandId 幂等、expectedRevision CAS 和结果不明对账。随后迁移 reroll、save/load、Schema migration 和崩溃恢复，默认保持线性 revision。

### 6. 按领域逐段迁移

按照真实依赖和风险迁移变量规则、叙事/Memory、玩法系统、媒体资源、设置/预设等；每一段都完成行为基线、接口、实现、存档和联动验证。领域名称由项目决定，不能把某个示例系统当固定清单。

### 7. 清除剩余飞线

当消费者都已迁移后，移除 UI 对数据库、AI adapter、Kernel 私有实现和内部 workflow 的直接依赖。只有真实隔离、性能、部署或安全需求出现时，才选择 Worker、Tauri 或 Cloud；in-process 可以是最终正确 Host。

### 8. 最后删除 Legacy

先用依赖扫描、回归和旧档回放证明没有消费者，再删除 Legacy Adapter、旧入口、feature flag 和兼容代码。每次删除保留回退点，不能边迁边让新旧权威同时写状态。

## 唯一产物

`Modernization Audit Dossier`：行为基线、依赖/权威图、问题证据、目标契约、Legacy 清单、垂直阶段、风险、回退和回归守卫。

## 轻量路径与升级

- 局部 bug：只追踪受影响链路、固定行为基线、修 owner 并做针对性回归。
- 状态权威不明、跨界面链路、旧档迁移或广泛重构时升级完整 Dossier 与分阶段门禁。

## 交接与验证

- 架构缺口交给 Feasibility/Runtime，阶段交给 Stage Control，证据交给 Quality。
- 每阶段证明目标外行为保持、目标问题改善、旧档可读、回退可用；静态/Mock/真实运行证据分开报告。

## 不负责

不无证据重写整个应用，不把理想架构当用户已授权的玩法变更，不自动选择 Cloud/Tauri，也不在消费者尚存时删除 Legacy。
