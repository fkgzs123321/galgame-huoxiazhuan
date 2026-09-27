// ============================================================
// Mod 管理界面 — 扫描、启用/禁用外部 Mod
// 使用 dd-panel / dd-tag / dd-btn 哥特风格
// ============================================================
import { useEffect } from 'react';
import { useModStore } from '@/stores/modStore';
import clsx from 'clsx';

interface ModManagerProps {
  onClose: () => void;
}

export default function ModManager({ onClose }: ModManagerProps) {
  const mods = useModStore((s) => s.mods);
  const activeMods = useModStore((s) => s.activeMods);
  const loading = useModStore((s) => s.loading);
  const modLog = useModStore((s) => s.modLog);
  const loadMods = useModStore((s) => s.loadMods);
  const enableMod = useModStore((s) => s.enableMod);
  const disableMod = useModStore((s) => s.disableMod);
  const clearModLog = useModStore((s) => s.clearModLog);

  // 首次打开自动扫描
  useEffect(() => {
    if (mods.length === 0) {
      loadMods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dd-panel">
      <div className="dd-panel-header">
        <span>◆ Mod 管理</span>
        <div className="flex items-center gap-2">
          <button onClick={loadMods} className="dd-btn" disabled={loading} style={{ padding: '4px 12px', fontSize: '11px' }}>
            {loading ? '扫描中…' : '重新扫描'}
          </button>
          <button onClick={onClose} className="dd-btn" style={{ padding: '4px 12px', fontSize: '11px' }}>
            关闭
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 提示 */}
        <p className="text-dd-textMuted text-xs tracking-wider">
          将 Mod 放入 <span className="font-mono text-dd-gold">public/mods</span> 目录，并在
          <span className="font-mono text-dd-gold"> manifest.json</span> 中登记其 ID，即可在此加载与启用。
        </p>

        {/* Mod 列表 */}
        {mods.length === 0 ? (
          <div className="text-center py-10 text-dd-textMuted text-sm">
            {loading ? '正在扫描 Mod 目录…' : '未发现任何 Mod。请将 Mod 放入 public/mods 目录。'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mods.map((mod) => {
              const isActive = activeMods.includes(mod.path) || activeMods.includes(mod.id);
              const raw = useModStore.getState().modRawData[mod.path];
              const dataCount =
                (raw?.heroes?.length ?? 0) +
                (raw?.monsters?.length ?? 0) +
                (raw?.trinkets?.entries?.length ?? 0) +
                (raw?.provisions?.length ?? 0);
              return (
                <div
                  key={mod.path}
                  className={clsx(
                    'border rounded-[2px] p-3 transition-colors duration-150 bg-dd-surface',
                    isActive ? 'border-dd-gold shadow-dd-gold' : 'border-dd-border hover:border-dd-borderLight'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-dd font-bold text-sm text-dd-goldBright">{mod.name}</span>
                        <span className="dd-tag text-[10px] text-dd-textMuted leading-none">v{mod.version}</span>
                      </div>
                      <div className="text-dd-textDim text-[10px] mt-1 tracking-wider">
                        作者：{mod.author || '未知'}
                      </div>
                    </div>
                    {/* 启用/禁用开关 */}
                    <button
                      onClick={() => (isActive ? disableMod(mod.path) : enableMod(mod.path))}
                      className={clsx(
                        'dd-tag text-[10px] cursor-pointer select-none',
                        isActive ? 'dd-tag-positive' : 'dd-tag-negative'
                      )}
                      style={{ padding: '4px 10px' }}
                    >
                      {isActive ? '◆ 已启用' : '◇ 停用'}
                    </button>
                  </div>

                  <p className="text-dd-text text-xs mt-2 leading-relaxed">
                    {mod.description || '（无描述）'}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="dd-tag text-[9px] text-dd-textDim leading-none">
                      数据项：{dataCount}
                    </span>
                    <span className="text-[9px] text-dd-textDim tracking-wider">
                      ID：{mod.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 日志 */}
        <div className="border border-dd-border rounded-[2px] bg-dd-bg">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-dd-border">
            <span className="text-[10px] text-dd-textMuted uppercase tracking-widest">加载日志</span>
            <button onClick={clearModLog} className="text-[10px] text-dd-textDim hover:text-dd-textMuted">
              清空
            </button>
          </div>
          <div className="p-2 max-h-40 overflow-y-auto space-y-1">
            {modLog.length === 0 ? (
              <div className="text-dd-textDim text-[10px]">暂无日志</div>
            ) : (
              modLog.slice().reverse().map((entry, i) => (
                <div key={i} className="text-[10px] text-dd-textMuted leading-relaxed break-all">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}