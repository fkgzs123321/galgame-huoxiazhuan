// 诊断设置面板 — 日志级别/诊断包导出/存储探测
import { useState } from 'react';
import { SettingsSection, SettingRow } from './SettingsPanelBase';
import { Button, Toggle, SelectInput } from '@/ui';
import { logHub } from '@/stores/logStore';
import { isIndexedDbAvailable } from '@/db';
import { traceHub } from '@/utils/trace';

export function DiagnosticSettings() {
  const [level, setLevel] = useState<'info' | 'warn' | 'error'>('info');
  const [saving, setSaving] = useState(false);

  const exportDiagnostics = () => {
    const logs = logHub.entries().slice(-200);
    const traces = traceHub.all();
    const pack = {
      exportedAt: new Date().toISOString(),
      app: 'darkest-dungeon-app',
      storage: {
        indexedDb: isIndexedDbAvailable(),
        localStorage: typeof localStorage !== 'undefined',
      },
      logCount: logs.length,
      traceCount: traces.length,
      logs,
      traces,
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dd-diagnostic-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SettingsSection title="◆ 诊断" extra="排障证据">
      <SettingRow label="日志级别">
        <SelectInput
          value={level}
          onChange={(v) => setLevel(v as 'info' | 'warn' | 'error')}
          options={[
            { value: 'info', label: '详细（含战斗/叙事）' },
            { value: 'warn', label: '警告以上' },
            { value: 'error', label: '仅错误' },
          ]}
        />
      </SettingRow>
      <SettingRow label="存储能力" hint="IndexedDB 用于备份/日志/媒体">
        <span className={isIndexedDbAvailable() ? 'text-emerald-400 text-xs' : 'text-red-400 text-xs'}>
          {isIndexedDbAvailable() ? '可用' : '不可用'}
        </span>
      </SettingRow>
      <div className="flex gap-2 pt-2">
        <Button variant="primary" onClick={exportDiagnostics}>导出诊断包</Button>
        <Button
          variant="ghost"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await logHub.clearPersisted();
            setSaving(false);
          }}
        >
          {saving ? '清理中…' : '清空持久化日志'}
        </Button>
      </div>
    </SettingsSection>
  );
}
