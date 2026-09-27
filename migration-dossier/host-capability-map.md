# Host 能力与缺口表

## 基本信息

- 目标应用/版本:同级生2 独立前端卡 v1.0
- 候选 Host:in-process(浏览器内运行时)
- 目标平台:纯前端Web(Vite+React+TS)
- 证据日期与环境:2026-07-30,Windows 浏览器

## 能力清单

| 能力 | 必需/可选 | 谁消费 | 当前支持 | 证据 | 缺失时降级 | 所属 Port |
|---|---|---|---|---|---|---|
| 本地耐久存储 | 必需 | Save | 是 | IndexedDB 浏览器原生 | localStorage 降级 | Storage Port |
| 原子写入/CAS | 必需 | Kernel/Save | 是 | IndexedDB 事务+CAS内容寻址 | 内存缓存+重试 | Storage Port |
| 模型网络调用 | 必需 | Gateway | 是 | fetch API(OpenAI兼容协议) | 无法运行 | Model/Network Port |
| 流式与取消 | 必需 | Gateway/UI | 是 | ReadableStream+AbortController | 非流式降级 | Model Port |
| 多端点配置(8AI) | 必需 | Gateway | 是 | 8个独立Profile配置 | 降级为2AI | Model Port |
| 密钥保存 | 必需 | Security | 是 | localStorage/IndexedDB(本地存,不上传) | 每次输入 | Secret Port |
| 文件导入导出 | 可选 | Content/Save | 是 | File API+Blob | 手动复制 | File Port |
| 后台任务 | 可选 | Runtime | 部分 | requestIdleCallback(无Worker) | 主线程 | Task Port |
| 图片/音频/视频 | 必需 | Assets/UI | 是 | 静态资源fetch+Canvas/Web Audio | 无音效 | Asset Port |
| EJS模板引擎 | 必需 | Runtime | 是 | npm ejs 包 | 无 | Runtime Port |
| Zod运行时 | 必需 | Runtime | 是 | npm zod 包 | 无类型校验 | Runtime Port |
| 正则引擎 | 必需 | Runtime | 是 | JS RegExp 原生 | 无 | Runtime Port |
| 世界书选择器 | 必需 | Lore | 是 | 自建(190条目策略匹配) | 无 | Lore Port |
| getwi加载器 | 必需 | Lore | 是 | 自建(三级调度树) | 无 | Lore Port |
| 更新与诊断 | 可选 | Release | 是 | Trace查看器(调试工具) | console.log | Update/Diagnostics Port |

## Host 比较

| 候选 | 满足的关键能力 | 新增成本/风险 | 不适用证据 | 结论 |
|---|---|---|---|---|
| in-process(浏览器内) | 全部必需能力 | 无原生FS;性能受主线程限制 | ST兼容运行时不依赖原生FS | 采用 |
| Worker | 后台任务不阻塞UI | 通信复杂度;EJS/zod需Worker内加载 | 首版聚焦功能完整 | 条件采用(后续优化) |
| Tauri | 原生FS;性能更好 | 需安装;开发链路重;Rust后端 | 用户选纯前端Web | 排除 |
| Cloud | 云存档;多端 | 服务器成本;隐私;用户选本地 | 用户选纯前端Web | 排除 |

## 当前选择

- 选择:in-process(浏览器内运行时,Vite+React+TS+IndexedDB+zod+ejs)
- 选择证据:用户确认纯前端Web;所有必需能力浏览器原生支持;ST兼容运行时不依赖原生FS
- 为什么现在不做物理分离:首版聚焦功能完整;Worker/Tauri可后续优化性能
- 触发重新评估的条件:首版完成后若主线程性能瓶颈明显,升级Worker;若需离线/重存档,升级PWA/Tauri

## Port 与平台依赖

| 领域能力 | 允许依赖的 Port | 禁止直接依赖 | 适配器位置 |
|---|---|---|---|
| 存储 | Storage Port(IndexedDB) | 浏览器全局localStorage直接调用(经Port封装) | src/runtime/storage/ |
| 模型调用 | Model Port(fetch+AbortController) | 直接fetch(经Gateway封装) | src/runtime/gateway/ |
| EJS执行 | Runtime Port(ejs包) | 直接eval(经模板引擎封装) | src/runtime/ejs/ |
| Zod校验 | Runtime Port(zod包) | 直接调用(经Schema注册器封装) | src/runtime/schema/ |
| 世界书 | Lore Port(选择器+getwi) | 直接读条目文件(经Lore Runtime) | src/runtime/lore/ |
| UI渲染 | UI Port(React组件) | 直接DOM操作(经React) | src/ui/ |
| 密钥 | Secret Port(localStorage封装) | 直接localStorage(经Port封装) | src/runtime/secret/ |

## 验证结果

- 已验证:IndexedDB/zod/ejs/fetch/RegExp 浏览器原生支持(技术可行性)
- 未验证:8AI并行调用延迟;getwi加载器复现;IndexedDB承载SP数据库性能
- 阻塞缺口:无(可在阶段1-2验证)
- 下一步:进入阶段路线图,阶段1验证核心运行时
