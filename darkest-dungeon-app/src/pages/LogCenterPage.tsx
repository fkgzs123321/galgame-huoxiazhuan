// 日志中心页 — 事件日志查看/过滤/导出（对齐凡人 LogCenterPage）
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState } from '@/ui';
import { logHub, type LogEntry, type LogLevel } from '@/stores/logStore';

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: 'text-dd-textMuted',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  battle: 'text-orange-300',
  narrative: 'text-dd-gold',
  system: 'text-sky-300',
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  info: '信息', warn: '警告', error: '错误',
  battle: '战斗', narrative: '叙事', system: '系统',
};

export function LogCenterPage({ onBack }: { onBack?: () => void }) {
  const [, force] = useState(0);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [maxRows, setMaxRows] = useState(200);

  useEffect(() => {
    const unsub = logHub.subscribe(() => force((n) => n + 1));
    return unsub;
  }, []);

  const logs = useMemo(() => {
    const list = filter === 'all' ? logHub.entries() : logHub.entries().filter((l) => l.level === filter);
    return list.slice(-maxRows).reverse();
  }, [filter, maxRows, force, logHub]);

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logHub.entries(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dd-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtTime = (t: number) => new Date(t).toLocaleTimeString('zh-CN', { hour12: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>日志中心</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 过滤" extra={`${logs.length} 条`} />
        <div className="p-3 flex flex-wrap items-center gap-2">
          {(['all', 'battle', 'narrative', 'info', 'warn', 'error', 'system'] as const).map((lv) => (
            <button
              key={lv}
              onClick={() => setFilter(lv)}
              className={`px-2 py-1 text-[10px] tracking-wider border rounded-sm transition-colors ${
                filter === lv
                  ? 'text-dd-gold border-dd-gold'
                  : 'text-dd-textMuted border-dd-textMuted/30 hover:text-dd-text'
              }`}
            >
              {lv === 'all' ? '全部' : LEVEL_LABEL[lv]}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <select
              className="bg-black/40 border border-dd-gold/25 text-xs px-2 py-1 text-dd-text outline-none"
              value={maxRows}
              onChange={(e) => setMaxRows(Number(e.target.value))}
            >
              <option value={100}>100 条</option>
              <option value={200}>200 条</option>
              <option value={500}>500 条</option>
            </select>
            <Button size="sm" variant="ghost" onClick={exportLogs}>导出</Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 事件流" extra="IndexedDB 持久化" />
        <div className="max-h-[60vh] overflow-y-auto">
          {logs.length === 0 ? (
            <EmptyState text="暂无日志记录" />
          ) : (
            logs.map((l) => (
              <div key={l.id} className="px-3 py-1.5 border-b border-dd-gold/5 flex gap-3 text-xs">
                <span className="text-dd-textDim shrink-0 font-mono">{fmtTime(l.time)}</span>
                <span className={`shrink-0 tracking-wider ${LEVEL_STYLE[l.level]}`}>[{LEVEL_LABEL[l.level]}]</span>
                <span className="text-dd-text break-all">{l.text}</span>
                {l.detail && <span className="text-dd-textDim break-all">{l.detail}</span>}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
