// 预设管理页 — 加载/编辑/恢复/组装预览 + 运行时应用（对齐凡人 PromptManagerPage）
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, TextArea, TextInput, NumberInput, Badge } from '@/ui';
import { loadPromptPresets } from '@/data/worldData';
import { assemblePlan, planSummary } from '@/prompts/presetAssembler';
import { toast } from '@/ui/Extras';

// ---- 预设覆盖存储（用户编辑的预设持久化） ----
export interface PromptPresetDraft {
  id: string;
  name: string;
  category: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  isCustom: boolean;
}

interface PresetStore {
  drafts: Record<string, PromptPresetDraft>;
  setDraft: (d: PromptPresetDraft) => void;
  removeDraft: (id: string) => void;
}

export const usePresetStore = create<PresetStore>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (d) => set((s) => ({ drafts: { ...s.drafts, [d.id]: d } })),
      removeDraft: (id) =>
        set((s) => {
          const drafts = { ...s.drafts };
          delete drafts[id];
          return { drafts };
        }),
    }),
    { name: 'dd-prompt-presets', version: 1 }
  )
);

const CATEGORY_LABEL: Record<string, string> = {
  narrative: '叙事', combat: '战斗', director: '导演', summary: '摘要', worldbook: '世界书',
};

interface PresetSource {
  id: string;
  name: string;
  category: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  isBuiltin: boolean;
}

export function PromptManagerPage({ onBack }: { onBack?: () => void }) {
  const [builtins, setBuiltins] = useState<PresetSource[]>([]);
  const { drafts, setDraft, removeDraft } = usePresetStore();
  const [editing, setEditing] = useState<PromptPresetDraft | null>(null);
  const [previewId, setPreviewId] = useState('');

  useEffect(() => {
    void loadPromptPresets().then((d) => {
      if (!d) return;
      const list = (d.presets as PresetSource[]).map((p) => ({ ...p, isBuiltin: true }));
      setBuiltins(list);
    });
  }, []);

  // 合并内置与用户覆盖
  const merged = useMemo(() => {
    const map = new Map<string, PresetSource>();
    for (const b of builtins) map.set(b.id, b);
    for (const d of Object.values(drafts)) {
      map.set(d.id, {
        id: d.id,
        name: d.name,
        category: d.category,
        system: d.system,
        user: d.user,
        temperature: d.temperature,
        maxTokens: d.maxTokens,
        isBuiltin: false,
      });
    }
    return [...map.values()];
  }, [builtins, drafts]);

  const grouped = useMemo(() => {
    const g = new Map<string, PresetSource[]>();
    for (const p of merged) {
      if (!g.has(p.category)) g.set(p.category, []);
      g.get(p.category)!.push(p);
    }
    return [...g.entries()];
  }, [merged]);

  const openEdit = (p: PresetSource) => {
    const draft = drafts[p.id] ?? {
      id: p.id, name: p.name, category: p.category,
      system: p.system, user: p.user,
      temperature: p.temperature, maxTokens: p.maxTokens, isCustom: false,
    };
    setEditing(draft);
  };

  const saveEdit = () => {
    if (!editing) return;
    setDraft({ ...editing, isCustom: true });
    toast(`预设「${editing.name}」已保存为本地副本`, 'success');
    setEditing(null);
  };

  const resetDraft = (id: string) => {
    removeDraft(id);
    toast('已恢复默认预设', 'success');
  };

  const preview = useMemo(() => {
    const p = merged.find((m) => m.id === previewId);
    if (!p) return null;
    const plan = assemblePlan(
      [
        { id: 'system', role: 'system' as const, marker: '系统预设', content: p.system, budget: -1, enabled: true },
        { id: 'user', role: 'user' as const, marker: '用户模板', content: p.user, budget: -1, enabled: true },
      ],
      4000
    );
    return plan;
  }, [merged, previewId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>预设管理</SectionTitle>
        {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
      </div>

      <Panel>
        <PanelHeader title="◆ 组装预览" extra={preview ? planSummary(preview) : '选择预设'} />
        <div className="p-3">
          <select
            className="w-full bg-black/40 border border-dd-gold/25 text-sm px-2 py-1 text-dd-text outline-none mb-2"
            value={previewId}
            onChange={(e) => setPreviewId(e.target.value)}
          >
            <option value="">选择预设预览…</option>
            {merged.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {preview && (
            <pre className="text-xs text-dd-textMuted whitespace-pre-wrap bg-black/30 p-3 rounded border border-dd-gold/10 max-h-48 overflow-y-auto">
              {preview.text}
            </pre>
          )}
        </div>
      </Panel>

      {grouped.length === 0 ? (
        <Panel><EmptyState text="暂无预设数据（运行 extract-data 生成 prompt_presets.json）" /></Panel>
      ) : (
        grouped.map(([cat, list]) => (
          <Panel key={cat}>
            <PanelHeader title={`◆ ${CATEGORY_LABEL[cat] ?? cat}`} extra={`${list.length} 个`} />
            <div className="divide-y divide-dd-gold/5">
              {list.map((p) => {
                const isCustom = !!drafts[p.id];
                return (
                  <div key={p.id} className="px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dd-text">{p.name}</span>
                        {isCustom ? <Badge tone="green">已修改</Badge> : <Badge>内置</Badge>}
                      </div>
                      <div className="text-[10px] text-dd-textDim mt-0.5 truncate">
                        {p.system.slice(0, 80)}…
                      </div>
                    </div>
                    <div className="shrink-0 text-[10px] text-dd-textDim">
                      t={p.temperature} · {p.maxTokens} tok
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>编辑</Button>
                    {isCustom && (
                      <Button size="sm" variant="ghost" onClick={() => resetDraft(p.id)}>恢复默认</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        ))
      )}

      {/* 编辑对话框 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="dd-panel w-full max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="dd-panel-header shrink-0">
              <span>编辑预设：{editing.name}</span>
              <button onClick={() => setEditing(null)} className="text-dd-textDim hover:text-dd-gold px-1">✕</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs text-dd-textDim tracking-wider block mb-1">名称</label>
                <TextInput className="w-full" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              </div>
              <div>
                <label className="text-xs text-dd-textDim tracking-wider block mb-1">System（世界观基调）</label>
                <TextArea rows={6} value={editing.system} onChange={(v) => setEditing({ ...editing, system: v })} />
              </div>
              <div>
                <label className="text-xs text-dd-textDim tracking-wider block mb-1">User 模板（{'{facts}'} 为事实占位）</label>
                <TextArea rows={4} value={editing.user} onChange={(v) => setEditing({ ...editing, user: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dd-textDim tracking-wider block mb-1">温度</label>
                  <NumberInput min={0} max={2} step={0.1} value={editing.temperature} onChange={(v) => setEditing({ ...editing, temperature: v })} />
                </div>
                <div>
                  <label className="text-xs text-dd-textDim tracking-wider block mb-1">最大 token</label>
                  <NumberInput min={50} max={4000} step={50} value={editing.maxTokens} onChange={(v) => setEditing({ ...editing, maxTokens: v })} />
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 pt-1 shrink-0 border-t border-dd-gold/10 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>取消</Button>
              <Button variant="primary" onClick={saveEdit}>保存副本</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
