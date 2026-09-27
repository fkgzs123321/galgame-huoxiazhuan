# 保存、迁移与崩溃恢复

## 作用

把已裁定的 CommitRecord 可靠地耐久保存，并处理 CAS、ACK、结果不明对账、Schema 迁移、分支、损坏和崩溃恢复。Save 是耐久层，不是第二业务权威。

## 读取条件

应用需要保存/读取时读取基础部分；旧档兼容、Schema 变化、分支/重投、备份、跨设备或崩溃恢复按需展开。

## 前置输入

- `Turn-State Transaction Contract`、内容包 ID/版本和状态 Schema。
- `Memory-History Contract` 的耐久边界、`Platform-Asset Port Contract`、`Trust-Dataflow Contract`。
- 目标存储能力、故障模型、容量和用户备份需求。

## 方法

### 1. 定义 Save Contract

存档至少包含：稳定 save/content/profile ID、Schema/内容版本、当前 revision、已提交快照或事件、commandId 幂等记录、迁移历史、完整性信息和创建/更新时间。只保存 `CommittedFacts`；StreamDraft、RawModelResponse 和未裁定 Candidate 默认不进入正式存档。

### 2. CAS、耐久 ACK 与发布点

Kernel 提交 `CommitRecord(commandId, expectedRevision, nextRevision)`；Save 原子检查 expectedRevision、写入正文/状态/事件/幂等记录并返回 durable ACK。只有 ACK 或结果不明后的对账确认成功，Kernel 才发布 next revision。

相同 commandId + 相同 CommitRecord 返回同一结果；相同 ID + 不同内容返回协议冲突。保存失败不得重新调用模型。

`durable ACK` 是证据结论，不是固定方法名。先声明目标宿主和故障模型，再按实际证据命名：

| 证据等级 | 可以声称什么 |
|---|---|
| 内存可见 | 仅当前进程状态已更新 |
| 写入完成 | 宿主写调用成功，未证明原子或断电耐久 |
| 原子替换 + 读回 | 新 revision 可读回，普通进程重开可恢复 |
| 文件/目录同步确认 | 按目标平台完成文件与必要目录同步，更接近断电耐久 |
| 数据库事务确认 | 按数据库、日志和同步配置声明事务耐久级别 |
| 崩溃/断电恢复演练 | 目标环境实际证明恢复行为 |

临时文件、rename 和当前进程读回只能证明“原子替换 + 读回”；不得默认命名为断电级 durable。证据不足时使用 `write-ack`、`atomic-readback-ack` 等准确终态，并把更高等级标为未验证。不要强制所有项目使用 `fsync`；文件、SQLite、远程数据库和移动宿主分别按真实能力给证据。

### 3. 处理结果不明

进程中断或响应丢失后，按 saveId + commandId 查询：

- 已落盘：返回原 ACK，Kernel 发布该 revision。
- 明确未落盘：允许按原 CommitRecord 重试。
- 无法判定：冻结后续写入并提示恢复，不猜测成功或失败。

启动时先完成未决 command 对账，再开放新回合。

### 4. Schema 与内容迁移

迁移必须版本化、可重复、可审计：验证源版本 → 备份/复制 → 逐步迁移 → 校验不变量 → 写入新版本 → 读回确认。不可逆迁移需要 dry-run、显式授权和恢复入口。

区分状态 Schema 迁移、内容包 ID 映射、资源路径变化和 Prompt/Profile 版本变化；不要用一个版本号掩盖所有兼容问题。

### 5. 分支、重投与 reroll

使用线性 revision 作为默认。reroll 在旧 base revision 上创建新 command/attempt，并明确替换或分支语义；不要默认为每个项目建立 revision tree。需要多分支时保存共同祖先和独立线性链，防止不同分支共享可变状态。

### 6. 损坏与恢复

使用校验和、事务/临时文件原子替换、备份轮换和读后校验。单机小项目至少保留最后一个已验证备份；主档损坏时保留并隔离原件，验证备份的身份、版本、完整性和 revision，再向玩家展示恢复预览。不得静默回退；说明将恢复到哪个 revision、可能丢失哪些回合和如何保留原件。

恢复流程区分：最后一次提交未完成、索引可重建、单资源缺失、快照损坏、备份也损坏、空间不足和版本不支持。Memory 索引、Projection 缓存等派生物优先重建，不冒充不可恢复事实；主档与备份均无法确认时停止写入并提供导出/人工恢复入口，不能自动创建空档覆盖。

### 7. 导出、导入与删除

导出包记录格式版本、内容来源、资源清单、可选敏感项和校验值。导入先隔离验证，再创建新存档或经授权合并。删除应说明本地副本、备份、缓存和远程副本的实际处理范围。

## 唯一产物

`Save-Recovery Contract`：存档 Schema、CAS/ACK、幂等、对账、迁移计划、分支/reroll、备份、损坏检测、启动恢复、导入导出和恢复演练。

## 轻量路径与升级

- 单机小项目：单存档快照、Schema 版本、原子替换、读回检查、commandId、一份已验证备份和损坏恢复预览。
- Schema 变化、多分支、跨端同步、大资源或公开发布时增加迁移夹具、对账日志、冲突和回滚演练。

## 交接与验证

- durable event 交给 Projection/History/Memory；迁移/恢复证据交给 Integration 和 Release。
- 覆盖往返、重复 commandId、revision conflict、写入中断、ACK 丢失、结果未知对账、旧档逐级迁移、主档/备份损坏、空间不足和恢复重开；单独报告实际耐久证据等级。

## 不负责

不裁定剧情或候选变化，不生成角色记忆，不调用模型，也不把云鉴权混入存档业务规则。
