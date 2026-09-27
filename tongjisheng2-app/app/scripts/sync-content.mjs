// 内容同步脚本:从原卡复制关键资产到 app/src/content/
// 基于 manifest.json 索引,按需同步指定类别
// 运行: node scripts/sync-content.mjs [--all | --category <cat> ...]
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // app/
const CONTENT_DIR = join(ROOT, 'src', 'content');
const MANIFEST = JSON.parse(readFileSync(join(CONTENT_DIR, 'manifest.json'), 'utf8'));

// 步骤1需要同步的关键资产(按 category + subcategory 过滤)
// 后续步骤按需扩展
const PRIORITY_SYNC = [
  // MVU 5件套 + schema(步骤4要用)
  { category: 'mvu' },
  // EJS 预处理(步骤2-3要用 D0+精准控制框架;其余步骤3逐步重构)
  { category: 'ejs' },
  // 扮演准则(步骤6 Prompt组装要用)
  { category: 'worldbook', subcategory: 'play-rule' },
  // 阶段指导(步骤6要用)
  { category: 'worldbook', subcategory: 'phase-guide' },
  // 地理(步骤6世界观要用,虽然阶段1不接入世界观AI,但主聊天AI可能需要)
  { category: 'worldbook', subcategory: 'geography' },
  // 时间线(步骤5 Kernel要用)
  { category: 'worldbook', subcategory: 'timeline' },
  // 系统表格模板(步骤4 SP数据库要用)
  { category: 'worldbook', subcategory: 'system' },
  // 事件(步骤5要用)
  { category: 'worldbook', subcategory: 'event' },
  // 主角设定+玩家画像(步骤7要用)
  { category: 'character', subcategory: 'player' },
  // 鸣泽美佐子(步骤7 1女角验证要用) — 用 entryKeyContains 检查 entryKey(角色档案 name 字段是"基础信息"等,不含角色名)
  { category: 'character', subcategory: '基础信息', entryKeyContains: '鸣泽美佐子' },
  { category: 'character', subcategory: '性格调色盘', entryKeyContains: '鸣泽美佐子' },
  { category: 'character', subcategory: '三面性', entryKeyContains: '鸣泽美佐子' },
  { category: 'character', subcategory: 'NSFW反差', entryKeyContains: '鸣泽美佐子' },
  { category: 'character', subcategory: '剧情线', entryKeyContains: '鸣泽美佐子' },
  // 开场白(步骤7要用)
  { category: 'opening' },
  // 数据库模板(步骤4要用)
  { category: 'database' },
  // 正则(步骤7状态栏要用)
  { category: 'regex' },
  // 卡片配置(参考用)
  { category: 'card' },
];

/**
 * 判断条目是否需要同步
 */
function shouldSync(entry) {
  return PRIORITY_SYNC.some((rule) => {
    if (rule.category !== entry.category) return false;
    if (rule.subcategory && rule.subcategory !== entry.subcategory) return false;
    // entryKeyContains 检查 entryKey(角色档案的 name 字段是"基础信息"等通用名,entryKey 才含角色名)
    if (rule.entryKeyContains && (!entry.entryKey || !entry.entryKey.includes(rule.entryKeyContains))) return false;
    if (rule.nameContains && !entry.name.includes(rule.nameContains)) return false;
    return true;
  });
}

// 解析命令行参数
const args = process.argv.slice(2);
const syncAll = args.includes('--all');
const categoryArgs = args.filter((a) => !a.startsWith('-'));

let toSync;
if (syncAll) {
  toSync = MANIFEST.entries.filter((e) => e.category !== 'duplicate-root' && e.category !== 'scripts');
} else if (categoryArgs.length > 0) {
  toSync = MANIFEST.entries.filter((e) => categoryArgs.includes(e.category));
} else {
  toSync = MANIFEST.entries.filter(shouldSync);
}

console.log(`同步 ${toSync.length} 个资产到 ${CONTENT_DIR}`);

let copied = 0;
let skipped = 0;
const errors = [];

for (const entry of toSync) {
  const targetPath = join(CONTENT_DIR, entry.targetPath);
  try {
    if (!existsSync(entry.sourcePath)) {
      errors.push(`源不存在: ${entry.sourcePath}`);
      skipped++;
      continue;
    }
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(entry.sourcePath, targetPath);
    copied++;
  } catch (e) {
    errors.push(`${entry.id}: ${e.message}`);
    skipped++;
  }
}

console.log(`\n完成: 复制 ${copied}, 跳过 ${skipped}, 错误 ${errors.length}`);
if (errors.length > 0) {
  console.log('\n错误详情(前10条):');
  errors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
}

// 更新 manifest 标记已同步的条目
const syncedSet = new Set(toSync.map((e) => e.id));
MANIFEST.entries = MANIFEST.entries.map((e) => ({
  ...e,
  synced: syncedSet.has(e.id),
}));
MANIFEST.lastSyncAt = new Date().toISOString();
MANIFEST.syncedCount = copied;
writeFileSync(join(CONTENT_DIR, 'manifest.json'), JSON.stringify(MANIFEST, null, 2), 'utf8');
console.log(`manifest.json 已更新(synced标记)`);
