/**
 * MOD 系统统一导出(阶段4 创意工坊)
 */

// 类型
export type {
  ModType,
  ModContentType,
  ModManifest,
  ModContentEntry,
  InstalledMod,
  ModImportResult,
  ModExportResult,
  ModApplyResult,
  ModPackage,
} from './mod-types';

export {
  MOD_KV_PREFIX,
  MOD_LIST_KV_KEY,
  MOD_ENABLED_PREFIX,
  MOD_CONTENT_KV_PREFIX,
  APP_VERSION,
  EXPORTER_VERSION,
} from './mod-types';

// 存储层
export {
  getInstalledMods,
  findInstalledMod,
  installMod,
  uninstallMod,
  setModEnabled,
  isModEnabled,
  setModContent,
  getModContent,
  getModAllContents,
  setModLoadOrder,
  moveModUp,
  moveModDown,
  getEnabledMods,
  getModStats,
} from './mod-store';

// 管理器
export {
  importModFromJson,
  importModFromFile,
  exportModToJson,
  exportModAndDownload,
  enableMod,
  disableMod,
  removeMod,
  listInstalledMods,
  listEnabledMods,
  getStats,
  moveUp,
  moveDown,
  applyMods,
  createSampleMod,
} from './mod-manager';
