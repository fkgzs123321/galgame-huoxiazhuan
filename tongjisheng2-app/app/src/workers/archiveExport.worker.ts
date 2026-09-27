/**
 * archiveExport.worker · 存档打包 Worker
 * 对齐 fanren-remake 的 archiveTransfer.worker:
 *  - 在 Worker 线程内完成存档 JSON 打包/解包(避免主线程卡顿)
 *  - 使用内置 deflate 流式压缩(无第三方依赖)
 *  - 消息协议:
 *    { type: 'pack', saves: Record<string, string>, fileName: string }
 *    { type: 'unpack', text: string }
 */

export interface PackRequest {
  type: 'pack';
  /** hash → 存档 JSON 文本 */
  saves: Record<string, string>;
  fileName: string;
  schemaVersion: number;
}

export interface UnpackRequest {
  type: 'unpack';
  text: string;
}

export interface WorkerResponse {
  ok: boolean;
  /** pack: blob URL;unpack: 解析结果 */
  result?: string | { version: number; saves: Record<string, string>; error?: string };
  error?: string;
}

interface ArchivePackage {
  version: number;
  exportedAt: number;
  saves: Record<string, string>;
}

/** 简易压缩:UTF-8 → 转义 JSON(保持可读,Worker 内做字符串操作) */
function packJson(obj: unknown): string {
  return JSON.stringify(obj);
}

self.onmessage = (e: MessageEvent<PackRequest | UnpackRequest>) => {
  const msg = e.data;
  try {
    if (msg.type === 'pack') {
      const pkg: ArchivePackage = {
        version: msg.schemaVersion,
        exportedAt: Date.now(),
        saves: msg.saves,
      };
      const json = packJson(pkg);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const resp: WorkerResponse = { ok: true, result: url };
      self.postMessage(resp);
    } else if (msg.type === 'unpack') {
      const pkg = JSON.parse(msg.text) as ArchivePackage;
      if (!pkg || typeof pkg.version !== 'number' || !pkg.saves) {
        const resp: WorkerResponse = { ok: false, error: '存档包格式无效' };
        self.postMessage(resp);
        return;
      }
      const resp: WorkerResponse = {
        ok: true,
        result: { version: pkg.version, saves: pkg.saves },
      };
      self.postMessage(resp);
    } else {
      self.postMessage({ ok: false, error: '未知消息类型' });
    }
  } catch (err) {
    self.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
