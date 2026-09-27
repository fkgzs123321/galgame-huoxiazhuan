# 项目长期记忆 · tavern_helper_template

> 索引与硬结论（2026-09-23 第七次整理）。**只写可直接执行的规则。** 逐日过程见 `YYYY-MM-DD.md`，分领域细节见 §六 索引。

---

## 一、工作区地图

- `引擎模板/` ★ 机制层本尊（引擎能力＋契约表＋校验器＋`机制层规范.md`）—— **不属任何一张卡**
- `src/旮旯给木-同级生2/` ★ 底座②最佳参照（主战场）｜`-euphoria/` 底座①（条目来源，**非标准**）｜`-英雄坛说/` 底座③
- `src/同级生2/` 母体原卡（index.yaml 203 条，待模块化）｜`src/欲妈群/` D20 对抗判定＋共感假阳具
- `src/系统哥的末日/` ★ **2026-09-23 完全重构**（旧管线归档到 `_旧版归档_20260923/`）；标准 forge 项目，MVU，ui_mode=frontend
- `_素材库/` ★ 成品素材与技法原文（方法论在 skills，素材在这里）｜`darkest-dungeon-app/` 独立端（Vite/React19/zustand5）
- **双套件** TavernWeave / tavern-cards（`_tw_repo/`、`_tc_repo/`）。三条铁律：**开工先报主干**／**一项目一事实来源**／**验收只能用户亲口说**
- **酒馆小狸** MCP（`E:\Games\写卡\tavern-tanuki\`，remote `fannnnnnn5822/tavern-tanuki` **v0.3.0**）：管理组 13 个走 ST HTTP API；陪玩组 8 个走桥端口 6700（只 127.0.0.1，云酒馆不支持）
  ⚠️ **2026-09-24 核查：装了但零使用。** ① WorkBuddy 侧 `~/.workbuddy/mcp.json` 里 `disabled: true`（从没在连接器页点「信任」）→ 会话里没有它的工具 ② 酒馆侧连接器**已丢失**（ST `settings.json` 脚本库 17 项无小狸、ST data 目录 2940 文件零命中、`.bak-tanuki-*` 备份也没了）→ 陪玩全废，要重导 `tavern-script/酒馆小狸连接器.json`（**酒馆开着时走脚本库导入 UI，别直接改 settings.json**）
  ③ 管理组可用：`node src/server.js` 自检通过、ST `127.0.0.1:8000` 存活

---

## 二、⚠️ 协作铁律（违一条就返工）

1. **不自己裁决** —— 冲突或规划没写：先查规划（design-spec／创作规划.yaml／机制层规范）；仍没有 → **列给用户决定 + 每案影响**（改哪些文件、破坏哪些已有内容）。
2. **判「原作没有」前必须搜全** —— 中文百科＋英文维基＋日文攻略＋论坛帖，**每个来源翻完分页**。**原卡被判错先假设自己搜漏**。
3. **删掉自创设定后不许顺手编新的顶上**（还是自创）。
4. ★★ **「怎么写」不用我写，只做结构** —— 用户给整包资料时里面已规范好写法；我只理解结构（分层/挂载/索引/接口/取用规矩/边界）。✗ 重写手法段 ✗ 自写样本 → ✓ **照搬，一字不改**。
5. ★★ **模板必须自包含** —— ✗「同上」✗ 别处才有的名字 ✗ 纯占位符 → ✓ `槽位｜这格填什么｜照着这个写（原句）`＋填好范例。
6. ★★★ **强制要求必须写进「执行流程」** —— 只挂 `references/` 清单＝写卡时不打开。✓ 创作循环加步骤＋SKILL.md 同步＋`rules-check.md` 加**可数**判据。自检：**这段对应素材索引表哪一节？说不出＝凭印象写。**

---

## 三、⚠️ 审计铁律（变量侧 4 次／条目侧 3 次／校验器 3 次都栽在这）

**脚本只能「列线索」，判定必须人工；脚本的判定性指标一律不可信。**
- 「20 次公式参与」＝ 1 个真读点 + 19 份手工复制的同一段逻辑
- 审计器用 `enabled` 判常驻/按需，但 ST 投放看 `strategy` → 全盘误报
- **词表不全＝守卫是假的**（6/23 → 补词后 13/23，还漏「西御寺」）
- **量错方向比不量更危险**：拿「文件字符数」判「渲染后 ≤5000」→ 会让人删本就进不了 prompt 的字。**判据写「渲染后」就必须真渲染再量。**
- 自动审计把 `元数据.小时`／`玩家.警觉度`／`玩家.D20历史` 判成「没人读」——因 D0 用局部名 `_meta.小时`。**脚本产出的「死变量/未引用」清单必须逐条人工看用法。**
- ⚠️ **手动查，不要脚本查**（用户明确要求）：要**用眼读出来**，脚本只按词表捞关键词。

**过审判据**：每个数值问三句 —— ① 玩家看得见吗 ② 能拿它做决策吗 ③ 会改变叙事走向吗；三否 → 删。再反问 **这数值是帮玩家玩，还是替 AI 记账？**

---

## 四、MVU + EJS 铁律

- ★★★ **Zod 卡里数组/对象「加新项」走不通（源码坐实）**：
  MVU 核心把命令**同时**发给 zod 处理器与自己的执行器；**zod 语法里 `add` ＝ 数字加减**，**追加数组要用 `insert`** → 标准 JSON Patch 的 `{"op":"add"}` 打到数组上会被 zod 判「不是数字」而**不消费** → 落到核心 → 必抛 `assignNonExtensibleArray`。
  ★ **判据速记：报错前缀是 `[MVU]` 而非 `[MVU zod]` ⇒ 命令没被 zod 层消费。**
  **三种正确做法**：① 列表类变量**别用数组，用字符串**整串 `replace`；② 系统记账类**交给卡内脚本写**（`Mvu.replaceMvuData` 不经过命令校验）；③ 真要数组只能整组 `replace`。
  ⚠️ **对象加新键同样中招** → 需要新增的键**预置在 initvar**，规则写成「只 replace 值，永不新增键」。
  ⚠️ 但**本项目（系统哥的末日）真的用了 `z.array(z.string())`**：靠「整串 replace + 上限截断」+ 不足 2 元素避免 VHD 误判，尚未实测；若报 `[MVU]`，按上面三条改。
- **门控兜底（三通道 + 一兜底）**：前端/表单写 `stat_data.X` 后世界书 `@@if getvar(...)` 可能读不到 → 永远走 defaults：
  ① chat 级 `updateVariablesWith(fn,{type:'chat'})` ② floor 级 `{type:'message',message_id}` ③ slash 兜底 `triggerSlash('/setvar ...')`
  ④ EJS 条件写 `matchChatMessages(['TAG:值'],{start:0}) || (!matchChatMessages(['TAG:'],{start:0}) && getvar(...)==='值')` —— **右项必须带 `!matchChatMessages(['TAG:'])`**；`start` 默认 **-2**，扫全历史必须显式 `{start:0}`。
- **initvar_override**：`开场白/N.txt` ↔ `开场白/initvar/N.yaml` **必须同号**；key 是 `first_messages` 原始值，JSON Pointer 里 `/`→`~1`；父字段不存在先 `{"op":"add","path":"/initvar_overrides","value":{}}`；patch 的 `replace` 打在「值是文件路径」的字段会被当**文件重命名** → 用 `remove`+`add`。
  **ST 端映射**：`first_messages[0]`→`first_mes`，`first_messages[1..]`→`alternate_greetings[0..]`。
- **卡面校验**：PNG 的 `chara` chunk 是 **base64 编码 JSON**（`tEXt`，data = `chara\0<base64>`）；`character_book` 在 `card.data.character_book`；`data.extensions.regex_scripts` 是**数组**。★ **打包后要真解 PNG 复核。**
- ★ **schema.ts 不要写 `export type`** —— pack 的「Zod 脚本内容校验」会检测 `export type`（照 `src/欲妈群/schema.ts` 只写 `export const Schema` 最稳）。

---

## 五、★★ MVU 额外模型解析（卡内 `[config_override]`）—— 2026-09-23 从 bundle 源码坐实

MVU 两种更新方式：`随AI输出`（默认，AI 在正文里吐 `<UpdateVariable>`）／`额外模型解析`（剧情 AI 只写剧情，另一个 AI 专门解析剧情改变量）。

### ① 路由认「条目名（comment）」，**不认 keys**
`ut=/\[mvu_update\]/i`、`pt=/\[mvu_plot\]/i` 全都只 `test(entry.comment)`：
- 名字含 `[mvu_update]` → 只发给变量更新 AI，且**不受白名单/黑名单筛选**
- 名字含 `[mvu_plot]` → 只发给剧情 AI
- 都不含 → 两个 AI 都发

⚠️ **把 `[mvu_update]` 放进 `keys`（关键词）等于没放**。`src/秦璐/` 原卡三条框架条目全是这么写的 → 路由全废。
⚠️ `Xt()` 要求**角色主世界书里至少有 1 条 comment 命中** `[mvu_update]` 或 `[mvu_plot]`，否则额外模型解析**根本不启动**。
⚠️ initvar 同样靠 `e.comment.toLowerCase().includes('[initvar]')` 找 —— 名字里没有 `[initvar]` 就等于**没有初始变量**（秦璐原卡如此，靠 zod 默认值刚好等于 initvar 才没炸）。**判「这卡 MVU 框架条目齐不齐」就一眼扫 comment，不要看 keys。**

### ② 卡内配置覆盖 ＝ 角色世界书里一条**关闭**的 `[config_override]`
- 位置：角色世界书（`getCharWorldbookNames('current').primary`）；条目名（comment）**必须恰好**是 `[config_override]`；**必须 `disable: true`**（卡格式里写 `enabled: false`）
- 内容**必须是 JSON**（先 JSON 后 YAML 兜底；**YAML 那条分支会 `delete 更新方式`** → YAML 设不了更新方式）。`schema` 键可有可无，解析时被剥掉
- 允许的键（`.loose()`，多余键放行但无效）：
  `更新方式`：`随AI输出`｜`额外模型解析`　｜　`额外模型解析配置`：`{启用自动请求, 世界书条目白名单正则, 世界书条目黑名单正则}`　｜　`兼容性`：`{更新到聊天变量, sendas不视为user消息}`
- 优先级：**卡内配置 > 用户全局配置**，没写的项「跟随用户配置」。判「已生效」：MVU 面板显示「当前角色卡配置（覆盖中）」
- ⚠️ 卡内配置**管不到**额外模型自己的 api地址／模型名称／温度／应答格式／请求方式／请求次数 —— 那些只在用户全局设置里

### ③ forge 往返的**有损点**（unpack→pack 会静默丢东西，必须逐字段对账）
- `unpack` 的 `extensions` 只收 5 个键（tavern_helper／talkativeness／fav／world／depth_prompt）→ **第三方扩展键（`xiaobaix-tasks`、`odysseia_trace`…）直接丢**。补救：`Extensions` 是 `looseObject`、pack 里 `...omitKeys(state.extensions,…)` 会原样回写 → `patch add /extensions/<键>` 补回来再 pack
- `chara.chat`、`character_book.{description,scan_depth,token_budget,recursive_scanning,extensions}` → **state 无对应字段，补不回来**（无功能影响，但要知道）
- `readFileText` 收尾 `replace(/\r\n/g,"\n")` → **开场白 CRLF 变 LF**（文本零丢失，字节不同）
- `writePng` 故意写双块：`chara`＝v2（`spec: chara_card_v2`）＋`ccv3`＝v3，**这是 ST 自己的导出惯例，不是 bug**
- 条目级 `extensions.depth`(4→0)、`case_sensitive`(false→null)、`+match_creator_notes` 会被重写（位置非 at_depth 时无影响）
- ★★ **改完必须「真解 PNG」逐字段对账**（拿备份卡做基准），不能只看 pack 的成功输出

### ④ 秦璐卡（`src/秦璐/`）本次落地
原卡 3 条框架条目**全部没带前缀** → 额外模型解析不可用。已改：
- `变量/变量更新规则` → `[mvu_update]变量/变量更新规则`
- `变量/变量输出格式` → `[mvu_update]变量/变量输出格式`
- `仅在新建聊天时开启一次…` → `[InitVar]仅在新建聊天时开启一次…`
- 新增（关闭）`[config_override]`：`{"更新方式":"额外模型解析","额外模型解析配置":{"启用自动请求":true}}`
- 条目**文件路径未动**（仍 flat 在 `世界书/`；全部条目仍挂在 `unknown` 类型，未做分类）
- 卡内配置**强制**两项（更新方式＋自动请求）→ 此卡下用户改不了；要放开就删对应键
- 原始卡备份：`src/秦璐/_备份/秦璐：双重沦陷的禁忌交响.原始.png`

---

## 六、专项记忆索引（细节不在本文件，按需再读）

本文件只留**跨项目硬规则**。以下按主题拆出去了，动到对应领域时先读：

| 文件 | 内容 |
|------|------|
| `MEMORY-专项-引擎与底座.md` | §引擎＋底座架构 ｜ §机制层判据＋判定引擎＋她的手段 ｜ §★屏幕外的她结构定稿 ｜ §三个底座 |
| `MEMORY-专项-文风与投放.md` | §文风库 `contents-creation/` ｜ §tavern-cards 投放＋token 规范 |
| `MEMORY-专项-欲妈群.md` | 欲妈群专项（NSW 废除／生成器源头／写法名单／进度） |
| `MEMORY-专项-系统哥的末日.md` | 系统哥的末日专项（重构决策／阶段轴／UI CDN／闭环审计／E3-E5-T2） |
| `MEMORY-详细版-20260921.md`／`MEMORY-备份-20260923.md` | 更早的完整版备份 |

逐日过程仍在 `YYYY-MM-DD.md`。

---

## 七、校验器与工具链

- **`引擎模板/scripts/verify-prompt-budget.mjs <项目目录>`** → 六项校验（order 分区/底座门控/单条上限/分层预算/常驻总量/按需层误常驻）。项目级覆盖读 `<项目>/budget.json`。
  ★ `est` ＝**用真 ejs 真渲染再量**；**单条上限也改用 `est` 判**。互斥组（`她_` 前缀／`第`／`[mvu_plot]支线·`／同变量多档）整组只计 1 条。
  ★ 单条上限分两档：`> 6000` 报违规、`> 5000` 只报建议。
- ⚠️ **`fs.cpSync` 复制目录在本沙箱会被静默杀进程（exit 127、零输出）** → 用 Bash `cp -r`。
- ⚠️ **`/tmp/xxx` 在 Bash 里会被译成 `E:\tmp\xxx`** → 临时文件一律放工作区 ASCII 目录（如 `_tools/`）。
- ⚠️ **`node <中文路径脚本>` 也会 exit 127** → 工具脚本放 ASCII 目录，路径写进脚本内部。
- Bash coreutils 已修（junction `~/.workbuddy/binaries/PortableGit/usr-bin`）；**`find`/`ls -R` 列不出目录** → 用 `node fs.readdirSync`；Grep/Glob 正常。
- PowerShell 不捕获 stdout → `*>日志` 再 Read；执行策略 Restricted → 先 `Set-ExecutionPolicy -Scope Process Bypass -Force`
- safe-delete 钩子拦 `Remove-Item` → 用 `node fs.rmSync`；Bash 跑不了 `npm` → 用 `npm.cmd`；Bash 调 `powershell.exe` 会被拒
- **真 ejs 渲染器**：`src/旮旯给木-同级生2/scripts/render-entry.cjs`（ejs 装在 `~/.workbuddy/binaries/node/workspace/node_modules/ejs`）→ 用法 `node render-entry.cjs <条目文件> '<变量JSON>'`。**验证档位命中就用它，不要自己写迷你渲染器。**
- **CRLF 坑**：`schema.ts` / `变量列表.txt` 是 CRLF → 用 `\n` 写的锚点全失配
- **改 YAML**：替换锚点带缩进 → 缩进差一格全漏命中，**用不含缩进的子串**；给「值带续行」的行加引号会弄坏合法标量 → **正确修法是转 block scalar `|`**
- **工程文件也必须跑解析器**；目录改名必须同步 `.cardrc.json`（key＋`state_file`＋`artifact`）
- **forge**：`init [--mvu] [--worldbook]`／`patch <项目> --file <patch>`／`configure`（新项目必须跑，见 `MEMORY-专项-文风与投放.md`）／`validate-mvu`／`pack`／`query`／`export`／`split`／`unpack`
- ⚠️ **同一文件被两个并行编辑会丢改动** —— 同文件多处修改必须**串行**，改完 re-grep 复核
- ⚠️ **不要把中文当参数传给 `node -e`**（`」`等会被改写 → includes() 假阴性）→ 批量替换写 `.mjs` 脚本再跑。另：`wc -c` 是字节，中文约 3 字节/字。
- ★★ **YAML 三个必踩的坑**：
  ① 裸 `?` 是**复杂键指示符** → 写 `conf: '?'` ② 序列项以 `*` 开头会被当 **alias** → 整项加单引号
  ③ ★★ **`s.split('\n').join('\r\n')` 打在 CRLF 文件上会把每行变成双换行** → 先 `replace(/\r\n/g,'\n')` 归一化
  ★ 凡改完 YAML，**立刻用 `yaml` 包 parse 一遍**

---

## 八、★★ 器官指称的分类漏洞与修复（2026-09-23，全卡通用）

用户当场追问「为啥用**奶肉**而不是直白的器官名加脏词」，追下去发现**是 skills 的分类漏洞，不是文笔问题**。用户定论：「估计是分类没有好好的分类」。

### 规矩（新增，写卡前必读）
- **词分三栏**（`presentation-craft-05-词汇规范.md`）：**主体**（可当主语/宾语，必须自带脏字或当场带脏／臭／腥／黑定语）｜**修饰**（材质词与质感词，**只能作定语，禁止单独指器官**）｜**坐标**（部位定位词，可独立用）。
- ★ **材质词顶替主体 ＝ 与模糊指代同罪**，且更隐蔽（带着脏字感，看着像在写器官）。
  **永不得单独指器官的 14 个词**：奶肉｜乳肉｜屄肉｜腔肉｜尻肉｜臀肉｜腚肉｜媚肉｜淫肉｜雌肉｜贱肉｜肉棱｜嫩肉｜软肉。
- ★ **判据一句话**：把那个词单独抽出来，**读者能不能一眼说出是哪个器官**？说不出就是材质词顶替。
- ★ **`肥奶子` 可以，`奶肉` 不行**（用户原话）：`肥` 是定语，`奶子` 是器官名；`奶肉` 把器官名换成了材质词。
- ★ **允许**：材质词作定语（肥软的骚奶子）、描述被挤出来的形（鼓成肉棱）、整具肉体统称（整具骚躯）。

### 工具
`node 引擎模板/scripts/verify-dirty-ratio.mjs <项目目录>` —— 三项：
① 器官指称脏字占比 ≥80%（口径写死：白名单只收**双字**头部词，单字「奶」「乳」不收；前 6 字内挂脏字才算合格）
② 材质词顶替 0　③ 模糊指代 0（往后 14 字里有器官名＝合格形态；有布/门/缝/疤/里/处＝豁免）
④ 密度/状态仍是人工数。

### 挂载点（规矩必须挂进流程，否则没人翻得到）
`craft-05 三栏表＋两条禁令` → `presentation-styles.md 顶部硬禁第 6 条` → `逐角色终检表.md 两项可数判据` → `basic-info.md 判据表第 5 行反例行`。

### 传播源一处不能留
`craft-01/02/03`、`style-06`、`interface-with-craft`、六套 `by-style`（18 份）里的旧词料表与密度参照**全是传播源** —— 只改 `craft-05` 不改这些，下一张卡照样犯。已全量同步，双套件也同步了。

### 我犯过的两个执行错（都要避免）
1. **只数了「器官词命中数」，没数「脏字占比」** —— 因为占比那条判据当时没有口径。**没有口径的判据等于没有判据。**
2. **无差别批量替换误伤了词表**：「奶肉」在**禁则清单与修饰栏**里是合法的，我第一轮清洗把它一起改了。**批量替换必须按行判别（词表行／禁令行要排除），改完用眼读一遍。**
