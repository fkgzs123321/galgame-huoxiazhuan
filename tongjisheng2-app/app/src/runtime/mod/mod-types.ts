/**
 * MOD 类型定义(阶段4 创意工坊)
 *
 * MOD 是可导入导出的内容包,支持以下类型:
 *  - character: 自定义女角(含日程/关系/剧情线)
 *  - worldbook: 自定义世界书条目
 *  - preset: 自定义 AI 预设
 *  - script: 自定义 EJS 脚本
 *  - item: 自定义商品/物品
 *  - quest: 自定义任务
 *  - composite: 混合包(含多种类型)
 */

// ───────────────────────────────────────────────────────────
//  MOD 元数据
// ───────────────────────────────────────────────────────────

/** MOD 类型 */
export type ModType =
  | 'character' // 自定义女角
  | 'worldbook' // 世界书条目
  | 'preset' // AI 预设
  | 'script' // EJS 脚本
  | 'item' // 商品/物品
  | 'quest' // 任务
  | 'composite'; // 混合包

/** MOD 内容类型枚举 */
export type ModContentType =
  | 'heroine-schedule' // 女角日程
  | 'heroine-relationship' // 女角关系
  | 'heroine-plot' // 女角剧情线
  | 'heroine-profile' // 女角档案
  | 'worldbook-entry' // 世界书条目
  | 'preset-config' // 预设配置
  | 'ejs-script' // EJS 脚本
  | 'item-data' // 物品数据
  | 'quest-data' // 任务数据
  | 'skill-tree' // 技能树
  | 'equipment' // 装备
  | 'achievement' // 成就
  | 'cg' // CG
  | 'phone-contact' // 手机联系人
  | 'bbs-post' // BBS帖子
  | 'shop-item'; // 商城商品

/** MOD 清单文件 */
export interface ModManifest {
  /** MOD 唯一 ID(如 com.example.custom-heroine) */
  id: string;
  /** MOD 名称 */
  name: string;
  /** 作者 */
  author: string;
  /** 版本号(语义化版本,如 1.0.0) */
  version: string;
  /** MOD 类型 */
  type: ModType;
  /** 简短描述 */
  description: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
  /** 兼容的应用版本(最低) */
  minAppVersion?: string;
  /** 依赖的其他 MOD ID */
  dependencies?: string[];
  /** 标签 */
  tags?: string[];
  /** 封面图(base64 或 URL) */
  icon?: string;
  /** 内容条目列表(每个条目对应一个内容文件) */
  contents: ModContentEntry[];
}

/** MOD 内容条目 */
export interface ModContentEntry {
  /** 条目 ID(MOD 内唯一) */
  entryId: string;
  /** 内容类型 */
  contentType: ModContentType;
  /** 条目名称(显示用) */
  name: string;
  /** 条目描述 */
  description?: string;
  /** 内容数据的 kv key(运行时从 IndexedDB 读取) */
  contentKey: string;
  /** 是否覆盖原卡同名内容 */
  override: boolean;
  /** 覆盖的目标路径(如 '女角.鸣泽美佐子' 或 'worldbook.事件.圣诞夜') */
  overridePath?: string;
}

// ───────────────────────────────────────────────────────────
//  MOD 运行时状态
// ───────────────────────────────────────────────────────────

/** 已安装的 MOD(含运行时状态) */
export interface InstalledMod {
  /** MOD 清单 */
  manifest: ModManifest;
  /** 是否启用 */
  enabled: boolean;
  /** 安装时间戳 */
  installedAt: number;
  /** 加载顺序(数字越小越先加载) */
  loadOrder: number;
}

/** MOD 导入结果 */
export interface ModImportResult {
  ok: boolean;
  modId?: string;
  error?: string;
  /** 导入的内容条目数 */
  contentCount?: number;
  /** 覆盖的原卡内容数 */
  overrideCount?: number;
}

/** MOD 导出结果 */
export interface ModExportResult {
  ok: boolean;
  json?: string;
  error?: string;
}

/** MOD 应用结果 */
export interface ModApplyResult {
  ok: boolean;
  appliedContents: number;
  skippedContents: number;
  errors: string[];
}

// ───────────────────────────────────────────────────────────
//  MOD 包格式(导入导出用)
// ───────────────────────────────────────────────────────────

/** MOD 包(导入导出的完整 JSON) */
export interface ModPackage {
  /** 包格式版本 */
  formatVersion: 1;
  /** MOD 清单 */
  manifest: ModManifest;
  /** 内容数据(entryId → 数据) */
  contents: Record<string, unknown>;
  /** 导出时间戳 */
  exportedAt: number;
  /** 导出工具版本 */
  exporterVersion: string;
}

// ───────────────────────────────────────────────────────────
//  常量
// ───────────────────────────────────────────────────────────

/** MOD kv 存储前缀 */
export const MOD_KV_PREFIX = 'mod:';

/** MOD 清单列表 kv key */
export const MOD_LIST_KV_KEY = 'mod:list';

/** MOD 启用状态 kv 前缀 */
export const MOD_ENABLED_PREFIX = 'mod:enabled:';

/** MOD 内容数据 kv 前缀 */
export const MOD_CONTENT_KV_PREFIX = 'mod:content:';

/** 当前应用版本 */
export const APP_VERSION = '1.0.0';

/** 导出工具版本 */
export const EXPORTER_VERSION = '1.0.0';
