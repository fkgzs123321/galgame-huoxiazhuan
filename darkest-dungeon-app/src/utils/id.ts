// 稳定 ID 生成器（时间戳 + 随机段 + 计数器）
let idCounter = 0;
export function genId(prefix = 'id'): string {
  idCounter = (idCounter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// 短 ID（同名碰撞检测用）
export function shortId(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len);
}
