/**
 * MOD 管理器(阶段4 创意工坊)
 *
 * 职责:
 *  - MOD 导入:解析 MOD 包 JSON → 校验 → 安装到 IndexedDB
 *  - MOD 导出:从 IndexedDB 读取 → 组装 MOD 包 JSON → 下载
 *  - MOD 启用/禁用:切换运行时状态
 *  - MOD 卸载:删除清单和内容数据
 *  - MOD 依赖检查:导入时校验依赖是否满足
 *  - 创建示例 MOD:从现有内容生成可导出的 MOD 包
 */

import {
  installMod,
  uninstallMod,
  setModEnabled,
  findInstalledMod,
  getInstalledMods,
  getEnabledMods,
  getModStats,
  getModAllContents,
  moveModUp,
  moveModDown,
} from './mod-store';
import {
  APP_VERSION,
  EXPORTER_VERSION,
  type InstalledMod,
  type ModImportResult,
  type ModExportResult,
  type ModPackage,
  type ModManifest,
  type ModApplyResult,
  type ModType,
  type ModContentType,
} from './mod-types';

// ───────────────────────────────────────────────────────────
//  MOD 导入
// ───────────────────────────────────────────────────────────

/**
 * 从 JSON 字符串导入 MOD
 *  - 解析 JSON → 校验格式 → 检查依赖 → 安装
 */
export async function importModFromJson(jsonText: string): Promise<ModImportResult> {
  let pkg: ModPackage;
  try {
    pkg = JSON.parse(jsonText) as ModPackage;
  } catch (e) {
    return { ok: false, error: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}` };
  }

  // 格式校验
  const validation = validateModPackage(pkg);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  // 依赖检查
  const depCheck = await checkDependencies(pkg.manifest);
  if (!depCheck.ok) {
    return { ok: false, error: depCheck.error };
  }

  // 安装
  try {
    const installed = await installMod(pkg.manifest, pkg.contents);
    const overrideCount = pkg.manifest.contents.filter((c) => c.override).length;
    return {
      ok: true,
      modId: installed.manifest.id,
      contentCount: pkg.manifest.contents.length,
      overrideCount,
    };
  } catch (e) {
    return { ok: false, error: `安装失败: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** 从文件导入 MOD */
export async function importModFromFile(file: File): Promise<ModImportResult> {
  const text = await file.text();
  return importModFromJson(text);
}

// ───────────────────────────────────────────────────────────
//  MOD 导出
// ───────────────────────────────────────────────────────────

/**
 * 导出 MOD 为 JSON 字符串
 *  - 从 IndexedDB 读取 MOD 清单和内容
 *  - 组装为 ModPackage
 */
export async function exportModToJson(modId: string): Promise<ModExportResult> {
  const mod = await findInstalledMod(modId);
  if (!mod) {
    return { ok: false, error: `MOD 不存在: ${modId}` };
  }

  const contents = await getModAllContents(modId, mod.manifest.contents);

  const pkg: ModPackage = {
    formatVersion: 1,
    manifest: mod.manifest,
    contents,
    exportedAt: Date.now(),
    exporterVersion: EXPORTER_VERSION,
  };

  try {
    return { ok: true, json: JSON.stringify(pkg, null, 2) };
  } catch (e) {
    return { ok: false, error: `序列化失败: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** 导出 MOD 并触发浏览器下载 */
export async function exportModAndDownload(modId: string): Promise<ModExportResult> {
  const result = await exportModToJson(modId);
  if (!result.ok || !result.json) return result;

  try {
    const mod = await findInstalledMod(modId);
    const fileName = `mod-${mod?.manifest.name ?? modId}-${mod?.manifest.version ?? '1.0.0'}.json`;
    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return result;
  } catch (e) {
    return { ok: false, error: `下载失败: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ───────────────────────────────────────────────────────────
//  MOD 启用/禁用/卸载
// ───────────────────────────────────────────────────────────

/** 启用 MOD */
export async function enableMod(modId: string): Promise<void> {
  await setModEnabled(modId, true);
}

/** 禁用 MOD */
export async function disableMod(modId: string): Promise<void> {
  await setModEnabled(modId, false);
}

/** 卸载 MOD */
export async function removeMod(modId: string): Promise<void> {
  await uninstallMod(modId);
}

// ───────────────────────────────────────────────────────────
//  MOD 查询
// ───────────────────────────────────────────────────────────

/** 获取已安装 MOD 列表 */
export async function listInstalledMods(): Promise<InstalledMod[]> {
  return getInstalledMods();
}

/** 获取已启用 MOD 列表 */
export async function listEnabledMods(): Promise<InstalledMod[]> {
  return getEnabledMods();
}

/** 获取 MOD 统计 */
export async function getStats() {
  return getModStats();
}

/** 上移加载顺序 */
export async function moveUp(modId: string): Promise<void> {
  await moveModUp(modId);
}

/** 下移加载顺序 */
export async function moveDown(modId: string): Promise<void> {
  await moveModDown(modId);
}

// ───────────────────────────────────────────────────────────
//  MOD 应用(运行时内容覆盖)
// ───────────────────────────────────────────────────────────

/**
 * 应用已启用的 MOD 到目标对象
 *  - 遍历已启用 MOD(按加载顺序)
 *  - 对每个 override=true 的内容,按 overridePath 覆盖目标对象
 *  - 非 override 的内容追加到目标对象的 modContents 字段
 *
 * @param target 目标对象(如 stat_data 或内容缓存)
 * @returns 应用结果
 */
export async function applyMods(target: Record<string, unknown>): Promise<ModApplyResult> {
  const enabledMods = await getEnabledMods();
  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const mod of enabledMods) {
    const contents = await getModAllContents(mod.manifest.id, mod.manifest.contents);
    for (const entry of mod.manifest.contents) {
      const data = contents[entry.entryId];
      if (data === undefined) {
        skipped++;
        continue;
      }
      try {
        if (entry.override && entry.overridePath) {
          // 按 overridePath 覆盖目标对象
          const pathParts = entry.overridePath.split('.');
          setDeepValue(target, pathParts, data);
          applied++;
        } else {
          // 非 override:追加到 modContents
          const modContents = (target.modContents as Record<string, unknown>) ?? {};
          const key = `${mod.manifest.id}:${entry.entryId}`;
          modContents[key] = {
            modId: mod.manifest.id,
            modName: mod.manifest.name,
            entryId: entry.entryId,
            contentType: entry.contentType,
            name: entry.name,
            data,
          };
          target.modContents = modContents;
          applied++;
        }
      } catch (e) {
        errors.push(`${mod.manifest.id}:${entry.entryId} - ${e instanceof Error ? e.message : String(e)}`);
        skipped++;
      }
    }
  }

  return {
    ok: errors.length === 0,
    appliedContents: applied,
    skippedContents: skipped,
    errors,
  };
}

// ───────────────────────────────────────────────────────────
//  创建示例 MOD
// ───────────────────────────────────────────────────────────

/**
 * 创建一个示例 MOD(自定义女角)
 *  - 用于演示创意工坊功能
 *  - 包含一个自定义女角档案 + 日程 + 剧情线
 */
export async function createSampleMod(): Promise<ModImportResult> {
  console.log('[createSampleMod] start');
  const modId = `com.sample.custom-heroine-${Date.now()}`;
  const manifest: ModManifest = {
    id: modId,
    name: '示例:自定义女角 · 星野樱',
    author: '创意工坊',
    version: '1.0.0',
    type: 'character' as ModType,
    description: '一个示例 MOD,演示创意工坊的导入/导出/启用/禁用功能。包含自定义女角档案、日程和剧情线。',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    minAppVersion: APP_VERSION,
    tags: ['示例', '自定义女角', '测试'],
    contents: [
      {
        entryId: 'heroine-profile',
        contentType: 'heroine-profile' as ModContentType,
        name: '星野樱 · 角色档案',
        description: '23岁,八十八町花店店长,温柔内敛',
        contentKey: 'heroine-profile',
        override: false,
      },
      {
        entryId: 'heroine-schedule',
        contentType: 'heroine-schedule' as ModContentType,
        name: '星野樱 · 寒假日程',
        description: '寒假期间的日程安排',
        contentKey: 'heroine-schedule',
        override: false,
      },
      {
        entryId: 'heroine-plot',
        contentType: 'heroine-plot' as ModContentType,
        name: '星野樱 · 剧情线',
        description: '花店奇遇剧情线(3个节点)',
        contentKey: 'heroine-plot',
        override: false,
      },
    ],
  };

  const contents: Record<string, unknown> = {
    'heroine-profile': {
      姓名: '星野樱',
      年龄: 23,
      职业: '花店店长',
      住所: '八十八町商业区',
      性格: '温柔内敛,喜欢花草,不善言辞但内心丰富',
      外貌: '粉色长发,常穿围裙,眼眸温和',
      好感度初始值: 0,
      关系阶段初始: '初识',
    },
    'heroine-schedule': {
      heroineName: '星野樱',
      schedule: [
        { dayCount: 1, timeSlot: '上午', region: '八十八町商业区', action: '花店营业' },
        { dayCount: 1, timeSlot: '下午', region: '八十八町商业区', action: '花店营业' },
        { dayCount: 1, timeSlot: '晚', region: '八十八町商业区', action: '关店后整理' },
        { dayCount: 2, timeSlot: '上午', region: '八十八町商业区', action: '花店营业' },
        { dayCount: 2, timeSlot: '下午', region: '八十八海岸', action: '海边散步采购花材' },
      ],
    },
    'heroine-plot': {
      heroineName: '星野樱',
      plotNodes: [
        {
          dayCount: 1,
          event: '花店初遇',
          description: '玩家在八十八町商业区偶遇星野樱的花店,被花香吸引入店',
          requiresPlayerPresence: true,
          isReversible: true,
        },
        {
          dayCount: 5,
          event: '花店再访',
          description: '玩家再次到访花店,星野樱记得玩家的喜好',
          condition: '好感度≥10',
          requiresPlayerPresence: true,
          isReversible: true,
        },
        {
          dayCount: 10,
          event: '海边相遇',
          description: '玩家在海边遇到采购花材的星野樱,二人共看夕阳',
          condition: '好感度≥30',
          requiresPlayerPresence: true,
          isReversible: false,
        },
      ],
    },
  };

  try {
    console.log('[createSampleMod] manifest ready, calling installMod...', { modId, contentKeys: Object.keys(contents) });
    const installed = await installMod(manifest, contents);
    console.log('[createSampleMod] installMod returned', { modId: installed.manifest.id, loadOrder: installed.loadOrder, enabled: installed.enabled });
    // 验证写入:立即读回列表确认
    const verifyList = await getInstalledMods();
    console.log('[createSampleMod] verify list after install', { count: verifyList.length, ids: verifyList.map((m) => m.manifest.id) });
    return {
      ok: true,
      modId: installed.manifest.id,
      contentCount: manifest.contents.length,
      overrideCount: 0,
    };
  } catch (e) {
    console.error('[createSampleMod] failed', e);
    return { ok: false, error: `示例 MOD 创建失败: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ───────────────────────────────────────────────────────────
//  内部工具
// ───────────────────────────────────────────────────────────

/** 校验 MOD 包格式 */
function validateModPackage(pkg: unknown): { ok: boolean; error?: string } {
  if (!pkg || typeof pkg !== 'object') {
    return { ok: false, error: 'MOD 包不是有效对象' };
  }
  const p = pkg as Partial<ModPackage>;
  if (p.formatVersion !== 1) {
    return { ok: false, error: `不支持的包格式版本: ${p.formatVersion}` };
  }
  if (!p.manifest) {
    return { ok: false, error: '缺少 manifest 字段' };
  }
  const m = p.manifest;
  if (!m.id || typeof m.id !== 'string') {
    return { ok: false, error: 'manifest.id 缺失或类型错误' };
  }
  if (!m.name || typeof m.name !== 'string') {
    return { ok: false, error: 'manifest.name 缺失或类型错误' };
  }
  if (!m.version || typeof m.version !== 'string') {
    return { ok: false, error: 'manifest.version 缺失或类型错误' };
  }
  if (!m.type) {
    return { ok: false, error: 'manifest.type 缺失' };
  }
  if (!Array.isArray(m.contents)) {
    return { ok: false, error: 'manifest.contents 不是数组' };
  }
  if (!p.contents || typeof p.contents !== 'object') {
    return { ok: false, error: '缺少 contents 字段' };
  }
  return { ok: true };
}

/** 检查 MOD 依赖 */
async function checkDependencies(manifest: ModManifest): Promise<{ ok: boolean; error?: string }> {
  if (!manifest.dependencies || manifest.dependencies.length === 0) {
    return { ok: true };
  }
  const installed = await getInstalledMods();
  const installedIds = new Set(installed.map((m) => m.manifest.id));
  const missing = manifest.dependencies.filter((dep) => !installedIds.has(dep));
  if (missing.length > 0) {
    return { ok: false, error: `缺少依赖 MOD: ${missing.join(', ')}` };
  }
  return { ok: true };
}

/** 深路径写入值(自动创建中间对象) */
function setDeepValue(obj: Record<string, unknown>, pathParts: string[], value: unknown): void {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const p = pathParts[i];
    if (!(p in cur) || typeof cur[p] !== 'object' || cur[p] === null) {
      cur[p] = {};
    }
    cur = cur[p] as Record<string, unknown>;
  }
  cur[pathParts[pathParts.length - 1]] = value;
}
