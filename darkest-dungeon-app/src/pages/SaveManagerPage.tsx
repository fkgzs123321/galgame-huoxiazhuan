// 存档管理页 — 导出/导入/备份/恢复（对齐凡人 SaveManagerPage）
import { useEffect, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState } from '@/ui';
import { ConfirmDialog } from '@/dialogs/ConfirmDialog';
import { downloadSaveFile, readSaveFile, createBackup, listBackups, deleteBackup, getBackupContent, type SaveBackupRecord } from '@/gateway/archiveService';
import { parseSaveFile } from '@/gateway/kernel/saveManager';
import { switchSaveSlot, getCurrentSlot } from '@/stores/kernelIntegration';
import { SAVE_SLOTS, slotHasSave, type SaveSlotId } from '@/db/saveSlots';
import { logHub } from '@/stores/logStore';
import { toast } from '@/ui/Extras';
import clsx from 'clsx';

export function SaveManagerPage({ onBack }: { onBack?: () => void }) {
  const [backups, setBackups] = useState<SaveBackupRecord[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [currentSlot, setCurrentSlot] = useState<SaveSlotId>(getCurrentSlot());

  const refresh = () => {
    void listBackups().then(setBackups);
  };

  useEffect(refresh, []);

  const handleSwitchSlot = (slot: SaveSlotId) => {
    if (slot === currentSlot) return;
    const r = switchSaveSlot(slot);
    setCurrentSlot(slot);
    setMessage(`${r.message}（刷新页面查看新槽位内容）`);
    toast(r.message, 'success');
    logHub.info(`切换存档槽位：${slot}`);
    refresh();
  };

  // 从 kernel 读取当前序列化存档
  const getCurrentSaveText = (): string | null => {
    const raw = localStorage.getItem(`dd-save-v3${currentSlot === 'slot1' ? '' : `.${currentSlot}`}`);
    return raw ?? null;
  };

  const handleExport = () => {
    const raw = getCurrentSaveText();
    if (!raw) {
      setMessage('当前没有可导出的存档');
      return;
    }
    const parsed = JSON.parse(raw) as { revision?: number };
    downloadSaveFile(raw, `darkest-dungeon-save-r${parsed.revision ?? 0}.json`);
    logHub.info(`存档导出（revision ${parsed.revision ?? 0}）`);
    setMessage('存档已导出');
  };

  const handleImport = async (file: File) => {
    try {
      const text = await readSaveFile(file);
      const result = parseSaveFile(text);
      if (!result.ok) {
        setMessage(`导入失败：${result.reason}`);
        return;
      }
      // 备份当前档再覆盖
      const current = getCurrentSaveText();
      if (current) {
        await createBackup(current, '导入前自动备份', 0);
      }
      localStorage.setItem('dd-save-v3', text);
      logHub.info(`存档导入成功：${file.name}`);
      setMessage(`导入成功：${file.name}（revision ${result.file.revision}，刷新页面生效）`);
    } catch (err) {
      setMessage(`读取文件失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleBackupNow = async () => {
    const raw = getCurrentSaveText();
    if (!raw) {
      setMessage('当前没有可备份的存档');
      return;
    }
    const parsed = JSON.parse(raw) as { revision?: number };
    const r = await createBackup(raw, '手动备份', parsed.revision ?? 0);
    setMessage(r.message);
    refresh();
  };

  const handleRestore = async (id: string) => {
    const content = await getBackupContent(id);
    if (!content) {
      setMessage('备份内容读取失败');
      return;
    }
    const current = getCurrentSaveText();
    if (current) await createBackup(current, '恢复前自动备份', 0);
    localStorage.setItem('dd-save-v3', content);
    logHub.info(`已从备份恢复存档`);
    setMessage('已恢复该备份，刷新页面生效');
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>存档管理</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 存档槽位" extra={`当前：${SAVE_SLOTS.find((s) => s.id === currentSlot)?.label ?? currentSlot}`} />
        <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          {SAVE_SLOTS.map((s) => {
            const active = s.id === currentSlot;
            const has = slotHasSave(s.id);
            return (
              <button
                key={s.id}
                onClick={() => handleSwitchSlot(s.id)}
                disabled={active}
                className={clsx(
                  'text-left p-3 border rounded-sm transition-colors',
                  active
                    ? 'border-dd-gold bg-dd-gold/10'
                    : 'border-dd-gold/20 hover:border-dd-gold/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={clsx('text-sm', active ? 'text-dd-gold' : 'text-dd-text')}>{s.label}</span>
                  {has && <span className="text-[10px] text-emerald-400">有存档</span>}
                  {!has && <span className="text-[10px] text-dd-textDim">空槽</span>}
                </div>
                <div className="text-[10px] text-dd-textDim mt-0.5">{s.desc}</div>
              </button>
            );
          })}
        </div>
        <div className="px-3 pb-3 text-[10px] text-dd-textDim">
          切换槽位会先保存当前进度，再载入目标槽位；各槽位独立演进互不影响。
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 当前存档" extra="Kernel Save Contract" />
        <div className="p-4 flex flex-wrap gap-2 items-center">
          <Button variant="primary" onClick={handleExport}>导出存档（JSON）</Button>
          <label className="dd-btn cursor-pointer">
            导入存档
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = '';
              }}
            />
          </label>
          <Button onClick={handleBackupNow}>立即备份</Button>
          {message && <span className="text-xs text-dd-gold">{message}</span>}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 备份列表" extra={`${backups.length} 份（IndexedDB）`} />
        <div className="max-h-[50vh] overflow-y-auto">
          {backups.length === 0 ? (
            <EmptyState text="暂无备份（保存时自动备份或手动创建）" />
          ) : (
            backups.map((b) => (
              <div key={b.id} className="px-3 py-2 border-b border-dd-gold/5 flex items-center gap-3 text-xs">
                <span className="text-dd-textDim font-mono shrink-0">
                  {new Date(b.at).toLocaleString('zh-CN', { hour12: false })}
                </span>
                <span className="text-dd-gold shrink-0">r{b.revision}</span>
                <span className="text-dd-text truncate flex-1">{b.reason}</span>
                <Button size="sm" onClick={() => void handleRestore(b.id)}>恢复</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(b.id)}>删除</Button>
              </div>
            ))
          )}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="删除备份"
        message="该备份将被永久删除，无法恢复。确定继续？"
        confirmText="删除"
        danger
        onConfirm={() => {
          if (confirmDelete) void deleteBackup(confirmDelete).then(refresh);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
