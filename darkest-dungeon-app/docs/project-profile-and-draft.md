# 作品轮廓与初步草案

> 这是可修订草案，不是一次填完的问卷。只记录当前讨论已经产生的内容；缺失项仅在阻塞当前决定时继续讨论。

## 文档信息

- 项目暂名：暗黑地牢独立前端应用（待定正式名）
- 创建方式：从零创建
- 当前阶段：创作发现与初步草案（Entry Discovery）
- 来源证据：用户提出制作暗黑地牢玩法的独立前端 RP 应用；参考 MoRanJiangHu 源码与 st-compatible-independent-rp-app-builder skill
- 最近确认日期：2026-08-04

## 原始想法

> "能看这个源代码项目（MoRanJiangHu），下载下来，然后根据skills，制作一个暗黑地牢的独立卡吗，能实现哪些功能，数值严谨吗，战斗系统等"
> "要完美的丰富和实现我们暗黑地牢的玩法，还有建筑，还有地牢地图这些，是否能做？"
> "我们也是做独立前端！！！不是sillytavern的卡"

用户希望基于 Darkest Dungeon（暗黑地牢）的玩法核心，制作一个独立前端 RP 应用，包含战斗系统、建筑系统、地牢地图等核心玩法。参考了 MoRanJiangHu 的 CoT 战斗协议与数值体系。不依赖 SillyTavern 运行时。

## 创作内容、作品轮廓与初步框架

- 同人 / 原创 / 混合：同人，直接使用 Darkest Dungeon IP
- 若为同人，来源作品及改编边界：Red Hook Studios 的 Darkest Dungeon（暗黑地牢），要求高度复刻还原 DD 的世界观、角色、怪物、地点、机制、数值；不商业化，纯同人项目
- 大致题材与内容：暗黑地牢哥特恐怖 RP，高度还原 DD 原作的庄园继承、地牢探索、压力系统、回合制站位战斗、城镇管理
- 主要 RP 形态：冒险 + RPG + 策略经营
- 预计游玩长度：长期固定（还原 DD 原作完整剧情进度：5大区域 → Darkest Dungeon 最终关卡），+ 全部 DLC 内容 + 可扩展 Mod 内容包
- 希望形成的玩家体验：高度还原 DD 原作的哥特恐怖、压力绝望、英雄是消耗品的残酷决策感；多视角自由切换增强沉浸感
- 当前想到的角色、开局、剧情和系统草稿：
  - 战斗系统：参考 MoRanJiangHu 的 8 阶段 CoT 战斗协议，含站位、先机、伤害计算、BUFF
  - 建筑系统：城镇建筑升级、英雄招募/治疗/压力缓解
  - 地牢地图：房间探索、走廊连接、遭遇战、宝藏
  - 压力系统：暗黑地牢标志性机制，压力值影响英雄状态
  - 火把系统：光照影响视野、敌我增益
  - DLC 内容（全部纳入）：
    - The Crimson Court（血腥庭院）：庭院区域、吸血鬼/血娘子阵营、Infestation 侵扰等级、血资源系统、Flagellant 苦修者英雄
    - The Shieldbreaker（破盾者）：破盾者英雄、护甲穿透机制、噩梦蛇怪遭遇、新消耗品
    - The Color of Madness（疯狂之色）：农庄区域、无尽模式、彗星碎片、Husk 僵尸敌人
    - The Butcher's Circus（屠夫马戏团）：PvP 竞技场模式（独立 RP 对战或 AI 对战）
  - Mod 扩展（AI 知识库 + 可扩展内容包架构）：
    - 架构设计支持后续导入新英雄、新区域、新怪物、新事件等内容包
    - AI 可基于训练知识生成热门 Mod 概念的内容（如 Marvin Seo 的新职业、新区域 Mod 等）
    - Mod 内容与原作内容隔离，可选启用/禁用

## 玩家与交互初稿

- 玩家大致扮演什么：默认庄园主/指挥官（DD原作角色定位），但支持多视角自由切换——可介入叙事、亲自下场参战、扮演英雄小队成员、扮演自定义角色、甚至扮演先祖（Ancestor）或怪物等非人类视角
- 可能控制哪些对象：英雄小队、城镇建筑、探索路线；切换视角后可控制对应英雄、NPC或怪物
- AI 大致承担什么：叙事生成、战斗判定、NPC行为、事件触发、多视角叙事适配
- 当前不确定的表达权问题：视角切换的触发机制与权限边界需后续设计（自由切换 vs 条件触发）

## 独立应用初稿

- 首版最小闭环：玩家输入 → AI 叙事+战斗判定 → 状态更新 → 可见结果 → 保存
- 初步内容系统：角色卡、世界书、预设/Profile
- 初步玩法/辅助系统：
  - 战斗 CoT 协议（8阶段判定）
  - 压力与火把系统
  - 地牢地图生成与探索
  - 城镇建筑管理
  - 英雄招募、升级、治疗
  - 背包与物品系统
- 数据来源：用户本地 DD 安装目录 `E:\SteamLibrary\steamapps\common\DarkestDungeon\`
  - 英雄数据：`heroes/` 目录，15个原作英雄，每个有 `.info.darkest`（属性、技能、武器/护甲升级5级数值）
  - 怪物数据：`monsters/` 目录，每个怪物有 A/B/C/D/E 难度变体（Apprentice/Veteran/Champion/Darkest）
  - 地牢数据：`dungeons/` 目录，5大区域（crypts/warrens/weald/cove/darkestdungeon）+ DLC区域
  - DLC 数据：`dlc/` 目录，包含全部官方DLC + 大量Mod（V10重置版整合包）
  - 其他数据：`curios/`（好奇物）、`inventory/`（物品）、`effects/`（效果）、`localization/`（本地化文本）
- 可能导入的 ST 字段、世界书、预设或宏：待确认
- 目标平台和离线要求：先 Web 浏览器应用（首版快速验证核心循环），后封装桌面版（Tauri，支持本地存档与离线）
- 技术栈：
  - 前端框架：React + TypeScript
  - UI：Tailwind CSS + shadcn/ui
  - 状态管理：Zustand
  - 存档：IndexedDB（Web 阶段）→ SQLite（桌面阶段）
  - AI 接入：OpenAI/Anthropic API + 流式输出
  - 数据提取：从本地 DD `.darkest` 文件提取全部原始数值，转为 JSON 数据库

## 内容模式与边界初稿

- SFW / NSFW / 多模式 / 暂未决定：多模式可切换（默认 SFW 忠于原作，可切换 NSFW 扩展）
- 其他内容尺度或关系边界：SFW 模式保持 DD 原作哥特恐怖基调（暴力、疯狂、死亡）；NSFW 模式在 DD 世界观基础上扩展成人内容
- 明确排除：待确认（需在后续讨论中确定 NSFW 模式的具体边界）
- 模式隔离要求：SFW 与 NSFW 必须 Prompt、Lore、上下文、资源、模型、输出、存档全面隔离，不只隐藏 UI

## 草案状态表

| 条目 | 当前结论 | 状态 | 来源/理由 | 影响的后续 owner |
|---|---|---|---|---|
| 创建方式 | 从零创建独立前端应用 | 已确定 | 用户明确要求 | 全局 |
| 不依赖 ST 运行时 | 独立运行，不依赖 SillyTavern | 已确定 | 用户明确要求 | runtime-host |
| 复刻精度 | 全部精确复刻（A方案）：数值表、规则、内容全部1:1还原DD原作 | 已确定 | 用户明确要求全部精准复刻 | 全局 |
| 数据来源 | 用户本地 DD 安装目录（V10重置版整合包，含全DLC+大量Mod） | 已确定 | 用户提供本地路径，已验证数据完整性 | runtime-host |
| 参考源码 | MoRanJiangHu 的 CoT 战斗协议与数值体系 | 暂定 | 用户指定，待确认改编幅度 | rp-gameplay |
| 核心玩法 | 战斗+建筑+地牢地图+压力+火把 | 暂定 | 用户提出 | rp-gameplay |
| 同人/原创 | 同人，直接使用 Darkest Dungeon IP，高度复刻还原 | 已确定 | 用户明确要求直接做同人、高度复刻 | rp-worldbuilding |
| 内容尺度 | 多模式可切换（默认SFW，可切NSFW） | 已确定 | 用户确认方案C | rp-content-modes |
| 玩家身份 | 默认庄园主/指挥官，支持多视角自由切换（英雄、自定义角色、先祖、怪物等） | 已确定 | 用户明确要求，在A方案基础上扩展为多视角 | rp-player-role |
| 核心RP循环 | 完整复刻 DD 循环（庄园→地牢→战斗→结算→回庄→更深地牢→DD最终关卡） | 已确定 | 用户确认方案A | rp-gameplay |
| 游玩长度 | 长期固定（5大区域+Darkest Dungeon），+ 全部 DLC + 可扩展 Mod | 已确定 | 用户明确要求 | rp-gameplay |
| DLC 范围 | 全部 4 个官方 DLC 纳入（Crimson Court、Shieldbreaker、Color of Madness、Butcher's Circus） | 已确定 | 用户明确要求 | rp-worldbuilding |
| 目标平台 | 先 Web 浏览器（首版），后 Tauri 桌面版 | 已确定 | 用户确认方案C | runtime-platform |
| 技术栈 | React+TS / Tailwind+shadcn / Zustand / IndexedDB→SQLite / API流式 | 已确定 | 推荐方案，用户确认 | runtime-platform |

## 矛盾、遗漏与未知

| 问题 | 是否阻塞当前阶段 | 可选方案与影响 | 当前推荐 |
|---|---|---|---|
| 是否直接使用 Darkest Dungeon IP | 是（已解决） | 已确认 A) 直接同人，高度复刻还原 | 用户已确认 |
| 内容尺度（SFW/NSFW） | 是（已解决） | 已确认 C) 多模式可切换，默认SFW忠于原作，可切NSFW扩展 | 用户已确认 |
| 玩家在 RP 中的角色身份 | 是（已解决） | 已确认：默认庄园主/指挥官（A方案），扩展支持多视角自由切换（英雄、自定义角色、先祖、怪物等） | 用户已确认 |

## 本轮总结

- 已确认：从零创建独立前端应用、不依赖 ST 运行时、直接同人 DD 高度复刻、多模式可切换、默认庄园主+多视角切换、完整复刻 DD 核心循环、长期固定+全DLC+可扩展Mod、全部精确复刻、用户本地DD安装目录作为数据源、先Web后桌面、技术栈 React+TS+Tailwind+shadcn+Zustand
- 暂定：参考 MoRanJiangHu 战斗 CoT
- 明确不做：SillyTavern 角色卡形式、商业化
- 下一项：作品轮廓草案完成，进入方向确认 → 可行性与结构设计阶段
