# UI 命令与只读投影

## 作用

把玩家和创作者界面的交互统一为 Command，并把正式状态显示为只读 Projection。流式草稿、表单草稿、候选变化和已提交事实必须在类型、视觉和生命周期上可区分。

## 读取条件

设计或实现主界面、状态展示、玩法面板、创作工具、调试入口、响应式或无障碍交互时读取。

## 前置输入

- `Agency Contract`、`Gameplay-Narrative Contract`。
- `Turn-State Transaction Contract`、`Platform-Asset Port Contract`。
- 关键用户流程、目标设备、错误/取消体验和需要展示的状态。

## 方法

### 1. 画出用户动作到事实的链

每个关键动作标明：触发控件 → UI Command → 权限/输入校验 → Kernel 结果 → Projection 更新或错误反馈。UI 不直接调用数据库、模型适配器或内部 workflow 来绕过 Command。

### 2. 定义 UI Command

Command 使用稳定类型和 Schema，携带 commandId、expectedRevision、actor、来源界面和规范化 payload。按钮防连点只能改善体验，真正幂等由 Kernel/Save 保证。

编辑器内尚未提交的内容使用 local draft，不伪装成正式状态；提交后再由 Projection 返回权威结果。

### 3. 定义只读 Projection

Projection 是从 `CommittedFacts` 派生的界面查询模型，包含来源 revision、加载/错误/空状态和展示所需格式。复杂计算放在 Projection Store 或查询层，不让组件各自解释业务事实。

需要乐观显示时使用明确 overlay；失败后撤销 overlay 并回到同一正式 revision，不修改底层 Projection 假装成功。

### 4. 分离四类视觉状态

- `StreamDraft`：正在生成，可取消、可消失，不进入正式历史。
- `RawModelResponse`：通常不直接暴露；调试视图需标明未校验。
- `CandidateChangeSet`：只有需用户裁定时显示为候选。
- `CommittedFacts`：带最新 revision 的正式正文、状态和事件。

不得让流式文本在保存失败后仍以“已完成”样式留在历史中。

### 5. 错误与冲突反馈

区分输入无效、权限拒绝、模型失败、取消、解析失败、revision conflict、保存结果未知和已提交后取消。每种状态给出实际可执行动作，例如重试同一提交、刷新 Projection、重新生成或查看诊断；不要统一显示“出错了”。

### 6. 界面完整性

覆盖键盘、焦点、屏幕阅读语义、触摸目标、响应式布局、离线/弱网、长文本、加载骨架、空状态和破坏性操作确认。调试面板提供 commandId、revision、Profile、Prompt/Lore Trace 链接，但默认隐藏敏感正文。

### 7. 创作工具与玩家界面分权

编辑世界书、预设、内容包和存档属于不同权限面；预览/试运行使用隔离会话或草稿版本。作者工具不应在未确认时修改玩家当前存档。

## 唯一产物

`UI Command-Projection Contract`：关键流程、Command Schema、Projection Schema、草稿/候选 overlay、错误反馈、权限、响应式/无障碍要求和调试入口。

## 轻量路径与升级

- 单主界面：一个 Command 入口、一个只读 Projection、流式 overlay 和基础错误反馈。
- 多面板、多窗口、创作工具、复杂乐观交互或多设备时增加共享 Projection Store、焦点/并发策略和端到端 UI 状态矩阵。

## 交接与验证

- Command 交给 Kernel；Projection 只消费 committed event；平台能力交给 Platform Port。
- 覆盖重复点击、取消、流中断、保存失败、revision conflict、读档切换、窄屏和键盘操作；断言 UI 无数据库/AI 飞线。

## 不负责

不定义剧情事实、状态裁定、数据库实现、模型调用或具体视觉品牌风格。
