// 存档传输 Worker — 压缩/校验/导出（对齐凡人 archiveTransfer.worker）
// 通过 postMessage 通信：{ type, payload } → { type, ok, payload }

export interface ArchiveWorkerRequest {
  type: 'compress' | 'verify' | 'checksum';
  data?: string;       // 存档 JSON 文本
  __seq?: number;      // 请求序号（客户端回显用）
}

export interface ArchiveWorkerResponse {
  ok: boolean;
  result?: string;
  error?: string;
  __seq?: number;
}

self.onmessage = (e: MessageEvent<ArchiveWorkerRequest>) => {
  const { type, data, __seq } = e.data || {};
  const reply = (resp: ArchiveWorkerResponse) => post({ ...resp, __seq });
  try {
    switch (type) {
      case 'compress': {
        if (!data) throw new Error('缺少数据');
        // 简易压缩：去除空白（浏览器 TextEncoder 压缩留待后续）
        const compressed = data.replace(/\s+/g, '');
        reply({ ok: true, result: compressed });
        break;
      }
      case 'checksum': {
        if (!data) throw new Error('缺少数据');
        let hash = 0x811c9dc5;
        for (let i = 0; i < data.length; i++) {
          hash ^= data.charCodeAt(i);
          hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        reply({ ok: true, result: hash.toString(16).padStart(8, '0') });
        break;
      }
      case 'verify': {
        if (!data) throw new Error('缺少数据');
        try {
          const parsed = JSON.parse(data);
          const ok = parsed && typeof parsed === 'object' && 'revision' in parsed;
          reply({ ok: !!ok, result: ok ? 'ok' : 'invalid-structure' });
        } catch (err) {
          reply({ ok: false, error: err instanceof Error ? err.message : 'parse-error' });
        }
        break;
      }
      default:
        reply({ ok: false, error: `未知请求类型: ${type}` });
    }
  } catch (err) {
    reply({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};

function post(resp: ArchiveWorkerResponse) {
  (self as unknown as { postMessage: (r: ArchiveWorkerResponse) => void }).postMessage(resp);
}
