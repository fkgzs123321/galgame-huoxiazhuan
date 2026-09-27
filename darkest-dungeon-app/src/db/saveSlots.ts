// 多存档槽位 — 槽位 key 映射与激活管理
export type SaveSlotId = 'slot1' | 'slot2' | 'slot3';

export const SAVE_SLOTS: { id: SaveSlotId; label: string; desc: string }[] = [
  { id: 'slot1', label: '槽位 I', desc: '默认战役' },
  { id: 'slot2', label: '槽位 II', desc: '第二战役' },
  { id: 'slot3', label: '槽位 III', desc: '第三战役' },
];

const ACTIVE_KEY = 'dd-active-slot';

// 槽位 → 存档 key（slot1 兼容历史旧档 key）
export function slotKey(id: SaveSlotId): string {
  return id === 'slot1' ? 'dd-save-v3' : `dd-save-v3.${id}`;
}

export function slotBackupKey(id: SaveSlotId): string {
  return id === 'slot1' ? 'dd-save-v3.bak' : `dd-save-v3.${id}.bak`;
}

// 读取当前激活槽位（非法值回退 slot1）
export function getActiveSlot(): SaveSlotId {
  try {
    const v = localStorage.getItem(ACTIVE_KEY);
    return v === 'slot2' || v === 'slot3' ? v : 'slot1';
  } catch {
    return 'slot1';
  }
}

export function setActiveSlot(id: SaveSlotId): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch { /* 忽略 */ }
}

// 各槽位是否有存档（探测，用于槽位选择器显示）
export function slotHasSave(id: SaveSlotId): boolean {
  try {
    const main = localStorage.getItem(slotKey(id));
    const bak = localStorage.getItem(slotBackupKey(id));
    return main != null || bak != null;
  } catch {
    return false;
  }
}
