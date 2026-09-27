// 编年史页 — 每周大事时间线（对齐凡人 TimelinePage）
import { useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState } from '@/ui';
import { useTimelineStore, type ChronicleEntry } from '@/stores/timelineStore';
import { useGameStore } from '@/stores/gameStore';
import { fmtGameDate } from '@/utils/time';
import { AppDialog } from '@/dialogs/AppDialog';
import { TextArea, TextInput, SelectInput } from '@/ui';
import { ConfirmDialog } from '@/dialogs/ConfirmDialog';

const CATEGORY_STYLE: Record<ChronicleEntry['category'], string> = {
  week: 'text-sky-300',
  battle: 'text-orange-300',
  event: 'text-dd-gold',
  hero: 'text-emerald-300',
  quest: 'text-purple-300',
  system: 'text-dd-textMuted',
};

const CATEGORY_LABEL: Record<ChronicleEntry['category'], string> = {
  week: '周记', battle: '战斗', event: '事件',
  hero: '英雄', quest: '任务', system: '系统',
};

export function TimelinePage({ onBack }: { onBack?: () => void }) {
  const { entries, add, remove, clear } = useTimelineStore();
  const week = useGameStore((s) => s.week);
  const [filter, setFilter] = useState<ChronicleEntry['category'] | 'all'>('all');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', detail: '', category: 'event' as ChronicleEntry['category'] });
  const [confirmClear, setConfirmClear] = useState(false);

  const grouped = useMemo(() => {
    const list = filter === 'all' ? entries : entries.filter((e) => e.category === filter);
    const byWeek = new Map<number, ChronicleEntry[]>();
    for (const e of [...list].sort((a, b) => a.week - b.week || a.time - b.time)) {
      if (!byWeek.has(e.week)) byWeek.set(e.week, []);
      byWeek.get(e.week)!.push(e);
    }
    return [...byWeek.entries()].reverse(); // 最新周在前
  }, [entries, filter]);

  const saveEntry = () => {
    if (!form.title.trim()) return;
    add({ week, category: form.category, title: form.title.trim(), detail: form.detail.trim() || undefined });
    setForm({ title: '', detail: '', category: 'event' });
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>庄园编年史</SectionTitle>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setConfirmClear(true)}>清空</Button>
          <Button variant="primary" onClick={() => setEditing(true)}>记录本周大事</Button>
          {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
        </div>
      </div>

      <Panel>
        <PanelHeader title="◆ 时间线" extra={`${entries.length} 条记录`} />
        <div className="p-3 flex flex-wrap gap-1.5">
          {(['all', 'week', 'battle', 'event', 'hero', 'quest', 'system'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-2 py-1 text-[10px] tracking-wider border rounded-sm transition-colors ${
                filter === c
                  ? 'text-dd-gold border-dd-gold'
                  : 'text-dd-textMuted border-dd-textMuted/30 hover:text-dd-text'
              }`}
            >
              {c === 'all' ? '全部' : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        {grouped.length === 0 ? (
          <Panel><EmptyState text="编年史尚空 —— 每一周都在书写历史" /></Panel>
        ) : (
          grouped.map(([w, list]) => (
            <Panel key={w}>
              <PanelHeader title={`◈ ${fmtGameDate(w)}`} extra={`${list.length} 条`} />
              <div>
                {list.map((e) => (
                  <div key={e.id} className="px-3 py-2 border-b border-dd-gold/5 last:border-0">
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] tracking-wider mt-0.5 ${CATEGORY_STYLE[e.category]}`}>
                        [{CATEGORY_LABEL[e.category]}]
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-dd-text">{e.title}</div>
                        {e.detail && <div className="text-[11px] text-dd-textMuted mt-0.5 leading-relaxed">{e.detail}</div>}
                      </div>
                      <button
                        onClick={() => remove(e.id)}
                        className="shrink-0 text-dd-textDim hover:text-red-400 text-xs"
                        aria-label="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))
        )}
      </div>

      <AppDialog
        open={editing}
        title={`记录大事（第 ${week} 周）`}
        onClose={() => setEditing(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>取消</Button>
            <Button variant="primary" onClick={saveEntry} disabled={!form.title.trim()}>保存</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-dd-textDim tracking-wider block mb-1">分类</label>
            <SelectInput
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v as ChronicleEntry['category'] })}
              options={Object.entries(CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))}
            />
          </div>
          <div>
            <label className="text-xs text-dd-textDim tracking-wider block mb-1">标题</label>
            <TextInput className="w-full" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          </div>
          <div>
            <label className="text-xs text-dd-textDim tracking-wider block mb-1">详情（可选）</label>
            <TextArea rows={3} value={form.detail} onChange={(v) => setForm({ ...form, detail: v })} />
          </div>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={confirmClear}
        title="清空编年史"
        message="所有编年史记录将被永久删除。确定继续？"
        confirmText="清空"
        danger
        onConfirm={() => { clear(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
