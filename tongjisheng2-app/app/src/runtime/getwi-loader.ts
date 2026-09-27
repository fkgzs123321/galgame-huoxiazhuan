/**
 * getwi 加载器(Host Foundation 步骤2)
 *
 * 职责:
 *  - 按条目路径加载原卡 EJS/角色/世界书条目原始内容
 *  - 路径解析:
 *      'EJS预处理/全局规则总表'  → src/content/ejs/全局规则总表.txt
 *      '角色/鸣泽美佐子/基础信息' → src/content/character/鸣泽美佐子/基础信息.txt
 *      '世界观/地理/八十八学园'   → src/content/worldbook/地理/八十八学园.txt
 *  - 装饰器剥离(@@generate_before/@@private/@@if 等)
 *  - 源码级内联展开:把 <%- await getwi('X') %> 替换为 X 的源码
 *    (确保 var 声明在同一作用域可见,与原 ST EJS 行为一致)
 *  - 递归纪律:循环检测 + 最大深度
 *
 * 设计要点:
 *  - 原卡 EJS 中 PLAYER_IDENTITIES/DIFFICULTY_MODIFIERS 等用 var 声明,
 *    通过 getwi 加载后需要被父模板使用
 *  - 标准 ejs.js 的 include() 不会共享 var 作用域
 *  - 因此采用"源码级内联":渲染前把所有 getwi 调用展开成单一模板源码,
 *    再编译运行,所有 var 在同一函数作用域可见
 *
 * 异步语义:
 *  - 原卡使用 `await getwi(...)`,本加载器在渲染时已预展开,
 *    运行时 getwi 函数仅返回占位字符串(不再被调用)
 *  - 若 EJS 中仍有运行时 getwi 调用(如动态路径),则返回错误占位
 */

import { contentLoader, type ContentEntry } from '@content/content-loader';

/** getwi 调用正则:<%- await getwi('...') %> 或 <%-await getwi('...')%> */
const GETWI_PATTERN =
  /<%-\s*await\s+getwi\(\s*['"]([^'"]+)['"]\s*\)\s*%>/g;

/** 装饰器正则:行首 @@xxx */
const DECORATOR_PATTERN = /^@@[a-z_]+\s*\n?/gm;

/** 内联展开最大深度(防止无限递归) */
const MAX_DEPTH = 16;

/** 加载结果 */
export interface GetwiLoadResult {
  /** 条目路径(规范化后) */
  path: string;
  /** 原始内容(已剥离装饰器) */
  rawSource: string;
  /** 来源条目(若找到) */
  entry: ContentEntry | null;
  /** 是否找到 */
  found: boolean;
}

/**
 * GetwiLoader 加载器
 *  - 单例,运行期共享
 *  - 内置 LRU 缓存(避免同一回合重复加载)
 *  - 支持递归展开
 */
export class GetwiLoader {
  /** 条目缓存(entryKey → ContentEntry) */
  private entryCache = new Map<string, ContentEntry | null>();
  /** 源码缓存(entryKey → 已剥离装饰器的源码) */
  private sourceCache = new Map<string, string>();
  /** 路径解析失败记录(便于排错) */
  private missing = new Set<string>();

  /** 清空缓存(回合边界) */
  clearCache(): void {
    this.entryCache.clear();
    this.sourceCache.clear();
  }

  /** 获取缺失条目列表(供 UI 提示) */
  getMissing(): string[] {
    return Array.from(this.missing);
  }

  /**
   * 加载条目原始内容(已剥离装饰器)
   *  - 不递归展开内部 getwi 调用
   */
  loadRaw(path: string): GetwiLoadResult {
    const entry = this.resolveEntry(path);
    if (!entry) {
      this.missing.add(path);
      return { path, rawSource: '', entry: null, found: false };
    }
    // 缓存
    const cached = this.sourceCache.get(entry.entryKey ?? entry.name);
    if (cached !== undefined) {
      return { path, rawSource: cached, entry, found: true };
    }
    const stripped = stripDecorators(entry.content);
    const key = entry.entryKey ?? entry.name;
    this.sourceCache.set(key, stripped);
    return { path, rawSource: stripped, entry, found: true };
  }

  /**
   * 递归展开源码中的所有 getwi 调用
   *  - 返回展开后的源码(可直接交给 ejs.render)
   *  - 同一分支的 getwi 调用只展开一次(同路径去重)
   *  - 循环检测:A→B→A 抛出错误
   *  - 缺失条目:替换为 `<!-- getwi:missing:${path} -->` 注释
   *
   * @param source  EJS 源码
   * @param stack   当前展开栈(用于循环检测)
   * @param depth   当前深度
   */
  expand(source: string, stack: string[] = [], depth = 0): string {
    if (depth >= MAX_DEPTH) {
      return source; // 深度兜底,不再展开
    }
    // 用 replace + 函数式回调,逐个处理 getwi 调用
    return source.replace(GETWI_PATTERN, (full, p1: string) => {
      const path = String(p1).trim();
      // 循环检测
      if (stack.includes(path)) {
        return `<!-- getwi:cycle:${path} -->`;
      }
      const { rawSource, found } = this.loadRaw(path);
      if (!found) {
        return `<!-- getwi:missing:${path} -->`;
      }
      // 递归展开子模板的 getwi 调用
      const expanded = this.expand(rawSource, [...stack, path], depth + 1);
      return expanded;
    });
  }

  /**
   * 运行时 getwi 函数(供 EJS 上下文使用)
   *  - 已预展开,正常情况下不会被调用
   *  - 若被动态调用(如路径是变量),返回错误占位
   */
  runtimeGetwi(path: string): Promise<string> {
    const { rawSource, found } = this.loadRaw(path);
    if (!found) {
      return Promise.resolve(`<!-- getwi:missing:${path} -->`);
    }
    // 动态 getwi 路径（如 _dateMap[_dayCount]）运行时才可知：
    // 把目标源码再展开一次，保证嵌套静态 getwi 也能进入模板。
    return Promise.resolve(this.expand(rawSource, [path], 0));
  }

  // ─────────────────────────────────────────────────────────
  //  路径解析
  // ─────────────────────────────────────────────────────────

  /**
   * 按 getwi 路径解析条目
   *  - EJS预处理/X     → ejs/X.txt
   *  - 角色/<名>/X     → character/<名>/X.txt
   *  - 世界观/X/Y      → worldbook/X/Y.txt
   *  - 其他            → 全局按 entryKey/name 查找
   */
  private resolveEntry(path: string): ContentEntry | null {
    if (!path) return null;
    // 缓存
    if (this.entryCache.has(path)) {
      return this.entryCache.get(path) ?? null;
    }
    const segs = path.split('/').filter(Boolean);
    let entry: ContentEntry | null = null;

    // 1. 前缀路由
    if (segs.length >= 2 && segs[0] === 'EJS预处理') {
      // EJS预处理/全局规则总表 → ejs/全局规则总表.txt
      const name = segs.slice(1).join('/');
      entry = this.findByKeyOrName(name);
    } else if (segs.length >= 3 && segs[0] === '角色') {
      // 角色/鸣泽美佐子/基础信息 → character/鸣泽美佐子/基础信息.txt
      const charName = segs[1];
      const fileName = segs.slice(2).join('/');
      const targetPath = `character/${charName}/${fileName}`;
      entry = contentLoader.getByPath(targetPath);
    } else if (segs.length >= 2 && segs[0] === '世界观') {
      // 世界观/地理/八十八学园 → worldbook/地理/八十八学园.txt
      const subPath = segs.slice(1).join('/');
      const targetPath = `worldbook/${subPath}`;
      entry = contentLoader.getByPath(targetPath);
    } else if (segs.length >= 2 && segs[0] === '世界书') {
      // 世界书/扮演准则/核心铁律 → worldbook/扮演准则/核心铁律.txt
      const subPath = segs.slice(1).join('/');
      const targetPath = `worldbook/${subPath}`;
      entry = contentLoader.getByPath(targetPath);
    }

    // 2. 全局兜底:按 entryKey 或 name 查
    if (!entry) {
      entry = contentLoader.getByEntryKey(path);
    }
    if (!entry) {
      entry = contentLoader.getByName(path);
    }
    // 3. 末段兜底:按最后一段作为 name 查
    if (!entry && segs.length > 1) {
      const lastSeg = segs[segs.length - 1];
      entry = contentLoader.getByName(lastSeg);
    }

    this.entryCache.set(path, entry);
    return entry;
  }

  /** 先按 entryKey 后按 name 查 */
  private findByKeyOrName(name: string): ContentEntry | null {
    return contentLoader.getByEntryKey(name) ?? contentLoader.getByName(name);
  }
}

/** 单例 */
export const getwiLoader = new GetwiLoader();

// ───────────────────────────────────────────────────────────
//  工具函数
// ───────────────────────────────────────────────────────────

/** 剥离行首 @@ 装饰器(@@generate_before/@@private/@@if 等) */
export function stripDecorators(source: string): string {
  return source.replace(DECORATOR_PATTERN, '');
}
