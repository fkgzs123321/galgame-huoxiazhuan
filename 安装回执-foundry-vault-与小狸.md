# 安装回执 · agent-foundry-vault + tavern-tanuki（酒馆小狸）

- **执行时间**：2026-09-14
- **两个仓库**：`LiarMTTT/agent-foundry-vault`（v0.1.0）· `fannnnnnn5822/tavern-tanuki`（v0.3.0）
- **附带**：读取并整理《TavernWeave × tavern-cards 双套件混合使用指南》

---

## 一、agent-foundry-vault（Obsidian Vault）

| 项 | 内容 |
|---|---|
| 落点 | `E:\Games\写卡\tavern_helper_template\agent-foundry-vault\` |
| 性质 | Obsidian × LLMWiki × Hermes 的 **Agent 训练 / 知识 / 运维中枢**（不是 skill、不是酒馆扩展） |
| 规模 | **131 文件**（110 Markdown / 7 JSON / 3 JSONL 记录 / 96 条内部链接） |
| 自检 | `npm run verify` → **PASS**（`files=131 markdown=110 json=7 jsonl_records=3 links=96`） |
| 入口 | `00-开始这里/10分钟首跑.md`（作者明说：**不要从规则文件开始读**） |
| 附带 .git | 保留（浅克隆），以后可 `git pull` 更新 |

**为什么没铺在工作区根**：你原填的落点就是工作区根，但两者有 **6 个同名文件**会被 vault 版覆盖——
`AGENTS.md`（工作区版 18.1KB 是酒馆助手项目指引）、`package.json`（3.9KB 项目配置）、`README.md`、
`LICENSE`、`.gitignore`、`scripts/`。且工作区根已有 216 项（`src/`、`node_modules/`、各卡片目录）。
按你的选择改为**工作区子目录**，零覆盖。

> 本机**未安装 Obsidian**，暂时以纯 Markdown 形式存在；将来装了 Obsidian，用「打开文件夹作为库」指向该目录即可。
> 该 vault 的内容（`20-Agent-Harness` / `60-Hermes运维` / `harness/` 等）与 TavernWeave 的 **AFV 资料库**是同源方向，可作为 TW Library 之外的本地知识层。

## 二、tavern-tanuki（酒馆小狸 · MCP server）

| 项 | 内容 |
|---|---|
| 落点 | `E:\Games\写卡\tavern-tanuki\` |
| 性质 | **MCP server**（Node ≥18）：让编程助手直接读写**并陪玩**正在运行的 SillyTavern |
| 依赖 | `npm install` → **94 包**（`@modelcontextprotocol/sdk` / `ws` / `zod`） |
| 冒烟 | `node src/server.js` → `sillytavern-api-mcp connected (target: http://127.0.0.1:8000)` ✅ |
| 工具 | 21 个：管理组 13（角色卡/世界书/聊天读写）＋ 陪玩组 8（`play_send` / `play_trigger` / `play_get_prompt` 提示词 X 光机 / 切预设切模型 / STScript 后门） |

### MCP 配置已写入 4 个宿主（按你的多选）

| 宿主 | 配置文件 | 写入形式 |
|---|---|---|
| **WorkBuddy** | `C:\Users\64806\.workbuddy\mcp.json`（新建） | `mcpServers.sillytavern` → `command: node` + `args` + `env.ST_URL` |
| **Codex** | `C:\Users\64806\.codex\config.toml` | 新增 `[mcp_servers.sillytavern]` 段（插在 `[mcp_servers]` 之后，与 `node_repl` 并列） |
| **opencode** | `C:\Users\64806\.config\opencode\opencode.jsonc` | `mcp.sillytavern` → `type: "local"` + `command: [...]` + `environment` |
| **DeepSeek Harness** | `C:\Users\64806\.dsh\profiles\web\cordis.patch.yml` | `- insert:` → `id: mcp-sillytavern` / `name: '@deepseek-ai/dsh-mcp-client'` / `config: {serverName, transport: stdio, command, args, env}` |

三份被修改的配置**都已备份**（后缀 `.bak-tanuki-20260914073909`）。

> 酒馆 `basicAuthMode: false`，所以 `env` 里只需要 `ST_URL`，不用账号密码。

### 酒馆侧连接器（陪玩解锁）—— 已自动安装 ✅

| 项 | 内容 |
|---|---|
| 写入位置 | `E:\Games\SillyTavern\data\default-user\settings.json` → `extension_settings.tavern_helper.script.scripts` |
| 变化 | 脚本库 **17 → 18 项**，新增「🦝 酒馆小狸连接器」（`enabled: true`，content 2640 字符，与源文件逐字节一致） |
| 备份 | `settings.json.bak-tanuki-20260914073934`（17.1 MB） |
| 完整性核对 | 顶层键 **24/24 一致**、`extension_settings` 键 **77/77 一致**、原有 **17 个脚本零丢失零改动**、非 extension_settings 键差异 **0** |

> ⚠️ 写入前已确认**酒馆未运行**（否则会被运行时覆盖）。文件体积 17.1MB → 15.6MB 只是重新序列化去掉了原缩进，数据无损（已做键级 diff 验证）。
> 小提示：连接器 `id` 是 `a7f3c9d2-4b8e-4f1a-9c6d-tanuki000001`（上游提供的，不是标准 UUID），不影响导入与运行。

---

## 三、混搭指南要点（《TavernWeave × tavern-cards 双套件混合使用指南》）

原件：`C:\Users\64806\Downloads\TavernWeave × tavern-cards 双套件混合使用指南.html`（32KB，2026-08-30 生成）

### 四层架构：谁共享、谁排他

| 层 | 内容 | 混合规则 |
|---|---|---|
| ① 驾驶层 | Host Front Door 全局路由 / Soul 人格 / A0 写入前置检查单 | **两套共用** |
| ② 资料层 | TavernWeave Library（31 册 ST 指南 + 462 设计 + 194 动效 + 离线挑选页） | **两套共用** |
| ③ 生产主干层 | 从叙事设计到打包的完整主权链 | **每张卡二选一**：A=TavernWeave ／ B=tavern-cards |
| ④ 审计层 | security / performance / api-reference（A 出品）＋ check-agent（B 内部） | **只读，跨主干通用** |

- **A 主干**＝TavernWeave：脑暴编排 → `tavern-card-builder` → `card-pipeline` / `components` / `embedded-ui`（7→4 道门）
- **B 主干**＝tavern-cards：`tavern-design` → `tavern-cards` → `tavern-ui` + forge CLI（12 道门，G3 design-spec / G5 创作规划 / G12 最终验收为三大支柱）

### 三条铁律

1. **开工先报主干**——两套都监听「角色卡/世界书」关键词，不声明就靠猜，猜错一次就混账。第一句话发「项目主干声明」模板。
2. **一项目一事实来源**——B 记 `design-spec.md` + `创作规划.yaml` + `state.json`；A 记「创作权威」文档。**绝不双记账**，要换体系就单向迁移。
3. **验收只能你亲口说**——「验收通过 / driver-accepted / 授权打包」永远由你本人说出，Agent 只递交证据（automation 不得写 `driver-accepted`）。

### 防掣肘五规

开工先报主干 · 一项目一事实来源 · 修改先看来路（B 走 `modify-existing`，A 走 `component-update`）· 双前门二选一 · **审计跨界、生产不跨界**
（`builder`/`components`/`pipeline`/`embedded-ui`/`tavern-ui` 严格跟主干；`security`/`performance`/`api-reference`/`check-agent` 可叠任何卡）

### 常用口令

- 主干声明 → 「本项目《XX》：1) 主干 B 管线 2) 唯一事实来源 cards/XX/ 3) TavernWeave 只允许 A0/资料查询/只读审计 4) 禁止用 TW 改写或重打包 5) 每阶段先列人工确认点」
- 判定 → 「帮我判定：这个任务该走 B 还是 A 主干？按开局判定图给结论和理由，等我确认再开工。」
- 断点续接（B）→ 「继续 cards/XX：读 state.json 和创作规划恢复进度，报『已完成 / 进行中 / 下一道人工门』。」
- 先看 diff → 「先展示你要写入 `<文件>` 的 diff，我确认后再写。」
- 兜底纠偏 → 「停。这个项目主干是 <A/B>，改用 <点名 skill>。」（仍无效 → 新开会话）
- Soul：「阿瞳助我！」／「MTTT.sir，拷打我！」／「灵魂杀手！」／「Soul 归位」

---

## 四、需要你做的三步

1. **WorkBuddy 里启用 MCP**：新写的 `~/.workbuddy/mcp.json` **不会自动生效**——到连接器管理页右上角「自定义连接器」入口找到 `sillytavern`，点「信任」。
2. **重启 / 新建会话**：Codex、opencode、DSH 三处都要重启才能加载新 MCP；酒馆要重启才能加载新脚本库条目。
3. **验证陪玩**：酒馆启动后，在任一宿主里让它调 `play_status`；成功会显示「已连接 AI 编程助手」，此时 `play_*` 全套解锁（云酒馆 https 不支持陪玩，仅本地 `127.0.0.1:8000`）。

**回滚点**：`settings.json.bak-tanuki-*`、`config.toml.bak-tanuki-*`、`opencode.jsonc.bak-tanuki-*`、`cordis.patch.yml.bak-tanuki-*` 四个备份同目录可直接还原。
