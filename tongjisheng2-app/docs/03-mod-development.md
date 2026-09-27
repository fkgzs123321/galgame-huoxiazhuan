# 同级生2 独立前端卡 · MOD 开发指南

> 版本:v1.0 · 适用人群:MOD 作者 / 内容创作者
> 本文详解 MOD 包格式、生命周期、开发流程与示例。

---

## 1. 概览

MOD(创意工坊内容包)是可导入导出的 JSON 包,用于扩展或覆盖应用内容。

**支持的内容类型**:

| 类型 | 说明 |
|---|---|
| 自定义女角 | 含日程 / 关系 / 剧情线 / 档案 |
| 世界书条目 | 自定义事件 / 地理 / 阶段指导 |
| AI 预设 | 自定义 Sampler + Prompt 顺序 |
| EJS 脚本 | 自定义调度逻辑 |
| 物品 | 商城商品 / 装备 |
| 任务 | 主线 / 支线 / 日常 |
| 技能树 | 自定义技能定义 |
| 装备 | 防具 / 道具 |
| 成就 | 自定义成就 |
| CG | 自定义 CG 资源 |
| 手机联系人 | 自定义联系人 |
| BBS 帖子 | 电脑模块帖子 |
| 商城商品 | 限时 / 季节性商品 |

**核心特性**:

- ✓ 完全本地化(存浏览器 IndexedDB,不上传任何服务器)
- ✓ 支持覆盖原卡内容(精确路径覆盖)
- ✓ 支持依赖关系(MOD 间依赖)
- ✓ 支持加载顺序(数字越小越先加载)
- ✓ 支持启用/禁用(无需卸载)
- ✓ 支持 JSON 导入导出(可分享)

---

## 2. MOD 包格式

### 2.1 顶层结构

```typescript
interface ModPackage {
  formatVersion: 1;            // 包格式版本(固定为 1)
  manifest: ModManifest;       // MOD 清单
  contents: Record<string, unknown>;  // 内容数据(entryId → 数据)
  exportedAt: number;          // 导出时间戳
  exporterVersion: string;     // 导出工具版本
}
```

### 2.2 MOD 清单(Manifest)

```typescript
interface ModManifest {
  id: string;                  // MOD 唯一 ID(如 com.example.custom-heroine)
  name: string;                // MOD 名称
  author: string;              // 作者
  version: string;             // 语义化版本(如 1.0.0)
  type: ModType;               // MOD 类型
  description: string;         // 简短描述
  createdAt: number;           // 创建时间戳
  updatedAt: number;           // 更新时间戳
  minAppVersion?: string;      // 兼容的最低应用版本
  dependencies?: string[];     // 依赖的其他 MOD ID
  tags?: string[];             // 标签
  icon?: string;               // 封面图(base64 或 URL)
  contents: ModContentEntry[]; // 内容条目列表
}
```

### 2.3 内容条目(ContentEntry)

```typescript
interface ModContentEntry {
  entryId: string;             // 条目 ID(MOD 内唯一)
  contentType: ModContentType; // 内容类型
  name: string;                // 条目名称(显示用)
  description?: string;        // 条目描述
  contentKey: string;          // 内容数据的 kv key
  override: boolean;           // 是否覆盖原卡同名内容
  overridePath?: string;       // 覆盖路径(如 '女角.鸣泽美佐子' 或 'worldbook.事件.圣诞夜')
}
```

### 2.4 MOD 类型枚举

```typescript
type ModType =
  | 'character'   // 自定义女角
  | 'worldbook'   // 世界书条目
  | 'preset'      // AI 预设
  | 'script'      // EJS 脚本
  | 'item'        // 商品/物品
  | 'quest'       // 任务
  | 'composite';  // 混合包

type ModContentType =
  | 'heroine-schedule'       // 女角日程
  | 'heroine-relationship'   // 女角关系
  | 'heroine-plot'           // 女角剧情线
  | 'heroine-profile'        // 女角档案
  | 'worldbook-entry'        // 世界书条目
  | 'preset-config'          // 预设配置
  | 'ejs-script'             // EJS 脚本
  | 'item-data'              // 物品数据
  | 'quest-data'             // 任务数据
  | 'skill-tree'             // 技能树
  | 'equipment'              // 装备
  | 'achievement'            // 成就
  | 'cg'                     // CG
  | 'phone-contact'          // 手机联系人
  | 'bbs-post'               // BBS帖子
  | 'shop-item';             // 商城商品
```

类型定义文件:[mod-types.ts](../app/src/runtime/mod/mod-types.ts)

---

## 3. MOD 生命周期

### 3.1 安装流程

```
1. importModFromJson(jsonText) 入口
2. JSON 解析 → ModPackage
3. 格式校验(validateModPackage)
   - formatVersion === 1
   - manifest 字段完整
   - contents 与 manifest.contents 对应
4. 依赖检查(checkDependencies)
   - 所有 dependencies 对应的 MOD 已安装
5. installMod(manifest, contents)
   - 写入 IndexedDB:
     - mod:list(已安装 MOD 清单)
     - mod:{modId}(MOD 元数据)
     - mod:enabled:{modId}(启用状态)
     - mod:content:{modId}:{entryId}(内容数据)
6. 返回 ModImportResult
```

### 3.2 启用/禁用

- 启用后,`applyMods()` 会在每回合把内容注入到目标对象
- 禁用后,内容仍在 IndexedDB,但不参与运行时
- 可随时切换,无需重启

### 3.3 加载顺序

- 数字越小越先加载
- `moveUp(modId)` / `moveDown(modId)` 调整
- 后加载的 MOD 可覆盖先加载的(对 `override=true` 的内容)

### 3.4 应用机制(applyMods)

```typescript
async function applyMods(target: Record<string, unknown>): Promise<ModApplyResult>
```

- 遍历已启用 MOD(按加载顺序)
- 对每个 `override=true` 的内容:
  - 按 `overridePath` 路径覆盖目标对象(如 `'女角.鸣泽美佐子'` → `target.女角.鸣泽美佐子 = data`)
- 对每个 `override=false` 的内容:
  - 追加到 `target.modContents[`${modId}:${entryId}`]`

### 3.5 卸载

- `removeMod(modId)` 删除 IndexedDB 中所有相关数据
- 不可恢复(建议导出备份后再卸载)

---

## 4. 开发流程

### 4.1 推荐方式:从示例 MOD 开始

1. 部署应用 → 进入游戏 → 右侧"创意工坊"按钮
2. 点击"✨ 创建示例 MOD" → 生成 `com.sample.custom-heroine-*` MOD
3. 点击"导出" → 下载 JSON 文件
4. 用编辑器打开 JSON,基于示例修改

### 4.2 手工编写 MOD 包

最小可用的 MOD 包示例(自定义女角):

```json
{
  "formatVersion": 1,
  "manifest": {
    "id": "com.example.heroine-xingye-sakura",
    "name": "星野樱",
    "author": "我的名字",
    "version": "1.0.0",
    "type": "character",
    "description": "新增一位自定义女角:星野樱,88 学园三年生,文学社社长。",
    "createdAt": 1735689600000,
    "updatedAt": 1735689600000,
    "minAppVersion": "1.0.0",
    "tags": ["女角", "新增"],
    "contents": [
      {
        "entryId": "heroine-profile",
        "contentType": "heroine-profile",
        "name": "星野樱档案",
        "description": "基础信息 + 三面性 + 性格调色盘",
        "contentKey": "heroine-profile",
        "override": false
      },
      {
        "entryId": "heroine-schedule",
        "contentType": "heroine-schedule",
        "name": "星野樱日程",
        "description": "17 天寒假日程",
        "contentKey": "heroine-schedule",
        "override": false
      },
      {
        "entryId": "heroine-relationship",
        "contentType": "heroine-relationship",
        "name": "星野樱关系网",
        "description": "与其他女角的关系",
        "contentKey": "heroine-relationship",
        "override": false
      },
      {
        "entryId": "heroine-plot",
        "contentType": "heroine-plot",
        "name": "星野樱剧情线",
        "description": "独立剧情线 3 章",
        "contentKey": "heroine-plot",
        "override": false
      }
    ]
  },
  "contents": {
    "heroine-profile": {
      "基础信息": {
        "姓名": "星野樱",
        "年龄": 18,
        "学校": "八十八学园",
        "年级": "三年生",
        "社团": "文学社",
        "职位": "社长"
      },
      "三面性": {
        "表面": "文静温柔的文学少女",
        "里面": "对创作有偏执的热情",
        "深层": "曾因作品被嘲笑而自卑"
      },
      "性格调色盘": {
        "开朗": 40,
        "温柔": 80,
        "固执": 65,
        "自卑": 55
      }
    },
    "heroine-schedule": {
      "day01_1222": [
        { "时段": "上午", "位置": "文学社", "活动": "整理社刊" },
        { "时段": "下午", "位置": "图书馆", "活动": "借书" }
      ]
    },
    "heroine-relationship": {
      "鸣泽美佐子": { "关系": "好友", "好感": 60, "信任": 50 },
      "主角": { "关系": "同学", "好感": 30, "信任": 20 }
    },
    "heroine-plot": {
      "chapter1": {
        "title": "文学社的邂逅",
        "trigger": { "location": "文学社", "time": "寒假前奏" },
        "summary": "主角偶然进入文学社,被星野樱误认为是新社员。"
      }
    }
  },
  "exportedAt": 1735689600000,
  "exporterVersion": "1.0.0"
}
```

### 4.3 覆盖原卡内容

若要覆盖原卡某个女角(如修改鸣泽美佐子的好感初始值):

```json
{
  "entryId": "override-misako-favor",
  "contentType": "heroine-profile",
  "name": "修改美佐子初始好感",
  "contentKey": "override-misako-favor",
  "override": true,
  "overridePath": "女角.鸣泽美佐子.基础信息.初始好感"
}
```

`contents` 中对应数据:

```json
{
  "override-misazo-favor": 80
}
```

> **注意**:`overridePath` 使用点分隔路径,精确到字段。覆盖后不可逆(卸载 MOD 后需重启应用恢复)。

---

## 5. 编程 API

MOD 系统提供以下 TypeScript API,可在自定义脚本中使用:

### 5.1 导入导出

```typescript
import {
  importModFromJson,
  importModFromFile,
  exportModToJson,
  exportModAndDownload,
} from '@runtime/mod';

// 从 JSON 字符串导入
const result = await importModFromJson(jsonText);
if (!result.ok) {
  console.error('导入失败:', result.error);
}

// 从文件导入
const fileResult = await importModFromFile(fileInput.files[0]);

// 导出为 JSON 字符串
const exportResult = await exportModToJson('com.example.my-mod');
console.log(exportResult.json);

// 导出并触发下载
await exportModAndDownload('com.example.my-mod');
```

### 5.2 启用/禁用/卸载

```typescript
import { enableMod, disableMod, removeMod } from '@runtime/mod';

await enableMod('com.example.my-mod');
await disableMod('com.example.my-mod');
await removeMod('com.example.my-mod');  // 不可恢复
```

### 5.3 查询

```typescript
import { listInstalledMods, listEnabledMods, getStats } from '@runtime/mod';

const installed = await listInstalledMods();
const enabled = await listEnabledMods();
const stats = await getStats();
// stats: { totalMods, enabledMods, totalContents, overrideContents }
```

### 5.4 加载顺序

```typescript
import { moveUp, moveDown } from '@runtime/mod';

await moveUp('com.example.my-mod');    // 数字变小
await moveDown('com.example.my-mod');  // 数字变大
```

### 5.5 应用到运行时

```typescript
import { applyMods } from '@runtime/mod';

const target = { /* stat_data 或内容缓存 */ };
const result = await applyMods(target);
// result: { ok, appliedContents, skippedContents, errors }
```

### 5.6 创建示例 MOD

```typescript
import { createSampleMod } from '@runtime/mod';

const result = await createSampleMod();
// 自动安装一个 com.sample.custom-heroine-{timestamp} MOD
```

---

## 6. 内容数据格式参考

### 6.1 女角档案(heroine-profile)

参考原卡 `src/content/character/鸣泽美佐子/`:

```typescript
{
  "基础信息": {
    "姓名": string,
    "年龄": number,
    "学校": string,
    "年级": string,
    "社团": string,
    "职位": string
  },
  "三面性": {
    "表面": string,
    "里面": string,
    "深层": string
  },
  "性格调色盘": {
    "开朗": number,    // 0-100
    "温柔": number,
    "固执": number,
    "自卑": number
  },
  "性格调色盘": { /* ... */ },
  "NSFW反差": string,    // 可选
  "剧情线": string       // 可选
}
```

### 6.2 女角日程(heroine-schedule)

参考 `src/content/npc/schedule-data.ts`:

```typescript
{
  "day01_1222": [
    {
      "时段": "上午" | "中午" | "下午" | "晚上" | "深夜",
      "位置": string,
      "活动": string,
      "可遭遇": boolean    // 玩家是否可在此遭遇
    }
  ],
  "day02_1223": [ /* ... */ ]
  // day01_1222 ~ day17_0107
}
```

### 6.3 女角关系(heroine-relationship)

参考 `src/content/npc/relationship-data.ts`:

```typescript
{
  "其他女角姓名": {
    "关系": "好友" | "姐妹" | "对手" | "陌生人",
    "好感": number,    // 0-100
    "信任": number,
    "嫉妒阈值": number
  },
  "主角": {
    "关系": "同学" | "青梅竹马" | "恋人",
    "好感": number,
    "信任": number,
    "已知真相": boolean
  }
}
```

### 6.4 世界书条目(worldbook-entry)

参考 `src/content/worldbook/`:

```typescript
{
  "key": string,                  // 条目键
  "content": string,              // 条目内容
  "strategy": "constant" | "selective" | "at_depth",
  "position": "before" | "after",
  "depth": number,                // at_depth 策略的注入深度
  "order": number,
  "enabled": boolean,
  "keywords": string[]            // selective 策略的触发关键词
}
```

### 6.5 物品(item-data)

参考 `src/content/shop/items-data.ts`:

```typescript
{
  "id": string,
  "name": string,
  "type": "消耗品" | "装备" | "礼物" | "特殊",
  "price": number,
  "effects": {
    "精力": number,    // 正数恢复,负数消耗
    "心情": number,
    "好感": number
  },
  "description": string
}
```

### 6.6 任务(quest-data)

参考 `src/content/rpg/quest-data.ts`:

```typescript
{
  "id": string,
  "title": string,
  "type": "主线" | "支线" | "日常",
  "description": string,
  "objectives": [
    { "id": string, "text": string, "target": number, "current": number }
  ],
  "rewards": {
    "金钱": number,
    "经验": number,
    "物品": string[]
  },
  "prerequisite": string[]   // 前置任务 ID
}
```

---

## 7. 最佳实践

### 7.1 命名约定

- **MOD ID**:反向域名格式,如 `com.example.heroine-xingye-sakura`
- **版本号**:语义化版本(major.minor.patch)
- **entryId**:小写 + 短横线,如 `heroine-profile` / `day01-schedule`

### 7.2 覆盖谨慎

- `override=true` 的内容会**直接覆盖原卡数据**,不可逆
- 建议:优先用 `override=false`(追加),仅在必要时使用覆盖
- 覆盖前先导出原卡数据备份

### 7.3 依赖管理

- 仅声明强依赖(运行必需的 MOD)
- 弱依赖(可选增强)不要写入 `dependencies`
- 依赖未满足时导入会失败,提示用户先安装依赖

### 7.4 测试流程

1. 本地导入 MOD → 启用 → 进入游戏验证
2. 检查浏览器控制台是否有错误
3. 调试模式 → 步骤8 变量监视器查看覆盖效果
4. E2E 验证 → 行为案例 → 重新运行验证不破坏核心流程
5. 导出 MOD → 在另一个浏览器导入验证

### 7.5 性能注意

- 单个 MOD 内容条目数建议 ≤ 50
- 大型内容(如完整女角 + 17 天日程)建议拆分为多个 MOD
- CG 等资源建议外部 URL 引用,避免 base64 嵌入(包体积过大)

### 7.6 兼容性

- 始终声明 `minAppVersion`,避免在不兼容版本上运行
- 大版本升级时检查 `exporterVersion`,旧包可能需要迁移
- 不要依赖未在本文档中声明的内部字段(可能变更)

---

## 8. 调试

### 8.1 IndexedDB 检查

DevTools → Application → IndexedDB → 查看 `mod:list` / `mod:{modId}` / `mod:content:{modId}:{entryId}` 键值。

### 8.2 控制台日志

MOD 操作会输出带前缀的日志:

- `[installMod]`:安装过程
- `[createSampleMod]`:示例 MOD 创建
- `[WorkshopPanel]`:UI 操作
- `[applyMods]`:运行时应用

### 8.3 故障排查

| 症状 | 排查 |
|---|---|
| 导入失败:"JSON 解析失败" | 检查 JSON 语法(用 jsonlint.com 验证) |
| 导入失败:"formatVersion 不匹配" | 检查 `formatVersion` 是否为 `1` |
| 导入失败:"依赖未满足" | 先安装 dependencies 列表中的 MOD |
| 启用后无效果 | 检查加载顺序(应在原卡之后);检查 `overridePath` 拼写 |
| 状态栏报错 | 检查内容数据是否符合 schema(参考原卡同类型字段) |
| 卸载后内容残留 | IndexedDB → 删除 `mod:content:*` 对应键 |

---

## 9. 分发

MOD 包为纯 JSON 文件,可通过任意渠道分发:

- 直接分享 JSON 文件
- 上传到 GitHub Releases
- 发布到 MOD 社区(如有)
- 嵌入到博客文章(代码块)

**用户安装**:打开应用 → 创意工坊 → 导入 → 选择 JSON 文件。

---

## 10. 相关文档

- [用户手册](./01-user-manual.md):创意工坊 UI 使用
- [API 配置指南](./02-api-configuration.md):AI 端点配置
- 类型定义:[mod-types.ts](../app/src/runtime/mod/mod-types.ts)
- 管理器实现:[mod-manager.ts](../app/src/runtime/mod/mod-manager.ts)
- 存储实现:[mod-store.ts](../app/src/runtime/mod/mod-store.ts)
- UI 组件:[WorkshopPanel.tsx](../app/src/ui/WorkshopPanel.tsx)
