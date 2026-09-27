import { useRef } from 'react';
import { useKernelStore } from '@/stores/kernelStore';
import {
  exportSaveFile,
  importSaveFile,
  loadFromDisk,
  saveSnapshotNow,
} from '@/stores/kernelIntegration';

const STATUS_LABEL: Record<string, string> = {
  uninitialized: '未启动',
  initialized: '初始存档',
  loaded: '已读档',
  backup_restored: '备份恢复',
  corrupt: '存档损坏',
  saved: '已保存',
  save_failed: '保存失败',
  load_failed: '读档失败',
};

export default function KernelStatusPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    revision,
    commandCount,
    saveStatus,
    saveAck,
    message,
    lastTrace,
    canWrite,
  } = useKernelStore();

  const handleExport = () => {
    const text = exportSaveFile();
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dd-save-rev${revision}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') importSaveFile(reader.result);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <details className="dd-panel mt-4">
      <summary className="dd-panel-header cursor-pointer select-none">
        ◆ 档案管理
      </summary>
      <div className="p-4 space-y-2 text-xs">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>状态：{STATUS_LABEL[saveStatus] ?? saveStatus}</span>
          <span>修订：{revision}</span>
          <span>命令：{commandCount}</span>
          <span>确认：{saveAck ?? '—'}</span>
        </div>
        {message && <p className="text-dd-textMuted">{message}</p>}
        {lastTrace && (
          <p className="text-dd-textDim">
            最近：{lastTrace.receipt?.summary ?? lastTrace.reason ?? lastTrace.code}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="dd-btn"
            disabled={!canWrite}
            onClick={() => saveSnapshotNow()}
          >
            保存
          </button>
          <button type="button" className="dd-btn" onClick={() => loadFromDisk()}>
            读档
          </button>
          <button type="button" className="dd-btn" onClick={handleExport}>
            导出
          </button>
          <button
            type="button"
            className="dd-btn"
            onClick={() => fileRef.current?.click()}
          >
            导入
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </div>
      </div>
    </details>
  );
}
