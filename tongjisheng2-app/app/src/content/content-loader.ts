/**
 * 内容包统一加载器
 *
 * 职责:为运行时各模块提供原卡资产的统一访问接口
 * - 基于 Vite import.meta.glob 在构建时把 src/content/ 下的资产 bundle 进应用
 * - 支持按 category/subcategory/entryKey/name 查询
 * - 资产内容以原始字符串形式返回(步骤2-4的 EJS/schema 解析器负责解析)
 *
 * 使用方式:
 *   import { contentLoader } from '@content/content-loader';
 *   const d0 = await contentLoader.getEntry('ejs', 'D0系统控制器');
 *   const allPlayRules = contentLoader.listEntries('worldbook', 'play-rule');
 */

// Vite 在构建时把 src/content/ 下的所有文件以 ?raw 形式 bundle
// 使用绝对路径 /src/content/**/* 避免相对路径解析问题
// 注意:content-loader.ts 自身会被 glob 捕获,需在加载时跳过 .ts 文件
const rawModules = import.meta.glob('/src/content/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// manifest.json 也被 glob 捕获,单独处理
const manifestRaw = rawModules['/src/content/manifest.json'];
const manifest = (
  manifestRaw ? JSON.parse(manifestRaw) : { entries: [] }
) as {
  totalEntries: number;
  entries: Array<{
    id: string;
    targetPath: string;
    category: string;
    subcategory: string;
    name: string;
    entryKey?: string;
    ext: string;
    targetFormat: string;
    synced: boolean;
  }>;
};

/**
 * 资产条目(运行时视图)
 */
export interface ContentEntry {
  /** 条目ID(相对原卡路径) */
  id: string;
  /** 目标路径(相对 src/content/) */
  targetPath: string;
  /** 内容分类 */
  category: string;
  /** 子分类 */
  subcategory: string;
  /** 条目名(去扩展名) */
  name: string;
  /** 世界书条目注册名(仅世界书/EJS条目) */
  entryKey?: string;
  /** 扩展名 */
  ext: string;
  /** 目标格式 */
  targetFormat: string;
  /** 文件内容(原始字符串) */
  content: string;
}

/**
 * 按 targetPath 加载原始内容
 * Vite import.meta.glob 的键可能因中文路径编码差异而不一致,做兜底匹配
 */
function loadRaw(targetPath: string): string {
  const key = `/src/content/${targetPath}`;
  // 1. 精确匹配
  let mod = rawModules[key];
  if (typeof mod === 'string') return mod;
  // 2. 尝试 decodeURIComponent(Vite 可能对中文路径做了 URL 编码)
  for (const [k, v] of Object.entries(rawModules)) {
    if (k === key || decodeURIComponent(k) === key || k === decodeURIComponent(key)) {
      if (typeof v === 'string') return v;
    }
  }
  // 3. 后缀匹配(以 targetPath 结尾)
  for (const [k, v] of Object.entries(rawModules)) {
    if (k.endsWith(targetPath) || decodeURIComponent(k).endsWith(targetPath)) {
      if (typeof v === 'string') return v;
    }
  }
  throw new Error(`内容资产未找到: ${targetPath}(查找键: ${key},已尝试精确/解码/后缀匹配)`);
}

/**
 * 构建运行时 ContentEntry(附加 content 字段)
 */
function buildEntry(meta: (typeof manifest.entries)[number]): ContentEntry {
  return {
    id: meta.id,
    targetPath: meta.targetPath,
    category: meta.category,
    subcategory: meta.subcategory,
    name: meta.name,
    entryKey: meta.entryKey,
    ext: meta.ext,
    targetFormat: meta.targetFormat,
    content: loadRaw(meta.targetPath),
  };
}

class ContentLoader {
  /** manifest 总条目数(仅已同步的) */
  get totalEntries(): number {
    return manifest.entries.filter((e) => e.synced).length;
  }

  /** 列出指定分类的条目(仅元数据,不加载内容) */
  listMeta(category: string, subcategory?: string): Array<(typeof manifest.entries)[number]> {
    return manifest.entries.filter(
      (e) => e.synced && e.category === category && (!subcategory || e.subcategory === subcategory),
    );
  }

  /** 列出指定分类的条目(含内容) */
  listEntries(category: string, subcategory?: string): ContentEntry[] {
    return this.listMeta(category, subcategory).map(buildEntry);
  }

  /** 按 entryKey 获取条目(世界书/EJS 条目常用) */
  getByEntryKey(entryKey: string): ContentEntry | null {
    const meta = manifest.entries.find((e) => e.synced && e.entryKey === entryKey);
    return meta ? buildEntry(meta) : null;
  }

  /** 按 name 获取条目(精确匹配) */
  getByName(name: string): ContentEntry | null {
    const meta = manifest.entries.find((e) => e.synced && e.name === name);
    return meta ? buildEntry(meta) : null;
  }

  /** 按 targetPath 获取条目 */
  getByPath(targetPath: string): ContentEntry | null {
    const meta = manifest.entries.find((e) => e.synced && e.targetPath === targetPath);
    return meta ? buildEntry(meta) : null;
  }

  /** 获取原始内容字符串(便捷方法) */
  getRaw(targetPath: string): string {
    return loadRaw(targetPath);
  }

  /** 按分类统计 */
  stats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const e of manifest.entries) {
      if (!e.synced) continue;
      const key = e.category + (e.subcategory ? `/${e.subcategory}` : '');
      stats[key] = (stats[key] || 0) + 1;
    }
    return stats;
  }
}

export const contentLoader = new ContentLoader();
