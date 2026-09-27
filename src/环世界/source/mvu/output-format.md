# 环世界 · 变量输出格式（额外模型模式）

本条目在「使用额外模型解析」时启用。本回复 **ONLY** 输出变量更新块 + 数据库更新块，禁止输出任何剧情正文。

**所有数据更新都由额外模型负责**（双写同步）：
1. **MVU 变量更新**（`<UpdateVariable>` + `<JSONPatch>`）→ 更新 stat_data
2. **SPV 数据库更新**（`<UpdateTable>` + SQL 语句）→ 更新 chatSheets 表格

两套更新必须**每轮同步输出**，确保 MVU 变量与数据库表格数据一致。主模型只负责叙事 + `<StatusPlaceHolderImpl/>`。

---

## ⚠⚠⚠ 第一优先级·绝对铁律 ⚠⚠⚠

**MVU 引擎通过正则 `/json_?patch/i` 检测回复是否包含字面字符串 "JSONPatch"**。
若回复不含字符串 "JSONPatch"（大小写不敏感），MVU 会抛错：
"从回复找到了`<UpdateVariable>`标签，但其内的更新命令无效"
→ **所有变量不更新，状态栏卡在 0 值**。

因此本回复必须**逐字包含** `<JSONPatch>` 开标签和 `</JSONPatch>` 闭标签，**禁止用裸 JSON 数组替代**。

**SPV 数据库引擎检测 `<UpdateTable>` 标签**：若回复包含 `<UpdateTable>`，SPV 扩展自动解析并执行其中的 SQL 语句。

---

## 更新策略：新出现全量，之后增量（统一逻辑）

**所有变量一律遵循同一逻辑**：

| 情形 | 策略 | 说明 |
|------|------|------|
| 对象/变量**首次出现** | **全量输出**该对象所有字段 | 首楼登场的新殖民者、新动物、新派系等，必须一次性输出全部字段 |
| 之后每轮 | **增量输出** | 只输出本轮变化的字段，未变化的不输出 |
| **关键值**（时间/生存/经济核心） | **每轮必须输出** | 即使无变化也要输出当前值，确保状态栏实时显示 |

### 每轮必须输出的字段（关键值·27字段）

**时间轴（4字段）**：
```
/殖民地/游戏日
/殖民地/时段
/殖民地/累计小时
/殖民地/阶段
```

**生存属性（20字段）**：
```
/殖民者_主角/饱腹 /殖民者_主角/疲劳 /殖民者_主角/心情 /殖民者_主角/精力值
/殖民者_2/饱腹 /殖民者_2/疲劳 /殖民者_2/心情
/殖民者_3/饱腹 /殖民者_3/疲劳 /殖民者_3/心情
/殖民者_4/饱腹 /殖民者_4/疲劳 /殖民者_4/心情
/殖民者_5/饱腹 /殖民者_5/疲劳 /殖民者_5/心情
```

**经济核心（3字段）**：
```
/殖民地/银两
/殖民地/威胁点数
/殖民地/袭击冷却
```

**其他所有变量**：增量输出（有变化才输出，首次出现全量）。

### 为什么这样设计
- **token 优化**：非关键字段未变化时不输出
- **状态栏保障**：关键值每轮输出确保状态栏实时显示时间/生存/经济
- **避免臆造覆盖**：只输出确认变化的字段

---

## NSFW 变量更新规则（重点）

环世界的 NSFW 变量有 3 个，更新策略各不同：

### 1. 精力值（每轮必输出）
- 路径：`/殖民者_主角/精力值`（0-100）
- **每轮必须输出**（已包含在 27 个关键字段中）
- NSFW 行为消耗 20-40，睡眠恢复 +10/小时，休息恢复 +5/小时
- 精力值 < 30 时拒绝 NSFW 行为

### 2. NSFW敏感度（增量更新·JSON字符串）
- 路径：`/殖民者_主角/NSFW敏感度`
- 类型：string，存储 JSON 对象
- 15 个部位：唇/颈/耳垂/胸/腋/腰/腹/臀/大腿内侧/膝窝/脚底/前阴/后庭/G点/A点
- 每个部位 0-100，默认 30
- **更新方式**：NSFW 行为发生时，受刺激部位敏感度 +1~3，输出**完整的 JSON 字符串**

**输出示例**：
```json
{ "op": "replace", "path": "/殖民者_主角/NSFW敏感度", "value": "{\"唇\":35,\"颈\":30,\"耳垂\":30,\"胸\":42,\"腋\":30,\"腰\":30,\"腹\":30,\"臀\":30,\"大腿内侧\":30,\"膝窝\":30,\"脚底\":30,\"前阴\":33,\"后庭\":30,\"G点\":30,\"A点\":30}" }
```

**注意**：
- value 必须是**完整的 JSON 字符串**（用双引号包裹，内部用 `\"` 转义）
- 不能只输出变化的部位，必须输出全部 15 个部位的当前值
- G点/A点仅女性角色适用，男性角色保持 30 不变

### 3. NSFW经验值（增量更新·JSON字符串）
- 路径：`/殖民者_主角/NSFW经验值`
- 类型：string，存储 JSON 对象
- 14 种类型：接吻/爱抚上/爱抚下/口给/口收/胸服/手活/正常位/后入/骑乘/侧位/后庭/群交/调教
- 每种类型 0-100，默认 0
- **更新方式**：NSFW 行为发生时，对应类型经验 +1~5，输出**完整的 JSON 字符串**

**输出示例**：
```json
{ "op": "replace", "path": "/殖民者_主角/NSFW经验值", "value": "{\"接吻\":8,\"爱抚上\":5,\"爱抚下\":3,\"口给\":0,\"口收\":0,\"胸服\":0,\"手活\":0,\"正常位\":0,\"后入\":0,\"骑乘\":0,\"侧位\":0,\"后庭\":0,\"群交\":0,\"调教\":0}" }
```

**注意**：
- value 必须是**完整的 JSON 字符串**（用双引号包裹，内部用 `\"` 转义）
- 不能只输出变化的类型，必须输出全部 14 种类型的当前值

### NSFW 行为更新流程

当发生 NSFW 行为时，额外模型必须：
1. 读取当前精力值，检查是否 ≥30（否则拒绝）
2. 消耗精力值 20-40（根据行为强度）
3. 对应类型经验值 +1~5
4. 受刺激部位敏感度 +1~3
5. 心情变化 -10~+20（根据关系阶段和自愿度）
6. 饱腹额外衰减 2

**输出顺序**：精力值 → NSFW敏感度 → NSFW经验值 → 心情 → 饱腹

---

## 其他殖民者的 NSFW 变量

殖民者_2~5 同样有 NSFW敏感度和 NSFW经验值字段，更新规则同上，路径替换为 `/殖民者_2/NSFW敏感度` 等。

**非 NSFW 场景**：不输出 NSFW敏感度和 NSFW经验值（保持不变）。
**NSFW 场景**：只输出参与 NSFW 行为的角色的 NSFW 变量，未参与的不输出。

---

## ⚠⚠⚠ 确定性骰子判定（每个行为必走） ⚠⚠⚠

**每个行为都必须通过确定性骰子引擎判定成败**。骰子引擎已在 `DDL确定性骰子引擎.txt` 中定义，提供以下函数：

### 核心骰子函数
- `_check(attributeValue, seed, difficulty)` → `{roll, threshold, result}`
  - result: 大成功/极难成功/普通成功/失败/大失败
  - difficulty: 普通/困难/极难
- `_lcgRoll(seed, count, sides)` → 骰子数组（LCG伪随机，同种子同结果）
- `_hashSeed(seed)` → 正整数（djb2哈希，确定性可复现）

### 12技能行为公式
- `_shootSkill(skill, weaponDamage, weaponAccMod)` → 射击
- `_meleeSkill(skill, weaponDamage)` → 格斗
- `_socialSkill(skill)` → 社交
- `_cookSkill(skill)` → 厨艺
- `_buildSkill(skill)` → 建设
- `_cropSkill(skill)` → 种植
- `_animalSkill(skill, tameDifficulty)` → 畜牧
- `_craftSkill(skill, reqSkill)` → 手工
- `_artSkill(skill)` → 艺术品
- `_medSkill(skill)` → 医疗
- `_researchSkill(skill)` → 研究
- `_mineSkill(skill)` → 采矿

### 骰子判定规则

**seed 构造**：`殖民者姓名 + 行为类型 + 当前时间`（确保确定性可复现）

**行为校验块内调用**：
```
<建造行为校验>
骰子判定：
- seed: "艾莉+建造+08:30"
- 技能值: getvar('stat_data.殖民者_主角.建设') = 8
- 难度: 普通
- _check(8, "艾莉+建造+08:30", "普通") → {roll: 45, threshold: 8, result: "普通成功"}
- _buildSkill(8) → {建造速度: 1.64, 优秀率: 32, 失败率: 15.6, ...}
判定结果：普通成功，建造完成，产出优秀率32%
变量影响：/殖民者_主角/疲劳 +5, /殖民地/银两 -50(材料消耗)
</建造行为校验>
```

**骰子结果影响变量更新**：
- 大成功：产出翻倍，疲劳+3，心情+5
- 极难成功：产出1.5倍，疲劳+4
- 普通成功：正常产出，疲劳+5
- 失败：无产出，疲劳+5，材料消耗
- 大失败：事故触发，疲劳+8，心情-10，可能受伤

---

## 输出顺序

1. `<UpdateVariable>` 块（JSONPatch 格式的 MVU 变量更新）
2. `<UpdateTable>` 块（SQL 语句的 SPV 数据库更新）

---

## 最小合法输出（绝对底线·不可再简化）

```
<UpdateVariable>
<Analysis>
1时间：本轮时间流逝（每轮固定+30分钟）
2生存：列出5个殖民者的生存属性变化
3经济：列出经济变量变化
4变化：列出其他变量变化
5新出现：本轮是否有首次登场的对象
6骰子：列出本轮骰子判定结果
</Analysis>
<JSONPatch>
[
  // 时间（每轮必须）
  { "op": "replace", "path": "/殖民地/游戏日", "value": 1 },
  { "op": "replace", "path": "/殖民地/时段", "value": "上午" },
  { "op": "replace", "path": "/殖民地/累计小时", "value": 2 },
  { "op": "replace", "path": "/殖民地/阶段", "value": "开局" },
  // 生存属性（每轮必须）
  { "op": "replace", "path": "/殖民者_主角/饱腹", "value": 75 },
  { "op": "replace", "path": "/殖民者_主角/疲劳", "value": 25 },
  { "op": "replace", "path": "/殖民者_主角/心情", "value": 55 },
  { "op": "replace", "path": "/殖民者_主角/精力值", "value": 95 },
  // ...其他4个殖民者生存属性...
  // 经济核心（每轮必须）
  { "op": "replace", "path": "/殖民地/银两", "value": 750 },
  { "op": "replace", "path": "/殖民地/威胁点数", "value": 15 },
  { "op": "replace", "path": "/殖民地/袭击冷却", "value": 5 }
]
</JSONPatch>
</UpdateVariable>
<UpdateTable>
-- global_state 表：每轮UPDATE时间+经济（与 /殖民地/* 同步）
UPDATE global_state SET cur_time = '08:30', elapsed_time = '30分', wealth_total = 750, threat_points = 15, raid_cooldown = 5 WHERE row_id = 1;
-- protagonist_info 表：每轮UPDATE生存属性（与 /殖民者_主角/* 同步）
UPDATE protagonist_info SET hunger = 75, fatigue = 25, mood = 55 WHERE row_id = 1;
</UpdateTable>
```

**要求 3 对标签**：
- `<UpdateVariable>` ... `</UpdateVariable>`（外层包裹）
- `<JSONPatch>` ... `</JSONPatch>`（JSON 数组包裹，**MVU 解析触发条件**）
- `<UpdateTable>` ... `</UpdateTable>`（SQL 语句包裹，**SPV 数据库解析触发条件**）

**漏 `<JSONPatch>` 标签 = 变量更新失败 = 状态栏全 0**。
**漏 `<UpdateTable>` 标签 = 数据库不更新 = 表格数据与变量不同步**。

---

## ⚠⚠⚠ 数据库更新规则（SPV chatSheets 14表） ⚠⚠⚠

**核心原则**：MVU 变量与数据库表格**双写同步**，每轮同时输出 `<UpdateVariable>` 和 `<UpdateTable>`。

### 每轮必须更新的表

1. **global_state**（1行）：更新时间+经济字段，与 `/殖民地/*` 同步
   - `cur_time` / `elapsed_time` / `wealth_total` / `threat_points` / `raid_cooldown`
   - `row_id = 1`

2. **protagonist_info**（1行）：更新生存属性，与 `/殖民者_主角/*` 同步
   - `hunger` / `thirst` / `fatigue` / `mood` / `money`
   - `row_id = 1`

### 按需更新的表

3. **important_non_romance**（多行）：其他殖民者/NPC字段变化时UPDATE，新登场INSERT
4. **protagonist_skills**（多行）：技能等级变化时UPDATE
5. **inventory**（多行）：物品增减时INSERT/UPDATE/DELETE
6. **quests_events**（多行）：任务触发/进度变化时INSERT/UPDATE
7. **chronicle**（多行）：每轮INSERT新行（纪要日志，禁止UPDATE/DELETE）
8. **options**（1行）：每轮UPDATE 4个选项
9. **tech_progress**（多行）：科技研发进度变化时UPDATE
10. **dice_state**（多行）：骰子事件触发时INSERT/UPDATE
11. **wealth_ledger**（多行）：财富明细变化时INSERT/UPDATE
12. **implants**（多行）：植入体安装时INSERT
13. **faction_relations**（多行）：派系关系变化时UPDATE
14. **colony_buildings**（多行）：建筑变化时INSERT/UPDATE

### SQL 语法规则
- UPDATE 必须带 WHERE 条件（避免全表更新）
- 多条 SQL 用分号 `;` 分隔
- 字符串值用单引号 `'...'` 包裹
- NULL 值写 `NULL`
- chronicle 表每轮INSERT新行，禁止UPDATE/DELETE

### 数据库表字段映射（MVU 路径 ↔ 数据库列名）

**global_state 表**：
| MVU 路径 | 数据库列 |
|---------|---------|
| /殖民地/游戏日 | row_id（隐含） |
| /殖民地/时段 | cur_time（映射） |
| /殖民地/累计小时 | elapsed_time |
| /殖民地/天气 | weather |
| /殖民地/温度 | temperature |
| /殖民地/财富总值 | wealth_total |
| /殖民地/威胁点数 | threat_points |
| /殖民地/袭击冷却 | raid_cooldown |

**protagonist_info 表**：
| MVU 路径 | 数据库列 |
|---------|---------|
| /殖民者_主角/饱腹 | hunger |
| /殖民者_主角/疲劳 | fatigue |
| /殖民者_主角/心情 | mood |
| /殖民者_主角/银两 | money |

---

## 支持的操作

| 操作 | 说明 |
|------|------|
| replace | 替换值（最常用，数值更新唯一允许的操作） |
| add | 新增字段（少用） |
| remove | **禁止使用** |
| move | **禁止使用** |
| delta | **禁止使用**（必须用 replace 输出计算后的完整值） |

---

## 路径格式

- 路径用**斜杠分隔**：`/殖民者_主角/饱腹`
- **无 stat_data 前缀**
- 派系路径：`/派系/部落联盟/关系`（含子命名空间）

---

## Analysis 思维链（推荐·中文）

```
<Analysis>
1时间：本轮时间流逝（每轮固定+30分钟，时段是否切换）
2生存：列出5个殖民者的生存属性变化及计算过程
3经济：列出经济变量变化（银两/威胁/袭击冷却）
4变化：列出其他变量变化（技能/装备/派系/动物等）
5新出现：本轮是否有首次登场的对象（新殖民者/新动物/新派系等）
6骰子：列出本轮所有行为的骰子判定结果（seed/技能值/难度/结果）
</Analysis>
```

---

## 推荐输出格式（增量示例·非NSFW场景）

```
<UpdateVariable>
<Analysis>
1时间：本轮 08:00→08:30，时段不变(上午)，累计小时 1.5→2
2生存：主角饱腹80→75(-5衰减)，疲劳20→25(+5)，心情50→55(用餐+5)，精力值100→95(-5)；殖民者2饱腹75→70(-5)，疲劳30→35(+5)
3经济：银两800→750(购买材料×5花费50)，威胁点数0→15(财富增长触发)，袭击冷却5→4(-1)
4变化：主角建设技能8→9(完成建造+1)
5新出现：无
6骰子：建造判定 seed="艾莉+建造+08:30" 技能8 普通 _check→普通成功；采集判定 seed="艾莉+采矿+08:30" 技能5 普通 _check→普通成功
</Analysis>
<JSONPatch>
[
  // 时间（每轮必须）
  { "op": "replace", "path": "/殖民地/游戏日", "value": 1 },
  { "op": "replace", "path": "/殖民地/时段", "value": "上午" },
  { "op": "replace", "path": "/殖民地/累计小时", "value": 2 },
  { "op": "replace", "path": "/殖民地/阶段", "value": "开局" },
  // 生存属性（每轮必须）
  { "op": "replace", "path": "/殖民者_主角/饱腹", "value": 75 },
  { "op": "replace", "path": "/殖民者_主角/疲劳", "value": 25 },
  { "op": "replace", "path": "/殖民者_主角/心情", "value": 55 },
  { "op": "replace", "path": "/殖民者_主角/精力值", "value": 95 },
  { "op": "replace", "path": "/殖民者_2/饱腹", "value": 70 },
  { "op": "replace", "path": "/殖民者_2/疲劳", "value": 35 },
  { "op": "replace", "path": "/殖民者_2/心情", "value": 50 },
  // ...殖民者3~5生存属性...
  // 经济核心（每轮必须）
  { "op": "replace", "path": "/殖民地/银两", "value": 750 },
  { "op": "replace", "path": "/殖民地/威胁点数", "value": 15 },
  { "op": "replace", "path": "/殖民地/袭击冷却", "value": 4 },
  // 增量字段（仅输出本轮变化的）
  { "op": "replace", "path": "/殖民者_主角/建设", "value": 9 }
]
</JSONPatch>
</UpdateVariable>
<UpdateTable>
-- global_state 表：每轮UPDATE时间+经济
UPDATE global_state SET cur_time = '08:30', elapsed_time = '30分', wealth_total = 750, threat_points = 15, raid_cooldown = 4 WHERE row_id = 1;
-- protagonist_info 表：每轮UPDATE生存属性
UPDATE protagonist_info SET hunger = 75, fatigue = 25, mood = 55, money = 750 WHERE row_id = 1;
-- chronicle 表：每轮INSERT纪要
INSERT INTO chronicle (row_id, code_index, time_span, summary, chronicle_text, key_dialogue) VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM chronicle), 'AM0002', '08:00 ~ 08:30', '建设+采集', '主角完成建造任务，采集材料。');
-- options 表：每轮UPDATE 4选项
UPDATE options SET option_1 = '继续建造', option_2 = '休息', option_3 = '探索周边', option_4 = '与殖民者交谈' WHERE row_id = 1;
</UpdateTable>
```

### 首楼全量输出示例（新对象首次登场）

```
<UpdateVariable>
<Analysis>
1时间：首楼初始化，08:00 上午
2生存：首楼全量初始化5个殖民者生存属性
3经济：首楼初始化经济
4变化：首楼全量初始化
5新出现：殖民者_主角/2/3首次登场，全量输出49字段
6骰子：首楼无行为判定
</Analysis>
<JSONPatch>
[
  // 时间（每轮必须）
  { "op": "replace", "path": "/殖民地/游戏日", "value": 1 },
  { "op": "replace", "path": "/殖民地/时段", "value": "上午" },
  { "op": "replace", "path": "/殖民地/累计小时", "value": 0 },
  { "op": "replace", "path": "/殖民地/阶段", "value": "开局" },
  // 殖民者_主角首次登场：全量49字段
  { "op": "replace", "path": "/殖民者_主角/姓名", "value": "艾莉" },
  { "op": "replace", "path": "/殖民者_主角/性别", "value": "女" },
  { "op": "replace", "path": "/殖民者_主角/年龄", "value": 22 },
  // ...继续输出全部49字段...
  { "op": "replace", "path": "/殖民者_主角/手术次数", "value": 0 },
  // 殖民者_2首次登场：全量49字段
  { "op": "replace", "path": "/殖民者_2/姓名", "value": "杰克" },
  // ...继续输出全部49字段...
  { "op": "replace", "path": "/殖民者_2/手术次数", "value": 0 }
]
</JSONPatch>
</UpdateVariable>
<UpdateTable>
-- global_state 表：首楼INSERT
INSERT INTO global_state (row_id, colony_name, biome_type, storyteller, game_stage, cur_time, weather, temperature, wealth_total, threat_points, raid_cooldown) VALUES (1, '新殖民地', '温带森林', '卡桑德拉', '开局', '08:00', '晴', 20, 0, 0, 5);
-- protagonist_info 表：首楼INSERT
INSERT INTO protagonist_info (row_id, name, gender, age, hunger, thirst, fatigue, mood, money, skills_summary, traits) VALUES (1, '艾莉', '女', '22', 80, 80, 20, 50, 800, '射击3/格斗2/社交5', '勤劳');
-- important_non_romance 表：首楼INSERT其他殖民者
INSERT INTO important_non_romance (row_id, name, gender, age, brief_intro, appearance, location_name, presence_status) VALUES (1, '杰克', '男', '25', '殖民者', '壮汉', '殖民地', '在场');
-- chronicle 表：首楼INSERT纪要
INSERT INTO chronicle (row_id, code_index, time_span, summary, chronicle_text) VALUES (1, 'AM0001', '08:00', '殖民地建立', '三位殖民者抵达新殖民地。');
-- options 表：首楼INSERT选项
INSERT INTO options (row_id, option_1, option_2, option_3, option_4) VALUES (1, '建造房屋', '采集食物', '探索周边', '分配工作');
</UpdateTable>
```

### NSFW 场景输出示例（重点）

```
<UpdateVariable>
<Analysis>
1时间：本轮 22:00→22:30，时段不变(夜晚)，累计小时 14→14.5
2生存：主角饱腹60→58(-2 NSFW额外衰减)，疲劳40→45(+5)，心情55→70(+15 NSFW愉悦)，精力值80→50(-30 NSFW消耗)；殖民者2饱腹65→63(-2)，疲劳35→40(+5)，心情50→65(+15)，精力值85→55(-30)
3经济：无变化
4变化：主角NSFW经验值(接吻+3, 爱抚上+2)，NSFW敏感度(唇+2, 胸+3)；殖民者2 NSFW经验值(接吻+3)，NSFW敏感度(唇+2)
5新出现：无
6骰子：无行为判定（NSFW行为不走骰子）
</Analysis>
<JSONPatch>
[
  // 时间（每轮必须）
  { "op": "replace", "path": "/殖民地/游戏日", "value": 1 },
  { "op": "replace", "path": "/殖民地/时段", "value": "夜晚" },
  { "op": "replace", "path": "/殖民地/累计小时", "value": 14.5 },
  { "op": "replace", "path": "/殖民地/阶段", "value": "开局" },
  // 生存属性（每轮必须）
  { "op": "replace", "path": "/殖民者_主角/饱腹", "value": 58 },
  { "op": "replace", "path": "/殖民者_主角/疲劳", "value": 45 },
  { "op": "replace", "path": "/殖民者_主角/心情", "value": 70 },
  { "op": "replace", "path": "/殖民者_主角/精力值", "value": 50 },
  { "op": "replace", "path": "/殖民者_2/饱腹", "value": 63 },
  { "op": "replace", "path": "/殖民者_2/疲劳", "value": 40 },
  { "op": "replace", "path": "/殖民者_2/心情", "value": 65 },
  // ...殖民者3~5生存属性...
  // 经济核心（每轮必须）
  { "op": "replace", "path": "/殖民地/银两", "value": 750 },
  { "op": "replace", "path": "/殖民地/威胁点数", "value": 15 },
  { "op": "replace", "path": "/殖民地/袭击冷却", "value": 4 },
  // NSFW变量（增量：NSFW行为发生时才输出）
  { "op": "replace", "path": "/殖民者_主角/NSFW敏感度", "value": "{\"唇\":37,\"颈\":30,\"耳垂\":30,\"胸\":44,\"腋\":30,\"腰\":30,\"腹\":30,\"臀\":30,\"大腿内侧\":30,\"膝窝\":30,\"脚底\":30,\"前阴\":33,\"后庭\":30,\"G点\":30,\"A点\":30}" },
  { "op": "replace", "path": "/殖民者_主角/NSFW经验值", "value": "{\"接吻\":11,\"爱抚上\":7,\"爱抚下\":3,\"口给\":0,\"口收\":0,\"胸服\":0,\"手活\":0,\"正常位\":0,\"后入\":0,\"骑乘\":0,\"侧位\":0,\"后庭\":0,\"群交\":0,\"调教\":0}" },
  { "op": "replace", "path": "/殖民者_2/NSFW敏感度", "value": "{\"唇\":32,\"颈\":30,\"耳垂\":30,\"胸\":30,\"腋\":30,\"腰\":30,\"腹\":30,\"臀\":30,\"大腿内侧\":30,\"膝窝\":30,\"脚底\":30,\"前阴\":30,\"后庭\":30,\"G点\":30,\"A点\":30}" },
  { "op": "replace", "path": "/殖民者_2/NSFW经验值", "value": "{\"接吻\":3,\"爱抚上\":0,\"爱抚下\":0,\"口给\":0,\"口收\":0,\"胸服\":0,\"手活\":0,\"正常位\":0,\"后入\":0,\"骑乘\":0,\"侧位\":0,\"后庭\":0,\"群交\":0,\"调教\":0}" }
]
</JSONPatch>
</UpdateVariable>
<UpdateTable>
-- global_state 表：每轮UPDATE时间+经济
UPDATE global_state SET cur_time = '22:30', elapsed_time = '30分', wealth_total = 750, threat_points = 15, raid_cooldown = 4 WHERE row_id = 1;
-- protagonist_info 表：每轮UPDATE生存属性
UPDATE protagonist_info SET hunger = 58, fatigue = 45, mood = 70, money = 750 WHERE row_id = 1;
-- chronicle 表：每轮INSERT纪要
INSERT INTO chronicle (row_id, code_index, time_span, summary, chronicle_text) VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM chronicle), 'PM0005', '22:00 ~ 22:30', 'NSFW互动', '主角与殖民者2进行亲密互动。');
-- options 表：每轮UPDATE 4选项
UPDATE options SET option_1 = '继续', option_2 = '休息', option_3 = '交谈', option_4 = '结束' WHERE row_id = 1;
</UpdateTable>
```

`<Analysis>` 是**可选**的思维链，便于调试和推理审计。但 `<JSONPatch>` 和 `<UpdateTable>` 都是**强制的**。

---

## ⚠⚠⚠ 绝对禁止·致命错误示例

**错误1（最常见致命错误）**：漏 `<Analysis>` 和 `<JSONPatch>` 标签，直接输出编号正文 + 裸 JSON 数组

```
1时间：本轮 30 分钟流逝
2变化：饱腹75，疲劳25
[
  { "op": "replace", "path": "/殖民地/时段", "value": "上午" }
]
```

后果：MVU 找不到字符串 "JSONPatch"，抛错"更新命令无效"，**所有变量不更新**

**错误2**：使用 `<json_patch>` 或 `<patch>` 变体（必须用 `<JSONPatch>` 标准形式）

**错误3**：把 `<JSONPatch>` 写成 `<JSON-Patch>` 或 `<JSON patch>`（带空格/连字符）

**错误4**：在 `<JSONPatch>` 内放简单 JSON 对象而非数组
```
<JSONPatch>
{ "殖民者_主角.饱腹": 75 }
</JSONPatch>
```
（必须是 `[{...}]` 数组形式）

**错误5**：路径用点号而非斜杠
```
{ "op": "replace", "path": "殖民者_主角.饱腹", "value": 75 }
```

**错误6**：路径带 stat_data 前缀
```
{ "op": "replace", "path": "/stat_data/殖民者_主角/饱腹", "value": 75 }
```

**错误7**：在 `</UpdateVariable>` 后还有多余内容（thinking/旁白/正文等）

**错误8**：使用 delta 操作（已废弃）
```
{ "op": "delta", "path": "/殖民者_主角/饱腹", "value": -5 }
```
后果：必须用 replace 输出计算后的完整值：`{ "op": "replace", "path": "/殖民者_主角/饱腹", "value": 75 }`

**错误9（新出现未全量·状态栏字段残缺）**：新殖民者首次登场只输出部分字段，导致状态栏该对象大量字段显示为0/空

```
// ❌ 殖民者_3首次登场，只输出3个字段
{ "op": "replace", "path": "/殖民者_3/姓名", "value": "玛丽" },
{ "op": "replace", "path": "/殖民者_3/饱腹", "value": 80 },
{ "op": "replace", "path": "/殖民者_3/疲劳", "value": 20 }
```
后果：殖民者_3的性别/年龄/技能/装备等46个字段在状态栏显示为默认值，与叙事不一致！

**正确做法**：新对象首次登场必须全量输出所有字段（殖民者49字段/奴隶12字段/动物11字段等）。

**错误10（派系路径格式错误）**：派系路径缺少子命名空间
```
{ "op": "replace", "path": "/派系/部落联盟", "value": 5 }
```
后果：路径不匹配 schema 结构，更新失败。

**正确做法**：派系路径必须包含子命名空间和字段名：`/派系/部落联盟/关系`

**错误11（漏 `<UpdateTable>` 块·数据库不更新）**：只输出了 `<UpdateVariable>` 块更新 MVU 变量，但漏了 `<UpdateTable>` 块

```
<UpdateVariable>
<JSONPatch>
[ ... ]
</JSONPatch>
</UpdateVariable>
// ❌ 漏了 <UpdateTable> 块
```
后果：MVU 变量更新了，但数据库表格数据不更新，状态栏表格数据与变量不同步！

**正确做法**：每轮同时输出 `<UpdateVariable>` 和 `<UpdateTable>` 两个块，确保 MVU 变量与数据库同步更新。

**错误12（`<UpdateTable>` 内 SQL 语法错误）**：SQL 语句违反语法

```sql
-- ❌ UPDATE 缺少 WHERE 条件（全表更新）
UPDATE protagonist_info SET hunger = 75;
-- ❌ chronicle 表使用 UPDATE（禁止，只能INSERT）
UPDATE chronicle SET summary = '新纪要' WHERE row_id = 1;
```

后果：SPV 扩展执行 SQL 报错，数据库不更新。

**正确做法**：UPDATE 必须带 WHERE；chronicle 表每轮INSERT新行，禁止UPDATE/DELETE。

**错误13（漏骰子判定·行为无依据）**：行为校验块内没有调用 `_check` 函数，直接判定成功

```
<建造行为校验>
主角建造房屋，成功完成。
</建造行为校验>
```
后果：行为成败无依据，违反确定性骰子规则！

**正确做法**：每个行为校验块内必须调用 `_check` 函数，记录 seed/技能值/难度/结果。

**错误14（关键值遗漏·状态栏显示旧值）**：只输出了变化字段，遗漏每轮必须输出的27个关键字段
```
// ❌ 只输出银两变化，遗漏时间/生存属性
{ "op": "replace", "path": "/殖民地/银两", "value": 750 }
```
后果：状态栏时间/生存属性/经济核心显示为上一轮旧值，与叙事不一致！

**正确做法**：每轮必须输出27个关键字段（时间4+生存20+经济3），即使其他变量无变化也要输出关键字段。

**错误15（NSFW变量只输出部分部位/类型）**：NSFW敏感度只输出变化的部位，遗漏其他部位

```
// ❌ NSFW敏感度只输出变化的部位
{ "op": "replace", "path": "/殖民者_主角/NSFW敏感度", "value": "{\"唇\":37,\"胸\":44}" }
```
后果：其他13个部位的值丢失，状态栏NSFW面板显示错误！

**正确做法**：NSFW敏感度必须输出全部15个部位的完整JSON字符串，NSFW经验值必须输出全部14种类型的完整JSON字符串。

**错误16（NSFW变量JSON格式错误）**：value 不是合法的 JSON 字符串

```
// ❌ value 是 JSON 对象而非字符串
{ "op": "replace", "path": "/殖民者_主角/NSFW敏感度", "value": {"唇":37,"胸":44} }
// ❌ 字符串内引号未转义
{ "op": "replace", "path": "/殖民者_主角/NSFW敏感度", "value": "{"唇":37}" }
```
后果：schema.js 定义 NSFW敏感度为 string 类型，传入对象会导致类型错误；引号未转义会导致 JSONPatch 解析失败。

**正确做法**：value 必须是用双引号包裹的完整 JSON 字符串，内部双引号用 `\"` 转义：
```json
{ "op": "replace", "path": "/殖民者_主角/NSFW敏感度", "value": "{\"唇\":37,\"颈\":30,...}" }
```

---

## ⚠⚠⚠ 强制输出检查清单 ⚠⚠⚠

### 0. 双写同步检查（每轮必查）
- 回复中是否同时包含 `<UpdateVariable>` 块和 `<UpdateTable>` 块？
- `<UpdateVariable>` 中的 `/殖民地/*` 值，是否与 `<UpdateTable>` 中 `UPDATE global_state` 的字段值**完全一致**？
- `<UpdateVariable>` 中的 `/殖民者_主角/*` 值，是否与 `<UpdateTable>` 中 `UPDATE protagonist_info` 的字段值**完全一致**？

### 1. 时间流逝（每轮必查）
- `/殖民地/游戏日` `/殖民地/时段` `/殖民地/累计小时` `/殖民地/阶段` 是否已更新？
- 每楼层固定流逝30分钟，累计小时+0.5
- 跨时段时是否切换了 `/殖民地/时段`？
- 跨日时是否更新了 `/殖民地/游戏日` 和 `/殖民地/季节`？

### 2. 生存属性（每轮必查）
- 5个殖民者的 `/殖民者_X/饱腹` 是否已更新？（每轮-3~5，进食时增加）
- 5个殖民者的 `/殖民者_X/疲劳` 是否已更新？（每轮+4，休息时减少）
- 5个殖民者的 `/殖民者_X/心情` 是否已更新？（有事件影响时变化）
- 主角的 `/殖民者_主角/精力值` 是否已更新？（NSFW/劳动消耗，休息恢复）

### 3. 经济核心（每轮必查）
- `/殖民地/银两`：每轮必须输出当前值
- `/殖民地/威胁点数`：每轮必须输出当前值
- `/殖民地/袭击冷却`：每轮必须输出当前值（每轮-1）

### 4. 新出现对象全量（首次登场必查）
- 本轮是否有新登场的殖民者/奴隶/动物/派系？
- 新对象是否**全量输出**了所有字段？（殖民者49字段/奴隶12字段/动物11字段/派系1字段）

### 5. 骰子判定（每个行为必查）
- 每个行为校验块内是否调用了 `_check` 函数？
- 是否记录了 seed/技能值/难度/结果？
- 骰子结果是否影响了变量更新（大成功翻倍/大失败事故）？

### 6. NSFW 变量（NSFW场景必查）
- 发生 NSFW 行为时，精力值是否已更新？（消耗20-40）
- NSFW敏感度是否输出了**完整的15部位JSON字符串**？（不是只输出变化的部位）
- NSFW经验值是否输出了**完整的14类型JSON字符串**？（不是只输出变化的类型）
- 参与NSFW行为角色的NSFW变量是否都已更新？（未参与的不输出）
- JSON字符串格式是否正确？（双引号包裹，内部`\"`转义）

### 7. 派系关系（有变化时输出）
- `/派系/${派系名}/关系`：贸易/任务/援助/袭击时变化
- 8个派系：部落联盟/城市邦联/商人公会/海盗团/机械教团/帝国/游牧部落/流亡者组织

### 8. 虫害系统触发（深度>0时必查）
- 当 `/殖民地/挖掘深度` > 0 时，虫害触发概率随深度增加
- 虫害触发时必须更新 `/事件计时器/当前事件` 和 `/事件计时器/倒计时`

### 9. 袭击事件（触发时输出）
- `/殖民地/袭击冷却` 每轮-1，归零时可能触发袭击
- 袭击发生时更新 `/事件计时器/上次袭击日` 和 `/殖民地/警戒等级`

---

## 合法变量路径清单

### 殖民地（31字段）
```
/殖民地/游戏日 /殖民地/时段 /殖民地/累计小时 /殖民地/季节 /殖民地/温度
/殖民地/天气 /殖民地/biome /殖民地/故事讲述者 /殖民地/阶段
/殖民地/财富总值 /殖民地/殖民者价值 /殖民地/建筑价值 /殖民地/物资价值 /殖民地/动物价值
/殖民地/银两 /殖民地/威胁点数 /殖民地/袭击冷却 /殖民地/警戒等级
/殖民地/电力总发电 /殖民地/电力总需求 /殖民地/电力净额 /殖民地/蓄电池电量 /殖民地/蓄电池容量
/殖民地/飞船反应堆 /殖民地/飞船AI核心 /殖民地/飞船结构
/殖民地/污染源数量 /殖民地/净化设备数 /殖民地/信仰值 /殖民地/卫生条件 /殖民地/挖掘深度
```

### 殖民者_主角（49字段）
```
/殖民者_主角/姓名 /殖民者_主角/性别 /殖民者_主角/年龄 /殖民者_主角/外貌
/殖民者_主角/位置 /殖民者_主角/工作分配
/殖民者_主角/心情 /殖民者_主角/饱腹 /殖民者_主角/疲劳 /殖民者_主角/娱乐
/殖民者_主角/舒适度 /殖民者_主角/美观度 /殖民者_主角/银两
/殖民者_主角/射击 /殖民者_主角/格斗 /殖民者_主角/社交 /殖民者_主角/厨艺
/殖民者_主角/建设 /殖民者_主角/种植 /殖民者_主角/畜牧 /殖民者_主角/手工
/殖民者_主角/艺术品 /殖民者_主角/医疗 /殖民者_主角/研究 /殖民者_主角/采矿
/殖民者_主角/头部 /殖民者_主角/躯干 /殖民者_主角/左臂 /殖民者_主角/右臂
/殖民者_主角/左腿 /殖民者_主角/右腿
/殖民者_主角/武器 /殖民者_主角/衣物 /殖民者_主角/护甲
/殖民者_主角/特质 /殖民者_主角/特质系数
/殖民者_主角/周期日 /殖民者_主角/怀孕状态 /殖民者_主角/精力值
/殖民者_主角/NSFW敏感度 /殖民者_主角/NSFW经验值 /殖民者_主角/关系阶段
/殖民者_主角/疾病 /殖民者_主角/疾病阶段 /殖民者_主角/免疫力
/殖民者_主角/卧床 /殖民者_主角/健康 /殖民者_主角/血量 /殖民者_主角/手术次数
```

### 殖民者_2至5（各49字段，路径同上替换_主角为_2/3/4/5）

### 奴隶_1（12字段）
```
/奴隶_1/姓名 /奴隶_1/性别 /奴隶_1/年龄 /奴隶_1/类型
/奴隶_1/心情 /奴隶_1/饱腹 /奴隶_1/疲劳 /奴隶_1/健康
/奴隶_1/待遇 /奴隶_1/招募进度 /奴隶_1/工作分配 /奴隶_1/位置
```

### 动物_1/动物_2（各11字段）
```
/动物_1/类型 /动物_1/姓名 /动物_1/性别 /动物_1/年龄
/动物_1/健康 /动物_1/心情 /动物_1/驯服度 /动物_1/产物计时
/动物_1/训练等级 /动物_1/位置 /动物_1/数量
```

### 事件计时器（10字段）
```
/事件计时器/上次袭击日 /事件计时器/上次贸易日 /事件计时器/上次疾病日
/事件计时器/上次精神事件日 /事件计时器/上次特殊事件日 /事件计时器/上次陨石日
/事件计时器/上次动物迁徙日 /事件计时器/上次任务日
/事件计时器/当前事件 /事件计时器/倒计时
```

### 派系（8个×1字段）
```
/派系/部落联盟/关系 /派系/城市邦联/关系 /派系/商人公会/关系 /派系/海盗团/关系
/派系/机械教团/关系 /派系/帝国/关系 /派系/游牧部落/关系 /派系/流亡者组织/关系
```

---

## 规则

- 严格按「变量更新规则.yaml」中的变量更新规则计算变化；仅更新 schema.js 中已声明的路径
- 基于**当前楼层剧情**（主 API 已输出的叙事）判断，勿引用更早楼层的过时状态
- **时间流逝规则**：每楼层固定流逝 30 分钟。无论叙事字数多少，时间只推进 30 分钟
- **更新策略**：新出现全量，之后增量，关键值（时间/生存/经济核心）每轮必须
- **数值更新必须用 replace 输出计算后的完整当前值**（禁止 delta）
  - 错误：`{ "op": "delta", "path": "/殖民者_主角/饱腹", "value": -5 }`
  - 正确：`{ "op": "replace", "path": "/殖民者_主角/饱腹", "value": 75 }`（计算后的完整值）
- **replace 的 value 类型必须与 schema 一致**（string/number/boolean/object/array）
- **双写同步**：每轮同时输出 `<UpdateVariable>` 和 `<UpdateTable>`，确保 MVU 变量与数据库同步
- **骰子判定**：每个行为校验块内必须调用 `_check` 函数，骰子结果影响变量更新
- **NSFW变量**：NSFW敏感度和NSFW经验值是JSON字符串，更新时必须输出完整的JSON字符串（全部15部位/14类型），不能只输出变化的部分
- **无变更时仍需输出完整 `<UpdateVariable>` 块**（`<JSONPatch>` 内可为仅含27个关键字段的最小数组），**绝不省略 `<JSONPatch>` 标签**
- JSON Patch 路径用斜杠分隔，**无 stat_data 前缀**
- **禁止输出** `<thinking>`、`[metacognition]`、叙事正文、`<StatusPlaceHolderImpl/>` 等任何非 `<UpdateVariable>` / `<UpdateTable>` 块内容
- 主模型禁止输出 `<UpdateVariable>` 和 `<UpdateTable>` 块，仅由额外模型负责所有数据更新
