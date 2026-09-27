# 霍格沃茨·同层卡 变量与模块 API 手册

> 版本 v1.0 ｜ 对应：schema.ts + 同层应用（同层前端.js 内嵌 1.5MB 应用）
> 铁律：stat_data 是唯一事实源——面板/脚本写数值，AI 只读并叙事，绝不重算。

## 一、变量总表（按模块）

### 1. 时间（stat_data.时间）
| 变量 | 类型 | 谁写 | 用途 |
|------|------|------|------|
| 日期 | string | AI/面板 | 剧情日期 |
| 星期 | string | 面板(推进一天) | 星期循环 |
| 时段 | string(上午/下午/晚间/深夜) | AI | 课表/事件时段 |
| 学年 | number 1-7 | AI(学年结算) | 学年路由 getwi 剧情_{N}年_{学期} |
| 学期 | string | AI | 学期路由 |
| 学期描述 | string | AI | 顶栏显示 |

### 2. 玩家（stat_data.玩家）
| 模块 | 变量 | 谁写 | 引用方 |
|------|------|------|--------|
| 学业 | 年级/学院/血统/各科(7科)/学业总分 | AI | 炼药成功率/OWL判定/状态面板 |
| 属性 | 体力/魔力值/魔法感知 | 面板/过夜 | 防线=魔力×1.2×系数/突破门槛 |
| 魔力阶位 | 大境界1-9/层1-3/层进度0-100/突破进度/心魔状态/突破记录[] | 突破面板 | 阶位路由/战力系数/状态面板 |
| 状态 | 情欲/快感 | AI/做爱面板 | 做爱入口(情欲<20拒战)/射精门槛 |
| 咒语 | 7主战咒{等级1-20,经验} | 战斗面板 | 伤害公式/经验条 |
| 魔咒库 | 扩展咒{等级} | 课程/阶位解锁 | 战斗选位/状态面板 |
| 装备 | 魔杖{名,材质,杖芯,品级}/巫师袍/饰品 | AI/商店 | 战斗加成(叙事)/状态面板 |
| 材料 | {数量,品级}×N | 商店/禁林 | 炼药/突破消耗 |
| 财产 | 金加隆/西可/纳特 | 商店/赌注 | 经济闭环 |
| 魔药 | 7种×数量 | 炼药面板 | 战斗/做爱/突破消耗 |
| 战绩 | 今日胜场/败场/累计缴械/累计被缴械/决斗荣誉 | 战斗面板 | 成就/统计 |
| **胜点** | number 0-9999 | **战斗面板** | **念头植入消耗** |
| **植入记录** | [{目标,性癖,消耗,契合度,成功率,植入日期,预计生效日,阶段,评价}] | 植入面板 | 植入史视图 |
| **文风强度** | 1-3(默认2) | 设置面板 | 淫秽文风分级上限 |
| 炼药 | 熟练度0-100 | 炼药面板 | 成功率修正 |
| 生理 | 射精次数/冷却/晨勃 | AI | 生理规范 |

### 3. 课表（stat_data.课表）
| 变量 | 谁写 | 用途 |
|------|------|------|
| 今日场次{时段} | 面板(生成课表) | 谁在线(可接触性) |
| 当前目标 | 面板/用户点选 | **调度器核心**：getwi 性格+性癖条目 |
| 战斗状态 | 战斗面板 | 未开始/进行中/已结算 |
| 战斗{回合,主角防守值,她防守值,目标列表,BUFF} | 战斗面板 | 决斗结算（AI 禁写） |

### 4. 双修（stat_data.双修）
会话状态/对象/主导方/体位/本轮动作[3]/使用物品/修为进度/情欲/快感/堕落/顺从/高潮待宣/快感清零/下轮高潮/裁决状态/可回溯/历史轮[] —— **全部做爱面板写**，AI 只读结算块。

### 5. 女巫角色（stat_data.女巫角色.{名}）
| 模块 | 变量 | 谁写 |
|------|------|------|
| 身份 | 身份/学院/血统/年级 | 初始化 |
| 标签 | 性格标签[2-3]/性癖标签[4-5] | 初始化+**植入生效时并入** |
| 关系 | 好感度/缴械值/堕落值/欲望积压/压力值 | AI(社交)/面板(战斗/做爱) |
| 战斗 | 名器/名器防御/防守值上限/技能/能力值/恢复技能 | 初始化(面板只读) |
| 身体 | 身体状态{各部位状态/敏感度/湿润度}/生理周期/服装 | 初始化+AI 微调 |
| 心理 | 心理状态{欲望度/羞耻感/兴奋/期待/精神状态} | AI |
| 深度 | 高潮次数/信任裂痕/**被植入念头[]** | 做爱面板/植入面板 |
| 秘密 | 秘密/口癖/心声/核心性癖 | 初始化(AI 叙事揭示) |

## 二、模块 API（同层应用内部）

### 桥接 RPC 协议（postMessage · 通道 hgw-rpc-v1）
| method | 参数 | 返回 | 说明 |
|--------|------|------|------|
| ping | - | {ok,pong,app,ver} | 桥接探测 |
| read_stat | - | {ok,result:stat} | 读 stat_data（Mvu→变量兜底） |
| write_stat | {patch} | {ok,result} | 深合并写回+推送应用 |
| send_action | {text} | {ok} | 结算块→createChatMessages+/trigger |
| get_transcript | - | {ok,result:[msgs]} | 剧情镜像 |
| get/set_gen_state | {state} | {ok,result} | 生成状态灯 |
| toggle_native | - | {ok} | 切换原生楼层显示 |

### 引擎 API（window.App 命名空间）
| 模块 | 函数 | 说明 |
|------|------|------|
| 桥接 | readStat/writeStat/sendAction/getTranscript/rpc | 数据层 |
| 战斗 | Battle.start/attack/forfeit/logPush | 决斗引擎（胜点产出在此） |
| 做爱 | Love.start/guide/confirmOrgasm/undo/finish/computeHints | 亲密引擎 |
| 炼药 | brew/buyMat/sellPotion | 生产与商店 |
| 突破 | doBreakthrough/resolveBreakthrough | 心魔判定 |
| 课表 | generateSchedule/nextDay | 时间经济 |
| **植入** | **computeFit/computeSuccess/kinkCost/latencyDays/implant/advanceImplant/activateImplant** | **念头改造系统** |
| UI | UI.toast/modal/confirm/prompt/drawer/floatNum/spellFlash/confetti | 组件库 |
| 数据 | TRAIT_QUICK/KINK_QUICK/SPELL_BOOK/POTION_BOOK/MAT_BOOK/NAMEI_BOOK/EVENT_POOL/STORY_SNAP/QUOTES | 图鉴数据池 |
| 全文 | TraitFull(30性格)/KinkFull(118性癖)/YearFull(15学年)/WorldFull(10世界观)/RealmFull(27阶位)/RuleFull/StageFull/VarFull | 世界全书 |

### 视图注册表（registerView）
home/story/status/schedule/roster/bonds/battle/love/brew/shop/breakthrough/**implant**/map/library/quidditch/divination/forest/achievements/stats/log/save/settings/guide/help

## 三、AI 调度链（一次回合的完整链路）

```
用户输入/面板动作
  → createChatMessages + /trigger（真实楼层）
  → 情境上下文EJS：当前目标 → getwi 性格(2-3)+性癖(4-5)条目
    + getwi 剧情_{学年}_{学期} + getwi 阶位_{境界}_{层}
  → 性格条目按好感度13阶段 / 性癖条目按欲望度5阶段 输出行为
  → 文风强度(设置) × 欲望/堕落 决定淫秽描写分级
  → AI 输出正文 + 按【变量更新规则】写回
  → 事件 message_received → shell reconcile → pushStatToApp → 应用重绘
```

## 四、防崩坏护栏

1. 面板独占字段（课表.战斗/双修五维/胜点/阶位判定）：AI 禁写
2. AI 可写字段表见 变量更新规则.yaml——写回必须按结算块数值
3. 植入改造：胜点只来自战斗（赢来的资格）；契合度决定性价比；潜伏期演出空间；察觉惩罚保好感平衡
4. 文风强度是上限不是下限——玩家设 1 时即使堕落值 100 也不写极端内容
