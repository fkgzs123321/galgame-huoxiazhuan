// 内容清单扫描脚本:扫描原卡 src/同级生2/ 目录,生成 src/content/manifest.json
// 该清单作为内容包迁移的索引,后续步骤按需从原卡读取并转换为目标格式
// 运行: pnpm scan-content
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // app/
const CARD_DIR = join(__dirname, '..', '..', 'src', '同级生2'); // 原卡目录
const OUT_DIR = join(ROOT, 'src', 'content');
const OUT_FILE = join(OUT_DIR, 'manifest.json');

/**
 * @typedef {Object} ContentEntry
 * @property {string} id - 唯一标识(基于相对路径)
 * @property {string} sourcePath - 原卡绝对路径
 * @property {string} relativePath - 相对原卡根的路径
 * @property {string} category - 内容分类
 * @property {string} subcategory - 子分类(可空)
 * @property {string} name - 条目名(去扩展名)
 * @property {string} ext - 扩展名(小写,无点)
 * @property {number} size - 文件大小(字节)
 * @property {string} targetPath - 迁移目标路径(相对 src/content/)
 * @property {string} targetFormat - 目标格式(raw/json/ts)
 * @property {string} [entryKey] - 世界书条目注册名(仅世界书条目)
 * @property {string} [strategy] - 世界书策略(仅世界书条目,从 tavern-cards-state.json 推断)
 */

/** @type {ContentEntry[]} */
const entries = [];

/**
 * 推断内容分类(基于相对路径)
 * @param {string} relPath
 * @returns {{ category: string; subcategory: string; targetPath: string; targetFormat: string; entryKey?: string }}
 */
function classify(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  const ext = normalized.split('.').pop()?.toLowerCase() || '';
  const base = basename(normalized).replace(/\.[^.]+$/, '');

  // 顶层平铺文件(原卡根目录的副本,与 世界书/ 子目录重复,优先用子目录版,平铺版标记为 duplicate)
  if (!normalized.includes('/')) {
    // 根目录文件
    if (base === 'schema' && ext === 'ts') return { category: 'mvu', subcategory: 'schema', targetPath: `mvu/schema.ts`, targetFormat: 'ts' };
    if (base === 'schema' && ext === 'json') return { category: 'mvu', subcategory: 'schema-json', targetPath: `mvu/schema.json`, targetFormat: 'json' };
    if (base === 'index' && ext === 'yaml') return { category: 'card', subcategory: 'index', targetPath: `card/index.yaml`, targetFormat: 'raw' };
    if (base === 'tavern-cards-state' && ext === 'json') return { category: 'card', subcategory: 'state', targetPath: `card/tavern-cards-state.json`, targetFormat: 'json' };
    if (base === '同级生2' && ext === 'json') return { category: 'card', subcategory: 'card-json', targetPath: `card/同级生2.json`, targetFormat: 'json' };
    if (base === '创作规划' && ext === 'yaml') return { category: 'card', subcategory: 'planning', targetPath: `card/创作规划.yaml`, targetFormat: 'raw' };
    if (['avatar', '同级生2', '头像', '头像_real'].includes(base) && ['png', 'jpg', 'jpeg'].includes(ext)) return { category: 'assets', subcategory: 'avatar', targetPath: `assets/${base}.${ext}`, targetFormat: 'raw' };
    // 根目录的世界书条目副本(与子目录重复),标记 duplicate
    return { category: 'duplicate-root', subcategory: '', targetPath: `duplicate/${normalized}`, targetFormat: 'raw' };
  }

  // 世界书/ 子目录(权威版本)
  if (normalized.startsWith('世界书/')) {
    const sub = normalized.slice('世界书/'.length);

    // 变量/ (MVU 5件套)
    if (sub.startsWith('变量/')) {
      const name = basename(sub);
      const targetName = name; // 保留原文件名
      return { category: 'mvu', subcategory: 'variable', targetPath: `mvu/${targetName}`, targetFormat: ext === 'yaml' ? 'yaml' : 'raw', entryKey: deriveEntryKey(name) };
    }

    // EJS预处理/ (41 EJS 条目)
    if (sub.startsWith('EJS预处理/')) {
      const relInEjs = sub.slice('EJS预处理/'.length);
      return { category: 'ejs', subcategory: 'preprocess', targetPath: `ejs/${relInEjs}`, targetFormat: 'raw', entryKey: deriveEntryKey(relInEjs) };
    }

    // D0指令/ (5 模式)
    if (sub.startsWith('D0指令/')) {
      const name = basename(sub);
      return { category: 'ejs', subcategory: 'd0-instruction', targetPath: `ejs/D0指令/${name}`, targetFormat: 'raw', entryKey: `D0指令_${name}` };
    }

    // 扮演准则/ (11 准则)
    if (sub.startsWith('扮演准则/')) {
      const name = basename(sub);
      return { category: 'worldbook', subcategory: 'play-rule', targetPath: `worldbook/扮演准则/${name}`, targetFormat: 'raw', entryKey: stripExt(name) };
    }

    // 地理/ (7 地理)
    if (sub.startsWith('地理/')) {
      const name = basename(sub);
      return { category: 'worldbook', subcategory: 'geography', targetPath: `worldbook/地理/${name}`, targetFormat: 'raw', entryKey: stripExt(name) };
    }

    // 事件/ (6 事件)
    if (sub.startsWith('事件/')) {
      const name = basename(sub);
      return { category: 'worldbook', subcategory: 'event', targetPath: `worldbook/事件/${name}`, targetFormat: 'raw', entryKey: stripExt(name) };
    }

    // 阶段指导/ (4 阶段)
    if (sub.startsWith('阶段指导/')) {
      const name = basename(sub);
      return { category: 'worldbook', subcategory: 'phase-guide', targetPath: `worldbook/阶段指导/${name}`, targetFormat: 'raw', entryKey: stripExt(name) };
    }

    // 时间线/ (关键事件 yaml)
    if (sub.startsWith('时间线/')) {
      const name = basename(sub);
      return { category: 'worldbook', subcategory: 'timeline', targetPath: `worldbook/时间线/${name}`, targetFormat: 'yaml', entryKey: stripExt(name) };
    }

    // 系统/ (表格模板)
    if (sub.startsWith('系统/')) {
      const name = basename(sub);
      return { category: 'worldbook', subcategory: 'system', targetPath: `worldbook/系统/${name}`, targetFormat: 'raw', entryKey: stripExt(name) };
    }

    // 角色/ (20女×5 + 4男×2 + 主角设定 + 玩家画像)
    if (sub.startsWith('角色/')) {
      const relInRole = sub.slice('角色/'.length);
      const parts = relInRole.split('/');
      if (parts.length >= 2) {
        // 角色名/文件 类型
        const charName = parts[0];
        const fileType = basename(parts[1]).replace(/\.[^.]+$/, ''); // 基础信息/性格调色盘/三面性/NSFW反差/剧情线
        return { category: 'character', subcategory: fileType, targetPath: `character/${charName}/${fileType}.${ext}`, targetFormat: 'raw', entryKey: `${charName}_${fileType}` };
      } else {
        // 角色/主角设定.txt 等顶层文件
        const name = basename(sub);
        return { category: 'character', subcategory: 'player', targetPath: `character/${name}`, targetFormat: 'raw', entryKey: name.replace(/\.[^.]+$/, '') };
      }
    }

    // 其他 世界书/ 子目录(未匹配)
    return { category: 'worldbook', subcategory: 'other', targetPath: `worldbook/${sub}`, targetFormat: 'raw', entryKey: basename(sub).replace(/\.[^.]+$/, '') };
  }

  // 开场白/
  if (normalized.startsWith('开场白/')) {
    const sub = normalized.slice('开场白/'.length);
    return { category: 'opening', subcategory: '', targetPath: `opening/${sub}`, targetFormat: ext === 'yaml' ? 'yaml' : 'raw' };
  }

  // 数据库相关原始数据模板/
  if (normalized.startsWith('数据库相关原始数据模板/')) {
    const sub = normalized.slice('数据库相关原始数据模板/'.length);
    return { category: 'database', subcategory: 'template', targetPath: `database/${sub}`, targetFormat: 'json' };
  }

  // 正则/
  if (normalized.startsWith('正则/')) {
    const sub = normalized.slice('正则/'.length);
    return { category: 'regex', subcategory: '', targetPath: `regex/${sub}`, targetFormat: ext === 'json' ? 'json' : 'raw' };
  }

  // scripts/ (离线工具,不参与运行时)
  if (normalized.startsWith('scripts/')) {
    return { category: 'scripts', subcategory: 'offline-tool', targetPath: `scripts/${normalized.slice('scripts/'.length)}`, targetFormat: 'raw' };
  }

  // 其他
  return { category: 'other', subcategory: '', targetPath: `other/${normalized}`, targetFormat: 'raw' };
}

/**
 * 推导世界书条目注册名(基于文件名/路径)
 * 原卡条目名规则:变量/ 下的文件名即条目名(如 initvar.yaml → [InitVar]请勿打开,但这里保留文件名作为 key)
 * @param {string} relPath
 */
function deriveEntryKey(relPath) {
  // 去扩展名
  return basename(relPath).replace(/\.[^.]+$/, '');
}

/**
 * 递归扫描目录
 * @param {string} dir
 * @param {string} baseDir - 原卡根目录(用于计算 relativePath)
 */
function scan(dir, baseDir) {
  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      // 跳过 node_modules 等
      if (item.name === 'node_modules' || item.name === '.git') continue;
      scan(fullPath, baseDir);
    } else if (item.isFile()) {
      const relPath = relative(baseDir, fullPath);
      const stat = statSync(fullPath);
      const info = classify(relPath);
      entries.push({
        id: relPath.replace(/\\/g, '/'),
        sourcePath: fullPath.replace(/\\/g, '/'),
        relativePath: relPath.replace(/\\/g, '/'),
        category: info.category,
        subcategory: info.subcategory,
        name: basename(relPath).replace(/\.[^.]+$/, ''),
        ext: (relPath.split('.').pop() || '').toLowerCase(),
        size: stat.size,
        targetPath: info.targetPath.replace(/\\/g, '/'),
        targetFormat: info.targetFormat,
        ...(info.entryKey ? { entryKey: info.entryKey } : {}),
      });
    }
  }
}

// 执行扫描
if (!statSync(CARD_DIR).isDirectory()) {
  console.error(`原卡目录不存在: ${CARD_DIR}`);
  process.exit(1);
}

console.log(`扫描原卡: ${CARD_DIR}`);
scan(CARD_DIR, CARD_DIR);

// 按类别统计
const stats = {};
for (const e of entries) {
  const key = e.category + (e.subcategory ? `/${e.subcategory}` : '');
  stats[key] = (stats[key] || 0) + 1;
}

// 写入 manifest.json
mkdirSync(OUT_DIR, { recursive: true });
const manifest = {
  generatedAt: new Date().toISOString(),
  sourceCardDir: CARD_DIR.replace(/\\/g, '/'),
  totalEntries: entries.length,
  stats,
  entries,
};
writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`\n扫描完成:`);
console.log(`  总条目数: ${entries.length}`);
console.log(`  输出: ${OUT_FILE}`);
console.log(`\n按类别统计:`);
for (const [k, v] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}
